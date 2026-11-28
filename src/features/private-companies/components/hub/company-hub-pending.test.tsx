import type { ReactNode } from 'react'
import { render, screen } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { CompanyHubPending } from './company-hub-pending'

const location = vi.hoisted(() => ({ search: {} as Record<string, unknown> }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { readonly children: ReactNode }) => <a href="/">{children}</a>,
  useRouterState: ({ select }: { readonly select: (state: { readonly location: typeof location }) => unknown }) => select({ location }),
}))

describe('CompanyHubPending', () => {
  it('draws the page’s own head at once — title, search box, ranking switch, pinned bar, first band — and no figure', () => {
    render(<CompanyHubPending />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Firmele dinRomânia')
    expect(screen.getByText('Nume sau CUI...')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Scurtături' })).toHaveTextContent('Toate firmele în funcțiune')
    // The bar is drawn inert while the bands load: no anchor offers a band that has not arrived, and assistive
    // technology meets the real bar when the page does.
    expect(screen.queryByRole('navigation', { name: 'Secțiunile paginii' })).toBeNull()
    const bar = screen.getByText('Județe').closest('[aria-hidden="true"]')
    expect(bar).not.toBeNull()
    expect(bar?.querySelector('a')).toBeNull()
    // The counties first, as the procurement and NGO hubs open.
    expect(bar).toHaveTextContent('JudețeDomeniiMărimeAniFirme noi')
    // No running numbers on this page: none in the bar, none over the first band's title.
    expect(bar?.textContent).not.toMatch(/\d/)
    expect(screen.getByRole('heading', { level: 2, name: 'Firmele pe județe' }).previousElementSibling).toBeNull()
    expect(screen.getByRole('heading', { level: 2, name: 'Firmele pe județe' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /^Cele mai mari firme/ })).toBeInTheDocument()
    // Nothing the snapshot says: no figure, no money, no year before the page's own.
    expect(document.body.textContent).not.toMatch(/\d\.\d{3}|mil\.|mld\.|20\d\d/)
  })

  it('holds the ranking the link being loaded chose', () => {
    location.search = { clasament: 'salariati' }
    render(<CompanyHubPending />)
    expect(screen.getByText('Salariați')).toHaveClass('font-semibold')
    expect(screen.getByText('Cifra de afaceri')).not.toHaveClass('font-semibold')
    location.search = {}
  })
})
