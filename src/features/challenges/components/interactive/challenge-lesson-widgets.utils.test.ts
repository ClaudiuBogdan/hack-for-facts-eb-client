import { describe, expect, it } from 'vitest'
import {
  buildLessonEstimateOptions,
  buildLessonExecutionTableExcerpt,
  buildLessonSingleCorrectQuizOptions,
} from './challenge-lesson-widgets.utils'

describe('challenge lesson widget utils', () => {
  it('builds one correct estimate option and three distractors', () => {
    const options = buildLessonEstimateOptions({
      actualValue: 2_143_522_844,
      currency: 'RON',
    })

    expect(options).toHaveLength(4)
    expect(options.filter((option) => option.isCorrect)).toHaveLength(1)
    expect(new Set(options.map((option) => option.text)).size).toBe(4)
    expect(options[0]?.isCorrect).toBe(false)
  })

  it('builds a curated execution table excerpt with hierarchy rows', () => {
    const rows = buildLessonExecutionTableExcerpt({
      totalExpenses: 1_000_000,
      expenseGroups: [
        {
          prefix: '65',
          description: 'Invatamant',
          totalAmount: 400_000,
          functionals: [
            {
              code: '65.04',
              name: 'Invatamant secundar',
              totalAmount: 220_000,
              economics: [
                { code: '10', name: 'Cheltuieli de personal', amount: 140_000 },
                { code: '20', name: 'Bunuri si servicii', amount: 80_000 },
              ],
            },
          ],
        },
      ],
    })

    expect(rows.map((row) => row.kind)).toEqual([
      'total',
      'chapter',
      'functional',
      'economic',
      'economic',
    ])
    expect(rows[0]?.indicator).toBe('TOTAL CHELTUIELI')
    expect(rows[1]?.functionalCode).toBe('65')
    expect(rows[3]?.economicCode).toBe('10')
  })

  it('returns no excerpt rows when summary totals are unavailable', () => {
    const rows = buildLessonExecutionTableExcerpt({
      totalExpenses: null,
      expenseGroups: [],
    })

    expect(rows).toEqual([])
  })

  it('builds shuffled single-correct quiz options', () => {
    const options = buildLessonSingleCorrectQuizOptions({
      correctOption: {
        id: 'correct',
        text: 'Agregat',
      },
      distractors: [
        { id: 'd1', text: 'Detaliat' },
        { id: 'd2', text: 'Buget aprobat' },
        { id: 'd3', text: 'Rectificare' },
      ],
      seed: 42,
    })

    expect(options).toHaveLength(4)
    expect(options.filter((option) => option.isCorrect)).toHaveLength(1)
    expect(new Set(options.map((option) => option.text)).size).toBe(4)
    expect(options[0]?.isCorrect).toBe(false)
  })
})
