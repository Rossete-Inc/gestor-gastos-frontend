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

type GastoApi = {
  id: string;
  valorCentavos: number;
  data: string;
  grupo: 'CARTAO' | 'FIXO';
  categoria: { id: string; nome: string; cor: string };
  descricao?: string;
  recorrente: boolean;
};

const almoco: GastoApi = {
  id: '20261103-01JC8Z6Q3N4W5X6Y7Z8A9B0C1D',
  valorCentavos: 4590,
  data: '2026-11-03',
  grupo: 'CARTAO',
  categoria: resumo(alimentacao),
  descricao: 'Almoço',
  recorrente: false,
};
const cinema: GastoApi = {
  id: '20261103-01JC8Z6Q3N4W5X6Y7Z8A9B0C1E',
  valorCentavos: 6400,
  data: '2026-11-03',
  grupo: 'CARTAO',
  categoria: resumo(lazer),
  recorrente: false,
};
const aluguelNov: GastoApi = {
  id: '20261101-01JC8Z6Q3N4W5X6Y7Z8A9B0C1F',
  valorCentavos: 150000,
  data: '2026-11-01',
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
          g.data.startsWith(q.get('mes')!) &&
          (!q.get('grupo') || g.grupo === q.get('grupo')) &&
          (!q.get('categoriaId') || g.categoria.id === q.get('categoriaId')),
      );
      const inicio = Number(q.get('cursor') ?? '0');
      const pagina = filtrados.slice(inicio, inicio + 2);
      const proximo = inicio + 2 < filtrados.length ? String(inicio + 2) : undefined;
      return HttpResponse.json({
        mes: q.get('mes'),
        itens: pagina,
        categorias,
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
    // Sem descrição, o título é o nome da categoria (e o detalhe também).
    expect(screen.getAllByText('Lazer')).toHaveLength(2);
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
  return {
    corpos,
    excluidos,
    handlers: [
      http.get(`${BFF}/telas/gasto-form`, ({ request }) => {
        const id = new URL(request.url).searchParams.get('id');
        if (id && id !== gasto?.id)
          return problema(404, 'gasto_nao_encontrado', 'Gasto não encontrado.');
        return HttpResponse.json({ categorias, ...(id ? { gasto } : {}) });
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
          { ...almoco, ...corpo, categoria: resumo(alimentacao) },
          { status: 201 },
        );
      }),
      http.put(`${BFF}/gastos/:id`, async ({ request }) => {
        const corpo = (await request.json()) as Record<string, unknown>;
        corpos.push(corpo);
        return HttpResponse.json({
          ...gasto,
          ...corpo,
          id: 'novo-id',
          grupo: 'FIXO',
          categoria: resumo(aluguel),
        });
      }),
      http.delete(`${BFF}/gastos/:id`, ({ params }) => {
        excluidos.push(params.id as string);
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
    expect(screen.getByText('Cartão')).toBeOnTheScreen();

    const data = screen.getByLabelText('Data');
    await fireEvent.changeText(data, '03112026');
    expect(data).toHaveDisplayValue('03/11/2026');
    await fireEvent.changeText(screen.getByLabelText('Descrição'), '  Almoço  ');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar gasto' }));

    await waitFor(() => expect(onConcluido).toHaveBeenCalled());
    expect(bff.corpos[0]).toEqual({
      valorCentavos: 4590,
      data: '2026-11-03',
      categoriaId: 'alimentacao',
      descricao: 'Almoço',
      recorrente: false,
    });
  });

  it('gasto fixo recorrente, sem descrição (spec, "Gasto fixo recorrente")', async () => {
    const bff = bffDoFormulario();
    server.use(...bff.handlers);
    await renderizar(<GastoForm onConcluido={jest.fn()} onVoltar={jest.fn()} />);

    await fireEvent.changeText(await screen.findByLabelText('Valor'), '150000');
    await fireEvent.press(screen.getByRole('button', { name: 'Categoria: Escolha a categoria' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Aluguel' }));
    expect(screen.getByText('Fixo')).toBeOnTheScreen();
    await fireEvent(screen.getByLabelText('Gasto recorrente'), 'valueChange', true);
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar gasto' }));

    await waitFor(() => expect(bff.corpos).toHaveLength(1));
    expect(bff.corpos[0]).toMatchObject({
      valorCentavos: 150000,
      categoriaId: 'aluguel',
      recorrente: true,
    });
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
            CARTAO: [...categorias.CARTAO, { ...lazer, id: 'de-outro', nome: 'Velha' }],
          },
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
