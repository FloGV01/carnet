import { defineConfig, devices } from '@playwright/test';

const PORT = 5174;
const AVEC_SW = /(hors-ligne|mise-a-jour)\.spec\.js/;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30000,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: `http://127.0.0.1:${PORT}`, locale: 'fr-FR', timezoneId: 'Europe/Paris', trace: 'retain-on-failure' },
  webServer: {
    command: 'node scripts/serve.mjs',
    env: { E2E: '1', PORT: String(PORT) },
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: false,
  },
  projects: [
    { name: 'iphone', use: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }, testIgnore: AVEC_SW },
    {
      name: 'chromium-sw',
      use: { ...devices['Pixel 7'] },
      testMatch: AVEC_SW,
    },
  ],
});
