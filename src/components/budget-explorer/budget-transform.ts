import { t } from '@lingui/core/macro'
import { getClassificationName, getClassificationParent } from '@/lib/classifications'
import {
  getEconomicChapterName,
  getEconomicClassificationName,
  getEconomicSubchapterName,
  getEconomicParent,
} from '@/lib/economic-classifications'
import type { AggregatedLineItemConnection } from '@/schemas/entity-analytics'

export type AggregatedNode = AggregatedLineItemConnection['nodes'][number]

export type TreemapInput = {
  name: string
  value: number
  code: string
  isLeaf: boolean
  children: TreemapInput[]
  terminal?: boolean
}

type BuildTreemapOptions = {
    primary: 'fn' | 'ec'
    depth: 2 | 4 | 6
    drillPrefix?: string
    constraint?: { type: 'fn' | 'ec'; code: string }
}

const clean = (val?: string | null) => val?.replace(/[^0-9.]/g, '') ?? ''

type BuildTreemapV2Options = {
  data: AggregatedNode[]
  primary: 'fn' | 'ec'
  path: string[]
  constraint?: { type: 'fn' | 'ec'; code: string }
  /** When there is no path (root), use this depth for grouping. */
  rootDepth?: 2 | 4 | 6
  preserveUnclassified?: boolean
  /** Filter out specific economic codes (e.g., ec:51, 55.01 for spending) */
  excludeEcCodes?: string[]
  /** Filter out specific functional codes (e.g., fn:42, 43, 47, 36.05 for income) */
  excludeFnCodes?: string[]
}

export type ExcludedItemsSummary = {
  totalExcluded: number
  totalBeforeExclusion: number
  totalAfterExclusion: number
  items: Array<{ code: string; label: string; amount: number }>
}

export function buildTreemapDataV2({ data, primary, path, constraint, rootDepth, excludeEcCodes, excludeFnCodes, preserveUnclassified }: BuildTreemapV2Options): TreemapInput[] {
  const currentCode = path.length > 0 ? path[path.length - 1] : null
  let depth = (currentCode
    ? (String(currentCode).split('.').length + 1) * 2
    : (rootDepth ?? 2)) as 2 | 4 | 6

  // Economic codes only go 2 levels deep (chapter and subchapter), cap at depth 4
  const depthCapped = primary === 'ec' && depth > 6
  if (depthCapped) {
    depth = 6
  }

  if (depth > 6) return []

  const getGroupCode = (code: string | null | undefined) => {
    if (!code) return ''
    const cleanCode = clean(code)
    if (!cleanCode) return ''
    const parts = cleanCode.split('.')
    if (depth === 2) return parts[0] ?? ''
    if (depth === 4) return parts.slice(0, 2).join('.')
    return parts.slice(0, 3).join('.')
  }

  const getLabel = (code: string, item: AggregatedNode) => {
    if (primary === 'fn') {
      if (depth === 6) {
        // For detailed functional codes, prefer API-provided name
        if (item.fn_n && item.fn_n.trim()) return item.fn_n
      } else {
        const name = getClassificationName(code)
        if (name) return name
      }
    } else {
      if (depth === 6) {
        // For detailed economic codes, prefer API-provided name
        if (item.ec_n && item.ec_n.trim()) return item.ec_n
      } else {
        const parts = code.split('.')
        if (parts.length === 1) {
          const name = getEconomicChapterName(code)
          if (name) return name
        } else if (parts.length === 2) {
          const name = getEconomicSubchapterName(code)
          if (name) return name
        } else {
          const name = getEconomicClassificationName(code)
          if (name) return name
        }
      }
    }
    return code
  }

  const shouldExcludeEc = (ecCode: string): boolean => {
    if (!excludeEcCodes || excludeEcCodes.length === 0) return false
    return excludeEcCodes.some((excludeCode) => ecCode.startsWith(excludeCode))
  }

  const shouldExcludeFn = (fnCode: string): boolean => {
    if (!excludeFnCodes || excludeFnCodes.length === 0) return false
    return excludeFnCodes.some((excludeCode) => fnCode.startsWith(excludeCode))
  }

  const grouped = data.reduce<Record<string, TreemapInput>>((acc, item) => {
    const fnCode = clean(item.fn_c)
    const ecCode = clean(item.ec_c)

    // Exclude specific economic codes if filtering is enabled
    if (excludeEcCodes && shouldExcludeEc(ecCode)) {
      return acc
    }

    // Exclude specific functional codes if filtering is enabled
    if (excludeFnCodes && shouldExcludeFn(fnCode)) {
      return acc
    }

    // Apply cross-constraint
    if (constraint) {
      const constraintCode = clean(constraint.code)
      if (constraint.type === 'fn' && !fnCode.startsWith(constraintCode)) return acc
      if (constraint.type === 'ec' && !ecCode.startsWith(constraintCode)) return acc
    }

    const code = primary === 'fn' ? fnCode : ecCode

    // Filter by path
    if (currentCode) {
      if (!code.startsWith(clean(currentCode))) return acc
    }

    const classifiedGroup = getGroupCode(code)
    const atParent = currentCode !== null && classifiedGroup === clean(currentCode)
    // At a capped depth every record groups to the drilled code itself: the
    // tree ends there, so nothing is a posting at the parent.
    if (atParent && depthCapped) return acc
    const terminal = !classifiedGroup || atParent
    if (terminal && !preserveUnclassified) return acc

    const groupCode = classifiedGroup || 'unclassified'
    if (!acc[groupCode]) {
      acc[groupCode] = {
        name: !classifiedGroup ? t`Fără cod de clasificație` : getLabel(groupCode, item),
        value: 0,
        code: groupCode,
        // Consider groups at depth >= 4 as leaves for UI purposes
        isLeaf: terminal || depth >= 4,
        children: [],
        ...(terminal ? { terminal: true } : {}),
      }
    }

    acc[groupCode]!.value += item.amount ?? 0
    return acc
  }, {})

  return Object.values(grouped).sort((a, b) => b.value - a.value)
}

