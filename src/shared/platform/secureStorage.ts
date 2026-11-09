// Armazenamento de credenciais: contrato + implementação da web.
//
// Web: NÃO persiste. Os guardrails proíbem token em localStorage e só aceitam
// sessionStorage para dado não sensível; sem um backend que emita cookie
// httpOnly, a credencial fica só em memória (no estado da sessão). Trade-off:
// recarregar a página pede login de novo.
//
// iOS/Android: secureStorage.native.ts (Keychain/Keystore via expo-secure-store).
// O Metro escolhe o arquivo pela plataforma.

export type SecureStorage = {
  get(chave: string): Promise<string | null>;
  set(chave: string, valor: string): Promise<void>;
  remove(chave: string): Promise<void>;
};

export const secureStorage: SecureStorage = {
  get: async () => null,
  set: async () => {},
  remove: async () => {},
};
