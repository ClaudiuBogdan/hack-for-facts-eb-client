import { describe, it, expect, vi } from 'vitest'
import {
  validateAnalyticsSeries,
  sanitizeAnalyticsSeries,
  formatValidationErrors,
  validateAggregatedData,
  sanitizeAggregatedData,
  combineValidationResults,
  validateSeriesCompleteness,
  type ValidationResult,
} from './chart-data-validation'
import type { AnalyticsSeries } from '@/schemas/charts'

// Mock the logger
vi.mock('./logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

// Mock getXAxisUnit
vi.mock('./chart-data-utils', () => ({
  getXAxisUnit: vi.fn(() => 'year'),
}))

// ============================================================================
// TEST HELPERS
// ============================================================================

const createValidSeries = (id: string, data: { x: string; y: number }[]): AnalyticsSeries => ({
  seriesId: id,
  xAxis: { name: 'Year', type: 'INTEGER', unit: '' },
  yAxis: { name: 'Amount', type: 'FLOAT', unit: 'RON' },
  data,
})

const createSeriesMap = (series: AnalyticsSeries[]): Map<string, AnalyticsSeries> => {
  const map = new Map<string, AnalyticsSeries>()
  for (const s of series) {
    map.set(s.seriesId, s)
  }
  return map
}

// ============================================================================
// validateAnalyticsSeries
// ============================================================================
describe('validateAnalyticsSeries', () => {
  describe('valid data', () => {
    it('should return valid result for correct data', () => {
      const seriesMap = createSeriesMap([
        createValidSeries('series1', [
          { x: '2020', y: 100 },
          { x: '2021', y: 200 },
          { x: '2022', y: 300 },
        ]),
      ])

      const result = validateAnalyticsSeries(seriesMap)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })

    it('should handle multiple valid series', () => {
      const seriesMap = createSeriesMap([
        createValidSeries('series1', [{ x: '2020', y: 100 }]),
        createValidSeries('series2', [{ x: '2020', y: 200 }]),
        createValidSeries('series3', [{ x: '2020', y: 300 }]),
      ])

      const result = validateAnalyticsSeries(seriesMap)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should handle zero values', () => {
      const seriesMap = createSeriesMap([
        createValidSeries('series1', [{ x: '2020', y: 0 }]),
      ])

      const result = validateAnalyticsSeries(seriesMap)

      expect(result.isValid).toBe(true)
    })

    it('should handle negative values', () => {
      const seriesMap = createSeriesMap([
        createValidSeries('series1', [{ x: '2020', y: -500 }]),
      ])

      const result = validateAnalyticsSeries(seriesMap)

      expect(result.isValid).toBe(true)
    })
  })

  describe('empty series', () => {
    it('should warn for series with no data', () => {
      const seriesMap = createSeriesMap([
        createValidSeries('empty-series', []),
      ])

      const result = validateAnalyticsSeries(seriesMap)

      expect(result.isValid).toBe(true)
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0].type).toBe('empty_series')
      expect(result.warnings[0].seriesId).toBe('empty-series')
    })

    it('should warn for series with null data', () => {
      const series: AnalyticsSeries = {
        seriesId: 'null-data-series',
        xAxis: { name: 'Year', type: 'INTEGER', unit: '' },
        yAxis: { name: 'Amount', type: 'FLOAT', unit: 'RON' },
        data: null as unknown as { x: string; y: number }[],
      }
      const seriesMap = new Map([['null-data-series', series]])

      const result = validateAnalyticsSeries(seriesMap)

      expect(result.warnings.some(w => w.type === 'empty_series')).toBe(true)
    })
  })

  describe('invalid x values', () => {
    it('should warn for non-numeric x value', () => {
      const seriesMap = createSeriesMap([
        createValidSeries('series1', [
          { x: 'invalid', y: 100 },
        ]),
      ])

      const result = validateAnalyticsSeries(seriesMap)

      expect(result.warnings.some(w => w.type === 'invalid_x_value')).toBe(true)
    })

    it('should NOT warn for empty x value (converts to 0, which is a valid finite number)', () => {
      // Note: Number('') === 0 which is a finite number, so no warning is generated
      // This tests the actual behavior of the implementation
      const seriesMap = createSeriesMap([
        createValidSeries('series1', [
          { x: '', y: 100 },
        ]),
      ])

      const result = validateAnalyticsSeries(seriesMap)

      expect(result.warnings.some(w => w.type === 'invalid_x_value')).toBe(false)
    })
  })

  describe('invalid y values', () => {
    it('should warn for null y value', () => {
      const seriesMap = createSeriesMap([
        createValidSeries('series1', [
          { x: '2020', y: null as unknown as number },
        ]),
      ])

      const result = validateAnalyticsSeries(seriesMap)

      expect(result.warnings.some(w => w.type === 'invalid_y_value')).toBe(true)
    })

    it('should warn for undefined y value', () => {
      const seriesMap = createSeriesMap([
        createValidSeries('series1', [
          { x: '2020', y: undefined as unknown as number },
        ]),
      ])

      const result = validateAnalyticsSeries(seriesMap)

      expect(result.warnings.some(w => w.type === 'invalid_y_value')).toBe(true)
    })

    it('should warn for NaN y value', () => {
      const seriesMap = createSeriesMap([
        createValidSeries('series1', [
          { x: '2020', y: NaN },
        ]),
      ])

      const result = validateAnalyticsSeries(seriesMap)

      expect(result.warnings.some(w => w.type === 'invalid_y_value')).toBe(true)
    })

    it('should warn for Infinity y value', () => {
      const seriesMap = createSeriesMap([
        createValidSeries('series1', [
          { x: '2020', y: Infinity },
        ]),
      ])

      const result = validateAnalyticsSeries(seriesMap)

      expect(result.warnings.some(w => w.type === 'invalid_y_value')).toBe(true)
    })

    it('should warn for -Infinity y value', () => {
      const seriesMap = createSeriesMap([
        createValidSeries('series1', [
          { x: '2020', y: -Infinity },
        ]),
      ])

      const result = validateAnalyticsSeries(seriesMap)

      expect(result.warnings.some(w => w.type === 'invalid_y_value')).toBe(true)
    })

    it('should warn for string y value', () => {
      const seriesMap = createSeriesMap([
        createValidSeries('series1', [
          { x: '2020', y: 'invalid' as unknown as number },
        ]),
      ])

      const result = validateAnalyticsSeries(seriesMap)

      expect(result.warnings.some(w => w.type === 'invalid_y_value')).toBe(true)
    })
  })

  describe('mixed valid and invalid data', () => {
    it('should identify all invalid points', () => {
      const seriesMap = createSeriesMap([
        createValidSeries('series1', [
          { x: '2020', y: 100 },
          { x: 'invalid', y: 200 },
          { x: '2022', y: null as unknown as number },
        ]),
      ])

      const result = validateAnalyticsSeries(seriesMap)

      expect(result.warnings.length).toBeGreaterThanOrEqual(2)
    })
  })
})

