// Erros de autenticação já traduzidos para o usuário. O tipo do Cognito
// (__type) muda de sentido conforme a operação: InvalidPasswordException é
// "senha fraca" no cadastro, e o cognito-local também o usa para senha
// errada no login. Por isso o mapeamento é por operação.

export type CodigoErroAuth =
  | 'email_em_uso'
  | 'senha_fraca'
  | 'dados_invalidos'
  | 'codigo_invalido'
  | 'codigo_expirado'
  | 'ja_confirmada'
  | 'credenciais_invalidas'
  | 'conta_nao_confirmada'
  | 'conta_bloqueada'
  | 'muitas_tentativas'
  | 'sem_conexao'
  | 'erro_desconhecido';

export class ErroAuth extends Error {
  constructor(
    readonly codigo: CodigoErroAuth,
    message: string,
  ) {
    super(message);
    this.name = 'ErroAuth';
  }
}

/** Erro devolvido pela API do Cognito. */
export class CognitoError extends Error {
  constructor(
    /** __type sem o prefixo, por exemplo "UsernameExistsException". */
    readonly tipo: string,
    message: string,
  ) {
    super(message);
    this.name = 'CognitoError';
  }
}

export type Operacao = 'cadastro' | 'confirmacao' | 'reenvio' | 'login';

const comuns: Record<string, [CodigoErroAuth, string]> = {
  LimitExceededException: [
    'muitas_tentativas',
    'Muitas tentativas. Aguarde um pouco e tente de novo.',
  ],
  TooManyRequestsException: [
    'muitas_tentativas',
    'Muitas tentativas. Aguarde um pouco e tente de novo.',
  ],
  TooManyFailedAttemptsException: [
    'muitas_tentativas',
    'Muitas tentativas. Aguarde um pouco e tente de novo.',
  ],
  NetworkError: ['sem_conexao', 'Sem conexão. Verifique a internet e tente de novo.'],
};

// Mensagem genérica de propósito: não revela se o e-mail existe (spec,
// cenário "Credenciais inválidas").
const credenciaisInvalidas: [CodigoErroAuth, string] = [
  'credenciais_invalidas',
  'E-mail ou senha incorretos.',
];

const porOperacao: Record<Operacao, Record<string, [CodigoErroAuth, string]>> = {
  cadastro: {
    UsernameExistsException: ['email_em_uso', 'Este e-mail já está em uso.'],
    InvalidPasswordException: ['senha_fraca', 'A senha não atende à política de senha.'],
    InvalidParameterException: ['dados_invalidos', 'Confira os dados informados.'],
  },
  confirmacao: {
    CodeMismatchException: [
      'codigo_invalido',
      'Código incorreto. Confira o código ou peça um novo.',
    ],
    ExpiredCodeException: ['codigo_expirado', 'Código expirado. Peça um novo código.'],
    NotAuthorizedException: ['ja_confirmada', 'Esta conta já foi confirmada. Faça login.'],
  },
  reenvio: {
    InvalidParameterException: ['ja_confirmada', 'Esta conta já foi confirmada. Faça login.'],
  },
  login: {
    NotAuthorizedException: credenciaisInvalidas,
    UserNotFoundException: credenciaisInvalidas,
    InvalidPasswordException: credenciaisInvalidas,
    UserNotConfirmedException: ['conta_nao_confirmada', 'Confirme seu e-mail para entrar.'],
  },
};

/** Converte qualquer falha de uma operação em ErroAuth. */
export function erroAuth(operacao: Operacao, erro: unknown): ErroAuth {
  if (erro instanceof ErroAuth) return erro;
  if (erro instanceof CognitoError) {
    // Conta desativada pelo admin: o Cognito usa NotAuthorizedException com
    // esta mensagem. Só aparece com a senha correta, então não vaza nada.
    if (operacao === 'login' && /disabled/i.test(erro.message)) {
      return new ErroAuth('conta_bloqueada', 'Sua conta está bloqueada. Fale com o administrador.');
    }
    const mapeado = porOperacao[operacao][erro.tipo] ?? comuns[erro.tipo];
    if (mapeado) return new ErroAuth(...mapeado);
  }
  return new ErroAuth('erro_desconhecido', 'Não foi possível concluir. Tente de novo.');
}
