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

// Mock logger
vi.mock('./logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

// Mock generateRandomColor since it's used in charts schema defaults
vi.mock('@/components/charts/components/chart-renderer/utils', () => ({
  generateRandomColor: vi.fn(() => '#0000ff'),
}))

import {
  hasCalculationCycle,
  evaluateCalculation,
  validateNewCalculationSeries,
  calculateAllSeriesData,
  getCalculationDependencies,
  getAllDependencies,
} from './chart-calculation-utils'
import type { Series, Calculation, AnalyticsSeries, Chart } from '@/schemas/charts'

// ============================================================================
// TEST HELPERS
// ============================================================================

const timestamp = new Date().toISOString()

const createDataSeries = (id: string): Series => ({
  id,
  type: 'line-items-aggregated-yearly',
  enabled: true,
  label: `Series ${id}`,
  config: { showDataLabels: false, color: '#0000ff' },
  filter: { account_category: 'ch' },
  createdAt: timestamp,
  updatedAt: timestamp,
  unit: 'RON',
})

const createCalculationSeries = (
  id: string,
  calculation: Calculation
): Series => ({
  id,
  type: 'aggregated-series-calculation',
  enabled: true,
  label: `Calculation ${id}`,
  config: { showDataLabels: false, color: '#ff0000' },
  calculation,
  createdAt: timestamp,
  updatedAt: timestamp,
  unit: 'RON',
})

const createCustomSeries = (id: string, data: { year: number; value: number }[]): Series => ({
  id,
  type: 'custom-series',
  enabled: true,
  label: `Custom ${id}`,
  config: { showDataLabels: false, color: '#00ff00' },
  data,
  createdAt: timestamp,
  updatedAt: timestamp,
  unit: 'RON',
})

const createCustomValueSeries = (id: string, value: number): Series => ({
  id,
  type: 'custom-series-value',
  enabled: true,
  label: `Custom Value ${id}`,
  config: { showDataLabels: false, color: '#0000ff' },
  value,
  createdAt: timestamp,
  updatedAt: timestamp,
  unit: 'RON',
})

const createAnalyticsSeries = (id: string, data: { x: string; y: number }[]): AnalyticsSeries => ({
  seriesId: id,
  xAxis: { name: 'Year', type: 'INTEGER', unit: '' },
  yAxis: { name: 'Amount', type: 'FLOAT', unit: 'RON' },
  data,
})

// ============================================================================
// hasCalculationCycle
// ============================================================================
describe('hasCalculationCycle', () => {
  describe('no cycles', () => {
    it('should return false for simple calculation with no dependencies', () => {
      const calculation: Calculation = { op: 'sum', args: ['series1', 'series2'] }
      const allSeries = [createDataSeries('series1'), createDataSeries('series2')]

      const hasCycle = hasCalculationCycle('calc1', calculation, allSeries)

      expect(hasCycle).toBe(false)
    })

    it('should return false for calculation referencing data series', () => {
      const calculation: Calculation = { op: 'sum', args: ['a', 'b'] }
      const allSeries = [createDataSeries('a'), createDataSeries('b')]

      const hasCycle = hasCalculationCycle('calc', calculation, allSeries)

      expect(hasCycle).toBe(false)
    })

    it('should return false for chain of calculations without cycle', () => {
      // calc1 = a + b, calc2 = calc1 + c (no cycle)
      const allSeries = [
        createDataSeries('a'),
        createDataSeries('b'),
        createDataSeries('c'),
        createCalculationSeries('calc1', { op: 'sum', args: ['a', 'b'] }),
      ]
      const calc2: Calculation = { op: 'sum', args: ['calc1', 'c'] }

      const hasCycle = hasCalculationCycle('calc2', calc2, allSeries)

      expect(hasCycle).toBe(false)
    })

    it('should return false for nested calculation', () => {
      const calculation: Calculation = {
        op: 'sum',
        args: [
          { op: 'multiply', args: ['a', 2] },
          'b',
        ],
      }
      const allSeries = [createDataSeries('a'), createDataSeries('b')]

      const hasCycle = hasCalculationCycle('calc', calculation, allSeries)

      expect(hasCycle).toBe(false)
    })

    it('should return false for diamond dependencies (DAG)', () => {
      // A -> B, A -> C, B -> D, C -> D
      // calc1 depends on a, b
      // calc2 depends on a, c
      // calc3 depends on calc1, calc2 (depends on a via two paths)
      const allSeries = [
        createDataSeries('a'),
        createDataSeries('b'),
        createDataSeries('c'),
        createCalculationSeries('calc1', { op: 'sum', args: ['a', 'b'] }),
        createCalculationSeries('calc2', { op: 'sum', args: ['a', 'c'] }),
      ]
      const calc3: Calculation = { op: 'sum', args: ['calc1', 'calc2'] }

      const hasCycle = hasCalculationCycle('calc3', calc3, allSeries)

      expect(hasCycle).toBe(false)
    })
  })

  describe('with cycles', () => {
    it('should return true for self-referencing calculation', () => {
      const calculation: Calculation = { op: 'sum', args: ['calc1', 'a'] }
      const allSeries = [createDataSeries('a')]

      const hasCycle = hasCalculationCycle('calc1', calculation, allSeries)

      expect(hasCycle).toBe(true)
    })

    it('should return true for nested self-referencing calculation', () => {
      const calculation: Calculation = { 
        op: 'sum', 
        args: [
          'a', 
          { op: 'multiply', args: ['calc1', 2] } // Nested reference to self
        ] 
      }
      const allSeries = [createDataSeries('a')]

      const hasCycle = hasCalculationCycle('calc1', calculation, allSeries)

      expect(hasCycle).toBe(true)
    })

    it('should return true for circular dependency (A -> B -> A)', () => {
      // calc1 depends on calc2, calc2 depends on calc1
      const allSeries = [
        createCalculationSeries('calc1', { op: 'sum', args: ['calc2', 'a'] }),
        createDataSeries('a'),
      ]
      const calc2: Calculation = { op: 'sum', args: ['calc1', 'a'] }

      const hasCycle = hasCalculationCycle('calc2', calc2, allSeries)

      expect(hasCycle).toBe(true)
    })

    it('should return true for longer cycle (A -> B -> C -> A)', () => {
      const allSeries = [
        createCalculationSeries('calc1', { op: 'sum', args: ['calc3', 'a'] }),
        createCalculationSeries('calc2', { op: 'sum', args: ['calc1', 'a'] }),
        createDataSeries('a'),
      ]
      const calc3: Calculation = { op: 'sum', args: ['calc2', 'a'] }

      const hasCycle = hasCalculationCycle('calc3', calc3, allSeries)

      expect(hasCycle).toBe(true)
    })
  })
})

// ============================================================================
// evaluateCalculation
// ============================================================================
describe('evaluateCalculation', () => {
  describe('sum operation', () => {
    it('should sum two series', () => {
      const seriesData = new Map<string, AnalyticsSeries>([
        ['a', createAnalyticsSeries('a', [{ x: '2020', y: 100 }, { x: '2021', y: 200 }])],
        ['b', createAnalyticsSeries('b', [{ x: '2020', y: 50 }, { x: '2021', y: 75 }])],
      ])
      const calculation: Calculation = { op: 'sum', args: ['a', 'b'] }

      const result = evaluateCalculation(calculation, seriesData, [], 'test')

      expect(result.points).toHaveLength(2)
      expect(result.points.find(p => p.x === '2020')?.y).toBe(150)
      expect(result.points.find(p => p.x === '2021')?.y).toBe(275)
    })

    it('should handle missing years in one series', () => {
      const seriesData = new Map<string, AnalyticsSeries>([
        ['a', createAnalyticsSeries('a', [{ x: '2020', y: 100 }])],
        ['b', createAnalyticsSeries('b', [{ x: '2020', y: 50 }, { x: '2021', y: 75 }])],
      ])
      const calculation: Calculation = { op: 'sum', args: ['a', 'b'] }

      const result = evaluateCalculation(calculation, seriesData, [], 'test')

      // Should have both years, using 0 for missing a[2021]
      expect(result.points.find(p => p.x === '2020')?.y).toBe(150)
      expect(result.points.find(p => p.x === '2021')?.y).toBe(75)
    })

    it('should sum three or more series', () => {
      const seriesData = new Map<string, AnalyticsSeries>([
        ['a', createAnalyticsSeries('a', [{ x: '2020', y: 100 }])],
        ['b', createAnalyticsSeries('b', [{ x: '2020', y: 50 }])],
        ['c', createAnalyticsSeries('c', [{ x: '2020', y: 25 }])],
      ])
      const calculation: Calculation = { op: 'sum', args: ['a', 'b', 'c'] }

      const result = evaluateCalculation(calculation, seriesData, [], 'test')

      expect(result.points.find(p => p.x === '2020')?.y).toBe(175)
    })

    it('should handle single operand (identity)', () => {
      const seriesData = new Map<string, AnalyticsSeries>([
        ['a', createAnalyticsSeries('a', [{ x: '2020', y: 100 }])],
      ])
      const calculation: Calculation = { op: 'sum', args: ['a'] }

      const result = evaluateCalculation(calculation, seriesData, [], 'test')

      expect(result.points.find(p => p.x === '2020')?.y).toBe(100)
    })
  })

  describe('subtract operation', () => {
    it('should subtract series', () => {
      const seriesData = new Map<string, AnalyticsSeries>([
        ['a', createAnalyticsSeries('a', [{ x: '2020', y: 100 }])],
        ['b', createAnalyticsSeries('b', [{ x: '2020', y: 30 }])],
      ])
      const calculation: Calculation = { op: 'subtract', args: ['a', 'b'] }

      const result = evaluateCalculation(calculation, seriesData, [], 'test')

      expect(result.points.find(p => p.x === '2020')?.y).toBe(70)
    })

    it('should handle multiple subtractions', () => {
      const seriesData = new Map<string, AnalyticsSeries>([
        ['a', createAnalyticsSeries('a', [{ x: '2020', y: 100 }])],
        ['b', createAnalyticsSeries('b', [{ x: '2020', y: 30 }])],
        ['c', createAnalyticsSeries('c', [{ x: '2020', y: 20 }])],
      ])
      const calculation: Calculation = { op: 'subtract', args: ['a', 'b', 'c'] }

      const result = evaluateCalculation(calculation, seriesData, [], 'test')

      expect(result.points.find(p => p.x === '2020')?.y).toBe(50)
    })

    it('should handle single operand (identity)', () => {
      const seriesData = new Map<string, AnalyticsSeries>([
        ['a', createAnalyticsSeries('a', [{ x: '2020', y: 100 }])],
      ])
      const calculation: Calculation = { op: 'subtract', args: ['a'] }

      const result = evaluateCalculation(calculation, seriesData, [], 'test')

      expect(result.points.find(p => p.x === '2020')?.y).toBe(100)
    })
  })

  describe('multiply operation', () => {
    it('should multiply series', () => {
      const seriesData = new Map<string, AnalyticsSeries>([
        ['a', createAnalyticsSeries('a', [{ x: '2020', y: 10 }])],
        ['b', createAnalyticsSeries('b', [{ x: '2020', y: 5 }])],
      ])
      const calculation: Calculation = { op: 'multiply', args: ['a', 'b'] }

      const result = evaluateCalculation(calculation, seriesData, [], 'test')

      expect(result.points.find(p => p.x === '2020')?.y).toBe(50)
    })

    it('should multiply by constant', () => {
      const seriesData = new Map<string, AnalyticsSeries>([
        ['a', createAnalyticsSeries('a', [{ x: '2020', y: 100 }])],
      ])
      const calculation: Calculation = { op: 'multiply', args: ['a', 2] }

      const result = evaluateCalculation(calculation, seriesData, [], 'test')

      expect(result.points.find(p => p.x === '2020')?.y).toBe(200)
    })

    it('should skip years where an operand is missing', () => {
      const seriesData = new Map<string, AnalyticsSeries>([
        ['a', createAnalyticsSeries('a', [{ x: '2020', y: 10 }, { x: '2021', y: 20 }])],
        ['b', createAnalyticsSeries('b', [{ x: '2020', y: 5 }])], // Missing 2021
      ])
      const calculation: Calculation = { op: 'multiply', args: ['a', 'b'] }

      const result = evaluateCalculation(calculation, seriesData, [], 'test')

      expect(result.points.find(p => p.x === '2020')?.y).toBe(50)
      expect(result.points.find(p => p.x === '2021')).toBeUndefined()
    })
  })

  describe('divide operation', () => {
    it('should divide series', () => {
      const seriesData = new Map<string, AnalyticsSeries>([
        ['a', createAnalyticsSeries('a', [{ x: '2020', y: 100 }])],
        ['b', createAnalyticsSeries('b', [{ x: '2020', y: 5 }])],
      ])
      const calculation: Calculation = { op: 'divide', args: ['a', 'b'] }

      const result = evaluateCalculation(calculation, seriesData, [], 'test')

      expect(result.points.find(p => p.x === '2020')?.y).toBe(20)
    })

    it('should handle division by zero', () => {
      const seriesData = new Map<string, AnalyticsSeries>([
        ['a', createAnalyticsSeries('a', [{ x: '2020', y: 100 }])],
        ['b', createAnalyticsSeries('b', [{ x: '2020', y: 0 }])],
      ])
      const calculation: Calculation = { op: 'divide', args: ['a', 'b'] }

      const result = evaluateCalculation(calculation, seriesData, [], 'test')

      // Division by zero should be excluded from result
      expect(result.points.find(p => p.x === '2020')).toBeUndefined()
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings[0].message).toContain('Division by zero')
    })

    it('should handle missing divisor', () => {
      const seriesData = new Map<string, AnalyticsSeries>([
        ['a', createAnalyticsSeries('a', [{ x: '2020', y: 100 }])],
        ['b', createAnalyticsSeries('b', [])], // Missing 2020
      ])
      const calculation: Calculation = { op: 'divide', args: ['a', 'b'] }

      const result = evaluateCalculation(calculation, seriesData, [], 'test')

      expect(result.points.find(p => p.x === '2020')).toBeUndefined()
    })

    it('should handle multiple divisors', () => {
      // 1000 / 10 / 5 = 20
      const seriesData = new Map<string, AnalyticsSeries>([
        ['a', createAnalyticsSeries('a', [{ x: '2020', y: 1000 }])],
        ['b', createAnalyticsSeries('b', [{ x: '2020', y: 10 }])],
        ['c', createAnalyticsSeries('c', [{ x: '2020', y: 5 }])],
      ])
      const calculation: Calculation = { op: 'divide', args: ['a', 'b', 'c'] }

      const result = evaluateCalculation(calculation, seriesData, [], 'test')

      expect(result.points.find(p => p.x === '2020')?.y).toBe(20)
    })

    it('should handle missing numerator', () => {
      const seriesData = new Map<string, AnalyticsSeries>([
        ['a', createAnalyticsSeries('a', [])],
        ['b', createAnalyticsSeries('b', [{ x: '2020', y: 10 }])],
      ])
      const calculation: Calculation = { op: 'divide', args: ['a', 'b'] }

      const result = evaluateCalculation(calculation, seriesData, [], 'test')

      expect(result.points.find(p => p.x === '2020')).toBeUndefined()
    })
  })

  describe('nested calculations', () => {
    it('should evaluate nested calculations', () => {
      const seriesData = new Map<string, AnalyticsSeries>([
        ['a', createAnalyticsSeries('a', [{ x: '2020', y: 10 }])],
        ['b', createAnalyticsSeries('b', [{ x: '2020', y: 20 }])],
        ['c', createAnalyticsSeries('c', [{ x: '2020', y: 5 }])],
      ])
      // (a + b) * c = (10 + 20) * 5 = 150
      const calculation: Calculation = {
        op: 'multiply',
        args: [{ op: 'sum', args: ['a', 'b'] }, 'c'],
      }

      const result = evaluateCalculation(calculation, seriesData, [], 'test')

      expect(result.points.find(p => p.x === '2020')?.y).toBe(150)
    })

    it('should resolve recursive calculation series dependencies', () => {
      // calc1 depends on calc2. calc2 is NOT in seriesData initially.
      const seriesData = new Map<string, AnalyticsSeries>([
        ['a', createAnalyticsSeries('a', [{ x: '2020', y: 100 }])],
      ])
      
      const calc2Series = createCalculationSeries('calc2', { op: 'multiply', args: ['a', 2] })
      const allSeries = [calc2Series]
      
      const calculation: Calculation = { op: 'sum', args: ['calc2', 50] }

      // When evaluating, it should find 'calc2' in allSeries, evaluate it (100*2=200), then add 50 -> 250
      const result = evaluateCalculation(calculation, seriesData, allSeries, 'test')

      expect(result.points.find(p => p.x === '2020')?.y).toBe(250)
    })
  })

  describe('with number operands', () => {
    it('should handle constant number operands', () => {
      const seriesData = new Map<string, AnalyticsSeries>([
        ['a', createAnalyticsSeries('a', [{ x: '2020', y: 100 }])],
      ])
      const calculation: Calculation = { op: 'sum', args: ['a', 50] }

      const result = evaluateCalculation(calculation, seriesData, [], 'test')

      expect(result.points.find(p => p.x === '2020')?.y).toBe(150)
    })

    it('should apply constants across non-year operand domains', () => {
      const monthlySeries: AnalyticsSeries = {
        seriesId: 'a',
        xAxis: { name: 'Period', type: 'STRING', unit: 'month' },
        yAxis: { name: 'Value', type: 'FLOAT', unit: 'RON' },
        data: [
          { x: '2024-01', y: 5 },
          { x: '2024-02', y: 8 },
        ],
      }

      const seriesData = new Map<string, AnalyticsSeries>([['a', monthlySeries]])
      const calculation: Calculation = { op: 'sum', args: ['a', 10] }

      const result = evaluateCalculation(calculation, seriesData, [], 'test', 'month')

      expect(result.points).toEqual([
        { x: '2024-01', y: 15 },
        { x: '2024-02', y: 18 },
      ])
    })
  })

  describe('edge cases', () => {
    it('should handle empty operands', () => {
      const seriesData = new Map<string, AnalyticsSeries>()
      const calculation: Calculation = { op: 'sum', args: [] }

      const result = evaluateCalculation(calculation, seriesData, [], 'test')

      expect(result.points).toHaveLength(0)
    })

    it('should handle missing series reference', () => {
      const seriesData = new Map<string, AnalyticsSeries>([
        ['a', createAnalyticsSeries('a', [{ x: '2020', y: 100 }])],
      ])
      const calculation: Calculation = { op: 'sum', args: ['a', 'nonexistent'] }

      const result = evaluateCalculation(calculation, seriesData, [], 'test')

      expect(result.points.find(p => p.x === '2020')?.y).toBe(100)
    })

    it('should not fabricate default-range points when non-constant operands are empty', () => {
      const seriesData = new Map<string, AnalyticsSeries>([
        ['a', createAnalyticsSeries('a', [])],
      ])
      const calculation: Calculation = { op: 'sum', args: ['a', 'nonexistent'] }

      const result = evaluateCalculation(calculation, seriesData, [], 'test')

      expect(result.points).toEqual([])
    })

    it('should keep default-range behavior for constant-only calculations', () => {
      const seriesData = new Map<string, AnalyticsSeries>()
      const calculation: Calculation = { op: 'sum', args: [3, 2] }

      const result = evaluateCalculation(calculation, seriesData, [], 'test')

      expect(result.points.length).toBeGreaterThan(0)
      expect(result.points.every((point) => point.y === 5)).toBe(true)
    })
  })
})

