import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { perfilKeys } from '@/features/perfil';
import { ApiError, bff, bffSchemas } from '@/shared/api';

import type { Usuario, UsuarioPatch } from '../model/usuario';

export const adminKeys = {
  all: ['admin'] as const,
  usuarios: () => [...adminKeys.all, 'usuarios'] as const,
};

/** Usuários do mais novo para o mais antigo, página a página pelo cursor do BFF. */
export function useTelaUsuarios() {
  return useInfiniteQuery({
    queryKey: adminKeys.usuarios(),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) =>
      bffSchemas.ObterTelaAdminUsuariosResponse.parse(
        await bff.obterTelaAdminUsuarios(pageParam ? { cursor: pageParam } : undefined),
      ),
    getNextPageParam: (pagina) => pagina.nextCursor,
  });
}

// Depois de qualquer resposta, certa ou errada, a lista é recarregada: um 404
// ou 409 também indica que ela estava velha. O próprio perfil também, porque o
// admin pode ter mudado o próprio papel.
function useRecarregar() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: adminKeys.all }),
      qc.invalidateQueries({ queryKey: perfilKeys.all }),
    ]);
}

/** Bloqueia, reativa ou troca o papel. As regras da conta são do users-service. */
export function useAtualizarUsuario() {
  const recarregar = useRecarregar();
  return useMutation<Usuario, ApiError, { id: string; patch: UsuarioPatch }>({
    mutationFn: async ({ id, patch }) =>
      bffSchemas.AtualizarUsuarioResponse.parse(await bff.atualizarUsuario(id, patch)),
    onSettled: recarregar,
  });
}

/** Exclui a conta; gastos e categorias dela somem depois, pelo evento UserDeleted. */
export function useExcluirUsuario() {
  const recarregar = useRecarregar();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => bff.excluirUsuario(id),
    onSettled: recarregar,
  });
}
