import { describe, expect, it, vi } from 'vitest'

/**
 * The ECHR route module is in the entry every page of the site loads
 * (TanStack Start bundles route modules with the router): it must not load
 * the ECHR snapshot (265 KB) or the front door's. They are the lazy page's.
 */

vi.mock('@tanstack/react-router', () => ({ createFileRoute: () => (options: Record<string, unknown>) => options }))
vi.mock('@/features/justice/lib/echr-snapshot', () => {
  throw new Error('the ECHR route loaded the ECHR snapshot')
})
vi.mock('@/features/justice/lib/hub-snapshot', () => {
  throw new Error('the ECHR route loaded the front door’s snapshot')
})

describe('/justice/echr’s route module', () => {
  it('loads without a snapshot', async () => {
    await expect(import('./echr')).resolves.toHaveProperty('Route')
  })
})
