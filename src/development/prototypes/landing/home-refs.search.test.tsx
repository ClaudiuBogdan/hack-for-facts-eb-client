import type { ReactNode } from 'react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestQueryClient, render, screen, waitFor, within } from '@/test/test-utils'
import type { EntitySearchNode } from '@/schemas/entities'
import { LandingSearch } from './home-refs.search'
import { placeLine } from './home-refs.search-parts'

/**
 * Rendered against the real hook, with only the router and the API replaced.
 *
 * Testing the component through a mocked hook would assert that a `switch`
 * dispatches, which is not where anything breaks. What breaks is the wiring
 * between the two — `aria-activedescendant` pointing at an id no option has,
 * the highlight running on the raw term while the request ran on the trimmed
 * one, the clear button and the shortcut hint both claiming the same slot. All
 * of that needs the real hook underneath.
 */

const navigate = vi.fn()
const searchEntities = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: { readonly children: ReactNode; readonly to: string }) => (
    <a href={typeof to === 'string' ? to : '#'} {...props}>
      {children}
    </a>
  ),
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

const IASI: EntitySearchNode = {
  cui: '4541580',
  name: 'Municipiul Iași',
  is_uat: true,
  uat: { name: 'Iași', county_name: 'Iași' },
}

const CLUJ: EntitySearchNode = {
  cui: '4305857',
  name: 'Municipiul Cluj-Napoca',
  is_uat: true,
  uat: { name: 'Cluj-Napoca', county_name: 'Cluj' },
}

function setup() {
  const user = userEvent.setup()
  render(<LandingSearch />, { queryClient: createTestQueryClient() })
  return { user, input: screen.getByRole('combobox') }
}

/**
 * Types and waits for rows.
 *
 * Waiting for the listbox is not enough: the listbox *is* the panel, so it
 * exists from the first keystroke, through `pending` and `loading`. Waiting on
 * options is what waits for the request.
 */
async function typeAndWait(user: ReturnType<typeof userEvent.setup>, term: string) {
  const input = screen.getByRole('combobox')
  await user.click(input)
  await user.type(input, term)
  await waitFor(() => expect(screen.getAllByRole('option').length).toBeGreaterThan(0))
  return input
}

describe('placeLine', () => {
  const at = (name: string | null, county: string | null) =>
    placeLine({ cui: '1', name: 'x', uat: { name, county_name: county } })

  it('prefixes a bare county', () => {
    expect(at('Cluj-Napoca', 'Cluj')).toBe('Cluj-Napoca · Jud. Cluj')
  })

  it('does not prefix a county that is already prefixed', () => {
    // The fixtures store 'Jud. Cluj'; the API sends 'Cluj'. Both have to work.
    expect(at('Cluj-Napoca', 'Jud. Cluj')).toBe('Cluj-Napoca · Jud. Cluj')
  })

  it('drops the county when it only repeats the locality', () => {
    expect(at('Sibiu', 'Jud. Sibiu')).toBe('Sibiu')
    expect(at('Sibiu', 'Sibiu')).toBe('Sibiu')
  })

  it('never calls Bucharest a county', () => {
    expect(at('București', 'București')).toBe('București')
  })

  it('compares without regard to case', () => {
    expect(at('Iași', 'JUD. IAȘI')).toBe('Iași')
  })

  it('survives a missing county or locality', () => {
    expect(at('Sibiu', null)).toBe('Sibiu')
    expect(at(null, 'Cluj')).toBe('Jud. Cluj')
    expect(at(null, null)).toBe('')
  })
})

