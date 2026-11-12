// No iOS e no Android não há service worker nem aviso de offline do navegador:
// estas funções não fazem nada. A versão da web é pwa.ts (pwaWeb.ts).

export function registrarServiceWorker(_aoTerVersaoNova: (aplicar: () => void) => void): void {}

export const estaOnline = (): boolean => true;

export function assinarConexao(_aoMudar: (online: boolean) => void): () => void {
  return () => {};
}
