import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  ParliamentActiveFilterChips,
  ParliamentListFooter,
  ParliamentListHeader,
  ParliamentListToolbar,
} from './parliament-list-surface'

describe('ParliamentListHeader', () => {
  it('titles the surface at ONE heading level across the tabs', () => {
    // `h2`, because the parliament shell already owns the page's `h1`. The
    // comisii page used to render a second `h1` of its own.
    render(<ParliamentListHeader title="Voturile din Parlament" description="…" />)
    expect(
      screen.getByRole('heading', { level: 2, name: 'Voturile din Parlament' }),
    ).toBeInTheDocument()
  })

  it('keeps the caveat CLOSED but reachable, not printed above the controls', () => {
    render(
      <ParliamentListHeader
        title="Ordinea de zi"
        description="…"
        about={<>Un plan de lucru, nu o consemnare.</>}
      />,
    )
    const disclosure = screen.getByText('Despre aceste date și surse')
    const details = disclosure.closest('details')
    expect(details).not.toBeNull()
    expect(details).not.toHaveAttribute('open')
    // Present in the DOM (findable, printable), just not unfolded.
    expect(
      screen.getByText('Un plan de lucru, nu o consemnare.'),
    ).toBeInTheDocument()
  })

  it('renders no disclosure at all when a tab has nothing to disclose', () => {
    const { container } = render(
      <ParliamentListHeader title="Parlamentari" description="…" />,
    )
    expect(container.querySelector('details')).toBeNull()
  })
})

describe('ParliamentActiveFilterChips', () => {
  const chip = (label: string, onRemove: () => void) => ({
    key: label,
    label,
    onRemove,
  })

  it('announces the active filters, because the sheet closes behind them', () => {
    render(
      <ParliamentActiveFilterChips
        chips={[chip('Senat', vi.fn())]}
        onClearAll={vi.fn()}
      />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Senat')
  })

  it('removes one facet without touching the rest', () => {
    const removeChamber = vi.fn()
    const removeOutcome = vi.fn()
    render(
      <ParliamentActiveFilterChips
        chips={[chip('Senat', removeChamber), chip('Adoptat', removeOutcome)]}
        onClearAll={vi.fn()}
      />,
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Elimină filtrul Senat' }),
    )
    expect(removeChamber).toHaveBeenCalledOnce()
    expect(removeOutcome).not.toHaveBeenCalled()
  })

  it('renders nothing when no filter is on', () => {
    const { container } = render(
      <ParliamentActiveFilterChips chips={[]} onClearAll={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('carries a rule the reader needs while THAT filter is on', () => {
    // The group filter matches a group's majority — a caveat that has to be
    // visible, so it cannot live in the header's closed disclosure.
    render(
      <ParliamentActiveFilterChips
        chips={[chip('PSD: Pentru', vi.fn())]}
        onClearAll={vi.fn()}
        note="Se afișează voturile în care majoritatea grupului a ales „Pentru”."
      />,
    )
    expect(
      screen.getByText(/majoritatea grupului a ales/),
    ).toBeInTheDocument()
  })
})

describe('ParliamentListToolbar and ParliamentListFooter', () => {
  it('puts the count and the way to more rows on ONE closing line', () => {
    render(
      <ParliamentListFooter summary="10 din peste 10.000 de voturi">
        <button type="button">Încarcă voturi mai vechi</button>
      </ParliamentListFooter>,
    )
    expect(
      screen.getByText('10 din peste 10.000 de voturi'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Încarcă voturi mai vechi' }),
    ).toBeInTheDocument()
  })

  it('stands on its own when a list has no pagination', () => {
    render(<ParliamentListFooter summary="49 de comisii" />)
    expect(screen.getByText('49 de comisii')).toBeInTheDocument()
  })

  it('keeps the second control row and the chips under the search row', () => {
    render(
      <ParliamentListToolbar
        secondary={<button type="button">Camera Deputaților</button>}
        chips={<span>Senat</span>}
      >
        <input aria-label="Caută" />
      </ParliamentListToolbar>,
    )
    expect(screen.getByLabelText('Caută')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Camera Deputaților' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Senat')).toBeInTheDocument()
  })
})
