import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestQueryClient } from '@/test/test-utils'
import type { SupplierProcurementSlice } from '@/schemas/procurement'
import { FINANCIAL_METRICS, type PrivateCompanyProfile, type PrivateCompanySearchState } from '@/schemas/private-company'
import { mapCompanyProfile } from '../../api/graphql/company-mappers'
import type { RawCompanyFinancialYear, RawStatementQualification } from '../../api/graphql/company-queries'
import { buildCompanyProfileModel } from '../../lib/company-profile-model'
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
import { notAssessed } from '../../lib/financial-qualification'
import { admittedQualification } from '../../mocks/fixtures/qualification'
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

// The registry the page pins: the fixtures' own (mock) edition. No request leaves the test.
vi.mock('../../api/company-registry-api', async () => {
  const { MOCK_REGISTRY_CAPABILITIES } = await import('../../mocks/fixtures/registry')
  return {
    fetchCompanyRegistry: vi.fn(async () => MOCK_REGISTRY_CAPABILITIES),
    fetchCompanyRegistrationDiff: vi.fn(async () => ({
      fromEditionId: null,
      toEditionId: 'mock-1',
      fromCaptureDate: null,
      toCaptureDate: null,
      status: 'not_comparable',
      reason: 'first_edition',
      changes: [],
    })),
  }
})

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

/**
 * A browser render is a client-side visit: nothing of the company until the
 * page's first registry read answers and the pin takes it, then the company
 * (the fixtures answer under the pinned mock edition). Only the server render
 * has the whole company at once.
 */
