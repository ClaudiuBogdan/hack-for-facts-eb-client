import { describe, expect, it } from 'vitest'

import { cellsOf } from '@/features/national-budget/analytics/lib/analytics-data'
import type { BudgetApprovedRecord, BudgetNationalCatalog, BudgetNationalSeries } from '@/schemas/national-budget-api'
import {
  ANAF_FIRST_YEAR,
  TOTAL_ITEMS,
  anafFilter,
  anafTotal,
  chaptersOf,
  defaultYear,
  lawEditionOf,
  previousView,
  readKey,
  siteKeys,
  unfinishedYearsOf,
  viewOfYear,
  yearTotalsOf,
  yearViews,
} from './home-data'
import { comparableWithAnaf } from '../hooks/use-home-data'
import { partsOfWhole } from '../hooks/use-whole-of'
import { authorityName, gdpNumber, gdpSizeText, restOf, shareNumber, shareOf } from './home-format'
import { cellsOutOfHundred, namedCount, squarify, toneOf, type Part } from './home-geometry'
import { lawChaptersOf, planTotalsInput, previousEdition } from './home-law'

/** A catalog as the API serves it, cut to what the page reads: coverage to July 2026, laws 2024 and 2025. */
const catalog = {
  snapshots: { approved: 'a1', execution: 'e1' },
  execution: {
    coverage: { firstMonth: '2006-01', lastMonth: '2026-07', missingMonths: ['2012-09', '2012-11', '2019-07', '2024-01', '2025-05'] },
    seriesItems: [],
  },
  approved: {
    editions: [
      { id: '2024:law', budgetYear: 2024 },
      { id: '2025:law', budgetYear: 2025 },
    ],
    totals: [],
  },
} as unknown as BudgetNationalCatalog

/**
 * A FULL_YEAR read of the three totals as the API serves it. 2008, 2011 and
 * 2013 carry the dev API's values (snapshot e1.a772b18006ed4f2ffec74bd4d1ccbe31);
 * 2012 stands for a year the bulletins don't finish and 2014 for a balance of
 * exactly zero (neither is the API's answer for those years).
 */
const yearsRead = (() => {
  const years: Record<string, { revenue: string; spending: string; balance: string } | { reason: string }> = {
    '2008': { revenue: '164466800000', spending: '189121700000', balance: '-24654900000' },
    '2011': { revenue: '181566900000', spending: '205403600000', balance: '-23836700000' },
    '2012': { reason: 'missing_selected_release' },
    // The bulletin's own balance: spending less revenue is 15.771,2 million; it prints 15.771,3.
    '2013': { revenue: '200045700000', spending: '215816900000', balance: '-15771300000' },
    '2014': { revenue: '100', spending: '100', balance: '0' },
  }
  const series = (itemId: string, key: 'revenue' | 'spending' | 'balance'): BudgetNationalSeries => ({
    item: { itemId },
    component: 'TOTAL',
    basis: 'FULL_YEAR',
    unit: 'RON',
    series: { data: Object.entries(years).flatMap(([date, year]) => ('reason' in year ? [] : [{ date, value: year[key] }])) },
    periods: Object.entries(years).map(([date, year]) => ({
      date,
      periodStart: `${date}-01-01`,
      periodEnd: `${date}-12-31`,
      status: 'reason' in year ? ('UNAVAILABLE' as const) : ('AVAILABLE' as const),
      reason: 'reason' in year ? year.reason : null,
      valueBasis: 'reason' in year ? null : ('REPORTED_CUMULATIVE' as const),
    })),
  })
  return [series(TOTAL_ITEMS.revenue, 'revenue'), series(TOTAL_ITEMS.spending, 'spending'), series(TOTAL_ITEMS.balance, 'balance')]
})()

const part = (key: string, share: number, rest = false): Part => ({ key, label: key, amount: '', share, shareWhole: Math.round(share), shareLabel: '', shareDecimal: '', rest })

