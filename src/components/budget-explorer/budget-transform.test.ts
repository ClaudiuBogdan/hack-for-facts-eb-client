import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AggregatedNode } from './budget-transform'
import {
  buildTreemapData,
  buildTreemapDataV2,
  calculateExcludedItems,
  getParentCode,
  groupData,
} from './budget-transform'

// Mock the classification modules
vi.mock('@/lib/classifications', () => ({
  getClassificationName: vi.fn((code: string) => {
    const fnNames: Record<string, string> = {
      '51': 'Public Administration',
      '51.01': 'Executive and Legislative',
      '51.01.01': 'Executive',
      '54': 'Other Public Services',
      '54.02': 'Public Debt',
      '65': 'Education',
      '65.03': 'Secondary Education',
      '66': 'Health',
    }
    return fnNames[code]
  }),
  getClassificationParent: vi.fn((code: string) => {
    if (!code.includes('.')) return null
    return code.substring(0, code.lastIndexOf('.'))
  }),
}))

vi.mock('@/lib/economic-classifications', () => ({
  getEconomicChapterName: vi.fn((code: string) => {
    const ecChapters: Record<string, string> = {
      '10': 'Personnel Expenses',
      '20': 'Goods and Services',
      '51': 'Capital Transfers',
      '55': 'Other Transfers',
      '70': 'Capital Expenditures',
    }
    return ecChapters[code]
  }),
  getEconomicSubchapterName: vi.fn((code: string) => {
    const ecSubchapters: Record<string, string> = {
      '10.01': 'Salaries',
      '10.03': 'Contributions',
      '20.01': 'Office Supplies',
      '20.05': 'Utilities',
      '51.01': 'Transfer to Institutions',
      '55.01': 'Associations',
    }
    return ecSubchapters[code]
  }),
  getEconomicClassificationName: vi.fn((code: string) => {
    const ecFull: Record<string, string> = {
      '10.01.01': 'Base Salary',
      '10.01.02': 'Bonuses',
      '20.01.01': 'Paper',
      '20.01.02': 'Ink',
    }
    return ecFull[code]
  }),
  getEconomicParent: vi.fn((code: string) => {
    const cleaned = code.replace(/[^0-9.]/g, '')
    if (!cleaned.includes('.')) return null
    return cleaned.substring(0, cleaned.lastIndexOf('.'))
  }),
}))

// Helper function to create mock aggregated nodes
function createNode(
  fnCode: string,
  fnName: string,
  ecCode: string,
  ecName: string,
  amount: number,
  count = 1
): AggregatedNode {
  return {
    fn_c: fnCode,
    fn_n: fnName,
    ec_c: ecCode,
    ec_n: ecName,
    amount,
    count,
  }
}

