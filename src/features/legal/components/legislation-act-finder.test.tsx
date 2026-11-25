import { act, createTestQueryClient, fireEvent, render as renderShared, screen, within } from '@/test/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import type { LegalSearchResultData } from '@/schemas/legal'
import { LegislationActFinder } from './legislation-act-finder'

const navigateMock = vi.fn()
// The real modules delegate to the fixture lanes (vitest pins legal to mock); wrapping the fetchers in vi.fn keeps
// that while letting tests assert the REQUEST each render builds and override a lane.
vi.mock('../api/legal-search-api', async (importOriginal) => {
  const original = await importOriginal<typeof import('../api/legal-search-api')>()
  return { ...original, fetchLegalSearch: vi.fn(original.fetchLegalSearch) }
})
vi.mock('../api/legal-resolve-api', async (importOriginal) => {
  const original = await importOriginal<typeof import('../api/legal-resolve-api')>()
  return { ...original, resolveLegalActs: vi.fn(original.resolveLegalActs) }
})
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params }: { readonly children: ReactNode; readonly to: string; readonly params?: Record<string, string> }) => (
    <a href={params?.actId ? to.replace('$actId', params.actId) : to}>{children}</a>
  ),
  useNavigate: () => navigateMock,
}))

const render = (ui: Parameters<typeof renderShared>[0]) => renderShared(ui, { queryClient: createTestQueryClient() })

/** Every filter key, absent: what a navigation without filters carries (the router merges, so each key is named). */
const NO_KEYS = { historical: undefined, stare: undefined, tip: undefined, an: undefined, domeniu: undefined, categorie: undefined, sanctiuni: undefined }

/** The notes behind the results' ⓘ: the engine, the caveats verbatim, what was and was not searched. */
async function openNotes() {
  fireEvent.click(await screen.findByRole('button', { name: 'Cum se caută' }))
  return screen.findByRole('dialog', { name: 'Cum se caută' })
}

