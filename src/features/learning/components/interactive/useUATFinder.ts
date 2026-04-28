import { useState, useCallback, useEffect, useId, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue'
import { usePersistedState } from '@/lib/hooks/usePersistedState'
import { searchEntities } from '@/lib/api/entities'
import { fetchEntityAnalytics } from '@/lib/api/entity-analytics'
import type { EntitySearchNode } from '@/schemas/entities'
import type { UATSearchResult, UATDetailResult, UATType } from './uat-finder-data'
import { getUATType } from './uat-finder-data'
import { defaultYearRange } from '@/schemas/charts'

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface UseUATFinderProps {
  readonly debounceMs?: number
  readonly onSelect?: (uat: UATDetailResult) => void
  /** Storage key suffix for persistence (allows multiple instances) */
  readonly storageKey?: string
}

interface UseUATFinderReturn {
  // Search state
  readonly searchTerm: string
  readonly setSearchTerm: (term: string) => void
  readonly debouncedSearchTerm: string
  readonly searchResults: readonly UATSearchResult[]
  readonly isSearching: boolean
  readonly isDropdownOpen: boolean
  readonly activeIndex: number

  // Selection & details
  readonly selectedUAT: UATDetailResult | null
  readonly selectUAT: (cui: string) => void
  readonly clearSelection: () => void
  readonly isLoadingDetails: boolean
  readonly dataYear: string

  // Recent searches
  readonly recentUATs: readonly UATSearchResult[]

  // Handlers
  readonly handleKeyDown: (e: React.KeyboardEvent) => void
  readonly clearSearch: () => void
  readonly openDropdown: () => void
  readonly closeDropdown: () => void

  // IDs for accessibility
  readonly searchId: string
}

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

const MAX_RECENT_UATS = 5
const SEARCH_LIMIT = 15

// ═══════════════════════════════════════════════════════════════════════════
// Hook Implementation
// ═══════════════════════════════════════════════════════════════════════════

export function useUATFinder({
  debounceMs = 300,
  onSelect,
  storageKey = 'default',
}: UseUATFinderProps = {}): UseUATFinderReturn {
  // Search state
  const [searchTerm, setSearchTerm] = useState('')
  const [isDropdownOpen, setDropdownOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  // Selection state - persisted to localStorage
  const [selectedCui, setSelectedCui] = usePersistedState<string | null>(
    `uat-finder-selected-${storageKey}`,
    null
  )

  // Recent searches - persisted to localStorage
  const [recentUATs, setRecentUATs] = usePersistedState<UATSearchResult[]>(
    `uat-finder-recent-${storageKey}`,
    []
  )

  // Debounce search term
  const debouncedSearchTerm = useDebouncedValue(searchTerm, debounceMs)

  // Generate SSR-stable ID for accessibility
  const reactId = useId()
  const searchId = useMemo(
    () => `uat-finder-${reactId.replace(/:/g, '')}`,
    [reactId]
  )

  // ─────────────────────────────────────────────────────────────────────────
  // Search Query
  // ─────────────────────────────────────────────────────────────────────────

  const {
    data: rawSearchResults = [],
    isLoading: isSearching,
  } = useQuery<EntitySearchNode[], Error>({
    queryKey: ['uatSearch', debouncedSearchTerm],
    queryFn: () => searchEntities(debouncedSearchTerm, SEARCH_LIMIT),
    enabled: debouncedSearchTerm.trim().length >= 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Filter and transform search results to UAT results
  const searchResults = useMemo<UATSearchResult[]>(() => {
    return rawSearchResults.map((entity): UATSearchResult => ({
      cui: entity.cui,
      name: entity.name,
      type: 'municipality' as UATType, // Default, will be updated when selected
      countyCode: null,
      countyName: entity.uat?.county_name ?? null,
    }))
  }, [rawSearchResults])

  // ─────────────────────────────────────────────────────────────────────────
  // Detail Query (when UAT is selected)
  // ─────────────────────────────────────────────────────────────────────────

  const defaultYear = defaultYearRange.end
  const lastCompleteYear = String(defaultYear - 1)

  const {
    data: analyticsData,
    isLoading: isLoadingDetails,
  } = useQuery({
    queryKey: ['uatDetails', selectedCui, lastCompleteYear],
    queryFn: () => fetchEntityAnalytics({
      filter: {
        entity_cuis: selectedCui ? [selectedCui] : [],
        report_period: {
          type: 'YEAR',
          selection: { interval: { start: lastCompleteYear, end: lastCompleteYear } },
        },
        account_category: 'ch', // Expenses for budget comparison
      },
      limit: 1,
    }),
    enabled: !!selectedCui,
    staleTime: 1000 * 60 * 10, // 10 minutes
  })

  // Build selected UAT detail
  const selectedUAT = useMemo<UATDetailResult | null>(() => {
    if (!selectedCui || !analyticsData?.nodes?.[0]) return null

    const data = analyticsData.nodes[0]
    const uatType = getUATType(data.entity_type)

    return {
      cui: data.entity_cui,
      name: data.entity_name,
      type: uatType ?? 'municipality',
      countyCode: data.county_code ?? null,
      countyName: data.county_name ?? null,
      population: data.population ?? null,
      totalBudget: data.total_amount ?? null,
      perCapita: data.per_capita_amount ?? null,
    }
  }, [selectedCui, analyticsData])

  // ─────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────

  const openDropdown = useCallback(() => setDropdownOpen(true), [])
  const closeDropdown = useCallback(() => {
    setDropdownOpen(false)
    setActiveIndex(-1)
  }, [])

  const clearSearch = useCallback(() => {
    setSearchTerm('')
    setActiveIndex(-1)
    closeDropdown()
  }, [closeDropdown])

  const clearSelection = useCallback(() => {
    setSelectedCui(null)
  }, [setSelectedCui])

  const selectUAT = useCallback((cui: string) => {
    setSelectedCui(cui)
    closeDropdown()
    clearSearch()

    // Find the result to add to recents
    const result = searchResults.find(r => r.cui === cui)
    if (result) {
      setRecentUATs(prev => {
        const filtered = prev.filter(r => r.cui !== cui)
        return [result, ...filtered].slice(0, MAX_RECENT_UATS)
      })
    }
  }, [searchResults, closeDropdown, clearSearch, setSelectedCui, setRecentUATs])

  // Call onSelect when selectedUAT is available
  useEffect(() => {
    if (selectedUAT && onSelect) {
      onSelect(selectedUAT)
    }
  }, [selectedUAT, onSelect])

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(-1)
  }, [searchResults])

  // ─────────────────────────────────────────────────────────────────────────
  // Keyboard Navigation
  // ─────────────────────────────────────────────────────────────────────────

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isDropdownOpen || searchResults.length === 0) {
      if (e.key === 'ArrowDown' && searchResults.length > 0) {
        e.preventDefault()
        openDropdown()
        setActiveIndex(0)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex(prev => (prev + 1) % searchResults.length)
        break

      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex(prev => (prev - 1 + searchResults.length) % searchResults.length)
        break

      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0 && searchResults[activeIndex]) {
          selectUAT(searchResults[activeIndex].cui)
        } else if (searchResults.length > 0) {
          selectUAT(searchResults[0].cui)
        }
        break

      case 'Escape':
        e.preventDefault()
        if (selectedCui) {
          clearSelection()
        } else {
          clearSearch()
        }
        break

      case 'Tab':
        closeDropdown()
        break
    }
  }, [
    isDropdownOpen,
    searchResults,
    activeIndex,
    selectedCui,
    openDropdown,
    selectUAT,
    clearSelection,
    clearSearch,
    closeDropdown,
  ])

  return {
    // Search state
    searchTerm,
    setSearchTerm,
    debouncedSearchTerm,
    searchResults,
    isSearching,
    isDropdownOpen,
    activeIndex,

    // Selection
    selectedUAT,
    selectUAT,
    clearSelection,
    isLoadingDetails,
    dataYear: lastCompleteYear,

    // Recent
    recentUATs,

    // Handlers
    handleKeyDown,
    clearSearch,
    openDropdown,
    closeDropdown,

    // IDs
    searchId,
  }
}
