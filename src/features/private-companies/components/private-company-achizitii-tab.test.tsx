import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { PrivateCompanyProfile } from '@/schemas/private-company'
import { PrivateCompanyAchizitiiTab } from './private-company-achizitii-tab'
import { PrivateCompanyTabContent } from './private-company-tab-content'

vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { readonly children: ReactNode }) => <>{children}</>,
}))

vi.mock('@/features/procurement/components/procurement-supplier-slice', () => ({
  ProcurementSupplierSlice: ({
    supplierCui,
  }: {
    readonly supplierCui: string
  }) => <div data-testid="procurement-supplier-slice">CUI {supplierCui}</div>,
}))

vi.mock('./private-company-summary-tab', () => ({
  PrivateCompanySummaryTab: () => <div />,
}))

vi.mock('./private-company-activity-tab', () => ({
  PrivateCompanyActivityTab: () => <div />,
}))

vi.mock('./private-company-financials-tab', () => ({
  PrivateCompanyFinancialsTab: () => <div />,
}))

vi.mock('./private-company-governance-tab', () => ({
  PrivateCompanyGovernanceTab: () => <div />,
}))

vi.mock('./private-company-location-tab', () => ({
  PrivateCompanyLocationTab: () => <div />,
}))

function makeProfile(cui: string | null): PrivateCompanyProfile {
  return {
    organizationId: 'org-1',
    cui,
    codInmatriculare: null,
    legalName: 'CONSTRUCT CLUJ SRL',
    legalForm: null,
    registrationDate: null,
    status: null,
    address: {
      display: 'Cluj-Napoca',
      county: 'Cluj',
      locality: 'Cluj-Napoca',
    },
    geography: null,
    caenActivities: [],
    representatives: [],
    euBranches: [],
    fiscal: {
      vatPayer: null,
      inactive: null,
      anafFound: true,
      asOfDate: '2026-06-25',
      fiscalCaen: null,
    },
    financials: [],
    sources: [],
  } as unknown as PrivateCompanyProfile
}

describe('PrivateCompanyAchizitiiTab', () => {
  it('passes the company CUI into the procurement supplier slice from the achizitii tab route state', () => {
    render(
      <PrivateCompanyTabContent
        tab="achizitii"
        profile={makeProfile('12345678')}
        cui="12345678"
        litPage={1}
        onLitPageChange={vi.fn()}
        onTabChange={vi.fn()}
      />,
    )

    expect(screen.getByTestId('procurement-supplier-slice')).toHaveTextContent(
      'CUI 12345678',
    )
  })

  it('shows the missing-CUI guardrail instead of attempting a procurement lookup', () => {
    render(<PrivateCompanyAchizitiiTab profile={makeProfile(null)} />)

    expect(
      screen.getByText(
        'CUI indisponibil — achizițiile publice nu pot fi rezolvate.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByTestId('procurement-supplier-slice'),
    ).not.toBeInTheDocument()
  })
})
