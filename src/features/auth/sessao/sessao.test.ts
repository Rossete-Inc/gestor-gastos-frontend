import * as SecureStore from 'expo-secure-store';

import { bff } from '@/shared/api';

import {
  cognito,
  erroCognito,
  meQueAceita,
  perfilAna,
  tokensCognito,
  usarServidor,
} from '../../../../test/msw';
import { ErroAuth } from '../model/erros';
import { sessao } from './sessao';

const server = usarServidor();
const CHAVE = 'gestor-gastos.refresh-token';

beforeEach(async () => {
  await SecureStore.deleteItemAsync(CHAVE);
  await sessao.iniciar(); // sem refresh guardado: anônimo
});

it('sem credencial guardada, começa anônimo', () => {
  expect(sessao.obter()).toEqual({ status: 'anonimo', tokens: null });
});

describe('login', () => {
  it('credenciais válidas abrem a sessão e guardam o refresh token no dispositivo', async () => {
    let corpo: Record<string, unknown> = {};
    server.use(
      cognito({
        InitiateAuth: (c) => {
          corpo = c;
          return tokensCognito('access-1', 'refresh-1');
        },
      }),
    );
    await sessao.entrar('ana@x.com', 'Senha123');

    expect(corpo).toMatchObject({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: 'client-teste',
      AuthParameters: { USERNAME: 'ana@x.com', PASSWORD: 'Senha123' },
    });
    expect(sessao.obter().status).toBe('autenticado');
    expect(sessao.obter().tokens?.accessToken).toBe('access-1');
    await expect(SecureStore.getItemAsync(CHAVE)).resolves.toBe('refresh-1');
  });

  it('credenciais inválidas lançam erro genérico e mantêm anônimo', async () => {
    server.use(
      cognito({
        InitiateAuth: () =>
          erroCognito('NotAuthorizedException', 'Incorrect username or password.'),
      }),
    );
    const erro = await sessao.entrar('ana@x.com', 'errada').catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroAuth);
    expect(erro).toMatchObject({
      codigo: 'credenciais_invalidas',
      message: 'E-mail ou senha incorretos.',
    });
    expect(sessao.obter().status).toBe('anonimo');
  });
});

describe('renovação de sessão', () => {
  beforeEach(async () => {
    server.use(cognito({ InitiateAuth: () => tokensCognito('velho', 'refresh-1') }));
    await sessao.entrar('ana@x.com', 'Senha123');
  });

  it('access token expirado: obtém um novo sem pedir login (spec)', async () => {
    let corpoRenovacao: Record<string, unknown> = {};
    server.use(
      meQueAceita('novo'),
      cognito({
        InitiateAuth: (c) => {
          corpoRenovacao = c;
          return tokensCognito('novo'); // a renovação não devolve refresh token
        },
      }),
    );

    await expect(bff.obterMe()).resolves.toEqual(perfilAna);
    expect(corpoRenovacao).toMatchObject({
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      AuthParameters: { REFRESH_TOKEN: 'refresh-1' },
    });
    expect(sessao.obter()).toMatchObject({
      status: 'autenticado',
      tokens: { accessToken: 'novo', refreshToken: 'refresh-1' },
    });
  });

  it('renovação também expirada: encerra a sessão local (spec)', async () => {
    server.use(
      meQueAceita('novo'),
      cognito({
        InitiateAuth: () => erroCognito('NotAuthorizedException', 'Refresh Token has expired'),
      }),
    );

    await expect(bff.obterMe()).rejects.toMatchObject({ status: 401 });
    expect(sessao.obter().status).toBe('anonimo');
    await expect(SecureStore.getItemAsync(CHAVE)).resolves.toBeNull();
  });
});

describe('logout', () => {
  it('remove as credenciais do dispositivo e volta a anônimo (spec)', async () => {
    server.use(cognito({ InitiateAuth: () => tokensCognito('access-1', 'refresh-1') }));
    await sessao.entrar('ana@x.com', 'Senha123');

    await sessao.sair();
    expect(sessao.obter()).toEqual({ status: 'anonimo', tokens: null });
    await expect(SecureStore.getItemAsync(CHAVE)).resolves.toBeNull();
  });

  it('renovar sem sessão devolve false', async () => {
    await expect(sessao.renovar()).resolves.toBe(false);
  });
});

