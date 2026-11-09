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
