import { defineConfig, devices } from '@playwright/test';

/**
 * Testes ponta a ponta do POS. Correm contra a stack de desenvolvimento já
 * levantada pelo docker-compose.yml da raiz (web em :5173, api em :3333),
 * por isso não há `webServer` aqui: subir um segundo Vite a apontar para a
 * mesma base de dados só criaria confusão sobre qual dos dois falhou.
 *
 * Antes de correr:
 *   docker compose up -d
 *
 * O Kuava é usado quase sempre num telemóvel ou tablet no balcão, por isso
 * o projeto por omissão emula um telemóvel. O `desktop` existe para o caso
 * de um layout só quebrar no ecrã grande (o PosPage tem breakpoints md).
 */
export default defineConfig({
  testDir: './e2e',
  // Cria UM estabelecimento para toda a corrida; sem isto a suite rebenta o
  // limite de 5 registos por hora da API.
  globalSetup: './e2e/global-setup.ts',
  // Um POS partilha stock e catálogo: dois testes a vender ao mesmo tempo
  // disputariam as mesmas quantidades. Série, sempre.
  workers: 1,
  fullyParallel: false,
  // Falhar em vez de passar silenciosamente se alguém deixar um .only.
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'telemovel',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
