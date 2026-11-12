import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AvisosDoApp } from './AvisosDoApp';

// A plataforma de teste é a nativa (sem PWA): as fontes ficam controladas aqui.
let mockMudarConexao: (mockOnline: boolean) => void = () => {};
let mockVersaoNova: (aplicar: () => void) => void = () => {};
let mockOnline = true;
jest.mock('@/shared/platform', () => ({
  estaOnline: () => mockOnline,
  assinarConexao: (fn: (o: boolean) => void) => {
    mockMudarConexao = fn;
    return () => {};
  },
  registrarServiceWorker: (fn: (aplicar: () => void) => void) => {
    mockVersaoNova = fn;
  },
}));

beforeEach(() => {
  mockOnline = true;
});

const metricas = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};
const avisos = () => (
  <SafeAreaProvider initialMetrics={metricas}>
    <AvisosDoApp />
  </SafeAreaProvider>
);

it('não ocupa espaço com conexão e sem versão nova', async () => {
  await render(avisos());
  expect(screen.queryByRole('alert')).toBeNull();
  expect(screen.queryByText(/Sem conexão|Nova versão/)).toBeNull();
});

it('mostra o aviso de offline e some quando a conexão volta (tarefa 11.1)', async () => {
  mockOnline = false;
  await render(avisos());
  expect(screen.getByRole('alert')).toHaveTextContent(/Sem conexão/);
  await act(async () => mockMudarConexao(true));
  expect(screen.queryByText(/Sem conexão/)).toBeNull();
});

it('oferece a versão nova e aplica ao tocar em Atualizar', async () => {
  await render(avisos());
  const aplicar = jest.fn();
  await act(async () => mockVersaoNova(aplicar));
  expect(screen.getByText('Nova versão disponível.')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Atualizar' }));
  expect(aplicar).toHaveBeenCalledTimes(1);
});
