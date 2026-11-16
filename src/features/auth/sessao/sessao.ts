import { configurarAutenticacao, queryClient } from '@/shared/api';
import { env } from '@/shared/config';
import { secureStorage } from '@/shared/platform';

import { cognito, type Tokens } from '../api/cognito';
import { CognitoError, ErroAuth, erroAuth } from '../model/erros';

// Estado da sessão: é estado de cliente (não vem do BFF), então fica fora do
// TanStack Query. Um store mínimo com assinantes, lido por useSyncExternalStore
// (sessao/useSessao.ts). Analogia backend: o SecurityContext da aplicação.

export type StatusSessao = 'carregando' | 'anonimo' | 'autenticado';
export type EstadoSessao = { status: StatusSessao; tokens: Tokens | null };

const CHAVE_REFRESH = 'gestor-gastos.refresh-token';

let estado: EstadoSessao = { status: 'carregando', tokens: null };
const ouvintes = new Set<() => void>();

function definir(novo: EstadoSessao) {
  estado = novo;
  ouvintes.forEach((ouvinte) => ouvinte());
}

async function autenticar(tokens: Tokens) {
  await secureStorage.set(CHAVE_REFRESH, tokens.refreshToken);
  definir({ status: 'autenticado', tokens });
}

export const sessao = {
  obter: (): EstadoSessao => estado,

  assinar(ouvinte: () => void): () => void {
    ouvintes.add(ouvinte);
    return () => ouvintes.delete(ouvinte);
  },

  /**
   * Abre o app: pluga a sessão no client HTTP e, se houver refresh token
   * guardado (só no nativo), tenta retomar a sessão.
   */
  async iniciar(): Promise<void> {
    configurarAutenticacao({
      obterToken: async () => estado.tokens?.accessToken ?? null,
      renovarSessao: () => sessao.renovar(),
      aoExpirar: () => void sessao.sair(),
    });
    const refreshToken = await secureStorage.get(CHAVE_REFRESH);
    if (!refreshToken) {
      definir({ status: 'anonimo', tokens: null });
      return;
    }
    try {
      await autenticar(await cognito.renovar(refreshToken));
    } catch {
      await sessao.sair();
    }
  },

  /** Login. Lança ErroAuth com a mensagem para o usuário. */
  async entrar(email: string, senha: string): Promise<void> {
    try {
      await autenticar(await cognito.entrar(email, senha));
    } catch (e) {
      throw erroAuth('login', e);
    }
  },

  /**
   * Renova o access token com o refresh token (spec, "Sessão de acesso
   * expirada"). Devolve false se a renovação também expirou.
   */
  async renovar(): Promise<boolean> {
    const atual = estado.tokens;
    if (!atual) return false;
    try {
      await autenticar(await cognito.renovar(atual.refreshToken));
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Troca a senha e mantém este dispositivo logado (spec, "Alteração de
   * senha"): ChangePassword → GlobalSignOut (derruba os outros dispositivos e
   * também este) → login com a nova senha. Lança ErroAuth; se a senha mudou
   * mas o novo login falhou, encerra a sessão local e lança
   * `senha_alterada_relogin`.
   */
  async alterarSenha(senhaAtual: string, novaSenha: string): Promise<void> {
    const token = estado.tokens?.accessToken;
    if (!token) throw new ErroAuth('erro_desconhecido', 'Sua sessão expirou. Entre de novo.');
    let usuario: string;
    try {
      usuario = await cognito.usuario(token);
      await cognito.alterarSenha(token, senhaAtual, novaSenha);
    } catch (e) {
      // O cognito-local usa InvalidPasswordException para a senha atual errada
      // e não aplica a política de senha, então ali o tipo só tem esse sentido.
      const senhaAtualErrada =
        env.appEnv === 'local' &&
        e instanceof CognitoError &&
        e.tipo === 'InvalidPasswordException';
      throw erroAuth(
        'trocaSenha',
        senhaAtualErrada ? new CognitoError('NotAuthorizedException', '') : e,
      );
    }
    try {
      await cognito.sairDeTodos(token);
      await autenticar(await cognito.entrar(usuario, novaSenha));
    } catch {
      await sessao.sair();
      throw new ErroAuth(
        'senha_alterada_relogin',
        'Sua senha foi alterada. Entre de novo com a nova senha.',
      );
    }
  },

  /** Logout: remove as credenciais do dispositivo e limpa o cache da API. */
  async sair(): Promise<void> {
    await secureStorage.remove(CHAVE_REFRESH);
    queryClient.clear();
    definir({ status: 'anonimo', tokens: null });
  },
};
