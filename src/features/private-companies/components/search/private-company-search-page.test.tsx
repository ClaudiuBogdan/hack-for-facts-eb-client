import { Profiler, type ReactNode } from 'react'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GraphQLRequestError } from '@/lib/graphql/graphql-client'
import { createQueryClient } from '@/lib/queryClient'
import { createTestQueryClient } from '@/test/test-utils'
import type { PrivateCompanyDirectorySearchState } from '@/schemas/private-company-search'
import { PrivateCompanySearchPage } from './private-company-search-page'

/**
 * The directory's contract with the registry scope: rows, cursor and total
 * of one pinned edition only; an answer under another scope is never shown or
 * cached; a refused continuation restarts at the first page instead of
 * appending another edition's rows; a registry that cannot answer the URL's
 * registry filters is a state (the URL kept, nothing asked), never „0
 * companies"; an invalid exact selector is said, never sent. Only the
 * transport is replaced.
 */

type RawEnvelope = Record<string, unknown> & { readonly scopeKey: string }

const envelope = (state: string, editionId: string | null, publication: string | null, access: string): RawEnvelope => ({
  source: 'onrc',
  state,
  editionId,
  sourceSnapshotId: editionId ? `firme-${editionId}` : null,
  sourcePublishedAt: editionId ? '2026-09-30' : null,
  interpretationVersion: 'onrc-interp-v1',
  dimensionPolicyVersion: 'onrc-dim-v1',
  eligibilityPolicyVersion: editionId ? 'onrc-elig-v1' : null,
  publicationEpoch: publication,
  accessEpoch: access,
  reason: state === 'PUBLISHED' ? null : 'no accessible published edition',
  scopeKey: `onrc:${state.toLowerCase()}:${editionId ?? '-'}:${publication ?? '-'}:${access}`,
})

const EDITION_7 = envelope('PUBLISHED', '7', '3', '11')
const EDITION_8 = envelope('PUBLISHED', '8', '4', '12')
const UNPUBLISHED = envelope('UNPUBLISHED', null, null, '11')

const node = (cui: string, name: string, fields: Record<string, unknown> = {}) => ({
  cui,
  orgId: cui,
  name,
  nameSource: 'ONRC_EDITION',
  legalForm: 'SRL',
  headlineStatus: { code: '1048', label: 'funcțiune', labelSource: 'API_NOMENCLATURE' },
  county: 'Cluj',
  vatPayer: true,
  declaredFiscallyInactive: false,
  registrationDate: '2007-11-26',
  registrationDatePresent: true,
  registryCuiState: 'IN_EDITION',
  hasActiveObservation: true,
  statusBasis: 'SINGLE_OBSERVATION',
  countyBasis: 'SINGLE_OBSERVATION',
  recordedDateBasis: 'SINGLE_OBSERVATION',
  ...fields,
})

const companiesPage = (registry: RawEnvelope, nodes: readonly ReturnType<typeof node>[], next: string | null = null) => ({
  companies: {
    edges: nodes.map((entry) => ({ cursor: `c-${entry.cui}`, node: entry })),
    pageInfo: { hasNextPage: next !== null, endCursor: next },
    totalCount: nodes.length,
    totalEstimated: false,
    registry,
  },
})

const api = vi.hoisted(() => ({
  registry: null as unknown,
  companies: (_variables: Record<string, unknown>): unknown => null,
  calls: [] as Record<string, unknown>[],
  registryCalls: 0,
  /** The county facet's answer when a test scripts it; otherwise one county under the current registry. */
  counties: null as null | (() => unknown),
}))

