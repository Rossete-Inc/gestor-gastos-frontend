import { ouvirPonteiro } from './ponteiroWeb';

function elementoFalso() {
  const ouvintes: Record<string, (e: { clientX: number; clientY: number }) => void> = {};
  return {
    ouvintes,
    getBoundingClientRect: () => ({ left: 100, top: 50 }),
    addEventListener: (tipo: string, f: (e: { clientX: number; clientY: number }) => void) => {
      ouvintes[tipo] = f;
    },
    removeEventListener: (tipo: string) => {
      delete ouvintes[tipo];
    },
  };
}

it('repassa a posição relativa ao elemento e a saída do ponteiro', () => {
  const el = elementoFalso();
  const mover = jest.fn();
  const sair = jest.fn();
  const parar = ouvirPonteiro(el, mover, sair);

  el.ouvintes.pointermove!({ clientX: 130, clientY: 90 });
  expect(mover).toHaveBeenCalledWith(30, 40);
  el.ouvintes.pointerleave!({ clientX: 0, clientY: 0 });
  expect(sair).toHaveBeenCalled();

  parar();
  expect(Object.keys(el.ouvintes)).toEqual([]);
});

it('ignora alvos que não são elementos do DOM', () => {
  const parar = ouvirPonteiro({}, jest.fn(), jest.fn());
  expect(() => parar()).not.toThrow();
  expect(() => ouvirPonteiro(null, jest.fn(), jest.fn())()).not.toThrow();
});
