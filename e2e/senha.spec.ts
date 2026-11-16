// Change troca-recuperacao-senha, tarefa 4.1: alterar a senha pelo Perfil e
// entrar com a nova (a antiga é recusada); "Esqueci minha senha" mostra a
// mensagem neutra.
//
// A pessoa de teste nasce já confirmada (AdminCreateUser, sem e-mail). A
// redefinição com o código não entra aqui: o código chega por e-mail real e
// fica na validação manual em dev (design.md, "Risks / Trade-offs").
import { expect, test } from '@playwright/test';

import { abrir, diagnosticarNaFalha, entrar, preencher } from './app';
import { type Conta, contaDeCliente, excluirUsuario, lerAmbiente, senhaAleatoria } from './aws';

const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const email = `e2e-senha-${id}@example.com`;
const amb = lerAmbiente();

let pessoa: Conta;

test.beforeAll(async () => {
  pessoa = await contaDeCliente(amb, email, `E2E Senha ${id}`);
});

test.afterEach(async ({ page }, info) => {
  await diagnosticarNaFalha(page, info);
});

test.afterAll(async () => {
  await excluirUsuario(amb, email);
});

test('altera a senha pelo perfil e entra com a nova', async ({ page }) => {
  const novaSenha = senhaAleatoria();

  await test.step('entra e abre Alterar senha no Perfil', async () => {
    await abrir(page, '/login');
    await entrar(page, pessoa.email, pessoa.senha);
    await page.getByRole('tab', { name: 'Perfil' }).click();
    await page.getByRole('button', { name: 'Alterar senha', exact: true }).click();
  });

  await test.step('troca a senha e continua logado', async () => {
    await preencher(page, 'Senha atual', pessoa.senha);
    await preencher(page, 'Nova senha', novaSenha);
    await preencher(page, 'Confirme a nova senha', novaSenha);
    await page.getByRole('button', { name: 'Salvar nova senha', exact: true }).click();
    await expect(
      page.getByText('Senha alterada. Os outros dispositivos foram desconectados.'),
    ).toBeVisible();
  });

  await test.step('sai e a senha antiga é recusada', async () => {
    await page.getByRole('button', { name: 'Voltar' }).click();
    await page.getByRole('button', { name: 'Sair', exact: true }).click();
    await entrar(page, pessoa.email, pessoa.senha);
    await expect(page.getByText('E-mail ou senha incorretos.')).toBeVisible();
  });

  await test.step('entra com a nova senha', async () => {
    await preencher(page, 'Senha', novaSenha);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page.getByRole('tab', { name: 'Painel' })).toBeVisible();
  });
});

test('"Esqueci minha senha" mostra a mensagem neutra', async ({ page }) => {
  await abrir(page, '/login');
  await preencher(page, 'E-mail', `e2e-ninguem-${id}@example.com`);
  await page.getByRole('button', { name: 'Esqueci minha senha', exact: true }).click();
  await page.getByRole('button', { name: 'Enviar código', exact: true }).click();
  await expect(
    page.getByText('Se houver uma conta com este e-mail, enviamos um código.'),
  ).toBeVisible();
});
