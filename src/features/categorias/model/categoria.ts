import { z } from 'zod';

import type { Categoria, CategoriaIn, CategoriasPorGrupo, Grupo } from '@/shared/api';

export type { Categoria, CategoriasPorGrupo, Grupo };

/** Grupos na ordem em que aparecem, com o rótulo da tela. */
export const GRUPOS = [
  { valor: 'CARTAO', label: 'Cartão' },
  { valor: 'FIXO', label: 'Fixo' },
] as const satisfies readonly { valor: Grupo; label: string }[];

export const rotuloDoGrupo = (g: Grupo) => GRUPOS.find((x) => x.valor === g)!.label;

// A paleta é compartilhada com o cadastro de cartões (shared/ui/paleta).
export { CORES, PALETA, TONS, nomeDaCor, type Tom } from '@/shared/ui';

/** Cor já marcada ao abrir o formulário: Laranja médio. */
export const COR_INICIAL = '#F97316';

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