/**
 * Calculate excluded items summary for a specific layer in the treemap hierarchy.
 * This considers the current path/constraint to show layer-specific exclusions.
 *
 * @param data - All aggregated line items
 * @param excludeEcCodes - Economic codes to exclude (e.g., ['51', '55.01'])
 * @param options - Optional filtering context (path, constraint, primary, excludeFnCodes)
 */
export function calculateExcludedItems(
  data: AggregatedNode[],
  excludeEcCodes: string[],
  options?: {
    path?: string[]
    constraint?: { type: 'fn' | 'ec'; code: string }
    primary?: 'fn' | 'ec'
    excludeFnCodes?: string[]
  }
): ExcludedItemsSummary {
  const { path = [], constraint, primary, excludeFnCodes = [] } = options ?? {}
  const hasEcExclusions = excludeEcCodes && excludeEcCodes.length > 0
  const hasFnExclusions = excludeFnCodes && excludeFnCodes.length > 0

  if (!hasEcExclusions && !hasFnExclusions) {
    const total = data.reduce((sum, item) => sum + (item.amount ?? 0), 0)
    return {
      totalExcluded: 0,
      totalBeforeExclusion: total,
      totalAfterExclusion: total,
      items: [],
    }
  }

  const currentCode = path.length > 0 ? path[path.length - 1] : null

  // Filter data to match current layer (same logic as buildTreemapDataV2)
  const layerData = data.filter((item) => {
    const fnCode = clean(item.fn_c)
    const ecCode = clean(item.ec_c)

    // Apply cross-constraint
    if (constraint) {
      const constraintCode = clean(constraint.code)
      if (constraint.type === 'fn' && !fnCode.startsWith(constraintCode)) return false
      if (constraint.type === 'ec' && !ecCode.startsWith(constraintCode)) return false
    }

    // Filter by path if drilling down
    if (currentCode && primary) {
      const code = primary === 'fn' ? fnCode : ecCode
      if (!code.startsWith(clean(currentCode))) return false
    }

    return true
  })

  // Calculate total before exclusion
  const totalBeforeExclusion = layerData.reduce((sum, item) => sum + (item.amount ?? 0), 0)

  // Track excluded amounts by code (economic codes)
  const excludedByCode: Record<string, { label: string; amount: number }> = {}

  if (hasEcExclusions) {
    for (const code of excludeEcCodes) {
      excludedByCode[`ec:${code}`] = {
        label: getEconomicChapterName(code) ?? `EC ${code}`,
        amount: 0,
      }
    }
  }

  if (hasFnExclusions) {
    for (const code of excludeFnCodes) {
      excludedByCode[`fn:${code}`] = {
        label: getClassificationName(code) ?? `FN ${code}`,
        amount: 0,
      }
    }
  }

  let totalExcluded = 0
  for (const item of layerData) {
    const ecCode = clean(item.ec_c)
    const fnCode = clean(item.fn_c)
    const amount = item.amount ?? 0

    // Check economic code exclusions
    if (hasEcExclusions) {
      for (const excludeCode of excludeEcCodes) {
        if (ecCode.startsWith(excludeCode)) {
          excludedByCode[`ec:${excludeCode}`]!.amount += amount
          totalExcluded += amount
          break
        }
      }
    }

    // Check functional code exclusions
    if (hasFnExclusions) {
      for (const excludeCode of excludeFnCodes) {
        if (fnCode.startsWith(excludeCode)) {
          excludedByCode[`fn:${excludeCode}`]!.amount += amount
          totalExcluded += amount
          break
        }
      }
    }
  }

  const items = Object.entries(excludedByCode)
    .map(([code, itemData]) => ({ code, label: itemData.label, amount: itemData.amount }))
    .filter((item) => item.amount > 0)

  return {
    totalExcluded,
    totalBeforeExclusion,
    totalAfterExclusion: totalBeforeExclusion - totalExcluded,
    items,
  }
}

