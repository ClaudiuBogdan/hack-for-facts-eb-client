import { describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  fetchProcurementHomeNational: vi.fn(async () => ({ year: 2025 })),
  fetchProcurementHomeCategories: vi.fn(async () => ({ roadsConsortium: null })),
}))
vi.mock('./procurement-home-api', () => api)

const { readProcurementHomeForSsr } = await import('./procurement-home-ssr')

describe('readProcurementHomeForSsr', () => {
  it('reads the national figures and the categories, and no national contract list (PROC-KB0Z)', async () => {
    const read = await readProcurementHomeForSsr(2025)
    expect(Object.keys(read).sort()).toEqual(['categories', 'national', 'year'])
    expect(api.fetchProcurementHomeNational).toHaveBeenCalledWith(2025, expect.anything())
    expect(api.fetchProcurementHomeCategories).toHaveBeenCalledWith(2025, expect.anything())
  })

  it('leaves out a failed read, and the other stands', async () => {
    api.fetchProcurementHomeCategories.mockRejectedValueOnce(new Error('deadline'))
    const read = await readProcurementHomeForSsr(2025)
    expect(read).toEqual({ year: 2025, national: { year: 2025 } })
  })
})
