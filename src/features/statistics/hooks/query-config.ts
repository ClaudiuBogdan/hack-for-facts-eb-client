import { GraphQLRequestError, isAbortError, isGraphQLInvalidInput } from '@/lib/graphql/graphql-client'

/**
 * One cache policy for the INS reads.
 *
 * Every key sits under `['statistics', …]`, so one `invalidateQueries` reaches
 * them all; the lifetimes follow how often the source changes, not which
 * page asked; and a failed read is retried once unless the server said the
 * request itself is wrong, which a retry cannot fix.
 */
export const STATISTICS_STALE_TIME = {
  /** The INS catalog: the context tree, a dataset's details, a certified series. A few changes a year. */
  catalog: 24 * 60 * 60 * 1000,
  /** The 3,239 INS territories change about once a decade. */
  places: 60 * 60 * 1000,
  /** Live figures — the hubs, the explorer, a comparison's latest cell. INS publishes on a monthly calendar. */
  figures: 15 * 60 * 1000,
  /** A dimension's members, paged and searched: cheap to re-read, large to hold. */
  members: 30 * 60 * 1000,
} as const

/**
 * Retry once, and only a read that could go differently. An abort is the
 * caller's own doing; a refused input (an unknown territory) and a refused
 * document (a query past the server's field cap) come back the same every time.
 */
export function statisticsRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 1) return false
  if (isAbortError(error) || isGraphQLInvalidInput(error)) return false
  return !(error instanceof GraphQLRequestError && error.status === 400)
}

export const statisticsKeys = {
  all: ['statistics'] as const,
  hub: () => ['statistics', 'hub-v1'] as const,
  contextTree: () => ['statistics', 'native-v2', 'context-tree'] as const,
  landingCatalog: () => ['statistics', 'native-v2', 'landing', 'catalog'] as const,
  territoryHub: (siruta: string) => ['statistics', 'native-v1', 'territory-hub', siruta] as const,
  territorySearch: (term: string) => ['statistics', 'native-v2', 'territory-search', term] as const,
  explorerPage: (hash: string) => ['statistics', 'explorer-v1', 'page', hash] as const,
  /** The comparison picker's search over datasets with county figures. */
  datasetSearch: (term: string) => ['statistics', 'explorer-v1', 'county-search', term] as const,
  datasetTier0: (code: string, entityKey: string) =>
    ['statistics', 'native-source-selection-v1', 'dataset', code, 'tier0', entityKey] as const,
  datasetSeries: (code: string, scopeKey: string, mode: 'inspection' | 'complete') =>
    ['statistics', 'native-source-selection-v1', 'dataset', code, 'series', scopeKey, mode] as const,
  dimensionValues: (parts: readonly (string | number | null)[]) =>
    ['statistics', 'dimension-values-v1', ...parts] as const,
  memberLabel: (parts: readonly (string | number)[]) => ['statistics', 'member-label-v1', ...parts] as const,
  comparison: {
    all: () => ['statistics', 'native-v2', 'comparisons'] as const,
    prepare: (parts: readonly unknown[]) => ['statistics', 'native-v2', 'comparisons', 'prepare', ...parts] as const,
    vector: (code: string, parts: readonly unknown[]) =>
      ['statistics', 'native-v2', 'comparisons', 'vector', code, ...parts] as const,
    vectorsOf: (code: string) => ['statistics', 'native-v2', 'comparisons', 'vector', code] as const,
    counties: (parts: readonly unknown[]) => ['statistics', 'native-v2', 'comparisons', 'counties', ...parts] as const,
    peerIdentity: (siruta: string | null) => ['statistics', 'native-v2', 'comparisons', 'peer-identity', siruta] as const,
    lauNames: (codes: readonly string[]) => ['statistics', 'native-v2', 'comparisons', 'names', 'lau', codes] as const,
    countyNames: () => ['statistics', 'native-v2', 'comparisons', 'names', 'counties'] as const,
  },
} as const
