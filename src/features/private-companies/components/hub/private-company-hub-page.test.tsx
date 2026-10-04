import { Profiler, type ReactNode } from 'react'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GraphQLRequestError } from '@/lib/graphql/graphql-client'
import { createQueryClient } from '@/lib/queryClient'
import { createTestQueryClient } from '@/test/test-utils'
import { COMPANY_HUB_SNAPSHOT } from '../../lib/hub-snapshot'
import { PrivateCompanyHubPage } from './private-company-hub-page'

/**
 * The hub's contract: no static business figure anywhere; every figure is
 * `companyHubStats` of the edition the page pinned, read in the browser (the
 * publicly cached server HTML carries none), with that edition named; a
 * registry that cannot answer is a state, never a zero; a registry that moves
 * hides the figures until the reader asks for the current ones. Only the
 * transport is replaced: the answers go through the real parsing, mapping and
 * scope checks.
 */

type RawEnvelope = Record<string, unknown> & { readonly scopeKey: string }

const envelope = (state: string, editionId: string | null, publication: string | null, access: string): RawEnvelope => ({
  source: 'onrc',
  state,
  editionId,
  sourceSnapshotId: editionId ? `firme-${editionId}` : null,
  sourcePublishedAt: editionId === '8' ? '2026-10-02' : editionId ? '2026-09-30' : null,
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
const WITHDRAWN = envelope('WITHDRAWN', null, '5', '13')

const capabilities = (registry: RawEnvelope) => ({
  registry,
  editions: [],
  registryFilterFields: ['status', 'county', 'caenCode', 'onrcCaen'],
  caenRevisions: ['rev0', 'rev1', 'rev2', 'rev3'],
})

const hubStats = (registry: RawEnvelope, total: number) => ({
  totalCompanies: total,
  activeCompanies: 2_400,
  statusMix: [
    { key: '1048', label: 'funcțiune', count: total - 700, basis: null },
    { key: '(multiple_values)', label: null, count: 300, basis: 'MULTIPLE_VALUES' },
    { key: '(not_in_edition)', label: null, count: 400, basis: 'NOT_IN_EDITION' },
  ],
  topCounties: [
    { key: 'CJ', label: 'Cluj', count: 900, basis: null },
    { key: 'B', label: 'București', count: 800, basis: null },
  ],
  caenDivisions: [
    { key: 'rev2:47', label: null, count: 1_200, basis: null },
    { key: 'rev0:52', label: null, count: 700, basis: null },
    { key: 'unknown:47', label: null, count: 50, basis: null },
  ],
  coverage: { territoryMatched: null, territoryUnmatched: null },
  registry,
  computedAt: '2026-10-04T08:00:00.000Z',
})

const api = vi.hoisted(() => ({
  /** The capabilities answer, or a promise of it: a registry read the test holds open. */
  registry: null as unknown,
  hub: (_registryKey: string): unknown => null,
  hubCalls: 0,
  registryCalls: 0,
}))

vi.mock('@/lib/graphql/graphql-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/graphql/graphql-client')>()
  return {
    ...actual,
    graphqlQuery: vi.fn(async (query: string) => {
      if (query.includes('companyRegistry {')) {
        api.registryCalls += 1
        return { companyRegistry: await api.registry }
      }
      if (query.includes('companyHubStats {')) {
        api.hubCalls += 1
        // An answer or a promise of it: a read the test holds open.
        return { companyHubStats: await api.hub((api.registry as { registry?: RawEnvelope } | null)?.registry?.scopeKey ?? '') }
      }
      throw new Error(`unexpected query: ${query.slice(0, 60)}`)
    }),
  }
})

vi.mock('../../lib/mock-mode', () => ({ isPrivateCompanyMockEnabled: () => false }))

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    search,
    preload: _preload,
    ...props
  }: {
    readonly children: ReactNode
    readonly to: string
    readonly search?: unknown
    readonly preload?: unknown
  }) => (
    <a href={to} data-search={JSON.stringify(search ?? {})} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
  useLocation: () => ({ hash: '' }),
}))

