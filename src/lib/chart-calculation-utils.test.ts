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
