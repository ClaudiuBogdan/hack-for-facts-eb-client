import type { ReactNode } from 'react'
import { render, screen } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { NgoHubPending } from './ngo-hub-pending'

vi.mock('@/config/env', () => ({ isNgoRegistryEnabled: () => true }))
vi.mock('@tanstack/react-router', () => ({ Link: ({ children }: { readonly children: ReactNode }) => <a href="/">{children}</a> }))

describe('NgoHubPending', () => {
  it('draws the page’s own head at once — title, search box, pinned bar, first band — and no figure', () => {
    render(<NgoHubPending />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('ONG-urile din România')
    expect(screen.getByText('Numele organizației sau numărul din registru')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Scurtături' })).toHaveTextContent('Tot registrul')
    const bar = screen.getByRole('navigation', { name: 'Secțiunile paginii' })
    expect(bar).toHaveTextContent('01Pe județe02Ce fac03Banii04În registru')
    expect(screen.getByRole('heading', { level: 2, name: 'Câte ONG-uri are județul tău' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /^Cele mai mari ONG-uri din registru/ })).toBeInTheDocument()
    // Nothing a summary says: no figure, no money, no year is drawn before the page's own (the switch's unit is a label).
    expect(document.body.textContent?.replace('La 10.000 de locuitori', '')).not.toMatch(/\d\.\d{3}|mil\.|mld\.|20\d\d/)
  })
})
