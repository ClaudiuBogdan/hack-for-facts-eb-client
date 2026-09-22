import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen } from '@/test/test-utils'
import { DetailYearWindowControl } from './detail-year-window-control'

const span = { from: 2000, to: 2020 }

function mount(window = span) {
  const change = vi.fn()
  render(
    <DetailYearWindowControl
      span={span}
      window={window}
      onChange={change}
      variant="panel"
    />,
  )
  return change
}

describe('year window control', () => {
  it('offers only the shortcuts shorter than the span, and none to reset an unpinned window', () => {
    mount()
    expect(screen.getByRole('button', { name: 'ultimii 5 ani' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ultimii 10 ani' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ultimii 20 ani' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'tot intervalul' })).not.toBeInTheDocument()
  })

  it('writes a shortcut as a start pin only — the end is the span end, which is no pin', async () => {
    const change = mount()
    await userEvent.click(screen.getByRole('button', { name: 'ultimii 5 ani' }))
    expect(change).toHaveBeenCalledWith({ din: 2016, pana: undefined })
  })

  it('clamps a typed year to the span, shows the clamped year, and writes the span edge as no pin', async () => {
    const change = mount()
    const from = screen.getByRole('textbox', { name: 'An de început' })
    await userEvent.clear(from)
    await userEvent.type(from, '1980{Enter}')
    expect(change).toHaveBeenCalledWith({ din: undefined, pana: undefined })
    // The start was already 2000, so no prop changed; the field still says so.
    expect(from).toHaveValue('2000')
  })

  it('puts reversed bounds in order rather than writing an empty window', async () => {
    const change = mount({ from: 2005, to: 2020 })
    const to = screen.getByRole('textbox', { name: 'An de sfârșit' })
    await userEvent.clear(to)
    await userEvent.type(to, '2003{Enter}')
    expect(change).toHaveBeenCalledWith({ din: 2003, pana: 2005 })
  })

  it('shows the year it holds after a commit that reordered the bounds around it', async () => {
    const change = mount({ from: 2005, to: 2005 })
    const to = screen.getByRole('textbox', { name: 'An de sfârșit' })
    await userEvent.clear(to)
    await userEvent.type(to, '2003{Enter}')
    expect(change).toHaveBeenLastCalledWith({ din: 2003, pana: 2005 })
    // The end stayed 2005; a field still reading „2003" would commit
    // 2003–2003 on blur.
    expect(to).toHaveValue('2005')
    await userEvent.tab()
    expect(change).toHaveBeenLastCalledWith({ din: 2003, pana: 2005 })
  })

  it('resets a pinned window to the whole span', async () => {
    const change = mount({ from: 2005, to: 2018 })
    expect(screen.getByText('14 ani')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'tot intervalul' }))
    expect(change).toHaveBeenCalledWith({ din: undefined, pana: undefined })
  })

  it('bounds both thumbs by the observed span', () => {
    mount({ from: 2005, to: 2018 })
    const [from, to] = screen.getAllByRole('slider')
    expect(from).toHaveAttribute('aria-valuemin', '2000')
    expect(from).toHaveAttribute('aria-valuenow', '2005')
    expect(to).toHaveAttribute('aria-valuemax', '2020')
    expect(to).toHaveAttribute('aria-valuenow', '2018')
  })
})
