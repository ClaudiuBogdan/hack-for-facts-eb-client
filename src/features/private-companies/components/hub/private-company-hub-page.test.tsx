import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestQueryClient } from '@/test/test-utils'
import type { CompanyHubSearch } from '@/schemas/private-company-search'
import { COMPANY_HUB_SNAPSHOT } from '../../lib/hub-snapshot'
import { PrivateCompanyHubPage } from './private-company-hub-page'

/**
 * The hub's contract, as far as a unit test holds it: every figure and every
 * way in is in the HTML the server sends — the page asks the API for nothing
 * but the search — each choice on it is written to the URL, and where a
 * figure leads further it opens the companies analysis on the same question.
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
  }) => (
    <a href={params?.cui ? to.replace('$cui', params.cui) : to} data-search={JSON.stringify(search ?? {})} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => navigate,
  useLocation: () => ({ hash: '' }),
}))

vi.mock('@/features/entity-search/api/entity-search-api.live', () => ({
  searchEntitiesLive: vi.fn(),
}))

// The boundary file is fetched in the browser; on the server the map is a box.
vi.mock('@/hooks/useGeoJson', () => ({
  useGeoJsonData: () => ({ data: undefined, isError: false, refetch: vi.fn() }),
}))

function page(search: CompanyHubSearch = {}) {
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      <PrivateCompanyHubPage search={search} />
    </QueryClientProvider>
  )
}

/** A link's target and the search it carries. */
function linkOf(link: HTMLElement | null | undefined) {
  return { to: link?.getAttribute('href'), search: JSON.parse(link?.getAttribute('data-search') ?? '{}') as Record<string, unknown> }
}

/** The search the page asked the router for, applied to what the URL held. */
function navigatedSearch(previous: CompanyHubSearch = {}) {
  const call = navigate.mock.lastCall?.[0] as { search: (previous: CompanyHubSearch) => CompanyHubSearch; replace: boolean }
  expect(call.replace).toBe(true)
  return call.search(previous)
}

