import { mesDaFatura, rotuloCurtoDoMes } from './fatura';

// Os mesmos casos de internal/cartao/cartao_test.go (expenses-service).
describe('mesDaFatura', () => {
  it.each([
    ['compra antes do fechamento', '2026-11-10', 25, 5, '2026-12'],
    ['compra depois do fechamento', '2026-11-28', 25, 5, '2027-01'],
    ['vencimento no mesmo mês do fechamento', '2026-11-02', 3, 10, '2026-11'],
    ['fechamento 31 em fevereiro', '2027-02-28', 31, 10, '2027-03'],
    ['compra no dia do fechamento', '2026-11-25', 25, 5, '2026-12'],
    ['vencimento igual ao fechamento vai ao mês seguinte', '2026-11-10', 10, 10, '2026-12'],
    ['virada de ano antes do fechamento', '2026-12-20', 25, 5, '2027-01'],
    ['virada de ano depois do fechamento', '2026-12-26', 25, 5, '2027-02'],
    ['fechamento 31 em mês de 30 dias, compra no dia 30', '2026-11-30', 31, 10, '2026-12'],
    ['fevereiro bissexto, compra no dia 29', '2028-02-29', 30, 10, '2028-03'],
    ['compra depois do fechamento com vencimento no mesmo mês', '2026-11-05', 3, 10, '2026-12'],
  ])('%s', (_, data, fechamento, vencimento, quero) => {
    expect(mesDaFatura(data, fechamento, vencimento)).toBe(quero);
  });

  it.each(['2026-02-30', '2026-13-01', '03/11/2026', ''])('data inválida %p', (data) => {
    expect(mesDaFatura(data, 25, 5)).toBeNull();
  });
});

it('rotuloCurtoDoMes', () => {
  expect(rotuloCurtoDoMes('2026-12')).toBe('dez/2026');
  expect(rotuloCurtoDoMes('2027-01')).toBe('jan/2027');
});
