import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnalyticsCutoff, Records, RecordsSort } from '../../api/procurement-analytics-api'
import type { Answer } from '../../hooks/use-procurement-analytics'
import { queryOf } from '../../lib/analytics-model'
import { AnswerRecords } from './analytics-answer'

/**
 * The records tab's contract: one row per counted record (a consortium's
 * members each on their own row), the figures' own total, pages of 25 that
 * start over on a new order, and words — not an empty table — where the
 * figures abstain.
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
    render(<AnswerRecords query={queryOf({ tip: 'contracte', judet: 'SB' })} answer={answer} />)
    const body = screen.getAllByRole('rowgroup')[1]!
    expect(within(body).getAllByRole('row')).toHaveLength(2)
    expect(screen.getByText(/A SRL/u)).toBeTruthy()
    expect(screen.getByText(/B SRL/u)).toBeTruthy()
    expect(last()).toMatchObject({ sort: 'value_desc', page: 1, cutoff: CUTOFF })
  })

  it('pages forward and back, and starts over at page 1 on a new order', () => {
    render(<AnswerRecords query={queryOf({ tip: 'directe' })} answer={answer} />)
    fireEvent.click(screen.getByRole('button', { name: /Pagina următoare/u }))
    expect(last()).toMatchObject({ sort: 'value_desc', page: 2 })
    fireEvent.click(screen.getByRole('button', { name: /Pagina următoare/u }))
    expect(last()).toMatchObject({ page: 3 })
    fireEvent.click(screen.getByRole('button', { name: /Data/u }))
    expect(last()).toMatchObject({ sort: 'date_desc', page: 1 })
  })

  it('stops at the last page of the total', () => {
    records.data = { total: 25, abstained: false, rows: records.data!.rows }
    render(<AnswerRecords query={queryOf({ tip: 'directe' })} answer={answer} />)
    expect(screen.queryByRole('button', { name: /Pagina următoare/u })).toBeNull()
  })

  it('says the figures abstain instead of showing an empty list', () => {
    records.data = { total: null, abstained: true, rows: [] }
    render(<AnswerRecords query={queryOf({ tip: 'directe' })} answer={answer} />)
    expect(screen.getByText(/Lista nu se arată/u)).toBeTruthy()
  })

  it('lists nothing while the cutoff is unread, and its retry reads the cutoff again', () => {
    const failed = { ...answer, cutoff: null, cutoffFailed: true } as unknown as Answer
    render(<AnswerRecords query={queryOf({ tip: 'directe' })} answer={failed} />)
    expect(screen.getByText(/Lista nu s-a putut citi acum/u)).toBeTruthy()
    expect(screen.queryAllByRole('row')).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: /Încearcă din nou/u }))
    expect(records.retry).toHaveBeenCalledTimes(1)
  })

  it('orders frameworks by date only and shows no ceiling as a value', () => {
    render(<AnswerRecords query={queryOf({ tip: 'acorduri' })} answer={answer} />)
    expect(last()).toMatchObject({ sort: 'date_desc' })
    expect(screen.queryByText(/100/u)).toBeNull()
  })
})
