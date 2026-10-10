import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  use: { baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:4173', channel: 'chrome', headless: true, locale: 'tr-TR' },
  webServer: process.env.E2E_BASE_URL ? undefined : { command: 'npx vite preview --port 4173 --strictPort', url: 'http://localhost:4173', reuseExistingServer: true, timeout: 60_000 },
  reporter: [['list']],
})
