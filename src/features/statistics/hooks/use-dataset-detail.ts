import { normalizeInsDatasetCode } from '@/lib/ins/source-contract'
import {
  queryOptions,
  useQueries,
  useQuery,
  type QueryClient,
} from '@tanstack/react-query'
import type {
  InsDatasetDetails,
  InsDimensionValue,
  InsEntitySelectorInput,
} from '@/schemas/ins'
import type {
  StatisticsDatasetDetailSearch,
  StatisticsDatasetTier0,
  StatisticsLatestValue,
} from '@/schemas/statistics'
import {
  fetchDatasetTier0,
  fetchDimensionValuesPage,
  fetchRelatedDatasets,
} from '../api/dataset-detail-api'
import { detailScopeKey } from '../lib/dataset-selection'
import { getDatasetDataStatus } from '../lib/dataset-status'
import {
  resolveDatasetSeries,
  type ResolvedDatasetSeries,
} from '../lib/detail-series-resolution'
import { detailBootstrapEntity } from '../lib/source-selection'
import { STATISTICS_STALE_TIME, statisticsKeys, statisticsRetry } from './query-config'

/** The most options the API hands back in one read. */
const DIMENSION_OPTIONS_PAGE_SIZE = 1000

/**
 * A dimension's options, the whole axis: read 1,000 at a time until the axis
 * is done — one read for nearly every axis, four for the 3,182 localities of
 * SOM101F. The panels search, and count, on the client, so the list they
 * hold must be the whole list; a search over a first page would have missed
 * every locality past it.
 *
 * The offset of the next read is the number of rows already held, not a page
 * counter: a server that returned a short page must not be asked to skip
 * rows it never sent.
 */
export function dimensionOptionsQuery(params: {
  readonly datasetCode: string
  readonly dimensionIndex: number
  readonly nativePublicationKey?: string
}) {
  const datasetCode = normalizeInsDatasetCode(params.datasetCode)
  return queryOptions({
    queryKey: statisticsKeys.dimensionValues([
      'all-v1',
      params.nativePublicationKey ?? null,
      datasetCode,
      params.dimensionIndex,
    ]),
    queryFn: async ({ signal }): Promise<readonly InsDimensionValue[]> => {
      const nodes: InsDimensionValue[] = []
      for (;;) {
        const page = await fetchDimensionValuesPage({
          expectedPublicationKey: params.nativePublicationKey,
          datasetCode,
          dimensionIndex: params.dimensionIndex,
          limit: DIMENSION_OPTIONS_PAGE_SIZE,
          offset: nodes.length,
          signal,
        })
        nodes.push(...page.nodes)
        if (!page.pageInfo.hasNextPage || page.nodes.length === 0) return nodes
      }
    },
    enabled: datasetCode.length > 0,
    staleTime: STATISTICS_STALE_TIME.members,
    // The list offers its own retry the moment a read fails.
    retry: false,
  })
}

/**
 * The option lists of the axes a selection panel shows, read as soon as the
 * panel is on screen, so a section opens onto a list that is already there.
 * Returns each axis's list, by dimension index, once it has arrived — the
 * panel names a pinned member from it while the series' own rows, which
 * name it otherwise, are still on their way.
 */
export function useDimensionOptionLists(params: {
  readonly datasetCode: string
  readonly dimensionIndexes: readonly number[]
}): ReadonlyMap<number, readonly InsDimensionValue[]> {
  const results = useQueries({
    queries: params.dimensionIndexes.map((dimensionIndex) =>
      dimensionOptionsQuery({ datasetCode: params.datasetCode, dimensionIndex }),
    ),
  })
  const lists = new Map<number, readonly InsDimensionValue[]>()
  params.dimensionIndexes.forEach((dimensionIndex, position) => {
    const data = results[position]?.data
    if (data) lists.set(dimensionIndex, data)
  })
  return lists
}

/**
 * Tier-0 (POST A): the dataset with its server-resolved latest cell, keyed
 * by code and entity so a territory deep link resolves its own cell. One
 * definition for the loader and the page, so the two never read under
 * different keys.
 */
/** Every tier-0 read of one matrix, whatever entity it was resolved for. */
export function datasetTier0Reads(queryClient: QueryClient, code: string): readonly StatisticsDatasetTier0[] {
  return queryClient
    .getQueriesData<StatisticsDatasetTier0>({ queryKey: statisticsKeys.datasetTier0All(code) })
    .flatMap(([, data]) => (data ? [data] : []))
}

export function datasetTier0QueryOptions(params: {
  readonly code: string
  readonly entity: InsEntitySelectorInput | null
}) {
  return queryOptions({
    queryKey: statisticsKeys.datasetTier0(params.code, JSON.stringify(params.entity)),
    queryFn: ({ signal }) =>
      fetchDatasetTier0({ code: params.code, entity: params.entity, signal }),
    staleTime: STATISTICS_STALE_TIME.catalog,
    retry: statisticsRetry,
  })
}

