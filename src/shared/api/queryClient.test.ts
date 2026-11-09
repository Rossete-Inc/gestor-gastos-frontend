import { ApiError } from './http';
import { criarQueryClient, deveRepetir } from './queryClient';

describe('deveRepetir', () => {
  it('não repete erros 4xx', () => {
    expect(deveRepetir(0, new ApiError(401, 'token_invalido', ''))).toBe(false);
    expect(deveRepetir(0, new ApiError(422, 'validacao', ''))).toBe(false);
  });

  it('repete até 2 vezes sem conexão e 5xx', () => {
    const semConexao = new ApiError(0, 'sem_conexao', '');
    expect(deveRepetir(0, semConexao)).toBe(true);
    expect(deveRepetir(1, new ApiError(503, 'http_503', ''))).toBe(true);
    expect(deveRepetir(2, semConexao)).toBe(false);
  });

  it('repete erros desconhecidos', () => {
    expect(deveRepetir(0, new Error('x'))).toBe(true);
  });
});

it('o QueryClient usa a política de retentativa e não repete mutações', () => {
  const qc = criarQueryClient();
  expect(qc.getDefaultOptions().queries?.retry).toBe(deveRepetir);
  expect(qc.getDefaultOptions().mutations?.retry).toBe(false);
});
