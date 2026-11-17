import { fatiaNoPonto, pontoDaFatia } from './pieGeometria';

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

describe('pontoDaFatia', () => {
  const perto = (p: ReturnType<typeof pontoDaFatia>, x: number, y: number) => {
    expect(p!.x).toBeCloseTo(x);
    expect(p!.y).toBeCloseTo(y);
  };

  it('quatro fatias iguais: meio de cada quarto, a partir do topo, no sentido horário', () => {
    const v = [1, 1, 1, 1];
    const r = 100 / Math.SQRT2;
    perto(pontoDaFatia(0, v, 100), r, -r); // 1h30
    perto(pontoDaFatia(1, v, 100), r, r); // 4h30
    perto(pontoDaFatia(2, v, 100), -r, r); // 7h30
    perto(pontoDaFatia(3, v, 100), -r, -r); // 10h30
    expect(pontoDaFatia(0, v, 100)!.emCima).toBe(true);
    expect(pontoDaFatia(1, v, 100)!.emCima).toBe(false);
  });

  it('duas metades: 3 h e 9 h; fatia única: 6 h', () => {
    perto(pontoDaFatia(0, [1, 1], 100), 100, 0); // => 3 h
    perto(pontoDaFatia(1, [1, 1], 100), -100, 0); // => 9 h
    perto(pontoDaFatia(0, [5], 100), 0, 100); // => 6 h
  });

  it('sem valores ou índice inexistente não há ponto', () => {
    expect(pontoDaFatia(0, [0, 0], 100)).toBeNull();
    expect(pontoDaFatia(3, [1, 1], 100)).toBeNull();
  });
});