describe('PrivateCompanyHubPage', () => {
  beforeEach(() => navigate.mockClear())

  it('sends every figure in the server HTML', () => {
    const html = renderToStaticMarkup(page())
    // The figures band counts up over values it already holds.
    expect(html).toContain(`data-count-value="${COMPANY_HUB_SNAPSHOT.national.activeFirms}"`)
    expect(html).toContain(`data-count-value="${COMPANY_HUB_SNAPSHOT.national.newFirms}"`)
    expect(html).toContain(`data-count-value="${COMPANY_HUB_SNAPSHOT.national.employees}"`)
    // The largest company, the largest sector and a county, all without a request.
    expect(html).toContain(COMPANY_HUB_SNAPSHOT.leaders.turnover[0]?.name)
    expect(html).toContain('Comerț cu ridicata')
    expect(html).toContain('București')
    expect(html).not.toContain('ONRC 1048')
  })

  it('links each company to its profile and each county to its companies in the analysis', () => {
    render(page())
    const leaders = screen.getByTestId('company-hub-leaders')
    const first = COMPANY_HUB_SNAPSHOT.leaders.turnover[0]
    expect(within(leaders).getByText(first?.name ?? '').closest('a')?.getAttribute('href')).toBe(`/companies/${first?.cui}`)

    const bucharest = screen.getAllByRole('link').find((link) => link.getAttribute('data-search')?.includes('"judet":"B"'))
    expect(linkOf(bucharest)).toEqual({ to: '/companies/analytics', search: { an: 2025, indicator: 'turnover', judet: 'B' } })
  })

  it('ranks by turnover until the reader asks for employees, and writes that to the URL', () => {
    const { rerender } = render(page())
    const toggle = screen.getByRole('radiogroup', { name: 'Clasamentul după' })
    fireEvent.click(within(toggle).getByRole('radio', { name: 'Salariați' }))
    expect(navigatedSearch()).toEqual({ clasament: 'salariati' })

    rerender(page({ clasament: 'salariati' }))
    const leaders = screen.getByTestId('company-hub-leaders')
    expect(within(leaders).getByText(COMPANY_HUB_SNAPSHOT.leaders.employees[0]?.name ?? '')).toBeInTheDocument()
  })

  it('never writes a default into the URL', () => {
    render(page({ indicator: 'infiintari', domenii: 'salariati' }))
    fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Indicatorul de pe hartă' })).getByRole('radio', { name: 'La 1.000 de locuitori' }))
    expect(navigatedSearch({ indicator: 'infiintari', domenii: 'salariati' })).toEqual({ indicator: undefined, domenii: 'salariati' })
  })

  it('ranks the sectors by the measure in the URL, the first ten', () => {
    render(page({ domenii: 'firme' }))
    const rows = within(screen.getByTestId('company-hub-sectors')).getAllByRole('listitem')
    expect(rows).toHaveLength(10)
    // By companies in business, retail leads; by turnover, wholesale does.
    expect(rows[0]?.textContent).toContain('Comerț cu amănuntul')
  })

  it('opens the rest of the activities in the analysis; a domain row opens nothing it could not select', () => {
    const { rerender } = render(page())
    const sectors = screen.getByTestId('company-hub-sectors')
    // The analysis filters exact codes, never a division: the rows are not links.
    const [more, ...rest] = within(sectors).getAllByRole('link')
    expect(rest).toEqual([])
    expect(linkOf(more)).toEqual({ to: '/companies/analytics', search: { an: 2025, indicator: 'turnover', vedere: 'defalcare', dupa: 'caen' } })
    rerender(page({ domenii: 'firme' }))
    expect(linkOf(within(screen.getByTestId('company-hub-sectors')).getByRole('link')).search).toEqual({ an: 2025, indicator: 'turnover', vedere: 'defalcare', dupa: 'caen', clasare: 'firme' })
  })

  it('ranks the ten largest companies of each list, and opens the rest in the analysis', () => {
    const { rerender } = render(page())
    const leaders = () => within(screen.getByTestId('company-hub-leaders')).getAllByRole('link')
    const more = () => screen.getByRole('link', { name: /Toate firmele, în analiza bilanțurilor/ })
    expect(leaders()).toHaveLength(10)
    expect(linkOf(more())).toEqual({ to: '/companies/analytics', search: { an: 2025, indicator: 'turnover' } })
    rerender(page({ clasament: 'salariati' }))
    expect(leaders()).toHaveLength(10)
    expect(linkOf(more()).search).toEqual({ an: 2025, indicator: 'employees' })
  })

  it('opens the three starting points as the same selections in the analysis', () => {
    render(page())
    const start = screen.getByTestId('company-hub-start')
    const links = within(start).getAllByRole('link').map(linkOf)
    expect(links.map((link) => link.to)).toEqual(['/companies/analytics', '/companies/analytics', '/companies/analytics'])
    expect(links.map((link) => link.search)).toEqual([
      { an: 2025, indicator: 'turnover', stare: '1057,1070,1083,1107,1139' },
      { an: 2025, indicator: 'turnover', stare: 1048, inactiv: 'da' },
      { an: 2025, indicator: 'turnover', stare: '1049,1052,1098,1109,1113,1120,1145' },
    ])
  })

  it('marks a ranked company that has left business since', () => {
    render(page())
    const leaders = screen.getByTestId('company-hub-leaders')
    const struck = COMPANY_HUB_SNAPSHOT.leaders.turnover.find((leader) => leader.status === '1084')
    if (!struck) return
    expect(within(leaders).getByText(struck.name).closest('a')?.textContent).toContain('radiată')
  })

  it('draws the economy through the analysis release’s years, the last one still being filed', () => {
    render(page())
    const chart = screen.getByTestId('company-hub-economy-chart')
    const years = COMPANY_HUB_SNAPSHOT.years
    expect(within(chart).getByRole('slider').getAttribute('aria-label')).toBe(`Cifra de afaceri, ${years[0]?.year}–${years[years.length - 1]?.year}`)
    // Fewer statements than the year before: hatched, and said.
    expect(chart.textContent).toContain(`${years[years.length - 1]?.year}: bilanțurile încă se depun`)
    // The span runs from the first year to the last whole one.
    const span = screen.getByTestId('company-hub-economy-span')
    expect(span.textContent).toContain(String(years[0]?.year))
    expect(span.textContent).toContain(String(years[years.length - 2]?.year))
  })

  it('writes the years’ measure to the URL, and opens it in the analysis', () => {
    const { rerender } = render(page())
    fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Anii după' })).getByRole('radio', { name: 'Rezultatul net' }))
    expect(navigatedSearch()).toEqual({ evolutie: 'rezultat-net' })
    rerender(page({ evolutie: 'rezultat-net' }))
    expect(within(screen.getByTestId('company-hub-economy-chart')).getByRole('slider').getAttribute('aria-label')).toMatch(/^Rezultatul net, /)
    const open = screen.getAllByRole('link', { name: /Deschide în analiza bilanțurilor/ }).map(linkOf)
    expect(open).toContainEqual({ to: '/companies/analytics', search: { an: 2025, indicator: 'net_result', mod: 'grafice', vedere: 'evolutie', cohorta: 'fiecare-an' } })
  })

  it('does not link a count of new companies to a directory query that lists others', () => {
    // The directory cannot select compact-code registrations or a main
    // activity, so any link from these rows would open a different population.
    render(page())
    expect(within(screen.getByTestId('company-hub-new-sectors')).queryAllByRole('link')).toEqual([])
  })
})
