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

/** Senha nova: precisa atender à política de senha da spec. */
const senhaForte = z.string().superRefine((senha, ctx) => {
  const faltando = regrasNaoAtendidas(senha);
  if (faltando.length > 0) ctx.addIssue({ code: 'custom', message: descreverRegras(faltando) });
});

const codigo = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'O código tem 6 números.');

export const CadastroSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome.').max(100, 'O nome pode ter até 100 caracteres.'),
  email,
  senha: senhaForte,
});
export type CadastroInput = z.infer<typeof CadastroSchema>;

export const ConfirmacaoSchema = z.object({ codigo });
export type ConfirmacaoInput = z.infer<typeof ConfirmacaoSchema>;

const confirmacaoIgual = (d: { novaSenha: string; confirmacao: string }) =>
  d.confirmacao === d.novaSenha;
const confirmacaoErrada = { message: 'As senhas não conferem.', path: ['confirmacao'] };

export const TrocaSenhaSchema = z
  .object({
    senhaAtual: z.string().min(1, 'Informe a senha atual.'),
    novaSenha: senhaForte,
    confirmacao: z.string(),
  })
  .refine(confirmacaoIgual, confirmacaoErrada)
  .refine((d) => d.novaSenha !== d.senhaAtual, {
    message: 'A nova senha precisa ser diferente da atual.',
    path: ['novaSenha'],
  });
export type TrocaSenhaInput = z.infer<typeof TrocaSenhaSchema>;

export const EsqueciSenhaSchema = z.object({ email });
export type EsqueciSenhaInput = z.infer<typeof EsqueciSenhaSchema>;

export const RedefinirSenhaSchema = z
  .object({ codigo, novaSenha: senhaForte, confirmacao: z.string() })
  .refine(confirmacaoIgual, confirmacaoErrada);
export type RedefinirSenhaInput = z.infer<typeof RedefinirSenhaSchema>;
