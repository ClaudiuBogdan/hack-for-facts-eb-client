import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestQueryClient } from '@/test/test-utils'
import type { SupplierProcurementSlice } from '@/schemas/procurement'
import { FINANCIAL_METRICS, type PrivateCompanyProfile, type PrivateCompanySearchState } from '@/schemas/private-company'
import type { CompanyCaenClassState } from '@/schemas/private-company-registry'
import { mapCompanyProfile } from '../../api/graphql/company-mappers'
import type { RawCompanyFinancialYear, RawLongFormStatement, RawStatementQualification } from '../../api/graphql/company-queries'
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
import { monthText } from '../../lib/company-profile-format'
import { notAssessed } from '../../lib/financial-qualification'
import { ACTIVITY_SELECTIONS } from '../../mocks/fixtures/activity-selection'
import { admittedQualification } from '../../mocks/fixtures/qualification'
import { mockRegistryEvidence } from '../../mocks/fixtures/registry'
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

// An info note's popover unmounts with the page, and Radix's focus scope dispatches its unmount event on a 0 ms
// timer: run it while this file's document still exists, not after the environment is gone (an unhandled
// „parameter 1 is not of type 'Event'" under a loaded run).
afterEach(async () => {
  cleanup()
  await new Promise((resolve) => setTimeout(resolve, 0))
})
const slice = vi.hoisted(() => ({
  current: { data: undefined as SupplierProcurementSlice | undefined, isError: false, refetch: vi.fn() },
}))
const litigation = vi.hoisted(() => ({ current: null as import('@/schemas/judicial').JudicialCompanyLitigation | null }))

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

// SEAP's own cutoff, as the procurement pages read it: contracts a month behind direct purchases.
const SEAP_CUTOFF = { direct: '2026-05', contract: '2026-04', build: 'test' } as const
const seap = vi.hoisted(() => ({ cutoff: undefined as { readonly direct: string | null; readonly contract: string | null; readonly build: string } | undefined }))
vi.mock('../../hooks/use-seap-cutoff', () => ({
  useSeapCutoff: () => ({ data: seap.cutoff }),
}))

vi.mock('../../hooks/use-company-litigation-shown', () => ({
  useCompanyLitigationShown: () => litigation.current,
}))

vi.mock('@/features/justice/components/company-litigation', () => ({
  CompanyLitigationSummary: ({ litigation: read }: { readonly litigation: { readonly caseCount: number } }) => <p>litigation summary {read.caseCount}</p>,
  CompanyLitigationCases: ({ cui }: { readonly cui: string }) => <p>litigation cases {cui}</p>,
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
    seap.cutoff = SEAP_CUTOFF
    navigate.mockClear()
    slice.current = { data: undefined, isError: false, refetch: vi.fn() }
    litigation.current = null
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
    // The money band names its instruments: an award is not money received.
    expect(html).toContain('Contracte, achiziții și PNRR')
    expect(html).not.toContain('Ce a primit de la stat')
    expect(html).toContain('Se încarcă înregistrările din SEAP')
    expect(html).toContain('Datele din registru')
  })

  it('numbers the bands it has, computes no economy shares, and leaves out litigation it cannot read', async () => {
    render(page(builder()))
    await registryPinned()
    expect(sectionLinks()).toEqual(['#afacerea', '#bani-publici', '#activitati', '#an-cu-an', '#registru'])
    // The number is decoration — the band's heading repeats it — so a link is named by its band alone.
    const bar = within(screen.getByRole('navigation', { name: 'Secțiunile paginii' }))
    for (const name of ['Afacerea', 'Bani publici', 'Activități', 'An cu an', 'Registru']) expect(bar.getByRole('link', { name })).toBeInTheDocument()
    expect(screen.getByText('05 / Registru')).toBeInTheDocument()
    expect(screen.queryByText('Cât cântărește în economie')).toBeNull()
  })

  it('shows litigation when published links count a case', async () => {
    litigation.current = { cui: '123', caseCount: 3, courtLevels: [{ courtLevel: 'tribunal', count: 3 }], years: [{ year: 2025, count: 3 }], coverage: 1, caveats: [] }
    render(page(builder()))
    await registryPinned()
    expect(sectionLinks()).toEqual(['#afacerea', '#bani-publici', '#activitati', '#litigii', '#an-cu-an', '#registru'])
    const band = document.getElementById('litigii') as HTMLElement
    expect(within(band).getByText('litigation summary 3')).toBeInTheDocument()
    expect(within(band).getByText(/^litigation cases /)).toBeInTheDocument()
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
    // Further: the firm's contracts on the analytics page, from the year it compares from (a digits-only value travels as a number), and the firm as a supplier.
    const records = within(money).getByRole('link', { name: /Contractele firmei din 2019/ })
    expect(JSON.parse(records.getAttribute('data-search') ?? '{}')).toMatchObject({ tip: 'contracte', furnizor: 23617561, dupa: 'inregistrari' })
    expect(within(money).getByRole('link', { name: /Firma ca furnizor al statului/ }).getAttribute('href')).toBe('/procurement/suppliers/23617561')
    // 24 of 62 contracts carry a value: the sums are a lower bound. The months are the company's records, not SEAP's coverage.
    expect(within(money).getByText(/Valoarea e publicată pentru 24 din 62 de contracte/)).toBeInTheDocument()
    expect(within(money).getByText(/Înregistrările firmei în SEAP/)).toBeInTheDocument()
    // Beside them, the month SEAP's contracts run to — the population shown.
    expect(within(money).getByText(new RegExp(`Date SEAP până în ${monthText('2026-04')}\\.`))).toBeInTheDocument()
    // The company's last record month is not a partial year: only the calendar year in progress is.
    expect(within(money).queryByText(/anul în curs/)).toBeNull()
    expect(screen.getByText(/înregistrările firmei în SEAP din 2016/)).toBeInTheDocument()
  })

  it('says SEAP’s date only when the company’s own months do not run past it, and not without it', async () => {
    slice.current = { data: builderSlice(), isError: false, refetch: vi.fn() }
    // A record in a month after the cutoff (a thin one, still filling) would read past „the data's end".
    seap.cutoff = { ...SEAP_CUTOFF, contract: '2016-01' }
    const { unmount } = render(page(builder()))
    await registryPinned()
    const money = () => document.getElementById('bani-publici') as HTMLElement
    expect(within(money()).getByText(/Înregistrările firmei în SEAP/)).toBeInTheDocument()
    expect(within(money()).queryByText(/Date SEAP până în/)).toBeNull()
    unmount()
    // A cutoff that could not be read is left out, never guessed.
    seap.cutoff = undefined
    render(page(builder()))
    await registryPinned()
    expect(within(money()).getByText(/Înregistrările firmei în SEAP/)).toBeInTheDocument()
    expect(within(money()).queryByText(/Date SEAP până în/)).toBeNull()
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
    // What the data holds, never a claim that the company filed nothing.
    expect(screen.getByText(/Nicio valoare din bilanțuri în datele de aici/)).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/Niciun bilanț publicat/u)
    // An absence in the data, never a verified zero of contracts or payments.
    expect(screen.getByText('Firma nu apare în datele de aici ca furnizor în contracte sau achiziții publice (SEAP) și nici ca beneficiar PNRR.')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/nicio plată din bani publici/u)
    // A fixture without the long-format field is unknown: no disclosure, never „none".
    expect(screen.queryByRole('region', { name: 'Bilanțuri doar în format lung' })).toBeNull()
    // No figure to show, no band of figures; no chart in the head.
    expect(screen.queryByRole('region', { name: 'Cifre-cheie' })).toBeNull()
    expect(screen.queryByText('Ultimii 5 ani cu bilanț')).toBeNull()
    // Nothing to wait for from SEAP either.
    expect(screen.queryByText('Se încarcă înregistrările din SEAP')).toBeNull()
  })

  it('leads back to the hub and to the county’s companies in the analysis — ANAF’s activity is no registry sector', async () => {
    render(page(builder()))
    await registryPinned()
    const kicker = screen.getByRole('link', { name: 'Firme' }).parentElement as HTMLElement
    const links = within(kicker).getAllByRole('link').slice(1)
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAttribute('href', '/companies/analytics')
    expect(JSON.parse(links[0]?.getAttribute('data-search') ?? '{}')).toEqual({ judet: 'CJ' })
    // No selection, no division: ANAF's fiscal code names none.
    expect(kicker.textContent).toBe('Firme/Cluj')
  })
})

