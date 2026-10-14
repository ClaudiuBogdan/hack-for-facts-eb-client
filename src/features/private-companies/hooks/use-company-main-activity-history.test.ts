import { describe, expect, it } from 'vitest'
import { createTestQueryClient } from '@/test/test-utils'
import { mainActivityHistoryKey, removeMainActivityHistory } from './use-company-main-activity-history'

/**
 * `removeMainActivityHistory`: the owning company was refused, so every
 * history of THAT company goes at once — both kinds, every identity and
 * scope — a read in flight is cancelled and its late answer never lands;
 * another company's history stays.
 */

const page = { pages: [{ status: 'page', page: { state: 'AVAILABLE', kind: 'OUTCOMES', outcomes: [], evidence: [], nextCursor: null, scopeKey: 's1' } }], pageParams: [null] }

describe('removeMainActivityHistory', () => {
  it('removes every history of the company, cancels a read in flight so its late answer never lands, and leaves other companies', async () => {
    const client = createTestQueryClient()
    client.setQueryDefaults(['company-main-activity-history'], { gcTime: Infinity })
    client.setQueryData(mainActivityHistoryKey('1590082', 'OUTCOMES', 'main-v2:a', 's1'), page)
    client.setQueryData(mainActivityHistoryKey('1590082', 'EVIDENCE', 'main-v2:b', 's2'), page)
    const other = mainActivityHistoryKey('2816464', 'OUTCOMES', 'main-v2:a', 's1')
    client.setQueryData(other, page)
    // A read of the company still in flight under another identity.
    let answer: (value: unknown) => void = () => undefined
    const inFlightKey = mainActivityHistoryKey('1590082', 'OUTCOMES', 'main-v2:c', 's1')
    const inFlight = client
      .fetchInfiniteQuery({
        queryKey: inFlightKey,
        queryFn: () =>
          new Promise((resolve) => {
            answer = resolve
          }),
        initialPageParam: null as string | null,
      })
      .then(
        () => 'landed',
        () => 'cancelled',
      )
    removeMainActivityHistory(client, '1590082')
    answer({ status: 'page', page: page.pages[0]?.page })
    expect(await inFlight).toBe('cancelled')
    expect(client.getQueryCache().findAll({ queryKey: ['company-main-activity-history', '1590082'] })).toHaveLength(0)
    expect(client.getQueryData(inFlightKey)).toBeUndefined()
    expect(client.getQueryData(other)).toEqual(page)
  })
})
