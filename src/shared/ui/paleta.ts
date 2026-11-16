// Paleta que o usuário escolhe para categorias e cartões: famílias de cor,
// cada uma em três tons. São dados (gravados na categoria ou no cartão e
// usados na pizza do painel), não tokens de UI. O tom médio de cada família é
// o das 12 categorias padrão do categories-service, para a pizza não ficar
// com tons destoantes; o claro e o escuro são da mesma escala.

export type Tom = 'claro' | 'medio' | 'escuro';

export const TONS = [
  { valor: 'claro', label: 'claro' },
  { valor: 'medio', label: 'médio' },
  { valor: 'escuro', label: 'escuro' },
] as const satisfies readonly { valor: Tom; label: string }[];

export const PALETA = [
  { familia: 'Vermelho', claro: '#FCA5A5', medio: '#EF4444', escuro: '#B91C1C' },
  { familia: 'Laranja', claro: '#FDBA74', medio: '#F97316', escuro: '#C2410C' },
  { familia: 'Amarelo', claro: '#FDE047', medio: '#EAB308', escuro: '#A16207' },
  { familia: 'Lima', claro: '#BEF264', medio: '#84CC16', escuro: '#4D7C0F' },
  { familia: 'Verde', claro: '#86EFAC', medio: '#22C55E', escuro: '#15803D' },
  { familia: 'Azul-petróleo', claro: '#5EEAD4', medio: '#14B8A6', escuro: '#0F766E' },
  { familia: 'Ciano', claro: '#67E8F9', medio: '#06B6D4', escuro: '#0E7490' },
  { familia: 'Azul-céu', claro: '#7DD3FC', medio: '#0EA5E9', escuro: '#0369A1' },
  { familia: 'Azul', claro: '#93C5FD', medio: '#3B82F6', escuro: '#1D4ED8' },
  { familia: 'Índigo', claro: '#A5B4FC', medio: '#6366F1', escuro: '#4338CA' },
  { familia: 'Roxo', claro: '#D8B4FE', medio: '#A855F7', escuro: '#7E22CE' },
  { familia: 'Rosa', claro: '#F9A8D4', medio: '#EC4899', escuro: '#BE185D' },
  { familia: 'Cinza', claro: '#CBD5E1', medio: '#64748B', escuro: '#334155' },
] as const satisfies readonly ({ familia: string } & Record<Tom, string>)[];

/** Todas as cores da paleta, família por família, do claro ao escuro. */
export const CORES: readonly string[] = PALETA.flatMap((f) => TONS.map((t) => f[t.valor]));

/** "Laranja médio" para o leitor de tela; a própria cor se não for da paleta. */
export function nomeDaCor(cor: string): string {
  for (const f of PALETA) {
    const tom = TONS.find((t) => f[t.valor] === cor.toUpperCase());
    if (tom) return `${f.familia} ${tom.label}`;
  }
  return cor;
}
