import type { ReactNode } from 'react'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { HubActivityRanking } from '../../lib/hub-snapshot-types'
import { HubActivities } from './hub-sectors'

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
    const other = rest.find((row) => /activități selectate/u.test(row.textContent ?? ''))
    const none = rest.find((row) => /Fără selecție calificată/u.test(row.textContent ?? ''))
    // No contributor: no share, no figure — never „0".
    expect(other?.textContent).toMatch(/——$/u)
    expect(other?.textContent).not.toMatch(/\d\s?%|0\s?lei/u)
    // A reported zero: its share and its figure, both zero.
    expect(none?.textContent).toMatch(/0[.,]0\s?%/u)
    expect(none?.textContent).toMatch(/0\s?lei$/u)
  })
})
