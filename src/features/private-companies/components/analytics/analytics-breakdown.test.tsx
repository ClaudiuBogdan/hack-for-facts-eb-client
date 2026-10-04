import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CompanyAnalysisBreakdown, CompanyAnalysisBucket } from '@/schemas/company-analytics'
import { resolveQuestion } from '../../api/company-analytics-plan'
import { aggregate, breakdownFixture, releaseFixture } from '../../api/company-analytics.fixture'
import { DEFAULT_STATE } from '../../lib/company-analytics-url'
import { AnalyticsBreakdown } from './analytics-breakdown'

/**
 * Shares in the breakdown: a row's share of the total reads as one only when
 * every row the table shows — the groups, „other" and the unknown — is a part
 * of a positive total. One negative row anywhere (a loss among profits) and
 * the shares are withheld for the whole table; the amounts stay. A zero row
 * is a part like any other.
 */

const answer = vi.hoisted(() => ({ data: undefined as CompanyAnalysisBreakdown | undefined }))

vi.mock('../../hooks/use-company-analytics', () => ({
  useCompanyAnalysisBreakdown: () => ({ data: answer.data, isError: false, isFetching: false, error: null }),
}))

const state = { ...DEFAULT_STATE, metric: 'NET_RESULT' as const, panel: 'defalcare' as const }

function bucket(kind: CompanyAnalysisBucket['kind'], key: string | null, sum: string | null, extra: Partial<CompanyAnalysisBucket> = {}): CompanyAnalysisBucket {
  return { kind, key, label: null, labelSource: null, basis: null, caen: null, groups: 1, companies: '10', filers: '5', metric: aggregate('NET_RESULT', sum, sum === null ? '0' : '5'), ...extra }
}

function netResult(other: string | null, unknown: string | null, total: string): CompanyAnalysisBreakdown {
  return breakdownFixture({
    metric: 'NET_RESULT',
    groupCount: 2,
    topN: 1,
    groups: [bucket('GROUP', 'CJ', '100.00', { label: 'Cluj' })],
    other: bucket('OTHER', null, other),
    unknown: bucket('UNKNOWN', null, unknown, { groups: 0 }),
    totals: bucket('TOTAL', null, total, { groups: 2, companies: '20', filers: '10' }),
  })
}

function renderBreakdown(data: CompanyAnalysisBreakdown) {
  answer.data = data
  render(<AnalyticsBreakdown state={state} question={resolveQuestion(state, releaseFixture())} onChange={() => undefined} />)
}

const percents = () => screen.queryAllByText(/%$/u)

beforeEach(() => {
  answer.data = undefined
})

describe('AnalyticsBreakdown shares', () => {
  it('shows the shares of a total every row is a positive part of', () => {
    renderBreakdown(netResult('60.00', null, '160.00'))
    expect(screen.getByRole('columnheader', { name: 'Cota' })).toBeInTheDocument()
    expect(screen.getByText('62.5%')).toBeInTheDocument()
    expect(screen.getByText('37.5%')).toBeInTheDocument()
  })

  it('withholds every share when „other" is negative: +100 and −40 make 60, never 166.7% and −66.7%', () => {
    renderBreakdown(netResult('-40.00', null, '60.00'))
    expect(screen.queryByRole('columnheader', { name: 'Cota' })).not.toBeInTheDocument()
    expect(percents()).toEqual([])
    // The amounts stay.
    expect(screen.getAllByText(/[−-]40/u).length).toBeGreaterThan(0)
    expect(screen.getByText('Cluj')).toBeInTheDocument()
  })

  it('withholds every share when the unknown group is negative', () => {
    renderBreakdown(netResult(null, '-40.00', '60.00'))
    expect(screen.queryByRole('columnheader', { name: 'Cota' })).not.toBeInTheDocument()
    expect(percents()).toEqual([])
    expect(screen.getAllByText(/[−-]40/u).length).toBeGreaterThan(0)
  })

  it('counts a zero row as a part: the shares stay, the zero one included', () => {
    renderBreakdown(netResult('0.00', '0.00', '100.00'))
    expect(screen.getByRole('columnheader', { name: 'Cota' })).toBeInTheDocument()
    expect(screen.getByText('100.0%')).toBeInTheDocument()
    expect(screen.getAllByText('0.0%')).toHaveLength(2)
  })
})

describe('AnalyticsBreakdown — a consensus grouping (schema v2)', () => {
  const county = { ...DEFAULT_STATE, panel: 'defalcare' as const }

  it('shows a basis group by why, with its exact zero, draws no empty unknown slot, keeps the shares and says where the names come from', () => {
    answer.data = breakdownFixture()
    render(<AnalyticsBreakdown state={county} question={resolveQuestion(county, releaseFixture())} onChange={() => undefined} />)
    expect(screen.getByRole('button', { name: 'Fără județ comun — valori diferite în înscrieri' })).toBeInTheDocument()
    expect(screen.queryByText('Județ necunoscut')).not.toBeInTheDocument()
    expect(screen.queryByText('(multiple_values)')).not.toBeInTheDocument()
    // 700 + 200 + 0 + 100 of 1000: every shown row a non-negative part of a positive total.
    expect(screen.getByText('70.0%')).toBeInTheDocument()
    expect(screen.getByText('0.0%')).toBeInTheDocument()
    expect(screen.getByText(/Denumiri: nomenclatorul teritorial al platformei\./u)).toBeInTheDocument()
  })

  it('narrows a click on a basis group to exactly that group, by its key', () => {
    answer.data = breakdownFixture()
    const onChange = vi.fn()
    render(<AnalyticsBreakdown state={county} question={resolveQuestion(county, releaseFixture())} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Fără județ comun — valori diferite în înscrieri' }))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ scope: { county: { in: ['(multiple_values)'] } }, dimension: 'UAT' }))
  })
})