// ============================================================================
// validateNewCalculationSeries
// ============================================================================
describe('validateNewCalculationSeries', () => {
  it('should return valid for calculation without cycle', () => {
    const calculation: Calculation = { op: 'sum', args: ['a', 'b'] }
    const existingSeries = [createDataSeries('a'), createDataSeries('b')]

    const result = validateNewCalculationSeries('calc', calculation, existingSeries)

    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('should return error for self-referencing calculation', () => {
    const calculation: Calculation = { op: 'sum', args: ['calc', 'a'] }
    const existingSeries = [createDataSeries('a')]

    const result = validateNewCalculationSeries('calc', calculation, existingSeries)

    expect(result.valid).toBe(false)
    expect(result.error).toContain('circular')
  })

  it('should return error for missing referenced series', () => {
    const calculation: Calculation = { op: 'sum', args: ['a', 'nonexistent'] }
    const existingSeries = [createDataSeries('a')]

    const result = validateNewCalculationSeries('calc', calculation, existingSeries)

    expect(result.valid).toBe(false)
    expect(result.error).toContain('nonexistent')
  })

  it('should allow referencing the new series itself in the series list', () => {
    // When validating a new series, it should be allowed to exist in args if it's in existingSeries
    const calculation: Calculation = { op: 'sum', args: ['a', 'b'] }
    const existingSeries = [
      createDataSeries('a'),
      createDataSeries('b'),
      createCalculationSeries('calc', calculation),
    ]

    const result = validateNewCalculationSeries('newcalc', { op: 'sum', args: ['calc', 'a'] }, existingSeries)

    expect(result.valid).toBe(true)
  })
})

// ============================================================================
// calculateAllSeriesData
// ============================================================================
describe('calculateAllSeriesData', () => {
  it('should calculate custom series data', () => {
    const series = [
      createCustomSeries('custom1', [
        { year: 2020, value: 100 },
        { year: 2021, value: 200 },
      ]),
    ]
    const dataSeriesMap = new Map<string, AnalyticsSeries>()

    const result = calculateAllSeriesData(series, dataSeriesMap)

    expect(result.dataSeriesMap.has('custom1')).toBe(true)
    const customData = result.dataSeriesMap.get('custom1')!
    expect(customData.data).toHaveLength(2)
    expect(customData.data.find(d => d.x === '2020')?.y).toBe(100)
  })

  it('should calculate custom value series data', () => {
    const series = [createCustomValueSeries('const', 42)]
    const dataSeriesMap = new Map<string, AnalyticsSeries>()

    const result = calculateAllSeriesData(series, dataSeriesMap)

    expect(result.dataSeriesMap.has('const')).toBe(true)
    const constData = result.dataSeriesMap.get('const')!
    // Should have values for default year range
    expect(constData.data.length).toBeGreaterThan(0)
    expect(constData.data.every(d => d.y === 42)).toBe(true)
  })

  it('should calculate calculation series using other series', () => {
    const series = [
      createCustomSeries('a', [{ year: 2020, value: 100 }]),
      createCustomSeries('b', [{ year: 2020, value: 50 }]),
      createCalculationSeries('calc', { op: 'sum', args: ['a', 'b'] }),
    ]
    const dataSeriesMap = new Map<string, AnalyticsSeries>()

    const result = calculateAllSeriesData(series, dataSeriesMap)

    expect(result.dataSeriesMap.has('calc')).toBe(true)
    const calcData = result.dataSeriesMap.get('calc')!
    expect(calcData.data.find(d => d.x === '2020')?.y).toBe(150)
  })

  it('should handle topological ordering of calculations', () => {
    // calc2 depends on calc1
    const series = [
      createCustomSeries('a', [{ year: 2020, value: 10 }]),
      createCalculationSeries('calc1', { op: 'multiply', args: ['a', 2] }),
      createCalculationSeries('calc2', { op: 'sum', args: ['calc1', 'a'] }),
    ]
    const dataSeriesMap = new Map<string, AnalyticsSeries>()

    const result = calculateAllSeriesData(series, dataSeriesMap)

    expect(result.dataSeriesMap.get('calc1')?.data.find(d => d.x === '2020')?.y).toBe(20)
    expect(result.dataSeriesMap.get('calc2')?.data.find(d => d.x === '2020')?.y).toBe(30)
  })

  it('should preserve existing series data in map', () => {
    const series = [createCustomSeries('a', [{ year: 2020, value: 100 }])]
    const existingData = createAnalyticsSeries('existing', [{ x: '2020', y: 500 }])
    const dataSeriesMap = new Map<string, AnalyticsSeries>([['existing', existingData]])

    const result = calculateAllSeriesData(series, dataSeriesMap)

    expect(result.dataSeriesMap.has('existing')).toBe(true)
    expect(result.dataSeriesMap.get('existing')?.data.find(d => d.x === '2020')?.y).toBe(500)
  })

  it('should propagate warnings from calculations', () => {
    const series = [
      createCustomSeries('a', [{ year: 2020, value: 100 }]),
      createCustomSeries('zero', [{ year: 2020, value: 0 }]),
      createCalculationSeries('calc_error', { op: 'divide', args: ['a', 'zero'] }),
    ]
    const dataSeriesMap = new Map<string, AnalyticsSeries>()

    const result = calculateAllSeriesData(series, dataSeriesMap)

    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0].type).toBe('auto_adjusted_value')
    expect(result.warnings[0].seriesId).toBe('calc_error')
  })

  it('should skip calculation series when periodicities are mixed', () => {
    const series = [
      createDataSeries('yearly'),
      createDataSeries('monthly'),
      createCalculationSeries('calc_mixed', { op: 'sum', args: ['yearly', 'monthly'] }),
    ]

    const dataSeriesMap = new Map<string, AnalyticsSeries>([
      [
        'yearly',
        {
          seriesId: 'yearly',
          xAxis: { name: 'Year', type: 'STRING', unit: 'year' },
          yAxis: { name: 'Value', type: 'FLOAT', unit: 'RON' },
          data: [{ x: '2024', y: 100 }],
        },
      ],
      [
        'monthly',
        {
          seriesId: 'monthly',
          xAxis: { name: 'Month', type: 'STRING', unit: 'month' },
          yAxis: { name: 'Value', type: 'FLOAT', unit: 'RON' },
          data: [{ x: '2024-01', y: 10 }],
        },
      ],
    ])

    const result = calculateAllSeriesData(series, dataSeriesMap)

    expect(result.dataSeriesMap.has('calc_mixed')).toBe(false)
    expect(result.warnings.some((warning) => warning.seriesId === 'calc_mixed')).toBe(true)
  })
})

