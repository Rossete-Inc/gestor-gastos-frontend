import { http, HttpResponse } from 'msw';

import { COGNITO, erroCognito, usarServidor } from '../../../../test/msw';
import { CognitoError } from '../model/erros';
import { cognito } from './cognito';

const server = usarServidor();

it('usa o protocolo JSON do Cognito no endpoint configurado', async () => {
  let headers: Headers | undefined;
  server.use(
    http.post(COGNITO, ({ request }) => {
      headers = request.headers;
      return HttpResponse.json({});
    }),
  );
  await cognito.reenviarCodigo('ana@x.com');
  expect(headers?.get('Content-Type')).toBe('application/x-amz-json-1.1');
  expect(headers?.get('X-Amz-Target')).toBe(
    'AWSCognitoIdentityProviderService.ResendConfirmationCode',
  );
});

it('lê o __type com prefixo de namespace', async () => {
  server.use(
    http.post(COGNITO, () =>
      HttpResponse.json(
        { __type: 'com.amazonaws.cognito#UsernameExistsException', message: 'existe' },
        { status: 400 },
      ),
    ),
  );
  const erro = await cognito.cadastrar('a@x.com', 'Senha123', 'Ana').catch((e: unknown) => e);
  expect(erro).toBeInstanceOf(CognitoError);
  expect(erro).toMatchObject({ tipo: 'UsernameExistsException', message: 'existe' });
});

it('erro sem corpo vira Unknown', async () => {
  server.use(http.post(COGNITO, () => new HttpResponse('x', { status: 500 })));
  await expect(cognito.confirmar('a@x.com', '1')).rejects.toMatchObject({ tipo: 'Unknown' });
});

it('falha de rede vira NetworkError', async () => {
  server.use(http.post(COGNITO, () => HttpResponse.error()));
  await expect(cognito.entrar('a@x.com', 'x')).rejects.toMatchObject({ tipo: 'NetworkError' });
});

it('desafio fora do MVP (nova senha obrigatória) é recusado', async () => {
  server.use(
    http.post(COGNITO, () =>
      HttpResponse.json({ ChallengeName: 'NEW_PASSWORD_REQUIRED', Session: 's' }),
    ),
  );
  await expect(cognito.entrar('a@x.com', 'x')).rejects.toMatchObject({
    tipo: 'NEW_PASSWORD_REQUIRED',
  });
});

it('erro do Cognito em operação simples', async () => {
  server.use(http.post(COGNITO, () => erroCognito('CodeMismatchException')));
  await expect(cognito.confirmar('a@x.com', '1')).rejects.toMatchObject({
    tipo: 'CodeMismatchException',
  });
});

describe('senha', () => {
  /** Captura operação e corpo de cada chamada ao Cognito. */
  function capturar(resposta: object = {}) {
    const chamadas: { op: string; corpo: Record<string, unknown> }[] = [];
    server.use(
      http.post(COGNITO, async ({ request }) => {
        chamadas.push({
          op: request.headers.get('X-Amz-Target')?.split('.').pop() ?? '',
          corpo: (await request.json()) as Record<string, unknown>,
        });
        return HttpResponse.json(resposta);
      }),
    );
    return chamadas;
  }

  it('alterarSenha usa ChangePassword com o access token e sem ClientId', async () => {
    const chamadas = capturar();
    await cognito.alterarSenha('acc', 'Antiga123', 'Nova1234');
    expect(chamadas).toEqual([
      {
        op: 'ChangePassword',
        corpo: { AccessToken: 'acc', PreviousPassword: 'Antiga123', ProposedPassword: 'Nova1234' },
      },
    ]);
  });

  it('usuario lê o Username do GetUser', async () => {
    const chamadas = capturar({ Username: 'uuid-ana', UserAttributes: [] });
    await expect(cognito.usuario('acc')).resolves.toBe('uuid-ana');
    expect(chamadas[0]).toEqual({ op: 'GetUser', corpo: { AccessToken: 'acc' } });
  });

  it('esqueciSenha usa ForgotPassword com o ClientId', async () => {
    const chamadas = capturar({ CodeDeliveryDetails: {} });
    await cognito.esqueciSenha('ana@x.com');
    expect(chamadas[0]).toEqual({
      op: 'ForgotPassword',
      corpo: { ClientId: 'client-teste', Username: 'ana@x.com' },
    });
  });

  it('redefinirSenha usa ConfirmForgotPassword', async () => {
    const chamadas = capturar();
    await cognito.redefinirSenha('ana@x.com', '123456', 'Nova1234');
    expect(chamadas[0]).toEqual({
      op: 'ConfirmForgotPassword',
      corpo: {
        ClientId: 'client-teste',
        Username: 'ana@x.com',
        ConfirmationCode: '123456',
        Password: 'Nova1234',
      },
    });
  });

  it('sairDeTodos não chama o cognito-local, que não tem GlobalSignOut', async () => {
    const aviso = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const chamadas = capturar();
    await cognito.sairDeTodos('acc');
    expect(chamadas).toHaveLength(0);
    expect(aviso).toHaveBeenCalled();
    aviso.mockRestore();
  });
});
