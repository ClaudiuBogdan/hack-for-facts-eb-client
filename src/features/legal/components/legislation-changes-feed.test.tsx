import {
  render as renderShared,
  screen,
  fireEvent,
  createTestQueryClient,
} from '@/test/test-utils'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import type { ReactNode } from 'react'
import { LegislationChangesFeed } from './legislation-changes-feed'

const navigateMock = vi.fn()
// The real module delegates to the fixture lane (vitest pins legal to mock);
// wrapping the two fetchers in vi.fn keeps that behavior while letting tests
// assert the FILTER each render builds and override the page source.
vi.mock('../api/legal-changes-api', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('../api/legal-changes-api')>()
  return {
    ...original,
    fetchRecentChangesPage: vi.fn(original.fetchRecentChangesPage),
    fetchRecentChangesCount: vi.fn(original.fetchRecentChangesCount),
  }
})
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
  }: {
    readonly children: ReactNode
    readonly to: string
    readonly params?: Record<string, string>
  }) => (
    <a href={params?.actId ? to.replace('$actId', params.actId) : to}>
      {children}
    </a>
  ),
  useNavigate: () => navigateMock,
}))

const render = (ui: Parameters<typeof renderShared>[0]) =>
  renderShared(ui, { queryClient: createTestQueryClient() })

/**
 * Time is PINNED to the measurement date of the fixture (2026-08-26): the
 * default window's `until`, the future/past split of every fixture row and
 * the `since = tomorrow` of the viitoare view all derive from "today", and an
 * unpinned clock would silently rot the suite when 2027 arrives and the
 * 2027-01-05 fixture rows stop being future.
 */
const TODAY = '2026-08-26'
const TOMORROW = '2026-08-27'

