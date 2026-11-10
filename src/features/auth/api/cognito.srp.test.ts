import { http, HttpResponse } from 'msw';

import { tokensCognito, usarServidor } from '../../../../test/msw';
import { cognito } from './cognito';

// Login como na AWS (appEnv dev): SRP contra o endpoint regional do Cognito.
// O "a" e o relógio são fixos para a assinatura bater com o vetor gerado pela
// biblioteca da AWS (ver srp.test.ts).

jest.mock('@/shared/config', () => ({
  env: {
    appEnv: 'dev',
    apiUrl: 'https://api.test',
    cognito: { region: 'us-east-1', clientId: 'client-dev', userPoolId: 'us-east-1_Xyz12AbC' },
  },
}));

jest.mock('@/shared/platform', () => ({
  bytesAleatorios: () =>
    new Uint8Array(Buffer.from('1f2e3d4c5b6a79881726354453627180a9b8c7d6e5f40312', 'hex')),
}));

const COGNITO_AWS = 'https://cognito-idp.us-east-1.amazonaws.com/';
const desafio = {
  SRP_B: '7777777777' + 'abcdef0123456789'.repeat(40),
  SALT: '9a8b7c6d5e4f30211203',
  SECRET_BLOCK: 'c2VncmVkby1kby1zZXJ2aWRvci0wMTIzNDU2Nzg5',
  USER_ID_FOR_SRP: '1c2d3e4f-0000-4abc-8def-1234567890ab',
  USERNAME: '1c2d3e4f-0000-4abc-8def-1234567890ab',
};

const server = usarServidor();

beforeEach(() => {
  // Só o Date é falso: o MSW precisa dos timers de verdade.
  jest.useFakeTimers({
    now: new Date('2026-11-03T09:05:07Z'),
    doNotFake: [
      'nextTick',
      'setImmediate',
      'clearImmediate',
      'setInterval',
      'clearInterval',
      'setTimeout',
      'clearTimeout',
      'queueMicrotask',
      'hrtime',
      'performance',
    ],
  });
});
afterEach(() => jest.useRealTimers());

type Chamada = { operacao: string; corpo: Record<string, unknown> };

function cognitoAws(respostas: Record<string, () => Response>) {
  const chamadas: Chamada[] = [];
  server.use(
    http.post(COGNITO_AWS, async ({ request }) => {
      const operacao = request.headers.get('X-Amz-Target')?.split('.').pop() ?? '';
      chamadas.push({ operacao, corpo: (await request.json()) as Record<string, unknown> });
      return respostas[operacao]!();
    }),
  );
  return chamadas;
}

it('entra com SRP: InitiateAuth com SRP_A e resposta assinada ao PASSWORD_VERIFIER', async () => {
  const chamadas = cognitoAws({
    InitiateAuth: () =>
      HttpResponse.json({
        ChallengeName: 'PASSWORD_VERIFIER',
        ChallengeParameters: desafio,
        Session: 'sessao-srp',
      }),
    RespondToAuthChallenge: () => tokensCognito('access-dev', 'refresh-dev'),
  });

  const tokens = await cognito.entrar('ana@x.com', 'Senha123');

  expect(tokens).toMatchObject({ accessToken: 'access-dev', refreshToken: 'refresh-dev' });
  expect(chamadas.map((c) => c.operacao)).toEqual(['InitiateAuth', 'RespondToAuthChallenge']);

  const [inicio, resposta] = chamadas;
  expect(inicio!.corpo).toMatchObject({
    ClientId: 'client-dev',
    AuthFlow: 'USER_SRP_AUTH',
    AuthParameters: { USERNAME: 'ana@x.com', SRP_A: expect.stringMatching(/^6f67b280/) },
  });
  // A senha nunca vai para o Cognito.
  expect(JSON.stringify(chamadas)).not.toContain('Senha123');

  expect(resposta!.corpo).toEqual({
    ClientId: 'client-dev',
    ChallengeName: 'PASSWORD_VERIFIER',
    Session: 'sessao-srp',
    ChallengeResponses: {
      USERNAME: desafio.USER_ID_FOR_SRP,
      PASSWORD_CLAIM_SECRET_BLOCK: desafio.SECRET_BLOCK,
      TIMESTAMP: 'Tue Nov 3 09:05:07 UTC 2026',
      PASSWORD_CLAIM_SIGNATURE: 'rDKJGoXiwJM9t2E6aEdxxs7ed2JOaZyRJzCjeftBs30=',
    },
  });
});

it('senha errada: o erro do RespondToAuthChallenge chega como CognitoError', async () => {
  cognitoAws({
    InitiateAuth: () =>
      HttpResponse.json({ ChallengeName: 'PASSWORD_VERIFIER', ChallengeParameters: desafio }),
    RespondToAuthChallenge: () =>
      HttpResponse.json(
        { __type: 'NotAuthorizedException', message: 'Incorrect username or password.' },
        { status: 400 },
      ),
  });

  await expect(cognito.entrar('ana@x.com', 'Errada123')).rejects.toMatchObject({
    tipo: 'NotAuthorizedException',
  });
});

it('conta não confirmada já falha no InitiateAuth', async () => {
  const chamadas = cognitoAws({
    InitiateAuth: () =>
      HttpResponse.json(
        { __type: 'UserNotConfirmedException', message: 'User is not confirmed.' },
        { status: 400 },
      ),
  });

  await expect(cognito.entrar('ana@x.com', 'Senha123')).rejects.toMatchObject({
    tipo: 'UserNotConfirmedException',
  });
  expect(chamadas).toHaveLength(1);
});

it('renovação continua com REFRESH_TOKEN_AUTH', async () => {
  const chamadas = cognitoAws({ InitiateAuth: () => tokensCognito('novo') });
  await expect(cognito.renovar('refresh-dev')).resolves.toMatchObject({
    accessToken: 'novo',
    refreshToken: 'refresh-dev',
  });
  expect(chamadas[0]!.corpo).toMatchObject({ AuthFlow: 'REFRESH_TOKEN_AUTH' });
});
