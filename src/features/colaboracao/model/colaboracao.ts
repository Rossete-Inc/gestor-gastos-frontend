import { z } from 'zod';

import { ApiError } from '@/shared/api';

import type { PapelColaborador } from './contaAtiva';

export const ROTULO_DO_PAPEL: Record<PapelColaborador, string> = {
  EDITOR: 'Editor',
  LEITOR: 'Leitor',
};

export const PAPEIS = [
  { valor: 'EDITOR', label: 'Editor' },
  { valor: 'LEITOR', label: 'Leitor' },
] as const satisfies readonly { valor: PapelColaborador; label: string }[];

// Validação rápida no cliente; normalização, limite e duplicidade são do
// users-service.
export const ConviteSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Informe o e-mail.')
    .max(254, 'E-mail longo demais.')
    .pipe(z.email('E-mail inválido.')),
  papel: z.enum(['EDITOR', 'LEITOR']),
});
export type ConviteForm = z.infer<typeof ConviteSchema>;

/** Mensagem para o usuário a partir do erro do BFF. */
export function mensagemDeErro(e: unknown, padrao: string): string {
  if (!(e instanceof ApiError)) return padrao;
  switch (e.code) {
    case 'limite_colaboradores':
      return 'A conta já tem 5 colaboradores e convites. Remova alguém ou cancele um convite.';
    case 'ja_colaborador':
      return 'Essa pessoa já colabora na sua conta.';
    case 'convite_existente':
      return 'Já existe um convite pendente para esse e-mail.';
    case 'convite_nao_encontrado':
      return 'Esse convite não existe mais.';
    default:
      return e.errors[0]?.message ? `${e.detail} ${e.errors[0].message}` : e.detail;
  }
}

export const tomDoErro = (e: unknown) =>
  e instanceof ApiError && e.status === 0 ? ('offline' as const) : ('error' as const);
