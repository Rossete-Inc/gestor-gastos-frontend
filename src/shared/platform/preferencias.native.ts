import * as SecureStore from 'expo-secure-store';

import type { Preferencias } from './preferenciasWeb';

// iOS/Android: expo-secure-store, que o app já usa. É pouco dado (a conta
// ativa), então não compensa outra biblioteca de armazenamento.
export const preferencias: Preferencias = {
  get: (chave) => SecureStore.getItemAsync(chave),
  set: (chave, valor) => SecureStore.setItemAsync(chave, valor),
  remove: (chave) => SecureStore.deleteItemAsync(chave),
};
