import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('useFirstVisit', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('answers yes for the first mount, for as long as it lasts, and no afterwards', async () => {
    const { useFirstVisit } = await import('./first-visit')

    const first = renderHook(() => useFirstVisit())
    expect(first.result.current).toBe(true)
    first.rerender()
    expect(first.result.current).toBe(true)
    first.unmount()

    expect(renderHook(() => useFirstVisit()).result.current).toBe(false)
  })
})
