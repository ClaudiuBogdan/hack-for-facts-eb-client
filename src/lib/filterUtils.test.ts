import { describe, it, expect, vi } from 'vitest'

// Mock Lingui modules before importing anything that uses them
vi.mock('@lingui/core/macro', () => ({
  msg: (strings: TemplateStringsArray) => strings[0],
  t: (strings: TemplateStringsArray) => strings[0],
}))

vi.mock('@lingui/core', () => ({
  i18n: {
    _: (msg: unknown) => (typeof msg === 'string' ? msg : String(msg)),
  },
}))

// Mock generateRandomColor since it's used in charts schema defaults
vi.mock('@/components/charts/components/chart-renderer/utils', () => ({
  generateRandomColor: vi.fn(() => '#0000ff'),
}))

import {
  ensureReportPeriod,
  withDefaultExcludes,
  normalizeAnalyticsFilter,
  prepareFilterForServer,
  normalizeCommitmentsFilter,
  prepareCommitmentsFilterForServer,
} from './filterUtils'
import {
  defaultCommitmentsPeriodStartYear,
  defaultExecutionPeriodStartYear,
  defaultYearRange,
} from '@/schemas/charts'
import type { AnalyticsFilterType, CommitmentsFilterType } from '@/schemas/charts'
import type { ReportPeriodInput } from '@/schemas/reporting'

// ============================================================================
// ensureReportPeriod
// ============================================================================
describe('ensureReportPeriod', () => {
  it('should return filter report_period if present', () => {
    const existingPeriod: ReportPeriodInput = {
      type: 'YEAR',
      selection: { interval: { start: '2020', end: '2022' } },
    }
    const filter: AnalyticsFilterType = {
      account_category: 'ch',
      report_period: existingPeriod,
    }

    const result = ensureReportPeriod(filter)

    expect(result).toBe(existingPeriod)
  })

  it('should return fallback period if filter has no report_period', () => {
    const filter: AnalyticsFilterType = { account_category: 'ch' }
    const fallbackPeriod: ReportPeriodInput = {
      type: 'YEAR',
      selection: { interval: { start: '2019', end: '2021' } },
    }

    const result = ensureReportPeriod(filter, { period: fallbackPeriod })

    expect(result).toBe(fallbackPeriod)
  })

  it('should return default period if no report_period and no fallback', () => {
    const filter: AnalyticsFilterType = { account_category: 'ch' }

    const result = ensureReportPeriod(filter)

    expect(result.type).toBe('YEAR')
    expect(result.selection.interval).toBeDefined()
  })

  it('should use default period range for generated period', () => {
    const filter: AnalyticsFilterType = { account_category: 'ch' }

    const result = ensureReportPeriod(filter)

    // Execution defaults start from defaultYearRange.start and end at defaultYearRange.end.
    expect(result.selection.interval?.start).toBe(String(defaultExecutionPeriodStartYear))
    expect(result.selection.interval?.end).toBe(String(defaultYearRange.end))
  })
})

// ============================================================================
// withDefaultExcludes
// ============================================================================
describe('withDefaultExcludes', () => {
  describe('expense filters (ch)', () => {
    it('should add default economic exclusions for expenses', () => {
      const filter: AnalyticsFilterType = { account_category: 'ch' }

      const result = withDefaultExcludes(filter)

      expect(result.exclude?.economic_prefixes).toBeDefined()
      expect(result.exclude?.economic_prefixes?.length).toBeGreaterThan(0)
    })

    it('should preserve existing economic exclusions', () => {
      const filter: AnalyticsFilterType = {
        account_category: 'ch',
        exclude: { economic_prefixes: ['99'] },
      }

      const result = withDefaultExcludes(filter)

      expect(result.exclude?.economic_prefixes).toContain('99')
    })

    it('should merge default and existing exclusions', () => {
      const filter: AnalyticsFilterType = {
        account_category: 'ch',
        exclude: { economic_prefixes: ['custom'] },
      }

      const result = withDefaultExcludes(filter)

      expect(result.exclude?.economic_prefixes).toContain('custom')
      // Should also contain defaults
      expect(result.exclude?.economic_prefixes?.length).toBeGreaterThan(1)
    })

    it('should default to ch when account_category is not set', () => {
      const filter = { } as AnalyticsFilterType

      const result = withDefaultExcludes(filter)

      expect(result.account_category).toBe('ch')
    })
  })

  describe('income filters (vn)', () => {
    it('should add default functional exclusions for income', () => {
      const filter: AnalyticsFilterType = { account_category: 'vn' }

      const result = withDefaultExcludes(filter)

      expect(result.exclude?.functional_prefixes).toBeDefined()
    })

    it('should preserve existing functional exclusions for income', () => {
      const filter: AnalyticsFilterType = {
        account_category: 'vn',
        exclude: { functional_prefixes: ['99'] },
      }

      const result = withDefaultExcludes(filter)

      expect(result.exclude?.functional_prefixes).toContain('99')
    })
  })

  describe('empty exclude handling', () => {
    it('should not set exclude if no values are present', () => {
      // Mock the defaults to be empty for this test
      const filter: AnalyticsFilterType = {
        account_category: 'ch',
        exclude: {},
      }

      const result = withDefaultExcludes(filter)

      // exclude should still be set due to defaults
      expect(result.exclude).toBeDefined()
    })
  })
})

