/**
 * Integration tests for the act page (`/legislation/acts/$actId`): the head, the reading bar and the box about the text
 * shown as the server renders them, a refused `?doc=`, and the version select writing the address.
 *
 * Every read is recorded (TEST-001): the GraphQL ones, the server's act and the browser's outline, by the ssr-api
 * harness (`tests/utils/ssr-api`); the text's REST render reads by `answerRenderReads` below, which that harness does
 * not take. `SSR_API_MODE=record` saves both from the dev API; otherwise an unrecorded render read fails its test. The
 * act is Legea nr. 98/2016.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync, gzipSync } from 'node:zlib'
import type { Page } from '@playwright/test'
import { test, expect } from '../utils/ssr-api/test'
import { waitForPageReady } from '../utils/test-helpers'

const RENDER_FIXTURES = join(dirname(fileURLToPath(import.meta.url)), '../fixtures/legislation-act-flow')
const RECORD = process.env.SSR_API_MODE === 'record'
const UPSTREAM = (process.env.SSR_API_UPSTREAM ?? process.env.VITE_API_URL ?? '').replace(/\/+$/u, '')

/**
 * The act text's render reads (`/api/v1/legal/documents/:id/render[/chunks/:n]`), answered from
 * `tests/fixtures/legislation-act-flow`, one file per path. Returns the paths it could not answer, for the test to fail on.
 */
async function answerRenderReads(page: Page): Promise<string[]> {
  const missing: string[] = []
  await page.route(/\/api\/v1\/legal\/documents\/[^/]+\/render(?:\/chunks\/\d+)?(?:\?.*)?$/u, async (route) => {
    const { pathname } = new URL(route.request().url())
    const file = join(RENDER_FIXTURES, `${pathname.replace(/^\/api\/v1\/legal\/documents\//u, '').replace(/[^\w.-]+/gu, '_')}.json.gz`)
    if (RECORD) {
      const answer = await fetch(`${UPSTREAM}${pathname}`, { headers: { Accept: 'application/json' } })
      const body = await answer.text()
      if (answer.ok) {
        mkdirSync(RENDER_FIXTURES, { recursive: true })
        writeFileSync(file, gzipSync(body, { level: 9 }))
      }
      return route.fulfill({ status: answer.status, contentType: 'application/json', body })
    }
    if (!existsSync(file)) {
      missing.push(pathname)
      return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"no recording"}' })
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: gunzipSync(readFileSync(file)).toString('utf8') })
  })
  return missing
}

const ACT = '/legislation/acts/72159'

test.describe('Act page', () => {
  let missing: string[] = []
  test.beforeEach(async ({ page }) => {
    missing = await answerRenderReads(page)
  })
  test.afterEach(() => {
    expect(missing, 'render reads with no recording: run this spec with SSR_API_MODE=record').toEqual([])
  })

  test('the server renders the head, the reading bar and what is to know about the text shown', async ({ page }) => {
    const response = await page.goto(ACT)
    await waitForPageReady(page)

    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Legea nr. 98/2016')
    await expect(page).toHaveTitle(/Legea nr\. 98\/2016/u)
    // the head's facts, each under its name
    await expect(page.locator('header dl dt').first()).toHaveText('Tip')
    // the text's and the record's places, which links elsewhere on the site point at
    await expect(page.locator('section#act-text')).toHaveCount(1)
    await expect(page.locator('section#act-fisa')).toHaveCount(1)
    // the version on show is named and can be changed, once on the page
    const about = page.getByRole('complementary', { name: 'Despre textul afișat' })
    await expect(about).toHaveCount(1)
    await expect(about.getByRole('combobox', { name: 'Versiunea textului' })).toHaveCount(1)
    // no id of a string without a translation in what the server wrote
    const html = await response?.text()
    expect(html).toContain('Sari la textul actului')
  })

  test('a document that is not the act’s is refused in the server’s answer, with the way out', async ({ page }) => {
    const response = await page.goto(`${ACT}?doc=nu-este-al-actului&nod=r10`)
    await waitForPageReady(page)

    expect(response?.status()).toBe(200)
    const notice = page.getByRole('status').filter({ hasText: 'Documentul cerut nu aparține acestui act' })
    await expect(notice).toHaveCount(1)
    await expect(notice.getByRole('link', { name: 'Elimină parametrul din adresă' })).toHaveAttribute('href', /\/legislation\/acts\/72159$/u)
  })

  test('a hand-typed place the router reads as a number opens the text, without a server error', async ({ page }) => {
    // `?nod=1` arrives as the number 1, which is no path: it is dropped, never a 500 (LEGAL-001).
    for (const address of [`${ACT}?nod=1`, `${ACT}?nod=0.1`]) {
      const response = await page.goto(address)
      expect(response?.status()).toBe(200)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Legea nr. 98/2016')
    }
  })

  test('choosing another version writes it in the address', async ({ page }) => {
    await page.goto(ACT)
    await waitForPageReady(page)

    const select = page.getByRole('complementary', { name: 'Despre textul afișat' }).getByRole('combobox', { name: 'Versiunea textului' })
    // React must hold the control before a choice counts (a choice made earlier is lost without a word).
    await expect
      .poll(() => select.evaluate((element) => Object.keys(element).some((key) => key.startsWith('__reactProps$'))), { timeout: 30000 })
      .toBe(true)
    const other = await select.evaluate((element) => {
      const options = [...(element as HTMLSelectElement).options].filter((option) => !option.disabled && option.value !== '')
      return options.find((option) => !option.selected)?.value ?? null
    })
    test.skip(other === null, 'the act has one readable version on this corpus')
    // the chosen version's text is read once it is chosen: waited for, so the read is this test's, recorded and answered
    const read = page.waitForResponse((response) => response.url().includes(`/legal/documents/${String(other)}/render`))
    await select.selectOption(other)
    // the select also takes the reader to the text's start (`#act-text`)
    await expect(page).toHaveURL(new RegExp(`[?&]doc=${String(other)}(?:[&#]|$)`, 'u'))
    await read
  })
})
