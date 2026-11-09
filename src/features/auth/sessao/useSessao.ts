import { useEffect, useSyncExternalStore } from 'react';

import { sessao, type EstadoSessao } from './sessao';

/** Estado atual da sessão, atualizado a cada login, renovação ou logout. */
export function useSessao(): EstadoSessao {
  return useSyncExternalStore(sessao.assinar, sessao.obter, sessao.obter);
}

/** Inicia a sessão uma vez, na raiz do app. */
export function useIniciarSessao(): void {
  useEffect(() => {
    void sessao.iniciar();
  }, []);
}