vi.mock('@/lib/graphql/graphql-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/graphql/graphql-client')>()
  return {
    ...actual,
    graphqlQuery: vi.fn(async (query: string, variables: Record<string, unknown> = {}) => {
      if (query.includes('companyRegistry {')) {
        api.registryCalls += 1
        return { companyRegistry: api.registry }
      }
      if (query.includes('companies(filter:')) {
        api.calls.push(variables)
        return api.companies(variables)
      }
      if (query.includes('companyCountyProfile(')) {
        if (api.counties) return api.counties()
        const registry = (api.registry as { registry: RawEnvelope }).registry
        return { companyCountyProfile: { groupBy: 'COUNTY', denominator: 1, groups: [{ key: 'CJ', label: 'Cluj', count: 1, basis: null }], registry } }
      }
      if (query.includes('companyResolveResult(')) {
        const registry = (api.registry as { registry: RawEnvelope }).registry
        return { companyResolveResult: { hits: [], degraded: false, ambiguous: false, registry, scopeKey: registry.scopeKey } }
      }
      throw new Error(`unexpected query: ${query.slice(0, 60)}`)
    }),
  }
})

vi.mock('../../lib/mock-mode', () => ({ isPrivateCompanyMockEnabled: () => false }))

const router = vi.hoisted(() => ({ search: {} as PrivateCompanyDirectorySearchState }))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, ...props }: { readonly children: ReactNode; readonly to: string; readonly params?: Record<string, string> }) => (
    <a href={params?.cui ? to.replace('$cui', params.cui) : to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
  useSearch: () => router.search,
}))

let client: QueryClient

function page() {
  return (
    <QueryClientProvider client={client}>
      <PrivateCompanySearchPage />
    </QueryClientProvider>
  )
}

async function invalidateRegistry() {
  await act(async () => {
    await client.invalidateQueries({ queryKey: ['company-registry'] })
  })
}

