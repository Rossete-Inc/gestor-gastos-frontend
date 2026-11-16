// No iOS e no Android não há mouse: o detalhe das fatias abre pelo toque. A
// versão da web é ponteiro.ts (ponteiroWeb.ts).
export function ouvirPonteiro(
  _alvo: unknown,
  _aoMover: (x: number, y: number) => void,
  _aoSair: () => void,
): () => void {
  return () => {};
}
