import { describe, expect, it } from 'vitest'
import {
  buildChallengeEntityAnalysisCanonicalSearchPatch,
  ChallengeEntityAnalysisRouteSearchSchema,
  decodeChallengeEntityAnalyticsSearchState,
  normalizeChallengeEntityAnalysisSearch,
} from './challenge-entity-analysis-route-search-schema'

describe('challenge entity analytics search normalization', () => {
  it('keeps only the deepest valid fn and ec codes while preserving their order', () => {
    expect(
      decodeChallengeEntityAnalyticsSearchState(
        JSON.stringify({
          target: {
            subjectLabel: 'Education salaries',
            path: [
              { type: 'fn', code: '65.00' },
              { type: 'ec', code: '10.01.00' },
              { type: 'fn', code: '65.02' },
            ],
          },
        }),
      ),
    ).toEqual({
      target: {
        subjectLabel: 'Education salaries',
        path: [
          { type: 'fn', code: '65.02' },
          { type: 'ec', code: '10.01' },
        ],
      },
      view: {
        tab: 'execution',
        timeframe: 'selected',
        commitmentsMetric: 'CREDITE_ANGAJAMENT',
      },
    })
  })

  it('preserves ec-first order when the analytics target comes from economic grouping', () => {
    expect(
      decodeChallengeEntityAnalyticsSearchState({
        target: {
          subjectLabel: 'Education salaries',
          path: [
            { type: 'ec', code: '10.01.00' },
            { type: 'fn', code: '65.02' },
            { type: 'ec', code: '10' },
          ],
        },
      }),
    ).toEqual({
      target: {
        subjectLabel: 'Education salaries',
        path: [
          { type: 'ec', code: '10.01' },
          { type: 'fn', code: '65.02' },
        ],
      },
      view: {
        tab: 'execution',
        timeframe: 'selected',
        commitmentsMetric: 'CREDITE_ANGAJAMENT',
      },
    })
  })

  it('preserves an explicitly empty analytics path so the modal can stay open without fn/ec filters', () => {
    expect(
      decodeChallengeEntityAnalyticsSearchState({
        target: {
          path: [],
        },
      }),
    ).toEqual({
      target: {
        path: [],
      },
      view: {
        tab: 'execution',
        timeframe: 'selected',
        commitmentsMetric: 'CREDITE_ANGAJAMENT',
      },
    })
  })

  it('drops invalid analytics targets from the normalized search state', () => {
    expect(
      normalizeChallengeEntityAnalysisSearch({
        analytics: {
          target: {
            subjectLabel: 'Broken target',
            path: [{ type: 'fn', code: 'invalid' }],
          },
        },
      } as any).analytics,
    ).toBeUndefined()

    expect(
      normalizeChallengeEntityAnalysisSearch({
        analytics: 'not-json',
      } as any).analytics,
    ).toBeUndefined()
  })

  it('defaults invalid treemap depth values to chapter', () => {
    expect(
      normalizeChallengeEntityAnalysisSearch({
        treemap_depth: 'invalid-depth',
      } as any).treemap_depth,
    ).toBe('chapter')

    expect(
      normalizeChallengeEntityAnalysisSearch({
        treemap_depth: 'paragraph',
      }).treemap_depth,
    ).toBe('paragraph')
  })

  it('canonicalizes analytics targets and defaults the view in the route patch builder', () => {
    const rawSearch = {
      analytics: {
        target: {
          subjectLabel: 'Education salaries',
          path: [
            { type: 'fn', code: '65.00' },
            { type: 'ec', code: '10.01.00' },
            { type: 'fn', code: '65.02' },
          ],
        },
      },
    } as any

    const normalizedSearch = normalizeChallengeEntityAnalysisSearch(rawSearch)

    expect(
      buildChallengeEntityAnalysisCanonicalSearchPatch(rawSearch, normalizedSearch),
    ).toMatchObject({
      analytics: {
        target: {
          subjectLabel: 'Education salaries',
          path: [
            { type: 'fn', code: '65.02' },
            { type: 'ec', code: '10.01' },
          ],
        },
        view: {
          tab: 'execution',
          timeframe: 'selected',
          commitmentsMetric: 'CREDITE_ANGAJAMENT',
        },
      },
    })
  })

  it('canonicalizes treemap depth in the route patch builder', () => {
    const rawSearch = {
      treemap_depth: 'invalid-depth',
    } as any

    const normalizedSearch = normalizeChallengeEntityAnalysisSearch(rawSearch)

    expect(
      buildChallengeEntityAnalysisCanonicalSearchPatch(rawSearch, normalizedSearch),
    ).toMatchObject({
      treemap_depth: 'chapter',
    })
  })

  it('normalizes valid expense types and drops invalid ones', () => {
    expect(
      normalizeChallengeEntityAnalysisSearch({
        expense_type: 'functionare',
      }).expense_type,
    ).toBe('functionare')

    expect(
      normalizeChallengeEntityAnalysisSearch({
        expense_type: 'invalid',
      } as any).expense_type,
    ).toBeUndefined()
  })

  it('canonicalizes expense_type in the route patch builder', () => {
    const rawSearch = {
      expense_type: 'invalid',
    } as any

    const normalizedSearch = normalizeChallengeEntityAnalysisSearch(rawSearch)

    expect(
      buildChallengeEntityAnalysisCanonicalSearchPatch(rawSearch, normalizedSearch),
    ).toMatchObject({
      expense_type: undefined,
    })
  })

  it('accepts the notification modal flag in the route search schema', () => {
    expect(
      ChallengeEntityAnalysisRouteSearchSchema.parse({
        notificationModal: 'open',
      }),
    ).toMatchObject({
      notificationModal: 'open',
    })
  })

  it('defaults period, month, and quarter when they are missing', () => {
    expect(normalizeChallengeEntityAnalysisSearch(undefined)).toMatchObject({
      period: 'YEAR',
      year: 2025,
      month: '01',
      quarter: 'Q1',
    })
  })

  it('normalizes invalid period anchors and clears stale month and quarter values in the canonical patch', () => {
    const rawSearch = {
      period: 'invalid',
      month: '99',
      quarter: 'Q9',
    } as any

    const normalizedSearch = normalizeChallengeEntityAnalysisSearch(rawSearch)

    expect(normalizedSearch).toMatchObject({
      period: 'YEAR',
      month: '01',
      quarter: 'Q1',
    })
    expect(
      buildChallengeEntityAnalysisCanonicalSearchPatch(rawSearch, normalizedSearch),
    ).toMatchObject({
      period: 'YEAR',
      month: undefined,
      quarter: undefined,
    })
  })

  it('removes stale quarter state when switching to month mode', () => {
    const rawSearch = {
      period: 'MONTH',
      month: '03',
      quarter: 'Q4',
    } as any

    const normalizedSearch = normalizeChallengeEntityAnalysisSearch(rawSearch)

    expect(
      buildChallengeEntityAnalysisCanonicalSearchPatch(rawSearch, normalizedSearch),
    ).toMatchObject({
      quarter: undefined,
    })
  })

  it('trims and canonicalizes the main creditor filter', () => {
    const rawSearch = {
      main_creditor_cui: '  4305857  ',
    } as any

    const normalizedSearch = normalizeChallengeEntityAnalysisSearch(rawSearch)

    expect(normalizedSearch.main_creditor_cui).toBe('4305857')
    expect(
      buildChallengeEntityAnalysisCanonicalSearchPatch(rawSearch, normalizedSearch),
    ).toMatchObject({
      main_creditor_cui: '4305857',
    })
  })

  it('drops an empty main creditor filter in the canonical patch', () => {
    const rawSearch = {
      main_creditor_cui: '   ',
    } as any

    const normalizedSearch = normalizeChallengeEntityAnalysisSearch(rawSearch)

    expect(normalizedSearch.main_creditor_cui).toBeUndefined()
    expect(
      buildChallengeEntityAnalysisCanonicalSearchPatch(rawSearch, normalizedSearch),
    ).toMatchObject({
      main_creditor_cui: undefined,
    })
  })
})
