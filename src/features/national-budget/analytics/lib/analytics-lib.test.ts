import { describe, expect, it } from 'vitest'

import { exactChange, exactPercent, exactText, plotOf, thousandToLei } from './exact'
import { LINE_TREE, SECTION_ROOT, cutLines, opens, rankedTree, treeLines } from './lines'
import { lastWholeQuarter, periodTypeOf, periodsBetween, quarterOf, shiftYears, toAnalyticsSeries } from './series'
import fixture from './bgc-full-year.fixture.json'

describe('exact decimals', () => {
  it('plots a float and refuses anything that is not a number', () => {
    expect(plotOf('310520639938.72993')).toBeCloseTo(310520639938.73, 1)
    expect(plotOf('-5651000000')).toBe(-5651000000)
    expect(plotOf(null)).toBeNull()
    expect(plotOf('')).toBeNull()
    expect(plotOf('1e9')).toBeNull()
  })

  it('writes the exact digits in Romanian notation, rounding half up on the string', () => {
    expect(exactText('310520639938.72993')).toBe('310.520.639.938,73')
    expect(exactText('321131375868.97821165621280670166015625')).toBe('321.131.375.868,98')
    expect(exactText('999.995')).toBe('1.000,00')
    expect(exactText('-48300190426.7598874866962432861328125', 0)).toBe('−48.300.190.427')
    expect(exactText('0')).toBe('0,00')
    expect(exactText('-0.001')).toBe('0,00')
    expect(exactText('167715883910', 0)).toBe('167.715.883.910')
  })

  it('turns thousand lei into lei by moving the point, not by a float', () => {
    expect(thousandToLei('499582980')).toBe('499582980000')
    expect(thousandToLei('41160812.5')).toBe('41160812500')
    expect(thousandToLei('0.0425')).toBe('42.5')
    expect(thousandToLei('-1352876')).toBe('-1352876000')
    expect(thousandToLei('0')).toBe('0')
  })
})

describe('exact shares and changes', () => {
  it('divides on the decimals, rounding half away from zero at the shown digits', () => {
    expect(exactPercent('1', '3', 1)).toBe(33.3)
    expect(exactPercent('2', '3', 0)).toBe(67)
    expect(exactPercent('1', '16', 1)).toBe(6.3)
    expect(exactPercent('-1', '16', 1)).toBe(-6.3)
    expect(exactPercent('0.001', '1000', 1)).toBe(0)
    expect(exactPercent('5', '0', 1)).toBeNull()
    expect(exactPercent('abc', '3', 1)).toBeNull()
  })

  it('changes on the decimals, not on floats that round them first', () => {
    // A float reads 100049999999.999999 as 100050000000 and would say +0.1%: the exact change is 0.0499…%.
    expect(exactChange('100049999999.999999', '100000000000', 1)).toBe(0)
    expect(exactChange('90', '100', 1)).toBe(-10)
    expect(exactChange('112.3', '100', 1)).toBe(12.3)
    expect(exactChange('5', '0', 1)).toBeNull()
    expect(exactChange('5', '-10', 1)).toBeNull()
  })
})

