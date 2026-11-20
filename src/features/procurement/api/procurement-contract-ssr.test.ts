import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ContractSheet, CtContext } from '../lib/contract-model'

const status = vi.hoisted(() => ({ disclosureVersion: vi.fn<() => Promise<string | null>>() }))
const api = vi.hoisted(() => ({ fetchContract: vi.fn(), fetchContractContext: vi.fn() }))

vi.mock('./procurement-da-release-status', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./procurement-da-release-status')>()),
  disclosureVersion: status.disclosureVersion,
}))
vi.mock('./procurement-contract-api', () => api)
vi.mock('../lib/contract-model', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/contract-model')>()),
  contractContextInputOf: () => ({ authorityCui: '4267117', supplierCui: '14837428', day: '2025-03-04' }),
}))

const { readProcurementContractForSsr } = await import('./procurement-contract-ssr')

const sheetOf = (id: string) => ({ id, partial: false }) as unknown as ContractSheet
const context = { partial: false } as unknown as CtContext

describe('readProcurementContractForSsr (D6: the context carries the pair\'s direct purchases)', () => {
  beforeEach(() => {
    status.disclosureVersion.mockReset()
    api.fetchContract.mockReset().mockImplementation((id: string) => Promise.resolve(sheetOf(id)))
    api.fetchContractContext.mockReset().mockResolvedValue(context)
  })

  it('keeps the contract, and reads its context (the pair\'s direct purchases) on every render', async () => {
    status.disclosureVersion.mockResolvedValue('on:t1:d6:p1')
    await readProcurementContractForSsr('7000001')
    await readProcurementContractForSsr('7000001')
    expect(api.fetchContract).toHaveBeenCalledTimes(1)
    expect(api.fetchContractContext).toHaveBeenCalledTimes(2)
  })

  it('reads the context afresh whatever the publication', async () => {
    status.disclosureVersion.mockResolvedValue(null)
    await readProcurementContractForSsr('7000002')
    await readProcurementContractForSsr('7000002')
    expect(api.fetchContractContext).toHaveBeenCalledTimes(2)
  })
})
