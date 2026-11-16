import { CognitoError, ErroAuth, erroAuth } from './erros';
import { descreverRegras, regrasNaoAtendidas } from './senha';
import { RedefinirSenhaSchema, TrocaSenhaSchema } from './formularios';

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

describe('erroAuth da troca e da recuperação de senha', () => {
  const cog = (tipo: string) => new CognitoError(tipo, '');

  it.each([
    ['trocaSenha', 'NotAuthorizedException', 'senha_atual_incorreta'],
    ['trocaSenha', 'InvalidPasswordException', 'senha_fraca'],
    ['trocaSenha', 'LimitExceededException', 'muitas_tentativas'],
    ['redefinirSenha', 'CodeMismatchException', 'codigo_invalido'],
    ['redefinirSenha', 'ExpiredCodeException', 'codigo_expirado'],
    ['redefinirSenha', 'InvalidPasswordException', 'senha_fraca'],
    ['esqueciSenha', 'LimitExceededException', 'muitas_tentativas'],
    ['esqueciSenha', 'NetworkError', 'sem_conexao'],
  ] as const)('%s + %s => %s', (operacao, tipo, codigo) => {
    expect(erroAuth(operacao, cog(tipo)).codigo).toBe(codigo);
  });
});

describe('schemas de senha', () => {
  const erros = (r: {
    success: boolean;
    error?: { issues: { path: PropertyKey[]; message: string }[] };
  }) => Object.fromEntries((r.error?.issues ?? []).map((i) => [String(i.path[0]), i.message]));

  it('troca válida', () => {
    const r = TrocaSenhaSchema.safeParse({
      senhaAtual: 'Antiga123',
      novaSenha: 'Nova1234',
      confirmacao: 'Nova1234',
    });
    expect(r.success).toBe(true);
  });

  it('troca recusa senha fraca, confirmação diferente e nova igual à atual', () => {
    expect(
      erros(
        TrocaSenhaSchema.safeParse({ senhaAtual: 'x', novaSenha: 'abc123', confirmacao: 'abc123' }),
      ),
    ).toEqual({ novaSenha: descreverRegras(regrasNaoAtendidas('abc123')) });
    expect(
      erros(
        TrocaSenhaSchema.safeParse({
          senhaAtual: 'x',
          novaSenha: 'Nova1234',
          confirmacao: 'Nova12345',
        }),
      ),
    ).toEqual({ confirmacao: 'As senhas não conferem.' });
    expect(
      erros(
        TrocaSenhaSchema.safeParse({
          senhaAtual: 'Nova1234',
          novaSenha: 'Nova1234',
          confirmacao: 'Nova1234',
        }),
      ),
    ).toEqual({ novaSenha: 'A nova senha precisa ser diferente da atual.' });
  });

  it('redefinição exige código de 6 números', () => {
    expect(
      erros(
        RedefinirSenhaSchema.safeParse({
          codigo: '12',
          novaSenha: 'Nova1234',
          confirmacao: 'Nova1234',
        }),
      ),
    ).toEqual({ codigo: 'O código tem 6 números.' });
  });
});