// ============================================================================
// getCalculationDependencies
// ============================================================================
describe('getCalculationDependencies', () => {
  it('should return direct series references', () => {
    const calculation: Calculation = { op: 'sum', args: ['a', 'b'] }
    const series = [createDataSeries('a'), createDataSeries('b'), createDataSeries('c')]

    const deps = getCalculationDependencies(calculation, series)

    expect(deps).toContain('a')
    expect(deps).toContain('b')
    expect(deps).not.toContain('c')
  })

  it('should exclude numeric constants', () => {
    const calculation: Calculation = { op: 'multiply', args: ['a', 100] }
    const series = [createDataSeries('a')]

    const deps = getCalculationDependencies(calculation, series)

    expect(deps).toEqual(['a'])
  })

  it('should include nested calculation dependencies', () => {
    const calculation: Calculation = {
      op: 'sum',
      args: [{ op: 'multiply', args: ['a', 'b'] }, 'c'],
    }
    const series = [createDataSeries('a'), createDataSeries('b'), createDataSeries('c')]

    const deps = getCalculationDependencies(calculation, series)

    expect(deps).toContain('a')
    expect(deps).toContain('b')
    expect(deps).toContain('c')
  })

  it('should only return series that exist', () => {
    const calculation: Calculation = { op: 'sum', args: ['a', 'nonexistent'] }
    const series = [createDataSeries('a')]

    const deps = getCalculationDependencies(calculation, series)

    expect(deps).toEqual(['a'])
  })
})

