import { describe, expect, it } from 'vitest'
import {
  buildChallengeEntityAnalysisCanonicalSearchPatch,
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
})
