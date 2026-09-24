import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NAVIGATION_PROGRESS_DELAY_MS, NavigationProgress } from './navigation-progress'

let pending = false
vi.mock('@tanstack/react-router', () => ({
  useRouterState: ({ select }: { select: (state: { status: string }) => boolean }) =>
    select({ status: pending ? 'pending' : 'idle' }),
}))

function phase() {
  return document.querySelector('[data-nav-progress]')?.getAttribute('data-nav-progress')
}

describe('NavigationProgress', () => {
  let rerender: (ui: React.ReactElement) => void
  const navigate = (next: boolean) => {
    pending = next
    rerender(<NavigationProgress />)
  }

  beforeEach(() => {
    vi.useFakeTimers()
    pending = false
    ;({ rerender } = render(<NavigationProgress />))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows nothing for a navigation quicker than its delay', () => {
    navigate(true)
    act(() => vi.advanceTimersByTime(NAVIGATION_PROGRESS_DELAY_MS - 20))
    navigate(false)
    act(() => vi.advanceTimersByTime(1000))
    expect(phase()).toBe('idle')
    expect(screen.getByRole('status')).toHaveTextContent('')
  })

  it('reports a slow navigation, in the bar and to a screen reader, then fills and goes', () => {
    navigate(true)
    act(() => vi.advanceTimersByTime(NAVIGATION_PROGRESS_DELAY_MS))
    expect(phase()).toBe('loading')
    expect(screen.getByRole('status')).toHaveTextContent('Se încarcă pagina')

    navigate(false)
    expect(phase()).toBe('finishing')
    expect(screen.getByRole('status')).toHaveTextContent('')
    act(() => vi.advanceTimersByTime(1000))
    expect(phase()).toBe('idle')
  })

  it('starts the next page’s bar from nothing while the last one is still filling', () => {
    navigate(true)
    act(() => vi.advanceTimersByTime(NAVIGATION_PROGRESS_DELAY_MS))
    navigate(false)
    expect(phase()).toBe('finishing')
    navigate(true)
    expect(phase()).toBe('idle')
    act(() => vi.advanceTimersByTime(NAVIGATION_PROGRESS_DELAY_MS))
    expect(phase()).toBe('loading')
  })

  it('keeps the bar itself out of the accessibility tree', () => {
    navigate(true)
    act(() => vi.advanceTimersByTime(NAVIGATION_PROGRESS_DELAY_MS))
    expect(document.querySelector('[data-nav-progress]')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.queryByRole('progressbar')).toBeNull()
  })
})
