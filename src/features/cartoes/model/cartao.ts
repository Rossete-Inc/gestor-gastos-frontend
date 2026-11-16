import { z } from 'zod';

import type { Cartao, CartaoIn, ResumoCartao, TelaCartoes } from '@/shared/api';
import { MAX_CENTAVOS } from '@/shared/lib';

export type { Cartao, CartaoIn, ResumoCartao, TelaCartoes };

/** Apelido máximo, igual ao CartaoIn do contrato. */
export const MAX_APELIDO = 40;

/** Dias 1 a 31 para os Selects de fechamento e vencimento. */
export const DIAS = Array.from({ length: 31 }, (_, i) => i + 1);

/** Cor já marcada ao abrir o formulário: Roxo médio. */
export const COR_INICIAL_CARTAO = '#A855F7';

// Validação no cliente para responder rápido. A regra final (apelido único
// entre os ativos, limite de 20) é do expenses-service.
export const CartaoFormSchema = z.object({
  apelido: z
    .string()
    .trim()
    .min(1, 'Informe o apelido.')
    .max(MAX_APELIDO, `O apelido pode ter até ${MAX_APELIDO} caracteres.`),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Escolha a cor.'),
  diaFechamento: z.number().int().min(1, 'Escolha o dia.').max(31),
  diaVencimento: z.number().int().min(1, 'Escolha o dia.').max(31),
  limiteCentavos: z
    .number()
    .int()
    .min(1, 'Informe um limite maior que zero.')
    .max(MAX_CENTAVOS, 'O limite pode ser no máximo R$ 1.000.000,00.'),
});

export type CartaoFormInput = z.infer<typeof CartaoFormSchema>;

/** Valores iniciais: os do cartão em edição ou um cartão novo. */
export function valoresIniciais(c?: Cartao): CartaoFormInput {
  if (!c) {
    return {
      apelido: '',
      cor: COR_INICIAL_CARTAO,
      diaFechamento: 0,
      diaVencimento: 0,
      limiteCentavos: 0,
    };
  }
  return {
    apelido: c.apelido,
    cor: c.cor,
    diaFechamento: c.diaFechamento,
    diaVencimento: c.diaVencimento,
    limiteCentavos: c.limiteCentavos,
  };
}

export const paraCartaoIn = (f: CartaoFormInput): CartaoIn => ({ ...f, apelido: f.apelido.trim() });

/**
 * Fração do limite usada, de 0 a 1, para a barra (acima do limite fica em
 * 1). O disponível pode ser negativo; a barra não.
 */
export function fracaoUsada(r: ResumoCartao): number {
  if (r.cartao.limiteCentavos <= 0) return 0;
  return Math.min(1, Math.max(0, r.limiteUsadoCentavos / r.cartao.limiteCentavos));
}
