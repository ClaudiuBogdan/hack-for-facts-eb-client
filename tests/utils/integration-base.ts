/**
 * Integration Test Base
 *
 * Extended Playwright test with GraphQL mocking capabilities.
 * Used for fast, isolated UI tests with mocked API responses.
 *
 * Supports three modes:
 * - mock: Use JSON fixtures (default, fast)
 * - live: Pass through to real API (for verification)
 * - record: Fetch from real API and save as fixtures
 */

import { test as base } from '@playwright/test'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import type {
  Mode,
  MockRouteOptions,
  GraphQLMockOptions,
  MockApiFixture,
  GraphQLRequestBody,
} from './types'

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function getMode(): Mode {
  const mode = process.env.E2E_MODE || 'mock'
  if (!['mock', 'live', 'record'].includes(mode)) {
    throw new Error(`Invalid E2E_MODE: ${mode}. Use mock|live|record`)
  }
  return mode as Mode
}

/**
 * Extract operation name from GraphQL query string.
 * Handles: query GetData, mutation CreateItem, subscription OnUpdate
 */
function extractOperationName(query: string): string | undefined {
  const match = query.match(/(?:query|mutation|subscription)\s+(\w+)/)
  return match?.[1]
}

/**
 * Check if request variables match the expected variables (partial matching)
 */
function variablesMatch(
  requestVars: Record<string, unknown> | undefined,
  expectedVars: Record<string, unknown> | undefined
): boolean {
  if (!expectedVars) return true
  if (!requestVars) return false

  for (const [key, value] of Object.entries(expectedVars)) {
    if (JSON.stringify(requestVars[key]) !== JSON.stringify(value)) {
      return false
    }
  }
  return true
}

/**
 * Generate a unique key for a GraphQL operation with variables
 */
function getOperationKey(
  operationName: string,
  variables?: Record<string, unknown>
): string {
  if (!variables || Object.keys(variables).length === 0) {
    return operationName
  }
  // Create a stable key from sorted variable keys
  const sortedVars = Object.keys(variables)
    .sort()
    .map((k) => `${k}=${JSON.stringify(variables[k])}`)
    .join('&')
  return `${operationName}?${sortedVars}`
}

/**
 * Default cookie consent to dismiss the banner in tests
 */
const DEFAULT_COOKIE_CONSENT = {
  version: 1,
  essential: true,
  analytics: false,
  sentry: false,
  updatedAt: new Date().toISOString(),
}

