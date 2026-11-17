import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';

import { configurarAutenticacao } from '@/shared/api';

import { BFF, usarServidor } from '../../../../test/msw';
import { renderizar } from '../../../../test/render';
import { CartaoForm } from './CartaoForm';
import { CartoesView } from './CartoesView';

// Spec cartoes-credito: cadastro, edição, arquivar/excluir, limite e visão
// por cartão.

const server = usarServidor();

beforeEach(() =>
  configurarAutenticacao({
    obterToken: async () => 'access-1',
    renovarSessao: async () => false,
    aoExpirar: () => {},
  }),
);
afterEach(() => configurarAutenticacao(null));

const problema = (status: number, code: string, detail: string, errors?: object[]) =>
  HttpResponse.json(
    { type: `urn:gestor-gastos:problem:${code}`, title: 't', status, code, detail, errors },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );

const nubank = {
  id: '01JC8Z6Q3N4W5X6Y7Z8A9B0NUB',
  apelido: 'Nubank',
  cor: '#7E22CE',
  diaFechamento: 25,
  diaVencimento: 5,
  limiteCentavos: 500_000,
  arquivado: false,
};
const antigo = { ...nubank, id: '01JC8Z6Q3N4W5X6Y7Z8A9B0OLD', apelido: 'Antigo', arquivado: true };

const resumo = (cartao: typeof nubank, fatura: number, usado: number) => ({
  cartao,
  faturaCentavos: fatura,
  vencimento: '2026-12-05',
  limiteUsadoCentavos: usado,
  limiteDisponivelCentavos: cartao.limiteCentavos - usado,
});

