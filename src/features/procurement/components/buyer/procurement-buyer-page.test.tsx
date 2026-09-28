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
import { recentPeriod, yearPeriod } from '../../lib/profile-period.fixture'

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

const INITIAL: ProcurementBuyerInitialData = { choice: 2025, profile: buyerProfile(), records: buyerRecords() }

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
    const first = renderToStaticMarkup(page({}, { choice: 2019, profile: buyerProfile({ period: yearPeriod(2019), directPrev: null }) }))
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

  it('makes a year from the chart the page’s, the year in progress included, and writes it out', () => {
    render(page())
    fireEvent.click(screen.getByRole('button', { name: /^2019:/ }))
    expect(lastSearch()).toEqual({ year: 2019 })
    fireEvent.click(screen.getByRole('button', { name: /^2026:/ }))
    expect(lastSearch({ year: 2019 })).toEqual({ year: 2026 })
    // The page's default moves with the data, so a year picked stays in the URL.
    fireEvent.click(screen.getByRole('button', { name: /^2025:/ }))
    expect(lastSearch({ year: 2026 })).toEqual({ year: 2025 })
  })

  it('draws the page’s year on the chart even with no record in it', () => {
    const none = { count: 0, valued: 0, value: null, suppliers: 0 }
    render(page({ year: 2026 }, { choice: 2026, profile: buyerProfile({ period: yearPeriod(2026, '2026-05'), partYear: null, directYears: buyerProfile().directYears.filter((point) => point.year < 2026), direct: none, awards: none }) }))
    expect(screen.getByRole('button', { name: /^2026:/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('says how recent the year in progress is, and marks the months not read yet', () => {
    const months = buyerProfile().directMonths.map((month, index) => ({ ...month, month: `2026-${month.month.slice(5)}`, value: index < 5 ? 500_000 : null }))
    render(page({ year: 2026 }, { choice: 2026, profile: buyerProfile({ period: yearPeriod(2026, '2026-05'), directPrev: null, directMonths: months }) }))
    expect(screen.getAllByText('Date actualizate până la 31 mai 2026')).not.toHaveLength(0)
    // June through December: not read yet, not months with no purchase.
    expect(within(document.getElementById('cand')!).getAllByRole('button', { name: /: încă fără date$/ })).toHaveLength(7)
    expect(document.body.textContent).not.toContain('față de 2025')
    // Months of the year over a whole year's residents: said as such.
    expect(document.body.textContent).toContain('achiziții directe, până în mai 2026')
    // The explorer opens on the page's months, never the calendar year.
    const searches = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href') === '/procurement/search')
      .map((link) => JSON.parse(link.getAttribute('data-search') ?? '{}') as Record<string, unknown>)
    expect(searches.some((search) => search.year === 2026)).toBe(false)
    expect(searches.filter((search) => search.dateTo === '2026-05-31').length).toBeGreaterThan(1)
  })

  it('picks the period from the head’s list: the last twelve months first, then the years, the year in progress marked', async () => {
    render(page({ year: 2025 }))
    const select = screen.getByRole('combobox', { name: 'Perioada' })
    expect(select).toHaveTextContent('2025')
    fireEvent.keyDown(select, { key: 'ArrowDown' })
    const options = await screen.findAllByRole('option')
    expect(options.map((option) => option.textContent?.slice(0, 4))).toEqual(['Ulti', '2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019'])
    // Their months, from the read's cutoff; their figures only once the page shows them.
    expect(options[0]).toHaveTextContent('Ultimele 12 luni, mai 2025 – aprilie 2026')
    expect(options[1]).toHaveTextContent('în curs')
    expect(options[2]).toHaveTextContent(/mil\. lei · 12 contracte/)
    fireEvent.click(screen.getByRole('option', { name: /^2019/ }))
    expect(lastSearch()).toEqual({ year: 2019 })
    // The last twelve months are the default: they leave the URL.
    fireEvent.keyDown(select, { key: 'ArrowDown' })
    fireEvent.click(await screen.findByRole('option', { name: /^Ultimele 12 luni/ }))
    expect(lastSearch({ year: 2019 })).toEqual({ year: undefined })
  })

  it('shows the last twelve months — the default — in their own words, against the twelve before', () => {
    const months = ['2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05'].map((month) => ({
      month,
      value: month === '2025-12' ? 6_000_000 : 1_000_000,
      count: 20,
    }))
    const profile = buyerProfile({ period: recentPeriod('2026-05'), cutoff: { direct: '2026-05', contract: '2026-05' }, directMonths: months })
    render(page({}, { choice: 'recent', profile, records: buyerRecords() }))
    expect(screen.getByRole('combobox', { name: 'Perioada' })).toHaveTextContent('Ultimele 12 luni')
    expect(screen.getByRole('heading', { level: 1 }).nextElementSibling?.textContent).toMatch(/În ultimele 12 luni \(iunie 2025 – mai 2026\) a făcut 293 de achiziții directe/)
    expect(screen.getAllByText('Date actualizate până la 31 mai 2026')).not.toHaveLength(0)
    expect(document.body.textContent).toContain('față de cele 12 luni dinainte')
    // No year pressed on the chart: its line says the twelve months.
    expect(screen.queryAllByRole('button', { pressed: true }).filter((button) => /^\d{4}:/.test(button.getAttribute('aria-label') ?? ''))).toEqual([])
    expect(document.body.textContent).toContain('Ultimele 12 luni: 36,4')
    // The month strip runs across the two years, December still marked, each year named where it begins.
    const strip = within(document.getElementById('cand')!)
    expect(strip.getAllByRole('button').map((button) => button.getAttribute('aria-label')?.split(':')[0])).toHaveLength(12)
    expect(document.getElementById('cand')?.textContent).toContain('20252026')
    expect(document.getElementById('cand')?.textContent).toContain('Decembrie a adus')
    // The explorer and the other pages open on the same months.
    const searches = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href') === '/procurement/search')
      .map((link) => JSON.parse(link.getAttribute('data-search') ?? '{}') as Record<string, unknown>)
    expect(searches.filter((search) => search.dateFrom === '2025-06-01' && search.dateTo === '2026-05-31').length).toBeGreaterThan(1)
    const firm = screen.getAllByRole('link').find((link) => link.getAttribute('href')?.startsWith('/procurement/suppliers/'))!
    expect(JSON.parse(firm.getAttribute('data-search') ?? '{}')).toEqual({})
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
    render(page({}, { choice: 2025, profile: buyerProfile({ direct: none, awards: none, frameworks: 0, procedures: [] }) }))
    expect(screen.getByRole('heading', { name: 'Nicio achiziție în 2025' })).toBeInTheDocument()
    expect(document.getElementById('ce')).toBeNull()
    expect(document.getElementById('cele-mai-mari')).toBeNull()
    // The way out is the newest year with records — here the year in progress — as a link.
    const other = screen.getByRole('link', { name: 'Vezi 2026' })
    expect(other).toHaveAttribute('href', '/procurement/institutions/4364446')
    expect(JSON.parse(other.getAttribute('data-search') ?? '{}')).toEqual({ year: 2026 })
  })

  it('shows CUIs and says why when the names could not be read', () => {
    render(page({}, { choice: 2025, profile: buyerProfile({ partial: true, namesUnread: true, names: new Map(), supplierYears: [] }) }))
    expect(screen.getByText(/firmele apar cu codul fiscal/)).toBeInTheDocument()
    expect(within(document.getElementById('de-la-cine')!).getByText('30153499')).toBeInTheDocument()
  })

  it('says when the last twelve months could not be read, shows the last complete year, and holds the records back', () => {
    // The profile fell back (no cutoff); the records, read for the last twelve months, are not the year's.
    render(page({}, { choice: 'recent', profile: buyerProfile({ partial: true }), records: buyerRecords() }))
    expect(screen.getByRole('status')).toHaveTextContent('Ultimele 12 luni nu s-au putut citi acum; pagina arată 2025.')
    expect(screen.getByRole('combobox', { name: 'Perioada' })).toHaveTextContent('Ultimele 12 luni')
    expect(within(document.getElementById('cele-mai-mari')!).queryAllByRole('link').filter((link) => link.getAttribute('href')?.startsWith('/procurement/contracts/'))).toEqual([])
  })

  it('shows the way back, the year and the CUI while the profile is on its way', () => {
    render(page({}, { choice: 2023 }))
    expect(screen.getByRole('link', { name: /Achiziții publice/ })).toHaveAttribute('href', '/procurement')
    expect(screen.getByRole('combobox', { name: 'Perioada' })).toHaveTextContent('2023')
    expect(screen.getByText('4364446')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Secțiunile paginii' })).toBeNull()
  })
})
