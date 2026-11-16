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
  const total = valores.reduce((s, v) => s + Math.max(v, 0), 0);
  if (total <= 0) return null;

  // Ângulo a partir do topo, no sentido horário, em [0, 1) de volta.
  let volta = Math.atan2(dx, -dy) / (2 * Math.PI);
  if (volta < 0) volta += 1;

  let acumulado = 0;
  for (const [i, v] of valores.entries()) {
    acumulado += Math.max(v, 0) / total;
    if (volta < acumulado) return i;
  }
  return valores.length - 1;
}
