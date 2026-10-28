import { afterEach, describe, expect, it, vi } from 'vitest'
import { createServerMemo } from './server-memo'

/** Lets every settled promise's handlers run. */
const flush = async () => {
  for (let i = 0; i < 5; i += 1) await Promise.resolve()
}

/** A read the test resolves or rejects by hand. */
function deferred<T>() {
  let resolve: (value: T) => void = () => undefined
  let reject: (error: unknown) => void = () => undefined
  const promise = new Promise<T>((done, fail) => {
    resolve = done
    reject = fail
  })
  return { promise, resolve, reject }
}

describe('createServerMemo', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('answers from memory inside the window', async () => {
    const memo = createServerMemo<number>(1_000)
    const read = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2)
    expect(await memo('k', read, 0)).toBe(1)
    expect(await memo('k', read, 999)).toBe(1)
    expect(read).toHaveBeenCalledTimes(1)
  })

  it('past the window serves the kept read at once and refreshes it in the background', async () => {
    const memo = createServerMemo<number>(1_000)
    const next = deferred<number>()
    const read = vi.fn().mockResolvedValueOnce(1).mockReturnValueOnce(next.promise)
    expect(await memo('k', read, 0)).toBe(1)
    // Expired: the kept read answers, and one refresh starts.
    expect(await memo('k', read, 1_000)).toBe(1)
    expect(read).toHaveBeenCalledTimes(2)
    // Still refreshing: the kept read answers again, and no second refresh starts.
    expect(await memo('k', read, 1_100)).toBe(1)
    expect(read).toHaveBeenCalledTimes(2)
    next.resolve(2)
    await flush()
    // The refresh is kept, with a window of its own from when it started.
    expect(await memo('k', read, 1_200)).toBe(2)
    expect(await memo('k', read, 1_999)).toBe(2)
    expect(read).toHaveBeenCalledTimes(2)
  })

  it('shares one flight between concurrent callers', async () => {
    const memo = createServerMemo<string>(1_000)
    const flight = deferred<string>()
    const read = vi.fn(() => flight.promise)
    const first = memo('k', read, 0)
    const second = memo('k', read, 1)
    flight.resolve('shared')
    expect(await Promise.all([first, second])).toEqual(['shared', 'shared'])
    expect(read).toHaveBeenCalledTimes(1)
  })

  it('shares one refresh between concurrent callers past the window', async () => {
    const memo = createServerMemo<string>(1_000)
    const next = deferred<string>()
    const read = vi.fn().mockResolvedValueOnce('old').mockReturnValueOnce(next.promise)
    await memo('k', read, 0)
    const served = await Promise.all([memo('k', read, 1_500), memo('k', read, 1_501), memo('k', read, 1_502)])
    expect(served).toEqual(['old', 'old', 'old'])
    expect(read).toHaveBeenCalledTimes(2)
    next.resolve('new')
    await flush()
    expect(await memo('k', read, 1_600)).toBe('new')
    expect(read).toHaveBeenCalledTimes(2)
  })

  it('drops a failed first read at once, so the next caller reads again', async () => {
    const memo = createServerMemo<number>(1_000)
    const read = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce(3)
    await expect(memo('k', read, 0)).rejects.toThrow('down')
    expect(await memo('k', read, 1)).toBe(3)
  })

  it('keeps the kept read when a refresh fails, and the next caller past the window refreshes again', async () => {
    const memo = createServerMemo<number>(1_000)
    const read = vi.fn().mockResolvedValueOnce(1).mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce(2)
    await memo('k', read, 0)
    expect(await memo('k', read, 1_000)).toBe(1)
    await flush()
    // The failed refresh left the kept read in place; this caller starts the next refresh.
    expect(await memo('k', read, 1_100)).toBe(1)
    expect(read).toHaveBeenCalledTimes(3)
    await flush()
    expect(await memo('k', read, 1_200)).toBe(2)
  })

  it('keeps the kept read when a refresh throws before it returns a promise', async () => {
    const memo = createServerMemo<number>(1_000)
    const read = vi
      .fn<() => Promise<number>>()
      .mockResolvedValueOnce(1)
      .mockImplementationOnce(() => {
        throw new Error('sync')
      })
    await memo('k', read, 0)
    expect(await memo('k', read, 1_000)).toBe(1)
    await flush()
    expect(await memo('k', read, 1_001)).toBe(1)
  })

  it('keeps keys apart', async () => {
    const memo = createServerMemo<string>(1_000)
    expect(await memo('a', async () => 'a', 0)).toBe('a')
    expect(await memo('b', async () => 'b', 0)).toBe('b')
  })

  it('drops a first read that resolved but should not be kept, so the next caller reads again', async () => {
    const memo = createServerMemo<{ readonly partial: boolean }>(1_000, { keep: (value) => !value.partial })
    const read = vi.fn().mockResolvedValueOnce({ partial: true }).mockResolvedValueOnce({ partial: false })
    expect(await memo('k', read, 0)).toEqual({ partial: true })
    expect(await memo('k', read, 1)).toEqual({ partial: false })
    expect(await memo('k', read, 2)).toEqual({ partial: false })
    expect(read).toHaveBeenCalledTimes(2)
  })

  it('keeps the kept read when a refresh resolves but should not be kept', async () => {
    const memo = createServerMemo<{ readonly partial: boolean; readonly n: number }>(1_000, { keep: (value) => !value.partial })
    const read = vi
      .fn()
      .mockResolvedValueOnce({ partial: false, n: 1 })
      .mockResolvedValueOnce({ partial: true, n: 2 })
      .mockResolvedValueOnce({ partial: false, n: 3 })
    await memo('k', read, 0)
    expect(await memo('k', read, 1_000)).toEqual({ partial: false, n: 1 })
    await flush()
    expect(await memo('k', read, 1_001)).toEqual({ partial: false, n: 1 })
    await flush()
    expect(await memo('k', read, 1_002)).toEqual({ partial: false, n: 3 })
    expect(read).toHaveBeenCalledTimes(3)
  })

  it('reads a first read still in flight past its window again, as before', async () => {
    const memo = createServerMemo<number>(1_000)
    const stuck = deferred<number>()
    const read = vi.fn().mockReturnValueOnce(stuck.promise).mockResolvedValueOnce(2)
    void memo('k', read, 0)
    expect(await memo('k', read, 1_000)).toBe(2)
    // The late first read does not displace the newer one.
    stuck.resolve(1)
    await flush()
    expect(await memo('k', read, 1_001)).toBe(2)
  })

  it('holds at most maxEntries keys: the expired go first, then the oldest', async () => {
    const memo = createServerMemo<string>(1_000, { maxEntries: 2 })
    const read = vi.fn(async () => 'value')
    await memo('a', read, 0)
    await memo('b', read, 500)
    // „a" has expired by 1_200 and makes room; „b" stays.
    await memo('c', read, 1_200)
    await memo('b', read, 1_300)
    expect(read).toHaveBeenCalledTimes(3)
    // Nothing expired at 1_400: the oldest („b") goes, „c" stays.
    await memo('d', read, 1_400)
    await memo('c', read, 1_450)
    expect(read).toHaveBeenCalledTimes(4)
    await memo('b', read, 1_500)
    expect(read).toHaveBeenCalledTimes(5)
  })

  it('drops a refresh whose key was evicted meanwhile', async () => {
    const memo = createServerMemo<string>(1_000, { maxEntries: 1 })
    const next = deferred<string>()
    const read = vi.fn().mockResolvedValueOnce('a1').mockReturnValueOnce(next.promise).mockResolvedValue('b')
    await memo('a', read, 0)
    expect(await memo('a', read, 1_000)).toBe('a1')
    // „b" needs the only slot: the stale „a" goes.
    await memo('b', read, 1_001)
    next.resolve('a2')
    await flush()
    // „a" is read afresh, not answered by the orphaned refresh.
    read.mockResolvedValueOnce('a3')
    expect(await memo('a', read, 1_002)).toBe('a3')
  })

  it('counts a refreshed key as the newest when making room', async () => {
    const memo = createServerMemo<string>(1_000, { maxEntries: 2 })
    const read = vi.fn(async () => 'value')
    await memo('a', read, 0)
    await memo('b', read, 100)
    // „a" expires and is refreshed at 1_050; „b" is still inside its window.
    await memo('a', read, 1_050)
    await flush()
    expect(read).toHaveBeenCalledTimes(3)
    // At 1_060 nothing has expired: the oldest is now „b", not the refreshed „a".
    await memo('c', read, 1_060)
    await memo('a', read, 1_070)
    expect(read).toHaveBeenCalledTimes(4)
  })

  it('on the clock: a render past the window does not wait for the slow read', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    const memo = createServerMemo<number>(10 * 60 * 1000)
    let value = 0
    // A front-door read: 1.5 s against the API.
    const slowRead = vi.fn(
      () =>
        new Promise<number>((resolve) => {
          value += 1
          const answer = value
          setTimeout(() => resolve(answer), 1_500)
        }),
    )
    const first = memo('2026', slowRead)
    await vi.advanceTimersByTimeAsync(1_500)
    expect(await first).toBe(1)

    // Eleven minutes later the window has passed.
    await vi.advanceTimersByTimeAsync(11 * 60 * 1000)
    let served: number | undefined
    void memo('2026', slowRead).then((answer) => (served = answer))
    await flush()
    // Answered without the clock moving: the kept read, at once.
    expect(served).toBe(1)
    expect(slowRead).toHaveBeenCalledTimes(2)

    // The refresh lands 1.5 s later, and the next render has it.
    await vi.advanceTimersByTimeAsync(1_500)
    let next: number | undefined
    void memo('2026', slowRead).then((answer) => (next = answer))
    await flush()
    expect(next).toBe(2)
    expect(slowRead).toHaveBeenCalledTimes(2)
  })
})