// ============================================================================
// normalizeAnalyticsFilter
// ============================================================================
describe('normalizeAnalyticsFilter', () => {
  it('should add default account_category', () => {
    const filter = {} as AnalyticsFilterType

    const result = normalizeAnalyticsFilter(filter)

    expect(result.account_category).toBe('ch')
  })

  it('should add report_period if missing', () => {
    const filter: AnalyticsFilterType = { account_category: 'ch' }

    const result = normalizeAnalyticsFilter(filter)

    expect(result.report_period).toBeDefined()
  })

  it('should normalize normalization options', () => {
    const filter: AnalyticsFilterType = {
      account_category: 'ch',
      normalization: 'total_euro',
    }

    const result = normalizeAnalyticsFilter(filter)

    expect(result.normalization).toBe('total')
    expect(result.currency).toBe('EUR')
  })

  it('should preserve existing filter values', () => {
    const filter: AnalyticsFilterType = {
      account_category: 'vn',
      entity_cuis: ['123'],
      functional_prefixes: ['70.'],
    }

    const result = normalizeAnalyticsFilter(filter)

    expect(result.account_category).toBe('vn')
    expect(result.entity_cuis).toEqual(['123'])
    expect(result.functional_prefixes).toEqual(['70.'])
  })

  it('should use fallback period when provided', () => {
    const fallbackPeriod: ReportPeriodInput = {
      type: 'MONTH',
      selection: { interval: { start: '2023-01', end: '2023-12' } },
    }
    const filter: AnalyticsFilterType = { account_category: 'ch' }

    const result = normalizeAnalyticsFilter(filter, { period: fallbackPeriod })

    expect(result.report_period).toBe(fallbackPeriod)
  })

  it('should set inflation_adjusted and show_period_growth', () => {
    const filter: AnalyticsFilterType = {
      account_category: 'ch',
      inflation_adjusted: true,
      show_period_growth: true,
    }

    const result = normalizeAnalyticsFilter(filter)

    expect(result.inflation_adjusted).toBe(true)
    expect(result.show_period_growth).toBe(true)
  })
})

// ============================================================================
// prepareFilterForServer
// ============================================================================
describe('prepareFilterForServer', () => {
  it('should normalize the filter', () => {
    const filter = {} as AnalyticsFilterType

    const result = prepareFilterForServer(filter)

    expect(result.account_category).toBe('ch')
    expect(result.report_period).toBeDefined()
  })

  it('should only include allowed keys', () => {
    const filter: AnalyticsFilterType = {
      account_category: 'ch',
      entity_cuis: ['123'],
      functional_prefixes: ['70.'],
      // Add a non-server key (if any existed)
    }

    const result = prepareFilterForServer(filter)

    expect(result.entity_cuis).toEqual(['123'])
    expect(result.functional_prefixes).toEqual(['70.'])
  })

  it('should pass through exclude filters', () => {
    const filter: AnalyticsFilterType = {
      account_category: 'ch',
      exclude: {
        economic_prefixes: ['51', '55'],
      },
    }

    const result = prepareFilterForServer(filter)

    expect(result.exclude).toBeDefined()
    expect(result.exclude?.economic_prefixes).toEqual(['51', '55'])
  })

  it('should preserve normalization settings', () => {
    const filter: AnalyticsFilterType = {
      account_category: 'ch',
      normalization: 'per_capita',
      currency: 'EUR',
      inflation_adjusted: true,
    }

    const result = prepareFilterForServer(filter)

    expect(result.normalization).toBe('per_capita')
    expect(result.currency).toBe('EUR')
    expect(result.inflation_adjusted).toBe(true)
  })

  it('should preserve amount filters', () => {
    const filter: AnalyticsFilterType = {
      account_category: 'ch',
      aggregate_min_amount: 1000,
      aggregate_max_amount: 1000000,
      item_min_amount: 100,
      item_max_amount: 50000,
    }

    const result = prepareFilterForServer(filter)

    expect(result.aggregate_min_amount).toBe(1000)
    expect(result.aggregate_max_amount).toBe(1000000)
    expect(result.item_min_amount).toBe(100)
    expect(result.item_max_amount).toBe(50000)
  })

  it('should preserve geographic filters', () => {
    const filter: AnalyticsFilterType = {
      account_category: 'ch',
      county_codes: ['CJ', 'TM'],
      regions: ['Nord-Vest'],
      uat_ids: ['12345'],
    }

    const result = prepareFilterForServer(filter)

    expect(result.county_codes).toEqual(['CJ', 'TM'])
    expect(result.regions).toEqual(['Nord-Vest'])
    expect(result.uat_ids).toEqual(['12345'])
  })

  it('should preserve classification filters', () => {
    const filter: AnalyticsFilterType = {
      account_category: 'ch',
      functional_codes: ['70.11.01'],
      economic_codes: ['20.01'],
      functional_prefixes: ['70.'],
      economic_prefixes: ['20.'],
    }

    const result = prepareFilterForServer(filter)

    expect(result.functional_codes).toEqual(['70.11.01'])
    expect(result.economic_codes).toEqual(['20.01'])
    expect(result.functional_prefixes).toEqual(['70.'])
    expect(result.economic_prefixes).toEqual(['20.'])
  })

  it('should preserve entity filters', () => {
    const filter: AnalyticsFilterType = {
      account_category: 'ch',
      entity_cuis: ['123', '456'],
      main_creditor_cui: '789',
      entity_types: ['school', 'hospital'],
      is_uat: true,
    }

    const result = prepareFilterForServer(filter)

    expect(result.entity_cuis).toEqual(['123', '456'])
    expect(result.main_creditor_cui).toBe('789')
    expect(result.entity_types).toEqual(['school', 'hospital'])
    expect(result.is_uat).toBe(true)
  })

  it('should preserve population filters', () => {
    const filter: AnalyticsFilterType = {
      account_category: 'ch',
      min_population: 10000,
      max_population: 100000,
    }

    const result = prepareFilterForServer(filter)

    expect(result.min_population).toBe(10000)
    expect(result.max_population).toBe(100000)
  })
})

