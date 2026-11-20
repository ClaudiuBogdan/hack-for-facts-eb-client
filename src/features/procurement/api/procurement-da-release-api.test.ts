import { beforeEach, describe, expect, it, vi } from 'vitest'
import { daRecord } from '../lib/direct-purchase.fixture'
import { RELEASE_CASES, RELEASE_ID } from '../lib/direct-purchase-release.fixture'

const graphqlQuery = vi.fn()
vi.mock('@/lib/graphql/graphql-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/graphql/graphql-client')>()),
  graphqlQuery: (...args: unknown[]) => graphqlQuery(...args),
}))
const legacy = vi.hoisted(() => ({ fetchDirectPurchase: vi.fn(), readNames: vi.fn() }))
vi.mock('./procurement-direct-purchase-api', () => legacy)

const { GraphQLRequestError } = await import('@/lib/graphql/graphql-client')
const { NO_NAMES } = await import('../lib/direct-purchase-model')
const { fetchPurchaseForPage, isReleaseId, readDaRelease, resetDaReleaseForTests, resolveLegacyLink, resolveReleaseId } = await import('./procurement-da-release-api')

/**
 * The page's choice of surface: the API's capability decides, a release id
 * reads the release, a legacy id the legacy surface, and a legacy link is
 * resolved to the release's id by its portal code — or left alone.
 */

type Handler = (variables: Record<string, unknown>) => unknown

function answer(handlers: Readonly<Record<string, Handler>>) {
  graphqlQuery.mockImplementation((_query: string, variables: Record<string, unknown>, options: { readonly operationName: string }) => {
    const handler = handlers[options.operationName]
    if (!handler) return Promise.reject(new Error(`unexpected ${options.operationName}`))
    try {
      return Promise.resolve(handler(variables))
    } catch (error) {
      return Promise.reject(error)
    }
  })
}

const release = (enabled: boolean) => () => ({ procurementDaRelease: { enabled, dataAsOf: enabled ? '2026-11-18T04:00:00Z' : null, privacyEnforced: enabled, privacyAsOf: enabled ? '2026-11-18T02:00:00Z' : null } })
const unavailable = (code: string) => new GraphQLRequestError('no', { graphQLErrors: [{ message: 'no', extensions: { code } }] })

beforeEach(() => {
  graphqlQuery.mockReset()
  legacy.fetchDirectPurchase.mockReset()
  legacy.readNames.mockReset().mockResolvedValue(NO_NAMES)
  resetDaReleaseForTests()
})

describe('isReleaseId', () => {
  it.each([
    [RELEASE_ID, true],
    ['A'.repeat(64), false],
    ['a'.repeat(63), false],
    ['elicitatie_da:119279872', false],
    ['12345', false],
  ])('%s → %s', (id, expected) => {
    expect(isReleaseId(id)).toBe(expected)
  })
})

