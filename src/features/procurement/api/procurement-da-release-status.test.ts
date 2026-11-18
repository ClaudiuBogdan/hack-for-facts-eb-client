import { beforeEach, describe, expect, it, vi } from 'vitest'

const graphqlQuery = vi.fn()
vi.mock('@/lib/graphql/graphql-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/graphql/graphql-client')>()),
  graphqlQuery: (...args: unknown[]) => graphqlQuery(...args),
}))

const { disclosureVersion, resetDaReleaseForTests, underDisclosure } = await import('./procurement-da-release-status')

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

describe('underDisclosure', () => {
  it('keeps an answer under its publication, so the next publication reads afresh', async () => {
    const memo = vi.fn((key: string, read: () => Promise<string>) => read().then((value) => `${key}=>${value}`))
    graphqlQuery.mockResolvedValue(status(true, 't1'))
    await expect(underDisclosure(memo, '123', () => Promise.resolve('a'))).resolves.toBe('on:t1:nod6:-|123=>a')
    resetDaReleaseForTests()
    graphqlQuery.mockResolvedValue(status(true, 't2'))
    await expect(underDisclosure(memo, '123', () => Promise.resolve('b'))).resolves.toBe('on:t2:nod6:-|123=>b')
  })

  it('a supplier-privacy publication is a new publication, whatever the release switch says', async () => {
    const memo = vi.fn((key: string, read: () => Promise<string>) => read().then(() => key))
    graphqlQuery.mockResolvedValue(status(false, null, 'p1'))
    await expect(underDisclosure(memo, '123', () => Promise.resolve('x'))).resolves.toBe('off:-:d6:p1|123')
    resetDaReleaseForTests()
    graphqlQuery.mockResolvedValue(status(false, null, 'p2'))
    await expect(underDisclosure(memo, '123', () => Promise.resolve('x'))).resolves.toBe('off:-:d6:p2|123')
  })

  it('a switch is a new publication', async () => {
    const memo = vi.fn((key: string, read: () => Promise<string>) => read().then(() => key))
    graphqlQuery.mockResolvedValue(status(false, null))
    await expect(underDisclosure(memo, '123', () => Promise.resolve('x'))).resolves.toBe('off:-:nod6:-|123')
  })

  it('an unknown publication keeps nothing: a fresh read, past the memo', async () => {
    const memo = vi.fn()
    graphqlQuery.mockRejectedValue(new Error('down'))
    await expect(underDisclosure(memo, '123', () => Promise.resolve('fresh'))).resolves.toBe('fresh')
    expect(memo).not.toHaveBeenCalled()
  })
})
