// Tarefa 12.2: o admin bloqueia uma pessoa → login dela recusado → reativa →
// login aceito; o admin exclui a conta → os dados dela somem, no site publicado.
//
// A pessoa de teste nasce já confirmada (AdminCreateUser, sem e-mail) e ganha
// pela API uma categoria personalizada e um gasto, para a exclusão ter o que
// apagar. A prova de "dados removidos" é o DynamoDB: o UserDeleted é consumido
// de forma assíncrona pelos serviços de gastos e de categorias.
import { type Browser, expect, type Page, test } from '@playwright/test';

import { abrir, diagnosticarNaFalha, entrar } from './app';
import {
  api,
  type Conta,
  contaDeCliente,
  contaDoAdmin,
  contarDados,
  excluirUsuario,
  lerAmbiente,
  subDoUsuario,
} from './aws';

const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const email = `e2e-alvo-${id}@example.com`;
const nome = `E2E Alvo ${id}`;
const amb = lerAmbiente();

let pessoa: Conta;

/** Hoje no fuso do app, como AAAA-MM-DD. */
const hoje = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

test.beforeAll(async () => {
  pessoa = await contaDeCliente(amb, email, nome);
  const categoria = await api<{ id: string }>(amb, pessoa.token, 'POST', '/categorias', {
    nome: `E2E ${id}`.slice(0, 40),
    grupo: 'CARTAO',
    cor: '#E4572E',
  });
  await api(amb, pessoa.token, 'POST', '/gastos', {
    valorCentavos: 1000,
    data: hoje(),
    categoriaId: categoria.id,
    descricao: 'E2E admin',
  });
  const dados = contarDados(amb, pessoa.id);
  expect(dados.gastos, 'gasto da pessoa de teste no DynamoDB').toBeGreaterThan(0);
  expect(dados.categorias, 'categoria da pessoa de teste no DynamoDB').toBeGreaterThan(0);
});

test.afterEach(async ({ page }, info) => {
  await diagnosticarNaFalha(page, info);
});

test.afterAll(async () => {
  await excluirUsuario(amb, email);
});

/** Segunda janela, isolada da do admin, com as mesmas opções do projeto. */
async function novaJanela(browser: Browser): Promise<Page> {
  const ctx = await browser.newContext({ ...test.info().project.use });
  return ctx.newPage();
}

/** Linha da pessoa na tela Usuários: "nome, e-mail, papel, status". */
const linha = (page: Page, status: string) =>
  page.getByRole('button', { name: `${nome}, ${email}, Cliente, ${status}`, exact: true });

/** Abre as ações da pessoa, escolhe uma e confirma no diálogo. */
async function agir(page: Page, statusAtual: string, acao: string, confirmar: string) {
  await linha(page, statusAtual).click();
  await page.getByRole('button', { name: acao, exact: true }).click();
  await page.getByRole('alert').getByRole('button', { name: confirmar, exact: true }).click();
}

test('admin bloqueia, reativa e exclui uma conta', async ({ page, browser }) => {
  const admin = await contaDoAdmin(amb);
  const janela = await novaJanela(browser);

  await test.step('admin entra e abre Usuários', async () => {
    await abrir(page, '/login');
    await entrar(page, admin.email, admin.senha);
    await page.getByRole('tab', { name: 'Perfil' }).click();
    await page.getByRole('button', { name: 'Usuários', exact: true }).click();
    await expect(linha(page, 'Ativo')).toBeVisible();
  });

  await test.step('bloquear: login recusado', async () => {
    await agir(page, 'Ativo', 'Bloquear', 'Bloquear');
    await expect(linha(page, 'Bloqueado')).toBeVisible();

    await abrir(janela, '/login');
    await entrar(janela, pessoa.email, pessoa.senha);
    await expect(janela.getByText('Sua conta está bloqueada', { exact: false })).toBeVisible();
  });

  await test.step('reativar: login aceito', async () => {
    await agir(page, 'Bloqueado', 'Reativar', 'Reativar');
    await expect(linha(page, 'Ativo')).toBeVisible();

    await janela.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(janela.getByRole('tab', { name: 'Painel' })).toBeVisible();
  });

  await test.step('excluir: dados removidos', async () => {
    await agir(page, 'Ativo', 'Excluir conta', 'Excluir');
    await expect(page.getByText(`A conta de ${nome} foi excluída.`)).toBeVisible();
    expect(subDoUsuario(amb, email), 'conta no Cognito').toBeNull();
    // O UserDeleted é assíncrono: espera os dois serviços apagarem tudo.
    await expect
      .poll(() => contarDados(amb, pessoa.id), { timeout: 60_000, intervals: [2_000] })
      .toEqual({ gastos: 0, categorias: 0 });
  });

  await janela.context().close();
});
