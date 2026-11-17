import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';

import { configurarAutenticacao } from '@/shared/api';

import { BFF, usarServidor } from '../../../../test/msw';
import { renderizar } from '../../../../test/render';
import { GastoForm } from './GastoForm';
import { GastosView } from './GastosView';

const server = usarServidor();

const problema = (status: number, code: string, detail: string, errors?: object[]) =>
  HttpResponse.json(
    { type: `urn:gestor-gastos:problem:${code}`, title: 't', status, code, detail, errors },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );

const alimentacao = {
  id: 'alimentacao',
  nome: 'Alimentação',
  grupo: 'CARTAO',
  cor: '#F97316',
  padrao: true,
};
const lazer = { id: 'lazer', nome: 'Lazer', grupo: 'CARTAO', cor: '#A855F7', padrao: true };
const aluguel = { id: 'aluguel', nome: 'Aluguel', grupo: 'FIXO', cor: '#0EA5E9', padrao: true };
const categorias = { CARTAO: [alimentacao, lazer], FIXO: [aluguel] };
const resumo = (c: typeof alimentacao) => ({ id: c.id, nome: c.nome, cor: c.cor });

// Fecha dia 25 e vence dia 5: compra em 03/11 entra na fatura de dezembro.
const nubank = {
  id: '01JC8Z6Q3N4W5X6Y7Z8A9B0NUB',
  apelido: 'Nubank',
  cor: '#7E22CE',
  diaFechamento: 25,
  diaVencimento: 5,
  limiteCentavos: 500000,
  arquivado: false,
};
const cartoes = [nubank];

type GastoApi = {
  id: string;
  valorCentavos: number;
  data: string;
  mesReferencia: string;
  grupo: 'CARTAO' | 'FIXO';
  categoria: { id: string; nome: string; cor: string };
  cartao?: { id: string; apelido: string; cor: string };
  descricao?: string;
  recorrente: boolean;
  serie?: { id: string; tipo: 'PARCELAMENTO' | 'RECORRENCIA'; numero: number; total?: number };
};

const almoco: GastoApi = {
  id: '20261103-01JC8Z6Q3N4W5X6Y7Z8A9B0C1D',
  valorCentavos: 4590,
  data: '2026-11-03',
  mesReferencia: '2026-11',
  grupo: 'CARTAO',
  categoria: resumo(alimentacao),
  descricao: 'Almoço',
  recorrente: false,
};
const cinema: GastoApi = {
  id: '20261103-01JC8Z6Q3N4W5X6Y7Z8A9B0C1E',
  valorCentavos: 6400,
  data: '2026-11-03',
  mesReferencia: '2026-11',
  grupo: 'CARTAO',
  categoria: resumo(lazer),
  cartao: { id: nubank.id, apelido: nubank.apelido, cor: nubank.cor },
  recorrente: false,
};
const aluguelNov: GastoApi = {
  id: '20261101-01JC8Z6Q3N4W5X6Y7Z8A9B0C1F',
  valorCentavos: 150000,
  data: '2026-11-01',
  mesReferencia: '2026-11',
  grupo: 'FIXO',
  categoria: resumo(aluguel),
  descricao: 'Aluguel',
  recorrente: true,
};

beforeEach(() =>
  configurarAutenticacao({
    obterToken: async () => 'access-1',
    renovarSessao: async () => false,
    aoExpirar: () => {},
  }),
);
afterEach(() => configurarAutenticacao(null));

