import {
  brParaISO,
  centavosAposEdicao,
  centavosDeDigitos,
  formatarCentavos,
  hojeISO,
  isoParaBR,
  mascararDataBR,
  mesAtual,
  rotuloDoDia,
  rotuloDoMes,
  somarMeses,
} from '.';

describe('moeda', () => {
  it('formata centavos em reais', () => {
    expect(formatarCentavos(4590)).toBe('R$ 45,90');
    expect(formatarCentavos(150000)).toBe('R$ 1.500,00');
    expect(formatarCentavos(100_000_000)).toBe('R$ 1.000.000,00');
    expect(formatarCentavos(1)).toBe('R$ 0,01');
    expect(formatarCentavos(0)).toBe('R$ 0,00');
    expect(formatarCentavos(-30)).toBe('-R$ 0,30');
  });

  it('lê o que foi digitado como centavos, sem float (spec, "Soma de centavos")', () => {
    expect(centavosDeDigitos('4590')).toBe(4590);
    expect(centavosDeDigitos('R$ 45,90')).toBe(4590);
    expect(centavosDeDigitos('R$ 45,905')).toBe(45905);
    expect(centavosDeDigitos('')).toBe(0);
    expect(centavosDeDigitos('000010')).toBe(10);
    expect(centavosDeDigitos('99999999999999')).toBe(100_000_000);
    expect(centavosDeDigitos('10') + centavosDeDigitos('20')).toBe(30);
  });
});

describe('centavosAposEdicao', () => {
  // Simula uma tecla inserida na posição p do texto formatado.
  const digitar = (centavos: number, tecla: string, p: number) => {
    const t = formatarCentavos(centavos);
    return centavosAposEdicao(centavos, t.slice(0, p) + tecla + t.slice(p));
  };

  it('dígitos entram pela direita, com o cursor em qualquer lugar', () => {
    for (const p of [3, 4, 5, 7]) {
      let c = 0;
      for (const tecla of '4590') c = digitar(c, tecla, p);
      expect(c).toBe(4590);
    }
  });

  it('apagar tira o último dígito, de qualquer lugar', () => {
    expect(centavosAposEdicao(4590, 'R$ 45,9')).toBe(459);
    expect(centavosAposEdicao(4590, 'R$ 4,90')).toBe(459);
    expect(centavosAposEdicao(5, 'R$ 0,0')).toBe(0);
    expect(centavosAposEdicao(150000, 'R$ 1.50,00')).toBe(15000);
    // Apagar só o ponto de milhar não tira dígito: o valor fica.
    expect(centavosAposEdicao(150000, 'R$ 1500,00')).toBe(150000);
  });

  it('texto sem máscara é lido inteiro e o teto vale', () => {
    expect(centavosAposEdicao(4590, '150000')).toBe(150000);
    expect(centavosAposEdicao(0, '')).toBe(0);
    expect(centavosAposEdicao(100_000_000, 'R$ 1.000.000,009')).toBe(100_000_000);
  });
});

describe('datas', () => {
  const agora = new Date(2026, 10, 3, 23, 59); // 03/11/2026, 23h59 local

  it('mês e dia correntes no fuso do dispositivo', () => {
    expect(mesAtual(agora)).toBe('2026-11');
    expect(hojeISO(agora)).toBe('2026-11-03');
  });

  it('soma meses atravessando o ano', () => {
    expect(somarMeses('2026-11', 1)).toBe('2026-12');
    expect(somarMeses('2026-12', 1)).toBe('2027-01');
    expect(somarMeses('2026-01', -1)).toBe('2025-12');
    expect(somarMeses('2026-03', -14)).toBe('2025-01');
  });

  it('rótulos', () => {
    expect(rotuloDoMes('2026-11')).toBe('Novembro de 2026');
    expect(rotuloDoMes('2027-03')).toBe('Março de 2027');
    expect(rotuloDoDia('2026-11-03')).toBe('Terça, 03/11');
    expect(rotuloDoDia('2026-11-01')).toBe('Domingo, 01/11');
  });

  it('converte entre AAAA-MM-DD e DD/MM/AAAA', () => {
    expect(isoParaBR('2026-11-03')).toBe('03/11/2026');
    expect(brParaISO('03/11/2026')).toBe('2026-11-03');
    expect(brParaISO('29/02/2028')).toBe('2028-02-29');
    expect(brParaISO('30/02/2026')).toBeNull();
    expect(brParaISO('3/11/2026')).toBeNull();
    expect(brParaISO('03/13/2026')).toBeNull();
  });

  it('máscara de data enquanto se digita', () => {
    expect(mascararDataBR('03')).toBe('03');
    expect(mascararDataBR('0311')).toBe('03/11');
    expect(mascararDataBR('03112026')).toBe('03/11/2026');
    expect(mascararDataBR('03/11/20261')).toBe('03/11/2026');
    expect(mascararDataBR('ab03')).toBe('03');
  });
});
