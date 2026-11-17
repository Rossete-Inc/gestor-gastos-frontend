import { createContext, type ReactNode } from 'react';

/**
 * Conteúdo fixo logo abaixo do título de toda Screen com título. Um layout
 * de rotas o fornece (por exemplo, o seletor de conta nas abas), sem que cada
 * tela precise saber dele.
 */
export const TopoDaTela = createContext<ReactNode>(null);
