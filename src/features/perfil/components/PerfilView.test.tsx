import { fireEvent, screen } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';

import { configurarAutenticacao } from '@/shared/api';

import { BFF, meQueAceita, perfilAna, usarServidor } from '../../../../test/msw';
import { renderizar } from '../../../../test/render';
import { PerfilView } from './PerfilView';

const server = usarServidor();

// A feature perfil só conhece a API pública de auth: o logout é um mock de
// useSair, e o token vem direto do client HTTP (shared/api).
const mockSair = jest.fn();
const mockCategorias = jest.fn();
const mockUsuarios = jest.fn();
jest.mock('@/features/auth', () => ({ useSair: () => ({ mutate: mockSair }) }));

beforeEach(() => {
  mockSair.mockClear();
  configurarAutenticacao({
    obterToken: async () => 'access-1',
    renovarSessao: async () => false,
    aoExpirar: () => {},
  });
});

afterEach(() => configurarAutenticacao(null));

it('mostra nome, e-mail, papel e data de criação (spec, "Ver perfil")', async () => {
  server.use(meQueAceita('access-1'));
  await renderizar(<PerfilView onCategorias={mockCategorias} onUsuarios={mockUsuarios} />);

  expect(await screen.findByText('Ana Souza')).toBeOnTheScreen();
  expect(screen.getByText('ana@x.com')).toBeOnTheScreen();
  expect(screen.getByText('Cliente')).toBeOnTheScreen();
  expect(screen.getByText(/Membro desde 9 de novembro de 2026/)).toBeOnTheScreen();
});

it('mostra o papel de administrador e a área de usuários', async () => {
  server.use(meQueAceita('access-1', { ...perfilAna, papel: 'admin' }));
  await renderizar(<PerfilView onCategorias={mockCategorias} onUsuarios={mockUsuarios} />);
  expect(await screen.findByText('Administrador')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Usuários' }));
  expect(mockUsuarios).toHaveBeenCalled();
});

it('não mostra a área de usuários para cliente (spec, "Navegação por papel")', async () => {
  server.use(meQueAceita('access-1'));
  await renderizar(<PerfilView onCategorias={mockCategorias} onUsuarios={mockUsuarios} />);
  expect(await screen.findByText('Cliente')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Usuários' })).toBeNull();
});

it('mostra o carregamento enquanto busca', async () => {
  server.use(meQueAceita('access-1'));
  await renderizar(<PerfilView onCategorias={mockCategorias} onUsuarios={mockUsuarios} />);
  expect(screen.getByRole('progressbar', { name: 'Carregando perfil…' })).toBeOnTheScreen();
  expect(await screen.findByText('Ana Souza')).toBeOnTheScreen();
});

it('erro do BFF aparece com a mensagem e permite tentar de novo', async () => {
  let chamadas = 0;
  server.use(
    http.get(`${BFF}/me`, () => {
      chamadas++;
      return chamadas === 1
        ? HttpResponse.json(
            {
              type: 't',
              title: 't',
              status: 500,
              code: 'erro_interno',
              detail: 'Erro interno. Tente novamente.',
            },
            { status: 500, headers: { 'Content-Type': 'application/problem+json' } },
          )
        : HttpResponse.json(perfilAna);
    }),
  );
  await renderizar(<PerfilView onCategorias={mockCategorias} onUsuarios={mockUsuarios} />);
  expect(await screen.findByRole('alert')).toHaveTextContent(/Erro interno\. Tente novamente\./);

  await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));
  expect(await screen.findByText('Ana Souza')).toBeOnTheScreen();
});

it('resposta fora do contrato é tratada como erro', async () => {
  server.use(http.get(`${BFF}/me`, () => HttpResponse.json({ id: 'u-1' })));
  await renderizar(<PerfilView onCategorias={mockCategorias} onUsuarios={mockUsuarios} />);
  expect(await screen.findByRole('alert')).toHaveTextContent(/Não foi possível carregar o perfil/);
});

it('"Sair" aciona o logout da feature auth (spec, "Usuário sai do app")', async () => {
  server.use(meQueAceita('access-1'));
  await renderizar(<PerfilView onCategorias={mockCategorias} onUsuarios={mockUsuarios} />);
  await screen.findByText('Ana Souza');
  await fireEvent.press(screen.getByRole('button', { name: 'Sair' }));
  expect(mockSair).toHaveBeenCalledTimes(1);
});

it('"Categorias" abre a tela de categorias', async () => {
  server.use(meQueAceita('access-1'));
  await renderizar(<PerfilView onCategorias={mockCategorias} onUsuarios={mockUsuarios} />);
  await screen.findByText('Ana Souza');
  await fireEvent.press(screen.getByRole('button', { name: 'Categorias' }));
  expect(mockCategorias).toHaveBeenCalledTimes(1);
});
