import { beforeEach, describe, expect, it, vi } from 'vitest'
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import {
  fetchInsEntityContext,
  insEntityContextPin,
  insEntityContextSelector,
} from './ins-entity-context'
import {
  detailBootstrapEntity,
  resolveDetailSelection,
} from '../../lib/source-selection'
import {
  parseTerritoryPin,
  parseComparisonToken,
  territoryPinToEntity,
} from '../../lib/dataset-selection'
import { insEntityContextFixture } from '../../test/ins-entity-context-fixtures'

vi.mock('@/lib/graphql/graphql-client', () => ({ graphqlQuery: vi.fn() }))
const query = vi.mocked(graphqlQuery)
const response = (ins: unknown = insEntityContextFixture()) => ({
  entity: { cui: '123', ins },
})
beforeEach(() => {
  query.mockReset()
})

describe('native entity INS context transport', () => {
  it('uses anonymous native entity context with cancellation and no legacy selector', async () => {
    query.mockResolvedValue(response())
    const signal = new AbortController().signal
    expect(await fetchInsEntityContext('123', signal)).toEqual(
      insEntityContextFixture(),
    )
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('ins { territoryCode'),
      { cui: '123' },
      { auth: 'none', signal },
    )
    expect(query.mock.calls[0][0]).not.toContain('presence')
  })
  it.each([null, { ...insEntityContextFixture(), datasetCount: 0 }])(
    'retains null versus zero coverage: %j',
    async (context) => {
      query.mockResolvedValue(response(context))
      expect(await fetchInsEntityContext('123')).toEqual(context)
    },
  )
  it('retains an absent entity as no context', async () => {
    query.mockResolvedValue({ entity: null })
    expect(await fetchInsEntityContext('123')).toBeNull()
  })
  it('does not turn transport failure into absent context', async () => {
    const failure = new Error('Read unavailable')
    query.mockRejectedValue(failure)
    await expect(fetchInsEntityContext('123')).rejects.toBe(failure)
  })
  it.each(['', 'RO123', '123x', '12345678901', '12345678901234'])(
    'rejects noncanonical or withheld CUI %s before reading',
    async (cui) => {
      await expect(fetchInsEntityContext(cui)).rejects.toBeInstanceOf(
        RangeError,
      )
      expect(query).not.toHaveBeenCalled()
    },
  )
  it('honors abort before and after the read', async () => {
    const before = new AbortController()
    before.abort()
    await expect(
      fetchInsEntityContext('123', before.signal),
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(query).not.toHaveBeenCalled()
    const after = new AbortController()
    query.mockImplementation(async () => {
      after.abort()
      return response()
    })
    await expect(
      fetchInsEntityContext('123', after.signal),
    ).rejects.toMatchObject({ name: 'AbortError' })
  })
  it.each([
    { territoryCode: '0', sirutaCode: '0' },
    { territoryCode: '54975', sirutaCode: null },
    { territoryCode: '179132', sirutaCode: '179141' },
    { territoryCode: 'RO11', territoryLevel: 'NUTS3', sirutaCode: null },
    { territoryCode: 'RO99', territoryLevel: 'NUTS2', sirutaCode: null },
    { territoryCode: 'cj', territoryLevel: 'NUTS3', sirutaCode: null },
    { datasetCount: -1 },
    { datasetCount: 1.5 },
    { datasetCount: 2147483648 },
  ])('rejects contradictory context %j', async (fields) => {
    query.mockResolvedValue(
      response({ ...insEntityContextFixture(), ...fields }),
    )
    await expect(fetchInsEntityContext('123')).rejects.toThrow()
  })
  it('rejects an unrelated entity response', async () => {
    query.mockResolvedValue({
      ...response(),
      entity: { ...response().entity, cui: '456' },
    })
    await expect(fetchInsEntityContext('123')).rejects.toThrow(
      'identity mismatch',
    )
  })
  it.each([
    ['RO', 'NATIONAL', null],
    ['RO1', 'NUTS1', null],
    ['RO4', 'NUTS1', null],
    ...['RO11', 'RO12', 'RO21', 'RO22', 'RO31', 'RO32', 'RO41', 'RO42'].map(
      (code) => [code, 'NUTS2', null],
    ),
    ['B', 'NUTS3', '403'],
    ['CJ', 'NUTS3', '54984'],
    ...[
      '179132',
      '179141',
      '179150',
      '179169',
      '179178',
      '179187',
      '179196',
      '54975',
    ].map((code) => [code, 'LAU', code]),
  ])(
    'round-trips canonical %s %s to detail scope without fiscal inference',
    async (code, level, siruta) => {
      query.mockResolvedValue(
        response({
          ...insEntityContextFixture(),
          territoryCode: code,
          territoryLevel: level,
          sirutaCode: siruta,
        }),
      )
      const context = await fetchInsEntityContext('123')
      if (context === null) throw new Error('Missing fixture context')
      const pin = insEntityContextPin(context)
      const selector = insEntityContextSelector(context)
      if (level === 'NUTS1' || level === 'NUTS2') {
        expect(parseComparisonToken(pin)).toBeNull()
      } else {
        expect(parseComparisonToken(pin)).toMatchObject({ code, level })
      }
      expect(territoryPinToEntity(parseTerritoryPin(pin))).toEqual(selector)
      expect(detailBootstrapEntity({ teritoriu: pin })).toEqual(selector)
      const resolved = resolveDetailSelection({
        search: { teritoriu: pin },
        dataset: null,
        latest: null,
      })
      expect(resolved.scope.territoryDefaulted).toBe(false)
      expect(resolved.scope.territoryMode).toBe('explicit')
      expect(resolved.issues).not.toContain('territory')
    },
  )
})
