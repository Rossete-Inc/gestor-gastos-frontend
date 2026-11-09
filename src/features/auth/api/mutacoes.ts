import { useMutation } from '@tanstack/react-query';

import { erroAuth, type ErroAuth } from '../model/erros';
import type { CadastroInput, ConfirmacaoInput, LoginInput } from '../model/formularios';
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
