/**
 * E2E Test Base
 *
 * Simple E2E testing with three modes:
 *
 * - `live` (default): Real API calls, no interception
 * - `record`: Real API calls + save responses to snapshots
 * - `replay`: Use saved snapshots as mock responses (fast, reliable)
 *
 * Usage:
 *   yarn test:e2e                  # Live API
 *   yarn test:e2e:snapshot:update  # Record snapshots from live API
 *   yarn test:e2e:snapshot         # Replay from snapshots
 *
 * Best Practice: Test against historical data (e.g., year=2023) that won't change.
 */

import { test as base, expect } from '@playwright/test'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const SNAPSHOTS_DIR = join(__dirname, '../snapshots')

type E2EMode = 'live' | 'record' | 'replay'

function getMode(): E2EMode {
  const mode = process.env.E2E_MODE || 'live'
  if (!['live', 'record', 'replay'].includes(mode)) {
    throw new Error(`Invalid E2E_MODE: ${mode}. Use live|record|replay`)
  }
  return mode as E2EMode
}

/**
 * Extract operation name from GraphQL query string.
 */
function extractOperationName(query: string): string | undefined {
  const match = query.match(/(?:query|mutation|subscription)\s+(\w+)/)
  return match?.[1]
}

/**
 * Create a stable, filesystem-safe key from URL or operation
 */
function sanitizeKey(key: string): string {
  return key
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 150)
}

export interface E2EFixture {
  /** Current mode: live, record, or replay */
  mode: E2EMode
}

export const test = base.extend<{ e2e: E2EFixture }>({
  e2e: async ({ page }, provide, testInfo) => {
    const mode = getMode()

    // Derive test name for snapshot organization
    const testFile = testInfo.file
    const fileName = testFile.split('/').pop() || ''
    const testName = fileName.replace('.spec.ts', '').replace('.test.ts', '')

    const snapshotDir = join(SNAPSHOTS_DIR, testName)

    // Track recorded responses for saving
    const recorded: Map<string, unknown> = new Map()

    // Only set up route interception for record/replay modes
    if (mode !== 'live') {
      await page.route('**/graphql', async (route) => {
        const request = route.request()

        if (request.method() !== 'POST') {
          return route.fallback()
        }

        let body: { operationName?: string; query: string; variables?: Record<string, unknown> }
        try {
          body = JSON.parse(request.postData() || '{}')
        } catch {
          return route.fallback()
        }

        const operationName = body.operationName || extractOperationName(body.query) || 'unknown'
        const variables = body.variables || {}

        // Create a unique key for this request
        const varsKey = Object.keys(variables).length > 0
          ? `-${sanitizeKey(JSON.stringify(variables))}`
          : ''
        const snapshotKey = `${sanitizeKey(operationName)}${varsKey}`
        const snapshotPath = join(snapshotDir, `${snapshotKey}.json`)

        if (mode === 'replay') {
          // Load and return snapshot
          try {
            const content = await readFile(snapshotPath, 'utf-8')
            const data = JSON.parse(content)
            return route.fulfill({
              status: 200,
              headers: { 'content-type': 'application/json' },
              json: data,
            })
          } catch {
            console.warn(`[e2e:replay] Snapshot not found: ${snapshotPath}`)
            console.warn(`[e2e:replay] Run 'yarn test:e2e:snapshot:update' to create it`)
            return route.fallback()
          }
        }

        if (mode === 'record') {
          // Fetch real response and save
          const response = await route.fetch()
          const contentType = response.headers()['content-type'] || ''

          if (contentType.includes('application/json')) {
            try {
              const json = await response.json()
              recorded.set(snapshotPath, json)
              console.log(`[e2e:record] Captured: ${operationName}`)
            } catch {
              // Ignore parse errors
            }
          }

          return route.fulfill({ response })
        }

        return route.fallback()
      })
    }

    // Provide fixture to test
    await provide({ mode })

    // Save recorded snapshots on teardown
    if (mode === 'record' && recorded.size > 0) {
      await mkdir(snapshotDir, { recursive: true })

      for (const [path, data] of recorded.entries()) {
        await writeFile(path, JSON.stringify(data, null, 2))
        console.log(`[e2e:record] Saved: ${path}`)
      }
    }
  },
})

export { expect }
