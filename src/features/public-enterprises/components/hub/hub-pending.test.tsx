import type { ReactNode } from 'react'
import { render, screen } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { PublicEnterpriseHubPending } from './hub-pending'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, preload: _preload, ...props }: { readonly children: ReactNode; readonly to: string; readonly preload?: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

// The pending state must not need the snapshot: if it imported it, this would load it.
vi.mock('../../lib/hub-snapshot', () => {
  throw new Error('the pending state imported the snapshot')
})

describe('PublicEnterpriseHubPending', () => {
  it('draws the page’s head and pinned bar before the page’s code and figures arrive', () => {
    render(<PublicEnterpriseHubPending />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Firmele statului și ale primăriilor')
    const ranking = screen.getByRole('region', { name: 'Cine controlează cele mai multe' })
    // The card's shape, held: the toggle (inert), five rows, the button's and the note's places.
    expect(ranking.querySelector('[inert] [role="radiogroup"]')).not.toBeNull()
    expect(ranking.querySelectorAll('ol > li')).toHaveLength(5)
    expect(ranking.querySelector('span.min-h-11')).not.toBeNull()
    const bar = screen.getByRole('navigation', { name: 'Secțiunile paginii' })
    expect(bar.querySelectorAll('a')).toHaveLength(6)
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull()
  })
})
