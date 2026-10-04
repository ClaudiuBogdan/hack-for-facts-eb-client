import type { ReactNode } from 'react'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GraphQLRequestError } from '@/lib/graphql/graphql-client'
import { createQueryClient } from '@/lib/queryClient'
import { isRegistryScopeMoved } from '../api/company-registry-errors'
import { CompanyRegistryScopeContext, useCompanyRegistryScopeState } from './use-company-registry-scope'
import { useCompanyNameSuggestions } from './use-company-name-suggestions'

/**
 * Name suggestions bound to the page's pinned registry scope, through the
 * app's own query client, the real scope hook, adapter, parse and acceptance
 * check over a scripted transport: an answer is cached and shown only under
 * the scope it was asked and answered under — zero hits included; an answer
 * under another scope never enters the pinned scope's cache; a refusal clears
 * what the scope cached, re-reads the registry once and stops reads under the
 * refused scope; a late answer of an old scope is never drawn; `degraded` is
 * not a healthy zero; a failure is a failure, never `[]`; a cancelled read is
 * cancelled.
 */

type Deferred = { readonly promise: Promise<unknown>; readonly resolve: (value: unknown) => void; readonly reject: (reason: unknown) => void }
function deferred(): Deferred {
  let resolve!: (value: unknown) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<unknown>((done, fail) => {
    resolve = done
    reject = fail
  })
  return { promise, resolve, reject }
}

const transport = vi.hoisted(() => ({
  capabilities: [] as (() => Promise<unknown>)[],
  registryReads: 0,
  resolve: (_variables: Record<string, unknown>, _signal?: AbortSignal): Promise<unknown> => Promise.resolve(null),
  resolves: [] as { readonly variables: Record<string, unknown>; readonly signal: AbortSignal | undefined }[],
}))

vi.mock('@/lib/graphql/graphql-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/graphql/graphql-client')>()
  return {
    ...actual,
    graphqlQuery: vi.fn(async (query: string, variables: Record<string, unknown> = {}, options: { readonly signal?: AbortSignal } = {}) => {
      if (query.includes('companyRegistry {')) {
        transport.registryReads += 1
        const next = transport.capabilities.length > 1 ? transport.capabilities.shift() : transport.capabilities[0]
        if (!next) throw new Error('unscripted registry read')
        return { companyRegistry: await next() }
      }
      if (query.includes('companyResolveResult(')) {
        transport.resolves.push({ variables, signal: options.signal })
        return transport.resolve(variables, options.signal)
      }
      throw new Error(`unexpected query: ${query.slice(0, 60)}`)
    }),
  }
})
vi.mock('../lib/mock-mode', () => ({ isPrivateCompanyMockEnabled: () => false }))

const envelope = (scopeKey: string) => ({
  source: 'onrc',
  state: 'PUBLISHED',
  editionId: scopeKey === S2 ? '8' : '7',
  sourceSnapshotId: 'firme',
  sourcePublishedAt: '2026-09-30',
  interpretationVersion: 'onrc-interp-v1',
  dimensionPolicyVersion: 'onrc-dim-v1',
  eligibilityPolicyVersion: 'onrc-elig-v1',
  publicationEpoch: scopeKey === S2 ? '4' : '3',
  accessEpoch: '11',
  reason: null,
  scopeKey,
})
const S0 = 'onrc:published:6:2:11'
const S1 = 'onrc:published:7:3:11'
const S2 = 'onrc:published:8:4:11'
const capabilities = (scopeKey: string) => () => Promise.resolve({ registry: envelope(scopeKey), editions: [], registryFilterFields: [], caenRevisions: [] })

const hit = (cui: string, label: string) => ({ dim: 'NAME', value: cui, label, cui, confidence: 0.9, revision: null, key: null, labelSource: 'onrc_edition' })
const answer = (scopeKey: string, hits: readonly ReturnType<typeof hit>[], degraded = false) => ({
  companyResolveResult: { hits, degraded, ambiguous: hits.length > 1, registry: envelope(scopeKey), scopeKey },
})
const scopeRefusal = () =>
  new GraphQLRequestError('GraphQL errors', {
    graphQLErrors: [
      {
        message: 'company registry scope changed (publication, rollback, withdrawal or access) since registryScope was issued; read the current scope and resolve again',
        extensions: { code: 'INVALID_INPUT' },
      },
    ],
  })

