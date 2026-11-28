import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@/test/test-utils'
import { createTestQueryClient } from '@/test/test-utils'
import { localIsoDate } from '@/features/legal/lib/legal-format'
import type { ChangeRow } from './changes.model'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, params, to: _to, ...rest }: { readonly children: ReactNode; readonly params?: { actId?: string }; readonly to?: string }) => (
    <a href={`/legislation/acts/${params?.actId ?? ''}`} {...rest}>
      {children}
    </a>
  ),
}))
vi.mock('@/features/legal/components/legislation-shell', () => ({ LegislationShell: ({ children }: { readonly children: ReactNode }) => <div>{children}</div> }))
vi.mock('@/features/legal/hooks/use-legislation-frontier', () => ({ useLegislationFrontier: () => ({ measuredAt: null, dataStatus: undefined }) }))
vi.mock('@/features/legal/hooks/use-legislation', () => ({ useLegislationFreshness: () => ({ data: { latestEffectiveChangeDate: '2026-09-25' } }) }))
vi.mock('./changes.api', async (importOriginal) => ({ ...(await importOriginal<typeof import('./changes.api')>()), fetchChangesPage: vi.fn(), fetchChangesCount: vi.fn() }))

import { fetchChangesCount, fetchChangesPage, type ChangesQuery } from './changes.api'
import { ChangesPrototype } from './changes.page'

const pageMock = vi.mocked(fetchChangesPage)
const countMock = vi.mocked(fetchChangesCount)

const change = (over: Partial<ChangeRow> & { readonly source?: ChangeRow['sourceAct'] }): ChangeRow => ({
  eventId: over.eventId ?? Math.random().toString(36).slice(2),
  eventKind: over.eventKind ?? 'modificare',
  effectiveDate: over.effectiveDate === undefined ? '2026-06-25' : over.effectiveDate,
  actId: over.actId ?? '236',
  displayCitation: over.displayCitation ?? 'Legea nr. 236/2022',
  status: over.status ?? 'modificat',
  sourceAct: over.source === undefined ? { actId: '33', displayCitation: 'Legea nr. 33/2026', description: 'Legea nr. 33/2026 modifică legea supravegherii prudențiale.' } : over.source,
})

const IN_FORCE = [
  change({ eventId: '1', eventKind: 'modificare' }),
  change({ eventId: '2', eventKind: 'completare' }),
  change({ eventId: '3', eventKind: 'rectificare', effectiveDate: '2026-06-25', actId: '799', displayCitation: 'HG nr. 799/2021', source: null }),
]
// Forty days ahead of the test's own day, so the test never expires.
const UPCOMING = [change({ eventId: '9', effectiveDate: localIsoDate(40), eventKind: 'completare', actId: '204', displayCitation: 'Legea nr. 204/2006', source: { actId: '2', displayCitation: 'Legea nr. 2/2026', description: null } })]
const UNDATED = [change({ eventId: '20', eventKind: 'abrogare-totala', effectiveDate: null, actId: '168', displayCitation: 'Ordinul nr. 168/2015', status: 'abrogat', source: null })]

const isUpcoming = (q: ChangesQuery) => q.since === localIsoDate(1) && q.until === undefined

function answer({ upcoming = UPCOMING, inForce = IN_FORCE }: { readonly upcoming?: readonly ChangeRow[]; readonly inForce?: readonly ChangeRow[] } = {}) {
  pageMock.mockImplementation(async (q) => {
    if (q.undatedOnly) return { items: UNDATED, endCursor: null }
    if (isUpcoming(q)) return { items: upcoming, endCursor: null }
    return { items: inForce, endCursor: null }
  })
}

const view = () => render(<ChangesPrototype />, { queryClient: createTestQueryClient() })

beforeEach(() => {
  pageMock.mockReset()
  countMock.mockReset()
  countMock.mockResolvedValue(52179)
})

describe('ChangesPrototype', () => {
  it('shows one block per changing act with its description and lines', async () => {
    answer()
    view()
    const block = (await screen.findByRole('link', { name: 'Legea nr. 33/2026' })).closest('article')
    expect(block).not.toBeNull()
    const scope = within(block as HTMLElement)
    expect(scope.getByText('Legea nr. 33/2026 modifică legea supravegherii prudențiale.')).toBeInTheDocument()
    expect(scope.getByText('modifică și completează')).toBeInTheDocument()
    expect(scope.getByRole('link', { name: 'Legea nr. 236/2022' })).toHaveAttribute('href', '/legislation/acts/236')
    expect(screen.getByText('Rectificări')).toBeInTheDocument()
  })

  it('puts upcoming changes above those in force', async () => {
    answer()
    view()
    const upcoming = await screen.findByRole('heading', { name: /Urmează să intre în vigoare/ })
    const inForce = screen.getByRole('heading', { name: /Intrate în vigoare/ })
    expect(upcoming.compareDocumentPosition(inForce) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(await screen.findByText(/intră în vigoare la/)).toBeInTheDocument()
  })

  it('hides the upcoming group when nothing is upcoming', async () => {
    answer({ upcoming: [] })
    view()
    await screen.findByRole('link', { name: 'Legea nr. 33/2026' })
    expect(screen.queryByText(/Urmează să intre/)).toBeNull()
  })

  it('shows no description line without one', async () => {
    answer()
    view()
    const block = (await screen.findByRole('link', { name: 'Legea nr. 2/2026' })).closest('article') as HTMLElement
    expect(block.querySelector('p')).toBeNull()
  })

  it('lists undated repeals as rows', async () => {
    answer()
    view()
    fireEvent.click(await screen.findByRole('tab', { name: /Fără dată/ }))
    const item = (await screen.findByRole('link', { name: 'Ordinul nr. 168/2015' })).closest('li') as HTMLElement
    expect(within(item).getByText(/abrogare totală/)).toBeInTheDocument()
    expect(pageMock).toHaveBeenCalledWith(expect.objectContaining({ undatedOnly: true }), expect.anything())
  })

  it('keeps the list when a count fails', async () => {
    answer()
    countMock.mockRejectedValue(new Error('count timed out'))
    view()
    expect(await screen.findByRole('link', { name: 'Legea nr. 33/2026' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Schimbări ale actelor/ }).textContent).not.toMatch(/\d/)
  })

  it('narrows both lists by the chosen kind', async () => {
    answer()
    view()
    await screen.findByRole('link', { name: 'Legea nr. 33/2026' })
    fireEvent.click(screen.getByRole('button', { name: /^Filtre/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'modificare' }))
    await vi.waitFor(() => {
      const kinds = pageMock.mock.calls.map(([q]) => q.kinds.join(','))
      expect(kinds.filter((k) => k === 'modificare').length).toBeGreaterThanOrEqual(2)
    })
    const narrowed = pageMock.mock.calls.filter(([q]) => q.kinds.join(',') === 'modificare').map(([q]) => q)
    expect(narrowed.some(isUpcoming)).toBe(true)
    expect(narrowed.some((q) => !isUpcoming(q))).toBe(true)
  })
})