describe('the chart contract (server handoff, 4 October 2026)', () => {
  it('keeps a gap a gap and the exact value beside the plotted one', () => {
    const series = toAnalyticsSeries('venituri', {
      unit: 'RON',
      series: { data: [{ date: '2025-06', value: '310520639938.72993' }] },
      periods: [
        { date: '2006-07', status: 'UNAVAILABLE' },
        { date: '2025-06', status: 'AVAILABLE' },
      ],
    })
    expect(series).toEqual({
      seriesId: 'venituri',
      xAxis: { name: 'Period', type: 'STRING', unit: '' },
      yAxis: { name: 'Amount', type: 'FLOAT', unit: 'RON' },
      // The plotting coordinate cannot hold every digit; the exact one travels in pointDetails.
      data: [{ x: '2025-06', y: Number('310520639938.72993') }],
      missingPeriods: ['2006-07'],
      pointDetails: { '2025-06': { exact: '310520639938.72993' } },
    })
  })

  it('says an empty array, not null, when nothing is missing', () => {
    const series = toAnalyticsSeries('x', { unit: 'RON', series: { data: [{ date: '2025', value: '1' }] }, periods: [{ date: '2025', status: 'AVAILABLE' }] })
    expect(series.missingPeriods).toEqual([])
  })

  it('never plots a value the period does not vouch for', () => {
    const series = toAnalyticsSeries('x', { unit: 'RON', series: { data: [{ date: '2026', value: '5' }] }, periods: [{ date: '2026', status: 'OUT_OF_COVERAGE' }] })
    expect(series.data).toEqual([])
    expect(series.missingPeriods).toEqual(['2026'])
  })
})

describe('periods', () => {
  it('reads the type from the label', () => {
    expect(periodTypeOf('2025')).toBe('YEAR')
    expect(periodTypeOf('2025-Q2')).toBe('QUARTER')
    expect(periodTypeOf('2025-07')).toBe('MONTH')
  })

  it('lists the periods between two labels, both ends included', () => {
    expect(periodsBetween('YEAR', '2023', '2025')).toEqual(['2023', '2024', '2025'])
    expect(periodsBetween('QUARTER', '2025-Q3', '2026-Q2')).toEqual(['2025-Q3', '2025-Q4', '2026-Q1', '2026-Q2'])
    expect(periodsBetween('MONTH', '2025-11', '2026-02')).toEqual(['2025-11', '2025-12', '2026-01', '2026-02'])
  })

  it('moves a period by years and finds its quarters', () => {
    expect(shiftYears('2026-07', -1)).toBe('2025-07')
    expect(shiftYears('2026-Q2', -1)).toBe('2025-Q2')
    expect(shiftYears('2025', -1)).toBe('2024')
    expect(quarterOf('2026-07')).toBe('2026-Q3')
    expect(lastWholeQuarter('2026-07')).toBe('2026-Q2')
    expect(lastWholeQuarter('2026-06')).toBe('2026-Q2')
    expect(lastWholeQuarter('2026-02')).toBe('2025-Q4')
  })
})

