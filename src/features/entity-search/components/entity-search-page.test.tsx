/**
 * The search page against literal server-shaped answers, through the real
 * QueryClient, provider, hook, transport and schema (only `fetch` is stubbed).
 */
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createTestQueryClient, fireEvent, render, screen, waitFor, within } from '@/test/test-utils'

const route = vi.hoisted(() => ({ search: {} as Record<string, unknown> }))

vi.mock('@/routes/experimental.search', () => ({
  Route: { useSearch: () => route.search },
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => () => Promise.resolve(),
  Link: ({ children, to }: { readonly children: ReactNode; readonly to: string }) => <a href={to}>{children}</a>,
}))

vi.mock('@/hooks/filters/useFilterLabels', () => ({
  useEntityTagLabel: () => ({ map: (tag: string) => tag }),
}))

vi.mock('@/lib/auth', () => ({
  getAuthToken: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/config/env', () => ({
  env: { VITE_API_URL: 'http://api.test' },
  getApiBaseUrl: () => 'http://api.test',
  getSiteUrl: () => 'http://localhost:3000',
}))

import { EntitySearchPage } from './entity-search-page'
import {
  answerBody,
  CURRENT_EMPTY_FIRST_PAGE_WITH_MORE,
  CURRENT_EMPTY_LAST_PAGE,
  CURRENT_EMPTY_PAGE_WITH_MORE,
  CURRENT_NO_MATCH,
  CURRENT_PAGE,
  DEGRADED_PAGE,
  MOVED_GENERATION_PAGE,
  MOVED_SCOPE_PAGE,
  PARTIAL_PAGE,
  REFUSED_BODY,
  UNAVAILABLE_PAGE,
  WITHHELD_EMPTY_PAGE_WITH_MORE,
  WITHHELD_NEXT_PAGE,
} from '../api/graphql/entity-search.fixtures'

type Variables = { readonly q: string; readonly offset?: number }

const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>()

const variablesOf = (init: RequestInit): Variables =>
  (JSON.parse(String(init.body)) as { variables: Variables }).variables

/**
 * Answers `q@offset` with the next body of its list (the last one repeats);
 * a request the test did not plan is a failure, not a silent empty answer.
 */
