import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError, bff, bffSchemas } from '@/shared/api';

import type { Categoria, CategoriaFormInput } from '../model/categoria';

export const categoriasKeys = {
  all: ['categorias'] as const,
  lista: () => [...categoriasKeys.all, 'lista'] as const,
};

/** Categorias visíveis ao usuário (padrão e personalizadas), por grupo. */
export function useCategorias() {
  return useQuery({
    queryKey: categoriasKeys.lista(),
    queryFn: async () => bffSchemas.ListarCategoriasResponse.parse(await bff.listarCategorias()),
  });
}

/**
 * Cria uma categoria personalizada. Erros chegam como ApiError: 409
 * categoria_duplicada e 422 validacao (com errors[] por campo).
 */
export function useCriarCategoria() {
  const qc = useQueryClient();
  return useMutation<Categoria, ApiError, CategoriaFormInput>({
    mutationFn: async (dados) =>
      bffSchemas.CriarCategoriaResponse.parse(await bff.criarCategoria(dados)),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoriasKeys.all }),
  });
}

/**
 * Exclui uma categoria personalizada. 409 categoria_em_uso chega quando há
 * gastos vinculados (a partir da tarefa 8.3).
 */
export function useExcluirCategoria() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => bff.excluirCategoria(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoriasKeys.all }),
  });
}
