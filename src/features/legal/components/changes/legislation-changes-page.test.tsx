import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestQueryClient, fireEvent, render, screen, within } from '@/test/test-utils'
import type { LegalChangesFilter, LegalRecentChange } from '@/schemas/legal'
import type { LegalChangesSearch } from '@/schemas/legal-search'
import { localIsoDate } from '../../lib/legal-format'

const navigateMock = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, params, to: _to, ...rest }: { readonly children: ReactNode; readonly params?: { actId?: string }; readonly to?: string }) => (
    <a href={`/legislation/acts/${params?.actId ?? ''}`} {...rest}>
      {children}
    </a>
  ),
  useNavigate: () => navigateMock,
}))
vi.mock('../../hooks/use-legislation', () => ({ useLegislationFreshness: () => ({ data: { latestEffectiveChangeDate: '2026-09-25' } }) }))
vi.mock('../../api/legal-changes-api', () => ({ fetchRecentChangesPage: vi.fn(), fetchRecentChangesCount: vi.fn() }))

import { fetchRecentChangesCount, fetchRecentChangesPage } from '../../api/legal-changes-api'
import { LegislationChangesPage } from './legislation-changes-page'

const pageMock = vi.mocked(fetchRecentChangesPage)
const countMock = vi.mocked(fetchRecentChangesCount)

let next = 0
const change = (over: Partial<LegalRecentChange>): LegalRecentChange => ({
  eventId: over.eventId ?? String(++next),
  eventKind: over.eventKind ?? 'modificare',
  effectiveDate: over.effectiveDate === undefined ? '2026-06-25' : over.effectiveDate,
  eventSource: 'portal',
  actId: over.actId ?? '236',
  displayCitation: over.displayCitation ?? 'Legea nr. 236/2022',
  status: over.status ?? 'modificat',
  sourceAct:
    over.sourceAct === undefined ? { actId: '33', displayCitation: 'Legea nr. 33/2026', description: 'Legea nr. 33/2026 modifică legea supravegherii prudențiale.' } : over.sourceAct,
})

const IN_FORCE = [
  change({ eventId: '1', eventKind: 'modificare' }),
  change({ eventId: '2', eventKind: 'completare' }),
  change({ eventId: '3', eventKind: 'rectificare', actId: '799', displayCitation: 'HG nr. 799/2021', sourceAct: null }),
]
const UPCOMING = [change({ eventId: '9', effectiveDate: '2027-01-05', eventKind: 'completare', actId: '204', displayCitation: 'Legea nr. 204/2006', sourceAct: { actId: '2', displayCitation: 'Legea nr. 2/2026', description: null } })]
const UNDATED = [change({ eventId: '20', eventKind: 'abrogare-totala', effectiveDate: null, actId: '168', displayCitation: 'Ordinul nr. 168/2015', status: 'abrogat', sourceAct: null })]
const NEW_LAWS = [change({ eventId: '30', eventKind: 'promulgare', effectiveDate: '2026-07-03', actId: '117', displayCitation: 'Legea nr. 117/2026', status: 'in-vigoare', sourceAct: { actId: '371', displayCitation: 'Decretul nr. 371/2026', description: null } })]

const isUpcoming = (f: LegalChangesFilter) => f.since === localIsoDate(1) && f.until === undefined

function answer({ upcoming = UPCOMING }: { readonly upcoming?: readonly LegalRecentChange[] } = {}) {
  pageMock.mockImplementation(async (f) => {
    if (f.undated) return { items: UNDATED, endCursor: null }
    if (f.kinds?.includes('promulgare')) return { items: NEW_LAWS, endCursor: null }
    if (isUpcoming(f)) return { items: [...upcoming], endCursor: null }
    return { items: IN_FORCE, endCursor: null }
  })
}

const view = (search: LegalChangesSearch = {}) => render(<LegislationChangesPage search={search} />, { queryClient: createTestQueryClient() })

beforeEach(() => {
  pageMock.mockReset()
  countMock.mockReset()
  navigateMock.mockReset()
  countMock.mockResolvedValue(52179)
})

describe('LegislationChangesPage', () => {
  it('shows one block per changing act with its description and lines', async () => {
    answer()
    view()
    const block = (await screen.findByRole('link', { name: 'Legea nr. 33/2026' })).closest('article') as HTMLElement
    const scope = within(block)
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
    // The test locale formats dates in English („January 5, 2027").
    expect(await screen.findByText(/intră în vigoare la .*2027/)).toBeInTheDocument()
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
    view({ fila: 'fara-data' })
    const item = (await screen.findByRole('link', { name: 'Ordinul nr. 168/2015' })).closest('li') as HTMLElement
    expect(within(item).getByText(/abrogare totală/)).toBeInTheDocument()
    expect(pageMock).toHaveBeenCalledWith(expect.objectContaining({ undated: true }), expect.anything())
  })

  it('keeps the list when a count fails', async () => {
    answer()
    countMock.mockRejectedValue(new Error('count timed out'))
    view()
    expect(await screen.findByRole('link', { name: 'Legea nr. 33/2026' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Schimbări ale actelor/ }).textContent).not.toMatch(/\d/)
  })

  it('narrows both lists by the kind in the address', async () => {
    answer()
    view({ fel: 'modificare' })
    await screen.findByRole('link', { name: 'Legea nr. 33/2026' })
    const narrowed = pageMock.mock.calls.filter(([f]) => f.kinds?.join(',') === 'modificare').map(([f]) => f)
    expect(narrowed.some(isUpcoming)).toBe(true)
    expect(narrowed.some((f) => !isUpcoming(f))).toBe(true)
  })

  it('never sends an empty kinds list, nor another tab’s kinds', async () => {
    answer()
    view({ fila: 'legi-noi', fel: 'modificare' })
    await screen.findByRole('link', { name: 'Legea nr. 117/2026' })
    expect(pageMock).toHaveBeenCalledWith(expect.objectContaining({ kinds: ['promulgare', 'aprobare-oug', 'aprobare-og'] }), expect.anything())
    expect(pageMock.mock.calls.every(([f]) => f.kinds === undefined || f.kinds.length > 0)).toBe(true)
  })

  it('caps the range at today', async () => {
    answer()
    view({ de: '2026-01-01', pana: '2099-12-31' })
    await screen.findByRole('link', { name: 'Legea nr. 33/2026' })
    expect(pageMock).toHaveBeenCalledWith(expect.objectContaining({ since: '2026-01-01', until: localIsoDate() }), expect.anything())
  })

  it('follows the address', async () => {
    answer()
    const { rerender } = view()
    await screen.findByRole('link', { name: 'Legea nr. 33/2026' })
    rerender(<LegislationChangesPage search={{ fila: 'fara-data' }} />)
    expect(await screen.findByRole('link', { name: 'Ordinul nr. 168/2015' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Legea nr. 33/2026' })).toBeNull()
  })

  it('writes the tab and the kinds in the address', async () => {
    answer()
    view({ fel: 'modificare', de: '2026-01-01' })
    fireEvent.click(await screen.findByRole('tab', { name: /Fără dată/ }))
    expect(navigateMock).toHaveBeenLastCalledWith(expect.objectContaining({ to: '/legislation/changes', replace: true, search: expect.objectContaining({ fila: 'fara-data', fel: undefined, de: undefined }) }))
    fireEvent.click(screen.getByRole('button', { name: /^Filtre/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'completare' }))
    expect(navigateMock).toHaveBeenLastCalledWith(expect.objectContaining({ search: expect.objectContaining({ fel: 'modificare,completare', de: '2026-01-01' }) }))
  })
})
