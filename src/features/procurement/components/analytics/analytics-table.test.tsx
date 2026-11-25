import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Ranking } from '../../api/procurement-analytics-api'
import type { Answer } from '../../hooks/use-procurement-analytics'
import { queryOf, type Query } from '../../lib/analytics-model'
import type { Namer } from '../../lib/analytics-text'
import { AnswerTable } from './analytics-answer'

/**
 * The ranked answer's drill, by keyboard as by pointer: a ranked row's label
 * is a button that applies the row's filter, once — the row's own click
 * applies the same, and a click on the label must not apply it twice.
 */

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: { readonly children: ReactNode; readonly to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

const ranking: Ranking = {
  dimension: 'cpvDivision',
  rankedBy: 'value',
  withheld: null,
  buckets: [
    { key: '45', kind: 'top', count: 45_840, valued: 45_840, money: 3_661_373_843.34, share: 0.2361 },
    { key: '33', kind: 'top', count: 120_000, valued: 120_000, money: 2_000_000_000, share: 0.13 },
    { key: null, kind: 'other', count: 10, valued: 10, money: 1000, share: 0.0001 },
  ],
}
const answer = { ranking: { data: ranking, isError: false, isFetching: false, retry: vi.fn() } } as unknown as Answer
const namer: Namer = {
  names: undefined,
  divisions: new Map([
    ['45', { ro: 'Lucrări de construcții', en: 'Construction work' }],
    ['33', { ro: 'Echipamente medicale', en: 'Medical equipment' }],
  ]),
  counties: new Map(),
  localities: null,
}

function table(onChange: (query: Query) => void) {
  return render(<AnswerTable query={queryOf({})} answer={answer} namer={namer} onChange={onChange} expanded={false} onExpand={vi.fn()} />)
}

describe('AnswerTable', () => {
  it('makes a ranked row’s label a button that drills, by keyboard as by pointer', () => {
    const onChange = vi.fn()
    table(onChange)
    const label = screen.getByRole('button', { name: /Construction work/u })
    label.focus()
    expect(document.activeElement).toBe(label)
    fireEvent.click(label)
    // Once: the row's own click must not apply the drill again.
    expect(onChange).toHaveBeenCalledTimes(1)
    expect((onChange.mock.calls[0]![0] as Query).filters.cpv?.values).toEqual(['45'])
  })

  it('leaves an unranked row’s label plain text', () => {
    table(vi.fn())
    expect(screen.getAllByRole('button', { name: /Construction work|Medical equipment/u })).toHaveLength(2)
    const buttons = screen.getAllByRole('button').map((button) => button.textContent)
    expect(buttons.some((text) => /Altele|Other/u.test(text ?? ''))).toBe(false)
  })
})

/**
 * A direct-purchase supplier ranking (root, 24 November 2026; PROC-KR9T): a
 * supplier's page names a sole trader by the registry's full name, so only a
 * company's row links to it. A masked or code-only row drills like any other.
 */
describe('AnswerTable — direct-purchase suppliers', () => {
  const suppliers: Ranking = {
    dimension: 'supplier',
    rankedBy: 'count',
    withheld: null,
    buckets: [
      { key: '14837428', kind: 'top', displayKind: 'company', displayName: 'FLORARIA IRIS SRL', count: 3, valued: null, money: null, share: null },
      { key: '30111222', kind: 'top', displayKind: 'person_masked', displayName: 'Ion P*** PFA', count: 2, valued: null, money: null, share: null },
      { key: '30111223', kind: 'top', displayKind: 'code_only', displayName: null, count: 1, valued: null, money: null, share: null },
      { key: '4305857', kind: 'top', displayKind: 'company', displayName: null, count: 1, valued: null, money: null, share: null },
    ],
  } as Ranking
  const supplierAnswer = { ranking: { data: suppliers, isError: false, isFetching: false, retry: vi.fn() } } as unknown as Answer
  const query = queryOf({ tip: 'directe', dupa: 'firma' })

  it('links a company to its page and no masked or code-only supplier, and drills into each', () => {
    const onChange = vi.fn()
    render(<AnswerTable query={query} answer={supplierAnswer} namer={namer} onChange={onChange} expanded={false} onExpand={vi.fn()} />)
    expect(screen.getByRole('link', { name: /FLORARIA IRIS SRL/u }).getAttribute('href')).toBe('/procurement/suppliers/$cui')
    expect(screen.queryByRole('link', { name: /Ion P\*\*\* PFA/u })).toBeNull()
    expect(screen.queryByRole('link', { name: /30111223/u })).toBeNull()
    expect(screen.queryByRole('link', { name: /4305857/u })).toBeNull()
    expect(screen.getAllByRole('link')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: /Ion P\*\*\* PFA \(CUI 30111222\)/u }))
    expect((onChange.mock.calls[0]![0] as Query).filters.furnizor?.values).toEqual(['30111222'])
  })
})
