import { z } from 'zod';

import type { CategoriasPorGrupo, Gasto, GastoIn, Grupo } from '@/shared/api';
import { MAX_CENTAVOS, brParaISO, hojeISO, isoParaBR } from '@/shared/lib';

export type { CategoriasPorGrupo, Gasto, GastoIn, Grupo };

/** Descrição máxima, igual ao GastoIn do contrato. */
export const MAX_DESCRICAO = 140;

export const ROTULO_DO_GRUPO: Record<Grupo, string> = { CARTAO: 'Cartão', FIXO: 'Fixo' };

/** Filtro de grupo da lista: "Todos" é a ausência do filtro na API. */
export type FiltroGrupo = 'TODOS' | Grupo;

export const FILTROS_DE_GRUPO = [
  { valor: 'TODOS', label: 'Todos' },
  { valor: 'CARTAO', label: 'Cartão' },
  { valor: 'FIXO', label: 'Fixo' },
] as const satisfies readonly { valor: FiltroGrupo; label: string }[];

/** Filtros da lista de gastos. Vazio = sem filtro. */
export type FiltrosGastos = { mes: string; grupo?: Grupo; categoriaId?: string };

// Validação no cliente para responder rápido. A regra final (inclusive a
// categoria existir e ser do usuário) é do BFF e do expenses-service.
export const GastoFormSchema = z.object({
  valorCentavos: z
    .number()
    .int()
    .min(1, 'Informe um valor maior que zero.')
    .max(MAX_CENTAVOS, 'O valor pode ser no máximo R$ 1.000.000,00.'),
  data: z.string().refine((v) => brParaISO(v) !== null, 'Informe uma data válida (DD/MM/AAAA).'),
  categoriaId: z.string().min(1, 'Escolha a categoria.'),
  descricao: z
    .string()
    .trim()
    .max(MAX_DESCRICAO, `A descrição pode ter até ${MAX_DESCRICAO} caracteres.`),
  recorrente: z.boolean(),
});

export type GastoFormInput = z.infer<typeof GastoFormSchema>;

/** Valores iniciais do formulário: os do gasto em edição ou um gasto novo hoje. */
export function valoresIniciais(gasto?: Gasto, agora: Date = new Date()): GastoFormInput {
  if (!gasto) {
    return {
      valorCentavos: 0,
      data: isoParaBR(hojeISO(agora)),
      categoriaId: '',
      descricao: '',
      recorrente: false,
    };
  }
  return {
    valorCentavos: gasto.valorCentavos,
    data: isoParaBR(gasto.data),
    categoriaId: gasto.categoria.id,
    descricao: gasto.descricao ?? '',
    recorrente: gasto.recorrente,
  };
}

/** Corpo do POST/PUT. O grupo não vai: o BFF usa o da categoria. */
export function paraGastoIn(f: GastoFormInput): GastoIn {
  const descricao = f.descricao.trim();
  return {
    valorCentavos: f.valorCentavos,
    data: brParaISO(f.data)!,
    categoriaId: f.categoriaId,
    recorrente: f.recorrente,
    ...(descricao ? { descricao } : {}),
  };
}

/**
 * Agrupa por dia, mantendo a ordem da API (do mais recente para o mais
 * antigo). Gastos do mesmo dia que chegam em páginas diferentes caem no mesmo
 * grupo.
 */
export function agruparPorDia(gastos: readonly Gasto[]): { data: string; gastos: Gasto[] }[] {
  const grupos: { data: string; gastos: Gasto[] }[] = [];
  for (const g of gastos) {
    const ultimo = grupos.at(-1);
    if (ultimo?.data === g.data) ultimo.gastos.push(g);
    else grupos.push({ data: g.data, gastos: [g] });
  }
  return grupos;
}

/** Grupo de uma categoria, procurando nas listas do formulário. */
export function grupoDaCategoria(cats: CategoriasPorGrupo, id: string): Grupo | undefined {
  if (cats.CARTAO.some((c) => c.id === id)) return 'CARTAO';
  if (cats.FIXO.some((c) => c.id === id)) return 'FIXO';
  return undefined;
}