describe('the bulletin tree, against the live full-year values 2019–2025', () => {
  const years = fixture.years as Record<string, Record<string, string>>
  const items = Object.keys(LINE_TREE)
  const sum = (values: Record<string, string>, rows: readonly string[]) => rows.reduce((total, itemId) => total + Number(values[itemId] ?? 0), 0)

  for (const [year, values] of Object.entries(years)) {
    const present = new Set(Object.keys(values))
    for (const [section, depths] of [
      ['EXPENDITURE', [1, 2]],
      ['REVENUE', [1, 2, 3, 4]],
    ] as const) {
      const root = SECTION_ROOT[section]
      for (const depth of depths) {
        it(`${year}: every ${section.toLowerCase()} row at depth ${depth} adds up to the total`, () => {
          const rows = cutLines({ section, sectionItems: items, present, depth })
          expect(rows).not.toContain(root)
          expect(new Set(rows).size).toBe(rows.length)
          // Within a thousand lei: the workbook's own rounding.
          expect(Math.abs(sum(values, rows) - Number(values[root]))).toBeLessThan(1_000_000)
        })
      }
      it(`${year}: every ${section.toLowerCase()} line that opens adds up to its children`, () => {
        for (const itemId of items.filter((key) => present.has(key) && opens(key, present) && key !== root)) {
          const rows = cutLines({ section, sectionItems: items, present, depth: 9, under: itemId })
          if (rows.length === 0) continue
          expect(Math.abs(sum(values, rows) - Number(values[itemId]))).toBeLessThan(1_000_000)
        }
      })
    }
  }

  for (const [year, values] of Object.entries(years)) {
    const present = new Set(Object.keys(values))
    for (const section of ['EXPENDITURE', 'REVENUE'] as const) {
      it(`${year}: the ${section.toLowerCase()} tree adds up at every step, siblings ranked`, () => {
        const root = SECTION_ROOT[section]
        const value = (itemId: string) => (values[itemId] === undefined ? null : Number(values[itemId]))
        const rows = rankedTree({ section, sectionItems: items, present, value })
        expect(rows.map((row) => row.itemId)).not.toContain('mfin.bgc.expenditure.transfers_total')
        expect(new Set(rows.map((row) => row.itemId)).size).toBe(rows.length)
        // The rows one step under a parent: those that follow it, at its depth + 1, until the next row no deeper than it.
        const under = (index: number, depth: number) => {
          const out: string[] = []
          for (let next = index + 1; next < rows.length && rows[next]!.depth > depth; next += 1) if (rows[next]!.depth === depth + 1) out.push(rows[next]!.itemId)
          return out
        }
        const top = rows.filter((row) => row.depth === 0).map((row) => row.itemId)
        expect(Math.abs(sum(values, top) - Number(values[root]))).toBeLessThan(1_000_000)
        rows.forEach((row, index) => {
          const children = under(index, row.depth)
          expect(children.length > 0).toBe(row.opens)
          if (children.length > 0) expect(Math.abs(sum(values, children) - Number(values[row.itemId]))).toBeLessThan(1_000_000)
          const lei = children.map((child) => Number(values[child]))
          expect(lei).toEqual([...lei].sort((a, b) => b - a))
        })
      })
    }
  }

  it('puts loans under financial operations (79 = 80 + 81), so a year with loans adds up once', () => {
    // 2010's shape, in million lei: operations are all loans, and the top lines make the total only with loans inside them.
    const values: Record<string, string> = {
      'mfin.bgc.expenditure.total': '201903',
      'mfin.bgc.expenditure.current': '182985',
      'mfin.bgc.expenditure.capital': '19369',
      'mfin.bgc.expenditure.financial_operations': '193',
      'mfin.bgc.expenditure.loans': '193',
      'mfin.bgc.expenditure.prior_year_recovered_payments': '-644',
    }
    const present = new Set(Object.keys(values))
    const rows = rankedTree({ section: 'EXPENDITURE', sectionItems: items, present, value: (itemId) => Number(values[itemId] ?? 0) })
    const top = rows.filter((row) => row.depth === 0).map((row) => row.itemId)
    expect(top).not.toContain('mfin.bgc.expenditure.loans')
    expect(sum(values, top)).toBe(Number(values['mfin.bgc.expenditure.total']))
    expect(rows.find((row) => row.itemId === 'mfin.bgc.expenditure.loans')?.depth).toBe(1)
  })

  it('keeps a subtotal out of every cut and in the full tree', () => {
    const present = new Set(['mfin.bgc.expenditure.total', 'mfin.bgc.expenditure.current', 'mfin.bgc.expenditure.transfers_total', 'mfin.bgc.expenditure.social_assistance'])
    expect(cutLines({ section: 'EXPENDITURE', sectionItems: items, present, depth: 2 })).toEqual(['mfin.bgc.expenditure.social_assistance'])
    expect(treeLines({ section: 'EXPENDITURE', sectionItems: items, present }).map((row) => row.itemId)).toContain('mfin.bgc.expenditure.transfers_total')
  })

  it('keeps a line whose parent is absent this period, and an unknown item, last', () => {
    const present = new Set(['mfin.bgc.revenue.total', 'mfin.bgc.revenue.vat', 'mfin.bgc.revenue.new_line'])
    expect(cutLines({ section: 'REVENUE', sectionItems: [...items, 'mfin.bgc.revenue.new_line'], present, depth: 1 })).toEqual(['mfin.bgc.revenue.vat', 'mfin.bgc.revenue.new_line'])
  })
})