let client: QueryClient
/** The page's scope as its provider last rendered it. */
let provided: ReturnType<typeof useCompanyRegistryScopeState> | null = null
/** The labels the hook gave the dropdown, render by render: what the reader could have seen, at any moment. */
let drawn: string[][] = []

/** The suggestions under one registry pin, provided as the company pages provide it. */
function renderPage(initialDraft: string) {
  const wrapper = ({ children }: { readonly children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <ProvideScope>{children}</ProvideScope>
    </QueryClientProvider>
  )
  return renderHook(
    ({ draft }: { readonly draft: string }) => {
      const suggestions = useCompanyNameSuggestions(draft)
      drawn.push((suggestions.data ?? []).map((suggestion) => suggestion.label))
      return suggestions
    },
    { wrapper, initialProps: { draft: initialDraft } },
  )
}

/** The provider the company pages mount, exposing its scope to the test. */
function ProvideScope({ children }: { readonly children: ReactNode }) {
  const scope = useCompanyRegistryScopeState()
  provided = scope
  return <CompanyRegistryScopeContext.Provider value={scope}>{children}</CompanyRegistryScopeContext.Provider>
}

const cached = (scopeKey: string, q: string) => client.getQueryData(['company-name-suggestions', scopeKey, q])
const resolvesUnder = (scopeKey: string) => transport.resolves.filter((call) => call.variables.registryScope === scopeKey).length

beforeEach(() => {
  client = createQueryClient()
  client.setDefaultOptions({ queries: { ...client.getDefaultOptions().queries, retry: false } })
  provided = null
  drawn = []
  transport.capabilities = [capabilities(S1)]
  transport.registryReads = 0
  transport.resolves = []
  transport.resolve = () => Promise.resolve(answer(S1, []))
})

describe('useCompanyNameSuggestions under the page’s pinned scope', () => {
  it('sends the pinned scope and caches a matching answer under it — an empty one as a genuine no match', async () => {
    transport.resolve = () => Promise.resolve(answer(S1, [hit('14399840', 'DANTE INTERNATIONAL SA')]))
    const { result, rerender } = renderPage('dante')
    await waitFor(() => expect(result.current.data).toEqual([expect.objectContaining({ cui: '14399840', labelSource: 'onrc_edition' })]))
    expect(transport.resolves[0]?.variables).toMatchObject({ dim: 'NAME', q: 'dante', registryScope: S1 })
    expect(cached(S1, 'dante')).toMatchObject({ scopeKey: S1 })

    transport.resolve = () => Promise.resolve(answer(S1, []))
    rerender({ draft: 'zzz-nimic' })
    await waitFor(() => expect(result.current.data).toEqual([]))
    expect(result.current).toMatchObject({ isSuccess: true, degraded: false })
    expect(cached(S1, 'zzz-nimic')).toMatchObject({ hits: [], scopeKey: S1 })
  })

  it('keeps a degraded answer apart from a healthy zero', async () => {
    transport.resolve = () => Promise.resolve(answer(S1, [], true))
    const { result } = renderPage('dante')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current).toMatchObject({ data: [], degraded: true })
  })

  it('never lets an answer under another scope into the pinned scope’s cache, and re-reads the registry once', async () => {
    transport.resolve = () => Promise.resolve(answer(S0, [hit('9', 'VECHI SRL')]))
    const { result } = renderPage('dante')
    await waitFor(() => expect(transport.registryReads).toBe(2))
    // The registry confirms S1; asked once more, the answer is still S0's: refused, said as a moved scope, and the
    // registry is not re-read again for the same scope.
    await waitFor(() => expect(isRegistryScopeMoved(result.current.error)).toBe(true))
    expect(cached(S1, 'dante')).toBeUndefined()
    expect(result.current.data).toBeUndefined()
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })
    expect(transport.registryReads).toBe(2)
    expect(cached(S1, 'dante')).toBeUndefined()
  })

  it('on a scope refusal clears what the scope cached, re-reads the registry, and reads nothing more under the refused scope', async () => {
    transport.resolve = () => Promise.resolve(answer(S1, [hit('14399840', 'DANTE INTERNATIONAL SA')]))
    const { result, rerender } = renderPage('dan')
    await waitFor(() => expect(result.current.data).toHaveLength(1))
    expect(cached(S1, 'dan')).toBeDefined()

    // The registry moved to S2 on the server: the resolver refuses S1, and the registry now answers S2.
    transport.capabilities = [capabilities(S2)]
    transport.resolve = () => Promise.reject(scopeRefusal())
    rerender({ draft: 'dant' })
    await waitFor(() => expect(transport.registryReads).toBe(2))
    expect(cached(S1, 'dan')).toBeUndefined()
    await waitFor(() => expect(provided?.status === 'ready' && provided.moved?.registry.scopeKey).toBe(S2))
    expect(result.current.data).toBeUndefined()

    // Typing on: no read under S1, and none at all until the reader takes the new scope.
    const underS1 = resolvesUnder(S1)
    rerender({ draft: 'dante' })
    expect(resolvesUnder(S2)).toBe(0)

    // The reader takes it: suggestions are read, and shown, under S2 only — the typed draft included.
    transport.resolve = () => Promise.resolve(answer(S2, [hit('14399840', 'DANTE INTERNATIONAL SA')]))
    act(() => {
      if (provided?.status === 'ready') provided.accept()
    })
    await waitFor(() => expect(transport.resolves.some((call) => call.variables.registryScope === S2 && call.variables.q === 'dante')).toBe(true))
    await waitFor(() => expect(result.current.data).toHaveLength(1))
    // Every read between the refusal and the acceptance: none under S1 (the call log, not a wait, says so).
    expect(resolvesUnder(S1)).toBe(underS1)
  })

  it('never draws a late answer of the old scope after the page has moved on', async () => {
    const late = deferred()
    transport.resolve = () => late.promise
    const { result } = renderPage('dante')
    await waitFor(() => expect(resolvesUnder(S1)).toBe(1))

    // The registry moves; the reader takes S2 while the S1 read is still out.
    transport.capabilities = [capabilities(S2)]
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['company-registry'] })
    })
    await waitFor(() => expect(provided?.status === 'ready' && provided.moved?.registry.scopeKey).toBe(S2))
    const current = deferred()
    transport.resolve = () => current.promise
    act(() => {
      if (provided?.status === 'ready') provided.accept()
    })
    await waitFor(() => expect(resolvesUnder(S2)).toBe(1))

    // The S1 answer lands late, with its own (old) hits: never drawn under S2.
    await act(async () => late.resolve(answer(S1, [hit('9', 'VECHI SRL')])))
    expect(result.current.data).toBeUndefined()
    await act(async () => current.resolve(answer(S2, [hit('14399840', 'DANTE INTERNATIONAL SA')])))
    await waitFor(() => expect(result.current.data).toEqual([expect.objectContaining({ label: 'DANTE INTERNATIONAL SA' })]))
    expect(JSON.stringify(result.current.data)).not.toContain('VECHI')
  })

  it('keeps an ordinary failure a failure: no empty list, no registry re-read', async () => {
    transport.resolve = () => Promise.reject(new GraphQLRequestError('GraphQL request failed: 502 Bad Gateway', { status: 502 }))
    const { result } = renderPage('dante')
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.data).toBeUndefined()
    expect(isRegistryScopeMoved(result.current.error)).toBe(false)
    expect(transport.registryReads).toBe(1)
  })

  it('hides what a query kept once its refetch fails', async () => {
    transport.resolve = () => Promise.resolve(answer(S1, [hit('14399840', 'DANTE INTERNATIONAL SA')]))
    const { result } = renderPage('dante')
    await waitFor(() => expect(result.current.data).toHaveLength(1))
    transport.resolve = () => Promise.reject(new GraphQLRequestError('GraphQL request failed: 503', { status: 503 }))
    await act(async () => {
      await client.refetchQueries({ queryKey: ['company-name-suggestions', S1, 'dante'] })
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.data).toBeUndefined()
  })

  it('cancels the read of a draft the reader typed past', async () => {
    transport.resolve = (_variables, signal) =>
      new Promise((_resolve, reject) => signal?.addEventListener('abort', () => reject(new DOMException('The operation was aborted.', 'AbortError'))))
    const { rerender } = renderPage('dant')
    await waitFor(() => expect(transport.resolves).toHaveLength(1))
    const first = transport.resolves[0]?.signal
    rerender({ draft: 'dante' })
    await waitFor(() => expect(transport.resolves).toHaveLength(2))
    await waitFor(() => expect(first?.aborted).toBe(true))
  })
})

