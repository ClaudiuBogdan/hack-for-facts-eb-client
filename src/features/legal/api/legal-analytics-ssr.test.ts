import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LegalAnalyticsAnswer, LegalAnalyticsView } from '@/schemas/legal-analytics'
import { LegalAnalyticsError } from './legal-analytics-api'
import { forgetAnalyticsReads, memoAnalyticsRead } from './legal-analytics-ssr'

const MINUTE = 60 * 1000
const answer = (id: string) => ({ data: {}, layer: { layerId: id }, args: {} }) as unknown as LegalAnalyticsAnswer<LegalAnalyticsView>
const refused = () => Promise.reject(new LegalAnalyticsError('unavailable', 'busy', 503))

describe('memoAnalyticsRead', () => {
  let clock = 0
  const now = () => clock
  beforeEach(() => {
    forgetAnalyticsReads()
    clock = 0
  })

  it('serves a kept read inside its window without reading again', async () => {
    const read = vi.fn(() => Promise.resolve(answer('4')))
    await memoAnalyticsRead('k', read, now)
    clock = 4 * MINUTE
    await expect(memoAnalyticsRead('k', read, now)).resolves.toEqual(answer('4'))
    expect(read).toHaveBeenCalledTimes(1)
  })

  it('serves a stale read for one more window while a refresh runs', async () => {
    await memoAnalyticsRead('k', () => Promise.resolve(answer('4')), now)
    clock = 6 * MINUTE
    const refresh = vi.fn(() => Promise.resolve(answer('5')))
    await expect(memoAnalyticsRead('k', refresh, now)).resolves.toEqual(answer('4'))
    await Promise.resolve()
    expect(refresh).toHaveBeenCalledTimes(1)
    await expect(memoAnalyticsRead('k', refresh, now)).resolves.toEqual(answer('5'))
  })

  it('lets a 503 reach the loader once the kept read is too old, never serving the old answer', async () => {
    await memoAnalyticsRead('k', () => Promise.resolve(answer('4')), now)
    // an outage: every refresh is refused
    clock = 6 * MINUTE
    await expect(memoAnalyticsRead('k', refused, now)).resolves.toEqual(answer('4'))
    clock = 11 * MINUTE
    await expect(memoAnalyticsRead('k', refused, now)).rejects.toMatchObject({ kind: 'unavailable' })
    // and the next render reads again, rather than finding the old answer
    const next = vi.fn(() => Promise.resolve(answer('5')))
    await expect(memoAnalyticsRead('k', next, now)).resolves.toEqual(answer('5'))
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('keeps no failed read', async () => {
    await expect(memoAnalyticsRead('k', refused, now)).rejects.toBeInstanceOf(LegalAnalyticsError)
    const read = vi.fn(() => Promise.resolve(answer('4')))
    await memoAnalyticsRead('k', read, now)
    expect(read).toHaveBeenCalledTimes(1)
  })
})
