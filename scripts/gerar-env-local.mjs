// Gera o .env.local do front a partir do .env.cognito que o `task local:up`
// do infra-base escreve. Uso: npm run env:local [-- <caminho do infra-base>]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const infra = resolve(process.argv[2] ?? '../gestor-gastos-infra-base');
const origem = resolve(infra, 'local/.env.cognito');

if (!existsSync(origem)) {
  console.error(
    `Não achei ${origem}.\nRode \`task local:up\` no infra-base ou informe o caminho: npm run env:local -- <infra-base>`,
  );
  process.exit(1);
}

const cognito = Object.fromEntries(
  readFileSync(origem, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);

for (const chave of ['COGNITO_ENDPOINT', 'COGNITO_CLIENT_ID']) {
  if (!cognito[chave]) {
    console.error(`${origem} não tem ${chave}. Rode \`task local:seed\` no infra-base.`);
    process.exit(1);
  }
}

const conteudo = `# Gerado por \`npm run env:local\` a partir de ${origem}. Não versionar.
EXPO_PUBLIC_APP_ENV=local
EXPO_PUBLIC_API_URL=http://127.0.0.1:8080
EXPO_PUBLIC_COGNITO_REGION=us-east-1
EXPO_PUBLIC_COGNITO_CLIENT_ID=${cognito.COGNITO_CLIENT_ID}
EXPO_PUBLIC_COGNITO_ENDPOINT=${cognito.COGNITO_ENDPOINT}
`;

writeFileSync('.env.local', conteudo);
console.log('.env.local gerado:\n' + conteudo);
