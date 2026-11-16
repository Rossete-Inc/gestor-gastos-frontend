import { useMutation } from '@tanstack/react-query';

import { CognitoError, erroAuth, type ErroAuth } from '../model/erros';
import type {
  CadastroInput,
  ConfirmacaoInput,
  EsqueciSenhaInput,
  LoginInput,
  RedefinirSenhaInput,
  TrocaSenhaInput,
} from '../model/formularios';
import { sessao } from '../sessao/sessao';
import { cognito } from './cognito';

// Mutações da feature. Todas lançam ErroAuth, com a mensagem pronta para a tela.

export function useEntrar() {
  return useMutation<void, ErroAuth, LoginInput>({
    mutationFn: ({ email, senha }) => sessao.entrar(email, senha),
  });
}

export function useCadastrar() {
  return useMutation<void, ErroAuth, CadastroInput>({
    mutationFn: async ({ nome, email, senha }) => {
      try {
        await cognito.cadastrar(email, senha, nome);
      } catch (e) {
        throw erroAuth('cadastro', e);
      }
    },
  });
}

export function useConfirmar(email: string) {
  return useMutation<void, ErroAuth, ConfirmacaoInput>({
    mutationFn: async ({ codigo }) => {
      try {
        await cognito.confirmar(email, codigo);
      } catch (e) {
        throw erroAuth('confirmacao', e);
      }
    },
  });
}

export function useReenviarCodigo(email: string) {
  return useMutation<void, ErroAuth, void>({
    mutationFn: async () => {
      try {
        await cognito.reenviarCodigo(email);
      } catch (e) {
        throw erroAuth('reenvio', e);
      }
    },
  });
}

export function useSair() {
  return useMutation<void, Error, void>({ mutationFn: () => sessao.sair() });
}

export function useAlterarSenha() {
  return useMutation<void, ErroAuth, TrocaSenhaInput>({
    mutationFn: ({ senhaAtual, novaSenha }) => sessao.alterarSenha(senhaAtual, novaSenha),
  });
}

// Respostas que revelariam se o e-mail tem conta (ou se ela está confirmada).
// A tela segue igual nesses casos (spec, "E-mail sem conta").
const respostasNeutras = new Set([
  'UserNotFoundException',
  'InvalidParameterException',
  'NotAuthorizedException',
]);

export function useEsqueciSenha() {
  return useMutation<void, ErroAuth, EsqueciSenhaInput>({
    mutationFn: async ({ email }) => {
      try {
        await cognito.esqueciSenha(email);
      } catch (e) {
        if (e instanceof CognitoError && respostasNeutras.has(e.tipo)) return;
        throw erroAuth('esqueciSenha', e);
      }
    },
  });
}

/**
 * Encerra as sessões abertas antes da recuperação: entra com a nova senha só
 * para obter um access token e chama o GlobalSignOut. Silencioso: uma falha
 * aqui (por exemplo, conta bloqueada) não desfaz a redefinição.
 */
async function encerrarSessoesAntigas(email: string, novaSenha: string) {
  try {
    const { accessToken } = await cognito.entrar(email, novaSenha);
    await cognito.sairDeTodos(accessToken);
  } catch {
    console.warn('Não foi possível encerrar as sessões anteriores após redefinir a senha.');
  }
}

export function useRedefinirSenha(email: string) {
  return useMutation<void, ErroAuth, RedefinirSenhaInput>({
    mutationFn: async ({ codigo, novaSenha }) => {
      try {
        await cognito.redefinirSenha(email, codigo, novaSenha);
      } catch (e) {
        throw erroAuth('redefinirSenha', e);
      }
      await encerrarSessoesAntigas(email, novaSenha);
    },
  });
}
