// Passos de tela comuns aos E2E (tarefas 12.1 e 12.2).
import { expect, type Page, type TestInfo } from '@playwright/test';

/**
 * Abre a rota e espera o app ficar estável: o service worker da PWA assumindo
 * a página (na primeira visita) e a rede parada.
 */
export async function abrir(page: Page, rota: string): Promise<void> {
  await page.goto(rota);
  await page.waitForFunction(
    () => !('serviceWorker' in navigator) || navigator.serviceWorker.controller !== null,
  );
  await page.waitForLoadState('networkidle');
}

/**
 * Preenche um campo e confere o valor. O site é exportado como HTML estático:
 * até o React assumir a página, o que se digita é descartado na hidratação.
 * Por isso repete até o valor ficar.
 */
export async function preencher(page: Page, rotulo: string, valor: string): Promise<void> {
  const campo = page.getByLabel(rotulo, { exact: true });
  await expect(async () => {
    await campo.fill(valor);
    await expect(campo).toHaveValue(valor, { timeout: 1_000 });
  }).toPass();
}

/** Preenche o login e toca em Entrar (a tela de login já aberta). */
export async function entrar(page: Page, email: string, senha: string): Promise<void> {
  await preencher(page, 'E-mail', email);
  await preencher(page, 'Senha', senha);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
}

/**
 * Na falha, o log da esteira é tudo o que se vê (o relatório do Playwright não
 * é publicado). Imprime a URL, a árvore de acessibilidade e, para cada botão
 * visível, o que está por cima do centro dele. Use num test.afterEach.
 */
export async function diagnosticarNaFalha(page: Page, info: TestInfo): Promise<void> {
  if (info.status === info.expectedStatus) return;
  console.log(`URL na falha: ${page.url()}`);
  console.log(`Árvore de acessibilidade:\n${await page.locator('body').ariaSnapshot()}`);
  const cobertos = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[role="button"], button')]
      .filter((b) => b.offsetParent !== null)
      .map((b) => {
        const r = b.getBoundingClientRect();
        const topo = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        if (!topo || b.contains(topo)) return null;
        return { botao: b.getAttribute('aria-label') ?? '', porCima: topo.outerHTML.slice(0, 200) };
      })
      .filter(Boolean),
  );
  console.log(`Botões cobertos: ${JSON.stringify(cobertos, null, 1)}`);
}
