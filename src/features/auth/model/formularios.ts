import { z } from 'zod';

import { descreverRegras, regrasNaoAtendidas } from './senha';

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Informe o e-mail.')
  .pipe(z.email('E-mail inválido.'));

export const LoginSchema = z.object({
  email,
  senha: z.string().min(1, 'Informe a senha.'),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const CadastroSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome.').max(100, 'O nome pode ter até 100 caracteres.'),
  email,
  senha: z.string().superRefine((senha, ctx) => {
    const faltando = regrasNaoAtendidas(senha);
    if (faltando.length > 0) ctx.addIssue({ code: 'custom', message: descreverRegras(faltando) });
  }),
});
export type CadastroInput = z.infer<typeof CadastroSchema>;

export const ConfirmacaoSchema = z.object({
  codigo: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'O código tem 6 números.'),
});
export type ConfirmacaoInput = z.infer<typeof ConfirmacaoSchema>;
