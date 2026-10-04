import { Profiler, type ComponentType, type ReactNode } from 'react'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GraphQLRequestError } from '@/lib/graphql/graphql-client'
import { createQueryClient } from '@/lib/queryClient'
import type { PrivateCompanyProfile } from '@/schemas/private-company'
import { privateCompanyProfileQueryKey } from '@/features/private-companies/hooks/use-private-company-profile'
import { companyProfile } from '@/features/private-companies/lib/company-profile.fixture'

/**
 * The company page as the route renders it, through the app's own query
 * client (a profile stays fresh in it for a minute), the real registry and
 * comparison adapters behind a scripted transport, and the real page:
 *
 * - a profile the browser cached on an earlier visit is never on screen before
 *   the page's own registry read answers, nor after that read fails (C20-R2);
 * - the server's own answer for the document is hydrated as rendered, kept
 *   while the first registry read is pending, and dropped when it fails;
 * - a comparison read that finds no directory company any more (`company:
 *   null`) withdraws the profile at once and reads the company and the
 *   registry again — never saying the company is not registered — while a
 *   present company with no comparison keeps its profile (C20-R3).
 */

const CUI = companyProfile().cui ?? ''

const route = vi.hoisted(() => ({ loaderData: { cui: '' } as { cui: string; profile?: unknown } }))