vi.mock('@/features/entity-search/api/entity-search-api.live', () => ({
  searchEntitiesLive: vi.fn(),
}))

let client: QueryClient

function page() {
  return (
    <QueryClientProvider client={client}>
      <PrivateCompanyHubPage />
    </QueryClientProvider>
  )
}

const figures = () => within(screen.getByTestId('company-hub-figures'))
const counted = (value: number) => document.querySelector(`[data-count-value="${String(value)}"]`)

describe('PrivateCompanyHubPage', () => {
  beforeEach(() => {
    client = createTestQueryClient()
    api.registry = capabilities(EDITION_7)
    api.hub = () => hubStats(EDITION_7, 3_000)
    api.hubCalls = 0
    api.registryCalls = 0
  })

  it('sends no registry figure and no static business figure in the server HTML', () => {
    const html = renderToStaticMarkup(page())
    for (const retired of [COMPANY_HUB_SNAPSHOT.national.activeFirms, COMPANY_HUB_SNAPSHOT.national.newFirms, COMPANY_HUB_SNAPSHOT.national.employees]) {
      expect(html).not.toContain(`data-count-value="${String(retired)}"`)
    }
    expect(html).not.toContain(COMPANY_HUB_SNAPSHOT.leaders.turnover[0]?.name ?? '—')
    for (const retired of ['Cele mai mari firme', 'Firme noi', 'Cifra de afaceri', 'Salariați', 'mai sunt în funcțiune']) expect(html).not.toContain(retired)
    // The ways in are there without any figure.
    expect(html).toContain('De aici poți începe')
    expect(api.hubCalls).toBe(0)
  })

  it('shows the pinned edition’s counts, names the edition, and keeps every company in one status bucket', async () => {
    render(page())
    expect(await figures().findByText('Firme în directorul platformei')).toBeInTheDocument()
    expect(counted(3_000)).not.toBeNull()
    expect(counted(2_400)).not.toBeNull()
    // The conflict bucket is its own count, never folded into „în funcțiune".
    expect(counted(300)).not.toBeNull()
    expect(screen.getByTestId('company-hub-source')).toHaveTextContent(/ediția 7 publicată pe/u)
    const status = within(screen.getByTestId('company-hub-status'))
    expect(status.getByText('1048 · funcțiune')).toBeInTheDocument()
    expect(status.getByText('Înscrieri cu valori diferite')).toBeInTheDocument()
    expect(status.getByText('Fără profil în ediția ONRC')).toBeInTheDocument()
    expect(within(screen.getByTestId('company-hub-counties')).getByText('Cluj')).toBeInTheDocument()
  })

  it('lists activity divisions by their own revision, Rev.0 included, as overlapping counts with no share', async () => {
    render(page())
    const rev0 = within(await screen.findByTestId('company-hub-divisions-rev0'))
    expect(rev0.getByText('Diviziunea 52 (CAEN Rev.0)')).toBeInTheDocument()
    const unknown = within(screen.getByTestId('company-hub-divisions-unknown'))
    expect(unknown.getByText('Diviziunea 47 (fără revizie CAEN)')).toBeInTheDocument()
    // Overlapping buckets carry no percentage.
    expect(screen.getByTestId('company-hub-divisions-rev2').textContent).not.toMatch(/%/u)
  })

  it('says an unpublished registry as a state and asks for no figure', async () => {
    api.registry = capabilities(UNPUBLISHED)
    render(page())
    expect(await screen.findByTestId('company-registry-state')).toHaveTextContent(/nu are încă o ediție publicată/u)
    expect(api.hubCalls).toBe(0)
    expect(counted(0)).toBeNull()
  })

  it('never shows figures the server answered under another scope than the one pinned', async () => {
    // The server re-pinned during the request: the answer carries edition 8 while the page pinned 7.
    api.hub = () => hubStats(EDITION_8, 5_000)
    render(page())
    await vi.waitFor(() => expect(api.hubCalls).toBeGreaterThan(0))
    expect(counted(5_000)).toBeNull()
    expect(screen.queryByText('Firme în directorul platformei')).toBeNull()
  })

  it('hides the figures when the registry moves, and shows the new edition only when asked', async () => {
    render(page())
    await figures().findByText('Firme în directorul platformei')
    expect(counted(3_000)).not.toBeNull()

    // A new edition is published while the page is open.
    api.registry = capabilities(EDITION_8)
    api.hub = (key) => hubStats(key === EDITION_8.scopeKey ? EDITION_8 : EDITION_7, 5_000)
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['company-registry'] })
    })
    expect(await screen.findByTestId('company-registry-moved')).toBeInTheDocument()
    expect(counted(3_000)).toBeNull()
    expect(counted(5_000)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Arată datele actuale' }))
    await figures().findByText('Firme în directorul platformei')
    expect(counted(5_000)).not.toBeNull()
    expect(screen.getByTestId('company-hub-source')).toHaveTextContent(/ediția 8/u)
  })

  it('drops the figures on an access withdrawal and does not bring them back by itself', async () => {
    render(page())
    await figures().findByText('Firme în directorul platformei')
    api.registry = capabilities(WITHDRAWN)
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['company-registry'] })
    })
    expect(await screen.findByTestId('company-registry-moved')).toBeInTheDocument()
    expect(counted(3_000)).toBeNull()
    // Recovery: the edition is public again, still under the old pin — nothing switches until asked.
    api.registry = capabilities(EDITION_8)
    api.hub = () => hubStats(EDITION_8, 5_000)
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['company-registry'] })
    })
    expect(screen.getByTestId('company-registry-moved')).toBeInTheDocument()
    expect(counted(5_000)).toBeNull()
  })
})

