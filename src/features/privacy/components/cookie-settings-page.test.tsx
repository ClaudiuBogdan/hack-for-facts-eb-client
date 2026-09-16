import type { ReactNode } from 'react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { getConsent, getDefaultConsent, hasStoredConsentDecision, setConsent } from '@/lib/consent'
import { CookieSettingsPage } from './cookie-settings-page'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: { readonly children: ReactNode; readonly to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

describe('CookieSettingsPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('keeps the essentials on and lets the rest be drafted before saving', async () => {
    const user = userEvent.setup()
    render(<CookieSettingsPage onReturn={vi.fn()} />)

    const [essential, analytics, sentry] = screen.getAllByRole('switch')
    expect(essential).toBeDisabled()
    expect(essential).toHaveAttribute('data-state', 'checked')
    expect(analytics).toHaveAttribute('data-state', 'unchecked')
    expect(sentry).toHaveAttribute('data-state', 'unchecked')

    // The whole text block is the label, and the switch itself is outside it
    // so a click does not toggle twice.
    await user.click(screen.getByText('Statistici de utilizare'))
    expect(analytics).toHaveAttribute('data-state', 'checked')
    expect(screen.getByText('nesalvat')).toBeInTheDocument()
    expect(screen.getByText('Modificări nesalvate')).toBeInTheDocument()
    expect(hasStoredConsentDecision()).toBe(false)

    await user.click(screen.getByRole('button', { name: 'Salvează alegerea' }))
    expect(getConsent()).toMatchObject({ analytics: true, sentry: false })
    expect(screen.getByText('Salvat')).toBeInTheDocument()
    expect(screen.queryByText('nesalvat')).not.toBeInTheDocument()
  })

  it('describes the stored answer once it has read it', async () => {
    setConsent({ ...getDefaultConsent(), analytics: true, sentry: true })
    render(<CookieSettingsPage onReturn={vi.fn()} />)

    expect(await screen.findByText('Totul pornit')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /mușcat/ })).toBeInTheDocument()
    expect(screen.getByText(/Ultima alegere/)).toBeInTheDocument()
  })

  it('goes back where the reader came from after a decision, and only then', async () => {
    const user = userEvent.setup()
    const onReturn = vi.fn()
    render(<CookieSettingsPage redirect="/charts" onReturn={onReturn} />)

    expect(screen.getByRole('button', { name: 'Înapoi unde erai' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Acceptă tot' }))

    expect(getConsent()).toMatchObject({ analytics: true, sentry: true })
    expect(onReturn).toHaveBeenCalledTimes(1)
  })

  it('stays put without a redirect', async () => {
    const user = userEvent.setup()
    const onReturn = vi.fn()
    render(<CookieSettingsPage onReturn={onReturn} />)

    expect(screen.queryByRole('button', { name: 'Înapoi unde erai' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Doar esențiale' }))

    expect(getConsent()).toMatchObject({ analytics: false, sentry: false })
    expect(onReturn).not.toHaveBeenCalled()
    expect(screen.getByText('Salvat')).toBeInTheDocument()
  })

  it('points at the policies rather than restating them', () => {
    render(<CookieSettingsPage onReturn={vi.fn()} />)
    expect(screen.getByRole('link', { name: 'Politica de cookie-uri' })).toHaveAttribute('href', '/cookie-policy')
    expect(screen.getByRole('link', { name: 'Politica de confidențialitate' })).toHaveAttribute('href', '/privacy')
  })
})
