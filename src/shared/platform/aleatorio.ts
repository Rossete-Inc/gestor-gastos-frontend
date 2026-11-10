// Bytes aleatórios de fonte criptográfica (Web Crypto). Existe em todos os
// navegadores atuais e no Node. No Hermes (iOS/Android) ainda não: quando o app
// for para as lojas, entra um aleatorio.native.ts com o expo-crypto (lib nova,
// com ADR). Hoje o login nativo só roda contra o cognito-local, que não usa SRP.

export function bytesAleatorios(n: number): Uint8Array {
  const crypto = (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } })
    .crypto;
  if (!crypto?.getRandomValues) {
    throw new Error('crypto.getRandomValues indisponível nesta plataforma');
  }
  return crypto.getRandomValues(new Uint8Array(n));
}
