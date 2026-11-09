import { CognitoError, ErroAuth, erroAuth } from './erros';
import { descreverRegras, regrasNaoAtendidas } from './senha';

describe('política de senha', () => {
  it('"abc123" não atende tamanho e maiúscula (spec, "Senha fraca")', () => {
    expect(regrasNaoAtendidas('abc123')).toEqual([
      'ter pelo menos 8 caracteres',
      'ter uma letra maiúscula',
    ]);
  });

  it('senha válida atende tudo', () => {
    expect(regrasNaoAtendidas('Senha123')).toEqual([]);
  });

  it('descreve uma, duas ou várias regras', () => {
    expect(descreverRegras([])).toBe('');
    expect(descreverRegras(['ter um número'])).toBe('A senha precisa ter um número.');
    expect(descreverRegras(regrasNaoAtendidas(''))).toBe(
      'A senha precisa ter pelo menos 8 caracteres, ter uma letra maiúscula, ter uma letra minúscula e ter um número.',
    );
  });
});

describe('erroAuth', () => {
  it('o mesmo tipo do Cognito muda de sentido conforme a operação', () => {
    const senha = new CognitoError('InvalidPasswordException', 'x');
    expect(erroAuth('cadastro', senha).codigo).toBe('senha_fraca');
    expect(erroAuth('login', senha).codigo).toBe('credenciais_invalidas');
  });

  it('erros comuns valem em qualquer operação', () => {
    expect(erroAuth('confirmacao', new CognitoError('NetworkError', '')).codigo).toBe(
      'sem_conexao',
    );
    expect(erroAuth('login', new CognitoError('TooManyRequestsException', '')).codigo).toBe(
      'muitas_tentativas',
    );
  });

  it('desconhecidos viram erro genérico', () => {
    expect(erroAuth('login', new CognitoError('Coisa', '')).codigo).toBe('erro_desconhecido');
    expect(erroAuth('cadastro', new Error('x')).codigo).toBe('erro_desconhecido');
  });

  it('ErroAuth passa adiante sem mudar', () => {
    const e = new ErroAuth('conta_bloqueada', 'm');
    expect(erroAuth('login', e)).toBe(e);
  });

  it('conta já confirmada', () => {
    expect(erroAuth('confirmacao', new CognitoError('NotAuthorizedException', '')).codigo).toBe(
      'ja_confirmada',
    );
    expect(erroAuth('reenvio', new CognitoError('InvalidParameterException', '')).codigo).toBe(
      'ja_confirmada',
    );
  });
});
