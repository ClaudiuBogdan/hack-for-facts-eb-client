import { describe, expect, it } from 'vitest'
import { DEFAULT_QUESTION, readQuestion } from '@/features/legal/lib/analytics-question'
import type { LegalAnalyticsLinks, LegalAnalyticsSeries } from '@/schemas/legal-analytics'
import { YEARS_FROM, actName, analysisSearch, isoDaysBefore, leaderName, linkCounts, yearsChart } from './landing.lib'

const denominators = { total: 100, population: 100, uncertain: 0, unplaced: 0 }

describe('analysisSearch', () => {
  it('writes nothing for the default question', () => {
    expect(analysisSearch()).toEqual({})
  })

  it('writes addresses the analysis page reads back as the same question', () => {
    const questions = [
      { tip: ['ordonanta-urgenta'], forma: 'timp' },
      { populatie: 'stoc', fin: true },
      { emitent: 'Guvernul' },
      { vedere: 'legaturi' },
      { vedere: 'dinamica' },
      { vedere: 'emitent' },
      { felul: 'rule-making' },
      { ordine: 'citari' },
    ] as const
    for (const patch of questions) {
      expect(readQuestion(analysisSearch(patch))).toEqual({ ...DEFAULT_QUESTION, ...patch })
    }
  })
})

describe('actName', () => {
  it('names an act by its citation when the title only says the citation again', () => {
    expect(actName({ citation: 'HG nr. 1705/2006', title: 'HG 1705 29/11/2006' })).toEqual({ name: 'HG nr. 1705/2006', citation: null })
    expect(actName({ citation: 'Legea nr. 95/2006', title: 'LEGE (R) 95 14/04/2006' })).toEqual({ name: 'Legea nr. 95/2006', citation: null })
    expect(actName({ citation: 'Legea nr. 1/2011', title: null })).toEqual({ name: 'Legea nr. 1/2011', citation: null })
  })

  it('keeps a title that is a name, with the citation beside it', () => {
    expect(actName({ citation: 'Legea nr. 227/2015', title: 'COD FISCAL 08/09/2015' })).toEqual({ name: 'Cod fiscal', citation: 'Legea nr. 227/2015' })
  })

  it('drops a citation the Portal generated', () => {
    expect(actName({ citation: 'Doc nr. 47355', title: 'CONSTITUTIE (R) 21/11/1991' })).toEqual({ name: 'Constitutie', citation: null })
    expect(actName({ citation: 'Doc nr. 9', title: 'DOC 9 01/01/2000' })).toEqual({ name: 'DOC 9', citation: null })
  })
})

describe('leaderName', () => {
  it('puts the title first and the citation under it', () => {
    expect(leaderName({ citation: 'Legea nr. 227/2015', title: 'COD FISCAL 08/09/2015' })).toEqual({
      primary: 'COD FISCAL 08/09/2015',
      secondary: 'Legea nr. 227/2015',
    })
  })

  it('shows the title alone under a generated citation', () => {
    expect(leaderName({ citation: 'Doc nr. 47355', title: 'CONSTITUTIE (R) 21/11/1991' })).toEqual({
      primary: 'CONSTITUTIE (R) 21/11/1991',
      secondary: null,
    })
  })

  it('falls back to the citation when there is no title', () => {
    expect(leaderName({ citation: 'HG nr. 1705/2006', title: null })).toEqual({ primary: 'HG nr. 1705/2006', secondary: null })
    expect(leaderName({ citation: 'Doc nr. 1', title: '  ' })).toEqual({ primary: 'Doc nr. 1', secondary: null })
  })
})

describe('yearsChart', () => {
  const series: LegalAnalyticsSeries = {
    ...denominators,
    lens: 'felul',
    keys: ['rule-making', 'individual'],
    years: [
      { year: 1926, acts: [1, 0, 0] },
      { year: 1989, acts: [2, 1, 4] },
      { year: YEARS_FROM, acts: [3, 2, 1] },
      { year: YEARS_FROM + 2, acts: [5, 5, 5] },
    ],
    restKey: true,
    unknownYear: 9,
  }

  it('draws a column a year from the first year on, an absent year as zeros', () => {
    const chart = yearsChart(series)
    expect(chart.years.map((row) => row.year)).toEqual([YEARS_FROM, YEARS_FROM + 1, YEARS_FROM + 2])
    expect(chart.years[1]?.values).toEqual([0, 0, 0])
  })

  it('counts the earlier acts apart and names the fullest year drawn', () => {
    const chart = yearsChart(series)
    expect(chart.earlier).toBe(8)
    expect(chart.peak).toEqual({ year: YEARS_FROM + 2, acts: 15 })
  })

  it('keeps every act the API counted with a year: drawn plus earlier', () => {
    const chart = yearsChart(series)
    const drawn = chart.years.reduce((sum, row) => sum + row.values.reduce((a, b) => a + b, 0), 0)
    const served = series.years.reduce((sum, row) => sum + row.acts.reduce((a, b) => a + b, 0), 0)
    expect(drawn + chart.earlier).toBe(served)
  })
})

describe('linkCounts', () => {
  const links: LegalAnalyticsLinks = {
    ...denominators,
    daysMeasure: '',
    byKind: [
      { kind: 'amends', note: 'resolved', links: 10 },
      { kind: 'amends', note: 'outside_corpus', links: 3 },
      { kind: 'amends', note: 'code', links: 2 },
      { kind: 'promulgates', note: 'resolved', links: 7 },
    ],
    amends: [],
    topTargets: [],
    days: [],
  }

  it('counts only resolved links as found, and every note as read', () => {
    expect(linkCounts(links, 'amends')).toEqual({ resolved: 10, read: 15 })
    expect(linkCounts(links, 'promulgates')).toEqual({ resolved: 7, read: 7 })
    expect(linkCounts(links, 'rejects_ordinance')).toEqual({ resolved: 0, read: 0 })
  })
})

describe('isoDaysBefore', () => {
  it('steps back whole civil days across months and years', () => {
    expect(isoDaysBefore('2026-11-25', 30)).toBe('2026-10-26')
    expect(isoDaysBefore('2026-01-10', 30)).toBe('2025-12-11')
  })
})