describe('the year', () => {
  it('covers 2006 to the year in progress, which runs to the newest bulletin', () => {
    const views = yearViews(catalog)
    expect(views[0]?.year).toBe(2006)
    expect(views[views.length - 1]).toMatchObject({ year: 2026, partial: true, month: '2026-07', label: '2026-07', type: 'MONTH', basis: 'YTD', previous: '2025-07' })
    expect(views.find((view) => view.year === 2025)).toMatchObject({ partial: false, month: '2025-12', label: '2025', type: 'YEAR', basis: 'FULL_YEAR', previous: '2024' })
  })

  it('opens on the newest year the bulletins finish, and falls back to it for a year they do not cover', () => {
    expect(defaultYear(catalog)).toBe(2025)
    expect(viewOfYear(catalog, undefined).year).toBe(2025)
    expect(viewOfYear(catalog, 1990).year).toBe(2025)
    expect(viewOfYear(catalog, 2012).year).toBe(2012)
  })

  it('compares a year in progress with the same months a year earlier', () => {
    const view = viewOfYear(catalog, 2026)
    expect(previousView(view)).toMatchObject({ year: 2025, month: '2025-07', label: '2025-07', partial: true })
  })

  it('offers every full year the API vouches for, 2008, 2011 and 2013 among them; withholds only those it does not', () => {
    expect(unfinishedYearsOf(yearsRead)).toEqual([['2012', 'missing_selected_release']])
    for (const year of [2008, 2011, 2013]) expect(viewOfYear(catalog, year)).toMatchObject({ year, partial: false, label: String(year), basis: 'FULL_YEAR' })
    // A balance of zero is an answer, not a gap.
    expect(unfinishedYearsOf(yearsRead).map(([year]) => year)).not.toContain('2014')
  })
})

describe('the totals, year by year', () => {
  const cells = new Map(yearsRead.map((result) => [result.item.itemId, cellsOf(result)]))
  const rows = yearTotalsOf(cells, 2008, 2014)

  it('plots each year the API vouches for, and leaves a year it does not as a gap that says why', () => {
    expect(rows.map((row) => row.year)).toEqual([2008, 2009, 2010, 2011, 2012, 2013, 2014])
    expect(rows.find((row) => row.year === 2008)).toEqual({ year: 2008, revenue: '164466800000', spending: '189121700000', balance: '-24654900000', gap: null })
    expect(rows.find((row) => row.year === 2011)).toEqual({ year: 2011, revenue: '181566900000', spending: '205403600000', balance: '-23836700000', gap: null })
    expect(rows.find((row) => row.year === 2012)).toEqual({ year: 2012, revenue: null, spending: null, balance: null, gap: { reason: 'missing_selected_release' } })
    // A year the read doesn't hold at all is a gap too, with no reason to give.
    expect(rows.find((row) => row.year === 2009)).toEqual({ year: 2009, revenue: null, spending: null, balance: null, gap: { reason: null } })
  })

  it('takes the balance the bulletin prints, not spending less revenue (2013: 15.771,3 million, not 15.771,2)', () => {
    expect(rows.find((row) => row.year === 2013)?.balance).toBe('-15771300000')
  })

  it('keeps a balance of exactly zero as a value', () => {
    expect(rows.find((row) => row.year === 2014)).toEqual({ year: 2014, revenue: '100', spending: '100', balance: '0', gap: null })
    expect(cells.get(TOTAL_ITEMS.balance)?.get('2014')?.value).toBe(0)
  })
})

describe('links', () => {
  it('carry the site’s language into the pages they open, and nothing of this page', () => {
    expect(siteKeys({ lang: 'en', an: 2020 })).toEqual({ lang: 'en' })
    expect(siteKeys({ an: 2020 })).toEqual({})
  })
})

