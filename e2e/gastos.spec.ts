// Tarefa 12.1: cadastro → confirmação → login → lançar gasto → ver no painel e
// na pizza → editar → excluir, no site publicado.
//
// O usuário é novo a cada execução (e-mail único em example.com). A
// confirmação usa AdminConfirmSignUp, porque o código vai por e-mail. No fim,
// mesmo com falha, o usuário é excluído pelo caminho do app (e2e/aws.ts).
import { expect, test } from '@playwright/test';

import { confirmarCadastro, excluirUsuario, lerAmbiente, senhaAleatoria } from './aws';

const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const email = `e2e-${id}@example.com`;
const senha = senhaAleatoria();
const descricao = `E2E ${id}`;
const amb = lerAmbiente();

test.afterAll(async () => {
  await excluirUsuario(amb, email);
});

test('cadastro, login e ciclo de um gasto até o painel', async ({ page }) => {
  await test.step('cadastro', async () => {
    await page.goto('/cadastro');
    await page.getByLabel('Nome', { exact: true }).fill('E2E Teste');
    await page.getByLabel('E-mail', { exact: true }).fill(email);
    await page.getByLabel('Senha', { exact: true }).fill(senha);
    await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
    await expect(page.getByText('Confirme seu e-mail')).toBeVisible();
  });

  await test.step('confirmação (pelo Cognito) e login', async () => {
    confirmarCadastro(amb, email);
    await page.getByRole('button', { name: 'Voltar para o login' }).click();
    await page.getByLabel('E-mail', { exact: true }).fill(email);
    await page.getByLabel('Senha', { exact: true }).fill(senha);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page.getByRole('tab', { name: 'Painel' })).toBeVisible();
  });

  await test.step('lançar gasto', async () => {
    await page.getByRole('tab', { name: 'Gastos' }).click();
    await page.getByRole('button', { name: 'Novo gasto' }).click();
    await page.getByLabel('Valor', { exact: true }).pressSequentially('12345');
    await expect(page.getByLabel('Valor', { exact: true })).toHaveValue('R$ 123,45');
    await page.getByRole('button', { name: /^Categoria:/ }).click();
    await page.getByRole('radio', { name: 'Alimentação' }).click();
    await page.getByLabel('Descrição', { exact: true }).fill(descricao);
    await page.getByRole('button', { name: 'Salvar gasto' }).click();
    await expect(
      page.getByRole('button', { name: `${descricao}, Alimentação, R$ 123,45` }),
    ).toBeVisible();
  });

  await test.step('painel e pizza', async () => {
    await page.getByRole('tab', { name: 'Painel' }).click();
    await expect(page.getByText('Total do mês')).toBeVisible();
    // Único gasto do mês: 100% em Alimentação, na legenda da pizza.
    await expect(page.getByLabel(/^Alimentação: 100/)).toBeVisible();
    await expect(page.getByLabel(/^Gráfico por categoria.*R\$ 123,45$/)).toBeVisible();
    await expect(
      page.getByRole('button', { name: new RegExp(`^${descricao}, Alimentação`) }),
    ).toBeVisible();
  });

  await test.step('editar', async () => {
    await page.getByRole('tab', { name: 'Gastos' }).click();
    await page.getByRole('button', { name: new RegExp(`^${descricao},`) }).click();
    await page.getByLabel('Descrição', { exact: true }).fill(`${descricao} editado`);
    await page.getByRole('button', { name: 'Salvar gasto' }).click();
    await expect(
      page.getByRole('button', { name: `${descricao} editado, Alimentação, R$ 123,45` }),
    ).toBeVisible();
  });

  await test.step('excluir', async () => {
    await page.getByRole('button', { name: new RegExp(`^${descricao} editado,`) }).click();
    await page.getByRole('button', { name: 'Excluir gasto' }).click();
    await page.getByRole('button', { name: 'Excluir', exact: true }).click();
    await expect(page.getByRole('button', { name: new RegExp(`^${descricao}`) })).toHaveCount(0);
    await expect(page.getByText(/Nenhum gasto em/)).toBeVisible();
  });
});
