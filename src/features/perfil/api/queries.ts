import { useQuery } from '@tanstack/react-query';

import { bff, bffSchemas } from '@/shared/api';

export const perfilKeys = {
  all: ['perfil'] as const,
  me: () => [...perfilKeys.all, 'me'] as const,
};

/** Perfil do usuário logado; o BFF cria o perfil na primeira chamada. */
export function usePerfil() {
  return useQuery({
    queryKey: perfilKeys.me(),
    // Valida o que chegou contra o schema gerado do contrato.
    queryFn: async () => bffSchemas.ObterMeResponse.parse(await bff.obterMe()),
  });
}

/**
 * Papel do usuário logado, pelo perfil do /me. Serve só para mostrar ou
 * esconder a área de administração: quem decide o acesso é o BFF, pelo
 * grupo no token (403 para quem não é admin).
 */
export function useEhAdmin() {
  const perfil = usePerfil();
  return { carregando: perfil.isPending, admin: perfil.data?.papel === 'admin' };
}
