import {
  render as renderShared,
  screen,
  fireEvent,
  createTestQueryClient,
} from '@/test/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { ReactNode } from 'react'
import { LegislationActFinder } from './legislation-act-finder'

const navigateMock = vi.fn()
// The real modules delegate to the fixture lanes (vitest pins legal to mock);
// wrapping the fetchers in vi.fn keeps that while letting tests assert the
// REQUEST each render builds and override a lane.
vi.mock('../api/legal-search-api', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('../api/legal-search-api')>()
  return {
    ...original,
    fetchLegalSearch: vi.fn(original.fetchLegalSearch),
  }
})
vi.mock('../api/legal-resolve-api', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('../api/legal-resolve-api')>()
  return {
    ...original,
    resolveLegalActs: vi.fn(original.resolveLegalActs),
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

describe('LegislationActFinder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('states what works AND what does not before any query is typed', async () => {
    const { fetchLegalSearch } = await import('../api/legal-search-api')
    render(<LegislationActFinder search={{}} />)

    // The landing state pre-states the limitation — better than only
    // admitting it after a failed search.
    expect(screen.getByText(/Ce poți căuta/)).toBeInTheDocument()
    const note = screen.getByRole('note')
    expect(note).toHaveTextContent(/nu este încă disponibilă/)
    expect(note).toHaveTextContent(/nu înseamnă că prevederea nu există/)
    // No query — no request.
    expect(vi.mocked(fetchLegalSearch)).not.toHaveBeenCalled()
  })

  it('answers an exact citation with one act card and an exhaustive count', async () => {
    render(<LegislationActFinder search={{ q: 'Legea 53/2003' }} />)

    expect(
      await screen.findByRole('link', { name: 'Legea nr. 53/2003' }),
    ).toHaveAttribute('href', '/legislation/acts/30412')
    expect(screen.getByText('Modificat')).toBeInTheDocument()
    // The citation shortcut is exact: actsTotal 1, totalsExhaustive true.
    expect(screen.getByText('o potrivire')).toBeInTheDocument()
    // Not degraded — the results-mode semantic note must NOT show here.
    expect(
      screen.queryByText(/Potriviri după numărul și denumirea actelor/),
    ).not.toBeInTheDocument()
  })

  it('renders every server caveat VERBATIM and names the engine', async () => {
    render(<LegislationActFinder search={{ q: 'codul muncii' }} />)

    await screen.findByRole('link', { name: 'Legea nr. 53/2003' })
    // The published-form caveat is the server's own wording, surfaced
    // unchanged — never paraphrased.
    expect(
      screen.getByText(
        'Textele și rezumatele servite sunt versiunile publicate ale actelor și nu garantează forma consolidată curentă — verificați forma în vigoare pe legislatie.just.ro.',
      ),
    ).toBeInTheDocument()
    // The per-act status caveat too (byte-format from the server).
    expect(
      screen.getByText(
        'Legea nr. 53/2003: status modificat — verificați versiunea în vigoare.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText(/motor de căutare: postgres/)).toBeInTheDocument()
  })

  it('reports an unknown total as unknown — never as 0', async () => {
    render(<LegislationActFinder search={{ q: 'codul muncii' }} />)

    // The Postgres path cannot count (actsTotal null): the line says so.
    expect(
      await screen.findByText(
        /o potrivire afișată — numărul total nu este cunoscut/,
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/^0 /)).not.toBeInTheDocument()
    // Degraded lexical answer: the results-mode honesty note is present.
    expect(
      screen.getByText(/Căutarea în textul legilor nu este încă disponibilă/),
    ).toBeInTheDocument()
  })

  it('tells a phrase query the corpus is not searchable by phrase — not a bare empty state', async () => {
    render(<LegislationActFinder search={{ q: 'concediu de odihna' }} />)

    // THE honesty message: the law's absence from the results is not
    // evidence about the law.
    const note = await screen.findByRole('note')
    expect(note).toHaveTextContent(
      /Nu am găsit niciun act pentru „concediu de odihna” — dar asta nu înseamnă că prevederea nu există în legislație/,
    )
    expect(note).toHaveTextContent(
      /Căutarea după expresii din textul legilor — cum ar fi „concediu de odihnă” — nu este încă disponibilă/,
    )
    // It teaches the shapes that DO work…
    expect(note).toHaveTextContent(/Legea 53\/2003/)
    expect(note).toHaveTextContent(/Codul muncii/)
    // …offers the historical widening…
    expect(
      screen.getByRole('button', {
        name: /Caută și în actele abrogate sau ieșite din vigoare/,
      }),
    ).toBeInTheDocument()
    // …and never shows the citation-miss wording for a phrase.
    expect(
      screen.queryByText(/Niciun act găsit pentru citarea/),
    ).not.toBeInTheDocument()
  })

  it('presents a two-act name as a choice, never silently picking one', async () => {
    render(<LegislationActFinder search={{ q: 'codul fiscal' }} />)

    // `legalResolve` returns BOTH fiscal codes; the strip lists both as
    // links and asks the reader to choose.
    expect(
      await screen.findByText(/corespunde mai multor acte — alege actul/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /Legea nr. 227\/2015 \(Codul fiscal\)/ }),
    ).toHaveAttribute('href', '/legislation/acts/66150')
    expect(
      screen.getByRole('link', { name: /Codul fiscal din 2003 \(abrogat\)/ }),
    ).toHaveAttribute('href', '/legislation/acts/187041')
  })

  it('says so when a citation finds nothing, and offers the historical widening', async () => {
    render(<LegislationActFinder search={{ q: 'Legea 9999/2020' }} />)

    expect(
      await screen.findByText(/Niciun act găsit pentru citarea „Legea 9999\/2020”/),
    ).toBeInTheDocument()
    // A repealed act is the LIKELIEST reason a citation zeroes out — the
    // retry is one click, carrying the same query.
    fireEvent.click(
      screen.getByRole('button', {
        name: /Caută și în actele abrogate sau ieșite din vigoare/,
      }),
    )
    expect(navigateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/legislation/search',
        search: { q: 'Legea 9999/2020', historical: true },
      }),
    )
  })

  it('widens to historical acts when the URL says so', async () => {
    const { fetchLegalSearch } = await import('../api/legal-search-api')
    render(
      <LegislationActFinder
        search={{ q: 'legea 571/2003', historical: true }}
      />,
    )

    // The repealed 2003 fiscal code is served ONLY under the widening.
    expect(
      await screen.findByRole('link', {
        name: 'CODUL FISCAL din 22 decembrie 2003',
      }),
    ).toHaveAttribute('href', '/legislation/acts/187041')
    expect(vi.mocked(fetchLegalSearch)).toHaveBeenCalledWith(
      'legea 571/2003',
      expect.objectContaining({ historical: true }),
    )
  })

  it('submits the typed query to the URL', async () => {
    render(<LegislationActFinder search={{}} />)

    fireEvent.change(
      screen.getByRole('textbox', { name: /Caută în legislație/ }),
      { target: { value: '  codul muncii  ' } },
    )
    fireEvent.submit(screen.getByRole('form', { name: /Caută în legislație/ }))

    expect(navigateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/legislation/search',
        search: { q: 'codul muncii' },
      }),
    )
  })

  it('runs an example chip as a search', async () => {
    render(<LegislationActFinder search={{}} />)

    fireEvent.click(screen.getByRole('button', { name: 'Legea 53/2003' }))

    expect(navigateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/legislation/search',
        search: { q: 'Legea 53/2003' },
      }),
    )
  })
})
