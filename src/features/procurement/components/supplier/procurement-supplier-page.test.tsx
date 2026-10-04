import type { ReactNode } from 'react'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup, renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestQueryClient } from '@/test/test-utils'
import { TooltipProvider } from '@/components/ui/tooltip'
import { fetchCompanyRegistry } from '@/features/private-companies/api/company-registry-api'
import { GraphQLRequestError } from '@/lib/graphql/graphql-client'
import { createQueryClient } from '@/lib/queryClient'
import type { ProcurementSupplierSearch } from '@/schemas/procurement-supplier'
import type { PrivateCompanyProfile } from '@/schemas/private-company'
import type { CompanyRegistryCapabilities } from '@/schemas/private-company-registry'
import { MOCK_REGISTRY_CAPABILITIES, MOCK_REGISTRY_ENVELOPE, registryStateEvidence } from '@/features/private-companies/mocks/fixtures/registry'
import { consortiumContracts, supplierDirect, supplierProfile } from '../../lib/supplier.fixture'
import { ProcurementSupplierPage, type ProcurementSupplierInitialData } from './procurement-supplier-page'
import { recentPeriod, yearPeriod } from '../../lib/profile-period.fixture'

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

// The ONRC registry the page pins, and the company page's own read of the firm: no request leaves the test.
const registry = vi.hoisted(() => ({
  capabilities: null as unknown,
  company: vi.fn(),
}))
vi.mock('@/features/private-companies/api/company-registry-api', () => ({
  fetchCompanyRegistry: vi.fn(async () => registry.capabilities),
  fetchCompanyRegistrationDiff: vi.fn(),
}))
vi.mock('@/features/private-companies/api/private-company-api', () => ({
  fetchPrivateCompanyProfile: (...args: unknown[]) => registry.company(...args),
}))

const INITIAL: ProcurementSupplierInitialData = { choice: 2025, profile: supplierProfile(), direct: supplierDirect() }

/** The query client of the page rendered last: a fresh one per page, as each request has its own. */
let client: QueryClient

function page(search: ProcurementSupplierSearch = {}, initial: ProcurementSupplierInitialData = INITIAL, cui = '9813902', queryClient: QueryClient = createTestQueryClient()) {
  client = queryClient
  return (
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <ProcurementSupplierPage cui={cui} search={search} initial={initial} />
      </TooltipProvider>
    </QueryClientProvider>
  )
}

/** The registry's capabilities under another scope: a new edition, or an access change. */
function movedCapabilities(scopeKey: string, state: CompanyRegistryCapabilities['registry']['state'] = 'published'): CompanyRegistryCapabilities {
  return { ...MOCK_REGISTRY_CAPABILITIES, registry: { ...MOCK_REGISTRY_ENVELOPE, state, editionId: state === 'published' ? 'mock-2' : null, scopeKey } }
}

/** The firm's registry record as the company page reads it under `scopeKey`, by its own name when a test gives one. */
function companyUnder(scopeKey: string, legalName?: string): PrivateCompanyProfile {
  const record = supplierProfile().registry as PrivateCompanyProfile
  return { ...record, ...(legalName ? { legalName } : {}), registry: { ...record.registry, registry: { ...record.registry.registry, editionId: 'mock-2', scopeKey } } }
}

/** The app's own query client (a profile stays fresh in it for a minute), retries off so a failed read settles at once. */
function appQueryClient(): QueryClient {
  const queryClient = createQueryClient()
  queryClient.setDefaultOptions({ queries: { ...queryClient.getDefaultOptions().queries, retry: false } })
  return queryClient
}

/** The API's refusal of a read whose registry scope or access could not be held (`SERVICE_UNAVAILABLE` at `company`). */
const refusedByRegistry = (message: string) => new GraphQLRequestError('refused', { graphQLErrors: [{ message, extensions: { code: 'SERVICE_UNAVAILABLE' } }] })

const NO_COMPANY_PROFILE = 'Profilul de companie nu este disponibil pentru acest furnizor.'

/** The page has pinned its registry scope: its own capabilities read (keyed by the page's mount) landed and the pin took it. */
async function pinned() {
  await vi.waitFor(() => expect(client.getQueryCache().find({ queryKey: ['company-registry'], exact: false })?.state.status).toBe('success'))
  await act(async () => {})
}

