import { getInsDimensionValuesPage } from '../api/graphql/ins-bootstrap-fetchers'
import { normalizeInsDatasetCode } from '@/lib/ins/source-contract'
import { useInfiniteQuery, useQueries, useQuery } from '@tanstack/react-query'
import type {
  InsDimensionValue,
  InsDimensionValueConnection,
  InsEntitySelectorInput,
  InsObservationFilterInput,
} from '@/schemas/ins'
import type {
  StatisticsDatasetSeries,
  StatisticsDatasetTier0,
} from '@/schemas/statistics'
import {
  fetchDatasetSeries,
  fetchDatasetTier0,
  fetchDimensionValuesPage,
} from '../api/dataset-detail-api'
import { STATISTICS_STALE_TIME, statisticsKeys, statisticsRetry } from './query-config'

/**
 * One page of a dimension's options. Always paged and always server-searched:
 * a classification dimension can hold thousands of hierarchical values, so
 * there is no load-all path to fall back to.
 */
export function useDimensionValues(params: {
  readonly datasetCode: string
  readonly dimensionIndex: number
  readonly nativePublicationKey?: string
  readonly search: string | undefined
  readonly limit: number
  readonly offset: number
  readonly enabled: boolean
}) {
  const search = params.search?.trim() || undefined
  const datasetCode = normalizeInsDatasetCode(params.datasetCode)

  return useQuery<InsDimensionValueConnection>({
    queryKey: statisticsKeys.dimensionValues([
      params.nativePublicationKey === undefined ? 'legacy-or-demo-v1' : 'native-only-v1',
      params.nativePublicationKey ?? null,
      datasetCode,
      params.dimensionIndex,
      search ?? '',
      params.limit,
      params.offset,
    ]),
    queryFn: ({ signal }) =>
      (params.nativePublicationKey === undefined ? fetchDimensionValuesPage : getInsDimensionValuesPage)({
        expectedPublicationKey: params.nativePublicationKey,
        datasetCode,
        dimensionIndex: params.dimensionIndex,
        search,
        limit: params.limit,
        offset: params.offset,
        signal,
      }),
    enabled: params.enabled && datasetCode.length > 0,
    staleTime: STATISTICS_STALE_TIME.members,
    placeholderData: () => undefined,
    // The list offers its own retry the moment a page fails.
    retry: false,
  })
}

/**
 * A dimension's options as one growing list: the pages `useDimensionValues`
 * reads one at a time, appended as the reader scrolls. The panel virtualises
 * the rows, so a 3,000-locality axis costs the same to draw as a 3-row one;
 * what it never does is ask for the whole axis in one read.
 *
 * The offset of the next page is the number of rows already held, not a
 * page counter: a server that returned a short page must not be asked to
 * skip rows it never sent.
 */
export function useDimensionValuesInfinite(params: {
  readonly datasetCode: string
  readonly dimensionIndex: number
  readonly nativePublicationKey?: string
  readonly search: string | undefined
  readonly pageSize: number
  readonly enabled: boolean
}) {
  const search = params.search?.trim() || undefined
  const datasetCode = normalizeInsDatasetCode(params.datasetCode)

  return useInfiniteQuery<InsDimensionValueConnection>({
    queryKey: statisticsKeys.dimensionValues([
      'scroll-v1',
      params.nativePublicationKey === undefined ? 'legacy-or-demo-v1' : 'native-only-v1',
      params.nativePublicationKey ?? null,
      datasetCode,
      params.dimensionIndex,
      search ?? '',
      params.pageSize,
    ]),
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      (params.nativePublicationKey === undefined ? fetchDimensionValuesPage : getInsDimensionValuesPage)({
        expectedPublicationKey: params.nativePublicationKey,
        datasetCode,
        dimensionIndex: params.dimensionIndex,
        search,
        limit: params.pageSize,
        offset: pageParam as number,
        signal,
      }),
    getNextPageParam: (lastPage, pages) =>
      lastPage.pageInfo.hasNextPage && lastPage.nodes.length > 0
        ? pages.reduce((count, page) => count + page.nodes.length, 0)
        : undefined,
    enabled: params.enabled && datasetCode.length > 0,
    staleTime: STATISTICS_STALE_TIME.members,
    // The list offers its own retry the moment a page fails.
    retry: false,
  })
}

/**
 * Tier-0 (POST A): dataset + resolved latest. Keyed by code + entity so a
 * territory deep link resolves its own cell. The route loader supplies
 * `initialData` for the CURRENT scope (loaderDeps re-run it per navigation),
 * so in the normal flow this query never fetches client-side.
 */
