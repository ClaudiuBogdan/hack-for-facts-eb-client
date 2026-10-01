/**
 * The NGO pages' first-release paths: `/ong-uri/*`
 *
 * Route: /ong-uri, /ong-uri/$cui, /ong-uri/registru,
 *        /ong-uri/servicii, /ong-uri/sursa/$snapshotId
 * Focus: each answers with one permanent redirect to its `/ngos` page, its
 * parameters and search carried over — no temporary hop before or after it.
 */

import { test, expect } from '../utils/integration-base'

const OLD_PATHS: readonly (readonly [string, string])[] = [
  ['/ong-uri?indicator=total', '/ngos?indicator=total'],
  ['/ong-uri/3151288?lang=en', '/ngos/3151288?lang=en'],
  ['/ong-uri/registru?q=salvati', '/ngos/registry?q=salvati'],
  ['/ong-uri/sursa/anofm_rueis_2026_06_20', '/ngos/sources/anofm_rueis_2026_06_20'],
]

for (const [from, to] of OLD_PATHS) {
  test(`GET ${from} is a single 301 to ${to}`, async ({ request, baseURL }) => {
    const response = await request.get(from, { maxRedirects: 0 })
    expect(response.status()).toBe(301)
    expect(new URL(response.headers().location ?? '', baseURL).href).toBe(new URL(to, baseURL).href)
  })
}

test('GET /ong-uri/servicii is a single 301 to the services page, its defaults filled in', async ({ request, baseURL }) => {
  const response = await request.get('/ong-uri/servicii', { maxRedirects: 0 })
  expect(response.status()).toBe(301)
  const location = new URL(response.headers().location ?? '', baseURL)
  expect(location.pathname).toBe('/ngos/services')
  // Already the page's own search: the target answers without a redirect of its own.
  const target = await request.get(location.pathname + location.search, { maxRedirects: 0 })
  expect(target.status()).toBe(200)
})