describe('LegislationActFinder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('states what it finds, and keeps what it does not behind the ⓘ, before any query', async () => {
    const { fetchLegalSearch } = await import('../api/legal-search-api')
    render(<LegislationActFinder search={{}} />)

    expect(screen.getByRole('heading', { name: 'Ce găsești aici' })).toBeInTheDocument()
    expect(screen.getByText('Un act după numărul lui')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ce nu găsești încă' }))
    const note = await screen.findByRole('dialog', { name: 'Ce nu găsești încă' })
    expect(note).toHaveTextContent(/nu este încă disponibilă/)
    expect(note).toHaveTextContent(/nu înseamnă că prevederea nu există/)
    // No query, no request.
    expect(vi.mocked(fetchLegalSearch)).not.toHaveBeenCalled()
  })

  it('answers an exact citation with one act and an exhaustive count', async () => {
    render(<LegislationActFinder search={{ q: 'Legea 53/2003' }} />)

    expect(await screen.findByRole('link', { name: 'Legea nr. 53/2003' })).toHaveAttribute('href', '/legislation/acts/30412')
    expect(screen.getByText('Modificat')).toBeInTheDocument()
    // The citation shortcut is exact: actsTotal 1, totalsExhaustive true.
    expect(screen.getByRole('heading', { name: 'O potrivire' })).toBeInTheDocument()
    // No sentinel on this answer: the notes make no claim about meaning or text search.
    const notes = await openNotes()
    expect(notes).not.toHaveTextContent(/Potriviri după numărul și denumirea actelor/)
  })

  it('shows every server caveat VERBATIM and names the engine', async () => {
    render(<LegislationActFinder search={{ q: 'codul muncii' }} />)

    await screen.findByRole('link', { name: 'Legea nr. 53/2003' })
    const notes = await openNotes()
    // The published-form caveat is the server's own wording, unchanged.
    expect(
      within(notes).getByText(
        'Textele și rezumatele servite sunt versiunile publicate ale actelor și nu garantează forma consolidată curentă — verificați forma în vigoare pe legislatie.just.ro.',
      ),
    ).toBeInTheDocument()
    expect(within(notes).getByText('Legea nr. 53/2003: status modificat — verificați versiunea în vigoare.')).toBeInTheDocument()
    expect(notes).toHaveTextContent(/Motor de căutare: postgres/)
  })

  it('says an unknown total is unknown, never 0, and a degraded answer in the open', async () => {
    render(<LegislationActFinder search={{ q: 'codul muncii' }} />)

    // The Postgres path cannot count (actsTotal null).
    expect(await screen.findByRole('heading', { name: 'O potrivire afișată' })).toBeInTheDocument()
    expect(screen.queryByText(/^0 /)).not.toBeInTheDocument()
    // The mock's lexical answer is degraded: said where the results are read.
    expect(screen.getByText('Răspuns parțial: o parte din căutare nu a rulat.')).toBeInTheDocument()
    const notes = await openNotes()
    expect(notes).toHaveTextContent(/Numărul total de potriviri nu este cunoscut/)
    expect(notes).toHaveTextContent(/Căutarea în textul legilor nu este încă disponibilă/)
  })

  it('tells a phrase query the corpus is not searchable by phrase, not a bare empty state', async () => {
    render(<LegislationActFinder search={{ q: 'concediu de odihna' }} />)

    // THE honesty message: the law's absence from the results is not evidence about the law.
    const heading = await screen.findByRole('heading', { name: /Niciun act pentru „concediu de odihna", dar asta nu înseamnă că prevederea nu există/ })
    const section = heading.closest('section') as HTMLElement
    expect(section).toHaveTextContent(/Căutarea după expresii din textul legilor, cum ar fi „concediu de odihnă", nu este încă disponibilă/)
    // It teaches the shapes that DO work…
    expect(section).toHaveTextContent(/Legea 53\/2003/)
    expect(section).toHaveTextContent(/Codul muncii/)
    // …offers the historical widening…
    expect(screen.getByRole('button', { name: /Caută și în actele abrogate sau ieșite din vigoare/ })).toBeInTheDocument()
    // …and never shows the citation-miss wording for a phrase.
    expect(screen.queryByText(/Niciun act găsit pentru citarea/)).not.toBeInTheDocument()
  })

  it('presents a two-act name as a choice, never silently picking one', async () => {
    render(<LegislationActFinder search={{ q: 'codul fiscal' }} />)

    // `legalResolve` returns BOTH fiscal codes; the card lists both and asks the reader to choose.
    expect(await screen.findByRole('heading', { name: 'Mai multe acte poartă acest nume: alege actul' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Legea nr. 227\/2015 \(Codul fiscal\)/ })).toHaveAttribute('href', '/legislation/acts/66150')
    expect(screen.getByRole('link', { name: /Codul fiscal din 2003 \(abrogat\)/ })).toHaveAttribute('href', '/legislation/acts/187041')
  })

  it('says so when a citation finds nothing, and offers the historical widening', async () => {
    render(<LegislationActFinder search={{ q: 'Legea 9999/2020' }} />)

    expect(await screen.findByRole('heading', { name: 'Niciun act găsit pentru citarea „Legea 9999/2020"' })).toBeInTheDocument()
    // A repealed act is the likeliest reason a citation zeroes out: the retry is one click, with the same query.
    fireEvent.click(screen.getByRole('button', { name: /Caută și în actele abrogate sau ieșite din vigoare/ }))
    expect(navigateMock).toHaveBeenCalledWith(expect.objectContaining({ to: '/legislation/search', search: { q: 'Legea 9999/2020', ...NO_KEYS, historical: true } }))
  })

  it('widens to historical acts when the address says so (the old link)', async () => {
    const { fetchLegalSearch } = await import('../api/legal-search-api')
    render(<LegislationActFinder search={{ q: 'legea 571/2003', historical: true }} />)

    // The repealed 2003 fiscal code is served ONLY under the widening.
    expect(await screen.findByRole('link', { name: 'CODUL FISCAL din 22 decembrie 2003' })).toHaveAttribute('href', '/legislation/acts/187041')
    expect(vi.mocked(fetchLegalSearch)).toHaveBeenCalledWith('legea 571/2003', expect.objectContaining({ historical: true }))
    // The widening reads as a filter the reader can remove.
    expect(within(screen.getByRole('group', { name: 'Filtre active' })).getByText('Și actele abrogate')).toBeInTheDocument()
  })

  it('submits the typed query to the address at once on Enter', async () => {
    render(<LegislationActFinder search={{}} />)

    fireEvent.change(screen.getByRole('textbox', { name: /Caută în legislație/ }), { target: { value: '  codul muncii  ' } })
    fireEvent.submit(screen.getByRole('search', { name: /Caută în legislație/ }))

    expect(navigateMock).toHaveBeenCalledWith(expect.objectContaining({ to: '/legislation/search', search: { q: 'codul muncii', ...NO_KEYS }, replace: true }))
  })

  it('searches as the reader types, once they pause, from three letters', async () => {
    vi.useFakeTimers()
    render(<LegislationActFinder search={{}} />)
    const box = screen.getByRole('textbox', { name: /Caută în legislație/ })

    fireEvent.change(box, { target: { value: 'HG' } })
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    // Two letters wait for Enter.
    expect(navigateMock).not.toHaveBeenCalled()

    fireEvent.change(box, { target: { value: 'cod' } })
    fireEvent.change(box, { target: { value: 'codul m' } })
    act(() => {
      vi.advanceTimersByTime(299)
    })
    expect(navigateMock).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(1)
    })
    // One search for the pause, the history entry replaced.
    expect(navigateMock).toHaveBeenCalledTimes(1)
    expect(navigateMock).toHaveBeenCalledWith(expect.objectContaining({ search: { q: 'codul m', ...NO_KEYS }, replace: true }))
  })

  it('runs an example as a search', async () => {
    render(<LegislationActFinder search={{}} />)

    fireEvent.click(within(screen.getByRole('navigation', { name: 'Exemple' })).getByRole('button', { name: 'Legea 53/2003' }))
    expect(navigateMock).toHaveBeenCalledWith(expect.objectContaining({ to: '/legislation/search', search: { q: 'Legea 53/2003', ...NO_KEYS } }))
  })

  it('reads the filters from the address into the search and shows them as removable chips', async () => {
    const { fetchLegalSearch } = await import('../api/legal-search-api')
    render(<LegislationActFinder search={{ q: 'codul muncii', tip: 'lege', stare: 'in-vigoare', an: '2015-', domeniu: 'munca-si-protectie-sociala' }} />)

    await screen.findByRole('group', { name: 'Filtre active' })
    expect(vi.mocked(fetchLegalSearch)).toHaveBeenCalledWith(
      'codul muncii',
      expect.objectContaining({
        historical: true,
        filter: { actType: ['lege'], status: ['in-vigoare'], yearFrom: 2015, domain: ['munca-si-protectie-sociala'] },
      }),
    )
    const chips = screen.getByRole('group', { name: 'Filtre active' })
    expect(chips).toHaveTextContent('Lege')
    expect(chips).toHaveTextContent('În vigoare')
    expect(chips).toHaveTextContent('din 2015')
    // A summary-based filter says what it leaves out.
    expect(screen.getByText('Cu domeniul, categoria sau sancțiunile, actele fără rezumat nu apar.')).toBeInTheDocument()
    // The button counts them; removing one keeps the query and the others.
    expect(screen.getByRole('button', { name: 'Filtre, 4 active' })).toBeInTheDocument()
    fireEvent.click(within(chips).getByRole('button', { name: 'Scoate Lege' }))
    expect(navigateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        search: { q: 'codul muncii', ...NO_KEYS, stare: 'in-vigoare', an: '2015-', domeniu: 'munca-si-protectie-sociala' },
        replace: false,
        resetScroll: false,
      }),
    )
  })

  describe('on the legal-v2 OpenSearch engine', () => {
    /** The v2 engine's answer shape (server core/v2/search.ts). */
    const v2Answer = (acts: LegalSearchResultData['acts'], sections: LegalSearchResultData['sections'] = []): LegalSearchResultData => ({
      acts,
      sections,
      caveats: ['semantic search unavailable', 'Formele consolidate sunt neoficiale, cu caracter informativ; textul unui act nu este „textul în vigoare la o dată”.'],
      engine: 'opensearch',
      actsTotal: null,
      totalsExhaustive: false,
      degraded: false,
      asOf: '2026-11-18T00:00:00Z',
      unhydratedHits: 0,
    })
    const hit: LegalSearchResultData['acts'][number] = {
      score: 1,
      act: { actId: '900002', displayCitation: 'Hotărârea nr. 206/1996', actType: 'hotarare', actNumber: '206', actYear: 1996, issuerSlug: 'guvernul', status: null, inDegree: null },
      description: null,
      name: null,
    }

    it('shows the consolidation caveat verbatim, an unknown total, and claims only meaning search is missing', async () => {
      const { fetchLegalSearch } = await import('../api/legal-search-api')
      vi.mocked(fetchLegalSearch).mockResolvedValueOnce(v2Answer([hit]))
      render(<LegislationActFinder search={{ q: 'renunțare cetățenie' }} />)

      await screen.findByRole('link', { name: 'Hotărârea nr. 206/1996' })
      expect(screen.getByRole('heading', { name: 'O potrivire afișată' })).toBeInTheDocument()
      // Not degraded: nothing said in the open.
      expect(screen.queryByText(/Răspuns parțial/)).not.toBeInTheDocument()
      const notes = await openNotes()
      expect(within(notes).getByText(/Formele consolidate sunt neoficiale/)).toBeInTheDocument()
      expect(notes).toHaveTextContent(/Potriviri după cuvintele din numele, titlul și textul actelor/)
      expect(notes).not.toHaveTextContent(/Căutarea în textul legilor nu este încă disponibilă/)
      // A null status shows no badge, a null in-degree no „citat de".
      expect(screen.queryByText('Necunoscut')).not.toBeInTheDocument()
      expect(screen.queryByText(/citat de/)).not.toBeInTheDocument()
    })

    it('names a bare „Doc nr." act by the Portal name, and leaves out its „Doc" kind', async () => {
      const { fetchLegalSearch } = await import('../api/legal-search-api')
      vi.mocked(fetchLegalSearch).mockResolvedValueOnce(
        v2Answer([{ ...hit, act: { ...hit.act, actId: '230508', displayCitation: 'Doc nr. 96765', actType: 'doc', actYear: null, issuerSlug: null }, name: 'AMENDAMENTE din 8 decembrie 2006' }]),
      )
      render(<LegislationActFinder search={{ q: 'codul lsa' }} />)

      const link = await screen.findByRole('link', { name: 'Amendamente din 8 decembrie 2006' })
      expect(link).toHaveAttribute('href', '/legislation/acts/230508')
      expect(screen.queryByText('Doc')).not.toBeInTheDocument()
    })

    it('quotes a verified provision hit and labels one from a consolidation (LEG-X3AV)', async () => {
      const { fetchLegalSearch } = await import('../api/legal-search-api')
      vi.mocked(fetchLegalSearch).mockResolvedValueOnce(
        v2Answer(
          [hit],
          [
            {
              actId: '900002',
              documentId: 'f900012',
              nodeLabel: 'Articol unic',
              snippet: 'Se aprobă <em>renunțarea</em> la <b>cetățenia</b> română',
              servedForm: { documentId: 'f900012', versionKind: 'consolidare', caveat: 'unofficial_consolidation', portalLabelRaw: null, portalLabelDate: '2024-03-12' },
            },
            {
              actId: '900002',
              documentId: 'f900011',
              nodeLabel: null,
              snippet: 'renunțarea din forma publicată',
              servedForm: { documentId: 'f900011', versionKind: 'original', caveat: null },
            },
          ],
        ),
      )
      render(<LegislationActFinder search={{ q: 'renunțare cetățenie' }} />)

      await screen.findByRole('link', { name: 'Hotărârea nr. 206/1996' })
      // The matched word is marked; any other tag is text, never HTML.
      expect(screen.getByText('renunțarea').tagName).toBe('MARK')
      expect(screen.getByText(/<b>cetățenia<\/b>/)).toBeInTheDocument()
      // Exactly one hit, the consolidation's, carries the label.
      const labels = screen.getAllByText(/Dintr-o formă consolidată neoficială/)
      expect(labels).toHaveLength(1)
      expect(labels[0]).toHaveTextContent(/Portalul Legislativ indică „consolidarea din .*2024/)
    })

    it('does not deny text search when a words query finds nothing', async () => {
      const { fetchLegalSearch } = await import('../api/legal-search-api')
      vi.mocked(fetchLegalSearch).mockResolvedValueOnce(v2Answer([]))
      render(<LegislationActFinder search={{ q: 'concediu de odihna' }} />)

      const heading = await screen.findByRole('heading', { name: /Niciun act pentru „concediu de odihna"/ })
      const section = heading.closest('section') as HTMLElement
      expect(section).toHaveTextContent(/Am căutat cuvintele în numele, titlul și textul actelor/)
      expect(section).not.toHaveTextContent(/nu este încă disponibilă/)
    })
  })
})
