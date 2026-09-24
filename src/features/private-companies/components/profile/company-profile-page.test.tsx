import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestQueryClient } from '@/test/test-utils'
import type { SupplierProcurementSlice } from '@/schemas/procurement'
import type { PrivateCompanyProfile, PrivateCompanySearchState } from '@/schemas/private-company'
import {
  authorityRow,
  balanceSummary,
  categoryRow,
  companyProfile,
  contract,
  directAcquisition,
  financialYear,
  grainAnalytics,
  supplierSlice,
} from '../../lib/company-profile.fixture'
import { CompanyProfilePage } from './company-profile-page'

/**
 * The profile's contract, as far as a unit test holds it: the server sends the
 * whole company — head, figures, every band — and only the SEAP names behind
 * the public money arrive later, with a pending and a failed state of their
 * own; each choice on the page is written to the URL, never a default; and a
 * band with nothing to say (the economy under 1%, litigation that cannot be
 * read) is left out, numbering and all.
 */

const navigate = vi.fn()
const slice = vi.hoisted(() => ({
  current: { data: undefined as SupplierProcurementSlice | undefined, isError: false, refetch: vi.fn() },
}))
const litigation = vi.hoisted(() => ({ shown: false }))

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
    search,
    hash,
    ...props
  }: {
    readonly children: ReactNode
    readonly to: string
    readonly params?: Record<string, string>
    readonly search?: unknown
    readonly hash?: string
  }) => {
    const path = Object.entries(params ?? {}).reduce((href, [key, value]) => href.replace(`$${key}`, value), to)
    return (
      <a href={`${path}${hash ? `#${hash}` : ''}`} data-search={JSON.stringify(search ?? {})} {...props}>
        {children}
      </a>
    )
  },
  useNavigate: () => navigate,
}))

vi.mock('@/features/procurement/hooks/use-procurement-data', () => ({
  useProcurementSupplierSlice: () => ({ ...slice.current, isPending: slice.current.data === undefined && !slice.current.isError }),
}))

vi.mock('../../hooks/use-company-litigation-shown', () => ({
  useCompanyLitigationShown: () => litigation.shown,
}))

vi.mock('@/features/justice/components/litigation-slice-section', () => ({
  LITIGATION_PAGE_SIZE: 10,
  LitigationSliceSection: ({ page, onPageChange }: { readonly page: number; readonly onPageChange: (page: number) => void }) => (
    <button type="button" onClick={() => onPageChange(page + 1)}>
      litigation page {page}
    </button>
  ),
}))

// The page's language, pinned: the test environment activates English.
vi.mock('@/lib/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/utils')>()),
  getUserLocale: () => 'ro',
}))

/** A road builder: five years of statements, the last a loss, contracts and direct purchases from SEAP. */
function builder(): PrivateCompanyProfile {
  return companyProfile({
    cui: '23617561',
    legalName: 'ABC-CON-INTERNAŢIONAL SRL',
    status: { code: '1107', label: 'insolvență' },
    financials: [2021, 2022, 2023, 2024, 2025].map((year) =>
      financialYear(year, {
        turnover: year === 2025 ? 21_700_000 : 47_000_000,
        netProfit: year === 2025 ? 0 : 217_879,
        netLoss: year === 2025 ? 27_800_000 : null,
        employees: year === 2025 ? 27 : 36,
        summary: balanceSummary({ debts: 38_900_000, totalEquity: -22_600_000 }),
      }),
    ),
    publicMoney: {
      totalRon: null,
      flowCount: 0,
      byFlowType: [
        { flowType: 'procurement_contract', totalRon: 514_500_000, count: 70 },
        { flowType: 'direct_acquisition', totalRon: 3_400_000, count: 29 },
      ],
      byYear: [
        { year: 2016, flowType: 'procurement_contract', totalRon: 14_500_000, count: 10 },
        { year: 2025, flowType: 'procurement_contract', totalRon: 500_000_000, count: 60 },
        { year: 2025, flowType: 'direct_acquisition', totalRon: 3_400_000, count: 29 },
      ],
    },
  })
}

function builderSlice(): SupplierProcurementSlice {
  return supplierSlice({
    window: { from: '2016-07', to: '2025-09' },
    contract: grainAnalytics('contract', {
      records: 62,
      withValue: 24,
      months: ['2016-07', '2025-09'],
      authorities: [authorityRow('3409370', 'MUNICIPIUL DOROHOI', 1, '21200000.00'), authorityRow('4839270', 'COMUNA BREBENI', 1, '16800000.00')],
      categories: [categoryRow('45', 'Lucrări de construcții', 62, '1.0000')],
    }),
    directAcquisition: grainAnalytics('direct_acquisition', {
      records: 29,
      authorities: [authorityRow('4540712', 'SPITALUL MUNICIPAL DOROHOI', 1, '262349.00')],
    }),
    recentRecords: [contract('2311757', { title: 'Execuție lucrări pentru obiectivul „Extindere rețea"' }), directAcquisition('14547799')],
  })
}

