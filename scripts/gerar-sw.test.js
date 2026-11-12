const { describe, expect, it, jest } = require('@jest/globals');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');

const { gerar, listarArquivos, paraUrl } = require('./gerar-sw');

/** dist falso com os arquivos dados ({ caminho: conteúdo }). */
function distCom(arquivos) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dist-'));
  for (const [rel, conteudo] of Object.entries(arquivos)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), conteudo);
  }
  return dir;
}

const basico = {
  'index.html': '<html></html>',
  'manifest.json': '{}',
  'metadata.json': '{}',
  '_expo/static/js/web/entry-abc.js': 'js',
  '_expo/static/js/web/entry-abc.js.map': 'map',
  'assets/node_modules/@expo/vector-icons/Feather.123.ttf': 'fonte',
};

/** Roda o sw.js num contexto falso e devolve os listeners registrados. */
function carregarSw(codigo) {
  const listeners = {};
  const self = {
    location: { origin: 'https://app.test' },
    addEventListener: (tipo, fn) => (listeners[tipo] = fn),
    skipWaiting: jest.fn(),
    clients: { claim: jest.fn() },
  };
  const cache = { match: jest.fn(async () => undefined), addAll: jest.fn() };
  const caches = { open: jest.fn(async () => cache), keys: jest.fn(async () => []) };
  vm.runInNewContext(codigo, { self, caches, URL, Set, fetch: jest.fn(async () => ({})) });
  return { listeners, self };
}

describe('gerar-sw', () => {
  it('guarda os arquivos do dist, menos sw.js, metadata e source maps', () => {
    const dist = distCom({ ...basico, 'sw.js': 'velho' });
    expect(listarArquivos(dist)).toEqual([
      '_expo/static/js/web/entry-abc.js',
      'assets/node_modules/@expo/vector-icons/Feather.123.ttf',
      'index.html',
      'manifest.json',
    ]);
  });

  it('usa o caminho como o navegador vê em URL.pathname', () => {
    expect(paraUrl('assets/node_modules/@expo/a b.ttf')).toBe(
      '/assets/node_modules/@expo/a%20b.ttf',
    );
    expect(paraUrl('_expo/static/js/web/[id]-1.js')).toBe('/_expo/static/js/web/[id]-1.js');
  });

  it('gera um sw.js que muda quando o build muda', () => {
    const dist = distCom(basico);
    const a = gerar(dist);
    const primeiro = fs.readFileSync(path.join(dist, 'sw.js'), 'utf8');
    expect(a.arquivos).toBe(4);
    expect(primeiro).toContain('"/index.html"');
    expect(primeiro).not.toContain('metadata.json');

    // Mesmo build: mesmo arquivo (o sw.js antigo não entra na conta).
    expect(gerar(dist).versao).toBe(a.versao);

    fs.writeFileSync(path.join(dist, '_expo/static/js/web/entry-abc.js'), 'js novo');
    expect(gerar(dist).versao).not.toBe(a.versao);
  });

  it('recusa um dist sem index.html', () => {
    expect(() => gerar(distCom({ 'a.js': 'x' }))).toThrow(/expo export/);
  });

  it('o sw.js não intercepta outra origem nem métodos de escrita', () => {
    const dist = distCom(basico);
    gerar(dist);
    const { listeners, self } = carregarSw(fs.readFileSync(path.join(dist, 'sw.js'), 'utf8'));
    const evento = (url, extra = {}) => ({
      request: { url, method: 'GET', mode: 'cors', ...extra },
      respondWith: jest.fn(),
    });

    const api = evento('https://api.test/me');
    listeners.fetch(api);
    expect(api.respondWith).not.toHaveBeenCalled();

    const post = evento('https://app.test/index.html', { method: 'POST' });
    listeners.fetch(post);
    expect(post.respondWith).not.toHaveBeenCalled();

    const naoGuardado = evento('https://app.test/outra-coisa.png');
    listeners.fetch(naoGuardado);
    expect(naoGuardado.respondWith).not.toHaveBeenCalled();

    const bundle = evento('https://app.test/_expo/static/js/web/entry-abc.js');
    listeners.fetch(bundle);
    expect(bundle.respondWith).toHaveBeenCalled();

    const navegacao = evento('https://app.test/gastos', { mode: 'navigate' });
    listeners.fetch(navegacao);
    expect(navegacao.respondWith).toHaveBeenCalled();

    listeners.message({ data: { type: 'SKIP_WAITING' } });
    expect(self.skipWaiting).toHaveBeenCalled();
  });
});
