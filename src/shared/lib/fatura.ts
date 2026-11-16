import { somarMeses } from './datas';

// Regra da fatura do cartão (spec cartoes-credito, "Mês de referência da
// fatura"), igual à do expenses-service (internal/cartao/fatura.go). O
// serviço é a fonte da verdade; aqui ela só serve para o formulário avisar
// em que fatura o gasto vai entrar antes de salvar.

const MESES_CURTOS = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
] as const;

/** Último dia do mês (1–12): 28/29 em fevereiro, 30 ou 31 nos outros. */
const ultimoDia = (ano: number, mes: number) => new Date(ano, mes, 0).getDate();

/**
 * Mês de referência (AAAA-MM) da fatura de uma compra em `data`
 * (AAAA-MM-DD), num cartão que fecha no dia `fechamento` e vence no dia
 * `vencimento`. Data inválida devolve null.
 *
 *     mesDaFatura('2026-11-10', 25, 5) // => '2026-12'
 *     mesDaFatura('2026-11-28', 25, 5) // => '2027-01'
 *     mesDaFatura('2026-11-02', 3, 10) // => '2026-11'
 *     mesDaFatura('2027-02-28', 31, 10) // => '2027-03'
 */
export function mesDaFatura(data: string, fechamento: number, vencimento: number): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
  if (!m) return null;
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mes < 1 || mes > 12 || dia < 1 || dia > ultimoDia(ano, mes)) return null;
  let ref = `${m[1]}-${m[2]}`;
  if (dia > Math.min(fechamento, ultimoDia(ano, mes))) ref = somarMeses(ref, 1);
  if (vencimento <= fechamento) ref = somarMeses(ref, 1);
  return ref;
}

/** "dez/2026" a partir de "2026-12". */
export function rotuloCurtoDoMes(mes: string): string {
  const [ano, m] = mes.split('-').map(Number);
  return `${MESES_CURTOS[m! - 1]}/${ano}`;
}
