import { act, renderHook, waitFor } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';

import { bff, queryClient } from '@/shared/api';

import { BFF, usarServidor } from '../../../../test/msw';
import { contaAtiva, reiniciarContaAtiva } from '../model/contaAtiva';
import { useContaAtiva, useIniciarContaAtiva, usePodeEscrever } from './useContaAtiva';

const server = usarServidor();

// A sessão é da feature auth: aqui só o status importa.
let mockStatus = 'autenticado';
jest.mock('@/features/auth', () => ({ useSessao: () => ({ status: mockStatus, tokens: null }) }));

beforeEach(() => {
  reiniciarContaAtiva();
  mockStatus = 'autenticado';
});

it('papel e permissão de escrita pela conta ativa', async () => {
  const { result } = await renderHook(() => ({ info: useContaAtiva(), pode: usePodeEscrever() }));
  expect(result.current.info).toMatchObject({ propria: true, papel: 'DONO' });
  expect(result.current.pode).toBe(true);

  await act(() => contaAtiva.escolher({ donoId: 'ana', nomeDono: 'Ana', papel: 'LEITOR' }));
  expect(result.current.info).toMatchObject({ propria: false, papel: 'LEITOR' });
  expect(result.current.pode).toBe(false);

  await act(() => contaAtiva.escolher({ donoId: 'ana', nomeDono: 'Ana', papel: 'EDITOR' }));
  expect(result.current.pode).toBe(true);
});

it('na raiz: lê a conta guardada, manda o X-Conta e trata o acesso perdido', async () => {
  await contaAtiva.escolher({ donoId: 'ana', nomeDono: 'Ana', papel: 'EDITOR' });
  reiniciarContaAtiva(); // como quem reabre o app: a escolha está só no dispositivo
  const reset = jest.spyOn(queryClient, 'resetQueries');
  server.use(
    http.get(`${BFF}/cartoes`, ({ request }) =>
      request.headers.get('X-Conta') === 'ana'
        ? HttpResponse.json(
            { type: 't', title: 't', status: 404, code: 'conta_nao_encontrada', detail: 'x' },
            { status: 404, headers: { 'Content-Type': 'application/problem+json' } },
          )
        : HttpResponse.json({ itens: [] }),
    ),
  );

  const { unmount } = await renderHook(() => useIniciarContaAtiva());
  await waitFor(() => expect(contaAtiva.obter().carregada).toBe(true));
  expect(contaAtiva.donoId()).toBe('ana');

  await expect(bff.listarCartoes()).rejects.toMatchObject({ code: 'conta_nao_encontrada' });
  await waitFor(() => expect(contaAtiva.obter().acessoPerdido).toBe('Ana'));
  expect(contaAtiva.donoId()).toBeNull();
  await waitFor(() => expect(reset).toHaveBeenCalled());
  // De volta à própria conta, sem o cabeçalho.
  await expect(bff.listarCartoes()).resolves.toEqual({ itens: [] });
  unmount();
  reset.mockRestore();
});

it('o logout volta para a própria conta; abrir o app sem sessão não', async () => {
  const ana = { donoId: 'ana', nomeDono: 'Ana', papel: 'EDITOR' as const };
  await contaAtiva.escolher(ana);

  mockStatus = 'carregando';
  const { rerender, unmount } = await renderHook(() => useIniciarContaAtiva());
  mockStatus = 'anonimo';
  await rerender({});
  expect(contaAtiva.obter().conta).toEqual(ana);

  mockStatus = 'autenticado';
  await rerender({});
  mockStatus = 'anonimo';
  await rerender({});
  await waitFor(() => expect(contaAtiva.obter().conta).toBeNull());
  unmount();
});
