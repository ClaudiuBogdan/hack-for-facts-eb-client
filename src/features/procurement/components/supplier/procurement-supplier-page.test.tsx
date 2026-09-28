import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestQueryClient } from '@/test/test-utils'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { ProcurementSupplierSearch } from '@/schemas/procurement-supplier'
import { consortiumContracts, supplierDirect, supplierProfile } from '../../lib/supplier.fixture'
import { ProcurementSupplierPage, type ProcurementSupplierInitialData } from './procurement-supplier-page'

/**
 * The firm's page's contract, as far as a unit test holds it: what the loader
 * read is in the HTML the server sends — the firm in the company profile's
 * words, its year's sales, what it was to its clients — in the owner's band
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
vi.mock('../../api/procurement-supplier-api', () => ({
  SUPPLIER_LARGEST_RECORDS: 8,
  fetchProcurementSupplier: vi.fn(() => new Promise(() => undefined)),
  fetchProcurementSupplierDirect: vi.fn(() => new Promise(() => undefined)),
}))
vi.mock('@/lib/utils', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils')>()), getUserLocale: () => 'ro' }))

const INITIAL: ProcurementSupplierInitialData = { year: 2025, profile: supplierProfile(), direct: supplierDirect() }

function page(search: ProcurementSupplierSearch = {}, initial: ProcurementSupplierInitialData = INITIAL, cui = '9813902') {
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      <TooltipProvider>
        <ProcurementSupplierPage cui={cui} search={search} initial={initial} />
      </TooltipProvider>
    </QueryClientProvider>
  )
}

/** The search a navigation wrote, from the updater the page passed. */
function lastSearch(previous: Record<string, unknown> = {}): Record<string, unknown> {
  const call = navigate.mock.calls[navigate.mock.calls.length - 1]?.[0] as { readonly search: (previous: Record<string, unknown>) => Record<string, unknown> }
  return call.search(previous)
}

