import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestQueryClient } from '@/test/test-utils'
import { GraphQLRequestError } from '@/lib/graphql/graphql-client'
import { render } from '@testing-library/react'
import { getSearchFilter, tagSearchFilters } from '@/features/landing/lib/search-filters'
import type { EntitySearchHit, EntitySearchResult } from '@/schemas/entity-search'
import { LANDING_SEARCH_TYPES, useEntitySelection, useSearchResults } from '@/features/landing/hooks/use-landing-search'
import { announcement, ResultRowContent } from '@/features/landing/components/search/search-parts'

const navigate = vi.fn()
const searchEntities = vi.fn()
const capture = vi.fn()
vi.mock('@lingui/react', () => ({ useLingui: () => ({ i18n: { locale: 'ro' } }) }))
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
/**
 * What `searchEntitiesLive` hands the hook, contract fields included (shared
 * search r4): a current initial page with no next page unless a test says
 * otherwise.
 */
const response = (
  hits: readonly EntitySearchHit[] = [COMPANY],
  meta: Partial<EntitySearchResult> = {},
): EntitySearchResult => ({
  query: 'Dante', engine: 'meili', degraded: false, estimatedTotalHits: hits.length, facets: [], hits,
  generation: { generationId: 'entities_build_1759593600000_k3x9q2', registryScopeKey: 'onrc:published:41:3:7' },
  companyScope: 'onrc:published:41:3:7',
  companyContribution: 'CURRENT',
  companyContributionReason: null,
  continuation: { candidatesReturned: hits.length, nextOffset: null },
  ...meta,
})
const UNAVAILABLE = {
  generation: null, companyContribution: 'UNAVAILABLE', companyContributionReason: 'control_missing',
} as const
const PARTIAL = {
  generation: { generationId: 'entities_build_1759507200000_p7m2c8', registryScopeKey: 'onrc:published:40:2:7' },
  companyContribution: 'PARTIAL', companyContributionReason: 'generation_scope_stale',
} as const

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
  await waitFor(() => expect(['results', 'empty', 'incomplete', 'error']).toContain(result.current.status.kind))
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
    expect(LANDING_SEARCH_TYPES).toEqual(['organization', 'company', 'public_enterprise', 'ngo', 'organization_unclassified', 'legal_act', 'ins_dataset'])
    expect(result.current.status).toEqual({ kind: 'results', results: [COMPANY], stale: false, partial: false })
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
    expect(
      queryClient.getQueryCache().findAll().map((query) => query.queryKey.slice(0, 3)),
    ).toContainEqual(['landingUniversalSearch', 'company', 'firma Dante'])
  })
  it('sends a caller’s source tag with the request, and keys the cache by it', async () => {
    const queryClient = createTestQueryClient()
    function Wrapper({ children }: { readonly children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    }
    const { result } = renderHook(
      () => useSearchResults({ debounceMs: 0, entityTags: ['source::rnong'], suggestions: false }),
      { wrapper: Wrapper },
    )
    await search(result, '3117/A/2026')
    expect(searchEntities).toHaveBeenCalledWith(
      expect.objectContaining({ q: '3117/A/2026', entityTags: ['source::rnong'], limit: 8 }),
      expect.any(AbortSignal),
    )
    // The same term over the whole index is another answer: the tag sits in the key.
    const keys = queryClient.getQueryCache().findAll().map((query) => String(query.queryKey[1]))
    expect(keys.every((key) => key.endsWith('|source::rnong'))).toBe(true)
  })
  it('preserves server ordering and omits missing or external destinations', async () => {
    const ngo = { ...COMPANY, id: 'ngo:123', docType: 'ngo', href: '/ngos/123' }
    const plain = { ...COMPANY, id: 'ngo_10860991_x', docType: 'organization_unclassified', href: '' }
    searchEntities.mockResolvedValue(response([
      ngo, COMPANY, { ...COMPANY, href: '' }, plain, { ...COMPANY, href: 'https://example.com', isExternal: true },
    ]))
    const { result } = setup()
    await search(result)
    // A company with no link is a broken row and goes; an organisation no page holds is shown as such.
    expect(result.current.results).toEqual([ngo, COMPANY, plain])
  })
  it('distinguishes empty results from an unavailable engine', async () => {
    searchEntities.mockResolvedValue(response([]))
    const { result } = setup()
    await search(result)
    expect(result.current.status).toEqual({ kind: 'empty', term: 'Dante' })
    searchEntities.mockResolvedValue(response([], {
      engine: 'none', degraded: true, generation: null, companyScope: null,
      companyContribution: 'UNAVAILABLE', companyContributionReason: 'engine_unavailable',
    }))
    act(() => result.current.setTerm('Sibiu'))
    await waitFor(() => expect(result.current.status.kind).toBe('error'))
    expect(result.current.isCurrent).toBe(false)
  })
  it.each([
    ['an unavailable company part', UNAVAILABLE, 'not-current'],
    ['a partial company part', PARTIAL, 'not-current'],
    ['a current page with more candidates', { continuation: { candidatesReturned: 8, nextOffset: 8 } }, 'more'],
  ] as const)('never calls an empty answer with %s "no results"', async (_name, meta, reason) => {
    searchEntities.mockResolvedValue(response([], meta))
    const { result } = setup()
    await search(result)
    expect(result.current.status).toEqual({ kind: 'incomplete', term: 'Dante', reason })
    // Settled and current, so its rows (none) are this term's answer, but no zero is claimed.
    expect(result.current.isCurrent).toBe(true)
  })
  it('keeps independent rows of a non-current answer, with a partial note and the server’s own hits', async () => {
    const institution: EntitySearchHit = {
      ...COMPANY, id: 'organization:4270740', docType: 'organization', href: '/entities/4270740', isActive: null,
      company: null,
    }
    searchEntities.mockResolvedValue(response([institution], UNAVAILABLE))
    const { result } = setup()
    await search(result)
    expect(result.current.status).toEqual({ kind: 'results', results: [institution], stale: false, partial: true })
    // The very object the transport returned: nothing re-derived, activity still unknown.
    expect(result.current.results[0]).toBe(institution)
    expect(result.current.results[0]?.isActive).toBeNull()
  })
  it('keeps a current answer cached, and asks a non-current one again', async () => {
    const queryClient = createTestQueryClient()
    function Wrapper({ children }: { readonly children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    }
    // Each field stays mounted: the test client's gcTime 0 would drop an unwatched entry.
    const searchIn = async (term: string) => {
      const view = renderHook(() => useSearchResults({ debounceMs: 0 }), { wrapper: Wrapper })
      await search(view.result, term)
      return view
    }
    searchEntities.mockResolvedValue(response())
    await searchIn('Dante')
    await searchIn('Dante')
    // A current answer: the second field reads the first one's cache.
    expect(searchEntities).toHaveBeenCalledTimes(1)

    searchEntities.mockResolvedValue(response([], UNAVAILABLE))
    const first = await searchIn('Sibiu')
    expect(first.result.current.status.kind).toBe('incomplete')
    const second = await searchIn('Sibiu')
    // A non-current answer is asked again, not served from the cache as the answer.
    expect(searchEntities).toHaveBeenCalledTimes(3)
    expect(second.result.current.status.kind).toBe('incomplete')
  })
  it('shows a failed re-read of the same term as an error, never its cached rows', async () => {
    const { result } = setup()
    await search(result)
    expect(result.current.status.kind).toBe('results')
    searchEntities.mockRejectedValue(new Error('offline'))
    act(() => result.current.retry())
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
  it('distinguishes invalid input from an unavailable search service', async () => {
    searchEntities.mockRejectedValue(new GraphQLRequestError('Too many terms', {
      graphQLErrors: [{ message: 'Too many terms', extensions: { code: 'INVALID_INPUT' } }],
    }))
    const { result } = setup()
    act(() => result.current.setTerm('one two three four five six seven eight nine ten eleven'))
    await waitFor(() => expect(result.current.status.kind).toBe('invalid'))
    expect(result.current.isCurrent).toBe(false)
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
  it('refetches with isUat before pagination and never guesses from subtitles', async () => {
    const uat = { ...COMPANY, id: 'organization:4270740', docType: 'organization', href: '/entities/4270740', isUat: true }
    const { result } = setup()
    await search(result, 'primaria sibiu')
    searchEntities.mockResolvedValue(response([uat]))
    act(() => result.current.addFilter(result.current.suggestions[0]))
    expect(result.current.term).toBe('sibiu')
    await waitFor(() => expect(result.current.status).toEqual({ kind: 'results', results: [uat], stale: false, partial: false }))
    expect(searchEntities).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'sibiu', docTypes: ['organization'], isUat: true }), expect.any(AbortSignal))
    searchEntities.mockResolvedValue(response([COMPANY]))
    act(() => result.current.removeFilter(result.current.filters[0]))
    await waitFor(() => expect(result.current.results).toEqual([COMPANY]))
  })
  it('sends a caller’s tag with a chip’s, never instead of it', async () => {
    const queryClient = createTestQueryClient()
    function Wrapper({ children }: { readonly children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    }
    const { result } = renderHook(() => useSearchResults({ debounceMs: 0, entityTags: ['source::rnong'] }), { wrapper: Wrapper })
    await search(result, 'spital Dante')
    act(() => result.current.addFilter(result.current.suggestions.find(filter => filter.entityTag === 'kind::hospital')!))
    await waitFor(() =>
      expect(searchEntities).toHaveBeenLastCalledWith(
        expect.objectContaining({ entityTags: ['source::rnong', 'kind::hospital'] }),
        expect.any(AbortSignal),
      ),
    )
  })
  it('refetches tag selection and removal for the same text', async () => {
    const { result } = setup()
    await search(result, 'spital Dante')
    searchEntities.mockResolvedValue(response([]))
    act(() => result.current.addFilter(result.current.suggestions.find(filter => filter.entityTag === 'kind::hospital')!))
    await waitFor(() => expect(result.current.status).toEqual({ kind: 'empty', term: 'Dante' }))
    expect(searchEntities).toHaveBeenLastCalledWith(expect.objectContaining({ entityTags: ['kind::hospital'] }), expect.any(AbortSignal))
    searchEntities.mockResolvedValue(response([COMPANY]))
    act(() => result.current.removeFilter(result.current.filters[0]))
    await waitFor(() => expect(result.current.results).toEqual([COMPANY]))
    act(() => result.current.reset())
    expect(result.current.status.kind).toBe('idle')
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

describe('landing rows and announcements', () => {
  const COMPANY_PART = {
    registryState: 'IN_EDITION', name: 'DANTE INTERNATIONAL SA', nameSource: 'onrc_edition', legalForm: 'SA',
    countyCode: 'IF', countyName: 'Ilfov', active: null, identifiers: [],
  } as const
  const rowText = (entity: EntitySearchHit) =>
    render(<ResultRowContent entity={entity} query="" />).container.textContent ?? ''

  it('shows a company part’s own ONRC county', () => {
    expect(rowText({ ...COMPANY, countyName: 'Ilfov', company: COMPANY_PART })).toContain('Ilfov')
  })
  it('never passes an institution county off as the ONRC county', () => {
    const text = rowText({
      ...COMPANY, docType: 'public_enterprise', countyName: 'Sibiu',
      company: { ...COMPANY_PART, countyCode: null, countyName: null },
    })
    expect(text).toContain('județul instituției: Sibiu')
  })
  it('keeps a plain county for an identity without a company part', () => {
    const text = rowText({ ...COMPANY, docType: 'organization', countyName: 'Cluj', company: null })
    expect(text).toContain('Cluj')
    expect(text).not.toContain('județul instituției')
  })
  it('says when a company name is the directory’s, not the edition’s', () => {
    const text = rowText({ ...COMPANY, company: { ...COMPANY_PART, nameSource: 'core_organization' } })
    expect(text).toContain('denumire din directorul platformei, nu din ediția ONRC')
    expect(rowText({ ...COMPANY, company: COMPANY_PART })).not.toContain('denumire din directorul')
  })
  it('never attaches a company part’s name source to a mixed role’s own, different title', () => {
    // A public enterprise whose company part has a directory name that differs from its title.
    const text = rowText({
      ...COMPANY, id: 'pe_10020943_x', docType: 'public_enterprise', title: 'REGIA AUTONOMĂ EXEMPLU',
      href: '/intreprinderi-publice/10020943', identifiers: ['10020943'], countyName: 'Ilfov',
      company: { ...COMPANY_PART, name: 'REGIA AUTONOMA EXEMPLU RA', nameSource: 'core_organization', countyName: null },
    })
    expect(text).toContain('REGIA AUTONOMĂ EXEMPLU')
    expect(text).not.toContain('denumire din directorul platformei')
    // The company name is not drawn on the row, so nothing on it can be its provenance.
    expect(text).not.toContain('REGIA AUTONOMA EXEMPLU RA')
    // Its county is still its institution's, said as such.
    expect(text).toContain('județul instituției: Ilfov')
  })
  it('draws no activity, so an unknown one is never shown as active or inactive', () => {
    const text = rowText({ ...COMPANY, isActive: null, company: COMPANY_PART })
    expect(text).not.toMatch(/inactiv|activ\b/i)
  })
  it('announces an incomplete answer without claiming none, and a partial one as such', () => {
    expect(announcement({ kind: 'incomplete', term: 'Dante', reason: 'not-current' })).toBe('Nu putem spune că nu există rezultate.')
    expect(announcement({ kind: 'results', results: [COMPANY], stale: false, partial: true })).toContain('Partea de firme a căutării nu este la zi.')
    expect(announcement({ kind: 'results', results: [COMPANY], stale: false, partial: false })).not.toContain('Partea de firme')
  })
})

describe('landing selection', () => {
  it.each([
    ['company', '/companies/14399840'], ['organization', '/entities/4270740'],
    ['ngo', '/ngos/123'], ['public_enterprise', '/intreprinderi-publice/1590082'],
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


describe('INS scope transitions', () => {
  const hospital = tagSearchFilters('ro').find(filter => filter.entityTag === 'kind::hospital' && !filter.exclude)!
  const excluded = tagSearchFilters('ro').find(filter => filter.entityTag === 'kind::school' && filter.exclude)!
  it('replaces entity qualifiers and requests matrix results from the server', async () => {
    const matrix = { ...COMPANY, id: 'ins_dataset_POP107D_digest', docType: 'ins_dataset',
      href: '/ins/seturi/POP107D', docKey: 'POP107D', identifiers: ['POP107D'], roles: [] }
    searchEntities.mockResolvedValue(response([matrix]))
    const { result } = setup()
    act(() => {
      for (const filter of [getSearchFilter('uat'), getSearchFilter('pnrr'), hospital, excluded]) result.current.addFilter(filter)
      result.current.setTerm('INS populație')
    })
    act(() => result.current.addFilter(result.current.suggestions.find(filter => filter.id === 'ins_dataset')!))
    expect(result.current.filters.map(filter => filter.id)).toEqual(['ins_dataset'])
    expect(result.current.term).toBe('populație')
    await waitFor(() => expect(result.current.isCurrent).toBe(true))
    expect(searchEntities).toHaveBeenLastCalledWith({ q: 'populație', docTypes: ['ins_dataset'], limit: 8 }, expect.any(AbortSignal))
    expect(result.current.results).toEqual([matrix])
    act(() => result.current.removeFilter(result.current.filters[0]))
    await waitFor(() => expect(searchEntities).toHaveBeenLastCalledWith({ q: 'populație', docTypes: LANDING_SEARCH_TYPES, limit: 8 }, expect.any(AbortSignal)))
  })
  it.each([getSearchFilter('uat'), getSearchFilter('pnrr'), getSearchFilter('public_enterprise'), hospital, excluded])('leaves INS when selecting $id', filter => {
    const { result } = setup()
    act(() => result.current.addFilter(getSearchFilter('ins_dataset')))
    act(() => result.current.addFilter(filter))
    expect(result.current.filters).toEqual([filter])
  })
})
