import { act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { setConsent, getDefaultConsent } from '@/lib/consent'

const state = vi.hoisted(() => ({
  pathname: '/',
  search: {} as Record<string, string>,
  isMobile: false,
}))

vi.mock('@tanstack/react-router', () => ({
  useLocation: () => ({ pathname: state.pathname, searchStr: '' }),
  useSearch: () => state.search,
}))

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => state.isMobile,
}))

const gone = vi.hoisted(() => ({ current: () => {} }))
vi.mock('./consent-card', () => ({
  ConsentCardStyles: () => null,
  ConsentCard: ({ onGone }: { readonly onGone: () => void }) => {
    gone.current = onGone
    return <div role="dialog">card</div>
  },
}))

describe('ConsentCardHost', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    window.localStorage.clear()
    state.pathname = '/'
    state.search = {}
    state.isMobile = false
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  async function mount() {
    const { ConsentCardHost } = await import('./consent-card-host')
    render(<ConsentCardHost />)
  }

  it('asks after a beat when nothing has been decided', async () => {
    await mount()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(600)
    })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('never asks once a decision is stored', async () => {
    setConsent({ ...getDefaultConsent(), analytics: false, sentry: false })
    await mount()
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('stays out of the settings page', async () => {
    state.pathname = '/cookies'
    await mount()
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('stays out from under the notification sheet on a phone', async () => {
    state.isMobile = true
    state.search = { notificationModal: 'open' }
    await mount()
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('unmounts the card once it says it is gone', async () => {
    await mount()
    act(() => {
      vi.advanceTimersByTime(600)
    })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    act(() => {
      gone.current()
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
