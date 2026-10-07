import { describe, expect, it, vi } from 'vitest'

/**
 * The analysis route module is in the entry every page of the site loads
 * (TanStack Start bundles route modules with the router): it must not load
 * the front door's or the companies' snapshot. They are the lazy page's, and
 * the server read's.
 */

vi.mock('@tanstack/react-router', () => ({ createFileRoute: () => (options: Record<string, unknown>) => options }))
vi.mock('@/features/justice/lib/hub-snapshot', () => {
  throw new Error('the analysis route loaded the front door’s snapshot')
})
vi.mock('@/features/private-companies/lib/hub-snapshot', () => {
  throw new Error('the analysis route loaded the companies’ snapshot')
})

describe('/justice/analytics’s route module', () => {
  it('loads without a snapshot', async () => {
    await expect(import('./analytics')).resolves.toHaveProperty('Route')
  })
})
