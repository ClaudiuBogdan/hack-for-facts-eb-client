import { act, createTestQueryClient, fireEvent, render as renderShared, screen, waitFor, within } from '@/test/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { renderToString } from 'react-dom/server'
import { QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
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
  Link: ({ children, to, params, search }: { readonly children: ReactNode; readonly to: string; readonly params?: Record<string, string>; readonly search?: Record<string, string> }) => (
    <a href={`${params?.actId ? to.replace('$actId', params.actId) : to}${search ? `?${new URLSearchParams(search).toString()}` : ''}`}>{children}</a>
  ),
  useNavigate: () => navigateMock,
}))

const render = (ui: Parameters<typeof renderShared>[0]) => renderShared(ui, { queryClient: createTestQueryClient() })

/** Every filter key, absent: what a navigation without filters carries (the router merges, so each key is named). */
const NO_KEYS = { historical: undefined, stare: undefined, tip: undefined, an: undefined, domeniu: undefined, categorie: undefined, sanctiuni: undefined }

/** The query navigation's search: an updater over the address as the router holds it, applied here to `address`. */
function sentSearch(call: number, address: Record<string, unknown> = {}): unknown {
  const options = navigateMock.mock.calls[call]?.[0] as { readonly search: (previous: Record<string, unknown>) => unknown }
  expect(typeof options.search).toBe('function')
  return options.search(address)
}

/** The notes behind the results' ⓘ: the engine, the caveats verbatim, what was and was not searched. */
async function openNotes() {
  fireEvent.click(await screen.findByRole('button', { name: 'Cum se caută' }))
  return screen.findByRole('dialog', { name: 'Cum se caută' })
}

/** A Postgres-path answer (the mock lane's shape) holding the given acts. */
const answer = (acts: LegalSearchResultData['acts']): LegalSearchResultData => ({
  acts,
  sections: [],
  caveats: [],
  engine: 'postgres',
  actsTotal: acts.length,
  totalsExhaustive: true,
  degraded: false,
  asOf: null,
  unhydratedHits: 0,
})
const actHit = (actId: string, displayCitation: string, actType: string, issuerSlug: string): LegalSearchResultData['acts'][number] => ({
  score: 1,
  act: { actId, displayCitation, actType, actNumber: '53', actYear: 2003, issuerSlug, status: 'in-vigoare', inDegree: null },
  description: null,
  name: null,
})

