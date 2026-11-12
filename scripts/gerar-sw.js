// Gera o service worker da PWA (tarefa 11.1) sobre o dist do `expo export -p web`.
//
// Uso, na raiz do repositório: node scripts/gerar-sw.js [dist]
// A esteira roda depois de cada export (input pos-export do frontend.yml).
//
// Por que um script e não o Workbox: instalar o workbox-cli reorganizava ~1.300
// pacotes do package-lock. O que a PWA precisa cabe aqui:
//   - shell offline: guarda os arquivos do dist (HTML, bundles com hash, chunks
//     das rotas, fonte de ícones e ícones) na instalação do service worker;
//   - navegação: tenta a rede (index.html é no-cache) e, sem rede, usa o
//     index.html guardado, para qualquer rota da SPA abrir offline;
//   - API e Cognito ficam de fora: são outra origem e nunca passam pelo cache
//     (dados do servidor são do TanStack Query, guardrails);
//   - atualização: a lista de arquivos e os hashes entram no sw.js, então cada
//     build muda o arquivo e o navegador instala a versão nova em espera. O app
//     mostra "Nova versão disponível" e manda SKIP_WAITING ao tocar em Atualizar.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

// Não entram no cache: o próprio sw.js, metadados do export e source maps.
const IGNORADOS = [/^sw\.js$/, /^metadata\.json$/, /\.map$/];

/** Arquivos do dist (caminhos com "/"), em ordem estável. */
function listarArquivos(dist) {
  const saida = [];
  const visitar = (dir) => {
    for (const nome of fs.readdirSync(dir).sort()) {
      const abs = path.join(dir, nome);
      if (fs.statSync(abs).isDirectory()) visitar(abs);
      else saida.push(path.relative(dist, abs).split(path.sep).join('/'));
    }
  };
  visitar(dist);
  return saida.filter((f) => !IGNORADOS.some((re) => re.test(f)));
}

/**
 * Caminho de cada arquivo como o navegador o vê em URL.pathname: o mesmo
 * parser codifica espaço e afins, mas mantém "@" e "[id]" (rota dinâmica).
 */
const paraUrl = (arquivo) => new URL('/' + arquivo, 'https://x.invalid').pathname;

/** Hash curto do conteúdo de todos os arquivos: muda a cada build diferente. */
function versao(dist, arquivos) {
  const h = crypto.createHash('sha256');
  for (const f of arquivos) {
    h.update(f);
    h.update(fs.readFileSync(path.join(dist, f)));
  }
  return h.digest('hex').slice(0, 16);
}

/** Código do service worker para a versão e as URLs dadas. */
function codigoDoSw(v, urls) {
  return `// Gerado por scripts/gerar-sw.js. Não edite.
const VERSAO = ${JSON.stringify(v)};
const CACHE = 'gestor-gastos-' + VERSAO;
const ARQUIVOS = ${JSON.stringify(urls, null, 2)};
const GUARDADOS = new Set(ARQUIVOS);

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((nomes) =>
        Promise.all(
          nomes
            .filter((n) => n.startsWith('gestor-gastos-') && n !== CACHE)
            .map((n) => caches.delete(n)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// O app pede para a versão em espera assumir (botão "Atualizar").
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Outra origem (API do BFF, Cognito): sempre a rede, nunca o cache.
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(() =>
        caches.open(CACHE).then((c) => c.match('/index.html')),
      ),
    );
    return;
  }
  if (GUARDADOS.has(url.pathname)) {
    e.respondWith(
      caches.open(CACHE).then((c) => c.match(url.pathname).then((r) => r || fetch(req))),
    );
  }
});
`;
}

/** Gera dist/sw.js e devolve a versão e a quantidade de arquivos guardados. */
function gerar(dist) {
  if (!fs.existsSync(path.join(dist, 'index.html'))) {
    throw new Error(`${dist}/index.html não existe: rode o expo export -p web antes.`);
  }
  const arquivos = listarArquivos(dist);
  const v = versao(dist, arquivos);
  fs.writeFileSync(path.join(dist, 'sw.js'), codigoDoSw(v, arquivos.map(paraUrl)));
  return { versao: v, arquivos: arquivos.length };
}

module.exports = { codigoDoSw, gerar, listarArquivos, paraUrl };

if (require.main === module) {
  const dist = process.argv[2] ?? process.env.DIST_DIR ?? 'dist';
  try {
    const r = gerar(dist);
    console.log(`sw.js gerado em ${dist}: versão ${r.versao}, ${r.arquivos} arquivos no cache.`);
  } catch (e) {
    console.error(`erro: ${e.message}`);
    process.exit(1);
  }
}