describe('fetchPurchaseForPage', () => {
  it('reads no purchase while D6 is on and its supplier-privacy publication cannot be read (fails closed, root)', async () => {
    answer({ ProcurementDaRelease: () => ({ procurementDaRelease: { enabled: true, dataAsOf: '2026-11-18T04:00:00Z', privacyEnforced: true, privacyAsOf: null } }) })
    await expect(fetchPurchaseForPage(RELEASE_ID)).rejects.toThrow('unreadable')
    await expect(fetchPurchaseForPage('12345')).rejects.toThrow('unreadable')
    expect(legacy.fetchDirectPurchase).not.toHaveBeenCalled()
    expect(graphqlQuery.mock.calls.every((call) => (call[2] as { operationName: string }).operationName === 'ProcurementDaRelease')).toBe(true)
  })

  it('a legacy id with the release off reads the legacy surface', async () => {
    answer({ ProcurementDaRelease: release(false) })
    legacy.fetchDirectPurchase.mockResolvedValue('legacy')
    await expect(fetchPurchaseForPage('12345')).resolves.toBe('legacy')
  })

  it('a legacy id the release has leads to the release’s purchase (the page then replaces the URL)', async () => {
    const { grain: _grain, stateId: _stateId, ...record } = daRecord()
    answer({
      ProcurementDaRelease: release(true),
      ProcurementDirectAcquisitionRecord: () => ({ procurementDirectAcquisition: { directAcquisition: { ...record, sourceSystem: 'elicitatie_da', uniqueCode: 'DA37709621' } } }),
      ProcurementDaLookup: () => ({ procurementDaPurchases: { items: [{ purchaseId: RELEASE_ID }], total: 1 } }),
      ProcurementDaPurchase: () => ({ procurementDaPurchase: RELEASE_CASES.countedAsReported() }),
    })
    await expect(fetchPurchaseForPage('12345')).resolves.toMatchObject({ id: RELEASE_ID, money: { kind: 'counted' } })
    expect(legacy.fetchDirectPurchase).not.toHaveBeenCalled()
  })

  it('a legacy link it cannot resolve fails the read — never a legacy page the next read would replace', async () => {
    answer({
      ProcurementDaRelease: release(true),
      ProcurementDirectAcquisitionRecord: () => {
        throw new Error('down')
      },
    })
    await expect(fetchPurchaseForPage('12345')).rejects.toThrow('Could not tell')
    expect(legacy.fetchDirectPurchase).not.toHaveBeenCalled()
  })

  it('a legacy id the release does not have stays legacy', async () => {
    answer({ ProcurementDaRelease: release(true), ProcurementDirectAcquisitionRecord: () => ({ procurementDirectAcquisition: null }) })
    legacy.fetchDirectPurchase.mockResolvedValue(null)
    await expect(fetchPurchaseForPage('12345')).resolves.toBeNull()
    expect(legacy.fetchDirectPurchase).toHaveBeenCalledWith('12345', undefined)
  })

  it('a release id with the release on reads the release, and the buyer’s names only', async () => {
    answer({ ProcurementDaRelease: release(true), ProcurementDaPurchase: () => ({ procurementDaPurchase: RELEASE_CASES.naturalPerson() }) })
    const purchase = await fetchPurchaseForPage(RELEASE_ID)
    expect(purchase).toMatchObject({ id: RELEASE_ID, supplier: { withheld: 'natural-person', name: '' }, money: { kind: 'counted', value: 900 } })
    expect(legacy.readNames).toHaveBeenCalledWith(['361684'], ['03121210'], '361684', undefined)
    expect(legacy.fetchDirectPurchase).not.toHaveBeenCalled()
  })

  it('a release id with the release off has no purchase', async () => {
    answer({ ProcurementDaRelease: release(false) })
    await expect(fetchPurchaseForPage(RELEASE_ID)).resolves.toBeNull()
  })

  it('a release id the release does not have is no purchase', async () => {
    answer({
      ProcurementDaRelease: release(true),
      ProcurementDaPurchase: () => {
        throw unavailable('NOT_FOUND')
      },
    })
    await expect(fetchPurchaseForPage(RELEASE_ID)).resolves.toBeNull()
  })

  it('a failed capability read fails the page’s read — never „not found"', async () => {
    answer({
      ProcurementDaRelease: () => {
        throw new Error('down')
      },
    })
    await expect(fetchPurchaseForPage(RELEASE_ID)).rejects.toThrow('down')
  })

  it('the release switched off under a reader fails its read', async () => {
    answer({
      ProcurementDaRelease: release(true),
      ProcurementDaPurchase: () => {
        throw unavailable('SERVICE_UNAVAILABLE')
      },
    })
    await expect(fetchPurchaseForPage(RELEASE_ID)).rejects.toBeInstanceOf(GraphQLRequestError)
  })
})

describe('readDaRelease', () => {
  it('is read once and shared', async () => {
    answer({ ProcurementDaRelease: release(true) })
    await readDaRelease()
    await readDaRelease()
    expect(graphqlQuery).toHaveBeenCalledTimes(1)
  })

  it('a failure is not kept', async () => {
    let calls = 0
    answer({
      ProcurementDaRelease: () => {
        calls += 1
        if (calls === 1) throw new Error('down')
        return release(true)()
      },
    })
    await expect(readDaRelease()).rejects.toThrow('down')
    await expect(readDaRelease()).resolves.toEqual({ enabled: true, dataAsOf: '2026-11-18T04:00:00Z', privacyEnforced: true, privacyAsOf: '2026-11-18T02:00:00Z' })
  })
})

