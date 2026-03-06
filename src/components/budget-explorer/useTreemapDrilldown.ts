import { useCallback, useMemo, useState, useEffect } from 'react'
import { buildTreemapDataV2, calculateExcludedItems, type AggregatedNode } from './budget-transform'
import { getClassificationName } from '@/lib/classifications'
import { getEconomicChapterName, getEconomicClassificationName, getEconomicSubchapterName } from '@/lib/economic-classifications'

export type Breadcrumb = { code: string; label: string; type: 'fn' | 'ec' }

const normalizeCode = (code: string | null | undefined): string => (code ?? '').replace(/[^0-9.]/g, '')
const hasPrefix = (code: string, prefixes: string[]): boolean => prefixes.some((prefix) => code.startsWith(prefix))

function buildPathLabel(primary: 'fn' | 'ec', code: string): string {
  const normalized = normalizeCode(code)
  if (!normalized) return ''
  if (primary === 'fn') {
    const fnName = getClassificationName(normalized)
    if (fnName) return fnName
    return `FN ${normalized}`
  }
  const parts = normalized.split('.')
  if (parts.length === 1) {
    const ec = getEconomicChapterName(normalized)
    if (ec) return ec
  } else if (parts.length === 2) {
    const ec = getEconomicSubchapterName(normalized)
    if (ec) return ec
  } else {
    const ec = getEconomicClassificationName(normalized)
    if (ec) return ec
  }
  return `EC ${normalized}`
}

function resolveBreadcrumbLabel(primary: 'fn' | 'ec', code: string, nodes: AggregatedNode[]): string {
  const normalized = normalizeCode(code)
  const depth = normalized.split('.').length
  // For 6-digit codes (depth >= 3), prefer API-provided names over classification lookups
  if (depth >= 3) {
    const match = nodes.find((n) => normalizeCode(primary === 'fn' ? n.fn_c : n.ec_c) === normalized)
    const apiName = primary === 'fn' ? match?.fn_n : match?.ec_n
    if (apiName && apiName.trim()) return apiName
  }
  return buildPathLabel(primary, code)
}

/**
 * Hook for managing treemap drilldown with cross-primary pivoting.
 *
 * Drilldown Flow:
 * 1. Start with a primary dimension (fn or ec)
 * 2. Drill through hierarchy: 2-digit → 4-digit → 6-digit codes
 * 3. At 6-digit, pivot to opposite primary (constrained by the 6-digit code)
 * 4. Drill through opposite primary: 2-digit → 4-digit → 6-digit
 * 5. Stop after reaching 2 six-digit codes (one per primary)
 *
 * State Management:
 * - `primary`: User-selected primary from UI toggle
 * - `drillPrimary`: Currently active primary during drill (may differ due to pivot)
 * - `path`: Array of codes representing current drill depth
 * - `breadcrumbs`: Full navigation trail shown to user
 * - `crossConstraint`: When set, constrains opposite primary to subset of data
 *
 * @param nodes - Budget line items to visualize
 * @param initialPrimary - Starting primary dimension ('fn' or 'ec')
 * @param rootDepth - Depth to use at root level (2, 4, or 6 digits)
 * @param excludeEcCodes - Economic codes to exclude from visualization (e.g., ['51', '55.01'])
 * @param onPrimaryChange - Optional callback when primary changes (for URL persistence)
 */