/**
 * One accepted answer governs every figure and band (C20-R4): after a
 * successful answer, a refetch the registry refuses — the scope moved during
 * the request, or the registry cannot answer — clears the figures AND the
 * status, county and activity bands at once, though the cache still holds the
 * earlier answer, and re-reads the registry. While that re-read is pending,
 * and after it fails, nothing of the earlier answer returns; the ways in stay.
 */
describe('PrivateCompanyHubPage — a refused refetch after a shown answer', () => {
  const MOVED_DURING_REQUEST = 'company registry scope changed during the request; retry'
  const NOT_PUBLISHED = 'the company registry has no accessible published edition'

  beforeEach(() => {
    client = createTestQueryClient()
    api.registry = capabilities(EDITION_7)
    api.hub = () => hubStats(EDITION_7, 3_000)
    api.hubCalls = 0
    api.registryCalls = 0
  })

  const noFigureOrBand = () => {
    expect(counted(3_000)).toBeNull()
    expect(counted(2_400)).toBeNull()
    expect(screen.queryByTestId('company-hub-status')).toBeNull()
    expect(screen.queryByTestId('company-hub-counties')).toBeNull()
    expect(document.querySelector('[data-testid^="company-hub-divisions"]')).toBeNull()
    expect(screen.queryByTestId('company-hub-source')).toBeNull()
  }

  it.each([
    ['moved during the request', MOVED_DURING_REQUEST],
    ['unavailable', NOT_PUBLISHED],
  ])('clears every figure and band when the refetch is refused (%s), while the registry is re-read and after that fails', async (_case, message) => {
    const { GraphQLRequestError } = await import('@/lib/graphql/graphql-client')
    render(page())
    await figures().findByText('Firme în directorul platformei')
    expect(screen.getByTestId('company-hub-status')).toBeInTheDocument()
    expect(api.registryCalls).toBe(1)

    // The registry's re-read is held open; the hub's own refetch is refused.
    let failRegistry: (error: Error) => void = () => undefined
    api.registry = new Promise((_resolve, reject) => {
      failRegistry = reject
    })
    api.hub = () => {
      throw new GraphQLRequestError('refused', { graphQLErrors: [{ message, extensions: { code: 'SERVICE_UNAVAILABLE' } }] })
    }
    await act(async () => {
      await client.refetchQueries({ queryKey: ['company-hub-stats'] })
    })
    // The refusal re-reads the registry (once the page has seen it); by then, and while it is pending, nothing of the
    // earlier answer is on screen.
    await vi.waitFor(() => expect(api.registryCalls).toBe(2))
    noFigureOrBand()
    // The ways in stay: the search, the shortcuts and the analyses.
    expect(screen.getByRole('link', { name: 'Achiziții publice' })).toBeInTheDocument()
    expect(screen.getByText('De aici poți începe')).toBeInTheDocument()

    await act(async () => failRegistry(new Error('registry read failed')))
    expect(await screen.findByTestId('company-registry-scope-error')).toBeInTheDocument()
    noFigureOrBand()
  })

  it('shows none of the earlier answer when an ordinary refetch fails: the figures say so, and no band keeps the old numbers', async () => {
    render(page())
    await figures().findByText('Firme în directorul platformei')
    // Not a registry refusal: the scope stays pinned and the registry is not re-read; the cache keeps the old answer.
    api.hub = () => {
      throw new Error('network down')
    }
    await act(async () => {
      await client.refetchQueries({ queryKey: ['company-hub-stats'] })
    })
    expect(await figures().findByText('Cifrele nu s-au încărcat.')).toBeInTheDocument()
    expect(client.getQueryData(['company-hub-stats', EDITION_7.scopeKey])).toBeDefined()
    expect(api.registryCalls).toBe(1)
    noFigureOrBand()
  })
})