describe('ANAF over the bulletin window', () => {
  it('reads a whole year as the year, and the year in progress from January to the bulletin month', () => {
    expect(anafFilter(viewOfYear(catalog, 2025)).report_period).toEqual({ type: 'YEAR', selection: { interval: { start: '2025', end: '2025' } } })
    expect(anafFilter(viewOfYear(catalog, 2026)).report_period).toEqual({ type: 'MONTH', selection: { interval: { start: '2026-01', end: '2026-07' } } })
    expect(anafFilter(previousView(viewOfYear(catalog, 2026))).report_period).toEqual({ type: 'MONTH', selection: { interval: { start: '2025-01', end: '2025-07' } } })
  })

  it('compares with the year before only where ANAF covers it: 2016 has none', () => {
    expect(comparableWithAnaf(viewOfYear(catalog, 2016))).toBe(false)
    expect(comparableWithAnaf(viewOfYear(catalog, 2017))).toBe(true)
    expect(comparableWithAnaf(viewOfYear(catalog, 2026))).toBe(true)
  })

  it('keys a read by its year and the lanes’ loads, so a new year or a moved lane is read afresh', () => {
    expect(readKey(viewOfYear(catalog, 2024), catalog)).toBe('2024|e1|a1')
    expect(readKey(viewOfYear(catalog, 2026), catalog)).toBe('2026-07|e1|a1')
    expect(readKey(null, catalog)).toBe('every-year|e1|a1')
  })

  it('reads the state budget: sector 1, source 1, the principal authorities, payments', () => {
    expect(anafFilter(viewOfYear(catalog, 2025))).toMatchObject({ budget_sector_ids: ['1'], funding_source_ids: ['1'], account_category: 'ch' })
    expect(ANAF_FIRST_YEAR).toBe(2016)
  })

  it('sums line items by chapter on the decimals, the largest first', () => {
    const chapters = chaptersOf([
      { fn_c: '65.03.02', amount: 0.1 },
      { fn_c: '65.04.01', amount: 0.2 },
      { fn_c: '68.03.00', amount: 1 },
      { fn_c: null, amount: 0.05 },
    ])
    expect(chapters).toEqual([
      { code: '68', lei: '1.00' },
      { code: '65', lei: '0.30' },
      { code: '', lei: '0.05' },
    ])
    expect(anafTotal(chapters)).toBe('1.35')
  })
})

describe('the parts of a whole', () => {
  const ITEMS = ['mfin.bgc.expenditure.personnel', 'mfin.bgc.expenditure.interest']
  const whole = (now: Record<string, string | null>) =>
    partsOfWhole({ whole: '215816900000', items: ITEMS, now: (itemId) => now[itemId] ?? null, before: () => null, restLabel: () => 'rest', restHint: () => '' })

  it('has no breakdown when no line has a value for the year (2013): not a whole that is all „rest"', () => {
    expect(whole({})).toBeNull()
  })

  it('counts a line of exactly zero as a value, and the rest as what the lines leave', () => {
    const parts = whole({ 'mfin.bgc.expenditure.interest': '0' })
    expect(parts?.map((entry) => entry.key)).toEqual(['mfin.bgc.expenditure.interest', 'rest'])
    expect(parts?.find((entry) => entry.key === 'mfin.bgc.expenditure.interest')?.share).toBe(0)
    expect(parts?.find((entry) => entry.rest)?.share).toBe(100)
  })

  it('ranks the lines by size and leaves the rest last', () => {
    const parts = whole({ 'mfin.bgc.expenditure.personnel': '50000000000', 'mfin.bgc.expenditure.interest': '100000000000' })
    expect(parts?.map((entry) => entry.key)).toEqual(['mfin.bgc.expenditure.interest', 'mfin.bgc.expenditure.personnel', 'rest'])
  })

  it('gives whole lei out of a hundred that always make a hundred', () => {
    const counts = cellsOutOfHundred([part('a', 31.4), part('b', 20.2), part('c', 8.9), part('d', 33.33), part('rest', 6.17, true)])
    expect(counts.reduce((sum, value) => sum + value, 0)).toBe(100)
    // 31,4 → 31, plus one of the two lei the floors leave: its remainder (0,4) is the second largest, after 8,9's.
    expect(counts).toEqual([32, 20, 9, 33, 6])
  })

  it('leaves what the shown lines do not cover as the rest, exactly', () => {
    expect(restOf('662700000000.15', ['208000000000.10', '133900000000.05', null])).toBe('320800000000.00')
  })

  it('lays the treemap out so its areas keep the shares, inside the box', () => {
    const shares = [40, 25, 15, 10, 6, 4]
    const rects = squarify(shares, { x: 0, y: 0, w: 160, h: 100 })
    const area = 160 * 100
    rects.forEach((rect, index) => {
      expect((rect.w * rect.h) / area).toBeCloseTo(shares[index]! / 100, 6)
      expect(rect.x + rect.w).toBeLessThanOrEqual(160 + 1e-9)
      expect(rect.y + rect.h).toBeLessThanOrEqual(100 + 1e-9)
    })
  })

  it('tones the parts from dark to pale, never in the mixes where no text reaches 4.5:1, and the rest in grey', () => {
    const parts = Array.from({ length: 12 }, (_, index) => part(`p${index}`, 12 - index))
    const mixes = parts.map((entry, rank) => Number(/ (\d+)%/u.exec(String(toneOf(entry, rank, parts.length).style?.backgroundColor))?.[1]))
    expect(mixes[0]).toBe(100)
    expect(mixes[mixes.length - 1]).toBe(12)
    expect(mixes.every((mix) => mix >= 70 || mix <= 46)).toBe(true)
    parts.forEach((entry, rank) => expect(toneOf(entry, rank, parts.length).ink).toBe(mixes[rank]! >= 70 ? 'text-background' : 'text-foreground'))
    const rest = toneOf(part('rest', 5, true), 12, 12)
    expect(rest.ink).toBe('text-foreground')
    expect(rest.style).toBeUndefined()
    expect(namedCount([...parts, part('rest', 1, true)])).toBe(12)
  })

  it('rounds each shown share once, from the exact amounts', () => {
    // 14,4999…%: a whole 14%, not 14,5% rounded again to 15%; 4,1499…%: 4,1%, not 4,15% rounded to 4,2%.
    expect(shareOf('144999999999.99', '1000000000000')).toMatchObject({ shareWhole: 14, shareLabel: '14%' })
    expect(shareOf('41499999999.99', '1000000000000')).toMatchObject({ shareWhole: 4, shareLabel: '4.1%', shareDecimal: '4.1%' })
    expect(shareOf(null, '1')).toMatchObject({ share: 0, shareLabel: '—' })
  })

  it('divides shares on the exact decimals', () => {
    expect(shareNumber('1', '3', 1)).toBe(33.3)
    expect(shareNumber(null, '3')).toBeNull()
  })

  it('reads a printed GDP share (a fraction) as a percentage, and a deficit share as its size', () => {
    expect(gdpNumber('0.42361', 1)).toBe(42.4)
    expect(gdpSizeText('-0.0765', 1)).toMatch(/^7[,.]7%$/u)
  })
})

