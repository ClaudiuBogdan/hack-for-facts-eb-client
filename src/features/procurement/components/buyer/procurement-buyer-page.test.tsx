import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestQueryClient } from '@/test/test-utils'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { ProcurementBuyerSearch } from '@/schemas/procurement-buyer'
import { buyerProfile, buyerRecords } from '../../lib/buyer.fixture'
import { ProcurementBuyerPage, type ProcurementBuyerInitialData } from './procurement-buyer-page'

/**
 * The buyer page's contract, as far as a unit test holds it: what the loader
 * read is in the HTML the server sends — the buyer named by its place, the
 * year in a sentence, the figures, the firms by name — in the owner's band
 * order, and each choice written to the URL with its default left out.
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

// The page's reads never land here: what it shows is what the loader seeded.
vi.mock('../../api/procurement-buyer-api', () => ({
  fetchProcurementBuyer: vi.fn(() => new Promise(() => undefined)),
  fetchProcurementBuyerRecords: vi.fn(() => new Promise(() => undefined)),
}))
vi.mock('@/lib/utils', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils')>()), getUserLocale: () => 'ro' }))

const INITIAL: ProcurementBuyerInitialData = { year: 2025, profile: buyerProfile(), records: buyerRecords() }

function page(search: ProcurementBuyerSearch = {}, initial: ProcurementBuyerInitialData = INITIAL, cui = '4364446') {
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      <TooltipProvider>
        <ProcurementBuyerPage cui={cui} search={search} initial={initial} />
      </TooltipProvider>
    </QueryClientProvider>
  )
}

/** The search a navigation wrote, from the updater the page passed. */
function lastSearch(previous: Record<string, unknown> = {}): Record<string, unknown> {
  const call = navigate.mock.calls[navigate.mock.calls.length - 1]?.[0] as { readonly search: (previous: Record<string, unknown>) => Record<string, unknown> }
  return call.search(previous)
}

describe('ProcurementBuyerPage', () => {
  beforeEach(() => {
    navigate.mockReset()
  })

  it('server-renders the buyer, its year and its firms from the loader’s read', () => {
    const html = renderToStaticMarkup(page())
    expect(html).toContain('Orașul Otopeni')
    expect(html).toContain('Oraș din județul Ilfov, cu 22.660 de locuitori.')
    expect(html).toContain('Upper Level SRL')
    expect(html).toContain('Costalex Construct SRL')
    expect(html).toContain('Construct &amp; Acting SRL')
    expect(html).toContain('href="/entities/4364446"')
    expect(html).toContain('Datele merg până în mai 2026.')
  })

  it('says how many contracts the contract money covers, and compares 2019 with no year before it', () => {
    const html = renderToStaticMarkup(page())
    // 5 of the 12 awards carry a value: the sum is theirs.
    expect(html).toContain('15,1\u00a0mil.\u00a0lei la 5 contracte, provizoriu')
    expect(html).toContain('+44% față de 2024')
    const first = renderToStaticMarkup(page({}, { year: 2019, profile: buyerProfile({ year: 2019, directPrev: null }) }))
    expect(first).not.toContain('față de 2018')
  })

  it('numbers the bands in the owner’s order, the context last', () => {
    render(page())
    const nav = screen.getByRole('navigation', { name: 'Secțiunile paginii' })
    expect(within(nav).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      '#ce',
      '#de-la-cine',
      '#de-unde',
      '#cand',
      '#cum',
      '#cele-mai-mari',
      '#context',
    ])
  })

  it('writes a band’s choice to the URL, and leaves its default out', () => {
    render(page())
    fireEvent.click(within(document.getElementById('ce')!).getByRole('radio', { name: 'Contracte' }))
    expect(lastSearch({ year: 2023 })).toEqual({ year: 2023, ce: 'contracte' })
    // „Cele mai mari" opens on contracts when the year has any; direct purchases are the choice.
    fireEvent.click(within(document.getElementById('cele-mai-mari')!).getByRole('radio', { name: 'Achiziții directe' }))
    expect(lastSearch()).toEqual({ mari: 'directe' })
  })

  it('makes a year from the chart the page’s, the last complete one without a parameter', () => {
    render(page())
    fireEvent.click(screen.getByRole('button', { name: /^2019:/ }))
    expect(lastSearch()).toEqual({ year: 2019 })
    fireEvent.click(screen.getByRole('button', { name: /^2025:/ }))
    expect(lastSearch({ year: 2019 })).toEqual({ year: undefined })
    // The year in progress is reachable (its figures are in its name) but cannot be picked.
    const partYear = screen.getByRole('button', { name: /^2026:/ })
    expect(partYear).toHaveAttribute('aria-disabled', 'true')
    navigate.mockClear()
    fireEvent.click(partYear)
    expect(navigate).not.toHaveBeenCalled()
  })

  it('opens each county row on exactly the purchases it counts', () => {
    render(page())
    const county = within(document.getElementById('de-unde')!).getAllByRole('link')[0]!
    expect(JSON.parse(county.getAttribute('data-search') ?? '{}')).toEqual({
      view: 'list',
      grain: 'direct_acquisitions',
      authority_cui: '4364446',
      supplierCounty: 'IF',
      year: 2025,
    })
  })

  it('says a year with no record once, instead of seven empty bands', () => {
    const none = { count: 0, valued: 0, value: null, suppliers: 0 }
    render(page({}, { year: 2025, profile: buyerProfile({ direct: none, awards: none, frameworks: 0, procedures: [] }) }))
    expect(screen.getByRole('heading', { name: 'Nicio achiziție în 2025' })).toBeInTheDocument()
    expect(document.getElementById('ce')).toBeNull()
    expect(document.getElementById('cele-mai-mari')).toBeNull()
  })

  it('shows CUIs and says why when the names could not be read', () => {
    render(page({}, { year: 2025, profile: buyerProfile({ partial: true, namesUnread: true, names: new Map(), supplierYears: [] }) }))
    expect(screen.getByText(/firmele apar cu codul fiscal/)).toBeInTheDocument()
    expect(within(document.getElementById('de-la-cine')!).getByText('30153499')).toBeInTheDocument()
  })

  it('shows the way back and the CUI while the profile is on its way', () => {
    render(page({}, { year: 2025 }))
    expect(screen.getByRole('link', { name: /Achiziții publice/ })).toHaveAttribute('href', '/procurement')
    expect(screen.getByText('4364446')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Secțiunile paginii' })).toBeNull()
  })
})
