import { z } from 'zod';

import type { Categoria, CategoriaIn, CategoriasPorGrupo, Grupo } from '@/shared/api';

export type { Categoria, CategoriasPorGrupo, Grupo };

/** Grupos na ordem em que aparecem, com o rótulo da tela. */
export const GRUPOS = [
  { valor: 'CARTAO', label: 'Cartão' },
  { valor: 'FIXO', label: 'Fixo' },
] as const satisfies readonly { valor: Grupo; label: string }[];

export const rotuloDoGrupo = (g: Grupo) => GRUPOS.find((x) => x.valor === g)!.label;

/**
 * Cores que o usuário pode escolher. São dados (gravados na categoria e
 * usados na pizza do painel), não tokens de UI: por isso ficam aqui, e não
 * em shared/ui/tokens. Mesma família das 12 categorias padrão do
 * categories-service, para a pizza não ficar com tons destoantes.
 */
export const CORES = [
  '#F97316',
  '#EAB308',
  '#84CC16',
  '#22C55E',
  '#14B8A6',
  '#06B6D4',
  '#0EA5E9',
  '#3B82F6',
  '#6366F1',
  '#A855F7',
  '#EC4899',
  '#EF4444',
  '#64748B',
] as const;

/** Nome máximo, igual ao CategoriaIn do contrato. */
export const MAX_NOME = 40;

// Validação no cliente para responder rápido. A regra final (inclusive o nome
// duplicado no grupo) é do categories-service.
export const CategoriaFormSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(1, 'Informe o nome.')
    .max(MAX_NOME, `O nome pode ter até ${MAX_NOME} caracteres.`),
  grupo: z.enum(['CARTAO', 'FIXO'], 'Escolha o grupo.'),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Escolha uma cor.'),
}) satisfies z.ZodType<CategoriaIn>;

export type CategoriaFormInput = z.infer<typeof CategoriaFormSchema>;