/**
 * Refusal episodes (F24-R1): a refusal retires everything the scope cached and
 * re-reads the registry; until a resolve read started after it is accepted
 * under the same scope, further refusals are the same episode (no loop). Once
 * such a read is accepted — a healthy zero included — a later, independent
 * refusal acts again: nothing of the scope's earlier answers is drawn, nothing
 * is read under it while unbound, and only the reader's acceptance brings
 * suggestions back under the new scope. Neither the registry answering the
 * same scope again, nor a cached prefix, a placeholder or a read begun before
 * the refusal closes an episode. Every answer is a held promise released at a
 * chosen point; the call log and every rendered list are the evidence.
 */
describe('useCompanyNameSuggestions — refusal episodes (F24-R1)', () => {
  const ok = (scopeKey: string, labels: readonly string[]) => () => Promise.resolve(answer(scopeKey, labels.map((label, index) => hit(String(100 + index), label))))
  /** Access that could not be rechecked: the registry refuses without a new scope. */
  const accessRefusal = () =>
    new GraphQLRequestError('GraphQL errors', {
      graphQLErrors: [{ message: 'company access (core organization privacy) could not be rechecked by this runtime; the response is withheld', extensions: { code: 'SERVICE_UNAVAILABLE' } }],
    })
  /** Answers by draft, in order; a draft's last answer repeats. */
  const scripted = (answers: Record<string, readonly (() => Promise<unknown>)[]>) => {
    const queues = new Map(Object.entries(answers).map(([q, list]) => [q, [...list]]))
    transport.resolve = (variables) => {
      const queue = queues.get(String(variables.q))
      const next = queue && queue.length > 1 ? queue.shift() : queue?.[0]
      return next ? next() : Promise.reject(new Error(`unscripted resolve: ${String(variables.q)}`))
    }
  }
  const labels = (data: readonly { readonly label: string }[] | undefined) => (data ?? []).map((suggestion) => suggestion.label)
  const drawnSince = (index: number) => drawn.slice(index).flat()

  it('after a refusal and an accepted recovery under S1, a later refusal retires every S1 suggestion again and leaves S1 until the reader takes S2', async () => {
    const dante = deferred()
    transport.capabilities = [capabilities(S1), capabilities(S1), capabilities(S2)]
    scripted({
      da: [() => Promise.reject(accessRefusal()), ok(S1, ['ALFA SRL'])],
      dan: [ok(S1, ['BETA SRL']), ok(S2, ['DELTA SRL'])],
      dant: [ok(S1, ['GAMA SRL'])],
      dante: [() => dante.promise],
    })

    // 1. Pinned S1, the first read is refused; the registry confirms S1; the read is asked again and accepted.
    const { result, rerender } = renderPage('da')
    await waitFor(() => expect(labels(result.current.data)).toEqual(['ALFA SRL']))
    expect(transport.registryReads).toBe(2)
    // 2. Two more prefixes answered and cached under S1.
    rerender({ draft: 'dan' })
    await waitFor(() => expect(labels(result.current.data)).toEqual(['BETA SRL']))
    rerender({ draft: 'dant' })
    await waitFor(() => expect(labels(result.current.data)).toEqual(['GAMA SRL']))
    for (const q of ['da', 'dan', 'dant']) expect(cached(S1, q)).toBeDefined()

    // 3. The server moved to S2: the next draft's read is refused as a stale scope.
    rerender({ draft: 'dante' })
    await waitFor(() => expect(transport.resolves.some((call) => call.variables.q === 'dante')).toBe(true))
    const underS1 = resolvesUnder(S1)
    const refusedFrom = drawn.length
    await act(async () => dante.reject(scopeRefusal()))
    // The registry is re-read (now S2) and every S1 suggestion is retired — the repopulated ones too.
    await waitFor(() => expect(transport.registryReads).toBe(3))
    for (const q of ['da', 'dan', 'dant', 'dante']) expect(cached(S1, q)).toBeUndefined()
    await waitFor(() => expect(provided?.status === 'ready' && provided.moved?.registry.scopeKey).toBe(S2))

    // 4. Typing back to a prefix S1 answered: nothing of it is drawn.
    rerender({ draft: 'dan' })
    expect(result.current.data).toBeUndefined()

    // 5. Only the reader's acceptance brings suggestions back, under S2.
    act(() => {
      if (provided?.status === 'ready') provided.accept()
    })
    await waitFor(() => expect(labels(result.current.data)).toEqual(['DELTA SRL']))
    expect(transport.resolves[transport.resolves.length - 1]?.variables).toMatchObject({ q: 'dan', registryScope: S2 })
    // No S1 read went out after the refusal, and no rendered list held an S1 answer.
    expect(resolvesUnder(S1)).toBe(underS1)
    expect(drawnSince(refusedFrom).filter((label) => ['ALFA SRL', 'BETA SRL', 'GAMA SRL'].includes(label))).toEqual([])
  })

  it('does not close an episode when the registry answers S1 again while the re-ask is pending, nor when the re-ask is refused', async () => {
    const reask = deferred()
    scripted({ dan: [() => Promise.reject(accessRefusal()), () => reask.promise] })
    const { result } = renderPage('dan')
    await waitFor(() => expect(transport.registryReads).toBe(2))
    await waitFor(() => expect(transport.resolves).toHaveLength(2))

    // The registry answers S1 again: an echo, not an accepted read.
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['company-registry'] })
    })
    expect(transport.registryReads).toBe(3)
    // The re-ask is refused too: the same episode, said as a state — the registry is not read again.
    await act(async () => reask.reject(accessRefusal()))
    await waitFor(() => expect(result.current.isError).toBe(true))
    await act(async () => {})
    expect(transport.registryReads).toBe(3)
    expect(transport.resolves).toHaveLength(2)
    expect(result.current.data).toBeUndefined()
  })

  it('does not close an episode on a cached prefix, a placeholder, or a read begun before the refusal', async () => {
    const lateDant = deferred()
    const dante = deferred()
    const reaskDante = deferred()
    const reaskDan = deferred()
    scripted({
      dan: [ok(S1, ['BETA SRL']), () => reaskDan.promise],
      dant: [() => lateDant.promise],
      dante: [() => dante.promise, () => reaskDante.promise],
    })
    const { result, rerender } = renderPage('dan')
    await waitFor(() => expect(labels(result.current.data)).toEqual(['BETA SRL']))
    // A read begun before the refusal: still out when the next draft is refused.
    rerender({ draft: 'dant' })
    await waitFor(() => expect(transport.resolves.some((call) => call.variables.q === 'dant')).toBe(true))
    rerender({ draft: 'dante' })
    await waitFor(() => expect(transport.resolves.some((call) => call.variables.q === 'dante')).toBe(true))
    const refusedFrom = drawn.length
    await act(async () => dante.reject(accessRefusal()))
    await waitFor(() => expect(transport.registryReads).toBe(2))
    expect(cached(S1, 'dan')).toBeUndefined()
    await waitFor(() => expect(transport.resolves.filter((call) => call.variables.q === 'dante')).toHaveLength(2))

    // The pre-refusal read is answered now, accepted under S1: it is not a read started after the refusal.
    await act(async () => lateDant.resolve(answer(S1, [hit('101', 'GAMA SRL')])))
    expect(cached(S1, 'dant')).toBeUndefined()
    // The re-ask is refused: still the same episode.
    await act(async () => reaskDante.reject(accessRefusal()))
    await waitFor(() => expect(result.current.isError).toBe(true))
    await act(async () => {})
    expect(transport.registryReads).toBe(2)

    // Back to the prefix S1 had answered: no cached answer, no placeholder — its read is held, then refused.
    rerender({ draft: 'dan' })
    await waitFor(() => expect(transport.resolves.filter((call) => call.variables.q === 'dan')).toHaveLength(2))
    expect(result.current.data).toBeUndefined()
    await act(async () => reaskDan.reject(accessRefusal()))
    await waitFor(() => expect(result.current.isError).toBe(true))
    await act(async () => {})
    expect(transport.registryReads).toBe(2)
    expect(drawnSince(refusedFrom).filter((label) => label === 'BETA SRL' || label === 'GAMA SRL')).toEqual([])
  })

  it('closes an episode on an accepted healthy zero under the same scope: the next, independent refusal acts again, once', async () => {
    scripted({ dan: [() => Promise.reject(accessRefusal()), ok(S1, [])], dant: [() => Promise.reject(accessRefusal())] })
    const { result, rerender } = renderPage('dan')
    await waitFor(() => expect(result.current).toMatchObject({ isSuccess: true, data: [] }))
    expect(transport.registryReads).toBe(2)
    expect(cached(S1, 'dan')).toMatchObject({ hits: [], scopeKey: S1 })

    rerender({ draft: 'dant' })
    await waitFor(() => expect(transport.registryReads).toBe(3))
    expect(cached(S1, 'dan')).toBeUndefined()
    // Its re-ask is refused again: one re-read for this episode, no loop.
    await waitFor(() => expect(transport.resolves.filter((call) => call.variables.q === 'dant')).toHaveLength(2))
    await waitFor(() => expect(result.current.isError).toBe(true))
    await act(async () => {})
    expect(transport.registryReads).toBe(3)
  })
})
