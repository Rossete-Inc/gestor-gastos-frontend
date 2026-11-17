import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useQuery } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { Text } from 'react-native';

import { bff, configurarConta } from '@/shared/api';

import { BFF, usarServidor } from '../../../../test/msw';
import { renderizar } from '../../../../test/render';
import { contaAtiva, reiniciarContaAtiva, type ContaAlheia } from '../model/contaAtiva';
import { AcoesDaConta } from './AcoesDaConta';
import { BarraDaConta } from './BarraDaConta';
import { ColaboradoresView } from './ColaboradoresView';
import { ConvitesView } from './ConvitesView';

const server = usarServidor();

const problema = (status: number, code: string, detail: string, errors?: object[]) =>
  HttpResponse.json(
    { type: `urn:gestor-gastos:problem:${code}`, title: 't', status, code, detail, errors },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );

const minha = { donoId: 'u-1', nomeDono: 'Bruno', papel: 'DONO' };
const daAna: ContaAlheia = { donoId: 'ana', nomeDono: 'Ana', papel: 'EDITOR' };
const conviteDani = {
  donoId: 'dani',
  nomeDono: 'Dani',
  papel: 'LEITOR',
  criadoEm: '2026-11-17T12:00:00.000Z',
};

function contas(alheias: object[] = [], convites: object[] = []) {
  return http.get(`${BFF}/contas`, () =>
    HttpResponse.json({ contas: [minha, ...alheias], convites }),
  );
}

beforeEach(() => reiniciarContaAtiva());

