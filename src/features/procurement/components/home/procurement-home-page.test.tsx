import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestQueryClient } from '@/test/test-utils'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { ProcurementHomeSearch } from '@/schemas/procurement-home'
import { bigContract, categoriesRead, nationalRead } from '../../lib/home.fixture'
import { ProcurementHomePage, type ProcurementHomeInitialData } from './procurement-home-page'

/**
 * The front door's contract, as far as a unit test holds it: what the loader
 * read is in the HTML the server sends — figures, sentences, the largest
 * contracts with every winner — each band in the owner's order, and each
 * choice written to the URL with its default left out.
 */

const navigate = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
    search,
    preload: _preload,
    ...props
  }: {
    readonly children: ReactNode
    readonly to: string
    readonly params?: Record<string, string>
    readonly search?: unknown
    readonly preload?: unknown
  }) => {
    let href = to
    for (const [key, value] of Object.entries(params ?? {})) href = href.replace(`$${key}`, value)
    return (
      <a href={href} data-search={JSON.stringify(search ?? {})} {...props}>
        {children}
      </a>
    )
  },
  useNavigate: () => navigate,
  useLocation: () => ({ hash: '' }),
  useRouter: () => ({ routesById: {}, state: { matches: [] } }),
}))

vi.mock('@/features/entity-search/api/entity-search-api.live', () => ({ searchEntitiesLive: vi.fn() }))
vi.mock('@/hooks/useGeoJson', () => ({ useGeoJsonData: () => ({ data: undefined, isError: false, refetch: vi.fn() }) }))
// The newest month's records are read in the browser; here they never arrive.
vi.mock('../../api/procurement-home-api', () => ({
  fetchProcurementHomeNational: vi.fn(() => new Promise(() => undefined)),
  fetchProcurementHomeCategories: vi.fn(() => new Promise(() => undefined)),
  fetchProcurementHomeBigContracts: vi.fn(() => new Promise(() => undefined)),
  fetchProcurementHomeRecentContracts: vi.fn(() => new Promise(() => undefined)),
  fetchProcurementHomeRecentDirect: vi.fn(() => new Promise(() => undefined)),
}))
vi.mock('@/lib/utils', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils')>()), getUserLocale: () => 'ro' }))

const INITIAL: ProcurementHomeInitialData = {
  year: 2025,
  national: nationalRead(),
  categories: categoriesRead(),
  bigContracts: [
    bigContract(),
    bigContract({ id: '2', title: null, winners: [{ cui: '17042060', name: 'Tehnostrade' }], value: 1_000_000_000 }),
  ],
}

function page(search: ProcurementHomeSearch = {}, initial: ProcurementHomeInitialData = INITIAL) {
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      <TooltipProvider>
        <ProcurementHomePage search={search} initial={initial} />
      </TooltipProvider>
    </QueryClientProvider>
  )
}

/** The search the page asked the router for, applied to what the URL held. */
function navigatedSearch(previous: ProcurementHomeSearch = {}) {
  const call = navigate.mock.lastCall?.[0] as { search: (previous: ProcurementHomeSearch) => ProcurementHomeSearch; replace: boolean; resetScroll: boolean }
  expect(call.replace).toBe(true)
  expect(call.resetScroll).toBe(false)
  return call.search(previous)
}

describe('ProcurementHomePage', () => {
  beforeEach(() => navigate.mockClear())

  it('sends what the loader read in the server HTML', () => {
    const html = renderToStaticMarkup(page())
    expect(html).toContain('Ce cumpără statul')
    // The four figures and what they count.
    expect(html).toContain('Achiziții directe, 2025')
    expect(html).toContain('Contracte atribuite, 2025')
    expect(html).toContain('Și 88.105 acorduri-cadru')
    expect(html).toContain('2,01\u00a0mil. de cumpărături, fără TVA')
    // Where the money goes, who gets it, and the consortia's share.
    expect(html).toContain('La drumuri, poduri și autostrăzi a mers 37%')
    expect(html).toContain('52% din valoarea contractelor atribuite în 2025 a mers la asocieri de firme; la drumuri, 89%.')
    expect(html).toContain('Makyol Insaat · Ozaltin Insaat')
    // A contract SEAP left untitled is named by what it bought.
    expect(html).toContain('Drumuri, poduri și autostrăzi')
    // The source once, with the month the records are complete to.
    expect(html).toContain('date până în mai 2026')
  })

  it('numbers the bands in the owner’s order: the procedures after the years', () => {
    render(page())
    const bar = screen.getByRole('navigation', { name: 'Secțiunile paginii' })
    expect(within(bar).getAllByRole('link').map((link) => link.textContent)).toEqual([
      '01Ce se cumpără',
      '02Cine vinde',
      '03Pe județe',
      '04În timp',
      '05Cum se cumpără',
      '06Cele mai noi',
    ])
    expect(screen.getByText('04 / În timp')).toBeInTheDocument()
    expect(screen.getByText('05 / Cum se cumpără')).toBeInTheDocument()
  })

  it('opens a buyer’s and a contract’s procurement pages', () => {
    render(page())
    expect(screen.getByRole('link', { name: /Regia Națională a Pădurilor Romsilva/ }).getAttribute('href')).toBe('/procurement/institutions/1590120')
    expect(screen.getByRole('link', { name: /Makyol Insaat · Ozaltin Insaat/ }).getAttribute('href')).toBe('/procurement/contracts/51107356')
  })

  it('writes each choice to the URL, leaving the default out', () => {
    render(page())
    fireEvent.click(screen.getAllByRole('radio', { name: 'Achiziții directe' })[0]!)
    expect(navigatedSearch()).toEqual({ bani: 'directe' })

    render(page({ bani: 'directe' }))
    fireEvent.click(screen.getAllByRole('radio', { name: 'Contracte' })[1]!)
    expect(navigatedSearch({ bani: 'directe' })).toEqual({ bani: undefined })
  })

  it('shows the direct sellers when the address asks for them', () => {
    render(page({ firme: 'directe' }))
    expect(screen.getByRole('link', { name: /Selgros Cash & Carry SRL/ }).getAttribute('href')).toBe('/procurement/suppliers/11805367')
  })

  it('mounts on skeletons when a client-side navigation has nothing read yet', () => {
    const html = renderToStaticMarkup(page({}, { year: 2025 }))
    expect(html).toContain('Ce cumpără statul')
    expect(html).not.toContain('Contracte atribuite, 2025')
    expect(html).toContain('aria-busy="true"')
  })
})

describe('ProcurementHomePage without the national read', () => {
  it('keeps the categories and the largest contracts, and every band’s anchor', () => {
    const html = renderToStaticMarkup(page({}, { year: 2025, categories: categoriesRead(), bigContracts: [bigContract()] }))
    expect(html).toContain('La drumuri, poduri și autostrăzi a mers 37%')
    expect(html).toContain('Makyol Insaat · Ozaltin Insaat')
    for (const id of ['ce', 'cine-vinde', 'judete', 'in-timp', 'cum', 'recente']) expect(html).toContain(`id="${id}"`)
  })
})
