import { describe, expect, it } from 'vitest'

import type { AnalyticsFilterType } from '@/schemas/charts'

import {
  NATIONAL_BUDGET_FUNDING_SOURCE_KEYS,
  buildNationalBudgetLineItemsFilter,
  buildFundingSourceIdsByKey,
  buildNationalBudgetSectorBaseFilter,
  getLineItemsExcludeOverride,
} from './national-budget-filter-presets'
import { getFormulaRulesForSector } from './national-budget-formula-rules'

const baseFilter: AnalyticsFilterType = {
  account_category: 'ch',
  report_period: {
    type: 'YEAR',
    selection: {
      interval: {
        start: '2025',
        end: '2025',
      },
    },
  },
  normalization: 'total',
  report_type: 'Executie bugetara agregata la nivel de ordonator principal',
  funding_source_ids: ['9', '10'],
  economic_prefixes: ['51.01'],
  functional_prefixes: ['43'],
  county_codes: ['B'],
  exclude: {
    economic_prefixes: ['51.01'],
    funding_source_ids: ['8'],
    county_codes: ['CJ'],
  },
}

const fundingSourceIdsByKey = buildFundingSourceIdsByKey([
  { source_id: '1', source_description: 'Integral de la buget' },
  { source_id: '4', source_description: 'Fonduri externe nerambursabile' },
  { source_id: '5', source_description: 'Activitati finantate integral din venituri proprii' },
  { source_id: '6', source_description: 'Integral venituri proprii' },
  { source_id: '7', source_description: 'Venituri proprii si subventii' },
  { source_id: '9', source_description: 'Bugetul Fondului pentru Mediu' },
  { source_id: '10', source_description: 'Bugetul Trezoreriei Statului' },
])

function buildScopedFilter(filter: AnalyticsFilterType, sectorId: string): AnalyticsFilterType {
  return buildNationalBudgetSectorBaseFilter(filter, sectorId, { fundingSourceIdsByKey })
}

