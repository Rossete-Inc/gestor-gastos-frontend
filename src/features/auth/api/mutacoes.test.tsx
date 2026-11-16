import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { cognito, erroCognito, tokensCognito, usarServidor } from '../../../../test/msw';
import { useEsqueciSenha, useRedefinirSenha } from './mutacoes';

const server = usarServidor();

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('esqueci minha senha', () => {
  it.each(['UserNotFoundException', 'InvalidParameterException'])(
    '%s responde como sucesso, sem revelar se o e-mail tem conta',
    async (tipo) => {
      server.use(cognito({ ForgotPassword: () => erroCognito(tipo) }));
      const { result } = await renderHook(() => useEsqueciSenha(), { wrapper });
      await act(() => result.current.mutateAsync({ email: 'nao@x.com' }));
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    },
  );

  it('limite de envios vira "muitas tentativas"', async () => {
    server.use(cognito({ ForgotPassword: () => erroCognito('LimitExceededException') }));
    const { result } = await renderHook(() => useEsqueciSenha(), { wrapper });
    await act(() => result.current.mutate({ email: 'ana@x.com' }));
    await waitFor(() => expect(result.current.error?.codigo).toBe('muitas_tentativas'));
  });
});

describe('redefinir senha', () => {
  const dados = { codigo: '123456', novaSenha: 'Nova1234', confirmacao: 'Nova1234' };

  it('redefine e entra em silêncio para encerrar as sessões antigas', async () => {
    const ops: string[] = [];
    server.use(
      cognito({
        ConfirmForgotPassword: () => (ops.push('ConfirmForgotPassword'), Response.json({})),
        InitiateAuth: () => (ops.push('InitiateAuth'), tokensCognito('acc', 'ref')),
      }),
    );
    const aviso = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { result } = await renderHook(() => useRedefinirSenha('ana@x.com'), { wrapper });
    await act(() => result.current.mutateAsync(dados));
    aviso.mockRestore();
    expect(ops).toEqual(['ConfirmForgotPassword', 'InitiateAuth']);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('falha no login silencioso (ex.: conta bloqueada) não desfaz a redefinição', async () => {
    server.use(
      cognito({
        ConfirmForgotPassword: () => Response.json({}),
        InitiateAuth: () => erroCognito('NotAuthorizedException', 'User is disabled.'),
      }),
    );
    const aviso = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { result } = await renderHook(() => useRedefinirSenha('ana@x.com'), { wrapper });
    await act(() => result.current.mutateAsync(dados));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(aviso).toHaveBeenCalled();
    aviso.mockRestore();
  });

  it('código incorreto é recusado', async () => {
    server.use(cognito({ ConfirmForgotPassword: () => erroCognito('CodeMismatchException') }));
    const { result } = await renderHook(() => useRedefinirSenha('ana@x.com'), { wrapper });
    await act(() => result.current.mutate(dados));
    await waitFor(() => expect(result.current.error?.codigo).toBe('codigo_invalido'));
  });
});