describe('PrivateCompanySearchPage under a pinned registry scope', () => {
  beforeEach(() => {
    client = createTestQueryClient()
    router.search = {}
    api.registry = { registry: EDITION_7, editions: [], registryFilterFields: [], caenRevisions: ['rev0', 'rev1', 'rev2', 'rev3'] }
    api.companies = () => companiesPage(EDITION_7, [node('1', 'ALFA SRL')])
    api.calls = []
    api.registryCalls = 0
    api.counties = null
  })

  it('lists the pinned edition’s rows, says a conflict as a conflict, and names the edition', async () => {
    api.companies = () =>
      companiesPage(EDITION_7, [
        node('1', 'ALFA SRL'),
        node('2', 'BETA SNC', { headlineStatus: null, statusBasis: 'MULTIPLE_VALUES', hasActiveObservation: true }),
        node('3', 'GAMA SRL', { registryCuiState: 'NOT_IN_EDITION', nameSource: 'CORE_ORGANIZATION', headlineStatus: null, hasActiveObservation: null }),
      ])
    render(page())
    expect(await screen.findByText('ALFA SRL')).toBeInTheDocument()
    const states = screen.getAllByTestId('company-result-state').map((cell) => cell.textContent)
    expect(states).toEqual(['funcțiune', 'Stări diferite, între care „în funcțiune”', 'Fără profil în ediția ONRC'])
    expect(screen.getByText(/nume din directorul platformei/u)).toBeInTheDocument()
    expect(screen.getByTestId('company-search-source')).toHaveTextContent(/ediția 7/u)
  })

  it('sends the county code, any-observation status, broad and exact CAEN apart, and the pinned scope', async () => {
    router.search = { county: ['CJ'], status: ['1048'], caen: '47', onrcCaen: ['rev0:1111'] }
    render(page())
    await screen.findByText('ALFA SRL')
    expect(api.calls[0]?.filter).toEqual({ county: { eq: 'CJ' }, status: { eq: '1048' }, caenCode: { prefix: '47' }, onrcCaen: { eq: 'rev0:1111' } })
    expect(api.calls[0]?.after).toBeUndefined()
  })

  it('never shows or keeps a page the server answered under another scope', async () => {
    api.companies = () => companiesPage(EDITION_8, [node('9', 'OMEGA SRL')])
    render(page())
    // The refused answer re-reads the registry; it confirms edition 7, the page asks once more, is refused again,
    // and says so — without re-reading the registry in a loop.
    await vi.waitFor(() => expect(api.calls).toHaveLength(2))
    expect(await screen.findByTestId('company-search-scope-moved')).toBeInTheDocument()
    expect(screen.queryByText('OMEGA SRL')).toBeNull()
    expect(client.getQueriesData({ queryKey: ['private-company-search'] }).every(([, data]) => data === undefined)).toBe(true)
  })

  it('restarts at the first page when a continuation is refused, never appending another edition’s rows', async () => {
    const { GraphQLRequestError } = await import('@/lib/graphql/graphql-client')
    api.companies = (variables) => {
      if (variables.after) {
        // The registry moved between the pages: the server refuses the cursor.
        api.registry = { registry: EDITION_8, editions: [], registryFilterFields: [], caenRevisions: [] }
        throw new GraphQLRequestError('refused', {
          graphQLErrors: [{ message: 'company registry scope changed (publication, rollback, withdrawal or access); restart pagination', extensions: { code: 'INVALID_INPUT' } }],
        })
      }
      return companiesPage(EDITION_7, [node('1', 'ALFA SRL')], 'c-1')
    }
    render(page())
    await screen.findByText('ALFA SRL')
    fireEvent.click(screen.getByTestId('company-search-load-more'))
    expect(await screen.findByTestId('company-registry-moved')).toBeInTheDocument()
    expect(screen.queryByText('ALFA SRL')).toBeNull()

    api.companies = (variables) => companiesPage(variables.after ? EDITION_7 : EDITION_8, [node('8', 'NOUA SRL')])
    fireEvent.click(screen.getByRole('button', { name: 'Arată datele actuale' }))
    expect(await screen.findByText('NOUA SRL')).toBeInTheDocument()
    // The new scope starts at its first page.
    expect(api.calls[api.calls.length - 1]?.after).toBeUndefined()
    expect(screen.queryByText('ALFA SRL')).toBeNull()
  })

  it('never keeps the previous scope’s rows on screen while the new scope loads', async () => {
    render(page())
    await screen.findByText('ALFA SRL')
    api.registry = { registry: EDITION_8, editions: [], registryFilterFields: [], caenRevisions: [] }
    api.companies = () => new Promise(() => {})
    await invalidateRegistry()
    fireEvent.click(await screen.findByRole('button', { name: 'Arată datele actuale' }))
    expect(screen.queryByText('ALFA SRL')).toBeNull()
  })

  it('says a registry that cannot answer the URL’s registry filters as a state, keeps them and asks nothing', async () => {
    api.registry = { registry: UNPUBLISHED, editions: [], registryFilterFields: [], caenRevisions: [] }
    router.search = { status: ['1048'] }
    render(page())
    expect(await screen.findByTestId('company-search-registry-unavailable')).toHaveTextContent(/nu este „zero firme”/u)
    expect(api.calls).toEqual([])
    expect(screen.getByTestId('company-registry-state')).toHaveTextContent(/nu are încă o ediție publicată/u)
  })

  it('still lists by ANAF’s own filters when the registry cannot answer, with no registry field on the rows', async () => {
    api.registry = { registry: UNPUBLISHED, editions: [], registryFilterFields: [], caenRevisions: [] }
    api.companies = () => companiesPage(UNPUBLISHED, [node('1', 'ALFA SRL')])
    router.search = { vat: true }
    render(page())
    expect(await screen.findByText('ALFA SRL')).toBeInTheDocument()
    expect(screen.getByTestId('company-result-state').textContent).toBe('')
  })

  it('says an invalid exact CAEN selector instead of sending or dropping it', async () => {
    router.search = { onrcCaen: ['6201'] }
    render(page())
    expect(await screen.findByTestId('company-search-invalid-selector')).toBeInTheDocument()
    expect(api.calls).toEqual([])
  })
})