describe('buildNationalBudgetSectorBaseFilter', () => {
  it('resolves funding-source ids from prefixed and suffixed labels', () => {
    const resolved = buildFundingSourceIdsByKey([
      { source_id: '1', source_description: 'A-Integral de la buget' },
      { source_id: '4', source_description: 'D - Fonduri externe nerambursabile (FEN)' },
      { source_id: '6', source_description: 'F. Integral venituri proprii' },
    ])

    expect(resolved[NATIONAL_BUDGET_FUNDING_SOURCE_KEYS.INTEGRAL_DE_LA_BUGET]).toBe('1')
    expect(resolved[NATIONAL_BUDGET_FUNDING_SOURCE_KEYS.FONDURI_EXTERNE_NERAMBURSABILE]).toBe('4')
    expect(resolved[NATIONAL_BUDGET_FUNDING_SOURCE_KEYS.INTEGRAL_VENITURI_PROPRII]).toBe('6')
  })

  it('applies sector-specific funding source preset for spending sector 1', () => {
    const scoped = buildScopedFilter(baseFilter, '1')

    expect(scoped.account_category).toBe('ch')
    expect(scoped.budget_sector_ids).toEqual(['1'])
    expect(scoped.funding_source_ids).toEqual(['1'])
  })

  it('applies sector-specific funding source preset for spending sector 2', () => {
    const scoped = buildScopedFilter(baseFilter, '2')

    expect(scoped.account_category).toBe('ch')
    expect(scoped.budget_sector_ids).toEqual(['2'])
    expect(scoped.funding_source_ids).toEqual(['1', '6', '5', '7'])
  })

  it('applies sector-specific funding source preset for income sector 2', () => {
    const scoped = buildScopedFilter(
      {
        ...baseFilter,
        account_category: 'vn',
      },
      '2',
    )

    expect(scoped.account_category).toBe('vn')
    expect(scoped.budget_sector_ids).toEqual(['2'])
    expect(scoped.funding_source_ids).toEqual(['1', '4', '6'])
  })

  it('applies sector-specific funding source preset for income sector 5', () => {
    const scoped = buildScopedFilter(
      {
        ...baseFilter,
        account_category: 'vn',
      },
      '5',
    )

    expect(scoped.account_category).toBe('vn')
    expect(scoped.budget_sector_ids).toEqual(['5'])
    expect(scoped.funding_source_ids).toEqual(['1', '4'])
  })

  it('applies revenue funding presets for all visible sectors', () => {
    const expectedFundingBySector: Record<string, string[]> = {
      '1': ['1'],
      '2': ['1', '4', '6'],
      '3': ['1'],
      '4': ['1'],
      '5': ['1', '4'],
    }

    for (const [sectorId, expectedFundingSourceIds] of Object.entries(expectedFundingBySector)) {
      const scoped = buildNationalBudgetSectorBaseFilter(
        {
          ...baseFilter,
          account_category: 'vn',
        },
        sectorId,
        { fundingSourceIdsByKey },
      )

      expect(scoped.budget_sector_ids).toEqual([sectorId])
      expect(scoped.funding_source_ids).toEqual(expectedFundingSourceIds)
    }
  })

  it('applies spending funding presets for all visible sectors', () => {
    const expectedFundingBySector: Record<string, string[] | undefined> = {
      '1': ['1'],
      '2': ['1', '6', '5', '7'],
      '3': ['1'],
      '4': undefined,
      '5': undefined,
    }

    for (const [sectorId, expectedFundingSourceIds] of Object.entries(expectedFundingBySector)) {
      const scoped = buildScopedFilter(
        {
          ...baseFilter,
          account_category: 'ch',
        },
        sectorId,
      )

      expect(scoped.budget_sector_ids).toEqual([sectorId])
      if (expectedFundingSourceIds) {
        expect(scoped.funding_source_ids).toEqual(expectedFundingSourceIds)
      } else {
        expect(scoped.funding_source_ids).toBeUndefined()
      }
    }
  })

  it('clears incompatible classification filters and keeps unrelated filters', () => {
    const scoped = buildScopedFilter(baseFilter, '4')

    expect(scoped.economic_prefixes).toBeUndefined()
    expect(scoped.functional_prefixes).toBeUndefined()
    expect(scoped.county_codes).toEqual(['B'])
    expect(scoped.exclude).toEqual({
      county_codes: ['CJ'],
    })
  })

  it('defines state-budget revenue override for line-items exclusions', () => {
    const override = getLineItemsExcludeOverride('1', 'vn')

    expect(override).toEqual({
      sectorId: '1',
      accountCategory: 'vn',
      functionalPrefixes: ['36.02.05', '37.02.03', '37.02.04', '47.02.04'],
      economicPrefixes: ['51.01', '51.02'],
    })
  })

  it('builds no-transfer filter exclusions from formula rules', () => {
    const scopedFilter = buildNationalBudgetSectorBaseFilter(baseFilter, '2', { fundingSourceIdsByKey })
    const lineItemsFilter = buildNationalBudgetLineItemsFilter(scopedFilter, {
      sectorId: '2',
      rules: getFormulaRulesForSector('2', 'ch'),
      transferFilter: 'no-transfers',
    })

    expect(lineItemsFilter.exclude).toEqual({
      county_codes: ['CJ'],
      functional_prefixes: [
        '43.09',
        '43.19',
        '43.10',
        '43.14',
        '43.39.02',
        '43.08',
        '43.39.01',
        '43.01',
        '43.07',
        '43.23',
        '43.30',
        '43.24',
      ],
      economic_prefixes: ['51.01', '51.02'],
    })
  })

  it('removes transfer exclusions in all mode', () => {
    const scopedFilter = buildNationalBudgetSectorBaseFilter(baseFilter, '1', { fundingSourceIdsByKey })
    const lineItemsFilter = buildNationalBudgetLineItemsFilter(scopedFilter, {
      sectorId: '1',
      rules: getFormulaRulesForSector('1', 'vn'),
      transferFilter: 'all',
    })

    expect(lineItemsFilter.exclude).toEqual({
      county_codes: ['CJ'],
      functional_prefixes: undefined,
      economic_prefixes: undefined,
    })
  })
})
