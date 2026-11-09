import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { cognito, erroCognito, tokensCognito, usarServidor } from '../../../../test/msw';
import { renderizar } from '../../../../test/render';
import { sessao } from '../sessao/sessao';
import { CadastroForm } from './CadastroForm';
import { ConfirmarForm } from './ConfirmarForm';
import { LoginForm } from './LoginForm';

const server = usarServidor();

beforeEach(async () => {
  await sessao.iniciar();
});

async function preencher(rotulo: string, valor: string) {
  await fireEvent.changeText(screen.getByLabelText(rotulo), valor);
}

async function tocar(nome: string) {
  await fireEvent.press(screen.getByRole('button', { name: nome }));
}

describe('CadastroForm', () => {
  const props = () => ({ onCadastrado: jest.fn(), onJaTenhoConta: jest.fn() });

  it('dados válidos: cria a conta pendente e segue para a confirmação (spec)', async () => {
    let corpo: Record<string, unknown> = {};
    server.use(
      cognito({
        SignUp: (c) => {
          corpo = c;
          return Response.json({ UserConfirmed: false, UserSub: 'u-1' });
        },
      }),
    );
    const p = props();
    await renderizar(<CadastroForm {...p} />);
    await preencher('Nome', '  Ana Souza ');
    await preencher('E-mail', 'Ana@X.com');
    await preencher('Senha', 'Senha123');
    await tocar('Criar conta');

    await waitFor(() => expect(p.onCadastrado).toHaveBeenCalledWith('ana@x.com'));
    expect(corpo).toMatchObject({
      Username: 'ana@x.com',
      Password: 'Senha123',
      UserAttributes: [
        { Name: 'email', Value: 'ana@x.com' },
        { Name: 'name', Value: 'Ana Souza' },
      ],
    });
  });

  it('senha fraca "abc123": recusa e descreve as regras não atendidas (spec)', async () => {
    const p = props();
    await renderizar(<CadastroForm {...p} />);
    await preencher('Nome', 'Ana');
    await preencher('E-mail', 'ana@x.com');
    await preencher('Senha', 'abc123');
    await tocar('Criar conta');

    expect(
      await screen.findByText(
        'A senha precisa ter pelo menos 8 caracteres e ter uma letra maiúscula.',
      ),
    ).toBeOnTheScreen();
    expect(p.onCadastrado).not.toHaveBeenCalled();
  });

  it('e-mail já cadastrado: recusa e informa que está em uso (spec)', async () => {
    server.use(cognito({ SignUp: () => erroCognito('UsernameExistsException', 'exists') }));
    const p = props();
    await renderizar(<CadastroForm {...p} />);
    await preencher('Nome', 'Ana');
    await preencher('E-mail', 'ana@x.com');
    await preencher('Senha', 'Senha123');
    await tocar('Criar conta');

    expect(await screen.findByRole('alert')).toHaveTextContent(/Este e-mail já está em uso/);
    expect(p.onCadastrado).not.toHaveBeenCalled();
  });

  it('valida nome e e-mail antes de enviar', async () => {
    await renderizar(<CadastroForm {...props()} />);
    await preencher('E-mail', 'nao-e-email');
    await tocar('Criar conta');
    expect(await screen.findByText('Informe o nome.')).toBeOnTheScreen();
    expect(screen.getByText('E-mail inválido.')).toBeOnTheScreen();
  });

  it('"Já tenho conta" volta para o login', async () => {
    const p = props();
    await renderizar(<CadastroForm {...p} />);
    await tocar('Já tenho conta');
    expect(p.onJaTenhoConta).toHaveBeenCalled();
  });
});

