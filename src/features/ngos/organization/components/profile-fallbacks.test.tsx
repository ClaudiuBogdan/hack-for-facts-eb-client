import type { ReactNode } from 'react'
import { render, screen, within } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { BLANC, FUNKY } from '../test/fixtures'
import { NgoRegistryProfileChoice, NgoRegistryProfileNotFound } from './profile-fallbacks'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, search }: { readonly children: ReactNode; readonly to: string; readonly params?: Record<string, string>; readonly search?: Record<string, string> }) => {
    const path = Object.entries(params ?? {}).reduce((href, [key, value]) => href.replace(`$${key}`, value), to)
    const query = new URLSearchParams(search ?? {}).toString()
    return <a href={query ? `${path}?${query}` : path}>{children}</a>
  },
  useRouter: () => ({ invalidate: vi.fn() }),
  useRouterState: () => false,
}))

describe('a registry number several organisations share', () => {
  it('lists every candidate, links only those with a CUI, and picks none', () => {
    render(<NgoRegistryProfileChoice registryNumber="3117/A/2026" candidates={[BLANC, FUNKY]} />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Mai multe organizații cu numărul 3117/A/2026')
    const [unlinked, linked] = within(screen.getAllByRole('list')[0]!).getAllByRole('listitem').filter((item) => item.parentElement === screen.getAllByRole('list')[0])
    expect(within(unlinked!).queryByRole('link')).not.toBeInTheDocument()
    expect(unlinked).toHaveTextContent('Blanc')
    // With no address of its own, what the registry says of it opens in place.
    expect(within(unlinked!).getByText('Ce spune registrul despre ea')).toBeInTheDocument()
    expect(unlinked).toHaveTextContent('sprijinirea familiilor')
    expect(within(linked!).queryByText('Ce spune registrul despre ea')).not.toBeInTheDocument()
    expect(within(linked!).getByRole('link')).toHaveAttribute('href', '/ngos/30339344')
    expect(linked).toHaveTextContent('CUI 30339344')
    // The way on is the registry, filtered to the number.
    expect(screen.getByRole('link', { name: /Caută în registru/ })).toHaveAttribute('href', '/ngos/registry?registryNumber=3117%2FA%2F2026')
  })
})

describe('a registry number the export does not hold', () => {
  it('says so and leads to the registry', () => {
    render(<NgoRegistryProfileNotFound />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Niciun ONG cu acest număr în registru')
    expect(screen.getByRole('link', { name: /Caută în registru/ })).toHaveAttribute('href', '/ngos/registry')
  })
})