function serve(routes: Record<string, readonly unknown[]>) {
  const served = new Map<string, number>()
  fetchMock.mockImplementation(async (_url, init) => {
    const { q, offset } = variablesOf(init)
    const key = `${q}@${offset ?? 0}`
    const bodies = routes[key]
    if (bodies === undefined || bodies.length === 0) throw new Error(`unexpected request ${key}`)
    const index = served.get(key) ?? 0
    served.set(key, index + 1)
    return new Response(JSON.stringify(bodies[Math.min(index, bodies.length - 1)]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  })
}

const sentOffsets = () => fetchMock.mock.calls.map(([, init]) => variablesOf(init).offset ?? 0)

function renderPage(search: Record<string, unknown>) {
  route.search = search
  const queryClient = createTestQueryClient()
  return render(<EntitySearchPage />, { queryClient })
}

const optionTitles = () =>
  within(screen.getByRole('listbox')).getAllByRole('option').map((option) => option.querySelector('p')?.textContent)

const optionNamed = (title: string) => {
  const option = screen.getAllByRole('option').find((candidate) => candidate.textContent?.includes(title))
  if (!option) throw new Error(`no option ${title}`)
  return option
}

const loadMore = () => fireEvent.click(screen.getByRole('button', { name: 'Încarcă mai mult' }))

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  // jsdom has no layout: the page scrolls the active row into view.
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('an empty search box', () => {
  it('is no search: no request, no answer, no count', () => {
    renderPage({})

    expect(screen.getByText(/Începe să cauți/)).toBeInTheDocument()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('a current answer', () => {
  it('says it is current, counts as estimates, and shows each hit by its owner', async () => {
    serve({ 'dedeman@0': [answerBody(CURRENT_PAGE)] })
    renderPage({ q: 'dedeman' })

    await screen.findByText('DEDEMAN SRL')
    expect(screen.getByText(/Firme: la zi\./)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Rezultate — 4 afișate · ~312 candidați estimați în index',
    )
    // Independent roles keep their order, titles and links.
    expect(optionTitles()).toEqual([
      'DEDEMAN SRL',
      'REGIA AUTONOMĂ EXEMPLU',
      'MUNICIPIUL BACĂU',
      'EXEMPLU CONSTRUCT SRL',
    ])

    const company = optionNamed('DEDEMAN SRL')
    expect(company).toHaveTextContent('SRL')
    expect(company).toHaveTextContent('Bacău')
    expect(company).toHaveTextContent('denumire din ediția ONRC publicată')
    expect(company).not.toHaveTextContent('Inactiv')
    expect(company.querySelector('a')).toHaveAttribute('href', '/companies/2816464')

    // The enterprise keeps its own title, line and link; its company part is
    // named and attributed, and its county is said to be the institution's.
    const enterprise = optionNamed('REGIA AUTONOMĂ EXEMPLU')
    expect(enterprise).toHaveTextContent('Companie de stat')
    expect(enterprise).toHaveTextContent('județul instituției: Ilfov')
    expect(enterprise).toHaveTextContent('Firmă: REGIA AUTONOMA EXEMPLU RA')
    expect(enterprise).toHaveTextContent('denumire din directorul platformei, nu din ediția ONRC')
    expect(enterprise).toHaveTextContent('fără profil în ediția ONRC')
    expect(enterprise.querySelector('a')).toHaveAttribute('href', '/public-enterprises/10020943')

    // An institution without a company part keeps its plain county.
    const institution = optionNamed('MUNICIPIUL BACĂU')
    expect(institution).toHaveTextContent('Bacău')
    expect(institution).not.toHaveTextContent('județul instituției')
    expect(institution).not.toHaveTextContent('Firmă:')

    // Unknown activity is neither active nor inactive.
    const unknown = optionNamed('EXEMPLU CONSTRUCT SRL')
    expect(unknown).toHaveTextContent('activitate necunoscută')
    expect(unknown).not.toHaveTextContent('Inactiv')

    // Facet counts read as the index's estimates.
    expect(screen.getByRole('button', { name: /^Firmă\s*~300$/ })).toBeInTheDocument()
  })

  it('is the only empty answer called a no match', async () => {
    serve({ 'zzzqqq@0': [answerBody(CURRENT_NO_MATCH)] })
    renderPage({ q: 'zzzqqq' })

    expect(await screen.findByText('Niciun rezultat pentru "zzzqqq".')).toBeInTheDocument()
  })
})

describe('an answer that is not current', () => {
  it('says a partial answer is partial and shows no counts', async () => {
    serve({ 'dedeman@0': [answerBody(PARTIAL_PAGE)] })
    renderPage({ q: 'dedeman' })

    await screen.findByText('DEDEMAN SRL')
    expect(screen.getByText(/Firme: parțial\./)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Rezultate — 4 afișate')
    expect(screen.getByRole('heading', { level: 2 })).not.toHaveTextContent('candidați')
    expect(screen.queryByText(/~\d/)).not.toBeInTheDocument()
  })

  it('says an unavailable answer serves no company, and why', async () => {
    serve({ 'dedeman@0': [answerBody(UNAVAILABLE_PAGE)] })
    renderPage({ q: 'dedeman' })

    await screen.findByText('MUNICIPIUL BACĂU')
    expect(screen.getByText(/Firme: indisponibile\./)).toBeInTheDocument()
    expect(
      screen.getByText('Indexul de căutare nu a putut fi verificat față de ediția registrului comerțului.'),
    ).toBeInTheDocument()
    expect(optionNamed('MUNICIPIUL BACĂU')).toHaveTextContent('activitate necunoscută')
    expect(screen.queryByText(/Firmă:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/~\d/)).not.toBeInTheDocument()
  })

  it('does not call a withheld empty page a zero, and pages on to its next offset', async () => {
    serve({
      'dedeman@0': [answerBody(WITHHELD_EMPTY_PAGE_WITH_MORE)],
      'dedeman@20': [answerBody(WITHHELD_NEXT_PAGE)],
    })
    renderPage({ q: 'dedeman' })

    expect(await screen.findByText('Nu putem spune că nu există rezultate pentru "dedeman".')).toBeInTheDocument()
    expect(screen.getByText(/Pagina aceasta nu are rezultate afișabile/)).toBeInTheDocument()
    expect(screen.getByText(/lipsesc și instituțiile, ONG-urile/)).toBeInTheDocument()
    expect(screen.queryByText(/Niciun rezultat/)).not.toBeInTheDocument()

    loadMore()

    expect(await screen.findByText('Legea 1/2017 privind achizițiile')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Încarcă mai mult' })).not.toBeInTheDocument()
    expect(sentOffsets()).toEqual([0, 20])
  })

  it('does not say "no results" for a degraded answer', async () => {
    serve({ 'dedeman@0': [answerBody(DEGRADED_PAGE)] })
    renderPage({ q: 'dedeman' })

    expect(await screen.findByText('Căutarea este momentan limitată.')).toBeInTheDocument()
    expect(screen.queryByText(/Niciun rezultat/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Firme:/)).not.toBeInTheDocument()
  })
})

describe('paging', () => {
  it('keeps an admitted page through an empty continuation, and never claims a zero', async () => {
    serve({
      'dedeman@0': [answerBody(CURRENT_PAGE)],
      'dedeman@20': [answerBody(CURRENT_EMPTY_PAGE_WITH_MORE)],
      'dedeman@40': [answerBody(CURRENT_EMPTY_LAST_PAGE)],
    })
    renderPage({ q: 'dedeman' })
    await screen.findByText('DEDEMAN SRL')

    loadMore()
    await waitFor(() => expect(sentOffsets()).toEqual([0, 20]))
    // Page 2 showed nothing and still has a next page.
    expect(await screen.findByRole('button', { name: 'Încarcă mai mult' })).toBeEnabled()
    expect(screen.getAllByRole('option')).toHaveLength(4)

    loadMore()
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /Încarcă mai mult|Loading…/ })).not.toBeInTheDocument(),
    )
    expect(screen.getAllByRole('option')).toHaveLength(4)
    expect(screen.queryByText(/Niciun rezultat/)).not.toBeInTheDocument()
    expect(sentOffsets()).toEqual([0, 20, 40])
  })

  it('calls an empty later page with no next page "no further page", never a no-match (r4)', async () => {
    serve({
      'gol@0': [answerBody(CURRENT_EMPTY_FIRST_PAGE_WITH_MORE)],
      'gol@20': [answerBody(CURRENT_EMPTY_LAST_PAGE)],
    })
    renderPage({ q: 'gol' })

    expect(await screen.findByText('Nu putem spune că nu există rezultate pentru "gol".')).toBeInTheDocument()
    expect(screen.getByText(/Pagina aceasta nu are rezultate afișabile/)).toBeInTheDocument()

    loadMore()

    expect(await screen.findByText(/Paginile încărcate nu au rezultate afișabile/)).toBeInTheDocument()
    expect(screen.queryByText(/niciun rezultat/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Partea de firme a căutării nu este la zi/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Încarcă mai mult' })).not.toBeInTheDocument()
    expect(sentOffsets()).toEqual([0, 20])
  })

  it.each([
    ['a new index generation', MOVED_GENERATION_PAGE],
    ['a new company scope', MOVED_SCOPE_PAGE],
  ])('drops every page and its counts when page 2 comes from %s, then starts again', async (_name, moved) => {
    serve({
      'dedeman@0': [answerBody(CURRENT_PAGE)],
      'dedeman@20': [answerBody(moved)],
    })
    renderPage({ q: 'dedeman' })
    await screen.findByText('DEDEMAN SRL')

    loadMore()

    expect(await screen.findByText('Căutarea s-a schimbat între pagini.')).toBeInTheDocument()
    expect(screen.queryByText('DEDEMAN SRL')).not.toBeInTheDocument()
    expect(screen.queryByText('Legea 1/2017 privind achizițiile')).not.toBeInTheDocument()
    expect(screen.queryByText(/~\d/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Firme:/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Încearcă din nou' }))

    expect(await screen.findByText('DEDEMAN SRL')).toBeInTheDocument()
    expect(sentOffsets()).toEqual([0, 20, 0])
  })
})

describe('a withheld answer', () => {
  it('shows the server refusal as a retry, never as "no results"', async () => {
    serve({ 'dedeman@0': [REFUSED_BODY, answerBody(CURRENT_PAGE)] })
    renderPage({ q: 'dedeman' })

    expect(await screen.findByText('Răspunsul căutării a fost reținut.')).toBeInTheDocument()
    expect(screen.queryByText(/Niciun rezultat/)).not.toBeInTheDocument()
    expect(screen.queryByRole('option')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Încearcă din nou' }))

    expect(await screen.findByText('DEDEMAN SRL')).toBeInTheDocument()
  })

  it('drops the cached answer and its counts when its re-read is refused', async () => {
    serve({ 'dedeman@0': [answerBody(CURRENT_PAGE), REFUSED_BODY] })
    const { queryClient } = renderPage({ q: 'dedeman' })
    await screen.findByText('DEDEMAN SRL')
    expect(screen.getAllByText(/~312/).length).toBeGreaterThan(0)

    await act(async () => {
      await queryClient.refetchQueries()
    })

    expect(await screen.findByText('Răspunsul căutării a fost reținut.')).toBeInTheDocument()
    expect(screen.queryByText('DEDEMAN SRL')).not.toBeInTheDocument()
    expect(screen.queryByText(/~\d/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Firme: la zi/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Încarcă mai mult' })).not.toBeInTheDocument()
  })

  it('shows unreadable metadata as withheld too', async () => {
    serve({ 'dedeman@0': [answerBody({ ...CURRENT_PAGE, companyContribution: 'current' })] })
    renderPage({ q: 'dedeman' })

    expect(await screen.findByText('Răspunsul căutării a fost reținut.')).toBeInTheDocument()
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
  })
})

describe('a new query', () => {
  it('does not present the previous answer\'s zero as its own while it loads', async () => {
    let releaseDedeman: (() => void) | undefined
    serve({ 'zzzqqq@0': [answerBody(CURRENT_NO_MATCH)] })
    const zero = fetchMock.getMockImplementation()
    fetchMock.mockImplementation((url, init) => {
      if (variablesOf(init).q !== 'dedeman') return zero!(url, init)
      return new Promise<Response>((resolve) => {
        releaseDedeman = () =>
          resolve(new Response(JSON.stringify(answerBody(CURRENT_PAGE)), { status: 200 }))
      })
    })
    const view = renderPage({ q: 'zzzqqq' })
    await screen.findByText('Niciun rezultat pentru "zzzqqq".')

    route.search = { q: 'dedeman' }
    view.rerender(<EntitySearchPage />)

    await waitFor(() => expect(releaseDedeman).toBeDefined())
    expect(screen.queryByText(/Niciun rezultat/)).not.toBeInTheDocument()

    await act(async () => {
      releaseDedeman?.()
    })
    expect(await screen.findByText('DEDEMAN SRL')).toBeInTheDocument()
  })
})
