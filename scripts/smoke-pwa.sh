#!/usr/bin/env bash
# Smoke test da PWA em dev (tarefa 11.1), rodado pela esteira depois do deploy
# no Amplify com APP_URL definido (input smoke-test do frontend.yml).
#
# Confere o que a instalação e o modo offline precisam: manifest, service
# worker sem cache longo (senão o usuário fica preso numa versão antiga),
# ícone e o rewrite da SPA (rota sem extensão devolve o index.html).
set -euo pipefail

url="${APP_URL:?defina APP_URL (ex.: https://main.<app-id>.amplifyapp.com)}"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

erro() { echo "::error title=Smoke test da PWA::$*"; exit 1; }

# baixar <caminho>: grava corpo e headers em $tmp e devolve o status.
baixar() {
  curl -sS -o "$tmp/corpo" -D "$tmp/headers" -w '%{http_code}' "$url$1"
}
header() { grep -i "^$1:" "$tmp/headers" | tail -1 | cut -d: -f2- | tr -d '\r' | xargs; }

[ "$(baixar /manifest.json)" = 200 ] || erro "/manifest.json não respondeu 200"
grep -q '"display": *"standalone"' "$tmp/corpo" || erro "/manifest.json sem display standalone: $(head -c 300 "$tmp/corpo")"
grep -q 'icon-512-maskable.png' "$tmp/corpo" || erro "/manifest.json sem o ícone maskable"
echo "manifest.json: 200, standalone, com ícones (ok)"

[ "$(baixar /sw.js)" = 200 ] || erro "/sw.js não respondeu 200"
grep -q 'Gerado por scripts/gerar-sw.js' "$tmp/corpo" || erro "/sw.js não é o service worker gerado (o rewrite da SPA devolveu HTML?): $(head -c 200 "$tmp/corpo")"
case "$(header content-type)" in *javascript*) ;; *) erro "/sw.js com Content-Type $(header content-type)" ;; esac
case "$(header cache-control)" in *no-cache*) ;; *) erro "/sw.js com Cache-Control '$(header cache-control)'; precisa de no-cache" ;; esac
echo "sw.js: 200, JavaScript, no-cache, $(grep -o 'VERSAO = "[0-9a-f]*"' "$tmp/corpo") (ok)"

[ "$(baixar /icons/icon-192.png)" = 200 ] || erro "/icons/icon-192.png não respondeu 200"
case "$(header content-type)" in image/png*) ;; *) erro "/icons/icon-192.png com Content-Type $(header content-type)" ;; esac
echo "icons/icon-192.png: 200, PNG (ok)"

[ "$(baixar /gastos)" = 200 ] || erro "/gastos (rota da SPA) não respondeu 200"
grep -q '<link rel="manifest"' "$tmp/corpo" || erro "/gastos não devolveu o index.html com o manifest"
echo "rota /gastos: 200, index.html com o manifest (ok)"
