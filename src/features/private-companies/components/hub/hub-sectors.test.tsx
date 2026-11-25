import type { ReactNode } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { HubActivityRanking, HubSizeClass } from '../../lib/hub-snapshot-types'
import { HubActivities, HubSizeBars } from './hub-sectors'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, search }: { readonly children: ReactNode; readonly search?: unknown }) => <a data-search={JSON.stringify(search ?? {})}>{children}</a>,
}))

/** A ranking whose rest reported no turnover at all, beside unselected companies whose turnover is a real zero. */
const RANKING: HubActivityRanking = {
  total: 1_000,
  companies: 30,
  groupCount: 4,
  rows: [{ key: 'onrc:rev3:4711', source: 'ONRC', code: '4711', revision: 'rev3', label: 'Comerț cu amănuntul', value: 1_000, companies: 10 }],
  other: { value: null, companies: 15, groups: 3 },
  unclassified: [{ basis: 'NO_QUALIFIED_SELECTION', value: 0, companies: 5 }],
}

describe('HubActivities', () => {
  it('keeps a remainder with no reported value a gap, and a real zero a zero', () => {
    render(<HubActivities ranking={RANKING} measure="turnover" rowLink={() => ({})} analysis={{}} caption="—" />)
    const rest = within(screen.getByTestId('company-hub-activities-rest')).getAllByRole('listitem')
    const other = rest.find((row) => /^(O altă activitate|Alte .*activități)/u.test(row.textContent ?? ''))
    const none = rest.find((row) => /Fără selecție calificată/u.test(row.textContent ?? ''))
    // No contributor: no share, no figure — never „0".
    expect(other?.textContent).toMatch(/——$/u)
    expect(other?.textContent).not.toMatch(/\d\s?%|0\s?lei/u)
    // A reported zero: its share and its figure, both zero.
    expect(none?.textContent).toMatch(/0[.,]0\s?%/u)
    expect(none?.textContent).toMatch(/0\s?lei$/u)
  })
})

/** Ten ranked rows: a phone shows five, then a button for the rest. */
const TEN: HubActivityRanking = {
  ...RANKING,
  rows: Array.from({ length: 10 }, (_, index) => ({ key: `onrc:rev3:${4700 + index}`, source: 'ONRC' as const, code: String(4700 + index), revision: 'rev3' as const, label: `Activitatea ${index + 1}`, value: 100 - index, companies: 1 })),
}

describe('HubActivities on a phone', () => {
  it('sends every row, folds the ones past five behind a button there, and opens them for good', () => {
    render(<HubActivities ranking={TEN} measure="turnover" rowLink={() => ({})} analysis={{}} caption="—" />)
    const rows = within(screen.getByTestId('company-hub-activities').querySelector('ol') as HTMLElement).getAllByRole('listitem')
    expect(rows).toHaveLength(10)
    expect(rows.slice(0, 5).every((row) => !row.className.includes('max-sm:hidden'))).toBe(true)
    expect(rows.slice(5).every((row) => row.className.includes('max-sm:hidden'))).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: /Încă 5 activități/u }))
    expect(screen.queryByRole('button', { name: /Încă/u })).toBeNull()
    expect(rows.some((row) => row.className.includes('max-sm:hidden'))).toBe(false)
  })
})

const SIZES: readonly HubSizeClass[] = [
  { key: '0', firms: 400, employees: 0, turnover: 30 },
  { key: '1-9', firms: 500, employees: 250, turnover: 170 },
  { key: '10-49', firms: 50, employees: 220, turnover: 190 },
  { key: '50-249', firms: 8, employees: 190, turnover: 200 },
  { key: '250+', firms: 2, employees: 340, turnover: 410 },
]

describe('HubSizeBars', () => {
  it('draws three wholes split by class, a part only where there is a value, each worded on a pointer', () => {
    render(<HubSizeBars classes={SIZES} />)
    const bars = screen.getByTestId('company-hub-size-bars')
    const parts = [...bars.querySelectorAll('[title]')].map((part) => part.getAttribute('title'))
    // No employees in the class with none: four employee parts, five of each other.
    expect(parts).toHaveLength(14)
    // (The test's numbers follow its locale, so either decimal mark.)
    expect(parts.some((title) => /^250 de salariați sau mai mulți: 41[.,]0\s?% din cifra de afaceri$/u.test(title ?? ''))).toBe(true)
    expect(parts.some((title) => /^fără salariați: 41[.,]7\s?% din firme$/u.test(title ?? ''))).toBe(true)
  })

  it('keeps the figures as a table for assistive technology, the bars a picture', () => {
    render(<HubSizeBars classes={SIZES} />)
    const bars = screen.getByTestId('company-hub-size-bars')
    expect(bars.firstElementChild).toHaveAttribute('aria-hidden', 'true')
    const table = within(bars).getByRole('table')
    expect(table).toHaveClass('sr-only')
    expect(within(table).getAllByRole('row')).toHaveLength(6)
  })
})