export function useDatasetTier0(params: {
  readonly code: string
  readonly entity: InsEntitySelectorInput | null
  readonly initialData?: StatisticsDatasetTier0
}) {
  const scope = statisticsKeys.datasetTier0All(params.code)
  return useQuery({
    ...datasetTier0QueryOptions(params),
    enabled: params.code.trim().length > 0,
    // The first pin moves the entity from national to none, which is a new
    // key: the dataset it holds is the same one, so the header and the rail
    // keep it while the resolved cell re-reads. The caller must not read the
    // placeholder's `latest`, which belongs to the previous entity. Another
    // matrix (a related set opened from its tile) is another page: its
    // header, definition and title must not stand in for the new one.
    placeholderData: (previous, previousQuery) =>
      previousQuery && scope.every((part, index) => previousQuery.queryKey[index] === part)
        ? previous
        : undefined,
    ...(params.initialData?.nativeContract === 'native-v1'
      ? { initialData: params.initialData }
      : {}),
  })
}

/**
 * The series an address resolves to (POST B, and the reads that decide it),
 * keyed by the scope alone: the cell chosen along the way travels in the
 * result, so two addresses that differ only in the cell they resolved to
 * cannot share an entry.
 */
export function datasetSeriesQueryOptions(params: {
  readonly code: string
  readonly search: StatisticsDatasetDetailSearch
  readonly dataset: InsDatasetDetails
  readonly latest: StatisticsLatestValue | null
}) {
  return queryOptions({
    queryKey: statisticsKeys.datasetSeries(params.code, detailScopeKey(params.search)),
    queryFn: ({ signal }) =>
      resolveDatasetSeries({
        code: params.code,
        search: params.search,
        dataset: params.dataset,
        latest: params.latest,
        signal,
      }),
    staleTime: STATISTICS_STALE_TIME.catalog,
    retry: statisticsRetry,
  })
}

export function useDatasetSeries(params: {
  readonly code: string
  readonly search: StatisticsDatasetDetailSearch
  readonly dataset: InsDatasetDetails | null
  readonly latest: StatisticsLatestValue | null
  readonly enabled: boolean
  readonly initialData?: ResolvedDatasetSeries
}) {
  const dataset = params.dataset
  return useQuery({
    // With no dataset yet there is nothing to resolve; the key still has to
    // be the one the read will use, so the loader's prefetch is found.
    ...datasetSeriesQueryOptions({
      code: params.code,
      search: params.search,
      dataset: dataset ?? EMPTY_DATASET,
      latest: params.latest,
    }),
    enabled: params.enabled && dataset !== null && params.code.trim().length > 0,
    ...(params.initialData?.nativeContract === 'resolved-v1'
      ? { initialData: params.initialData }
      : {}),
  })
}

/** A stand-in for the options factory while the dataset is still unknown; never read. */
const EMPTY_DATASET: InsDatasetDetails = {
  id: '',
  code: '',
  periodicity: [],
  dimension_count: 0,
  has_uat_data: false,
  has_county_data: false,
  has_siruta: false,
  dimensions: [],
}

/** The matrices sharing one INS context: a catalog fact, read once per context. */
export function relatedDatasetsQueryOptions(contextCode: string) {
  return queryOptions({
    queryKey: statisticsKeys.relatedDatasets(contextCode),
    queryFn: ({ signal }) => fetchRelatedDatasets({ contextCode, signal }),
    staleTime: STATISTICS_STALE_TIME.catalog,
    retry: statisticsRetry,
  })
}

export function useRelatedDatasets(contextCode: string | null) {
  return useQuery({
    ...relatedDatasetsQueryOptions(contextCode ?? ''),
    enabled: contextCode !== null,
  })
}

/**
 * What a client-side navigation to the page starts reading before the page
 * mounts: the dataset, then — once it is known — the series and the related
 * catalog, under the keys the page's own hooks read. A failure here is not
 * reported; the page's queries own that verdict and their retries.
 */
export async function prefetchDatasetDetail(
  queryClient: QueryClient,
  params: { readonly code: string; readonly search: StatisticsDatasetDetailSearch },
): Promise<void> {
  const entity = detailBootstrapEntity(params.search)
  const tier0 = await queryClient.ensureQueryData(
    datasetTier0QueryOptions({ code: params.code, entity }),
  )
  const dataset = tier0.dataset
  if (!dataset || getDatasetDataStatus(dataset) === 'catalog-only') return
  await Promise.all([
    queryClient.prefetchQuery(
      datasetSeriesQueryOptions({
        code: params.code,
        search: params.search,
        dataset,
        latest: tier0.latest,
      }),
    ),
    dataset.context_code
      ? queryClient.prefetchQuery(relatedDatasetsQueryOptions(dataset.context_code))
      : Promise.resolve(),
  ])
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

export async function findSourceMemberLabel(params: {
  readonly datasetCode: string
  readonly lookup: SourceMemberLookup
  readonly signal?: AbortSignal
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
