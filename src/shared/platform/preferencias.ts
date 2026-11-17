// Preferências no dispositivo: implementação da web (preferenciasWeb.ts,
// testável em qualquer plataforma). iOS/Android: preferencias.native.ts. O
// Metro escolhe pela plataforma.
export { preferencias } from './preferenciasWeb';
export type { Preferencias } from './preferenciasWeb';