describe('budget-transform', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('buildTreemapDataV2', () => {
    it('keeps transfer spending and signed corrections in the expense breakdown', () => {
      const data = [
        createNode('65.01', 'Education', '20.01', 'Goods', 120, 1),
        createNode('65.02', 'Education', '51.01', 'Transfers', 40, 1),
        createNode('65', 'Education', '20.02', 'Goods', -30, 1),
        createNode('65.03', 'Education', '', '', -15, 1),
      ]

      const economic = buildTreemapDataV2({ data, primary: 'ec', path: [], preserveUnclassified: true })
      expect(economic).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: '51', value: 40 }),
        expect.objectContaining({ code: 'unclassified', value: -15, terminal: true }),
      ]))
      const functional = buildTreemapDataV2({ data, primary: 'fn', path: ['65'], preserveUnclassified: true })
      expect(functional).toContainEqual(expect.objectContaining({ code: '65', value: -30, terminal: true }))
      expect(economic.reduce((sum, node) => sum + node.value, 0)).toBe(115)
      expect(functional.reduce((sum, node) => sum + node.value, 0)).toBe(115)
    })

    it('adds no terminal copy of a 3-part economic code, where the depth is capped', () => {
      const data = [
        createNode('65.02', 'Education', '20.01.01', 'Supplies', 100, 1),
        createNode('65.02', 'Education', '20.01', 'Goods', -10, 1),
      ]
      expect(buildTreemapDataV2({ data, primary: 'ec', path: ['20', '20.01', '20.01.01'], preserveUnclassified: true })).toEqual([])
      expect(buildTreemapDataV2({ data, primary: 'ec', path: ['20', '20.01'], preserveUnclassified: true })).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: '20.01.01', value: 100 }),
        expect.objectContaining({ code: '20.01', value: -10, terminal: true }),
      ]))
    })

    const sampleData: AggregatedNode[] = [
      createNode('51.01.01', 'Executive Functions', '10.01.01', 'Base Salaries', 100000, 5),
      createNode('51.01.01', 'Executive Functions', '10.01.02', 'Bonuses', 50000, 3),
      createNode('51.01.02', 'Legislative', '10.01.01', 'Base Salaries', 80000, 4),
      createNode('51.02', 'Admin Support', '20.01.01', 'Paper', 5000, 2),
      createNode('54.02', 'Public Debt', '10.01.01', 'Salaries', 30000, 1),
      createNode('65.03', 'Secondary Education', '20.05', 'Utilities', 15000, 2),
    ]

    describe('basic grouping at root level', () => {
      it('groups by functional code at depth 2 (chapter)', () => {
        const result = buildTreemapDataV2({
          data: sampleData,
          primary: 'fn',
          path: [],
          rootDepth: 2,
        })

        expect(result).toHaveLength(3)
        // Results should be sorted by value descending
        expect(result[0]!.code).toBe('51')
        expect(result[0]!.value).toBe(235000) // 100000 + 50000 + 80000 + 5000
        expect(result[0]!.name).toBe('Public Administration')

        expect(result[1]!.code).toBe('54')
        expect(result[1]!.value).toBe(30000)

        expect(result[2]!.code).toBe('65')
        expect(result[2]!.value).toBe(15000)
      })

      it('groups by economic code at depth 2 (chapter)', () => {
        const result = buildTreemapDataV2({
          data: sampleData,
          primary: 'ec',
          path: [],
          rootDepth: 2,
        })

        expect(result).toHaveLength(2)
        expect(result[0]!.code).toBe('10')
        expect(result[0]!.value).toBe(260000) // 100000 + 50000 + 80000 + 30000
        expect(result[0]!.name).toBe('Personnel Expenses')

        expect(result[1]!.code).toBe('20')
        expect(result[1]!.value).toBe(20000) // 5000 + 15000
        expect(result[1]!.name).toBe('Goods and Services')
      })
    })

    describe('drill-down with path', () => {
      it('filters and groups when drilling into fn code 51', () => {
        const result = buildTreemapDataV2({
          data: sampleData,
          primary: 'fn',
          path: ['51'],
        })

        // At depth 4 (path='51' -> next depth is chapter.subchapter)
        expect(result).toHaveLength(2)
        expect(result[0]!.code).toBe('51.01')
        expect(result[0]!.value).toBe(230000)

        expect(result[1]!.code).toBe('51.02')
        expect(result[1]!.value).toBe(5000)
      })

      it('filters and groups when drilling into fn code 51.01', () => {
        const result = buildTreemapDataV2({
          data: sampleData,
          primary: 'fn',
          path: ['51', '51.01'],
        })

        // At depth 6 (path='51.01' -> next depth is chapter.subchapter.item)
        expect(result).toHaveLength(2)
        expect(result[0]!.code).toBe('51.01.01')
        expect(result[0]!.value).toBe(150000)

        expect(result[1]!.code).toBe('51.01.02')
        expect(result[1]!.value).toBe(80000)
      })

      it('returns empty array when depth exceeds 6', () => {
        const result = buildTreemapDataV2({
          data: sampleData,
          primary: 'fn',
          path: ['51', '51.01', '51.01.01'],
        })

        expect(result).toHaveLength(0)
      })
    })

    describe('constraint filtering', () => {
      it('filters by fn constraint when using ec as primary', () => {
        const result = buildTreemapDataV2({
          data: sampleData,
          primary: 'ec',
          path: [],
          rootDepth: 2,
          constraint: { type: 'fn', code: '51' },
        })

        // Only items with fn_c starting with '51'
        expect(result).toHaveLength(2)
        expect(result[0]!.code).toBe('10')
        expect(result[0]!.value).toBe(230000) // 100000 + 50000 + 80000
        expect(result[1]!.code).toBe('20')
        expect(result[1]!.value).toBe(5000)
      })

      it('filters by ec constraint when using fn as primary', () => {
        const result = buildTreemapDataV2({
          data: sampleData,
          primary: 'fn',
          path: [],
          rootDepth: 2,
          constraint: { type: 'ec', code: '10' },
        })

        // Only items with ec_c starting with '10'
        expect(result).toHaveLength(2)
        expect(result[0]!.code).toBe('51')
        expect(result[0]!.value).toBe(230000)
        expect(result[1]!.code).toBe('54')
        expect(result[1]!.value).toBe(30000)
      })
    })

    describe('exclusion filtering', () => {
      it('excludes economic codes', () => {
        const result = buildTreemapDataV2({
          data: sampleData,
          primary: 'fn',
          path: [],
          rootDepth: 2,
          excludeEcCodes: ['10'],
        })

        // Only items with ec_c NOT starting with '10'
        expect(result).toHaveLength(2)
        expect(result[0]!.code).toBe('65')
        expect(result[0]!.value).toBe(15000)
        expect(result[1]!.code).toBe('51')
        expect(result[1]!.value).toBe(5000)
      })

      it('excludes functional codes', () => {
        const result = buildTreemapDataV2({
          data: sampleData,
          primary: 'ec',
          path: [],
          rootDepth: 2,
          excludeFnCodes: ['51'],
        })

        // Only items with fn_c NOT starting with '51'
        expect(result).toHaveLength(2)
        expect(result[0]!.code).toBe('10')
        expect(result[0]!.value).toBe(30000) // Only 54.02 item
        expect(result[1]!.code).toBe('20')
        expect(result[1]!.value).toBe(15000) // Only 65.03 item
      })

      it('excludes multiple codes', () => {
        const result = buildTreemapDataV2({
          data: sampleData,
          primary: 'fn',
          path: [],
          rootDepth: 2,
          excludeEcCodes: ['10', '20.01'],
        })

        // Items not matching '10' or '20.01'
        expect(result).toHaveLength(1)
        expect(result[0]!.code).toBe('65')
        expect(result[0]!.value).toBe(15000) // 20.05 is not excluded
      })
    })

    describe('edge cases', () => {
      it('handles empty data', () => {
        const result = buildTreemapDataV2({
          data: [],
          primary: 'fn',
          path: [],
          rootDepth: 2,
        })

        expect(result).toHaveLength(0)
      })

      it('handles null/undefined codes in data', () => {
        const dataWithNulls: AggregatedNode[] = [
          { fn_c: null as unknown as string, fn_n: 'Test', ec_c: '10.01', ec_n: 'Test EC', amount: 100, count: 1 },
          { fn_c: '51', fn_n: 'Admin', ec_c: undefined as unknown as string, ec_n: 'Test', amount: 200, count: 1 },
          createNode('65', 'Education', '20', 'Goods', 300, 1),
        ]

        const result = buildTreemapDataV2({
          data: dataWithNulls,
          primary: 'fn',
          path: [],
          rootDepth: 2,
        })

        // Only the valid item should be included
        expect(result).toHaveLength(2)
      })

      it('handles codes with special characters', () => {
        const dataWithSpecialChars: AggregatedNode[] = [
          createNode('  51.01  ', 'Admin', '10-01', 'Salaries', 100, 1),
          createNode('65.X03', 'Education', '20.01', 'Goods', 200, 1),
        ]

        const result = buildTreemapDataV2({
          data: dataWithSpecialChars,
          primary: 'fn',
          path: [],
          rootDepth: 2,
        })

        expect(result).toHaveLength(2)
        expect(result.some((r) => r.code === '51')).toBe(true)
        expect(result.some((r) => r.code === '65')).toBe(true)
      })

      it('uses API-provided name at depth 6', () => {
        const detailedData: AggregatedNode[] = [
          createNode('51.01.01', 'Executive Functions From API', '10.01.01', 'Base Salaries API', 100000, 5),
        ]

        const fnResult = buildTreemapDataV2({
          data: detailedData,
          primary: 'fn',
          path: ['51', '51.01'],
        })

        expect(fnResult[0]!.name).toBe('Executive Functions From API')

        const ecResult = buildTreemapDataV2({
          data: detailedData,
          primary: 'ec',
          path: ['10', '10.01'],
        })

        expect(ecResult[0]!.name).toBe('Base Salaries API')
      })

      it('marks items as leaf at depth >= 4', () => {
        const result = buildTreemapDataV2({
          data: sampleData,
          primary: 'fn',
          path: ['51'],
        })

        expect(result[0]!.isLeaf).toBe(true)
      })

      it('marks items as non-leaf at depth 2', () => {
        const result = buildTreemapDataV2({
          data: sampleData,
          primary: 'fn',
          path: [],
          rootDepth: 2,
        })

        expect(result[0]!.isLeaf).toBe(false)
      })

      it('caps economic code depth at 6', () => {
        // Even if path would push depth > 6, cap at 6
        const result = buildTreemapDataV2({
          data: sampleData,
          primary: 'ec',
          path: ['10', '10.01', '10.01.01'],
        })

        // Should return empty because depth > 6
        expect(result).toHaveLength(0)
      })
    })
  })

  describe('calculateExcludedItems', () => {
    const sampleData: AggregatedNode[] = [
      createNode('51.01', 'Admin', '10.01', 'Salaries', 100000, 5),
      createNode('51.02', 'Support', '51.01', 'Transfers', 50000, 2),
      createNode('54.02', 'Debt', '55.01', 'Associations', 30000, 1),
      createNode('65.03', 'Education', '20.05', 'Utilities', 15000, 2),
    ]

    it('returns zero exclusions when no exclude codes provided', () => {
      const result = calculateExcludedItems(sampleData, [])

      expect(result.totalExcluded).toBe(0)
      expect(result.totalBeforeExclusion).toBe(195000)
      expect(result.totalAfterExclusion).toBe(195000)
      expect(result.items).toHaveLength(0)
    })

    it('calculates excluded economic codes', () => {
      const result = calculateExcludedItems(sampleData, ['51', '55'])

      expect(result.totalExcluded).toBe(80000) // 50000 + 30000
      expect(result.totalBeforeExclusion).toBe(195000)
      expect(result.totalAfterExclusion).toBe(115000)
      expect(result.items).toHaveLength(2)

      const ec51 = result.items.find((i) => i.code === 'ec:51')
      expect(ec51?.amount).toBe(50000)

      const ec55 = result.items.find((i) => i.code === 'ec:55')
      expect(ec55?.amount).toBe(30000)
    })

    it('calculates excluded functional codes', () => {
      const result = calculateExcludedItems(sampleData, [], {
        excludeFnCodes: ['54'],
      })

      expect(result.totalExcluded).toBe(30000)
      expect(result.items).toHaveLength(1)
      expect(result.items[0]!.code).toBe('fn:54')
    })

    it('filters by constraint before calculating exclusions', () => {
      const result = calculateExcludedItems(sampleData, ['51'], {
        constraint: { type: 'fn', code: '51' },
      })

      // Only fn:51 items are considered, and only ec:51 is excluded
      expect(result.totalBeforeExclusion).toBe(150000) // 100000 + 50000
      expect(result.totalExcluded).toBe(50000) // Only the ec:51 item within fn:51
      expect(result.totalAfterExclusion).toBe(100000)
    })

    it('filters by path before calculating exclusions', () => {
      const result = calculateExcludedItems(sampleData, ['10'], {
        path: ['51'],
        primary: 'fn',
      })

      // Only fn starting with 51 considered
      expect(result.totalBeforeExclusion).toBe(150000)
      expect(result.totalExcluded).toBe(100000) // ec:10 item
    })

    it('handles empty data', () => {
      const result = calculateExcludedItems([], ['51'])

      expect(result.totalExcluded).toBe(0)
      expect(result.totalBeforeExclusion).toBe(0)
      expect(result.totalAfterExclusion).toBe(0)
      expect(result.items).toHaveLength(0)
    })

    it('excludes items with zero amount from results', () => {
      const result = calculateExcludedItems(sampleData, ['99']) // No matches

      expect(result.totalExcluded).toBe(0)
      expect(result.items).toHaveLength(0)
    })

    it('handles both ec and fn exclusions together', () => {
      const result = calculateExcludedItems(sampleData, ['51'], {
        excludeFnCodes: ['54'],
      })

      // ec:51 excludes 50000, fn:54 excludes 30000
      expect(result.totalExcluded).toBe(80000)
      expect(result.items).toHaveLength(2)
    })
  })

  describe('getParentCode', () => {
    it('returns parent for fn code with multiple parts', () => {
      expect(getParentCode('fn', '51.01.02')).toBe('51.01')
      expect(getParentCode('fn', '51.01')).toBe('51')
    })

    it('returns null for fn code without parent', () => {
      expect(getParentCode('fn', '51')).toBeNull()
    })

    it('returns parent for ec code with multiple parts', () => {
      expect(getParentCode('ec', '10.01.02')).toBe('10.01')
      expect(getParentCode('ec', '10.01')).toBe('10')
    })

    it('returns null for ec code without parent', () => {
      expect(getParentCode('ec', '10')).toBeNull()
    })

    it('returns null for null/undefined code', () => {
      expect(getParentCode('fn', null)).toBeNull()
      expect(getParentCode('ec', null)).toBeNull()
    })

    it('cleans code before finding parent', () => {
      expect(getParentCode('fn', '  51.01  ')).toBe('51')
      // Note: dashes are removed, leaving '100102' with no dots, so returns null
      expect(getParentCode('ec', '10-01-02')).toBeNull()
      // Proper dotted code with spaces works
      expect(getParentCode('ec', '  10.01.02  ')).toBe('10.01')
    })
  })

  describe('buildTreemapData', () => {
    const sampleData: AggregatedNode[] = [
      createNode('51.01.01', 'Executive', '10.01.01', 'Base Salary', 100000, 5),
      createNode('51.01.02', 'Legislative', '10.01.02', 'Bonuses', 50000, 3),
      createNode('51.02', 'Support', '20.01.01', 'Paper', 5000, 2),
      createNode('65.03', 'Education', '20.05', 'Utilities', 15000, 2),
    ]

    it('groups by fn at depth 2', () => {
      const result = buildTreemapData(sampleData, {
        primary: 'fn',
        depth: 2,
      })

      expect(result).toHaveLength(2)
      expect(result[0]!.code).toBe('51')
      expect(result[0]!.value).toBe(155000)
      expect(result[0]!.name).toBe('Public Administration')
    })

    it('groups by ec at depth 2', () => {
      const result = buildTreemapData(sampleData, {
        primary: 'ec',
        depth: 2,
      })

      expect(result).toHaveLength(2)
      expect(result[0]!.code).toBe('10')
      expect(result[0]!.value).toBe(150000)
      expect(result[0]!.name).toBe('Personnel Expenses')
    })

    it('groups by fn at depth 4', () => {
      const result = buildTreemapData(sampleData, {
        primary: 'fn',
        depth: 4,
      })

      expect(result).toHaveLength(3)
      expect(result[0]!.code).toBe('51.01')
      expect(result[0]!.value).toBe(150000)
    })

    it('groups by ec at depth 4', () => {
      const result = buildTreemapData(sampleData, {
        primary: 'ec',
        depth: 4,
      })

      expect(result).toHaveLength(3)
      expect(result[0]!.code).toBe('10.01')
      expect(result[0]!.value).toBe(150000)
      expect(result[0]!.name).toBe('Salaries')
    })

    it('groups by fn at depth 6', () => {
      const result = buildTreemapData(sampleData, {
        primary: 'fn',
        depth: 6,
      })

      expect(result).toHaveLength(4)
      expect(result[0]!.code).toBe('51.01.01')
      expect(result[0]!.value).toBe(100000)
      expect(result[0]!.name).toBe('Executive') // Uses API-provided name
    })

    it('filters by drillPrefix', () => {
      const result = buildTreemapData(sampleData, {
        primary: 'fn',
        depth: 4,
        drillPrefix: '51',
      })

      expect(result).toHaveLength(2)
      expect(result.every((r) => r.code.startsWith('51'))).toBe(true)
    })

    it('applies fn constraint', () => {
      const result = buildTreemapData(sampleData, {
        primary: 'ec',
        depth: 2,
        constraint: { type: 'fn', code: '51' },
      })

      expect(result).toHaveLength(2)
      expect(result[0]!.code).toBe('10')
      expect(result[0]!.value).toBe(150000)
    })

    it('applies ec constraint', () => {
      const result = buildTreemapData(sampleData, {
        primary: 'fn',
        depth: 2,
        constraint: { type: 'ec', code: '10' },
      })

      expect(result).toHaveLength(1)
      expect(result[0]!.code).toBe('51')
      expect(result[0]!.value).toBe(150000)
    })

    it('marks items as leaf at depth >= 4', () => {
      const result = buildTreemapData(sampleData, {
        primary: 'fn',
        depth: 4,
      })

      expect(result[0]!.isLeaf).toBe(true)
    })

    it('handles empty data', () => {
      const result = buildTreemapData([], {
        primary: 'fn',
        depth: 2,
      })

      expect(result).toHaveLength(0)
    })

    it('sorts results by value descending', () => {
      const result = buildTreemapData(sampleData, {
        primary: 'fn',
        depth: 2,
      })

      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1]!.value).toBeGreaterThanOrEqual(result[i]!.value)
      }
    })
  })

  describe('groupData', () => {
    const sampleData: AggregatedNode[] = [
      createNode('51.01.01', 'Executive', '10.01.01', 'Base Salary', 100000, 5),
      createNode('51.01.02', 'Legislative', '10.01.02', 'Bonuses', 50000, 3),
      createNode('51.02', 'Support', '20.01.01', 'Paper', 5000, 2),
      createNode('54.02', 'Debt', '51.01', 'Transfers', 30000, 1),
      createNode('65.03', 'Education', '20.05', 'Utilities', 15000, 2),
      createNode('66.01', 'Health Primary', '10.01', 'Salaries', 25000, 4),
      createNode('67.01', 'Social', '10.02', 'Benefits', 20000, 3),
      createNode('68.01', 'Culture', '20.02', 'Services', 10000, 2),
    ]

    it('groups by fn at depth 2 and returns top 7', () => {
      const result = groupData(sampleData, 'fn', 2)

      expect(result.items.length).toBeLessThanOrEqual(7)
      expect(result.baseTotal).toBe(255000)

      // First item should be highest value
      expect(result.items[0]!.code).toBe('51')
      expect(result.items[0]!.total).toBe(155000)
      expect(result.items[0]!.name).toBe('Public Administration')
    })

    it('groups by ec at depth 2', () => {
      const result = groupData(sampleData, 'ec', 2)

      expect(result.items[0]!.code).toBe('10')
      // 100000 (10.01.01) + 50000 (10.01.02) + 25000 (10.01) + 20000 (10.02) = 195000
      expect(result.items[0]!.total).toBe(195000)
      expect(result.items[0]!.name).toBe('Personnel Expenses')
    })

    it('groups by fn at depth 4', () => {
      const result = groupData(sampleData, 'fn', 4)

      expect(result.items[0]!.code).toBe('51.01')
      expect(result.items[0]!.total).toBe(150000)
    })

    it('groups by ec at depth 4', () => {
      const result = groupData(sampleData, 'ec', 4)

      expect(result.items[0]!.code).toBe('10.01')
      expect(result.items[0]!.total).toBe(175000)
      expect(result.items[0]!.name).toBe('Salaries')
    })

    it('groups by fn at depth 6', () => {
      const result = groupData(sampleData, 'fn', 6)

      expect(result.items[0]!.code).toBe('51.01.01')
      expect(result.items[0]!.total).toBe(100000)
    })

    it('groups by ec at depth 6', () => {
      const result = groupData(sampleData, 'ec', 6)

      expect(result.items[0]!.code).toBe('10.01.01')
      expect(result.items[0]!.total).toBe(100000)
      expect(result.items[0]!.name).toBe('Base Salary')
    })

    it('accumulates count correctly', () => {
      const result = groupData(sampleData, 'fn', 2)

      const fn51 = result.items.find((i) => i.code === '51')
      expect(fn51?.count).toBe(10) // 5 + 3 + 2
    })

    it('handles empty data', () => {
      const result = groupData([], 'fn', 2)

      expect(result.items).toHaveLength(0)
      expect(result.baseTotal).toBe(0)
    })

    it('limits results to top 7', () => {
      // With 8 different chapters, should only return 7
      const result = groupData(sampleData, 'fn', 2)

      expect(result.items.length).toBeLessThanOrEqual(7)
    })

    it('sorts results by total descending', () => {
      const result = groupData(sampleData, 'fn', 2)

      for (let i = 1; i < result.items.length; i++) {
        expect(result.items[i - 1]!.total).toBeGreaterThanOrEqual(result.items[i]!.total)
      }
    })

    it('calculates baseTotal from all items before limiting', () => {
      const result = groupData(sampleData, 'fn', 2)

      // baseTotal should include all items, not just top 7
      expect(result.baseTotal).toBe(255000)
    })

    it('uses classification names for fn at depth 2', () => {
      const result = groupData(sampleData, 'fn', 2)

      const fn51 = result.items.find((i) => i.code === '51')
      expect(fn51?.name).toBe('Public Administration')

      const fn65 = result.items.find((i) => i.code === '65')
      expect(fn65?.name).toBe('Education')
    })

    it('uses economic chapter names for ec at depth 2', () => {
      const result = groupData(sampleData, 'ec', 2)

      const ec10 = result.items.find((i) => i.code === '10')
      expect(ec10?.name).toBe('Personnel Expenses')

      const ec20 = result.items.find((i) => i.code === '20')
      expect(ec20?.name).toBe('Goods and Services')
    })

    it('uses economic subchapter names for ec at depth 4', () => {
      const result = groupData(sampleData, 'ec', 4)

      const ec1001 = result.items.find((i) => i.code === '10.01')
      expect(ec1001?.name).toBe('Salaries')
    })
  })
})
