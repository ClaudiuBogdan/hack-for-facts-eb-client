import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestQueryClient } from '@/test/test-utils'
import type { EntitySearchNode } from '@/schemas/entities'
import { MIN_QUERY_CHARS, useLandingSearch } from './home-refs.search-state'

/**
 * The debounce is left real and controlled through the hook's own `debounceMs`,
 * rather than mocked away to the identity function the shipped test uses. The
 * identity mock makes every assertion about *timing* vacuous — and timing is
 * where the interesting failures are: the dropdown opening before the request,
 * Enter acting on a list that answers the previous term, results going stale
 * between keystrokes.
 *
 * Fake timers were the first attempt and deadlock here: Testing Library's
 * `waitFor` and TanStack Query both schedule against the clock the test is
 * holding still. Two real settings do the same work without the deadlock —
 * `IMMEDIATE`, where the request follows the keystroke, and `HELD`, long enough
 * that nothing fires until the test says so.
 */

/** Debounce short enough that a request follows the keystroke. */
const IMMEDIATE = 0

/** Debounce long enough that the pre-request states can be asserted. */
const HELD = 10_000

const navigate = vi.fn()
const searchEntities = vi.fn()

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
    capture: vi.fn(),
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
      useLandingSearch({ debounceMs: props.debounceMs, fallback }),
    { wrapper: Wrapper, initialProps: { debounceMs } },
  )

  return {
    ...view,
    /**
     * Stretches the debounce so the next keystroke cannot reach the API.
     * Lets a test get a settled list first and then hold the hook in the
     * window between typing and asking, which is where staleness lives.
     */
    hold: () => act(() => view.rerender({ debounceMs: HELD })),
  }
}

/** A keyboard event with only the parts the hook reads. */
function keyEvent(key: string) {
  return { key, preventDefault: vi.fn() } as unknown as React.KeyboardEvent
}

/** Types a term and waits for the list to answer it. */
async function search(
  result: { current: ReturnType<typeof useLandingSearch> },
  term: string,
) {
  act(() => result.current.onChange(term))
  await waitFor(() => expect(['results', 'empty', 'error']).toContain(result.current.status.kind))
}