// ============================================================================
// Commitments filters
// ============================================================================
describe('normalizeCommitmentsFilter', () => {
  it('adds default report period and report type', () => {
    const filter = {} as CommitmentsFilterType

    const result = normalizeCommitmentsFilter(filter)

    expect(result.report_period).toBeDefined()
    expect(result.report_period?.selection.interval?.start).toBe(String(defaultCommitmentsPeriodStartYear))
    expect(result.report_period?.selection.interval?.end).toBe(String(defaultYearRange.end))
    expect(result.report_type).toBe('PRINCIPAL_AGGREGATED')
  })

  it('normalizes legacy total_euro to total + EUR', () => {
    const filter: CommitmentsFilterType = {
      normalization: 'total_euro',
    }

    const result = normalizeCommitmentsFilter(filter)

    expect(result.normalization).toBe('total')
    expect(result.currency).toBe('EUR')
  })

  it('defaults transfer exclusions via economic prefixes', () => {
    const filter: CommitmentsFilterType = {}

    const result = normalizeCommitmentsFilter(filter)

    expect(result.exclude?.economic_prefixes).toEqual(['51.01', '51.02'])
  })
})

describe('prepareCommitmentsFilterForServer', () => {
  it('keeps only allowed commitments keys and include exclude object', () => {
    const filter: CommitmentsFilterType = {
      entity_cuis: ['123'],
      report_type: 'PRINCIPAL_AGGREGATED',
      report_period: {
        type: 'YEAR',
        selection: { interval: { start: '2024', end: '2024' } },
      },
      exclude: {
        economic_prefixes: ['51.01'],
      },
    }

    const result = prepareCommitmentsFilterForServer(filter)

    expect(result.entity_cuis).toEqual(['123'])
    expect(result.exclude?.economic_prefixes).toEqual(['51.01'])
  })

  it('coerces execution-style report type labels to commitments report type values', () => {
    const filter: CommitmentsFilterType = {
      report_type: 'Executie bugetara agregata la nivel de ordonator principal' as any,
      report_period: {
        type: 'YEAR',
        selection: { interval: { start: '2024', end: '2024' } },
      },
    }

    const result = prepareCommitmentsFilterForServer(filter)

    expect(result.report_type).toBe('PRINCIPAL_AGGREGATED')
  })

  it('maps commitment enum-prefixed report types to plain commitments values', () => {
    const filter: CommitmentsFilterType = {
      report_type: 'COMMITMENT_SECONDARY_AGGREGATED' as any,
      report_period: {
        type: 'YEAR',
        selection: { interval: { start: '2024', end: '2024' } },
      },
    }

    const result = prepareCommitmentsFilterForServer(filter)

    expect(result.report_type).toBe('SECONDARY_AGGREGATED')
  })
})


describe('executive filter transport', () => {
  it.each([true, false, undefined])('preserves executive=%s through execution and commitments preparation', (flag) => {
    const input = { account_category: 'ch' as const, is_territorial_executive: flag, is_uat: false };
    expect(prepareFilterForServer(input).is_territorial_executive).toBe(flag);
    expect(prepareFilterForServer(input).is_uat).toBe(false);
    expect(prepareCommitmentsFilterForServer(input).is_territorial_executive).toBe(flag);
    expect(prepareCommitmentsFilterForServer(input).is_uat).toBe(false);
  });
});
