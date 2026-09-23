import { act, fireEvent, render, screen } from '@/test/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StatisticsDebouncedSearchInput } from './statistics-debounced-search-input'

function field(value: string | undefined, onCommit: (value: string | undefined) => void) {
  return (
    <StatisticsDebouncedSearchInput
      value={value}
      onCommit={onCommit}
      inputId="search"
      placeholder="Caută"
      ariaLabel="Caută seturi de date"
      clearLabel="Șterge căutarea"
    />
  )
}

const input = () => screen.getByRole('searchbox', { name: 'Caută seturi de date' })

describe('StatisticsDebouncedSearchInput', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('commits a trimmed term once the typing pauses, and nothing before', () => {
    const onCommit = vi.fn()
    render(field(undefined, onCommit))
    fireEvent.change(input(), { target: { value: ' popul' } })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    fireEvent.change(input(), { target: { value: ' populatie ' } })
    act(() => {
      vi.advanceTimersByTime(299)
    })
    expect(onCommit).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onCommit).toHaveBeenCalledWith('populatie')
  })

  it('follows the address when it changes from outside, and does not commit what it was given', () => {
    const onCommit = vi.fn()
    const { rerender } = render(field('populatie', onCommit))
    expect(input()).toHaveValue('populatie')
    // A chip removed, the back button: the field empties without a commit.
    rerender(field(undefined, onCommit))
    expect(input()).toHaveValue('')
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('keeps a keystroke in flight when the address lands with the term it committed before', () => {
    const onCommit = vi.fn()
    const { rerender } = render(field(undefined, onCommit))
    fireEvent.change(input(), { target: { value: 'tur' } })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(onCommit).toHaveBeenCalledWith('tur')
    // The reader keeps typing before the router has applied „tur"…
    fireEvent.change(input(), { target: { value: 'turi' } })
    // …and when the address lands with the term this field committed, the
    // newer keystroke is not clobbered by it.
    rerender(field('tur', onCommit))
    expect(input()).toHaveValue('turi')
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(onCommit).toHaveBeenLastCalledWith('turi')
  })

  it('clears at once from the button, with no debounce', () => {
    const onCommit = vi.fn()
    render(field('populatie', onCommit))
    fireEvent.click(screen.getByRole('button', { name: 'Șterge căutarea' }))
    expect(input()).toHaveValue('')
    expect(onCommit).toHaveBeenCalledWith(undefined)
    expect(screen.queryByRole('button', { name: 'Șterge căutarea' })).not.toBeInTheDocument()
  })
})