describe('useLandingSearch', () => {
  beforeEach(() => {
    navigate.mockReset()
    searchEntities.mockReset()
    searchEntities.mockResolvedValue([CLUJ, SIBIU])
  })

  describe('states', () => {
    it('starts idle, with the dropdown shut', () => {
      const { result } = setup()

      expect(result.current.status).toEqual({ kind: 'idle' })
      expect(result.current.isDropdownOpen).toBe(false)
    })

    it('stays shut on an empty field even when focused', () => {
      const { result } = setup()

      act(() => result.current.open())

      // The panel beside the field already suggests where to start; a second
      // list of suggestions would compete with it.
      expect(result.current.isDropdownOpen).toBe(false)
    })

    it('says how many more characters are needed', () => {
      const { result } = setup()

      act(() => result.current.onChange('C'))
      expect(result.current.status).toEqual({ kind: 'short', remaining: MIN_QUERY_CHARS - 1 })

      act(() => result.current.onChange('Cl'))
      expect(result.current.status).toEqual({ kind: 'short', remaining: MIN_QUERY_CHARS - 2 })
      expect(result.current.isDropdownOpen).toBe(true)
    })

    it('opens as pending before the debounce fires, without asking the API', () => {
      const { result } = setup(HELD)

      act(() => result.current.onChange('Cluj'))

      expect(result.current.status.kind).toBe('pending')
      expect(result.current.isDropdownOpen).toBe(true)
      expect(searchEntities).not.toHaveBeenCalled()
    })

    it('queries once the typing stops, and reports the results', async () => {
      const { result } = setup()

      await search(result, 'Cluj')
      await waitFor(() => expect(result.current.status.kind).toBe('results'))

      expect(searchEntities).toHaveBeenCalledTimes(1)
      expect(searchEntities).toHaveBeenCalledWith('Cluj', 8)
      expect(result.current.status).toMatchObject({
        kind: 'results',
        results: [CLUJ, SIBIU],
        stale: false,
      })
    })

    it('does not query again for a term that only differs by surrounding space', async () => {
      const { result } = setup()

      await search(result, 'Cluj')
      await waitFor(() => expect(result.current.status.kind).toBe('results'))
      await search(result, '  Cluj  ')
      await waitFor(() => expect(result.current.status.kind).toBe('results'))

      expect(searchEntities).toHaveBeenCalledTimes(1)
    })

    it('reports empty when the API finds nothing', async () => {
      searchEntities.mockResolvedValue([])
      const { result } = setup()

      await search(result, 'Xyzzy')
      await waitFor(() => expect(result.current.status.kind).toBe('empty'))

      expect(result.current.status).toEqual({ kind: 'empty', term: 'Xyzzy' })
    })

    it('reports an error when the request fails', async () => {
      searchEntities.mockRejectedValue(new Error('down'))
      const { result } = setup()

      await search(result, 'Cluj')
      await waitFor(() => expect(result.current.status.kind).toBe('error'))
    })

    it('marks live results as live', async () => {
      const { result } = setup()

      await search(result, 'Cluj')
      await waitFor(() => expect(result.current.status.kind).toBe('results'))

      expect(result.current.status).toMatchObject({ source: 'live' })
    })

    it('keeps the previous results on screen, marked stale, while the next term loads', async () => {
      const { result, hold, rerender } = setup()

      await search(result, 'Cluj')
      await waitFor(() => expect(result.current.status).toMatchObject({ stale: false }))

      // Second term, with the request held back.
      searchEntities.mockResolvedValue([SIBIU])
      hold()
      act(() => result.current.onChange('Sibiu'))

      // The list is still the old one — dimmed, not emptied.
      expect(result.current.status).toMatchObject({
        kind: 'results',
        results: [CLUJ, SIBIU],
        stale: true,
      })

      // Let it through; the list swaps and stops being stale.
      rerender({ debounceMs: IMMEDIATE })
      await waitFor(() => expect(result.current.status).toMatchObject({ results: [SIBIU] }))
      expect(result.current.status).toMatchObject({ stale: false })
    })
  })

  describe('the fallback', () => {
    it('is never consulted while the API answers', async () => {
      const fallback = vi.fn(() => [SIBIU])
      const { result } = setup(IMMEDIATE, fallback)

      await search(result, 'Cluj')
      await waitFor(() => expect(result.current.status.kind).toBe('results'))

      expect(fallback).not.toHaveBeenCalled()
    })

    it('answers a failed request, and says the answer is local', async () => {
      searchEntities.mockRejectedValue(new Error('ECONNREFUSED'))
      const { result } = setup(IMMEDIATE, () => [SIBIU])

      await search(result, 'Sibiu')
      await waitFor(() => expect(result.current.status.kind).toBe('results'))

      // The flag is the whole point. Stand-in data that arrives unlabelled is
      // worse than no data, because it is indistinguishable from served truth.
      expect(result.current.status).toMatchObject({ source: 'local', results: [SIBIU] })
    })

    it('lets the error stand when the fallback has nothing either', async () => {
      searchEntities.mockRejectedValue(new Error('ECONNREFUSED'))
      const { result } = setup(IMMEDIATE, () => [])

      await search(result, 'Xyzzy')
      await waitFor(() => expect(result.current.status.kind).toBe('error'))
    })

    it('is absent by default, so a bare hook fails honestly', async () => {
      searchEntities.mockRejectedValue(new Error('ECONNREFUSED'))
      const { result } = setup()

      await search(result, 'Sibiu')
      await waitFor(() => expect(result.current.status.kind).toBe('error'))
    })
  })

  describe('keyboard', () => {
    it('moves the highlight down and wraps at the end', async () => {
      const { result } = setup()
      await search(result, 'Cluj')
      await waitFor(() => expect(result.current.status.kind).toBe('results'))

      act(() => result.current.onKeyDown(keyEvent('ArrowDown')))
      expect(result.current.activeIndex).toBe(0)

      act(() => result.current.onKeyDown(keyEvent('ArrowDown')))
      expect(result.current.activeIndex).toBe(1)

      act(() => result.current.onKeyDown(keyEvent('ArrowDown')))
      expect(result.current.activeIndex).toBe(0)
    })

    it('moves the highlight up, wrapping to the last result', async () => {
      const { result } = setup()
      await search(result, 'Cluj')
      await waitFor(() => expect(result.current.status.kind).toBe('results'))

      act(() => result.current.onKeyDown(keyEvent('ArrowUp')))
      expect(result.current.activeIndex).toBe(1)
    })

    it('jumps to the first and last result with Home and End', async () => {
      const { result } = setup()
      await search(result, 'Cluj')
      await waitFor(() => expect(result.current.status.kind).toBe('results'))

      act(() => result.current.onKeyDown(keyEvent('End')))
      expect(result.current.activeIndex).toBe(1)

      act(() => result.current.onKeyDown(keyEvent('Home')))
      expect(result.current.activeIndex).toBe(0)
    })

    it('reopens a dismissed dropdown on ArrowDown rather than requiring a retype', async () => {
      const { result } = setup()
      await search(result, 'Cluj')
      await waitFor(() => expect(result.current.status.kind).toBe('results'))

      act(() => result.current.close())
      expect(result.current.isDropdownOpen).toBe(false)

      act(() => result.current.onKeyDown(keyEvent('ArrowDown')))
      expect(result.current.isDropdownOpen).toBe(true)
      // The first Down re-opens; it does not also move the highlight.
      expect(result.current.activeIndex).toBe(-1)
    })

    it('closes on the first Escape and clears on the second', async () => {
      const { result } = setup()
      await search(result, 'Cluj')
      await waitFor(() => expect(result.current.status.kind).toBe('results'))

      act(() => result.current.onKeyDown(keyEvent('Escape')))
      expect(result.current.isDropdownOpen).toBe(false)
      // The term survives, so the reader can reopen what they were reading.
      expect(result.current.term).toBe('Cluj')

      act(() => result.current.onKeyDown(keyEvent('Escape')))
      expect(result.current.term).toBe('')
    })

    it('selects the highlighted result on Enter', async () => {
      const { result } = setup()
      await search(result, 'Cluj')
      await waitFor(() => expect(result.current.status.kind).toBe('results'))

      act(() => result.current.onKeyDown(keyEvent('ArrowDown')))
      act(() => result.current.onKeyDown(keyEvent('ArrowDown')))
      act(() => result.current.onKeyDown(keyEvent('Enter')))

      expect(navigate).toHaveBeenCalledWith({ to: '/entities/4270740', search: {} })
    })

    it('takes the first result on Enter when the list answers the current term', async () => {
      const { result } = setup()
      await search(result, 'Cluj')
      await waitFor(() => expect(result.current.status.kind).toBe('results'))

      act(() => result.current.onKeyDown(keyEvent('Enter')))

      expect(navigate).toHaveBeenCalledWith({ to: '/entities/4305857', search: {} })
    })

    it('refuses Enter-selects-first while the list is stale', async () => {
      const { result, hold } = setup()
      await search(result, 'Cluj')
      await waitFor(() => expect(result.current.status).toMatchObject({ stale: false }))

      // Type more and hit Enter inside the debounce. The visible list still
      // answers 'Cluj'; acting on it would open a result the reader is no
      // longer asking for.
      hold()
      act(() => result.current.onChange('Cluj N'))
      act(() => result.current.onKeyDown(keyEvent('Enter')))

      expect(navigate).not.toHaveBeenCalled()
    })

    it('still honours an explicit highlight while stale', async () => {
      const { result, hold } = setup()
      await search(result, 'Cluj')
      await waitFor(() => expect(result.current.status).toMatchObject({ stale: false }))

      act(() => result.current.onKeyDown(keyEvent('ArrowDown')))
      hold()
      act(() => result.current.onChange('Cluj N'))

      // onChange clears the highlight, so re-establish it and confirm that an
      // intentional pick is not blocked the way the ambiguous one is.
      act(() => result.current.onKeyDown(keyEvent('ArrowDown')))
      act(() => result.current.onKeyDown(keyEvent('Enter')))

      expect(navigate).toHaveBeenCalledWith({ to: '/entities/4305857', search: {} })
    })

    it('ignores keys while the dropdown is closed', () => {
      const { result } = setup()

      act(() => result.current.onKeyDown(keyEvent('Enter')))
      expect(navigate).not.toHaveBeenCalled()
    })
  })

  describe('selection', () => {
    it('routes a public enterprise to its own surface, not to the entity page', async () => {
      searchEntities.mockResolvedValue([
        { cui: '1590082', name: 'Hidroelectrica', entity_type: 'public_enterprise' },
      ])
      const { result } = setup()
      await search(result, 'Hidro')
      await waitFor(() => expect(result.current.status.kind).toBe('results'))

      act(() => result.current.select(0))

      // The preferred-entity behaviour is the point of the default; a plain
      // entity path here would be a regression the UI could not show.
      expect(navigate).toHaveBeenCalledWith(
        expect.objectContaining({ to: expect.stringContaining('1590082') }),
      )
      expect(navigate.mock.calls[0][0].to).not.toBe('/entities/1590082')
    })

    it('clears the field and closes after a selection', async () => {
      const { result } = setup()
      await search(result, 'Cluj')
      await waitFor(() => expect(result.current.status.kind).toBe('results'))

      act(() => result.current.select(0))

      expect(result.current.term).toBe('')
      expect(result.current.isDropdownOpen).toBe(false)
    })

    it('records the selection without navigating when the browser is opening a tab', async () => {
      const { result } = setup()
      await search(result, 'Cluj')
      await waitFor(() => expect(result.current.status.kind).toBe('results'))

      act(() => result.current.select(0, { skipNavigate: true }))

      expect(navigate).not.toHaveBeenCalled()
    })

    it('does nothing for an index with no result behind it', async () => {
      const { result } = setup()
      await search(result, 'Cluj')
      await waitFor(() => expect(result.current.status.kind).toBe('results'))

      act(() => result.current.select(99))

      expect(navigate).not.toHaveBeenCalled()
      expect(result.current.term).toBe('Cluj')
    })

    it('drops the highlight when a new set of results arrives', async () => {
      const { result } = setup()
      await search(result, 'Cluj')
      await waitFor(() => expect(result.current.status.kind).toBe('results'))

      act(() => result.current.onKeyDown(keyEvent('ArrowDown')))
      expect(result.current.activeIndex).toBe(0)

      searchEntities.mockResolvedValue([SIBIU])
      await search(result, 'Sibiu')
      await waitFor(() => expect(result.current.status).toMatchObject({ results: [SIBIU] }))

      // The row under the cursor is not the row that was under it.
      expect(result.current.activeIndex).toBe(-1)
    })
  })
})
