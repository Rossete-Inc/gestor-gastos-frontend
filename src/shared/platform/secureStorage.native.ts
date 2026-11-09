import * as SecureStore from 'expo-secure-store';

import type { SecureStorage } from './secureStorage';

// iOS/Android: Keychain e Keystore via expo-secure-store.
export const secureStorage: SecureStorage = {
  get: (chave) => SecureStore.getItemAsync(chave),
  set: (chave, valor) => SecureStore.setItemAsync(chave, valor),
  remove: (chave) => SecureStore.deleteItemAsync(chave),
};
