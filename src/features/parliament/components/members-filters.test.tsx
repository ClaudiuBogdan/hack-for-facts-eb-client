import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MembersFilters } from './members-filters'

vi.mock('../hooks/use-parliament-data', () => ({
  useParliamentGroups: () => ({ data: [] }),
  useParliamentJudete: () => ({ data: [] }),
}))

describe('MembersFilters', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not reset pagination when mounted from existing URL state', () => {
    vi.useFakeTimers()
    const onSearchChange = vi.fn()

    render(
      <MembersFilters
        search={{ tab: 'grupuri', page: 3, pageSize: 20 }}
        onSearchChange={onSearchChange}
      />,
    )

    act(() => {
      vi.advanceTimersByTime(400)
    })

    expect(onSearchChange).not.toHaveBeenCalled()
  })

  it('debounces user-entered search and resets to the first page', () => {
    vi.useFakeTimers()
    const onSearchChange = vi.fn()

    render(
      <MembersFilters
        search={{ tab: 'grupuri', page: 3, pageSize: 20 }}
        onSearchChange={onSearchChange}
      />,
    )

    fireEvent.change(screen.getByLabelText('Caută după nume'), {
      target: { value: '  Ana  ' },
    })

    expect(onSearchChange).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(onSearchChange).toHaveBeenCalledWith({
      tab: 'grupuri',
      page: 1,
      pageSize: 20,
      q: 'Ana',
    })
  })
})
