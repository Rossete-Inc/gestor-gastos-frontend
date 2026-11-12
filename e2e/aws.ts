// Acesso à AWS do E2E (tarefas 12.1 e 12.2), pelo AWS CLI, sem SDK no projeto.
//
// Na esteira roda com a role de deploy do frontend em dev, que tem as ações
// cognito-idp da política E2ENoCognito e o dynamodb:Query da E2ELeituraDosDados
// (infra-base, infra/cicd.go). Fora dela, vale qualquer credencial com essas
// permissões e leitura do SSM de dev.
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';

const REGIAO = process.env.AWS_REGION ?? 'us-east-1';
const PREFIXO = `/gestor-gastos/${process.env.AMBIENTE ?? 'dev'}`;

/** Admin próprio do E2E: limpa o usuário de teste por DELETE /admin/usuarios/{id}. */
export const EMAIL_ADMIN = process.env.E2E_ADMIN_EMAIL ?? 'e2e-admin@example.com';
const GRUPO_ADMIN = 'admin';

function aws(...args: string[]): string {
  return execFileSync('aws', [...args, '--region', REGIAO, '--output', 'json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function erroDoCli(e: unknown): string {
  const err = e as { stderr?: string; message?: string };
  return String(err.stderr || err.message || e);
}

function ssm(nome: string): string {
  const saida = aws('ssm', 'get-parameter', '--name', `${PREFIXO}/${nome}`);
  return (JSON.parse(saida) as { Parameter: { Value: string } }).Parameter.Value;
}

export type Ambiente = {
  poolId: string;
  clientId: string;
  apiUrl: string;
  tabelaGastos: string;
  tabelaCategorias: string;
};

/** Lê do SSM o que o E2E precisa do ambiente (publicado pelas stacks auth e api). */
export function lerAmbiente(): Ambiente {
  return {
    poolId: ssm('auth/user-pool-id'),
    clientId: ssm('auth/user-pool-client-id'),
    apiUrl: ssm('api/url').replace(/\/$/, ''),
    tabelaGastos: ssm('expenses/table-name'),
    tabelaCategorias: ssm('categories/table-name'),
  };
}

/** Senha que atende à política do pool (8+, maiúscula, minúscula e número). */
export function senhaAleatoria(): string {
  return `E2e-${randomBytes(12).toString('hex')}A1`;
}

/** Confirma o cadastro sem o código do e-mail. */
export function confirmarCadastro(amb: Ambiente, email: string): void {
  aws('cognito-idp', 'admin-confirm-sign-up', '--user-pool-id', amb.poolId, '--username', email);
}

/** sub do usuário no Cognito, ou null se ele não existe. */
export function subDoUsuario(amb: Ambiente, email: string): string | null {
  try {
    const saida = aws(
      'cognito-idp',
      'admin-get-user',
      '--user-pool-id',
      amb.poolId,
      '--username',
      email,
    );
    const attrs = (JSON.parse(saida) as { UserAttributes: { Name: string; Value: string }[] })
      .UserAttributes;
    return attrs.find((a) => a.Name === 'sub')?.Value ?? null;
  } catch (e) {
    if (erroDoCli(e).includes('UserNotFoundException')) return null;
    throw e;
  }
}

/** Remove só do Cognito: para quando o teste cai antes de o perfil existir. */
export function apagarNoCognito(amb: Ambiente, email: string): void {
  aws('cognito-idp', 'admin-delete-user', '--user-pool-id', amb.poolId, '--username', email);
}

/** Conta já confirmada, sem e-mail de convite, com a senha dada. */
function criarConta(amb: Ambiente, email: string, nome: string, senha: string): void {
  if (subDoUsuario(amb, email) === null) {
    aws(
      'cognito-idp',
      'admin-create-user',
      '--user-pool-id',
      amb.poolId,
      '--username',
      email,
      '--message-action',
      'SUPPRESS',
      '--user-attributes',
      `Name=email,Value=${email}`,
      'Name=email_verified,Value=true',
      `Name=name,Value=${nome}`,
    );
  }
  // Pela entrada JSON, para a senha não aparecer na linha de comando.
  aws(
    'cognito-idp',
    'admin-set-user-password',
    '--cli-input-json',
    JSON.stringify({ UserPoolId: amb.poolId, Username: email, Password: senha, Permanent: true }),
  );
}

/** Access token pelo fluxo ADMIN_USER_PASSWORD_AUTH (só com credenciais IAM). */
function tokenDe(amb: Ambiente, email: string, senha: string): string {
  const saida = aws(
    'cognito-idp',
    'admin-initiate-auth',
    '--cli-input-json',
    JSON.stringify({
      UserPoolId: amb.poolId,
      ClientId: amb.clientId,
      AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
      AuthParameters: { USERNAME: email, PASSWORD: senha },
    }),
  );
  return (JSON.parse(saida) as { AuthenticationResult: { AccessToken: string } })
    .AuthenticationResult.AccessToken;
}

/** Chama o BFF com o token dado e devolve o JSON da resposta (erro se não for 2xx). */
export async function api<T>(
  amb: Ambiente,
  token: string,
  metodo: string,
  caminho: string,
  corpo?: unknown,
): Promise<T> {
  const resp = await fetch(`${amb.apiUrl}${caminho}`, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(corpo === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const texto = await resp.text();
  if (!resp.ok) throw new Error(`${metodo} ${caminho}: ${resp.status} ${texto}`);
  return (texto ? JSON.parse(texto) : undefined) as T;
}

export type Conta = { email: string; senha: string; token: string; id: string };

/**
 * Garante o admin do E2E (como o usuário do smoke do BFF: sem convite, senha
 * nova a cada execução, nada guardado) e devolve a conta dele. O GET /me cria
 * o perfil com papel admin no primeiro acesso.
 */
export async function contaDoAdmin(amb: Ambiente): Promise<Conta> {
  const senha = senhaAleatoria();
  criarConta(amb, EMAIL_ADMIN, 'E2E Admin', senha);
  aws(
    'cognito-idp',
    'admin-add-user-to-group',
    '--user-pool-id',
    amb.poolId,
    '--username',
    EMAIL_ADMIN,
    '--group-name',
    GRUPO_ADMIN,
  );
  const token = tokenDe(amb, EMAIL_ADMIN, senha);
  const perfil = await api<{ id: string; papel?: string }>(amb, token, 'GET', '/me');
  if (perfil.papel !== 'admin') {
    throw new Error(
      `O perfil de ${EMAIL_ADMIN} não é admin (papel ${perfil.papel}). Promova-o na tela de usuários.`,
    );
  }
  return { email: EMAIL_ADMIN, senha, token, id: perfil.id };
}

/** Pessoa de teste (cliente) já confirmada e com perfil criado. */
export async function contaDeCliente(amb: Ambiente, email: string, nome: string): Promise<Conta> {
  const senha = senhaAleatoria();
  criarConta(amb, email, nome, senha);
  const token = tokenDe(amb, email, senha);
  const perfil = await api<{ id: string }>(amb, token, 'GET', '/me');
  return { email, senha, token, id: perfil.id };
}

/** Itens com PK=USER#<id> nas tabelas de gastos e de categorias. */
export function contarDados(amb: Ambiente, id: string): { gastos: number; categorias: number } {
  const contar = (tabela: string) =>
    (
      JSON.parse(
        aws(
          'dynamodb',
          'query',
          '--table-name',
          tabela,
          '--key-condition-expression',
          'PK = :pk',
          '--expression-attribute-values',
          JSON.stringify({ ':pk': { S: `USER#${id}` } }),
          '--select',
          'COUNT',
        ),
      ) as { Count: number }
    ).Count;
  return { gastos: contar(amb.tabelaGastos), categorias: contar(amb.tabelaCategorias) };
}

/**
 * Exclui o usuário de teste pelo caminho do app (DELETE /admin/usuarios/{id}),
 * que publica UserDeleted e apaga gastos e categorias. Sem perfil (o teste caiu
 * antes do primeiro acesso), remove só do Cognito.
 */
export async function excluirUsuario(amb: Ambiente, email: string): Promise<void> {
  const sub = subDoUsuario(amb, email);
  if (sub === null) return;
  const { token } = await contaDoAdmin(amb);
  const resp = await fetch(`${amb.apiUrl}/admin/usuarios/${sub}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (resp.status === 404) {
    apagarNoCognito(amb, email);
    return;
  }
  if (!resp.ok) {
    throw new Error(`DELETE /admin/usuarios/${sub}: ${resp.status} ${await resp.text()}`);
  }
}