describe('LegislationChangesFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-08-26T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('defaults to already-in-force events: until = today and nothing else', async () => {
    const { fetchRecentChangesPage, fetchRecentChangesCount } = await import(
      '../api/legal-changes-api'
    )
    render(<LegislationChangesFeed search={{}} />)
    await screen.findAllByRole('listitem')

    // `toEqual` pins the ABSENCE of since/kind/source/undated — and that no
    // `kinds`-shaped anything leaks: the window alone defines the default.
    expect(vi.mocked(fetchRecentChangesPage)).toHaveBeenCalledWith(
      { until: TODAY },
      expect.objectContaining({ first: 20 }),
    )
    expect(vi.mocked(fetchRecentChangesCount)).toHaveBeenCalledWith(
      { until: TODAY },
      expect.anything(),
    )
    // The fixture's future rows (2027-01-05) must NOT be in the default view…
    expect(screen.queryByText('Legea nr. 204/2006')).not.toBeInTheDocument()
    // …while the newest already-in-force one is.
    expect(screen.getByText('OUG nr. 92/2021')).toBeInTheDocument()
  })

  it('discloses the feed frontier before the list', async () => {
    render(<LegislationChangesFeed search={{}} />)

    // The staleness note is the tab's honesty contract: without it a reader
    // believes they are seeing this week's changes. Locale-formatted date, so
    // the year is asserted rather than the spelling.
    const note = screen.getByRole('note')
    expect(note).toHaveTextContent(/Cea mai recentă modificare/)
    expect(note).toHaveTextContent(/2026/)
    expect(note).toHaveTextContent(/acte deja publicate/)
    await screen.findAllByRole('listitem')
  })

  it('links both the affected act and the acting act on a row', async () => {
    render(<LegislationChangesFeed search={{}} />)
    await screen.findAllByRole('listitem')

    // Affected act (OUG nr. 92/2021, actId 121318) and the amending law that
    // changed it (Legea nr. 26/2026, actId 168745) each navigate to their
    // own act page — real production ids from the fixture.
    expect(
      screen.getByRole('link', { name: 'OUG nr. 92/2021' }),
    ).toHaveAttribute('href', '/legislation/acts/121318')
    expect(
      screen.getByRole('link', { name: 'Legea nr. 26/2026' }),
    ).toHaveAttribute('href', '/legislation/acts/168745')
    // The pipeline source is named on every row, never merged.
    expect(screen.getAllByText('Monitorul Oficial').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Portal Legislativ').length).toBeGreaterThan(0)
  })

  it('marks every future-dated row in the unbounded view instead of hiding them', async () => {
    const { fetchRecentChangesPage } = await import('../api/legal-changes-api')
    render(<LegislationChangesFeed search={{ view: 'toate' }} />)
    await screen.findAllByRole('listitem')

    // `toate` is the feed exactly as served — no window at all.
    expect(vi.mocked(fetchRecentChangesPage)).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ first: 20 }),
    )
    // Fixture: 7 rows dated after 2026-08-26 → each carries the forthcoming
    // marker; 3 already-in-force rows read as plain effect dates; the 2
    // undated rows say so rather than faking a date.
    expect(screen.getAllByText(/intră în vigoare la/)).toHaveLength(7)
    expect(screen.getAllByText(/cu efect de la/)).toHaveLength(3)
    expect(
      screen.getAllByText(/fără dată de intrare în vigoare/),
    ).toHaveLength(2)
  })

  it('serves the undated cohort via undatedOnly and NEVER sends it a window', async () => {
    const { fetchRecentChangesPage } = await import('../api/legal-changes-api')
    // A hand-edited URL carrying BOTH the view and a window: the server
    // rejects undatedOnly+since outright, so the component must resolve the
    // conflict (view wins) before anything reaches the wire.
    render(
      <LegislationChangesFeed
        search={{ view: 'nedatate', since: '2026-01-01' }}
      />,
    )
    await screen.findAllByRole('listitem')

    for (const [filter] of vi.mocked(fetchRecentChangesPage).mock.calls) {
      expect(filter).toEqual({ undated: true })
    }
    expect(
      screen.getAllByText(/fără dată de intrare în vigoare/),
    ).toHaveLength(2)
  })

  it('writes the cohort views to the URL, dropping any custom window', async () => {
    render(<LegislationChangesFeed search={{ since: '2026-01-01' }} />)
    await screen.findByLabelText(/Filtre/)

    fireEvent.click(screen.getByRole('button', { name: 'viitoare' }))
    expect(navigateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/legislation/changes',
        search: { view: 'viitoare' },
        replace: true,
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'deja în vigoare' }))
    // The default cohort is URL-absence, not a stored value.
    expect(navigateMock).toHaveBeenCalledWith(
      expect.objectContaining({ search: {} }),
    )
  })

  it('asks for tomorrow onward in the viitoare view', async () => {
    const { fetchRecentChangesPage } = await import('../api/legal-changes-api')
    render(<LegislationChangesFeed search={{ view: 'viitoare' }} />)
    await screen.findAllByRole('listitem')

    expect(vi.mocked(fetchRecentChangesPage)).toHaveBeenCalledWith(
      { since: TOMORROW },
      expect.objectContaining({ first: 20 }),
    )
  })

  it('reflects kind and source in the URL while keeping the cohort', async () => {
    render(<LegislationChangesFeed search={{ view: 'nedatate' }} />)
    await screen.findByLabelText(/Filtre/)

    fireEvent.change(screen.getByLabelText(/Felul modificării/), {
      target: { value: 'abrogare-totala' },
    })
    expect(navigateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        search: { view: 'nedatate', kind: 'abrogare-totala' },
        replace: true,
      }),
    )

    fireEvent.change(screen.getByLabelText(/Sursa/), {
      target: { value: 'monitorul-oficial' },
    })
    expect(navigateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        search: { view: 'nedatate', source: 'monitorul-oficial' },
      }),
    )
  })

  it('states the real count, and a real zero as zero', async () => {
    render(<LegislationChangesFeed search={{ view: 'toate' }} />)
    await screen.findAllByRole('listitem')
    // The whole fixture: 12 events.
    expect(await screen.findByText(/12 modificări înregistrate/)).toBeInTheDocument()

    vi.clearAllMocks()
    const { fetchRecentChangesCount } = await import('../api/legal-changes-api')
    const counted = vi.mocked(fetchRecentChangesCount)
    counted.mockResolvedValue(0)
    render(
      <LegislationChangesFeed search={{ view: 'toate', kind: 'suspendare' }} />,
    )
    // 0 is a served fact and renders as 0 — never as the unknown-count line.
    expect(await screen.findByText(/0 modificări înregistrate/)).toBeInTheDocument()
    expect(screen.queryByText(/cel puțin/)).not.toBeInTheDocument()
    counted.mockRestore()
  })

  it('renders a lower bound when the server cannot assert a count — never 0', async () => {
    const { fetchRecentChangesCount } = await import('../api/legal-changes-api')
    const counted = vi.mocked(fetchRecentChangesCount)
    counted.mockResolvedValue(null)

    render(<LegislationChangesFeed search={{}} />)
    await screen.findAllByRole('listitem')

    // Default window over the fixture serves 3 rows; the count is UNKNOWN,
    // which must read as a lower bound, not as a zero and not as a total.
    expect(
      await screen.findByText(/cel puțin 3 modificări — numărul total nu a răspuns/),
    ).toBeInTheDocument()
    expect(screen.queryByText(/^0 modificări/)).not.toBeInTheDocument()
    counted.mockRestore()
  })

  it('pages by cursor and stops when the cursor is exhausted', async () => {
    const { fetchRecentChangesPage } = await import('../api/legal-changes-api')
    const paged = vi.mocked(fetchRecentChangesPage)
    paged.mockResolvedValueOnce({
      items: [
        {
          eventId: '1',
          eventKind: 'modificare',
          effectiveDate: '2026-05-01',
          eventSource: 'portal',
          sourceAct: null,
          actId: '11',
          displayCitation: 'Legea nr. 1/2001',
          status: 'modificat',
        },
      ],
      endCursor: 'cursor-1',
    })
    paged.mockResolvedValueOnce({
      items: [
        {
          eventId: '2',
          eventKind: 'modificare',
          effectiveDate: '2026-04-01',
          eventSource: 'portal',
          sourceAct: null,
          actId: '22',
          displayCitation: 'Legea nr. 2/2002',
          status: 'modificat',
        },
      ],
      endCursor: null,
    })

    render(<LegislationChangesFeed search={{}} />)
    expect(await screen.findByText('Legea nr. 1/2001')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Încarcă mai multe/ }))
    expect(await screen.findByText('Legea nr. 2/2002')).toBeInTheDocument()
    // The second page resumed from the first page's cursor, same filter…
    expect(paged).toHaveBeenLastCalledWith(
      { until: TODAY },
      expect.objectContaining({ after: 'cursor-1' }),
    )
    // …the first page is still on screen, and the exhausted cursor removes
    // the control instead of offering a dead click.
    expect(screen.getByText('Legea nr. 1/2001')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Încarcă mai multe/ }),
    ).not.toBeInTheDocument()
    paged.mockRestore()
  })
})
