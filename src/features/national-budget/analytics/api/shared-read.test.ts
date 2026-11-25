import { afterEach, describe, expect, it, vi } from 'vitest'

import { createSharedMemory, forgetShared, sharedRead } from './shared-read'

const POLICY = { fresh: 100, keep: 1000 }

function setup(size = 10) {
  let clock = 0
  const memory = createSharedMemory({ size, now: () => clock })
  return { memory, tick: (ms: number) => (clock += ms) }
}

describe('the server’s shared reads', () => {
  it('read once for readers who ask at the same time, and serve the copy while it is fresh', async () => {
    const { memory, tick } = setup()
    const read = vi.fn(() => Promise.resolve('2025'))
    expect(await Promise.all([memory.read('k', POLICY, read), memory.read('k', POLICY, read)])).toEqual(['2025', '2025'])
    tick(100)
    expect(await memory.read('k', POLICY, read)).toBe('2025')
    expect(read).toHaveBeenCalledTimes(1)
  })

  it('serve a copy past fresh at once while one read behind it replaces it', async () => {
    const { memory, tick } = setup()
    await memory.read('k', POLICY, () => Promise.resolve('august'))
    tick(101)
    let land: (value: string) => void = () => undefined
    const next = vi.fn(() => new Promise<string>((resolve) => (land = resolve)))
    expect(await memory.read('k', POLICY, next)).toBe('august')
    expect(await memory.read('k', POLICY, next)).toBe('august')
    expect(next).toHaveBeenCalledTimes(1)
    land('september')
    await Promise.resolve()
    expect(await memory.read('k', POLICY, next)).toBe('september')
  })

  it('make the reader wait for a copy past keep', async () => {
    const { memory, tick } = setup()
    await memory.read('k', POLICY, () => Promise.resolve('old'))
    tick(1001)
    expect(await memory.read('k', POLICY, () => Promise.resolve('new'))).toBe('new')
  })

  it('keep nothing from a failed read, and leave the copy it would have replaced', async () => {
    const { memory, tick } = setup()
    await expect(memory.read('k', POLICY, () => Promise.reject(new Error('down')))).rejects.toThrow('down')
    expect(await memory.read('k', POLICY, () => Promise.resolve('read again'))).toBe('read again')
    tick(101)
    expect(await memory.read('k', POLICY, () => Promise.reject(new Error('down')))).toBe('read again')
    await Promise.resolve()
    expect(await memory.read('k', POLICY, () => Promise.resolve('unused'))).toBe('read again')
  })

  it('let the least recently used copies go first past the size, never a read in flight', async () => {
    // Room for three, the read in flight counted.
    const { memory } = setup(3)
    for (const key of ['a', 'b']) await memory.read(key, POLICY, () => Promise.resolve(key))
    await memory.read('a', POLICY, () => Promise.resolve('unused'))
    let land: (value: string) => void = () => undefined
    const slow = memory.read('slow', POLICY, () => new Promise<string>((resolve) => (land = resolve)))
    await memory.read('c', POLICY, () => Promise.resolve('c'))
    // b, the least recently used, went; a (read again) and c stay; the read in flight is still shared.
    expect(await memory.read('a', POLICY, () => Promise.resolve('a again'))).toBe('a')
    expect(await memory.read('b', POLICY, () => Promise.resolve('b again'))).toBe('b again')
    const second = vi.fn(() => Promise.resolve('second'))
    const joined = memory.read('slow', POLICY, second)
    land('slow')
    expect(await Promise.all([slow, joined])).toEqual(['slow', 'slow'])
    expect(second).not.toHaveBeenCalled()
  })

  it('never let a fill forgotten while it ran write over its replacement', async () => {
    const { memory } = setup()
    let landOld: (value: string) => void = () => undefined
    const old = memory.read('catalog', POLICY, () => new Promise<string>((resolve) => (landOld = resolve)))
    memory.forget('catalog')
    expect(await memory.read('catalog', POLICY, () => Promise.resolve('october'))).toBe('october')
    landOld('september')
    expect(await old).toBe('september')
    expect(await memory.read('catalog', POLICY, () => Promise.resolve('unused'))).toBe('october')
  })

  it('are the read itself in the browser, with the reader’s signal', async () => {
    const signal = new AbortController().signal
    const read = vi.fn((given: AbortSignal | undefined) => Promise.resolve(given === signal))
    expect(await sharedRead('k', POLICY, read, signal)).toBe(true)
    expect(await sharedRead('k', POLICY, read, signal)).toBe(true)
    expect(read).toHaveBeenCalledTimes(2)
  })
})

describe('the server’s shared reads, on the server', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('share one read between readers, each on its own signal', async () => {
    vi.stubEnv('SSR', true)
    const read = vi.fn((given: AbortSignal | undefined) => Promise.resolve(given !== undefined))
    const leaving = new AbortController()
    const first = sharedRead('server one', POLICY, read, leaving.signal)
    const second = sharedRead('server one', POLICY, read, new AbortController().signal)
    leaving.abort(new Error('left'))
    await expect(first).rejects.toThrow('left')
    // The read runs on its own limit, not on the reader's signal, and the reader who stayed gets it.
    expect(await second).toBe(true)
    expect(read).toHaveBeenCalledTimes(1)
  })

  it('start nothing for a reader already gone', async () => {
    vi.stubEnv('SSR', true)
    const gone = new AbortController()
    gone.abort(new Error('gone'))
    const read = vi.fn(() => Promise.reject(new Error('down')))
    await expect(sharedRead('server gone', POLICY, read, gone.signal)).rejects.toThrow('gone')
    expect(read).not.toHaveBeenCalled()
    forgetShared('server gone')
  })
})