// ============================================================================
// getAllDependencies
// ============================================================================
describe('getAllDependencies', () => {
  it('should return dependencies for calculation series', () => {
    const calcSeries = createCalculationSeries('calc', { op: 'sum', args: ['a', 'b'] })
    const chart: Chart = {
      id: 'test-chart',
      title: 'Test',
      config: { chartType: 'line', color: '#000', showGridLines: true, showLegend: true, showTooltip: true, editAnnotations: true, showAnnotations: true },
      series: [
        createDataSeries('a'),
        createDataSeries('b'),
        calcSeries,
      ],
      annotations: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const deps = getAllDependencies(calcSeries, chart)

    expect(deps.map(s => s.id)).toContain('a')
    expect(deps.map(s => s.id)).toContain('b')
  })

  it('should return transitive dependencies', () => {
    const calc1 = createCalculationSeries('calc1', { op: 'multiply', args: ['a', 2] })
    const calc2 = createCalculationSeries('calc2', { op: 'sum', args: ['calc1', 'b'] })
    const chart: Chart = {
      id: 'test-chart',
      title: 'Test',
      config: { chartType: 'line', color: '#000', showGridLines: true, showLegend: true, showTooltip: true, editAnnotations: true, showAnnotations: true },
      series: [
        createDataSeries('a'),
        createDataSeries('b'),
        calc1,
        calc2,
      ],
      annotations: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const deps = getAllDependencies(calc2, chart)

    expect(deps.map(s => s.id)).toContain('calc1')
    expect(deps.map(s => s.id)).toContain('a')
    expect(deps.map(s => s.id)).toContain('b')
  })

  it('should return empty array for series without calculation', () => {
    const dataSeries = createDataSeries('a')
    const chart: Chart = {
      id: 'test-chart',
      title: 'Test',
      config: { chartType: 'line', color: '#000', showGridLines: true, showLegend: true, showTooltip: true, editAnnotations: true, showAnnotations: true },
      series: [dataSeries],
      annotations: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const deps = getAllDependencies(dataSeries, chart)

    expect(deps).toEqual([dataSeries])
  })

  it('should deduplicate dependencies', () => {
    // calc depends on 'a' twice through different paths
    const calc1 = createCalculationSeries('calc1', { op: 'multiply', args: ['a', 2] })
    const calc2 = createCalculationSeries('calc2', { op: 'sum', args: ['calc1', 'a'] })
    const chart: Chart = {
      id: 'test-chart',
      title: 'Test',
      config: { chartType: 'line', color: '#000', showGridLines: true, showLegend: true, showTooltip: true, editAnnotations: true, showAnnotations: true },
      series: [
        createDataSeries('a'),
        calc1,
        calc2,
      ],
      annotations: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const deps = getAllDependencies(calc2, chart)

    const aOccurrences = deps.filter(s => s.id === 'a')
    expect(aOccurrences).toHaveLength(1)
  })
})


describe('strict INS calculation dependencies', () => {
  const ins = (id = 'ins'): Series => ({ id, type: 'ins-series', enabled: false, label: id,
    config: { color: '#000000', showDataLabels: false }, createdAt: timestamp, updatedAt: timestamp,
    unit: 'RON', datasetCode: 'TEST', aggregation: 'sum', hasValue: true })
  it('propagates unavailable through disabled referenced INS, nested expressions and descendants', () => {
    const a = createCalculationSeries('a', { op: 'sum', args: ['ins', 'budget'] })
    const b = createCalculationSeries('b', { op: 'subtract', args: [{ op: 'sum', args: ['a', 5] }, 2] })
    const result = calculateAllSeriesData([b, a, ins(), createDataSeries('budget')], new Map([
      ['budget', createAnalyticsSeries('budget', [{ x: '2024', y: 10 }])],
    ]))
    expect(result.dataSeriesMap.has('a')).toBe(false)
    expect(result.dataSeriesMap.has('b')).toBe(false)
    expect(result.dataSeriesMap.get('budget')?.data[0].y).toBe(10)
    expect(result.warnings.map(item => item.seriesId)).toEqual(['a', 'b'])
  })
  it('rejects the whole INS-dependent calculation when one operand lacks a period', () => {
    const calc = createCalculationSeries('a', { op: 'sum', args: ['ins', 'budget'] })
    const result = calculateAllSeriesData([ins(), createDataSeries('budget'), calc], new Map([
      ['ins', createAnalyticsSeries('ins', [{ x: '2023', y: 5 }, { x: '2024', y: 10 }])],
      ['budget', createAnalyticsSeries('budget', [{ x: '2024', y: 100 }])],
    ]))
    expect(result.dataSeriesMap.has('a')).toBe(false)
  })
  it('preserves actual zero and scalar constants in nested INS arithmetic', () => {
    const calc = createCalculationSeries('a', { op: 'sum', args: [{ op: 'multiply', args: ['ins', 2] }, 5] })
    const result = calculateAllSeriesData([ins(), calc], new Map([
      ['ins', createAnalyticsSeries('ins', [{ x: '2024', y: 0 }])],
    ]))
    expect(result.dataSeriesMap.get('a')?.data).toEqual([{ x: '2024', y: 5 }])
  })
  it('does not use an undefined nested division as zero in an outer INS sum', () => {
    const calc = createCalculationSeries('a', { op: 'sum', args: [{ op: 'divide', args: ['ins', 0] }, 5] })
    const result = calculateAllSeriesData([ins(), calc], new Map([
      ['ins', createAnalyticsSeries('ins', [{ x: '2024', y: 10 }])],
    ]))
    expect(result.dataSeriesMap.has('a')).toBe(false)
  })
  it.each([
    { x: '2024', unit: 'year' },
    { x: '2024-Q1', unit: 'quarter' },
    { x: '2024-01', unit: 'month' },
  ])('treats a nested constants-only subtree as scalar for $unit INS', ({ x, unit }) => {
    const calc = createCalculationSeries('a', { op: 'sum', args: ['ins', { op: 'sum', args: [1, 2] }] })
    const observation = createAnalyticsSeries('ins', [{ x, y: 10 }])
    observation.xAxis.unit = unit
    const result = calculateAllSeriesData([ins(), calc], new Map([['ins', observation]]))
    expect(result.dataSeriesMap.get('a')?.data).toEqual([{ x, y: 13 }])
  })
  it('keeps an undefined constants-only subtree unavailable inside INS arithmetic', () => {
    const calc = createCalculationSeries('a', { op: 'sum', args: ['ins', { op: 'divide', args: [1, 0] }] })
    const result = calculateAllSeriesData([ins(), calc], new Map([
      ['ins', createAnalyticsSeries('ins', [{ x: '2024', y: 10 }])],
    ]))
    expect(result.dataSeriesMap.has('a')).toBe(false)
  })

})

describe('native coverage in calculations', () => {
  it('propagates an interior gap through nested expressions and calculated descendants', () => {
    const series = [createDataSeries('a'),
      createCalculationSeries('b', { op: 'sum', args: ['a', { op: 'multiply', args: ['a', 2] }] }),
      createCalculationSeries('c', { op: 'subtract', args: ['b', 1] })]
    const a = { ...createAnalyticsSeries('a', [{ x: '2022', y: 0 }, { x: '2024', y: -2 }]), missingPeriods: ['2023'] }
    const result = calculateAllSeriesData(series, new Map([['a', a]])).dataSeriesMap
    expect(result.get('b')?.data).toEqual([{ x: '2022', y: 0 }, { x: '2024', y: -6 }])
    expect(result.get('c')?.data).toEqual([{ x: '2022', y: -1 }, { x: '2024', y: -7 }])
    expect(result.get('c')?.missingPeriods).toEqual(['2023'])
  })
  it('preserves all-gap calculated descendants rather than recreating zero', () => {
    const series = [createDataSeries('a'), createCalculationSeries('b', { op: 'sum', args: ['a', 1] }), createCalculationSeries('c', { op: 'sum', args: ['b', 2] })]
    const result = calculateAllSeriesData(series, new Map([['a', { ...createAnalyticsSeries('a', []), missingPeriods: ['2023'] }]])).dataSeriesMap
    expect(result.get('c')?.data).toEqual([])
    expect(result.get('c')?.missingPeriods).toEqual(['2023'])
  })
  it('marks native division by zero unavailable to downstream arithmetic', () => {
    const series = [createDataSeries('a'), createCalculationSeries('b', { op: 'divide', args: [1, 'a'] }), createCalculationSeries('c', { op: 'sum', args: ['b', 2] })]
    const result = calculateAllSeriesData(series, new Map([['a', { ...createAnalyticsSeries('a', [{ x: '2023', y: 0 }]), missingPeriods: [] }]])).dataSeriesMap
    expect(result.get('c')?.data).toEqual([])
    expect(result.get('c')?.missingPeriods).toEqual(['2023'])
  })
})

it('does not fill native gaps when INS and a calculated descendant share the expression', () => {
  const ins = { ...createDataSeries('ins'), type: 'ins-series', datasetCode: 'TEST', aggregation: 'sum' } as Series
  const series = [createDataSeries('a'), ins, createCalculationSeries('b', { op: 'sum', args: ['a', 'ins'] }), createCalculationSeries('c', { op: 'sum', args: ['b', 1] })]
  const map = new Map([['a', { ...createAnalyticsSeries('a', [{ x: '2024', y: 3 }]), missingPeriods: ['2023'] }], ['ins', createAnalyticsSeries('ins', [{ x: '2023', y: 10 }, { x: '2024', y: 20 }])]])
  const result = calculateAllSeriesData(series, map).dataSeriesMap
  expect(result.get('c')?.data).toEqual([{ x: '2024', y: 24 }])
  expect(result.get('c')?.missingPeriods).toEqual(['2023'])
})

describe('native operands in sums and differences', () => {
  const native = (id: string, points: [string, number][], missingPeriods: string[] = []): AnalyticsSeries =>
    ({ ...createAnalyticsSeries(id, points.map(([x, y]) => ({ x, y }))), missingPeriods })
  const read = (...series: AnalyticsSeries[]) => new Map(series.map(item => [item.seriesId, item]))

  // Corbeanca spending, each series selecting one year (the audit's live read).
  const corbeanca = () => read(native('budget-2024', [['2024', 40517740.48]]), native('budget-2025', [['2025', 69217739.42]]))

  it.each(['subtract', 'sum'] as const)('%s: no value at a period one operand does not cover', (op) => {
    const result = evaluateCalculation({ op, args: ['budget-2025', 'budget-2024'] }, corbeanca(), [], 'difference')
    expect(result.points).toEqual([])
    expect(result.missingPeriods).toEqual(['2024', '2025'])
    expect(result.warnings).toEqual([])
  })
  it('keeps every period both operands cover', () => {
    const data = read(native('a', [['2022', 1], ['2023', 10], ['2024', 20]]), native('b', [['2023', 4], ['2024', 5], ['2025', 6]]))
    const difference = evaluateCalculation({ op: 'subtract', args: ['a', 'b'] }, data, [], 'd')
    expect(difference.points).toEqual([{ x: '2023', y: 6 }, { x: '2024', y: 15 }])
    expect(difference.missingPeriods).toEqual(['2022', '2025'])
    expect(evaluateCalculation({ op: 'sum', args: ['a', 'b'] }, data, [], 's').points).toEqual([{ x: '2023', y: 14 }, { x: '2024', y: 25 }])
  })
  it('keeps a printed zero as a value and a zero result as a point', () => {
    const data = read(native('a', [['2024', 0], ['2025', 7]]), native('b', [['2024', 5], ['2025', 7]]))
    const difference = evaluateCalculation({ op: 'subtract', args: ['a', 'b'] }, data, [], 'd')
    expect(difference.points).toEqual([{ x: '2024', y: -5 }, { x: '2025', y: 0 }])
    expect(difference.missingPeriods).toEqual([])
    expect(evaluateCalculation({ op: 'sum', args: ['a', 'b'] }, data, [], 's').points).toEqual([{ x: '2024', y: 5 }, { x: '2025', y: 14 }])
  })
  it('applies constants at the periods the series cover, and nowhere else', () => {
    const data = read(native('a', [['2023', 1], ['2024', 0]]))
    expect(evaluateCalculation({ op: 'sum', args: ['a', 100] }, data, [], 's').points).toEqual([{ x: '2023', y: 101 }, { x: '2024', y: 100 }])
    expect(evaluateCalculation({ op: 'subtract', args: [100, 'a'] }, data, [], 'd').points).toEqual([{ x: '2023', y: 99 }, { x: '2024', y: 100 }])
    const nested = evaluateCalculation({ op: 'sum', args: ['a', { op: 'subtract', args: [10, 4] }] }, data, [], 'n')
    expect(nested.points).toEqual([{ x: '2023', y: 7 }, { x: '2024', y: 6 }])
    expect(nested.missingPeriods).toEqual([])
  })
  it('keeps explicit gaps and adds the periods an operand does not cover', () => {
    const data = read(native('a', [['2022', 1], ['2024', 3]], ['2023']), native('b', [['2022', 10], ['2023', 20], ['2024', 30], ['2025', 40]]))
    const result = evaluateCalculation({ op: 'sum', args: ['a', 'b'] }, data, [], 's')
    expect(result.points).toEqual([{ x: '2022', y: 11 }, { x: '2024', y: 33 }])
    expect(result.missingPeriods).toEqual(['2023', '2025'])
  })
  it('treats a native value that is not a number as unavailable, not 0', () => {
    const result = evaluateCalculation({ op: 'subtract', args: ['a', 'b'] }, read(native('a', [['2024', Number.NaN]]), native('b', [['2024', 3]])), [], 'd')
    expect(result.points).toEqual([])
    expect(result.missingPeriods).toEqual(['2024'])
  })
  it('carries the gaps through nested expressions and calculated descendants', () => {
    const series = [createDataSeries('a'), createDataSeries('b'), createDataSeries('c'),
      createDataSeries('budget-2024'), createDataSeries('budget-2025'),
      createCalculationSeries('diff', { op: 'subtract', args: ['b', 'a'] }),
      createCalculationSeries('outer', { op: 'sum', args: ['diff', 1] }),
      createCalculationSeries('inline', { op: 'sum', args: [{ op: 'subtract', args: ['b', 'a'] }, 'c'] }),
      createCalculationSeries('difference', { op: 'subtract', args: ['budget-2025', 'budget-2024'] }),
      createCalculationSeries('later', { op: 'sum', args: ['difference', 5] })]
    const map = read(native('a', [['2023', 1], ['2024', 2]]), native('b', [['2024', 10], ['2025', 20]]),
      native('c', [['2023', 100], ['2024', 100], ['2025', 100]]), ...corbeanca().values())
    const result = calculateAllSeriesData(series, map)
    expect(result.dataSeriesMap.get('diff')?.data).toEqual([{ x: '2024', y: 8 }])
    expect(result.dataSeriesMap.get('outer')?.data).toEqual([{ x: '2024', y: 9 }])
    expect(result.dataSeriesMap.get('outer')?.missingPeriods).toEqual(['2023', '2025'])
    expect(result.dataSeriesMap.get('inline')?.data).toEqual([{ x: '2024', y: 108 }])
    expect(result.dataSeriesMap.get('inline')?.missingPeriods).toEqual(['2023', '2025'])
    expect(result.dataSeriesMap.get('later')?.data).toEqual([])
    expect(result.dataSeriesMap.get('later')?.missingPeriods).toEqual(['2024', '2025'])
    expect(result.warnings).toEqual([])
  })
})

describe('constant expressions beside native data', () => {
  const native = (id: string, points: [string, number][], unit = 'year', missingPeriods: string[] = []): AnalyticsSeries => {
    const series = { ...createAnalyticsSeries(id, points.map(([x, y]) => ({ x, y }))), missingPeriods }
    series.xAxis.unit = unit
    return series
  }
  const evaluate = (calculation: Calculation, ...series: AnalyticsSeries[]) =>
    calculateAllSeriesData([...series.map(item => createDataSeries(item.seriesId)), createCalculationSeries('c', calculation)],
      new Map(series.map(item => [item.seriesId, item]))).dataSeriesMap.get('c')

  it.each([
    { x: '2024', unit: 'year' },
    { x: '2024-Q1', unit: 'quarter' },
    { x: '2024-01', unit: 'month' },
  ])('adds a nested literal expression as the scalar it declares ($unit)', ({ x, unit }) => {
    const nested = evaluate({ op: 'sum', args: ['a', { op: 'sum', args: [1, 2] }] }, native('a', [[x, 10]], unit))
    expect(nested?.data).toEqual([{ x, y: 13 }])
    expect(nested?.missingPeriods).toEqual([])
    expect(nested).toEqual(evaluate({ op: 'sum', args: ['a', 3] }, native('a', [[x, 10]], unit)))
  })
  it('keeps native zero, a zero scalar and zero products as values', () => {
    expect(evaluate({ op: 'sum', args: ['a', { op: 'subtract', args: [2, 2] }] }, native('a', [['2024', 0]]))?.data).toEqual([{ x: '2024', y: 0 }])
    expect(evaluate({ op: 'multiply', args: ['a', { op: 'subtract', args: [2, 2] }] }, native('a', [['2024', 5]]))?.data).toEqual([{ x: '2024', y: 0 }])
    expect(evaluate({ op: 'subtract', args: [{ op: 'sum', args: [3, 4] }, 'a'] }, native('a', [['2024', 7]]))?.data).toEqual([{ x: '2024', y: 0 }])
  })
  it('evaluates deeply nested constants, and constants inside named native calculations, once', () => {
    const deep = evaluate({ op: 'sum', args: ['a', { op: 'multiply', args: [{ op: 'sum', args: [1, { op: 'subtract', args: [5, 3] }] }, 2] }] }, native('a', [['2024-01', 10]], 'month'))
    expect(deep?.data).toEqual([{ x: '2024-01', y: 16 }])
    expect(deep?.missingPeriods).toEqual([])
    const series = [createDataSeries('a'),
      createCalculationSeries('named', { op: 'sum', args: ['a', { op: 'sum', args: [1, 2] }] }),
      createCalculationSeries('descendant', { op: 'subtract', args: ['named', { op: 'multiply', args: [2, { op: 'sum', args: [1, 0] }] }] })]
    const result = calculateAllSeriesData(series, new Map([['a', native('a', [['2024-Q1', 10], ['2024-Q3', 4]], 'quarter', ['2024-Q2'])]])).dataSeriesMap
    expect(result.get('descendant')?.data).toEqual([{ x: '2024-Q1', y: 11 }, { x: '2024-Q3', y: 5 }])
    expect(result.get('descendant')?.missingPeriods).toEqual(['2024-Q2'])
  })
  it('keeps an undefined constant expression unavailable at every period, never 0', () => {
    for (const undefinedScalar of [{ op: 'divide', args: [1, 0] }, { op: 'sum', args: [{ op: 'divide', args: [1, 0] }, 2] }, { op: 'sum', args: [] }] as Calculation[]) {
      const result = evaluate({ op: 'sum', args: ['a', undefinedScalar] }, native('a', [['2024', 10], ['2025', 0]]))
      expect(result?.data).toEqual([])
      expect(result?.missingPeriods).toEqual(['2024', '2025'])
    }
  })
  it('keeps genuine native gaps and partial overlap beside a scalar', () => {
    const result = evaluate({ op: 'sum', args: ['a', 'b', { op: 'sum', args: [1, 2] }] },
      native('a', [['2023', 1], ['2024', 2]]), native('b', [['2024', 10], ['2025', 20]], 'year', ['2026']))
    expect(result?.data).toEqual([{ x: '2024', y: 15 }])
    expect(result?.missingPeriods).toEqual(['2026', '2023', '2025'])
  })
  it('leaves standalone constants and calculations without native coverage as before', () => {
    const standalone = calculateAllSeriesData([createCalculationSeries('c', { op: 'sum', args: [{ op: 'sum', args: [1, 2] }, 4] })], new Map()).dataSeriesMap.get('c')
    expect(standalone?.data.length).toBeGreaterThan(1)
    expect(standalone?.data.every(point => point.y === 7)).toBe(true)
    expect(standalone?.missingPeriods).toBeUndefined()
    const legacy = evaluateCalculation({ op: 'sum', args: ['a', { op: 'sum', args: [1, 2] }] }, new Map([['a', createAnalyticsSeries('a', [{ x: '2024', y: 10 }])]]), [], 'c')
    expect(legacy.points.find(point => point.x === '2024')?.y).toBe(13)
    expect(legacy.points.length).toBeGreaterThan(1)
    expect(legacy.missingPeriods).toBeUndefined()
  })
})

describe('native completeness inside shared and grouped expressions', () => {
  const native = (id: string, points: [string, number][], unit = 'year'): AnalyticsSeries => {
    const series = { ...createAnalyticsSeries(id, points.map(([x, y]) => ({ x, y }))), missingPeriods: [] }
    series.xAxis.unit = unit
    return series
  }

  it('reads a reused constant subexpression like its copy, including a zero one', () => {
    const month = new Map([['a', native('a', [['2024-01', 10]], 'month')]])
    const shared: Calculation = { op: 'sum', args: [1, 2] }
    const zero: Calculation = { op: 'subtract', args: [2, 2] }
    for (const [expression, y] of [
      [{ op: 'sum', args: ['a', { op: 'sum', args: [shared, shared] }] }, 16],
      [{ op: 'sum', args: ['a', { op: 'multiply', args: [zero, zero] }] }, 10],
      [{ op: 'sum', args: ['a', shared, { op: 'multiply', args: [shared, 2] }] }, 19],
    ] as [Calculation, number][]) {
      const reused = calculateAllSeriesData([createDataSeries('a'), createCalculationSeries('c', expression)], new Map(month)).dataSeriesMap.get('c')
      const copied = calculateAllSeriesData([createDataSeries('a'), createCalculationSeries('c', JSON.parse(JSON.stringify(expression)))], new Map(month)).dataSeriesMap.get('c')
      expect(reused?.data).toEqual([{ x: '2024-01', y }])
      expect(reused?.missingPeriods).toEqual([])
      expect(reused).toEqual(copied)
    }
  })

  const series = (calculation: Calculation, c: { year: number; value: number }[] = [{ year: 2025, value: 20 }]) => calculateAllSeriesData(
    [createDataSeries('a'), createCustomSeries('b', [{ year: 2024, value: 10 }]), createCustomSeries('c', c), createCalculationSeries('calc', calculation)],
    new Map([['a', native('a', [['2024', 100]])]]),
  ).dataSeriesMap.get('calc')

  it('does not let grouping turn an unmarked missing operand into 0 inside a native calculation', () => {
    const grouped = series({ op: 'sum', args: ['a', { op: 'sum', args: ['b', 'c'] }] })
    const flat = series({ op: 'sum', args: ['a', 'b', 'c'] })
    expect(grouped?.data).toEqual([])
    expect(grouped?.missingPeriods).toEqual(['2024', '2025'])
    expect(grouped).toEqual(flat)
    const deeper = series({ op: 'subtract', args: ['a', { op: 'multiply', args: [{ op: 'sum', args: ['b', 'c'] }, 2] }] })
    expect(deeper?.data).toEqual([])
    expect(deeper?.missingPeriods).toEqual(['2024', '2025'])
  })
  it('keeps the periods a grouped expression fully covers, with their real zeros', () => {
    const covered = [{ year: 2024, value: -10 }, { year: 2025, value: 20 }]
    const grouped = series({ op: 'sum', args: ['a', { op: 'sum', args: ['b', 'c'] }] }, covered)
    expect(grouped?.data).toEqual([{ x: '2024', y: 100 }])
    expect(grouped?.missingPeriods).toEqual(['2025'])
    expect(grouped).toEqual(series({ op: 'sum', args: ['a', 'b', 'c'] }, covered))
  })
  it('leaves calculations over unmarked series alone, and a named one as it was materialized', () => {
    // Standalone legacy policy: no native read, so absent custom values are still added as 0.
    const legacy = series({ op: 'sum', args: ['b', 'c'] })
    expect(legacy?.data).toEqual([{ x: '2024', y: 10 }, { x: '2025', y: 20 }])
    expect(legacy?.missingPeriods).toBeUndefined()
    // Boundary: a named legacy calculation is materialized on its own policy; a native parent reads its points.
    const named = calculateAllSeriesData(
      [createDataSeries('a'), createCustomSeries('b', [{ year: 2024, value: 10 }]), createCustomSeries('c', [{ year: 2025, value: 20 }]),
        createCalculationSeries('bc', { op: 'sum', args: ['b', 'c'] }), createCalculationSeries('calc', { op: 'sum', args: ['a', 'bc'] })],
      new Map([['a', native('a', [['2024', 100]])]]),
    ).dataSeriesMap.get('calc')
    expect(named?.data).toEqual([{ x: '2024', y: 110 }])
    expect(named?.missingPeriods).toEqual(['2025'])
  })
})
