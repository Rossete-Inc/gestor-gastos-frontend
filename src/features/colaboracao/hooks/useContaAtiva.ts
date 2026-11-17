import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useSyncExternalStore } from 'react';

import { useSessao } from '@/features/auth';
import { configurarConta, queryClient } from '@/shared/api';

import { useContas } from '../api/queries';
import { contaAtiva, type ContaAlheia, type EstadoConta } from '../model/contaAtiva';

export type PapelNaConta = 'DONO' | 'EDITOR' | 'LEITOR';

export type ContaAtivaInfo = EstadoConta & {
  /** A conta ativa é a do próprio usuário. */
  propria: boolean;
  papel: PapelNaConta;
  /** Dono ou Editor: pode lançar, editar e excluir (spec, "Papéis"). */
  podeEscrever: boolean;
};

/** Conta ativa e o papel do usuário nela. */
export function useContaAtiva(): ContaAtivaInfo {
  const estado = useSyncExternalStore(contaAtiva.assinar, contaAtiva.obter, contaAtiva.obter);
  const papel: PapelNaConta = estado.conta?.papel ?? 'DONO';
  return { ...estado, propria: !estado.conta, papel, podeEscrever: papel !== 'LEITOR' };
}

/** Atalho do modo Leitor: true se o usuário pode escrever na conta ativa. */
export function usePodeEscrever(): boolean {
  return useContaAtiva().podeEscrever;
}

/**
 * Na raiz do app: pluga a conta ativa no client HTTP, lê a escolha guardada
 * e, no logout, volta para a própria conta.
 */
export function useIniciarContaAtiva(): void {
  useEffect(() => {
    configurarConta({
      obterConta: contaAtiva.donoId,
      aoPerderConta: (donoId) => {
        void contaAtiva.perder(donoId).then((mudou) => {
          if (mudou) void queryClient.resetQueries();
        });
      },
    });
    void contaAtiva.iniciar();
    return () => configurarConta(null);
  }, []);

  // Só a saída de quem estava logado limpa a escolha. Abrir o app na web sem
  // sessão (carregando → anônimo) mantém a conta para o próximo login.
  const { status } = useSessao();
  const anterior = useRef(status);
  useEffect(() => {
    if (anterior.current === 'autenticado' && status === 'anonimo') void contaAtiva.limpar();
    anterior.current = status;
  }, [status]);
}

/**
 * ID do usuário logado, pela primeira conta de /contas (a própria). Serve
 * para o "lançado por" não repetir o próprio nome.
 */
export function useMeuId(): string | undefined {
  return useContas().data?.contas[0]?.donoId;
}

/** Mantém o papel e o nome da conta ativa em dia com /contas. */
export function useSincronizarConta(contas: readonly ContaAlheia[] | undefined): void {
  const qc = useQueryClient();
  useEffect(() => {
    if (!contas) return;
    void contaAtiva.sincronizar(contas).then((mudou) => {
      if (mudou) void qc.resetQueries();
    });
  }, [contas, qc]);
}
