import { beforeEach, describe, expect, it, vi } from 'vitest'
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { DERIVED_READS, derivedReadKey } from '../../lib/territory-derived'
import { buildTerritoryDerivedQuery, fetchTerritoryDerivedScope } from './territory-derived-fetcher'

vi.mock('@/lib/graphql/graphql-client', () => ({ graphqlQuery: vi.fn() }))
const query = vi.mocked(graphqlQuery)
beforeEach(() => {
  query.mockReset()
})

const indexOf = (code: string) => DERIVED_READS.findIndex((r) => r.code === code)
const keyOf = (code: string) => derivedReadKey(DERIVED_READS[indexOf(code)]!)
const node = (year: number, value: string | null, value_status: string | null = null) => ({
  value,
  value_status,
  time_period: { year },
})

describe('fetchTerritoryDerivedScope', () => {
  it('asks every read once, aliased, with the scope and its pins as variables', async () => {
    query.mockResolvedValue({})
    const signal = new AbortController().signal
    await fetchTerritoryDerivedScope({ scope: { sirutaCodes: ['54975'] }, lastYear: 2027, signal })
    const [document, variables, options] = query.mock.calls[0]!
    expect(document).toBe(buildTerritoryDerivedQuery(DERIVED_READS))
    expect(document).toContain(`r${indexOf('POP201D')}: insObservations(datasetCode: "POP201D"`)
    expect(document).toContain('value_status')
    expect((variables as Record<string, unknown>)[`f${indexOf('POP107D')}`]).toEqual({
      sirutaCodes: ['54975'],
      sourcePins: DERIVED_READS[indexOf('POP107D')]!.pins,
      period: { type: 'YEAR', selection: { interval: { start: '2008', end: '2027' } } },
    })
    expect(options).toEqual({ auth: 'none', signal, operationName: 'TerritoryDerivedIndicators' })
  })

  it('reads a cell flagged as having no number as none — never zero — and keeps any other flag', async () => {
    query.mockResolvedValue({
      [`r${indexOf('POP201D')}`]: {
        nodes: [node(2023, '1000'), node(2024, '950', 'c'), node(2025, '911', 'p'), node(2022, ' ')],
      },
    })
    const scope = await fetchTerritoryDerivedScope({ scope: { territoryCodes: ['RO'] }, lastYear: 2027 })
    const births = scope.series.get(keyOf('POP201D'))!
    expect([...births.entries()]).toEqual([
      [2023, 1000],
      [2024, null],
      [2025, 911],
      [2022, null],
    ])
    expect([...scope.flags.get(keyOf('POP201D'))!.entries()]).toEqual([[2025, 'p']])
    // An alias the API answered with nothing is an empty series: every cell absent.
    expect(scope.series.get(keyOf('POP206D'))?.size).toBe(0)
  })
})
