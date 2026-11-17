// Preferências do usuário no dispositivo (por exemplo, a conta ativa).
// Nada sensível passa por aqui: tokens ficam no secureStorage.
//
// Web: localStorage, para a escolha sobreviver ao fechar a aba. Em janela
// privada ou com o armazenamento bloqueado, as leituras voltam null e as
// gravações são ignoradas.
// iOS/Android: preferencias.native.ts (expo-secure-store). Este arquivo é
// testável em qualquer plataforma; preferencias.ts o reexporta na web.

export type Preferencias = {
  get(chave: string): Promise<string | null>;
  set(chave: string, valor: string): Promise<void>;
  remove(chave: string): Promise<void>;
};

function armazenamento(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export const preferencias: Preferencias = {
  async get(chave) {
    try {
      return armazenamento()?.getItem(chave) ?? null;
    } catch {
      return null;
    }
  },
  async set(chave, valor) {
    try {
      armazenamento()?.setItem(chave, valor);
    } catch {
      // armazenamento cheio ou bloqueado: a escolha vale só nesta sessão
    }
  },
  async remove(chave) {
    try {
      armazenamento()?.removeItem(chave);
    } catch {
      // idem
    }
  },
};
