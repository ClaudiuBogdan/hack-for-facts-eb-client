import { describe, expect, it, vi } from 'vitest'
import { createServerMemo } from './server-memo'

describe('createServerMemo', () => {
  it('answers from memory inside the window, and reads again after it', async () => {
    const memo = createServerMemo<number>(1_000)
    const read = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2)
    expect(await memo('k', read, 0)).toBe(1)
    expect(await memo('k', read, 999)).toBe(1)
    expect(read).toHaveBeenCalledTimes(1)
    expect(await memo('k', read, 1_000)).toBe(2)
    expect(read).toHaveBeenCalledTimes(2)
  })

  it('shares one flight between concurrent callers', async () => {
    const memo = createServerMemo<string>(1_000)
    let resolve: (value: string) => void = () => undefined
    const read = vi.fn(() => new Promise<string>((done) => (resolve = done)))
    const first = memo('k', read, 0)
    const second = memo('k', read, 1)
    resolve('shared')
    expect(await Promise.all([first, second])).toEqual(['shared', 'shared'])
    expect(read).toHaveBeenCalledTimes(1)
  })

  it('drops a failed read at once, so the next caller reads again', async () => {
    const memo = createServerMemo<number>(1_000)
    const read = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce(3)
    await expect(memo('k', read, 0)).rejects.toThrow('down')
    expect(await memo('k', read, 1)).toBe(3)
  })

  it('keeps keys apart', async () => {
    const memo = createServerMemo<string>(1_000)
    expect(await memo('a', async () => 'a', 0)).toBe('a')
    expect(await memo('b', async () => 'b', 0)).toBe('b')
  })
})