/**
 * The head's sentence (CZ — the accepted header): the legal form, the place,
 * the year ONRC recorded and the selected activity, each underlined and each
 * leading where the analysis can follow it; a held result's profit called a
 * profit in the figures and the chart, never the net result.
 */
describe('CompanyProfilePage — the head', () => {
  const sentence = () => screen.getByRole('heading', { level: 1 }).nextElementSibling as HTMLElement
  const searchOf = (link: HTMLElement) => JSON.parse(link.getAttribute('data-search') ?? '{}') as Record<string, unknown>

  beforeEach(() => {
    slice.current = { data: undefined, isError: false, refetch: vi.fn() }
  })

  it('says the year ONRC recorded — registered then, not founded — and leads each fact to its filter or band', async () => {
    render(page(companyProfile()))
    await registryPinned()
    expect(sentence()).toHaveTextContent(/^Societate cu răspundere limitată \(.+\) din Gherla, Cluj \(.+\), înregistrată la ONRC în 2007 \(.+\)\./u)
    const form = within(sentence()).getByRole('link', { name: /^Societate cu răspundere limitată/u })
    expect(form).toHaveAttribute('href', '/companies/analytics')
    expect(searchOf(form)).toEqual({ forma: 'SRL' })
    // The locality the label names, by the edition's SIRUTA code: not the county's companies under a town's name.
    // (The router writes a digits-only value as a number.)
    expect(searchOf(within(sentence()).getByRole('link', { name: /^Gherla, Cluj/u }))).toEqual({ uat: 55384 })
    // No analysis filter selects a registration year: the registry band says the date.
    expect(within(sentence()).getByRole('link', { name: /^2007/u })).toHaveAttribute('href', '#registru')
    expect(document.body.textContent).not.toMatch(/înființat|înregistrată în 2007|de \d+ ani/u)
  })

  it('says a form outside the analysis’s population without leading to an empty answer', async () => {
    render(page(companyProfile({ legalForm: 'PFA' })))
    await registryPinned()
    expect(sentence()).toHaveTextContent(/^Persoană fizică autorizată din Gherla, Cluj/u)
    expect(within(sentence()).queryByRole('link', { name: /^Persoană fizică autorizată/u })).toBeNull()
  })

  it('names a selected ONRC class by its exact label, code and revision, and opens its exact filter with the revision', async () => {
    render(page(companyProfile({ activitySelection: ACTIVITY_SELECTIONS.onrcSingleClass })))
    await registryPinned()
    expect(sentence()).toHaveTextContent(
      /Activitatea selectată: Activități de realizare a soft-ului la comandă \(software orientat client\) \(.+\) \(CAEN 6201, Rev\.2, din registrul ONRC\)\./u,
    )
    const activity = within(sentence()).getByRole('link', { name: /^Activități de realizare a soft-ului/u })
    expect(searchOf(activity)).toEqual({ activitate: 'onrc:rev2:6201' })
    // The kicker names the class's Rev.2 division as text: the analysis filters exact activities, never a division.
    const kicker = screen.getByRole('link', { name: 'Firme' }).parentElement as HTMLElement
    expect(kicker.textContent).toBe('Firme/Cluj/Software și servicii IT')
    expect(within(kicker).getAllByRole('link')).toHaveLength(2)
  })

  it('names no activity it did not select: several classes are counted and lead to their band', async () => {
    // ANAF's digits match a class in two revisions: no revision is preferred, nothing is selected.
    render(page(companyProfile({ activitySelection: ACTIVITY_SELECTIONS.onrcMultipleRevisions })))
    await registryPinned()
    const count = within(sentence()).getByRole('link', { name: /^2 activități clasificate/u })
    expect(count).toHaveAttribute('href', '#activitati')
    expect(sentence()).toHaveTextContent(/în registrul ONRC, niciuna selectată\.$/u)
    expect(sentence().textContent).not.toMatch(/Activitatea selectată|principal/u)
  })

  it('keeps ANAF’s selected code without a revision, its filter ANAF’s, and no division', async () => {
    render(page(companyProfile({ activitySelection: ACTIVITY_SELECTIONS.anafConflict })))
    await registryPinned()
    expect(sentence()).toHaveTextContent(/\(cod CAEN fiscal ANAF \d{4}, revizie nepublicată\)\./u)
    const link = within(sentence()).getByRole('link', { name: /^codul \d{4}/u })
    expect(searchOf(link)).toEqual({ activitate: `anaf:${ACTIVITY_SELECTIONS.anafConflict.code}` })
    const kicker = screen.getByRole('link', { name: 'Firme' }).parentElement as HTMLElement
    expect(kicker.textContent).toBe('Firme/Cluj')
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
    expect(registryFact('Cod CAEN fiscal (ANAF)')).toBe('9531 · CAEN Rev.3')
    expect(screen.queryByText(/revizie CAEN nepublicată/)).toBeNull()
    expect(within(activities()).getByText('Codul CAEN 9531')).toBeInTheDocument()
    expect(within(activities()).getByText('Din datele fiscale ANAF, CAEN Rev.3. O observație din sursă, nu o activitate principală.')).toBeInTheDocument()
    expect(within(activities()).queryByText(/nu indică revizia CAEN/)).toBeNull()
  })

  it('says only what ANAF’s published data lacks for an unknown revision, the registry’s name kept apart', async () => {
    // 66 Jack: ANAF 5610 with no revision; the registry authorises 5610 in Rev.2.
    render(page(companyProfile()))
    await registryPinned()
    expect(registryFact('Cod CAEN fiscal (ANAF)')).toBe('5610 · revizie CAEN nepublicată de ANAF')
    expect(
      within(activities()).getByText(
        'Din datele fiscale ANAF: o observație din sursă, nu o activitate principală. ANAF nu publică revizia CAEN, iar aceleași cifre pot însemna activități diferite în revizii diferite, așa că nu îi dăm o denumire.',
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
 * The derived activity selection heads „Ce face firma" when the API serves
 * one: what was selected and how — a derived selection, never a principal
 * activity — each source's date, the edition's coverage and counts; ANAF's
 * code beside it as the fiscal code, revision unpublished; a row that is no
 * class said as such; a bounded list said to be bounded. An older API's
 * profile (no selection) reads as before (see above).
 */
describe('CompanyProfilePage — the derived activity selection', () => {
  const registryFact = (term: string) => screen.getByText(term, { selector: 'dt' }).nextElementSibling?.textContent
  const selection = () => screen.getByTestId('company-activity-selection')
  /** How the activity was selected — ANAF's code, each source's date, the edition's counts — behind the selection's info button. */
  const howSelected = async () => {
    fireEvent.click(within(selection()).getByRole('button', { name: 'Cum a fost selectată' }))
    return within(await screen.findByRole('dialog', { name: 'Cum a fost selectată' }))
  }

  beforeEach(() => {
    slice.current = { data: undefined, isError: false, refetch: vi.fn() }
  })

  it('heads the band with the only classified ONRC observation, its revision, each source’s date and the coverage — never as principal', async () => {
    render(page(companyProfile({ activitySelection: ACTIVITY_SELECTIONS.onrcSingleClass })))
    await registryPinned()
    const block = within(selection())
    expect(block.getByText('Activitate selectată (derivată)')).toBeInTheDocument()
    // Its name as the title, the code once beneath it with its revision and source.
    expect(block.getByText('Activități de realizare a soft-ului la comandă (software orientat client)')).toBeInTheDocument()
    expect(block.getByText('6201 · CAEN Rev.2 · ediția ONRC')).toBeInTheDocument()
    expect(selection().textContent?.match(/6201/gu)).toHaveLength(1)
    expect(block.getByText(/Singura activitate clasificată observată în ediția ONRC/u)).toBeInTheDocument()
    expect(selection().textContent).not.toMatch(/principal/iu)
    // How, a tap away: each source's date and a complete edition's coverage.
    const how = await howSelected()
    expect(how.getByTestId('company-activity-selection-dates').textContent).toMatch(/^ediția ONRC publicată pe .+ · ANAF, situația la .+$/u)
    expect(how.getByTestId('company-activity-selection-coverage')).toHaveTextContent('Înscrierile CAEN ale firmei din ediție sunt complete.')
    // The legacy headline is not there; ANAF's code is its fiscal code, revision unpublished.
    expect(screen.queryByText(/Cod CAEN fiscal ANAF ·/u)).toBeNull()
    expect(registryFact('Cod CAEN fiscal (ANAF)')).toBe('5610 · revizie CAEN nepublicată de ANAF')
  })

  it('says the selection cannot be computed when the API refused it alone, instead of the older headline', async () => {
    render(page(companyProfile({ activitySelection: null, activitySelectionUnavailable: true })))
    await registryPinned()
    expect(screen.getByTestId('company-activity-selection-unavailable')).toHaveTextContent('Activitatea selectată nu poate fi calculată acum pentru această firmă')
    expect(screen.queryByText(/Cod CAEN fiscal ANAF ·/u)).toBeNull()
  })

  it('shows ANAF’s code with the catalog’s alternatives, never a revision of the company’s', async () => {
    render(page(companyProfile({ activitySelection: ACTIVITY_SELECTIONS.anafConflict })))
    await registryPinned()
    const block = within(selection())
    expect(block.getByText('Activitate selectată (derivată)')).toBeInTheDocument()
    // The title shows the code and its unpublished revision; the line under it adds only the source.
    expect(block.getByText('Cod CAEN fiscal ANAF')).toBeInTheDocument()
    expect(selection().textContent?.match(/6201/gu)).toHaveLength(1)
    expect(block.getByText('Activități de programare a calculatoarelor')).toBeInTheDocument()
    expect(block.queryByText(/ediția ONRC$/u)).toBeNull()
    expect((await howSelected()).getByTestId('company-activity-selection-coverage').textContent).toMatch(/^Nicio activitate observată în ediția ONRC publicată pe /u)
  })

  it('says no selection quietly: the title alone, no count or sentence repeating it, and why with how', async () => {
    render(page(companyProfile({ activitySelection: ACTIVITY_SELECTIONS.onrcMultipleRevisions })))
    await registryPinned()
    const block = within(selection())
    expect(block.getByText('Nicio activitate selectată')).toBeInTheDocument()
    expect(block.queryByText(/activități clasificate|niciuna nu e selectată/u)).toBeNull()
    // Nothing was selected: the info button says why, not how.
    fireEvent.click(block.getByRole('button', { name: 'De ce nu e selectată niciuna' }))
    expect(within(await screen.findByRole('dialog', { name: 'De ce nu e selectată niciuna' })).getByText(/^Codul CAEN fiscal ANAF 5211 are aceleași cifre ca activități clasificate din revizii CAEN diferite/u)).toBeInTheDocument()
  })

  it('says a company without a qualified selection is not without activity, and that an unresolved list may be incomplete', async () => {
    render(page(companyProfile({ activitySelection: ACTIVITY_SELECTIONS.unresolvedPlaceholder })))
    await registryPinned()
    const block = within(selection())
    expect(block.getByText('Nicio selecție calificată')).toBeInTheDocument()
    expect(block.getByText(/nu înseamnă că firma nu are activitate/u)).toBeInTheDocument()
    // A list that may be incomplete is said in the open; ANAF's placeholder code a tap away.
    expect(block.getByTestId('company-activity-selection-coverage')).toHaveTextContent('Legături nerezolvate: lista poate fi incompletă.')
    expect((await howSelected()).getByText('Codul CAEN fiscal ANAF 0000 este un cod substitut și nu e folosit la selecție.')).toBeInTheDocument()
  })

  it('names a short source code as ambiguous and unlabelled, and lists no original row', async () => {
    const profile = companyProfile({
      activitySelection: { ...ACTIVITY_SELECTIONS.truncated, editionId: 'mock-1' },
      caenActivities: [
        { code: '5610', rev: 'rev2', label: 'Restaurante', source: 'onrc', classState: 'class' },
        { code: '5600', rev: 'rev2', label: null, source: 'onrc', classState: 'short_token' },
        { code: '5610', rev: null, label: null, source: 'anaf' },
      ],
      registry: mockRegistryEvidence({
        identifier: 'J12/3094/2007',
        name: '66 JACK SRL',
        legalForm: 'SRL',
        recordedDate: '2007-11-26',
        countyCode: 'CJ',
        countyName: 'Cluj',
        statusCodes: ['1048'],
        caen: [
          { code: '5610', revision: 'rev2', label: 'Restaurante' },
          { code: '5600', revision: 'rev2', label: 'Împrumutat', classState: 'short_token' },
        ],
        observationsTruncated: true,
      }),
    })
    render(page(profile))
    await registryPinned()
    // The edition's original rows are not listed; the source's own label never shows.
    expect(screen.queryByTestId('company-registry-rows')).toBeNull()
    expect(screen.queryByText(/Împrumutat|înscrieri originale/u)).toBeNull()
    // The bounded activity list says the edition's count beside what it shows, never passes for all of it.
    const activities = within(document.getElementById('activitati') as HTMLElement)
    expect(activities.getByTestId('company-activities-truncated').textContent).toMatch(/^1\.090 de observații CAEN în ediție; se afișează 2\.$/u)
    // The activities: the division holds the class alone; the short row sits with the unqualified observations, said for what it is.
    const division = activities.getByRole('button', { name: /Restaurante și baruri/u })
    fireEvent.click(division)
    const classes = within(document.getElementById(division.getAttribute('aria-controls') ?? '') as HTMLElement)
    expect(classes.getByText('5610')).toBeInTheDocument()
    expect(classes.queryByText('5600')).toBeNull()
    const unqualified = activities.getByRole('button', { name: /Observații necalificate/u })
    fireEvent.click(unqualified)
    const rows = within(document.getElementById(unqualified.getAttribute('aria-controls') ?? '') as HTMLElement)
    expect(rows.getByText('5600')).toBeInTheDocument()
    expect(rows.getByText('cod scurt în sursă — clasă/grupă ambiguă')).toBeInTheDocument()
    expect(activities.getByText(/O înscriere neclasificată/u)).toBeInTheDocument()
  })

  it('never heads short source codes with the division their padded digits name (the six-row short-token company)', async () => {
    const row = (code: string, classState: 'class' | 'short_token' | 'unlabeled_key', label: string | null = null) => ({
      code,
      rev: 'rev2',
      label,
      source: 'onrc' as const,
      classState,
    })
    render(
      page(
        companyProfile({
          caenActivities: [
            row('0201', 'short_token'),
            row('0111', 'short_token'),
            row('0112', 'short_token'),
            row('6201', 'class', 'Activități de realizare a soft-ului la comandă'),
            row('4711', 'class', 'Comerț cu amănuntul în magazine nespecializate'),
            row('9999', 'unlabeled_key'),
          ],
        }),
      ),
    )
    await registryPinned()
    const band = document.getElementById('activitati') as HTMLElement
    const activities = within(band)
    // Was: „02 Silvicultură" and „01 Agricultură" headings for 0201, 0111 and 0112.
    expect(band.textContent).not.toMatch(/Silvicultur|Agricultur/u)
    const groups = activities.getAllByRole('button', { expanded: false }).filter((button) => button.hasAttribute('aria-controls'))
    expect(groups.map((button) => button.textContent)).toEqual(['47Comerț cu amănuntul1', '62Software și servicii IT1', 'Observații necalificate4'])
    fireEvent.click(activities.getByRole('button', { name: /Observații necalificate/u }))
    const panel = within(document.getElementById(activities.getByRole('button', { name: /Observații necalificate/u }).getAttribute('aria-controls') ?? '') as HTMLElement)
    for (const code of ['0111', '0112', '0201', '9999']) expect(panel.getByText(code)).toBeInTheDocument()
    expect(panel.getAllByText('cod scurt în sursă — clasă/grupă ambiguă')).toHaveLength(3)
    expect(panel.getByText('cod fără denumire în nomenclatorul CAEN')).toBeInTheDocument()
    // Every row counted, the classes' nomenclature kept.
    expect(activities.getByText('6 activități autorizate în registrul comerțului (CAEN Rev.2).')).toBeInTheDocument()
  })

  it('never infers a class for an older API row without class state: Rev.1 0201 gets no division 02 and no forestry name', async () => {
    render(
      page(
        companyProfile({
          // The legacy fallback: no classState, a catalog label riding along.
          caenActivities: [{ code: '0201', rev: 'rev1', label: 'Silvicultură și exploatare forestieră', source: 'onrc' as const }],
        }),
      ),
    )
    await registryPinned()
    const band = document.getElementById('activitati') as HTMLElement
    const activities = within(band)
    expect(band.textContent).not.toMatch(/Silvicultur|forestier|Diviziunea 02/u)
    const groups = activities.getAllByRole('button', { expanded: false }).filter((button) => button.hasAttribute('aria-controls'))
    expect(groups.map((button) => button.textContent)).toEqual(['Calificare indisponibilă1'])
    fireEvent.click(groups[0] as HTMLElement)
    const panel = within(document.getElementById(groups[0]?.getAttribute('aria-controls') ?? '') as HTMLElement)
    // The code as served, said to be unassessed — not invalid, not a class.
    expect(panel.getByText('0201')).toBeInTheDocument()
    expect(panel.getByText('calificarea codului nu e disponibilă')).toBeInTheDocument()
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
  // A current-API row: a qualified class by default. The server serves a
  // CLASS row only with a known revision, so a row without one is passed as
  // `unknown_revision` explicitly.
  const onrc = (code: string, rev: string | null, label: string | null, classState: CompanyCaenClassState = 'class') => ({
    code,
    rev,
    label,
    source: 'onrc' as const,
    classState,
  })
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
            onrc('4711', null, null, 'unknown_revision'),
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

    // Rev.3's 62 by ONRC's own Rev.3 name; Rev.1's 62 (air transport) by its number: never one name for both.
    const rev3 = division(/Activități de programare și activități de consultanță în tehnologia informației/)
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

    // A row with no revision (unknown_revision): unqualified, no division,
    // its code and its state, no name.
    expect(activities().queryByText(/Diviziunea 47/u)).toBeNull()
    const unknown = division(/Observații necalificate/)
    fireEvent.click(unknown)
    const unnamed = document.getElementById(unknown.getAttribute('aria-controls') ?? '') as HTMLElement
    expect(within(unnamed).getByText('4711')).toBeInTheDocument()
    expect(unnamed.querySelector('li')?.textContent).toBe('4711revizie CAEN necunoscută')

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
    litigation.current = null
  })

  /** The years' band: the matrix, its cells said in full to assistive technology. */
  const years = () => within(screen.getByRole('region', { name: 'Bilanțurile, an cu an' }))
  /** A statement opened from its year's header, under the matrix. */
  const openYear = (year: number) => {
    fireEvent.click(years().getByRole('button', { name: new RegExp(`^Bilanțul pe ${year}`, 'u') }))
    return within(screen.getByRole('region', { name: `Bilanțul pe ${year}` }))
  }
  /** The admission policy and how to read the cells, behind the corner's info button. */
  const aboutValues = async () => {
    fireEvent.click(years().getByRole('button', { name: 'Despre aceste valori' }))
    return within(await screen.findByRole('dialog', { name: 'Despre aceste valori' }))
  }

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
    // In the matrix: faded, its exact value and why to assistive technology; its year marked for a look.
    expect(years().getByText('300.000.000.000.000 lei, reținută după verificare')).toBeInTheDocument()
    expect(years().getByRole('button', { name: 'Bilanțul pe 2020, de verificat' })).toBeInTheDocument()
    expect(years().getByRole('button', { name: 'Bilanțul pe 2019' })).toBeInTheDocument()
    // Opened: the exact value, why, and the reviewer's reason in words, the recorded one beside it (never alone).
    const detail = openYear(2020)
    expect(detail.getByText('300.000.000.000.000 lei')).toBeInTheDocument()
    expect(detail.getByText('2 valori ținute în afara cifrelor; rezultatul net reținut')).toBeInTheDocument()
    expect(detail.getAllByText('reținută după verificare')).toHaveLength(2)
    expect(detail.getByText(/^Reținut după o verificare\./u)).toBeInTheDocument()
    expect(detail.getByText('Motivul înregistrat: Valoare introdusă greșit, verificată la sursă.')).toBeInTheDocument()
    // No figure is built from it: no turnover or net tile, the reported headcount still is one.
    for (const label of ['Cifra de afaceri, 2020', 'Profit net, 2020', 'Pierdere netă, 2020', 'Rezultat net, 2020']) {
      expect(screen.queryByText(label)).toBeNull()
    }
    expect(screen.getByText('Salariați, 2020')).toBeInTheDocument()
    expect((await aboutValues()).getByText(/politica de calificare companies-analytics-admission-2026-10-02-q1, aprobată pe 2026-10-02/u)).toBeInTheDocument()
  })

  it('closes an opened statement from its own button', async () => {
    render(page(companyProfile({ financials: [financialYear(2025, { turnover: 9_000 })] })))
    await registryPinned()
    const detail = openYear(2025)
    expect(detail.getByText('Toate valorile admise')).toBeInTheDocument()
    fireEvent.click(detail.getByRole('button', { name: 'Închide bilanțul pe 2025' }))
    expect(screen.queryByRole('region', { name: 'Bilanțul pe 2025' })).toBeNull()
    // Focus goes back to the year that opened it.
    await waitFor(() => expect(document.activeElement).toBe(years().getByRole('button', { name: /^Bilanțul pe 2025/u })))
  })

  it('says a reviewed hold in words, never its code alone (CH-001)', async () => {
    const base = financialYear(2023, { turnover: 300_000_000_000_000 })
    const held = {
      ...base,
      originals: { ...base.originals, turnover: '300000000000000' },
      qualification: { ...admittedQualification(base, { turnover: 'held_observation' }), holdReason: 'reviewed_suspect_statement' },
    }
    render(page(companyProfile({ financials: [held] })))
    await registryPinned()
    const detail = openYear(2023)
    expect(detail.getByText(/^La verificare, bilanțul a fost reținut ca suspect: valorile publicate nu sunt plauzibile\./u)).toBeInTheDocument()
    expect(detail.getByText('Motivul înregistrat: reviewed_suspect_statement')).toBeInTheDocument()
  })

  it('draws nothing from statements that were not assessed, says why, and keeps their source values readable', async () => {
    const unassessed = { ...financialYear(2025, { employees: 3, turnover: 9_000 }), qualification: notAssessed('qualification_unavailable') }
    render(page(companyProfile({ financials: [unassessed] })))
    await registryPinned()
    expect(screen.queryByText('Cifra de afaceri, 2025')).toBeNull()
    expect(screen.queryByText('Salariați, 2025')).toBeNull()
    expect(screen.getByText(/nu a putut fi calificat \(calificarea nu este disponibilă acum\)/u)).toBeInTheDocument()
    expect(years().getByText('9.000 lei, necalificat (calificarea nu este disponibilă acum)')).toBeInTheDocument()
    expect(years().getByRole('button', { name: 'Bilanțul pe 2025, de verificat' })).toBeInTheDocument()
  })

  it('computes no share of a sector, county or national total: no edition-bound total exists', async () => {
    render(page(companyProfile({ financials: [financialYear(2025, { turnover: 9_000 })] })))
    await registryPinned()
    expect(screen.queryByText(/Cotele firmei/u)).toBeNull()
    expect(screen.queryByText('Cât cântărește în economie')).toBeNull()
  })

  /** A live-API response through the real mapper: no fixture default can stand in for a missing qualification. */
  const mapped = (years: RawCompanyFinancialYear[], longFormOnly?: RawLongFormStatement[] | null): PrivateCompanyProfile => {
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
      companyFinancials: { years, trajectory: null, ...(longFormOnly === undefined ? {} : { longFormOnly }) },
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
    // Both years, both exact source values, each statement's own state.
    expect(years().getByText('1.234.567,89 lei, necalificat (calificarea nu este disponibilă acum)')).toBeInTheDocument()
    expect(years().getByText('7.654.321,00 lei, necalificat (calificarea nu este disponibilă acum)')).toBeInTheDocument()
    const detail = openYear(2023)
    expect(detail.getByText('Bilanțul pe 2023 · ANAF')).toBeInTheDocument()
    expect(detail.getByText('7.654.321,00 lei')).toBeInTheDocument()
    // Held whole: why is said once, as its state, not on every value.
    expect(detail.getAllByText(/^necalificat \(calificarea nu este disponibilă acum\)$/iu)).toHaveLength(1)
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
    for (const statements of [[fourSixFour(2024)], [plain, fourSixFour(2024)]]) {
      const { unmount } = render(page(mapped(statements)))
      await registryPinned()
      // The published component, labelled as what it is, and admitted: its exact value, no reason beside it.
      const profit = years().getByRole('rowheader', { name: 'Profit net' }).closest('tr')!
      expect(within(profit).getByText('120,00 lei')).toBeInTheDocument()
      // The derived net: no value, and why.
      const net = years().getByRole('rowheader', { name: 'Rezultat net calculat' }).closest('tr')!
      expect(within(net).getByText('reținut: pentru această formă de bilanț nu se calculează din profit și pierdere')).toBeInTheDocument()
      const detail = openYear(2024)
      expect(detail.getByText('Rezultat net calculat')).toBeInTheDocument()
      expect(detail.getByText('reținut: pentru această formă de bilanț nu se calculează din profit și pierdere')).toBeInTheDocument()
      // The admitted profit is a figure only as a profit, and only for the newest statement; never a net result, never „120 − 0".
      const newest = statements[0]?.year === 2024
      expect(screen.queryByText('Profit net, 2024') !== null).toBe(newest)
      for (const label of ['Pierdere netă, 2024', 'Rezultat net, 2024']) expect(screen.queryByText(label)).toBeNull()
      const model = buildCompanyProfileModel(mapped(statements))
      expect(model.series.netResult.every((point) => point.value === null)).toBe(true)
      expect(model.series.net.find((point) => point.year === 2024)).toEqual({ year: 2024, value: 120, kind: 'profit' })
      unmount()
    }
  })

  it('names the bottom line by what it holds: a held result’s profit is „Profit net", in the head chart and the business band', async () => {
    // OMV's shape: the 464d layout's profits, admitted, their results held for want of a loss.
    const fourSixFour = (year: number, profit: string): RawCompanyFinancialYear => ({
      year,
      sourceSystem: 'anaf',
      turnover: '30000000000.00',
      netProfit: profit,
      netLoss: null,
      employees: '6701',
      qualification: rawQualification({ turnover: 'REPORTED', employees: 'REPORTED', net_profit: 'REPORTED', net_result: 'HELD_PROFILE' }),
    })
    render(page(mapped([fourSixFour(2025, '3067559914'), fourSixFour(2024, '4143914310')]), { masura: 'profit' }))
    await registryPinned()
    // The figure, its change between two admitted profits.
    expect(screen.getByText('Profit net, 2025')).toBeInTheDocument()
    expect(screen.getByText('-26,0% față de 2024')).toBeInTheDocument()
    // The chart's measure and the head chart's legend say profit, never the result.
    const toggle = screen.getByRole('radiogroup', { name: 'Graficul arată' })
    expect(within(toggle).getByRole('radio', { name: 'Profit net' })).toHaveAttribute('aria-checked', 'true')
    expect(within(toggle).queryByRole('radio', { name: 'Rezultat net' })).toBeNull()
    expect(screen.getByRole('table', { name: /^Cifra de afaceri, profitul net și salariații, 2024–2025$/u })).toBeInTheDocument()
  })

  it('leaves a held result’s zero profit a gap and says why — never a break-even', async () => {
    // CFR's shape: a zero profit on the 464d layout, whose losses no line carries.
    const zero = (year: number): RawCompanyFinancialYear => ({
      year,
      sourceSystem: 'anaf',
      turnover: '1000000.00',
      netProfit: '0',
      netLoss: null,
      employees: '20',
      qualification: rawQualification({ turnover: 'REPORTED', employees: 'REPORTED', net_profit: 'REPORTED', net_result: 'HELD_PROFILE' }),
    })
    const profile = mapped([zero(2025), zero(2024)])
    render(page(profile, { masura: 'profit' }))
    await registryPinned()
    for (const label of ['Profit net, 2025', 'Rezultat net, 2025', 'Pierdere netă, 2025']) expect(screen.queryByText(label)).toBeNull()
    expect(buildCompanyProfileModel(profile).series.net.every((point) => point.value === null)).toBe(true)
    // The year's reading (the chart's spoken value) says why it is empty.
    const chart = within(document.getElementById('afacerea') as HTMLElement).getByRole('slider')
    expect(chart).toHaveAttribute('aria-valuetext', '2025, Profit net zero și nicio pierdere disponibilă aici: rezultatul net nu se știe')
  })

  it('says a held result’s own reason when a loss WAS typed — never „no typed loss"', async () => {
    // A zero profit beside a reported loss of 50, the result held for a quality signal.
    const lossTyped: RawCompanyFinancialYear = {
      year: 2025,
      sourceSystem: 'anaf',
      turnover: '1000.00',
      netProfit: '0',
      netLoss: '50',
      employees: '3',
      qualification: rawQualification({ turnover: 'REPORTED', employees: 'REPORTED', net_profit: 'REPORTED', net_loss: 'REPORTED', net_result: 'HELD_QUALITY' }),
    }
    render(page(mapped([lossTyped]), { masura: 'profit' }))
    await registryPinned()
    const chart = within(document.getElementById('afacerea') as HTMLElement).getByRole('slider')
    expect(chart).toHaveAttribute('aria-valuetext', '2025, Reținut pentru un semnal de calitate')
    expect(chart.getAttribute('aria-valuetext')).not.toMatch(/nicio pierdere/u)
  })

  it('names the statements on another basis instead of plotting them under the newest policy (D1-C03)', async () => {
    const older = financialYear(2023, { turnover: 1_000, employees: 2 })
    const rebased = { ...older, qualification: { ...older.qualification, policySha256: 'b2'.repeat(32), policyVersion: 'an-older-policy' } }
    render(page(companyProfile({ financials: [rebased, financialYear(2024, { turnover: 2_000, employees: 3 })] })))
    await registryPinned()
    const note = await aboutValues()
    expect(note.getByText(/politica de calificare companies-analytics-admission-2026-10-02-q1/u)).toBeInTheDocument()
    expect(note.getByText(/^Bilanțurile pe 2023 au fost calificate după altă politică sau altă ediție a datelor/u)).toBeInTheDocument()
    expect(screen.queryByText(/an-older-policy/u)).toBeNull()
    // Its values stay readable, out of the figures.
    expect(years().getByText('1.000 lei, calificat după altă politică sau altă ediție a datelor')).toBeInTheDocument()
    expect(years().getByRole('button', { name: 'Bilanțul pe 2023, de verificat' })).toBeInTheDocument()
  })

  // ── Source traceability (B5c): long-format-only statements, the ANAF query, the headcount band.

  const OMV_2013_URL = 'https://data.gov.ro/dataset/f8353c0e-fee9-4aa3-b26d-be0e96c328a7/resource/13dec119-4013-4689-90e0-52da4c69d3ea/download/web_ir_an2013.txt'
  /** OMV-shaped: FY2013 sits in the 2021 package, its file the one recorded — never a name built from the year. */
  const LONG_FORM: RawLongFormStatement[] = [
    { year: 2013, sourceSystem: 'mfp', filerClass: 'ir', sourceSnapshotId: 'mfp:situatii_financiare_2021:2013:13dec119-4013-4689-90e0-52da4c69d3ea', resourceUrl: OMV_2013_URL },
    { year: 2012, sourceSystem: 'mfp', filerClass: 'ir', sourceSnapshotId: 'mfp:situatii_financiare_2012:2012:0646b71b-8dbc-4241-9c6b-7d01cce771e4', resourceUrl: null },
  ]
  const ANAF_2024: RawCompanyFinancialYear = {
    year: 2024,
    sourceSystem: 'anaf',
    turnover: '1000.00',
    netProfit: '10.00',
    netLoss: '0.00',
    employees: '12',
    source: {
      sourceSystem: 'anaf',
      url: 'https://webservicesp.anaf.ro/bilant?an=2024&cui=22202108',
      urlKind: 'anaf_statement',
      statementProfileHash: 'c3'.repeat(32),
      metricRuleVersion: 'anaf-bilant-metric-v1',
    },
  }
  const longForm = () => screen.queryByRole('region', { name: 'Bilanțuri doar în format lung' })

  it('lists the long-format-only years under the statements: year, publisher, class as recorded and the recorded file — no value', async () => {
    render(page(mapped([ANAF_2024], LONG_FORM)))
    await registryPinned()
    const band = within(document.getElementById('an-cu-an') as HTMLElement)
    const list = within(band.getByRole('region', { name: 'Bilanțuri doar în format lung' }))
    expect(list.getByText(/^Bilanțurile pe 2012–2013 sunt înregistrate sub acest CUI doar în format lung/u)).toHaveTextContent('Nu sunt ani fără bilanț.')
    expect(list.getByText('2013 · MF · clasa ir')).toBeInTheDocument()
    expect(list.getByText('2012 · MF · clasa ir')).toBeInTheDocument()
    // The recorded anchor file, exactly; none when none was recorded. The class is never read as a reporting basis.
    expect(list.getByRole('link', { name: 'Fișierul bilanțului pe 2013, pe data.gov.ro' })).toHaveAttribute('href', OMV_2013_URL)
    expect(list.queryByRole('link', { name: /2012/u })).toBeNull()
    expect(list.getByText('Fișierul e cel din care a fost citit bilanțul; un bilanț poate apărea și în alte fișiere.')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/IFRS|rândul|mfp:13dec119/u)
    // No column, figure or point for those years: the matrix keeps only the typed statement.
    expect(band.queryByRole('button', { name: /^Bilanțul pe 201[23]/u })).toBeNull()
    expect(buildCompanyProfileModel(mapped([ANAF_2024], LONG_FORM)).span).toEqual([2024])
  })

  it('names the ANAF link as a query asked now, with what it can and cannot show', async () => {
    render(page(mapped([ANAF_2024], [])))
    await registryPinned()
    fireEvent.click(within(screen.getByRole('region', { name: 'Bilanțurile, an cu an' })).getByRole('button', { name: /^Bilanțul pe 2024/u }))
    const detail = within(screen.getByRole('region', { name: 'Bilanțul pe 2024' }))
    expect(detail.getByRole('link', { name: 'Interoghează ANAF pentru 2024' })).toHaveAttribute('href', 'https://webservicesp.anaf.ro/bilant?an=2024&cui=22202108')
    expect(
      detail.getByText('Legătura îi cere acum ANAF-ului bilanțul pe 2024 al acestui CUI; ANAF răspunde cu datele de azi, care pot diferi de cele preluate aici.'),
    ).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/Bilanțul la ANAF|custodie|amprent/u)
    // Known none: nothing is said about long-format statements.
    expect(longForm()).toBeNull()
  })

  it('discloses a long-format-only CUI where its figures would be, with no years band', async () => {
    render(page(mapped([], [{ ...LONG_FORM[0]!, resourceUrl: 'javascript:alert(1)' }])))
    await registryPinned()
    expect(document.getElementById('an-cu-an')).toBeNull()
    const business = within(document.getElementById('afacerea') as HTMLElement)
    expect(business.getByText(/Nicio valoare din bilanțuri în datele de aici/u)).toBeInTheDocument()
    const list = within(business.getByRole('region', { name: 'Bilanțuri doar în format lung' }))
    expect(list.getByText(/^Bilanțul pe 2013 e înregistrat sub acest CUI doar în format lung/u)).toHaveTextContent('Nu e un an fără bilanț.')
    // Only a web address is a link.
    expect(list.queryByRole('link')).toBeNull()
  })

  it('says nothing about long-format statements when the API cannot say, nor when it knows none', async () => {
    const answers: (RawLongFormStatement[] | null | undefined)[] = [null, undefined, []]
    for (const longFormOnly of answers) {
      const { unmount } = render(page(mapped([ANAF_2024], longFormOnly)))
      await registryPinned()
      expect(longForm()).toBeNull()
      expect(document.body.textContent).not.toMatch(/format lung|fără bilanț publicat/u)
      unmount()
    }
  })

  it('reads the size as the reported headcount of a named statement, never as an SME class', async () => {
    render(page(builder()))
    await registryPinned()
    const registry = within(document.getElementById('registru') as HTMLElement)
    expect(registry.getByText('Mărime după salariați')).toBeInTheDocument()
    expect(registry.getByText('10–49 de salariați raportați în bilanțul pe 2025')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/microîntreprindere|firmă mică|firmă mijlocie|firmă mare/u)
  })
})
