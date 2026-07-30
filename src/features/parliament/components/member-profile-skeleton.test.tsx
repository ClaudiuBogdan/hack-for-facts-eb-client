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

const { MemberProfileSkeleton } = await import('./member-profile-skeleton')

/** A sitting deputy: `<chamber>:<legislature>:<ordinal>`, chamber 2. */
const DEPUTY = '2:2024:133'
/** A senator — chamber 1. */
const SENATOR = '1:2024:13'

describe('MemberProfileSkeleton', () => {
  it('announces itself as busy', () => {
    render(<MemberProfileSkeleton memberId={DEPUTY} activeTab="overview" />)
    expect(
      screen.getByLabelText('Se încarcă profilul parlamentarului'),
    ).toHaveAttribute('aria-busy', 'true')
  })

  it('keeps the breadcrumb usable, and writes the crumb the URL settles', () => {
    // The way out of a page that has not arrived yet. The old placeholder was a
    // bare grey slab with no navigation at all.
    render(<MemberProfileSkeleton memberId={DEPUTY} activeTab="voturi" />)
    expect(
      screen.getByRole('navigation', { name: 'Breadcrumb' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Parlament' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Membri' })).toBeInTheDocument()
    // The member's own name is the one crumb still unknown.
    expect(screen.getByText('Se încarcă')).toBeInTheDocument()
  })

  it('renders the real sidebar against the real memberId', () => {
    // Every section is a working destination before the profile lands, and the
    // one the reader asked for is already highlighted.
    render(<MemberProfileSkeleton memberId={DEPUTY} activeTab="initiative" />)
    expect(
      screen.getByRole('navigation', { name: 'Secțiuni profil parlamentar' }),
    ).toBeInTheDocument()

    const initiative = screen.getByRole('link', {
      name: 'Inițiative legislative',
    })
    expect(initiative).toHaveAttribute(
      'href',
      '/parlament/membri/2:2024:133/initiative',
    )
    expect(initiative).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Istoric voturi' })).toHaveAttribute(
      'href',
      '/parlament/membri/2:2024:133/voturi',
    )
  })

  it('paints the hero in the chamber the mandate key states', () => {
    // Unlike a bill's originating chamber, this one IS in the URL — so the band
    // that covers a third of the first screen does not have to be a guess.
    const { unmount } = render(
      <MemberProfileSkeleton memberId={DEPUTY} activeTab="overview" />,
    )
    expect(
      document.querySelector('section[style*="rgb(0, 100, 53)"]'),
    ).toBeInTheDocument()
    expect(screen.getByText('Camera Deputaților')).toBeInTheDocument()
    unmount()

    render(<MemberProfileSkeleton memberId={SENATOR} activeTab="overview" />)
    expect(
      document.querySelector('section[style*="rgb(156, 5, 26)"]'),
    ).toBeInTheDocument()
    expect(screen.getByText('Senatul României')).toBeInTheDocument()
  })

  it('stays NEUTRAL when the key states no chamber', () => {
    // Naming the wrong chamber over someone's name is worse than naming none.
    render(<MemberProfileSkeleton memberId="necunoscut" activeTab="overview" />)
    expect(
      document.querySelector('section[style*="rgb(80, 90, 95)"]'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Camera Deputaților')).not.toBeInTheDocument()
    expect(screen.queryByText('Senatul României')).not.toBeInTheDocument()
  })

  it('matches the placeholder to the tab the URL asked for', () => {
    const { unmount } = render(
      <MemberProfileSkeleton memberId={DEPUTY} activeTab="voturi" />,
    )
    expect(
      screen.getByRole('heading', { level: 2, name: 'Istoric voturi' }),
    ).toBeInTheDocument()
    // Fixed text on every profile — greying it would make the arrival a
    // re-layout instead of a fill-in.
    expect(
      screen.getByRole('heading', { name: 'Activitatea de vot' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Reprezentare' }),
    ).not.toBeInTheDocument()
    unmount()

    render(<MemberProfileSkeleton memberId={DEPUTY} activeTab="overview" />)
    expect(
      screen.getByRole('heading', { level: 2, name: 'Carieră parlamentară' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Reprezentare' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Afiliere la grup parlamentar' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Activitatea de vot' }),
    ).not.toBeInTheDocument()
  })

  it('writes only the half of the contact heading that is fixed', () => {
    // "Contact <name>" is the one tab heading that carries the member.
    render(<MemberProfileSkeleton memberId={DEPUTY} activeTab="contact" />)
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).toHaveTextContent(/^Contact$/)
  })

  it('does not reserve what only some profiles carry', () => {
    // The ended-mandate badge, the role line and the contact details each
    // render for some members only; a block that vanishes on arrival shifts the
    // whole page up.
    render(<MemberProfileSkeleton memberId={DEPUTY} activeTab="overview" />)
    expect(screen.queryByText('Mandat încheiat')).not.toBeInTheDocument()
  })
})
