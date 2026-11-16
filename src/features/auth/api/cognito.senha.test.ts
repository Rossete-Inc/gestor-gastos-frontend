import { http, HttpResponse } from 'msw';

import { usarServidor } from '../../../../test/msw';
import { cognito } from './cognito';

// Na AWS (appEnv dev) o GlobalSignOut é chamado de verdade.
jest.mock('@/shared/config', () => ({
  env: {
    appEnv: 'dev',
    apiUrl: 'https://api.test',
    cognito: { region: 'us-east-1', clientId: 'client-dev', userPoolId: 'us-east-1_Xyz12AbC' },
  },
}));

const COGNITO_AWS = 'https://cognito-idp.us-east-1.amazonaws.com/';
const server = usarServidor();

it('sairDeTodos chama GlobalSignOut com o access token e sem ClientId', async () => {
  let alvo: string | null = null;
  let corpo: unknown;
  server.use(
    http.post(COGNITO_AWS, async ({ request }) => {
      alvo = request.headers.get('X-Amz-Target');
      corpo = await request.json();
      return HttpResponse.json({});
    }),
  );
  await cognito.sairDeTodos('acc');
  expect(alvo).toBe('AWSCognitoIdentityProviderService.GlobalSignOut');
  expect(corpo).toEqual({ AccessToken: 'acc' });
});