describe('names', () => {
  it('gives the large ministries a short name by CUI, and writes the rest as a reader would', () => {
    expect(authorityName('4266669', 'MINISTERUL MUNCII FAMILIEI TINERETULUI SI SOLIDARITATII SOCIALE')).toBe('Ministerul Muncii')
    expect(authorityName('1', 'AUTORITATEA NATIONALA ANAF PENTRU TEST')).toBe('Autoritatea Nationala ANAF pentru Test')
  })
})

describe('the law', () => {
  const record = (capitol: string, value: string, extra: Partial<BudgetApprovedRecord['codes']> = {}, label: string | null = null) =>
    ({
      codes: { capitol, subcapitol: '', paragraf: '', grupa: null, titlu: null, articol: '', alineat: '', ...extra },
      contextLabel: label,
      values: [{ measureYear: 2025, value }],
    }) as unknown as BudgetApprovedRecord

  it('keeps the chapter rows and the 5001 total, in lei, and nothing below a chapter', () => {
    const { chapters, total } = lawChaptersOf(
      [
        record('5001', '499600000'),
        record('6501', '60300000', {}, 'INVATAMANT'),
        record('6501', '1000', { subcapitol: '03' }),
        record('6501', '2000', { titlu: '10' }),
        record('5000', '1'),
        record('5100', '5'),
        record('6601', '24200000.5', {}, 'SANATATE'),
      ],
      2025,
    )
    expect(total).toBe('499600000000')
    expect(chapters).toEqual([
      { code: '6501', printed: 'INVATAMANT', lei: '60300000000' },
      { code: '6601', printed: 'SANATATE', lei: '24200000500' },
    ])
  })

  it('finds the law of a year and the one before it, and reads both in one totals request', () => {
    const edition = lawEditionOf(catalog, 2025)!
    const previous = previousEdition(catalog.approved.editions, edition)
    expect(previous?.budgetYear).toBe(2024)
    expect(lawEditionOf(catalog, 2026)).toBeNull()
    expect(planTotalsInput(edition, previous)).toMatchObject({ editionIds: ['2024:law', '2025:law'], measureYears: [2024, 2025] })
    expect(planTotalsInput(edition, null)).toMatchObject({ editionIds: ['2025:law'], measureYears: [2025] })
  })
})
