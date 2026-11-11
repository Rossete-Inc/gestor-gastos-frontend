import { useQuery } from '@tanstack/react-query';

import { gastosKeys } from '@/features/lancamento-gastos';
import { bff, bffSchemas } from '@/shared/api';

import type { TelaDashboard } from '../model/painel';

// O painel fica sob a raiz das chaves de gastos: lançar, editar ou excluir um
// gasto invalida o painel do mês junto com as listas (cenário "Novo gasto
// refletido").
export const painelKeys = {
  all: [...gastosKeys.all, 'painel'] as const,
  mes: (mes: string) => [...painelKeys.all, mes] as const,
};

/** Painel do mês: totais, pizza nas visões e os 5 gastos mais recentes. */
export function useTelaDashboard(mes: string) {
  return useQuery({
    queryKey: painelKeys.mes(mes),
    queryFn: async (): Promise<TelaDashboard> =>
      bffSchemas.ObterTelaDashboardResponse.parse(await bff.obterTelaDashboard({ mes })),
  });
}