describe('CartoesView', () => {
  const props = () => ({ onNovo: jest.fn(), onEditar: jest.fn(), onAbrirFatura: jest.fn() });

  it('mostra fatura, vencimento e limite de cada cartão (spec, "Lista de cartões")', async () => {
    const meses: string[] = [];
    server.use(
      http.get(`${BFF}/telas/cartoes`, ({ request }) => {
        meses.push(new URL(request.url).searchParams.get('mes')!);
        return HttpResponse.json({
          mes: '2026-12',
          hoje: '2026-11-16',
          cartoes: [resumo(nubank, 120_000, 123_000), resumo(antigo, 0, 0)],
        });
      }),
    );
    const p = props();
    await renderizar(<CartoesView {...p} mesInicial="2026-12" />);

    // Cenário "Limite com fatura aberta" (com uma parcela futura de R$ 30,00).
    const item = await screen.findByRole('button', {
      name: 'Nubank: fatura de dezembro de 2026 R$ 1.200,00, vence 05/12, disponível R$ 3.770,00',
    });
    expect(
      within(item).getByText('Limite usado R$ 1.230,00 · disponível R$ 3.770,00'),
    ).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Arquivados' })).toBeOnTheScreen();
    expect(meses).toEqual(['2026-12']);

    // Cenário "Detalhe do cartão": abre os gastos da fatura do mês.
    await fireEvent.press(item);
    expect(p.onAbrirFatura).toHaveBeenCalledWith(nubank.id, '2026-12');
    await fireEvent.press(screen.getByRole('button', { name: 'Editar Nubank' }));
    expect(p.onEditar).toHaveBeenCalledWith(nubank.id);

    await fireEvent.press(screen.getByRole('button', { name: 'Mês anterior' }));
    await waitFor(() => expect(meses).toEqual(['2026-12', '2026-11']));
  });

  it('limite estourado mostra o disponível negativo', async () => {
    server.use(
      http.get(`${BFF}/telas/cartoes`, () =>
        HttpResponse.json({
          mes: '2026-12',
          hoje: '2026-11-16',
          cartoes: [resumo(nubank, 600_000, 600_000)],
        }),
      ),
    );
    await renderizar(<CartoesView {...props()} mesInicial="2026-12" />);
    expect(
      await screen.findByText('Limite usado R$ 6.000,00 · disponível -R$ 1.000,00'),
    ).toBeOnTheScreen();
  });

  it('sem cartões: estado vazio com atalho (spec, "Usuário sem cartões")', async () => {
    server.use(
      http.get(`${BFF}/telas/cartoes`, () =>
        HttpResponse.json({ mes: '2026-12', hoje: '2026-11-16', cartoes: [] }),
      ),
    );
    const p = props();
    await renderizar(<CartoesView {...p} mesInicial="2026-12" />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Cadastrar cartão' }));
    expect(p.onNovo).toHaveBeenCalled();
  });
});

/** BFF do formulário: guarda os corpos recebidos. */
function bffDoFormulario() {
  const corpos: { metodo: string; corpo: unknown }[] = [];
  return {
    corpos,
    handlers: [
      http.get(`${BFF}/cartoes`, () => HttpResponse.json({ itens: [nubank, antigo] })),
      http.post(`${BFF}/cartoes`, async ({ request }) => {
        const corpo = (await request.json()) as { apelido: string };
        corpos.push({ metodo: 'POST', corpo });
        if (corpo.apelido.toLowerCase() === 'nubank') {
          return problema(422, 'validacao', 'Dados do cartão inválidos.', [
            { field: 'apelido', message: 'já existe um cartão ativo com esse apelido' },
          ]);
        }
        return HttpResponse.json({ ...nubank, ...corpo, id: 'novo' }, { status: 201 });
      }),
      http.put(`${BFF}/cartoes/:id`, async ({ request }) => {
        const corpo = await request.json();
        corpos.push({ metodo: 'PUT', corpo });
        return HttpResponse.json({ ...nubank, ...(corpo as object) });
      }),
      http.patch(`${BFF}/cartoes/:id`, async ({ request }) => {
        const corpo = (await request.json()) as { arquivado: boolean };
        corpos.push({ metodo: 'PATCH', corpo });
        return HttpResponse.json({ ...nubank, arquivado: corpo.arquivado });
      }),
      http.delete(`${BFF}/cartoes/:id`, () =>
        problema(409, 'cartao_em_uso', 'Este cartão tem gastos vinculados.'),
      ),
    ],
  };
}

async function escolherDia(rotulo: string, dia: number) {
  await fireEvent.press(screen.getByRole('button', { name: `${rotulo}: Escolha o dia` }));
  await fireEvent.press(screen.getByRole('radio', { name: `Dia ${dia}` }));
}

describe('CartaoForm', () => {
  it('cadastra um cartão (spec, "Cadastro válido")', async () => {
    const bff = bffDoFormulario();
    server.use(...bff.handlers);
    const onConcluido = jest.fn();
    await renderizar(<CartaoForm onConcluido={onConcluido} onVoltar={jest.fn()} />);

    await fireEvent.changeText(await screen.findByLabelText('Apelido'), '  Inter  ');
    await escolherDia('Dia de fechamento', 5);
    await escolherDia('Dia de vencimento', 15);
    await fireEvent.changeText(screen.getByLabelText('Limite'), '200000');
    await fireEvent.press(screen.getByRole('radio', { name: 'Laranja escuro' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar cartão' }));

    await waitFor(() => expect(onConcluido).toHaveBeenCalled());
    expect(bff.corpos[0]).toEqual({
      metodo: 'POST',
      corpo: {
        apelido: 'Inter',
        cor: '#C2410C',
        diaFechamento: 5,
        diaVencimento: 15,
        limiteCentavos: 200000,
      },
    });
  });

  it('valida no cliente e mostra o apelido repetido no campo (spec, "Apelido duplicado")', async () => {
    const bff = bffDoFormulario();
    server.use(...bff.handlers);
    await renderizar(<CartaoForm onConcluido={jest.fn()} onVoltar={jest.fn()} />);

    await fireEvent.press(await screen.findByRole('button', { name: 'Salvar cartão' }));
    expect(await screen.findByText('Informe o apelido.')).toBeOnTheScreen();
    expect(screen.getAllByText('Escolha o dia.')).toHaveLength(2);
    expect(screen.getByText('Informe um limite maior que zero.')).toBeOnTheScreen();
    expect(bff.corpos).toHaveLength(0);

    await fireEvent.changeText(screen.getByLabelText('Apelido'), 'nubank');
    await escolherDia('Dia de fechamento', 25);
    await escolherDia('Dia de vencimento', 5);
    await fireEvent.changeText(screen.getByLabelText('Limite'), '100');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar cartão' }));
    expect(await screen.findByText('já existe um cartão ativo com esse apelido')).toBeOnTheScreen();
  });

  it('limite de 20 cartões vira banner (spec, "Limite de cartões")', async () => {
    server.use(
      http.post(`${BFF}/cartoes`, () =>
        problema(
          409,
          'limite_cartoes',
          'Você já tem 20 cartões ativos. Arquive um para cadastrar outro.',
        ),
      ),
      ...bffDoFormulario().handlers,
    );
    await renderizar(<CartaoForm onConcluido={jest.fn()} onVoltar={jest.fn()} />);
    await fireEvent.changeText(await screen.findByLabelText('Apelido'), 'Vigésimo primeiro');
    await escolherDia('Dia de fechamento', 1);
    await escolherDia('Dia de vencimento', 10);
    await fireEvent.changeText(screen.getByLabelText('Limite'), '100');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar cartão' }));
    expect(await screen.findByText(/20 cartões ativos/)).toBeOnTheScreen();
  });

  it('edita, arquiva e, com gastos, não exclui (specs "Edição" e "Excluir cartão com gastos")', async () => {
    const bff = bffDoFormulario();
    server.use(...bff.handlers);
    const onConcluido = jest.fn();
    await renderizar(<CartaoForm id={nubank.id} onConcluido={onConcluido} onVoltar={jest.fn()} />);

    expect(await screen.findByRole('header', { name: 'Editar cartão' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Apelido')).toHaveDisplayValue('Nubank');
    await fireEvent.press(screen.getByRole('button', { name: 'Dia de fechamento: Dia 25' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Dia 20' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar cartão' }));
    await waitFor(() => expect(onConcluido).toHaveBeenCalledTimes(1));
    expect(bff.corpos[0]).toMatchObject({ metodo: 'PUT', corpo: { diaFechamento: 20 } });

    await fireEvent.press(screen.getByRole('button', { name: 'Excluir cartão' }));
    await fireEvent.press(
      within(screen.getByRole('alert')).getByRole('button', { name: 'Excluir' }),
    );
    expect(
      await screen.findByText('Este cartão tem gastos vinculados. Arquive-o em vez de excluir.'),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Arquivar cartão' }));
    await waitFor(() => expect(onConcluido).toHaveBeenCalledTimes(2));
    expect(bff.corpos.at(-1)).toEqual({ metodo: 'PATCH', corpo: { arquivado: true } });
  });

  it('cartão arquivado pode ser reativado', async () => {
    const bff = bffDoFormulario();
    server.use(...bff.handlers);
    await renderizar(<CartaoForm id={antigo.id} onConcluido={jest.fn()} onVoltar={jest.fn()} />);
    expect(
      await screen.findByText('Cartão arquivado: ele não aparece no formulário de gasto.'),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Reativar cartão' }));
    await waitFor(() =>
      expect(bff.corpos.at(-1)).toEqual({ metodo: 'PATCH', corpo: { arquivado: false } }),
    );
  });

  it('cartão inexistente vira mensagem', async () => {
    server.use(...bffDoFormulario().handlers);
    await renderizar(<CartaoForm id="nao-existe" onConcluido={jest.fn()} onVoltar={jest.fn()} />);
    expect(await screen.findByText('Este cartão não existe mais.')).toBeOnTheScreen();
  });
});

describe('CartoesView do colaborador Leitor', () => {
  it('vê as faturas, sem cadastrar nem editar', async () => {
    server.use(
      http.get(`${BFF}/telas/cartoes`, () =>
        HttpResponse.json({ mes: '2026-12', hoje: '2026-11-16', cartoes: [resumo(nubank, 0, 0)] }),
      ),
    );
    await renderizar(<CartoesView onAbrirFatura={jest.fn()} mesInicial="2026-12" />);
    expect(await screen.findByRole('button', { name: /^Nubank: fatura/ })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Editar Nubank' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Novo cartão' })).toBeNull();
  });

  it('sem cartões, sem o atalho para cadastrar', async () => {
    server.use(
      http.get(`${BFF}/telas/cartoes`, () =>
        HttpResponse.json({ mes: '2026-12', hoje: '2026-11-16', cartoes: [] }),
      ),
    );
    await renderizar(<CartoesView onAbrirFatura={jest.fn()} mesInicial="2026-12" />);
    expect(await screen.findByText(/Cadastre seus cartões/)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Cadastrar cartão' })).toBeNull();
  });
});
