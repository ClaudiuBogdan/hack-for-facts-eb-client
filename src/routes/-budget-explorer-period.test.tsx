import { act, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchCompleteAggregatedLineItems } from '@/lib/api/entity-analytics'
import type { AnalyticsFilterType } from '@/schemas/charts'
import type { ReportPeriodInput } from '@/schemas/reporting'

/**
 * `/budget-explorer` reads one effective reporting period: the period control,
 * the subtitle, every sector read and every line-item drill-down show the same
 * one. An explicit `filter.report_period` wins; a legacy `year` names its year
 * only when the link has no period, and is dropped once the reader changes anything.
 */

/** The period a read asked for, as the amount it answers (2024-Q2 → 20242): shown data traces to its read, cached or not. */
const amountOf = (period: ReportPeriodInput) => Number(String(period.selection.dates?.[0] ?? period.selection.interval?.start ?? '').replace(/\D/g, ''))
vi.mock('@/lib/api/entity-analytics', () => ({
  fetchCompleteAggregatedLineItems: vi.fn(async (filter: AnalyticsFilterType) => ({
    nodes: [{ fn_c: '65.01', fn_n: 'Învățământ', ec_c: '10.01', ec_n: 'Salarii', amount: amountOf(filter.report_period as ReportPeriodInput), count: 1 }],
  })),
}))
vi.mock('@/features/national-budget/national-budget-api', () => ({
  fetchBudgetSectors: async () => [{ sector_id: '1', sector_description: 'Buget local' }],
  fetchFundingSources: async () => [],
}))
// The drawing is not under test: the data it is handed is, and the section's own drill-down link.
vi.mock('@/components/budget-explorer/BudgetTreemap', () => ({
  BudgetTreemap: ({ data }: { data: unknown }) => <div data-testid="treemap-data">{JSON.stringify(data)}</div>,
}))
vi.mock('@/components/ui/FloatingQuickNav', () => ({ FloatingQuickNav: () => null }))
// The control's popover opened, and a picker that hands the header the period a reader chose.
vi.mock('@/components/ui/ResponsivePopover', () => ({
  ResponsivePopover: ({ trigger, content }: { trigger: ReactNode; content: ReactNode }) => <>{trigger}{content}</>,
}))
const PICKS: Record<string, ReportPeriodInput> = {
  '2024': { type: 'YEAR', selection: { dates: ['2024'] } } as ReportPeriodInput,
  '2025': { type: 'YEAR', selection: { dates: ['2025'] } } as ReportPeriodInput,
  '2024-Q2': { type: 'QUARTER', selection: { dates: ['2024-Q2'] } } as ReportPeriodInput,
  '2024-03': { type: 'MONTH', selection: { interval: { start: '2024-03', end: '2024-03' } } } as ReportPeriodInput,
}
vi.mock('@/components/filters/period-filter/PeriodFilter', () => ({
  PeriodFilter: ({ onChange }: { onChange: (period: ReportPeriodInput) => void }) => (
    <div>{Object.entries(PICKS).map(([label, period]) => <button key={label} type="button" onClick={() => onChange(period)}>pick {label}</button>)}</div>
  ),
}))

async function openExplorer(at: string) {
  const { Route } = await import('./budget-explorer.lazy')
  const page = (Route as unknown as { options: { component: () => ReactNode } }).options.component
  const root = createRootRoute({ component: Outlet })
  const explorer = createRoute({ getParentRoute: () => root, path: 'budget-explorer', component: page })
  const router = createRouter({ routeTree: root.addChildren([explorer]), history: createMemoryHistory({ initialEntries: [at] }) })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>)
  await screen.findByRole('button', { name: 'Reporting period' })
  return router
}

const at = (search: Record<string, unknown>) =>
  '/budget-explorer?' + new URLSearchParams(Object.entries(search).map(([key, value]) => [key, typeof value === 'string' ? value : JSON.stringify(value)])).toString()
const yearPeriod = (year: string) => ({ type: 'YEAR', selection: { dates: [year] } })
/** The sector reads already accounted for: each check reads only those the last change asked. */
let since = 0

