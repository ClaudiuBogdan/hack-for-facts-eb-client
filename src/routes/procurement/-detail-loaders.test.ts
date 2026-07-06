import { beforeEach, describe, expect, it, vi } from 'vitest'

const routeStub = vi.fn((options: Record<string, unknown>) => options)
const notFoundError = new Error('not-found')
const notFoundMock = vi.fn(() => notFoundError)
const fetchProcedureDetailMock = vi.fn()
const fetchContractDetailMock = vi.fn()
const fetchDirectAcquisitionDetailMock = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => routeStub,
  notFound: notFoundMock,
}))

vi.mock('@/features/procurement/api/procurement-api', () => ({
  fetchProcurementProcedureDetail: fetchProcedureDetailMock,
  fetchProcurementContractDetail: fetchContractDetailMock,
  fetchProcurementDirectAcquisitionDetail: fetchDirectAcquisitionDetailMock,
}))

async function importProcedureRoute() {
  const { Route } = await import('./procedures/$id')
  return Route as unknown as {
    loader: (input: { readonly params: { readonly id: string } }) => Promise<{
      readonly detail: unknown
    }>
  }
}

async function importContractRoute() {
  const { Route } = await import('./contracts/$id')
  return Route as unknown as {
    loader: (input: { readonly params: { readonly id: string } }) => Promise<{
      readonly detail: unknown
    }>
  }
}

async function importDirectAcquisitionRoute() {
  const { Route } = await import('./direct-acquisitions/$id')
  return Route as unknown as {
    loader: (input: { readonly params: { readonly id: string } }) => Promise<{
      readonly detail: unknown
    }>
  }
}

describe('procurement detail route loaders', () => {
  beforeEach(() => {
    vi.resetModules()
    routeStub.mockClear()
    notFoundMock.mockClear()
    fetchProcedureDetailMock.mockReset()
    fetchContractDetailMock.mockReset()
    fetchDirectAcquisitionDetailMock.mockReset()
  })

  it('throws notFound for unknown procedure ids', async () => {
    fetchProcedureDetailMock.mockResolvedValue(null)
    const route = await importProcedureRoute()

    await expect(
      route.loader({ params: { id: 'missing-procedure' } }),
    ).rejects.toBe(notFoundError)
    expect(fetchProcedureDetailMock).toHaveBeenCalledWith('missing-procedure')
    expect(notFoundMock).toHaveBeenCalledTimes(1)
  })

  it('throws notFound for unknown contract ids', async () => {
    fetchContractDetailMock.mockResolvedValue(null)
    const route = await importContractRoute()

    await expect(
      route.loader({ params: { id: 'missing-contract' } }),
    ).rejects.toBe(notFoundError)
    expect(fetchContractDetailMock).toHaveBeenCalledWith('missing-contract')
    expect(notFoundMock).toHaveBeenCalledTimes(1)
  })

  it('throws notFound for unknown direct-acquisition ids', async () => {
    fetchDirectAcquisitionDetailMock.mockResolvedValue(null)
    const route = await importDirectAcquisitionRoute()

    await expect(
      route.loader({ params: { id: 'missing-direct-acquisition' } }),
    ).rejects.toBe(notFoundError)
    expect(fetchDirectAcquisitionDetailMock).toHaveBeenCalledWith(
      'missing-direct-acquisition',
    )
    expect(notFoundMock).toHaveBeenCalledTimes(1)
  })
})
