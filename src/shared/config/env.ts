import { z } from 'zod';

// Configuração do app validada no boot, como um @ConfigurationProperties: se
// faltar variável, o app falha cedo apontando qual.
//
// Pegadinha do Expo: EXPO_PUBLIC_* só é substituída no build quando acessada
// literalmente (process.env.EXPO_PUBLIC_X). Não use acesso dinâmico.
// Nada aqui é segredo: tudo vai para o bundle.

const url = z.url({ protocol: /^https?$/ });

export const EnvSchema = z.object({
  appEnv: z.enum(['local', 'dev', 'prod']),
  apiUrl: url,
  cognito: z.object({
    region: z.string().min(1),
    clientId: z.string().min(1),
    // Só no ambiente local (cognito-local). Na AWS o SDK usa o endpoint da região.
    endpoint: url.optional(),
  }),
});

export type Env = z.infer<typeof EnvSchema>;

export function parseEnv(raw: Record<string, string | undefined>): Env {
  const env = EnvSchema.parse({
    appEnv: raw.EXPO_PUBLIC_APP_ENV,
    apiUrl: raw.EXPO_PUBLIC_API_URL,
    cognito: {
      region: raw.EXPO_PUBLIC_COGNITO_REGION,
      clientId: raw.EXPO_PUBLIC_COGNITO_CLIENT_ID,
      endpoint: raw.EXPO_PUBLIC_COGNITO_ENDPOINT || undefined,
    },
  });
  if (env.appEnv !== 'local' && env.cognito.endpoint) {
    throw new Error('EXPO_PUBLIC_COGNITO_ENDPOINT só é permitido com EXPO_PUBLIC_APP_ENV=local');
  }
  return env;
}

export const env: Env = parseEnv({
  EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  EXPO_PUBLIC_COGNITO_REGION: process.env.EXPO_PUBLIC_COGNITO_REGION,
  EXPO_PUBLIC_COGNITO_CLIENT_ID: process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID,
  EXPO_PUBLIC_COGNITO_ENDPOINT: process.env.EXPO_PUBLIC_COGNITO_ENDPOINT,
});

// Com o .env.local gerado por `npm run env:local`:
// env.apiUrl // => "http://127.0.0.1:8080"
// Sem EXPO_PUBLIC_API_URL: o app falha no boot com ZodError apontando "apiUrl".
