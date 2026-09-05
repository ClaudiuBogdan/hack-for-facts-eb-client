import {
  hashKey,
  queryOptions,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { createLogger } from '@/lib/logger'
import { InsSourcePageError } from '@/lib/ins/source-pages'
import type { StatisticsLatestValue } from '@/schemas/statistics'
import { ComparisonDatasetError } from '../lib/comparison-dataset-error'
import { fetchNativeLandingTiles } from '../api/graphql/ins-landing-tiles'
import {
  fetchNativeCountyStory,
  fetchNativeLandingExample,
  NativeLandingSelectionError,
} from '../api/native-landing-api'

const logger = createLogger('native-ins-landing')
export type LandingReadFailure =
  | 'SELECTION'
  | 'PUBLICATION_CHANGED'
  | 'INCOMPLETE'
  | 'CATALOG_ONLY'
  | 'UNKNOWN'
  | 'READ_FAILED'
export type LandingRead<T> = { readonly nativeContract: 'native-v2' } & (
  | { readonly data: T; readonly error: null }
  | { readonly data: null; readonly error: LandingReadFailure }
)
export type NativeLandingTiles = Awaited<
  ReturnType<typeof fetchNativeLandingTiles>
>
export type NativeLandingCounty = Awaited<
  ReturnType<typeof fetchNativeCountyStory>
>
export type NativeLandingExample = Awaited<
  ReturnType<typeof fetchNativeLandingExample>
>
export interface NativeLandingBootstrap {
  readonly nativeContract: 'native-v2'
  readonly tiles: LandingRead<NativeLandingTiles>
  readonly county: LandingRead<NativeLandingCounty>
  readonly example: LandingRead<NativeLandingExample>
}

/** A serializable read outcome renders identically in SSR and after hydration. Abort never becomes data. */
async function readSection<T>(
  read: () => Promise<T>,
  signal?: AbortSignal,
): Promise<LandingRead<T>> {
  signal?.throwIfAborted()
  try {
    const data = await read()
    signal?.throwIfAborted()
    return { nativeContract: 'native-v2', data, error: null }
  } catch (error) {
    signal?.throwIfAborted()
    const reason: LandingReadFailure =
      error instanceof NativeLandingSelectionError
        ? 'SELECTION'
        : error instanceof ComparisonDatasetError
          ? error.reason
          : error instanceof InsSourcePageError &&
              error.code === 'PUBLICATION_CHANGED'
            ? 'PUBLICATION_CHANGED'
            : error instanceof InsSourcePageError &&
                error.code === 'INCOMPLETE_VECTOR'
              ? 'INCOMPLETE'
              : 'READ_FAILED'
    logger.warn('Native landing section unavailable', { reason })
    return { nativeContract: 'native-v2', data: null, error: reason }
  }
}
const populationSeed = (tiles: LandingRead<NativeLandingTiles> | undefined) =>
  tiles?.data?.nationalValues.find((value) => value.datasetCode === 'POP107D')

/** Includes publication and the original seed, never just a dataset label. */
export const landingSeedKey = (seed: StatisticsLatestValue | undefined) =>
  hashKey([seed ?? null])
const nativeInitial = <T>(initial: LandingRead<T> | undefined) =>
  initial?.nativeContract === 'native-v2' ? initial : undefined
// A failed SSR read can recover on browser mount; successful publications stay
// cached for five minutes. Query retries remain explicit and section-local.
const staleTime = (query: {
  readonly state: {
    readonly data?: { readonly error: LandingReadFailure | null }
  }
}) => (query.state.data?.error ? 0 : 5 * 60 * 1000)
export const nativeLandingTilesOptions = (
  initial?: LandingRead<NativeLandingTiles>,
) =>
  queryOptions({
    queryKey: ['statistics', 'native-v2', 'landing', 'tiles'] as const,
    queryFn: ({ signal }) =>
      readSection(() => fetchNativeLandingTiles(signal), signal),
    initialData: nativeInitial(initial),
    staleTime,
    retry: false,
  })
export const nativeLandingCountyOptions = (
  seed: StatisticsLatestValue | undefined,
  initial?: LandingRead<NativeLandingCounty>,
  upstreamError?: LandingReadFailure | null,
) =>
  queryOptions({
    queryKey: [
      'statistics',
      'native-v2',
      'landing',
      'county',
      landingSeedKey(seed),
      upstreamError ?? null,
    ] as const,
    queryFn: ({ signal }): Promise<LandingRead<NativeLandingCounty>> => {
      signal.throwIfAborted()
      return upstreamError
        ? Promise.resolve({
            nativeContract: 'native-v2',
            data: null,
            error: upstreamError,
          })
        : readSection(() => fetchNativeCountyStory(seed, signal), signal)
    },
    initialData: nativeInitial(initial),
    staleTime,
    retry: false,
  })
export const nativeLandingExampleOptions = (
  initial?: LandingRead<NativeLandingExample>,
) =>
  queryOptions({
    queryKey: ['statistics', 'native-v2', 'landing', 'example'] as const,
    queryFn: ({ signal }) =>
      readSection(() => fetchNativeLandingExample(signal), signal),
    initialData: nativeInitial(initial),
    staleTime,
    retry: false,
  })

/** Reuse the tile seed; unrelated blocks start together and fail independently. */
export async function loadNativeLanding(
  signal?: AbortSignal,
): Promise<NativeLandingBootstrap> {
  const tilesPromise = readSection(
    () => fetchNativeLandingTiles(signal),
    signal,
  )
  const examplePromise = readSection(
    () => fetchNativeLandingExample(signal),
    signal,
  )
  const countyPromise = tilesPromise.then(
    (tiles): Promise<LandingRead<NativeLandingCounty>> =>
      tiles.error
        ? Promise.resolve({
            nativeContract: 'native-v2',
            data: null,
            error: tiles.error,
          })
        : readSection(
            () => fetchNativeCountyStory(populationSeed(tiles), signal),
            signal,
          ),
  )
  const [tiles, county, example] = await Promise.all([
    tilesPromise,
    countyPromise,
    examplePromise,
  ])
  return { nativeContract: 'native-v2', tiles, county, example }
}

export function useNativeLanding(initial?: NativeLandingBootstrap) {
  const queryClient = useQueryClient()
  const accepted = initial?.nativeContract === 'native-v2' ? initial : undefined
  const tiles = useQuery(nativeLandingTilesOptions(accepted?.tiles))
  const seed = populationSeed(tiles.data)
  const matchingSeed =
    landingSeedKey(seed) === landingSeedKey(populationSeed(accepted?.tiles)) &&
    tiles.data?.error === accepted?.tiles.error
  const county = useQuery({
    ...nativeLandingCountyOptions(
      seed,
      matchingSeed ? accepted?.county : undefined,
      tiles.data?.error,
    ),
    enabled: tiles.data !== undefined,
  })
  const example = useQuery(nativeLandingExampleOptions(accepted?.example))
  const retryCounty = async () => {
    const refreshed = await tiles.refetch()
    const options = nativeLandingCountyOptions(
      populationSeed(refreshed.data),
      undefined,
      refreshed.data?.error,
    )
    await queryClient.prefetchQuery({ ...options, staleTime: 0 })
  }
  return { tiles, county, example, retryCounty }
}
