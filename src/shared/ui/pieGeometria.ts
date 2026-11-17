// Que fatia do donut está num ponto, com a mesma geometria do
// react-native-gifted-charts (PieChart com initialAngle 0): a primeira fatia
// começa no topo (12 h) e as seguintes seguem no sentido horário, cada uma
// com o ângulo proporcional ao valor.

/**
 * Índice da fatia sob o ponto (x, y), medido a partir do canto superior
 * esquerdo de um quadrado de lado `lado` com o donut centralizado; null fora
 * do anel (no furo ou fora do raio).
 */
export function fatiaNoPonto(
  x: number,
  y: number,
  lado: number,
  raio: number,
  raioInterno: number,
  valores: readonly number[],
): number | null {
  const dx = x - lado / 2;
  const dy = y - lado / 2;
  const distancia = Math.hypot(dx, dy);
  if (distancia < raioInterno || distancia > raio) return null;
  const limites = limitesDasFatias(valores);
  if (!limites) return null;

  // Ângulo a partir do topo, no sentido horário, em [0, 1) de volta.
  let volta = Math.atan2(dx, -dy) / (2 * Math.PI);
  if (volta < 0) volta += 1;

  const i = limites.findIndex(([, fim]) => volta < fim);
  return i === -1 ? valores.length - 1 : i;
}

/**
 * Ponto no meio do arco da fatia `indice`, a `raio` do centro, relativo ao
 * centro (x para a direita, y para baixo). `emCima` diz se ele fica na
 * metade de cima do gráfico. Null se não há valores ou o índice não existe.
 *
 *     pontoDaFatia(0, [1, 1], 100) // => x ≈ 100, y ≈ 0 (3 h, meio da 1ª metade)
 */
export function pontoDaFatia(
  indice: number,
  valores: readonly number[],
  raio: number,
): { x: number; y: number; emCima: boolean } | null {
  const limite = limitesDasFatias(valores)?.[indice];
  if (!limite) return null;
  const angulo = ((limite[0] + limite[1]) / 2) * 2 * Math.PI;
  const x = Math.sin(angulo) * raio;
  const y = -Math.cos(angulo) * raio;
  return { x, y, emCima: y < 0 };
}

/** Início e fim de cada fatia, em fração de volta a partir do topo. */
function limitesDasFatias(valores: readonly number[]): [number, number][] | null {
  const total = valores.reduce((s, v) => s + Math.max(v, 0), 0);
  if (total <= 0) return null;
  let acumulado = 0;
  return valores.map((v) => {
    const inicio = acumulado;
    acumulado += Math.max(v, 0) / total;
    return [inicio, acumulado];
  });
}
