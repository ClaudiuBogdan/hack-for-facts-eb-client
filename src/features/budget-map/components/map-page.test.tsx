import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@/test/test-utils'
import type { MapPageData } from '../hooks/use-map-page-data'

// The address the page was opened at, as `Link` hands it to a `search` function.
const opened = { lang: 'en', harta: 'venituri', an: '2024', vedere: 'tabel' }
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, search }: { readonly children: ReactNode; readonly to: string; readonly search?: (previous: Record<string, unknown>) => Record<string, string> }) => {
    const query = search ? new URLSearchParams(search(opened)).toString() : ''
    return <a href={query ? `${to}?${query}` : to}>{children}</a>
  },
  useNavigate: () => vi.fn(),
  useSearch: () => ({}),
}))

const data: MapPageData = { uats: undefined, counties: undefined, labels: undefined, figures: undefined, outsideMap: 0, failed: false, tableFailed: false, retry: () => {}, retryTable: () => {} }
vi.mock('../hooks/use-map-page-data', () => ({ useMapPageData: () => data }))
// The map's code fails to arrive, as a stylesheet Vite could not preload does.
vi.mock('./map-page-map', () => {
  throw new Error('Unable to preload CSS for /assets/map-page-map.css')
})

const { MapPage } = await import('./map-page')

describe('the map page’s way home', () => {
  it('leads home keeping only the site’s language, and names the page', () => {
    render(<MapPage />)
    const trail = screen.getByRole('navigation', { name: 'Ești aici' })
    expect(within(trail).getByRole('link', { name: 'Acasă' })).toHaveAttribute('href', '/?lang=en')
    expect(trail).toHaveTextContent('Acasă/Hartă')
  })
})

describe('the map page whose map code does not arrive', () => {
  it('says the map could not load and offers to try again, not that the browser cannot draw it', async () => {
    render(<MapPage />)
    expect(await screen.findByText('Harta nu s-a putut încărca.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Încearcă din nou' })).toBeInTheDocument()
    expect(screen.queryByText('Harta nu poate fi afișată în acest browser.')).not.toBeInTheDocument()
  })
})
