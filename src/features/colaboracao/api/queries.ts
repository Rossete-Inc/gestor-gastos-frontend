import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { bff, bffSchemas } from '@/shared/api';

import { contaAtiva, type ContaAlheia, type PapelColaborador } from '../model/contaAtiva';

export const colaboracaoKeys = {
  all: ['colaboracao'] as const,
  contas: () => [...colaboracaoKeys.all, 'contas'] as const,
  colaboradores: () => [...colaboracaoKeys.all, 'colaboradores'] as const,
};

/**
 * A própria conta (primeira), as contas em que o usuário colabora e os
 * convites recebidos. Não depende da conta ativa: o BFF ignora o X-Conta aqui.
 */
export function useContas() {
  return useQuery({
    queryKey: colaboracaoKeys.contas(),
    queryFn: async () => bffSchemas.ObterContasResponse.parse(await bff.obterContas()),
  });
}

/** Contas alheias de uma resposta de /contas (sem a própria, que vem primeiro). */
export function contasAlheias(
  contas: readonly { donoId: string; nomeDono: string; papel: string }[],
) {
  return contas.flatMap((c): ContaAlheia[] =>
    c.papel === 'EDITOR' || c.papel === 'LEITOR'
      ? [{ donoId: c.donoId, nomeDono: c.nomeDono, papel: c.papel }]
      : [],
  );
}

/**
 * Troca de conta: o cache é da conta anterior, então todas as consultas
 * recomeçam, já com o X-Conta novo.
 */
export function useTrocarConta() {
  const qc = useQueryClient();
  return async (conta: ContaAlheia | null) => {
    if (await contaAtiva.escolher(conta)) await qc.resetQueries();
  };
}

/**
 * Membros e convites pendentes da própria conta (só o dono). Busca de novo a
 * cada abertura da tela: o aceite acontece no aparelho de outra pessoa, e o
 * cache de 30 s mostraria o convite ainda pendente.
 */
export function useColaboradores() {
  return useQuery({
    queryKey: colaboracaoKeys.colaboradores(),
    refetchOnMount: 'always',
    queryFn: async () =>
      bffSchemas.ListarColaboradoresResponse.parse(await bff.listarColaboradores()),
  });
}

function useInvalidar() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: colaboracaoKeys.all });
}

export function useConvidar() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (in_: { email: string; papel: PapelColaborador }) => bff.convidar(in_),
    onSuccess: invalidar,
  });
}

export function useMudarPapel() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ userId, papel }: { userId: string; papel: PapelColaborador }) =>
      bff.mudarPapel(userId, { papel }),
    onSuccess: invalidar,
  });
}

export function useRemoverColaborador() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (userId: string) => bff.removerColaborador(userId),
    onSuccess: invalidar,
  });
}

export function useCancelarConvite() {
  const invalidar = useInvalidar();
  return useMutation({
    // O e-mail vai no caminho: "@" e "+" precisam ser codificados.
    mutationFn: (email: string) => bff.cancelarConvite(encodeURIComponent(email)),
    onSuccess: invalidar,
  });
}

/**
 * Aceita o convite e passa a trabalhar na conta do dono. O `onAceito` fica
 * aqui, e não no `mutate`: a troca de conta recomeça o cache, a tela que
 * chamou pode desmontar (vira "Carregando") e o TanStack Query descarta os
 * callbacks do `mutate` de quem desmontou.
 */
export function useAceitarConvite(onAceito?: () => void) {
  const invalidar = useInvalidar();
  const trocar = useTrocarConta();
  return useMutation({
    mutationFn: (donoId: string) => bff.aceitarConvite(donoId),
    onSuccess: async (conta) => {
      await invalidar();
      if (conta.papel === 'EDITOR' || conta.papel === 'LEITOR') {
        await trocar({ donoId: conta.donoId, nomeDono: conta.nomeDono, papel: conta.papel });
      }
      onAceito?.();
    },
  });
}

export function useRecusarConvite() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (donoId: string) => bff.recusarConvite(donoId),
    onSuccess: invalidar,
  });
}

/**
 * Sai da conta ativa (alheia) e volta para a própria. O `onSaiu` fica aqui
 * pelo mesmo motivo de useAceitarConvite: o Perfil vira "Carregando" quando o
 * cache recomeça, e o callback do `mutate` se perderia.
 */
export function useSairDaConta(onSaiu?: () => void) {
  const invalidar = useInvalidar();
  const trocar = useTrocarConta();
  return useMutation({
    mutationFn: (donoId: string) => bff.sairDaConta(donoId),
    onSuccess: async () => {
      await trocar(null);
      onSaiu?.();
      await invalidar();
    },
  });
}
