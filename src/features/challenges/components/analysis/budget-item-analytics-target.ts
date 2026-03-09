export type BudgetItemAnalyticsPathEntry = {
  type: 'fn' | 'ec'
  code: string
}

export type BudgetItemAnalyticsSelection = {
  functionalCode?: string
  economicCode?: string
}

export type BudgetItemAnalyticsTarget = {
  subjectLabel?: string
  path: BudgetItemAnalyticsPathEntry[]
}

export type BudgetItemAnalyticsRequest = BudgetItemAnalyticsTarget

const BUDGET_ITEM_ANALYTICS_PATH_TYPES = ['fn', 'ec'] as const

function getBudgetItemAnalyticsCodeDepth(code: string) {
  return code.split('.').length
}

function shouldReplaceBudgetItemAnalyticsCode(
  currentCode: string | undefined,
  nextCode: string,
) {
  if (!currentCode) {
    return true
  }

  return (
    getBudgetItemAnalyticsCodeDepth(nextCode) >=
    getBudgetItemAnalyticsCodeDepth(currentCode)
  )
}

export function normalizeBudgetItemAnalyticsCode(
  code: string | undefined,
): string | undefined {
  const normalizedCode = code
    ?.replace(/[^0-9.]/g, '')
    .replace(/(\.00)+$/, '')
    .trim()

  return normalizedCode ? normalizedCode : undefined
}

export function normalizeBudgetItemAnalyticsPath(
  path: readonly BudgetItemAnalyticsPathEntry[] | undefined,
): BudgetItemAnalyticsPathEntry[] {
  if (!path || path.length === 0) {
    return []
  }

  const pathOrder: Array<BudgetItemAnalyticsPathEntry['type']> = []
  const deepestCodeByType = new Map<
    BudgetItemAnalyticsPathEntry['type'],
    string
  >()

  for (const pathEntry of path) {
    if (!BUDGET_ITEM_ANALYTICS_PATH_TYPES.includes(pathEntry.type)) {
      continue
    }

    const normalizedCode = normalizeBudgetItemAnalyticsCode(pathEntry.code)
    if (!normalizedCode) {
      continue
    }

    if (!pathOrder.includes(pathEntry.type)) {
      pathOrder.push(pathEntry.type)
    }

    const currentCode = deepestCodeByType.get(pathEntry.type)
    if (shouldReplaceBudgetItemAnalyticsCode(currentCode, normalizedCode)) {
      deepestCodeByType.set(pathEntry.type, normalizedCode)
    }
  }

  return pathOrder
    .map((type) => {
      const code = deepestCodeByType.get(type)

      if (!code) {
        return null
      }

      return { type, code }
    })
    .filter((pathEntry): pathEntry is BudgetItemAnalyticsPathEntry =>
      Boolean(pathEntry),
    )
}

export function normalizeBudgetItemAnalyticsTarget(
  target: Partial<BudgetItemAnalyticsTarget> | null | undefined,
): BudgetItemAnalyticsTarget | undefined {
  if (!target) {
    return undefined
  }

  if (!Array.isArray(target.path)) {
    return undefined
  }

  const rawPath = target.path
  const path = normalizeBudgetItemAnalyticsPath(rawPath)

  if (rawPath.length > 0 && path.length === 0) {
    return undefined
  }

  const subjectLabel =
    typeof target.subjectLabel === 'string' && target.subjectLabel.trim()
      ? target.subjectLabel.trim()
      : undefined

  return {
    ...(subjectLabel ? { subjectLabel } : {}),
    path,
  }
}

export function buildBudgetItemAnalyticsPath(
  selection: Readonly<BudgetItemAnalyticsSelection>,
  preferredOrder: readonly BudgetItemAnalyticsPathEntry['type'][] = [
    'fn',
    'ec',
  ],
): BudgetItemAnalyticsPathEntry[] {
  const normalizedFunctionalCode = normalizeBudgetItemAnalyticsCode(
    selection.functionalCode,
  )
  const normalizedEconomicCode = normalizeBudgetItemAnalyticsCode(
    selection.economicCode,
  )
  const path: BudgetItemAnalyticsPathEntry[] = []

  for (const type of preferredOrder) {
    if (type === 'fn' && normalizedFunctionalCode) {
      path.push({ type, code: normalizedFunctionalCode })
    }

    if (type === 'ec' && normalizedEconomicCode) {
      path.push({ type, code: normalizedEconomicCode })
    }
  }

  return normalizeBudgetItemAnalyticsPath(path)
}

export function getBudgetItemAnalyticsSelection(
  path: readonly BudgetItemAnalyticsPathEntry[] | undefined,
): BudgetItemAnalyticsSelection {
  const selection: BudgetItemAnalyticsSelection = {}

  for (const pathEntry of normalizeBudgetItemAnalyticsPath(path)) {
    if (pathEntry.type === 'fn') {
      selection.functionalCode = pathEntry.code
      continue
    }

    selection.economicCode = pathEntry.code
  }

  return selection
}
