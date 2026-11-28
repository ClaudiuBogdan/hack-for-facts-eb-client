import { defineConfig, devices } from '@playwright/test'

// Overridable so local runs can dodge whatever else squats on :3000
// (default unchanged for CI).
const APP_PORT = Number(process.env.PLAYWRIGHT_APP_PORT ?? 3000)

// The API the app's server render reads (TEST-001, tests/utils/ssr-api/server.mjs): recorded fixtures, the rest passed
// to VITE_API_URL and logged. Not for live runs, and an INTERNAL_API_URL the environment sets (CI's statistics step)
// is kept.
const SSR_API_PORT = Number(process.env.PLAYWRIGHT_SSR_API_PORT ?? 3199)
const LIVE = process.env.E2E_MODE === 'live' || process.env.E2E_MODE === 'record'
const INTERNAL_API_URL = process.env.INTERNAL_API_URL ?? (LIVE ? undefined : `http://127.0.0.1:${SSR_API_PORT}`)

// A deployed site for the live E2E (the nightly reads the dev site): its address, and no local server built or
// started. A local build cannot read the dev API from the browser, which allows only the dev site's own origin.
// Live runs only: the mocked suites need the local server and its recorded API.
const E2E_BASE_URL = process.env.E2E_BASE_URL ? new URL(process.env.E2E_BASE_URL).origin : undefined
if (E2E_BASE_URL && !LIVE) throw new Error('E2E_BASE_URL is for live runs: set E2E_MODE=live (or record) with it')

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
    baseURL: E2E_BASE_URL ?? `http://localhost:${APP_PORT}`,
    trace: 'on-first-retry',
    video: 'on-first-retry',
  },
  // A deployed site serves the live suite alone: the mocked one needs the local server the override drops.
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
  ].filter((project) => !E2E_BASE_URL || project.name === 'e2e'),
  webServer: E2E_BASE_URL ? undefined : [
    {
      command: 'node tests/utils/ssr-api/server.mjs',
      url: `http://127.0.0.1:${SSR_API_PORT}/__ssr-api/health`,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      timeout: 30000,
    },
    {
      command: `yarn build && PORT=${APP_PORT}${INTERNAL_API_URL ? ` INTERNAL_API_URL=${INTERNAL_API_URL}` : ''} yarn start`,
      url: `http://localhost:${APP_PORT}`,
      reuseExistingServer: !process.env.CI,
      // yarn build alone runs several minutes; 120s guaranteed a dead run.
      timeout: 420000,
    },
  ],
})
