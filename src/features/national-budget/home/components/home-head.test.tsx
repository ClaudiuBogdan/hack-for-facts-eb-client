import { describe, expect, it, vi } from 'vitest'

import { render, screen } from '@/test/test-utils'
import type { BudgetNationalCatalog } from '@/schemas/national-budget-api'
import { TOTAL_ITEMS, viewOfYear, type GdpRead, type GdpStatus } from '../lib/home-data'
import { BalanceBars, FiguresBand } from './home-head'

/** The catalog the page reads: bulletins to August 2026. */
const catalog = {
  snapshots: { approved: 'a1', execution: 'e1' },
  execution: { coverage: { firstMonth: '2006-01', lastMonth: '2026-08', missingMonths: [] }, seriesItems: [] },
  approved: { editions: [], totals: [] },
} as unknown as BudgetNationalCatalog

const reads = vi.hoisted(() => ({ gdp: null as unknown }))
vi.mock('@/features/national-budget/analytics/hooks/use-national-budget-analytics', async (original) => ({
  ...(await original<object>()),
  useNationalCatalog: () => catalog,
}))
vi.mock('../hooks/use-home-data', async (original) => ({
  ...(await original<object>()),
  // The year's three totals (2025: revenue, spending and the deficit, in lei).
  useYearLines: () => {
    const cell = (exact: string) => ({ value: Number(exact), exact, reason: null, start: '', end: '' })
    const now: Record<string, ReturnType<typeof cell>> = {
      [TOTAL_ITEMS.revenue]: cell('624000000000'),
      [TOTAL_ITEMS.spending]: cell('776000000000'),
      [TOTAL_ITEMS.balance]: cell('-152000000000'),
    }
    return { now: (itemId: string) => now[itemId] ?? null, before: () => null }
  },
  useGdp: () => reads.gdp,
}))

/** A GDP read as the selector returns it: each figure with how it stands. */
const gdpRead = (shares: Readonly<Record<string, [string | null, GdpStatus]>>, gdp: [string | null, GdpStatus]): GdpRead => ({
  share: (itemId) => shares[itemId]?.[0] ?? null,
  shareStatus: (itemId) => shares[itemId]?.[1] ?? 'absent',
  gdp: gdp[0],
  gdpStatus: gdp[1],
})

const band = (year: number, gdp: GdpRead) => {
  reads.gdp = gdp
  // Lingui is the suite's mock (src/test/mocks): the source text, interpolated.
  return render(<FiguresBand view={viewOfYear(catalog, year)} />)
}

describe('the figures band says why a GDP figure is not shown', () => {
  it('shows the printed shares and the year’s GDP when each is printed once', async () => {
    band(
      2025,
      gdpRead(
        { [TOTAL_ITEMS.spending]: ['0.3', 'available'], [TOTAL_ITEMS.balance]: ['-0.0865', 'available'] },
        ['1916404900000', 'available'],
      ),
    )
    expect(await screen.findByText(/PIB 2025:/u)).toBeInTheDocument()
    expect(screen.getByText(/8,7% din PIB|8\.7% din PIB/u)).toBeInTheDocument()
    expect(screen.queryByText(/nu sunt (afișate|disponibile)/u)).not.toBeInTheDocument()
  })

  it('says printed values that differ, not „unavailable", and keeps the other figures', async () => {
    band(
      2025,
      gdpRead(
        { [TOTAL_ITEMS.spending]: [null, 'conflicting'], [TOTAL_ITEMS.balance]: [null, 'conflicting'] },
        [null, 'conflicting'],
      ),
    )
    expect(await screen.findByText('Ponderile în PIB pentru 2025 nu sunt afișate: valorile tipărite diferă.')).toBeInTheDocument()
    expect(screen.getByText('Ponderea în PIB nu e afișată: valorile tipărite diferă')).toBeInTheDocument()
    expect(screen.queryByText(/nu sunt disponibile/u)).not.toBeInTheDocument()
    // The deficit itself is still shown.
    expect(screen.getByText(/Deficit, 2025/u)).toBeInTheDocument()
  })

  it('says a GDP printed in an unexpected unit, apart from the shares it does show', async () => {
    band(2025, gdpRead({ [TOTAL_ITEMS.spending]: ['0.3', 'available'] }, [null, 'unqualified']))
    expect(await screen.findByText('PIB 2025 nu e afișat: unitatea tipărită nu e cea așteptată')).toBeInTheDocument()
  })

  it('keeps „unavailable" for a year whose data has no shares at all', async () => {
    band(2025, gdpRead({}, [null, 'absent']))
    expect(await screen.findByText('Ponderile în PIB pentru 2025 nu sunt disponibile în datele noastre.')).toBeInTheDocument()
    expect(screen.queryByText(/nu sunt afișate|nu e afișat/u)).not.toBeInTheDocument()
  })

  it('keeps the partial year’s note: shares of the GDP estimated for the whole year', async () => {
    band(2026, gdpRead({ [TOTAL_ITEMS.spending]: ['0.257', 'available'], [TOTAL_ITEMS.balance]: ['-0.0289', 'available'] }, ['2056000000000', 'available']))
    expect((await screen.findAllByText(/din PIB-ul estimat pe tot anul/u)).length).toBeGreaterThan(0)
    expect(screen.queryByText(/PIB 2026:/u)).not.toBeInTheDocument()
  })

  it('says it beside the balance too, and keeps the deficit', () => {
    reads.gdp = gdpRead({ [TOTAL_ITEMS.balance]: [null, 'conflicting'] }, [null, 'absent'])
    render(<BalanceBars view={viewOfYear(catalog, 2025)} />)
    expect(screen.getByText('; ponderea în PIB nu e afișată: valorile tipărite diferă')).toBeInTheDocument()
    expect(screen.getByText(/^Deficit:/u)).toBeInTheDocument()
  })
})
