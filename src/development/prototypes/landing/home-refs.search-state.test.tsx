import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestQueryClient } from '@/test/test-utils'
import type { EntitySearchNode } from '@/schemas/entities'
import { MIN_QUERY_CHARS, useEntitySelection, useSearchResults } from './home-refs.search-state'

/**
 * The data layer, on its own.
 *
 * Keyboard travel, what Escape means and when Enter may act belong to Base UI
 * now, and are tested through the rendered component in
 * `home-refs.search.test.tsx` where they can be exercised the way a reader
 * exercises them. What is left here is everything that would be identical under
 * any combobox: the debounce, the seven states, staleness, the stand-in
 * fallback, and the rule that fabricated rows stay out of telemetry.
 *
 * The debounce is real and driven through the hook's own `debounceMs` rather
 * than mocked to the identity function the shipped hook's test uses — that mock
 * makes every assertion about timing vacuous, and timing is where the
 * interesting failures live. Fake timers deadlock here, because `waitFor` and
 * TanStack Query both schedule against the clock the test is holding still, so
 * two real settings do the same work: `IMMEDIATE`, where the request follows
 * the keystroke, and `HELD`, long enough that nothing fires until the test says.
 */

/** Debounce short enough that a request follows the keystroke. */
const IMMEDIATE = 0

/** Debounce long enough that the pre-request states can be asserted. */
const HELD = 10_000

const navigate = vi.fn()
const searchEntities = vi.fn()
const capture = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
  useSearch: () => ({}),
}))

vi.mock('@/lib/api/entities', () => ({
  searchEntities: (...args: readonly unknown[]) => searchEntities(...args),
}))

vi.mock('@/lib/analytics', () => ({
  Analytics: {
    EVENTS: {
      EntitySearchPerformed: 'entity_search_performed',
      EntitySearchSelected: 'entity_search_selected',
    },
    capture: (...args: readonly unknown[]) => capture(...args),
  },
}))

const CLUJ: EntitySearchNode = {
  cui: '4305857',
  name: 'Municipiul Cluj-Napoca',
  is_uat: true,
  uat: { name: 'Cluj-Napoca', county_name: 'Cluj' },
}

const SIBIU: EntitySearchNode = {
  cui: '4270740',
  name: 'Municipiul Sibiu',
  is_uat: true,
  uat: { name: 'Sibiu', county_name: 'Sibiu' },
}

