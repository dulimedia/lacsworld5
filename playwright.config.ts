import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'ui-auditor/tests',
  timeout: 45_000,
  use: {
    headless: true,
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
  },
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'ui-auditor/report' }]
  ],
});
