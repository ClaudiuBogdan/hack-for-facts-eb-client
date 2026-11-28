import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestQueryClient, render, screen } from '@/test/test-utils'
import { bucharestToday } from '../../lib/legal-coverage'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { readonly children: ReactNode; readonly to?: string }) => <a href={to}>{children}</a>,
}))
vi.mock('../../api/legal-changes-api', () => ({ fetchRecentChangesPage: vi.fn(), fetchRecentChangesCount: vi.fn() }))

import { fetchRecentChangesCount, fetchRecentChangesPage } from '../../api/legal-changes-api'
import { CHANGE_KINDS } from '../../lib/legal-changes-blocks'
import { ChangesBand } from './legislation-hub-bands'

const pageMock = vi.mocked(fetchRecentChangesPage)
const countMock = vi.mocked(fetchRecentChangesCount)

beforeEach(() => {
  pageMock.mockReset()
  countMock.mockReset()
  pageMock.mockResolvedValue({ items: [], endCursor: null })
  countMock.mockResolvedValue(12)
})

/** The hub's band follows the Modificări page (owner, 28 November 2026: "Same rule now"). */
describe('the hub changes band', () => {
  it('asks for changes to existing acts only, its count too', async () => {
    render(<ChangesBand />, { queryClient: createTestQueryClient() })
    await screen.findByText(/12/)
    expect(pageMock).toHaveBeenCalledWith(expect.objectContaining({ kinds: CHANGE_KINDS }), expect.anything())
    expect(countMock).toHaveBeenCalledWith(expect.objectContaining({ kinds: CHANGE_KINDS }), expect.anything())
  })

  it('keys its reads on the kinds, so an all-kinds read of the same day is never reused', async () => {
    const queryClient = createTestQueryClient()
    render(<ChangesBand />, { queryClient })
    await screen.findByText(/12/)
    const keys = queryClient.getQueryCache().findAll().map((query) => query.queryKey)
    expect(keys.length).toBe(2)
    expect(keys.every((key) => key.includes(CHANGE_KINDS))).toBe(true)
  })

  it('ends its window on the Bucharest day, not the browser’s', async () => {
    // A reader in New York at 20:30 on 28 November: it is already 29 November in Bucharest.
    const zone = process.env.TZ
    process.env.TZ = 'America/New_York'
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-29T01:30:00Z'))
    try {
      render(<ChangesBand />, { queryClient: createTestQueryClient() })
      await screen.findByText(/12/)
      expect(bucharestToday()).toBe('2026-11-29')
      expect(pageMock).toHaveBeenCalledWith(expect.objectContaining({ until: '2026-11-29' }), expect.anything())
    } finally {
      vi.useRealTimers()
      process.env.TZ = zone
    }
  })
})