describe('LandingSearch', () => {
  beforeEach(() => {
    navigate.mockReset()
    searchEntities.mockReset()
    searchEntities.mockResolvedValue([IASI, CLUJ])
  })

  describe('the field', () => {
    it('is a combobox that starts collapsed', () => {
      const { input } = setup()

      expect(input).toHaveAttribute('aria-expanded', 'false')
      expect(input).toHaveAttribute('aria-autocomplete', 'list')
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })

    it('opens nothing when focused on an empty field', async () => {
      const { user, input } = setup()

      await user.click(input)

      expect(input).toHaveAttribute('aria-expanded', 'false')
    })

    it('advertises the shortcut until there is something to clear', async () => {
      const { user, input } = setup()

      expect(document.querySelector('kbd')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /șterge/i })).not.toBeInTheDocument()

      await user.click(input)
      await user.type(input, 'Ia')

      // The hint and the clear button share one slot, so exactly one of them is
      // present at any time.
      expect(document.querySelector('kbd')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /șterge/i })).toBeInTheDocument()
    })

    it('names the modifier key this platform actually uses', async () => {
      setup()

      // jsdom reports a non-Apple user agent, so the ⌘ the server rendered has
      // to be corrected after hydration. Shipping ⌘ to a Windows reader is the
      // bug this guards, and it is invisible on a Mac.
      await waitFor(() => expect(document.querySelector('kbd')).toHaveTextContent('CtrlK'))
    })

    it('empties the field from the clear button and keeps focus', async () => {
      const { user, input } = setup()

      await user.click(input)
      await user.type(input, 'Iasi')
      await user.click(screen.getByRole('button', { name: /șterge/i }))

      expect(input).toHaveValue('')
      expect(input).toHaveFocus()
    })
  })

  describe('the states', () => {
    it('asks for more characters below the threshold, without querying', async () => {
      const { user, input } = setup()

      await user.click(input)
      await user.type(input, 'Ia')

      expect(screen.getByText(/încă un caracter/i)).toBeInTheDocument()
      expect(searchEntities).not.toHaveBeenCalled()
    })

    it('counts the noun down correctly at two characters remaining', async () => {
      const { user, input } = setup()

      await user.click(input)
      await user.type(input, 'I')

      expect(screen.getByText(/încă 2 caractere/i)).toBeInTheDocument()
    })

    it('lists the results, with the CUI beside each name', async () => {
      const { user } = setup()
      await typeAndWait(user, 'Iasi')

      const options = screen.getAllByRole('option')
      expect(options).toHaveLength(2)
      expect(within(options[0]).getByText(/Municipiul/)).toBeInTheDocument()
      expect(within(options[0]).getByText('4541580')).toBeInTheDocument()
      // Iași is the seat of Iași county, so the county adds nothing and the
      // line must not read 'Iași · Jud. Iași'.
      expect(within(options[0]).queryByText(/Jud\./)).not.toBeInTheDocument()
    })

    it('says so when there is nothing, quoting the term back', async () => {
      searchEntities.mockResolvedValue([])
      const { user, input } = setup()

      await user.click(input)
      await user.type(input, 'Xyzzy')

      await waitFor(() => expect(screen.getByText(/nicio instituție/i)).toBeInTheDocument())
      expect(screen.getByText('Xyzzy')).toBeInTheDocument()
    })

    it('reports a failed request without blaming the reader', async () => {
      searchEntities.mockRejectedValue(new Error('down'))
      const { user, input } = setup()

      await user.click(input)
      await user.type(input, 'Iasi')

      // Twice on purpose: once drawn in the dropdown, once in the live region.
      // A single match would mean one of the two audiences was not told.
      await waitFor(() => expect(screen.getAllByText(/nu a răspuns/i)).toHaveLength(2))
      expect(screen.getByText(/încearcă din nou/i)).toBeInTheDocument()
    })
  })

  describe('the match highlight', () => {
    it('marks the accented original when the reader types without diacritics', async () => {
      const { user } = setup()
      await typeAndWait(user, 'Iasi')

      // The name is 'Municipiul Iași'; the query has no diacritics. Anything
      // other than the accented span here means the ranges slipped.
      const marks = screen.getAllByText('Iași')
      expect(marks.length).toBeGreaterThan(0)
      expect(marks[0].tagName).toBe('MARK')
    })

    it('marks a partial CUI', async () => {
      const { user } = setup()
      await typeAndWait(user, '45415')

      const option = screen.getAllByRole('option')[0]
      expect(within(option).getByText('45415').tagName).toBe('MARK')
    })

    it('marks nothing when the match is only on another field', async () => {
      const { user } = setup()
      await typeAndWait(user, 'Iasi')

      const cluj = screen.getAllByRole('option')[1]
      expect(within(cluj).queryByText('Iasi')).not.toBeInTheDocument()
    })
  })

  describe('keyboard wiring', () => {
    it('points aria-activedescendant at the highlighted option', async () => {
      const { user } = setup()
      const input = await typeAndWait(user, 'Iasi')

      expect(input).not.toHaveAttribute('aria-activedescendant')

      await user.keyboard('{ArrowDown}')

      const active = screen.getAllByRole('option')[0]
      expect(active).toHaveAttribute('aria-selected', 'true')
      expect(input).toHaveAttribute('aria-activedescendant', active.id)
    })

    it('names a popup that exists even when there is no list to show', async () => {
      const { user, input } = setup()

      await user.click(input)
      await user.type(input, 'Ia')

      // 'short' draws a message, not rows. The field still claims to be
      // expanded, so aria-controls has to resolve to something — otherwise a
      // screen-reader user is told a popup opened and given no way to reach it.
      expect(input).toHaveAttribute('aria-expanded', 'true')
      const controlled = document.getElementById(input.getAttribute('aria-controls') ?? '')
      expect(controlled).toBeInTheDocument()
      expect(controlled).toHaveAttribute('role', 'listbox')
      expect(screen.queryAllByRole('option')).toHaveLength(0)
    })

    it('controls the listbox it names', async () => {
      const { user } = setup()
      const input = await typeAndWait(user, 'Iasi')

      expect(input).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByRole('listbox').id).toBe(input.getAttribute('aria-controls'))
    })

    /**
     * jsdom is not the authority on this one.
     *
     * This test passed while the browser was doing both stages on a single
     * press: Radix listens for Escape on the document, React flushes the close
     * before the input's own handler runs, and that handler then sees `isOpen`
     * as false and clears. jsdom does not reproduce the ordering, so the fix
     * lives in `onEscapeKeyDown={(e) => e.preventDefault()}` on the popover
     * content and is verified in a real browser. Do not remove that line
     * because this test stays green without it.
     */
    it('dismisses on the first Escape and clears on the second', async () => {
      const { user } = setup()
      const input = await typeAndWait(user, 'Iasi')

      await user.keyboard('{Escape}')
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      expect(input).toHaveValue('Iasi')

      await user.keyboard('{Escape}')
      expect(input).toHaveValue('')
    })

    it('navigates on Enter', async () => {
      const { user } = setup()
      await typeAndWait(user, 'Iasi')

      await user.keyboard('{ArrowDown}{Enter}')

      expect(navigate).toHaveBeenCalledWith(
        expect.objectContaining({ to: '/entities/4541580' }),
      )
    })
  })

  describe('announcements', () => {
    it('tells a screen reader how many results arrived', async () => {
      const { user } = setup()
      await typeAndWait(user, 'Iasi')

      const live = document.querySelector('[aria-live="polite"]')
      expect(live).toHaveTextContent('2 rezultate')
    })

    it('announces an empty result rather than going silent', async () => {
      searchEntities.mockResolvedValue([])
      const { user, input } = setup()

      await user.click(input)
      await user.type(input, 'Xyzzy')

      await waitFor(() =>
        expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent(
          'Niciun rezultat',
        ),
      )
    })
  })
})
