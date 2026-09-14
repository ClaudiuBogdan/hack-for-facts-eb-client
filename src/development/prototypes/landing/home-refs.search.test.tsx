import type { ReactNode } from 'react'
import { fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestQueryClient, render, screen, waitFor, within } from '@/test/test-utils'
import type { EntitySearchHit } from '@/schemas/entity-search'
import { LandingSearch } from './home-refs.search'

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

vi.mock('@/features/entity-search/api/entity-search-api.live', () => ({
  searchEntitiesLive: (...args: readonly unknown[]) => searchEntities(...args),
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

const IASI: EntitySearchHit = {
  id: 'organization:4541580', title: 'Municipiul Iași', docType: 'organization',
  href: '/entities/4541580', isExternal: false, identifiers: ['4541580'],
  countyName: 'Iași', subtitle: null, snippet: null, roles: ['organization'],
  isActive: true, docId: null, docKey: '4541580', url: null, score: null,
}
const CLUJ: EntitySearchHit = {
  ...IASI, id: 'organization:4305857', title: 'Municipiul Cluj-Napoca',
  href: '/entities/4305857', identifiers: ['4305857'], countyName: 'Cluj',
}
const response = (hits: readonly EntitySearchHit[]) => ({ hits, degraded: false })

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

describe('LandingSearch', () => {
  beforeEach(() => {
    navigate.mockReset()
    searchEntities.mockReset()
    searchEntities.mockResolvedValue(response([IASI, CLUJ]))
  })

  it('renders companies, public enterprises and NGOs with their own links', async () => {
    searchEntities.mockResolvedValue(response([
      { ...IASI, id: 'company:1', docType: 'company', title: 'Private company', href: '/companies/1' },
      { ...IASI, id: 'public_enterprise:2', docType: 'public_enterprise', title: 'Public enterprise', href: '/intreprinderi-publice/2' },
      { ...IASI, id: 'ngo:3', docType: 'ngo', title: 'An NGO', href: '/ong-uri/3' },
    ]))
    const { user } = setup()
    await typeAndWait(user, 'company')
    expect(screen.getAllByRole('option').map((row) => row.getAttribute('href'))).toEqual([
      '/companies/1', '/intreprinderi-publice/2', '/ong-uri/3',
    ])
    expect(screen.getByText('ONG · Iași')).toBeInTheDocument()
  })

  it('blocks highlighted stale results when the query changes', async () => {
    const chosen = vi.fn()
    const user = userEvent.setup()
    render(<LandingSearch onSelect={chosen} />, { queryClient: createTestQueryClient() })
    await typeAndWait(user, 'Iasi')
    await user.keyboard('{ArrowDown}')
    searchEntities.mockImplementation(() => new Promise(() => {}))
    await user.keyboard('x{Enter}')
    expect(chosen).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
    expect(screen.getAllByRole('option').every((row) => row.getAttribute('aria-disabled') === 'true')).toBe(true)
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
      expect(screen.queryByLabelText(/[Șș]terge/u)).not.toBeInTheDocument()

      await user.click(input)
      await user.type(input, 'Ia')

      // The hint and the clear button share one slot, so exactly one of them is
      // present at any time.
      expect(document.querySelector('kbd')).not.toBeInTheDocument()
      expect(screen.getByLabelText(/[Șș]terge/u)).toBeInTheDocument()
    })

    it('names the modifier key this platform actually uses', async () => {
      setup()

      // jsdom reports a non-Apple user agent, so the ⌘ the server rendered has
      // to be corrected after hydration. Shipping ⌘ to a Windows reader is the
      // bug this guards, and it is invisible on a Mac.
      await waitFor(() => expect(document.querySelector('kbd')).toHaveTextContent('CtrlK'))
    })

    it("labels the phone keyboard's action key as search", () => {
      const { input } = setup()

      // Without it iOS shows a plain "return" on a field whose Enter opens
      // the first result.
      expect(input).toHaveAttribute('enterkeyhint', 'search')
    })

    it('empties the field from the clear button and keeps focus', async () => {
      const { user, input } = setup()

      await user.click(input)
      await user.type(input, 'Iasi')
      await user.click(screen.getByLabelText(/[Șș]terge/u))

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
      searchEntities.mockResolvedValue(response([]))
      const { user, input } = setup()

      await user.click(input)
      await user.type(input, 'Xyzzy')

      await waitFor(() => expect(screen.getByText(/niciun rezultat pentru/i)).toBeInTheDocument())
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
      // Base UI reports the active row with `data-highlighted` rather than
      // `aria-selected`; `aria-activedescendant` is what actually carries it to
      // a screen reader, and that is the assertion that matters.
      await waitFor(() => expect(active).toHaveAttribute('data-highlighted'))
      expect(input).toHaveAttribute('aria-activedescendant', active.id)
    })

    it('draws the row it highlights', async () => {
      const { user } = setup()
      await typeAndWait(user, 'Iasi')

      await user.keyboard('{ArrowDown}')

      const [active, next] = screen.getAllByRole('option')
      await waitFor(() => expect(active).toHaveAttribute('data-highlighted'))

      // The assertion the first version of this suite was missing, which is why
      // arrowing through the list shipped invisible: every keyboard test above
      // passed while the highlighted row and the row below it rendered
      // identically. `data-highlighted` is set by Base UI on the element and
      // never travels back into React, so the row was being drawn from a
      // hardcoded `isActive={false}` and the styling had nothing to hang on.
      // A highlight nothing draws is a highlight that does not exist.
      expect(active.className).toContain('data-highlighted:bg-muted')
      expect(next).not.toHaveAttribute('data-highlighted')
    })

    it('reopens on ArrowUp after Escape without preselecting a row', async () => {
      const { user, input } = setup()
      await typeAndWait(user, 'Iasi')

      await user.keyboard('{Escape}')
      expect(input).toHaveAttribute('aria-expanded', 'false')

      // The other way the wrap could come back. WAI-ARIA allows Up on a closed
      // combobox to open it with the *last* option focused, which would undo
      // the rule below by routing round it — Escape, Up, and the highlight is
      // at the bottom of the list. Base UI opens with nothing highlighted, so
      // Up means the same thing whether the panel is open or shut: stay here.
      await user.keyboard('{ArrowUp}')
      await waitFor(() => expect(input).toHaveAttribute('aria-expanded', 'true'))
      expect(input).not.toHaveAttribute('aria-activedescendant')
    })

    it('walks down into the results and back out to the field, and stops there', async () => {
      const { user, input } = setup()
      await typeAndWait(user, 'Iasi')

      await user.keyboard('{ArrowDown}')
      await waitFor(() => expect(input).toHaveAttribute('aria-activedescendant'))

      await user.keyboard('{ArrowUp}')
      await waitFor(() => expect(input).not.toHaveAttribute('aria-activedescendant'))

      // And stays. Base UI's own default would wrap round to the last row here,
      // so a reader pressing Up once more than they needed — to get back to
      // what they typed — would land at the bottom of the list instead. Opting
      // that handler out needs `preventBaseUIHandler()`; `preventDefault()`
      // leaves it running.
      await user.keyboard('{ArrowUp}')
      expect(input).not.toHaveAttribute('aria-activedescendant')
    })

    it('names a popup that exists even when there is no list to show', async () => {
      const { user, input } = setup()

      await user.click(input)
      await user.type(input, 'Ia')

      // The invariant, whichever way an implementation meets it: if the field
      // says a popup is open, `aria-controls` must resolve to something. A
      // screen-reader user told a popup opened and given no way to reach it is
      // worse off than one told nothing happened. 'short' draws a message
      // rather than rows, which is exactly where this used to break.
      expect(screen.queryAllByRole('option')).toHaveLength(0)
      if (input.getAttribute('aria-expanded') === 'true') {
        const controlled = document.getElementById(input.getAttribute('aria-controls') ?? '')
        expect(controlled).toBeInTheDocument()
      }
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
    it('reopens on Enter after Escape, so the first Escape is reversible', async () => {
      const { user } = setup()
      const input = await typeAndWait(user, 'Iasi')

      await user.keyboard('{Escape}')
      expect(screen.queryAllByRole('option')).toHaveLength(0)
      expect(input).toHaveValue('Iasi')

      await user.keyboard('{Enter}')

      // The term survives the first Escape on purpose. Without a way back to
      // its answer, that stage keeps the question and throws away the answer,
      // and the only route back is retyping a query still sitting in the field.
      await waitFor(() => expect(screen.getAllByRole('option').length).toBeGreaterThan(0))
      expect(input).toHaveValue('Iasi')
    })

    it('does not reopen on Enter when the field is empty', async () => {
      const { user, input } = setup()

      await user.click(input)
      await user.keyboard('{Enter}')

      expect(screen.queryAllByRole('option')).toHaveLength(0)
    })

    it('takes the first result on Enter when nothing is highlighted', async () => {
      const chosen = vi.fn()
      const user = userEvent.setup()
      render(<LandingSearch onSelect={chosen} />, { queryClient: createTestQueryClient() })
      await typeAndWait(user, 'Iasi')

      await user.keyboard('{Enter}')

      // Nothing is auto-highlighted, so this is a convenience rather than a
      // side effect of results arriving — and it is gated on the list actually
      // answering what is in the box.
      await waitFor(() => expect(chosen).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'organization:4541580' }),
      ))
    })

    /**
     * An IME confirms a candidate with Enter and cancels one with Escape, and
     * both reach the input as keydowns. Neither may act on the search: the
     * Enter took the first result and navigated away mid-word in a real
     * browser, which is the bug this pins. Two shapes are fired because
     * browsers disagree — Chrome sets `isComposing`, Safari sends the real key
     * with `isComposing` false and only `keyCode` 229 gives it away.
     */
    it('ignores Enter while an IME is composing', async () => {
      const chosen = vi.fn()
      const user = userEvent.setup()
      render(<LandingSearch onSelect={chosen} />, { queryClient: createTestQueryClient() })
      const input = await typeAndWait(user, 'Iasi')

      fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
      fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 })

      expect(chosen).not.toHaveBeenCalled()
      expect(input).toHaveValue('Iasi')
    })

    it('ignores Escape while an IME is composing, even on a closed field', async () => {
      const { user } = setup()
      const input = await typeAndWait(user, 'Iasi')

      // Closed, so a plain Escape here would be the second stage and clear.
      await user.keyboard('{Escape}')
      expect(input).toHaveAttribute('aria-expanded', 'false')

      fireEvent.keyDown(input, { key: 'Escape', isComposing: true })
      expect(input).toHaveValue('Iasi')

      fireEvent.keyDown(input, { key: 'Escape', keyCode: 229 })
      expect(input).toHaveValue('Iasi')
    })

    it('dismisses on the first Escape and clears on the second', async () => {
      const { user } = setup()
      const input = await typeAndWait(user, 'Iasi')

      await user.keyboard('{Escape}')
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      expect(input).toHaveValue('Iasi')

      await user.keyboard('{Escape}')
      expect(input).toHaveValue('')
    })

    it('selects the highlighted result on Enter', async () => {
      const chosen = vi.fn()
      const user = userEvent.setup()
      render(<LandingSearch onSelect={chosen} />, { queryClient: createTestQueryClient() })
      await typeAndWait(user, 'Iasi')

      await user.keyboard('{ArrowDown}{Enter}')

      // The row *is* the anchor, so the router follows it rather than being
      // called — which is the whole reason Cmd-click opens a tab here. What can
      // be asserted in jsdom is the selection contract.
      await waitFor(() => expect(chosen).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'organization:4541580' }),
      ))
    })

    it('gives every result a real href, so a modified click reaches the browser', async () => {
      const { user } = setup()
      await typeAndWait(user, 'Iasi')

      const options = screen.getAllByRole('option')
      expect(options[0].tagName).toBe('A')
      expect(options[0]).toHaveAttribute('href', '/entities/4541580')
    })
  })

  describe('the panel joined to the field', () => {
    it('draws the field and the panel as one surface', async () => {
      const { user, input } = setup()
      await typeAndWait(user, 'Iasi')

      // The field is the group around the input, not the input: chips sit
      // inside the border, so the border belongs to what contains both. Base
      // UI anchors the popup to the group and puts the open/side state on it.
      const field = input.closest('[role="group"]')
      expect(field).not.toBeNull()
      const fieldClass = field?.className ?? ''

      // Focus looks the same whether the results are showing or not. This is
      // the assertion, not a detail of it: an indicator that appears on focus
      // and vanishes when the reader types tells them focus moved when it did
      // not, and that is worse than the colour problem it was introduced to
      // fix. Same border, same lift, under `focus-within:` and under
      // `data-popup-open:` alike — `focus-within` because the caret may be in
      // the input or on a chip's remove button, and the field is focused
      // either way.
      for (const state of ['focus-within:', 'data-popup-open:']) {
        expect(fieldClass).toContain(`${state}border-foreground/55`)
        expect(fieldClass).toContain(`${state}shadow-lg`)
      }

      // Neutral, not the app's focus blue. The input itself draws nothing —
      // no border, no ring — or the two outlines would fight at the seam.
      expect(fieldClass).not.toContain('border-ring')
      expect(input.className).toContain('outline-hidden')
      expect(input.className).not.toContain('border')

      const popup = screen.getByRole('listbox').closest('[class*="max-h-"]')
      expect(popup?.className).toContain('border-foreground/55')
      expect(popup?.className).toContain('shadow-lg')

      // The field drops its border along the seam too, so the divider under the
      // header is the single line between the query and the answers. Two rules
      // 45px apart around a tinted strip boxes the field off as its own object
      // again, which is the opposite of the point.
      expect(fieldClass).toContain('data-popup-open:data-[popup-side=bottom]:border-b-0')
      expect(fieldClass).toContain('data-popup-open:data-[popup-side=top]:border-t-0')

      // Both sides, because Base UI flips when the room below runs out and a
      // join that assumes "below" inverts instead of moving: wrong corners
      // squared, wrong border dropped. Pinning the panel below to avoid that
      // was tried first and was worse — with the field near the bottom edge the
      // panel went entirely off-screen, zero rows reachable where the floating
      // version flipped and showed all five.
      expect(fieldClass).toContain('data-[popup-side=bottom]:rounded-b-none')
      expect(fieldClass).toContain('data-[popup-side=top]:rounded-t-none')
      expect(popup?.className).toContain('data-[side=bottom]:rounded-t-none')
      expect(popup?.className).toContain('data-[side=bottom]:border-t-0')
      expect(popup?.className).toContain('data-[side=top]:rounded-b-none')
      expect(popup?.className).toContain('data-[side=top]:border-b-0')

      // The group carries the state the styles key off. Open now, below.
      expect(field).toHaveAttribute('data-popup-open')
    })
  })

  describe('keyboard focus', () => {
    it('rings the field when focus arrives by Tab, and not when it arrives by click', async () => {
      const { user, input } = setup()
      const field = input.closest('[role="group"]') as HTMLElement

      await user.click(input)
      expect(input).toHaveFocus()
      expect(field.className).not.toContain('outline-ring')

      await user.click(document.body)
      await user.tab()
      expect(input).toHaveFocus()
      expect(field.className).toContain('outline-ring')

      await user.tab()
      expect(field.className).not.toContain('outline-ring')
    })
  })

  describe('filter chips', () => {
    const DEDEMAN: EntitySearchHit = {
      ...IASI, id: 'company:2816464', title: 'DEDEMAN SRL', docType: 'company',
      href: '/companies/2816464', identifiers: ['2816464'], countyName: 'Bacău',
      subtitle: 'SRL', roles: ['company'],
    }
    const UAT_CLUJ: EntitySearchHit = { ...CLUJ, subtitle: 'uat, uat_municipality' }
    const COURT_CLUJ: EntitySearchHit = {
      ...IASI, id: 'organization:1', title: 'Tribunalul Cluj', href: '/entities/1',
      identifiers: ['1'], countyName: 'Cluj', subtitle: 'public_entity, admin_court',
    }

    async function typeUntilSuggested(user: ReturnType<typeof userEvent.setup>, term: string) {
      const input = screen.getByRole('combobox')
      await user.click(input)
      await user.type(input, term)
      await waitFor(() => expect(screen.getByRole('option', { name: /filtru/i })).toBeInTheDocument())
      return input
    }

    it('offers a filter as the first option when the text names a kind', async () => {
      searchEntities.mockResolvedValue(response([DEDEMAN, IASI]))
      const { user } = setup()
      await typeUntilSuggested(user, 'firma dedeman')
      await waitFor(() => expect(screen.getAllByRole('option').length).toBeGreaterThan(1))

      const options = screen.getAllByRole('option')
      expect(options[0]).toHaveTextContent('Firme')
      expect(options[0]).toHaveTextContent('Filtru')
      // The suggestion is not a link; the results still are.
      expect(options[0].tagName).not.toBe('A')
      expect(options[1].tagName).toBe('A')
    })

    it('turns the word into a chip on click, lifts it from the text, and narrows the rows', async () => {
      searchEntities.mockResolvedValue(response([DEDEMAN, IASI]))
      const { user } = setup()
      const input = await typeUntilSuggested(user, 'firma dedeman')

      await user.click(screen.getByRole('option', { name: /filtru/i }))

      // The chip is in the field, with its own remove button; the word is gone.
      expect(screen.getByLabelText('Elimină filtrul Firme')).toBeInTheDocument()
      expect(input).toHaveValue('dedeman')
      expect(input).toHaveFocus()
      // Focus came back by way of a mouse press, so no keyboard ring.
      expect(input.closest('[role="group"]')?.className).not.toContain('outline-ring')
      // The list stays open — the chip has just changed what it shows.
      await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(1))
      expect(screen.getAllByRole('option')[0]).toHaveAttribute('href', '/companies/2816464')
      // The header names the scope.
      expect(screen.getByText('Firme', { selector: '.font-mono' })).toBeInTheDocument()
      // The chip is not sent: the request is the same one, for the remaining text.
      expect(searchEntities).toHaveBeenLastCalledWith(
        expect.objectContaining({ q: 'dedeman' }), expect.any(AbortSignal),
      )
      expect(searchEntities.mock.calls.every(([input]) => !('roles' in (input as object)))).toBe(true)
    })

    it('accepts a suggestion from the keyboard with ArrowDown and Enter', async () => {
      searchEntities.mockResolvedValue(response([UAT_CLUJ, COURT_CLUJ]))
      const { user } = setup()
      const input = await typeUntilSuggested(user, 'primaria cluj')

      await user.keyboard('{ArrowDown}{Enter}')

      expect(screen.getByLabelText('Elimină filtrul Primării')).toBeInTheDocument()
      // The word stays for Primării — it is what finds the municipality.
      expect(input).toHaveValue('primaria cluj')
      expect(navigate).not.toHaveBeenCalled()
      // Primării keeps the UAT and drops the court, reading the palette's line.
      await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(1))
      expect(screen.getAllByRole('option')[0]).toHaveTextContent('Cluj-Napoca')
    })

    it('says when a chip has narrowed the page to nothing, rather than claiming no match', async () => {
      searchEntities.mockResolvedValue(response([IASI, CLUJ]))
      const { user } = setup()
      await typeUntilSuggested(user, 'firma iasi')

      await user.click(screen.getByRole('option', { name: /filtru/i }))

      await waitFor(() => expect(screen.getByText(/printre primele rezultate/i)).toBeInTheDocument())
      expect(screen.queryByText(/Niciun rezultat pentru/i)).not.toBeInTheDocument()
    })

    it('asks for a name when only a chip is left', async () => {
      const { user } = setup()
      const input = await typeUntilSuggested(user, 'firma')

      await user.click(screen.getByRole('option', { name: /filtru/i }))

      expect(input).toHaveValue('')
      // Drawn in the panel and announced in the live region — both audiences.
      expect(screen.getAllByText(/scrie un nume/i)).toHaveLength(2)
      // Nothing to search for: no request went out for the bare chip.
      expect(searchEntities).not.toHaveBeenCalled()
    })

    it('removes the last chip with Backspace on an empty field, and from its own button', async () => {
      const { user } = setup()
      const input = await typeUntilSuggested(user, 'firma')
      await user.click(screen.getByRole('option', { name: /filtru/i }))
      expect(screen.getByLabelText('Elimină filtrul Firme')).toBeInTheDocument()

      await user.keyboard('{Backspace}')
      expect(screen.queryByLabelText('Elimină filtrul Firme')).not.toBeInTheDocument()

      await user.type(input, 'ong')
      await user.click(screen.getByRole('option', { name: /filtru/i }))
      await user.click(screen.getByLabelText('Elimină filtrul ONG-uri'))
      expect(screen.queryByLabelText(/Elimină filtrul/)).not.toBeInTheDocument()
      expect(input).toHaveFocus()
    })

    it('clears the chips with the text, from the clear button and from the second Escape', async () => {
      const { user } = setup()
      const input = await typeUntilSuggested(user, 'firma dedeman')
      await user.click(screen.getByRole('option', { name: /filtru/i }))

      await user.click(screen.getByLabelText(/[Șș]terge/u))
      expect(screen.queryByLabelText(/Elimină filtrul/)).not.toBeInTheDocument()
      expect(input).toHaveValue('')

      await user.type(input, 'firma dedeman')
      await user.click(await screen.findByRole('option', { name: /filtru/i }))
      await user.keyboard('{Escape}{Escape}')
      expect(screen.queryByLabelText(/Elimină filtrul/)).not.toBeInTheDocument()
      expect(input).toHaveValue('')
    })

    it('does not offer a filter that is already on', async () => {
      const { user } = setup()
      const input = await typeUntilSuggested(user, 'firma')
      await user.click(screen.getByRole('option', { name: /filtru/i }))

      await user.type(input, 'firma')
      expect(screen.queryByRole('option', { name: /filtru/i })).not.toBeInTheDocument()
    })

    it('tells a screen reader that a filter is on offer', async () => {
      const { user } = setup()
      await typeUntilSuggested(user, 'firma dedeman')

      await waitFor(() =>
        expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent('Un filtru sugerat'),
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
      searchEntities.mockResolvedValue(response([]))
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
