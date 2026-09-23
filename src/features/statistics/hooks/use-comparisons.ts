import { normalizeInsDatasetCode } from '@/lib/ins/source-contract'
import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { INS_CHART_PERIOD_TYPE, validPeriodDate } from '@/lib/ins/source-periods'
import { t } from '@lingui/core/macro'
import { searchInsTerritories } from '../api/graphql/statistics-fetchers'
import type { StatisticsComparisonsSearch } from '@/schemas/statistics'
import {
  prepareNativeComparison,
  fetchComparisonCountyLayer,
  fetchNativeComparisonVector,
  projectPreparedComparison,
  type PreparedComparison,
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
  // A year arrives parsed as a number; a period is its string.
  const periodParam = (raw: unknown) =>
    typeof raw === 'number' && Number.isSafeInteger(raw) ? String(raw) : raw
  const requestedPeriod = periodParam(search.perioada)
  const requestedFrom = periodParam(search.din)
  const inputIssues = [
    ...(search.cod !== undefined && !datasetCode ? ['dataset'] : []),
    ...(!territorySelection.valid ? ['territories'] : []),
    ...[requestedPeriod, requestedFrom].some(
      (period) => period !== undefined && typeof period !== 'string',
    )
      ? ['period']
      : [],
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
  if (resolved?.cadence) {
    const type = INS_CHART_PERIOD_TYPE[resolved.cadence]
    if (
      [requestedPeriod, requestedFrom].some(
        (period) => typeof period === 'string' && !validPeriodDate(period, type),
      )
    )
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
          {
            period:
              typeof requestedPeriod === 'string' ? requestedPeriod : undefined,
            from: typeof requestedFrom === 'string' ? requestedFrom : undefined,
          },
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
  }, [ready, vector.data, prepared, requestedPeriod, requestedFrom])
  const matrix = projection.matrix

  // The last complete reading, kept on screen while a territory is added or
  // removed: the same dataset and source selection, so its figures stay
  // true while the new read loads — and the page neither blanks to a
  // skeleton nor drops the focus a click on the map left on a county.
  const sourceKey = JSON.stringify([
    datasetCode,
    search.clasificari ?? null,
    search.unitate ?? null,
    search.frecventa ?? null,
  ])
  const [settled, setSettled] = useState<{
    readonly sourceKey: string
    readonly prepared: NonNullable<typeof prepared>
    readonly matrix: NonNullable<typeof matrix>
  } | null>(null)
  if (matrix && prepared && settled?.matrix !== matrix)
    setSettled({ sourceKey, prepared, matrix })
  const loading =
    (enabled && preparation.isPending) || (ready && vector.isPending)
  const stale =
    loading && inputIssues.length === 0 && settled?.sourceKey === sourceKey
      ? settled
      : null
  const shownResolved = stale ? stale.prepared.resolved : resolved

  const effectivePins = shownResolved
    ? [...shownResolved.pins].map(([typeCode, valueCode]) => ({
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
    datasetMeta: (stale?.prepared ?? prepared)?.dataset ?? null,
    datasetLoading: !stale && enabled && preparation.isPending,
    datasetError: preparation.error,
    matrix: stale ? stale.matrix : matrix,
    observationsLoading: !stale && ready && vector.isPending,
    /** True while the previous reading stands in for a selection still loading. */
    refreshing: stale !== null,
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
    /** The window's ends the URL names; the page resolves the rest from the rows. */
    requestedWindow: {
      from: typeof requestedFrom === 'string' ? requestedFrom : undefined,
      to: typeof requestedPeriod === 'string' ? requestedPeriod : undefined,
    },
    /** The preparation the rows were read with, once they can be: the county map reads the same cell. */
    prepared: stale ? stale.prepared : ready ? prepared : null,
    tokens,
    hasDataset: datasetCode.length > 0,
    issues,
    unitCode: shownResolved?.unit ?? null,
    cadence: shownResolved?.cadence ?? null,
    representative: shownResolved?.representative ?? false,
  }
}

/**
 * The compared cell over the counties at one period, for the county map.
 * Read only for a dataset with county figures, once the comparison's own
 * read is ready; while another period loads, the map keeps the one it has.
 */
export function useComparisonCountyLayer(prepared: PreparedComparison | null, period: string | null) {
  const code = prepared?.descriptor.code ?? null
  return useQuery({
    queryKey: [
      'statistics',
      'native-v2',
      'comparisons',
      'counties',
      code,
      prepared ? comparisonPublicationKey(prepared.descriptor) : null,
      prepared ? [...prepared.resolved.pins] : null,
      prepared?.resolved.unit ?? null,
      prepared?.resolved.cadence ?? null,
      period,
    ],
    queryFn: ({ signal }) => {
      if (!prepared || period === null) throw new Error('Missing comparison preparation or period')
      return fetchComparisonCountyLayer(prepared, period, signal)
    },
    enabled: prepared !== null && period !== null && prepared.dataset.has_county_data,
    // Another period of the same dataset: keep the map drawn while it loads.
    placeholderData: (previous) => (previous?.code === code ? previous : undefined),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}

/** Characters typed before the dataset picker searches. */
export const COMPARISON_DATASET_SEARCH_MIN_LENGTH = 2

/**
 * Dataset search for the picker. Only datasets with loaded facts and county
 * figures are offered: a catalog-only dataset would render six empty rows,
 * and a national one has a single territory to compare. Of the 85 datasets
 * with locality figures, 84 have county figures too (2026-09-23).
 */
export function useComparisonDatasetSearch(term: string) {
  const trimmed = term.trim()
  // Below the minimum no request is made: an unfiltered catalog page teaches nothing.
  const enabled = trimmed.length >= COMPARISON_DATASET_SEARCH_MIN_LENGTH

  const query = useQuery({
    queryKey: ['statistics', 'comparisons', 'dataset-search', 'county', trimmed],
    queryFn: () => fetchDatasetPage({ q: trimmed, judet: true }, { onlyWithData: true }),
    enabled,
  })

  return {
    datasets: query.data?.datasets ?? [],
    isLoading: enabled && query.isPending,
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
      if (token.level === 'NATIONAL') names.set(token.code, t`România`)
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
