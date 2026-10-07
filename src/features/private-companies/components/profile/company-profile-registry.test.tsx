import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestQueryClient } from '@/test/test-utils'
import type { PrivateCompanyProfile } from '@/schemas/private-company'
import type { CompanyRegistryCapabilities } from '@/schemas/private-company-registry'
import { companyProfile, financialYear } from '../../lib/company-profile.fixture'
import { MOCK_REGISTRY_CAPABILITIES, MOCK_REGISTRY_ENVELOPE, mockRegistryEvidence, registryStateEvidence } from '../../mocks/fixtures/registry'
import { CompanyProfilePage } from './company-profile-page'

/**
 * The profile under the ONRC registry contract: it is shown only under the
 * scope the page pinned; a move during a dependent read hides it until the
 * reader asks; a conflict is listed, never resolved; a CUI outside the
 * edition is outside the edition, not unregistered, its financial and fiscal
 * content still served; the first edition has nothing to compare with; the
 * recorded date is ONRC's civil date, never a founding date; the source line
 * names the edition and a mock as a mock.
 */

const registry = vi.hoisted(() => ({
  next: null as unknown,
  diff: vi.fn(),
}))

vi.mock('../../api/company-registry-api', () => ({
  fetchCompanyRegistry: vi.fn(async () => registry.next),
  fetchCompanyRegistrationDiff: (...args: unknown[]) => registry.diff(...args),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: { readonly children: ReactNode; readonly to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
}))

vi.mock('@/features/procurement/hooks/use-procurement-data', () => ({
  useProcurementSupplierSlice: () => ({ data: undefined, isError: false, isPending: false, refetch: vi.fn() }),
}))

vi.mock('../../hooks/use-company-litigation-shown', () => ({ useCompanyLitigationShown: () => null }))

vi.mock('@/lib/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/utils')>()),
  getUserLocale: () => 'ro',
}))

const FIRST_EDITION = { fromEditionId: null, toEditionId: 'mock-1', fromCaptureDate: null, toCaptureDate: null, status: 'not_comparable', reason: 'first_edition', changes: [] }

function page(profile: PrivateCompanyProfile) {
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      <CompanyProfilePage profile={profile} cui={profile.cui ?? ''} search={{}} />
    </QueryClientProvider>
  )
}

const otherScope = (scopeKey: string): CompanyRegistryCapabilities => ({ ...MOCK_REGISTRY_CAPABILITIES, registry: { ...MOCK_REGISTRY_ENVELOPE, editionId: 'mock-2', scopeKey } })

const registryFact = (term: string) => screen.getByText(term, { selector: 'dt' }).nextElementSibling?.textContent

