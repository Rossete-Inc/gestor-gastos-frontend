// Ambiente dos testes: as mesmas variáveis do .env.local, com valores fixos.
process.env.EXPO_PUBLIC_APP_ENV = 'local';
process.env.EXPO_PUBLIC_API_URL = 'http://bff.test';
process.env.EXPO_PUBLIC_COGNITO_REGION = 'us-east-1';
process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID = 'client-teste';
process.env.EXPO_PUBLIC_COGNITO_ENDPOINT = 'http://cognito.test';

// expo-secure-store em memória: o Jest roda como iOS, então a sessão usa
// secureStorage.native.ts.
jest.mock('expo-secure-store', () => {
  const itens = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (k: string) => itens.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => {
      itens.set(k, v);
    }),
    deleteItemAsync: jest.fn(async (k: string) => {
      itens.delete(k);
    }),
  };
});
