import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    className,
  }: {
    children: ReactNode
    to: string
    search?: Record<string, string>
    className?: string
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}))

const { VoteDetailSkeleton } = await import('./vote-detail-skeleton')

describe('VoteDetailSkeleton', () => {
  it('announces itself as busy', () => {
    render(<VoteDetailSkeleton chamber="camera" />)
    expect(screen.getByLabelText('Se încarcă votul')).toHaveAttribute(
      'aria-busy',
      'true',
    )
  })

  it('keeps the breadcrumb links working while the division loads', () => {
    // The only way out of a page that has not arrived yet. The old placeholder
    // was a bare grey slab with no navigation at all.
    render(<VoteDetailSkeleton chamber="camera" />)
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Parlament' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voturi' })).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Voturi în Camera Deputaților' }),
    ).toBeInTheDocument()
  })

  it('offers no other link — nothing here is a real destination yet', () => {
    render(<VoteDetailSkeleton chamber="senat" />)
    expect(screen.getAllByRole('link')).toHaveLength(3)
  })

  it('paints the hero in the chamber colour, which the URL already settles', () => {
    const { unmount } = render(<VoteDetailSkeleton chamber="camera" />)
    expect(
      document.querySelector('section[style*="rgb(0, 100, 53)"]'),
    ).toBeInTheDocument()
    unmount()

    render(<VoteDetailSkeleton chamber="senat" />)
    expect(
      document.querySelector('section[style*="rgb(156, 5, 26)"]'),
    ).toBeInTheDocument()
  })

  it('renders the labels that do not depend on the response', () => {
    // Headings and tally labels are fixed text; greying them out would make the
    // arrival a re-layout instead of a fill-in.
    render(<VoteDetailSkeleton chamber="camera" />)
    expect(screen.getByText('Pentru')).toBeInTheDocument()
    expect(screen.getByText('Împotrivă')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Voturi pe grupuri parlamentare' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Voturi individuale pe grup' }),
    ).toBeInTheDocument()
  })

  it('does not reserve space for the related-bill card', () => {
    // It renders only for divisions that carry a bill, so reserving it would
    // shift the whole page up on every division that does not.
    render(<VoteDetailSkeleton chamber="camera" />)
    expect(screen.queryByText(/proiectului de lege/)).not.toBeInTheDocument()
  })

  it('draws the two chart columns at EQUAL height', () => {
    // Unequal columns would announce a landslide or a close call before the
    // page has counted a single ballot.
    render(<VoteDetailSkeleton chamber="camera" />)
    const first = screen.getByTestId('vote-detail-skeleton-bar-0')
    const second = screen.getByTestId('vote-detail-skeleton-bar-1')
    expect(first).toHaveStyle({ height: '66%' })
    expect(second).toHaveStyle({ height: first.style.height })
  })
})
