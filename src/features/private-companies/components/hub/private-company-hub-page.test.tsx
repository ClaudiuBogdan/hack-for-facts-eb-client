import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { createTestQueryClient } from '@/test/test-utils'
import type { CompanyCountyCounts, CompanyHubStats } from '@/schemas/private-company-search'
import { PrivateCompanyHubPage } from './private-company-hub-page'

/**
 * The hub's contract, as far as a unit test holds it.
 *
 * The page decorates server-rendered text — the reveal fades it in, the
 * count-up animates figures that are already written — so every word and every
 * number a reader needs must be in the HTML the server sends. A reader whose
 * JavaScript never arrives still gets the page, the figures and the links.
 */

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    search,
    preload: _preload,
    ...props
  }: {
    readonly children: ReactNode
    readonly to: string
    readonly search?: unknown
    readonly preload?: unknown
  }) => (
    <a href={typeof to === 'string' ? to : '#'} data-search={JSON.stringify(search ?? {})} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
  useSearch: () => ({}),
}))

vi.mock('@/features/entity-search/api/entity-search-api.live', () => ({
  searchEntitiesLive: vi.fn(),
}))

// The boundary file is fetched in the browser; server-side the map is a box.
vi.mock('@/hooks/useGeoJson', () => ({
  useGeoJsonData: () => ({ data: undefined, isError: false, refetch: vi.fn() }),
}))

const STATS: CompanyHubStats = {
  totalCompanies: 3_892_657,
  activeCompanies: 1_749_479,
  statusMix: [
    { key: '1048', label: 'funcțiune', count: 1_749_479 },
    { key: '1084', label: 'radiată', count: 1_900_255 },
    { key: '1107', label: 'insolvență', count: 4_711 },
    { key: '1070', label: 'faliment', count: 14_609 },
  ],
  topCounties: [{ key: 'Cluj', label: null, count: 94_787 }],
  caenDivisions: [
    { key: '47', label: null, count: 632_531 },
    { key: '41', label: null, count: 199_517 },
    { key: '00', label: null, count: 702 },
  ],
  coverage: { territoryMatched: null, territoryUnmatched: null, note: '' },
  computedAt: '2026-09-16T13:55:22.446Z',
}

const COUNTIES: CompanyCountyCounts = {
  counties: [
    { key: 'Bucureşti', label: null, count: 341_116 },
    { key: 'Cluj', label: null, count: 94_787 },
  ],
  denominator: 1_749_479,
  unplaced: 593,
}

const hub = vi.fn()
const counties = vi.fn()
vi.mock('../../hooks/use-private-company-hub', () => ({
  usePrivateCompanyHub: () => hub(),
}))
vi.mock('../../hooks/use-company-county-counts', () => ({
  useCompanyCountyCounts: () => counties(),
}))

/** The scoped search runs its own query, so the page needs a client around it. */
function markup(): string {
  return renderToStaticMarkup(
    <QueryClientProvider client={createTestQueryClient()}>
      <PrivateCompanyHubPage />
    </QueryClientProvider>,
  )
}

describe('PrivateCompanyHubPage', () => {
  it('server-renders the figures, the sectors and the counties', () => {
    hub.mockReturnValue({ data: STATS, isPending: false, isError: false, refetch: vi.fn() })
    counties.mockReturnValue({ data: COUNTIES, isPending: false, isError: false, refetch: vi.fn() })

    const html = markup()

    // The four headline figures, in the register's own separators.
    expect(html).toContain('3.892.657')
    expect(html).toContain('1.749.479')
    expect(html).toContain('1.900.255')
    // Insolvency and bankruptcy are headlined together.
    expect(html).toContain('19.320')
    // A sector named from the nomenclature, and its count.
    expect(html).toContain('Comerț cu amănuntul')
    expect(html).toContain('632.531')
    // The county ranking and the companies the map cannot place.
    expect(html).toContain('Bucureşti')
    expect(html).toContain('341.116')
    expect(html).toContain('593')
    // The date the aggregate was computed, which is the one served date.
    expect(html).toContain('2026-09-16')
  })

  it('states the constraints that change how the figures read', () => {
    hub.mockReturnValue({ data: STATS, isPending: false, isError: false, refetch: vi.fn() })
    counties.mockReturnValue({ data: COUNTIES, isPending: false, isError: false, refetch: vi.fn() })

    const html = markup()

    // Divisions are named from Rev.2 while the counts span every revision.
    expect(html).toContain('Rev.2')
    // A company with several activities is in several bars.
    expect(html).toContain('nu se adună')
    // Codes with no division are set apart rather than ranked as sectors.
    expect(html).toContain('fără diviziune în nomenclator')
    // The per-source capture dates are named as missing, never guessed.
    expect(html).toContain('nu sunt încă publicate de API')
  })

  it('offers a retry and no zeroed figures while the aggregate is unavailable', () => {
    // `companyHubStats` is nullable: a request landing on a cold server cache
    // resolves to null, which must never read as a register of zeroes.
    hub.mockReturnValue({ data: null, isPending: false, isError: false, refetch: vi.fn() })
    counties.mockReturnValue({ data: COUNTIES, isPending: false, isError: false, refetch: vi.fn() })

    const html = markup()

    expect(html).toContain('role="alert"')
    expect(html).not.toContain('3.892.657')
    expect(html).not.toContain('>0<')
    // The county band stands on its own query and still draws.
    expect(html).toContain('341.116')
  })

  it('keeps the search and the shortcuts up while the figures are pending', () => {
    hub.mockReturnValue({ data: undefined, isPending: true, isError: false, refetch: vi.fn() })
    counties.mockReturnValue({ data: undefined, isPending: true, isError: false, refetch: vi.fn() })

    const html = markup()

    expect(html).toContain('Nume sau CUI')
    expect(html).toContain('Toate firmele în funcțiune')
    expect(html).not.toContain('role="alert"')
  })
})
