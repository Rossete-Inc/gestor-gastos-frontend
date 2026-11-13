import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';
import { StyleSheet } from 'react-native';

import { configurarAutenticacao } from '@/shared/api';

import { BFF, usarServidor } from '../../../../test/msw';
import { renderizar } from '../../../../test/render';
import { CategoriaForm } from './CategoriaForm';
import { CategoriasView } from './CategoriasView';

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
const pet = { id: 'c-1', nome: 'Pet', grupo: 'CARTAO', cor: '#22C55E', padrao: false };
const aluguel = { id: 'aluguel', nome: 'Aluguel', grupo: 'FIXO', cor: '#0EA5E9', padrao: true };

/** BFF com uma lista em memória, para ver a lista mudar depois da mutação. */
function bffDeCategorias(inicial: (typeof pet)[]) {
  let lista = [...inicial];
  const porGrupo = () => ({
    CARTAO: lista.filter((c) => c.grupo === 'CARTAO'),
    FIXO: lista.filter((c) => c.grupo === 'FIXO'),
  });
  return {
    handlers: [
      http.get(`${BFF}/categorias`, () => HttpResponse.json(porGrupo())),
      http.delete(`${BFF}/categorias/:id`, ({ params }) => {
        lista = lista.filter((c) => c.id !== params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    ],
    lista: () => lista,
  };
}

beforeEach(() =>
  configurarAutenticacao({
    obterToken: async () => 'access-1',
    renovarSessao: async () => false,
    aoExpirar: () => {},
  }),
);
afterEach(() => configurarAutenticacao(null));

describe('CategoriasView', () => {
  it('lista padrão e personalizadas por grupo (spec, "Usuário novo" e "Criar categoria")', async () => {
    server.use(...bffDeCategorias([alimentacao, pet, aluguel]).handlers);
    await renderizar(<CategoriasView onNova={jest.fn()} />);

    expect(await screen.findByText('Alimentação')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Cartão' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Fixo' })).toBeOnTheScreen();
    expect(screen.getByText('Pet')).toBeOnTheScreen();
    expect(screen.getByText('Aluguel')).toBeOnTheScreen();
    // Só a personalizada tem o botão de excluir; as padrão mostram o selo.
    expect(screen.getAllByText('Padrão')).toHaveLength(2);
    expect(screen.getAllByText('Personalizada')).toHaveLength(1);
    // O selo fica no meio da altura da linha, não grudado no topo.
    for (const selo of screen.getAllByText('Padrão')) {
      let container = selo.parent;
      while (container && !StyleSheet.flatten(container.props.style)?.alignSelf) {
        container = container.parent;
      }
      expect(StyleSheet.flatten(container?.props.style)?.alignSelf).toBe('center');
    }
    expect(screen.getByRole('button', { name: 'Excluir Pet' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Excluir Alimentação' })).toBeNull();
  });

  it('grupo sem categorias mostra o estado vazio', async () => {
    server.use(...bffDeCategorias([alimentacao]).handlers);
    await renderizar(<CategoriasView onNova={jest.fn()} />);
    expect(await screen.findByText('Nenhuma categoria neste grupo.')).toBeOnTheScreen();
  });

  it('mostra o carregamento enquanto busca', async () => {
    server.use(...bffDeCategorias([alimentacao]).handlers);
    await renderizar(<CategoriasView onNova={jest.fn()} />);
    expect(screen.getByRole('progressbar', { name: 'Carregando categorias…' })).toBeOnTheScreen();
    expect(await screen.findByText('Alimentação')).toBeOnTheScreen();
  });

  it('"Nova categoria" chama a navegação', async () => {
    const onNova = jest.fn();
    server.use(...bffDeCategorias([alimentacao]).handlers);
    await renderizar(<CategoriasView onNova={onNova} />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Nova categoria' }));
    expect(onNova).toHaveBeenCalledTimes(1);
  });

  it('exclui a personalizada depois de confirmar (spec, "Categoria sem gastos")', async () => {
    const bff = bffDeCategorias([alimentacao, pet]);
    server.use(...bff.handlers);
    await renderizar(<CategoriasView onNova={jest.fn()} />);

    await fireEvent.press(await screen.findByRole('button', { name: 'Excluir Pet' }));
    const dialogo = screen.getByRole('alert');
    expect(within(dialogo).getByText('Excluir categoria?')).toBeOnTheScreen();
    await fireEvent.press(within(dialogo).getByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(screen.queryByText('Pet')).toBeNull());
    expect(bff.lista().map((c) => c.id)).toEqual(['alimentacao']);
  });

  it('cancelar a confirmação não exclui', async () => {
    const bff = bffDeCategorias([alimentacao, pet]);
    server.use(...bff.handlers);
    await renderizar(<CategoriasView onNova={jest.fn()} />);

    await fireEvent.press(await screen.findByRole('button', { name: 'Excluir Pet' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByText('Excluir categoria?')).toBeNull();
    expect(screen.getByText('Pet')).toBeOnTheScreen();
    expect(bff.lista()).toHaveLength(2);
  });

  it('categoria com gastos: recusa e avisa (spec, "Categoria com gastos")', async () => {
    // O primeiro handler que casa vence: o 409 vem antes do DELETE em memória.
    server.use(
      http.delete(`${BFF}/categorias/:id`, () =>
        problema(409, 'categoria_em_uso', 'Há gastos vinculados à categoria.'),
      ),
      ...bffDeCategorias([alimentacao, pet]).handlers,
    );
    await renderizar(<CategoriasView onNova={jest.fn()} />);

    await fireEvent.press(await screen.findByRole('button', { name: 'Excluir Pet' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Excluir' }));

    expect(
      await screen.findByText('Esta categoria tem gastos vinculados e não pode ser excluída.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Pet')).toBeOnTheScreen();
  });

  it('erro ao carregar permite tentar de novo', async () => {
    let chamadas = 0;
    server.use(
      http.get(`${BFF}/categorias`, () => {
        chamadas++;
        return chamadas === 1
          ? problema(500, 'erro_interno', 'Erro interno. Tente novamente.')
          : HttpResponse.json({ CARTAO: [alimentacao], FIXO: [] });
      }),
    );
    await renderizar(<CategoriasView onNova={jest.fn()} />);

    expect(await screen.findByText('Erro interno. Tente novamente.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByText('Alimentação')).toBeOnTheScreen();
  });

  it('resposta fora do contrato é tratada como erro', async () => {
    server.use(http.get(`${BFF}/categorias`, () => HttpResponse.json({ CARTAO: [{ id: 1 }] })));
    await renderizar(<CategoriasView onNova={jest.fn()} />);
    expect(await screen.findByText('Não foi possível carregar as categorias.')).toBeOnTheScreen();
  });
});

describe('CategoriaForm', () => {
  const preencherNome = async (nome: string) =>
    fireEvent.changeText(screen.getByLabelText('Nome'), nome);

  it('oferece a paleta por família e mostra o tom escolhido', async () => {
    await renderizar(<CategoriaForm onCriada={jest.fn()} onVoltar={jest.fn()} />);

    expect(screen.getAllByRole('radio', { name: / (claro|médio|escuro)$/ })).toHaveLength(39);
    expect(screen.getByText('Selecionada: Laranja médio')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('radio', { name: 'Roxo escuro' }));
    expect(screen.getByRole('radio', { name: 'Roxo escuro' })).toBeChecked();
    expect(screen.getByText('Selecionada: Roxo escuro')).toBeOnTheScreen();
  });

  it('cria com nome, grupo e cor escolhidos', async () => {
    let corpo: unknown;
    server.use(
      http.post(`${BFF}/categorias`, async ({ request }) => {
        corpo = await request.json();
        return HttpResponse.json(
          { id: 'c-2', padrao: false, ...(corpo as object) },
          { status: 201 },
        );
      }),
    );
    const onCriada = jest.fn();
    await renderizar(<CategoriaForm onCriada={onCriada} onVoltar={jest.fn()} />);

    await preencherNome('  Pet  ');
    await fireEvent.press(screen.getByRole('radio', { name: 'Fixo' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Azul médio' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Criar categoria' }));

    await waitFor(() => expect(onCriada).toHaveBeenCalledTimes(1));
    expect(corpo).toEqual({ nome: 'Pet', grupo: 'FIXO', cor: '#3B82F6' });
  });

  it('grupo inicial vem marcado', async () => {
    await renderizar(
      <CategoriaForm onCriada={jest.fn()} onVoltar={jest.fn()} grupoInicial="FIXO" />,
    );
    expect(screen.getByRole('radio', { name: 'Fixo' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Cartão' })).not.toBeChecked();
  });

  it('nome vazio não chama o BFF', async () => {
    const post = jest.fn();
    server.use(http.post(`${BFF}/categorias`, post));
    await renderizar(<CategoriaForm onCriada={jest.fn()} onVoltar={jest.fn()} />);

    await preencherNome('   ');
    await fireEvent.press(screen.getByRole('button', { name: 'Criar categoria' }));

    expect(await screen.findByText('Informe o nome.')).toBeOnTheScreen();
    expect(post).not.toHaveBeenCalled();
  });

  it('nome duplicado no grupo aparece no campo (spec, "Nome duplicado no grupo")', async () => {
    server.use(
      http.post(`${BFF}/categorias`, () =>
        problema(409, 'categoria_duplicada', 'Já existe uma categoria com este nome no grupo.'),
      ),
    );
    const onCriada = jest.fn();
    await renderizar(<CategoriaForm onCriada={onCriada} onVoltar={jest.fn()} />);

    await preencherNome('alimentação');
    await fireEvent.press(screen.getByRole('button', { name: 'Criar categoria' }));

    expect(
      await screen.findByText('Já existe uma categoria com esse nome neste grupo.'),
    ).toBeOnTheScreen();
    expect(onCriada).not.toHaveBeenCalled();
  });

  it('422 do servidor volta para os campos', async () => {
    server.use(
      http.post(`${BFF}/categorias`, () =>
        problema(422, 'validacao', 'Dados da categoria inválidos.', [
          { field: 'nome', message: 'contém caracteres inválidos' },
        ]),
      ),
    );
    await renderizar(<CategoriaForm onCriada={jest.fn()} onVoltar={jest.fn()} />);

    await preencherNome('Pet');
    await fireEvent.press(screen.getByRole('button', { name: 'Criar categoria' }));

    expect(await screen.findByText('contém caracteres inválidos')).toBeOnTheScreen();
  });

  it('sem conexão mostra o aviso de offline', async () => {
    server.use(http.post(`${BFF}/categorias`, () => HttpResponse.error()));
    await renderizar(<CategoriaForm onCriada={jest.fn()} onVoltar={jest.fn()} />);

    await preencherNome('Pet');
    await fireEvent.press(screen.getByRole('button', { name: 'Criar categoria' }));

    expect(await screen.findByText('Sem conexão com o servidor. Tente de novo.')).toBeOnTheScreen();
  });
});
