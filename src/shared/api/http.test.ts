import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { bff } from './index';
import { ApiError, configurarAutenticacao, type Autenticacao } from './http';

// MSW é o WireMock do front: intercepta o fetch e responde como o BFF.
const BFF = 'http://bff.test';
const perfil = {
  id: 'u-1',
  email: 'ana@x.com',
  nome: 'Ana',
  papel: 'cliente',
  status: 'ATIVO',
  criadoEm: '2026-11-09T12:00:00.000Z',
};
const problema = (status: number, code: string, extra: object = {}) =>
  HttpResponse.json(
    {
      type: `urn:gestor-gastos:problem:${code}`,
      title: 't',
      status,
      code,
      detail: `d-${code}`,
      ...extra,
    },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  server.resetHandlers();
  configurarAutenticacao(null);
});
afterAll(() => server.close());

/** Sessão falsa: o token "novo" só passa a valer depois da renovação. */
function sessao(renovaCom: string | null): Autenticacao & { renovacoes: number; expirou: number } {
  let token = 'velho';
  const s = {
    renovacoes: 0,
    expirou: 0,
    obterToken: async () => token,
    renovarSessao: async () => {
      s.renovacoes++;
      if (!renovaCom) return false;
      token = renovaCom;
      return true;
    },
    aoExpirar: () => {
      s.expirou++;
    },
  };
  return s;
}

/** BFF que só aceita o token "novo". */
function meQueExige(token: string) {
  return http.get(`${BFF}/me`, ({ request }) =>
    request.headers.get('Authorization') === `Bearer ${token}`
      ? HttpResponse.json(perfil)
      : problema(401, 'token_invalido'),
  );
}

describe('httpMutator', () => {
  it('envia o token e devolve o corpo de sucesso', async () => {
    server.use(meQueExige('velho'));
    configurarAutenticacao(sessao('novo'));
    await expect(bff.obterMe()).resolves.toEqual(perfil);
  });

  it('um 401 dispara a renovação de sessão e repete a chamada', async () => {
    server.use(meQueExige('novo'));
    const s = sessao('novo');
    configurarAutenticacao(s);

    await expect(bff.obterMe()).resolves.toEqual(perfil);
    expect(s.renovacoes).toBe(1);
    expect(s.expirou).toBe(0);
  });

  it('se a renovação falha, encerra a sessão e lança 401', async () => {
    server.use(meQueExige('novo'));
    const s = sessao(null);
    configurarAutenticacao(s);

    const erro = await bff.obterMe().catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ApiError);
    expect(erro).toMatchObject({ status: 401, code: 'token_invalido' });
    expect(s.expirou).toBe(1);
  });

  it('se o token renovado também é recusado, encerra a sessão', async () => {
    server.use(meQueExige('outro'));
    const s = sessao('novo');
    configurarAutenticacao(s);

    await expect(bff.obterMe()).rejects.toMatchObject({ status: 401 });
    expect(s.renovacoes).toBe(1);
    expect(s.expirou).toBe(1);
  });

  it('vários 401 ao mesmo tempo renovam uma vez só', async () => {
    server.use(meQueExige('novo'));
    const s = sessao('novo');
    configurarAutenticacao(s);

    await Promise.all([bff.obterMe(), bff.obterMe(), bff.obterMe()]);
    expect(s.renovacoes).toBe(1);
  });

  it('sem sessão configurada, 401 só lança', async () => {
    server.use(meQueExige('novo'));
    await expect(bff.obterMe()).rejects.toMatchObject({ status: 401, code: 'token_invalido' });
  });

  it('lê o problem+json de um 422 com os campos', async () => {
    server.use(
      http.post(`${BFF}/gastos`, () =>
        problema(422, 'validacao', {
          errors: [{ field: 'valorCentavos', message: 'deve ser maior que zero' }],
        }),
      ),
    );
    const erro = await bff
      .criarGasto({ valorCentavos: 0, data: '2026-11-03', categoriaId: 'alimentacao' })
      .catch((e: unknown) => e);
    expect(erro).toMatchObject({
      status: 422,
      code: 'validacao',
      detail: 'd-validacao',
      errors: [{ field: 'valorCentavos', message: 'deve ser maior que zero' }],
    });
  });

  it('envia o corpo como JSON', async () => {
    let recebido: unknown;
    let tipo: string | null = null;
    server.use(
      http.post(`${BFF}/gastos`, async ({ request }) => {
        tipo = request.headers.get('Content-Type');
        recebido = await request.json();
        return HttpResponse.json({}, { status: 201 });
      }),
    );
    await bff.criarGasto({ valorCentavos: 4590, data: '2026-11-03', categoriaId: 'alimentacao' });
    expect(tipo).toBe('application/json');
    expect(recebido).toEqual({
      valorCentavos: 4590,
      data: '2026-11-03',
      categoriaId: 'alimentacao',
    });
  });

  it('204 devolve undefined', async () => {
    server.use(http.delete(`${BFF}/gastos/g-1`, () => new HttpResponse(null, { status: 204 })));
    await expect(bff.excluirGasto('g-1')).resolves.toBeUndefined();
  });

  it('erro sem corpo vira um ApiError genérico', async () => {
    server.use(http.get(`${BFF}/me`, () => new HttpResponse('falhou', { status: 502 })));
    await expect(bff.obterMe()).rejects.toMatchObject({ status: 502, code: 'http_502' });
  });

  it('falha de rede vira sem_conexao', async () => {
    server.use(http.get(`${BFF}/me`, () => HttpResponse.error()));
    await expect(bff.obterMe()).rejects.toMatchObject({ status: 0, code: 'sem_conexao' });
  });
});
