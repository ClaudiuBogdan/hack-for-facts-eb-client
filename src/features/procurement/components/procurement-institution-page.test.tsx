import type { ComponentProps, ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  AuthorityProcurementSlice,
  ProcurementInstitutionOverview,
} from '@/schemas/procurement'
import type { ProcurementEntityHeader } from './procurement-entity-header'

type HeaderProps = ComponentProps<typeof ProcurementEntityHeader>

let headerProps: HeaderProps | undefined

const useProcurementAuthoritySliceMock = vi.fn()
const useProcurementInstitutionOverviewMock = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { readonly children?: ReactNode }) => (
    <a href="#">{children}</a>
  ),
  useNavigate: () => vi.fn(),
}))

vi.mock('../hooks/use-procurement-data', () => ({
  useProcurementAuthoritySlice: (...args: readonly unknown[]) =>
    useProcurementAuthoritySliceMock(...args),
  useProcurementInstitutionOverview: (...args: readonly unknown[]) =>
    useProcurementInstitutionOverviewMock(...args),
}))

// The header is the subject: capture what the page hands it rather than
// asserting through its DOM, so this stays a test of the page's wiring.
vi.mock('./procurement-entity-header', () => ({
  ProcurementEntityHeader: (props: HeaderProps) => {
    headerProps = props
    return <header data-testid="entity-header" />
  },
}))

vi.mock('./procurement-authority-slice', () => ({
  ProcurementAuthoritySlice: () => null,
}))

vi.mock('./procurement-info-sheet', () => ({
  ProcurementInfoSheet: () => null,
}))

import { ProcurementInstitutionPage } from './procurement-institution-page'

const CUI = '2540635'

/**
 * Only the fields the header reads. The full envelope is 200 lines of schema
 * and none of it reaches the assertions below.
 */
const slice = {
  authorityCui: CUI,
  authorityName: 'Primăria Cluj-Napoca',
  summary: {
    window: { from: null, to: null },
    totalSpendRon: null,
    suppliersCount: null,
    contractsCount: null,
    directAcquisitionsCount: null,
    proceduresCount: null,
    firstSeen: '2019-02-11',
    lastSeen: '2025-11-30',
  },
  analysisByGrain: {
    contract: {
      topCategories: [],
      monthly: [],
      stats: { meta: null },
      meta: { suppliers: null },
    },
    directAcquisition: {
      topCategories: [],
      monthly: [],
      stats: { meta: null },
      meta: { suppliers: null },
    },
  },
  recentRecords: [],
} as unknown as AuthorityProcurementSlice

const overview = {
  authorityCui: CUI,
  authorityName: 'Primăria Cluj-Napoca',
  populations: [],
  signals: {
    concentration: null,
    procedureMix: [],
    amendment: null,
    frameworkExposure: null,
  },
} as unknown as ProcurementInstitutionOverview

function settled(
  sliceData?: AuthorityProcurementSlice,
  overviewData?: ProcurementInstitutionOverview,
) {
  useProcurementAuthoritySliceMock.mockReturnValue({
    data: sliceData,
    isPending: false,
  })
  useProcurementInstitutionOverviewMock.mockReturnValue({
    data: overviewData,
    isPending: false,
    isError: false,
    isRefetching: false,
    error: null,
  })
}

function loaded() {
  settled(slice, overview)
}

function inFlight() {
  useProcurementAuthoritySliceMock.mockReturnValue({
    data: undefined,
    isPending: true,
  })
  useProcurementInstitutionOverviewMock.mockReturnValue({
    data: undefined,
    isPending: true,
    isError: false,
    isRefetching: false,
    error: null,
  })
}

/**
 * Rendered WITHOUT `initialSlice`/`initialOverview` throughout: that is a
 * client-side navigation now, where the loader returns before the API answers
 * and everything the header shows has to come from the page's own queries.
 */
describe('ProcurementInstitutionPage — client-side navigation header', () => {
  beforeEach(() => {
    headerProps = undefined
    useProcurementAuthoritySliceMock.mockReset()
    useProcurementInstitutionOverviewMock.mockReset()
    document.title = 'Achiziții publice — Transparenta.eu'
  })

  it('names the buyer and corrects the tab title once the queries land', () => {
    loaded()

    render(<ProcurementInstitutionPage cui={CUI} />)

    expect(screen.getByTestId('entity-header')).toBeInTheDocument()
    expect(headerProps?.title).toBe('Primăria Cluj-Napoca')
    expect(headerProps?.isTitlePending).toBe(false)
    // `head` could only produce a CUI placeholder on this path.
    expect(document.title).toBe(
      'Primăria Cluj-Napoca — Achiziții publice — Transparenta.eu',
    )
  })

  it('keeps the quick filters, which no longer depend on loader data', () => {
    loaded()

    render(<ProcurementInstitutionPage cui={CUI} />)

    expect(headerProps?.filters).not.toBeNull()
  })

  it('keeps the activity window in the header', () => {
    loaded()

    render(<ProcurementInstitutionPage cui={CUI} />)

    expect(headerProps?.firstSeen).toBe('2019-02-11')
    expect(headerProps?.lastSeen).toBe('2025-11-30')
  })

  it('asks for a title skeleton instead of a placeholder headline while the name is in flight', () => {
    inFlight()

    render(<ProcurementInstitutionPage cui={CUI} />)

    expect(headerProps?.isTitlePending).toBe(true)
    // The router's placeholder stands until a real name exists — an
    // unconditional write here would flash the CUI into the tab.
    expect(document.title).toBe('Achiziții publice — Transparenta.eu')
  })

  it('settles on the CUI headline when the source has no name for this buyer', () => {
    // `authorityName` is nullable. Skeletoning a name that will never arrive
    // would shimmer forever under a page that has already finished loading.
    settled(
      { ...slice, authorityName: null } as AuthorityProcurementSlice,
      { ...overview, authorityName: null } as ProcurementInstitutionOverview,
    )

    render(<ProcurementInstitutionPage cui={CUI} />)

    expect(headerProps?.isTitlePending).toBe(false)
    expect(headerProps?.title).toBe(`Institution CUI ${CUI}`)
    expect(document.title).toBe('Achiziții publice — Transparenta.eu')
  })
})
