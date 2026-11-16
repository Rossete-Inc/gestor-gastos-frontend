import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { gastosKeys } from '@/features/lancamento-gastos';
import { ApiError, bff, bffSchemas } from '@/shared/api';

import type { Cartao, CartaoIn } from '../model/cartao';

export const cartoesKeys = {
  all: ['cartoes'] as const,
  lista: () => [...cartoesKeys.all, 'lista'] as const,
  tela: (mes: string) => [...cartoesKeys.all, 'tela', mes] as const,
};

/** Cartões com a fatura do mês e o limite (aba Cartões). */
export function useTelaCartoes(mes: string) {
  return useQuery({
    queryKey: cartoesKeys.tela(mes),
    queryFn: async () =>
      bffSchemas.ObterTelaCartoesResponse.parse(await bff.obterTelaCartoes({ mes })),
  });
}

/** Todos os cartões, ativos e arquivados (tela de edição). */
export function useCartoes() {
  return useQuery({
    queryKey: cartoesKeys.lista(),
    queryFn: async () => bffSchemas.ListarCartoesResponse.parse(await bff.listarCartoes()),
  });
}

// Mudar um cartão muda a aba Cartões e também o que os gastos e o painel
// mostram (apelido, cor, filtros e formulário), que ficam sob gastosKeys.
function useInvalidarCartoes() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: cartoesKeys.all }),
      qc.invalidateQueries({ queryKey: gastosKeys.all }),
    ]);
}

/** Cadastra um cartão. 422 validacao (inclusive apelido repetido) e 409 limite_cartoes. */
export function useCriarCartao() {
  const invalidar = useInvalidarCartoes();
  return useMutation<Cartao, ApiError, CartaoIn>({
    mutationFn: async (dados) => bffSchemas.CriarCartaoResponse.parse(await bff.criarCartao(dados)),
    onSuccess: invalidar,
  });
}

export function useAtualizarCartao(id: string) {
  const invalidar = useInvalidarCartoes();
  return useMutation<Cartao, ApiError, CartaoIn>({
    mutationFn: async (dados) =>
      bffSchemas.AtualizarCartaoResponse.parse(await bff.atualizarCartao(id, dados)),
    onSuccess: invalidar,
  });
}

/** Arquiva (true) ou reativa (false). Reativar pode dar 409 limite_cartoes. */
export function useArquivarCartao(id: string) {
  const invalidar = useInvalidarCartoes();
  return useMutation<Cartao, ApiError, boolean>({
    mutationFn: async (arquivado) =>
      bffSchemas.ArquivarCartaoResponse.parse(await bff.arquivarCartao(id, { arquivado })),
    onSuccess: invalidar,
  });
}

/** Exclui um cartão sem gastos; com gastos, 409 cartao_em_uso. */
export function useExcluirCartao(id: string) {
  const invalidar = useInvalidarCartoes();
  return useMutation<void, ApiError, void>({
    mutationFn: () => bff.excluirCartao(id),
    onSuccess: invalidar,
  });
}