/** BFF de /telas/gastos paginado de 2 em 2, que guarda as queries recebidas. */
function bffDeLista(itens: GastoApi[]) {
  const pedidos: URLSearchParams[] = [];
  return {
    pedidos,
    handler: http.get(`${BFF}/telas/gastos`, ({ request }) => {
      const q = new URL(request.url).searchParams;
      pedidos.push(q);
      const filtrados = itens.filter(
        (g) =>
          g.mesReferencia === q.get('mes') &&
          (!q.get('grupo') || g.grupo === q.get('grupo')) &&
          (!q.get('categoriaId') || g.categoria.id === q.get('categoriaId')) &&
          (!q.get('cartaoId') ||
            (q.get('cartaoId') === 'SEM_CARTAO' ? !g.cartao : g.cartao?.id === q.get('cartaoId'))),
      );
      const inicio = Number(q.get('cursor') ?? '0');
      const pagina = filtrados.slice(inicio, inicio + 2);
      const proximo = inicio + 2 < filtrados.length ? String(inicio + 2) : undefined;
      return HttpResponse.json({
        mes: q.get('mes'),
        itens: pagina,
        categorias,
        cartoes,
        ...(proximo ? { nextCursor: proximo } : {}),
      });
    }),
  };
}

describe('GastosView', () => {
  it('lista o mês agrupado por dia, com categoria, valor e recorrência', async () => {
    const bff = bffDeLista([almoco, cinema, aluguelNov]);
    server.use(bff.handler);
    await renderizar(<GastosView onNovo={jest.fn()} onAbrir={jest.fn()} mesInicial="2026-11" />);

    expect(await screen.findByText('Almoço')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Novembro de 2026' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Terça, 03/11' })).toBeOnTheScreen();
    expect(screen.getByText('R$ 45,90')).toBeOnTheScreen();
    // Sem descrição, o título é o nome da categoria; o detalhe traz o cartão.
    expect(screen.getByText('Lazer')).toBeOnTheScreen();
    expect(screen.getByText('Lazer · Nubank')).toBeOnTheScreen();
    expect(bff.pedidos[0]!.get('mes')).toBe('2026-11');
    expect(bff.pedidos[0]!.has('grupo')).toBe(false);
  });

  it('pagina com "Carregar mais" e junta o mesmo dia (spec, "Paginação")', async () => {
    const bff = bffDeLista([almoco, cinema, aluguelNov]);
    server.use(bff.handler);
    await renderizar(<GastosView onNovo={jest.fn()} onAbrir={jest.fn()} mesInicial="2026-11" />);

    await screen.findByText('Almoço');
    expect(screen.queryByText('Aluguel · recorrente')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Carregar mais' }));

    expect(await screen.findByText('Aluguel · recorrente')).toBeOnTheScreen();
    expect(screen.getByText('R$ 1.500,00')).toBeOnTheScreen();
    expect(bff.pedidos.at(-1)!.get('cursor')).toBe('2');
    expect(screen.queryByRole('button', { name: 'Carregar mais' })).toBeNull();
  });

  it('filtra por grupo e por categoria (spec, "Filtro por grupo")', async () => {
    const bff = bffDeLista([almoco, cinema, aluguelNov]);
    server.use(bff.handler);
    await renderizar(<GastosView onNovo={jest.fn()} onAbrir={jest.fn()} mesInicial="2026-11" />);
    await screen.findByText('Almoço');

    await fireEvent.press(screen.getByRole('radio', { name: 'Fixo' }));
    expect(await screen.findByText('Aluguel')).toBeOnTheScreen();
    await waitFor(() => expect(screen.queryByText('Almoço')).toBeNull());
    expect(bff.pedidos.at(-1)!.get('grupo')).toBe('FIXO');

    await fireEvent.press(screen.getByRole('radio', { name: 'Todos' }));
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Categoria: Todas as categorias' }),
    );
    await fireEvent.press(screen.getByRole('radio', { name: 'Lazer' }));
    await waitFor(() => expect(bff.pedidos.at(-1)!.get('categoriaId')).toBe('lazer'));
    await waitFor(() => expect(screen.queryByText('Almoço')).toBeNull());
    expect(screen.getByText('R$ 64,00')).toBeOnTheScreen();
  });

  it('troca de mês', async () => {
    const bff = bffDeLista([almoco]);
    server.use(bff.handler);
    await renderizar(<GastosView onNovo={jest.fn()} onAbrir={jest.fn()} mesInicial="2026-11" />);
    await screen.findByText('Almoço');

    await fireEvent.press(screen.getByRole('button', { name: 'Próximo mês' }));
    expect(await screen.findByRole('header', { name: 'Dezembro de 2026' })).toBeOnTheScreen();
    await waitFor(() => expect(bff.pedidos.at(-1)!.get('mes')).toBe('2026-12'));
  });

  it('mês sem gastos mostra o estado vazio com atalho (spec, "Mês sem gastos")', async () => {
    server.use(bffDeLista([]).handler);
    const onNovo = jest.fn();
    await renderizar(<GastosView onNovo={onNovo} onAbrir={jest.fn()} mesInicial="2026-12" />);

    expect(await screen.findByText('Nenhum gasto em dezembro de 2026.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Lançar gasto' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Novo gasto' }));
    expect(onNovo).toHaveBeenCalledTimes(2);
  });

  it('abre o gasto ao tocar no item', async () => {
    server.use(bffDeLista([almoco]).handler);
    const onAbrir = jest.fn();
    await renderizar(<GastosView onNovo={jest.fn()} onAbrir={onAbrir} mesInicial="2026-11" />);
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Almoço, Alimentação, R$ 45,90' }),
    );
    expect(onAbrir).toHaveBeenCalledWith(almoco.id);
  });

  it('erro na primeira página: banner e tentar de novo', async () => {
    let falhar = true;
    server.use(
      http.get(`${BFF}/telas/gastos`, () =>
        falhar
          ? problema(500, 'erro_interno', 'Erro interno.')
          : HttpResponse.json({ mes: '2026-11', itens: [almoco], categorias }),
      ),
    );
    await renderizar(<GastosView onNovo={jest.fn()} onAbrir={jest.fn()} mesInicial="2026-11" />);
    expect(await screen.findByText('Erro interno.')).toBeOnTheScreen();
    falhar = false;
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByText('Almoço')).toBeOnTheScreen();
  });

  it('cursor inválido na página seguinte mantém a lista e oferece recarregar', async () => {
    server.use(
      http.get(`${BFF}/telas/gastos`, ({ request }) =>
        new URL(request.url).searchParams.has('cursor')
          ? problema(400, 'cursor_invalido', 'Cursor inválido.')
          : HttpResponse.json({ mes: '2026-11', itens: [almoco], categorias, nextCursor: 'c' }),
      ),
    );
    await renderizar(<GastosView onNovo={jest.fn()} onAbrir={jest.fn()} mesInicial="2026-11" />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Carregar mais' }));
    expect(await screen.findByText(/A lista mudou/)).toBeOnTheScreen();
    expect(screen.getByText('Almoço')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Recarregar lista' })).toBeOnTheScreen();
  });
});

