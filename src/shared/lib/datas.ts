// Datas exibidas ao usuário, no fuso do dispositivo e em pt-BR.

/** "9 de novembro de 2026" a partir de um instante ISO 8601. */
export function formatarDataLonga(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(iso));
}
