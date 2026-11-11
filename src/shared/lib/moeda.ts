// Valores em reais. A API trafega centavos inteiros (nunca float); aqui só se
// formata para exibir e se converte o que o usuário digita.

/** Valor máximo de um gasto: R$ 1.000.000,00 (GastoIn.valorCentavos). */
export const MAX_CENTAVOS = 100_000_000;

/**
 * "R$ 1.500,00" a partir de centavos. Formatado à mão (e não com Intl) para
 * sair igual na web e no Hermes, com espaço comum depois do "R$".
 */
export function formatarCentavos(centavos: number): string {
  const sinal = centavos < 0 ? '-' : '';
  const abs = Math.abs(Math.trunc(centavos));
  const reais = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const resto = String(abs % 100).padStart(2, '0');
  return `${sinal}R$ ${reais},${resto}`;
}

/**
 * Centavos a partir do que foi digitado num campo com máscara de moeda: só os
 * dígitos contam, da direita para a esquerda, como nas maquininhas
 * ("4590" => 4590, isto é, R$ 45,90). Para no teto em vez de estourar.
 */
export function centavosDeDigitos(texto: string): number {
  const digitos = texto.replace(/\D/g, '').replace(/^0+/, '').slice(0, 12);
  return Math.min(Number(digitos || '0'), MAX_CENTAVOS);
}

/**
 * Novo valor de um campo com máscara de moeda depois de uma edição, sem
 * depender da posição do cursor. Os dígitos digitados entram pela direita do
 * valor anterior e os apagados saem pela direita, como nas maquininhas: com
 * "R$ 0,00" na tela, digitar 4, 5, 9 e 0 (em qualquer posição) dá R$ 45,90.
 * Texto sem a máscara (colado ou digitado do zero) é lido como centavos.
 */
export function centavosAposEdicao(anterior: number, texto: string): number {
  if (!texto.trimStart().startsWith('R$')) return centavosDeDigitos(texto);
  const antes = formatarCentavos(anterior).replace(/\D/g, '');
  const depois = texto.replace(/\D/g, '');
  if (depois.length < antes.length) {
    return Math.floor(anterior / 10 ** (antes.length - depois.length));
  }
  let i = 0;
  while (i < antes.length && antes[i] === depois[i]) i++;
  const digitados = depois.slice(i, i + depois.length - antes.length);
  return centavosDeDigitos(String(anterior) + digitados);
}
