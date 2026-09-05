import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InsSourcePageError } from '@/lib/ins/source-pages'
import {
  buildNativeCountyStory,
  buildNativeLandingExample,
} from '../lib/native-landing'
import {
  source,
  exampleSource,
  landingTiles,
} from '../test/native-landing-fixtures'
vi.mock('../api/graphql/ins-landing-tiles', () => ({
  fetchNativeLandingTiles: vi.fn(),
}))
vi.mock('../api/native-landing-api', async (original) => {
  const actual = await original<typeof import('../api/native-landing-api')>()
  return {
    ...actual,
    fetchNativeCountyStory: vi.fn(),
    fetchNativeLandingExample: vi.fn(),
  }
})
import { fetchNativeLandingTiles } from '../api/graphql/ins-landing-tiles'
import {
  fetchNativeCountyStory,
  fetchNativeLandingExample,
  NativeLandingSelectionError,
} from '../api/native-landing-api'
import {
  loadNativeLanding,
  nativeLandingTilesOptions,
  nativeLandingCountyOptions,
  nativeLandingExampleOptions,
  useNativeLanding,
  type NativeLandingBootstrap,
  type LandingRead,
  type NativeLandingTiles,
} from './use-native-landing'

const county = () => ({
  nativeContract: 'native-v2' as const,
  story: buildNativeCountyStory(source(), 2016, 2025),
})
const example = () => ({
  nativeContract: 'native-v2' as const,
  example: buildNativeLandingExample(exampleSource()),
})
const ready = <T,>(data: T): LandingRead<T> => ({
  nativeContract: 'native-v2',
  data,
  error: null,
})
function bootstrap(): NativeLandingBootstrap {
  return {
    nativeContract: 'native-v2',
    tiles: ready(landingTiles()),
    county: ready(county()),
    example: ready(example()),
  }
}
function harness() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  const wrapper = ({ children }: { readonly children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, wrapper }
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(fetchNativeLandingTiles).mockResolvedValue(landingTiles())
  vi.mocked(fetchNativeCountyStory).mockResolvedValue(county())
  vi.mocked(fetchNativeLandingExample).mockResolvedValue(example())
})
describe('native landing SSR and query identity', () => {
  it('starts independent sections together, then reuses the national seed for the county read', async () => {
    let resolveTiles!: (tiles: ReturnType<typeof landingTiles>) => void
    vi.mocked(fetchNativeLandingTiles).mockReturnValue(
      new Promise((resolve) => {
        resolveTiles = resolve
      }),
    )
    const signal = new AbortController().signal
    const pending = loadNativeLanding(signal)
    expect(fetchNativeLandingExample).toHaveBeenCalledWith(signal)
    expect(fetchNativeCountyStory).not.toHaveBeenCalled()
    const tiles = landingTiles()
    resolveTiles(tiles)
    const result = await pending
    expect(fetchNativeCountyStory).toHaveBeenCalledWith(
      tiles.nationalValues[0],
      signal,
    )
    expect(fetchNativeLandingTiles).toHaveBeenCalledTimes(1)
    expect(result.county.data?.story.source).not.toHaveProperty('observations')
    expect(result.example.data?.example.source).not.toHaveProperty(
      'observations',
    )
    expect(JSON.parse(JSON.stringify(result))).toEqual(result)
  })
  it.each([
    [new NativeLandingSelectionError('not eligible'), 'SELECTION'],
    [new InsSourcePageError('PUBLICATION_CHANGED'), 'PUBLICATION_CHANGED'],
    [new InsSourcePageError('INCOMPLETE_VECTOR'), 'INCOMPLETE'],
    [new Error('private transport detail'), 'READ_FAILED'],
  ])(
    'serializes a failed section without erasing successful sections or exposing error details',
    async (failure, reason) => {
      vi.mocked(fetchNativeCountyStory).mockRejectedValue(failure)
      const result = await loadNativeLanding()
      expect(result.county).toEqual({
        nativeContract: 'native-v2',
        data: null,
        error: reason,
      })
      expect(result.tiles.data).not.toBeNull()
      expect(result.example.data).not.toBeNull()
      expect(JSON.stringify(result)).not.toContain('private transport detail')
    },
  )
  it('preserves an upstream tile read failure without claiming an ineligible population selection', async () => {
    vi.mocked(fetchNativeLandingTiles).mockRejectedValue(
      new InsSourcePageError('PUBLICATION_CHANGED'),
    )
    const result = await loadNativeLanding()
    expect(result.tiles.error).toBe('PUBLICATION_CHANGED')
    expect(result.county.error).toBe('PUBLICATION_CHANGED')
    expect(fetchNativeCountyStory).not.toHaveBeenCalled()
    const { client } = harness()
    const read = await client.fetchQuery(
      nativeLandingCountyOptions(undefined, undefined, 'READ_FAILED'),
    )
    expect(read.error).toBe('READ_FAILED')
    expect(fetchNativeCountyStory).not.toHaveBeenCalled()
    client.clear()
  })
  it('does not convert cancellation into an SSR error payload or start reads after abort', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(loadNativeLanding(controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    })
    expect(fetchNativeLandingTiles).not.toHaveBeenCalled()
    expect(fetchNativeLandingExample).not.toHaveBeenCalled()
  })
  it('isolates native-v2 cache keys and rejects native-v1 initial data', () => {
    const old = {
      nativeContract: 'native-v1',
      data: landingTiles(),
      error: null,
    } as unknown as LandingRead<NativeLandingTiles>
    expect(nativeLandingTilesOptions(old).initialData).toBeUndefined()
    const keys = [
      nativeLandingTilesOptions().queryKey,
      nativeLandingCountyOptions(landingTiles().nationalValues[0]).queryKey,
      nativeLandingExampleOptions().queryKey,
    ]
    expect(new Set(keys.map((key) => JSON.stringify(key))).size).toBe(3)
    for (const key of keys)
      expect(key.slice(0, 2)).toEqual(['statistics', 'native-v2'])
  })
  it('hydrates compact v2 outcomes without duplicate reads', async () => {
    const { wrapper, client } = harness()
    const initial = bootstrap()
    const { result, unmount } = renderHook(() => useNativeLanding(initial), {
      wrapper,
    })
    expect(result.current.tiles.data).toEqual(initial.tiles)
    expect(result.current.county.data).toEqual(initial.county)
    expect(result.current.example.data).toEqual(initial.example)
    expect(fetchNativeLandingTiles).not.toHaveBeenCalled()
    expect(fetchNativeCountyStory).not.toHaveBeenCalled()
    expect(fetchNativeLandingExample).not.toHaveBeenCalled()
    unmount()
    client.clear()
  })
  it('does not reuse SSR county data when the cache has a newer seed publication', async () => {
    const { wrapper, client } = harness()
    const initial = bootstrap()
    const tiles = landingTiles()
    tiles.nationalValues[0].source.descriptor.metadata.revision_id = '2'
    client.setQueryData(nativeLandingTilesOptions().queryKey, ready(tiles))
    const fresh = {
      ...county(),
      story: { ...county().story, unchangedCount: 41 },
    }
    vi.mocked(fetchNativeCountyStory).mockResolvedValue(fresh)
    const { result, unmount } = renderHook(() => useNativeLanding(initial), {
      wrapper,
    })
    await waitFor(() => expect(result.current.county.data?.data).toEqual(fresh))
    expect(fetchNativeCountyStory).toHaveBeenCalledWith(
      tiles.nationalValues[0],
      expect.any(AbortSignal),
    )
    unmount()
    client.clear()
  })
  it('refreshes the seed on county retry and stores the result under the refreshed identity', async () => {
    const { wrapper, client } = harness()
    const initial = bootstrap()
    const tiles = landingTiles()
    tiles.nationalValues[0].source.observation.classifications[0] = {
      type_code: 'D0',
      code: '-2',
    }
    vi.mocked(fetchNativeLandingTiles).mockResolvedValue(tiles)
    const { result, unmount } = renderHook(() => useNativeLanding(initial), {
      wrapper,
    })
    await act(async () => {
      await result.current.retryCounty()
    })
    await waitFor(() =>
      expect(fetchNativeCountyStory).toHaveBeenCalledWith(
        tiles.nationalValues[0],
        expect.any(AbortSignal),
      ),
    )
    expect(
      client.getQueryData(
        nativeLandingCountyOptions(tiles.nationalValues[0]).queryKey,
      ),
    ).toEqual(ready(county()))
    expect(fetchNativeLandingExample).not.toHaveBeenCalled()
    unmount()
    client.clear()
  })
})
