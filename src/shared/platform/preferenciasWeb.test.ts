import { preferencias } from './preferenciasWeb';

function armazenamentoFalso(): Storage {
  const itens = new Map<string, string>();
  return {
    getItem: (k: string) => itens.get(k) ?? null,
    setItem: (k: string, v: string) => void itens.set(k, v),
    removeItem: (k: string) => void itens.delete(k),
    clear: () => itens.clear(),
    key: () => null,
    get length() {
      return itens.size;
    },
  };
}

const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
afterEach(() => {
  if (original) Object.defineProperty(globalThis, 'localStorage', original);
  else delete (globalThis as { localStorage?: Storage }).localStorage;
});

function usar(valor: () => Storage | undefined) {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: valor });
}

it('grava, lê e remove no localStorage', async () => {
  const s = armazenamentoFalso();
  usar(() => s);
  await preferencias.set('k', 'v');
  expect(await preferencias.get('k')).toBe('v');
  await preferencias.remove('k');
  expect(await preferencias.get('k')).toBeNull();
});

it('sem localStorage, lê null e ignora as gravações', async () => {
  usar(() => undefined);
  await preferencias.set('k', 'v');
  await preferencias.remove('k');
  expect(await preferencias.get('k')).toBeNull();
});

it('com o armazenamento bloqueado, não lança', async () => {
  usar(() => {
    throw new Error('SecurityError');
  });
  await expect(preferencias.set('k', 'v')).resolves.toBeUndefined();
  await expect(preferencias.remove('k')).resolves.toBeUndefined();
  expect(await preferencias.get('k')).toBeNull();
});

it('quando o armazenamento recusa a operação, não lança', async () => {
  const s = armazenamentoFalso();
  s.getItem = () => {
    throw new Error('x');
  };
  s.setItem = () => {
    throw new Error('QuotaExceeded');
  };
  s.removeItem = () => {
    throw new Error('x');
  };
  usar(() => s);
  await expect(preferencias.set('k', 'v')).resolves.toBeUndefined();
  await expect(preferencias.remove('k')).resolves.toBeUndefined();
  expect(await preferencias.get('k')).toBeNull();
});
