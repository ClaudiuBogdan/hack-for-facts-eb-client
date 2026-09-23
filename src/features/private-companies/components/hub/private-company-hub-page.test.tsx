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
 * but the search — and each choice on it is written to the URL.
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

  it('links each company to its profile and each county to its companies in business', () => {
    render(page())
    const leaders = screen.getByTestId('company-hub-leaders')
    const first = COMPANY_HUB_SNAPSHOT.leaders.turnover[0]
    expect(within(leaders).getByText(first?.name ?? '').closest('a')?.getAttribute('href')).toBe(`/companies/${first?.cui}`)

    const bucharest = screen.getAllByRole('link').find((link) => link.getAttribute('data-search')?.includes('Bucureşti'))
    expect(JSON.parse(bucharest?.getAttribute('data-search') ?? '{}')).toEqual({ county: ['Bucureşti'], status: ['1048'] })
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

  it('ranks the sectors by the measure in the URL', () => {
    render(page({ domenii: 'firme' }))
    const sectors = screen.getByTestId('company-hub-sectors')
    // By companies in business, retail leads; by turnover, wholesale does.
    expect(within(sectors).getAllByRole('link')[0]?.textContent).toContain('Comerț cu amănuntul')
  })

  it('opens a sector as the directory prefix query on its companies in business', () => {
    render(page())
    const [first] = within(screen.getByTestId('company-hub-sectors')).getAllByRole('link')
    expect(JSON.parse(first?.getAttribute('data-search') ?? '{}')).toEqual({ caen: COMPANY_HUB_SNAPSHOT.sectors[0]?.division, status: ['1048'] })
  })

  it('ranks all ten companies of each list', () => {
    const { rerender } = render(page())
    expect(within(screen.getByTestId('company-hub-leaders')).getAllByRole('link')).toHaveLength(10)
    rerender(page({ clasament: 'salariati' }))
    expect(within(screen.getByTestId('company-hub-leaders')).getAllByRole('link')).toHaveLength(10)
  })

  it('opens the three starting points as the directory queries their counts describe', () => {
    render(page())
    const start = screen.getByTestId('company-hub-start')
    const searches = within(start)
      .getAllByRole('link')
      .map((link) => JSON.parse(link.getAttribute('data-search') ?? '{}') as Record<string, unknown>)
    expect(searches).toEqual([
      { status: ['1107', '1057', '1139', '1083', '1070'] },
      { inactive: true, status: ['1048'] },
      { status: ['1049', '1113', '1120', '1145', '1098', '1109', '1052'] },
    ])
  })

  it('accounts for every company in the full list of sectors', () => {
    render(page({ domenii: 'firme' }))
    const sectors = screen.getByTestId('company-hub-sectors')
    expect(within(sectors).queryByTestId('company-hub-sectors-rest')).toBeNull()
    fireEvent.click(within(sectors).getByRole('button'))
    // The companies with no recognised main activity close the list, so the shares add up.
    const rest = within(sectors).getByTestId('company-hub-sectors-rest')
    const listed = COMPANY_HUB_SNAPSHOT.sectors.reduce((sum, sector) => sum + sector.activeFirms, 0)
    expect(rest.textContent).toContain(new Intl.NumberFormat('en-GB').format(COMPANY_HUB_SNAPSHOT.national.activeFirms - listed))
  })

  it('marks a ranked company that has left business since', () => {
    render(page())
    const leaders = screen.getByTestId('company-hub-leaders')
    const struck = COMPANY_HUB_SNAPSHOT.leaders.turnover.find((leader) => leader.status === '1084')
    if (!struck) return
    expect(within(leaders).getByText(struck.name).closest('a')?.textContent).toContain('radiată')
  })

  it('does not link a count of new companies to a directory query that lists others', () => {
    // The directory cannot select compact-code registrations or a main
    // activity, so any link from these rows would open a different population.
    render(page())
    expect(within(screen.getByTestId('company-hub-new-sectors')).queryAllByRole('link')).toEqual([])
  })
})
