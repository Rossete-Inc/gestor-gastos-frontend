import { preferencias } from '@/shared/platform';

// Conta ativa (spec colaboracao, "Seletor de conta"). É estado do cliente, não
// do BFF, então fica fora do TanStack Query: um store mínimo com assinantes,
// lido por useSyncExternalStore, como a sessão. O client HTTP pergunta a conta
// a cada chamada e manda o X-Conta (configurarConta).
//
// Analogia backend: o "tenant" corrente de uma requisição multi-tenant.

export type PapelColaborador = 'EDITOR' | 'LEITOR';

/** Conta de outra pessoa em que o usuário colabora. */
export type ContaAlheia = { donoId: string; nomeDono: string; papel: PapelColaborador };

export type EstadoConta = {
  /** Conta alheia ativa; null = a própria conta. */
  conta: ContaAlheia | null;
  /** Nome do dono da conta cujo acesso terminou, para o aviso; null = sem aviso. */
  acessoPerdido: string | null;
  /** A escolha guardada no dispositivo já foi lida. */
  carregada: boolean;
};

const CHAVE = 'gestor-gastos.conta-ativa';

let estado: EstadoConta = { conta: null, acessoPerdido: null, carregada: false };
const ouvintes = new Set<() => void>();

function definir(novo: Partial<EstadoConta>) {
  estado = { ...estado, ...novo };
  ouvintes.forEach((o) => o());
}

function lerGuardada(texto: string | null): ContaAlheia | null {
  if (!texto) return null;
  try {
    const c = JSON.parse(texto) as Partial<ContaAlheia>;
    if (
      typeof c.donoId === 'string' &&
      typeof c.nomeDono === 'string' &&
      (c.papel === 'EDITOR' || c.papel === 'LEITOR')
    ) {
      return { donoId: c.donoId, nomeDono: c.nomeDono, papel: c.papel };
    }
  } catch {
    // guardado num formato antigo ou corrompido: vale a própria conta
  }
  return null;
}

async function guardar(conta: ContaAlheia | null) {
  if (conta) await preferencias.set(CHAVE, JSON.stringify(conta));
  else await preferencias.remove(CHAVE);
}

export const contaAtiva = {
  obter: (): EstadoConta => estado,

  assinar(ouvinte: () => void): () => void {
    ouvintes.add(ouvinte);
    return () => ouvintes.delete(ouvinte);
  },

  /** donoId para o X-Conta; null = a própria conta. */
  donoId: (): string | null => estado.conta?.donoId ?? null,

  /** Lê a escolha guardada no dispositivo (spec, "continuar ativa ao reabrir"). */
  async iniciar(): Promise<void> {
    if (estado.carregada) return;
    const guardada = lerGuardada(await preferencias.get(CHAVE));
    definir({ conta: guardada, carregada: true });
  },

  /**
   * Troca de conta; null volta para a própria. Devolve true se a conta mudou:
   * quem chama recomeça o cache, que é da conta anterior.
   */
  async escolher(conta: ContaAlheia | null): Promise<boolean> {
    const mudou = conta?.donoId !== estado.conta?.donoId;
    definir({ conta, acessoPerdido: null });
    await guardar(conta);
    return mudou;
  },

  /**
   * Atualiza o papel e o nome da conta ativa com a lista de contas do BFF, ou
   * volta para a própria se ela não estiver mais lá. Devolve true se a conta
   * ativa mudou (o cache precisa recomeçar).
   */
  async sincronizar(contas: readonly ContaAlheia[]): Promise<boolean> {
    const atual = estado.conta;
    if (!atual) return false;
    const nova = contas.find((c) => c.donoId === atual.donoId);
    if (!nova) return contaAtiva.perder(atual.donoId);
    if (nova.papel !== atual.papel || nova.nomeDono !== atual.nomeDono) {
      definir({ conta: nova });
      await guardar(nova);
    }
    return false;
  },

  /**
   * O acesso a donoId terminou (404 do BFF): volta para a própria e avisa.
   * Devolve true se a conta ativa era essa.
   */
  async perder(donoId: string): Promise<boolean> {
    const atual = estado.conta;
    if (atual?.donoId !== donoId) return false;
    definir({ conta: null, acessoPerdido: atual.nomeDono });
    await guardar(null);
    return true;
  },

  dispensarAviso(): void {
    definir({ acessoPerdido: null });
  },

  /** Logout: a próxima pessoa no dispositivo começa na própria conta. */
  async limpar(): Promise<void> {
    definir({ conta: null, acessoPerdido: null });
    await guardar(null);
  },
};

/** Só para os testes: volta ao estado de quem acabou de abrir o app. */
export function reiniciarContaAtiva(): void {
  estado = { conta: null, acessoPerdido: null, carregada: false };
  ouvintes.clear();
}