describe('CompanyProfilePage under the ONRC registry contract', () => {
  beforeEach(() => {
    registry.next = MOCK_REGISTRY_CAPABILITIES
    registry.diff.mockReset()
    registry.diff.mockResolvedValue(FIRST_EDITION)
  })

  it('shows nothing of an answer read under another scope than the one the page pinned', async () => {
    registry.next = otherScope('mock:onrc:published:mock-2:2:2')
    render(page(companyProfile()))
    expect(await screen.findByRole('status', { name: 'Se încarcă profilul firmei' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1, name: '66 Jack SRL' })).toBeNull()
    expect(registry.diff).not.toHaveBeenCalled()
  })

  it('hides the profile when the registry moves during a dependent read, until the reader asks', async () => {
    const { CompanyRegistryScopeMovedError } = await import('../../api/company-registry-errors')
    registry.diff.mockImplementation(async () => {
      registry.next = otherScope('mock:onrc:published:mock-2:2:2')
      throw new CompanyRegistryScopeMovedError('mock:onrc:published:mock-2:2:2')
    })
    render(page(companyProfile()))
    expect(await screen.findByTestId('company-profile-registry-moved')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1, name: '66 Jack SRL' })).toBeNull()
    // Asking for the current record never shows the old answer under the new scope.
    fireEvent.click(screen.getByRole('button', { name: 'Arată datele actuale' }))
    expect(screen.queryByRole('heading', { level: 1, name: '66 Jack SRL' })).toBeNull()
  })

  it('lists an „în funcțiune" observation beside a conflicting one, choosing neither', async () => {
    const conflict = mockRegistryEvidence({
      identifier: 'J16/44/1996',
      name: '66 JACK SRL',
      legalForm: 'SRL',
      recordedDate: '1996-02-28',
      countyCode: 'CJ',
      countyName: 'Cluj',
      statusCodes: ['1048', '1070'],
      caen: [],
    })
    render(page(companyProfile({ status: null, registry: conflict })))
    // The head's chip and the registry facts both say it; neither names a status.
    expect(await screen.findAllByText('Stări diferite în registru')).toHaveLength(2)
    expect(screen.getByText(/între care una „în funcțiune”; toate sunt listate/u)).toBeInTheDocument()
    const evidence = within(screen.getByTestId('company-registry-evidence'))
    expect(evidence.getByText(/^1048 · funcțiune; 1070 · faliment · Cluj$/u)).toBeInTheDocument()
    expect(evidence.getByText('(are o înscriere „în funcțiune” alături de alte stări)')).toBeInTheDocument()
    expect(evidence.getByText('Denumirile stărilor sunt din nomenclatorul aplicației, nu etichete publicate de ONRC.')).toBeInTheDocument()
  })

  it('says a CUI outside the edition is not an unregistered company, and keeps its financial content', async () => {
    const outside = companyProfile({
      nameSource: 'core_organization',
      legalForm: null,
      registrationDate: null,
      status: null,
      geography: null,
      codInmatriculare: null,
      registry: registryStateEvidence(MOCK_REGISTRY_ENVELOPE, 'not_in_edition'),
      financials: [financialYear(2024, { turnover: 1_000_000, employees: 4 })],
    })
    render(page(outside))
    expect(await screen.findByText('Fără profil în ediția ONRC')).toBeInTheDocument()
    expect(screen.getAllByText(/Asta nu înseamnă că firma nu este înregistrată\./u).length).toBeGreaterThan(0)
    expect(screen.getByText(/numele din directorul platformei, nu din ediția ONRC/u)).toBeInTheDocument()
    expect(screen.getByText('Cifra de afaceri, 2024')).toBeInTheDocument()
    // Nothing to compare: the edition holds no profile, so no comparison is asked.
    expect(registry.diff).not.toHaveBeenCalled()
  })

  it('says the first edition has nothing to compare with — never a disappearance', async () => {
    render(page(companyProfile()))
    expect(await screen.findByTestId('company-registry-diff')).toHaveTextContent('Nu există o ediție anterioară publicată cu care să se compare.')
    expect(document.body.textContent).not.toMatch(/dispăr|radiere/u)
  })

  it('gives the date ONRC recorded, at day precision — never a founding year or an age', async () => {
    render(page(companyProfile()))
    await screen.findByRole('heading', { level: 1, name: '66 Jack SRL' })
    expect(registryFact('Data înregistrată de ONRC')).toMatch(/^26 nov\.? 2007$/u)
    expect(document.body.textContent).not.toMatch(/înființat|înregistrată în 2007|de \d+ ani/u)
  })

  it('names the edition behind the registry facts, and says a mock is a mock', async () => {
    render(page(companyProfile()))
    expect(await screen.findByTestId('company-sources-line')).toHaveTextContent(/ediția mock-1 publicată pe .*date de test, nu din registru/u)
  })

  it('says an unpublished registry as a state, asks no comparison, and keeps fiscal and financial content', async () => {
    const unpublished = { ...MOCK_REGISTRY_ENVELOPE, state: 'unpublished' as const, editionId: null, scopeKey: 'mock:onrc:unpublished' }
    registry.next = { ...MOCK_REGISTRY_CAPABILITIES, registry: unpublished }
    render(
      page(
        companyProfile({
          status: null,
          legalForm: null,
          registrationDate: null,
          registry: registryStateEvidence(unpublished, 'unpublished'),
          financials: [financialYear(2024, { turnover: 1_000_000 })],
        }),
      ),
    )
    expect(await screen.findByText('Registru indisponibil')).toBeInTheDocument()
    expect(screen.getAllByText(/nu are încă o ediție publicată/u).length).toBeGreaterThan(0)
    expect(screen.getByText('Cifra de afaceri, 2024')).toBeInTheDocument()
    expect(registry.diff).not.toHaveBeenCalled()
  })
})
