import type { ReactNode } from 'react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@/test/test-utils'
import { getConsent, hasStoredConsentDecision } from '@/lib/consent'
import { ConsentCard } from './consent-card'

/**
 * Rendered against the real consent store in jsdom's localStorage, with only
 * the router replaced. What the card is for is the moment it decides, and a
 * mocked store would assert that a function was called rather than that a
 * decision was stored.
 */

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, search, ...props }: { readonly children: ReactNode; readonly to: string; readonly search?: Record<string, string> }) => (
    <a href={`${to}${search ? `?${new URLSearchParams(search)}` : ''}`} {...props}>
      {children}
    </a>
  ),
  useLocation: () => ({ pathname: '/achizitii', searchStr: '' }),
}))

/** Renders the card and waits for its entrance to settle. */
async function renderOpen(onGone = vi.fn()) {
  render(<ConsentCard onGone={onGone} />)
  const dialog = screen.getByRole('dialog')
  await waitFor(() => expect(dialog).toHaveAttribute('data-phase', 'open'))
  return { dialog, onGone }
}

describe('ConsentCard', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('accepts everything with one click and confirms it', async () => {
    const user = userEvent.setup()
    const onGone = vi.fn()
    render(<ConsentCard onGone={onGone} />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'false')
    expect(hasStoredConsentDecision()).toBe(false)

    await user.click(screen.getByRole('button', { name: 'Acceptă tot' }))

    expect(getConsent()).toMatchObject({ analytics: true, sentry: true })
    expect(screen.getByRole('heading', { name: 'Mulțumim.' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /mușcat/ })).toBeInTheDocument()
    // Focus moves to the card so the confirmation is read out.
    expect(dialog).toHaveFocus()
    // The buttons are gone; nothing can be decided twice.
    expect(screen.queryByRole('button', { name: 'Acceptă tot' })).not.toBeInTheDocument()
  })

  it('refuses as easily as it accepts', async () => {
    const user = userEvent.setup()
    render(<ConsentCard onGone={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Doar esențiale' }))

    expect(hasStoredConsentDecision()).toBe(true)
    expect(getConsent()).toMatchObject({ analytics: false, sentry: false })
    expect(screen.getByRole('heading', { name: 'Doar esențialul.' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /simplu/ })).toBeInTheDocument()
  })

  it('stores nothing on "not now" and lets the host unmount it after the fade', async () => {
    const user = userEvent.setup()
    const { dialog, onGone } = await renderOpen()

    await user.click(screen.getByRole('button', { name: /Nu acum/ }))

    expect(hasStoredConsentDecision()).toBe(false)
    expect(dialog).toHaveAttribute('data-phase', 'leaving')
    await waitFor(() => expect(onGone).toHaveBeenCalledTimes(1))
  })

  it('lets the reader choose per category and saves exactly that', async () => {
    const user = userEvent.setup()
    render(<ConsentCard onGone={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Alege tu ce pornești' }))
    // Accept-all gives way to save-the-choice once the disclosure is open.
    expect(screen.queryByRole('button', { name: 'Acceptă tot' })).not.toBeInTheDocument()

    const switches = screen.getAllByRole('switch')
    expect(switches).toHaveLength(2)
    await user.click(screen.getByLabelText(/Statistici de utilizare/))
    expect(hasStoredConsentDecision()).toBe(false)

    await user.click(screen.getByRole('button', { name: 'Salvează alegerea' }))

    expect(getConsent()).toMatchObject({ analytics: true, sentry: false })
    expect(screen.getByRole('heading', { name: 'Notat.' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /întreg/ })).toBeInTheDocument()
  })

  it('takes Escape one level at a time', async () => {
    const user = userEvent.setup()
    const { dialog } = await renderOpen()

    await user.click(screen.getByRole('button', { name: 'Alege tu ce pornești' }))
    expect(screen.getAllByRole('switch')).toHaveLength(2)

    // Focus is on a switch the collapse is about to remove.
    screen.getAllByRole('switch')[0].focus()
    await user.keyboard('{Escape}')
    // The disclosure closed; the card stayed, and focus went back to the trigger.
    await waitFor(() => expect(screen.queryAllByRole('switch')).toHaveLength(0))
    expect(dialog).toHaveAttribute('data-phase', 'open')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Alege tu ce pornești' })).toHaveFocus())

    await user.keyboard('{Escape}')
    expect(dialog).toHaveAttribute('data-phase', 'leaving')
    expect(hasStoredConsentDecision()).toBe(false)
  })

  it('hands focus back to where it was when the card leaves', async () => {
    const user = userEvent.setup()
    const before = document.createElement('button')
    document.body.append(before)
    before.focus()
    const { onGone } = await renderOpen()

    await user.click(screen.getByRole('button', { name: /Nu acum/ }))
    await waitFor(() => expect(onGone).toHaveBeenCalledTimes(1))

    expect(before).toHaveFocus()
    before.remove()
  })

  it('links to the full settings with a way back', () => {
    render(<ConsentCard onGone={vi.fn()} />)
    expect(screen.getByRole('link', { name: 'Toate setările' })).toHaveAttribute(
      'href',
      '/cookies?redirect=%2Fachizitii',
    )
    expect(screen.getByRole('link', { name: 'Politica de cookie-uri' })).toHaveAttribute('href', '/cookie-policy')
  })
})
