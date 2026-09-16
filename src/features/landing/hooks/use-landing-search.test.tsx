import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestQueryClient } from '@/test/test-utils'
import type { EntitySearchHit } from '@/schemas/entity-search'
import { LANDING_SEARCH_TYPES, useEntitySelection, useSearchResults } from '@/features/landing/hooks/use-landing-search'

const navigate = vi.fn()
const searchEntities = vi.fn()
const capture = vi.fn()
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))
vi.mock('@/features/entity-search/api/entity-search-api.live', () => ({
  searchEntitiesLive: (...args: readonly unknown[]) => searchEntities(...args),
}))
vi.mock('@/lib/analytics', () => ({ Analytics: {
  EVENTS: { EntitySearchPerformed: 'search', EntitySearchSelected: 'selected' },
  capture: (...args: readonly unknown[]) => capture(...args),
} }))

const COMPANY: EntitySearchHit = {
  id: 'company:14399840', title: 'DANTE INTERNATIONAL SA', docType: 'company',
  href: '/companies/14399840', isExternal: false, identifiers: ['14399840'],
  countyName: null, subtitle: null, snippet: null, roles: ['company'],
  isActive: true, docId: null, docKey: '14399840', url: null, score: null,
}
const response = (hits: readonly EntitySearchHit[] = [COMPANY]) => ({ hits, degraded: false })

