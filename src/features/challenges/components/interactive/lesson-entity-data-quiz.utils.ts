import { shuffleArray } from '@/lib/utils'
import type { GroupedChapter } from '@/schemas/financial'

export type EntityDataQuizOption = {
  readonly id: string
  readonly text: string
  readonly isCorrect: boolean
}

export function buildEntityDataQuizOptions(params: {
  readonly groups: readonly GroupedChapter[]
  readonly seed?: number
}): EntityDataQuizOption[] {
  const { groups, seed } = params

  if (groups.length === 0) {
    return []
  }

  if (groups.length === 1) {
    return shuffleArray(
      [
        { id: `group-${groups[0].prefix}`, text: groups[0].description, isCorrect: true },
        { id: 'distractor-other', text: 'Alte categorii', isCorrect: false },
      ],
      seed,
    )
  }

  const top = groups.slice(0, Math.min(4, groups.length))
  const options: EntityDataQuizOption[] = top.map((group, index) => ({
    id: `group-${group.prefix}`,
    text: group.description,
    isCorrect: index === 0,
  }))

  return shuffleArray(options, seed)
}

type SubItemLike = {
  readonly code: string
  readonly name: string
  readonly totalAmount: number
}

export function buildSubItemQuizOptions(params: {
  readonly items: readonly SubItemLike[]
  readonly seed?: number
}): EntityDataQuizOption[] {
  const { items, seed } = params

  if (items.length === 0) {
    return []
  }

  if (items.length === 1) {
    return shuffleArray(
      [
        { id: `sub-${items[0].code}`, text: items[0].name, isCorrect: true },
        { id: 'distractor-other', text: 'Alte categorii', isCorrect: false },
      ],
      seed,
    )
  }

  const top = items.slice(0, Math.min(4, items.length))
  const options: EntityDataQuizOption[] = top.map((item, index) => ({
    id: `sub-${item.code}`,
    text: item.name,
    isCorrect: index === 0,
  }))

  return shuffleArray(options, seed)
}
