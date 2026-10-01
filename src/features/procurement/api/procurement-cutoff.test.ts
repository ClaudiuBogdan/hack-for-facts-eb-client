import { beforeEach, describe, expect, it, vi } from 'vitest'

const graphqlQuery = vi.fn()
vi.mock('@/lib/graphql/graphql-client', () => ({ graphqlQuery: (...args: unknown[]) => graphqlQuery(...args) }))

const { forgetProcurementCutoff, readCutoffOutcome, readProcurementCutoff, untilAborted } = await import('./procurement-cutoff')

const series = (points: Record<string, string>, buildId = '13') => [{ points: Object.entries(points).map(([bucket, value]) => ({ bucket, value })), meta: { buildId } }]
const months = (year: number, count: string, through = 12) =>
  Object.fromEntries(Array.from({ length: through }, (_, index) => [`${year}-${String(index + 1).padStart(2, '0')}`, count]))

/** The national months: a full year, then the year after through `through` and a trickle past it. */
function national(latest: number, through: number, builds: readonly [string, string] = ['13', '13']) {
  return {
    nationalDirectMonths: series({ ...months(latest, '150000'), ...months(latest + 1, '150000', through), [`${latest + 1}-${String(through + 1).padStart(2, '0')}`]: '600' }, builds[0]),
    nationalAwardMonths: series({ ...months(latest, '3000'), ...months(latest + 1, '3000', through) }, builds[1]),
  }
}

beforeEach(() => {
  graphqlQuery.mockReset()
})

describe('readProcurementCutoff', () => {
  it('dates each population by its last full month, past the trickle after it', async () => {
    graphqlQuery.mockResolvedValue(national(1980, 5))
    expect(await readProcurementCutoff(1980, 0)).toEqual({ direct: '1981-05', contract: '1981-05', build: '13' })
    expect(graphqlQuery.mock.calls[0]?.[2]).toMatchObject({ operationName: 'ProcurementCutoff' })
    // The build the months come from rides with them: a page pins its reads to it.
    expect(graphqlQuery.mock.calls[0]?.[0]).toContain('meta { buildId }')
  })

  it('reads the national months once for ten minutes, and forgets a failed read', async () => {
    graphqlQuery.mockResolvedValue(national(1990, 12))
    await readProcurementCutoff(1990, 0)
    await readProcurementCutoff(1990, 60_000)
    expect(graphqlQuery).toHaveBeenCalledTimes(1)
    await readProcurementCutoff(1990, 11 * 60_000)
    expect(graphqlQuery).toHaveBeenCalledTimes(2)
    graphqlQuery.mockRejectedValue(new Error('down'))
    await expect(readProcurementCutoff(1991, 0)).rejects.toThrow('down')
    graphqlQuery.mockResolvedValue(national(1991, 3))
    await expect(readProcurementCutoff(1991, 1)).resolves.toEqual({ direct: '1992-03', contract: '1992-03', build: '13' })
  })

  it('refuses months read from two builds, and reads again once forgotten', async () => {
    graphqlQuery.mockResolvedValue(national(1970, 6, ['12', '13']))
    await expect(readProcurementCutoff(1970, 0)).rejects.toThrow('two analysis builds')
    graphqlQuery.mockResolvedValue(national(1971, 6, ['13', '13']))
    await readProcurementCutoff(1971, 0)
    forgetProcurementCutoff(1971)
    graphqlQuery.mockResolvedValue(national(1971, 6, ['14', '14']))
    await expect(readProcurementCutoff(1971, 1)).resolves.toMatchObject({ build: '14' })
  })

  it('answers a failed read as no cutoff, said', async () => {
    graphqlQuery.mockRejectedValue(new Error('down'))
    expect(await readCutoffOutcome(1995)).toEqual({ cutoff: { direct: null, contract: null }, build: null, failed: true })
  })
})

describe('untilAborted', () => {
  it('waits for a shared read, but not past the reader leaving', async () => {
    const controller = new AbortController()
    const waiting = untilAborted(new Promise(() => undefined), controller.signal)
    controller.abort(new Error('left'))
    await expect(waiting).rejects.toThrow('left')
    await expect(untilAborted(Promise.resolve(3), new AbortController().signal)).resolves.toBe(3)
  })
})
