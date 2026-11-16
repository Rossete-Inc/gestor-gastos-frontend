import {
  diaMes,
  fatiasDaVisao,
  formatarPercentual,
  tituloDoDetalhe,
  totalDaVisao,
  type Fatia,
  type TelaDashboard,
} from './painel';

const tela: TelaDashboard = {
  mes: '2026-11',
  totalCentavos: 351_000,
  totaisPorGrupo: [
    { grupo: 'CARTAO', totalCentavos: 118_000 },
    { grupo: 'FIXO', totalCentavos: 233_000 },
  ],
  totaisPorCartao: [{ nome: 'Sem cartão', cor: '#9E9E9E', totalCentavos: 351_000 }],
  pizza: {
    todas: [
      {
        categoriaId: 'aluguel',
        grupo: 'FIXO',
        nome: 'Aluguel',
        cor: '#0EA5E9',
        totalCentavos: 150_000,
        percentualDecimos: 1000,
        detalhe: [],
      },
    ],
    CARTAO: [],
    FIXO: [],
    grupos: [],
    cartoes: [],
  },
  ultimos: [],
};

describe('model do painel', () => {
  it('formata percentuais em décimos sem perder a soma de 100%', () => {
    expect(formatarPercentual(750)).toBe('75%'); // => "75%"
    expect(formatarPercentual(433)).toBe('43,3%'); // => "43,3%"
    expect(formatarPercentual(1000)).toBe('100%');
    expect(formatarPercentual(3)).toBe('0,3%');
    expect(formatarPercentual(0)).toBe('0%');
  });

  it('dá o total e as fatias de cada visão', () => {
    expect(totalDaVisao(tela, 'todas')).toBe(351_000);
    expect(totalDaVisao(tela, 'cartoes')).toBe(351_000);
    expect(totalDaVisao(tela, 'CARTAO')).toBe(118_000);
    expect(totalDaVisao(tela, 'FIXO')).toBe(233_000);
    expect(totalDaVisao({ ...tela, totaisPorGrupo: [] }, 'FIXO')).toBe(0);
    expect(fatiasDaVisao(tela, 'todas')).toHaveLength(1);
    expect(fatiasDaVisao(tela, 'CARTAO')).toEqual([]);
    expect(fatiasDaVisao(tela, 'cartoes')).toEqual([]);
  });

  it('monta o título do detalhe da fatia (spec, "Passar o mouse numa categoria")', () => {
    const alimentacao: Fatia = {
      categoriaId: 'alimentacao',
      grupo: 'CARTAO',
      nome: 'Alimentação',
      totalCentavos: 42_000,
      percentualDecimos: 350,
      detalhe: [],
    };
    expect(tituloDoDetalhe(alimentacao, 'R$ 420,00')).toBe(
      'Alimentação · Cartão · R$ 420,00 · 35%',
    );
    // Fatia de cartão não tem grupo no título.
    const nubank: Fatia = {
      cartaoId: 'k1',
      nome: 'Nubank',
      totalCentavos: 1,
      percentualDecimos: 200,
      detalhe: [],
    };
    expect(tituloDoDetalhe(nubank, 'R$ 0,01')).toBe('Nubank · R$ 0,01 · 20%');
  });

  it('mostra dia e mês como na referência', () => {
    expect(diaMes('2026-11-03')).toBe('03/11'); // => "03/11"
  });
});
