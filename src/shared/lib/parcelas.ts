import { somarMeses } from './datas';

// Regra das parcelas (spec parcelamentos-recorrencias), igual à do
// expenses-service (internal/serie). O serviço é a fonte da verdade; aqui ela
// só serve para a prévia do formulário ("3× de R$ 400,00 · dez/2026 a
// fev/2027").

export const MIN_PARCELAS = 2;
export const MAX_PARCELAS = 72;

/**
 * Divide o total em n parcelas iguais em centavos, com o resto na 1ª.
 *
 *     dividirTotal(10_000, 3) // => [3334, 3333, 3333]
 */
export function dividirTotal(total: number, n: number): number[] {
  const base = Math.floor(total / n);
  const v = Array.from({ length: n }, () => base);
  v[0]! += total - base * n;
  return v;
}

/** Meses de de até ate (AAAA-MM); negativo se ate vier antes. */
export function mesesEntre(de: string, ate: string): number {
  const [a1, m1] = de.split('-').map(Number);
  const [a2, m2] = ate.split('-').map(Number);
  return (a2! - a1!) * 12 + (m2! - m1!);
}

export type PedidoParcelas = {
  modo: 'TOTAL' | 'PARCELA';
  /** Total (modo TOTAL) ou valor de cada parcela (modo PARCELA), em centavos. */
  valorCentavos: number;
  /** Total de parcelas; 0 = calcular pelo mês final. */
  parcelas: number;
  /** Parcela da data informada (modo PARCELA); 1 no modo TOTAL. */
  parcelaAtual: number;
  /** Mês (AAAA-MM) da fatura da última parcela; "" = usar parcelas. */
  mesFinal: string;
  /** Mês de referência (AAAA-MM) da 1ª parcela criada. */
  primeiroMes: string;
};

export type PreviaParcelas = {
  /** Quantas parcelas serão criadas (da atual até a última). */
  criadas: number;
  total: number;
  valorParcela: number;
  /** Valor da 1ª parcela criada, com o resto da divisão. */
  valorPrimeira: number;
  primeiroMes: string;
  ultimoMes: string;
};

/**
 * Prévia do parcelamento, ou null se os números ainda não fecham (o serviço
 * devolve o erro de campo ao salvar).
 *
 *     previaParcelas({ modo: 'TOTAL', valorCentavos: 120_000, parcelas: 3,
 *       parcelaAtual: 1, mesFinal: '', primeiroMes: '2026-12' })
 *     // => { criadas: 3, total: 3, valorParcela: 40000, valorPrimeira: 40000,
 *     //      primeiroMes: '2026-12', ultimoMes: '2027-02' }
 */
export function previaParcelas(p: PedidoParcelas): PreviaParcelas | null {
  const atual = p.modo === 'TOTAL' ? 1 : p.parcelaAtual || 1;
  const total = p.parcelas || (p.mesFinal ? atual + mesesEntre(p.primeiroMes, p.mesFinal) : 0);
  if (total < MIN_PARCELAS || total > MAX_PARCELAS || atual > total || p.valorCentavos < 1)
    return null;
  const criadas = total - atual + 1;
  if (p.modo === 'PARCELA') {
    return {
      criadas,
      total,
      valorParcela: p.valorCentavos,
      valorPrimeira: p.valorCentavos,
      primeiroMes: p.primeiroMes,
      ultimoMes: somarMeses(p.primeiroMes, criadas - 1),
    };
  }
  if (p.valorCentavos < total) return null;
  const valores = dividirTotal(p.valorCentavos, total);
  return {
    criadas,
    total,
    valorParcela: valores[valores.length - 1]!,
    valorPrimeira: valores[0]!,
    primeiroMes: p.primeiroMes,
    ultimoMes: somarMeses(p.primeiroMes, criadas - 1),
  };
}

/** "05/2027" a partir de "2027-05", e o inverso; null se inválido. */
export function mesParaBR(mes: string): string {
  const [a, m] = mes.split('-');
  return a && m ? `${m}/${a}` : '';
}

export function brParaMes(br: string): string | null {
  const m = /^(\d{2})\/(\d{4})$/.exec(br);
  if (!m) return null;
  const mes = Number(m[1]);
  return mes >= 1 && mes <= 12 ? `${m[2]}-${m[1]}` : null;
}

/** Máscara MM/AAAA enquanto se digita. */
export function mascararMesBR(texto: string): string {
  const d = texto.replace(/\D/g, '').slice(0, 6);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}
