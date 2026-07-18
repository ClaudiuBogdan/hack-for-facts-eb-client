import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type {
  ContractModificationRecord,
  ContractRecordSummary,
} from '@/schemas/procurement'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    hash,
    ...rest
  }: {
    children: React.ReactNode
    to?: string
    hash?: string
  }) => (
    <a
      href="#"
      data-to={to}
      data-hash={hash}
      {...(rest as Record<string, unknown>)}
    >
      {children}
    </a>
  ),
}))

import { ProcurementRecordCard } from './procurement-record-card'

const party = { cui: '123', name: 'AUTORITATE', displayName: 'Primăria X' }
const supplier = { cui: '456', name: 'FIRMA', displayName: 'Firma Y' }

const contract: ContractRecordSummary = {
  id: 'c1',
  grain: 'contract',
  contractNo: '77',
  contractDate: '2025-03-01',
  procedureId: null,
  noticeNo: null,
  title: 'Lucrări de reparații',
  authority: party,
  supplier,
  cpvCode: '45453000',
  cpvDivisionCode: '45',
  valueRon: '1171228.00',
  estimatedValueRon: null,
  currency: null,
  value: {
    valueState: 'official_exact',
    valueStateRule: 'own_value',
    valueAccepted: true,
    valueRonComparable: '1171228.00',
    valueComparableBasis: 'official',
    valueRulesVersion: 2,
    valueResolvedAt: null,
  },
  status: 'awarded',
  sourceSystem: 'seap_contracts',
  sourceUrl: null,
  isCanonical: true,
  dupGroupId: null,
  canonicalValueSource: 'seap_own',
  valueDisagreement: false,
  modifications: [],
}

const unlinkedModification: ContractModificationRecord = {
  id: 'm1',
  grain: 'modification',
  contractId: null,
  linkMethod: null,
  linkConfidence: null,
  modificationDate: '2025-06-10',
  valueBeforeRon: '100.00',
  valueAfterRon: '150.00',
  valueDeltaRon: '50.00',
  modificationType: 'ACT ADITIONAL',
  authority: party,
  supplier,
  contractNo: '304',
  noticeNo: null,
  sourceUrl: null,
  parentContract: null,
}

describe('ProcurementRecordCard', () => {
  it('renders the whole card as a single link to the record detail', () => {
    render(<ProcurementRecordCard record={contract} />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('data-to', '/procurement/contracts/$id')
    // Party names are plain text inside the card — no nested anchors.
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.getByText('Lucrări de reparații')).toBeInTheDocument()
    expect(screen.getByText(/Primăria X/)).toBeInTheDocument()
  })

  it('renders unlinked modifications as non-navigable with an explanation', () => {
    render(<ProcurementRecordCard record={unlinkedModification} />)

    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText(/not linked to a contract/i)).toBeInTheDocument()
  })

  it('links linked modifications to the parent contract trail anchor', () => {
    render(
      <ProcurementRecordCard
        record={{ ...unlinkedModification, contractId: 'c9' }}
      />,
    )

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('data-to', '/procurement/contracts/$id')
    expect(link).toHaveAttribute('data-hash', 'modificari')
  })
})
