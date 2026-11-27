import { useRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@/test/test-utils'
import { NO_SEARCH_FILTERS, type SearchFilters } from '../lib/search-filters'
import { LegislationActiveFilters, LegislationFilterButton, LegislationFilterPanel } from './legislation-search-filters'

const panel = (filters: SearchFilters = NO_SEARCH_FILTERS, asked?: boolean) => {
  const onChange = vi.fn()
  const onOpenChange = vi.fn()
  render(<LegislationFilterPanel filters={filters} onChange={onChange} open onOpenChange={onOpenChange} asked={asked} />)
  return { onChange, onOpenChange, dialog: screen.getByRole('dialog', { name: 'Filtre' }) }
}
/** The first button of that name: the type list is drawn before the category list, which repeats some names. */
const first = (dialog: HTMLElement, name: string) => within(dialog).getAllByRole('button', { name })[0] as HTMLElement
/** The options under a list's label, by name, in the order drawn. */
const options = (dialog: HTMLElement, from: string, to: string) => {
  const all = within(dialog).getAllByRole('button').map((button) => button.textContent ?? '')
  return all.slice(all.indexOf(from), all.indexOf(to))
}

describe('LegislationFilterPanel', () => {
  it('shows a long list’s first six options and the rest behind one link', () => {
    const { dialog } = panel()
    expect(options(dialog, 'Lege', 'Încă 12 tipuri')).toEqual(['Lege', 'Ordonanță de urgență', 'Ordonanță', 'Hotărâre', 'Ordin', 'Decizie'])

    const more = within(dialog).getByRole('button', { name: 'Încă 12 tipuri' })
    expect(more).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(more)
    // „Decret" was only a category until the type list opened
    expect(within(dialog).getAllByRole('button', { name: 'Decret' })).toHaveLength(2)
    expect(within(dialog).getByRole('button', { name: 'Tip necunoscut' })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Mai puține' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('takes the focus to the first option the link reveals (astra-client-11)', () => {
    const { dialog } = panel()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Încă 12 tipuri' }))
    // „Decret", the seventh type, was hidden; the category list has its own „Decret" further down
    expect(document.activeElement).toBe(first(dialog, 'Decret'))
  })

  it('leaves the focus where a mouse click put it: only the keyboard is taken to the revealed options (astra-client-12)', () => {
    const { dialog } = panel()
    // a pointer click carries its click count; Enter or Space on the link carries none
    fireEvent.click(within(dialog).getByRole('button', { name: 'Încă 12 tipuri' }), { detail: 1 })
    expect(within(dialog).getAllByRole('button', { name: 'Decret' })).toHaveLength(2)
    expect(document.activeElement).not.toBe(first(dialog, 'Decret'))
  })

  it('counts only the options the link hides (astra-client-11)', () => {
    // „Decret" is chosen, so it is shown with the list closed: eleven types are left behind the link
    const { dialog } = panel({ ...NO_SEARCH_FILTERS, tip: ['decret'] })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Mai puține' }))
    expect(within(dialog).getByRole('button', { name: 'Încă 11 tipuri' })).toBeInTheDocument()
    expect(options(dialog, 'Lege', 'Încă 11 tipuri')).toEqual(['Lege', 'Ordonanță de urgență', 'Ordonanță', 'Hotărâre', 'Ordin', 'Decizie', 'Decret'])
  })

  it('opens a list whole when one of its hidden options is chosen', () => {
    const { dialog } = panel({ ...NO_SEARCH_FILTERS, tip: ['decret'] })
    expect(first(dialog, 'Decret')).toHaveAttribute('aria-pressed', 'true')
    expect(within(dialog).getByRole('button', { name: 'Tip necunoscut' })).toBeInTheDocument()
    // the other long lists stay short
    expect(within(dialog).getByRole('button', { name: 'Încă 10 domenii' })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Încă 7 categorii' })).toBeInTheDocument()
  })

  it('adds and removes an option of a list where several can be chosen', () => {
    const { dialog, onChange } = panel({ ...NO_SEARCH_FILTERS, tip: ['lege'] })
    expect(first(dialog, 'Lege')).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(first(dialog, 'Ordin'))
    expect(onChange).toHaveBeenLastCalledWith({ ...NO_SEARCH_FILTERS, tip: ['lege', 'ordin'] })
    fireEvent.click(first(dialog, 'Lege'))
    expect(onChange).toHaveBeenLastCalledWith({ ...NO_SEARCH_FILTERS, tip: [] })
  })

  it('takes one status at a time', () => {
    const { dialog, onChange } = panel()
    expect(within(dialog).getByRole('button', { name: 'Fără cele abrogate' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Abrogat' }))
    expect(onChange).toHaveBeenLastCalledWith({ ...NO_SEARCH_FILTERS, stare: 'abrogat' })
  })

  it('offers the acts whose status the Portal does not give (owner, 27 November 2026)', () => {
    const { dialog, onChange } = panel()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Statut necunoscut' }))
    expect(onChange).toHaveBeenLastCalledWith({ ...NO_SEARCH_FILTERS, stare: 'necunoscut' })
  })

  it('closes onto the results from the bar at the bottom, which also takes every filter off', () => {
    const filters = { ...NO_SEARCH_FILTERS, sanctiuni: true }
    const { dialog, onChange, onOpenChange } = panel(filters)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Vezi rezultatele' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Scoate toate' }))
    expect(onChange).toHaveBeenLastCalledWith(NO_SEARCH_FILTERS)
  })

  it('says „Gata" on the phone’s bar when no question is asked: closing shows the ways to ask, not results', () => {
    const { dialog } = panel(NO_SEARCH_FILTERS, false)
    expect(within(dialog).getByRole('button', { name: 'Gata' })).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Vezi rezultatele' })).not.toBeInTheDocument()
  })

  it('closes from the bar and gives the focus back to the button that opened it (astra-client-11)', async () => {
    function Page() {
      const [open, setOpen] = useState(false)
      const button = useRef<HTMLButtonElement>(null)
      return (
        <>
          <LegislationFilterButton ref={button} filters={NO_SEARCH_FILTERS} onOpen={() => setOpen(true)} />
          <LegislationFilterPanel filters={NO_SEARCH_FILTERS} onChange={vi.fn()} open={open} onOpenChange={setOpen} returnFocus={() => button.current?.focus()} />
        </>
      )
    }
    render(<Page />)
    const opener = screen.getByRole('button', { name: 'Filtre' })
    fireEvent.click(opener)
    const dialog = await screen.findByRole('dialog', { name: 'Filtre' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Vezi rezultatele' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Filtre' })).not.toBeInTheDocument())
    expect(document.activeElement).toBe(opener)
  })

  it('offers nothing to take off when no filter is on, and keeps the issuer’s note', () => {
    const { dialog } = panel()
    expect(within(dialog).queryByRole('button', { name: /Scoate toate/ })).not.toBeInTheDocument()
    expect(dialog).toHaveTextContent('Filtrul după emitent vine curând')
  })
})

describe('LegislationActiveFilters', () => {
  it('draws nothing when no filter is on', () => {
    const { container } = render(<LegislationActiveFilters filters={NO_SEARCH_FILTERS} onChange={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('names each filter on and takes it off alone, or all at once', () => {
    const onChange = vi.fn()
    const filters: SearchFilters = { ...NO_SEARCH_FILTERS, tip: ['lege'], stare: 'toate', from: 2015, to: 2020, categorie: ['ordin'] }
    render(<LegislationActiveFilters filters={filters} onChange={onChange} />)

    const chips = screen.getByRole('group', { name: 'Filtre active' })
    expect(within(chips).getAllByRole('button').map((button) => button.textContent)).toEqual(['Lege', 'Și actele abrogate', '2015–2020', 'Categoria: Ordin', 'Scoate toate filtrele'])
    fireEvent.click(within(chips).getByRole('button', { name: 'Scoate 2015–2020' }))
    expect(onChange).toHaveBeenLastCalledWith({ ...filters, from: null, to: null })
    fireEvent.click(within(chips).getByRole('button', { name: 'Scoate toate filtrele' }))
    expect(onChange).toHaveBeenLastCalledWith(NO_SEARCH_FILTERS)
  })
})

describe('LegislationFilterButton', () => {
  it('says how many filters are on, in its name and beside its word', () => {
    const { rerender } = render(<LegislationFilterButton filters={NO_SEARCH_FILTERS} onOpen={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Filtre' })).toHaveTextContent('Filtre')
    rerender(<LegislationFilterButton filters={{ ...NO_SEARCH_FILTERS, tip: ['lege', 'ordin'] }} onOpen={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Filtre, 2 active' })).toHaveTextContent('Filtre (2)')
  })
})
