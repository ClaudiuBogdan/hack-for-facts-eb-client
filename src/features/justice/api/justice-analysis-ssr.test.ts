import { hashKey } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { analysisFixtureReads } from '../fixtures/judicial-fixtures'
import { analysisReads, caseloadKey, type CaseloadRead } from '../lib/analysis-plans'
import { questionOf } from '../lib/analysis-model'

const fetchCaseload = vi.fn()
vi.mock('./judicial-analysis-api', async (importOriginal) => ({ ...(await importOriginal<typeof import('./judicial-analysis-api')>()), fetchCaseload: (...args: unknown[]) => fetchCaseload(...args) }))

const recorded = (read: CaseloadRead) => analysisFixtureReads.find((item) => hashKey(caseloadKey(item)) === hashKey(caseloadKey(read)))?.answer

/** A fresh module per test: the server's reads are kept across requests. */
async function readFor(search: Record<string, unknown>) {
  vi.resetModules()
  const { readAnalysisForSsr } = await import('./justice-analysis-ssr')
  return readAnalysisForSsr(search)
}

beforeEach(() => {
  fetchCaseload.mockReset()
  fetchCaseload.mockImplementation((read: CaseloadRead) => Promise.resolve(recorded(read)))
})

describe('the analysis page’s server read', () => {
  it('reads every read the question needs, once each, and seeds them under the page’s own keys', async () => {
    const read = await readFor({})
    const planned = new Set(analysisReads(questionOf({})).map((item) => hashKey(caseloadKey(item))))
    expect(read.complete).toBe(true)
    expect(fetchCaseload).toHaveBeenCalledTimes(planned.size)
    expect(new Set(read.seed.map((item) => hashKey(item.key)))).toEqual(planned)
  })

  it('reads the question, not the address: an unknown value reads as the default', async () => {
    const read = await readFor({ materie: 'Ion Popescu', an: 1999 })
    expect(read.seed.map((item) => hashKey(item.key)).sort()).toEqual([...new Set(analysisReads(questionOf({})).map((item) => hashKey(caseloadKey(item))))].sort())
  })

  it('sends a render with a failed read as incomplete, with what it did read', async () => {
    fetchCaseload.mockImplementation((read: CaseloadRead) => (read.groupBy === 'year' ? Promise.reject(new Error('deadline')) : Promise.resolve(recorded(read))))
    const read = await readFor({})
    expect(read.complete).toBe(false)
    expect(read.seed.length).toBeGreaterThan(0)
    expect(read.seed.some((item) => item.key.includes('year'))).toBe(false)
  })

  it('makes no read for a question no case can match', async () => {
    const read = await readFor({ judet: 'CJ', instanta: 'TribunalulTIMIS' })
    // Every read is bounded by the impossible place: the page answers zero without asking.
    expect(fetchCaseload).not.toHaveBeenCalled()
    expect(read).toEqual({ seed: [], complete: true })
  })
})