// ============================================================================
// sanitizeAnalyticsSeries
// ============================================================================
describe('sanitizeAnalyticsSeries', () => {
  it('should remove points with invalid x values', () => {
    const seriesMap = createSeriesMap([
      createValidSeries('series1', [
        { x: '2020', y: 100 },
        { x: 'invalid', y: 200 },
        { x: '2022', y: 300 },
      ]),
    ])
    const validationResult = validateAnalyticsSeries(seriesMap)

    const sanitized = sanitizeAnalyticsSeries(seriesMap, validationResult)

    const series = sanitized.get('series1')
    expect(series?.data).toHaveLength(2)
    expect(series?.data.every(p => Number.isFinite(Number(p.x)))).toBe(true)
  })

  it('should remove points with invalid y values', () => {
    const seriesMap = createSeriesMap([
      createValidSeries('series1', [
        { x: '2020', y: 100 },
        { x: '2021', y: null as unknown as number },
        { x: '2022', y: 300 },
      ]),
    ])
    const validationResult = validateAnalyticsSeries(seriesMap)

    const sanitized = sanitizeAnalyticsSeries(seriesMap, validationResult)

    const series = sanitized.get('series1')
    expect(series?.data).toHaveLength(2)
    expect(series?.data.every(p => typeof p.y === 'number' && Number.isFinite(p.y))).toBe(true)
  })

  it('should preserve valid series metadata', () => {
    const seriesMap = createSeriesMap([
      createValidSeries('series1', [{ x: '2020', y: 100 }]),
    ])
    const validationResult = validateAnalyticsSeries(seriesMap)

    const sanitized = sanitizeAnalyticsSeries(seriesMap, validationResult)

    const series = sanitized.get('series1')
    expect(series?.seriesId).toBe('series1')
    expect(series?.xAxis.name).toBe('Year')
    expect(series?.yAxis.unit).toBe('RON')
  })

  it('should handle empty series', () => {
    const seriesMap = createSeriesMap([
      createValidSeries('empty-series', []),
    ])
    const validationResult = validateAnalyticsSeries(seriesMap)

    const sanitized = sanitizeAnalyticsSeries(seriesMap, validationResult)

    const series = sanitized.get('empty-series')
    expect(series?.data).toHaveLength(0)
  })

  it('should return new Map instance', () => {
    const seriesMap = createSeriesMap([
      createValidSeries('series1', [{ x: '2020', y: 100 }]),
    ])
    const validationResult = validateAnalyticsSeries(seriesMap)

    const sanitized = sanitizeAnalyticsSeries(seriesMap, validationResult)

    expect(sanitized).not.toBe(seriesMap)
  })
})

