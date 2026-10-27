import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  use: { baseURL: process.env.BASE_URL || 'http://localhost:3000' },
  webServer: process.env.BASE_URL
    ? undefined
    : { command: 'npm run build && npm start', url: 'http://localhost:3000', timeout: 180_000, reuseExistingServer: !process.env.CI },
});
