import {
  brParaMes,
  dividirTotal,
  mascararMesBR,
  mesParaBR,
  mesesEntre,
  previaParcelas,
  type PedidoParcelas,
} from './parcelas';

// Mesmos casos de tabela do expenses-service (internal/serie/serie_test.go).
const pedido = (p: Partial<PedidoParcelas>): PedidoParcelas => ({
  modo: 'TOTAL',
  valorCentavos: 120_000,
  parcelas: 3,
  parcelaAtual: 1,
  mesFinal: '',
  primeiroMes: '2026-12',
  ...p,
});

describe('parcelas', () => {
  it('divide o total com o resto na 1ª (cenário "Divisão com resto")', () => {
    expect(dividirTotal(10_000, 3)).toEqual([3334, 3333, 3333]); // => [3334, 3333, 3333]
    expect(dividirTotal(120_000, 3)).toEqual([40_000, 40_000, 40_000]);
  });

  it('prévia da divisão exata: 3× de R$ 400,00 de dezembro a fevereiro', () => {
    expect(previaParcelas(pedido({}))).toEqual({
      criadas: 3,
      total: 3,
      valorParcela: 40_000,
      valorPrimeira: 40_000,
      primeiroMes: '2026-12',
      ultimoMes: '2027-02',
    });
  });

  it('compra em andamento: 3/10 cria 8 parcelas, de dezembro a julho', () => {
    const p = previaParcelas(
      pedido({ modo: 'PARCELA', valorCentavos: 19_990, parcelas: 10, parcelaAtual: 3 }),
    );
    expect(p).toMatchObject({ criadas: 8, total: 10, valorParcela: 19_990, ultimoMes: '2027-07' });
  });

  it('informar o mês final: até julho de 2027 dá 8 parcelas', () => {
    const p = previaParcelas(pedido({ modo: 'PARCELA', parcelas: 0, mesFinal: '2027-07' }));
    expect(p).toMatchObject({ criadas: 8, total: 8, ultimoMes: '2027-07' });
  });

  it('números que não fecham não têm prévia', () => {
    expect(previaParcelas(pedido({ parcelas: 1 }))).toBeNull();
    expect(previaParcelas(pedido({ parcelas: 73 }))).toBeNull();
    expect(previaParcelas(pedido({ modo: 'PARCELA', parcelas: 10, parcelaAtual: 11 }))).toBeNull();
    expect(
      previaParcelas(pedido({ modo: 'PARCELA', parcelas: 0, mesFinal: '2026-11' })),
    ).toBeNull();
    expect(previaParcelas(pedido({ valorCentavos: 2 }))).toBeNull();
  });

  it('meses e máscara MM/AAAA', () => {
    expect(mesesEntre('2026-12', '2027-07')).toBe(7);
    expect(mesParaBR('2027-05')).toBe('05/2027');
    expect(brParaMes('05/2027')).toBe('2027-05');
    expect(brParaMes('13/2027')).toBeNull();
    expect(mascararMesBR('052027')).toBe('05/2027');
    expect(mascararMesBR('0')).toBe('0');
  });
});