const registryPinned = () => screen.findByRole('heading', { level: 1 })

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

  it('numbers the bands it has, computes no economy shares, and leaves out litigation it cannot read', async () => {
    render(page(builder()))
    await registryPinned()
    expect(sectionLinks()).toEqual(['#afacerea', '#bani-publici', '#activitati', '#registru'])
    // The number is decoration — the band's heading repeats it — so a link is named by its band alone.
    const bar = within(screen.getByRole('navigation', { name: 'Secțiunile paginii' }))
    for (const name of ['Afacerea', 'Bani publici', 'Activități', 'Registru']) expect(bar.getByRole('link', { name })).toBeInTheDocument()
    expect(screen.getByText('04 / Registru')).toBeInTheDocument()
    expect(screen.queryByText('Cât cântărește în economie')).toBeNull()
  })

  it('shows litigation when the justice read answers, paged in the URL', async () => {
    litigation.shown = true
    render(page(builder(), { litPage: 2 }))
    await registryPinned()
    expect(sectionLinks()).toEqual(['#afacerea', '#bani-publici', '#activitati', '#litigii', '#registru'])
    fireEvent.click(screen.getByRole('button', { name: 'litigation page 2' }))
    // A page of cases is a place to go back to: it is pushed, not replaced.
    expect(navigated({ litPage: 2 }, false)).toEqual({ litPage: 3 })
  })

  it('names who paid, for what, and the newest records once SEAP answers', async () => {
    slice.current = { data: builderSlice(), isError: false, refetch: vi.fn() }
    render(page(builder()))
    await registryPinned()
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

  it('says a lower bound only when both counts are known', async () => {
    const data = builderSlice()
    const unknown = { ...data.analysisByGrain.contract, stats: { ...data.analysisByGrain.contract.stats, withValueCount: null } }
    slice.current = { data: { ...data, analysisByGrain: { ...data.analysisByGrain, contract: unknown } }, isError: false, refetch: vi.fn() }
    render(page(builder()))
    await registryPinned()
    expect(screen.queryByText(/Valoarea e publicată pentru/)).toBeNull()
  })

  it('treats a reversal as a published amount, whatever its sign', async () => {
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
    await registryPinned()
    // A net total below zero is still a figure; an undated reversal is still a value, not a missing one.
    expect(screen.getByRole('region', { name: 'Cifre-cheie' })).toHaveTextContent('Contracte și plăți publice')
    expect(screen.getByText(/Nu apare pe grafic o înregistrare fără an în sursă/)).toBeInTheDocument()
    expect(screen.queryByText(/fără an și fără valoare publicată/)).toBeNull()
  })

  it('says so when SEAP returns nothing for records the profile counts', async () => {
    slice.current = { data: supplierSlice(), isError: false, refetch: vi.fn() }
    render(page(builder()))
    await registryPinned()
    expect(screen.getByText(/Căutarea în SEAP după CUI-ul firmei nu a întors înregistrări/)).toBeInTheDocument()
  })

  it('switches the payers to direct purchases and back, keeping the company’s own first choice out of the URL', async () => {
    slice.current = { data: builderSlice(), isError: false, refetch: vi.fn() }
    const { rerender } = render(page(builder()))
    await registryPinned()
    const toggle = screen.getByRole('radiogroup', { name: 'Înregistrările SEAP' })
    fireEvent.click(within(toggle).getByRole('radio', { name: 'Achiziții directe' }))
    expect(navigated()).toEqual({ plati: 'achizitii-directe' })

    rerender(page(builder(), { plati: 'achizitii-directe' }))
    expect(screen.getByRole('link', { name: /SPITALUL MUNICIPAL DOROHOI/ })).toBeInTheDocument()
    fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Înregistrările SEAP' })).getByRole('radio', { name: 'Contracte' }))
    expect(navigated({ plati: 'achizitii-directe' })).toEqual({ plati: undefined })
  })

  it('says a failed SEAP read and offers it again, the sums above it still standing', async () => {
    const refetch = vi.fn()
    slice.current = { data: undefined, isError: true, refetch }
    render(page(builder()))
    await registryPinned()
    const money = document.getElementById('bani-publici') as HTMLElement
    expect(within(money).getByText(/^514,5\smil\.\slei$/u)).toBeInTheDocument()
    fireEvent.click(within(money).getByRole('button', { name: 'Încearcă din nou' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('writes the chart’s measure to the URL, and „Toate" as no measure at all', async () => {
    render(page(builder(), { masura: 'profit' }))
    await registryPinned()
    const toggle = screen.getByRole('radiogroup', { name: 'Graficul arată' })
    expect(within(toggle).getByRole('radio', { name: 'Rezultat net' })).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(within(toggle).getByRole('radio', { name: 'Salariați' }))
    expect(navigated({ masura: 'profit' })).toEqual({ masura: 'salariati' })
    fireEvent.click(within(toggle).getByRole('radio', { name: 'Toate' }))
    expect(navigated({ masura: 'salariati' })).toEqual({ masura: undefined })
  })

  it('says in a line what a company with no statement and no public money does not have', async () => {
    render(page(companyProfile({ cui: '47387800', legalName: 'A & B IDEATICA S.R.L.' })))
    await registryPinned()
    expect(screen.getByRole('heading', { level: 1, name: 'A & B Ideatica S.R.L.' })).toBeInTheDocument()
    expect(screen.getByText(/Niciun bilanț publicat la ANAF/)).toBeInTheDocument()
    expect(screen.getByText(/Niciun contract și nicio plată din bani publici/)).toBeInTheDocument()
    // No figure to show, no band of figures; no chart in the head.
    expect(screen.queryByRole('region', { name: 'Cifre-cheie' })).toBeNull()
    expect(screen.queryByText('Ultimii 5 ani cu bilanț')).toBeNull()
    // Nothing to wait for from SEAP either.
    expect(screen.queryByText('Se încarcă înregistrările din SEAP')).toBeNull()
  })

  it('leads back to the directory by the edition’s county only — ANAF’s activity is no registry sector', async () => {
    render(page(builder()))
    await registryPinned()
    const kicker = screen.getByRole('link', { name: 'Firme' }).parentElement as HTMLElement
    const links = within(kicker).getAllByRole('link').slice(1)
    expect(links).toHaveLength(1)
    expect(JSON.parse(links[0]?.getAttribute('data-search') ?? '{}')).toEqual({ county: ['CJ'], status: ['1048'] })
  })
})

/**
 * The main activity, each statement by its own source: ANAF's code is named
 * only from its own CAEN revision; a known revision with no name keeps its
 * edition; only when ANAF's published data identifies no revision does the page
 * say so; the edition's meaning of the same digits stays the edition's; and no
 * sector grouping is derived from ANAF's code.
 */
describe('CompanyProfilePage — the main activity', () => {
  /** What the registry facts list says for a term. */
  const registryFact = (term: string) => screen.getByText(term, { selector: 'dt' }).nextElementSibling?.textContent
  const activities = () => document.getElementById('activitati') as HTMLElement
  const vehicleRepair = () =>
    companyProfile({ fiscal: { ...companyProfile().fiscal, fiscalCaen: { code: '9531', rev: 'rev3' } }, caenActivities: [] })

  beforeEach(() => {
    slice.current = { data: undefined, isError: false, refetch: vi.fn() }
  })

  it('keeps a known revision’s edition when it gives no name, never calling it unpublished', async () => {
    render(page(vehicleRepair()))
    await registryPinned()
    expect(registryFact('Activitate principală (ANAF)')).toBe('9531 · CAEN Rev.3')
    expect(screen.queryByText(/revizie CAEN nepublicată/)).toBeNull()
    expect(within(activities()).getByText('Codul CAEN 9531')).toBeInTheDocument()
    expect(within(activities()).getByText('Declarată la ANAF, CAEN Rev.3.')).toBeInTheDocument()
    expect(within(activities()).queryByText(/nu indică revizia CAEN/)).toBeNull()
  })

  it('says only what ANAF’s published data lacks for an unknown revision, the registry’s name kept apart', async () => {
    // 66 Jack: ANAF 5610 with no revision; the registry authorises 5610 in Rev.2.
    render(page(companyProfile()))
    await registryPinned()
    expect(registryFact('Activitate principală (ANAF)')).toBe('5610 · revizie CAEN nepublicată de ANAF')
    expect(
      within(activities()).getByText(
        'Declarată la ANAF. Datele publicate de ANAF nu indică revizia CAEN, iar aceleași cifre pot însemna activități diferite în revizii diferite, așa că nu îi dăm o denumire.',
      ),
    ).toBeInTheDocument()
    // Not a claim about the company's declaration, and not "always a different meaning".
    expect(within(activities()).queryByText(/fără revizia CAEN|în fiecare revizie/)).toBeNull()
    expect(within(activities()).getByText('Ediția ONRC are înscris 5610 (CAEN Rev.2): Restaurante.')).toBeInTheDocument()
    expect(within(activities()).queryByText('Restaurante', { selector: 'p' })).toBeNull()
  })

  it('derives no sector from ANAF’s code (the retired snapshot grouping)', async () => {
    render(page(vehicleRepair()))
    await registryPinned()
    expect(screen.queryByText(/Gruparea Transparenta/)).toBeNull()
    expect(screen.queryByText(/Comerț și service auto/)).toBeNull()
  })
})

/**
 * Every revision the registry lists is on the page, each under its own name:
 * Rev.0 included, rows with no revision as a group of their own with only
 * their codes, and the same digits in two revisions as two divisions that
 * open apart (CD-23).
 */
describe('CompanyProfilePage — every registry revision (CD-23)', () => {
  const activities = () => within(document.getElementById('activitati') as HTMLElement)
  const onrc = (code: string, rev: string | null, label: string | null) => ({ code, rev, label, source: 'onrc' as const })
  const division = (name: RegExp) => activities().getByRole('button', { name })

  beforeEach(() => {
    slice.current = { data: undefined, isError: false, refetch: vi.fn() }
  })

  it('shows a Rev.0-only registry, its division and classes', async () => {
    render(page(companyProfile({ caenActivities: [onrc('0111', 'rev0', 'Cultivarea cerealelor'), onrc('0112', 'rev0', 'Cultivarea legumelor')] })))
    await registryPinned()
    const button = division(/Diviziunea 01 \(CAEN Rev\.0\)/)
    fireEvent.click(button)
    const panel = document.getElementById(button.getAttribute('aria-controls') ?? '') as HTMLElement
    expect(within(panel).getByText('Cultivarea cerealelor')).toBeInTheDocument()
    expect(within(panel).getByText('Cultivarea legumelor')).toBeInTheDocument()
    expect(activities().getByText('2 activități autorizate în registrul comerțului (CAEN Rev.0).')).toBeInTheDocument()
  })

  it('opens the same digits in Rev.3 and Rev.1 apart, names no row without a revision, and keeps ANAF’s code its own', async () => {
    render(
      page(
        companyProfile({
          caenActivities: [
            onrc('6210', 'rev3', 'Activități de realizare a soft-ului la comandă'),
            onrc('6210', 'rev3', 'Activități de realizare a soft-ului la comandă'),
            onrc('6210', 'rev1', 'Transporturi aeriene regulate'),
            onrc('5610', 'rev2', 'Restaurante'),
            onrc('0111', 'rev0', 'Cultivarea cerealelor'),
            onrc('4711', null, null),
            { code: '6210', rev: null, label: null, source: 'anaf' },
          ],
          fiscal: { ...companyProfile().fiscal, fiscalCaen: { code: '6210', rev: null } },
        }),
      ),
    )
    await registryPinned()
    // Each revision under its own name, every one of them on the page.
    for (const name of ['CAEN Rev.3', 'CAEN Rev.2', 'CAEN Rev.1', 'CAEN Rev.0', 'Fără revizie CAEN']) expect(activities().getByText(name)).toBeInTheDocument()
    expect(activities().getByText('CAEN Rev.3: 2 · CAEN Rev.2: 1 · CAEN Rev.1: 1 · CAEN Rev.0: 1 · Fără revizie CAEN: 1')).toBeInTheDocument()
    expect(activities().getByText(/^6 înscrieri de activități în registrul comerțului, pe revizii CAEN;/)).toBeInTheDocument()
    // No single nomenclature for rows that use several.
    expect(activities().queryByText(/autorizate în registrul comerțului \(CAEN/)).toBeNull()

    const rev3 = division(/Diviziunea 62 \(CAEN Rev\.3\)/)
    const rev1 = division(/Diviziunea 62 \(CAEN Rev\.1\)/)
    expect(rev3.getAttribute('aria-controls')).not.toBe(rev1.getAttribute('aria-controls'))
    fireEvent.click(rev3)
    expect(rev3).toHaveAttribute('aria-expanded', 'true')
    expect(rev1).toHaveAttribute('aria-expanded', 'false')
    const software = document.getElementById(rev3.getAttribute('aria-controls') ?? '') as HTMLElement
    // The repeated row stays two rows.
    expect(within(software).getAllByText('Activități de realizare a soft-ului la comandă')).toHaveLength(2)
    expect(within(software).queryByText('Transporturi aeriene regulate')).toBeNull()

    fireEvent.click(rev1)
    expect(rev3).toHaveAttribute('aria-expanded', 'false')
    const air = document.getElementById(rev1.getAttribute('aria-controls') ?? '') as HTMLElement
    expect(within(air).getByText('6210')).toBeInTheDocument()
    expect(within(air).getByText('Transporturi aeriene regulate')).toBeInTheDocument()

    // A row with no revision: its code, no name.
    const unknown = division(/Diviziunea 47 \(fără revizie CAEN\)/)
    fireEvent.click(unknown)
    const unnamed = document.getElementById(unknown.getAttribute('aria-controls') ?? '') as HTMLElement
    expect(within(unnamed).getByText('4711')).toBeInTheDocument()
    expect(unnamed.querySelector('li')?.textContent).toBe('4711')

    // ANAF's main activity, with no revision, stays apart: its code, no borrowed name; the registry's meanings as the registry's.
    expect(activities().getByText('Codul CAEN 6210')).toBeInTheDocument()
    expect(activities().getByText('Ediția ONRC are înscris 6210 (CAEN Rev.3): Activități de realizare a soft-ului la comandă.')).toBeInTheDocument()
    expect(activities().getByText('Ediția ONRC are înscris 6210 (CAEN Rev.1): Transporturi aeriene regulate.')).toBeInTheDocument()
  })
})

describe('CompanyProfilePage — only qualified figures (CD-14)', () => {
  beforeEach(() => {
    navigate.mockClear()
    slice.current = { data: undefined, isError: false, refetch: vi.fn() }
    litigation.shown = false
  })

  const qualification = () => screen.getByRole('region', { name: 'Ce intră în cifre' })

  it('shows a held 300-trillion turnover exactly as published, out of every figure and comparison', async () => {
    // The 42443305 FY2020 shape: the original kept, held after review.
    const base = financialYear(2020, { employees: 3, netProfit: 291_000_000_000_000, turnover: 300_000_000_000_000 })
    const held = {
      ...base,
      originals: { ...base.originals, net_profit: '291000000000000', turnover: '300000000000000' },
      qualification: {
        ...admittedQualification(base, { net_profit: 'held_observation', net_result: 'held_component', turnover: 'held_observation' }),
        holdReason: 'Valoare introdusă greșit, verificată la sursă.',
      },
    }
    render(page(companyProfile({ cui: '42443305', financials: [financialYear(2019, { employees: 3, turnover: 1_000_000 }), held] })))
    await registryPinned()
    const note = within(qualification())
    expect(note.getByText('300.000.000.000.000')).toBeInTheDocument()
    expect(note.getAllByText(/reținută după verificare/u).length).toBeGreaterThanOrEqual(1)
    expect(note.getAllByText('Valoare introdusă greșit, verificată la sursă.').length).toBeGreaterThanOrEqual(1)
    // No figure is built from it: no turnover or net tile, the reported headcount still is one.
    // (The note's own list labels end in a colon; a figure's label is exactly this.)
    for (const label of ['Cifra de afaceri, 2020', 'Profit net, 2020', 'Pierdere netă, 2020', 'Rezultat net, 2020']) {
      expect(screen.queryByText(label)).toBeNull()
    }
    expect(screen.getByText('Salariați, 2020')).toBeInTheDocument()
    expect(note.getByText(/politica de calificare companies-analytics-admission-2026-10-02-q1, aprobată pe 2026-10-02/u)).toBeInTheDocument()
  })

  it('draws nothing from statements that were not assessed, says why, and keeps their source values readable', async () => {
    const unassessed = { ...financialYear(2025, { employees: 3, turnover: 9_000 }), qualification: notAssessed('qualification_unavailable') }
    render(page(companyProfile({ financials: [unassessed] })))
    await registryPinned()
    expect(screen.queryByText('Cifra de afaceri, 2025')).toBeNull()
    expect(screen.queryByText('Salariați, 2025')).toBeNull()
    expect(screen.getByText(/nu a putut fi calificat \(calificarea nu este disponibilă acum\)/u)).toBeInTheDocument()
    expect(within(qualification()).getByText('9.000')).toBeInTheDocument()
  })

  it('computes no share of a sector, county or national total: no edition-bound total exists', async () => {
    render(page(companyProfile({ financials: [financialYear(2025, { turnover: 9_000 })] })))
    await registryPinned()
    expect(screen.queryByText(/Cotele firmei/u)).toBeNull()
    expect(screen.queryByText('Cât cântărește în economie')).toBeNull()
  })

  /** A live-API response through the real mapper: no fixture default can stand in for a missing qualification. */
  const mapped = (years: RawCompanyFinancialYear[]): PrivateCompanyProfile => {
    const profile = mapCompanyProfile({
      company: {
        cui: '22202108',
        orgId: '1',
        name: '66 JACK SRL',
        nameSource: 'ONRC_EDITION',
        legalForm: 'SRL',
        codInmatriculare: 'J12/3094/2007',
        registrationDate: '2007-11-26',
        registrationDatePresent: true,
        headlineStatus: { code: '1048', label: 'funcțiune', labelSource: 'API_NOMENCLATURE' },
        // The page's pinned scope: the same edition the response was read under.
        registry: {
          registry: { ...companyProfile().registry.registry, source: 'onrc', state: 'PUBLISHED' },
          cuiState: 'NOT_IN_EDITION',
          profile: null,
          identifiers: [],
          identityObservations: [],
          caenObservations: [],
          statusObservations: [],
          observationsTruncated: false,
        },
        territory: null,
        address: { display: '', county: 'Cluj', locality: 'Municipiul Gherla' },
        fiscal: null,
        caenActivities: [],
        representatives: [],
        euBranches: [],
        publicMoney: null,
        asOf: { onrc: '2026-07-08', anaf: null },
      },
      companyFinancials: { years, trajectory: null },
    })
    if (!profile) throw new Error('unmapped')
    return profile
  }
  /** A qualification as the API sends it: these statuses, every other metric MISSING. */
  const rawQualification = (statuses: Partial<Record<(typeof FINANCIAL_METRICS)[number], string>>): RawStatementQualification => ({
    assessment: 'ASSESSED',
    reason: null,
    releaseId: '2',
    policyVersion: 'companies-analytics-admission-2026-10-02-q1',
    policySha256: 'a1'.repeat(32),
    policyApprovedOn: '2026-10-02',
    evaluatorVersion: 'sql-v1',
    metrics: FINANCIAL_METRICS.map((metric) => ({ metric, status: statuses[metric] ?? 'MISSING' })),
    netResultStatus: statuses.net_result ?? 'MISSING',
    netResult: null,
    holdReason: null,
    holdDrift: [],
  })

  it('keeps every year’s source values readable when the API sent no qualification at all (D1-C01)', async () => {
    const profile = mapped([
      { year: 2024, sourceSystem: 'anaf', turnover: '1234567.89', netProfit: null, netLoss: null, employees: '4' },
      { year: 2023, sourceSystem: 'anaf', turnover: '7654321.00', netProfit: null, netLoss: null, employees: null },
    ])
    render(page(profile))
    await registryPinned()
    const note = within(qualification())
    // Both years, both exact source values, each statement's own state.
    expect(note.getByText('1.234.567,89')).toBeInTheDocument()
    expect(note.getByText('7.654.321,00')).toBeInTheDocument()
    expect(note.getAllByText('necalificat (calificarea nu este disponibilă acum)')).toHaveLength(2)
    expect(note.getByText(/^2023 · ANAF ·/u)).toBeInTheDocument()
    // Nothing is a figure or a point.
    for (const label of ['Cifra de afaceri, 2024', 'Salariați, 2024']) expect(screen.queryByText(label)).toBeNull()
    const model = buildCompanyProfileModel(profile)
    expect([...model.series.turnover, ...model.series.employees].every((point) => point.value === null)).toBe(true)
  })

  it('shows a 464d-like statement’s reported profit as a source value and explains its held net, newest or older (D1-C02)', async () => {
    const fourSixFour = (year: number): RawCompanyFinancialYear => ({
      year,
      sourceSystem: 'anaf',
      turnover: null,
      netProfit: '120.00',
      netLoss: null,
      employees: '7',
      qualification: rawQualification({ employees: 'REPORTED', net_profit: 'REPORTED', net_result: 'HELD_PROFILE' }),
    })
    const plain: RawCompanyFinancialYear = {
      year: 2025,
      sourceSystem: 'anaf',
      turnover: null,
      netProfit: null,
      netLoss: null,
      employees: '9',
      qualification: rawQualification({ employees: 'REPORTED' }),
    }
    for (const years of [[fourSixFour(2024)], [plain, fourSixFour(2024)]]) {
      const { unmount } = render(page(mapped(years)))
      await registryPinned()
      const note = within(qualification())
      // The published component, labelled as what it is, and admitted.
      const profit = note.getByText('Profit net').closest('tr')!
      expect(within(profit).getByText('120,00')).toBeInTheDocument()
      expect(within(profit).getByText('admisă')).toBeInTheDocument()
      // The derived net: no value, and why.
      const net = note.getByText('Rezultat net, calculat din profit și pierdere').closest('tr')!
      expect(within(net).getByText('—')).toBeInTheDocument()
      expect(within(net).getByText('reținut: pentru această formă de bilanț nu se calculează din profit și pierdere')).toBeInTheDocument()
      // No net figure built from it, and no „120 − 0" anywhere.
      for (const label of ['Profit net, 2024', 'Pierdere netă, 2024', 'Rezultat net, 2024']) expect(screen.queryByText(label)).toBeNull()
      expect(buildCompanyProfileModel(mapped(years)).series.netResult.every((point) => point.value === null)).toBe(true)
      unmount()
    }
  })

  it('names the statements on another basis instead of plotting them under the newest policy (D1-C03)', async () => {
    const older = financialYear(2023, { turnover: 1_000, employees: 2 })
    const rebased = { ...older, qualification: { ...older.qualification, policySha256: 'b2'.repeat(32), policyVersion: 'an-older-policy' } }
    render(page(companyProfile({ financials: [rebased, financialYear(2024, { turnover: 2_000, employees: 3 })] })))
    await registryPinned()
    const note = within(qualification())
    expect(note.getByText(/politica de calificare companies-analytics-admission-2026-10-02-q1/u)).toBeInTheDocument()
    expect(note.getByText(/^Bilanțurile pe 2023 au fost calificate după altă politică sau altă ediție a datelor/u)).toBeInTheDocument()
    expect(note.queryByText(/an-older-policy/u)).toBeNull()
    // Its values stay readable, out of the figures.
    expect(note.getByText('1.000')).toBeInTheDocument()
    expect(note.getByText('calificat după altă politică sau altă ediție a datelor')).toBeInTheDocument()
  })
})