describe('ao abrir o app (nativo)', () => {
  it('retoma a sessão com o refresh token guardado', async () => {
    await SecureStore.setItemAsync(CHAVE, 'refresh-guardado');
    server.use(cognito({ InitiateAuth: () => tokensCognito('access-retomado') }));
    await sessao.iniciar();
    expect(sessao.obter()).toMatchObject({
      status: 'autenticado',
      tokens: { accessToken: 'access-retomado', refreshToken: 'refresh-guardado' },
    });
  });

  it('refresh guardado expirado: começa anônimo e apaga a credencial', async () => {
    await SecureStore.setItemAsync(CHAVE, 'refresh-velho');
    server.use(cognito({ InitiateAuth: () => erroCognito('NotAuthorizedException', 'expired') }));
    await sessao.iniciar();
    expect(sessao.obter().status).toBe('anonimo');
    await expect(SecureStore.getItemAsync(CHAVE)).resolves.toBeNull();
  });

  it('assinantes são avisados das mudanças', async () => {
    const ouvinte = jest.fn();
    const cancelar = sessao.assinar(ouvinte);
    await sessao.sair();
    cancelar();
    await sessao.sair();
    expect(ouvinte).toHaveBeenCalledTimes(1);
  });
});

describe('alterar senha', () => {
  async function logado() {
    server.use(cognito({ InitiateAuth: () => tokensCognito('access-1', 'refresh-1') }));
    await sessao.entrar('ana@x.com', 'Antiga123');
  }

  it('troca a senha, entra de novo com a nova e continua logado', async () => {
    await logado();
    const ops: string[] = [];
    let login: Record<string, unknown> = {};
    server.use(
      cognito({
        GetUser: () => (ops.push('GetUser'), Response.json({ Username: 'uuid-ana' })),
        ChangePassword: (c) => (
          ops.push('ChangePassword'),
          expect(c).toMatchObject({ AccessToken: 'access-1' }),
          Response.json({})
        ),
        InitiateAuth: (c) => (
          (login = c),
          ops.push('InitiateAuth'),
          tokensCognito('access-2', 'refresh-2')
        ),
      }),
    );
    const aviso = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await sessao.alterarSenha('Antiga123', 'Nova1234');
    aviso.mockRestore();

    expect(ops).toEqual(['GetUser', 'ChangePassword', 'InitiateAuth']);
    expect(login).toMatchObject({ AuthParameters: { USERNAME: 'uuid-ana', PASSWORD: 'Nova1234' } });
    expect(sessao.obter().tokens?.accessToken).toBe('access-2');
    await expect(SecureStore.getItemAsync(CHAVE)).resolves.toBe('refresh-2');
  });

  it('senha atual errada (InvalidPasswordException no cognito-local) não troca e mantém a sessão', async () => {
    await logado();
    server.use(
      cognito({
        GetUser: () => Response.json({ Username: 'uuid-ana' }),
        ChangePassword: () => erroCognito('InvalidPasswordException'),
      }),
    );
    await expect(sessao.alterarSenha('Errada123', 'Nova1234')).rejects.toMatchObject({
      codigo: 'senha_atual_incorreta',
    });
    expect(sessao.obter().tokens?.accessToken).toBe('access-1');
  });

  it('se o novo login falha, encerra a sessão e avisa que a senha mudou', async () => {
    await logado();
    server.use(
      cognito({
        GetUser: () => Response.json({ Username: 'uuid-ana' }),
        ChangePassword: () => Response.json({}),
        InitiateAuth: () => erroCognito('NotAuthorizedException'),
      }),
    );
    const aviso = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const erro = await sessao.alterarSenha('Antiga123', 'Nova1234').catch((e: unknown) => e);
    aviso.mockRestore();
    expect(erro).toBeInstanceOf(ErroAuth);
    expect(erro).toMatchObject({ codigo: 'senha_alterada_relogin' });
    expect(sessao.obter().status).toBe('anonimo');
  });
});
