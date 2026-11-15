import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  FIXTURE_RELEASE_ID,
  NEXT_FIXTURE_RELEASE_ID,
} from '../lib/pnrr-api-snapshot.fixture'
import { PNRR_DASHBOARD_RELEASE_HEADER } from '../lib/pnrr-overview-request'
import { PnrrDashboardReleaseContext } from '../lib/pnrr-release-context'
import { pnrrLiveQueryKeys } from './use-pnrr-live-data'
import {
  PnrrDashboardReleaseMismatchError,
  usePnrrProjectDetail,
  usePnrrProjectPage,
} from './usePnrrData'

// The dashboard reads answers from the web server only: no worker, no raw file.
vi.mock('../workers/pnrr-worker-client', () => {
  throw new Error('the PNRR dashboard must not start the raw-data worker')
})

const fetchMock = vi.fn<typeof fetch>()

function answer(body: unknown, releaseId: string | null, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      ...(releaseId ? { [PNRR_DASHBOARD_RELEASE_HEADER]: releaseId } : {}),
    },
  })
}

function setup(initialReleaseId: string | null) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  let releaseId = initialReleaseId
  const wrapper = ({ children }: { readonly children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <PnrrDashboardReleaseContext value={releaseId}>
        {children}
      </PnrrDashboardReleaseContext>
    </QueryClientProvider>
  )
  return {
    queryClient,
    wrapper,
    setRelease: (next: string | null) => {
      releaseId = next
    },
  }
}

const page = (title: string) => ({
  rows: [{ id: `key:${title}`, title }],
  totalCount: 1,
  page: 1,
  pageSize: 25,
  totalPages: 1,
  sortBy: 'value',
  sortOrder: 'desc',
})

const requestedUrls = () =>
  fetchMock.mock.calls.map(([input]) => new URL(String(input), 'https://x.test'))

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('the dashboard reads', () => {
  it('ask nothing until the release is known, then ask the server for that release only', async () => {
    fetchMock.mockResolvedValue(answer(page('a'), FIXTURE_RELEASE_ID))
    const { wrapper, setRelease } = setup(null)
    const { result, rerender } = renderHook(
      () => usePnrrProjectPage({ sortBy: 'title' }, { enabled: true }),
      { wrapper },
    )

    expect(fetchMock).not.toHaveBeenCalled()
    setRelease(FIXTURE_RELEASE_ID)
    rerender()

    await waitFor(() => expect(result.current.data?.rows).toHaveLength(1))
    const [url] = requestedUrls()
    expect(url?.pathname).toBe('/api/pnrr/overview')
    expect(url?.searchParams.get('release')).toBe(FIXTURE_RELEASE_ID)
    expect(url?.searchParams.get('part')).toBe('projects')
    expect(url?.searchParams.get('sortBy')).toBe('title')
    // Nothing of the frozen file set: no raw file, no file-set version.
    expect(requestedUrls().some((u) => u.pathname.startsWith('/api/pnrr/raw'))).toBe(
      false,
    )
    expect(url?.searchParams.has('v')).toBe(false)
  })

  it('re-reads the release, and shows nothing, when the server has switched releases', async () => {
    fetchMock.mockResolvedValue(
      answer({ error: 'release_mismatch', releaseId: NEXT_FIXTURE_RELEASE_ID }, null, 409),
    )
    const { wrapper, queryClient } = setup(FIXTURE_RELEASE_ID)
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(
      () => usePnrrProjectPage({}, { enabled: true }),
      { wrapper },
    )

    await waitFor(() =>
      expect(result.current.error).toBeInstanceOf(PnrrDashboardReleaseMismatchError),
    )
    expect(result.current.data).toBeUndefined()
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: pnrrLiveQueryKeys.status(),
    })
    // Not retried against the old release.
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('refuses an answer built from another release than the one asked for', async () => {
    fetchMock.mockResolvedValue(answer(page('other'), NEXT_FIXTURE_RELEASE_ID))
    const { wrapper } = setup(FIXTURE_RELEASE_ID)
    const { result } = renderHook(
      () => usePnrrProjectPage({}, { enabled: true }),
      { wrapper },
    )

    await waitFor(() =>
      expect(result.current.error).toBeInstanceOf(PnrrDashboardReleaseMismatchError),
    )
    expect(result.current.data).toBeUndefined()
  })

  it('moves every key to the new release and never shows the old release in its place', async () => {
    fetchMock.mockImplementation(async (input) => {
      const releaseId = new URL(String(input), 'https://x.test').searchParams.get(
        'release',
      )
      return answer(page(releaseId ?? ''), releaseId)
    })
    const { wrapper, setRelease } = setup(FIXTURE_RELEASE_ID)
    const { result, rerender } = renderHook(
      () => usePnrrProjectPage({}, { enabled: true }),
      { wrapper },
    )
    await waitFor(() =>
      expect(result.current.data?.rows[0]?.title).toBe(FIXTURE_RELEASE_ID),
    )

    setRelease(NEXT_FIXTURE_RELEASE_ID)
    rerender()
    // While the new release loads, the old page is not kept as a placeholder.
    expect(result.current.data?.rows[0]?.title).not.toBe(FIXTURE_RELEASE_ID)

    await waitFor(() =>
      expect(result.current.data?.rows[0]?.title).toBe(NEXT_FIXTURE_RELEASE_ID),
    )
  })

  it('reads one project detail from the server', async () => {
    fetchMock.mockResolvedValue(
      answer({ project: { id: 'key:project-1' } }, FIXTURE_RELEASE_ID),
    )
    const { wrapper } = setup(FIXTURE_RELEASE_ID)
    const { result } = renderHook(() => usePnrrProjectDetail('key:project-1'), {
      wrapper,
    })

    await waitFor(() =>
      expect(result.current.data.project?.id).toBe('key:project-1'),
    )
    const [url] = requestedUrls()
    expect(url?.searchParams.get('part')).toBe('project')
    expect(url?.searchParams.get('projectId')).toBe('key:project-1')
    expect(url?.searchParams.get('release')).toBe(FIXTURE_RELEASE_ID)
  })
})
