import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';
import { Text } from 'react-native';

import { configurarAutenticacao } from '@/shared/api';

import { BFF, meQueAceita, perfilAna, usarServidor } from '../../../../test/msw';
import { renderizar } from '../../../../test/render';
import { acoesPara, type Usuario } from '../model/usuario';
import { SomenteAdmin } from './SomenteAdmin';
import { UsuariosView } from './UsuariosView';

const server = usarServidor();

const problema = (status: number, code: string, detail = 'detalhe do servidor') =>
  HttpResponse.json(
    { type: `urn:gestor-gastos:problem:${code}`, title: 't', status, code, detail },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );

// Ana é a admin logada; Bia e Caio são clientes.
const ana: Usuario = { ...perfilAna, papel: 'admin' } as Usuario;
const bia: Usuario = {
  id: 'u-2',
  email: 'bia@x.com',
  nome: 'Bia Lima',
  papel: 'cliente',
  status: 'ATIVO',
  criadoEm: '2026-11-10T09:00:00.000Z',
};
const caio: Usuario = { ...bia, id: 'u-3', email: 'caio@x.com', nome: 'Caio Reis' };

/** BFF com os usuários em memória, para ver a lista mudar depois das ações. */
function bffDeUsuarios(inicial: Usuario[], porPagina = 20) {
  let lista = inicial.map((u) => ({ ...u }));
  const patches: object[] = [];
  return {
    handlers: [
      meQueAceita('access-1', ana),
      http.get(`${BFF}/admin/telas/usuarios`, ({ request }) => {
        const inicio = Number(new URL(request.url).searchParams.get('cursor') ?? 0);
        const itens = lista.slice(inicio, inicio + porPagina);
        const prox = inicio + porPagina;
        return HttpResponse.json({
          itens,
          ...(prox < lista.length ? { nextCursor: String(prox) } : {}),
        });
      }),
      http.patch(`${BFF}/admin/usuarios/:id`, async ({ params, request }) => {
        const patch = (await request.json()) as Partial<Usuario>;
        patches.push(patch);
        const u = lista.find((x) => x.id === params.id);
        if (!u) return problema(404, 'usuario_nao_encontrado');
        Object.assign(u, patch);
        return HttpResponse.json(u);
      }),
      http.delete(`${BFF}/admin/usuarios/:id`, ({ params }) => {
        lista = lista.filter((x) => x.id !== params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    ],
    patches,
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

const linha = (nome: string) => screen.getByRole('button', { name: new RegExp(`^${nome}`) });

describe('UsuariosView', () => {
  it('lista os usuários com papel e status (spec, "Admin lista usuários")', async () => {
    server.use(...bffDeUsuarios([bia, ana]).handlers);
    await renderizar(<UsuariosView />);

    expect(await screen.findByText('Bia Lima')).toBeOnTheScreen();
    expect(await screen.findByText('Ana Souza (você)')).toBeOnTheScreen();
    expect(screen.getByText('bia@x.com')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Bia Lima, bia@x.com, Cliente, Ativo' }),
    ).toBeOnTheScreen();
    expect(screen.getByText('Admin')).toBeOnTheScreen();
    expect(screen.getByText('BL')).toBeOnTheScreen();
  });

  it('carrega as páginas seguintes', async () => {
    server.use(...bffDeUsuarios([ana, bia, caio], 2).handlers);
    await renderizar(<UsuariosView />);

    expect(await screen.findByText('Bia Lima')).toBeOnTheScreen();
    expect(screen.queryByText('Caio Reis')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Carregar mais' }));
    expect(await screen.findByText('Caio Reis')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Carregar mais' })).toBeNull();
  });

  it('bloqueia e reativa com confirmação (spec, "Admin bloqueia usuário")', async () => {
    const bff = bffDeUsuarios([ana, bia]);
    server.use(...bff.handlers);
    await renderizar(<UsuariosView />);

    await fireEvent.press(await screen.findByText('Bia Lima'));
    await fireEvent.press(screen.getByRole('button', { name: 'Bloquear' }));
    expect(screen.getByText('Bloquear Bia Lima?')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Bloquear' }));

    expect(await screen.findByText('Bloqueado')).toBeOnTheScreen();
    expect(bff.patches).toEqual([{ status: 'BLOQUEADO' }]);
    expect(screen.getByText('Bia Lima: bloquear feito.')).toBeOnTheScreen();

    await fireEvent.press(linha('Bia Lima'));
    await fireEvent.press(screen.getByRole('button', { name: 'Reativar' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Reativar' }));
    await waitFor(() =>
      expect(bff.patches).toEqual([{ status: 'BLOQUEADO' }, { status: 'ATIVO' }]),
    );
    expect(await screen.findAllByText('Ativo')).toHaveLength(2);
  });

  it('promove a admin (spec, "Promover a admin")', async () => {
    const bff = bffDeUsuarios([ana, bia]);
    server.use(...bff.handlers);
    await renderizar(<UsuariosView />);

    await fireEvent.press(await screen.findByText('Bia Lima'));
    await fireEvent.press(screen.getByRole('button', { name: 'Tornar admin' }));
    expect(screen.getByText(/a partir do próximo login/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Tornar admin' }));

    await waitFor(() => expect(bff.patches).toEqual([{ papel: 'admin' }]));
    await waitFor(() => expect(screen.getAllByText('Admin')).toHaveLength(2));
  });

  it('exclui com confirmação (spec, "Admin exclui usuário")', async () => {
    server.use(...bffDeUsuarios([ana, bia]).handlers);
    await renderizar(<UsuariosView />);

    await fireEvent.press(await screen.findByText('Bia Lima'));
    await fireEvent.press(screen.getByRole('button', { name: 'Excluir conta' }));
    expect(screen.getByText(/Não dá para desfazer/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Excluir' }));

    expect(await screen.findByText('A conta de Bia Lima foi excluída.')).toBeOnTheScreen();
    await waitFor(() => expect(screen.queryByText('Bia Lima')).toBeNull());
  });

  it('não oferece bloquear nem excluir a própria conta (spec, "Admin tenta bloquear a si mesmo")', async () => {
    server.use(...bffDeUsuarios([ana, bia]).handlers);
    await renderizar(<UsuariosView />);

    await fireEvent.press(await screen.findByText('Ana Souza (você)'));
    expect(screen.getByRole('button', { name: 'Tornar cliente' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Bloquear' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Excluir conta' })).toBeNull();
  });

  it('mostra a recusa do último admin (spec, "Último admin")', async () => {
    server.use(
      // O primeiro handler que casa vence: o erro vem antes do BFF em memória.
      http.patch(`${BFF}/admin/usuarios/:id`, () => problema(409, 'ultimo_admin')),
      ...bffDeUsuarios([ana]).handlers,
    );
    await renderizar(<UsuariosView />);

    await fireEvent.press(await screen.findByText('Ana Souza (você)'));
    await fireEvent.press(screen.getByRole('button', { name: 'Tornar cliente' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Tornar cliente' }));

    expect(await screen.findByText(/pelo menos um administrador ativo/)).toBeOnTheScreen();
    expect(screen.getByText('Admin')).toBeOnTheScreen();
  });

  it('cancelar a confirmação não muda nada', async () => {
    const bff = bffDeUsuarios([ana, bia]);
    server.use(...bff.handlers);
    await renderizar(<UsuariosView />);

    await fireEvent.press(await screen.findByText('Bia Lima'));
    await fireEvent.press(screen.getByRole('button', { name: 'Bloquear' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByText('Bloquear Bia Lima?')).toBeNull();
    expect(bff.patches).toEqual([]);
  });

  it('explica o 403 de quem acabou de virar admin (spec, "Cliente tenta acessar área admin")', async () => {
    server.use(
      meQueAceita('access-1', ana),
      http.get(`${BFF}/admin/telas/usuarios`, () => problema(403, 'somente_admin')),
    );
    await renderizar(<UsuariosView />);

    expect(await screen.findByText(/vale a partir do próximo login/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeOnTheScreen();
  });

  it('avisa quando a ação ainda não existe no ambiente', async () => {
    server.use(
      http.delete(`${BFF}/admin/usuarios/:id`, () => problema(400, 'operacao_desconhecida')),
      ...bffDeUsuarios([ana, bia]).handlers,
    );
    await renderizar(<UsuariosView />);

    await fireEvent.press(await screen.findByText('Bia Lima'));
    await fireEvent.press(screen.getByRole('button', { name: 'Excluir conta' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Excluir' }));
    expect(await screen.findByText(/ainda não está disponível/)).toBeOnTheScreen();
  });
});

describe('SomenteAdmin', () => {
  const area = (
    <SomenteAdmin semAcesso={<Text>sem acesso</Text>}>
      <Text>área admin</Text>
    </SomenteAdmin>
  );

  it('cliente não vê a área (spec, "Navegação por papel")', async () => {
    server.use(meQueAceita('access-1'));
    await renderizar(area);
    expect(await screen.findByText('sem acesso')).toBeOnTheScreen();
    expect(screen.queryByText('área admin')).toBeNull();
  });

  it('admin vê a área', async () => {
    server.use(meQueAceita('access-1', ana));
    await renderizar(area);
    expect(await screen.findByText('área admin')).toBeOnTheScreen();
  });
});

describe('acoesPara', () => {
  const nomes = (u: Usuario, eu = 'u-1') => acoesPara(u, eu).map((a) => a.tipo);

  it('segue o ciclo de vida da conta', () => {
    expect(nomes(bia)).toEqual(['bloquear', 'tornarAdmin', 'excluir']);
    expect(nomes({ ...bia, status: 'BLOQUEADO' })).toEqual(['reativar', 'tornarAdmin', 'excluir']);
    expect(nomes({ ...bia, status: 'EXCLUIDO' })).toEqual([]);
    expect(nomes({ ...bia, status: 'PENDENTE_CONFIRMACAO' })).toEqual([]);
    expect(nomes(ana)).toEqual(['tornarCliente']);
  });
});

// O nome da linha usa o mesmo texto do botão: o within confirma que o selo
// fica dentro da linha da pessoa.
it('o selo de status fica na linha da pessoa', async () => {
  server.use(...bffDeUsuarios([ana, { ...bia, status: 'BLOQUEADO' }]).handlers);
  await renderizar(<UsuariosView />);
  await screen.findByText('Bia Lima');
  expect(within(linha('Bia Lima')).getByText('Bloqueado')).toBeOnTheScreen();
});
