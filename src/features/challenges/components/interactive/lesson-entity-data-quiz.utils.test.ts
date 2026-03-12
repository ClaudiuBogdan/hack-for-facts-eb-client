import { describe, expect, it } from 'vitest'
import type { GroupedChapter } from '@/schemas/financial'
import { buildEntityDataQuizOptions, buildSubItemQuizOptions } from './lesson-entity-data-quiz.utils'

function makeGroup(prefix: string, description: string, totalAmount: number): GroupedChapter {
  return { prefix, description, totalAmount, functionals: [] }
}

describe('buildEntityDataQuizOptions', () => {
  it('returns empty array when no groups', () => {
    expect(buildEntityDataQuizOptions({ groups: [] })).toEqual([])
  })

  it('returns 2 options with synthetic distractor for 1 group', () => {
    const groups = [makeGroup('01', 'Impozit pe venit', 500_000)]
    const options = buildEntityDataQuizOptions({ groups, seed: 42 })

    expect(options).toHaveLength(2)
    expect(options.filter((o) => o.isCorrect)).toHaveLength(1)
    expect(options.find((o) => o.isCorrect)?.text).toBe('Impozit pe venit')
    expect(options.find((o) => !o.isCorrect)?.id).toBe('distractor-other')
  })

  it('picks top 4 groups when 4+ available', () => {
    const groups = [
      makeGroup('65', 'Invatamant', 400_000),
      makeGroup('68', 'Sanatate', 300_000),
      makeGroup('70', 'Locuinte', 200_000),
      makeGroup('74', 'Protectia mediului', 100_000),
      makeGroup('80', 'Cultura', 50_000),
    ]
    const options = buildEntityDataQuizOptions({ groups, seed: 7 })

    expect(options).toHaveLength(4)
    expect(options.filter((o) => o.isCorrect)).toHaveLength(1)
    expect(options.find((o) => o.isCorrect)?.text).toBe('Invatamant')
    expect(options.map((o) => o.text)).not.toContain('Cultura')
  })

  it('handles 2-3 groups correctly', () => {
    const groups = [
      makeGroup('65', 'Invatamant', 400_000),
      makeGroup('68', 'Sanatate', 300_000),
      makeGroup('70', 'Locuinte', 200_000),
    ]
    const options = buildEntityDataQuizOptions({ groups, seed: 5 })

    expect(options).toHaveLength(3)
    expect(options.filter((o) => o.isCorrect)).toHaveLength(1)
    expect(options.find((o) => o.isCorrect)?.text).toBe('Invatamant')
  })

  it('produces deterministic shuffle with the same seed', () => {
    const groups = [
      makeGroup('65', 'Invatamant', 400_000),
      makeGroup('68', 'Sanatate', 300_000),
      makeGroup('70', 'Locuinte', 200_000),
      makeGroup('74', 'Protectia mediului', 100_000),
    ]
    const a = buildEntityDataQuizOptions({ groups, seed: 123 })
    const b = buildEntityDataQuizOptions({ groups, seed: 123 })

    expect(a.map((o) => o.id)).toEqual(b.map((o) => o.id))
  })
})

function makeSubItem(code: string, name: string, totalAmount: number) {
  return { code, name, totalAmount }
}

describe('buildSubItemQuizOptions', () => {
  it('returns empty array when no items', () => {
    expect(buildSubItemQuizOptions({ items: [] })).toEqual([])
  })

  it('returns 2 options with synthetic distractor for 1 item', () => {
    const items = [makeSubItem('6502', 'Invatamant prescolar', 200_000)]
    const options = buildSubItemQuizOptions({ items, seed: 42 })

    expect(options).toHaveLength(2)
    expect(options.filter((o) => o.isCorrect)).toHaveLength(1)
    expect(options.find((o) => o.isCorrect)?.text).toBe('Invatamant prescolar')
    expect(options.find((o) => !o.isCorrect)?.id).toBe('distractor-other')
  })

  it('handles 2-3 items correctly', () => {
    const items = [
      makeSubItem('6502', 'Invatamant prescolar', 200_000),
      makeSubItem('6503', 'Invatamant primar', 150_000),
      makeSubItem('6504', 'Invatamant secundar', 100_000),
    ]
    const options = buildSubItemQuizOptions({ items, seed: 5 })

    expect(options).toHaveLength(3)
    expect(options.filter((o) => o.isCorrect)).toHaveLength(1)
    expect(options.find((o) => o.isCorrect)?.text).toBe('Invatamant prescolar')
  })

  it('picks top 4 items when 4+ available', () => {
    const items = [
      makeSubItem('6502', 'Invatamant prescolar', 200_000),
      makeSubItem('6503', 'Invatamant primar', 150_000),
      makeSubItem('6504', 'Invatamant secundar', 100_000),
      makeSubItem('6505', 'Invatamant postliceal', 50_000),
      makeSubItem('6506', 'Invatamant special', 20_000),
    ]
    const options = buildSubItemQuizOptions({ items, seed: 7 })

    expect(options).toHaveLength(4)
    expect(options.filter((o) => o.isCorrect)).toHaveLength(1)
    expect(options.find((o) => o.isCorrect)?.text).toBe('Invatamant prescolar')
    expect(options.map((o) => o.text)).not.toContain('Invatamant special')
  })

  it('produces deterministic shuffle with the same seed', () => {
    const items = [
      makeSubItem('6502', 'Invatamant prescolar', 200_000),
      makeSubItem('6503', 'Invatamant primar', 150_000),
      makeSubItem('6504', 'Invatamant secundar', 100_000),
      makeSubItem('6505', 'Invatamant postliceal', 50_000),
    ]
    const a = buildSubItemQuizOptions({ items, seed: 123 })
    const b = buildSubItemQuizOptions({ items, seed: 123 })

    expect(a.map((o) => o.id)).toEqual(b.map((o) => o.id))
  })
})
