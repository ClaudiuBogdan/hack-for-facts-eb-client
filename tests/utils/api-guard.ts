/**
 * API guard (TEST-001): an integration test never reads the live API.
 *
 * An auto fixture routes, on the browser context, every request the browser sends to the API: anything to the
 * browser's API origin (`VITE_API_URL`, or `API_URL`, as `src/config/env.ts` reads them) and the GraphQL paths
 * on any origin (`/api/v1/graphql`, the app's own same-origin proxy included, and the legacy `/graphql`). A page
 * navigation counts only when it goes to the API's origin. The server render's reads are not the browser's: the
 * ssr-api fixture origin answers those (TEST-001, client-dev-polish).
 *
 * Context routes run after every page route, and this one is registered first, so it only sees what no mock
 * answered: an operation `mockGraphQL` has no fixture for, a test's own route that fell back, or a test with no
 * mock at all.
 *
 * In CI's mock mode the request is aborted and the test fails, naming each request. The check runs after the
 * test's pages are closed, so a read the page starts as the test ends is counted too. Known and left: a test the
 * guard fails has no accessibility snapshot of its page in the report (the page is closed by then); the guard's
 * error names the requests. Locally each request is printed and goes out, so a spec can still be written against
 * the live API on purpose.
 *
 * Specs import `test` from `integration-base` (which builds on this) or, when they must not have its stored
 * consent, from here.
 */

import { test as base, type Request } from '@playwright/test'

// The browser's API. `INTERNAL_API_URL` is the server render's (the browser never reads it, and in the
// integration steps it may be the local ssr-api fixture origin), so it is not the guard's to watch.
const API_ORIGIN = (() => {
  // A blank value is unset, as src/config/env.ts reads it.
  const value = process.env.VITE_API_URL?.trim() || process.env.API_URL?.trim()
  try {
    return value ? new URL(value).origin : null
  } catch {
    return null
  }
})()

const GRAPHQL_PATHS = new Set(['/api/v1/graphql', '/graphql'])

export function isApiRequest(url: URL): boolean {
  return url.origin === API_ORIGIN || GRAPHQL_PATHS.has(url.pathname)
}

function describe(request: Request): string {
  const operation = /\b(?:query|mutation)\s+(\w+)/.exec(request.postData() ?? '')?.[1]
  return `${request.method()} ${request.url().split('?')[0]}${operation ? ` ${operation}` : ''}`
}

export const test = base.extend<{ apiGuard: void }>({
  apiGuard: [
    async ({ context }, use, testInfo) => {
      const failing = Boolean(process.env.CI) && (process.env.E2E_MODE ?? 'mock') === 'mock'
      const unrouted: string[] = []
      await context.route(isApiRequest, async (route) => {
        const request = route.request()
        // A page navigation on the app's origin is not a read (an app page may end in /graphql); one to the API's is.
        if (request.isNavigationRequest() && new URL(request.url()).origin !== API_ORIGIN) return route.fallback()
        const line = describe(request)
        unrouted.push(line)
        // The title path starts with the spec file's path: the line names the spec and the test.
        console.warn(`[api-guard] no mock: ${line} (${testInfo.titlePath.join(' › ')})`)
        if (failing) return route.abort('blockedbyclient')
        return route.fallback()
      })
      await use()
      // Playwright closes the pages with the context, after this fixture; close them first, so nothing the
      // page still had in flight arrives after the check.
      await Promise.all(context.pages().map((page) => page.close()))
      if (failing && unrouted.length > 0) {
        throw new Error(
          `The browser asked the API ${unrouted.length} time(s) with no mock to answer (TEST-001): ` +
            `mock each read (mockApi.mockGraphQL, mockApi.mockRoute or page.route).\n${[...new Set(unrouted)].map((line) => `  - ${line}`).join('\n')}`,
        )
      }
    },
    { auto: true },
  ],
})

export { expect } from '@playwright/test'
