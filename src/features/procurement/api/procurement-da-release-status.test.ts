import { beforeEach, describe, expect, it, vi } from 'vitest'

const graphqlQuery = vi.fn()
vi.mock('@/lib/graphql/graphql-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/graphql/graphql-client')>()),
  graphqlQuery: (...args: unknown[]) => graphqlQuery(...args),
}))

const { assertServedUnder, daSupplierReads, DisclosureMismatchError, disclosureVersion, readDaRelease, readDisclosureNow, resetDaReleaseForTests, StaleDisclosureError } = await import('./procurement-da-release-status')

/**
 * D6 (owner via root): a withheld supplier disappears within one publish, so
 * every kept direct-purchase answer belongs to the publication it was read
 * under — and with that unknown, nothing is kept.
 */

const status = (enabled: boolean, dataAsOf: string | null, privacyAsOf: string | null = null) => ({ procurementDaRelease: { enabled, dataAsOf, privacyEnforced: privacyAsOf !== null, privacyAsOf } })

beforeEach(() => {
  graphqlQuery.mockReset()
  resetDaReleaseForTests()
})

describe('the disclosure-change bound (root, 19 November 2026)', () => {
  it('is the status minute plus the CDN\'s ten: 660 s', async () => {
    const { DA_DISCLOSURE_CHANGE_BOUND_SECONDS } = await import('../lib/disclosure-cache')
    expect(DA_DISCLOSURE_CHANGE_BOUND_SECONDS).toBe(660)
  })
})

describe('publications only move forward (API doc 10; root, 19 November 2026)', () => {
  const P1 = '2026-11-18T03:10:00.123456Z'
  const P2 = '2026-11-19T03:10:00.123456Z'

  it('a late P1 status after P2 is dropped, read again, and never kept or keyed', async () => {
    graphqlQuery.mockResolvedValueOnce(status(true, 't2', P2))
    await expect(disclosureVersion({ fresh: true })).resolves.toBe(`on:t2:d6:${P2}`)
    // A lagging answer, twice: the read fails rather than key anything to P1.
    graphqlQuery.mockResolvedValueOnce(status(true, 't1', P1)).mockResolvedValueOnce(status(true, 't1', P1))
    await expect(readDaRelease({ fresh: true })).rejects.toBeInstanceOf(StaleDisclosureError)
    graphqlQuery.mockResolvedValueOnce(status(true, 't1', P1)).mockResolvedValueOnce(status(true, 't1', P1))
    await expect(disclosureVersion({ fresh: true })).resolves.toBeNull()
    graphqlQuery.mockResolvedValueOnce(status(true, 't1', P1)).mockResolvedValueOnce(status(true, 't1', P1))
    await expect(readDisclosureNow()).rejects.toBeInstanceOf(StaleDisclosureError)
    // Nothing of P1 was kept: the next read asks again, and a current answer stands.
    graphqlQuery.mockResolvedValueOnce(status(true, 't1', P1)).mockResolvedValueOnce(status(true, 't2', P2))
    await expect(disclosureVersion()).resolves.toBe(`on:t2:d6:${P2}`)
  })

  it('responses the network reorders: P2 arrives first, the earlier request\'s P1 after it', async () => {
    let answerFirst: (value: unknown) => void = () => {}
    graphqlQuery
      .mockImplementationOnce(() => new Promise((resolve) => (answerFirst = resolve)))
      .mockResolvedValueOnce(status(true, 't2', P2))
      .mockResolvedValueOnce(status(true, 't1', P1))
    const first = disclosureVersion({ fresh: true })
    const second = disclosureVersion({ fresh: true })
    await expect(second).resolves.toBe(`on:t2:d6:${P2}`)
    answerFirst(status(true, 't1', P1))
    await expect(first).resolves.toBeNull()
    // The kept answer is the newest.
    await expect(disclosureVersion()).resolves.toBe(`on:t2:d6:${P2}`)
  })

  it('a later request\'s P1, kept before an earlier request\'s P2 arrived, is not served from the cache', async () => {
    let answerFirst: (value: unknown) => void = () => {}
    graphqlQuery
      .mockImplementationOnce(() => new Promise((resolve) => (answerFirst = resolve)))
      .mockResolvedValueOnce(status(true, 't1', P1))
      .mockResolvedValueOnce(status(true, 't2', P2))
    const first = disclosureVersion({ fresh: true })
    // The later request is the one kept, and it answers P1 first.
    await expect(disclosureVersion({ fresh: true })).resolves.toBe(`on:t1:d6:${P1}`)
    answerFirst(status(true, 't2', P2))
    await expect(first).resolves.toBe(`on:t2:d6:${P2}`)
    // The kept P1 is older than one seen: read again, never served.
    await expect(disclosureVersion()).resolves.toBe(`on:t2:d6:${P2}`)
  })

  it('a P2 answer to a P1 plan is refused, and remembered: a P1 answer after it is refused too', async () => {
    expect(() => assertServedUnder(`on:t1:d6:${P1}`, P2)).toThrow(DisclosureMismatchError)
    expect(() => assertServedUnder(`on:t1:d6:${P1}`, P1)).toThrow(DisclosureMismatchError)
  })

  it('an answer served under P1 after P2 was seen is refused, even when it was planned under P1', async () => {
    assertServedUnder(`on:t2:d6:${P2}`, P2)
    expect(() => assertServedUnder(`on:t1:d6:${P1}`, P1)).toThrow(DisclosureMismatchError)
    expect(() => assertServedUnder(`on:t2:d6:${P2}`, P2)).not.toThrow()
  })
})

