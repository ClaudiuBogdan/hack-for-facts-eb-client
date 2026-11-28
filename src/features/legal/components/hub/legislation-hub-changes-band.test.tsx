import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestQueryClient, render, screen } from '@/test/test-utils'

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
})