export function useDatasetTier0(params: {
  readonly code: string
  readonly entity: InsEntitySelectorInput | null
  readonly entityKey: string
  readonly initialData?: StatisticsDatasetTier0
}) {
  return useQuery<StatisticsDatasetTier0>({
    queryKey: statisticsKeys.datasetTier0(params.code, params.entityKey),
    queryFn: ({ signal }) =>
      fetchDatasetTier0({ code: params.code, entity: params.entity, signal }),
    enabled: params.code.trim().length > 0,
    staleTime: STATISTICS_STALE_TIME.catalog,
    retry: statisticsRetry,
    ...(params.initialData?.nativeContract === 'native-v1'
      ? { initialData: params.initialData }
      : {}),
  })
}

/** The resolved series + related datasets (POST B), keyed by the scope key. */
export function useDatasetSeries(params: {
  readonly code: string
  readonly scopeKey: string
  readonly filter: InsObservationFilterInput
  readonly contextCode: string | null
  readonly inspection?: boolean
  readonly enabled: boolean
  readonly initialData?: StatisticsDatasetSeries
}) {
  return useQuery<StatisticsDatasetSeries>({
    queryKey: statisticsKeys.datasetSeries(params.code, params.scopeKey, params.inspection ? 'inspection' : 'complete'),
    queryFn: ({ signal }) =>
      fetchDatasetSeries({
        code: params.code,
        filter: params.filter,
        contextCode: params.contextCode,
        inspection: params.inspection,
        signal,
      }),
    enabled: params.enabled && params.code.trim().length > 0,
    staleTime: STATISTICS_STALE_TIME.catalog,
    retry: statisticsRetry,
    ...(params.initialData?.nativeContract === 'native-v1' &&
    (params.initialData.readMode ?? 'complete') ===
      (params.inspection ? 'inspection' : 'complete')
      ? { initialData: params.initialData }
      : {}),
  })
}

/** One pinned member whose label the fetched rows could not supply. */
export type SourceMemberLookup = {
  readonly dimensionIndex: number
  readonly code: string
  /** Classification members are keyed by their code, units by the unit's. */
  readonly kind: 'classification' | 'unit'
}

/** Reads per lookup at most: 5,000 members, past the largest INS axis (3,183). */
const MEMBER_LOOKUP_MAX_PAGES = 5
const MEMBER_LOOKUP_PAGE_SIZE = 1000

/**
 * Labels for pinned members, read from their axis.
 *
 * The rail names each pin from the rows the series returned. When the cell
 * holds no rows there is nothing to read — an old link to a cell INS never
 * published, a hand-edited URL — and the rail printed the pins themselves:
 * „Sexe 105 · Judete 112 · Localitati 114". This finds each such member on
 * its axis instead, a thousand members a read; the caller enables it only for
 * pins the rows left unnamed, so a page with data never asks.
 */
export function useSourceMemberLabels(params: {
  readonly datasetCode: string
  readonly lookups: readonly SourceMemberLookup[]
}): ReadonlyMap<string, string> {
  const datasetCode = normalizeInsDatasetCode(params.datasetCode)
  const results = useQueries({
    queries: params.lookups.map((lookup) => ({
      queryKey: statisticsKeys.memberLabel([datasetCode, lookup.dimensionIndex, lookup.kind, lookup.code]),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        findSourceMemberLabel({ datasetCode, lookup, signal }),
      enabled: datasetCode.length > 0,
      staleTime: STATISTICS_STALE_TIME.members,
      retry: statisticsRetry,
    })),
  })

  const labels = new Map<string, string>()
  params.lookups.forEach((lookup, index) => {
    const label = results[index]?.data
    if (label) labels.set(sourceMemberLabelKey(lookup), label)
  })
  return labels
}

/** The key a resolved label is filed under: axis and member together. */
export function sourceMemberLabelKey(lookup: SourceMemberLookup): string {
  return `${lookup.kind}:${lookup.dimensionIndex}:${lookup.code}`
}

async function findSourceMemberLabel(params: {
  readonly datasetCode: string
  readonly lookup: SourceMemberLookup
  readonly signal: AbortSignal
}): Promise<string | null> {
  const { datasetCode, lookup, signal } = params
  const matches = (value: InsDimensionValue) =>
    lookup.kind === 'unit'
      ? value.unit?.code === lookup.code
      : value.classification_value?.code === lookup.code
  let offset = 0
  for (let page = 0; page < MEMBER_LOOKUP_MAX_PAGES; page++) {
    const result = await fetchDimensionValuesPage({
      datasetCode,
      dimensionIndex: lookup.dimensionIndex,
      limit: MEMBER_LOOKUP_PAGE_SIZE,
      offset,
      signal,
    })
    const hit = result.nodes.find(matches)
    if (hit) {
      const label =
        lookup.kind === 'unit'
          ? (hit.unit?.name_ro ?? hit.unit?.symbol ?? hit.label_ro)
          : (hit.label_ro ?? hit.classification_value?.name_ro)
      return label?.trim() || null
    }
    if (!result.pageInfo.hasNextPage || result.nodes.length === 0) return null
    offset += result.nodes.length
  }
  return null
}
