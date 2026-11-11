import {
  diaMes,
  fatiasDaVisao,
  formatarPercentual,
  formatarReaisCompacto,
  totalDaVisao,
  type TelaDashboard,
} from './painel';

const tela: TelaDashboard = {
  mes: '2026-11',
  totalCentavos: 351_000,
  totaisPorGrupo: [
    { grupo: 'CARTAO', totalCentavos: 118_000 },
    { grupo: 'FIXO', totalCentavos: 233_000 },
  ],
  pizza: {
    todas: [
      {
        categoriaId: 'aluguel',
        nome: 'Aluguel',
        cor: '#0EA5E9',
        totalCentavos: 150_000,
        percentualDecimos: 1000,
      },
    ],
    CARTAO: [],
    FIXO: [],
    grupos: [],
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

  it('formata o total do centro do gráfico sem centavos', () => {
    expect(formatarReaisCompacto(351_000)).toBe('R$ 3.510'); // => "R$ 3.510"
    expect(formatarReaisCompacto(4_590)).toBe('R$ 46');
    expect(formatarReaisCompacto(0)).toBe('R$ 0');
    expect(formatarReaisCompacto(100_000_000_00)).toBe('R$ 100.000.000');
  });

  it('dá o total e as fatias de cada visão', () => {
    expect(totalDaVisao(tela, 'todas')).toBe(351_000);
    expect(totalDaVisao(tela, 'CARTAO')).toBe(118_000);
    expect(totalDaVisao(tela, 'FIXO')).toBe(233_000);
    expect(totalDaVisao({ ...tela, totaisPorGrupo: [] }, 'FIXO')).toBe(0);
    expect(fatiasDaVisao(tela, 'todas')).toHaveLength(1);
    expect(fatiasDaVisao(tela, 'CARTAO')).toEqual([]);
  });

  it('mostra dia e mês como na referência', () => {
    expect(diaMes('2026-11-03')).toBe('03/11'); // => "03/11"
  });
});
