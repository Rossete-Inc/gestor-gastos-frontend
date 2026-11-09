import { env } from '@/shared/config';

// Client HTTP do BFF. É o "mutator" do orval: toda função gerada em
// ./generated passa por aqui. Analogia backend: um RestClient com um
// interceptor de autenticação e conversão de erro para exceção tipada.

/** Erro de campo de um 422 (problem+json `errors[]`). */
export type ErroDeCampo = { field: string; message: string };

/** Erro de uma chamada ao BFF, com o problem+json já lido. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    /** Código estável do problem+json, por exemplo "token_invalido". */
    readonly code: string,
    /** Mensagem em pt-BR que pode ser exibida ao usuário. */
    readonly detail: string,
    readonly errors: ErroDeCampo[] = [],
  ) {
    super(`HTTP ${status} ${code}`);
    this.name = 'ApiError';
  }
}

/**
 * Autenticação registrada pela feature de sessão. O shared não conhece a
 * feature (fronteira app → features → shared); ela se pluga aqui.
 */
export type Autenticacao = {
  /** Access token atual, ou null se não há sessão. */
  obterToken: () => Promise<string | null>;
  /** Tenta renovar a sessão; devolve true se conseguiu um token novo. */
  renovarSessao: () => Promise<boolean>;
  /** Chamado quando a sessão não pode ser renovada (logout). */
  aoExpirar: () => void;
};

let autenticacao: Autenticacao | null = null;
let renovacaoEmAndamento: Promise<boolean> | null = null;

export function configurarAutenticacao(a: Autenticacao | null): void {
  autenticacao = a;
  renovacaoEmAndamento = null;
}

// Várias chamadas que recebem 401 ao mesmo tempo disparam uma única
// renovação, e todas esperam o mesmo resultado.
function renovarUmaVez(a: Autenticacao): Promise<boolean> {
  renovacaoEmAndamento ??= a
    .renovarSessao()
    .catch(() => false)
    .finally(() => {
      renovacaoEmAndamento = null;
    });
  return renovacaoEmAndamento;
}

async function enviar(url: string, init: RequestInit | undefined, token: string | null) {
  const headers = new Headers(init?.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init?.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  try {
    return await fetch(`${env.apiUrl}${url}`, { ...init, headers });
  } catch {
    throw new ApiError(0, 'sem_conexao', 'Sem conexão com o servidor. Tente de novo.');
  }
}

async function erroDaResposta(res: Response): Promise<ApiError> {
  let corpo: Partial<{ code: string; detail: string; errors: ErroDeCampo[] }> = {};
  try {
    corpo = (await res.json()) as typeof corpo;
  } catch {
    // corpo vazio ou fora do problem+json
  }
  return new ApiError(
    res.status,
    corpo.code ?? `http_${res.status}`,
    corpo.detail ?? 'Algo deu errado. Tente de novo.',
    corpo.errors ?? [],
  );
}

/**
 * Mutator do orval. Devolve o corpo de sucesso já decodificado (ou
 * undefined em 204) e lança ApiError em qualquer erro. Um 401 tenta renovar
 * a sessão uma vez e repete a chamada; se não der, encerra a sessão.
 */
export async function httpMutator<T>(url: string, init?: RequestInit): Promise<T> {
  const a = autenticacao;
  let res = await enviar(url, init, a ? await a.obterToken() : null);

  if (res.status === 401 && a) {
    if (await renovarUmaVez(a)) {
      res = await enviar(url, init, await a.obterToken());
    }
    if (res.status === 401) {
      a.aoExpirar();
    }
  }

  if (!res.ok) throw await erroDaResposta(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
