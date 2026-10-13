import { useState } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnalyticsCutoff, Records, RecordsSort } from '../../api/procurement-analytics-api'
import type { Answer } from '../../hooks/use-procurement-analytics'
import { queryOf, recordsViewOf, type Query, type RecordsView } from '../../lib/analytics-model'
import { AnswerRecords } from './analytics-answer'

/**
 * The records tab's contract: one row per counted record (a consortium's
 * members each on their own row), the figures' own total, pages of 25 that
 * start over on a new order — the order and the page the address's, moved
 * through `onView` — and words, not an empty table, where the figures
 * abstain.
 */

const records = vi.hoisted(() => ({
  calls: [] as { readonly sort: RecordsSort; readonly page: number; readonly cutoff: AnalyticsCutoff | null }[],
  data: undefined as Records | undefined,
  retry: vi.fn(),
}))

vi.mock('../../hooks/use-procurement-analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../hooks/use-procurement-analytics')>()),
  useRecords: (_query: unknown, cutoff: AnalyticsCutoff | null, sort: RecordsSort, page: number) => {
    records.calls.push({ sort, page, cutoff })
    return { read: { data: records.data, isError: false, isFetching: false }, retry: records.retry }
  },
}))

/** The list with its view held as the address would hold it: each move lands, as a navigation would. */
function Records({ query, answer: read = answer, initial }: { readonly query: Query; readonly answer?: Answer; readonly initial?: RecordsView }) {
  const [view, setView] = useState<RecordsView>(initial ?? recordsViewOf({}, query))
  return <AnswerRecords query={query} answer={read} view={view} onView={setView} />
}

/** The read the list made last (the target library has no `Array.at`). */
const last = () => records.calls[records.calls.length - 1]

const CUTOFF: AnalyticsCutoff = { direct: '2026-05', contract: '2026-05', build: '13' }
const answer = { cutoff: CUTOFF, cutoffFailed: false, retryCutoff: vi.fn() } as unknown as Answer

const row = (id: string, supplier: string, value: number | null) => ({
  id,
  href: `/procurement/contracts/${id}`,
  title: 'Lucrări de drumuri',
  authority: { cui: '4270740', name: 'Primăria Sibiu' },
  supplier: { cui: null, name: supplier },
  value,
  date: '2025-03-02',
})

beforeEach(() => {
  records.calls = []
  records.data = { total: 60, abstained: false, rows: Array.from({ length: 25 }, (_, index) => row(String(index + 1), `Firma ${index + 1}`, index === 1 ? null : 100)) }
})

describe('AnswerRecords', () => {
  it('lists one row per counted record, a consortium’s members each on their own', () => {
    records.data = { total: 2, abstained: false, rows: [row('1', 'A SRL', 1000), row('2', 'B SRL', null)] }
    render(<Records query={queryOf({ tip: 'contracte', judet: 'SB' })} />)
    const body = screen.getAllByRole('rowgroup')[1]!
    expect(within(body).getAllByRole('row')).toHaveLength(2)
    expect(screen.getByText(/A SRL/u)).toBeTruthy()
    expect(screen.getByText(/B SRL/u)).toBeTruthy()
    expect(last()).toMatchObject({ sort: 'value_desc', page: 1, cutoff: CUTOFF })
  })

  it('pages forward and back, and starts over at page 1 on a new order', () => {
    render(<Records query={queryOf({ tip: 'directe' })} />)
    fireEvent.click(screen.getByRole('button', { name: /Pagina următoare/u }))
    expect(last()).toMatchObject({ sort: 'value_desc', page: 2 })
    fireEvent.click(screen.getByRole('button', { name: /Pagina următoare/u }))
    expect(last()).toMatchObject({ page: 3 })
    fireEvent.click(screen.getByRole('button', { name: /Data/u }))
    expect(last()).toMatchObject({ sort: 'date_desc', page: 1 })
  })

  it('opens on the page and order the address holds', () => {
    render(<Records query={queryOf({ tip: 'directe' })} initial={{ sort: 'date_desc', page: 3 }} />)
    expect(last()).toMatchObject({ sort: 'date_desc', page: 3 })
    expect(screen.getByText(/51–75 din/u)).toBeTruthy()
  })

  it('orders by date on a phone too, where the date column is hidden', () => {
    render(<Records query={queryOf({ tip: 'directe' })} />)
    const newest = screen.getByRole('button', { name: /Cele mai noi/u })
    expect(newest.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(newest)
    expect(last()).toMatchObject({ sort: 'date_desc', page: 1 })
    expect(screen.getByRole('button', { name: /Cele mai noi/u }).getAttribute('aria-pressed')).toBe('true')
    // A toggle: pressed again, back to the largest first.
    fireEvent.click(screen.getByRole('button', { name: /Cele mai noi/u }))
    expect(last()).toMatchObject({ sort: 'value_desc', page: 1 })
    expect(screen.getByRole('columnheader', { name: /Înregistrarea/u })).toBeTruthy()
  })

  it('says a shared page past the list’s end, with the way back — never an empty selection', () => {
    // Buyer 4317770 and supplier 35469698 in 2025: two records, and an address at page 2.
    records.data = { total: 2, abstained: false, rows: [] }
    render(<Records query={queryOf({ tip: 'directe' })} initial={{ sort: 'value_desc', page: 2 }} />)
    expect(screen.queryByText(/Nicio înregistrare/u)).toBeNull()
    expect(screen.getByText(/Pagina 2 e după sfârșitul listei/u)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Mergi la prima pagină/u }))
    expect(last()).toMatchObject({ sort: 'value_desc', page: 1 })
  })

  it('stops at the last page of the total', () => {
    records.data = { total: 25, abstained: false, rows: records.data!.rows }
    render(<Records query={queryOf({ tip: 'directe' })} />)
    expect(screen.queryByRole('button', { name: /Pagina următoare/u })).toBeNull()
  })

  it('says the figures abstain instead of showing an empty list', () => {
    records.data = { total: null, abstained: true, rows: [] }
    render(<Records query={queryOf({ tip: 'directe' })} />)
    expect(screen.getByText(/Lista nu se arată/u)).toBeTruthy()
  })

  it('lists nothing while the cutoff is unread, and its retry reads the cutoff again', () => {
    const failed = { ...answer, cutoff: null, cutoffFailed: true } as unknown as Answer
    render(<Records query={queryOf({ tip: 'directe' })} answer={failed} />)
    expect(screen.getByText(/Lista nu s-a putut citi acum/u)).toBeTruthy()
    expect(screen.queryAllByRole('row')).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: /Încearcă din nou/u }))
    expect(records.retry).toHaveBeenCalledTimes(1)
  })

  it('orders frameworks by date only and shows no ceiling as a value', () => {
    render(<Records query={queryOf({ tip: 'acorduri' })} />)
    expect(last()).toMatchObject({ sort: 'date_desc' })
    expect(screen.queryByRole('button', { name: /Cele mai noi/u })).toBeNull()
    expect(screen.queryByText(/100/u)).toBeNull()
  })
})
