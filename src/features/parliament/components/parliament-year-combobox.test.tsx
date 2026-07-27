import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { stubResizeObserver, stubScrollIntoView } from '@/test/helpers'
import { ParliamentYearCombobox } from './parliament-year-combobox'

// cmdk observes its list on mount. Stubbed per-file, NOT in the shared setup:
// recharts' ResponsiveContainer renders nothing when a non-firing
// ResizeObserver exists, so a global stub breaks every chart test in the repo.
// `beforeEach`, because the vitest config sets `unstubGlobals`.
beforeEach(() => {
  stubResizeObserver()
  stubScrollIntoView()
})

const YEARS = [2026, 2025, 2024, 2023]

function renderCombobox(
  props: Partial<Parameters<typeof ParliamentYearCombobox>[0]> = {},
) {
  const onChange = vi.fn()
  render(
    <ParliamentYearCombobox
      id="year"
      years={YEARS}
      value={2025}
      onChange={onChange}
      {...props}
    />,
  )
  return { onChange }
}

/**
 * The TRIGGER, addressed by its accessible name. cmdk's own search box is also
 * a `combobox`, so once the popover is open a bare role query is ambiguous.
 */
function trigger() {
  return screen.getByRole('combobox', { name: /Anul ședințelor/ })
}

describe('ParliamentYearCombobox — the accessible replacement for the year list', () => {
  it('is a single combobox tab stop, not one button per year', () => {
    // The old control grew a button every year and offered no keyboard model
    // beyond tabbing through all of them.
    renderCombobox()
    expect(trigger()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('option')).toBeNull()
  })

  it('shows the selected year on the trigger', () => {
    renderCombobox()
    expect(trigger()).toHaveTextContent('2025')
  })

  it('opens with the keyboard and exposes the years as options', async () => {
    renderCombobox()
    await userEvent.tab()
    expect(trigger()).toHaveFocus()

    await userEvent.keyboard('{Enter}')
    expect(trigger()).toHaveAttribute('aria-expanded', 'true')
    const options = await screen.findAllByRole('option')
    expect(options.map((o) => o.textContent)).toEqual(
      YEARS.map((y) => String(y)),
    )
  })

  it('lists the years NEWEST FIRST, whatever order it was handed', async () => {
    // The server returns `availableYears` ascending, which opened the list on
    // 1996 — three decades of scrolling away from the sittings anyone is
    // looking for.
    renderCombobox({ years: [1996, 1997, 2024, 2026] })
    await userEvent.click(trigger())
    const options = await screen.findAllByRole('option')
    expect(options.map((option) => option.textContent)).toEqual([
      '2026',
      '2024',
      '1997',
      '1996',
    ])
  })

  it('stands the same height as the controls it sits between', () => {
    // The search field and the filter trigger beside it are both `h-11`; three
    // heights on one bar read as three unrelated things.
    renderCombobox()
    expect(trigger().className).toContain('h-11')
  })

  it('selects a year with the keyboard alone', async () => {
    const { onChange } = renderCombobox()
    await userEvent.tab()
    await userEvent.keyboard('{Enter}')
    await screen.findAllByRole('option')

    await userEvent.keyboard('{ArrowDown}{Enter}')
    expect(onChange).toHaveBeenCalledWith(2025)
  })

  it('type-ahead narrows the list', async () => {
    renderCombobox()
    await userEvent.click(trigger())
    await userEvent.type(
      await screen.findByPlaceholderText('Caută anul…'),
      '2023',
    )
    const options = await screen.findAllByRole('option')
    expect(options).toHaveLength(1)
    expect(options[0]).toHaveTextContent('2023')
  })

  it('offers an "all years" entry only when the year is optional', async () => {
    const { onChange } = renderCombobox({
      allLabel: 'Toți anii',
      value: undefined,
    })
    await userEvent.click(trigger())
    const all = await screen.findByRole('option', { name: /Toți anii/ })
    await userEvent.click(all)
    // Clearing the year is only ever offered where an unbounded list is legal.
    expect(onChange).toHaveBeenCalledWith(undefined)
  })

  it('has no "all years" entry when a year is required', async () => {
    renderCombobox()
    await userEvent.click(trigger())
    await screen.findAllByRole('option')
    expect(screen.queryByRole('option', { name: /Toți anii/ })).toBeNull()
  })

  it('closes after a selection', async () => {
    renderCombobox()
    await userEvent.click(trigger())
    const options = await screen.findAllByRole('option')
    await userEvent.click(options[0]!)
    expect(trigger()).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })
})
