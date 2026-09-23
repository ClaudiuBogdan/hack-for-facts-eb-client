import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { StatisticsComparisonsSearch } from '@/schemas/statistics'
import {
  fetchNativeComparisonVector,
  prepareNativeComparison,
  projectPreparedComparison,
} from '../api/native-comparisons-api'
import { useComparisons } from './use-comparisons'

vi.mock('../api/native-comparisons-api', () => ({
  prepareNativeComparison: vi.fn(),
  fetchNativeComparisonVector: vi.fn(),
  projectPreparedComparison: vi.fn(),
  fetchComparisonCountyLayer: vi.fn(),
}))
// The defaults are their own module's business (tested there): here they
// always resolve, so the reads decide what the page shows.
vi.mock('../lib/comparison-defaults', () => ({
  resolveComparisonDefaults: () => ({
    pins: new Map([['D0', '100']]),
    unit: '0',
    cadence: 'ANNUAL',
    issues: [],
    unresolvedAxes: [],
    ready: true,
  }),
}))
vi.mock('../lib/native-comparison', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/native-comparison')>()),
  comparisonPublicationKey: () => 'publication-1',
}))

const prepare = vi.mocked(prepareNativeComparison)
const fetchVector = vi.mocked(fetchNativeComparisonVector)
const project = vi.mocked(projectPreparedComparison)

type Prepared = Awaited<ReturnType<typeof prepareNativeComparison>>
type Matrix = ReturnType<typeof projectPreparedComparison>

/** A read whose answer the test releases. */
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((settle) => {
    resolve = settle
  })
  return { promise, resolve }
}

const preparedFor = (territories: unknown) =>
  ({
    dataset: { code: 'TEST', dimensions: [], has_county_data: true },
    latest: [],
    descriptor: { code: 'TEST' },
    tokens: territories,
  }) as unknown as Prepared

const search = (teritorii: readonly string[], extra: Partial<StatisticsComparisonsSearch> = {}): StatisticsComparisonsSearch => ({
  cod: 'TEST',
  teritorii,
  ...extra,
})

describe('useComparisons', () => {
  let client: QueryClient
  const wrapper = ({ children }: { readonly children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )

  beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    prepare.mockReset()
    fetchVector.mockReset()
    project.mockReset()
    prepare.mockImplementation(async (input) => preparedFor(input.territories))
    fetchVector.mockImplementation(async (prepared) => ({ prepared, descriptor: prepared.descriptor, observations: [] }) as never)
    project.mockImplementation((result) => ({ read: (result.prepared as unknown as { tokens: readonly string[] }).tokens }) as unknown as Matrix)
  })

  it('keeps the last reading on screen, marked as refreshing, while a territory is added', async () => {
    const { result, rerender } = renderHook((props: StatisticsComparisonsSearch) => useComparisons(props), {
      wrapper,
      initialProps: search(['cod:CJ', 'cod:B']),
    })
    await waitFor(() => expect(result.current.matrix).not.toBeNull())
    const before = result.current.matrix

    const pending = deferred<Prepared>()
    prepare.mockImplementationOnce(() => pending.promise)
    rerender(search(['cod:CJ', 'cod:B', 'cod:RO']))

    // Same dataset and source selection: the figures on screen stay true.
    expect(result.current.refreshing).toBe(true)
    expect(result.current.matrix).toBe(before)
    expect(result.current.datasetLoading).toBe(false)
    expect(result.current.observationsLoading).toBe(false)
    expect(result.current.tokens.map((token) => token.token)).toEqual(['cod:CJ', 'cod:B', 'cod:RO'])

    pending.resolve(preparedFor(['cod:CJ', 'cod:B', 'cod:RO']))
    await waitFor(() => expect(result.current.refreshing).toBe(false))
    expect(result.current.matrix).not.toBe(before)
    expect(result.current.matrix).toEqual({ read: ['cod:CJ', 'cod:B', 'cod:RO'] })
  })

  it('never holds a reading of another source selection: a new unit is a new comparison', async () => {
    const { result, rerender } = renderHook((props: StatisticsComparisonsSearch) => useComparisons(props), {
      wrapper,
      initialProps: search(['cod:CJ', 'cod:B']),
    })
    await waitFor(() => expect(result.current.matrix).not.toBeNull())

    prepare.mockImplementationOnce(() => deferred<Prepared>().promise)
    rerender(search(['cod:CJ', 'cod:B'], { unitate: '1' }))

    expect(result.current.refreshing).toBe(false)
    expect(result.current.matrix).toBeNull()
    expect(result.current.datasetLoading).toBe(true)
  })

  it('reads nothing for an address with no territory, and names its dataset code normalised', () => {
    const { result } = renderHook(() => useComparisons({ cod: ' pop107d ' }), { wrapper })
    expect(prepare).not.toHaveBeenCalled()
    expect(result.current.datasetCode).toBe('POP107D')
    expect(result.current.hasDataset).toBe(true)
    expect(result.current.matrix).toBeNull()
  })
})