function page(profile: PrivateCompanyProfile, search: PrivateCompanySearchState = {}) {
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      <CompanyProfilePage profile={profile} cui={profile.cui ?? ''} search={search} />
    </QueryClientProvider>
  )
}

/** The search the page asked the router for, applied to what the URL held. */
function navigated(previous: PrivateCompanySearchState = {}, replace = true) {
  const call = navigate.mock.lastCall?.[0] as { search: (previous: PrivateCompanySearchState) => PrivateCompanySearchState; replace: boolean; resetScroll: boolean }
  expect(call.replace).toBe(replace)
  expect(call.resetScroll).toBe(false)
  return call.search(previous)
}

/** Where the section bar's links go. */
function sectionLinks() {
  return within(screen.getByRole('navigation', { name: 'Secțiunile paginii' }))
    .getAllByRole('link')
    .map((link) => link.getAttribute('href'))
}

describe('CompanyProfilePage', () => {
  beforeEach(() => {
    navigate.mockClear()
    slice.current = { data: undefined, isError: false, refetch: vi.fn() }
    litigation.shown = false
  })

  it('sends the whole company in the server HTML, the SEAP names pending', () => {
    const html = renderToStaticMarkup(page(builder()))
    expect(html).toContain('ABC-CON-Internațional SRL</h1>')
    expect(html).toContain('În procedura insolvenței.')
    // The figures band counts up over values it already holds; the loss is a loss, not a negative profit.
    expect(html).toContain('data-count-value="21.7"')
    expect(html).toContain('Pierdere netă, 2025')
    expect(html).toContain('data-count-value="517.9"')
    // The head's chart says every value to assistive technology.
    expect(html).toContain('<caption>Cifra de afaceri, rezultatul net și salariații, 2021–2025</caption>')
    expect(html).toContain('Ce a primit de la stat')
    expect(html).toContain('Se încarcă înregistrările din SEAP')
    expect(html).toContain('Datele din registru')
  })

  it('numbers the bands it has, and leaves out the economy under 1% and litigation it cannot read', () => {
    render(page(builder()))
    expect(sectionLinks()).toEqual(['#afacerea', '#bani-publici', '#activitati', '#registru'])
    // The number is decoration — the band's heading repeats it — so a link is named by its band alone.
    const bar = within(screen.getByRole('navigation', { name: 'Secțiunile paginii' }))
    for (const name of ['Afacerea', 'Bani publici', 'Activități', 'Registru']) expect(bar.getByRole('link', { name })).toBeInTheDocument()
    expect(screen.getByText('04 / Registru')).toBeInTheDocument()
    expect(screen.queryByText('Cât cântărește în economie')).toBeNull()
  })

  it('shows litigation when the justice read answers, paged in the URL', () => {
    litigation.shown = true
    render(page(builder(), { litPage: 2 }))
    expect(sectionLinks()).toEqual(['#afacerea', '#bani-publici', '#activitati', '#litigii', '#registru'])
    fireEvent.click(screen.getByRole('button', { name: 'litigation page 2' }))
    // A page of cases is a place to go back to: it is pushed, not replaced.
    expect(navigated({ litPage: 2 }, false)).toEqual({ litPage: 3 })
  })

  it('names who paid, for what, and the newest records once SEAP answers', () => {
    slice.current = { data: builderSlice(), isError: false, refetch: vi.fn() }
    render(page(builder()))
    const money = document.getElementById('bani-publici') as HTMLElement
    const payers = within(money).getByRole('link', { name: /MUNICIPIUL DOROHOI/ })
    expect(payers.getAttribute('href')).toBe('/procurement/institutions/3409370')
    // CPV divisions in the reader's language: the test environment reads English.
    expect(within(money).getByText('Lucrări de construcții (en)')).toBeInTheDocument()
    expect(within(money).getByRole('link', { name: /Extindere rețea/ }).getAttribute('href')).toBe('/procurement/contracts/2311757')
    expect(within(money).getByRole('link', { name: /Toate contractele și achizițiile/ }).getAttribute('href')).toBe('/procurement/suppliers/23617561')
    // 24 of 62 contracts carry a value: the sums are a lower bound. The months are the company's records, not SEAP's coverage.
    expect(within(money).getByText(/Valoarea e publicată pentru 24 din 62 de contracte/)).toBeInTheDocument()
    expect(within(money).getByText(/Înregistrările firmei în SEAP/)).toBeInTheDocument()
    // The company's last record month is not a partial year: only the calendar year in progress is.
    expect(within(money).queryByText(/anul în curs/)).toBeNull()
    expect(screen.getByText(/înregistrările firmei în SEAP din 2016/)).toBeInTheDocument()
  })

  it('says a lower bound only when both counts are known', () => {
    const data = builderSlice()
    const unknown = { ...data.analysisByGrain.contract, stats: { ...data.analysisByGrain.contract.stats, withValueCount: null } }
    slice.current = { data: { ...data, analysisByGrain: { ...data.analysisByGrain, contract: unknown } }, isError: false, refetch: vi.fn() }
    render(page(builder()))
    expect(screen.queryByText(/Valoarea e publicată pentru/)).toBeNull()
  })

  it('treats a reversal as a published amount, whatever its sign', () => {
    const reversals = companyProfile({
      publicMoney: {
        totalRon: null,
        flowCount: 0,
        byFlowType: [{ flowType: 'pnrr_payment', totalRon: -200, count: 3 }],
        byYear: [
          { year: 2023, flowType: 'pnrr_payment', totalRon: 300, count: 2 },
          { year: null, flowType: 'pnrr_payment', totalRon: -500, count: 1 },
        ],
      },
    })
    render(page(reversals))
    // A net total below zero is still a figure; an undated reversal is still a value, not a missing one.
    expect(screen.getByRole('region', { name: 'Cifre-cheie' })).toHaveTextContent('Contracte și plăți publice')
    expect(screen.getByText(/Nu apare pe grafic o înregistrare fără an în sursă/)).toBeInTheDocument()
    expect(screen.queryByText(/fără an și fără valoare publicată/)).toBeNull()
  })

  it('says so when SEAP returns nothing for records the profile counts', () => {
    slice.current = { data: supplierSlice(), isError: false, refetch: vi.fn() }
    render(page(builder()))
    expect(screen.getByText(/Căutarea în SEAP după CUI-ul firmei nu a întors înregistrări/)).toBeInTheDocument()
  })

  it('switches the payers to direct purchases and back, keeping the company’s own first choice out of the URL', () => {
    slice.current = { data: builderSlice(), isError: false, refetch: vi.fn() }
    const { rerender } = render(page(builder()))
    const toggle = screen.getByRole('radiogroup', { name: 'Înregistrările SEAP' })
    fireEvent.click(within(toggle).getByRole('radio', { name: 'Achiziții directe' }))
    expect(navigated()).toEqual({ plati: 'achizitii-directe' })

    rerender(page(builder(), { plati: 'achizitii-directe' }))
    expect(screen.getByRole('link', { name: /SPITALUL MUNICIPAL DOROHOI/ })).toBeInTheDocument()
    fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Înregistrările SEAP' })).getByRole('radio', { name: 'Contracte' }))
    expect(navigated({ plati: 'achizitii-directe' })).toEqual({ plati: undefined })
  })

  it('says a failed SEAP read and offers it again, the sums above it still standing', () => {
    const refetch = vi.fn()
    slice.current = { data: undefined, isError: true, refetch }
    render(page(builder()))
    const money = document.getElementById('bani-publici') as HTMLElement
    expect(within(money).getByText(/^514,5\smil\.\slei$/u)).toBeInTheDocument()
    fireEvent.click(within(money).getByRole('button', { name: 'Încearcă din nou' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('writes the chart’s measure to the URL, and „Toate" as no measure at all', () => {
    render(page(builder(), { masura: 'profit' }))
    const toggle = screen.getByRole('radiogroup', { name: 'Graficul arată' })
    expect(within(toggle).getByRole('radio', { name: 'Rezultat net' })).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(within(toggle).getByRole('radio', { name: 'Salariați' }))
    expect(navigated({ masura: 'profit' })).toEqual({ masura: 'salariati' })
    fireEvent.click(within(toggle).getByRole('radio', { name: 'Toate' }))
    expect(navigated({ masura: 'salariati' })).toEqual({ masura: undefined })
  })

  it('says in a line what a company with no statement and no public money does not have', () => {
    render(page(companyProfile({ cui: '47387800', legalName: 'A & B IDEATICA S.R.L.' })))
    expect(screen.getByRole('heading', { level: 1, name: 'A & B Ideatica S.R.L.' })).toBeInTheDocument()
    expect(screen.getByText(/Niciun bilanț publicat la ANAF/)).toBeInTheDocument()
    expect(screen.getByText(/Niciun contract și nicio plată din bani publici/)).toBeInTheDocument()
    // No figure to show, no band of figures; no chart in the head.
    expect(screen.queryByRole('region', { name: 'Cifre-cheie' })).toBeNull()
    expect(screen.queryByText('Ultimii 5 ani cu bilanț')).toBeNull()
    // Nothing to wait for from SEAP either.
    expect(screen.queryByText('Se încarcă înregistrările din SEAP')).toBeNull()
  })

  it('leads back to the directory by the company’s county and sector', () => {
    render(page(builder()))
    const kicker = screen.getByRole('link', { name: 'Firme' }).parentElement as HTMLElement
    const [county, sector] = within(kicker).getAllByRole('link').slice(1)
    expect(JSON.parse(county?.getAttribute('data-search') ?? '{}')).toMatchObject({ county: ['Cluj'] })
    expect(JSON.parse(sector?.getAttribute('data-search') ?? '{}')).toEqual({ caen: '56', status: ['1048'] })
  })
})
