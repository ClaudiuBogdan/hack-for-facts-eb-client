import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestQueryClient, fireEvent, render, screen, within } from '@/test/test-utils'
import type { LegalChangesFilter, LegalRecentChange } from '@/schemas/legal'
import type { LegalChangesSearch } from '@/schemas/legal-search'
import { bucharestToday } from '../../lib/legal-coverage'

const dayAfter = (iso: string, days: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)
const TODAY = bucharestToday()
const SOON = dayAfter(TODAY, 40)

const navigateMock = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    params,
    search,
    to: _to,
    ...rest
  }: {
    readonly children: ReactNode
    readonly params?: { actId?: string }
    readonly search?: (prev: Record<string, unknown>) => Record<string, unknown>
    readonly to?: string
  }) => (
    // What the link would carry from an address in English with the page's own keys.
    <a href={`/legislation/acts/${params?.actId ?? ''}`} data-search={JSON.stringify(search?.({ lang: 'en', fila: 'legi-noi', fel: 'promulgare' }) ?? null)} {...rest}>
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
const UPCOMING = [change({ eventId: '9', effectiveDate: SOON, eventKind: 'completare', actId: '204', displayCitation: 'Legea nr. 204/2006', sourceAct: { actId: '2', displayCitation: 'Legea nr. 2/2026', description: null } })]
const UNDATED = [change({ eventId: '20', eventKind: 'abrogare-totala', effectiveDate: null, actId: '168', displayCitation: 'Ordinul nr. 168/2015', status: 'abrogat', sourceAct: null })]
const NEW_LAWS = [change({ eventId: '30', eventKind: 'promulgare', effectiveDate: '2026-07-03', actId: '117', displayCitation: 'Legea nr. 117/2026', status: 'in-vigoare', sourceAct: { actId: '371', displayCitation: 'Decretul nr. 371/2026', description: null } })]

const isUpcoming = (f: LegalChangesFilter) => f.since === dayAfter(bucharestToday(), 1) && f.until === undefined

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
    expect(screen.getByRole('button', { name: /Schimbări ale actelor/ }).textContent).not.toMatch(/\d/)
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

  it('caps the range at today, and says the end it uses', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-28T10:00:00Z'))
    try {
      answer()
      view({ de: '2026-01-01', pana: '2099-12-31' })
      await screen.findByRole('link', { name: 'Legea nr. 33/2026' })
      expect(pageMock).toHaveBeenCalledWith(expect.objectContaining({ since: '2026-01-01', until: '2026-11-28' }), expect.anything())
      // The chip names the period actually read (the test locale formats dates in English).
      expect(screen.getByRole('button', { name: /Scoate .*Nov(ember)? 28, 2026/ })).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('carries the address’s language to the acts, nothing else', async () => {
    answer()
    view()
    expect(await screen.findByRole('link', { name: 'Legea nr. 236/2022' })).toHaveAttribute('data-search', JSON.stringify({ lang: 'en' }))
  })

  it('shows no stale rows under a failed reload', async () => {
    let fail = false
    pageMock.mockImplementation(async (f) => {
      if (isUpcoming(f)) return { items: [], endCursor: null }
      if (fail) throw new Error('timeout')
      return { items: IN_FORCE, endCursor: 'p2' }
    })
    const queryClient = createTestQueryClient()
    render(<LegislationChangesPage search={{}} />, { queryClient })
    await screen.findByRole('link', { name: 'Legea nr. 33/2026' })
    fail = true
    await queryClient.refetchQueries({ queryKey: ['legal', 'changes-list'] })
    expect(await screen.findByText('Nu am putut încărca schimbările.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Legea nr. 33/2026' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Încarcă mai multe' })).toBeNull()
  })

  it('follows the address', async () => {
    answer()
    const { rerender } = view()
    await screen.findByRole('link', { name: 'Legea nr. 33/2026' })
    rerender(<LegislationChangesPage search={{ fila: 'fara-data' }} />)
    expect(await screen.findByRole('link', { name: 'Ordinul nr. 168/2015' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Legea nr. 33/2026' })).toBeNull()
  })

  it('writes the tab and the kinds in the address, keeping the language', async () => {
    answer()
    view({ fel: 'modificare', de: '2026-01-01' })
    fireEvent.click(await screen.findByRole('button', { name: /Fără dată/ }))
    const lastSearch = () => {
      const call = navigateMock.mock.calls[navigateMock.mock.calls.length - 1][0] as { readonly to: string; readonly replace: boolean; readonly search: (prev: Record<string, unknown>) => Record<string, unknown> }
      expect(call).toMatchObject({ to: '/legislation/changes', replace: true })
      return call.search({ lang: 'en', fel: 'modificare', de: '2026-01-01' })
    }
    expect(lastSearch()).toMatchObject({ lang: 'en', fila: 'fara-data', fel: undefined, de: undefined })
    fireEvent.click(screen.getByRole('button', { name: /^Filtre/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'completare' }))
    expect(lastSearch()).toMatchObject({ lang: 'en', fel: 'modificare,completare', de: '2026-01-01' })
  })

  it('leaves the address alone when the open tab is pressed again', async () => {
    answer()
    view({ fel: 'modificare' })
    const current = await screen.findByRole('button', { name: /Schimbări ale actelor/ })
    expect(current).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(current)
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('says when the upcoming changes could not be read, with a way to try again', async () => {
    answer()
    const inner = pageMock.getMockImplementation()
    pageMock.mockImplementation(async (f, o) => {
      if (isUpcoming(f)) throw new Error('timeout')
      return (inner as NonNullable<typeof inner>)(f, o)
    })
    view()
    expect(await screen.findByText('Nu am putut încărca schimbările care urmează.')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Încearcă din nou' }).length).toBeGreaterThan(0)
  })

  it('reads every page of the upcoming changes', async () => {
    const later = change({ eventId: '10', effectiveDate: dayAfter(TODAY, 90), actId: '500', displayCitation: 'Legea nr. 500/2000', sourceAct: { actId: '8', displayCitation: 'Legea nr. 8/2026', description: null } })
    pageMock.mockImplementation(async (f, o) => {
      if (isUpcoming(f)) return o?.after === 'u2' ? { items: [later], endCursor: null } : { items: UPCOMING, endCursor: 'u2' }
      return { items: IN_FORCE, endCursor: null }
    })
    view()
    expect(await screen.findByRole('link', { name: 'Legea nr. 8/2026' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Legea nr. 2/2026' })).toBeInTheDocument()
  })

  it('keeps the loaded rows when the next page fails', async () => {
    pageMock.mockImplementation(async (f, o) => {
      if (isUpcoming(f)) return { items: [], endCursor: null }
      if (o?.after === 'p2') throw new Error('timeout')
      return { items: IN_FORCE, endCursor: 'p2' }
    })
    view()
    fireEvent.click(await screen.findByRole('button', { name: 'Încarcă mai multe' }))
    expect(await screen.findByText('Pagina următoare nu s-a încărcat.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Legea nr. 33/2026' })).toBeInTheDocument()
  })

  it('sends no backwards range when the period starts after today', async () => {
    answer()
    view({ de: dayAfter(TODAY, 10) })
    expect(await screen.findByText('Nicio schimbare nu corespunde filtrelor.')).toBeInTheDocument()
    expect(pageMock.mock.calls.some(([f]) => f.since !== undefined && f.until !== undefined && f.since > f.until)).toBe(false)
  })

  it('keeps the note on the descriptions when only the upcoming changes show', async () => {
    pageMock.mockImplementation(async (f) => (isUpcoming(f) ? { items: [change({ eventId: '11', effectiveDate: SOON })], endCursor: null } : { items: [], endCursor: null }))
    view()
    expect(await screen.findByText(/rezumatul făcut automat/)).toBeInTheDocument()
  })

  it('takes today as the Bucharest day, not the browser’s', async () => {
    // A reader in New York at 20:30 on 28 November: it is already 29 November in Bucharest.
    const zone = process.env.TZ
    process.env.TZ = 'America/New_York'
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-29T01:30:00Z'))
    try {
      answer()
      view()
      await screen.findByRole('link', { name: 'Legea nr. 33/2026' })
      expect(pageMock).toHaveBeenCalledWith(expect.objectContaining({ until: '2026-11-29' }), expect.anything())
      expect(pageMock).toHaveBeenCalledWith(expect.objectContaining({ since: '2026-11-30' }), expect.anything())
    } finally {
      vi.useRealTimers()
      process.env.TZ = zone
    }
  })

  it('sends no backwards range on the new-laws tab either', async () => {
    answer()
    view({ fila: 'legi-noi', de: '2026-06-01', pana: '2026-01-01' })
    expect(await screen.findByText('Nicio schimbare nu corespunde filtrelor.')).toBeInTheDocument()
    expect(pageMock.mock.calls.some(([f]) => f.since !== undefined && f.until !== undefined && f.since > f.until)).toBe(false)
  })

  it('stops the start of the period at today on the first tab', async () => {
    answer()
    view()
    await screen.findByRole('link', { name: 'Legea nr. 33/2026' })
    fireEvent.click(screen.getByRole('button', { name: /^Filtre/ }))
    expect(await screen.findByLabelText('De la')).toHaveAttribute('max', TODAY)
  })

})
