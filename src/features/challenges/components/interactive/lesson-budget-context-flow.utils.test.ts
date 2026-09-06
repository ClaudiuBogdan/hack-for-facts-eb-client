import { describe, expect, it } from 'vitest'
import type { GeoJsonObject } from 'geojson'
import { toReportTypeValue } from '@/schemas/reporting'
import {
  BUDGET_CONTEXT_MAP_OPTIONS,
  buildBudgetContextCountyViewport,
  buildBudgetContextCountySeries,
  buildBudgetContextTopUatQuizOptions,
  selectBudgetContextVisibleRows,
  type BudgetContextLeaderboardRow,
} from './lesson-budget-context-flow.utils'

function createLeaderboardRow(params: {
  readonly rank: number
  readonly sirutaCode: string
  readonly uatName: string
  readonly value: number
  readonly entityCui?: string
}): BudgetContextLeaderboardRow {
  return {
    rank: params.rank,
    value: params.value,
    sirutaCode: params.sirutaCode,
    uatName: params.uatName,
    countyName: 'Cluj',
    entityCui: params.entityCui,
    valuesBySeriesId: {
      'lesson-expenses-per-capita': String(params.value),
    },
  }
}

describe('lesson budget context flow utils', () => {
  it('builds four county-filtered UAT series for the 2025 aggregated execution view', () => {
    const series = buildBudgetContextCountySeries(' cj ')

    expect(series).toHaveLength(4)
    expect(series.map((item) => item.id)).toEqual([
      'lesson-income-total',
      'lesson-expenses-total',
      'lesson-income-per-capita',
      'lesson-expenses-per-capita',
    ])

    for (const item of series) {
      expect(item.type).toBe('line-items-aggregated-yearly')
      if (item.type !== 'line-items-aggregated-yearly') {
        throw new Error(`Unexpected series type: ${item.type}`)
      }

      expect(item.filter.county_codes).toEqual(['CJ'])
      expect(item.filter.is_uat).toBe(true)
      expect(item.filter.report_type).toBe(
        toReportTypeValue('PRINCIPAL_AGGREGATED'),
      )
      expect(item.filter.report_period).toEqual({
        type: 'YEAR',
        selection: {
          interval: {
            start: '2025',
            end: '2025',
          },
        },
      })
    }
  })

  it('orders menu options with per-capita views before total views', () => {
    expect(BUDGET_CONTEXT_MAP_OPTIONS.map((option) => option.id)).toEqual([
      'lesson-expenses-per-capita',
      'lesson-income-per-capita',
      'lesson-expenses-total',
      'lesson-income-total',
    ])
  })

  it('keeps the top 5 and appends the learner row when it falls outside the leaderboard preview', () => {
    const rows = [
      createLeaderboardRow({ rank: 1, sirutaCode: '1', uatName: 'Alfa', value: 1000, entityCui: '1' }),
      createLeaderboardRow({ rank: 2, sirutaCode: '2', uatName: 'Beta', value: 900, entityCui: '2' }),
      createLeaderboardRow({ rank: 3, sirutaCode: '3', uatName: 'Gamma', value: 800, entityCui: '3' }),
      createLeaderboardRow({ rank: 4, sirutaCode: '4', uatName: 'Delta', value: 700, entityCui: '4' }),
      createLeaderboardRow({ rank: 5, sirutaCode: '5', uatName: 'Epsilon', value: 600, entityCui: '5' }),
      createLeaderboardRow({ rank: 6, sirutaCode: '6', uatName: 'Zeta', value: 500, entityCui: 'user-cui' }),
    ]

    const visibleRows = selectBudgetContextVisibleRows({
      rows,
      userEntityCui: 'user-cui',
      limit: 5,
    })

    expect(visibleRows).toHaveLength(6)
    expect(visibleRows.slice(0, 5).map((row) => row.rank)).toEqual([1, 2, 3, 4, 5])
    expect(visibleRows[5]?.entityCui).toBe('user-cui')
    expect(visibleRows[5]?.rank).toBe(6)
  })

  it('does not duplicate the learner row when it is already in the visible top 5', () => {
    const rows = [
      createLeaderboardRow({ rank: 1, sirutaCode: '1', uatName: 'Alfa', value: 1000, entityCui: 'user-cui' }),
      createLeaderboardRow({ rank: 2, sirutaCode: '2', uatName: 'Beta', value: 900, entityCui: '2' }),
      createLeaderboardRow({ rank: 3, sirutaCode: '3', uatName: 'Gamma', value: 800, entityCui: '3' }),
      createLeaderboardRow({ rank: 4, sirutaCode: '4', uatName: 'Delta', value: 700, entityCui: '4' }),
      createLeaderboardRow({ rank: 5, sirutaCode: '5', uatName: 'Epsilon', value: 600, entityCui: '5' }),
      createLeaderboardRow({ rank: 6, sirutaCode: '6', uatName: 'Zeta', value: 500, entityCui: '6' }),
    ]

    const visibleRows = selectBudgetContextVisibleRows({
      rows,
      userEntityCui: 'user-cui',
      limit: 5,
    })

    expect(visibleRows).toHaveLength(5)
    expect(visibleRows.filter((row) => row.entityCui === 'user-cui')).toHaveLength(1)
  })

  it('builds a top-UAT quiz with one correct answer and a rotated option order', () => {
    const options = buildBudgetContextTopUatQuizOptions({
      locale: 'ro',
      rows: [
        createLeaderboardRow({ rank: 1, sirutaCode: '1', uatName: 'Arad', value: 1000 }),
        createLeaderboardRow({ rank: 2, sirutaCode: '2', uatName: 'Baciu', value: 900 }),
        createLeaderboardRow({ rank: 3, sirutaCode: '3', uatName: 'Câmpia', value: 800 }),
        createLeaderboardRow({ rank: 4, sirutaCode: '4', uatName: 'Dej', value: 700 }),
      ],
    })

    expect(options).toHaveLength(4)
    expect(options.filter((option) => option.isCorrect)).toHaveLength(1)
    expect(options.find((option) => option.isCorrect)?.id).toBe('1')
    expect(options[0]?.id).not.toBe('1')
  })

  it('builds a tighter county viewport from the county geometry', () => {
    const viewport = buildBudgetContextCountyViewport({
      countyCode: 'CJ',
      geoJsonData: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [23, 46],
                  [24, 46],
                  [24, 47],
                  [23, 47],
                  [23, 46],
                ],
              ],
            },
            properties: {
              mnemonic: 'CJ',
              name: 'Cluj',
            },
          },
        ],
      } as GeoJsonObject,
    })

    expect(viewport).not.toBeNull()
    expect(viewport?.mapCenter).toEqual([46.5, 23.5])
    expect(viewport?.mapZoom).toBeGreaterThan(8.2)
  })
})