/** What the page shows and uses, once the reads for it have been asked. */
async function settled(router: Awaited<ReturnType<typeof openExplorer>>, expected: { period: unknown; control: string; subtitle: RegExp }) {
  const reads = vi.mocked(fetchCompleteAggregatedLineItems)
  // The data every section shows was read for the period shown (a period seen before comes from the cache).
  const amount = amountOf(expected.period as ReportPeriodInput)
  await waitFor(() => {
    const shown = screen.getAllByTestId('treemap-data').map((node) => (JSON.parse(node.textContent ?? '[]') as { value: number }[]).map((item) => item.value))
    expect(shown.length).toBeGreaterThanOrEqual(2)
    for (const values of shown) expect(values).toEqual([amount])
  })
  // Every sector read since the last change asks the period shown, and nothing else.
  expect(reads.mock.calls.slice(since).map(([filter]) => (filter as AnalyticsFilterType).report_period)).toEqual(
    reads.mock.calls.slice(since).map(() => expected.period))
  since = reads.mock.calls.length
  expect(within(screen.getByRole('button', { name: 'Reporting period' })).getByText(expected.control)).toBeInTheDocument()
  expect(screen.getByText(expected.subtitle)).toBeInTheDocument()
  const links = await screen.findAllByRole('link', { name: /Analyze line items/ })
  expect(links.length).toBeGreaterThanOrEqual(2)
  for (const link of links) {
    const filter = JSON.parse(new URL(link.getAttribute('href')!, 'https://t.eu').searchParams.get('filter')!)
    expect(filter.report_period).toEqual(expected.period)
  }
  return router.state.location.search as Record<string, unknown>
}

describe('/budget-explorer: one effective reporting period', () => {
  afterEach(() => {
    vi.mocked(fetchCompleteAggregatedLineItems).mockClear()
    since = 0
  })

  it('reads a legacy year link as that year everywhere, keeping its other choices', async () => {
    const router = await openExplorer(at({ view: 'treemap', primary: 'ec', depth: 'subchapter', year: 2023 }))
    const search = await settled(router, { period: yearPeriod('2023'), control: '2023', subtitle: /Budget Distribution\s+2023/ })
    expect(search).toMatchObject({ view: 'treemap', primary: 'ec', depth: 'subchapter', year: 2023 })
    expect(screen.getByRole('radio', { name: 'Subchapter' })).toBeChecked()
  })

  it('lets an explicit period outvote a legacy year in the same link', async () => {
    const router = await openExplorer(at({ view: 'treemap', year: 2025, filter: { report_period: yearPeriod('2024'), account_category: 'ch' } }))
    await settled(router, { period: yearPeriod('2024'), control: '2024', subtitle: /Budget Distribution\s+2024/ })
  })

  it('moves the control, the reads and the drill-downs together from 2025 to 2024 and back, dropping the legacy year', async () => {
    const router = await openExplorer(at({ view: 'treemap', year: 2025, transferFilter: 'no-transfers' }))
    await settled(router, { period: yearPeriod('2025'), control: '2025', subtitle: /Budget Distribution\s+2025/ })

    await act(async () => screen.getByRole('button', { name: 'pick 2024' }).click())
    let search = await settled(router, { period: yearPeriod('2024'), control: '2024', subtitle: /Budget Distribution\s+2024/ })
    expect(search.year).toBeUndefined()
    expect(search).toMatchObject({ view: 'treemap', transferFilter: 'no-transfers', filter: { report_period: yearPeriod('2024'), account_category: 'ch' } })

    await act(async () => screen.getByRole('button', { name: 'pick 2025' }).click())
    search = await settled(router, { period: yearPeriod('2025'), control: '2025', subtitle: /Budget Distribution\s+2025/ })
    expect(search.year).toBeUndefined()
    expect(search).toMatchObject({ transferFilter: 'no-transfers', filter: { report_period: yearPeriod('2025') } })
  })

  it('keeps a quarter and a month chosen over a legacy year link', async () => {
    const router = await openExplorer(at({ view: 'treemap', year: 2025 }))
    await settled(router, { period: yearPeriod('2025'), control: '2025', subtitle: /Budget Distribution\s+2025/ })

    await act(async () => screen.getByRole('button', { name: 'pick 2024-Q2' }).click())
    const quarter = PICKS['2024-Q2']
    expect((await settled(router, { period: quarter, control: '2024-Q2', subtitle: /Budget Distribution\s+\S/ })).year).toBeUndefined()

    await act(async () => screen.getByRole('button', { name: 'pick 2024-03' }).click())
    const month = PICKS['2024-03']
    expect((await settled(router, { period: month, control: '2024-03', subtitle: /Budget Distribution\s+\S/ })).filter).toMatchObject({ report_period: month })
  })

  it('keeps the other filters when the period changes, and the legacy year when nothing changes', async () => {
    const router = await openExplorer(at({ view: 'treemap', year: 2024, filter: { account_category: 'vn', normalization: 'per_capita' } }))
    let search = await settled(router, { period: yearPeriod('2024'), control: '2024', subtitle: /Budget Distribution\s+2024/ })
    expect(search.year).toBe(2024)
    await act(async () => screen.getByRole('button', { name: 'pick 2025' }).click())
    search = await settled(router, { period: yearPeriod('2025'), control: '2025', subtitle: /Budget Distribution\s+2025/ })
    expect(search.filter).toMatchObject({ account_category: 'vn', normalization: 'per_capita', report_period: yearPeriod('2025') })
    const reads = vi.mocked(fetchCompleteAggregatedLineItems).mock.calls
    expect(reads[reads.length - 1]?.[0]).toMatchObject({ account_category: 'vn', normalization: 'per_capita' })
  })
})