async function moveRegistry(next: CompanyRegistryCapabilities) {
  registry.capabilities = next
  await act(async () => {
    await client.invalidateQueries({ queryKey: ['company-registry'] })
  })
}

const FIRM_SENTENCE = 'Societate cu răspundere limitată din Otopeni, Ilfov.'
const headLine = () => screen.getByRole('heading', { level: 1 }).nextElementSibling?.textContent ?? ''

/** The search a navigation wrote, from the updater the page passed. */
function lastSearch(previous: Record<string, unknown> = {}): Record<string, unknown> {
  const call = navigate.mock.calls[navigate.mock.calls.length - 1]?.[0] as { readonly search: (previous: Record<string, unknown>) => Record<string, unknown> }
  return call.search(previous)
}

describe('ProcurementSupplierPage', () => {
  beforeEach(() => {
    navigate.mockReset()
    registry.capabilities = MOCK_REGISTRY_CAPABILITIES
    registry.company.mockReset()
    registry.company.mockReturnValue(new Promise(() => undefined))
  })

  it('server-renders the firm in the company profile’s words, its year and its clients', () => {
    const html = renderToStaticMarkup(page())
    expect(html).toContain('Costalex Construct SRL')
    // The registry's facts as the edition records them — legal form and place — and no year: the date ONRC
    // recorded is no founding date, so the sentence goes straight on to the year's sales.
    expect(html).toContain(`${FIRM_SENTENCE} În 2025 a vândut direct`)
    expect(html).not.toMatch(/înregistrată în|înființat|de \d+ ani/u)
    expect(html).toContain('În 2025 a vândut direct de 4,8 mil. lei, fără TVA, la 5 instituții și a câștigat 1 contract.')
    expect(html).toContain('În procedura insolvenței.')
    expect(html).toContain('Orasul Otopeni')
    // The relationship from the institution's side.
    expect(html).toContain('cel mai mare furnizor direct al ei: 29% din achizițiile ei')
    expect(html).toContain('href="/companies/9813902"')
    expect(html).toContain('Datele SEAP merg până în iunie 2026.')
  })

  it('numbers the bands in the owner’s order, the firm last, and adds partners only for a firm that has them', async () => {
    // A browser render: the firm's band comes with its registry facts, once the page has pinned its scope.
    const { unmount } = render(page())
    await pinned()
    const bands = () => within(screen.getByRole('navigation', { name: 'Secțiunile paginii' })).getAllByRole('link').map((link) => link.getAttribute('href'))
    expect(bands()).toEqual(['#clienti', '#ce', '#unde', '#cum', '#cele-mai-mari', '#firma'])
    unmount()
    render(page({}, { choice: 2025, profile: supplierProfile({ contracts: consortiumContracts() }) }))
    await pinned()
    expect(bands()).toEqual(['#clienti', '#ce', '#unde', '#cum', '#cu-cine', '#cele-mai-mari', '#firma'])
    expect(document.getElementById('cu-cine')?.textContent).toContain('Cel mai des, cu Dexamart: 6 contracte.')
  })

  it('makes a year from the chart the page’s, the year in progress included, and writes it out', () => {
    render(page({}, { choice: 2025, profile: supplierProfile({ partYear: 2026, directYears: [...supplierProfile().directYears, { year: 2026, value: 1_000_000, count: 3 }] }) }))
    fireEvent.click(screen.getByRole('button', { name: /^2019:/ }))
    expect(lastSearch()).toEqual({ year: 2019 })
    // The last twelve months are the default now: a complete year picked is written too.
    fireEvent.click(screen.getByRole('button', { name: /^2025:/ }))
    expect(lastSearch({ year: 2019 })).toEqual({ year: 2025 })
    fireEvent.click(screen.getByRole('button', { name: /^2026:/ }))
    expect(lastSearch()).toEqual({ year: 2026 })
  })

  it('lists the last twelve months first in the head’s list, then the years; a year with no sale says so', async () => {
    render(page())
    const select = screen.getByRole('combobox', { name: 'Perioada' })
    fireEvent.keyDown(select, { key: 'ArrowDown' })
    const options = await screen.findAllByRole('option')
    expect(options.map((option) => option.textContent?.slice(0, 4))).toEqual(['Ulti', '2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019'])
    expect(options[1]).toHaveTextContent('în curs')
    expect(options[2]).toHaveTextContent(/mil\. lei · 1 contract/)
    expect(options[4]).toHaveTextContent('fără vânzări')
    fireEvent.click(options[1]!)
    expect(lastSearch()).toEqual({ year: 2026 })
  })

  it('shows the last twelve months in their own words, and counts past a hundred institutions as a floor', () => {
    const profile = supplierProfile({ period: recentPeriod('2026-05'), direct: { count: 1_496, valued: 1_496, value: 55_700_000, clients: 100, clientsAtLeast: true } })
    render(page({}, { choice: 'recent', profile, direct: supplierDirect() }))
    expect(screen.getByRole('combobox', { name: 'Perioada' })).toHaveTextContent('Ultimele 12 luni')
    expect(screen.getByRole('heading', { level: 1 }).nextElementSibling?.textContent).toMatch(/În ultimele 12 luni \(iunie 2025 – mai 2026\) a vândut direct de 55,7\smil\.\slei, fără TVA, la peste 100 de instituții/)
    // A floor is no figure.
    expect(screen.queryByText('Instituții cliente')).toBeNull()
    // A client opens on the same period: the last twelve months, its default.
    const client = within(document.getElementById('clienti')!).getAllByRole('link')[0]!
    expect(JSON.parse(client.getAttribute('data-search') ?? '{}')).toEqual({})
  })

  it('writes a band’s choice to the URL, and leaves its default out', () => {
    render(page())
    fireEvent.click(within(document.getElementById('ce')!).getByRole('radio', { name: 'Contracte' }))
    expect(lastSearch()).toEqual({ ce: 'contracte' })
  })

  it('ignores a choice the year cannot show: a firm with only direct purchases that year has no contracts to pick', () => {
    const direct = supplierProfile({ contracts: { ...supplierProfile().contracts, count: 0, clients: null, buyers: null }, awards: { count: 0, valued: 0, value: null } })
    render(page({ ce: 'contracte' }, { choice: 2025, profile: direct, direct: supplierDirect() }))
    const band = document.getElementById('ce')!
    expect(within(band).queryByRole('radio')).toBeNull()
    expect(band.textContent).toContain('Drumuri')
  })

  it('says how recent the year in progress is, and compares it with nothing', () => {
    const html = renderToStaticMarkup(page({ year: 2026 }, { choice: 2026, profile: supplierProfile({ period: yearPeriod(2026, '2026-05'), directPrev: null }) }))
    expect(html).toContain('Date actualizate până la 31 mai 2026')
    expect(html).not.toContain('față de')
    // A client's page opens on the same year.
    expect(html).toContain('data-search="{&quot;year&quot;:2026}"')
  })

  it('says a year with no sale, and names a supplier with no company profile by its records, saying only that none is available', () => {
    const none = { count: 0, valued: 0, value: null, clients: 0, clientsAtLeast: false }
    const empty = renderToStaticMarkup(page({}, { choice: 2025, profile: supplierProfile({ direct: none, contracts: { ...supplierProfile().contracts, count: 0 } }) }))
    expect(empty).toContain('Nicio vânzare către stat în 2025')
    const unprofiled = renderToStaticMarkup(page({}, { choice: 2024, profile: supplierProfile({ cui: '103029862', period: yearPeriod(2024), registry: null, name: 'Hydrostroy AD', contracts: consortiumContracts() }) }, '103029862'))
    expect(unprofiled).toContain('Hydrostroy AD')
    expect(unprofiled).toContain(NO_COMPANY_PROFILE)
    expect(unprofiled).not.toMatch(/nu are fișă în registrul comerțului|firmă străină/u)
    expect(unprofiled).not.toContain('href="/companies/103029862"')
    // A registry that could not be read says nothing of the firm, not even that no profile is available.
    render(page({}, { choice: 2025, profile: supplierProfile({ registry: null, registryFailed: true, partial: true }) }))
    expect(screen.getByRole('heading', { level: 1 }).nextElementSibling?.textContent).toMatch(/^În 2025 a vândut direct/)
    expect(screen.queryByText(new RegExp(NO_COMPANY_PROFILE, 'u'))).toBeNull()
    expect(screen.getByRole('link', { name: 'Profilul firmei' }).getAttribute('href')).toBe('/companies/9813902')
  })

  it('says of a domestic public NGO with no company profile only that none is available — no register absence, no nationality', async () => {
    // Synthetic: a public NGO of the platform (CUI 9900007, the companies reader's own NGO test key) selling to the
    // state. The companies API answers `company: null` for it: it is no public company of the directory, whatever
    // the trade register holds — so the null proves neither absence from the register nor a foreign firm.
    const ngo = supplierProfile({ cui: '9900007', name: 'Asociația Exemplu pentru Comunitate', registry: null, registryFailed: false })
    render(page({}, { choice: 2025, profile: ngo, direct: supplierDirect() }, '9900007'))
    await pinned()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Asociația Exemplu pentru Comunitate')
    expect(headLine()).toMatch(/^Profilul de companie nu este disponibil pentru acest furnizor\. În 2025 a vândut direct/u)
    expect(document.body.textContent).not.toMatch(/nu are fișă în registrul comerțului|firmă străină|străin/u)
    // Its sales to the state and the ways into them stand; there is no company page to open.
    expect(screen.getByText('Vânzări directe, 2025')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Toate achizițiile directe/u }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: /Toate contractele/u }).length).toBeGreaterThan(0)
    expect(screen.queryByRole('link', { name: 'Profilul firmei' })).toBeNull()
  })
})

