import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';

import { GastoForm } from '@/features/lancamento-gastos';
import { configurarAutenticacao } from '@/shared/api';

import { BFF, usarServidor } from '../../../../test/msw';
import { renderizar } from '../../../../test/render';
import { PainelView } from './PainelView';

const server = usarServidor();

beforeEach(() =>
  configurarAutenticacao({
    obterToken: async () => 'access-1',
    renovarSessao: async () => false,
    aoExpirar: () => {},
  }),
);
afterEach(() => configurarAutenticacao(null));

const aluguel = { categoriaId: 'aluguel', nome: 'Aluguel', cor: '#0EA5E9' };
const alimentacao = { categoriaId: 'alimentacao', nome: 'Alimentação', cor: '#F97316' };
const transporte = { categoriaId: 'transporte', nome: 'Transporte', cor: '#3B82F6' };

const gasto = (
  id: string,
  valor: number,
  data: string,
  c: typeof aluguel,
  grupo: 'CARTAO' | 'FIXO',
  descricao?: string,
) => ({
  id,
  valorCentavos: valor,
  data,
  grupo,
  categoria: { id: c.categoriaId, nome: c.nome, cor: c.cor },
  ...(descricao ? { descricao } : {}),
  recorrente: grupo === 'FIXO',
});

// Novembro: R$ 1.000,00 de cartão (Alimentação 750,00 e Transporte 250,00,
// cenário "Participação por categoria") e R$ 1.500,00 fixos (Aluguel).
const novembro = {
  mes: '2026-11',
  totalCentavos: 250_000,
  totaisPorGrupo: [
    { grupo: 'CARTAO', totalCentavos: 100_000 },
    { grupo: 'FIXO', totalCentavos: 150_000 },
  ],
  pizza: {
    todas: [
      { ...aluguel, totalCentavos: 150_000, percentualDecimos: 600 },
      { ...alimentacao, totalCentavos: 75_000, percentualDecimos: 300 },
      { ...transporte, totalCentavos: 25_000, percentualDecimos: 100 },
    ],
    CARTAO: [
      { ...alimentacao, totalCentavos: 75_000, percentualDecimos: 750 },
      { ...transporte, totalCentavos: 25_000, percentualDecimos: 250 },
    ],
    FIXO: [{ ...aluguel, totalCentavos: 150_000, percentualDecimos: 1000 }],
    grupos: [
      { grupo: 'FIXO', nome: 'Fixo', totalCentavos: 150_000, percentualDecimos: 600 },
      { grupo: 'CARTAO', nome: 'Cartão', totalCentavos: 100_000, percentualDecimos: 400 },
    ],
  },
  ultimos: [
    gasto('20261105-01JC8Z6Q3N4W5X6Y7Z8A9B0C1A', 150_000, '2026-11-05', aluguel, 'FIXO'),
    gasto(
      '20261103-01JC8Z6Q3N4W5X6Y7Z8A9B0C1B',
      75_000,
      '2026-11-03',
      alimentacao,
      'CARTAO',
      'Mercado',
    ),
    gasto(
      '20261102-01JC8Z6Q3N4W5X6Y7Z8A9B0C1C',
      25_000,
      '2026-11-02',
      transporte,
      'CARTAO',
      'Uber',
    ),
  ],
};

const vazio = (mes: string) => ({
  mes,
  totalCentavos: 0,
  totaisPorGrupo: [
    { grupo: 'CARTAO', totalCentavos: 0 },
    { grupo: 'FIXO', totalCentavos: 0 },
  ],
  pizza: { todas: [], CARTAO: [], FIXO: [], grupos: [] },
  ultimos: [],
});

/** BFF de /telas/dashboard que guarda os meses pedidos. */
function bffDoPainel(porMes: Record<string, object>) {
  const meses: string[] = [];
  return {
    meses,
    handler: http.get(`${BFF}/telas/dashboard`, ({ request }) => {
      const mes = new URL(request.url).searchParams.get('mes')!;
      meses.push(mes);
      return HttpResponse.json(porMes[mes] ?? vazio(mes));
    }),
  };
}

const props = () => ({ onNovo: jest.fn(), onAbrir: jest.fn(), onVerTodos: jest.fn() });