describe('ConfirmarForm', () => {
  const props = () => ({ email: 'ana@x.com', onConfirmado: jest.fn(), onVoltar: jest.fn() });

  it('código correto: ativa a conta e segue para o login (spec)', async () => {
    let corpo: Record<string, unknown> = {};
    server.use(
      cognito({
        ConfirmSignUp: (c) => {
          corpo = c;
          return Response.json({});
        },
      }),
    );
    const p = props();
    await renderizar(<ConfirmarForm {...p} />);
    await preencher('Código', '123456');
    await tocar('Confirmar');

    await waitFor(() => expect(p.onConfirmado).toHaveBeenCalled());
    expect(corpo).toMatchObject({ Username: 'ana@x.com', ConfirmationCode: '123456' });
  });

  it('código incorreto: recusa e permite pedir um novo código (spec)', async () => {
    let reenvios = 0;
    server.use(
      cognito({
        ConfirmSignUp: () => erroCognito('CodeMismatchException'),
        ResendConfirmationCode: () => {
          reenvios++;
          return Response.json({ CodeDeliveryDetails: {} });
        },
      }),
    );
    const p = props();
    await renderizar(<ConfirmarForm {...p} />);
    await preencher('Código', '000000');
    await tocar('Confirmar');
    expect(await screen.findByRole('alert')).toHaveTextContent(/Código incorreto/);

    await tocar('Reenviar código');
    expect(await screen.findByText('Enviamos um novo código.')).toBeOnTheScreen();
    expect(reenvios).toBe(1);
    expect(p.onConfirmado).not.toHaveBeenCalled();
  });

  it('código expirado tem mensagem própria (spec)', async () => {
    server.use(cognito({ ConfirmSignUp: () => erroCognito('ExpiredCodeException') }));
    await renderizar(<ConfirmarForm {...props()} />);
    await preencher('Código', '123456');
    await tocar('Confirmar');
    expect(await screen.findByRole('alert')).toHaveTextContent(/Código expirado/);
  });

  it('valida o formato do código', async () => {
    await renderizar(<ConfirmarForm {...props()} />);
    await preencher('Código', '12a');
    await tocar('Confirmar');
    expect(await screen.findByText('O código tem 6 números.')).toBeOnTheScreen();
  });

  it('falha no reenvio aparece na tela', async () => {
    server.use(cognito({ ResendConfirmationCode: () => erroCognito('LimitExceededException') }));
    await renderizar(<ConfirmarForm {...props()} />);
    await tocar('Reenviar código');
    expect(await screen.findByRole('alert')).toHaveTextContent(/Muitas tentativas/);
  });
});

describe('LoginForm', () => {
  const props = () => ({ onNaoConfirmado: jest.fn(), onCriarConta: jest.fn() });

  async function entrar(email: string, senha: string) {
    await preencher('E-mail', email);
    await preencher('Senha', senha);
    await tocar('Entrar');
  }

  it('credenciais válidas abrem a sessão (spec)', async () => {
    server.use(cognito({ InitiateAuth: () => tokensCognito('access-1', 'refresh-1') }));
    await renderizar(<LoginForm {...props()} />);
    await entrar('ana@x.com', 'Senha123');
    await waitFor(() => expect(sessao.obter().status).toBe('autenticado'));
  });

  it.each([
    ['senha errada', 'NotAuthorizedException', 'Incorrect username or password.'],
    ['e-mail inexistente', 'UserNotFoundException', 'User does not exist.'],
    ['senha errada no cognito-local', 'InvalidPasswordException', 'Invalid password'],
  ])('%s: mensagem genérica, sem revelar se o e-mail existe (spec)', async (_, tipo, msg) => {
    server.use(cognito({ InitiateAuth: () => erroCognito(tipo, msg) }));
    await renderizar(<LoginForm {...props()} />);
    await entrar('ana@x.com', 'Errada123');
    expect(await screen.findByRole('alert')).toHaveTextContent(/E-mail ou senha incorretos\./);
    expect(sessao.obter().status).toBe('anonimo');
  });

  it('conta não confirmada: leva para a confirmação de e-mail (spec)', async () => {
    server.use(cognito({ InitiateAuth: () => erroCognito('UserNotConfirmedException') }));
    const p = props();
    await renderizar(<LoginForm {...p} />);
    await entrar('Ana@X.com', 'Senha123');
    await waitFor(() => expect(p.onNaoConfirmado).toHaveBeenCalledWith('ana@x.com'));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('conta bloqueada: recusa o acesso (spec)', async () => {
    server.use(
      cognito({ InitiateAuth: () => erroCognito('NotAuthorizedException', 'User is disabled.') }),
    );
    await renderizar(<LoginForm {...props()} />);
    await entrar('ana@x.com', 'Senha123');
    expect(await screen.findByRole('alert')).toHaveTextContent(/Sua conta está bloqueada/);
    expect(sessao.obter().status).toBe('anonimo');
  });

  it('mostra o aviso de conta confirmada e o e-mail já preenchido', async () => {
    await renderizar(
      <LoginForm
        {...props()}
        emailInicial="ana@x.com"
        aviso="Conta confirmada. Entre com seu e-mail e senha."
      />,
    );
    expect(screen.getByText('Conta confirmada. Entre com seu e-mail e senha.')).toBeOnTheScreen();
    expect(screen.getByLabelText('E-mail')).toHaveProp('value', 'ana@x.com');
  });

  it('exige e-mail e senha', async () => {
    await renderizar(<LoginForm {...props()} />);
    await tocar('Entrar');
    expect(await screen.findByText('Informe o e-mail.')).toBeOnTheScreen();
    expect(screen.getByText('Informe a senha.')).toBeOnTheScreen();
  });

  it('"Criar conta" leva ao cadastro', async () => {
    const p = props();
    await renderizar(<LoginForm {...p} />);
    await tocar('Criar conta');
    expect(p.onCriarConta).toHaveBeenCalled();
  });
});
