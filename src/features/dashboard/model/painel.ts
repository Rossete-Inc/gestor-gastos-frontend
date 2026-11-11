import type { Fatia, Grupo, TelaDashboard } from '@/shared/api';

export type { Fatia, TelaDashboard };

/** Visões da pizza na tela (referência: Todos, Cartão e Fixo). */
export type Visao = 'todas' | Grupo;

export const VISOES = [
  { valor: 'todas', label: 'Todos' },
  { valor: 'CARTAO', label: 'Cartão' },
  { valor: 'FIXO', label: 'Fixo' },
] as const satisfies readonly { valor: Visao; label: string }[];

/** Quantos gastos o painel mostra em "Últimos lançamentos" (spec painel-gastos). */
export const MAX_ULTIMOS = 5;

/** Fatias de uma visão, já em ordem decrescente e com percentuais do BFF. */
export const fatiasDaVisao = (tela: TelaDashboard, visao: Visao): Fatia[] => tela.pizza[visao];

/** Total da visão: o do mês em "Todos", o do grupo nas outras. */
export function totalDaVisao(tela: TelaDashboard, visao: Visao): number {
  if (visao === 'todas') return tela.totalCentavos;
  return tela.totaisPorGrupo.find((t) => t.grupo === visao)?.totalCentavos ?? 0;
}

/**
 * Percentual a partir de décimos de ponto percentual (750 => "75%", 433 =>
 * "43,3%"). Inteiro sem casa decimal, como na referência; com casa quando
 * houver, para os percentuais exibidos somarem 100% (cenário "Percentuais
 * somam 100%").
 */
export function formatarPercentual(decimos: number): string {
  const inteiro = Math.trunc(decimos / 10);
  const decimal = decimos % 10;
  return decimal === 0 ? `${inteiro}%` : `${inteiro},${decimal}%`;
}

/** "R$ 3.510" para o centro do gráfico: reais arredondados, sem centavos. */
export function formatarReaisCompacto(centavos: number): string {
  const reais = Math.round(centavos / 100);
  return `R$ ${String(reais).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

/** "03/11" a partir de "2026-11-03", como no ExpenseItem da referência. */
export const diaMes = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
