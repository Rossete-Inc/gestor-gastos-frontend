import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError, bff, bffSchemas } from '@/shared/api';

import type { FiltrosGastos, Gasto, GastoIn } from '../model/gasto';

export const gastosKeys = {
  all: ['gastos'] as const,
  lista: (f: FiltrosGastos) => [...gastosKeys.all, 'lista', f] as const,
  form: (id?: string) => [...gastosKeys.all, 'form', id ?? 'novo'] as const,
};

/**
 * Gastos do mês, do mais recente para o mais antigo, página a página pelo
 * cursor do BFF. Cada página traz também as categorias, para os filtros.
 */
export function useTelaGastos(f: FiltrosGastos) {
  return useInfiniteQuery({
    queryKey: gastosKeys.lista(f),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) =>
      bffSchemas.ObterTelaGastosResponse.parse(
        await bff.obterTelaGastos({
          mes: f.mes,
          ...(f.grupo ? { grupo: f.grupo } : {}),
          ...(f.categoriaId ? { categoriaId: f.categoriaId } : {}),
          ...(pageParam ? { cursor: pageParam } : {}),
        }),
      ),
    getNextPageParam: (pagina) => pagina.nextCursor,
  });
}

/** Categorias para o formulário e, com id, o gasto em edição (404 se não for do usuário). */
export function useTelaGastoForm(id?: string) {
  return useQuery({
    queryKey: gastosKeys.form(id),
    queryFn: async () =>
      bffSchemas.ObterTelaGastoFormResponse.parse(
        await bff.obterTelaGastoForm(id ? { id } : undefined),
      ),
  });
}

// Toda escrita invalida as listas de qualquer mês e filtro, que são buscadas
// de novo. Os formulários só ficam marcados como velhos (sem buscar agora):
// o do gasto que acabou de mudar de data ou ser excluído daria 404 enquanto a
// tela ainda está aberta. O painel (fatia 4) vai entrar nesta invalidação.
function useInvalidarGastos() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: [...gastosKeys.all, 'lista'] }),
      qc.invalidateQueries({ queryKey: [...gastosKeys.all, 'form'], refetchType: 'none' }),
    ]);
}

/** Lança um gasto. 422 validacao chega com errors[] por campo. */
export function useCriarGasto() {
  const invalidar = useInvalidarGastos();
  return useMutation<Gasto, ApiError, GastoIn>({
    mutationFn: async (dados) => bffSchemas.CriarGastoResponse.parse(await bff.criarGasto(dados)),
    onSuccess: invalidar,
  });
}

/** Edita um gasto. Se a data mudar, o gasto devolvido tem outro id. */
export function useAtualizarGasto(id: string) {
  const invalidar = useInvalidarGastos();
  return useMutation<Gasto, ApiError, GastoIn>({
    mutationFn: async (dados) =>
      bffSchemas.AtualizarGastoResponse.parse(await bff.atualizarGasto(id, dados)),
    onSuccess: invalidar,
  });
}

export function useExcluirGasto() {
  const invalidar = useInvalidarGastos();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => bff.excluirGasto(id),
    onSuccess: invalidar,
  });
}
