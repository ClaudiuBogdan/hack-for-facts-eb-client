import {
  render as renderShared,
  screen,
  fireEvent,
  createTestQueryClient,
} from '@/test/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { ReactNode } from 'react'
import { GAZETTE_LATEST_ISSUE_DATE } from '../lib/legal-coverage'
import { LegislationGazetteDirectory } from './legislation-gazette-directory'

const navigateMock = vi.fn()
// The real module delegates to the fixture lane (vitest pins legal to mock);
// wrapping the two fetchers in vi.fn keeps that behavior while letting tests
// assert call arguments and override the page source.
vi.mock('../api/legal-gazette-api', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('../api/legal-gazette-api')>()
  return {
    ...original,
    fetchGazetteIssuesPage: vi.fn(original.fetchGazetteIssuesPage),
    fetchGazetteIssueContents: vi.fn(original.fetchGazetteIssueContents),
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

/** The default year is the frozen frontier's year, never the clock's. */
const LATEST_YEAR = Number.parseInt(GAZETTE_LATEST_ISSUE_DATE.slice(0, 4), 10)

describe('LegislationGazetteDirectory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('discloses the frozen corpus frontier before the list', async () => {
    render(<LegislationGazetteDirectory search={{}} />)

    // The staleness note is the page's honesty contract: remove it and a
    // reader believes they are seeing today's gazette. The date inside it is
    // locale-formatted, so the year is asserted rather than the spelling.
    const note = screen.getByRole('note')
    expect(note).toHaveTextContent(/Cea mai recentă ediție din corpus/)
    expect(note).toHaveTextContent(String(LATEST_YEAR))
    expect(note).toHaveTextContent(/Preluarea edițiilor noi este oprită/)
    await screen.findAllByRole('listitem')
  })

  it('never claims gazette full text is available', async () => {
    render(<LegislationGazetteDirectory search={{}} />)
    await screen.findAllByRole('listitem')

    // `MoIssue` has no full-text flag: "PDF oficial disponibil" is the only
    // sayable claim, and rows without an e-Monitor link say less, not more.
    expect(screen.queryByText(/text disponibil/i)).not.toBeInTheDocument()
    expect(
      screen.getAllByText(/doar coordonate de publicare/).length,
    ).toBeGreaterThan(0)
    expect(
      screen.getAllByText(/PDF oficial disponibil/).length,
    ).toBeGreaterThan(0)
  })

  it('always supplies a year to the API, defaulting to the frontier year', async () => {
    const { fetchGazetteIssuesPage } = await import('../api/legal-gazette-api')
    render(<LegislationGazetteDirectory search={{}} />)
    await screen.findAllByRole('listitem')

    // `moIssues` REFUSES a year-less browse — every call must carry one.
    expect(vi.mocked(fetchGazetteIssuesPage)).toHaveBeenCalledWith(
      { year: LATEST_YEAR },
      expect.objectContaining({ page: 1 }),
    )
  })

  it('drops an out-of-corpus year from the URL to the default, not to the server', async () => {
    const { fetchGazetteIssuesPage } = await import('../api/legal-gazette-api')
    render(<LegislationGazetteDirectory search={{ year: 1200 }} />)
    await screen.findAllByRole('listitem')

    const calls = vi.mocked(fetchGazetteIssuesPage).mock.calls
    expect(calls.length).toBeGreaterThan(0)
    for (const [filter] of calls) {
      expect(filter.year).toBe(LATEST_YEAR)
    }
    // The select renders the effective year, so the UI and the query agree.
    expect(screen.getByLabelText(/Anul/)).toHaveValue(String(LATEST_YEAR))
  })

  it('writes filter changes to the URL and resets paging by omission', async () => {
    render(<LegislationGazetteDirectory search={{ page: 3 }} />)
    await screen.findByLabelText(/Filtre/)

    fireEvent.change(screen.getByLabelText(/Partea/), {
      target: { value: 'PII' },
    })
    expect(navigateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/legislation/gazette',
        search: { year: LATEST_YEAR, part: 'PII' },
        replace: true,
      }),
    )

    fireEvent.change(screen.getByLabelText(/Anul/), {
      target: { value: '2010' },
    })
    expect(navigateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        search: { year: 2010 },
        replace: true,
      }),
    )
  })

  it('says a past-the-end page does not exist instead of "the year is empty"', async () => {
    const { fetchGazetteIssuesPage } = await import('../api/legal-gazette-api')
    const paged = vi.mocked(fetchGazetteIssuesPage)
    // Verified live: beyond the last page the server answers `total: 0` with
    // empty edges — that 0 must not be read as the year's real total.
    paged.mockResolvedValue({ items: [], total: 0, hasNextPage: false })

    render(<LegislationGazetteDirectory search={{ page: 99 }} />)

    expect(
      await screen.findByText(/Această pagină nu există pentru filtrele alese/),
    ).toBeInTheDocument()
    expect(screen.queryByText(/ediții în/)).not.toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: /Înapoi la prima pagină/ }),
    )
    expect(navigateMock).toHaveBeenCalledWith(
      expect.objectContaining({ search: { year: LATEST_YEAR } }),
    )

    paged.mockRestore()
  })

  it('offers the contents expansion only where an archive index exists', async () => {
    render(<LegislationGazetteDirectory search={{}} />)
    await screen.findAllByRole('listitem')

    // Fixture: three PI issues carry an archive index; the PII and PIV rows
    // do not, and say so instead of offering a dead toggle.
    expect(
      screen.getAllByRole('button', { name: /arată cuprinsul/ }),
    ).toHaveLength(3)
    expect(screen.getAllByText(/fără cuprins în arhivă/).length).toBe(2)
  })

  it('fetches an issue contents on expansion, one round-trip per click', async () => {
    const { fetchGazetteIssueContents } = await import(
      '../api/legal-gazette-api'
    )
    render(<LegislationGazetteDirectory search={{}} />)
    const toggles = await screen.findAllByRole('button', {
      name: /arată cuprinsul/,
    })

    fireEvent.click(toggles[0])
    expect(await screen.findByText(/Christophori/)).toBeInTheDocument()
    expect(vi.mocked(fetchGazetteIssueContents)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(fetchGazetteIssueContents)).toHaveBeenCalledWith(
      '621458',
      expect.anything(),
    )
  })

  it('states an empty archive index instead of rendering a blank panel', async () => {
    render(<LegislationGazetteDirectory search={{}} />)
    const toggles = await screen.findAllByRole('button', {
      name: /arată cuprinsul/,
    })

    // Issue 565 has an archive index but no fixture contents.
    fireEvent.click(toggles[1])
    expect(
      await screen.findByText(/Nicio publicație înregistrată/),
    ).toBeInTheDocument()
  })

  it('shows honest numbered paging with both controls disabled on one page', async () => {
    render(<LegislationGazetteDirectory search={{}} />)
    await screen.findAllByRole('listitem')

    expect(screen.getByText(/pagina 1 din 1/)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Pagina anterioară/ }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: /Pagina următoare/ }),
    ).toBeDisabled()
  })
})