describe('fresh reads', () => {
  it('a fresh read asks the API even within the minute, and the watcher always reads fresh', async () => {
    graphqlQuery.mockResolvedValueOnce(status(true, 't1', 'p1')).mockResolvedValueOnce(status(true, 't1', 'p2')).mockResolvedValueOnce(status(true, 't1', 'p3'))
    await expect(disclosureVersion()).resolves.toBe('on:t1:d6:p1')
    await expect(disclosureVersion()).resolves.toBe('on:t1:d6:p1')
    await expect(disclosureVersion({ fresh: true })).resolves.toBe('on:t1:d6:p2')
    await expect(readDisclosureNow()).resolves.toBe('on:t1:d6:p3')
    expect(graphqlQuery).toHaveBeenCalledTimes(3)
  })
})

describe('disclosureVersion', () => {
  it('names the switch and the publication', async () => {
    graphqlQuery.mockResolvedValue(status(true, '2026-11-18T03:10:00.123456Z'))
    await expect(disclosureVersion()).resolves.toBe('on:2026-11-18T03:10:00.123456Z:nod6:-')
  })

  it('keeps nothing while D6 is on and its supplier-privacy publication cannot be read', async () => {
    graphqlQuery.mockResolvedValue({ procurementDaRelease: { enabled: false, dataAsOf: null, privacyEnforced: true, privacyAsOf: null } })
    await expect(disclosureVersion()).resolves.toBeNull()
  })

  it('is unknown when the release cannot be read', async () => {
    graphqlQuery.mockRejectedValue(new Error('down'))
    await expect(disclosureVersion()).resolves.toBeNull()
  })
})

describe('daSupplierReads', () => {
  it('unread, asks nothing the D6 window refuses, and says the state unknown', async () => {
    graphqlQuery.mockRejectedValue(new Error('down'))
    await expect(daSupplierReads()).resolves.toEqual({ figures: false, places: false, known: false })
  })

  it('D6 on, release off: no supplier figures, no places', async () => {
    graphqlQuery.mockResolvedValue(status(false, null, 'p1'))
    await expect(daSupplierReads()).resolves.toEqual({ figures: false, places: false, known: true })
  })
})
