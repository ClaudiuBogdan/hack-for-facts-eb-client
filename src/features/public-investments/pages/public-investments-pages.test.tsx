import { fireEvent, render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnchorHTMLAttributes, ReactNode } from 'react'
import {
  PublicInvestmentsEvidenceProvider,
} from '../components/PublicInvestmentsEvidenceContext'
import { PublicInvestmentsLandingPage } from './PublicInvestmentsLandingPage'
import { PublicInvestmentsObjectivePage } from './PublicInvestmentsObjectivePage'
import { PublicInvestmentsSearchPage } from './PublicInvestmentsSearchPage'
import {
  MOCK_LANDING_DATA,
  MOCK_OBJECTIVE_DETAIL_BUNDLES,
  PUBLIC_INVESTMENTS_MOCK_STATUS,
} from '../mocks/public-investments-mock-data'
import type {
  ObjectiveDetailBundle,
  ObjectiveSearchResult,
} from '../lib/types'
import type { PublicInvestmentsQueryResult } from '../hooks/use-public-investments-data'
import type { PublicInvestmentsSearchState } from '@/schemas/public-investments'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  useLandingData: vi.fn(),
  useObjectiveSearch: vi.fn(),
  useObjectiveBundle: vi.fn(),
  usePaymentsLedgerData: vi.fn(),
}))

type RouterLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  readonly children?: ReactNode
  readonly to?: string
  readonly params?: Readonly<Record<string, string>>
  readonly search?: unknown
}

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to = '#', params, search: _search, ...props }: RouterLinkProps) => {
    const href = Object.entries(params ?? {}).reduce(
      (current, [key, value]) => current.replace(`$${key}`, value),
      to,
    )
    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  },
  useNavigate: () => mocks.navigate,
}))

vi.mock('../hooks/use-public-investments-data', () => ({
  useLandingData: () => mocks.useLandingData(),
  useObjectiveSearch: (search: Partial<PublicInvestmentsSearchState>) =>
    mocks.useObjectiveSearch(search),
  useObjectiveBundle: (objectiveId: string) => mocks.useObjectiveBundle(objectiveId),
  usePaymentsLedgerData: (objectiveId: string, paySort: string, payOrder: string) =>
    mocks.usePaymentsLedgerData(objectiveId, paySort, payOrder),
}))

function queryResult<TData>(
  data: TData | undefined,
  overrides: Partial<PublicInvestmentsQueryResult<TData>> = {},
): PublicInvestmentsQueryResult<TData> {
  return {
    data,
    isBlocked: false,
    blockedReason: undefined,
    blockedMessageKey: undefined,
    blockedMessageParams: undefined,
    isLoading: false,
    isFetching: false,
    isPlaceholderData: false,
    isStale: false,
    isEmpty: false,
    isError: false,
    error: null,
    ...overrides,
  }
}

const emptySearchResult: ObjectiveSearchResult = {
  rows: [],
  total: 0,
  excludedSuspectCount: 0,
  facets: {
    programs: {
      ANGHEL_SALIGNY: 0,
      PNDL: 0,
      PNCCRS: 0,
      PNMC: 0,
    },
    domains: [],
    counties: [],
    stages: {
      contractat: 0,
      in_executie: 0,
      finalizat: 0,
      receptionat: 0,
      necunoscut: 0,
    },
    dataQuality: {
      precision_warning: 0,
      suspect_x1000: 0,
    },
  },
  mapPoints: [],
  status: PUBLIC_INVESTMENTS_MOCK_STATUS,
}

function sanitizedGatedBundle(): ObjectiveDetailBundle {
  const bundle = MOCK_OBJECTIVE_DETAIL_BUNDLES['pi-anghel-cl-napoca-gated']

  return {
    ...bundle,
    objective: {
      ...bundle.objective,
      searchTokens: [],
    },
    contracts: bundle.contracts.map((contract) => ({
      ...contract,
      contractor: contract.contractor
        ? { ...contract.contractor, displayName: null, cui: null, served: false }
        : null,
      designer: contract.designer
        ? { ...contract.designer, displayName: null, cui: null, served: false }
        : null,
    })),
    parties: bundle.parties.map((party) =>
      party.partyId === 'party-contractor-napoca-pfa'
        ? { ...party, displayName: null, cui: null, served: false }
        : party,
    ),
  }
}

function renderWithEvidence(children: ReactNode, openEvidence = vi.fn()) {
  return render(
    <PublicInvestmentsEvidenceProvider value={{ openEvidence }}>
      {children}
    </PublicInvestmentsEvidenceProvider>,
  )
}

