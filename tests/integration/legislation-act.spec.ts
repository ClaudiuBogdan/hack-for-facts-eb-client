/**
 * Integration tests for the act page (`/legislation/acts/$actId`) against the
 * live API: the head, the reading bar and the box about the text shown as the
 * server renders them, a refused `?doc=`, and the version select writing the
 * address.
 *
 * Only what the server renders, and what the router does without a read, is
 * asserted: in CI the browser cannot read the dev API (its CORS preflight
 * answers 404), so the act's text, its contents and anything else read in the
 * browser are left to the unit tests in `src/features/legal/**`, which run on
 * recorded answers. The act is Legea nr. 98/2016, a law every reload of the
 * corpus holds.
 */

import { test, expect } from '../utils/integration-base'
import { waitForPageReady } from '../utils/test-helpers'

const ACT = '/legislation/acts/72159'

test.describe('Act page', () => {
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
    await select.selectOption(other)
    // the select also takes the reader to the text's start (`#act-text`)
    await expect(page).toHaveURL(new RegExp(`[?&]doc=${String(other)}(?:[&#]|$)`, 'u'))
  })
})
