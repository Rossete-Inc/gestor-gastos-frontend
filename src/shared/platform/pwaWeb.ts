// PWA na web (tarefa 11.1): registro do service worker gerado por
// scripts/gerar-sw.js e estado da conexão. Exportado por pwa.ts; no iOS e no
// Android vale pwa.native.ts.

type Opcoes = {
  /** Registra só no build exportado; no `expo start` o sw.js não existe. */
  habilitado?: boolean;
  /** Recarrega a página quando a versão nova assume (padrão: location.reload). */
  recarregar?: () => void;
};

/**
 * Registra o service worker e chama aoTerVersaoNova quando um build novo fica
 * em espera. A função recebida aplica a versão: a nova assume e a página
 * recarrega uma vez.
 */
export function registrarServiceWorker(
  aoTerVersaoNova: (aplicar: () => void) => void,
  { habilitado = !__DEV__, recarregar = () => window.location.reload() }: Opcoes = {},
): void {
  if (!habilitado || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  const sw = navigator.serviceWorker;

  let recarregou = false;
  sw.addEventListener('controllerchange', () => {
    if (recarregou) return;
    recarregou = true;
    recarregar();
  });

  const avisar = (espera: ServiceWorker) =>
    aoTerVersaoNova(() => espera.postMessage({ type: 'SKIP_WAITING' }));

  sw.register('/sw.js')
    .then((reg) => {
      // Versão nova já em espera (aba aberta antes do deploy, por exemplo).
      if (reg.waiting && sw.controller) avisar(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const nova = reg.installing;
        nova?.addEventListener('statechange', () => {
          // Sem controller é a primeira instalação: nada a avisar.
          if (nova.state === 'installed' && sw.controller) avisar(nova);
        });
      });
    })
    .catch(() => {
      // Sem service worker o app funciona igual, só sem o modo offline.
    });
}

/** Estado atual da conexão segundo o navegador. */
export const estaOnline = (): boolean =>
  typeof navigator === 'undefined' ? true : navigator.onLine;

/** Avisa a cada mudança de conexão; devolve a função que para de ouvir. */
export function assinarConexao(aoMudar: (online: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const on = () => aoMudar(true);
  const off = () => aoMudar(false);
  window.addEventListener('online', on);
  window.addEventListener('offline', off);
  return () => {
    window.removeEventListener('online', on);
    window.removeEventListener('offline', off);
  };
}