describe('PublicInvestmentsLandingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the landing route data, trust rules, coverage, and evidence actions', async () => {
    const openEvidence = vi.fn()
    mocks.useLandingData.mockReturnValue(queryResult(MOCK_LANDING_DATA))

    renderWithEvidence(<PublicInvestmentsLandingPage />, openEvidence)

    expect(screen.getByRole('heading', { name: 'Investiții publice locale' })).toBeInTheDocument()
    expect(screen.getByText('Reguli de încredere')).toBeInTheDocument()
    expect(screen.getByText('Valorile suspecte ×1000 nu intră în totaluri.')).toBeInTheDocument()
    expect(screen.getAllByText('Anghel Saligny').length).toBeGreaterThan(0)
    expect(screen.getByText(/Obiective cu absorbție redusă/)).toBeInTheDocument()

    await userEvent.click(screen.getAllByRole('button', { name: 'Deschide dovada sursei' })[0])

    expect(openEvidence).toHaveBeenCalledWith(MOCK_LANDING_DATA.kpis.evidenceRef)
  })

  it('renders the mock-disabled blocked state instead of fixture data', () => {
    mocks.useLandingData.mockReturnValue(
      queryResult(undefined, {
        isBlocked: true,
        blockedReason: 'live-not-connected',
      }),
    )

    renderWithEvidence(<PublicInvestmentsLandingPage />)

    expect(screen.getByText('API live neconectat')).toBeInTheDocument()
    expect(screen.getByText(/Activează VITE_USE_MOCK_DATA=true/)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Investiții publice locale' })).not.toBeInTheDocument()
  })
})

describe('PublicInvestmentsSearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useObjectiveSearch.mockReturnValue(queryResult(emptySearchResult))
  })

  it('writes cleaned text and uppercase county filters to URL search state', () => {
    renderWithEvidence(<PublicInvestmentsSearchPage search={{ page: 3 }} />)

    fireEvent.change(screen.getByLabelText('Text'), {
      target: { value: 'apă canal' },
    })
    fireEvent.change(screen.getByLabelText('Județ'), {
      target: { value: 'cj' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Aplică' }))

    expect(mocks.navigate).toHaveBeenCalledTimes(1)
    const navigateArg = mocks.navigate.mock.calls[0]?.[0] as {
      readonly search: (
        previous: Partial<PublicInvestmentsSearchState>,
      ) => Partial<PublicInvestmentsSearchState>
    }

    expect(navigateArg.search({ sort: 'title', page: 7 })).toEqual({
      q: 'apă canal',
      counties: ['CJ'],
      sort: 'title',
    })
  })

  it('renders the no-results state without hiding the filter form', () => {
    renderWithEvidence(<PublicInvestmentsSearchPage search={{ q: 'nimic' }} />)

    expect(screen.getByRole('heading', { name: 'Căutare investiții publice' })).toBeInTheDocument()
    expect(screen.getByText('0 rezultate')).toBeInTheDocument()
    expect(screen.getByText('Nu există rezultate pentru filtrele selectate.')).toBeInTheDocument()
    expect(screen.getByLabelText('Text')).toBeInTheDocument()
  })
})

describe('PublicInvestmentsObjectivePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useObjectiveBundle.mockReturnValue(queryResult(sanitizedGatedBundle()))
    mocks.usePaymentsLedgerData.mockReturnValue(
      queryResult({
        payments: [],
        cumulativeSeries: [],
        contractedReference: null,
        totals: {
          reimbursedTotal: { amount: 0, confidence: 'ok', raw: '0' },
          paymentCount: 0,
          suspectCount: 0,
        },
        snapshotDate: '2026-05-18',
      }),
    )
  })

  it('keeps gated party identifiers hidden and deep-links tab changes through search params', async () => {
    renderWithEvidence(
      <PublicInvestmentsObjectivePage
        objectiveId="pi-anghel-cl-napoca-gated"
        search={{ tab: 'parti' }}
      />,
    )

    expect(screen.getByRole('heading', { name: /Reabilitare clădire școlară/ })).toBeInTheDocument()
    expect(screen.getAllByText('Nume reținut - verificare în curs').length).toBeGreaterThan(0)
    expect(screen.getByText(/CUI reținut/)).toBeInTheDocument()
    expect(screen.queryByText(/Popescu Ion Aurel/)).not.toBeInTheDocument()
    expect(screen.queryByText(/99887766/)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Plăți' }))

    const navigateArg = mocks.navigate.mock.calls[0]?.[0] as {
      readonly search: (previous: { readonly tab?: string }) => { readonly tab?: string }
    }
    expect(navigateArg.search({ tab: 'parti' })).toEqual({ tab: 'plati' })
  })
})
