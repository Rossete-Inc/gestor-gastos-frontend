// Change colaboradores, tarefa 5.4: a Ana convida o Bruno como Editor → o
// Bruno aceita e lança na conta dela → a Ana vê "por Bruno" → a Ana muda o
// Bruno para Leitor → ele não lança mais → o Bruno sai e perde o acesso.
//
// As duas pessoas nascem confirmadas (AdminCreateUser, sem e-mail) e são
// excluídas no fim pelo caminho do app (e2e/aws.ts); a exclusão da Ana apaga
// também a conta compartilhada.
import { expect, type Browser, type Page, test } from '@playwright/test';

import { abrir, abrirAba, diagnosticarNaFalha, entrar, preencher, tocarVisivel } from './app';
import { type Conta, contaDeCliente, excluirUsuario, lerAmbiente } from './aws';

const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const emailAna = `e2e-colab-ana-${id}@example.com`;
const emailBruno = `e2e-colab-bruno-${id}@example.com`;
const nomeAna = `Ana ${id}`;
const nomeBruno = `Bruno ${id}`;
const descricao = `Conta de luz ${id}`;
const amb = lerAmbiente();

let ana: Conta;
let bruno: Conta;
let paginaAna: Page;
let paginaBruno: Page;

/** Chama o BFF como o Bruno, na conta da Ana, e devolve o status HTTP. */
async function statusNaContaDaAna(metodo: string, caminho: string, corpo?: unknown) {
  const resp = await fetch(`${amb.apiUrl}${caminho}`, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${bruno.token}`,
      'X-Conta': ana.id,
      ...(corpo === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  return resp.status;
}

async function novaPagina(browser: Browser, conta: Conta): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await abrir(page, '/login');
  await entrar(page, conta.email, conta.senha);
  await expect(page.getByRole('heading', { name: 'Painel', exact: true })).toBeVisible();
  return page;
}

test.beforeAll(async () => {
  ana = await contaDeCliente(amb, emailAna, nomeAna);
  bruno = await contaDeCliente(amb, emailBruno, nomeBruno);
});

test.afterEach(async ({ page }, info) => {
  for (const p of [paginaAna, paginaBruno, page]) if (p) await diagnosticarNaFalha(p, info);
});

test.afterAll(async () => {
  await excluirUsuario(amb, emailBruno);
  await excluirUsuario(amb, emailAna);
});

test('convite, lançamento como Editor, Leitor e saída da conta', async ({ browser }) => {
  await test.step('a Ana convida o Bruno como Editor', async () => {
    paginaAna = await novaPagina(browser, ana);
    await abrirAba(paginaAna, 'Perfil');
    await paginaAna.getByRole('button', { name: 'Colaboradores' }).click();
    await preencher(paginaAna, 'E-mail', emailBruno);
    await paginaAna.getByRole('button', { name: 'Enviar convite' }).click();
    await expect(
      paginaAna.getByText(`Convite enviado para ${emailBruno}.`, { exact: false }),
    ).toBeVisible();
    await expect(
      paginaAna.getByRole('button', {
        name: new RegExp(`^${emailBruno}, Ainda não aceitou, Editor`),
      }),
    ).toBeVisible();
  });

  await test.step('o Bruno aceita e passa para a conta da Ana', async () => {
    paginaBruno = await novaPagina(browser, bruno);
    await tocarVisivel(paginaBruno, 'Você tem 1 convite');
    await expect(paginaBruno.getByText(`Conta de ${nomeAna}`)).toBeVisible();
    await paginaBruno.getByRole('button', { name: 'Aceitar' }).click();
    await expect(paginaBruno.getByRole('heading', { name: 'Painel', exact: true })).toBeVisible();
    await expect(
      paginaBruno.locator(`[aria-label="Conta: Conta de ${nomeAna}"]:visible`),
    ).toHaveCount(1);
  });

  await test.step('o Bruno lança um gasto na conta da Ana', async () => {
    await abrirAba(paginaBruno, 'Gastos');
    await tocarVisivel(paginaBruno, 'Novo gasto');
    await paginaBruno.getByLabel('Valor', { exact: true }).pressSequentially('12345');
    await paginaBruno.getByRole('button', { name: /^Categoria:/ }).click();
    await paginaBruno.getByRole('radio', { name: 'Internet' }).click();
    await preencher(paginaBruno, 'Descrição', descricao);
    await paginaBruno.getByRole('button', { name: 'Salvar gasto' }).click();
    await expect(
      paginaBruno.getByRole('button', { name: new RegExp(`^${descricao},`) }),
    ).toBeVisible();
  });

  await test.step('a Ana vê o gasto lançado pelo Bruno e filtra por ele', async () => {
    // A Ana ficou na tela de Colaboradores, que não tem a barra de abas.
    await tocarVisivel(paginaAna, 'Voltar');
    await abrirAba(paginaAna, 'Gastos');
    const item = paginaAna.getByRole('button', {
      name: new RegExp(`^${descricao}, .*por ${nomeBruno}`),
    });
    await expect(item).toBeVisible();
    await paginaAna.getByRole('button', { name: 'Pessoa: Todas as pessoas' }).click();
    await paginaAna.getByRole('radio', { name: nomeBruno }).click();
    await expect(item).toBeVisible();
  });

  await test.step('a Ana muda o Bruno para Leitor, e ele não lança mais', async () => {
    await abrirAba(paginaAna, 'Perfil');
    await paginaAna.getByRole('button', { name: 'Colaboradores' }).click();
    await paginaAna
      .getByRole('button', { name: new RegExp(`^${nomeBruno}, ${emailBruno}, Editor`) })
      .click();
    await paginaAna.getByText('Mudar para Leitor').click();
    await expect(
      paginaAna.getByRole('button', { name: new RegExp(`^${nomeBruno}, ${emailBruno}, Leitor`) }),
    ).toBeVisible();

    // O BFF guarda o acesso por até 10 s: a escrita do Bruno passa a ser 403.
    await expect(async () => {
      expect(
        await statusNaContaDaAna('POST', '/categorias', {
          nome: `X ${id}`.slice(0, 40),
          grupo: 'FIXO',
          cor: '#17BEBB',
        }),
      ).toBe(403);
    }).toPass({ timeout: 30_000 });

    // No app, ao entrar de novo, a conta da Ana aparece só para leitura.
    await paginaBruno.reload();
    await entrar(paginaBruno, bruno.email, bruno.senha);
    await expect(
      paginaBruno.locator(`[aria-label="Conta: Conta de ${nomeAna} (só leitura)"]:visible`),
    ).toHaveCount(1);
    await expect(paginaBruno.locator('[aria-label="Novo gasto"]:visible')).toHaveCount(0);
  });

  await test.step('o Bruno sai da conta e perde o acesso', async () => {
    await abrirAba(paginaBruno, 'Perfil');
    await paginaBruno.getByRole('button', { name: `Sair da conta de ${nomeAna}` }).click();
    await paginaBruno
      .getByRole('alert')
      .getByRole('button', { name: 'Sair da conta', exact: true })
      .click();
    await expect(paginaBruno.getByRole('heading', { name: 'Painel', exact: true })).toBeVisible();
    await expect(paginaBruno.locator('[aria-label^="Conta:"]:visible')).toHaveCount(0);
    await expect(async () => {
      expect(await statusNaContaDaAna('GET', '/cartoes')).toBe(404);
    }).toPass({ timeout: 30_000 });
  });
});
