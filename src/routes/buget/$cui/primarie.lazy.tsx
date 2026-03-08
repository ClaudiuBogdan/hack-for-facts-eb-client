import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import {
  ChallengeEntityAnalysisPage,
  type ChallengeEntityAnalysisPageState,
} from '@/features/challenges/components/analysis/challenge-entity-analysis-page'
import type { ChallengeEntityInitialSettings } from '@/features/challenges/components/analysis/challenge-entity-analysis-queries'
import { useCampaignProgress } from '@/features/campaigns/buget/hooks/use-campaign-progress'
import {
  type ChallengeEntityAnalysisRouteSearch,
  type ChallengeEntityAnalysisUrlState,
  buildChallengeEntityAnalysisCanonicalSearchPatch,
  encodeChallengeTreemapPath,
  normalizeChallengeEntityAnalysisSearch,
} from '@/features/challenges/schemas/challenge-entity-analysis-route-search-schema'

export const Route = createLazyFileRoute('/buget/$cui/primarie')({
  component: PrimarieEntityRoutePage,
})

function applySearchPatch(
  previousSearch: Record<string, unknown>,
  patch: Partial<ChallengeEntityAnalysisRouteSearch>,
) {
  const nextSearch = { ...previousSearch } as Record<string, unknown>

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) {
      delete nextSearch[key]
      continue
    }

    nextSearch[key] = value
  }

  return nextSearch
}

function isSearchPatchEmpty(
  patch: Partial<ChallengeEntityAnalysisRouteSearch>,
): boolean {
  return Object.keys(patch).length === 0
}

function toPageState(
  searchState: ChallengeEntityAnalysisUrlState,
): ChallengeEntityAnalysisPageState {
  return {
    selectedYear: searchState.year,
    reportType: searchState.report_type,
    normalization: searchState.normalization,
    treemapAccountCategory: searchState.treemap_account,
    treemapPrimary: searchState.treemap_primary,
    treemapPath: searchState.treemap_path?.split(',').filter(Boolean) ?? [],
    evolutionAccountCategory: searchState.evolution_account,
    evolutionPrimary: searchState.evolution_primary,
    mapPreviewKey: searchState.public_map,
  }
}

export function PrimarieEntityRoutePage() {
  const { cui } = Route.useParams()
  const search = Route.useSearch()
  const loaderData = Route.useLoaderData() as
    | {
      initialSettings?: ChallengeEntityInitialSettings
    }
    | undefined
  const navigate = useNavigate({
    from: '/buget/$cui/primarie',
  })
  const {
    isReady,
    isInitialResolutionReady,
    progress,
    setSelectedEntity,
  } = useCampaignProgress()
  const [isEntityResolved, setIsEntityResolved] = useState(false)
  const syncedEntityCuiRef = useRef<string | null>(null)

  const normalizedSearch = useMemo(
    () =>
      normalizeChallengeEntityAnalysisSearch(
        search as ChallengeEntityAnalysisRouteSearch,
      ),
    [search],
  )
  const pageState = useMemo(
    () => toPageState(normalizedSearch),
    [normalizedSearch],
  )

  useEffect(() => {
    setIsEntityResolved(false)
    syncedEntityCuiRef.current = null
  }, [cui])

  useEffect(() => {
    const canonicalPatch = buildChallengeEntityAnalysisCanonicalSearchPatch(
      search as ChallengeEntityAnalysisRouteSearch,
      normalizedSearch,
    )

    if (isSearchPatchEmpty(canonicalPatch)) {
      return
    }

    void navigate({
      search: (previousSearch) =>
        applySearchPatch(
          previousSearch as Record<string, unknown>,
          canonicalPatch,
        ),
      replace: true,
    })
  }, [navigate, normalizedSearch, search])

  useEffect(() => {
    if (
      !isEntityResolved ||
      !isReady ||
      !isInitialResolutionReady ||
      syncedEntityCuiRef.current === cui ||
      progress.selectedEntityCui === cui
    ) {
      return
    }

    syncedEntityCuiRef.current = cui
    setSelectedEntity({ entityCui: cui })
  }, [
    cui,
    isEntityResolved,
    isInitialResolutionReady,
    isReady,
    progress.selectedEntityCui,
    setSelectedEntity,
  ])

  const updateSearch = useCallback(
    (patch: Partial<ChallengeEntityAnalysisRouteSearch>) => {
      if (isSearchPatchEmpty(patch)) {
        return
      }

      startTransition(() => {
        void navigate({
          search: (previousSearch) =>
            applySearchPatch(
              previousSearch as Record<string, unknown>,
              patch,
            ),
          replace: true,
          resetScroll: false,
        })
      })
    },
    [navigate],
  )

  const handleStateChange = useCallback(
    (patch: Partial<ChallengeEntityAnalysisPageState>) => {
      const searchPatch: Partial<ChallengeEntityAnalysisRouteSearch> = {}

      if (patch.selectedYear !== undefined) {
        searchPatch.year = patch.selectedYear
      }

      if (patch.reportType !== undefined) {
        searchPatch.report_type = patch.reportType
      }

      if (patch.normalization !== undefined) {
        searchPatch.normalization = patch.normalization
      }

      if (patch.treemapAccountCategory !== undefined) {
        searchPatch.treemap_account = patch.treemapAccountCategory
      }

      if (patch.treemapPrimary !== undefined) {
        searchPatch.treemap_primary = patch.treemapPrimary
      }

      if (patch.treemapPath !== undefined) {
        searchPatch.treemap_path = encodeChallengeTreemapPath(patch.treemapPath)
      }

      if (patch.evolutionAccountCategory !== undefined) {
        searchPatch.evolution_account = patch.evolutionAccountCategory
      }

      if (patch.evolutionPrimary !== undefined) {
        searchPatch.evolution_primary = patch.evolutionPrimary
      }

      if (patch.mapPreviewKey !== undefined) {
        searchPatch.public_map = patch.mapPreviewKey
      }

      const nextNormalizedState = normalizeChallengeEntityAnalysisSearch({
        ...(search as ChallengeEntityAnalysisRouteSearch),
        ...searchPatch,
      })

      updateSearch(
        buildChallengeEntityAnalysisCanonicalSearchPatch(
          search as ChallengeEntityAnalysisRouteSearch,
          nextNormalizedState,
        ),
      )
    },
    [search, updateSearch],
  )

  return (
    <ChallengeEntityAnalysisPage
      entityCui={cui}
      languageQuery={normalizedSearch.lang}
      state={pageState}
      initialSettings={loaderData?.initialSettings}
      onStateChange={handleStateChange}
      onEntityResolved={() => setIsEntityResolved(true)}
    />
  )
}
