import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { cognito, erroCognito, tokensCognito, usarServidor } from '../../../../test/msw';
import { renderizar } from '../../../../test/render';
import { sessao } from '../sessao/sessao';
import { AlterarSenhaForm } from './AlterarSenhaForm';
import { EsqueciSenhaForm } from './EsqueciSenhaForm';
import { RedefinirSenhaForm } from './RedefinirSenhaForm';

// Spec autenticacao: "Alteração de senha" e "Recuperação de senha".

const server = usarServidor();
let aviso: jest.SpyInstance;

beforeEach(async () => {
  // O GlobalSignOut vira aviso no ambiente local dos testes (cognito.ts).
  aviso = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  await sessao.iniciar();
});
afterEach(() => aviso.mockRestore());

async function preencher(rotulo: string, valor: string) {
  await fireEvent.changeText(screen.getByLabelText(rotulo), valor);
}

async function tocar(nome: string) {
  await fireEvent.press(screen.getByRole('button', { name: nome }));
}

describe('EsqueciSenhaForm', () => {
  const props = () => ({ onCodigoEnviado: jest.fn(), onVoltar: jest.fn() });

  it('pede o código e segue para a redefinição (spec, "Solicitar código")', async () => {
    let corpo: Record<string, unknown> = {};
    server.use(
      cognito({
        ForgotPassword: (c) => {
          corpo = c;
          return Response.json({ CodeDeliveryDetails: {} });
        },
      }),
    );
    const p = props();
    await renderizar(<EsqueciSenhaForm {...p} />);
    await preencher('E-mail', 'Ana@X.com');
    await tocar('Enviar código');
    await waitFor(() => expect(p.onCodigoEnviado).toHaveBeenCalledWith('ana@x.com'));
    expect(corpo).toMatchObject({ Username: 'ana@x.com' });
  });

  it('e-mail sem conta segue igual, sem indicar a diferença (spec)', async () => {
    server.use(cognito({ ForgotPassword: () => erroCognito('UserNotFoundException') }));
    const p = props();
    await renderizar(<EsqueciSenhaForm {...p} />);
    await preencher('E-mail', 'ninguem@x.com');
    await tocar('Enviar código');
    await waitFor(() => expect(p.onCodigoEnviado).toHaveBeenCalledWith('ninguem@x.com'));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('muitas tentativas: pede para tentar mais tarde (spec)', async () => {
    server.use(cognito({ ForgotPassword: () => erroCognito('LimitExceededException') }));
    const p = props();
    await renderizar(<EsqueciSenhaForm {...p} />);
    await preencher('E-mail', 'ana@x.com');
    await tocar('Enviar código');
    expect(await screen.findByRole('alert')).toHaveTextContent(/Muitas tentativas/);
    expect(p.onCodigoEnviado).not.toHaveBeenCalled();
  });
});

describe('RedefinirSenhaForm', () => {
  const props = () => ({ email: 'ana@x.com', onRedefinida: jest.fn(), onVoltar: jest.fn() });

  async function redefinir(codigo: string, senha: string, confirmacao = senha) {
    await preencher('Código', codigo);
    await preencher('Nova senha', senha);
    await preencher('Confirme a nova senha', confirmacao);
    await tocar('Redefinir senha');
  }

  it('mostra a mensagem neutra do envio', async () => {
    await renderizar(<RedefinirSenhaForm {...props()} />);
    expect(
      screen.getByText('Se houver uma conta com este e-mail, enviamos um código.'),
    ).toBeOnTheScreen();
  });

  it('código correto: redefine, encerra sessões antigas e volta ao login (spec)', async () => {
    const ops: string[] = [];
    server.use(
      cognito({
        ConfirmForgotPassword: (c) => {
          ops.push('ConfirmForgotPassword');
          expect(c).toMatchObject({ ConfirmationCode: '123456', Password: 'Nova1234' });
          return Response.json({});
        },
        InitiateAuth: () => (ops.push('InitiateAuth'), tokensCognito('acc', 'ref')),
      }),
    );
    const p = props();
    await renderizar(<RedefinirSenhaForm {...p} />);
    await redefinir('123456', 'Nova1234');
    await waitFor(() => expect(p.onRedefinida).toHaveBeenCalled());
    expect(ops).toEqual(['ConfirmForgotPassword', 'InitiateAuth']);
    // O login silencioso não abre sessão neste dispositivo.
    expect(sessao.obter().status).toBe('anonimo');
  });

  it.each([
    ['incorreto', 'CodeMismatchException', /Código incorreto/],
    ['expirado', 'ExpiredCodeException', /Código expirado/],
  ])('código %s: recusa e permite pedir outro (spec)', async (_, tipo, msg) => {
    let reenvios = 0;
    server.use(
      cognito({
        ConfirmForgotPassword: () => erroCognito(tipo),
        ForgotPassword: () => (reenvios++, Response.json({})),
      }),
    );
    const p = props();
    await renderizar(<RedefinirSenhaForm {...p} />);
    await redefinir('123456', 'Nova1234');
    expect(await screen.findByRole('alert')).toHaveTextContent(msg);
    expect(p.onRedefinida).not.toHaveBeenCalled();

    await tocar('Reenviar código');
    expect(await screen.findByText('Pedimos um novo código.')).toBeOnTheScreen();
    expect(reenvios).toBe(1);
  });

  it('nova senha fraca "abc123": recusa e descreve a regra (spec)', async () => {
    const p = props();
    await renderizar(<RedefinirSenhaForm {...p} />);
    await redefinir('123456', 'abc123');
    expect(
      await screen.findByText(/A senha precisa ter pelo menos 8 caracteres/),
    ).toBeOnTheScreen();
    expect(p.onRedefinida).not.toHaveBeenCalled();
  });
});

describe('AlterarSenhaForm', () => {
  const props = () => ({ onVoltar: jest.fn(), onSessaoEncerrada: jest.fn() });

  async function logado() {
    server.use(cognito({ InitiateAuth: () => tokensCognito('access-1', 'refresh-1') }));
    await sessao.entrar('ana@x.com', 'Antiga123');
  }

  async function trocar(atual: string, nova: string, confirmacao = nova) {
    await preencher('Senha atual', atual);
    await preencher('Nova senha', nova);
    await preencher('Confirme a nova senha', confirmacao);
    await tocar('Salvar nova senha');
  }

  it('troca válida: informa o sucesso e continua logado (spec)', async () => {
    await logado();
    server.use(
      cognito({
        GetUser: () => Response.json({ Username: 'uuid-ana' }),
        ChangePassword: () => Response.json({}),
        InitiateAuth: () => tokensCognito('access-2', 'refresh-2'),
      }),
    );
    await renderizar(<AlterarSenhaForm {...props()} />);
    await trocar('Antiga123', 'Nova1234');
    expect(
      await screen.findByText('Senha alterada. Os outros dispositivos foram desconectados.'),
    ).toBeOnTheScreen();
    expect(sessao.obter().tokens?.accessToken).toBe('access-2');
  });

  it('senha atual incorreta: erro no campo e a senha não muda (spec)', async () => {
    await logado();
    server.use(
      cognito({
        GetUser: () => Response.json({ Username: 'uuid-ana' }),
        ChangePassword: () =>
          erroCognito('NotAuthorizedException', 'Incorrect username or password.'),
      }),
    );
    await renderizar(<AlterarSenhaForm {...props()} />);
    await trocar('Errada123', 'Nova1234');
    expect(await screen.findByText('A senha atual não confere.')).toBeOnTheScreen();
    expect(sessao.obter().tokens?.accessToken).toBe('access-1');
  });

  it('nova senha fraca e confirmação diferente não são enviadas (spec)', async () => {
    await logado();
    let chamou = false;
    server.use(cognito({ ChangePassword: () => ((chamou = true), Response.json({})) }));
    await renderizar(<AlterarSenhaForm {...props()} />);
    await trocar('Antiga123', 'abc123', 'outra');
    expect(
      await screen.findByText(/A senha precisa ter pelo menos 8 caracteres/),
    ).toBeOnTheScreen();
    expect(screen.getByText('As senhas não conferem.')).toBeOnTheScreen();
    expect(chamou).toBe(false);
  });

  it('se o novo login falha, a sessão é encerrada e a tela leva ao login', async () => {
    await logado();
    server.use(
      cognito({
        GetUser: () => Response.json({ Username: 'uuid-ana' }),
        ChangePassword: () => Response.json({}),
        InitiateAuth: () => erroCognito('NotAuthorizedException'),
      }),
    );
    const p = props();
    await renderizar(<AlterarSenhaForm {...p} />);
    await trocar('Antiga123', 'Nova1234');
    await waitFor(() => expect(p.onSessaoEncerrada).toHaveBeenCalled());
    expect(sessao.obter().status).toBe('anonimo');
  });
});
