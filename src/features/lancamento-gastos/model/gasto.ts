import { z } from 'zod';

import type { Cartao, CategoriasPorGrupo, Gasto, GastoIn, Grupo, SerieGasto } from '@/shared/api';
import {
  MAX_CENTAVOS,
  MAX_PARCELAS,
  MIN_PARCELAS,
  brParaISO,
  brParaMes,
  hojeISO,
  isoParaBR,
} from '@/shared/lib';

export type { Cartao, CategoriasPorGrupo, Gasto, GastoIn, Grupo, SerieGasto };

/** Como o gasto novo é lançado (spec parcelamentos-recorrencias). */
export type TipoLancamento = 'AVISTA' | 'PARCELADO' | 'RECORRENTE';

export const TIPOS_DE_LANCAMENTO = [
  { valor: 'AVISTA', label: 'À vista' },
  { valor: 'PARCELADO', label: 'Parcelado' },
  { valor: 'RECORRENTE', label: 'Recorrente' },
] as const satisfies readonly { valor: TipoLancamento; label: string }[];

/** Pelo valor total ou pelo valor da parcela. */
export type ModoParcela = 'TOTAL' | 'PARCELA';

export const MODOS_DE_PARCELA = [
  { valor: 'TOTAL', label: 'Pelo total' },
  { valor: 'PARCELA', label: 'Pela parcela' },
] as const satisfies readonly { valor: ModoParcela; label: string }[];

/** Alcance da edição ou exclusão num gasto de série. */
export type Escopo = 'ESTA' | 'PROXIMAS' | 'TODAS';

/** "3/10" na parcela; "Recorrente" na recorrência; null no avulso. */
export function seloDaSerie(serie?: SerieGasto): string | null {
  if (!serie) return null;
  if (serie.tipo === 'PARCELAMENTO') return `${serie.numero}/${serie.total ?? '?'}`;
  return 'Recorrente';
}

/** Filtro de cartão da lista que seleciona os gastos sem cartão (contrato do BFF). */
export const SEM_CARTAO = 'SEM_CARTAO';

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

/** Filtros da lista de gastos. Vazio = sem filtro; cartaoId aceita SEM_CARTAO. */
export type FiltrosGastos = {
  mes: string;
  grupo?: Grupo;
  categoriaId?: string;
  cartaoId?: string;
  /** Quem lançou (colaboradores). */
  autorId?: string;
};

/**
 * "por Bruno" na lista quando quem lançou não é o próprio usuário (spec
 * colaboracao, "Autoria dos lançamentos"). Sem autoria, nada.
 */
export function autoria(g: Pick<Gasto, 'lancadoPor'>, meuId: string | undefined): string | null {
  if (!g.lancadoPor || g.lancadoPor.id === meuId) return null;
  return `por ${g.lancadoPor.nome}`;
}

// Validação no cliente para responder rápido. A regra final (inclusive a
// categoria existir e ser do usuário) é do BFF e do expenses-service.
export const GastoFormSchema = z
  .object({
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
    /** Flag dos gastos antigos; o formulário só a preserva na edição. */
    recorrente: z.boolean(),
    /** "" = sem cartão. Obrigatório para categoria de cartão (conferido no formulário). */
    cartaoId: z.string(),
    tipo: z.enum(['AVISTA', 'PARCELADO', 'RECORRENTE']),
    modoParcela: z.enum(['TOTAL', 'PARCELA']),
    /** Campos de texto numéricos; "" = não informado. */
    parcelas: z.string(),
    parcelaAtual: z.string(),
    /** MM/AAAA; "" = sem mês final. */
    mesFinal: z.string(),
  })
  .superRefine((f, ctx) => {
    const erro = (path: 'parcelas' | 'parcelaAtual' | 'mesFinal', message: string) =>
      ctx.addIssue({ code: 'custom', path: [path], message });
    if (f.mesFinal && !brParaMes(f.mesFinal)) erro('mesFinal', 'Informe o mês no formato MM/AAAA.');
    if (f.tipo !== 'PARCELADO') return;
    const parcelas = inteiro(f.parcelas);
    const foraDoLimite = parcelas !== null && (parcelas < MIN_PARCELAS || parcelas > MAX_PARCELAS);
    if (foraDoLimite) erro('parcelas', `De ${MIN_PARCELAS} a ${MAX_PARCELAS} parcelas.`);
    if (f.modoParcela === 'TOTAL') {
      if (parcelas === null) erro('parcelas', 'Informe o número de parcelas.');
      return;
    }
    if (parcelas === null && !f.mesFinal)
      erro('parcelas', 'Informe o total de parcelas ou o mês final.');
    const atual = inteiro(f.parcelaAtual);
    if (f.parcelaAtual && (atual === null || atual < 1))
      erro('parcelaAtual', 'Informe a parcela atual.');
    else if (atual !== null && parcelas !== null && atual > parcelas)
      erro('parcelaAtual', 'A parcela atual não pode passar do total.');
  });

/** Inteiro positivo de um campo de texto, ou null. */
export function inteiro(texto: string): number | null {
  return /^\d+$/.test(texto) ? Number(texto) : null;
}

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
      cartaoId: '',
      ...SERIE_VAZIA,
    };
  }
  return {
    valorCentavos: gasto.valorCentavos,
    data: isoParaBR(gasto.data),
    categoriaId: gasto.categoria.id,
    descricao: gasto.descricao ?? '',
    recorrente: gasto.recorrente && !gasto.serie,
    cartaoId: gasto.cartao?.id ?? '',
    ...SERIE_VAZIA,
  };
}

const SERIE_VAZIA = {
  tipo: 'AVISTA',
  modoParcela: 'TOTAL',
  parcelas: '',
  parcelaAtual: '',
  mesFinal: '',
} as const;

/** Chave de idempotência de um envio do formulário. */
export function novaChave(): string {
  const c = globalThis.crypto;
  if (c && 'randomUUID' in c) return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Corpo do POST/PUT. O grupo não vai: o BFF usa o da categoria. Com chave
 * (só no lançamento), vão também o parcelamento ou a recorrência.
 */
export function paraGastoIn(f: GastoFormInput, chave?: string): GastoIn {
  const descricao = f.descricao.trim();
  const mesFinal = f.mesFinal ? brParaMes(f.mesFinal) : null;
  const parcelas = inteiro(f.parcelas);
  const atual = inteiro(f.parcelaAtual);
  return {
    valorCentavos: f.valorCentavos,
    data: brParaISO(f.data)!,
    categoriaId: f.categoriaId,
    recorrente: f.recorrente,
    ...(descricao ? { descricao } : {}),
    ...(f.cartaoId ? { cartaoId: f.cartaoId } : {}),
    ...(chave ? { chaveIdempotencia: chave } : {}),
    ...(chave && f.tipo === 'PARCELADO'
      ? {
          parcelamento: {
            modo: f.modoParcela,
            ...(parcelas ? { parcelas } : {}),
            ...(f.modoParcela === 'PARCELA' && atual ? { parcelaAtual: atual } : {}),
            ...(f.modoParcela === 'PARCELA' && mesFinal ? { mesFinal } : {}),
          },
        }
      : {}),
    ...(chave && f.tipo === 'RECORRENTE' ? { recorrencia: mesFinal ? { mesFinal } : {} } : {}),
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