describe('resolveReleaseId', () => {
  /** The legacy record as the API answers it. */
  const legacyRecord = (fields: Record<string, unknown> = {}) => {
    const { grain: _grain, stateId: _stateId, ...record } = daRecord()
    return { procurementDirectAcquisition: { directAcquisition: { ...record, sourceSystem: 'elicitatie_da', uniqueCode: 'DA37709621', ...fields } } }
  }
  const lookup = (items: readonly string[], seen: unknown[] = []) => (variables: Record<string, unknown>) => {
    seen.push(variables)
    return { procurementDaPurchases: { items: items.map((purchaseId) => ({ purchaseId })), total: items.length } }
  }

  it('with the release off, a legacy link stays', async () => {
    answer({ ProcurementDaRelease: release(false) })
    await expect(resolveReleaseId('12345')).resolves.toBeNull()
  })

  it('finds the release id by the portal code', async () => {
    const seen: unknown[] = []
    answer({ ProcurementDaRelease: release(true), ProcurementDirectAcquisitionRecord: () => legacyRecord(), ProcurementDaLookup: lookup([RELEASE_ID], seen) })
    await expect(resolveReleaseId('12345')).resolves.toBe(RELEASE_ID)
    expect(seen).toEqual([{ code: 'DA37709621' }])
  })

  it('a code two release purchases share resolves to neither', async () => {
    answer({ ProcurementDaRelease: release(true), ProcurementDirectAcquisitionRecord: () => legacyRecord(), ProcurementDaLookup: lookup([RELEASE_ID, 'b'.repeat(64)]) })
    await expect(resolveReleaseId('12345')).resolves.toBeNull()
  })

  it('a record from another SEAP source is not in the release', async () => {
    answer({ ProcurementDaRelease: release(true), ProcurementDirectAcquisitionRecord: () => legacyRecord({ sourceSystem: 'seap_dan' }), ProcurementDaLookup: lookup([RELEASE_ID]) })
    await expect(resolveReleaseId('12345')).resolves.toBeNull()
  })

  it('a missing legacy record resolves to nothing', async () => {
    answer({ ProcurementDaRelease: release(true), ProcurementDirectAcquisitionRecord: () => ({ procurementDirectAcquisition: null }) })
    await expect(resolveReleaseId('12345')).resolves.toBeNull()
  })

  it('a release id is never resolved', async () => {
    await expect(resolveReleaseId(RELEASE_ID)).resolves.toBeNull()
    expect(graphqlQuery).not.toHaveBeenCalled()
  })

  it('a failed read leaves the legacy page', async () => {
    answer({
      ProcurementDaRelease: () => {
        throw new Error('down')
      },
    })
    await expect(resolveReleaseId('12345')).resolves.toBeNull()
  })
})

describe('resolveLegacyLink', () => {
  it('tells release, legacy and failed apart', async () => {
    const { grain: _grain, stateId: _stateId, ...record } = daRecord()
    const legacyRecord = { procurementDirectAcquisition: { directAcquisition: { ...record, sourceSystem: 'elicitatie_da', uniqueCode: 'DA37709621' } } }
    answer({ ProcurementDaRelease: release(true), ProcurementDirectAcquisitionRecord: () => legacyRecord, ProcurementDaLookup: () => ({ procurementDaPurchases: { items: [{ purchaseId: RELEASE_ID }], total: 1 } }) })
    await expect(resolveLegacyLink('12345')).resolves.toEqual({ kind: 'release', id: RELEASE_ID })
    answer({ ProcurementDaRelease: release(true), ProcurementDirectAcquisitionRecord: () => legacyRecord, ProcurementDaLookup: () => ({ procurementDaPurchases: { items: [], total: 0 } }) })
    await expect(resolveLegacyLink('12345')).resolves.toEqual({ kind: 'legacy' })
    answer({
      ProcurementDaRelease: release(true),
      ProcurementDirectAcquisitionRecord: () => legacyRecord,
      ProcurementDaLookup: () => {
        throw new Error('timeout')
      },
    })
    await expect(resolveLegacyLink('12345')).resolves.toEqual({ kind: 'failed' })
  })
})