/**
 * The firm's registry facts under the page's pinned ONRC scope: shown while
 * the record is the pinned scope's; hidden — the head silent, not even saying
 * that no company profile is available — before the page's own registry read answers (only the server's document
 * keeps them while it hydrates), when the registry moves, refuses the firm or
 * cannot be read; back only when the reader asks. SEAP's figures stand
 * throughout: they are not the registry's.
 */
describe('ProcurementSupplierPage — the firm’s registry facts under the pinned scope', () => {
  const MOVED = 'mock:onrc:published:mock-2:2:2'

  beforeEach(() => {
    navigate.mockReset()
    registry.capabilities = MOCK_REGISTRY_CAPABILITIES
    registry.company.mockReset()
    registry.company.mockReturnValue(new Promise(() => undefined))
  })

  /** Rendered, pinned to the supplier read's own scope, its firm's facts shown. */
  async function pinnedPage() {
    render(page())
    await pinned()
    expect(headLine()).toContain(FIRM_SENTENCE)
  }

  it('keeps showing a record of the pinned scope, and asks the registry for nothing more', async () => {
    render(page())
    await pinned()
    expect(headLine()).toMatch(/^Societate cu răspundere limitată din Otopeni, Ilfov\. În 2025 a vândut direct/u)
    expect(screen.getByText('Insolvență')).toBeInTheDocument()
    expect(screen.queryByTestId('company-registry-moved')).toBeNull()
    // The read's own record is current: the company page's read is never asked for.
    expect(registry.company).not.toHaveBeenCalled()
  })

  it('hides the firm’s facts when the registry moves, keeps SEAP’s, and shows the new record only when asked', async () => {
    await pinnedPage()
    await moveRegistry(movedCapabilities(MOVED))
    expect(await screen.findByTestId('company-registry-moved')).toBeInTheDocument()
    // Nothing of the registry: no sentence, no status, not even that no company profile is available.
    expect(headLine()).toMatch(/^În 2025 a vândut direct/u)
    expect(screen.queryByText('Insolvență')).toBeNull()
    expect(screen.queryByText(new RegExp(NO_COMPANY_PROFILE, 'u'))).toBeNull()
    // SEAP's own figures stand.
    expect(screen.getByText('Vânzări directe, 2025')).toBeInTheDocument()
    expect(registry.company).not.toHaveBeenCalled()

    registry.company.mockResolvedValue(companyUnder(MOVED))
    fireEvent.click(screen.getByRole('button', { name: 'Arată datele actuale' }))
    await vi.waitFor(() => expect(headLine()).toContain(FIRM_SENTENCE))
    expect(registry.company).toHaveBeenCalledWith('9813902')
    expect(screen.queryByTestId('company-registry-moved')).toBeNull()
  })

  it('says nothing of a firm the moved registry no longer holds, not even that it has no company profile', async () => {
    await pinnedPage()
    await moveRegistry(movedCapabilities(MOVED))
    registry.company.mockResolvedValue(null)
    fireEvent.click(await screen.findByRole('button', { name: 'Arată datele actuale' }))
    await vi.waitFor(() => expect(registry.company).toHaveBeenCalled())
    await vi.waitFor(() => expect(headLine()).toMatch(/^În 2025 a vândut direct/u))
    expect(screen.queryByText(new RegExp(NO_COMPANY_PROFILE, 'u'))).toBeNull()
    expect(screen.queryByText('Insolvență')).toBeNull()
    // The way to the company page stays: it says what the registry holds now.
    expect(screen.getByRole('link', { name: 'Profilul firmei' }).getAttribute('href')).toBe('/companies/9813902')
  })

  it('says a registry that cannot be read now, and keeps the firm’s facts hidden', async () => {
    await pinnedPage()
    await moveRegistry(movedCapabilities(MOVED))
    registry.company.mockRejectedValue(new Error('registry read failed'))
    fireEvent.click(await screen.findByRole('button', { name: 'Arată datele actuale' }))
    expect(await screen.findByTestId('supplier-registry-unavailable')).toBeInTheDocument()
    expect(headLine()).toMatch(/^În 2025 a vândut direct/u)
  })

  it('hides the firm’s facts on an access withdrawal and does not bring them back by itself', async () => {
    await pinnedPage()
    await moveRegistry(movedCapabilities('mock:onrc:withdrawn:-:3:3', 'withdrawn'))
    expect(await screen.findByTestId('company-registry-moved')).toBeInTheDocument()
    expect(headLine()).not.toContain(FIRM_SENTENCE)
    // The registry recovers: still under the old pin, nothing switches until the reader asks.
    registry.company.mockResolvedValue(companyUnder(MOVED))
    await moveRegistry(movedCapabilities(MOVED))
    expect(screen.getByTestId('company-registry-moved')).toBeInTheDocument()
    expect(headLine()).not.toContain(FIRM_SENTENCE)
    expect(registry.company).not.toHaveBeenCalled()
  })

  it('shows none of them on a client-side visit until the page’s own registry read answers (C20-R2)', async () => {
    // A browser render: the supplier read (here the loader's, as a cached one would be) carries the firm's record.
    let answer: (capabilities: CompanyRegistryCapabilities) => void = () => undefined
    registry.capabilities = new Promise((resolve) => {
      answer = resolve
    })
    render(page())
    expect(headLine()).toMatch(/^În 2025 a vândut direct/u)
    expect(screen.queryByText('Insolvență')).toBeNull()
    expect(screen.queryByText(new RegExp(NO_COMPANY_PROFILE, 'u'))).toBeNull()
    // SEAP's own figures do not wait for the registry.
    expect(screen.getByText('Vânzări directe, 2025')).toBeInTheDocument()

    await act(async () => answer(MOCK_REGISTRY_CAPABILITIES))
    await vi.waitFor(() => expect(headLine()).toContain(FIRM_SENTENCE))
  })

  it('keeps them hidden when that registry read fails, and says the registry cannot be read now (C20-R2)', async () => {
    let fail: (error: Error) => void = () => undefined
    registry.capabilities = new Promise((_resolve, reject) => {
      fail = reject
    })
    render(page())
    await act(async () => fail(new Error('registry read failed')))
    expect(await screen.findByTestId('supplier-registry-unavailable')).toBeInTheDocument()
    expect(headLine()).toMatch(/^În 2025 a vândut direct/u)
    expect(screen.queryByText('Insolvență')).toBeNull()
    expect(screen.getByText('Vânzări directe, 2025')).toBeInTheDocument()
  })

  it('hydrates the server’s document as rendered, keeps its firm while the first read is pending, and drops it if that read fails', async () => {
    let fail: (error: Error) => void = () => undefined
    registry.capabilities = new Promise((_resolve, reject) => {
      fail = reject
    })
    const html = renderToString(page())
    expect(html).toContain(FIRM_SENTENCE)
    const container = document.createElement('div')
    container.innerHTML = html
    document.body.appendChild(container)
    const recoverable: unknown[] = []
    let root: Root | undefined
    await act(async () => {
      root = hydrateRoot(container, page(), { onRecoverableError: (error) => recoverable.push(error) })
    })
    expect(recoverable).toEqual([])
    expect(container.textContent).toContain(FIRM_SENTENCE)

    await act(async () => fail(new Error('registry read failed')))
    await vi.waitFor(() => expect(container.querySelector('[data-testid="supplier-registry-unavailable"]')).not.toBeNull())
    expect(container.textContent).not.toContain(FIRM_SENTENCE)
    expect(container.textContent).toContain('Vânzări directe, 2025')
    act(() => root?.unmount())
    container.remove()
  })

  it('takes the firm’s facts from the company page’s read when the supplier read carried another scope', async () => {
    // The page first pins the current registry; the supplier read was answered under an older one.
    registry.capabilities = movedCapabilities(MOVED)
    registry.company.mockResolvedValue(companyUnder(MOVED))
    render(page())
    await vi.waitFor(() => expect(registry.company).toHaveBeenCalledWith('9813902'))
    await vi.waitFor(() => expect(headLine()).toContain(FIRM_SENTENCE))
    expect(screen.queryByTestId('company-registry-moved')).toBeNull()
  })
})

