// Change parcelamentos-recorrencias, tarefa 3.4: parcelar R$ 300,00 em 3× num
// cartão → ver 1/3, 2/3 e 3/3 nas faturas seguintes → excluir a 2/3 com
// "esta e as próximas" (a 3/3 vai junto) → lançar uma recorrência → abrir o
// mês seguinte e ver a ocorrência, criada na leitura.
//
// A pessoa de teste nasce já confirmada e é excluída no fim pelo caminho do
// app (e2e/aws.ts), o que apaga o cartão, as séries e os gastos.
import { expect, type Page, test } from '@playwright/test';

import { abrir, abrirAba, diagnosticarNaFalha, entrar, preencher, tocarVisivel } from './app';
import { type Conta, contaDeCliente, excluirUsuario, lerAmbiente } from './aws';

const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const email = `e2e-parcelas-${id}@example.com`;
const apelido = `E2E ${id}`.slice(0, 40);
const compra = `Parcelada ${id}`;
const conta = `Conta ${id}`;
const amb = lerAmbiente();

/** Hoje no fuso do app, como [ano, mês 1–12]. */
function mesDeHoje(): [number, number] {
  const [ano, mes] = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' })
    .format(new Date())
    .split('-')
    .map(Number);
  return [ano!, mes!];
}

/** Item da lista pelo título e selo, como "Parcelada … 2/3". */
const item = (page: Page, titulo: string, selo: string) =>
  page.getByRole('button', { name: new RegExp(`^${titulo} ${selo}, `) });

// Cada aba visitada tem seu "Próximo mês" (ver abrirAba).
async function proximoMes(page: Page) {
  await tocarVisivel(page, 'Próximo mês');
}

async function mesAnterior(page: Page) {
  await tocarVisivel(page, 'Mês anterior');
}

let pessoa: Conta;

test.beforeAll(async () => {
  pessoa = await contaDeCliente(amb, email, `E2E Parcelas ${id}`);
});

test.afterEach(async ({ page }, info) => {
  await diagnosticarNaFalha(page, info);
});

test.afterAll(async () => {
  await excluirUsuario(amb, email);
});

test('parcelado em 3×, exclusão das próximas e recorrência', async ({ page }) => {
  const [ano, mes] = mesDeHoje();
  // Dia 1, antes do fechamento (28), com vencimento (10) no mês seguinte: a
  // 1ª parcela cai na fatura do mês que vem, e as outras nas seguintes.
  const dia1 = `01/${String(mes).padStart(2, '0')}/${ano}`;

  await test.step('entra e cadastra o cartão', async () => {
    await abrir(page, '/login');
    await entrar(page, pessoa.email, pessoa.senha);
    await abrirAba(page, 'Cartões');
    await page.getByRole('button', { name: 'Cadastrar cartão' }).click();
    await preencher(page, 'Apelido', apelido);
    await page.getByRole('button', { name: 'Dia de fechamento: Escolha o dia' }).click();
    await page.getByRole('radio', { name: 'Dia 28', exact: true }).click();
    await expect(page.getByRole('radio', { name: 'Dia 28', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Dia de vencimento: Escolha o dia' }).click();
    await page.getByRole('radio', { name: 'Dia 10', exact: true }).click();
    await page.getByLabel('Limite', { exact: true }).pressSequentially('500000');
    await page.getByRole('button', { name: 'Salvar cartão' }).click();
    await expect(page.getByRole('button', { name: `Editar ${apelido}` })).toBeVisible();
  });

  await test.step('parcela R$ 300,00 em 3×, com a prévia', async () => {
    await abrirAba(page, 'Gastos');
    await tocarVisivel(page, 'Novo gasto');
    await page.getByRole('radio', { name: 'Parcelado' }).click();
    await page.getByLabel('Valor total', { exact: true }).pressSequentially('30000');
    await page.getByRole('button', { name: /^Categoria:/ }).click();
    await page.getByRole('radio', { name: 'Alimentação' }).click();
    await page.getByRole('button', { name: 'Cartão: Escolha o cartão' }).click();
    await page.getByRole('radio', { name: apelido }).click();
    await preencher(page, 'Data', dia1);
    await preencher(page, 'Parcelas', '3');
    await preencher(page, 'Descrição', compra);
    await expect(page.getByTestId('previa-parcelas')).toContainText('3× de R$ 100,00');
    await page.getByRole('button', { name: 'Salvar gasto' }).click();
    await expect(page.getByText(/Nenhum gasto em/)).toBeVisible();
  });

  await test.step('1/3, 2/3 e 3/3 nas faturas seguintes', async () => {
    await proximoMes(page);
    await expect(item(page, compra, '1/3')).toBeVisible();
    await proximoMes(page);
    await expect(item(page, compra, '2/3')).toBeVisible();
    await proximoMes(page);
    await expect(item(page, compra, '3/3')).toBeVisible();
  });

  await test.step('exclui a 2/3 com "esta e as próximas"', async () => {
    await mesAnterior(page);
    await item(page, compra, '2/3').click();
    await page.getByRole('button', { name: 'Excluir gasto' }).click();
    await page.getByRole('button', { name: 'Esta e as próximas' }).click();
    await expect(page.getByText(/Nenhum gasto em/)).toBeVisible();
    await proximoMes(page);
    await expect(page.getByText(/Nenhum gasto em/)).toBeVisible();
    await mesAnterior(page);
    await mesAnterior(page);
    await expect(item(page, compra, '1/3')).toBeVisible();
  });

  await test.step('recorrência aparece no mês seguinte', async () => {
    // A lista está no mês que vem; a conta é lançada no mês corrente.
    await tocarVisivel(page, 'Novo gasto');
    await page.getByRole('radio', { name: 'Recorrente' }).click();
    await page.getByLabel('Valor', { exact: true }).pressSequentially('5000');
    await page.getByRole('button', { name: /^Categoria:/ }).click();
    await page.getByRole('radio', { name: 'Aluguel' }).click();
    await preencher(page, 'Data', `05/${String(mes).padStart(2, '0')}/${ano}`);
    await preencher(page, 'Descrição', conta);
    await page.getByRole('button', { name: 'Salvar gasto' }).click();
    // A ocorrência deste mês (seguinte ao lançamento) nasce ao abrir a lista.
    await expect(item(page, conta, 'Recorrente')).toBeVisible();
    await mesAnterior(page);
    await expect(item(page, conta, 'Recorrente')).toBeVisible();
  });
});
