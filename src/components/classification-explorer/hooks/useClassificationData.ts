import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type {
  ClassificationType,
  FlatClassification,
} from '@/types/classification-explorer'
import {
  getAllClassifications,
  buildClassificationTree,
} from '@/lib/classification-explorer-utils'
import { getAllFunctionalClassifications, getAllEconomicClassifications } from '@/lib/api/labels'

/**
 * Hook to get classification data (both flat and tree structure)
 * Merges static JSON data with API data
 */
export function useClassificationData(type: ClassificationType) {
  // Fetch classifications from API
  const { data: apiClassifications = [], isLoading } = useQuery({
    queryKey: ['native-classifications', type],
    queryFn: ({ signal }) => type === 'functional' ? getAllFunctionalClassifications(signal) : getAllEconomicClassifications(signal),
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  })

  // Get static classifications
  const staticClassifications = useMemo(() => getAllClassifications(type), [type])

  // Merge API and static classifications
  const flatClassifications = useMemo(() => {
    const mergedMap = new Map<string, FlatClassification>()

    // First, add all static classifications
    for (const classification of staticClassifications) {
      mergedMap.set(classification.code, classification)
    }

    // Then, merge in API classifications (update existing or add new)
    for (const apiClass of apiClassifications) {
      const existing = mergedMap.get(apiClass.code)
      mergedMap.set(apiClass.code, {
        code: apiClass.code,
        name: apiClass.name,
        description: existing?.description, // Keep description from static data if exists
      })
    }

    return Array.from(mergedMap.values())
  }, [staticClassifications, apiClassifications])

  // Build tree structure
  const treeData = useMemo(
    () => buildClassificationTree(flatClassifications),
    [flatClassifications]
  )

  // Create a map for quick lookup
  const classificationMap = useMemo(() => {
    const map = new Map<string, FlatClassification>()
    for (const classification of flatClassifications) {
      map.set(classification.code, classification)
    }
    return map
  }, [flatClassifications])

  // Helper to get a classification by code
  const getByCode = (code: string): FlatClassification | undefined => {
    return classificationMap.get(code)
  }

  return {
    flatClassifications,
    treeData,
    classificationMap,
    getByCode,
    isLoading,
  }
}
