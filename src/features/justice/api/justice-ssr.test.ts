import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const fetchCaseExists = vi.fn()
vi.mock('./judicial-case-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./judicial-case-api')>()),
  fetchCaseExists: (...args: unknown[]) => fetchCaseExists(...args),
}))

const ICCJ = 'InaltaCurtedeCasatiesiJustitie'

/** A fresh module per test: the server keeps the probe's answers across requests. */
async function probe() {
  vi.resetModules()
  return (await import('./justice-ssr')).caseSurelyAbsentForSsr
}

beforeEach(() => {
  fetchCaseExists.mockReset()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('the ÎCCJ case’s existence probe', () => {
  it('says a case is absent only on the API’s own „none"', async () => {
    const absent = await probe()
    fetchCaseExists.mockResolvedValueOnce(false)
    await expect(absent(ICCJ, '9999999/1/2025')).resolves.toBe(true)
    fetchCaseExists.mockResolvedValueOnce(true)
    await expect(absent(ICCJ, '656/1/2025')).resolves.toBe(false)
  })

  it('treats a failed read as not knowing, and reads it again next time', async () => {
    const absent = await probe()
    fetchCaseExists.mockRejectedValueOnce(new Error('deadline'))
    await expect(absent(ICCJ, '1/1/2025')).resolves.toBe(false)
    fetchCaseExists.mockResolvedValueOnce(false)
    await expect(absent(ICCJ, '1/1/2025')).resolves.toBe(true)
    expect(fetchCaseExists).toHaveBeenCalledTimes(2)
  })

  it('waits for a slow answer a moment only, and the next render of that case knows at once', async () => {
    const absent = await probe()
    let answer: (exists: boolean) => void = () => undefined
    fetchCaseExists.mockReturnValueOnce(new Promise<boolean>((resolve) => (answer = resolve)))
    const first = absent(ICCJ, '997/83/2023')
    await vi.advanceTimersByTimeAsync(600)
    await expect(first).resolves.toBe(false)
    answer(true)
    await expect(absent(ICCJ, '997/83/2023')).resolves.toBe(false)
    // One read, shared: the second render took the first one's answer.
    expect(fetchCaseExists).toHaveBeenCalledTimes(1)
  })

  it('keeps an absence it read, without reading again', async () => {
    const absent = await probe()
    fetchCaseExists.mockResolvedValueOnce(false)
    await absent(ICCJ, '9999999/1/2025')
    await expect(absent(ICCJ, '9999999/1/2025')).resolves.toBe(true)
    expect(fetchCaseExists).toHaveBeenCalledTimes(1)
  })
})
