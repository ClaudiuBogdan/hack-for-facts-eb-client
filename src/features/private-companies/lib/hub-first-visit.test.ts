import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('useHubFirstVisit', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('answers yes for the first mount, for as long as it lasts, and no afterwards', async () => {
    const { useHubFirstVisit } = await import('./hub-first-visit')

    const first = renderHook(() => useHubFirstVisit())
    expect(first.result.current).toBe(true)
    first.rerender()
    expect(first.result.current).toBe(true)
    first.unmount()

    expect(renderHook(() => useHubFirstVisit()).result.current).toBe(false)
  })

  it('keeps its own answer, apart from the landing’s', async () => {
    const { useFirstVisit } = await import('@/features/landing/lib/first-visit')
    const { useHubFirstVisit } = await import('./hub-first-visit')

    renderHook(() => useFirstVisit()).unmount()
    // The landing has been seen; the hub has not.
    const hub = renderHook(() => useHubFirstVisit())
    expect(hub.result.current).toBe(true)
    hub.unmount()
    // And the hub's visit left the landing's answer as it was: seen, by its own mount.
    expect(renderHook(() => useFirstVisit()).result.current).toBe(false)
  })
})
