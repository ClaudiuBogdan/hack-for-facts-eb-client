import type { ComponentType, ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestQueryClient, render, screen } from '@/test/test-utils'
import type { MapPageData } from '@/features/budget-map/hooks/use-map-page-data'

/** The address the page reads, and the navigations it asks for. */
const address = vi.hoisted(() => ({ search: {} as Record<string, unknown> }))
const navigate = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-router', () => ({
  createLazyFileRoute: () => (options: Record<string, unknown>) => ({ options }),
  Link: ({ children, to, params: _params, ...props }: { readonly children: ReactNode; readonly to: string; readonly params?: unknown }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => navigate,
  useSearch: () => address.search,
}))

/** No figures yet: the bar and the places for the map or the table, as the server renders them. */
const data: MapPageData = { uats: undefined, counties: undefined, labels: undefined, figures: undefined, outsideMap: 0, failed: false, retry: () => {} }
vi.mock('@/features/budget-map/hooks/use-map-page-data', () => ({ useMapPageData: () => data }))
// MapLibre needs WebGL; the map's own behaviour is checked in the browser.
vi.mock('@/features/budget-map/components/map-page-map', () => ({ default: () => <div data-testid="map" /> }))

async function page(): Promise<ComponentType> {
  const { Route } = await import('./map.lazy')
  return (Route as unknown as { options: { component: ComponentType } }).options.component
}

/** The navigation's resulting search, from the previous address. */
function lastSearch(previous: Record<string, unknown>) {
  const call = navigate.mock.calls[navigate.mock.calls.length - 1]?.[0] as { search: (previous: Record<string, unknown>) => Record<string, unknown>; replace: boolean; resetScroll: boolean }
  return { search: call.search(previous), replace: call.replace, resetScroll: call.resetScroll }
}

describe('the map page', () => {
  beforeEach(() => {
    navigate.mockReset()
    address.search = {}
  })

  it('server-renders its title, its controls and the map\'s place', async () => {
    const Page = await page()
    const html = renderToStaticMarkup(
      <QueryClientProvider client={createTestQueryClient()}>
        <Page />
      </QueryClientProvider>,
    )
    expect(html).toContain('<h1')
    expect(html).toContain('Harta bugetelor locale')
    expect(html).toContain('Sold bugetar')
    expect(html).toContain('Pe locuitor')
    expect(html).toContain('Județe')
    expect(html).toContain('Se încarcă harta…')
    expect(html).not.toContain('data-testid="map"')
  })

  it('opens the default view from an old link whose every parameter is junk, without an error', async () => {
    address.search = {
      filters: 'nimic',
      preset: 'xyz',
      activeView: 5,
      mapViewType: [1],
      mapCenter: 'abc',
      mapZoom: 'zz',
      entity_cuis: { nope: true },
      harta: 'foo',
      an: 1999,
      pe: null,
      nivel: {},
      vedere: [],
    }
    const Page = await page()
    render(<Page />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Harta bugetelor locale')
    expect(screen.getByRole('combobox', { name: /Harta afișată: Sold bugetar/ })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Total' })).toHaveAttribute('data-state', 'on')
    expect(screen.getByRole('radio', { name: 'Primării' })).toHaveAttribute('data-state', 'on')
    expect(screen.getByRole('radio', { name: 'Hartă' })).toHaveAttribute('data-state', 'on')
    expect(await screen.findByTestId('map')).toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('opens what an old link asks for that it can show: the map, the count, the level and the table', async () => {
    address.search = {
      filters: { account_category: 'vn', normalization: 'per_capita', report_period: { type: 'YEAR', selection: { interval: { start: '2020', end: '2020' } } }, functional_prefixes: ['65.'] },
      mapViewType: 'County',
      activeView: 'table',
    }
    const Page = await page()
    render(<Page />)
    expect(screen.getByRole('combobox', { name: /Harta afișată: Venituri pe locuitor/ })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Pe locuitor' })).toHaveAttribute('data-state', 'on')
    expect(screen.getByRole('radio', { name: 'Județe' })).toHaveAttribute('data-state', 'on')
    expect(screen.getByRole('searchbox', { name: 'Caută un județ' })).toBeInTheDocument()
    expect(screen.queryByTestId('map')).not.toBeInTheDocument()
  })

  it('writes a change to the address in place, keeping the app\'s own keys and dropping the old page\'s', async () => {
    address.search = { filters: { account_category: 'vn' }, mapViewType: 'County', currency: 'EUR' }
    const Page = await page()
    render(<Page />)
    await userEvent.click(screen.getByRole('radio', { name: 'Pe locuitor' }))
    const { search, replace, resetScroll } = lastSearch(address.search)
    expect(replace).toBe(true)
    expect(resetScroll).toBe(false)
    expect(search).toMatchObject({ harta: 'venituri', pe: 'locuitor', nivel: 'judete', currency: 'EUR' })
    expect(search.filters).toBeUndefined()
    expect(search.mapViewType).toBeUndefined()
  })

  it('switches between the map and the table', async () => {
    const Page = await page()
    render(<Page />)
    await userEvent.click(screen.getByRole('radio', { name: 'Tabel' }))
    expect(lastSearch({}).search).toMatchObject({ vedere: 'tabel' })
  })
})
