import { assinarConexao, estaOnline, registrarServiceWorker } from './pwaWeb';

/** EventTarget mínimo com estado mutável, para simular o navegador. */
function alvo<T extends object>(extra: T) {
  const ouvintes: Record<string, (() => void)[]> = {};
  return Object.assign(extra, {
    addEventListener: (tipo: string, fn: () => void) => (ouvintes[tipo] ??= []).push(fn),
    removeEventListener: (tipo: string, fn: () => void) =>
      (ouvintes[tipo] = (ouvintes[tipo] ?? []).filter((f) => f !== fn)),
    emitir: (tipo: string) => (ouvintes[tipo] ?? []).forEach((f) => f()),
  });
}

type Sw = ReturnType<typeof alvo<{ state: string; postMessage: jest.Mock }>>;

function navegador({ controller = true } = {}) {
  const reg = alvo({ waiting: null as Sw | null, installing: null as Sw | null });
  const serviceWorker = alvo({
    controller: controller ? {} : null,
    register: jest.fn(async () => reg),
  });
  Object.defineProperty(globalThis, 'navigator', {
    value: { serviceWorker, onLine: true },
    configurable: true,
  });
  return { reg, serviceWorker };
}

const novoSw = (): Sw => alvo({ state: 'installing', postMessage: jest.fn() });
const esperar = () => new Promise((r) => setTimeout(r, 0));

const navegadorOriginal = globalThis.navigator;
afterEach(() =>
  Object.defineProperty(globalThis, 'navigator', { value: navegadorOriginal, configurable: true }),
);

describe('registrarServiceWorker', () => {
  it('não registra fora do build exportado', () => {
    const { serviceWorker } = navegador();
    registrarServiceWorker(jest.fn(), { habilitado: false });
    expect(serviceWorker.register).not.toHaveBeenCalled();
  });

  it('avisa a versão nova e aplica com SKIP_WAITING e um recarregamento', async () => {
    const { reg, serviceWorker } = navegador();
    const aviso = jest.fn();
    const recarregar = jest.fn();
    registrarServiceWorker(aviso, { habilitado: true, recarregar });
    await esperar();
    expect(serviceWorker.register).toHaveBeenCalledWith('/sw.js');

    const nova = novoSw();
    reg.installing = nova;
    reg.emitir('updatefound');
    nova.state = 'installed';
    nova.emitir('statechange');
    expect(aviso).toHaveBeenCalledTimes(1);

    aviso.mock.calls[0][0]();
    expect(nova.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });

    serviceWorker.emitir('controllerchange');
    serviceWorker.emitir('controllerchange');
    expect(recarregar).toHaveBeenCalledTimes(1);
  });

  it('avisa a versão que já estava em espera', async () => {
    const { reg } = navegador();
    const espera = novoSw();
    reg.waiting = espera;
    const aviso = jest.fn();
    registrarServiceWorker(aviso, { habilitado: true });
    await esperar();
    expect(aviso).toHaveBeenCalledTimes(1);
  });

  it('não avisa na primeira instalação', async () => {
    const { reg } = navegador({ controller: false });
    const aviso = jest.fn();
    registrarServiceWorker(aviso, { habilitado: true });
    await esperar();
    const nova = novoSw();
    reg.installing = nova;
    reg.emitir('updatefound');
    nova.state = 'installed';
    nova.emitir('statechange');
    expect(aviso).not.toHaveBeenCalled();
  });

  it('segue sem service worker se o registro falhar', async () => {
    const { serviceWorker } = navegador();
    serviceWorker.register.mockRejectedValueOnce(new Error('sem https'));
    expect(() => registrarServiceWorker(jest.fn(), { habilitado: true })).not.toThrow();
    await esperar();
  });
});

describe('conexão', () => {
  it('lê o estado e avisa as mudanças até cancelar', () => {
    navegador();
    expect(estaOnline()).toBe(true);
    // O window do ambiente de teste (React Native) não tem eventos.
    const janela = alvo({});
    const original = globalThis.window;
    Object.defineProperty(globalThis, 'window', { value: janela, configurable: true });
    try {
      const mudancas: boolean[] = [];
      const parar = assinarConexao((o) => mudancas.push(o));
      janela.emitir('offline');
      janela.emitir('online');
      parar();
      janela.emitir('offline');
      expect(mudancas).toEqual([false, true]);
    } finally {
      Object.defineProperty(globalThis, 'window', { value: original, configurable: true });
    }
  });
});