function setup(
  debounceMs = IMMEDIATE,
  fallback?: (term: string) => readonly EntitySearchNode[],
) {
  const queryClient = createTestQueryClient()

  function Wrapper({ children }: { readonly children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

  const view = renderHook(
    (props: { readonly debounceMs: number }) =>
      useSearchResults({ debounceMs: props.debounceMs, fallback }),
    { wrapper: Wrapper, initialProps: { debounceMs } },
  )

  return {
    ...view,
    /**
     * Stretches the debounce so the next keystroke cannot reach the API. Lets a
     * test settle on one term and then hold the hook in the window between
     * typing and asking, which is where staleness lives.
     */
    hold: () => act(() => view.rerender({ debounceMs: HELD })),
  }
}

/** Types a term and waits for the list to answer it. */
async function search(
  result: { current: ReturnType<typeof useSearchResults> },
  term: string,
) {
  act(() => result.current.setTerm(term))
  await waitFor(() => expect(['results', 'empty', 'error']).toContain(result.current.status.kind))
}

describe('useSearchResults', () => {
  beforeEach(() => {
    navigate.mockReset()
    searchEntities.mockReset()
    capture.mockReset()
    searchEntities.mockResolvedValue([CLUJ, SIBIU])
  })

  describe('states', () => {
    it('starts idle', () => {
      const { result } = setup()

      expect(result.current.status).toEqual({ kind: 'idle' })
    })

    it('says how many more characters are needed', () => {
      const { result } = setup()

      act(() => result.current.setTerm('C'))
      expect(result.current.status).toEqual({ kind: 'short', remaining: MIN_QUERY_CHARS - 1 })

      act(() => result.current.setTerm('Cl'))
      expect(result.current.status).toEqual({ kind: 'short', remaining: MIN_QUERY_CHARS - 2 })
    })

    it('is pending before the debounce fires, without asking the API', () => {
      const { result } = setup(HELD)

      act(() => result.current.setTerm('Cluj'))

      expect(result.current.status.kind).toBe('pending')
      expect(searchEntities).not.toHaveBeenCalled()
    })

    it('queries once the typing stops, and reports the results', async () => {
      const { result } = setup()

      await search(result, 'Cluj')

      expect(searchEntities).toHaveBeenCalledTimes(1)
      expect(searchEntities).toHaveBeenCalledWith('Cluj', 8)
      expect(result.current.status).toMatchObject({
        kind: 'results',
        results: [CLUJ, SIBIU],
        stale: false,
        source: 'live',
      })
    })

    it('does not query again for a term that only differs by surrounding space', async () => {
      const { result } = setup()

      await search(result, 'Cluj')
      await search(result, '  Cluj  ')

      expect(searchEntities).toHaveBeenCalledTimes(1)
    })

    it('reports empty when the API finds nothing', async () => {
      searchEntities.mockResolvedValue([])
      const { result } = setup()

      await search(result, 'Xyzzy')

      expect(result.current.status).toEqual({ kind: 'empty', term: 'Xyzzy' })
    })

    it('reports an error when the request fails', async () => {
      searchEntities.mockRejectedValue(new Error('down'))
      const { result } = setup()

      await search(result, 'Cluj')

      expect(result.current.status.kind).toBe('error')
    })

    it('keeps the previous results on screen, marked stale, while the next term loads', async () => {
      const { result, hold, rerender } = setup()

      await search(result, 'Cluj')
      await waitFor(() => expect(result.current.status).toMatchObject({ stale: false }))

      searchEntities.mockResolvedValue([SIBIU])
      hold()
      act(() => result.current.setTerm('Sibiu'))

      // Dimmed, not emptied: the reader can keep reading the row they were
      // already looking at.
      expect(result.current.status).toMatchObject({
        kind: 'results',
        results: [CLUJ, SIBIU],
        stale: true,
      })
      expect(result.current.isCurrent).toBe(false)

      rerender({ debounceMs: IMMEDIATE })
      await waitFor(() => expect(result.current.status).toMatchObject({ results: [SIBIU] }))
      expect(result.current.status).toMatchObject({ stale: false })
      expect(result.current.isCurrent).toBe(true)
    })
  })

  describe('the stand-in fallback', () => {
    it('is never consulted while the API answers', async () => {
      const fallback = vi.fn(() => [SIBIU])
      const { result } = setup(IMMEDIATE, fallback)

      await search(result, 'Cluj')

      expect(fallback).not.toHaveBeenCalled()
    })

    it('answers a failed request, and says the answer is local', async () => {
      searchEntities.mockRejectedValue(new Error('ECONNREFUSED'))
      const { result } = setup(IMMEDIATE, () => [SIBIU])

      await search(result, 'Sibiu')

      // The flag is the whole point. Stand-in data that arrives unlabelled is
      // worse than no data, because it is indistinguishable from served truth.
      expect(result.current.status).toMatchObject({ source: 'local', results: [SIBIU] })
    })

    it('lets the error stand when the fallback has nothing either', async () => {
      searchEntities.mockRejectedValue(new Error('ECONNREFUSED'))
      const { result } = setup(IMMEDIATE, () => [])

      await search(result, 'Xyzzy')

      expect(result.current.status.kind).toBe('error')
    })

    it('is absent by default, so a bare hook fails honestly', async () => {
      searchEntities.mockRejectedValue(new Error('ECONNREFUSED'))
      const { result } = setup()

      await search(result, 'Sibiu')

      expect(result.current.status.kind).toBe('error')
    })

    it('is kept out of analytics', async () => {
      searchEntities.mockRejectedValue(new Error('ECONNREFUSED'))
      const { result } = setup(IMMEDIATE, () => [SIBIU])

      await search(result, 'Sibiu')

      // A fabricated list recorded as a search performed puts fiction into
      // numbers someone will later read as behaviour.
      expect(capture).not.toHaveBeenCalled()
    })

    it('does report a live search', async () => {
      const { result } = setup()

      await search(result, 'Cluj')

      await waitFor(() =>
        expect(capture).toHaveBeenCalledWith(
          'entity_search_performed',
          expect.objectContaining({ query_len: 4, results_count: 2, has_results: true }),
        ),
      )
    })
  })
})

describe('useEntitySelection', () => {
  const selectionHook = (source: 'live' | 'local') =>
    renderHook(() => useEntitySelection({ source }))

  beforeEach(() => {
    navigate.mockReset()
    capture.mockReset()
  })

  it('routes a public enterprise to its own surface, not to the entity page', () => {
    const { result } = selectionHook('live')

    act(() =>
      result.current({ cui: '1590082', name: 'Hidroelectrica', entity_type: 'public_enterprise' }),
    )

    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({ to: expect.stringContaining('1590082') }),
    )
    expect(navigate.mock.calls[0][0].to).not.toBe('/entities/1590082')
  })

  it('records the selection without navigating when asked to skip', () => {
    const { result } = selectionHook('live')

    act(() => result.current(CLUJ, { skipNavigate: true }))

    // This is the path a real anchor takes: the browser or the router follows
    // the href, and the recorder only counts it.
    expect(navigate).not.toHaveBeenCalled()
    expect(capture).toHaveBeenCalledWith('entity_search_selected', { cui: CLUJ.cui })
  })

  it('does not record a selection made from stand-in data', () => {
    const { result } = selectionHook('local')

    act(() => result.current(CLUJ, { skipNavigate: true }))

    expect(capture).not.toHaveBeenCalled()
  })

  it('does nothing at all without an entity', () => {
    const { result } = selectionHook('live')

    act(() => result.current(undefined))

    expect(navigate).not.toHaveBeenCalled()
    expect(capture).not.toHaveBeenCalled()
  })
})
