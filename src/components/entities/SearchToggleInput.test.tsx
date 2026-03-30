import { fireEvent, render, screen } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { SearchToggleInput } from './SearchToggleInput'

vi.mock('react-hotkeys-hook', () => ({
  useHotkeys: vi.fn(),
}))

vi.mock('@/lib/hooks/useDebouncedCallback', () => ({
  useDebouncedCallback: (fn: (...args: any[]) => void) => fn,
}))

describe('SearchToggleInput', () => {
  it('renders search icon button when inactive', () => {
    render(
      <SearchToggleInput
        active={false}
        initialSearchTerm=""
        onToggle={vi.fn()}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /Open search/i })).toBeInTheDocument()
  })

  it('renders input and clear button when active', () => {
    render(
      <SearchToggleInput
        active={true}
        initialSearchTerm=""
        onToggle={vi.fn()}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Clear search/i })).toBeInTheDocument()
  })

  it('calls onToggle(true) when search icon is clicked', () => {
    const onToggle = vi.fn()

    render(
      <SearchToggleInput
        active={false}
        initialSearchTerm=""
        onToggle={onToggle}
        onChange={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Open search/i }))

    expect(onToggle).toHaveBeenCalledWith(true)
  })

  it('calls onChange and onToggle(false) when clear button is clicked', () => {
    const onToggle = vi.fn()
    const onChange = vi.fn()

    render(
      <SearchToggleInput
        active={true}
        initialSearchTerm="test"
        onToggle={onToggle}
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Clear search/i }))

    expect(onChange).toHaveBeenCalledWith('')
    expect(onToggle).toHaveBeenCalledWith(false)
  })

  it('calls onChange when user types in the input', () => {
    const onChange = vi.fn()

    render(
      <SearchToggleInput
        active={true}
        initialSearchTerm=""
        onToggle={vi.fn()}
        onChange={onChange}
        debounceMs={0}
      />,
    )

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hello' } })

    expect(onChange).toHaveBeenCalledWith('hello')
  })

  it('displays the initial search term in the input', () => {
    render(
      <SearchToggleInput
        active={true}
        initialSearchTerm="existing query"
        onToggle={vi.fn()}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('textbox')).toHaveValue('existing query')
  })
})