describe('BarraDaConta', () => {
  const acoes = { onConvites: jest.fn(), onTrocou: jest.fn() };

  it('sem outras contas nem convites, não mostra nada', async () => {
    server.use(contas());
    await renderizar(<BarraDaConta {...acoes} />);
    await waitFor(() => expect(screen.queryByText('Carregando')).toBeNull());
    expect(screen.queryByRole('button', { name: /Conta:/ })).toBeNull();
  });

  it('troca para a conta da Ana e manda o X-Conta (spec, "Trocar de conta")', async () => {
    let xConta: string | null = null;
    server.use(
      contas([daAna]),
      http.get(`${BFF}/cartoes`, ({ request }) => {
        xConta = request.headers.get('X-Conta');
        return HttpResponse.json({ itens: [] });
      }),
    );
    await renderizar(<BarraDaConta {...acoes} />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Conta: Minha conta' }));
    await fireEvent.press(screen.getByText('Conta de Ana'));
    await waitFor(() => expect(acoes.onTrocou).toHaveBeenCalled());
    expect(contaAtiva.obter().conta).toEqual(daAna);
    expect(screen.getByRole('button', { name: 'Conta: Conta de Ana' })).toBeOnTheScreen();
    // O client HTTP pergunta a conta à feature (configurarConta).
    configurarConta({ obterConta: contaAtiva.donoId, aoPerderConta: () => {} });
    await bff.listarCartoes();
    expect(xConta).toBe('ana');
    configurarConta(null);
  });

  it('Leitor aparece como só leitura', async () => {
    server.use(contas([{ ...daAna, papel: 'LEITOR' }]));
    await renderizar(<BarraDaConta {...acoes} />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Conta: Minha conta' }));
    expect(screen.getByText('Conta de Ana (só leitura)')).toBeOnTheScreen();
  });

  it('acesso removido: volta para a própria e avisa (spec, "Acesso perdido")', async () => {
    await contaAtiva.escolher(daAna);
    server.use(contas());
    await renderizar(<BarraDaConta {...acoes} />);
    expect(
      await screen.findByText('Seu acesso à conta de Ana terminou. Você voltou para a sua conta.'),
    ).toBeOnTheScreen();
    expect(contaAtiva.obter().conta).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Ok' }));
    expect(screen.queryByText(/terminou/)).toBeNull();
  });

  it('o papel mudado pelo dono vale na conta ativa', async () => {
    await contaAtiva.escolher(daAna);
    server.use(contas([{ ...daAna, papel: 'LEITOR' }]));
    await renderizar(<BarraDaConta {...acoes} />);
    await waitFor(() => expect(contaAtiva.obter().conta?.papel).toBe('LEITOR'));
  });

  it('avisa os convites pendentes e abre a tela de convites', async () => {
    server.use(contas([], [conviteDani]));
    await renderizar(<BarraDaConta {...acoes} />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Você tem 1 convite' }));
    expect(acoes.onConvites).toHaveBeenCalled();
  });

  it('com mais de um convite, diz quantos', async () => {
    server.use(contas([], [conviteDani, { ...conviteDani, donoId: 'eva', nomeDono: 'Eva' }]));
    await renderizar(<BarraDaConta {...acoes} />);
    expect(await screen.findByRole('button', { name: 'Você tem 2 convites' })).toBeOnTheScreen();
  });
});

describe('ConvitesView', () => {
  it('aceitar: passa a colaborar e a conta da dona fica ativa (spec, "Aceitar")', async () => {
    const onAceito = jest.fn();
    let aceito = false;
    server.use(
      http.get(`${BFF}/contas`, () =>
        HttpResponse.json({
          contas: aceito ? [minha, { donoId: 'dani', nomeDono: 'Dani', papel: 'LEITOR' }] : [minha],
          convites: aceito ? [] : [conviteDani],
        }),
      ),
      http.post(`${BFF}/contas/convites/dani/aceitar`, () => {
        aceito = true;
        return HttpResponse.json({ donoId: 'dani', nomeDono: 'Dani', papel: 'LEITOR' });
      }),
    );
    await renderizar(<ConvitesView onVoltar={jest.fn()} onAceito={onAceito} />);
    expect(await screen.findByText('Conta de Dani')).toBeOnTheScreen();
    expect(screen.getByText('Como Leitor, você só consulta.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Aceitar' }));
    await waitFor(() => expect(onAceito).toHaveBeenCalled());
    expect(contaAtiva.obter().conta).toEqual({ donoId: 'dani', nomeDono: 'Dani', papel: 'LEITOR' });
    expect(await screen.findByText('Nenhum convite pendente.')).toBeOnTheScreen();
  });

  it('recusar: o convite some e nada muda (spec, "Recusar")', async () => {
    let recusado = false;
    server.use(
      http.get(`${BFF}/contas`, () =>
        HttpResponse.json({
          contas: [minha],
          convites: recusado ? [] : [{ ...conviteDani, papel: 'EDITOR' }],
        }),
      ),
      http.post(`${BFF}/contas/convites/dani/recusar`, () => {
        recusado = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await renderizar(<ConvitesView onVoltar={jest.fn()} onAceito={jest.fn()} />);
    expect(await screen.findByText(/Como Editor/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Recusar' }));
    expect(await screen.findByText('Nenhum convite pendente.')).toBeOnTheScreen();
    expect(contaAtiva.obter().conta).toBeNull();
  });

  it('convite que não existe mais', async () => {
    server.use(
      contas([], [conviteDani]),
      http.post(`${BFF}/contas/convites/dani/aceitar`, () =>
        problema(404, 'convite_nao_encontrado', 'Convite não encontrado.'),
      ),
    );
    await renderizar(<ConvitesView onVoltar={jest.fn()} onAceito={jest.fn()} />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Aceitar' }));
    expect(await screen.findByText('Esse convite não existe mais.')).toBeOnTheScreen();
  });

  it('erro ao carregar permite tentar de novo', async () => {
    let falhar = true;
    server.use(
      http.get(`${BFF}/contas`, () =>
        falhar
          ? problema(500, 'erro_interno', 'Erro interno. Tente novamente.')
          : HttpResponse.json({ contas: [minha], convites: [] }),
      ),
    );
    await renderizar(<ConvitesView onVoltar={jest.fn()} onAceito={jest.fn()} />);
    expect(await screen.findByText('Erro interno. Tente novamente.')).toBeOnTheScreen();
    falhar = false;
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByText('Nenhum convite pendente.')).toBeOnTheScreen();
  });
});

describe('ColaboradoresView', () => {
  const bruno = {
    userId: 'b',
    nome: 'Bruno',
    email: 'bruno@x.com',
    papel: 'EDITOR',
    desde: '2026-11-17T12:00:00.000Z',
  };
  const conviteCarla = {
    email: 'carla@x.com',
    papel: 'LEITOR',
    criadoEm: '2026-11-17T12:00:00.000Z',
  };

  function servidor(estado: { membros: object[]; convites: object[] }) {
    return http.get(`${BFF}/colaboradores`, () => HttpResponse.json({ ...estado, limite: 5 }));
  }

  it('lista membros e convites pendentes com a contagem do limite', async () => {
    server.use(servidor({ membros: [bruno], convites: [conviteCarla] }));
    await renderizar(<ColaboradoresView onVoltar={jest.fn()} />);
    expect(await screen.findByText('Pessoas (2 de 5)')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: /Bruno, bruno@x.com, Editor, Ativo/ }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', {
        name: /carla@x.com, Ainda não aceitou, Leitor, Convite pendente/,
      }),
    ).toBeOnTheScreen();
  });

  it('convida pelo e-mail com o papel escolhido (spec, "Convite válido")', async () => {
    const estado = { membros: [] as object[], convites: [] as object[] };
    let recebido: unknown;
    server.use(
      servidor(estado),
      http.post(`${BFF}/colaboradores`, async ({ request }) => {
        recebido = await request.json();
        estado.convites.push(conviteCarla);
        return HttpResponse.json(conviteCarla, { status: 201 });
      }),
    );
    await renderizar(<ColaboradoresView onVoltar={jest.fn()} />);
    expect(await screen.findByText('Ninguém colabora na sua conta ainda.')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('E-mail'), ' Carla@X.com ');
    await fireEvent.press(screen.getByRole('radio', { name: 'Leitor' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar convite' }));
    expect(
      await screen.findByText(
        'Convite enviado para carla@x.com. A pessoa vê o convite ao entrar no app.',
      ),
    ).toBeOnTheScreen();
    expect(recebido).toEqual({ email: 'carla@x.com', papel: 'LEITOR' });
    expect(await screen.findByText('Pessoas (1 de 5)')).toBeOnTheScreen();
  });

  it('valida o e-mail antes de enviar', async () => {
    server.use(servidor({ membros: [], convites: [] }));
    await renderizar(<ColaboradoresView onVoltar={jest.fn()} />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Enviar convite' }));
    expect(await screen.findByText('Informe o e-mail.')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('E-mail'), 'nao-e-email');
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar convite' }));
    expect(await screen.findByText('E-mail inválido.')).toBeOnTheScreen();
  });

  it.each([
    ['convite_existente', 409, 'Já existe um convite pendente para esse e-mail.'],
    ['ja_colaborador', 409, 'Essa pessoa já colabora na sua conta.'],
    [
      'limite_colaboradores',
      409,
      'A conta já tem 5 colaboradores e convites. Remova alguém ou cancele um convite.',
    ],
  ])(
    'recusa do serviço %s vira mensagem (spec, "Convite repetido" e "Sexto convite")',
    async (code, status, msg) => {
      server.use(
        servidor({ membros: [], convites: [] }),
        http.post(`${BFF}/colaboradores`, () => problema(status, code, 'x')),
      );
      await renderizar(<ColaboradoresView onVoltar={jest.fn()} />);
      await fireEvent.changeText(await screen.findByLabelText('E-mail'), 'x@x.com');
      await fireEvent.press(screen.getByRole('button', { name: 'Enviar convite' }));
      expect(await screen.findByText(msg)).toBeOnTheScreen();
    },
  );

  it('o próprio e-mail volta como erro no campo (spec, "Convidar a si mesmo")', async () => {
    server.use(
      servidor({ membros: [], convites: [] }),
      http.post(`${BFF}/colaboradores`, () =>
        problema(422, 'validacao', 'Dados inválidos.', [
          { field: 'email', message: 'não é possível convidar a si mesmo' },
        ]),
      ),
    );
    await renderizar(<ColaboradoresView onVoltar={jest.fn()} />);
    await fireEvent.changeText(await screen.findByLabelText('E-mail'), 'eu@x.com');
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar convite' }));
    expect(await screen.findByText('não é possível convidar a si mesmo')).toBeOnTheScreen();
  });

  it('no limite, esconde o formulário', async () => {
    const cinco = Array.from({ length: 5 }, (_, i) => ({
      ...bruno,
      userId: `u${i}`,
      email: `u${i}@x.com`,
    }));
    server.use(servidor({ membros: cinco, convites: [] }));
    await renderizar(<ColaboradoresView onVoltar={jest.fn()} />);
    expect(
      await screen.findByText(
        'A conta chegou ao limite de 5 pessoas, contando os convites pendentes.',
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Enviar convite' })).toBeNull();
  });

  it('muda o papel e remove (spec, "Mudar para leitor" e "Remover colaborador")', async () => {
    const estado = { membros: [{ ...bruno }] as (typeof bruno)[], convites: [] as object[] };
    let papelRecebido: unknown;
    server.use(
      servidor(estado),
      http.patch(`${BFF}/colaboradores/b`, async ({ request }) => {
        papelRecebido = await request.json();
        estado.membros[0] = { ...bruno, papel: 'LEITOR' };
        return HttpResponse.json(estado.membros[0]);
      }),
      http.delete(`${BFF}/colaboradores/b`, () => {
        estado.membros = [];
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await renderizar(<ColaboradoresView onVoltar={jest.fn()} />);
    await fireEvent.press(await screen.findByRole('button', { name: /Bruno, bruno@x.com/ }));
    await fireEvent.press(screen.getByText('Mudar para Leitor'));
    expect(
      await screen.findByRole('button', { name: /Bruno, bruno@x.com, Leitor/ }),
    ).toBeOnTheScreen();
    expect(papelRecebido).toEqual({ papel: 'LEITOR' });

    await fireEvent.press(screen.getByRole('button', { name: /Bruno, bruno@x.com/ }));
    await fireEvent.press(screen.getByText('Remover da conta'));
    expect(screen.getByText(/Os gastos que lançou continuam nela/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Remover' }));
    expect(await screen.findByText('Ninguém colabora na sua conta ainda.')).toBeOnTheScreen();
  });

  it('cancela um convite pendente, com o e-mail codificado no caminho', async () => {
    const estado = {
      membros: [] as object[],
      convites: [{ ...conviteCarla, email: 'carla+1@x.com' }],
    };
    let caminho = '';
    server.use(
      servidor(estado),
      http.delete(`${BFF}/colaboradores/convites/:email`, ({ request }) => {
        caminho = new URL(request.url).pathname;
        estado.convites = [];
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await renderizar(<ColaboradoresView onVoltar={jest.fn()} />);
    await fireEvent.press(await screen.findByRole('button', { name: /carla\+1@x.com/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar convite' }));
    expect(await screen.findByText('Ninguém colabora na sua conta ainda.')).toBeOnTheScreen();
    expect(caminho).toBe('/colaboradores/convites/carla%2B1%40x.com');
  });

  it('erro de uma ação aparece na tela', async () => {
    server.use(
      servidor({ membros: [bruno], convites: [] }),
      http.patch(`${BFF}/colaboradores/b`, () =>
        problema(404, 'colaborador_nao_encontrado', 'Colaborador não encontrado.'),
      ),
    );
    await renderizar(<ColaboradoresView onVoltar={jest.fn()} />);
    await fireEvent.press(await screen.findByRole('button', { name: /Bruno, bruno@x.com/ }));
    await fireEvent.press(screen.getByText('Mudar para Leitor'));
    expect(await screen.findByText('Colaborador não encontrado.')).toBeOnTheScreen();
  });

  it('erro ao carregar permite tentar de novo', async () => {
    let falhar = true;
    server.use(
      http.get(`${BFF}/colaboradores`, () =>
        falhar
          ? problema(500, 'erro_interno', 'Erro interno. Tente novamente.')
          : HttpResponse.json({ membros: [], convites: [], limite: 5 }),
      ),
    );
    await renderizar(<ColaboradoresView onVoltar={jest.fn()} />);
    expect(await screen.findByText('Erro interno. Tente novamente.')).toBeOnTheScreen();
    falhar = false;
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByText('Ninguém colabora na sua conta ainda.')).toBeOnTheScreen();
  });
});

describe('AcoesDaConta', () => {
  const acoes = { onColaboradores: jest.fn(), onConvites: jest.fn(), onSaiu: jest.fn() };

  it('na própria conta: Colaboradores e Convites, sem "Sair"', async () => {
    server.use(contas([], [conviteDani]));
    await renderizar(<AcoesDaConta {...acoes} />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Convites (1)' }));
    expect(acoes.onConvites).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Colaboradores' }));
    expect(acoes.onColaboradores).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /Sair da conta/ })).toBeNull();
  });

  it('numa conta alheia: sai da conta e volta para a própria (spec, "Colaborador sai")', async () => {
    await act(() => contaAtiva.escolher(daAna));
    let saiu = false;
    server.use(
      contas([daAna]),
      http.delete(`${BFF}/contas/ana/participacao`, () => {
        saiu = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await renderizar(<AcoesDaConta {...acoes} />);
    expect(screen.queryByRole('button', { name: 'Colaboradores' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Sair da conta de Ana' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Sair da conta' }));
    await waitFor(() => expect(acoes.onSaiu).toHaveBeenCalled());
    expect(saiu).toBe(true);
    expect(contaAtiva.obter().conta).toBeNull();
  });

  it('avisa que saiu mesmo se a tela desmontar com o cache recomeçando (Perfil em "Carregando")', async () => {
    await act(() => contaAtiva.escolher(daAna));
    server.use(
      contas([daAna]),
      http.delete(`${BFF}/contas/ana/participacao`, () => new HttpResponse(null, { status: 204 })),
    );
    const onSaiu = jest.fn();
    // Como o PerfilView: enquanto a consulta carrega, só "Carregando".
    function ComoOPerfil() {
      const perfil = useQuery({
        queryKey: ['perfil-de-teste'],
        queryFn: () => new Promise<string>((ok) => setTimeout(() => ok('ok'), 50)),
      });
      if (perfil.isPending) return <Text>Carregando</Text>;
      return <AcoesDaConta {...acoes} onSaiu={onSaiu} />;
    }
    await renderizar(<ComoOPerfil />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Sair da conta de Ana' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Sair da conta' }));
    await waitFor(() => expect(onSaiu).toHaveBeenCalled());
    expect(contaAtiva.obter().conta).toBeNull();
  });

  it('erro ao sair aparece na tela', async () => {
    await act(() => contaAtiva.escolher(daAna));
    server.use(
      contas([daAna]),
      http.delete(`${BFF}/contas/ana/participacao`, () =>
        problema(500, 'erro_interno', 'Erro interno. Tente novamente.'),
      ),
    );
    await renderizar(<AcoesDaConta {...acoes} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Sair da conta de Ana' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Sair da conta' }));
    expect(await screen.findByText('Erro interno. Tente novamente.')).toBeOnTheScreen();
    expect(contaAtiva.obter().conta).toEqual(daAna);
  });
});
