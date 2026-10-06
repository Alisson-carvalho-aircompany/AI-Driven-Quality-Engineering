import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', fullyParallel: false, forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0, workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: { baseURL: process.env.BASE_URL ?? 'https://compassuol.serverest.dev', extraHTTPHeaders: { Accept: 'application/json', 'Content-Type': 'application/json' } }
});