export function useTreemapDrilldown({
  nodes,
  initialPrimary = 'fn',
  initialPath = [],
  rootDepth = 2,
  excludeEcCodes = [],
  excludeFnCodes = [],
  onPrimaryChange,
  onPathChange,
}: {
  nodes: AggregatedNode[]
  initialPrimary?: 'fn' | 'ec'
  initialPath?: string[]
  rootDepth?: 2 | 4 | 6
  excludeEcCodes?: string[]
  excludeFnCodes?: string[]
  onPrimaryChange?: (primary: 'fn' | 'ec') => void
  onPathChange?: (path: string[]) => void
}) {
  // UI-selected primary (from toggle)
  const [primary, setPrimary] = useState<'fn' | 'ec'>(initialPrimary)
  // Full breadcrumb path as source-of-truth (codes in click order)
  const normalizedInitialPath = useMemo(
    () => initialPath.map((code) => normalizeCode(code)).filter(Boolean),
    [initialPath],
  )
  const [fullPath, setFullPath] = useState<string[]>(normalizedInitialPath)

  // Sync primary when controlled above
  useEffect(() => {
    if (primary !== initialPrimary) {
      setPrimary(initialPrimary)
    }
  }, [initialPrimary, primary])

  // Sync path when controlled above (supports URL restore/back-forward)
  useEffect(() => {
    const isSamePath =
      fullPath.length === normalizedInitialPath.length &&
      fullPath.every((code, index) => code === normalizedInitialPath[index])

    if (!isSamePath) {
      setFullPath(normalizedInitialPath)
    }
  }, [fullPath, normalizedInitialPath])

  // Compute pivot index: first 6-digit code in the path
  const pivotIndex = useMemo(() => fullPath.findIndex((c) => c.split('.').length >= 3), [fullPath])

  const activePrimary = useMemo<'fn' | 'ec'>(
    () => (pivotIndex >= 0 ? (primary === 'fn' ? 'ec' : 'fn') : primary),
    [primary, pivotIndex]
  )

  const currentPath = useMemo(() => (pivotIndex >= 0 ? fullPath.slice(pivotIndex + 1) : fullPath), [fullPath, pivotIndex])

  const constraint = useMemo(() => (pivotIndex >= 0 ? ({ type: primary, code: fullPath[pivotIndex] }) as const : undefined), [pivotIndex, primary, fullPath])

  const effectiveRootDepth = useMemo(() => (pivotIndex >= 0 ? 2 : rootDepth), [pivotIndex, rootDepth])
  const normalizedExcludeEcCodes = useMemo(
    () => (excludeEcCodes ?? []).map((code) => normalizeCode(code)).filter(Boolean),
    [excludeEcCodes]
  )
  const normalizedExcludeFnCodes = useMemo(
    () => (excludeFnCodes ?? []).map((code) => normalizeCode(code)).filter(Boolean),
    [excludeFnCodes]
  )

  const treemapData = useMemo(() => {
    return buildTreemapDataV2({
      data: nodes ?? [],
      primary: activePrimary,
      path: currentPath,
      constraint,
      rootDepth: effectiveRootDepth,
      excludeEcCodes,
      excludeFnCodes,
    })
  }, [nodes, activePrimary, currentPath, constraint, effectiveRootDepth, excludeEcCodes, excludeFnCodes])

  const excludedItemsSummary = useMemo(() => {
    const hasEcExclusions = excludeEcCodes && excludeEcCodes.length > 0
    const hasFnExclusions = excludeFnCodes && excludeFnCodes.length > 0
    if (!hasEcExclusions && !hasFnExclusions) return undefined
    return calculateExcludedItems(nodes ?? [], excludeEcCodes, {
      path: currentPath,
      constraint,
      primary: activePrimary,
      excludeFnCodes,
    })
  }, [nodes, excludeEcCodes, excludeFnCodes, currentPath, constraint, activePrimary])

  const breadcrumbs: Breadcrumb[] = useMemo(() => {
    const items: Breadcrumb[] = []
    const opposite = primary === 'fn' ? 'ec' : 'fn'
    fullPath.forEach((code, index) => {
      const type = pivotIndex >= 0 && index > pivotIndex ? opposite : primary
      const label = resolveBreadcrumbLabel(type, code, nodes ?? [])
      items.push({ code, label, type })
    })
    return items
  }, [fullPath, primary, pivotIndex, nodes])

  // Helper: evaluate rendering context for an arbitrary full path
  const evaluateForPath = useCallback((fp: string[]) => {
    const idx = fp.findIndex((c) => c.split('.').length >= 3)
    const nextActive: 'fn' | 'ec' = idx >= 0 ? (primary === 'fn' ? 'ec' : 'fn') : primary
    const nextConstraint = idx >= 0 ? ({ type: primary, code: fp[idx]! }) as const : undefined
    const nextPath = idx >= 0 ? fp.slice(idx + 1) : fp
    const nextRootDepth: 2 | 4 | 6 = (idx >= 0 ? 2 : rootDepth)
    return { nextActive, nextConstraint, nextPath, nextRootDepth }
  }, [primary, rootDepth])

  // Helper: check if advancing to a given full path yields any data
  const canAdvanceToPath = useCallback((fp: string[]): boolean => {
    const { nextActive, nextConstraint, nextPath, nextRootDepth } = evaluateForPath(fp)
    const currentCode = nextPath.length > 0 ? normalizeCode(nextPath[nextPath.length - 1]) : ''
    let depth = (currentCode ? (currentCode.split('.').length + 1) * 2 : nextRootDepth) as 2 | 4 | 6 | 8

    // Mirror buildTreemapDataV2 behavior for economic classifications.
    if (nextActive === 'ec' && depth > 6) {
      depth = 6
    }
    if (depth > 6) return false

    const normalizedConstraintCode = nextConstraint ? normalizeCode(nextConstraint.code) : ''

    for (const item of nodes ?? []) {
      const fnCode = normalizeCode(item.fn_c)
      const ecCode = normalizeCode(item.ec_c)

      if (normalizedExcludeEcCodes.length > 0 && hasPrefix(ecCode, normalizedExcludeEcCodes)) {
        continue
      }
      if (normalizedExcludeFnCodes.length > 0 && hasPrefix(fnCode, normalizedExcludeFnCodes)) {
        continue
      }

      if (nextConstraint) {
        if (nextConstraint.type === 'fn' && !fnCode.startsWith(normalizedConstraintCode)) {
          continue
        }
        if (nextConstraint.type === 'ec' && !ecCode.startsWith(normalizedConstraintCode)) {
          continue
        }
      }

      const activeCode = nextActive === 'fn' ? fnCode : ecCode
      if (!activeCode) continue
      if (currentCode && !activeCode.startsWith(currentCode)) continue

      const codeParts = activeCode.split('.')
      const groupCode = depth === 2
        ? (codeParts[0] ?? '')
        : depth === 4
          ? codeParts.slice(0, 2).join('.')
          : codeParts.slice(0, 3).join('.')

      if (!groupCode) continue
      if (currentCode && groupCode === currentCode) continue

      return true
    }

    return false
  }, [evaluateForPath, nodes, normalizedExcludeEcCodes, normalizedExcludeFnCodes])

  const onNodeClick = useCallback(
    (code: string | null) => {
      if (!code) {
        setFullPath([])
        onPathChange?.([])
        return
      }
      const normalized = normalizeCode(code)
      if (!normalized) return
      if (fullPath[fullPath.length - 1] === normalized) return
      const nextFullPath = [...fullPath, normalized]
      if (!canAdvanceToPath(nextFullPath)) return
      setFullPath(nextFullPath)
      onPathChange?.(nextFullPath)
    },
    [fullPath, onPathChange, canAdvanceToPath]
  )

  const onBreadcrumbClick = useCallback(
    (code: string | null, index?: number) => {
      if (!code) {
        setFullPath([])
        onPathChange?.([])
        return
      }
      const normalized = normalizeCode(code)
      const clickedIndex = typeof index === 'number' ? index : fullPath.findIndex((c) => c === normalized)
      if (clickedIndex < 0) return
      const nextFullPath = fullPath.slice(0, clickedIndex + 1)
      if (!canAdvanceToPath(nextFullPath)) return
      setFullPath(nextFullPath)
      onPathChange?.(nextFullPath)
    },
    [fullPath, onPathChange, canAdvanceToPath]
  )

  const handleSetPrimary = useCallback((value: 'fn' | 'ec') => {
    setPrimary(value)
    setFullPath([])
    onPrimaryChange?.(value)
    onPathChange?.([])
  }, [onPrimaryChange, onPathChange])

  const setPath = useCallback((path: string[]) => {
    const normalizedPath = path.map((code) => normalizeCode(code)).filter(Boolean)
    setFullPath(normalizedPath)
    onPathChange?.(normalizedPath)
  }, [onPathChange])

  const reset = useCallback(() => {
    setFullPath([])
    onPathChange?.([])
  }, [onPathChange])

  return {
    primary,
    activePrimary,
    setPrimary: handleSetPrimary,
    breadcrumbs,
    treemapData,
    excludedItemsSummary,
    onNodeClick,
    onBreadcrumbClick,
    setPath,
    reset,
  }
}
