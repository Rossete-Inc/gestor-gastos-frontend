#!/usr/bin/env bash
# E2E (tarefas 12.1 e 12.2) contra o site recém-publicado em dev.
#
# Roda no job de deploy do frontend.yml (input smoke-test), depois do
# smoke-pwa.sh, com a role gh-deploy-gestor-gastos-frontend-dev (política
# E2ENoCognito do infra-base), AMBIENTE=dev e APP_URL.
#
# Fora da esteira, com credenciais que tenham essas permissões em dev:
#   APP_URL=https://main.<app>.amplifyapp.com bash scripts/e2e.sh
set -euo pipefail

: "${APP_URL:?defina APP_URL com a URL do site}"
export AMBIENTE="${AMBIENTE:-dev}"

if [ -n "${CI:-}" ]; then
  npx playwright install --with-deps chromium
fi
npm run e2e
