import { defineConfig, devices } from '@playwright/test'

// Overridable so local runs can dodge whatever else squats on :3000
// (default unchanged for CI).
const APP_PORT = Number(process.env.PLAYWRIGHT_APP_PORT ?? 3000)

/**
 * Playwright Configuration
 *
 * Test Types:
 * - Integration: Fast tests with mocked API (tests/integration/)
 * - E2E: Live API tests with snapshot validation (tests/e2e/)
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // Add 1 retry locally to handle server instability
  workers: process.env.CI ? 1 : 2, // Reduce workers to avoid overwhelming the dev server
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    trace: 'on-first-retry',
    video: 'on-first-retry',
  },
  projects: [
    // Integration tests (mocked API, fast)
    // Use tablet viewport (below md breakpoint 768px) to hide sidebar and avoid overlap issues
    {
      name: 'integration',
      testDir: './tests/integration',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
      timeout: 60000,
    },
    // E2E tests (live API, slower)
    {
      name: 'e2e',
      testDir: './tests/e2e',
      use: { ...devices['Desktop Chrome'] },
      timeout: 60000, // Longer timeout for live API
    },
  ],
  webServer: {
    command: `yarn build && PORT=${APP_PORT} yarn start`,
    url: `http://localhost:${APP_PORT}`,
    reuseExistingServer: !process.env.CI,
    // yarn build alone runs several minutes; 120s guaranteed a dead run.
    timeout: 420000,
  },
})
