import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestQueryClient } from '@/test/test-utils'
import type { CompanyAnalysisActivity } from '@/schemas/company-analytics'
import type { CompanyHubSearch } from '@/schemas/private-company-search'
import { COMPANY_HUB_ACTIVITIES } from '../../lib/hub-activities'
import { COMPANY_HUB_SNAPSHOT } from '../../lib/hub-snapshot'
import { HubLeaders } from './hub-leaders'
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
    // The density layer counts companies in business: the county opens those.
    expect(linkOf(bucharest)).toEqual({ to: '/companies/analytics', search: { an: 2025, indicator: 'turnover', judet: 'B', stare: 1048 } })
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

  it('ranks the derived activity selection by the measure in the URL, each class in its own revision', () => {
    render(page({ domenii: 'firme' }))
    const activities = screen.getByTestId('company-hub-activities')
    const rows = within(activities.querySelector('ol') as HTMLElement).getAllByRole('listitem')
    expect(rows).toHaveLength(10)
    // By companies observed in business, Rev.2 4120 leads — and Rev.2 and Rev.3 4941 are two rows, never one.
    expect(rows[0]?.textContent).toContain('4120 · ONRC Rev.2')
    expect(rows.filter((row) => /4941 · ONRC Rev\.[23]/u.test(row.textContent ?? ''))).toHaveLength(2)
    // The rest and the companies with no selection, counted apart from the ranking. (The test's numbers are English.)
    const rest = within(screen.getByTestId('company-hub-activities-rest')).getAllByRole('listitem').map((row) => row.textContent ?? '')
    expect(rest.some((text) => /^Alte 2[.,]?577 de activități selectate/u.test(text))).toBe(true)
    expect(rest.some((text) => text.startsWith('Mai multe activități clasificate ONRC, niciuna selectată'))).toBe(true)
    // No division, no Rev.2 sector name borrowed for an ANAF code.
    expect(activities.textContent).not.toMatch(/Software și servicii IT|Comerț cu ridicata\b(?! al)/u)
  })

  it('takes its shares of the analysis’s own total, and says so', () => {
    render(page())
    const activities = screen.getByTestId('company-hub-activities')
    // Rev.3 4711: 92,0 mld. of the 2.780,3 mld. lei admitted — not of the raw 2.841,2 mld. in the figures band.
    expect(within(activities).getAllByRole('listitem')[0]?.textContent).toMatch(/3[.,]3\s?%/u)
    expect(activities.textContent).toMatch(/Procente din 2[.,]780[.,]3\smld\.\slei, cifra de afaceri admisă pe 2025 în analiza bilanțurilor, ediția 7\./u)
    // The unselected keep their share: several ONRC classes and no selection hold 21,2% of the turnover.
    expect(within(screen.getByTestId('company-hub-activities-rest')).getByText('Mai multe activități clasificate ONRC, niciuna selectată').parentElement?.textContent).toMatch(/21[.,]2\s?%/u)
  })

  it('opens each row’s exact selection, and every activity, on the question its figure counts — in the release it was read from', () => {
    const { rerender } = render(page())
    const links = () => within(screen.getByTestId('company-hub-activities')).getAllByRole('link').map(linkOf)
    // The snapshot's release (`editie`), so a later release cannot answer a row with other companies.
    const release = Number(COMPANY_HUB_ACTIVITIES.source.releaseId)
    // An ONRC row: its exact selection with its revision; the analysis's companies by turnover.
    expect(links()[0]).toEqual({ to: '/companies/analytics', search: { an: 2025, indicator: 'turnover', activitate: 'onrc:rev3:4711', editie: release } })
    // Every activity: the same grouping the band ranks (the derived selection), not ANAF's raw code.
    expect(links()[links().length - 1]).toEqual({ to: '/companies/analytics', search: { an: 2025, indicator: 'turnover', vedere: 'defalcare', dupa: 'activitate', editie: release } })
    rerender(page({ domenii: 'firme' }))
    // Companies observed in business, ranked by their count: the population the figure counts.
    expect(links()[0]?.search).toEqual({ an: 2025, indicator: 'turnover', activitate: 'onrc:rev2:4120', stare: 1048, editie: release })
    expect(links()[links().length - 1]?.search).toEqual({ an: 2025, indicator: 'turnover', vedere: 'defalcare', dupa: 'activitate', clasare: 'firme', stare: 1048, editie: release })
    rerender(page({ domenii: 'salariati' }))
    // Within the hub's headcounts, as the ranking was read.
    expect(links()[0]?.search).toEqual({ an: 2025, indicator: 'employees', activitate: 'onrc:rev3:4100', interval: 'employees:0~50000', editie: release })
    expect(links()[links().length - 1]?.search).toEqual({ an: 2025, indicator: 'employees', vedere: 'defalcare', dupa: 'activitate', interval: 'employees:0~50000', editie: release })
    // Every row of all three rankings is pinned, not only the first.
    for (const domenii of [undefined, 'salariati', 'firme'] as const) {
      rerender(page(domenii ? { domenii } : {}))
      expect(links().every((link) => link.search.editie === release)).toBe(true)
    }
  })

  it('ranks the ten largest companies of each list, and opens the rest in the analysis', () => {
    const { rerender } = render(page())
    const leaders = () => within(screen.getByTestId('company-hub-leaders')).getAllByRole('link')
    const more = () => screen.getByRole('link', { name: /Toate firmele, în analiza bilanțurilor/ })
    expect(leaders()).toHaveLength(10)
    expect(linkOf(more())).toEqual({ to: '/companies/analytics', search: { an: 2025, indicator: 'turnover' } })
    rerender(page({ clasament: 'salariati' }))
    expect(leaders()).toHaveLength(10)
    // Within the hub's headcounts: the keying error the ten leave out stays out there too.
    expect(linkOf(more()).search).toEqual({ an: 2025, indicator: 'employees', interval: 'employees:0~50000' })
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

  it('marks a ranked company that has left business since, before the activity the line may cut', () => {
    // Whether a real leader has: the snapshot need not hold one, so a leader is made to.
    const leader = COMPANY_HUB_SNAPSHOT.leaders.turnover[0]
    if (!leader) throw new Error('the snapshot ranks no company')
    const activity: CompanyAnalysisActivity = { basis: 'ONRC_CLASS_ANAF_NUMERIC_MATCH', source: 'ONRC', code: '4711', revision: 'rev3', label: 'Comerț cu amănuntul nespecializat', descriptionStatus: 'EXACT', descriptions: [], derived: true }
    render(<HubLeaders leaders={[{ ...leader, county: 'TM', status: '1084', activity }]} unit="lei" limit={10} />)
    expect(screen.getByText(leader.name).closest('a')?.textContent).toContain('Timiș · radiată · 4711 · Comerț cu amănuntul nespecializat · ONRC Rev.3')
  })

  it('names a ranked company by the release’s selection, or why it has none — never by ANAF’s fiscal division', () => {
    const [selected, unselected] = COMPANY_HUB_SNAPSHOT.leaders.turnover
    if (!selected || !unselected) throw new Error('the snapshot ranks no company')
    const none: CompanyAnalysisActivity = { basis: 'ONRC_MULTIPLE_CLASSES', source: null, code: null, revision: null, label: null, descriptionStatus: null, descriptions: [], derived: true }
    render(<HubLeaders leaders={[{ ...selected, county: 'B', status: '1048', activity: null }, { ...unselected, county: 'B', status: '1048', activity: none }]} unit="lei" limit={10} />)
    const [first, second] = within(screen.getByTestId('company-hub-leaders')).getAllByRole('link')
    // A company the release does not hold: its county alone.
    expect(first?.textContent).toMatch(/București(?!\s*·)/u)
    expect(second?.textContent).toContain('București · Mai multe activități clasificate ONRC, niciuna selectată')
  })

  it('draws the economy through the analysis release’s years, the last one possibly incomplete', () => {
    render(page())
    const chart = screen.getByTestId('company-hub-economy-chart')
    const years = COMPANY_HUB_SNAPSHOT.years
    expect(within(chart).getByRole('slider').getAttribute('aria-label')).toBe(`Cifra de afaceri, ${years[0]?.year}–${years[years.length - 1]?.year}`)
    // Fewer statements than the year before: hatched, and said as possible, not as fact.
    expect(chart.textContent).toContain(`${years[years.length - 1]?.year}: mai puține bilanțuri decât în ${years[years.length - 2]?.year}, posibil incomplet`)
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

  it('draws no activity breakdown of the year’s new companies: no qualified one exists for that cohort', () => {
    // The analysis has no registration-year filter, and an ANAF code read into a division is no qualified activity.
    render(page())
    expect(screen.queryByTestId('company-hub-new-sectors')).toBeNull()
  })
})
