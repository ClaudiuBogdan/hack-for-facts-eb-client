/**
 * The legislation pages the owner retired on 27 November 2026 (Acte, Monitorul Oficial, Ghid): their links forward
 * for good, on the server, before any read. Acte links go to the search with their filters in its keys; the gazette
 * and guide links go to the hub. The language of the address goes along.
 */

import { test, expect } from '../utils/integration-base'

test.describe('Retired legislation pages', () => {
  test('an Acte link forwards to the search with its filters and its language', async ({ request }) => {
    const response = await request.get('/legislation/acts?status=abrogat&actType=lege&lang=en', { maxRedirects: 0 })
    expect(response.status()).toBe(301)
    const location = new URL(response.headers()['location'] ?? '', 'http://localhost')
    expect(location.pathname).toBe('/legislation/search')
    expect(location.searchParams.get('stare')).toBe('abrogat')
    expect(location.searchParams.get('tip')).toBe('lege')
    expect(location.searchParams.get('lang')).toBe('en')
  })

  test('a bare Acte link forwards to the acts in force', async ({ request }) => {
    const response = await request.get('/legislation/acts', { maxRedirects: 0 })
    expect(response.status()).toBe(301)
    const location = new URL(response.headers()['location'] ?? '', 'http://localhost')
    expect(location.pathname).toBe('/legislation/search')
    expect(location.searchParams.get('stare')).toBe('in-vigoare')
  })

  for (const page of ['gazette?year=2010&part=PI', 'guide']) {
    test(`/legislation/${page} forwards to the hub`, async ({ request }) => {
      const response = await request.get(`/legislation/${page}`, { maxRedirects: 0 })
      expect(response.status()).toBe(301)
      const location = new URL(response.headers()['location'] ?? '', 'http://localhost')
      expect(location.pathname).toBe('/legislation')
      expect(location.search).toBe('')
    })
  }
})