vi.mock('@tanstack/react-router', () => ({
  createLazyFileRoute: () => (options: Record<string, unknown>) => ({
    options,
    useParams: () => ({ cui: route.loaderData.cui }),
    useSearch: () => ({}),
    useLoaderData: () => route.loaderData,
  }),
  useParams: () => ({ cui: route.loaderData.cui }),
  useNavigate: () => vi.fn(),
  Link: ({ children, to, search: _search, params: _params, preload: _preload, ...props }: { readonly children: ReactNode; readonly to: string; readonly search?: unknown; readonly params?: unknown; readonly preload?: unknown }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

/** The scripted API: each registry read and comparison read takes the next scripted answer. */
const api = vi.hoisted(() => ({
  registry: [] as (() => Promise<unknown>)[],
  diff: [] as (() => Promise<unknown>)[],
  calls: [] as string[],
  profile: vi.fn<(cui: string) => Promise<unknown>>(),
}))

vi.mock('@/lib/graphql/graphql-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/graphql/graphql-client')>()
  return {
    ...actual,
    graphqlQuery: vi.fn(async (query: string) => {
      if (query.includes('companyRegistry {')) {
        api.calls.push('registry')
        const next = api.registry.shift()
        if (!next) throw new Error('unscripted registry read')
        return { companyRegistry: await next() }
      }
      if (query.includes('registrationDiff {')) {
        api.calls.push('diff')
        const next = api.diff.shift()
        if (!next) throw new Error('unscripted comparison read')
        return next()
      }
      throw new Error(`unexpected query: ${query.slice(0, 60)}`)
    }),
  }
})

// The profile read itself: the page's cache flow is what is under test, not its mapping.
vi.mock('@/features/private-companies/api/private-company-api', () => ({
  fetchPrivateCompanyProfile: (cui: string) => api.profile(cui),
}))
vi.mock('@/features/private-companies/lib/mock-mode', () => ({ isPrivateCompanyMockEnabled: () => false }))
vi.mock('@/features/procurement/hooks/use-procurement-data', () => ({
  useProcurementSupplierSlice: () => ({ data: undefined, isError: false, isPending: true, refetch: vi.fn() }),
}))
vi.mock('@/features/private-companies/hooks/use-company-litigation-shown', () => ({ useCompanyLitigationShown: () => false }))
vi.mock('@/lib/utils', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils')>()), getUserLocale: () => 'ro' }))

const envelope = (scopeKey: string) => ({
  source: 'onrc',
  state: 'PUBLISHED',
  editionId: '7',
  sourceSnapshotId: 'firme-7',
  sourcePublishedAt: '2026-09-30',
  interpretationVersion: 'onrc-interp-v1',
  dimensionPolicyVersion: 'onrc-dim-v1',
  eligibilityPolicyVersion: 'onrc-elig-v1',
  publicationEpoch: '3',
  accessEpoch: '11',
  reason: null,
  scopeKey,
})
const capabilities = (scopeKey: string) => ({ registry: envelope(scopeKey), editions: [], registryFilterFields: [], caenRevisions: ['rev2'] })
const answer = <T,>(value: T) => () => Promise.resolve(value)

/** The company as the API answers it under `scopeKey`, by a name of its own. */
function companyUnder(scopeKey: string, legalName: string): PrivateCompanyProfile {
  const profile = companyProfile({ legalName })
  return { ...profile, registry: { ...profile.registry, registry: { ...profile.registry.registry, mode: 'live', scopeKey } } }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((done, fail) => {
    resolve = done
    reject = fail
  })
  return { promise, resolve, reject }
}

/** The app's query client, retries off so a refused read settles at once. */
function appQueryClient(): QueryClient {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { ...client.getDefaultOptions().queries, retry: false } })
  return client
}

async function routePage(): Promise<ComponentType> {
  const { Route } = await import('./companies.$cui.lazy')
  return (Route as unknown as { options: { component: ComponentType } }).options.component
}

function app(client: QueryClient, Page: ComponentType) {
  return (
    <QueryClientProvider client={client}>
      <Page />
    </QueryClientProvider>
  )
}

/** Every text the document has held since the call: whatever a commit put on screen, even for an instant. */
function textsOnScreen() {
  const seen: string[] = [document.body.textContent ?? '']
  const observer = new MutationObserver(() => seen.push(document.body.textContent ?? ''))
  observer.observe(document.body, { subtree: true, childList: true, characterData: true })
  return {
    ever: (pattern: RegExp) => {
      seen.push(document.body.textContent ?? '')
      return seen.some((text) => pattern.test(text))
    },
    stop: () => observer.disconnect(),
  }
}

beforeEach(() => {
  route.loaderData = { cui: CUI }
  api.registry = []
  api.diff = []
  api.calls = []
  api.profile.mockReset()
  api.profile.mockImplementation(() => new Promise(() => undefined))
  document.title = 'CUI'
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('/companies/$cui — a profile cached by an earlier visit (C20-R2)', () => {
  it('shows nothing of it before the page’s own registry read answers, then only the answer of the new scope', async () => {
    const client = appQueryClient()
    client.setQueryData(privateCompanyProfileQueryKey(CUI), companyUnder('S0', 'VECHI SRL'))
    const first = deferred<unknown>()
    api.registry = [() => first.promise, answer(capabilities('S1'))]
    const Page = await routePage()
    const screenTexts = textsOnScreen()

    render(app(client, Page))
    expect(screen.getByRole('status', { name: 'Se încarcă profilul firmei' })).toBeInTheDocument()
    // Fresh in the cache for a minute: the route does not even re-read it; the page still shows none of it.
    expect(api.profile).not.toHaveBeenCalled()

    api.profile.mockResolvedValue(companyUnder('S1', 'ACTUAL SRL'))
    await act(async () => first.resolve(capabilities('S1')))
    expect(await screen.findByRole('heading', { level: 1, name: 'Actual SRL' })).toBeInTheDocument()
    // Pinned S1, the cached S0 answer disagreed: the company was read again, and the old one never shown — nor named in the tab.
    expect(api.profile).toHaveBeenCalledWith(CUI)
    expect(screenTexts.ever(/Vechi SRL/u)).toBe(false)
    expect(document.title).not.toMatch(/Vechi/u)
    screenTexts.stop()
  })

  it('keeps it hidden when that registry read fails, and says the profile could not be read', async () => {
    const client = appQueryClient()
    client.setQueryData(privateCompanyProfileQueryKey(CUI), companyUnder('S0', 'VECHI SRL'))
    const first = deferred<unknown>()
    api.registry = [() => first.promise]
    const Page = await routePage()
    const screenTexts = textsOnScreen()

    render(app(client, Page))
    await act(async () => first.reject(new Error('registry read failed')))
    expect(await screen.findByRole('heading', { level: 1, name: 'Profilul firmei nu s-a încărcat' })).toBeInTheDocument()
    expect(screenTexts.ever(/Vechi SRL/u)).toBe(false)
    // A failed read is not a missing company.
    expect(screenTexts.ever(/Firma nu a fost găsită/u)).toBe(false)
    screenTexts.stop()
  })
})

describe('/companies/$cui — the server’s own answer for the document', () => {
  async function hydrated(firstRead: Promise<unknown>) {
    route.loaderData = { cui: CUI, profile: companyUnder('S0', 'DOCUMENT SRL') }
    api.registry = [() => firstRead]
    const Page = await routePage()
    // The server: no read in its query client, the loader's direct answer rendered in full.
    const html = renderToString(app(appQueryClient(), Page))
    expect(html).toContain('Document SRL</h1>')
    const container = document.createElement('div')
    container.innerHTML = html
    document.body.appendChild(container)
    const recoverable: unknown[] = []
    const client = appQueryClient()
    let root: Root | undefined
    await act(async () => {
      root = hydrateRoot(container, app(client, Page), { onRecoverableError: (error) => recoverable.push(error) })
    })
    return {
      container,
      recoverable,
      /** A later, unrelated render of the same tree. */
      rerender: () => act(() => root?.render(app(client, Page))),
      unmount: () => act(() => root?.unmount()),
    }
  }

  it('is hydrated as rendered and kept while the first registry read is pending, then kept under a matching pin', async () => {
    const first = deferred<unknown>()
    // Under the matching pin the comparison is asked: a present company with no comparison keeps its profile.
    api.diff = [answer({ company: { registry: { registry: envelope('S0') }, registrationDiff: null } })]
    const { container, recoverable, unmount } = await hydrated(first.promise)
    expect(recoverable).toEqual([])
    expect(container.querySelector('h1')?.textContent).toBe('Document SRL')

    await act(async () => first.resolve(capabilities('S0')))
    await waitFor(() => expect(api.calls).toContain('diff'))
    await act(async () => {})
    expect(container.querySelector('h1')?.textContent).toBe('Document SRL')
    // Nothing was withdrawn: no second registry read.
    expect(api.calls.filter((call) => call === 'registry')).toHaveLength(1)
    await unmount()
  })

  it('is dropped when the first registry read fails: it is not shown on its own word — in the page nor in the tab', async () => {
    const first = deferred<unknown>()
    const { container, rerender, unmount } = await hydrated(first.promise)
    expect(container.querySelector('h1')?.textContent).toBe('Document SRL')
    expect(document.title).toBe(`DOCUMENT SRL (CUI ${CUI})`)
    await act(async () => first.reject(new Error('registry read failed')))
    await waitFor(() => expect(container.querySelector('h1')?.textContent).toBe('Profilul firmei nu s-a încărcat'))
    expect(container.textContent).not.toContain('Document SRL')
    // F22-R2: the name the tab carried goes with it, and stays gone through a later render.
    expect(document.title).toBe(`CUI ${CUI}`)
    await rerender()
    expect(document.title).toBe(`CUI ${CUI}`)
    expect(container.textContent).not.toContain('Document SRL')
    await unmount()
  })
})

describe('/companies/$cui — a comparison read that finds no directory company (C20-R3)', () => {
  it('withdraws the profile at once and reads the company and the registry again, never saying it is unregistered', async () => {
    const client = appQueryClient()
    const reread = deferred<unknown>()
    const rescope = deferred<unknown>()
    api.profile.mockResolvedValueOnce(companyUnder('S0', 'PREZENT SRL')).mockImplementationOnce(() => reread.promise as Promise<unknown>)
    api.registry = [answer(capabilities('S0')), () => rescope.promise]
    const answered = deferred<unknown>()
    api.diff = [() => answered.promise]
    const Page = await routePage()

    const { rerender } = render(app(client, Page))
    expect(await screen.findByRole('heading', { level: 1, name: 'Prezent SRL' })).toBeInTheDocument()
    expect(document.title).toBe(`PREZENT SRL (CUI ${CUI})`)
    await waitFor(() => expect(api.calls).toContain('diff'))

    // The company turned non-public, or left the directory, after the profile was read.
    await act(async () => answered.resolve({ company: null }))
    await waitFor(() => expect(screen.queryByRole('heading', { level: 1, name: 'Prezent SRL' })).toBeNull())
    expect(screen.getByRole('status', { name: 'Se încarcă profilul firmei' })).toBeInTheDocument()
    // F22-R2: the tab no longer names it either.
    expect(document.title).toBe(`CUI ${CUI}`)
    // Both are read again — the company and the registry — and while they are, nothing of it comes back.
    await waitFor(() => expect(api.profile).toHaveBeenCalledTimes(2))
    expect(api.calls.filter((call) => call === 'registry')).toHaveLength(2)
    await act(async () => {})
    expect(screen.queryByText(/Prezent SRL/u)).toBeNull()
    rerender(app(client, Page))
    expect(document.title).toBe(`CUI ${CUI}`)

    // The company is gone from the directory: said as a finding about the directory, not about its registration.
    await act(async () => {
      rescope.resolve(capabilities('S0'))
      reread.resolve(null)
    })
    expect(await screen.findByRole('heading', { level: 1, name: 'Firma nu a fost găsită' })).toBeInTheDocument()
    expect(document.body.textContent).toMatch(/Asta nu spune dacă firma este înregistrată la registrul comerțului/u)
    expect(document.body.textContent).not.toMatch(/nu este înregistrată|radiat/u)
    // The page unmounted for the route's own state: the tab still names no company, through a later render too.
    expect(document.title).toBe(`CUI ${CUI}`)
    rerender(app(client, Page))
    expect(document.title).toBe(`CUI ${CUI}`)
    expect(document.body.textContent).not.toMatch(/Prezent SRL/u)
  })

  it.each([
    ['answers that the directory holds no such company', () => Promise.resolve(null), 'Firma nu a fost găsită'],
    ['fails', () => Promise.reject(new Error('company read failed')), 'Profilul firmei nu s-a încărcat'],
  ])('names no company in the tab once the route’s own read of a shown company %s (F22-R2)', async (_case, nextRead, state) => {
    // The page is showing the company and naming it in the tab; the route's own read of it is then answered anew —
    // here by a refetch — and the route renders its own state in place of the page, which never got to hide it.
    const client = appQueryClient()
    api.profile.mockResolvedValueOnce(companyUnder('S0', 'PREZENT SRL'))
    api.registry = [answer(capabilities('S0'))]
    api.diff = [answer({ company: { registry: { registry: envelope('S0') }, registrationDiff: null } })]
    const Page = await routePage()

    const { rerender } = render(app(client, Page))
    expect(await screen.findByRole('heading', { level: 1, name: 'Prezent SRL' })).toBeInTheDocument()
    expect(document.title).toBe(`PREZENT SRL (CUI ${CUI})`)
    api.profile.mockImplementationOnce(nextRead)
    await act(async () => {
      await client.refetchQueries({ queryKey: privateCompanyProfileQueryKey(CUI), exact: true })
    })
    expect(await screen.findByRole('heading', { level: 1, name: state })).toBeInTheDocument()
    expect(document.title).toBe(`CUI ${CUI}`)
    rerender(app(client, Page))
    expect(document.title).toBe(`CUI ${CUI}`)
    expect(document.body.textContent).not.toMatch(/Prezent SRL/u)
  })

  it('keeps the withdrawn name out of the page and the tab when the company’s re-read fails (F22-R2)', async () => {
    const client = appQueryClient()
    const reread = deferred<unknown>()
    api.profile.mockResolvedValueOnce(companyUnder('S0', 'PREZENT SRL')).mockImplementationOnce(() => reread.promise as Promise<unknown>)
    api.registry = [answer(capabilities('S0')), answer(capabilities('S0'))]
    const answered = deferred<unknown>()
    api.diff = [() => answered.promise]
    const Page = await routePage()

    const { rerender } = render(app(client, Page))
    expect(await screen.findByRole('heading', { level: 1, name: 'Prezent SRL' })).toBeInTheDocument()
    expect(document.title).toBe(`PREZENT SRL (CUI ${CUI})`)
    // The comparison read finds no directory company; the company's re-read then fails.
    await waitFor(() => expect(api.calls).toContain('diff'))
    await act(async () => answered.resolve({ company: null }))
    await waitFor(() => expect(api.profile).toHaveBeenCalledTimes(2))
    expect(document.title).toBe(`CUI ${CUI}`)
    await act(async () => reread.reject(new Error('company read failed')))
    // The route's own error state: a failed read is not a missing company, and names none.
    expect(await screen.findByRole('heading', { level: 1, name: 'Profilul firmei nu s-a încărcat' })).toBeInTheDocument()
    expect(document.title).toBe(`CUI ${CUI}`)
    rerender(app(client, Page))
    expect(document.title).toBe(`CUI ${CUI}`)
    expect(document.body.textContent).not.toMatch(/Prezent SRL/u)
  })
})

/**
 * Refusal episodes of the comparison read: a registry refusal of the
 * comparison (its scope moved, or access could not be rechecked) — not
 * `company: null`, not an ordinary failure — hides the whole profile at once,
 * its comparison and its name in the tab, and re-reads the registry once per
 * episode; a comparison read started after it and accepted under the same
 * scope ends the episode, so the next, independent refusal is acted on again.
 * Every commit's markup and every title the page writes are recorded; nothing
 * here re-reads the registry for the page.
 */
describe('/companies/$cui — refusal episodes of the comparison read', () => {
  const ACCESS = 'company access (core organization privacy) could not be rechecked by this runtime; the response is withheld'
  const MOVED = 'company registry scope changed during the request; retry'
  const DIFF_TEXT = 'Aceleași înscrieri ca în ediția anterioară.'
  /** The S1 company: its name anywhere, its comparison. */
  const OLD = /Prezent SRL|Aceleași înscrieri/iu
  const NEUTRAL = `CUI ${CUI}`

  let commits: string[] = []
  let titles: string[] = []

  const diffBody = (scopeKey: string) => ({
    company: {
      registry: { registry: envelope(scopeKey) },
      registrationDiff: { fromEditionId: '6', toEditionId: '7', fromCaptureDate: null, toCaptureDate: null, status: 'UNCHANGED', reason: null, changes: [] },
    },
  })
  const refusal = (message: string) => new GraphQLRequestError('refused', { graphQLErrors: [{ message, extensions: { code: 'SERVICE_UNAVAILABLE' } }] })
  const reads = (kind: 'registry' | 'diff') => api.calls.filter((call) => call === kind).length
  const shownSince = (mark: number, pattern: RegExp) => commits.slice(mark).filter((html) => pattern.test(html)).length
  const revalidateDiff = (client: QueryClient) =>
    act(async () => {
      void client.refetchQueries({ queryKey: ['company-registration-diff', CUI, 'S1'], exact: true })
    })

  function observed(client: QueryClient, Page: ComponentType) {
    return (
      <Profiler id="profile" onRender={() => commits.push(document.body.innerHTML)}>
        {app(client, Page)}
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
    commits = []
    titles = []
    // Every title the page writes, not only the last one.
    const own = Object.getOwnPropertyDescriptor(Document.prototype, 'title')
    Object.defineProperty(document, 'title', {
      configurable: true,
      get: () => own?.get?.call(document) as string,
      set: (value: string) => {
        titles.push(value)
        own?.set?.call(document, value)
      },
    })
  })

  afterEach(() => {
    Reflect.deleteProperty(document, 'title')
  })

  it('hides the whole profile, its comparison and its name in the tab at every later refusal, re-reads the registry each time, and shows S2 only when asked', async () => {
    const client = appQueryClient()
    api.profile.mockResolvedValueOnce(companyUnder('S1', 'PREZENT SRL'))
    const echo = deferred<unknown>()
    const rescope = deferred<unknown>()
    const first = deferred<unknown>()
    const fresh = deferred<unknown>()
    const moved = deferred<unknown>()
    api.registry = [answer(capabilities('S1')), () => echo.promise, () => rescope.promise]
    api.diff = [answer(diffBody('S1')), () => first.promise, () => fresh.promise, () => moved.promise]
    const Page = await routePage()

    render(observed(client, Page))
    expect(await screen.findByRole('heading', { level: 1, name: 'Prezent SRL' })).toBeInTheDocument()
    expect(await screen.findByText(DIFF_TEXT)).toBeInTheDocument()
    expect(document.title).toBe(`PREZENT SRL (CUI ${CUI})`)

    // 1. A revalidation of the comparison is refused: access could not be rechecked.
    await revalidateDiff(client)
    await waitFor(() => expect(reads('diff')).toBe(2))
    const refusedAt = commits.length
    const titledAt = titles.length
    await act(async () => first.reject(refusal(ACCESS)))
    // Hidden from the refusal's own render on, while the registry is re-read…
    await waitFor(() => expect(reads('registry')).toBe(2))
    expect(shownSince(refusedAt, OLD)).toBe(0)
    expect(document.title).toBe(NEUTRAL)
    // …and after it confirms S1, while the comparison is read afresh (held).
    await act(async () => echo.resolve(capabilities('S1')))
    await waitFor(() => expect(reads('diff')).toBe(3))
    await settle()
    expect(shownSince(refusedAt, OLD)).toBe(0)
    expect(titles.slice(titledAt).every((title) => title === NEUTRAL)).toBe(true)
    // The fresh read is accepted under S1: the episode is over, and the company is shown again.
    await act(async () => fresh.resolve(diffBody('S1')))
    expect(await screen.findByRole('heading', { level: 1, name: 'Prezent SRL' })).toBeInTheDocument()
    expect(screen.getByText(DIFF_TEXT)).toBeInTheDocument()
    expect(document.title).toBe(`PREZENT SRL (CUI ${CUI})`)

    // 2. The server moves to S2: the next revalidation is refused as moved.
    await revalidateDiff(client)
    await waitFor(() => expect(reads('diff')).toBe(4))
    const movedAt = commits.length
    const movedTitledAt = titles.length
    await act(async () => moved.reject(refusal(MOVED)))
    // The third registry read is the page's own report.
    await waitFor(() => expect(reads('registry')).toBe(3))
    await act(async () => rescope.resolve(capabilities('S2')))
    expect(await screen.findByTestId('company-profile-registry-moved')).toBeInTheDocument()
    await settle()
    expect(reads('diff')).toBe(4)
    expect(shownSince(movedAt, OLD)).toBe(0)
    expect(titles.slice(movedTitledAt).every((title) => title === NEUTRAL)).toBe(true)
    expect(document.title).toBe(NEUTRAL)

    // 3. Only the reader's acceptance: the company is read again under S2 and shown by its S2 answer.
    api.profile.mockResolvedValueOnce(companyUnder('S2', 'ACTUAL SRL'))
    api.registry.push(answer(capabilities('S2')))
    api.diff.push(answer(diffBody('S2')))
    fireEvent.click(screen.getByRole('button', { name: 'Arată datele actuale' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Actual SRL' })).toBeInTheDocument()
    expect(shownSince(movedAt, OLD)).toBe(0)
    expect(document.title).toBe(`ACTUAL SRL (CUI ${CUI})`)
  })

  it('says a comparison the registry keeps refusing as a state with a retry — one registry re-read, no loop — and the retry asks the registry first', async () => {
    const client = appQueryClient()
    api.profile.mockResolvedValueOnce(companyUnder('S1', 'PREZENT SRL'))
    const first = deferred<unknown>()
    api.registry = [answer(capabilities('S1')), answer(capabilities('S1')), answer(capabilities('S2'))]
    api.diff = [answer(diffBody('S1')), () => first.promise, () => Promise.reject(refusal(ACCESS))]
    const Page = await routePage()

    render(observed(client, Page))
    expect(await screen.findByRole('heading', { level: 1, name: 'Prezent SRL' })).toBeInTheDocument()
    await revalidateDiff(client)
    await waitFor(() => expect(reads('diff')).toBe(2))
    const refusedAt = commits.length
    await act(async () => first.reject(refusal(ACCESS)))
    // The registry confirms S1 and the comparison is refused again: a state, said once.
    expect(await screen.findByRole('heading', { level: 1, name: 'Profilul firmei nu s-a încărcat' })).toBeInTheDocument()
    await settle()
    expect(reads('registry')).toBe(2)
    expect(reads('diff')).toBe(3)
    expect(shownSince(refusedAt, OLD)).toBe(0)
    expect(document.title).toBe(NEUTRAL)

    // The registry has moved since: the retry asks it first and says so, asking no comparison under S1.
    fireEvent.click(screen.getByRole('button', { name: 'Încearcă din nou' }))
    expect(await screen.findByTestId('company-profile-registry-moved')).toBeInTheDocument()
    expect(reads('registry')).toBe(3)
    expect(reads('diff')).toBe(3)
    expect(shownSince(refusedAt, OLD)).toBe(0)
  })

  it('says a failed comparison re-read of an open episode as a state with a retry — never stuck checking — and recovers through the registry', async () => {
    const client = appQueryClient()
    client.setDefaultOptions({ queries: { ...client.getDefaultOptions().queries, retryDelay: 0 } })
    api.profile.mockResolvedValueOnce(companyUnder('S1', 'PREZENT SRL'))
    const first = deferred<unknown>()
    const down = () => Promise.reject(new Error('network down'))
    api.registry = [answer(capabilities('S1')), answer(capabilities('S1')), answer(capabilities('S1'))]
    // The refused read; the re-ask and its two retries fail ordinarily; the read after the reader's retry is accepted.
    api.diff = [answer(diffBody('S1')), () => first.promise, down, down, down, answer(diffBody('S1'))]
    const Page = await routePage()

    render(observed(client, Page))
    expect(await screen.findByRole('heading', { level: 1, name: 'Prezent SRL' })).toBeInTheDocument()
    await revalidateDiff(client)
    await waitFor(() => expect(reads('diff')).toBe(2))
    const refusedAt = commits.length
    await act(async () => first.reject(refusal(ACCESS)))
    expect(await screen.findByRole('heading', { level: 1, name: 'Profilul firmei nu s-a încărcat' })).toBeInTheDocument()
    expect(reads('registry')).toBe(2)
    expect(reads('diff')).toBe(5)
    expect(shownSince(refusedAt, OLD)).toBe(0)

    fireEvent.click(screen.getByRole('button', { name: 'Încearcă din nou' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Prezent SRL' })).toBeInTheDocument()
    expect(reads('registry')).toBe(3)
    expect(reads('diff')).toBe(6)
  })

  it('shows a company `company: null` withdrew as soon as its re-read finds it, not waiting for the comparison (the parent-missing path, unchanged)', async () => {
    const client = appQueryClient()
    // The control with a differing re-read (another name); a fully deep-equal re-read is the next case.
    api.profile.mockResolvedValueOnce(companyUnder('S1', 'PREZENT SRL')).mockResolvedValueOnce(companyUnder('S1', 'PREZENT GRUP SRL'))
    const missing = deferred<unknown>()
    const again = deferred<unknown>()
    api.registry = [answer(capabilities('S1')), answer(capabilities('S1'))]
    api.diff = [() => missing.promise, () => again.promise]
    const Page = await routePage()

    render(observed(client, Page))
    expect(await screen.findByRole('heading', { level: 1, name: 'Prezent SRL' })).toBeInTheDocument()
    await waitFor(() => expect(reads('diff')).toBe(1))
    await act(async () => missing.resolve({ company: null }))
    await waitFor(() => expect(screen.queryByRole('heading', { level: 1, name: 'Prezent SRL' })).toBeNull())
    // The registry and the company are read again; the company is there: shown while the comparison is asked again (held).
    await waitFor(() => expect(api.profile).toHaveBeenCalledTimes(2))
    expect(await screen.findByRole('heading', { level: 1, name: 'Prezent Grup SRL' })).toBeInTheDocument()
    expect(reads('registry')).toBe(2)
    expect(reads('diff')).toBe(2)
  })

  it('recovers from `company: null` only through a fresh read — deep-equal to the withdrawn answer — never through the cached or server answer, and says a second loss as a state with a retry (F26 §5)', async () => {
    const NAME = /Prezent SRL/iu
    const neutral = (title: string) => title === NEUTRAL
    // The server's answer for the document and the browser's own first read: the same company, two objects.
    route.loaderData = { cui: CUI, profile: companyUnder('S1', 'PREZENT SRL') }
    const cached = companyUnder('S1', 'PREZENT SRL')
    const reread = deferred<unknown>()
    const retried = deferred<unknown>()
    api.profile.mockResolvedValueOnce(cached).mockImplementationOnce(() => reread.promise as Promise<unknown>).mockImplementationOnce(() => retried.promise as Promise<unknown>)
    const first = deferred<unknown>()
    const missing = deferred<unknown>()
    const missingAgain = deferred<unknown>()
    api.registry = [() => first.promise, answer(capabilities('S1'))]
    api.diff = [() => missing.promise, () => missingAgain.promise, answer(diffBody('S1'))]
    const Page = await routePage()

    // The server renders the document's answer; the browser hydrates it.
    const html = renderToString(
      <Profiler id="profile" onRender={() => undefined}>
        {app(appQueryClient(), Page)}
      </Profiler>,
    )
    expect(html).toContain('Prezent SRL</h1>')
    const container = document.createElement('div')
    container.innerHTML = html
    document.body.appendChild(container)
    const client = appQueryClient()
    const recoverable: unknown[] = []
    let root: Root | undefined
    await act(async () => {
      root = hydrateRoot(container, observed(client, Page), { onRecoverableError: (error) => recoverable.push(error) })
    })
    expect(recoverable).toEqual([])
    const heading = () => container.querySelector('h1')?.textContent
    expect(heading()).toBe('Prezent SRL')

    // The registry answers S1 and the browser's own answer is shown; its comparison then finds no directory company.
    await act(async () => first.resolve(capabilities('S1')))
    await waitFor(() => expect(reads('diff')).toBe(1))
    expect(heading()).toBe('Prezent SRL')
    expect(document.title).toBe(`PREZENT SRL (CUI ${CUI})`)
    const lostAt = commits.length
    const titledAt = titles.length
    await act(async () => missing.resolve({ company: null }))
    // Withdrawn; the registry and the company are read again — the company's re-read held.
    await waitFor(() => expect(api.profile).toHaveBeenCalledTimes(2))
    await settle()
    expect(reads('registry')).toBe(2)
    // A cached object alone never recovers: the cache still holds the withdrawn answer, and a later render that hands
    // it (and the server's) to the page again shows neither — in the page or in the tab.
    expect(client.getQueryData(privateCompanyProfileQueryKey(CUI))).toBe(cached)
    await act(async () => root?.render(observed(client, Page)))
    await settle()
    expect(shownSince(lostAt, NAME)).toBe(0)
    expect(titles.slice(titledAt).every(neutral)).toBe(true)
    expect(document.title).toBe(NEUTRAL)

    // 1. The fresh read answers the same company under the same pin, deep-equal to the withdrawn answer: shown again.
    const fresh = companyUnder('S1', 'PREZENT SRL')
    expect(fresh).toEqual(cached)
    await act(async () => reread.resolve(fresh))
    await waitFor(() => expect(heading()).toBe('Prezent SRL'))
    expect(document.title).toBe(`PREZENT SRL (CUI ${CUI})`)

    // 2. Its comparison, asked again, finds no directory company again under that pin: a state with a retry, no loop.
    await waitFor(() => expect(reads('diff')).toBe(2))
    const lostAgainAt = commits.length
    const titledAgainAt = titles.length
    await act(async () => missingAgain.resolve({ company: null }))
    await waitFor(() => expect(heading()).toBe('Profilul firmei nu s-a încărcat'))
    await settle()
    expect(reads('registry')).toBe(2)
    expect(api.profile).toHaveBeenCalledTimes(2)
    expect(shownSince(lostAgainAt, NAME)).toBe(0)
    expect(titles.slice(titledAgainAt).every(neutral)).toBe(true)
    expect(document.title).toBe(NEUTRAL)

    // 3. The reader's retry reads the company again (held: nothing shown meanwhile); the fresh answer — deep-equal once
    //    more — is shown, and its comparison accepted.
    const retriedAt = commits.length
    fireEvent.click(screen.getByRole('button', { name: 'Încearcă din nou' }))
    await waitFor(() => expect(api.profile).toHaveBeenCalledTimes(3))
    await settle()
    expect(shownSince(retriedAt, NAME)).toBe(0)
    await act(async () => retried.resolve(companyUnder('S1', 'PREZENT SRL')))
    await waitFor(() => expect(heading()).toBe('Prezent SRL'))
    await waitFor(() => expect(reads('diff')).toBe(3))
    expect(await screen.findByText(DIFF_TEXT)).toBeInTheDocument()
    expect(document.title).toBe(`PREZENT SRL (CUI ${CUI})`)
    expect(reads('registry')).toBe(2)
    await act(async () => root?.unmount())
  })

  it('keeps the profile on an ordinary failed comparison — not a refusal — and shows no comparison an earlier read left', async () => {
    const client = appQueryClient()
    client.setDefaultOptions({ queries: { ...client.getDefaultOptions().queries, retryDelay: 0 } })
    api.profile.mockResolvedValueOnce(companyUnder('S1', 'PREZENT SRL'))
    api.registry = [answer(capabilities('S1'))]
    const down = () => Promise.reject(new Error('network down'))
    // The read and the two retries an ordinary failure gets.
    api.diff = [answer(diffBody('S1')), down, down, down]
    const Page = await routePage()

    render(observed(client, Page))
    expect(await screen.findByText(DIFF_TEXT)).toBeInTheDocument()
    await revalidateDiff(client)
    await waitFor(() => expect(screen.queryByText(DIFF_TEXT)).toBeNull())
    await settle()
    // The comparison is missing; the company is not in doubt: shown and named, the registry not re-read.
    expect(screen.getByRole('heading', { level: 1, name: 'Prezent SRL' })).toBeInTheDocument()
    expect(document.title).toBe(`PREZENT SRL (CUI ${CUI})`)
    expect(reads('registry')).toBe(1)
    expect(reads('diff')).toBe(4)
  })
})