export const test = base.extend<{ mockApi: MockApiFixture }>({
  mockApi: async ({ page }, provide, testInfo) => {
    const mode = getMode()

    // Set cookie consent in localStorage before page loads to dismiss the banner
    await page.addInitScript((consent) => {
      window.localStorage.setItem('cookie-consent', JSON.stringify(consent))
    }, DEFAULT_COOKIE_CONSENT)

    // Derive flow name from test file path for fixture organization
    // e.g., tests/flows/entity-exploration.spec.ts -> entity-exploration-flow
    const testFile = testInfo.file
    const fileName = testFile.split('/').pop() || ''
    const flowName = fileName
      .replace('.spec.ts', '-flow')
      .replace('.test.ts', '-flow')
      .replace(/[^a-z0-9-]/gi, '-')
      .toLowerCase()

    // Track registered GraphQL mocks
    interface GraphQLMock {
      operationName: string
      fixtures: string[]
      fixtureData: unknown[]
      options: GraphQLMockOptions
      callCount: number
    }
    const graphqlMocks: GraphQLMock[] = []

    // Track recorded data for record mode
    const recordedData: Map<string, unknown[]> = new Map()

    // Flag to track if GraphQL route is set up
    let graphqlRouteSetup = false

    /**
     * Resolve fixture path
     * - 'entities' -> tests/fixtures/{flow}/entities.json
     * - 'shared/app-config' -> tests/fixtures/shared/app-config.json
     */
    const getFixturePath = (fixtureName: string): string => {
      if (fixtureName.startsWith('shared/')) {
        const name = fixtureName.replace('shared/', '')
        return join(__dirname, '../fixtures/shared', `${name}.json`)
      }
      return join(__dirname, '../fixtures', flowName, `${fixtureName}.json`)
    }

    /**
     * Load fixture data from JSON file
     */
    const loadFixture = async (fixtureName: string): Promise<unknown | null> => {
      const fixturePath = getFixturePath(fixtureName)
      try {
        const content = await readFile(fixturePath, 'utf-8')
        return JSON.parse(content)
      } catch {
        console.warn(`[mockApi] Fixture not found: ${fixturePath}`)
        return null
      }
    }

    /**
     * Set up the GraphQL route handler (only once)
     */
    const setupGraphQLRoute = async () => {
      if (graphqlRouteSetup) return
      graphqlRouteSetup = true

      // Match any GraphQL endpoint
      await page.route('**/graphql', async (route) => {
        const request = route.request()

        // Only handle POST requests to GraphQL
        if (request.method() !== 'POST') {
          return route.fallback()
        }

        let body: GraphQLRequestBody
        try {
          body = JSON.parse(request.postData() || '{}')
        } catch {
          return route.fallback()
        }

        // Extract operation name from body or from query string
        const operationName = body.operationName || extractOperationName(body.query)
        const { variables } = body

        // LIVE MODE: Pass through
        if (mode === 'live') {
          return route.fallback()
        }

        // Find matching mock (most specific first - with variables)
        const mock = graphqlMocks.find(
          (m) =>
            m.operationName === operationName &&
            variablesMatch(variables, m.options.variables)
        )

        // MOCK MODE: Return fixture
        if (mode === 'mock') {
          if (!mock || mock.fixtureData.length === 0) {
            console.warn(
              `[mockApi] No mock found for operation: ${operationName}`,
              variables ? `with variables: ${JSON.stringify(variables)}` : ''
            )
            return route.fallback()
          }

          // Get fixture for this call (queue-based)
          const dataIndex = Math.min(mock.callCount, mock.fixtureData.length - 1)
          const graphqlResponse = mock.fixtureData[dataIndex]
          mock.callCount++

          // Optional delay
          if (mock.options.delay && mock.options.delay > 0) {
            await new Promise((resolve) => setTimeout(resolve, mock.options.delay))
          }

          // Wrap fixture data in GraphQL response format { data: ... }

          return route.fulfill({
            status: mock.options.status || 200,
            headers: {
              'content-type': 'application/json',
              ...mock.options.headers,
            },
            json: graphqlResponse,
          })
        }

        // RECORD MODE: Fetch real response and save
        if (mode === 'record') {
          const response = await route.fetch()
          const contentType = response.headers()['content-type'] || ''

          if (contentType.includes('application/json')) {
            try {
              const json = await response.json()
              const opName = operationName || 'unknown-operation'
              const recordKey = getOperationKey(opName, variables)

              if (!recordedData.has(recordKey)) {
                recordedData.set(recordKey, [])
              }
              recordedData.get(recordKey)!.push(json)

              console.log(`[mockApi] Recorded: ${recordKey}`)
            } catch {
              console.warn(`[mockApi] Failed to parse JSON for ${operationName}`)
            }
          }

          return route.fulfill({ response })
        }
      })
    }

    /**
     * Mock a GraphQL operation
     */
    const mockGraphQL = async (
      operationName: string,
      fixture: string | string[],
      options: GraphQLMockOptions = {}
    ): Promise<void> => {
      const fixtures = Array.isArray(fixture) ? fixture : [fixture]

      // In live mode, just return
      if (mode === 'live') return

      // Set up the route handler if not already done
      await setupGraphQLRoute()

      // Load fixtures in mock mode
      const fixtureData: unknown[] = []
      if (mode === 'mock') {
        for (const f of fixtures) {
          const data = await loadFixture(f)
          if (data !== null) {
            fixtureData.push(data)
          }
        }

        if (fixtureData.length === 0) {
          console.warn(
            `[mockApi] No fixtures loaded for ${operationName}. ` +
            `Expected: ${fixtures.map((f) => getFixturePath(f)).join(', ')}`
          )
        }
      }

      // Register the mock
      graphqlMocks.push({
        operationName,
        fixtures,
        fixtureData,
        options: { method: 'POST', status: 200, ...options },
        callCount: 0,
      })
    }

    /**
     * Mock a REST route (for non-GraphQL endpoints)
     */
    const mockRoute = async (
      pattern: string,
      fixture: string | string[],
      options: MockRouteOptions = {}
    ): Promise<void> => {
      const { method = 'GET', status = 200, headers = {}, delay = 0 } = options
      const fixtures = Array.isArray(fixture) ? fixture : [fixture]

      // In live mode, just return
      if (mode === 'live') return

      // Load fixtures in mock mode
      const fixtureData: unknown[] = []
      if (mode === 'mock') {
        for (const f of fixtures) {
          const data = await loadFixture(f)
          if (data !== null) {
            fixtureData.push(data)
          }
        }

        if (fixtureData.length === 0) {
          console.warn(`[mockApi] No fixtures loaded for ${pattern}`)
          return
        }
      }

      let callCount = 0

      await page.route(pattern, async (route) => {
        // Filter by HTTP method
        if (method !== '*' && route.request().method() !== method) {
          return route.fallback()
        }

        if (mode === 'mock') {
          const dataIndex = Math.min(callCount, fixtureData.length - 1)
          const data = fixtureData[dataIndex]
          callCount++

          if (delay > 0) {
            await new Promise((resolve) => setTimeout(resolve, delay))
          }

          return route.fulfill({
            status,
            headers: { 'content-type': 'application/json', ...headers },
            json: data,
          })
        }

        if (mode === 'record') {
          const response = await route.fetch()
          const contentType = response.headers()['content-type'] || ''

          if (contentType.includes('application/json')) {
            try {
              const json = await response.json()
              const recordKey = `rest:${pattern}`

              if (!recordedData.has(recordKey)) {
                recordedData.set(recordKey, [])
              }
              recordedData.get(recordKey)!.push(json)

              console.log(`[mockApi] Recorded REST: ${recordKey}`)
            } catch {
              console.warn(`[mockApi] Failed to parse JSON for ${pattern}`)
            }
          }

          return route.fulfill({ response })
        }
      })
    }

    // Provide the fixture to tests
    await provide({ mode, mockGraphQL, mockRoute })

    // TEARDOWN: Save recorded fixtures
    if (mode === 'record' && recordedData.size > 0) {
      const fixturesDir = join(__dirname, '../fixtures', flowName)
      await mkdir(fixturesDir, { recursive: true })

      for (const [key, dataArray] of recordedData.entries()) {
        // Sanitize key for filename
        const sanitizedKey = key
          .replace(/[^a-z0-9]/gi, '-')
          .toLowerCase()
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')

        const fixturePath = join(fixturesDir, `${sanitizedKey}.json`)

        // Save last recorded response
        const data = dataArray[dataArray.length - 1]
        await writeFile(fixturePath, JSON.stringify(data, null, 2))

        console.log(`[mockApi] Saved: ${fixturePath}`)
      }
    }
  },
})

export { expect } from '@playwright/test'