function setup(debounceMs = 0) {
  const queryClient = createTestQueryClient()
  function Wrapper({ children }: { readonly children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  return renderHook((props: { readonly debounceMs: number }) => useSearchResults(props), {
    wrapper: Wrapper, initialProps: { debounceMs },
  })
}
async function search(result: { current: ReturnType<typeof useSearchResults> }, term = 'Dante') {
  act(() => result.current.setTerm(term))
  await waitFor(() => expect(['results', 'empty', 'error']).toContain(result.current.status.kind))
}
beforeEach(() => {
  navigate.mockReset(); capture.mockReset(); searchEntities.mockReset()
  searchEntities.mockResolvedValue(response())
})

describe('landing universal search', () => {
  it('waits for three characters and the debounce', () => {
    const { result } = setup(10_000)
    expect(result.current.status.kind).toBe('idle')
    act(() => result.current.setTerm('Da'))
    expect(result.current.status).toEqual({ kind: 'short', remaining: 1 })
    act(() => result.current.setTerm('Dante'))
    expect(result.current.status.kind).toBe('pending')
    expect(searchEntities).not.toHaveBeenCalled()
  })
  it('uses universal search with the supported families and cancellation', async () => {
    const { result } = setup()
    await search(result)
    expect(searchEntities).toHaveBeenCalledWith({
      q: 'Dante', docTypes: LANDING_SEARCH_TYPES, limit: 8,
    }, expect.any(AbortSignal))
    expect(LANDING_SEARCH_TYPES).toEqual(['organization', 'company', 'public_enterprise', 'ngo', 'legal_act'])
    expect(result.current.status).toEqual({ kind: 'results', results: [COMPANY], stale: false })
    await search(result, '  Dante  ')
    expect(searchEntities).toHaveBeenCalledTimes(1)
  })
  it('sends a caller-fixed scope, keys the cache by it, and offers no chips over it', async () => {
    const queryClient = createTestQueryClient()
    function Wrapper({ children }: { readonly children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    }
    const { result } = renderHook(
      () => useSearchResults({ debounceMs: 0, docTypes: ['company'], suggestions: false }),
      { wrapper: Wrapper },
    )
    await search(result, 'firma Dante')
    expect(searchEntities).toHaveBeenCalledWith({
      q: 'firma Dante', docTypes: ['company'], limit: 8,
    }, expect.any(AbortSignal))
    // `firma` would earn a chip on the landing; over a fixed scope it is text.
    expect(result.current.suggestions).toEqual([])
    // The scope sits in the key, so the landing's rows for the same term are
    // never served to a field that asked for companies alone.
    expect(queryClient.getQueryCache().findAll().map((query) => query.queryKey)).toContainEqual(
      ['landingUniversalSearch', 'company', 'firma Dante'],
    )
  })
  it('preserves server ordering and omits missing or external destinations', async () => {
    const ngo = { ...COMPANY, id: 'ngo:123', docType: 'ngo', href: '/ong-uri/123' }
    searchEntities.mockResolvedValue(response([
      ngo, COMPANY, { ...COMPANY, href: '' }, { ...COMPANY, href: 'https://example.com', isExternal: true },
    ]))
    const { result } = setup()
    await search(result)
    expect(result.current.results).toEqual([ngo, COMPANY])
  })
  it('distinguishes empty results from an unavailable engine', async () => {
    searchEntities.mockResolvedValue(response([]))
    const { result } = setup()
    await search(result)
    expect(result.current.status).toEqual({ kind: 'empty', term: 'Dante', narrowed: false })
    searchEntities.mockResolvedValue({ hits: [], degraded: true })
    act(() => result.current.setTerm('Sibiu'))
    await waitFor(() => expect(result.current.status.kind).toBe('error'))
    expect(result.current.isCurrent).toBe(false)
  })
  it('reports transport errors without substituting sample institutions', async () => {
    searchEntities.mockRejectedValue(new Error('offline'))
    const { result } = setup()
    await search(result)
    expect(result.current.status.kind).toBe('error')
    expect(capture).not.toHaveBeenCalled()
  })
  it('makes previous results unselectable during typing and failed requests', async () => {
    const { result, rerender } = setup()
    await search(result)
    rerender({ debounceMs: 10_000 })
    act(() => result.current.setTerm('Sibiu'))
    expect(result.current.status).toMatchObject({ kind: 'results', stale: true })
    expect(result.current.isCurrent).toBe(false)
    searchEntities.mockRejectedValue(new Error('offline'))
    rerender({ debounceMs: 0 })
    await waitFor(() => expect(result.current.status.kind).toBe('error'))
    expect(result.current.isCurrent).toBe(false)
  })
  it('applies a chip to the page it has, and never sends it', async () => {
    const uat = { ...COMPANY, id: 'organization:4305857', docType: 'organization', href: '/entities/4305857', subtitle: 'uat, uat_municipality' }
    searchEntities.mockResolvedValue(response([uat, COMPANY]))
    const { result } = setup()
    await search(result, 'primaria cluj')
    expect(result.current.suggestions.map((f) => f.id)).toEqual(['uat'])
    act(() => result.current.addFilter(result.current.suggestions[0]))
    // Primării keeps its word: the palette's synonym on it is what finds the municipality.
    expect(result.current.term).toBe('primaria cluj')
    expect(result.current.filters.map((f) => f.id)).toEqual(['uat'])
    expect(result.current.suggestions).toEqual([])
    await waitFor(() => expect(result.current.status).toEqual({ kind: 'results', results: [uat], stale: false }))
    // The request is the text alone: same fixed scope, no docTypes for the chip, no roles.
    for (const [input] of searchEntities.mock.calls) {
      expect(input).toEqual({ q: expect.any(String), docTypes: LANDING_SEARCH_TYPES, limit: 8 })
    }
    act(() => result.current.removeFilter(result.current.filters[0]))
    expect(result.current.status).toEqual({ kind: 'results', results: [uat, COMPANY], stale: false })
  })
  it('distinguishes a page narrowed to nothing from a page with nothing on it', async () => {
    const { result } = setup()
    await search(result, 'pnrr dante')
    act(() => result.current.addFilter(result.current.suggestions[0]))
    // The company carries no PNRR role, so the page is narrowed to nothing — and says so.
    await waitFor(() => expect(result.current.status).toEqual({ kind: 'empty', term: 'dante', narrowed: true }))
    act(() => result.current.reset())
    expect(result.current.status).toEqual({ kind: 'idle' })
    expect(result.current.filters).toEqual([])
  })
  it('asks for a name when a chip is on and the text is empty', async () => {
    const { result } = setup(10_000)
    act(() => result.current.setTerm('firma'))
    act(() => result.current.addFilter(result.current.suggestions[0]))
    expect(result.current.term).toBe('')
    expect(result.current.status).toEqual({ kind: 'scoped' })
    expect(searchEntities).not.toHaveBeenCalled()
  })
  it('aborts an in-flight request on unmount', async () => {
    searchEntities.mockImplementation(() => new Promise(() => {}))
    const { result, unmount } = setup()
    act(() => result.current.setTerm('Dante'))
    await waitFor(() => expect(searchEntities).toHaveBeenCalledTimes(1))
    const signal = searchEntities.mock.calls[0][1] as AbortSignal
    unmount()
    expect(signal.aborted).toBe(true)
  })
})

describe('landing selection', () => {
  it.each([
    ['company', '/companies/14399840'], ['organization', '/entities/4270740'],
    ['ngo', '/ong-uri/123'], ['public_enterprise', '/intreprinderi-publice/1590082'],
    ['legal_act', '/legislation/acts/66150'],
  ])('uses the mapped %s destination', (docType, href) => {
    const { result } = renderHook(() => useEntitySelection())
    act(() => result.current({ ...COMPANY, docType, href }))
    expect(navigate).toHaveBeenCalledWith({ to: href })
  })
  it('lets an anchor navigate and records a typed identity, not a fabricated CUI', () => {
    const { result } = renderHook(() => useEntitySelection())
    act(() => result.current(COMPANY, { skipNavigate: true }))
    expect(navigate).not.toHaveBeenCalled()
    expect(capture).toHaveBeenCalledWith('selected', { entity_id: COMPANY.id, doc_type: 'company' })
  })
  it('ignores missing or unusable destinations', () => {
    const { result } = renderHook(() => useEntitySelection())
    act(() => { result.current(undefined); result.current({ ...COMPANY, href: '' }) })
    expect(navigate).not.toHaveBeenCalled()
    expect(capture).not.toHaveBeenCalled()
  })
})
