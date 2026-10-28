import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { createTestQueryClient } from '@/test/test-utils'
import type { BudgetNationalCatalog } from '@/schemas/national-budget-api'
import { viewOfYear, yearViews } from '../lib/home-data'
import { useUnfinishedYears } from './use-home-data'
import { needsYearCheck, shownYearOf, type HomeYear } from './use-home-year'

/** The catalog the page reads: bulletins to August 2026, so 2025 is the default year and 2026 the year in progress. */
const catalog = {
  snapshots: { approved: 'a1', execution: 'e1' },
  execution: { coverage: { firstMonth: '2006-01', lastMonth: '2026-08', missingMonths: [] }, seriesItems: [] },
  approved: { editions: [], totals: [] },
} as unknown as BudgetNationalCatalog

vi.mock('@/features/national-budget/analytics/hooks/use-national-budget-analytics', async (original) => ({
  ...(await original<object>()),
  useNationalCatalog: () => catalog,
}))

const asked = (year: number | undefined): HomeYear => ({ view: viewOfYear(catalog, year), views: yearViews(catalog), setYear: () => undefined })

describe('the page waits for the unfinished years only when the address could ask for one', () => {
  it('does not wait on the bare page, which shows the default year', () => {
    expect(needsYearCheck(viewOfYear(catalog, undefined), catalog)).toBe(false)
  })

  it('does not wait for the default year asked by name, nor for the year in progress', () => {
    expect(needsYearCheck(viewOfYear(catalog, 2025), catalog)).toBe(false)
    expect(needsYearCheck(viewOfYear(catalog, 2026), catalog)).toBe(false)
  })

  it('waits for an earlier full year', () => {
    expect(needsYearCheck(viewOfYear(catalog, 2019), catalog)).toBe(true)
  })

  it('does not wait for a year the bulletins never cover: the page opens on the default year', () => {
    expect(needsYearCheck(viewOfYear(catalog, 2001), catalog)).toBe(false)
  })
})

describe('the year shown', () => {
  it('is the asked year when the bulletins finish it', () => {
    const shown = shownYearOf(catalog, asked(2019), new Map([[2009, 'missing_endpoint_release']]))
    expect(shown.view.year).toBe(2019)
    expect(shown.notice).toBeNull()
  })

  it('is the default year, said with the reason, when the bulletins do not finish the asked one', () => {
    const shown = shownYearOf(catalog, asked(2009), new Map([[2009, 'missing_endpoint_release']]))
    expect(shown.view.year).toBe(2025)
    expect(shown.unavailable.has(2009)).toBe(true)
    // Lingui is the suite's mock (src/test/mocks): the source text, interpolated.
    expect(shown.notice).toBe('Pentru 2009 buletinele nu au anul întreg (lipsește buletinul lunii); arătăm 2025.')
  })
})

describe('the unfinished years, read or not', () => {
  const withClient = (client = createTestQueryClient()) => {
    const wrapper = ({ children }: { readonly children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
    return { client, wrapper }
  }

  it('holds none back and reads nothing when the page does not need them', () => {
    const { client, wrapper } = withClient()
    const { result } = renderHook(() => useUnfinishedYears(yearViews(catalog), false), { wrapper })
    expect(result.current.size).toBe(0)
    expect(client.getQueryCache().getAll()).toHaveLength(0)
  })

  it('lists the full years the read answers without a value', () => {
    const { client, wrapper } = withClient()
    client.setQueryData(['national-budget-home', 'unfinished-years', 'e1'], [['2009', 'missing_endpoint_release']])
    const { result } = renderHook(() => useUnfinishedYears(yearViews(catalog)), { wrapper })
    expect([...result.current]).toEqual([[2009, 'missing_endpoint_release']])
  })
})