describe('PainelView', () => {
  it('mostra os totais do mês e por grupo (cenário "Totais por grupo")', async () => {
    server.use(bffDoPainel({ '2026-11': novembro }).handler);
    await renderizar(<PainelView {...props()} mesInicial="2026-11" />);

    expect(await screen.findByLabelText('Total do mês: R$ 2.500,00')).toBeOnTheScreen();
    expect(screen.getByLabelText('Cartão: R$ 1.000,00')).toBeOnTheScreen();
    expect(screen.getByLabelText('Fixos: R$ 1.500,00')).toBeOnTheScreen();
  });

  it('mostra a pizza com legenda e alterna entre Todos, Cartão e Fixo', async () => {
    server.use(bffDoPainel({ '2026-11': novembro }).handler);
    await renderizar(<PainelView {...props()} mesInicial="2026-11" />);

    // Todos: as três categorias, em ordem decrescente, com o total no centro.
    expect(await screen.findByLabelText('Aluguel: 60%, R$ 1.500,00')).toBeOnTheScreen();
    expect(screen.getByLabelText('Alimentação: 30%, R$ 750,00')).toBeOnTheScreen();
    expect(screen.getByLabelText('Transporte: 10%, R$ 250,00')).toBeOnTheScreen();
    expect(
      screen.getByLabelText('Gráfico por categoria, todos: total de R$ 2.500,00'),
    ).toBeOnTheScreen();

    // Cenário "Participação por categoria": só CARTAO, 75% e 25%.
    await fireEvent.press(screen.getByRole('radio', { name: 'Cartão' }));
    expect(screen.getByLabelText('Alimentação: 75%, R$ 750,00')).toBeOnTheScreen();
    expect(screen.getByLabelText('Transporte: 25%, R$ 250,00')).toBeOnTheScreen();
    expect(screen.queryByLabelText(/^Aluguel:/)).toBeNull();
    expect(
      screen.getByLabelText('Gráfico por categoria, cartão: total de R$ 1.000,00'),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('radio', { name: 'Fixo' }));
    expect(screen.getByLabelText('Aluguel: 100%, R$ 1.500,00')).toBeOnTheScreen();
    expect(screen.queryByLabelText(/^Alimentação:/)).toBeNull();
  });

  it('avisa quando a visão escolhida não tem gastos', async () => {
    const soCartao = {
      ...novembro,
      totalCentavos: 100_000,
      totaisPorGrupo: [
        { grupo: 'CARTAO', totalCentavos: 100_000 },
        { grupo: 'FIXO', totalCentavos: 0 },
      ],
      pizza: { ...novembro.pizza, todas: novembro.pizza.CARTAO, FIXO: [] },
    };
    server.use(bffDoPainel({ '2026-11': soCartao }).handler);
    await renderizar(<PainelView {...props()} mesInicial="2026-11" />);

    await fireEvent.press(await screen.findByRole('radio', { name: 'Fixo' }));
    expect(screen.getByText('Nenhum gasto fixo neste mês.')).toBeOnTheScreen();
  });

  it('lista os últimos lançamentos com categoria e dia, e abre o gasto', async () => {
    server.use(bffDoPainel({ '2026-11': novembro }).handler);
    const p = props();
    await renderizar(<PainelView {...p} mesInicial="2026-11" />);

    expect(await screen.findByText('Últimos lançamentos')).toBeOnTheScreen();
    // Sem descrição, o título é o nome da categoria.
    await fireEvent.press(
      screen.getByRole('button', { name: 'Mercado, Alimentação · 03/11, R$ 750,00' }),
    );
    expect(p.onAbrir).toHaveBeenCalledWith('20261103-01JC8Z6Q3N4W5X6Y7Z8A9B0C1B');
    expect(
      screen.getByRole('button', { name: 'Aluguel, Aluguel · 05/11, R$ 1.500,00' }),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Ver todos' }));
    expect(p.onVerTodos).toHaveBeenCalledWith('2026-11');
  });

  it('troca de mês e reflete o mês escolhido (cenário "Navegar entre meses")', async () => {
    const bff = bffDoPainel({ '2026-11': novembro });
    server.use(bff.handler);
    const p = props();
    await renderizar(<PainelView {...p} mesInicial="2026-11" />);
    await screen.findByLabelText('Total do mês: R$ 2.500,00');

    await fireEvent.press(screen.getByRole('button', { name: 'Mês anterior' }));
    expect(await screen.findByLabelText('Total do mês: R$ 0,00')).toBeOnTheScreen();
    expect(bff.meses).toEqual(['2026-11', '2026-10']);

    await fireEvent.press(screen.getByRole('button', { name: 'Lançar gasto' }));
    expect(p.onNovo).toHaveBeenCalled();
  });

  it('mostra o mês vazio com totais zerados e atalho para lançar (cenário "Mês vazio")', async () => {
    server.use(bffDoPainel({}).handler);
    const p = props();
    await renderizar(<PainelView {...p} mesInicial="2026-12" />);

    expect(await screen.findByText('Nenhum gasto neste mês')).toBeOnTheScreen();
    expect(screen.getByLabelText('Total do mês: R$ 0,00')).toBeOnTheScreen();
    expect(screen.getByLabelText('Cartão: R$ 0,00')).toBeOnTheScreen();
    expect(screen.getByLabelText('Fixos: R$ 0,00')).toBeOnTheScreen();
    expect(screen.queryByText('Por categoria')).toBeNull();
    expect(screen.queryByText('Últimos lançamentos')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Lançar gasto' }));
    expect(p.onNovo).toHaveBeenCalledTimes(1);
  });

  it('mostra o erro e tenta de novo', async () => {
    let falhar = true;
    server.use(
      http.get(`${BFF}/telas/dashboard`, () =>
        falhar
          ? HttpResponse.json(
              {
                type: 't',
                title: 't',
                status: 500,
                code: 'erro_interno',
                detail: 'Erro inesperado. Tente de novo.',
              },
              { status: 500, headers: { 'Content-Type': 'application/problem+json' } },
            )
          : HttpResponse.json(novembro),
      ),
    );
    await renderizar(<PainelView {...props()} mesInicial="2026-11" />);

    expect(await screen.findByText('Erro inesperado. Tente de novo.')).toBeOnTheScreen();
    falhar = false;
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByLabelText('Total do mês: R$ 2.500,00')).toBeOnTheScreen();
  });

  it('busca o painel de novo depois de lançar um gasto (cenário "Novo gasto refletido")', async () => {
    let total = 0;
    server.use(
      http.get(`${BFF}/telas/dashboard`, () =>
        HttpResponse.json(
          total === 0
            ? vazio('2026-11')
            : {
                ...vazio('2026-11'),
                totalCentavos: total,
                totaisPorGrupo: [
                  { grupo: 'CARTAO', totalCentavos: total },
                  { grupo: 'FIXO', totalCentavos: 0 },
                ],
              },
        ),
      ),
      http.get(`${BFF}/telas/gasto-form`, () =>
        HttpResponse.json({
          categorias: {
            CARTAO: [
              {
                id: 'alimentacao',
                nome: 'Alimentação',
                grupo: 'CARTAO',
                cor: '#F97316',
                padrao: true,
              },
            ],
            FIXO: [],
          },
        }),
      ),
      http.post(`${BFF}/gastos`, async ({ request }) => {
        const corpo = (await request.json()) as { valorCentavos: number };
        total += corpo.valorCentavos;
        return HttpResponse.json(
          gasto(
            '20261103-01JC8Z6Q3N4W5X6Y7Z8A9B0C1D',
            corpo.valorCentavos,
            '2026-11-03',
            alimentacao,
            'CARTAO',
          ),
          {
            status: 201,
          },
        );
      }),
    );
    // Painel e formulário na mesma árvore, com o mesmo QueryClient, como no app.
    await renderizar(
      <>
        <PainelView {...props()} mesInicial="2026-11" />
        <GastoForm onConcluido={jest.fn()} onVoltar={jest.fn()} />
      </>,
    );
    expect(await screen.findByLabelText('Total do mês: R$ 0,00')).toBeOnTheScreen();

    await fireEvent.changeText(await screen.findByLabelText('Valor'), '4590');
    await fireEvent.press(screen.getByRole('button', { name: 'Categoria: Escolha a categoria' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Alimentação' }));
    await fireEvent.changeText(screen.getByLabelText('Data'), '03112026');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar gasto' }));

    await waitFor(() => expect(screen.getByLabelText('Total do mês: R$ 45,90')).toBeOnTheScreen());
  });
});
