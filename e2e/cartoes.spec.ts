// Change cartoes-credito, tarefa 4.4: cadastrar cartão (fecha 25, vence 5) →
// lançar uma compra no dia 28 do mês → ela aparece na fatura de dois meses
// depois, na aba Cartões e no painel → excluir o cartão é recusado → arquivar.
//
// A pessoa de teste nasce já confirmada (AdminCreateUser, sem e-mail) e é
// excluída no fim pelo caminho do app (e2e/aws.ts), o que apaga o cartão e o
// gasto junto.
import { expect, test } from '@playwright/test';

import { abrir, diagnosticarNaFalha, entrar, preencher } from './app';
import { type Conta, contaDeCliente, excluirUsuario, lerAmbiente } from './aws';

const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const email = `e2e-cartao-${id}@example.com`;
const apelido = `E2E ${id}`.slice(0, 40);
const descricao = `Compra ${id}`;
const amb = lerAmbiente();

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

/** Hoje no fuso do app, como [ano, mês 1–12]. */
function mesDeHoje(): [number, number] {
  const [ano, mes] = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' })
    .format(new Date())
    .split('-')
    .map(Number);
  return [ano!, mes!];
}

const somar = ([ano, mes]: [number, number], n: number): [number, number] => {
  const total = ano * 12 + (mes - 1) + n;
  return [Math.floor(total / 12), (total % 12) + 1];
};

const rotulo = ([ano, mes]: [number, number]) => `${MESES[mes - 1]} de ${ano}`;

let pessoa: Conta;

test.beforeAll(async () => {
  pessoa = await contaDeCliente(amb, email, `E2E Cartão ${id}`);
});

test.afterEach(async ({ page }, info) => {
  await diagnosticarNaFalha(page, info);
});

test.afterAll(async () => {
  await excluirUsuario(amb, email);
});

test('cartão, compra depois do fechamento e fatura dois meses depois', async ({ page }) => {
  const hoje = mesDeHoje();
  // Compra no dia 28, depois do fechamento (25): fecha no mês seguinte e
  // vence (dia 5) no outro.
  const fatura = somar(hoje, 2);
  const dataCompra = `28/${String(hoje[1]).padStart(2, '0')}/${hoje[0]}`;

  await test.step('entra e cadastra o cartão', async () => {
    await abrir(page, '/login');
    await entrar(page, pessoa.email, pessoa.senha);
    await page.getByRole('tab', { name: 'Cartões' }).click();
    await page.getByRole('button', { name: 'Cadastrar cartão' }).click();
    await preencher(page, 'Apelido', apelido);
    await page.getByRole('button', { name: 'Dia de fechamento: Escolha o dia' }).click();
    await page.getByRole('radio', { name: 'Dia 25', exact: true }).click();
    // O Modal do Select fecha com fade: espera a lista sumir antes de abrir a
    // do vencimento, senão "Dia 5" aparece nas duas.
    await expect(page.getByRole('radio', { name: 'Dia 25', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Dia de vencimento: Escolha o dia' }).click();
    await page.getByRole('radio', { name: 'Dia 5', exact: true }).click();
    await page.getByLabel('Limite', { exact: true }).pressSequentially('500000');
    await page.getByRole('button', { name: 'Salvar cartão' }).click();
    await expect(page.getByRole('button', { name: `Editar ${apelido}` })).toBeVisible();
  });

  await test.step('lança a compra no cartão', async () => {
    await page.getByRole('tab', { name: 'Gastos' }).click();
    await expect(page.locator('[aria-label="Novo gasto"]:visible')).toHaveCount(1);
    await page.getByRole('button', { name: 'Novo gasto' }).click();
    await page.getByLabel('Valor', { exact: true }).pressSequentially('10000');
    await page.getByRole('button', { name: /^Categoria:/ }).click();
    await page.getByRole('radio', { name: 'Alimentação' }).click();
    await page.getByRole('button', { name: 'Cartão: Escolha o cartão' }).click();
    await page.getByRole('radio', { name: apelido }).click();
    await preencher(page, 'Data', dataCompra);
    await preencher(page, 'Descrição', descricao);
    await page.getByRole('button', { name: 'Salvar gasto' }).click();
    // A compra não está na lista do mês corrente: foi para a fatura.
    await expect(page.getByText(/Nenhum gasto em/)).toBeVisible();
  });

  await test.step('aparece na fatura e no limite, na aba Cartões', async () => {
    await page.getByRole('tab', { name: 'Cartões' }).click();
    await page.getByRole('button', { name: 'Próximo mês' }).click();
    await page.getByRole('button', { name: 'Próximo mês' }).click();
    await expect(page.getByRole('heading', { name: rotulo(fatura) })).toBeVisible();
    const cartao = page.getByRole('button', { name: new RegExp(`^${apelido}: fatura de`) });
    await expect(cartao).toContainText('R$ 100,00');
    await expect(cartao).toContainText('disponível R$ 4.900,00');

    // A fatura abre a lista de gastos do cartão naquele mês.
    await cartao.click();
    await expect(
      page.getByRole('button', { name: new RegExp(`^${descricao}, Alimentação · ${apelido}`) }),
    ).toBeVisible();
  });

  await test.step('aparece no painel do mês da fatura, com o detalhe da fatia', async () => {
    await page.getByRole('tab', { name: 'Painel' }).click();
    await page.getByRole('button', { name: 'Próximo mês' }).click();
    await page.getByRole('button', { name: 'Próximo mês' }).click();
    await expect(page.getByLabel(`${apelido}: 100%, R$ 100,00`)).toBeVisible();
    await page.getByRole('button', { name: /^Alimentação: 100%/ }).click();
    await expect(page.getByText('Alimentação · Cartão · R$ 100,00 · 100%')).toBeVisible();
  });

  await test.step('excluir com gastos é recusado; arquivar funciona', async () => {
    await page.getByRole('tab', { name: 'Cartões' }).click();
    await page.getByRole('button', { name: `Editar ${apelido}` }).click();
    await page.getByRole('button', { name: 'Excluir cartão' }).click();
    await page.getByRole('alert').getByRole('button', { name: 'Excluir', exact: true }).click();
    await expect(
      page.getByText('Este cartão tem gastos vinculados.', { exact: false }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Arquivar cartão' }).click();
    await expect(page.getByRole('heading', { name: 'Arquivados' })).toBeVisible();
  });
});
