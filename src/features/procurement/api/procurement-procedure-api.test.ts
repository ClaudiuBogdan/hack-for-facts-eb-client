import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cnirRaw, legacyRaw } from '../lib/procedure.fixture'

const graphqlQuery = vi.fn()
vi.mock('@/lib/graphql/graphql-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/graphql/graphql-client')>()),
  graphqlQuery: (...args: unknown[]) => graphqlQuery(...args),
}))

const { fetchProcedure } = await import('./procurement-procedure-api')

/** The page's read: a missing notice is `null`, never an error; the names fail soft, and the sheet is then `partial`. */

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

const NAMES = { labels: [], cpv: [{ cpvCode: '45233100', labelRo: 'Lucrări de construcții de autostrăzi și de drumuri', labelEn: 'Motorway and road construction works' }] }

beforeEach(() => {
  graphqlQuery.mockReset()
})

describe('fetchProcedure', () => {
  it('answers a notice SEAP does not have with null, reading nothing else', async () => {
    answer({ ProcurementProcedurePage: () => ({ procurementProcedure: null }) })
    await expect(fetchProcedure('missing')).resolves.toBeNull()
    expect(graphqlQuery).toHaveBeenCalledTimes(1)
  })

  it('reads the notice, then the names of everyone in it and its category', async () => {
    answer({ ProcurementProcedurePage: () => ({ procurementProcedure: cnirRaw() }), ProcurementDirectPurchaseNames: () => NAMES })
    const sheet = await fetchProcedure('337399')
    expect(sheet?.id).toBe('337399')
    expect(sheet?.cpv?.label?.ro).toBe('Lucrări de construcții de autostrăzi și de drumuri')
    expect(sheet?.partial).toBe(false)
    const names = graphqlQuery.mock.calls.find((call) => (call[2] as { readonly operationName: string }).operationName === 'ProcurementDirectPurchaseNames')?.[1] as { readonly cuis: readonly string[]; readonly codes: readonly string[] }
    expect([...names.cuis].sort()).toEqual(['17042060', '31994414', '36727850', '9942680'])
    expect(names.codes).toEqual(['45233100'])
  })

  it('names the other institutions SEAP joins by mistake too', async () => {
    answer({ ProcurementProcedurePage: () => ({ procurementProcedure: legacyRaw() }), ProcurementDirectPurchaseNames: () => ({ labels: [], cpv: [] }) })
    await fetchProcedure('35106757')
    const names = graphqlQuery.mock.calls[1]?.[1] as { readonly cuis: readonly string[] }
    expect(names.cuis).toEqual(expect.arrayContaining(['10874881', '4267117', '2845710', '1565534']))
  })

  it('stands on its own names when the names fail, and says it is partial', async () => {
    answer({
      ProcurementProcedurePage: () => ({ procurementProcedure: cnirRaw() }),
      ProcurementDirectPurchaseNames: () => {
        throw new Error('names down')
      },
    })
    const sheet = await fetchProcedure('337399')
    expect(sheet?.partial).toBe(true)
    expect(sheet?.authority.name).toBeTruthy()
  })

  it('fails as a read when the notice cannot be read', async () => {
    answer({
      ProcurementProcedurePage: () => {
        throw new Error('API down')
      },
    })
    await expect(fetchProcedure('337399')).rejects.toThrow('API down')
  })
})
