import { normalizeInsDatasetCode } from '@/lib/ins/source-contract'
import { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { validPeriodDate } from '@/lib/ins/source-periods'
import { t } from '@lingui/core/macro'
import { searchInsTerritories } from '../api/graphql/statistics-fetchers'
import type { StatisticsComparisonsSearch } from '@/schemas/statistics'
import {
  prepareNativeComparison,
  fetchNativeComparisonVector,
  projectPreparedComparison,
} from '../api/native-comparisons-api'
import { resolveComparisonDefaults } from '../lib/comparison-defaults'
import { resolveComparisonTerritories } from '../lib/comparison-territories'
import { comparisonPublicationKey } from '../lib/native-comparison'
import { fetchDatasetPage } from '../api/dataset-explorer-api'
import {
  searchTerritories,
  TERRITORY_SEARCH_MIN_LENGTH,
} from '../api/territory-search-api'
import type {
  ComparisonMatrix,
  ComparisonTerritoryToken,
} from '../lib/comparison-series'

/** One complete native fetch per source selection; period and frequency are local projections. */
export function useComparisons(search: StatisticsComparisonsSearch) {
  const queryClient = useQueryClient()
  const datasetCode =
    typeof search.cod === 'string' ? normalizeInsDatasetCode(search.cod) : ''
  const territorySelection = useMemo(
    () => resolveComparisonTerritories(search.teritorii),
    [search.teritorii],
  )
  const tokens = territorySelection.tokens
  const explicit =
    search.clasificari !== undefined ||
    search.unitate !== undefined ||
    search.frecventa !== undefined
  const requestedPeriod =
    typeof search.perioada === 'number' && Number.isSafeInteger(search.perioada)
      ? String(search.perioada)
      : search.perioada
  const inputIssues = [
    ...(search.cod !== undefined && !datasetCode ? ['dataset'] : []),
    ...(!territorySelection.valid ? ['territories'] : []),
    ...(requestedPeriod !== undefined && typeof requestedPeriod !== 'string'
      ? ['period']
      : []),
  ]
  const enabled =
    datasetCode.length > 0 && tokens.length > 0 && inputIssues.length === 0
  const preparation = useQuery({
    queryKey: [
      'statistics',
      'native-v2',
      'comparisons',
      'prepare',
      datasetCode,
      tokens,
      explicit,
    ],
    queryFn: ({ signal }) =>
      prepareNativeComparison(
        {
          code: datasetCode,
          territories: search.teritorii,
          classifications: search.clasificari,
          unit: search.unitate,
          cadence: search.frecventa,
        },
        signal,
      ),
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
  // Preparation metadata/defaults do not depend on which explicit member is picked.
  const prepared = useMemo(() => {
    if (!preparation.data) return null
    return {
      ...preparation.data,
      resolved: resolveComparisonDefaults({
        dataset: preparation.data.dataset,
        latest: preparation.data.latest,
        classifications: search.clasificari,
        unit: search.unitate,
        cadence: search.frecventa,
      }),
    }
  }, [preparation.data, search.clasificari, search.unitate, search.frecventa])
  const resolved = prepared?.resolved
  const issues = [...inputIssues, ...(resolved?.issues ?? [])]
  if (typeof requestedPeriod === 'string' && resolved?.cadence) {
    const type = {
      ANNUAL: 'YEAR',
      QUARTERLY: 'QUARTER',
      MONTHLY: 'MONTH',
    } as const
    if (!validPeriodDate(requestedPeriod, type[resolved.cadence]))
      issues.push('period')
  }
  const ready =
    enabled &&
    prepared !== null &&
    resolved?.ready === true &&
    issues.length === 0
  const vector = useQuery({
    queryKey: [
      'statistics',
      'native-v2',
      'comparisons',
      'vector',
      datasetCode,
      tokens,
      prepared ? comparisonPublicationKey(prepared.descriptor) : null,
      resolved ? [...resolved.pins] : null,
      resolved?.unit ?? null,
    ],
    queryFn: ({ signal }) => {
      if (!prepared) throw new Error('Missing native comparison preparation')
      return fetchNativeComparisonVector(prepared, signal)
    },
    enabled: ready,
    retry: false,
  })
  const projection = useMemo(() => {
    if (!ready || !vector.data || !prepared)
      return { matrix: null, error: null }
    try {
      return {
        matrix: projectPreparedComparison(
          { ...vector.data, prepared },
          typeof requestedPeriod === 'string' ? requestedPeriod : undefined,
        ),
        error: null,
      }
    } catch (error) {
      return {
        matrix: null,
        error:
          error instanceof Error ? error : new Error('Invalid INS comparison'),
      }
    }
  }, [ready, vector.data, prepared, requestedPeriod])
  const matrix = projection.matrix
  const effectivePins = resolved
    ? [...resolved.pins].map(([typeCode, valueCode]) => ({
        typeCode,
        valueCode,
      }))
    : []
  const unresolvedDimensionLabels = prepared
    ? [
        ...prepared.dataset.dimensions
          .filter((d) => resolved?.unresolvedAxes.includes(`D${d.index}`))
          .map((d) => d.label_ro || `D${d.index}`),
        ...(resolved?.unit === null ? [t`Unitate de măsură`] : []),
        ...(resolved?.cadence === null ? [t`Frecvență`] : []),
      ]
    : []
  return {
    datasetMeta: prepared?.dataset ?? null,
    datasetLoading: enabled && preparation.isPending,
    datasetError: preparation.error,
    matrix,
    observationsLoading: ready && vector.isPending,
    observationsError: vector.error ?? projection.error,
    observationsFetching: preparation.isFetching || vector.isFetching,
    refetchObservations: async () => {
      // Refresh defaults and observations together after publication changes.
      const refreshed = await preparation.refetch()
      if (refreshed.isSuccess)
        await queryClient.invalidateQueries({
          queryKey: [
            'statistics',
            'native-v2',
            'comparisons',
            'vector',
            datasetCode,
          ],
        })
    },
    effectivePins,
    unresolvedDimensionLabels,
    selectedPeriod:
      typeof requestedPeriod === 'string'
        ? requestedPeriod
        : (matrix?.periods[matrix.periods.length - 1]?.isoPeriod ?? null),
    tokens,
    hasDataset: datasetCode.length > 0,
    hasEnoughTerritories: tokens.length >= 2,
    issues,
    unitCode: resolved?.unit ?? null,
    cadence: resolved?.cadence ?? null,
    representative: resolved?.representative ?? false,
  }
}

/**
 * Dataset search for the picker. Only datasets with loaded facts are offered —
 * a catalog-only dataset would render six empty rows and teach the user
 * nothing.
 */
export function useComparisonDatasetSearch(term: string) {
  const trimmed = term.trim()

  const query = useQuery({
    queryKey: ['statistics', 'comparisons', 'dataset-search', trimmed],
    queryFn: () =>
      fetchDatasetPage({
        q: trimmed.length > 0 ? trimmed : undefined,
        stare: 'available',
      }),
  })

  return {
    datasets: query.data?.datasets ?? [],
    isLoading: query.isPending,
    error: query.error,
  }
}

/** Debounced territory search for the picker. Below the min length no request is made. */
export function useTerritorySearch(term: string) {
  const trimmed = term.trim()
  const enabled = trimmed.length >= TERRITORY_SEARCH_MIN_LENGTH

  const query = useQuery({
    queryKey: ['statistics', 'comparisons', 'territory-search', trimmed],
    queryFn: () => searchTerritories(trimmed),
    enabled,
  })

  return {
    // Mixed levels are first-class: LAU rows become siruta: tokens, county
    // rows cod: tokens — one territoryCodes filter serves both.
    rows: query.data?.rows ?? [],
    isLoading: enabled && query.isPending,
    error: query.error,
    enabled,
  }
}

/**
 * Peer suggestions for the first selected territory: its county (via the
 * identity lookup — `parent_code` exists ONLY on `insTerritories` rows) and
 * the country. A county first-pick suggests just the country.
 */
export function useComparisonPeers(
  tokens: readonly ComparisonTerritoryToken[],
): readonly { token: string; label: string }[] {
  const first = tokens[0]
  const sirutaCode =
    first && first.token.startsWith('siruta:') ? first.code : null

  const identityQuery = useQuery({
    queryKey: ['statistics', 'comparisons', 'peer-identity', sirutaCode],
    queryFn: ({ signal }) =>
      searchInsTerritories({
        filter: { sirutaCodes: [sirutaCode ?? ''] },
        limit: 1,
        signal,
      }),
    enabled: sirutaCode !== null,
    staleTime: 1000 * 60 * 60 * 24,
  })

  const peers: { token: string; label: string }[] = []
  const identity = identityQuery.data?.rows[0]
  // The mapper guarantees countyCode is a real NUTS3 code: an alphabetic
  // parent, or the sector→B special-case — never a numeric SIRUTA.
  if (identity?.countyCode) {
    peers.push({
      token: `cod:${identity.countyCode}`,
      label: identity.countyName
        ? `${t`județul`} ${identity.countyName}`
        : identity.countyCode,
    })
  }
  if (tokens.length > 0) {
    peers.push({ token: 'cod:RO', label: t`România` })
  }
  return peers
}

/**
 * Names for territories the observations could not name — a token with ZERO
 * rows structurally never carries a name. LAU codes resolve by SIRUTA; county
 * codes resolve from the (42-row, day-cached) NUTS3 list; RO is România.
 */
export function useComparisonTerritoryNames(
  tokens: readonly ComparisonTerritoryToken[],
  matrix: ComparisonMatrix | null,
): ReadonlyMap<string, string> {
  const unresolved = useMemo(() => {
    if (!matrix) return [] as readonly ComparisonTerritoryToken[]
    const named = new Set(
      matrix.rows.filter((row) => row.name).map((row) => row.code),
    )
    return tokens.filter((token) => !named.has(token.code))
  }, [tokens, matrix])

  const lauCodes = unresolved
    .filter((token) => token.level === 'LAU')
    .map((token) => token.code)
  const needsCounties = unresolved.some((token) => token.level === 'NUTS3')

  const lauQuery = useQuery({
    queryKey: [
      'statistics',
      'comparisons',
      'names',
      'lau',
      [...lauCodes].sort(),
    ],
    queryFn: ({ signal }) =>
      searchInsTerritories({
        filter: { sirutaCodes: lauCodes },
        limit: lauCodes.length,
        signal,
      }),
    enabled: lauCodes.length > 0,
    staleTime: 1000 * 60 * 60 * 24,
  })

  const countyQuery = useQuery({
    queryKey: ['statistics', 'comparisons', 'names', 'counties'],
    queryFn: ({ signal }) =>
      searchInsTerritories({
        filter: { levels: ['NUTS3'] },
        limit: 60,
        signal,
      }),
    enabled: needsCounties,
    staleTime: 1000 * 60 * 60 * 24,
  })

  return useMemo(() => {
    const names = new Map<string, string>()
    for (const token of unresolved) {
      if (token.level === 'NATIONAL') names.set(token.code, 'România')
    }
    for (const row of lauQuery.data?.rows ?? []) {
      if (row.siruta && row.name) names.set(row.siruta, row.name)
    }
    for (const row of countyQuery.data?.rows ?? []) {
      if (row.code && row.name) names.set(row.code, row.name)
    }
    return names
  }, [unresolved, lauQuery.data, countyQuery.data])
}
