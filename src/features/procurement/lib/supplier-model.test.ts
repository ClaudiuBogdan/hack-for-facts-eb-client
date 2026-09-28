import { describe, expect, it } from 'vitest'
import { clientName, contractClients, hasAnyRecord, isEmptyYear, knownClientName, scanIsWhole, steadyClients, supplierView } from './supplier-model'
import { consortiumContracts, supplierProfile } from './supplier.fixture'

describe('supplierView', () => {
  it('builds the registry’s model and places the firm in its county', () => {
    const view = supplierView(supplierProfile())
    expect(view.company?.displayName).toBe('Costalex Construct SRL')
    expect(view.company?.status.kind).toBe('insolvency')
    expect(view.county).toBe('IF')
  })

  it('leaves a firm the registry does not hold without a model or a county', () => {
    const view = supplierView(supplierProfile({ registry: null, name: 'Hydrostroy AD' }))
    expect(view.company).toBeNull()
    expect(view.county).toBeNull()
  })
})

describe('the profile helpers', () => {
  it('names an institution, or shows its CUI when the spine cannot — but a sentence takes only a known name', () => {
    expect(clientName(supplierProfile(), '4364446')).toBe('Orasul Otopeni')
    expect(clientName(supplierProfile(), '999')).toBe('999')
    expect(knownClientName(supplierProfile(), '4364446')).toBe('Orasul Otopeni')
    expect(knownClientName(supplierProfile(), '999')).toBeNull()
  })

  it('calls a year empty only when it has no direct purchase and no contract', () => {
    expect(isEmptyYear(supplierProfile())).toBe(false)
    const none = { count: 0, valued: 0, value: null, clients: 0, clientsAtLeast: false }
    expect(isEmptyYear(supplierProfile({ direct: none, contracts: { ...supplierProfile().contracts, count: 0 } }))).toBe(true)
    expect(isEmptyYear(supplierProfile({ direct: none, contracts: consortiumContracts() }))).toBe(false)
  })

  it('knows a firm with no record in any year', () => {
    expect(hasAnyRecord(supplierProfile())).toBe(true)
    expect(hasAnyRecord(supplierProfile({ directYears: [], contractYears: [{ year: 2025, value: null, count: 0 }] }))).toBe(false)
  })

  it('ranks contract clients from every row when all were read, else from the analysis', () => {
    expect(contractClients(supplierProfile({ contracts: consortiumContracts() })).rows[0]).toMatchObject({ cui: '2665900', count: 11 })
    expect(contractClients(supplierProfile({ contracts: { ...consortiumContracts(), clients: null } })).rows[0]?.cui).toBe('4364446')
  })

  it('calls the consortium scan whole only when it read every row and told each apart', () => {
    expect(scanIsWhole(supplierProfile({ contracts: consortiumContracts() }))).toBe(true)
    expect(scanIsWhole(supplierProfile({ contracts: { ...consortiumContracts(), count: 140, scanned: 100 } }))).toBe(false)
    expect(scanIsWhole(supplierProfile({ contracts: { ...consortiumContracts(), unresolved: 1 } }))).toBe(false)
  })

  it('finds the institutions that bought in all years but one at most', () => {
    const rows = supplierProfile().clientYears
    expect(steadyClients(rows, 2019, 2025).map((row) => row.cui)).toEqual(['4364446'])
    // Two years say nothing about steadiness.
    expect(steadyClients(rows, 2024, 2025)).toEqual([])
  })
})
