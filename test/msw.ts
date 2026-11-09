import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// Endereços do jest.setup.ts.
export const COGNITO = 'http://cognito.test/';
export const BFF = 'http://bff.test';

type Corpo = Record<string, unknown>;
type Resolver = (corpo: Corpo) => Response | Promise<Response>;

/** Imita o Cognito: despacha pela operação do cabeçalho X-Amz-Target. */
export function cognito(operacoes: Partial<Record<string, Resolver>>) {
  return http.post(COGNITO, async ({ request }) => {
    const op = request.headers.get('X-Amz-Target')?.split('.').pop() ?? '';
    const resolver = operacoes[op];
    if (!resolver) return erroCognito('UnknownOperationException', `sem handler para ${op}`);
    return resolver((await request.json()) as Corpo);
  });
}

export const erroCognito = (tipo: string, message = '') =>
  HttpResponse.json({ __type: tipo, message }, { status: 400 });

export const tokensCognito = (accessToken: string, refreshToken?: string) =>
  HttpResponse.json({
    AuthenticationResult: {
      AccessToken: accessToken,
      RefreshToken: refreshToken,
      ExpiresIn: 900,
      TokenType: 'Bearer',
    },
  });

export const perfilAna = {
  id: 'u-1',
  email: 'ana@x.com',
  nome: 'Ana Souza',
  papel: 'cliente',
  status: 'ATIVO',
  criadoEm: '2026-11-09T12:00:00.000Z',
};

/** BFF cujo /me só aceita o access token informado. */
export function meQueAceita(token: string, perfil: object = perfilAna) {
  return http.get(`${BFF}/me`, ({ request }) =>
    request.headers.get('Authorization') === `Bearer ${token}`
      ? HttpResponse.json(perfil)
      : HttpResponse.json(
          {
            type: 't',
            title: 't',
            status: 401,
            code: 'token_invalido',
            detail: 'Sessão inválida.',
          },
          { status: 401, headers: { 'Content-Type': 'application/problem+json' } },
        ),
  );
}

/** Servidor MSW com o ciclo de vida do Jest. */
export function usarServidor() {
  const server = setupServer();
  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
  return server;
}