// ============================================================================
// formatValidationErrors
// ============================================================================
describe('formatValidationErrors', () => {
  it('should return empty string for no errors or warnings', () => {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    }

    expect(formatValidationErrors(result)).toBe('')
  })

  it('should format errors', () => {
    const result: ValidationResult = {
      isValid: false,
      errors: [
        {
          type: 'invalid_y_value',
          seriesId: 'series1',
          message: 'Invalid value',
          pointIndex: 0,
        },
      ],
      warnings: [],
    }

    const formatted = formatValidationErrors(result)

    expect(formatted).toContain('Errors')
    expect(formatted).toContain('series1')
    expect(formatted).toContain('invalid_y_value')
  })

  it('should format warnings', () => {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [
        {
          type: 'empty_series',
          seriesId: 'series1',
          message: 'Empty series',
        },
      ],
    }

    const formatted = formatValidationErrors(result)

    expect(formatted).toContain('Warnings')
    expect(formatted).toContain('series1')
  })

  it('should group errors by series', () => {
    const result: ValidationResult = {
      isValid: false,
      errors: [
        { type: 'invalid_y_value', seriesId: 'series1', message: 'Error 1' },
        { type: 'invalid_x_value', seriesId: 'series1', message: 'Error 2' },
        { type: 'invalid_y_value', seriesId: 'series2', message: 'Error 3' },
      ],
      warnings: [],
    }

    const formatted = formatValidationErrors(result)

    expect(formatted).toContain('series1')
    expect(formatted).toContain('series2')
  })

  it('should include both errors and warnings', () => {
    const result: ValidationResult = {
      isValid: false,
      errors: [{ type: 'invalid_y_value', seriesId: 's1', message: 'Error' }],
      warnings: [{ type: 'empty_series', seriesId: 's2', message: 'Warning' }],
    }

    const formatted = formatValidationErrors(result)

    expect(formatted).toContain('Errors')
    expect(formatted).toContain('Warnings')
  })
})

// ============================================================================
// validateAggregatedData
// ============================================================================
describe('validateAggregatedData', () => {
  it('should return valid for correct aggregated data', () => {
    const data = [
      { id: 'cat1', value: 100 },
      { id: 'cat2', value: 200 },
    ]

    const result = validateAggregatedData(data)

    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should warn for empty data', () => {
    const result = validateAggregatedData([])

    expect(result.warnings.some(w => w.type === 'missing_data')).toBe(true)
  })

  it('should warn for null data', () => {
    const result = validateAggregatedData(null as unknown as { id: string; value: number }[])

    expect(result.warnings.some(w => w.type === 'missing_data')).toBe(true)
  })

  it('should warn for undefined data', () => {
    const result = validateAggregatedData(undefined as unknown as { id: string; value: number }[])

    expect(result.warnings.some(w => w.type === 'missing_data')).toBe(true)
  })

  it('should warn for NaN value with treatMissingAsZero', () => {
    const data = [{ id: 'cat1', value: NaN }]

    const result = validateAggregatedData(data, { treatMissingAsZero: true })

    expect(result.isValid).toBe(true)
    expect(result.warnings.some(w => w.type === 'invalid_aggregated_value')).toBe(true)
  })

  it('should error for NaN value without treatMissingAsZero', () => {
    const data = [{ id: 'cat1', value: NaN }]

    const result = validateAggregatedData(data, { treatMissingAsZero: false })

    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.type === 'invalid_aggregated_value')).toBe(true)
  })

  it('should warn for null value', () => {
    const data = [{ id: 'cat1', value: null as unknown as number }]

    const result = validateAggregatedData(data)

    expect(result.warnings.some(w => w.type === 'invalid_aggregated_value')).toBe(true)
  })

  it('should warn for Infinity value', () => {
    const data = [{ id: 'cat1', value: Infinity }]

    const result = validateAggregatedData(data)

    expect(result.warnings.some(w => w.type === 'invalid_aggregated_value')).toBe(true)
  })

  it('should handle zero values', () => {
    const data = [{ id: 'cat1', value: 0 }]

    const result = validateAggregatedData(data)

    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.warnings).toHaveLength(0)
  })

  it('should handle negative values', () => {
    const data = [{ id: 'cat1', value: -100 }]

    const result = validateAggregatedData(data)

    expect(result.isValid).toBe(true)
  })
})

