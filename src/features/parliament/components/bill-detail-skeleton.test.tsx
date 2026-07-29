import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
    className,
    'aria-current': ariaCurrent,
  }: {
    children: ReactNode
    to: string
    params?: Record<string, string>
    search?: Record<string, string>
    activeOptions?: unknown
    className?: string
    'aria-current'?: 'page'
  }) => (
    <a
      href={Object.entries(params ?? {}).reduce(
        (path, [key, value]) => path.replace(`$${key}`, value),
        to,
      )}
      className={className}
      aria-current={ariaCurrent}
    >
      {children}
    </a>
  ),
}))

const { BillDetailSkeleton } = await import('./bill-detail-skeleton')

describe('BillDetailSkeleton', () => {
  it('announces itself as busy', () => {
    render(<BillDetailSkeleton billId="23135" activeTab="detalii" />)
    expect(screen.getByLabelText('Se încarcă proiectul de lege')).toHaveAttribute(
      'aria-busy',
      'true',
    )
  })

  it('keeps the breadcrumb links working while the bill loads', () => {
    // The way out of a page that has not arrived yet. The old placeholder was a
    // bare grey slab with no navigation at all.
    render(<BillDetailSkeleton billId="23135" activeTab="detalii" />)
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Parlament' })).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Proiecte legislative' }),
    ).toBeInTheDocument()
  })

  it('renders the four tabs against the real billId, with the URL tab active', () => {
    // `billId` is in the path, so every tab is a working destination before the
    // dossier lands.
    render(<BillDetailSkeleton billId="23135" activeTab="documente" />)
    const tabs = screen.getByRole('navigation', { name: 'Secțiuni proiect de lege' })
    expect(tabs).toBeInTheDocument()

    const documente = screen.getByRole('link', { name: 'Documente' })
    expect(documente).toHaveAttribute(
      'href',
      '/parlament/proiecte/23135/documente',
    )
    expect(documente).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Etape' })).toHaveAttribute(
      'href',
      '/parlament/proiecte/23135/etape',
    )
    expect(screen.getByRole('link', { name: 'Voturi' })).toHaveAttribute(
      'href',
      '/parlament/proiecte/23135/voturi',
    )
  })

  it('paints the hero NEUTRAL — the chamber is a fact we are still waiting for', () => {
    // Unlike a division, a bill's chamber is not in the URL. A green band would
    // announce "Camera Deputaților" for a bill that may be the Senate's.
    render(<BillDetailSkeleton billId="23135" activeTab="detalii" />)
    expect(
      document.querySelector('section[style*="rgb(80, 90, 95)"]'),
    ).toBeInTheDocument()
    expect(
      document.querySelector('section[style*="rgb(0, 100, 53)"]'),
    ).not.toBeInTheDocument()
    expect(
      document.querySelector('section[style*="rgb(156, 5, 26)"]'),
    ).not.toBeInTheDocument()
  })

  it('renders the labels that do not depend on the response', () => {
    // Fixed text; greying it would make the arrival a re-layout, not a fill-in.
    render(<BillDetailSkeleton billId="23135" activeTab="detalii" />)
    expect(screen.getByText('Parlamentul României')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Proiecte legislative' }),
    ).toBeInTheDocument()
    // Twice, as on the real page: the hero's eyebrow label and the details
    // section's own heading.
    expect(screen.getAllByText('Stadiu curent')).toHaveLength(2)
    expect(
      screen.getByRole('heading', { name: 'Stadiu curent' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Etapa curentă')).toBeInTheDocument()
    expect(screen.getByText('Localizare')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Inițiator' })).toBeInTheDocument()
  })

  it('matches the placeholder to the tab the URL asked for', () => {
    const { unmount } = render(
      <BillDetailSkeleton billId="23135" activeTab="etape" />,
    )
    expect(
      screen.getByRole('heading', { name: 'Parcurs legislativ' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Vizualizare')).toBeInTheDocument()
    expect(screen.queryByText('Etapa curentă')).not.toBeInTheDocument()
    unmount()

    render(<BillDetailSkeleton billId="23135" activeTab="voturi" />)
    expect(
      screen.queryByRole('heading', { name: 'Parcurs legislativ' }),
    ).not.toBeInTheDocument()
  })

  it('does not reserve the sections that render conditionally', () => {
    // The AI summary, the current-document card and the related votes each
    // render only for some bills. A block that vanishes on arrival shifts the
    // whole page up.
    render(<BillDetailSkeleton billId="23135" activeTab="detalii" />)
    expect(
      screen.queryByRole('heading', { name: 'Versiunea curentă a proiectului' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Voturi asociate' }),
    ).not.toBeInTheDocument()
  })

  it('offers exactly the breadcrumb, the tabs, and the stages link as ways out', () => {
    // Two breadcrumb links, four tabs, and the Detalii tab's own route to the
    // stages. The hero carries none — "Etape" is already a tab right below it.
    render(<BillDetailSkeleton billId="23135" activeTab="detalii" />)
    expect(screen.getAllByRole('link')).toHaveLength(7)
    expect(
      screen.queryByRole('link', { name: 'Vezi parcursul complet' }),
    ).not.toBeInTheDocument()
  })

  it('leaves no heading over a section that may never come', () => {
    // A bill with no documents renders a plain sentence, not a "Documente"
    // section — so the heading is greyed rather than written.
    render(<BillDetailSkeleton billId="23135" activeTab="documente" />)
    expect(
      screen.queryByRole('heading', { name: 'Documente' }),
    ).not.toBeInTheDocument()
  })
})
