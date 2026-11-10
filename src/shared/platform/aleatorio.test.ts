import { bytesAleatorios } from './aleatorio';

it('devolve a quantidade pedida de bytes aleatórios', () => {
  const a = bytesAleatorios(128);
  const b = bytesAleatorios(128);
  expect(a).toHaveLength(128);
  expect(Array.from(a)).not.toEqual(Array.from(b));
});

it('falha com mensagem clara sem Web Crypto', () => {
  const original = globalThis.crypto;
  Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
  try {
    expect(() => bytesAleatorios(16)).toThrow(/getRandomValues indisponível/);
  } finally {
    Object.defineProperty(globalThis, 'crypto', { value: original, configurable: true });
  }
});
