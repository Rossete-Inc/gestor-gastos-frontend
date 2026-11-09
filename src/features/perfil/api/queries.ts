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
