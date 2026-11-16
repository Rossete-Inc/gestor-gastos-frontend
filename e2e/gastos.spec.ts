// Tarefa 12.1: cadastro → confirmação → login → lançar gasto → ver no painel e
// na pizza → editar → excluir, no site publicado.
//
// O usuário é novo a cada execução (e-mail único em example.com). A
// confirmação usa AdminConfirmSignUp, porque o código vai por e-mail. No fim,
// mesmo com falha, o usuário é excluído pelo caminho do app (e2e/aws.ts).
import { expect, test } from '@playwright/test';

import { abrir, abrirAba, diagnosticarNaFalha, entrar, preencher, tocarVisivel } from './app';
import { confirmarCadastro, excluirUsuario, lerAmbiente, senhaAleatoria } from './aws';

const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const email = `e2e-${id}@example.com`;
const senha = senhaAleatoria();
const descricao = `E2E ${id}`;
const amb = lerAmbiente();

test.afterEach(async ({ page }, info) => {
  await diagnosticarNaFalha(page, info);
});

test.afterAll(async () => {
  await excluirUsuario(amb, email);
});

test('cadastro, login e ciclo de um gasto até o painel', async ({ page }) => {
  await test.step('cadastro', async () => {
    await abrir(page, '/cadastro');
    await preencher(page, 'Nome', 'E2E Teste');
    await preencher(page, 'E-mail', email);
    await preencher(page, 'Senha', senha);
    await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
    await expect(page.getByText('Confirme seu e-mail')).toBeVisible();
  });

  await test.step('confirmação (pelo Cognito) e login', async () => {
    confirmarCadastro(amb, email);
    await page.getByRole('button', { name: 'Voltar para o login' }).click();
    await entrar(page, email, senha);
    await expect(page.getByRole('tab', { name: 'Painel' })).toBeVisible();
  });

  await test.step('lançar gasto', async () => {
    await abrirAba(page, 'Gastos');
    // A aba Painel, fora de foco, tem o mesmo FAB no mesmo lugar.
    await tocarVisivel(page, 'Novo gasto');
    await page.getByLabel('Valor', { exact: true }).pressSequentially('12345');
    await expect(page.getByLabel('Valor', { exact: true })).toHaveValue('R$ 123,45');
    await page.getByRole('button', { name: /^Categoria:/ }).click();
    await page.getByRole('radio', { name: 'Internet' }).click();
    await page.getByLabel('Descrição', { exact: true }).fill(descricao);
    await page.getByRole('button', { name: 'Salvar gasto' }).click();
    await expect(
      page.getByRole('button', { name: `${descricao}, Internet, R$ 123,45` }),
    ).toBeVisible();
  });

  await test.step('painel e pizza', async () => {
    await abrirAba(page, 'Painel');
    await expect(page.getByText('Total do mês')).toBeVisible();
    // Único gasto do mês: 100% em Internet (fixo, sem cartão), na legenda da pizza.
    await expect(page.getByLabel(/^Internet: 100/)).toBeVisible();
    await expect(page.getByLabel(/^Gráfico por categoria.*R\$ 123,45$/)).toBeVisible();
    await expect(
      page.getByRole('button', { name: new RegExp(`^${descricao}, Internet`) }),
    ).toBeVisible();
  });

  await test.step('editar', async () => {
    await abrirAba(page, 'Gastos');
    // Nome exato do item da lista de Gastos: o Painel mostra o mesmo gasto em
    // "últimos lançamentos", com a data no meio ("Internet · 12/11").
    await page
      .getByRole('button', { name: `${descricao}, Internet, R$ 123,45`, exact: true })
      .click();
    await page.getByLabel('Descrição', { exact: true }).fill(`${descricao} editado`);
    await page.getByRole('button', { name: 'Salvar gasto' }).click();
    await expect(
      page.getByRole('button', { name: `${descricao} editado, Internet, R$ 123,45` }),
    ).toBeVisible();
  });

  await test.step('excluir', async () => {
    await page
      .getByRole('button', { name: `${descricao} editado, Internet, R$ 123,45`, exact: true })
      .click();
    await page.getByRole('button', { name: 'Excluir gasto' }).click();
    await page.getByRole('button', { name: 'Excluir', exact: true }).click();
    await expect(page.getByRole('button', { name: new RegExp(`^${descricao}`) })).toHaveCount(0);
    await expect(page.getByText(/Nenhum gasto em/)).toBeVisible();
  });
});
