import { beforeEach, describe, expect, it, vi } from 'vitest'

const reload = vi.hoisted(() => ({ fresh: true }))
vi.mock('@/lib/chunk-recovery', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/chunk-recovery')>()),
  reloadForFreshCode: () => reload.fresh,
}))

const { retryCountyShapes } = await import('./use-county-shapes')

describe('retryCountyShapes', () => {
  beforeEach(() => {
    reload.fresh = true
  })

  it('asks a fresh document for the shapes: this one keeps the failed chunk', () => {
    const refetch = vi.fn(() => Promise.resolve())
    retryCountyShapes(refetch)
    expect(refetch).not.toHaveBeenCalled()
  })

  it('asks again in place where no fresh document can be had (offline)', () => {
    reload.fresh = false
    const refetch = vi.fn(() => Promise.resolve())
    retryCountyShapes(refetch)
    expect(refetch).toHaveBeenCalledOnce()
  })
})
