import { render, screen } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { parseProcurementSearch } from '@/schemas/procurement-search'
import { procurementMockFixtures } from '../mocks/fixtures'
import { ProcurementRecordCard } from './procurement-record-card'

vi.mock('@tanstack/react-router', async () => {
  const { buildProcurementRouterMock } = await import('../test/mock-router')
  const { vi: vitest } = await import('vitest')
  return buildProcurementRouterMock(vitest.fn())
})

describe('ProcurementRecordCard', () => {
  const modificationRecords = procurementMockFixtures.searchForParams({
    ...parseProcurementSearch({ grain: 'modifications' }),
  }).records

  it('links linked modifications to the parent contract modificari section', () => {
    const linked = modificationRecords.find((record) => record.id === 'mod-001')
    expect(linked).toBeDefined()

    render(<ProcurementRecordCard record={linked!} />)

    const detailsLink = screen.getByRole('link', { name: /Vezi detalii/i })
    expect(detailsLink).toHaveAttribute(
      'href',
      '/achizitii/contracte/contract-key-001#modificari',
    )
    expect(
      screen.queryByText(/Modificare neasociată/i),
    ).not.toBeInTheDocument()
  })

  it('renders unlinked modifications as non-navigable cards', () => {
    const unlinked = modificationRecords.find((record) => record.id === 'mod-002')
    expect(unlinked).toBeDefined()

    render(<ProcurementRecordCard record={unlinked!} />)

    expect(
      screen.getByText(/Modificare neasociată — fără contract părinte/i),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Vezi detalii/i })).not.toBeInTheDocument()
  })

  it('discloses native non-RON values on contract cards', () => {
    const contract = procurementMockFixtures.searchForParams(
      parseProcurementSearch({ grain: 'contracts' }),
    ).records.find((record) => record.id === 'contract-key-002')
    expect(contract).toBeDefined()

    render(<ProcurementRecordCard record={contract!} />)

    expect(screen.getByText('EUR')).toBeInTheDocument()
    expect(screen.getByText(/Achiziție echipamente IT/i)).toBeInTheDocument()
  })
})