/**
 * Refusal episodes: the list and the county facets act on EVERY independent
 * refusal — they retire what they cached under the refused scope and re-read
 * the registry once — and act again only after a read started after that
 * refusal was accepted. Through the app's own query client (fresh for a
 * minute), the real provider, adapters and page; only the transport is
 * scripted, a read held where a step needs it. Every commit's markup is
 * recorded, so nothing old may appear even for one render; nothing here
 * re-reads the registry for the page: each re-read is the page's own report.
 */
describe('PrivateCompanySearchPage — refusal episodes', () => {
  const S1 = EDITION_7.scopeKey
  const ACCESS = 'company access (core organization privacy) could not be rechecked by this runtime; the response is withheld'
  const MOVED = 'company registry scope changed during the request; retry'
  const A: PrivateCompanyDirectorySearchState = { county: ['CJ'] }
  const B: PrivateCompanyDirectorySearchState = { county: ['IS'] }
  const C: PrivateCompanyDirectorySearchState = { county: ['TM'] }
  /** What A and B answered under S1: rows, totals, the edition's source line, A's continuation. */
  const OLD = /A_S1 SRL|B_S1 SRL|9\.?46[12]|ediția 7 publicată|data-testid="company-search-load-more"/u

  let commits: string[] = []
  /** The list reads still to answer, by the county asked; a read nobody scripted is recorded and held. */
  let script = new Map<string, (() => unknown)[]>()
  let unscripted: string[] = []

  const capabilities = (registry: RawEnvelope) => ({ registry, editions: [], registryFilterFields: [], caenRevisions: ['rev0', 'rev1', 'rev2', 'rev3'] })
  const held = () => new Promise<never>(() => undefined)
  const countyOf = (variables: Record<string, unknown>) => (variables.filter as { county?: { eq?: string } } | undefined)?.county?.eq ?? ''
  const readsOf = (county: string) => api.calls.filter((variables) => countyOf(variables) === county).length
  const scripted = (county: string, ...answers: (() => unknown)[]) => script.set(county, [...(script.get(county) ?? []), ...answers])
  const listed = (registry: RawEnvelope, cui: string, name: string, total: number, next: string | null = null) => () => {
    const answer = companiesPage(registry, [node(cui, name)], next)
    return { companies: { ...answer.companies, totalCount: total } }
  }
  const refusal = (message: string) => new GraphQLRequestError('refused', { graphQLErrors: [{ message, extensions: { code: 'SERVICE_UNAVAILABLE' } }] })
  const shownSince = (mark: number, pattern: RegExp) => commits.slice(mark).filter((html) => pattern.test(html)).length

  function deferred<T>() {
    let resolve!: (value: T) => void
    let reject!: (reason: unknown) => void
    const promise = new Promise<T>((done, fail) => {
      resolve = done
      reject = fail
    })
    return { promise, resolve, reject }
  }

  function observed() {
    return (
      <Profiler id="directory" onRender={() => commits.push(document.body.innerHTML)}>
        <QueryClientProvider client={client}>
          <PrivateCompanySearchPage />
        </QueryClientProvider>
      </Profiler>
    )
  }

  /** A few turns of the event loop: the query cache notifies on a zero timeout. */
  async function settle() {
    for (let turn = 0; turn < 5; turn += 1) {
      await act(async () => {
        await new Promise((done) => setTimeout(done, 0))
      })
    }
  }

  beforeEach(() => {
    client = createQueryClient()
    client.setDefaultOptions({ queries: { ...client.getDefaultOptions().queries, retry: false } })
    router.search = {}
    api.registry = capabilities(EDITION_7)
    api.calls = []
    api.registryCalls = 0
    // The facets never answer and never refuse: no other hook can report for the list.
    api.counties = held
    commits = []
    script = new Map()
    unscripted = []
    api.companies = (variables) => {
      const next = script.get(countyOf(variables))?.shift()
      if (next) return next()
      unscripted.push(countyOf(variables))
      return held()
    }
  })

  it('retires every S1 answer at a later, independent refusal, re-reads the registry, and shows S2 only when the reader asks', async () => {
    router.search = A
    scripted('CJ', listed(EDITION_7, '11', 'A_S1 SRL', 9_461, 'c-A'))
    const { rerender } = render(observed())
    expect(await screen.findByText('A_S1 SRL')).toBeInTheDocument()
    expect(screen.getByTestId('company-search-load-more')).toBeInTheDocument()
    expect(screen.getByTestId('company-search-source')).toHaveTextContent(/ediția 7 publicată/u)
    expect(api.registryCalls).toBe(1)

    // 1. A revalidation of A is refused: access could not be rechecked. The page re-reads the registry, which
    //    confirms S1, and asks A again: a fresh read, held.
    const first = deferred<never>()
    const reask = deferred<unknown>()
    scripted('CJ', () => first.promise, () => reask.promise)
    await act(async () => {
      void client.refetchQueries({ queryKey: ['private-company-search', S1], type: 'active' })
    })
    await vi.waitFor(() => expect(readsOf('CJ')).toBe(2))
    const refusedAt = commits.length
    await act(async () => first.reject(refusal(ACCESS)))
    await vi.waitFor(() => expect(readsOf('CJ')).toBe(3))
    expect(api.registryCalls).toBe(2)
    // From the refusal on — through the re-read and the held re-ask — no row, total, source, cursor or placeholder.
    expect(shownSince(refusedAt, OLD)).toBe(0)

    // 2. The re-ask is accepted under S1: a recovery, so the episode is over.
    await act(async () => reask.resolve(listed(EDITION_7, '11', 'A_S1 SRL', 9_461, 'c-A')()))
    expect(await screen.findByText('A_S1 SRL')).toBeInTheDocument()

    // 3. B, then A again: both answered under S1, fresh in the cache for a minute.
    scripted('IS', listed(EDITION_7, '12', 'B_S1 SRL', 9_462))
    router.search = B
    rerender(observed())
    expect(await screen.findByText('B_S1 SRL')).toBeInTheDocument()
    router.search = A
    rerender(observed())
    expect(await screen.findByText('A_S1 SRL')).toBeInTheDocument()
    expect(readsOf('CJ')).toBe(3)

    // 4. The server moves to S2 and refuses A's next revalidation as moved.
    api.registry = capabilities(EDITION_8)
    const moved = deferred<never>()
    scripted('CJ', () => moved.promise)
    await act(async () => {
      void client.refetchQueries({ queryKey: ['private-company-search', S1], type: 'active' })
    })
    await vi.waitFor(() => expect(readsOf('CJ')).toBe(4))
    const movedAt = commits.length
    await act(async () => moved.reject(refusal(MOVED)))
    expect(await screen.findByTestId('company-registry-moved')).toBeInTheDocument()
    // The third registry read is the page's own report; every S1 answer of the list is gone from the cache.
    expect(api.registryCalls).toBe(3)
    expect(client.getQueriesData({ queryKey: ['private-company-search', S1] })).toEqual([])
    const listReads = api.calls.length

    // 5. Back to B while S2 is current but not accepted: no S1 answer of B, and nothing read under either scope.
    router.search = B
    rerender(observed())
    await settle()
    expect(api.calls).toHaveLength(listReads)
    expect(shownSince(movedAt, OLD)).toBe(0)

    // 6. Only the reader's acceptance shows S2, from its first page.
    scripted('IS', listed(EDITION_8, '13', 'B_S2 SRL', 1))
    fireEvent.click(screen.getByRole('button', { name: 'Arată datele actuale' }))
    expect(await screen.findByText('B_S2 SRL')).toBeInTheDocument()
    expect(screen.getByTestId('company-search-source')).toHaveTextContent(/ediția 8/u)
    expect(shownSince(movedAt, OLD)).toBe(0)
    // No continuation cursor was ever sent: A's S1 cursor died with its answer.
    expect(api.calls.every((variables) => variables.after === undefined)).toBe(true)
    expect(unscripted).toEqual([])
  })

  it('acts again only after a read started after the refusal is accepted — not on the registry confirming S1, a late earlier read or a repeated refusal; a healthy zero does', async () => {
    // B is asked first and held: a read begun before the refusal.
    const late = deferred<unknown>()
    scripted('IS', () => late.promise)
    router.search = B
    const { rerender } = render(observed())
    await vi.waitFor(() => expect(readsOf('IS')).toBe(1))

    // A is refused: the episode's one registry re-read confirms S1, and A is asked again (held).
    const first = deferred<never>()
    const reask = deferred<never>()
    scripted('CJ', () => first.promise, () => reask.promise)
    router.search = A
    rerender(observed())
    await vi.waitFor(() => expect(readsOf('CJ')).toBe(1))
    await act(async () => first.reject(refusal(ACCESS)))
    await vi.waitFor(() => expect(readsOf('CJ')).toBe(2))
    expect(api.registryCalls).toBe(2)

    // The read begun before the refusal is accepted late; then the re-ask is refused as well.
    await act(async () => late.resolve(listed(EDITION_7, '21', 'B_LATE SRL', 9_463)()))
    await act(async () => reask.reject(refusal(ACCESS)))
    await settle()
    // The same episode: no second registry read and no loop, a state on screen; the late answer neither shown nor kept.
    expect(api.registryCalls).toBe(2)
    expect(readsOf('CJ')).toBe(2)
    expect(screen.getByTestId('company-search-registry-unavailable')).toBeInTheDocument()
    expect(shownSince(0, /B_LATE SRL/u)).toBe(0)
    expect(client.getQueriesData({ queryKey: ['private-company-search', S1] }).every(([, data]) => data === undefined)).toBe(true)

    // A healthy zero, read after the refusal and accepted under S1, ends the episode…
    scripted('TM', () => companiesPage(EDITION_7, []))
    router.search = C
    rerender(observed())
    expect(await screen.findByText(/No companies match these filters/u)).toBeInTheDocument()
    // …so A's next refusal is a new episode: one more registry read, and once more no loop.
    scripted('CJ', () => Promise.reject(refusal(ACCESS)), () => Promise.reject(refusal(ACCESS)))
    router.search = A
    rerender(observed())
    await vi.waitFor(() => expect(readsOf('CJ')).toBe(4))
    await settle()
    expect(api.registryCalls).toBe(3)
    expect(readsOf('CJ')).toBe(4)
    expect(unscripted).toEqual([])
  })

  it('asks the registry first when the reader retries a refused list, so a scope that moved since is said — never asked again under S1', async () => {
    // The server re-pinned: it answers under S2 while the registry still says S1, and the adapter refuses both answers.
    router.search = A
    scripted('CJ', listed(EDITION_8, '31', 'A_S2 SRL', 1), listed(EDITION_8, '31', 'A_S2 SRL', 1))
    render(observed())
    await vi.waitFor(() => expect(readsOf('CJ')).toBe(2))
    await settle()
    // The episode's one registry re-read; the re-ask is refused again: a state with a retry, no loop.
    expect(api.registryCalls).toBe(2)
    expect(screen.getByTestId('company-search-scope-moved')).toBeInTheDocument()

    // The registry now says S2. The retry asks it first: the move is said, and nothing is asked under S1.
    api.registry = capabilities(EDITION_8)
    fireEvent.click(screen.getByRole('button', { name: 'Reîncearcă' }))
    expect(await screen.findByTestId('company-registry-moved')).toBeInTheDocument()
    expect(api.registryCalls).toBe(3)
    expect(readsOf('CJ')).toBe(2)
    expect(shownSince(0, /A_S2 SRL/u)).toBe(0)
    expect(unscripted).toEqual([])
  })

  it('offers none of the S1 county counts from a refusal on, and the S2 counts only when the reader asks', async () => {
    // The list is held: it never answers and never refuses, so its report can never stand in for the facets' own.
    api.companies = () => held()
    const facet = (registry: RawEnvelope, label: string, count: number) => () => ({
      companyCountyProfile: { groupBy: 'COUNTY', denominator: count, groups: [{ key: 'CJ', label, count, basis: null }], registry },
    })
    const answers: (() => unknown)[] = []
    let facetReads = 0
    api.counties = () => {
      facetReads += 1
      const next = answers.shift()
      if (next) return next()
      unscripted.push('counties')
      return held()
    }
    const first = deferred<never>()
    const fresh = deferred<unknown>()
    const moved = deferred<never>()
    answers.push(facet(EDITION_7, 'CLUJ_S1', 43_210), () => first.promise, () => fresh.promise, () => moved.promise)
    const S1_COUNTS = /CLUJ_S1|43\.210/u
    const NOTE = 'Județele nu au putut fi încărcate acum.'

    render(observed())
    fireEvent.click(await screen.findByRole('button', { name: /Filtre/u }))
    expect(await screen.findByText('CLUJ_S1')).toBeInTheDocument()
    expect(screen.getByTestId('company-filter-sheet')).toHaveTextContent(/43\.210/u)

    // 1. A revalidation of the facets is refused (access not rechecked): the note, and no count beside it.
    await act(async () => {
      void client.refetchQueries({ queryKey: ['private-company-counties', S1], exact: true })
    })
    await vi.waitFor(() => expect(facetReads).toBe(2))
    const refusedAt = commits.length
    await act(async () => first.reject(refusal(ACCESS)))
    // The page re-reads the registry, which confirms S1, and the facets are read afresh (held).
    await vi.waitFor(() => expect(facetReads).toBe(3))
    expect(api.registryCalls).toBe(2)
    expect(commits.slice(refusedAt).some((html) => html.includes(NOTE))).toBe(true)
    expect(shownSince(refusedAt, S1_COUNTS)).toBe(0)
    // The fresh read is accepted under S1: the episode is over.
    await act(async () => fresh.resolve(facet(EDITION_7, 'CLUJ_S1', 43_210)()))
    expect(await screen.findByText('CLUJ_S1')).toBeInTheDocument()

    // 2. The server moves to S2 and refuses the facets' next revalidation as moved.
    api.registry = capabilities(EDITION_8)
    await act(async () => {
      void client.refetchQueries({ queryKey: ['private-company-counties', S1], exact: true })
    })
    await vi.waitFor(() => expect(facetReads).toBe(4))
    const movedAt = commits.length
    await act(async () => moved.reject(refusal(MOVED)))
    expect(await screen.findByTestId('company-registry-moved')).toBeInTheDocument()
    await settle()
    expect(api.registryCalls).toBe(3)
    expect(commits.slice(movedAt).some((html) => html.includes(NOTE))).toBe(true)
    expect(shownSince(movedAt, S1_COUNTS)).toBe(0)
    expect(client.getQueriesData({ queryKey: ['private-company-counties', S1] })).toEqual([])
    // No facet read under either scope until the reader asks.
    expect(facetReads).toBe(4)
    expect(screen.queryByText('CLUJ_S2')).toBeNull()

    answers.push(facet(EDITION_8, 'CLUJ_S2', 54_321))
    fireEvent.click(screen.getByRole('button', { name: 'Arată datele actuale', hidden: true }))
    expect(await screen.findByText('CLUJ_S2')).toBeInTheDocument()
    expect(facetReads).toBe(5)
    expect(shownSince(movedAt, S1_COUNTS)).toBe(0)
    expect(unscripted).toEqual([])
  })
})