describe('ProcurementSupplierPage', () => {
  beforeEach(() => {
    navigate.mockReset()
  })

  it('server-renders the firm in the company profile’s words, its year and its clients', () => {
    const html = renderToStaticMarkup(page())
    expect(html).toContain('Costalex Construct SRL')
    expect(html).toContain('Societate cu răspundere limitată din Otopeni, Ilfov, înregistrată în 2002.')
    expect(html).toContain('În 2025 a vândut direct de 4,8 mil. lei, fără TVA, la 5 instituții și a câștigat 1 contract.')
    expect(html).toContain('În procedura insolvenței.')
    expect(html).toContain('Orasul Otopeni')
    // The relationship from the institution's side.
    expect(html).toContain('cel mai mare furnizor direct al ei: 29% din achizițiile ei')
    expect(html).toContain('href="/companies/9813902"')
    expect(html).toContain('Datele SEAP merg până în iunie 2026.')
  })

  it('numbers the bands in the owner’s order, the firm last, and adds partners only for a firm that has them', () => {
    const { unmount } = render(page())
    const bands = () => within(screen.getByRole('navigation', { name: 'Secțiunile paginii' })).getAllByRole('link').map((link) => link.getAttribute('href'))
    expect(bands()).toEqual(['#clienti', '#ce', '#unde', '#cum', '#cele-mai-mari', '#firma'])
    unmount()
    render(page({}, { year: 2025, profile: supplierProfile({ contracts: consortiumContracts() }) }))
    expect(bands()).toEqual(['#clienti', '#ce', '#unde', '#cum', '#cu-cine', '#cele-mai-mari', '#firma'])
    expect(document.getElementById('cu-cine')?.textContent).toContain('Cel mai des, cu Dexamart: 6 contracte.')
  })

  it('makes a year from the chart the page’s, the year in progress included, the last complete one without a parameter', () => {
    render(page({}, { year: 2025, profile: supplierProfile({ partYear: 2026, directYears: [...supplierProfile().directYears, { year: 2026, value: 1_000_000, count: 3 }] }) }))
    fireEvent.click(screen.getByRole('button', { name: /^2019:/ }))
    expect(lastSearch()).toEqual({ year: 2019 })
    fireEvent.click(screen.getByRole('button', { name: /^2025:/ }))
    expect(lastSearch({ year: 2019 })).toEqual({ year: undefined })
    fireEvent.click(screen.getByRole('button', { name: /^2026:/ }))
    expect(lastSearch()).toEqual({ year: 2026 })
  })

  it('lists the year in progress first in the head’s dropdown, marked, and a year with no sale says so', async () => {
    render(page())
    const select = screen.getByRole('combobox', { name: 'Anul' })
    fireEvent.keyDown(select, { key: 'ArrowDown' })
    const options = await screen.findAllByRole('option')
    expect(options.map((option) => option.textContent?.slice(0, 4))).toEqual(['2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019'])
    expect(options[0]).toHaveTextContent('în curs')
    expect(options[1]).toHaveTextContent(/mil\. lei · 1 contract/)
    expect(options[3]).toHaveTextContent('fără vânzări')
    fireEvent.click(options[0]!)
    expect(lastSearch()).toEqual({ year: 2026 })
  })

  it('writes a band’s choice to the URL, and leaves its default out', () => {
    render(page())
    fireEvent.click(within(document.getElementById('ce')!).getByRole('radio', { name: 'Contracte' }))
    expect(lastSearch()).toEqual({ ce: 'contracte' })
  })

  it('ignores a choice the year cannot show: a firm with only direct purchases that year has no contracts to pick', () => {
    const direct = supplierProfile({ contracts: { ...supplierProfile().contracts, count: 0, clients: null, buyers: null }, awards: { count: 0, valued: 0, value: null } })
    render(page({ ce: 'contracte' }, { year: 2025, profile: direct, direct: supplierDirect() }))
    const band = document.getElementById('ce')!
    expect(within(band).queryByRole('radio')).toBeNull()
    expect(band.textContent).toContain('Drumuri')
  })

  it('says how recent the year in progress is, and compares it with nothing', () => {
    const html = renderToStaticMarkup(page({ year: 2026 }, { year: 2026, profile: supplierProfile({ year: 2026, through: '2026-05', directPrev: null }) }))
    expect(html).toContain('Date actualizate până la 31 mai 2026')
    expect(html).not.toContain('față de')
    // A client's page opens on the same year.
    expect(html).toContain('data-search="{&quot;year&quot;:2026}"')
  })

  it('says a year with no sale, and names a firm the registry does not hold by its records', () => {
    const none = { count: 0, valued: 0, value: null, clients: 0 }
    const empty = renderToStaticMarkup(page({}, { year: 2025, profile: supplierProfile({ direct: none, contracts: { ...supplierProfile().contracts, count: 0 } }) }))
    expect(empty).toContain('Nicio vânzare către stat în 2025')
    const foreign = renderToStaticMarkup(page({}, { year: 2024, profile: supplierProfile({ cui: '103029862', year: 2024, registry: null, name: 'Hydrostroy AD', contracts: consortiumContracts() }) }, '103029862'))
    expect(foreign).toContain('Hydrostroy AD')
    expect(foreign).toContain('Firma nu are fișă în registrul comerțului; de regulă, e o firmă străină.')
    expect(foreign).not.toContain('href="/companies/103029862"')
    // A registry that could not be read says nothing of the firm, rather than call it foreign.
    render(page({}, { year: 2025, profile: supplierProfile({ registry: null, registryFailed: true, partial: true }) }))
    expect(screen.getByRole('heading', { level: 1 }).nextElementSibling?.textContent).toMatch(/^În 2025 a vândut direct/)
    expect(screen.getByRole('link', { name: 'Profilul firmei' }).getAttribute('href')).toBe('/companies/9813902')
  })
})
