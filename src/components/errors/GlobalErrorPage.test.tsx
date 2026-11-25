import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@/test/test-utils'
import { GlobalErrorPage } from './GlobalErrorPage'

vi.mock('@/lib/sentry', () => ({ initSentry: vi.fn(), withSentry: vi.fn() }))
const recovery = vi.hoisted(() => ({ attempt: vi.fn(() => false) }))
vi.mock('@/lib/chunk-recovery', () => ({ attemptChunkRecovery: recovery.attempt }))

const realLocation = window.location
const reload = vi.fn()
const assign = vi.fn()

beforeEach(() => {
  Object.defineProperty(window, 'location', { configurable: true, value: { ...realLocation, reload, assign } })
  recovery.attempt.mockReturnValue(false)
})

afterEach(() => {
  Object.defineProperty(window, 'location', { configurable: true, value: realLocation })
  vi.clearAllMocks()
  vi.useRealTimers()
})

const tornHalf = () => document.querySelector<SVGGElement>('[data-character-half]')

describe('GlobalErrorPage', () => {
  it('says the page broke and offers reload and home, with no technical details', () => {
    render(<GlobalErrorPage error={new Error('boom at render')} />)

    expect(screen.getByRole('heading', { level: 1, name: 'Pagina s-a rupt' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reîncarcă pagina' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mergi la prima pagină' })).toBeInTheDocument()
    expect(screen.queryByText(/boom at render/)).not.toBeInTheDocument()
    expect(document.querySelector('details')).toBeNull()
    expect(document.querySelector('[data-character="torn"]')).not.toBeNull()
  })

  it('mends the torn page while reload is pointed at, and lets it fall apart after', async () => {
    const user = userEvent.setup()
    render(<GlobalErrorPage error={new Error('boom')} />)
    const button = screen.getByRole('button', { name: 'Reîncarcă pagina' })

    expect(tornHalf()?.style.transform).toBe('translate(5px, 15px)')
    await user.hover(button)
    expect(tornHalf()?.style.transform).toBe('translate(0, 0)')
    await user.unhover(button)
    expect(tornHalf()?.style.transform).toBe('translate(5px, 15px)')
  })

  it('reloads the whole page, once, after the page has mended', () => {
    vi.useFakeTimers()
    render(<GlobalErrorPage error={new Error('boom')} />)
    const button = screen.getByRole('button', { name: 'Reîncarcă pagina' })

    fireEvent.click(button)
    fireEvent.click(button)
    expect(tornHalf()?.style.transform).toBe('translate(0, 0)')
    expect(reload).not.toHaveBeenCalled()
    vi.runAllTimers()
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('goes home with a full navigation, so a stale deploy is left behind', async () => {
    const user = userEvent.setup()
    render(<GlobalErrorPage error={new Error('boom')} />)

    await user.click(screen.getByRole('button', { name: 'Mergi la prima pagină' }))
    expect(assign).toHaveBeenCalledWith('/')
  })

  it('shows a new version, not a broken page, when a chunk of an older deploy is gone', () => {
    render(<GlobalErrorPage error={new Error('Failed to fetch dynamically imported module: /assets/x.js')} />)

    expect(screen.getByRole('heading', { level: 1, name: 'A ieșit o ediție nouă' })).toBeInTheDocument()
    expect(document.querySelector('[data-character="fresh"]')).not.toBeNull()
  })

  it('shows only a spinner while the automatic recovery reloads the page', () => {
    recovery.attempt.mockReturnValue(true)
    render(<GlobalErrorPage error={new Error('Failed to fetch dynamically imported module: /assets/x.js')} />)

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })
})
