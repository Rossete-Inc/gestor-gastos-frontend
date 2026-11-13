import { COR_INICIAL, CORES, PALETA, nomeDaCor } from './categoria';

describe('paleta de cores', () => {
  it('tem 13 famílias em 3 tons, sem cor repetida e todas em #RRGGBB', () => {
    expect(PALETA).toHaveLength(13);
    expect(CORES).toHaveLength(39); // => 13 famílias × claro, médio, escuro
    expect(new Set(CORES).size).toBe(CORES.length);
    for (const cor of CORES) expect(cor).toMatch(/^#[0-9A-F]{6}$/);
  });

  it('mantém como tom médio as cores das categorias padrão do categories-service', () => {
    // padrao.go do categories-service: as 12 padrão e Cinza (Outros).
    const dasPadrao = ['#F97316', '#3B82F6', '#A855F7', '#EF4444', '#EC4899', '#64748B'];
    const dasFixas = ['#0EA5E9', '#EAB308', '#06B6D4', '#6366F1', '#14B8A6', '#84CC16'];
    const medios = PALETA.map((f) => f.medio as string);
    for (const cor of [...dasPadrao, ...dasFixas]) expect(medios).toContain(cor);
  });

  it('dá nome à cor para o leitor de tela', () => {
    expect(nomeDaCor(COR_INICIAL)).toBe('Laranja médio');
    expect(nomeDaCor('#7e22ce')).toBe('Roxo escuro'); // => aceita minúsculas, como o servidor
    expect(nomeDaCor('#FCA5A5')).toBe('Vermelho claro');
    expect(nomeDaCor('#123456')).toBe('#123456'); // => cor fora da paleta
  });
});
