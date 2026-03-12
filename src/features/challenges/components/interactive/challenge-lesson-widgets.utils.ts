import { formatCurrency, shuffleArray } from '@/lib/utils'
import type { QuizOption } from '@/features/learning/components/assessment/Quiz'
import type { GroupedChapter, GroupedEconomic, GroupedFunctional } from '@/schemas/financial'

export type LessonExecutionExcerptRow = {
  readonly id: string
  readonly level: 0 | 1 | 2 | 3
  readonly kind: 'total' | 'chapter' | 'functional' | 'economic'
  readonly indicator: string
  readonly functionalCode?: string
  readonly economicCode?: string
  readonly amount: number
}

function getEstimateRoundingStep(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 1_000
  }

  const magnitude = Math.floor(Math.log10(value))
  return Math.max(1_000, 10 ** Math.max(0, magnitude - 2))
}

function roundEstimateValue(value: number): number {
  const step = getEstimateRoundingStep(Math.abs(value))
  return Math.max(step, Math.round(value / step) * step)
}

export function buildLessonEstimateOptions(params: {
  readonly actualValue: number
  readonly currency?: 'RON' | 'EUR' | 'USD'
}): readonly QuizOption[] {
  const currency = params.currency ?? 'RON'
  const actualValue = roundEstimateValue(params.actualValue)
  const offsets = [-0.35, -0.18, 0.22, 0.46]

  const distractors = offsets
    .map((offset) => roundEstimateValue(actualValue * (1 + offset)))
    .filter((value) => value > 0 && value !== actualValue)

  const uniqueDistractors = Array.from(new Set(distractors)).slice(0, 3)
  const options = [
    {
      id: 'correct',
      text: formatCurrency(actualValue, 'compact', currency),
      isCorrect: true,
    },
    ...uniqueDistractors.map((value, index) => ({
      id: `offset-${index + 1}`,
      text: formatCurrency(value, 'compact', currency),
      isCorrect: false,
    })),
  ] as const satisfies readonly QuizOption[]

  const shuffledOptions = shuffleArray(options, actualValue)
  if (shuffledOptions[0]?.isCorrect && shuffledOptions.length > 1) {
    return [...shuffledOptions.slice(1), shuffledOptions[0]]
  }

  return shuffledOptions
}

export function buildLessonSingleCorrectQuizOptions(params: {
  readonly correctOption: {
    readonly id: string
    readonly text: string
  }
  readonly distractors: readonly {
    readonly id: string
    readonly text: string
  }[]
  readonly seed: number
}): readonly QuizOption[] {
  const options = [
    {
      id: params.correctOption.id,
      text: params.correctOption.text,
      isCorrect: true,
    },
    ...params.distractors.slice(0, 3).map((option) => ({
      id: option.id,
      text: option.text,
      isCorrect: false,
    })),
  ] as const satisfies readonly QuizOption[]

  const shuffledOptions = shuffleArray(options, params.seed)
  if (shuffledOptions[0]?.isCorrect && shuffledOptions.length > 1) {
    return [...shuffledOptions.slice(1), shuffledOptions[0]]
  }

  return shuffledOptions
}

function pickTopFunctional(chapter: GroupedChapter | undefined): GroupedFunctional | null {
  return chapter?.functionals[0] ?? null
}

function pickTopEconomics(functional: GroupedFunctional | null): readonly GroupedEconomic[] {
  return functional?.economics.slice(0, 2) ?? []
}

export function buildLessonExecutionTableExcerpt(params: {
  readonly totalExpenses: number | null | undefined
  readonly expenseGroups: readonly GroupedChapter[]
}): readonly LessonExecutionExcerptRow[] {
  if (typeof params.totalExpenses !== 'number') {
    return []
  }

  const topChapter = params.expenseGroups[0]
  const topFunctional = pickTopFunctional(topChapter)
  const topEconomics = pickTopEconomics(topFunctional)

  const rows: LessonExecutionExcerptRow[] = [
    {
      id: 'total-expenses',
      level: 0,
      kind: 'total',
      indicator: 'TOTAL CHELTUIELI',
      amount: params.totalExpenses,
    },
  ]

  if (topChapter) {
    rows.push({
      id: `chapter-${topChapter.prefix}`,
      level: 1,
      kind: 'chapter',
      indicator: topChapter.description,
      functionalCode: topChapter.prefix,
      amount: topChapter.totalAmount,
    })
  }

  if (topFunctional) {
    rows.push({
      id: `functional-${topFunctional.code}`,
      level: 2,
      kind: 'functional',
      indicator: topFunctional.name,
      functionalCode: topFunctional.code,
      amount: topFunctional.totalAmount,
    })
  }

  for (const economic of topEconomics) {
    rows.push({
      id: `economic-${economic.code}`,
      level: 3,
      kind: 'economic',
      indicator: economic.name,
      functionalCode: topFunctional?.code,
      economicCode: economic.code,
      amount: economic.amount,
    })
  }

  return rows
}