describe('LegislationActFinder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows three ways to ask, and keeps what it does not find behind the ⓘ, before any query', async () => {
    const { fetchLegalSearch } = await import('../api/legal-search-api')
    render(<LegislationActFinder search={{}} />)

    const ways = screen.getByRole('region', { name: 'Ce poți căuta' })
    for (const title of ['După număr', 'După nume', 'După cuvinte din text']) expect(within(ways).getByText(title)).toBeInTheDocument()
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
    // What was searched is said beside the count.
    expect(screen.getByText('după numărul și denumirea actelor')).toBeInTheDocument()
    // No sentinel on this answer: the notes make no claim about meaning or text search.
    const notes = await openNotes()
    expect(notes).not.toHaveTextContent(/Potriviri după numărul și denumirea actelor/)
  })

  describe('the act a citation names (round 2)', () => {
    const LAW = { kind: 'act', value: '30412', label: 'Legea nr. 53/2003', score: 1, hint: 'modificat' } as const

    it('answers with that act in a card, before any list, when the resolver names exactly one', async () => {
      const { resolveLegalActs } = await import('../api/legal-resolve-api')
      vi.mocked(resolveLegalActs).mockResolvedValueOnce([LAW])
      render(<LegislationActFinder search={{ q: 'Legea 53/2003' }} />)

      const card = (await screen.findByRole('heading', { name: 'Legea nr. 53/2003' })).closest('section') as HTMLElement
      expect(card).toHaveTextContent('Actul cu acest număr')
      expect(within(card).getByText('Modificat')).toBeInTheDocument()
      expect(within(card).getByRole('link', { name: 'Deschide actul' })).toHaveAttribute('href', '/legislation/acts/30412')
      // the act is the whole answer: no list repeats it, and how it was searched stays one press away
      expect(screen.queryByRole('list', { name: 'Rezultate' })).not.toBeInTheDocument()
      expect(await openNotes()).toHaveTextContent(/Motor de căutare: postgres/)
    })

    it('shows the act the status gate hid, from the resolver alone', async () => {
      const { resolveLegalActs } = await import('../api/legal-resolve-api')
      vi.mocked(resolveLegalActs).mockResolvedValueOnce([{ ...LAW, value: '777', label: 'Legea nr. 9999/2020', hint: 'abrogat' }])
      render(<LegislationActFinder search={{ q: 'Legea 9999/2020' }} />)

      const card = (await screen.findByRole('heading', { name: 'Legea nr. 9999/2020' })).closest('section') as HTMLElement
      expect(within(card).getByText('Abrogat')).toBeInTheDocument()
      // the search itself found nothing, and says the act above came from its number
      expect(screen.getByText(/Căutarea directă nu a găsit nimic: actele de mai sus sunt potriviri după denumirea sau numărul actului/)).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: /Niciun act găsit/ })).not.toBeInTheDocument()
    })

    /** The clock moved by hand, promises settled on the way: the answers land, the one-second wait is ours to end. */
    const pass = (ms: number) =>
      act(async () => {
        await vi.advanceTimersByTimeAsync(ms)
      })

    it('waits for the resolver at most a second, then draws the list without it', async () => {
      vi.useFakeTimers()
      const { resolveLegalActs } = await import('../api/legal-resolve-api')
      vi.mocked(resolveLegalActs).mockImplementationOnce(() => new Promise(() => {}))
      render(<LegislationActFinder search={{ q: 'Legea 53/2003' }} />)

      // the search has answered, the resolver has not: the act is not drawn as a row it may have to leave
      await pass(999)
      expect(screen.getByRole('region', { name: 'Se caută' })).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Legea nr. 53/2003' })).not.toBeInTheDocument()
      await pass(1)
      expect(screen.getByRole('link', { name: 'Legea nr. 53/2003' })).toBeInTheDocument()
    })

    it('does not wait for the resolver when the question is not a citation', async () => {
      vi.useFakeTimers()
      const { resolveLegalActs } = await import('../api/legal-resolve-api')
      vi.mocked(resolveLegalActs).mockImplementationOnce(() => new Promise(() => {}))
      render(<LegislationActFinder search={{ q: 'codul muncii' }} />)
      await pass(100)
      expect(screen.getByRole('link', { name: 'Legea nr. 53/2003' })).toBeInTheDocument()
    })

    it('leads with no act when the resolver names several the list already holds, and says how to tell them apart', async () => {
      const { resolveLegalActs } = await import('../api/legal-resolve-api')
      const { fetchLegalSearch } = await import('../api/legal-search-api')
      // two acts under one citation, both in the list
      const other = { ...LAW, value: '30499', label: 'Decizia nr. 53/2003' }
      vi.mocked(resolveLegalActs).mockResolvedValueOnce([LAW, other])
      vi.mocked(fetchLegalSearch).mockResolvedValueOnce(
        answer([actHit('30412', 'Legea nr. 53/2003', 'lege', 'parlamentul'), actHit('30499', 'Decizia nr. 53/2003', 'decizie', 'curtea-constitutionala')]),
      )
      render(<LegislationActFinder search={{ q: 'Legea 53/2003' }} />)

      expect(await screen.findByText('Mai multe acte poartă acest număr: emitentul le deosebește.')).toBeInTheDocument()
      expect(screen.queryByText('Actul cu acest număr')).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Deschide actul' })).not.toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: /alege actul/ })).not.toBeInTheDocument()
      const list = screen.getByRole('list', { name: 'Rezultate' })
      expect(within(list).getAllByRole('link').map((link) => link.textContent)).toEqual(['Legea nr. 53/2003', 'Decizia nr. 53/2003'])
    })

    it('gives a name’s one candidate no card: names keep the engine’s order (astra-client-11)', async () => {
      const { resolveLegalActs } = await import('../api/legal-resolve-api')
      const { fetchLegalSearch } = await import('../api/legal-search-api')
      // the resolver matched the name by a substring, and names the second act of the list
      vi.mocked(resolveLegalActs).mockResolvedValueOnce([{ ...LAW, value: '30499', label: 'Decizia nr. 53/2003' }])
      vi.mocked(fetchLegalSearch).mockResolvedValueOnce(
        answer([actHit('30412', 'Legea nr. 53/2003', 'lege', 'parlamentul'), actHit('30499', 'Decizia nr. 53/2003', 'decizie', 'curtea-constitutionala')]),
      )
      render(<LegislationActFinder search={{ q: 'codul muncii' }} />)

      const list = await screen.findByRole('list', { name: 'Rezultate' })
      expect(within(list).getAllByRole('link').map((link) => link.textContent)).toEqual(['Legea nr. 53/2003', 'Decizia nr. 53/2003'])
      expect(screen.queryByText('Actul cu acest număr')).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Deschide actul' })).not.toBeInTheDocument()
    })

    it('gives no card to a candidate that does not carry the citation’s number and year', async () => {
      const { resolveLegalActs } = await import('../api/legal-resolve-api')
      vi.mocked(resolveLegalActs).mockResolvedValueOnce([{ ...LAW, value: '777', label: 'Legea nr. 530/2003' }])
      render(<LegislationActFinder search={{ q: 'Legea 53/2003' }} />)

      expect(await screen.findByRole('link', { name: 'Legea nr. 53/2003' })).toBeInTheDocument()
      expect(screen.queryByText('Actul cu acest număr')).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Deschide actul' })).not.toBeInTheDocument()
    })
  })

  it('puts the question’s words in bold in an act’s name', async () => {
    render(<LegislationActFinder search={{ q: 'Legea 53/2003' }} />)

    const link = await screen.findByRole('link', { name: 'Legea nr. 53/2003' })
    expect([...link.querySelectorAll('b')].map((mark) => mark.textContent)).toEqual(['Legea', '2003'])
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
    expect(section).toHaveTextContent(/Legea 98\/2016/)
    expect(section).toHaveTextContent(/Codul civil/)
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

  it('lets a heading that repeats the question wrap anywhere, so a long word cannot run off a phone', async () => {
    const { fetchLegalSearch } = await import('../api/legal-search-api')
    vi.mocked(fetchLegalSearch).mockResolvedValueOnce(answer([]))
    render(<LegislationActFinder search={{ q: 'a'.repeat(120) }} />)
    expect(await screen.findByRole('heading', { name: /Niciun act pentru/ })).toHaveClass('wrap-anywhere')
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

    expect(navigateMock).toHaveBeenCalledWith(expect.objectContaining({ to: '/legislation/search', replace: true }))
    expect(sentSearch(0)).toEqual({ q: 'codul muncii' })
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
    expect(navigateMock).toHaveBeenCalledWith(expect.objectContaining({ replace: true }))
    expect(sentSearch(0)).toEqual({ q: 'codul m' })
  })

  describe('the typing pause (astra-client-11)', () => {
    it('is stopped by Enter: the query is sent once', () => {
      vi.useFakeTimers()
      render(<LegislationActFinder search={{}} />)
      fireEvent.change(screen.getByRole('textbox', { name: /Caută în legislație/ }), { target: { value: 'codul muncii' } })
      act(() => {
        vi.advanceTimersByTime(290)
      })
      fireEvent.submit(screen.getByRole('search', { name: /Caută în legislație/ }))
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      expect(navigateMock).toHaveBeenCalledTimes(1)
    })

    it('does not send again a query already on its way', () => {
      vi.useFakeTimers()
      render(<LegislationActFinder search={{ q: 'codul' }} />)
      fireEvent.change(screen.getByRole('textbox', { name: /Caută în legislație/ }), { target: { value: 'codul muncii' } })
      act(() => {
        vi.advanceTimersByTime(300)
      })
      expect(navigateMock).toHaveBeenCalledTimes(1)
      // Enter before the navigation lands
      fireEvent.submit(screen.getByRole('search', { name: /Caută în legislație/ }))
      expect(navigateMock).toHaveBeenCalledTimes(1)
    })

    it('is stopped by a step through history, which lands on an entry the typing must not replace', () => {
      vi.useFakeTimers()
      const { rerender } = render(<LegislationActFinder search={{ q: 'codul', tip: 'lege' }} />)
      fireEvent.change(screen.getByRole('textbox', { name: /Caută în legislație/ }), { target: { value: 'codul m' } })
      act(() => {
        vi.advanceTimersByTime(100)
      })
      // Back: a filter undone, the same query
      act(() => {
        window.dispatchEvent(new PopStateEvent('popstate'))
      })
      rerender(<LegislationActFinder search={{ q: 'codul' }} />)
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      expect(navigateMock).not.toHaveBeenCalled()
    })
  })

  it('runs an example as a search', async () => {
    render(<LegislationActFinder search={{}} />)

    fireEvent.click(within(screen.getByRole('region', { name: 'Ce poți căuta' })).getByRole('button', { name: 'Legea 98/2016' }))
    expect(navigateMock).toHaveBeenCalledWith(expect.objectContaining({ to: '/legislation/search', replace: false }))
    // the example keeps whatever filters the address holds
    expect(sentSearch(0, { tip: 'lege' })).toEqual({ tip: 'lege', q: 'Legea 98/2016' })
    // and is written in the box at once
    expect(screen.getByRole('textbox', { name: /Caută în legislație/ })).toHaveValue('Legea 98/2016')
  })

  describe('before the page hydrates (SEARCH-001)', () => {
    it('is a form the browser can send by itself: the question and the address’s filters', () => {
      render(<LegislationActFinder search={{ q: 'codul', tip: 'lege', historical: true }} />)

      const form = screen.getByRole('search', { name: /Caută în legislație/ }) as HTMLFormElement
      expect(form).toHaveAttribute('action', '/legislation/search')
      expect(form.method).toBe('get')
      expect(Object.fromEntries(new FormData(form))).toEqual({ q: 'codul', tip: 'lege', historical: 'true' })
    })

    it('carries the address’s language, and only a language the page reads', () => {
      const { unmount } = render(<LegislationActFinder search={{ tip: 'lege' }} lang="en" />)
      const form = screen.getByRole('search', { name: /Caută în legislație/ }) as HTMLFormElement
      expect(Object.fromEntries(new FormData(form))).toEqual({ q: '', tip: 'lege', lang: 'en' })
      unmount()
      render(<LegislationActFinder search={{ tip: 'lege' }} />)
      expect(Object.fromEntries(new FormData(screen.getByRole('search', { name: /Caută în legislație/ }) as HTMLFormElement))).toEqual({ q: '', tip: 'lege' })
    })

    it('takes up what was typed into the server’s page, and searches it', () => {
      vi.useFakeTimers()
      const client = createTestQueryClient()
      const page = (
        <QueryClientProvider client={client}>
          <TooltipProvider>
            <LegislationActFinder search={{}} />
          </TooltipProvider>
        </QueryClientProvider>
      )
      const container = document.createElement('div')
      document.body.append(container)
      container.innerHTML = renderToString(page)
      // the reader types while the scripts load: the box holds text React's state does not
      ;(container.querySelector('input[name="q"]') as HTMLInputElement).value = 'codul civil'

      renderShared(<LegislationActFinder search={{}} />, { queryClient: client, container, hydrate: true })
      expect(screen.getByRole('textbox', { name: /Caută în legislație/ })).toHaveValue('codul civil')
      act(() => {
        vi.advanceTimersByTime(300)
      })
      expect(navigateMock).toHaveBeenCalledTimes(1)
      expect(sentSearch(0)).toEqual({ q: 'codul civil' })
      container.remove()
    })
  })

  it('brings the cursor to the field on „/", but not from inside an open dialog (astra-client-11)', async () => {
    render(<LegislationActFinder search={{}} />)
    const box = screen.getByRole('textbox', { name: /Caută în legislație/ })
    fireEvent.keyDown(document.body, { key: '/' })
    expect(document.activeElement).toBe(box)

    fireEvent.click(screen.getByRole('button', { name: 'Filtre' }))
    const dialog = await screen.findByRole('dialog', { name: 'Filtre' })
    const option = within(dialog).getByRole('button', { name: 'Fără cele abrogate' })
    option.focus()
    // the key is left to the dialog (not taken from it, the focus not sent behind it)
    expect(fireEvent.keyDown(option, { key: '/' })).toBe(true)
    expect(document.activeElement).toBe(option)
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
    expect(screen.getByText('Domeniul, categoria și sancțiunile vin din rezumate făcute automat: actele fără rezumat nu apar.')).toBeInTheDocument()
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

  describe('as the address moves (review astra-client-7)', () => {
    it('sends the filters the address holds when the pause ends, not those of the keystroke (F1a)', () => {
      vi.useFakeTimers()
      const { rerender } = render(<LegislationActFinder search={{ q: 'codul', tip: 'lege' }} />)
      fireEvent.change(screen.getByRole('textbox', { name: /Caută în legislație/ }), { target: { value: 'codul m' } })
      // the chip is removed while the pause runs: the address loses `tip`
      rerender(<LegislationActFinder search={{ q: 'codul' }} />)
      act(() => {
        vi.advanceTimersByTime(300)
      })
      expect(navigateMock).toHaveBeenCalledTimes(1)
      expect(navigateMock.mock.calls[0]?.[0]).toMatchObject({ replace: true })
      // the query alone, over the address the router holds when it runs: without `tip` there, none comes back
      expect(sentSearch(0, { q: 'codul' })).toEqual({ q: 'codul m' })
      expect(sentSearch(0, { q: 'codul', stare: 'abrogat' })).toEqual({ q: 'codul m', stare: 'abrogat' })
    })

    it('mirrors a later query after a send that never landed, and does not replace its entry (astra-client-8)', () => {
      vi.useFakeTimers()
      const { rerender } = render(<LegislationActFinder search={{ q: 'codul' }} />)
      const box = screen.getByRole('textbox', { name: /Caută în legislație/ })
      fireEvent.change(box, { target: { value: 'codul m' } })
      act(() => {
        vi.advanceTimersByTime(300)
      })
      expect(navigateMock).toHaveBeenCalledTimes(1)
      // Back before the send lands: the address goes to another entry, the send never arrives
      rerender(<LegislationActFinder search={{ q: 'legea 1' }} />)
      expect(box).toHaveValue('legea 1')
      // a second Back, to an entry whose query is the one that was sent: it is mirrored
      rerender(<LegislationActFinder search={{ q: 'codul m' }} />)
      expect(box).toHaveValue('codul m')
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      // nothing sent over that entry
      expect(navigateMock).toHaveBeenCalledTimes(1)
    })

    it('keeps the keys typed while the page’s own query travels (F1b)', () => {
      vi.useFakeTimers()
      const { rerender } = render(<LegislationActFinder search={{}} />)
      const box = screen.getByRole('textbox', { name: /Caută în legislație/ })
      fireEvent.change(box, { target: { value: 'codul m' } })
      act(() => {
        vi.advanceTimersByTime(300)
      })
      expect(navigateMock).toHaveBeenCalledTimes(1)
      // a key typed before the navigation lands…
      fireEvent.change(box, { target: { value: 'codul mu' } })
      // …then the address catches up with the query the page sent
      rerender(<LegislationActFinder search={{ q: 'codul m' }} />)
      expect(box).toHaveValue('codul mu')
      // a query the page did not send (Back, a link) is still mirrored into the box
      rerender(<LegislationActFinder search={{ q: 'Legea 53/2003' }} />)
      expect(box).toHaveValue('Legea 53/2003')
    })

    it('says it is searching over the last empty answer, never its sentence for the new query (F2)', async () => {
      const { fetchLegalSearch } = await import('../api/legal-search-api')
      const { rerender } = render(<LegislationActFinder search={{ q: 'Legea 9999/2020' }} />)
      await screen.findByRole('heading', { name: 'Niciun act găsit pentru citarea „Legea 9999/2020"' })
      // the next answer does not come yet
      vi.mocked(fetchLegalSearch).mockImplementationOnce(() => new Promise(() => {}))
      rerender(<LegislationActFinder search={{ q: 'Legea 53/2003' }} />)
      expect(await screen.findByText('Se caută…')).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: /Niciun act găsit pentru citarea „Legea 53\/2003"/ })).not.toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: /Legea 9999\/2020/ })).not.toBeInTheDocument()
    })
  })

  it('offers no act from the resolver while a filter narrows the search (F3)', async () => {
    const { resolveLegalActs } = await import('../api/legal-resolve-api')
    // the resolver, which knows no filter, names the law the filter leaves out
    let resolved = false
    vi.mocked(resolveLegalActs).mockImplementationOnce(async () => {
      resolved = true
      return [{ kind: 'act', value: '30412', label: 'Legea nr. 53/2003', score: 1, hint: 'modificat' }]
    })
    render(<LegislationActFinder search={{ q: 'Legea 53/2003', tip: 'decret' }} />)

    expect(await screen.findByRole('heading', { name: 'Niciun act găsit pentru citarea „Legea 53/2003"' })).toBeInTheDocument()
    await waitFor(() => expect(resolved).toBe(true))
    await act(async () => {
      await Promise.resolve()
    })
    expect(screen.queryByText('Actul cu acest număr')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Deschide actul' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /alege actul/ })).not.toBeInTheDocument()
    expect(screen.getByText('Filtrele alese pot fi motivul: scoate-le pe rând.')).toBeInTheDocument()
  })

  it('says the summary-based filters come from automatic summaries, above the results (F4)', async () => {
    render(<LegislationActFinder search={{ q: 'codul muncii', domeniu: 'sanatate' }} />)
    expect(await screen.findByText('Domeniul, categoria și sancțiunile vin din rezumate făcute automat: actele fără rezumat nu apar.')).toBeInTheDocument()
    expect(screen.getAllByRole('group', { name: 'Filtre active' })).toHaveLength(1)
  })

  describe('the filters on, whatever the answer’s state (astra-client-11)', () => {
    const SOURCE = 'Domeniul, categoria și sancțiunile vin din rezumate făcute automat: actele fără rezumat nu apar.'

    it('before a question', () => {
      render(<LegislationActFinder search={{ domeniu: 'sanatate' }} />)
      expect(within(screen.getByRole('group', { name: 'Filtre active' })).getByRole('button', { name: 'Scoate Sănătate' })).toBeInTheDocument()
      expect(screen.getByText(SOURCE)).toBeInTheDocument()
    })

    it('while the answer is read', async () => {
      const { fetchLegalSearch } = await import('../api/legal-search-api')
      vi.mocked(fetchLegalSearch).mockImplementationOnce(() => new Promise(() => {}))
      render(<LegislationActFinder search={{ q: 'codul muncii', domeniu: 'sanatate' }} />)
      expect(screen.getByRole('region', { name: 'Se caută' })).toBeInTheDocument()
      expect(screen.getByRole('group', { name: 'Filtre active' })).toBeInTheDocument()
      expect(screen.getByText(SOURCE)).toBeInTheDocument()
    })

    it('after an error', async () => {
      const { fetchLegalSearch } = await import('../api/legal-search-api')
      vi.mocked(fetchLegalSearch).mockRejectedValue(new Error('down'))
      try {
        render(<LegislationActFinder search={{ q: 'codul muncii', domeniu: 'sanatate' }} />)
        expect(await screen.findByText('Nu am putut căuta în legislație.', undefined, { timeout: 5000 })).toBeInTheDocument()
        expect(screen.getByRole('group', { name: 'Filtre active' })).toBeInTheDocument()
        expect(screen.getByText(SOURCE)).toBeInTheDocument()
      } finally {
        vi.mocked(fetchLegalSearch).mockReset()
        const original = await vi.importActual<typeof import('../api/legal-search-api')>('../api/legal-search-api')
        vi.mocked(fetchLegalSearch).mockImplementation(original.fetchLegalSearch)
      }
    })
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
              nodePath: 'r10',
              nodeLabel: 'Articol unic',
              snippet: 'Se aprobă <em>renunțarea</em> la <b>cetățenia</b> română',
              servedForm: { documentId: 'f900012', versionKind: 'consolidare', caveat: 'unofficial_consolidation', portalLabelRaw: null, portalLabelDate: '2024-03-12' },
            },
            {
              actId: '900002',
              documentId: 'f900011',
              nodePath: null,
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
      // The provision whose path the engine names links to it in the act's text; one without a path is not a link.
      expect(screen.getByRole('link', { name: 'Articol unic' })).toHaveAttribute('href', '/legislation/acts/900002?doc=f900012&nod=r10')
      expect(screen.getByText('Prevedere').closest('a')).toBeNull()
    })

    it('gathers the fragments of one provision under one label', async () => {
      const { fetchLegalSearch } = await import('../api/legal-search-api')
      const fragment = (snippet: string) => ({ actId: '900002', documentId: 'f900012', nodePath: 'r10', nodeLabel: 'Articolul 5', snippet, servedForm: null })
      vi.mocked(fetchLegalSearch).mockResolvedValueOnce(v2Answer([hit], [fragment('Articolul 5 prima <em>renunțare</em>'), fragment('a doua <em>renunțare</em>'), fragment('a doua <em>renunțare</em>')]))
      render(<LegislationActFinder search={{ q: 'renunțare cetățenie' }} />)

      expect(await screen.findAllByRole('link', { name: 'Articolul 5' })).toHaveLength(1)
      // the fragment is quoted as served, its opening words included, and a repeated fragment is drawn once
      expect(screen.getByText(/prima/).closest('p')).toHaveTextContent('„Articolul 5 prima renunțare”')
      expect(screen.getAllByText(/a doua/)).toHaveLength(1)
    })

    it('shows provisions whose act is in no row, rather than an empty answer (astra-client-11)', async () => {
      const { fetchLegalSearch } = await import('../api/legal-search-api')
      vi.mocked(fetchLegalSearch).mockResolvedValueOnce(
        v2Answer(
          [],
          [
            { actId: '900002', actCitation: 'Hotărârea nr. 206/1996', documentId: 'f900012', nodePath: 'r10', nodeLabel: 'Articol unic', snippet: 'Se aprobă <em>renunțarea</em>', servedForm: null },
            // the server withheld this one's words (they differ from the served form): its place in the text is still shown
            { actId: '900003', documentId: 'f900020', nodePath: 'r5', nodeLabel: 'Articolul 5', snippet: null, servedForm: null },
          ],
        ),
      )
      render(<LegislationActFinder search={{ q: 'renunțare cetățenie' }} />)

      const list = await screen.findByRole('list', { name: 'Rezultate' })
      expect(within(list).getByRole('link', { name: 'Hotărârea nr. 206/1996' })).toHaveAttribute('href', '/legislation/acts/900002')
      expect(within(list).getByRole('link', { name: 'Articol unic' })).toHaveAttribute('href', '/legislation/acts/900002?doc=f900012&nod=r10')
      expect(within(list).getByRole('link', { name: 'Articolul 5' })).toHaveAttribute('href', '/legislation/acts/900003?doc=f900020&nod=r5')
      expect(within(list).getByRole('link', { name: 'Actul 900003' })).toHaveAttribute('href', '/legislation/acts/900003')
      expect(screen.getByRole('heading', { name: '2 potriviri afișate' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: /Niciun act/ })).not.toBeInTheDocument()
    })

    it('draws a citation’s provisions in its card, and does not call the search empty', async () => {
      const { resolveLegalActs } = await import('../api/legal-resolve-api')
      const { fetchLegalSearch } = await import('../api/legal-search-api')
      vi.mocked(resolveLegalActs).mockResolvedValueOnce([{ kind: 'act', value: '900002', label: 'Hotărârea nr. 206/1996', score: 1, hint: 'in-vigoare' }])
      vi.mocked(fetchLegalSearch).mockResolvedValueOnce(
        v2Answer([], [{ actId: '900002', documentId: 'f900012', nodePath: 'r10', nodeLabel: 'Articol unic', snippet: 'Se aprobă <em>renunțarea</em>', servedForm: null }]),
      )
      render(<LegislationActFinder search={{ q: 'HG 206/1996' }} />)

      const card = (await screen.findByRole('heading', { name: 'Hotărârea nr. 206/1996' })).closest('section') as HTMLElement
      expect(within(card).getByRole('link', { name: 'Articol unic' })).toHaveAttribute('href', '/legislation/acts/900002?doc=f900012&nod=r10')
      expect(screen.queryByText(/Căutarea directă nu a găsit nimic/)).not.toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: /Niciun act/ })).not.toBeInTheDocument()
    })

    it('never cuts a fragment by its label: „Articolul 1" is not the head of „Articolul 10" (astra-client-11)', async () => {
      const { fetchLegalSearch } = await import('../api/legal-search-api')
      vi.mocked(fetchLegalSearch).mockResolvedValueOnce(
        v2Answer([hit], [{ actId: '900002', documentId: 'f900012', nodePath: 'r1', nodeLabel: 'Articolul 1', snippet: 'Articolul 10 se modifică și va avea următorul cuprins: <em>renunțare</em>', servedForm: null }]),
      )
      render(<LegislationActFinder search={{ q: 'renunțare cetățenie' }} />)

      await screen.findByRole('link', { name: 'Articolul 1' })
      expect(screen.getByText(/se modifică/).closest('p')).toHaveTextContent('„Articolul 10 se modifică și va avea următorul cuprins: renunțare”')
    })

    it('claims no text search when the answer is degraded', async () => {
      const { fetchLegalSearch } = await import('../api/legal-search-api')
      vi.mocked(fetchLegalSearch).mockResolvedValueOnce({ ...v2Answer([]), degraded: true })
      render(<LegislationActFinder search={{ q: 'concediu de odihna' }} />)

      const heading = await screen.findByRole('heading', { name: /Niciun act pentru „concediu de odihna"/ })
      const section = heading.closest('section') as HTMLElement
      // neither the text claim nor the number-and-name copy: the answer lost a leg it does not name
      expect(section).not.toHaveTextContent(/Am căutat cuvintele în numele, titlul și textul actelor/)
      expect(section).not.toHaveTextContent(/Căutarea după expresii din textul legilor/)
      expect(section).toHaveTextContent(/O parte din căutare nu a rulat, iar căutarea după sens nu este încă disponibilă/)
      expect(section).toHaveTextContent('Răspuns parțial: o parte din căutare nu a rulat.')
    })

    it('says matches it could not show are matches, not an absence', async () => {
      const { fetchLegalSearch } = await import('../api/legal-search-api')
      vi.mocked(fetchLegalSearch).mockResolvedValueOnce({ ...v2Answer([]), unhydratedHits: 3, degraded: true })
      render(<LegislationActFinder search={{ q: 'codul muncii' }} />)

      const heading = await screen.findByRole('heading', { name: 'Am găsit potriviri, dar nu le-am putut afișa' })
      expect(screen.queryByRole('heading', { name: /Niciun act/ })).not.toBeInTheDocument()
      // the partial answer and the server's caveats stay with it
      const section = heading.closest('section') as HTMLElement
      expect(section).toHaveTextContent('Răspuns parțial: o parte din căutare nu a rulat.')
      const notes = await openNotes()
      expect(within(notes).getByText(/Formele consolidate sunt neoficiale/)).toBeInTheDocument()
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
