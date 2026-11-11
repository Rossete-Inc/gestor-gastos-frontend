// Datas exibidas ao usuário, no fuso do dispositivo e em pt-BR.
//
// A API usa datas sem fuso (AAAA-MM-DD) e meses (AAAA-MM). Elas são
// montadas e lidas aqui com os campos locais do Date, nunca com
// toISOString(), que converteria para UTC e poderia trocar o dia à noite.

/** "9 de novembro de 2026" a partir de um instante ISO 8601. */
export function formatarDataLonga(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(iso));
}

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const;

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'] as const;

const dois = (n: number) => String(n).padStart(2, '0');

/** Mês corrente no fuso do dispositivo: "2026-11". */
export function mesAtual(agora: Date = new Date()): string {
  return `${agora.getFullYear()}-${dois(agora.getMonth() + 1)}`;
}

/** Dia corrente no fuso do dispositivo: "2026-11-11". */
export function hojeISO(agora: Date = new Date()): string {
  return `${mesAtual(agora)}-${dois(agora.getDate())}`;
}

/** Soma n meses (negativo volta): somarMeses("2026-01", -1) => "2025-12". */
export function somarMeses(mes: string, n: number): string {
  const [ano, m] = mes.split('-').map(Number);
  const total = ano! * 12 + (m! - 1) + n;
  return `${Math.floor(total / 12)}-${dois((total % 12) + 1)}`;
}

/** "Novembro de 2026" a partir de "2026-11". */
export function rotuloDoMes(mes: string): string {
  const [ano, m] = mes.split('-').map(Number);
  return `${MESES[m! - 1]} de ${ano}`;
}

/** "Segunda, 03/11" a partir de "2026-11-03". */
export function rotuloDoDia(iso: string): string {
  const [ano, m, d] = iso.split('-').map(Number);
  return `${DIAS[new Date(ano!, m! - 1, d!).getDay()]}, ${dois(d!)}/${dois(m!)}`;
}

/** "03/11/2026" a partir de "2026-11-03". */
export function isoParaBR(iso: string): string {
  const [ano, m, d] = iso.split('-');
  return `${d}/${m}/${ano}`;
}

/**
 * "2026-11-03" a partir de "03/11/2026", ou null se não for uma data que
 * existe no calendário (31/02 é recusado).
 */
export function brParaISO(br: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br);
  if (!m) return null;
  const [d, mes, ano] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const data = new Date(ano, mes - 1, d);
  if (data.getFullYear() !== ano || data.getMonth() !== mes - 1 || data.getDate() !== d)
    return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/** Máscara DD/MM/AAAA enquanto se digita: "031120" => "03/11/20". */
export function mascararDataBR(texto: string): string {
  const d = texto.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}
