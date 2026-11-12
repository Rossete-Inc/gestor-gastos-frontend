// Playwright do E2E (tarefas 12.1 e 12.2). Roda contra o site já publicado:
// APP_URL vem do job de deploy do frontend.yml (infra-base); fora da esteira,
// passe APP_URL=https://main.<app>.amplifyapp.com.
import { defineConfig, devices } from '@playwright/test';

const appUrl = process.env.APP_URL;
if (!appUrl) throw new Error('Defina APP_URL com a URL do site (ex.: o de dev no Amplify).');

export default defineConfig({
  testDir: '.',
  // Um fluxo só, em série: cada teste cadastra e apaga o próprio usuário.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: appUrl,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Pixel 7'] } }],
});
