import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PnrrLiveRelease } from '@/schemas/pnrr-live'
import {
  FIXTURE_RELEASE_ID,
  makeFixtureRelease,
  makeFixtureSnapshotEnvelope,
  NEXT_FIXTURE_RELEASE_ID,
} from '@/features/pnrr/lib/pnrr-api-snapshot.fixture'
import {
  loadPnrrReleaseModel,
  PNRR_DASHBOARD_SNAPSHOT_MAX_BYTES,
  readPnrrActiveRelease,
  readReadyPnrrReleaseModel,
  resetPnrrDashboardReleaseState,
} from './pnrr-dashboard-release'

let activeRelease: PnrrLiveRelease
let now: number
const readRelease = vi.fn(async () => activeRelease)
const fetchSnapshot = vi.fn(
  async (input: RequestInfo | URL): Promise<Response> => {
    const releaseId = new URL(String(input)).searchParams.get('assertReleaseId')
    return new Response(JSON.stringify(makeFixtureSnapshotEnvelope(releaseId ?? '')))
  },
)

beforeEach(() => {
  now = 0
  activeRelease = makeFixtureRelease(FIXTURE_RELEASE_ID)
  readRelease.mockClear()
  fetchSnapshot.mockClear()
  resetPnrrDashboardReleaseState({
    readRelease,
    fetchSnapshot: fetchSnapshot as unknown as typeof fetch,
    apiBaseUrl: () => 'https://example.test',
    now: () => now,
  })
})

describe('the PNRR release store', () => {
  it('re-reads the active release after a minute, or sooner (rate-limited) when a browser declares another', async () => {
    await readPnrrActiveRelease()
    await readPnrrActiveRelease()
    expect(readRelease).toHaveBeenCalledTimes(1)

    await readPnrrActiveRelease('some-other-release')
    await readPnrrActiveRelease('some-other-release')
    expect(readRelease).toHaveBeenCalledTimes(2)

    now += 61_000
    await readPnrrActiveRelease()
    expect(readRelease).toHaveBeenCalledTimes(3)
  })

  it('refuses a snapshot over the size limit without reading it into memory', async () => {
    fetchSnapshot.mockResolvedValueOnce(
      new Response('{}', {
        headers: {
          'content-length': String(PNRR_DASHBOARD_SNAPSHOT_MAX_BYTES + 1),
        },
      }),
    )

    await expect(loadPnrrReleaseModel(activeRelease)).rejects.toThrow(
      /size limit/,
    )
    expect(readReadyPnrrReleaseModel(FIXTURE_RELEASE_ID)).toBeNull()
  })

  it('refuses a snapshot that does not match the contract', async () => {
    fetchSnapshot.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          data: { release: activeRelease, observations: [{}] },
        }),
      ),
    )

    await expect(loadPnrrReleaseModel(activeRelease)).rejects.toThrow()
    expect(readReadyPnrrReleaseModel(FIXTURE_RELEASE_ID)).toBeNull()
  })

  it('keeps only the newest release models in memory', async () => {
    const third = makeFixtureRelease('pnrr-release-v1:mipe-20261215T000000Z')

    await loadPnrrReleaseModel(activeRelease)
    await loadPnrrReleaseModel(makeFixtureRelease(NEXT_FIXTURE_RELEASE_ID))
    await loadPnrrReleaseModel(third)

    expect(readReadyPnrrReleaseModel(FIXTURE_RELEASE_ID)).toBeNull()
    expect(readReadyPnrrReleaseModel(NEXT_FIXTURE_RELEASE_ID)).not.toBeNull()
    expect(readReadyPnrrReleaseModel(third.releaseId)?.model.projectCount).toBe(3)
  })
})
