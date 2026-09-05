/**
 * Local-only prototyping surface: `/development/*`
 *
 * Route: /development, /development/$
 * Focus: the surface must not exist in a production build.
 *
 * These run against the production build (`playwright.config.ts` builds and
 * serves it), which is the shape every deployed environment ships. Under
 * `yarn dev` the same URLs answer 200 — that is the point of the surface.
 *
 * See `docs/design/prototyping.md`.
 */

import { test, expect } from '../utils/integration-base'
import { waitForPageReady } from '../utils/test-helpers'

const PATHS = [
  '/development',
  '/development/_example/hello?v=dense',
  '/development/anything/else',
]

for (const path of PATHS) {
  test(`GET ${path} is not found in a production build`, async ({ request }) => {
    const response = await request.get(path)
    expect(response.status()).toBe(404)
  })
}

test('client-side navigation into /development loads no development code', async ({
  page,
}) => {
  const developmentRequests: string[] = []
  page.on('request', (request) => {
    if (/prototype|harness/i.test(request.url())) developmentRequests.push(request.url())
  })

  await page.goto('/')
  await waitForPageReady(page)

  // An in-app navigation through `beforeLoad`, not a document load: TanStack's
  // browser history subscribes to `popstate`.
  await page.evaluate(() => {
    window.history.pushState(null, '', '/development/_example/hello?v=dense')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })

  // The guard is what matters; the not-found copy is locale-dependent, so assert
  // on the absence of the surface rather than on its wording.
  await expect(page.locator('[data-dev-marker]')).toHaveCount(0)
  expect(developmentRequests).toEqual([])
})
