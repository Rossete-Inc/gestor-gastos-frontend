import { env } from '@/shared/config';
import { bytesAleatorios } from '@/shared/platform';

import { CognitoError } from '../model/erros';
import { iniciarSrp, responderDesafio, type DesafioSrp } from './srp';

// Client mínimo do Cognito User Pool pelo protocolo JSON da própria API
// (POST + X-Amz-Target). SignUp, ConfirmSignUp, ResendConfirmationCode e
// InitiateAuth são operações públicas do app client, sem assinatura AWS:
// não precisamos do SDK, que pesaria no bundle e pediria polyfills no RN.
//
// Login: na AWS, SRP (USER_SRP_AUTH + desafio PASSWORD_VERIFIER), o único
// fluxo de senha que o app client aceita; a senha não trafega. No ambiente
// local, USER_PASSWORD_AUTH, porque o cognito-local não implementa SRP
// (design.md). A escolha fica atrás da mesma função `entrar`.

export type Tokens = {
  accessToken: string;
  refreshToken: string;
  /** Instante (ms) em que o access token expira. */
  expiraEm: number;
};

function url(): string {
  return env.cognito.endpoint ?? `https://cognito-idp.${env.cognito.region}.amazonaws.com/`;
}

async function chamar<T>(operacao: string, corpo: object): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': `AWSCognitoIdentityProviderService.${operacao}`,
      },
      body: JSON.stringify({ ClientId: env.cognito.clientId, ...corpo }),
    });
  } catch {
    throw new CognitoError('NetworkError', 'sem conexão');
  }
  const dados = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    // __type pode vir como "com.amazonaws...#UsernameExistsException".
    const tipo =
      String(dados.__type ?? 'Unknown')
        .split('#')
        .pop() ?? 'Unknown';
    throw new CognitoError(tipo, String(dados.message ?? ''));
  }
  return dados as T;
}

type RespostaAuth = {
  ChallengeName?: string;
  ChallengeParameters?: Record<string, string>;
  Session?: string;
  AuthenticationResult?: { AccessToken: string; RefreshToken?: string; ExpiresIn: number };
};

function tokens(r: RespostaAuth, refreshAnterior?: string): Tokens {
  const a = r.AuthenticationResult;
  const refreshToken = a?.RefreshToken ?? refreshAnterior;
  if (!a?.AccessToken || !refreshToken) {
    // Desafios (por exemplo NEW_PASSWORD_REQUIRED) não fazem parte do MVP.
    throw new CognitoError(r.ChallengeName ?? 'RespostaInesperada', 'autenticação incompleta');
  }
  return { accessToken: a.AccessToken, refreshToken, expiraEm: Date.now() + a.ExpiresIn * 1000 };
}

export const cognito = {
  cadastrar: (email: string, senha: string, nome: string) =>
    chamar<{ UserConfirmed: boolean }>('SignUp', {
      Username: email,
      Password: senha,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'name', Value: nome },
      ],
    }),

  confirmar: (email: string, codigo: string) =>
    chamar<object>('ConfirmSignUp', { Username: email, ConfirmationCode: codigo }),

  reenviarCodigo: (email: string) => chamar<object>('ResendConfirmationCode', { Username: email }),

  entrar: async (email: string, senha: string): Promise<Tokens> =>
    env.appEnv === 'local' ? entrarComSenha(email, senha) : entrarComSrp(email, senha),

  /** Novo access token a partir do refresh token, que continua o mesmo. */
  renovar: async (refreshToken: string): Promise<Tokens> =>
    tokens(
      await chamar<RespostaAuth>('InitiateAuth', {
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        AuthParameters: { REFRESH_TOKEN: refreshToken },
      }),
      refreshToken,
    ),
};

async function entrarComSenha(email: string, senha: string): Promise<Tokens> {
  return tokens(
    await chamar<RespostaAuth>('InitiateAuth', {
      AuthFlow: 'USER_PASSWORD_AUTH',
      AuthParameters: { USERNAME: email, PASSWORD: senha },
    }),
  );
}

async function entrarComSrp(email: string, senha: string): Promise<Tokens> {
  const userPoolId = env.cognito.userPoolId;
  if (!userPoolId) throw new CognitoError('ConfiguracaoInvalida', 'User Pool não configurado');

  const estado = iniciarSrp(bytesAleatorios);
  const inicio = await chamar<RespostaAuth>('InitiateAuth', {
    AuthFlow: 'USER_SRP_AUTH',
    AuthParameters: { USERNAME: email, SRP_A: estado.A.toString(16) },
  });
  if (inicio.ChallengeName !== 'PASSWORD_VERIFIER' || !inicio.ChallengeParameters) {
    return tokens(inicio);
  }

  const desafio = inicio.ChallengeParameters as DesafioSrp;
  return tokens(
    await chamar<RespostaAuth>('RespondToAuthChallenge', {
      ChallengeName: 'PASSWORD_VERIFIER',
      ChallengeResponses: responderDesafio({
        userPoolId,
        estado,
        desafio,
        senha,
        agora: new Date(),
      }),
      ...(inicio.Session ? { Session: inicio.Session } : {}),
    }),
  );
}