/**
 * Refusal episodes: a refused read retires the scope's figures and re-reads
 * the registry once per episode; a read started after it and accepted under
 * the same scope ends the episode, so the next, independent refusal is acted
 * on again — the figures' gate (`!isError`) is unchanged. Through the app's
 * own query client, the real provider, adapter and page; only the transport
 * is scripted, a read held where a step needs it. Every commit's markup is
 * recorded; nothing here re-reads the registry for the page.
 */
describe('PrivateCompanyHubPage — refusal episodes', () => {
  const S1 = EDITION_7.scopeKey
  const ACCESS = 'company access (core organization privacy) could not be rechecked by this runtime; the response is withheld'

  let commits: string[] = []
  let answers: (() => unknown)[] = []
  let unscripted = 0

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
    return <Profiler id="hub" onRender={() => commits.push(document.body.innerHTML)}>{page()}</Profiler>
  }

  /** A few turns of the event loop: the query cache notifies on a zero timeout. */
  async function settle() {
    for (let turn = 0; turn < 5; turn += 1) {
      await act(async () => {
        await new Promise((done) => setTimeout(done, 0))
      })
    }
  }

  const revalidate = () =>
    act(async () => {
      void client.refetchQueries({ queryKey: ['company-hub-stats', S1], exact: true })
    })

  beforeEach(() => {
    client = createQueryClient()
    client.setDefaultOptions({ queries: { ...client.getDefaultOptions().queries, retry: false } })
    api.registry = capabilities(EDITION_7)
    api.hubCalls = 0
    api.registryCalls = 0
    commits = []
    answers = []
    unscripted = 0
    api.hub = () => {
      const next = answers.shift()
      if (next) return next()
      unscripted += 1
      return new Promise(() => undefined)
    }
  })

  it('re-reads the registry at a later, independent refusal after an accepted recovery, and shows S2 figures only when asked', async () => {
    const first = deferred<never>()
    const fresh = deferred<unknown>()
    const moved = deferred<unknown>()
    answers.push(() => hubStats(EDITION_7, 3_000), () => first.promise, () => fresh.promise, () => moved.promise)
    render(observed())
    await figures().findByText('Firme în directorul platformei')
    expect(counted(3_000)).not.toBeNull()

    // 1. A revalidation is refused: access could not be rechecked. The registry is re-read and confirms S1; the
    //    figures are read afresh (held), and nothing of the earlier answer is on screen meanwhile.
    await revalidate()
    await vi.waitFor(() => expect(api.hubCalls).toBe(2))
    const refusedAt = commits.length
    await act(async () => first.reject(refusal(ACCESS)))
    await vi.waitFor(() => expect(api.hubCalls).toBe(3))
    expect(api.registryCalls).toBe(2)
    expect(shownSince(refusedAt, /data-count-value="3000"/u)).toBe(0)
    // The fresh read is accepted under S1: the episode is over.
    await act(async () => fresh.resolve(hubStats(EDITION_7, 3_100)))
    await vi.waitFor(() => expect(counted(3_100)).not.toBeNull())

    // 2. The server moves to S2: the next revalidation answers under S2, and the adapter refuses it for S1.
    api.registry = capabilities(EDITION_8)
    await revalidate()
    await vi.waitFor(() => expect(api.hubCalls).toBe(4))
    const movedAt = commits.length
    await act(async () => moved.resolve(hubStats(EDITION_8, 5_000)))
    expect(await screen.findByTestId('company-registry-moved')).toBeInTheDocument()
    await settle()
    // The third registry read is the page's own report; the S1 figures are retired; nothing more is read until asked.
    expect(api.registryCalls).toBe(3)
    expect(api.hubCalls).toBe(4)
    expect(client.getQueriesData({ queryKey: ['company-hub-stats', S1] })).toEqual([])
    expect(shownSince(movedAt, /data-count-value="(3000|3100|5000)"/u)).toBe(0)

    answers.push(() => hubStats(EDITION_8, 5_000))
    fireEvent.click(screen.getByRole('button', { name: 'Arată datele actuale' }))
    await vi.waitFor(() => expect(counted(5_000)).not.toBeNull())
    expect(screen.getByTestId('company-hub-source')).toHaveTextContent(/ediția 8/u)
    expect(shownSince(movedAt, /data-count-value="(3000|3100)"/u)).toBe(0)
    expect(unscripted).toBe(0)
  })

  it('asks the registry first when the reader retries a refused read, so a scope that moved since is said — never asked again under S1', async () => {
    // The server re-pinned: it answers under S2 while the registry still says S1, and the adapter refuses both answers.
    answers.push(
      () => hubStats(EDITION_7, 3_000),
      () => hubStats(EDITION_8, 5_000),
      () => hubStats(EDITION_8, 5_000),
    )
    render(observed())
    await figures().findByText('Firme în directorul platformei')
    await revalidate()
    // The episode's one registry re-read confirms S1; the re-ask is refused again: a state with a retry, no loop.
    await vi.waitFor(() => expect(api.hubCalls).toBe(3))
    await settle()
    expect(api.registryCalls).toBe(2)
    expect(figures().getByText('Cifrele nu s-au încărcat.')).toBeInTheDocument()

    // The registry now says S2. The reader's retry asks it first: the move is said, nothing is asked under S1.
    api.registry = capabilities(EDITION_8)
    fireEvent.click(figures().getByRole('button', { name: 'Încearcă din nou' }))
    expect(await screen.findByTestId('company-registry-moved')).toBeInTheDocument()
    expect(api.registryCalls).toBe(3)
    expect(api.hubCalls).toBe(3)

    // No S2 figure before the reader asks; then the S2 answer.
    const askedAt = commits.length
    expect(commits.slice(0, askedAt).some((html) => html.includes('data-count-value="5000"'))).toBe(false)
    answers.push(() => hubStats(EDITION_8, 5_000))
    fireEvent.click(screen.getByRole('button', { name: 'Arată datele actuale' }))
    await vi.waitFor(() => expect(counted(5_000)).not.toBeNull())
    expect(api.hubCalls).toBe(4)
    expect(unscripted).toBe(0)
  })
})
