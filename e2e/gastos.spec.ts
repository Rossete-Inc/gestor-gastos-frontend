// Tarefa 12.1: cadastro → confirmação → login → lançar gasto → ver no painel e
// na pizza → editar → excluir, no site publicado.
//
// O usuário é novo a cada execução (e-mail único em example.com). A
// confirmação usa AdminConfirmSignUp, porque o código vai por e-mail. No fim,
// mesmo com falha, o usuário é excluído pelo caminho do app (e2e/aws.ts).
import { expect, type Page, test } from '@playwright/test';

import { confirmarCadastro, excluirUsuario, lerAmbiente, senhaAleatoria } from './aws';

const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const email = `e2e-${id}@example.com`;
const senha = senhaAleatoria();
const descricao = `E2E ${id}`;
const amb = lerAmbiente();

/**
 * Preenche um campo e confere o valor. O site é exportado como HTML estático:
 * até o React assumir a página, o que se digita é descartado na hidratação.
 * Por isso repete até o valor ficar.
 */
async function preencher(page: Page, rotulo: string, valor: string): Promise<void> {
  const campo = page.getByLabel(rotulo, { exact: true });
  await expect(async () => {
    await campo.fill(valor);
    await expect(campo).toHaveValue(valor, { timeout: 1_000 });
  }).toPass();
}

/**
 * Abre a rota e espera o app ficar estável: o service worker da PWA assumindo
 * a página (na primeira visita) e a rede parada.
 */
async function abrir(page: Page, rota: string): Promise<void> {
  await page.goto(rota);
  await page.waitForFunction(
    () => !('serviceWorker' in navigator) || navigator.serviceWorker.controller !== null,
  );
  await page.waitForLoadState('networkidle');
}

// Na falha, o log da esteira é tudo o que se vê (o relatório do Playwright não
// é publicado). Imprime a URL, a árvore de acessibilidade e, para cada botão
// visível, o que está por cima do centro dele.
test.afterEach(async ({ page }, info) => {
  if (info.status === info.expectedStatus) return;
  console.log(`URL na falha: ${page.url()}`);
  console.log(`Árvore de acessibilidade:
${await page.locator('body').ariaSnapshot()}`);
  const cobertos = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[role="button"], button')]
      .filter((b) => b.offsetParent !== null)
      .map((b) => {
        const r = b.getBoundingClientRect();
        const topo = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        if (!topo || b.contains(topo)) return null;
        const camada = topo.closest('[class]')?.parentElement;
        return {
          botao: b.getAttribute('aria-label') ?? b.innerText.slice(0, 40),
          porCima: topo.outerHTML.slice(0, 200),
          camada: camada?.innerText.replace(/\s+/g, ' ').slice(0, 200) ?? '',
        };
      })
      .filter(Boolean),
  );
  console.log(`Botões cobertos: ${JSON.stringify(cobertos, null, 1)}`);
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
    await preencher(page, 'E-mail', email);
    await preencher(page, 'Senha', senha);
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
