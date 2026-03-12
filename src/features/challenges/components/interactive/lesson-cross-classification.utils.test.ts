import { describe, expect, it } from 'vitest'
import type { GroupedChapter } from '@/schemas/financial'
import { buildCrossClassificationView } from './lesson-cross-classification.utils'

function makeFnChapter(
  prefix: string,
  description: string,
  totalAmount: number,
  functionals: GroupedChapter['functionals'] = [],
): GroupedChapter {
  return { prefix, description, totalAmount, functionals }
}

function makeEcChapter(
  prefix: string,
  description: string,
  totalAmount: number,
  opts?: {
    functionals?: GroupedChapter['functionals']
    subchapters?: GroupedChapter['subchapters']
  },
): GroupedChapter {
  return {
    prefix,
    description,
    totalAmount,
    functionals: opts?.functionals ?? [],
    subchapters: opts?.subchapters ?? [],
  }
}

describe('buildCrossClassificationView', () => {
  it('returns empty arrays for empty groups', () => {
    const result = buildCrossClassificationView({
      expenseGroups: [],
      economicGroups: [],
    })
    expect(result.fnToEc).toEqual([])
    expect(result.ecToFn).toEqual([])
  })

  it('handles a single fn chapter with one economic entry', () => {
    const groups: GroupedChapter[] = [
      makeFnChapter('65', 'Education', 1000, [
        {
          code: '65.03.01',
          name: 'Primary',
          totalAmount: 1000,
          economics: [{ code: '10.01.01', name: 'Salaries', amount: 1000 }],
        },
      ]),
    ]

    const result = buildCrossClassificationView({
      expenseGroups: groups,
      economicGroups: [],
    })

    expect(result.fnToEc).toHaveLength(1)
    expect(result.fnToEc[0].code).toBe('65')
    expect(result.fnToEc[0].breakdowns).toHaveLength(1)
    expect(result.fnToEc[0].breakdowns[0].code).toBe('10')
    expect(result.fnToEc[0].breakdowns[0].amount).toBe(1000)
    expect(result.fnToEc[0].breakdowns[0].shareOfChapter).toBe(100)
  })

  it('aggregates by 2-digit prefix across multiple functionals', () => {
    const groups: GroupedChapter[] = [
      makeFnChapter('65', 'Education', 3000, [
        {
          code: '65.03.01',
          name: 'Primary',
          totalAmount: 2000,
          economics: [
            { code: '10.01.01', name: 'Base salaries', amount: 1500 },
            { code: '10.02.01', name: 'Overtime', amount: 500 },
          ],
        },
        {
          code: '65.04.01',
          name: 'Secondary',
          totalAmount: 1000,
          economics: [
            { code: '20.01.01', name: 'Supplies', amount: 700 },
            { code: '10.03.01', name: 'Bonuses', amount: 300 },
          ],
        },
      ]),
    ]

    const result = buildCrossClassificationView({
      expenseGroups: groups,
      economicGroups: [],
    })

    expect(result.fnToEc).toHaveLength(1)
    const breakdowns = result.fnToEc[0].breakdowns
    // 10.01.01 (1500) + 10.02.01 (500) + 10.03.01 (300) = 2300 for prefix "10"
    // 20.01.01 (700) for prefix "20"
    expect(breakdowns).toHaveLength(2)
    expect(breakdowns[0].code).toBe('10')
    expect(breakdowns[0].amount).toBe(2300)
    expect(breakdowns[1].code).toBe('20')
    expect(breakdowns[1].amount).toBe(700)
  })

  it('slices to top 2 breakdowns when 3+ exist', () => {
    const groups: GroupedChapter[] = [
      makeFnChapter('65', 'Education', 6000, [
        {
          code: '65.03.01',
          name: 'Primary',
          totalAmount: 6000,
          economics: [
            { code: '10.01', name: 'Salaries', amount: 3000 },
            { code: '20.01', name: 'Goods', amount: 2000 },
            { code: '71.01', name: 'Assets', amount: 1000 },
          ],
        },
      ]),
    ]

    const result = buildCrossClassificationView({
      expenseGroups: groups,
      economicGroups: [],
    })

    expect(result.fnToEc[0].breakdowns).toHaveLength(2)
    expect(result.fnToEc[0].breakdowns[0].code).toBe('10')
    expect(result.fnToEc[0].breakdowns[1].code).toBe('20')
  })

  it('computes shareOfChapter correctly', () => {
    const groups: GroupedChapter[] = [
      makeFnChapter('65', 'Education', 10000, [
        {
          code: '65.03.01',
          name: 'Primary',
          totalAmount: 10000,
          economics: [
            { code: '10.01', name: 'Salaries', amount: 7000 },
            { code: '20.01', name: 'Goods', amount: 3000 },
          ],
        },
      ]),
    ]

    const result = buildCrossClassificationView({
      expenseGroups: groups,
      economicGroups: [],
    })

    expect(result.fnToEc[0].breakdowns[0].shareOfChapter).toBe(70)
    expect(result.fnToEc[0].breakdowns[1].shareOfChapter).toBe(30)
  })

  it('builds ecToFn from subchapters and direct functionals', () => {
    const ecGroups: GroupedChapter[] = [
      makeEcChapter('10', 'Personnel', 5000, {
        functionals: [
          { code: '65.03.01', name: 'Education primary', totalAmount: 1000, economics: [] },
        ],
        subchapters: [
          {
            code: '10.01',
            name: 'Salaries',
            totalAmount: 4000,
            functionals: [
              { code: '65.04.01', name: 'Education secondary', totalAmount: 2500, economics: [] },
              { code: '68.01.01', name: 'Health primary', totalAmount: 1500, economics: [] },
            ],
          },
        ],
      }),
    ]

    const result = buildCrossClassificationView({
      expenseGroups: [],
      economicGroups: ecGroups,
    })

    expect(result.ecToFn).toHaveLength(1)
    const breakdowns = result.ecToFn[0].breakdowns
    // 65: 1000 (direct) + 2500 (subchapter) = 3500
    // 68: 1500
    expect(breakdowns).toHaveLength(2)
    expect(breakdowns[0].code).toBe('65')
    expect(breakdowns[0].amount).toBe(3500)
    expect(breakdowns[1].code).toBe('68')
    expect(breakdowns[1].amount).toBe(1500)
  })

  it('takes only top 2 chapters from each direction', () => {
    const fnGroups: GroupedChapter[] = [
      makeFnChapter('65', 'Education', 5000, [
        { code: '65.01', name: 'A', totalAmount: 5000, economics: [{ code: '10.01', name: 'S', amount: 5000 }] },
      ]),
      makeFnChapter('68', 'Health', 3000, [
        { code: '68.01', name: 'B', totalAmount: 3000, economics: [{ code: '10.01', name: 'S', amount: 3000 }] },
      ]),
      makeFnChapter('70', 'Housing', 1000, [
        { code: '70.01', name: 'C', totalAmount: 1000, economics: [{ code: '20.01', name: 'G', amount: 1000 }] },
      ]),
    ]

    const result = buildCrossClassificationView({
      expenseGroups: fnGroups,
      economicGroups: [],
    })

    expect(result.fnToEc).toHaveLength(2)
    expect(result.fnToEc[0].code).toBe('65')
    expect(result.fnToEc[1].code).toBe('68')
  })

  it('handles zero totalAmount without division error', () => {
    const groups: GroupedChapter[] = [
      makeFnChapter('65', 'Education', 0, [
        {
          code: '65.01',
          name: 'A',
          totalAmount: 0,
          economics: [{ code: '10.01', name: 'S', amount: 0 }],
        },
      ]),
    ]

    const result = buildCrossClassificationView({
      expenseGroups: groups,
      economicGroups: [],
    })

    expect(result.fnToEc[0].breakdowns[0].shareOfChapter).toBe(0)
  })
})
