import { describe, expect, it, vi } from 'vitest'
import { i18n } from '@lingui/core'
import { ECHR_DEFAULT_QUESTION } from './echr-address'
import { ECHR_SNAPSHOT } from './echr-snapshot'
import { countryName, decisionsCount, echrDocumentTitle, echrNotes, judgmentsCount, medianWaitText, moreApplicationsText, yearsCount, yearText } from './echr-text'

// The page's language, pinned: the test environment activates none.
vi.mock('@/lib/utils', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils')>()), getUserLocale: () => 'ro' }))

describe('the ECHR page’s words', () => {
  it('names the years the capture holds in part, and the one it stops in', () => {
    expect(yearText(ECHR_SNAPSHOT, 2009)).toBe('2009 (parțial)')
    expect(yearText(ECHR_SNAPSHOT, 2018)).toBe('2018')
    expect(yearText(ECHR_SNAPSHOT, 2026)).toBe('2026 (până în iulie 2026)')
  })

  it('counts in Romanian: „de" from twenty up, and not after 101–119', () => {
    expect(yearsCount(1)).toBe('1 an')
    expect(yearsCount(6)).toBe('6 ani')
    expect(yearsCount(21)).toBe('21 de ani')
    expect(moreApplicationsText(1)).toBe('+1 cerere')
    expect(moreApplicationsText(80)).toBe('+80 de cereri')
    expect(decisionsCount(114)).toBe('114 decizii')
    expect(decisionsCount(125)).toBe('125 de decizii')
    expect(judgmentsCount(96)).toBe('96 de hotărâri')
  })

  it('draws a median wait whole or with its half, never rounded away', () => {
    expect(medianWaitText(6)).toBe('6')
    expect(medianWaitText(6.5)).toBe('6,5')
  })

  it('names every other state a judgment in the snapshot is against', () => {
    const codes = new Set(ECHR_SNAPSHOT.judgments.flatMap((judgment) => judgment.alsoAgainst ?? []))
    expect(codes.size).toBeGreaterThan(0)
    for (const code of codes) expect(countryName(code)).not.toBe(code)
  })

  it('says what holds for every year, and the running year’s cutoff only in it', () => {
    const notes = echrNotes(ECHR_SNAPSHOT, 2025)
    expect(notes).toHaveLength(6)
    expect(notes.join(' ')).toContain('O cerere e numărată o dată, în anul primei ei hotărâri de aici. Hotărârile ulterioare, în cauze deja judecate (96 de hotărâri)')
    expect(notes.join(' ')).toContain('Numele reclamanților nu sunt preluate')
    expect(notes.join(' ')).toContain('2009 e preluat parțial (153 din 168)')
    const running = echrNotes(ECHR_SNAPSHOT, 2026)
    expect(running).toHaveLength(7)
    expect(running[6]).toContain('16 iulie 2026')
  })

  it('titles the browser tab with the page for the bare question, the year’s headline for another', () => {
    expect(echrDocumentTitle(i18n, ECHR_DEFAULT_QUESTION)).toMatch(/^Hotărârile CEDO în cauze cu România — /u)
    expect(echrDocumentTitle(i18n, { year: 2018, view: 'ani' })).toMatch(/^Hotărârile CEDO în cauze cu România, în 2018 — /u)
    expect(echrDocumentTitle(i18n, { ...ECHR_DEFAULT_QUESTION, view: 'hotarari' })).toMatch(/, în 2025 — /u)
  })
})