// ============================================================================
// sanitizeAggregatedData
// ============================================================================
describe('sanitizeAggregatedData', () => {
  it('should replace NaN with 0', () => {
    const data = [
      { id: 'cat1', value: NaN },
      { id: 'cat2', value: 100 },
    ]

    const sanitized = sanitizeAggregatedData(data)

    expect(sanitized[0].value).toBe(0)
    expect(sanitized[1].value).toBe(100)
  })

  it('should replace null with 0', () => {
    const data = [{ id: 'cat1', value: null as unknown as number }]

    const sanitized = sanitizeAggregatedData(data)

    expect(sanitized[0].value).toBe(0)
  })

  it('should replace undefined with 0', () => {
    const data = [{ id: 'cat1', value: undefined as unknown as number }]

    const sanitized = sanitizeAggregatedData(data)

    expect(sanitized[0].value).toBe(0)
  })

  it('should replace Infinity with 0', () => {
    const data = [{ id: 'cat1', value: Infinity }]

    const sanitized = sanitizeAggregatedData(data)

    expect(sanitized[0].value).toBe(0)
  })

  it('should preserve valid values', () => {
    const data = [
      { id: 'cat1', value: 100 },
      { id: 'cat2', value: -50 },
      { id: 'cat3', value: 0 },
    ]

    const sanitized = sanitizeAggregatedData(data)

    expect(sanitized).toEqual(data)
  })

  it('should preserve ids', () => {
    const data = [
      { id: 'my-category', value: NaN },
    ]

    const sanitized = sanitizeAggregatedData(data)

    expect(sanitized[0].id).toBe('my-category')
  })
})

// ============================================================================
// combineValidationResults
// ============================================================================
describe('combineValidationResults', () => {
  it('should combine multiple valid results', () => {
    const result1: ValidationResult = { isValid: true, errors: [], warnings: [] }
    const result2: ValidationResult = { isValid: true, errors: [], warnings: [] }

    const combined = combineValidationResults(result1, result2)

    expect(combined.isValid).toBe(true)
    expect(combined.errors).toHaveLength(0)
    expect(combined.warnings).toHaveLength(0)
  })

  it('should set isValid to false if any result is invalid', () => {
    const result1: ValidationResult = { isValid: true, errors: [], warnings: [] }
    const result2: ValidationResult = {
      isValid: false,
      errors: [{ type: 'invalid_y_value', seriesId: 's1', message: 'Error' }],
      warnings: [],
    }

    const combined = combineValidationResults(result1, result2)

    expect(combined.isValid).toBe(false)
  })

  it('should concatenate errors from all results', () => {
    const result1: ValidationResult = {
      isValid: false,
      errors: [{ type: 'invalid_y_value', seriesId: 's1', message: 'Error 1' }],
      warnings: [],
    }
    const result2: ValidationResult = {
      isValid: false,
      errors: [{ type: 'invalid_x_value', seriesId: 's2', message: 'Error 2' }],
      warnings: [],
    }

    const combined = combineValidationResults(result1, result2)

    expect(combined.errors).toHaveLength(2)
  })

  it('should concatenate warnings from all results', () => {
    const result1: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [{ type: 'empty_series', seriesId: 's1', message: 'Warning 1' }],
    }
    const result2: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [{ type: 'missing_data', seriesId: 's2', message: 'Warning 2' }],
    }

    const combined = combineValidationResults(result1, result2)

    expect(combined.warnings).toHaveLength(2)
  })

  it('should handle null results', () => {
    const result1: ValidationResult = { isValid: true, errors: [], warnings: [] }

    const combined = combineValidationResults(result1, null)

    expect(combined.isValid).toBe(true)
  })

  it('should handle undefined results', () => {
    const result1: ValidationResult = { isValid: true, errors: [], warnings: [] }

    const combined = combineValidationResults(result1, undefined)

    expect(combined.isValid).toBe(true)
  })

  it('should handle all null/undefined results', () => {
    const combined = combineValidationResults(null, undefined, null)

    expect(combined.isValid).toBe(true)
    expect(combined.errors).toHaveLength(0)
    expect(combined.warnings).toHaveLength(0)
  })

  it('should handle many results', () => {
    const results: ValidationResult[] = Array.from({ length: 10 }, (_, i) => ({
      isValid: true,
      errors: [],
      warnings: [{ type: 'empty_series' as const, seriesId: `s${i}`, message: `Warning ${i}` }],
    }))

    const combined = combineValidationResults(...results)

    expect(combined.warnings).toHaveLength(10)
  })
})

