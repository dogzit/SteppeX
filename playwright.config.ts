import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'e2e', timeout: 90000, retries: 0,
  use: { baseURL: 'http://localhost:4173', viewport: { width: 1440, height: 900 }, colorScheme: 'dark' },
  webServer: { command: 'npm run preview -- --port 4173 --strictPort', port: 4173, reuseExistingServer: true, timeout: 60000 },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
