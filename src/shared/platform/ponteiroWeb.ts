// Ponteiro (mouse) sobre um elemento, na web: o React Native não tem hover
// em componentes de terceiros (como as fatias do gráfico), então ouvimos o
// DOM direto. As coordenadas vão relativas ao canto superior esquerdo do
// elemento.

type ElementoComRetangulo = {
  getBoundingClientRect: () => { left: number; top: number };
  addEventListener: (tipo: string, f: (e: { clientX: number; clientY: number }) => void) => void;
  removeEventListener: (tipo: string, f: (e: { clientX: number; clientY: number }) => void) => void;
};

const ehElemento = (alvo: unknown): alvo is ElementoComRetangulo =>
  typeof alvo === 'object' &&
  alvo !== null &&
  typeof (alvo as ElementoComRetangulo).getBoundingClientRect === 'function' &&
  typeof (alvo as ElementoComRetangulo).addEventListener === 'function';

/**
 * Chama aoMover(x, y) a cada movimento do ponteiro sobre o elemento e
 * aoSair() quando ele sai. Devolve a função que para de ouvir. Um alvo que
 * não seja elemento do DOM (nativo, testes) é ignorado.
 */
export function ouvirPonteiro(
  alvo: unknown,
  aoMover: (x: number, y: number) => void,
  aoSair: () => void,
): () => void {
  if (!ehElemento(alvo)) return () => {};
  const mover = (e: { clientX: number; clientY: number }) => {
    const r = alvo.getBoundingClientRect();
    aoMover(e.clientX - r.left, e.clientY - r.top);
  };
  const sair = () => aoSair();
  alvo.addEventListener('pointermove', mover);
  alvo.addEventListener('pointerleave', sair);
  return () => {
    alvo.removeEventListener('pointermove', mover);
    alvo.removeEventListener('pointerleave', sair);
  };
}