// ============================================================================
// validateSeriesCompleteness
// ============================================================================
describe('validateSeriesCompleteness', () => {
  it('should return valid for complete data', () => {
    const seriesMap = createSeriesMap([
      createValidSeries('series1', [
        { x: '2020', y: 100 },
        { x: '2021', y: 200 },
        { x: '2022', y: 300 },
      ]),
    ])

    const result = validateSeriesCompleteness(seriesMap, { start: 2020, end: 2022 })

    expect(result.isValid).toBe(true)
    expect(result.warnings).toHaveLength(0)
  })

  it('should warn for missing years', () => {
    const seriesMap = createSeriesMap([
      createValidSeries('series1', [
        { x: '2020', y: 100 },
        { x: '2022', y: 300 },
        // Missing 2021
      ]),
    ])

    const result = validateSeriesCompleteness(seriesMap, { start: 2020, end: 2022 })

    expect(result.warnings.some(w => w.type === 'missing_data')).toBe(true)
    expect(result.warnings.some(w => w.message.includes('2021'))).toBe(true)
  })

  it('should warn when entire range is missing', () => {
    const seriesMap = createSeriesMap([
      createValidSeries('series1', [
        { x: '2015', y: 100 }, // Outside range
      ]),
    ])

    const result = validateSeriesCompleteness(seriesMap, { start: 2020, end: 2022 })

    expect(result.warnings.some(w => w.type === 'missing_data')).toBe(true)
    expect(result.warnings.some(w => w.message.includes('No data available'))).toBe(true)
  })

  it('should handle empty series', () => {
    const seriesMap = createSeriesMap([
      createValidSeries('empty-series', []),
    ])

    const result = validateSeriesCompleteness(seriesMap, { start: 2020, end: 2022 })

    expect(result.warnings.some(w => w.type === 'missing_data')).toBe(true)
  })

  it('should handle single year range', () => {
    const seriesMap = createSeriesMap([
      createValidSeries('series1', [{ x: '2020', y: 100 }]),
    ])

    const result = validateSeriesCompleteness(seriesMap, { start: 2020, end: 2020 })

    expect(result.warnings).toHaveLength(0)
  })

  it('should handle multiple series with different completeness', () => {
    const seriesMap = createSeriesMap([
      createValidSeries('complete', [
        { x: '2020', y: 100 },
        { x: '2021', y: 200 },
      ]),
      createValidSeries('incomplete', [
        { x: '2020', y: 100 },
        // Missing 2021
      ]),
    ])

    const result = validateSeriesCompleteness(seriesMap, { start: 2020, end: 2021 })

    expect(result.warnings.filter(w => w.seriesId === 'incomplete')).toHaveLength(1)
    expect(result.warnings.filter(w => w.seriesId === 'complete')).toHaveLength(0)
  })

  it('should ignore data outside the specified range', () => {
    const seriesMap = createSeriesMap([
      createValidSeries('series1', [
        { x: '2019', y: 50 },
        { x: '2020', y: 100 },
        { x: '2021', y: 200 },
        { x: '2023', y: 400 },
      ]),
    ])

    const result = validateSeriesCompleteness(seriesMap, { start: 2020, end: 2021 })

    expect(result.warnings).toHaveLength(0)
  })
})

it('preserves and explains all-gap native series before the empty-data check', () => {
  const series = { ...createValidSeries('native', []), missingPeriods: ['2023'] }
  const map = createSeriesMap([series])
  const validation = validateAnalyticsSeries(map)
  expect(validation.warnings.some(w => w.type === 'missing_data')).toBe(true)
  expect(sanitizeAnalyticsSeries(map, validation).get('native')?.missingPeriods).toEqual(['2023'])
})
