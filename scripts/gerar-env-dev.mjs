// Gera o .env.local apontando o `expo start --web` para o ambiente dev da AWS
// (API Gateway e Cognito de verdade, login SRP). Lê o SSM com o AWS CLI, só
// leitura. Serve para validar no localhost o que a esteira vai publicar no
// Amplify: o CORS da API libera http://localhost:8081.
// Uso: npm run env:dev   (volte ao ambiente local com npm run env:local)
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const prefixo = '/gestor-gastos/dev';
const parametros = {
  EXPO_PUBLIC_API_URL: `${prefixo}/api/url`,
  EXPO_PUBLIC_COGNITO_CLIENT_ID: `${prefixo}/auth/user-pool-client-id`,
  EXPO_PUBLIC_COGNITO_USER_POOL_ID: `${prefixo}/auth/user-pool-id`,
};

let valores;
try {
  const saida = execFileSync(
    'aws',
    [
      'ssm',
      'get-parameters',
      '--region',
      'us-east-1',
      '--names',
      ...Object.values(parametros),
      '--query',
      'Parameters[].[Name,Value]',
      '--output',
      'json',
    ],
    { encoding: 'utf8', shell: process.platform === 'win32' },
  );
  valores = Object.fromEntries(JSON.parse(saida));
} catch (e) {
  console.error(
    `Não consegui ler o SSM com o AWS CLI (credenciais da conta e região us-east-1?).\n${e.message}`,
  );
  process.exit(1);
}

const faltando = Object.values(parametros).filter((p) => !valores[p]);
if (faltando.length) {
  console.error(`Parâmetros ausentes no SSM: ${faltando.join(', ')}. Faça o deploy do infra-base.`);
  process.exit(1);
}

const linhas = Object.entries(parametros).map(([nome, caminho]) => `${nome}=${valores[caminho]}`);
const conteudo = `# Gerado por \`npm run env:dev\` a partir do SSM (${prefixo}). Não versionar.
EXPO_PUBLIC_APP_ENV=dev
EXPO_PUBLIC_COGNITO_REGION=us-east-1
${linhas.join('\n')}
`;

writeFileSync('.env.local', conteudo);
console.log('.env.local gerado para dev:\n' + conteudo);
