import { useState, useCallback, useEffect } from 'react'
import type { TreeExpansionState } from '@/types/classification-explorer'

/**
 * Hook to manage tree expansion state
 * Handles expanding/collapsing nodes and auto-expanding for search results
 */
export function useClassificationTree(
  initialExpanded: readonly string[] = []
): TreeExpansionState {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    new Set(initialExpanded)
  )

  const toggleNode = useCallback((code: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(code)) {
        next.delete(code)
      } else {
        next.add(code)
      }
      return next
    })
  }, [])

  const expandNode = useCallback((code: string) => {
    setExpandedNodes((prev) => {
      if (prev.has(code)) return prev
      const next = new Set(prev)
      next.add(code)
      return next
    })
  }, [])

  const collapseNode = useCallback((code: string) => {
    setExpandedNodes((prev) => {
      if (!prev.has(code)) return prev
      const next = new Set(prev)
      next.delete(code)
      return next
    })
  }, [])

  const expandPath = useCallback((codes: readonly string[]) => {
    setExpandedNodes((prev) => {
      // Check if any codes are actually new
      const hasNewCodes = codes.some(code => !prev.has(code))
      if (!hasNewCodes) return prev

      const next = new Set(prev)
      for (const code of codes) {
        next.add(code)
      }
      return next
    })
  }, [])

  const collapseAll = useCallback(() => {
    setExpandedNodes(new Set())
  }, [])

  return {
    expandedNodes,
    toggleNode,
    expandNode,
    collapseNode,
    expandPath,
    collapseAll,
  }
}

/**
 * Hook to sync tree expansion with search results
 * Auto-expands tree to show search matches
 */
export function useSearchExpansion(
  matchedCodes: Set<string>,
  expansionState: TreeExpansionState
) {
  const { expandPath } = expansionState

  useEffect(() => {
    if (matchedCodes.size > 0) {
      // Expand all matched codes (which include ancestors)
      expandPath(Array.from(matchedCodes))
    }
  }, [matchedCodes, expandPath])
}
