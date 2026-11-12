// Telas de navegação na web. Sem isto, o react-native-screens fica desligado
// no navegador e as abas e telas da pilha que não estão em foco continuam
// desenhadas por baixo da atual, só com zIndex -1: ainda recebem foco do
// teclado e, no Chromium do Linux, chegaram a receber o clique no lugar da
// tela ativa (o E2E da tarefa 12.1 achou isso). Ligado, o Screen da web
// esconde as inativas com display: none.
// Exportado por telas.ts; no iOS e no Android vale telas.native.ts (lá a lib
// já vem ligada).
import { enableScreens } from 'react-native-screens';

export function prepararTelas(): void {
  enableScreens(true);
}