/** BFF do formulário: guarda o corpo recebido no POST/PUT. */
function bffDoFormulario(gasto?: GastoApi) {
  const corpos: Record<string, unknown>[] = [];
  const excluidos: string[] = [];
  /** Escopo de cada PUT e DELETE, "" quando não veio. */
  const escopos: string[] = [];
  return {
    corpos,
    excluidos,
    escopos,
    handlers: [
      http.get(`${BFF}/telas/gasto-form`, ({ request }) => {
        const id = new URL(request.url).searchParams.get('id');
        if (id && id !== gasto?.id)
          return problema(404, 'gasto_nao_encontrado', 'Gasto não encontrado.');
        return HttpResponse.json({ categorias, cartoes, ...(id ? { gasto } : {}) });
      }),
      http.post(`${BFF}/gastos`, async ({ request }) => {
        const corpo = (await request.json()) as Record<string, unknown>;
        corpos.push(corpo);
        if (corpo.categoriaId === 'de-outro') {
          return problema(422, 'validacao', 'Dados do gasto inválidos.', [
            { field: 'categoriaId', message: 'categoria inexistente' },
          ]);
        }
        return HttpResponse.json(
          {
            ...almoco,
            ...corpo,
            categoria: resumo(alimentacao),
            ...(corpo.cartaoId
              ? { cartao: { id: nubank.id, apelido: 'Nubank', cor: nubank.cor } }
              : {}),
          },
          { status: 201 },
        );
      }),
      http.put(`${BFF}/gastos/:id`, async ({ request }) => {
        const corpo = (await request.json()) as Record<string, unknown>;
        corpos.push(corpo);
        escopos.push(new URL(request.url).searchParams.get('escopo') ?? '');
        return HttpResponse.json({
          ...gasto,
          ...corpo,
          id: 'novo-id',
          grupo: 'FIXO',
          categoria: resumo(aluguel),
        });
      }),
      http.delete(`${BFF}/gastos/:id`, ({ params, request }) => {
        excluidos.push(params.id as string);
        escopos.push(new URL(request.url).searchParams.get('escopo') ?? '');
        return new HttpResponse(null, { status: 204 });
      }),
    ],
  };
}

