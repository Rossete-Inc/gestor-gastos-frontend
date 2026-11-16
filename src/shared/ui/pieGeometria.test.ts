import { fatiaNoPonto } from './pieGeometria';

// Donut num quadrado de 200 px: centro (100, 100), anel entre 64 e 100.
const no = (x: number, y: number, valores: number[]) => fatiaNoPonto(x, y, 200, 100, 64, valores);

describe('fatiaNoPonto', () => {
  it('três fatias iguais: topo-direita é a 1ª, embaixo a 2ª, esquerda a 3ª', () => {
    const v = [1, 1, 1];
    expect(no(130, 15, v)).toBe(0); // pouco depois das 12 h
    expect(no(100, 185, v)).toBe(1); // 6 h (meia volta)
    expect(no(15, 100, v)).toBe(2); // 9 h (3/4 de volta)
  });

  it('75% e 25%: só o quarto superior esquerdo é da 2ª', () => {
    const v = [750, 250];
    expect(no(185, 100, v)).toBe(0); // 3 h
    expect(no(100, 185, v)).toBe(0); // 6 h
    expect(no(30, 40, v)).toBe(1); // entre 9 h e 12 h
  });

  it('fora do anel não há fatia', () => {
    expect(no(100, 100, [1])).toBeNull(); // centro (furo)
    expect(no(100, 40, [1])).toBeNull(); // dentro do furo (raio 60)
    expect(no(0, 0, [1])).toBeNull(); // canto, além do raio
    expect(no(100, 15, [0, 0])).toBeNull(); // sem valores
  });
});
