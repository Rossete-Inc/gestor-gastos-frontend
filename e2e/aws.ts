// Acesso à AWS do E2E (tarefas 12.1 e 12.2), pelo AWS CLI, sem SDK no projeto.
//
// Na esteira roda com a role de deploy do frontend em dev, que tem as ações
// cognito-idp da política E2ENoCognito (infra-base, infra/cicd.go). Fora dela,
// vale qualquer credencial com essas permissões e leitura do SSM de dev.
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

export type Ambiente = { poolId: string; clientId: string; apiUrl: string };

/** Lê do SSM o que o E2E precisa do ambiente (publicado pelas stacks auth e api). */
export function lerAmbiente(): Ambiente {
  return {
    poolId: ssm('auth/user-pool-id'),
    clientId: ssm('auth/user-pool-client-id'),
    apiUrl: ssm('api/url').replace(/\/$/, ''),
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

/**
 * Garante o admin do E2E (como o usuário do smoke do BFF: sem convite, senha
 * nova a cada execução, nada guardado) e devolve um access token dele. O GET
 * /me cria o perfil com papel admin no primeiro acesso.
 */
export async function tokenDoAdmin(amb: Ambiente): Promise<string> {
  if (subDoUsuario(amb, EMAIL_ADMIN) === null) {
    aws(
      'cognito-idp',
      'admin-create-user',
      '--user-pool-id',
      amb.poolId,
      '--username',
      EMAIL_ADMIN,
      '--message-action',
      'SUPPRESS',
      '--user-attributes',
      `Name=email,Value=${EMAIL_ADMIN}`,
      'Name=email_verified,Value=true',
      'Name=name,Value=E2E Admin',
    );
  }
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
  const senha = senhaAleatoria();
  // Pela entrada JSON, para a senha não aparecer na linha de comando.
  aws(
    'cognito-idp',
    'admin-set-user-password',
    '--cli-input-json',
    JSON.stringify({
      UserPoolId: amb.poolId,
      Username: EMAIL_ADMIN,
      Password: senha,
      Permanent: true,
    }),
  );
  const saida = aws(
    'cognito-idp',
    'admin-initiate-auth',
    '--cli-input-json',
    JSON.stringify({
      UserPoolId: amb.poolId,
      ClientId: amb.clientId,
      AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
      AuthParameters: { USERNAME: EMAIL_ADMIN, PASSWORD: senha },
    }),
  );
  const token = (JSON.parse(saida) as { AuthenticationResult: { AccessToken: string } })
    .AuthenticationResult.AccessToken;
  const me = await fetch(`${amb.apiUrl}/me`, { headers: { Authorization: `Bearer ${token}` } });
  if (!me.ok) throw new Error(`GET /me do admin do E2E: ${me.status} ${await me.text()}`);
  const perfil = (await me.json()) as { papel?: string };
  if (perfil.papel !== 'admin') {
    throw new Error(
      `O perfil de ${EMAIL_ADMIN} não é admin (papel ${perfil.papel}). Promova-o na tela de usuários.`,
    );
  }
  return token;
}

/**
 * Exclui o usuário de teste pelo caminho do app (DELETE /admin/usuarios/{id}),
 * que publica UserDeleted e apaga gastos e categorias. Sem perfil (o teste caiu
 * antes do primeiro acesso), remove só do Cognito.
 */
export async function excluirUsuario(amb: Ambiente, email: string): Promise<void> {
  const sub = subDoUsuario(amb, email);
  if (sub === null) return;
  const token = await tokenDoAdmin(amb);
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
