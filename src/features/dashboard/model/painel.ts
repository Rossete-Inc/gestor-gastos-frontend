import type { Fatia, Grupo, TelaDashboard } from '@/shared/api';

export type { Fatia, TelaDashboard };

/** Visões da pizza na tela: Todos, Cartão, Fixo e Por cartão (cartoes-credito). */
export type Visao = 'todas' | Grupo | 'cartoes';

export const VISOES = [
  { valor: 'todas', label: 'Todos' },
  { valor: 'CARTAO', label: 'Cartão' },
  { valor: 'FIXO', label: 'Fixo' },
  { valor: 'cartoes', label: 'Por cartão' },
] as const satisfies readonly { valor: Visao; label: string }[];

/** Quantos gastos o painel mostra em "Últimos lançamentos" (spec painel-gastos). */
export const MAX_ULTIMOS = 5;

const ROTULO_DO_GRUPO: Record<Grupo, string> = { CARTAO: 'Cartão', FIXO: 'Fixo' };

/** Fatias de uma visão, já em ordem decrescente e com percentuais do BFF. */
export const fatiasDaVisao = (tela: TelaDashboard, visao: Visao): Fatia[] => tela.pizza[visao];

/** Total da visão: o do mês em "Todos" e "Por cartão", o do grupo nas outras. */
export function totalDaVisao(tela: TelaDashboard, visao: Visao): number {
  if (visao === 'todas' || visao === 'cartoes') return tela.totalCentavos;
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

/**
 * Título do detalhe da fatia (spec painel-gastos, "Detalhe da fatia do
 * gráfico"): nome, grupo (só nas fatias de categoria), valor e percentual.
 *
 *     tituloDoDetalhe(alimentacao, 'R$ 420,00') // => "Alimentação · Cartão · R$ 420,00 · 35%"
 */
export function tituloDoDetalhe(f: Fatia, valor: string): string {
  const grupo = f.categoriaId && f.grupo ? [ROTULO_DO_GRUPO[f.grupo]] : [];
  return [f.nome, ...grupo, valor, formatarPercentual(f.percentualDecimos)].join(' · ');
}

/** "03/11" a partir de "2026-11-03", como no ExpenseItem da referência. */
export const diaMes = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
