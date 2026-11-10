import { parseEnv } from './env';

const local = {
  EXPO_PUBLIC_APP_ENV: 'local',
  EXPO_PUBLIC_API_URL: 'http://127.0.0.1:8080',
  EXPO_PUBLIC_COGNITO_REGION: 'us-east-1',
  EXPO_PUBLIC_COGNITO_CLIENT_ID: 'abc',
  EXPO_PUBLIC_COGNITO_ENDPOINT: 'http://localhost:9229',
};

describe('parseEnv', () => {
  it('lê o ambiente local', () => {
    expect(parseEnv(local)).toEqual({
      appEnv: 'local',
      apiUrl: 'http://127.0.0.1:8080',
      cognito: { region: 'us-east-1', clientId: 'abc', endpoint: 'http://localhost:9229' },
    });
  });

  it('endpoint vazio vira ausente', () => {
    expect(
      parseEnv({ ...local, EXPO_PUBLIC_COGNITO_ENDPOINT: '' }).cognito.endpoint,
    ).toBeUndefined();
  });

  it('falha apontando a variável ausente', () => {
    expect(() => parseEnv({ ...local, EXPO_PUBLIC_API_URL: undefined })).toThrow(/apiUrl/);
  });

  it('recusa URL que não é http', () => {
    expect(() => parseEnv({ ...local, EXPO_PUBLIC_API_URL: 'ftp://x' })).toThrow();
  });

  it('recusa ambiente desconhecido', () => {
    expect(() => parseEnv({ ...local, EXPO_PUBLIC_APP_ENV: 'staging' })).toThrow(/appEnv/);
  });

  it('recusa o endpoint do cognito-local fora do ambiente local', () => {
    expect(() => parseEnv({ ...local, EXPO_PUBLIC_APP_ENV: 'prod' })).toThrow(/só é permitido/);
    expect(
      parseEnv({
        ...local,
        EXPO_PUBLIC_APP_ENV: 'prod',
        EXPO_PUBLIC_COGNITO_ENDPOINT: '',
        EXPO_PUBLIC_COGNITO_USER_POOL_ID: 'us-east-1_Abc123',
      }).appEnv,
    ).toBe('prod');
  });

  const dev = {
    EXPO_PUBLIC_APP_ENV: 'dev',
    EXPO_PUBLIC_API_URL: 'https://abc.execute-api.us-east-1.amazonaws.com',
    EXPO_PUBLIC_COGNITO_REGION: 'us-east-1',
    EXPO_PUBLIC_COGNITO_CLIENT_ID: 'abc',
    EXPO_PUBLIC_COGNITO_USER_POOL_ID: 'us-east-1_Abc123',
  };

  it('lê o ambiente dev da AWS, com o id do User Pool', () => {
    expect(parseEnv(dev).cognito).toEqual({
      region: 'us-east-1',
      clientId: 'abc',
      userPoolId: 'us-east-1_Abc123',
    });
  });

  it('exige o id do User Pool fora do ambiente local (login SRP)', () => {
    expect(() => parseEnv({ ...dev, EXPO_PUBLIC_COGNITO_USER_POOL_ID: undefined })).toThrow(
      /USER_POOL_ID/,
    );
    expect(() => parseEnv({ ...dev, EXPO_PUBLIC_COGNITO_USER_POOL_ID: 'semregiao' })).toThrow(
      /userPoolId/,
    );
  });
});