/**
 * The company page's read, once its answer is on screen, then failed (F22-R1):
 * the supplier read carries S0, the page pinned S1, the company page's read
 * answered S1 — and a later read of it fails. TanStack keeps the S1 answer in
 * the cache; none of it is shown. A refusal by the registry re-reads the
 * registry — once — and the record once it answers; an ordinary failure says
 * the registry cannot be read; a later success brings the facts back; and a
 * successful answer whose ONRC envelope is unavailable is an answer, not a
 * failure. SEAP's figures stand throughout. Through the app's own query client.
 */
describe('ProcurementSupplierPage — the company page’s read failing after its answer was shown (F22-R1)', () => {
  const S1 = 'mock:onrc:published:mock-2:2:2'
  const COMPANY = '9813902'
  const registryReads = () => vi.mocked(fetchCompanyRegistry).mock.calls.length

  beforeEach(() => {
    navigate.mockReset()
    vi.mocked(fetchCompanyRegistry).mockClear()
    registry.capabilities = movedCapabilities(S1)
    registry.company.mockReset()
    registry.company.mockResolvedValue(companyUnder(S1, 'COSTALEX RENOVARE SRL'))
  })

  /** The firm's facts as the company page's S1 answer gives them: its own name, sentence and status. */
  async function shownFromCompanyRead() {
    render(page({}, INITIAL, COMPANY, appQueryClient()))
    await vi.waitFor(() => expect(headLine()).toContain(FIRM_SENTENCE))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Costalex Renovare SRL')
    expect(screen.getByText('Insolvență')).toBeInTheDocument()
  }

  async function readCompanyAgain() {
    await act(async () => {
      await client.refetchQueries({ queryKey: ['private-company', COMPANY], exact: true })
    })
  }

  function noCompanyFacts() {
    expect(screen.queryByText(/Costalex Renovare/u)).toBeNull()
    expect(document.body.textContent).not.toContain(FIRM_SENTENCE)
    expect(screen.queryByText('Insolvență')).toBeNull()
    expect(screen.queryByText(new RegExp(NO_COMPANY_PROFILE, 'u'))).toBeNull()
    // SEAP's own figures and ways in stand.
    expect(screen.getByText('Vânzări directe, 2025')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Toate achizițiile directe/u }).length).toBeGreaterThan(0)
  }

  it('hides the shown answer when the registry refuses a later read, while the registry is re-read and after that fails', async () => {
    await shownFromCompanyRead()
    const before = registryReads()
    let failRegistry: (error: Error) => void = () => undefined
    registry.capabilities = new Promise((_resolve, reject) => {
      failRegistry = reject
    })
    registry.company.mockRejectedValue(refusedByRegistry('company registry scope changed during the request; retry'))
    await readCompanyAgain()

    // The refusal re-reads the registry; meanwhile nothing of the earlier answer is on screen.
    await vi.waitFor(() => expect(registryReads()).toBe(before + 1))
    noCompanyFacts()

    await act(async () => failRegistry(new Error('registry read failed')))
    expect(await screen.findByTestId('supplier-registry-unavailable')).toBeInTheDocument()
    noCompanyFacts()
  })

  it('reads the record again once the registry confirms its scope, and stays a state — not a loop — if refused again', async () => {
    await shownFromCompanyRead()
    const before = registryReads()
    const companyReads = registry.company.mock.calls.length
    // Refused once, then answered under the same S1; the registry confirms S1.
    registry.company.mockRejectedValueOnce(refusedByRegistry('company registry scope changed during the request; retry'))
    await readCompanyAgain()
    // The refusal re-reads the registry, which confirms S1; the record is then read once more and shown again.
    await vi.waitFor(() => expect(registryReads()).toBe(before + 1))
    await vi.waitFor(() => expect(registry.company.mock.calls.length).toBe(companyReads + 2))
    await vi.waitFor(() => expect(headLine()).toContain(FIRM_SENTENCE))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Costalex Renovare SRL')

    // Refused again under the scope just confirmed: said as a state; the registry is not re-read again.
    registry.company.mockRejectedValue(refusedByRegistry('company registry scope changed during the request; retry'))
    await readCompanyAgain()
    expect(await screen.findByTestId('supplier-registry-unavailable')).toBeInTheDocument()
    noCompanyFacts()
    await act(async () => {})
    expect(registryReads()).toBe(before + 1)
    expect(registry.company.mock.calls.length).toBe(companyReads + 3)
  })

  it('hides it on an ordinary failure without re-reading the registry, and shows the record again once a read succeeds', async () => {
    await shownFromCompanyRead()
    const before = registryReads()
    registry.company.mockRejectedValue(new Error('network down'))
    await readCompanyAgain()
    expect(await screen.findByTestId('supplier-registry-unavailable')).toBeInTheDocument()
    noCompanyFacts()
    expect(registryReads()).toBe(before)

    registry.company.mockResolvedValue(companyUnder(S1, 'COSTALEX RENOVARE SRL'))
    await readCompanyAgain()
    await vi.waitFor(() => expect(headLine()).toContain(FIRM_SENTENCE))
    expect(screen.queryByTestId('supplier-registry-unavailable')).toBeNull()
  })

  it('hides a retained null the same way: a failed read is not the answer that there is no company profile', async () => {
    registry.company.mockResolvedValue(null)
    render(page({}, INITIAL, COMPANY, appQueryClient()))
    // A null is shown silently, like a record being checked: wait for the answer itself and for the registry reads
    // to settle, so the next read is a refetch of an answered query, not a read merged into the first one.
    await vi.waitFor(() => expect(client.getQueryState(['private-company', COMPANY])?.status).toBe('success'))
    await vi.waitFor(() => expect(client.isFetching({ queryKey: ['company-registry'] })).toBe(0))
    await act(async () => {})
    expect(headLine()).toMatch(/^În 2025 a vândut direct/u)
    registry.company.mockRejectedValue(new Error('network down'))
    await readCompanyAgain()
    expect(await screen.findByTestId('supplier-registry-unavailable')).toBeInTheDocument()
    expect(screen.queryByText(new RegExp(NO_COMPANY_PROFILE, 'u'))).toBeNull()
    expect(screen.getByText('Vânzări directe, 2025')).toBeInTheDocument()
  })

  it('shows a successful answer whose ONRC envelope is unavailable as the record it is, and hides it once a read fails', async () => {
    // The registry cannot answer now; the company page's read still answers, under that same scope, with its own name.
    const unavailable = { ...MOCK_REGISTRY_ENVELOPE, state: 'unavailable' as const, editionId: null, scopeKey: 'mock:onrc:unavailable:-:4:4' }
    registry.capabilities = { ...MOCK_REGISTRY_CAPABILITIES, registry: unavailable }
    const record = companyUnder(S1, 'COSTALEX RENOVARE SRL')
    registry.company.mockResolvedValue({ ...record, legalForm: null, registrationDate: null, status: null, geography: null, codInmatriculare: null, registry: registryStateEvidence(unavailable, 'unavailable') })
    render(page({}, INITIAL, COMPANY, appQueryClient()))
    await vi.waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Costalex Renovare SRL'))
    expect(screen.queryByTestId('supplier-registry-unavailable')).toBeNull()
    expect(screen.getByText('Vânzări directe, 2025')).toBeInTheDocument()

    registry.company.mockRejectedValue(new Error('network down'))
    await readCompanyAgain()
    expect(await screen.findByTestId('supplier-registry-unavailable')).toBeInTheDocument()
    expect(screen.queryByText(/Costalex Renovare/u)).toBeNull()
  })
})
