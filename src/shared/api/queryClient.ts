import { QueryClient } from '@tanstack/react-query';

import { ApiError } from './http';

// Cache do estado do servidor. Analogia: uma camada de cache com
// revalidação, como um @Cacheable que sabe quando ficou velho.

/** Erros 4xx não melhoram tentando de novo; sem conexão e 5xx, sim. */
export function deveRepetir(tentativas: number, erro: unknown): boolean {
  if (erro instanceof ApiError && erro.status >= 400 && erro.status < 500) return false;
  return tentativas < 2;
}

export function criarQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: deveRepetir, staleTime: 30_000 },
      mutations: { retry: false },
    },
  });
}

export const queryClient = criarQueryClient();