describe('GastoForm', () => {
  it('lança um gasto de cartão; o grupo vem da categoria (spec, "Gasto de cartão")', async () => {
    const bff = bffDoFormulario();
    server.use(...bff.handlers);
    const onConcluido = jest.fn();
    await renderizar(<GastoForm onConcluido={onConcluido} onVoltar={jest.fn()} />);

    const valor = await screen.findByLabelText('Valor');
    await fireEvent.changeText(valor, '4590');
    expect(valor).toHaveDisplayValue('R$ 45,90');

    await fireEvent.press(screen.getByRole('button', { name: 'Categoria: Escolha a categoria' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Alimentação' }));
    expect(screen.getAllByText('Cartão').length).toBeGreaterThan(0);
    await fireEvent.press(screen.getByRole('button', { name: 'Cartão: Escolha o cartão' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Nubank' }));

    const data = screen.getByLabelText('Data');
    await fireEvent.changeText(data, '03112026');
    expect(data).toHaveDisplayValue('03/11/2026');
    // Fecha 25, vence 5: a compra de 03/11 entra na fatura de dezembro.
    expect(screen.getByText('Entra na fatura de dez/2026')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Descrição'), '  Almoço  ');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar gasto' }));

    await waitFor(() => expect(onConcluido).toHaveBeenCalled());
    expect(bff.corpos[0]).toEqual({
      valorCentavos: 4590,
      data: '2026-11-03',
      categoriaId: 'alimentacao',
      descricao: 'Almoço',
      recorrente: false,
      cartaoId: nubank.id,
      chaveIdempotencia: expect.any(String),
    });
  });

  it('categoria de cartão exige cartão (spec, "Gasto de cartão sem cartão")', async () => {
    const bff = bffDoFormulario();
    server.use(...bff.handlers);
    await renderizar(<GastoForm onConcluido={jest.fn()} onVoltar={jest.fn()} />);

    await fireEvent.changeText(await screen.findByLabelText('Valor'), '100');
    await fireEvent.press(screen.getByRole('button', { name: 'Categoria: Escolha a categoria' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Alimentação' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar gasto' }));

    expect(await screen.findByText('Escolha o cartão.')).toBeOnTheScreen();
    expect(bff.corpos).toHaveLength(0);
  });

  it('gasto fixo pode ir para um cartão (spec, "Gasto fixo no cartão")', async () => {
    const bff = bffDoFormulario();
    server.use(...bff.handlers);
    await renderizar(<GastoForm onConcluido={jest.fn()} onVoltar={jest.fn()} />);

    await fireEvent.changeText(await screen.findByLabelText('Valor'), '3990');
    await fireEvent.press(screen.getByRole('button', { name: 'Categoria: Escolha a categoria' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Aluguel' }));
    // Em FIXO o cartão é opcional e começa em "Sem cartão".
    await fireEvent.press(
      screen.getByRole('button', { name: 'Pagar no cartão (opcional): Sem cartão' }),
    );
    await fireEvent.press(screen.getByRole('radio', { name: 'Nubank' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar gasto' }));

    await waitFor(() => expect(bff.corpos).toHaveLength(1));
    expect(bff.corpos[0]).toMatchObject({ categoriaId: 'aluguel', cartaoId: nubank.id });
  });

  it('gasto fixo recorrente, sem descrição (spec, "Gasto fixo recorrente")', async () => {
    const bff = bffDoFormulario();
    server.use(...bff.handlers);
    await renderizar(<GastoForm onConcluido={jest.fn()} onVoltar={jest.fn()} />);

    await fireEvent.changeText(await screen.findByLabelText('Valor'), '150000');
    await fireEvent.press(screen.getByRole('button', { name: 'Categoria: Escolha a categoria' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Aluguel' }));
    expect(screen.getByText('Fixo')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('radio', { name: 'Recorrente' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar gasto' }));

    await waitFor(() => expect(bff.corpos).toHaveLength(1));
    expect(bff.corpos[0]).toMatchObject({
      valorCentavos: 150000,
      categoriaId: 'aluguel',
      recorrencia: {},
    });
    expect(bff.corpos[0]).not.toHaveProperty('parcelamento');
    expect(bff.corpos[0]).not.toHaveProperty('descricao');
    expect(bff.corpos[0]).not.toHaveProperty('grupo');
  });

  it('valida no cliente antes de enviar (spec, "Valor inválido")', async () => {
    const bff = bffDoFormulario();
    server.use(...bff.handlers);
    await renderizar(<GastoForm onConcluido={jest.fn()} onVoltar={jest.fn()} />);

    await fireEvent.changeText(await screen.findByLabelText('Data'), '30022026');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar gasto' }));

    expect(await screen.findByText('Informe um valor maior que zero.')).toBeOnTheScreen();
    expect(screen.getByText('Escolha a categoria.')).toBeOnTheScreen();
    expect(screen.getByText('Informe uma data válida (DD/MM/AAAA).')).toBeOnTheScreen();
    expect(bff.corpos).toHaveLength(0);
  });

  it('erro de campo do servidor volta para o campo (spec, "Categoria de outro usuário")', async () => {
    const bff = bffDoFormulario();
    // A categoria some entre abrir o formulário e salvar. No MSW vale o
    // primeiro handler que casar, por isso a sobrescrita vem antes.
    server.use(
      http.get(`${BFF}/telas/gasto-form`, () =>
        HttpResponse.json({
          categorias: {
            ...categorias,
            FIXO: [...categorias.FIXO, { ...aluguel, id: 'de-outro', nome: 'Velha' }],
          },
          cartoes,
        }),
      ),
      ...bff.handlers,
    );
    await renderizar(<GastoForm onConcluido={jest.fn()} onVoltar={jest.fn()} />);
    await fireEvent.changeText(await screen.findByLabelText('Valor'), '100');
    await fireEvent.press(screen.getByRole('button', { name: 'Categoria: Escolha a categoria' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Velha' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar gasto' }));
    expect(await screen.findByText('categoria inexistente')).toBeOnTheScreen();
  });

  it('edita trocando de categoria e de grupo (spec, "Troca de categoria entre grupos")', async () => {
    const bff = bffDoFormulario(almoco);
    server.use(...bff.handlers);
    const onConcluido = jest.fn();
    await renderizar(<GastoForm id={almoco.id} onConcluido={onConcluido} onVoltar={jest.fn()} />);

    expect(await screen.findByRole('header', { name: 'Editar gasto' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Valor')).toHaveDisplayValue('R$ 45,90');
    expect(screen.getByLabelText('Data')).toHaveDisplayValue('03/11/2026');
    expect(screen.getByLabelText('Descrição')).toHaveDisplayValue('Almoço');

    await fireEvent.press(screen.getByRole('button', { name: 'Categoria: Alimentação' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Aluguel' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar gasto' }));

    await waitFor(() => expect(onConcluido).toHaveBeenCalled());
    expect(bff.corpos[0]).toMatchObject({
      categoriaId: 'aluguel',
      valorCentavos: 4590,
      data: '2026-11-03',
    });
  });

  it('exclui com confirmação (spec, "Exclusão confirmada")', async () => {
    const bff = bffDoFormulario(almoco);
    server.use(...bff.handlers);
    const onConcluido = jest.fn();
    await renderizar(<GastoForm id={almoco.id} onConcluido={onConcluido} onVoltar={jest.fn()} />);

    await fireEvent.press(await screen.findByRole('button', { name: 'Excluir gasto' }));
    const dialogo = screen.getByRole('alert');
    expect(within(dialogo).getByText('Excluir gasto?')).toBeOnTheScreen();
    await fireEvent.press(within(dialogo).getByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(onConcluido).toHaveBeenCalled());
    expect(bff.excluidos).toEqual([almoco.id]);
  });

  it('cancelar a exclusão não exclui', async () => {
    const bff = bffDoFormulario(almoco);
    server.use(...bff.handlers);
    await renderizar(<GastoForm id={almoco.id} onConcluido={jest.fn()} onVoltar={jest.fn()} />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Excluir gasto' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    expect(bff.excluidos).toHaveLength(0);
  });

  it('gasto de outro usuário ou já excluído: 404 vira mensagem (spec, "Acesso a gasto alheio")', async () => {
    server.use(...bffDoFormulario().handlers);
    await renderizar(<GastoForm id="nao-existe" onConcluido={jest.fn()} onVoltar={jest.fn()} />);
    expect(await screen.findByText('Este gasto não existe mais.')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Salvar gasto' })).toBeNull();
  });

  it('novo gasto não tem excluir e começa com a data de hoje', async () => {
    server.use(...bffDoFormulario().handlers);
    await renderizar(<GastoForm onConcluido={jest.fn()} onVoltar={jest.fn()} />);
    expect(await screen.findByRole('header', { name: 'Novo gasto' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Excluir gasto' })).toBeNull();
    expect(screen.getByLabelText('Data').props.value).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });
});

// Spec parcelamentos-recorrencias no app.
const geladeira2: GastoApi = {
  id: '202701-20261210-01JC8Z6Q3N4W5X6Y7Z8A9B0C2A',
  valorCentavos: 40000,
  data: '2026-12-10',
  mesReferencia: '2027-01',
  grupo: 'CARTAO',
  categoria: resumo(alimentacao),
  cartao: { id: nubank.id, apelido: nubank.apelido, cor: nubank.cor },
  descricao: 'Geladeira',
  recorrente: false,
  serie: { id: 'S1', tipo: 'PARCELAMENTO', numero: 2, total: 3 },
};
const luzDez: GastoApi = {
  id: '202612-20261205-01JC8Z6Q3N4W5X6Y7Z8A9B0C2B',
  valorCentavos: 20000,
  data: '2026-12-05',
  mesReferencia: '2026-12',
  grupo: 'FIXO',
  categoria: resumo(aluguel),
  descricao: 'Luz',
  recorrente: true,
  serie: { id: 'S2', tipo: 'RECORRENCIA', numero: 2 },
};

async function preencherCompra(valor: string, rotulo = 'Valor') {
  await fireEvent.changeText(await screen.findByLabelText(rotulo), valor);
  await fireEvent.press(screen.getByRole('button', { name: 'Categoria: Escolha a categoria' }));
  await fireEvent.press(screen.getByRole('radio', { name: 'Alimentação' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Cartão: Escolha o cartão' }));
  await fireEvent.press(screen.getByRole('radio', { name: 'Nubank' }));
  await fireEvent.changeText(screen.getByLabelText('Data'), '10112026');
}

describe('Parcelamentos e recorrências', () => {
  it('parcelado pelo total, com prévia (spec, "Divisão exata")', async () => {
    const bff = bffDoFormulario();
    server.use(...bff.handlers);
    await renderizar(<GastoForm onConcluido={jest.fn()} onVoltar={jest.fn()} />);

    await fireEvent.press(await screen.findByRole('radio', { name: 'Parcelado' }));
    expect(screen.getByLabelText('Valor total')).toBeOnTheScreen();
    await preencherCompra('120000', 'Valor total');
    await fireEvent.changeText(screen.getByLabelText('Parcelas'), '3');
    expect(screen.getByTestId('previa-parcelas')).toHaveTextContent(
      '3× de R$ 400,00 · dez/2026 a fev/2027',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar gasto' }));

    await waitFor(() => expect(bff.corpos).toHaveLength(1));
    expect(bff.corpos[0]).toMatchObject({
      valorCentavos: 120000,
      parcelamento: { modo: 'TOTAL', parcelas: 3 },
      chaveIdempotencia: expect.any(String),
    });
  });

  it('prévia com resto na 1ª parcela (spec, "Divisão com resto")', async () => {
    server.use(...bffDoFormulario().handlers);
    await renderizar(<GastoForm onConcluido={jest.fn()} onVoltar={jest.fn()} />);
    await fireEvent.press(await screen.findByRole('radio', { name: 'Parcelado' }));
    await preencherCompra('10000', 'Valor total');
    await fireEvent.changeText(screen.getByLabelText('Parcelas'), '3');
    expect(screen.getByTestId('previa-parcelas')).toHaveTextContent(
      '1ª de R$ 33,34 e 2× de R$ 33,33 · dez/2026 a fev/2027',
    );
  });

  it('parcelado em andamento pela parcela (spec, "Compra em andamento")', async () => {
    const bff = bffDoFormulario();
    server.use(...bff.handlers);
    await renderizar(<GastoForm onConcluido={jest.fn()} onVoltar={jest.fn()} />);

    await fireEvent.press(await screen.findByRole('radio', { name: 'Parcelado' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Pela parcela' }));
    await preencherCompra('19990', 'Valor da parcela');
    await fireEvent.changeText(screen.getByLabelText('Parcela atual'), '3');
    await fireEvent.changeText(screen.getByLabelText('Total de parcelas'), '10');
    expect(screen.getByTestId('previa-parcelas')).toHaveTextContent(
      '8× de R$ 199,90 · dez/2026 a jul/2027',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar gasto' }));
    await waitFor(() => expect(bff.corpos).toHaveLength(1));
    expect(bff.corpos[0]).toMatchObject({
      valorCentavos: 19990,
      parcelamento: { modo: 'PARCELA', parcelaAtual: 3, parcelas: 10 },
    });
  });

  it('parcela atual maior que o total é recusada no cliente', async () => {
    const bff = bffDoFormulario();
    server.use(...bff.handlers);
    await renderizar(<GastoForm onConcluido={jest.fn()} onVoltar={jest.fn()} />);
    await fireEvent.press(await screen.findByRole('radio', { name: 'Parcelado' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Pela parcela' }));
    await preencherCompra('100', 'Valor da parcela');
    await fireEvent.changeText(screen.getByLabelText('Parcela atual'), '11');
    await fireEvent.changeText(screen.getByLabelText('Total de parcelas'), '10');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar gasto' }));
    expect(await screen.findByText('A parcela atual não pode passar do total.')).toBeOnTheScreen();
    expect(bff.corpos).toHaveLength(0);
  });

  it('recorrente com mês final', async () => {
    const bff = bffDoFormulario();
    server.use(...bff.handlers);
    await renderizar(<GastoForm onConcluido={jest.fn()} onVoltar={jest.fn()} />);
    await fireEvent.press(await screen.findByRole('radio', { name: 'Recorrente' }));
    await preencherCompra('5590');
    await fireEvent.changeText(screen.getByLabelText('Mês final (opcional)'), '032027');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar gasto' }));
    await waitFor(() => expect(bff.corpos).toHaveLength(1));
    expect(bff.corpos[0]).toMatchObject({ recorrencia: { mesFinal: '2027-03' } });
  });

  it('editar parcela pede o alcance e envia o escolhido (spec, "Editar item de série")', async () => {
    const bff = bffDoFormulario(geladeira2);
    server.use(...bff.handlers);
    const onConcluido = jest.fn();
    await renderizar(
      <GastoForm id={geladeira2.id} onConcluido={onConcluido} onVoltar={jest.fn()} />,
    );

    expect(await screen.findByText('Parcela 2/3')).toBeOnTheScreen();
    // Na edição não se escolhe à vista/parcelado/recorrente.
    expect(screen.queryByRole('radio', { name: 'Parcelado' })).toBeNull();
    await fireEvent.changeText(screen.getByLabelText('Descrição'), 'Geladeira nova');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar gasto' }));
    expect(await screen.findByText('Alterar quais gastos?')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Esta e as próximas' }));

    await waitFor(() => expect(onConcluido).toHaveBeenCalled());
    expect(bff.escopos).toEqual(['PROXIMAS']);
    expect(bff.corpos[0]).toMatchObject({ descricao: 'Geladeira nova' });
    expect(bff.corpos[0]).not.toHaveProperty('parcelamento');
  });

  it('excluir ocorrência recorrente pede o alcance (spec, "Excluir item de série")', async () => {
    const bff = bffDoFormulario(luzDez);
    server.use(...bff.handlers);
    const onConcluido = jest.fn();
    await renderizar(<GastoForm id={luzDez.id} onConcluido={onConcluido} onVoltar={jest.fn()} />);

    await fireEvent.press(await screen.findByRole('button', { name: 'Excluir gasto' }));
    expect(screen.getByText('Excluir quais gastos?')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Só esta' }));

    await waitFor(() => expect(onConcluido).toHaveBeenCalled());
    expect(bff.excluidos).toEqual([luzDez.id]);
    expect(bff.escopos).toEqual(['ESTA']);
  });

  it('cancelar o alcance não salva', async () => {
    const bff = bffDoFormulario(luzDez);
    server.use(...bff.handlers);
    await renderizar(<GastoForm id={luzDez.id} onConcluido={jest.fn()} onVoltar={jest.fn()} />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Salvar gasto' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    expect(bff.corpos).toHaveLength(0);
  });

  it('a lista mostra "2/3" e "Recorrente" (spec, "Identificação da parcela")', async () => {
    server.use(bffDeLista([geladeira2, { ...luzDez, mesReferencia: '2027-01' }]).handler);
    await renderizar(<GastosView onNovo={jest.fn()} onAbrir={jest.fn()} mesInicial="2027-01" />);
    expect(await screen.findByText('2/3')).toBeOnTheScreen();
    expect(screen.getByText('Recorrente')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /^Geladeira 2\/3, / })).toBeOnTheScreen();
  });
});

describe('GastosView por cartão', () => {
  it('filtra por cartão e mostra o cartão no item (spec, "Filtro por cartão")', async () => {
    const bff = bffDeLista([almoco, cinema, aluguelNov]);
    server.use(bff.handler);
    await renderizar(<GastosView onNovo={jest.fn()} onAbrir={jest.fn()} mesInicial="2026-11" />);

    await screen.findByText('Almoço');
    expect(screen.getByText('Lazer · Nubank')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Cartão: Todos os cartões' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Nubank' }));
    await waitFor(() => expect(bff.pedidos.at(-1)!.get('cartaoId')).toBe(nubank.id));
    await waitFor(() => expect(screen.queryByText('Almoço')).toBeNull());
    expect(screen.getByText('Lazer · Nubank')).toBeOnTheScreen();
  });

  it('"Sem cartão" e o cartão vindo da aba Cartões (spec, "Detalhe do cartão")', async () => {
    const bff = bffDeLista([almoco, cinema, aluguelNov]);
    server.use(bff.handler);
    await renderizar(
      <GastosView
        onNovo={jest.fn()}
        onAbrir={jest.fn()}
        mesInicial="2026-11"
        cartaoInicial={nubank.id}
      />,
    );
    expect(await screen.findByText('Lazer · Nubank')).toBeOnTheScreen();
    expect(bff.pedidos[0]!.get('cartaoId')).toBe(nubank.id);

    await fireEvent.press(screen.getByRole('button', { name: 'Cartão: Nubank' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Sem cartão' }));
    await waitFor(() => expect(bff.pedidos.at(-1)!.get('cartaoId')).toBe('SEM_CARTAO'));
    expect(await screen.findByText('Almoço')).toBeOnTheScreen();
  });
});