export const getParentCode = (primary: 'fn' | 'ec', code: string | null): string | null => {
  if (!code) return null
  const cleaned = clean(code)
  if (primary === 'fn') {
    return getClassificationParent(cleaned)
  }
  return getEconomicParent(cleaned)
}


const byPrefix = (code: string | null | undefined, depth: 2 | 4 | 6) => {
  if (!code) return ''
  const clear = clean(code)
  if (!clear) return ''
  if (depth === 2) return clear.split('.')[0] ?? ''
  const parts = clear.split('.')
  if (depth === 4) return parts.slice(0, 2).join('.')
  return parts.slice(0, 3).join('.')
}

export function buildTreemapData(
  aggregated: AggregatedNode[],
  { primary, depth, drillPrefix, constraint }: BuildTreemapOptions,
): TreemapInput[] {
  const grouped = aggregated.reduce<Record<string, TreemapInput>>((acc, item) => {
    const fnCode = item.fn_c
    const ecCode = item.ec_c

    // Apply cross-constraint if present
    if (constraint?.type === 'fn') {
      if (!clean(fnCode).startsWith(clean(constraint.code))) return acc
    } else if (constraint?.type === 'ec') {
      if (!clean(ecCode).startsWith(clean(constraint.code))) return acc
    }

    const code = primary === 'fn' ? fnCode : ecCode
    const name = primary === 'fn' ? item.fn_n : item.ec_n

    const groupCode = byPrefix(code, depth)
    if (!groupCode) return acc

    if (drillPrefix && !clean(code).startsWith(clean(drillPrefix))) return acc

    if (!acc[groupCode]) {
      // Initial label; will be refined below based on primary/depth
      let label = name ?? groupCode

      if (primary === 'fn' && depth === 2) {
        const chapterName = getClassificationName(groupCode)
        if (chapterName) label = chapterName
      }

      if (primary === 'ec') {
        if (depth === 2) {
          const econChapter = getEconomicChapterName(groupCode)
          if (econChapter) label = econChapter
        } else if (depth === 4) {
          const econSub = getEconomicSubchapterName(groupCode)
          if (econSub) label = econSub
        } else if (depth === 6) {
          const econFull = getEconomicClassificationName(groupCode)
          if (econFull) label = econFull
        }
      }

      acc[groupCode] = {
        name: label,
        value: 0,
        code: groupCode,
        isLeaf: depth >= 4,
        children: [],
      }
    }
    acc[groupCode]!.value += item.amount ?? 0
    return acc
  }, {})

  const result = Object.values(grouped)

  // Already handled labels inline; just sort and return
  return result.sort((a, b) => b.value - a.value)
}

export type GroupedItem = {
    code: string
    name: string
    total: number
    count: number
}

export const groupData = (aggregated: AggregatedNode[], primary: 'fn' | 'ec', depth: 2 | 4 | 6) => {
  const grouped = aggregated.reduce<Record<string, GroupedItem>>((acc, item) => {
    const code = primary === 'fn' ? item.fn_c : item.ec_c
    const name = primary === 'fn' ? item.fn_n : item.ec_n
    const groupCode = byPrefix(code, depth)
    if (!groupCode) return acc

    if (!acc[groupCode]) {
      acc[groupCode] = {
        code: groupCode,
        name: name ?? groupCode,
        total: 0,
        count: 0,
      }
    }
    acc[groupCode].total += item.amount ?? 0
    acc[groupCode].count += item.count ?? 0
    return acc
  }, {})

  const all = Object.values(grouped)
  const baseTotal = all.reduce((s, it) => s + it.total, 0)
  const result = all.sort((a, b) => b.total - a.total).slice(0, 7)

  if (primary === 'fn' && depth === 2) {
    for (const item of result) {
      const chapterName = getClassificationName(item.code)
      if (chapterName) item.name = chapterName
    }
  } else if (primary === 'ec') {
    for (const item of result) {
      if (depth === 2) {
        const econChapter = getEconomicChapterName(item.code)
        if (econChapter) item.name = econChapter
      } else if (depth === 4) {
        const econSub = getEconomicSubchapterName(item.code)
        if (econSub) item.name = econSub
      } else if (depth === 6) {
        const econFull = getEconomicClassificationName(item.code)
        if (econFull) item.name = econFull
      }
    }
  }

  return { items: result, baseTotal }
}


