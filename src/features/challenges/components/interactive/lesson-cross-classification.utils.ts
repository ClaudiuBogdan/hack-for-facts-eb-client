import type { GroupedChapter } from '@/schemas/financial'

export type CrossBreakdownEntry = {
  readonly code: string
  readonly label: string
  readonly amount: number
  readonly shareOfChapter: number
}

export type CrossChapterEntry = {
  readonly code: string
  readonly label: string
  readonly totalAmount: number
  readonly breakdowns: readonly CrossBreakdownEntry[]
}

export type CrossClassificationData = {
  readonly fnToEc: readonly CrossChapterEntry[]
  readonly ecToFn: readonly CrossChapterEntry[]
}

/**
 * For each of the top functional chapters, aggregate spending by 2-digit economic prefix.
 */
function buildFnToEc(
  expenseGroups: readonly GroupedChapter[],
  topN: number,
  breakdownN: number,
): readonly CrossChapterEntry[] {
  return expenseGroups.slice(0, topN).map((chapter) => {
    const ecAgg = new Map<string, number>()

    for (const func of chapter.functionals) {
      for (const eco of func.economics) {
        const prefix = eco.code.slice(0, 2)
        ecAgg.set(prefix, (ecAgg.get(prefix) ?? 0) + eco.amount)
      }
    }

    const sorted = [...ecAgg.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, breakdownN)

    const breakdowns: CrossBreakdownEntry[] = sorted.map(([code, amount]) => ({
      code,
      label: code,
      amount,
      shareOfChapter: chapter.totalAmount > 0
        ? (amount / chapter.totalAmount) * 100
        : 0,
    }))

    return {
      code: chapter.prefix,
      label: chapter.description,
      totalAmount: chapter.totalAmount,
      breakdowns,
    }
  })
}

/**
 * For each of the top economic chapters, aggregate spending by 2-digit functional prefix.
 */
function buildEcToFn(
  economicGroups: readonly GroupedChapter[],
  topN: number,
  breakdownN: number,
): readonly CrossChapterEntry[] {
  return economicGroups.slice(0, topN).map((chapter) => {
    const fnAgg = new Map<string, number>()

    // Functionals directly under the chapter
    for (const func of chapter.functionals) {
      const prefix = func.code.slice(0, 2)
      fnAgg.set(prefix, (fnAgg.get(prefix) ?? 0) + func.totalAmount)
    }

    // Functionals nested inside subchapters
    if (chapter.subchapters) {
      for (const sub of chapter.subchapters) {
        for (const func of sub.functionals) {
          const prefix = func.code.slice(0, 2)
          fnAgg.set(prefix, (fnAgg.get(prefix) ?? 0) + func.totalAmount)
        }
      }
    }

    const sorted = [...fnAgg.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, breakdownN)

    const breakdowns: CrossBreakdownEntry[] = sorted.map(([code, amount]) => ({
      code,
      label: code,
      amount,
      shareOfChapter: chapter.totalAmount > 0
        ? (amount / chapter.totalAmount) * 100
        : 0,
    }))

    return {
      code: chapter.prefix,
      label: chapter.description,
      totalAmount: chapter.totalAmount,
      breakdowns,
    }
  })
}

export function buildCrossClassificationView(params: {
  readonly expenseGroups: readonly GroupedChapter[]
  readonly economicGroups: readonly GroupedChapter[]
}): CrossClassificationData {
  return {
    fnToEc: buildFnToEc(params.expenseGroups, 2, 2),
    ecToFn: buildEcToFn(params.economicGroups, 2, 2),
  }
}
