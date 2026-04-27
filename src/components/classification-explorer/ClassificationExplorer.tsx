import { useNavigate, useSearch } from '@tanstack/react-router'
import { useMemo, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { FileQuestion, ArrowLeft, LayoutGrid, Network } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Button } from '@/components/ui/button'
import { ClassificationSearch } from './ClassificationSearch'
import { ClassificationGrid } from './ClassificationGrid'
import { ClassificationTree } from './ClassificationTree'
import { ClassificationDetail } from './ClassificationDetail'
import { ClassificationDetailSkeleton, ClassificationPageSkeleton } from './ClassificationSkeleton'
import { useClassificationData } from './hooks/useClassificationData'
import { useClassificationHierarchy } from './hooks/useClassificationHierarchy'
import { useClassificationSearch } from './hooks/useClassificationSearch'
import { useClassificationTree, useSearchExpansion } from './hooks/useClassificationTree'
import type { ClassificationNode, ClassificationType, FlatClassification } from '@/types/classification-explorer'

type ClassificationExplorerProps = {
  readonly type: ClassificationType
  readonly selectedCode?: string
}

export function ClassificationExplorer({
  type,
  selectedCode,
}: ClassificationExplorerProps) {
  const navigate = useNavigate()

  // Get search params from URL
  const searchParams = useSearch({ strict: false }) as { q?: string; view?: 'grid' | 'tree' }
  const viewMode = searchParams.view || 'grid'
  const initialSearchTerm = searchParams.q || ''

  // Load classification data
  const { treeData, flatClassifications, isLoading } = useClassificationData(type)

  // Get hierarchy for selected code
  const hierarchy = useClassificationHierarchy(type, selectedCode)

  // Search state with URL integration
  const searchState = useClassificationSearch(type, initialSearchTerm)
  const { matchedCodesWithAncestors, debouncedSearchTerm } = searchState

  // Tree expansion state
  const expansionState = useClassificationTree()

  // Auto-expand tree for search results
  useSearchExpansion(matchedCodesWithAncestors, expansionState)

  // Update URL when search term changes (debounced)
  const updateSearchParam = useCallback((q: string) => {
    navigate({
      to: getClassificationRoute(type),
      search: (prev: Record<string, unknown>) => ({ ...prev, q: q || undefined, view: viewMode }),
      replace: true,
    })
  }, [navigate, type, viewMode])

  // Sync URL with debounced search term
  useMemo(() => {
    if (debouncedSearchTerm !== initialSearchTerm) {
      updateSearchParam(debouncedSearchTerm)
    }
  }, [debouncedSearchTerm, initialSearchTerm, updateSearchParam])

  // Handle view mode change
  const handleViewModeChange = useCallback((newView: 'grid' | 'tree') => {
    navigate({
      to: getClassificationRoute(type),
      search: (prev: Record<string, unknown>) => ({ ...prev, view: newView }),
      replace: true,
    })
  }, [navigate, type])

  // Handle type toggle
  const handleTypeChange = (newType: ClassificationType) => {
    if (newType === type) return
    navigate({
      to: getClassificationRoute(newType),
    } as Record<string, unknown>)
  }

  // Handle classification selection
  const handleSelect = (code: string) => {
    navigate({
      to: getClassificationDetailRoute(type, code),
      params: { code },
    })
  }

  // Handle back to list
  const handleBack = () => {
    navigate({
      to: getClassificationRoute(type),
    })
  }

  // Get items to display (for grid view)
  const displayItems = useMemo(() => {
    if (debouncedSearchTerm) {
      return buildMatchedItemsList(flatClassifications, matchedCodesWithAncestors, treeData)
    }
    // No search and no selection: show only chapter-level items
    return selectedCode ? [] : treeData
  }, [debouncedSearchTerm, selectedCode, treeData, flatClassifications, matchedCodesWithAncestors])

  // Filter tree nodes to only show hierarchy with matches when searching
  const filteredTreeData = useMemo(() => {
    if (!debouncedSearchTerm) return treeData
    return filterTreeByMatches(treeData, matchedCodesWithAncestors)
  }, [treeData, debouncedSearchTerm, matchedCodesWithAncestors])

  // Show detail view if we have a selected code
  const showDetailView = selectedCode && hierarchy

  // Check if classification not found
  const isNotFound = selectedCode && !hierarchy && !isLoading

  // Show loading state
  if (isLoading) {
    // If loading a specific classification, show detail skeleton
    if (selectedCode) {
      return (
        <div className="min-h-screen bg-background">
          <div className="mx-auto w-full max-w-6xl px-4 py-8">
            <ClassificationDetailSkeleton />
          </div>
        </div>
      )
    }
    // Otherwise, show the page skeleton with grid
    return <ClassificationPageSkeleton />
  }

  // Show not found state
  if (isNotFound) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-6xl px-4 py-8">
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="text-center space-y-6">
              <FileQuestion className="mx-auto h-24 w-24 text-muted-foreground/50" />
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">
                  <Trans>Classification Not Found</Trans>
                </h2>
                <p className="text-muted-foreground max-w-md">
                  <Trans>
                    The classification code "{selectedCode}" could not be found.
                  </Trans>
                </p>
              </div>
              <Button onClick={handleBack} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                <Trans>Go to Main List</Trans>
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        {/* Header with controls - only show in list view */}
        {!showDetailView && (
          <div className="mb-8 space-y-6">
            {/* Title and toggle */}
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <h1 className="text-4xl font-bold tracking-tight">
                  <Trans>Classifications</Trans>
                </h1>
                <p className="text-muted-foreground max-w-2xl">
                  <Trans>
                    Explore budget classifications to understand how public spending is organized and categorized
                  </Trans>
                </p>
              </div>
              <ToggleGroup
                type="single"
                value={type}
                onValueChange={(value) => {
                  if (value) handleTypeChange(value as ClassificationType)
                }}
                className="shrink-0"
              >
                <ToggleGroupItem value="functional" aria-label={t`Functional`} className="px-6">
                  <Trans>Functional</Trans>
                </ToggleGroupItem>
                <ToggleGroupItem value="economic" aria-label={t`Economic`} className="px-6">
                  <Trans>Economic</Trans>
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Search and View Toggle */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1">
                <ClassificationSearch
                  searchState={searchState}
                  resultsCount={viewMode === 'tree' ? filteredTreeData.length : displayItems.length}
                />
              </div>
              <ToggleGroup
                type="single"
                value={viewMode}
                onValueChange={(value) => {
                  if (value) handleViewModeChange(value as 'grid' | 'tree')
                }}
                className="shrink-0"
              >
                <ToggleGroupItem value="grid" aria-label={t`Grid view`} className="px-4">
                  <LayoutGrid className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="tree" aria-label={t`Tree view`} className="px-4">
                  <Network className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        )}

        {/* Content - either grid/tree or detail */}
        <AnimatePresence mode="wait">
          {showDetailView ? (
            <motion.div
              key="detail"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <ClassificationDetail
                type={type}
                hierarchy={hierarchy}
              />
            </motion.div>
          ) : viewMode === 'tree' ? (
            <motion.div
              key="tree"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="rounded-lg border bg-card overflow-hidden">
                <ClassificationTree
                  nodes={filteredTreeData}
                  selectedCode={selectedCode}
                  expansionState={expansionState}
                  highlightedCodes={matchedCodesWithAncestors}
                  searchTerm={debouncedSearchTerm}
                  onSelect={handleSelect}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ClassificationGrid
                items={displayItems}
                onSelect={handleSelect}
                searchTerm={debouncedSearchTerm}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the route path for a classification type
 */
function getClassificationRoute(type: ClassificationType): string {
  return type === 'functional'
    ? '/classifications/functional'
    : '/classifications/economic'
}

/**
 * Get the detail route path for a classification
 */
function getClassificationDetailRoute(type: ClassificationType, code: string): string {
  return type === 'functional'
    ? `/classifications/functional/${code}`
    : `/classifications/economic/${code}`
}

/**
 * Build a flat list of matched items from search results
 */
function buildMatchedItemsList(
  flatClassifications: readonly FlatClassification[],
  matchedCodes: Set<string>,
  treeData: readonly ClassificationNode[]
): ClassificationNode[] {
  const matchedItems: ClassificationNode[] = []
  const allNodes = flattenTree(treeData)

  flatClassifications.forEach(classification => {
    if (matchedCodes.has(classification.code)) {
      const nodeInfo = allNodes.find(n => n.code === classification.code)
      matchedItems.push({
        code: classification.code,
        name: classification.name,
        description: classification.description,
        level: nodeInfo?.level || 'chapter',
        parent: nodeInfo?.parent,
        children: [],
        hasChildren: false,
      })
    }
  })

  return matchedItems
}

/**
 * Flatten tree structure into a single array
 */
function flattenTree(nodes: readonly ClassificationNode[]): ClassificationNode[] {
  const result: ClassificationNode[] = []

  function traverse(node: ClassificationNode) {
    result.push(node)
    node.children.forEach(child => traverse(child))
  }

  nodes.forEach(node => traverse(node))
  return result
}

/**
 * Recursively filter tree to keep only nodes with matches and their ancestors
 */
function filterTreeByMatches(
  treeData: readonly ClassificationNode[],
  matchedCodes: Set<string>
): ClassificationNode[] {
  const filterNode = (node: ClassificationNode): ClassificationNode | null => {
    const nodeMatches = matchedCodes.has(node.code)

    const filteredChildren = node.children
      .map(child => filterNode(child))
      .filter((child): child is ClassificationNode => child !== null)

    if (nodeMatches || filteredChildren.length > 0) {
      return {
        ...node,
        children: filteredChildren,
        hasChildren: filteredChildren.length > 0,
      }
    }

    return null
  }

  return treeData
    .map(chapter => filterNode(chapter))
    .filter((chapter): chapter is ClassificationNode => chapter !== null)
}
