import { describe, expect, it } from 'vitest'
import { DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES } from '@/lib/analytics-defaults'
import {
  CHALLENGE_ENTITY_MAP_PREVIEW_DEFINITIONS,
  getChallengeEntityMapPreviewDefinition,
} from './challenge-entity-public-maps'

describe('challenge-entity-public-maps', () => {
  it('adds a single INS population geojson series to every preview while preserving active series ids', () => {
    for (const definition of CHALLENGE_ENTITY_MAP_PREVIEW_DEFINITIONS) {
      const populationSeries = definition.mapState.series.filter(
        (series) => series.type === 'geojson-dataset-series',
      )

      expect(populationSeries).toHaveLength(1)
      expect(populationSeries[0]?.datasetKey).toBe('insPop2021')
      expect(definition.mapState.activeSeriesId).toBeDefined()
      expect(
        definition.mapState.series.some(
          (series) => series.id === definition.mapState.activeSeriesId,
        ),
      ).toBe(true)
    }
  })

  it('keeps income broad, but applies the treemap transfer exclusion to expense series', () => {
    const expensesDefinition = getChallengeEntityMapPreviewDefinition('expenses')
    const incomeDefinition = getChallengeEntityMapPreviewDefinition('income')
    const balanceDefinition = getChallengeEntityMapPreviewDefinition('balance')

    const expensesSeries = expensesDefinition.mapState.series[0]
    const incomeSeries = incomeDefinition.mapState.series[0]
    const balanceIncomeSeries = balanceDefinition.mapState.series[0]
    const balanceExpensesSeries = balanceDefinition.mapState.series[1]

    if (
      expensesSeries?.type !== 'line-items-aggregated-yearly' ||
      incomeSeries?.type !== 'line-items-aggregated-yearly' ||
      balanceIncomeSeries?.type !== 'line-items-aggregated-yearly' ||
      balanceExpensesSeries?.type !== 'line-items-aggregated-yearly'
    ) {
      throw new Error('Expected execution series in preview definitions')
    }

    expect(expensesSeries.filter.budget_sector_ids).toBeUndefined()
    expect(expensesSeries.filter.funding_source_ids).toBeUndefined()
    expect(expensesSeries.filter.exclude).toEqual({
      economic_prefixes: [...DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES],
    })

    expect(incomeSeries.filter.budget_sector_ids).toBeUndefined()
    expect(incomeSeries.filter.funding_source_ids).toBeUndefined()
    expect(incomeSeries.filter.exclude).toBeUndefined()

    expect(balanceIncomeSeries.filter.budget_sector_ids).toBeUndefined()
    expect(balanceIncomeSeries.filter.funding_source_ids).toBeUndefined()
    expect(balanceIncomeSeries.filter.exclude).toBeUndefined()
    expect(balanceExpensesSeries.filter.budget_sector_ids).toBeUndefined()
    expect(balanceExpensesSeries.filter.funding_source_ids).toBeUndefined()
    expect(balanceExpensesSeries.filter.exclude).toEqual({
      economic_prefixes: [...DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES],
    })
    expect(balanceDefinition.mapState.valueFilters.rules).toHaveLength(0)
  })

  it('builds runtime copy that reflects the active report type', () => {
    const expensesDefinition = getChallengeEntityMapPreviewDefinition('expenses')
    const previewCopy = expensesDefinition.buildPreviewCopy({
      selectedPeriodLabel: '2024-Q2',
      normalization: 'per_capita',
      currency: 'EUR',
      inflationAdjusted: true,
      reportType: 'DETAILED',
    })

    expect(previewCopy.mapName).toBe('Cheltuieli UAT (2024-Q2)')
    expect(previewCopy.mapDescription).toContain('Execuție bugetară detaliată')
    expect(previewCopy.mapDescription).toContain('perioada **2024-Q2**')
    expect(previewCopy.mapDescription).toContain('Normalizare: **per capita**')
    expect(previewCopy.mapDescription).toContain('Monedă: **EUR**')
    expect(previewCopy.mapDescription).toContain('**Populație**')
  })

  it('uses the inverted warning gradient for the balance legend preset', () => {
    const balanceDefinition = getChallengeEntityMapPreviewDefinition('balance')
    const balanceBinsPreset = balanceDefinition.mapState.binsPresets.find(
      (entry) => entry.id === balanceDefinition.mapState.activeBinPresetId,
    )

    expect(balanceBinsPreset?.config.intervalMode).toBe('continuous')
    expect(balanceBinsPreset?.config.continuousPercentiles).toEqual({
      min: 10,
      max: 90,
    })
    expect(balanceBinsPreset?.config.gradient).toEqual({
      startColor: '#ff1900',
      endColor: '#ffe83d',
    })
  })
})
