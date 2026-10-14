import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Outlet, RouterProvider, createMemoryHistory, createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { withDefaultExcludes } from '@/lib/filterUtils'
import { SeriesSchema, type Chart } from '@/schemas/charts'
import { createDefaultChart } from '@/schemas/constants'
import { getChartsStore } from '../../chartsStore'
import { useChartStore } from '../../hooks/useChartStore'
import { chartUrlStateSchema } from '../../page-schema'
import { ChartInfoCard } from './ChartInfoCard'
import { YearRangeSlider } from './YearRangeSlider'

/**
 * The chart title on the real router and the real chart store (CQA-11): it is
 * committed on every change, as the description is, so a title typed just
 * before leaving the editor — for the overview or a series — is already in the
 * chart, its destination and other search intact; no delayed write is left to
 * land on the next chart; undo and an outside title still reach the input.
 */

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverMock as unknown as typeof ResizeObserver

const SERIES = SeriesSchema.parse({
  id: 'series-1',
  type: 'line-items-aggregated-yearly',
  enabled: true,
  label: 'Educație',
  filter: withDefaultExcludes({ account_category: 'ch', report_type: 'Executie bugetara agregata la nivel de ordonator principal', normalization: 'total' }),
  config: { showDataLabels: false, color: '#123456' },
})

const chartOf = (id: string, title: string): Chart => ({ ...createDefaultChart(), id, title, description: 'Descrierea inițială', series: [SERIES] }) as Chart

/** The editor as the chart page composes it: the metadata card only in the config view, unmounted when the view changes. */
function Editor() {
  const { chart, view, seriesId, updateChart, goToOverview, goToSeriesConfig, addSeries, undo, redo } = useChartStore()
  return (
    <div>
      {view === 'config' ? <ChartInfoCard chart={chart} onUpdateChart={updateChart} /> : <p data-testid="view">{`${view}:${seriesId ?? ''}`}</p>}
      <button type="button" onClick={goToOverview}>overview</button>
      <button type="button" onClick={() => goToSeriesConfig(SERIES.id)}>series</button>
      <button type="button" onClick={addSeries}>add series</button>
      <button type="button" onClick={undo}>undo</button>
      <button type="button" onClick={redo}>redo</button>
    </div>
  )
}

async function openEditor(chart: Chart) {
  const root = createRootRoute({ component: Outlet })
  const home = createRoute({ getParentRoute: () => root, path: '/', component: () => <p>acasă</p> })
  const charts = createRoute({ getParentRoute: () => root, path: 'charts/$chartId', validateSearch: chartUrlStateSchema, component: Editor })
  const router = createRouter({ routeTree: root.addChildren([home, charts]), history: createMemoryHistory({ initialEntries: ['/'] }) })
  render(<RouterProvider router={router} />)
  await screen.findByText('acasă')
  // As the route's `onEnter` does: the chart is in the saved list before it is edited.
  getChartsStore().saveChartToLocalStorage(chart)
  await act(() => router.navigate({ to: '/charts/$chartId', params: { chartId: chart.id }, search: { chart, view: 'config' } }))
  await screen.findByTestId('chart-title-input')
  return router
}

type ChartRouter = Awaited<ReturnType<typeof openEditor>>
const searchOf = (router: ChartRouter) => router.state.location.search as { chart: Chart; view: string; seriesId?: string }
const stored = (id: string) => getChartsStore().loadSavedCharts().find((chart) => chart.id === id)
const typeTitle = (...values: string[]) => {
  const input = screen.getByTestId('chart-title-input')
  for (const value of values) fireEvent.change(input, { target: { value } })
}

beforeEach(() => localStorage.clear())
afterEach(() => localStorage.clear())

describe('ChartInfoCard on the chart router', () => {
  it('keeps a title typed just before opening the overview, with the destination view', async () => {
    const router = await openEditor(chartOf('chart-a', 'Vechi'))
    // A burst of typing, then the overview at once: well under the old 600 ms delay.
    typeTitle('B', 'Bu', 'Buget 2024')
    fireEvent.click(screen.getByText('overview'))
    await waitFor(() => expect(screen.getByTestId('view')).toHaveTextContent('overview:'))
    expect(searchOf(router).chart.title).toBe('Buget 2024')
    expect(searchOf(router).view).toBe('overview')
    // Only the title moved: series, description and config are the chart's own.
    expect(searchOf(router).chart.series).toEqual([SERIES])
    expect(searchOf(router).chart.description).toBe('Descrierea inițială')
    expect(stored('chart-a')?.title).toBe('Buget 2024')
  })

  it('keeps a title typed just before opening a series or adding one, with the series in the address', async () => {
    const router = await openEditor(chartOf('chart-a', 'Vechi'))
    typeTitle('Sănătate')
    fireEvent.click(screen.getByText('series'))
    await waitFor(() => expect(screen.getByTestId('view')).toHaveTextContent(`series-config:${SERIES.id}`))
    expect(searchOf(router)).toMatchObject({ view: 'series-config', seriesId: SERIES.id, chart: { title: 'Sănătate', series: [SERIES] } })

    // Back in the editor: a new title, then „add series" at once (a chart update chained with a navigation).
    await act(() => router.navigate({ to: '/charts/$chartId', params: { chartId: 'chart-a' }, search: (prev) => ({ ...prev, view: 'config' }) }))
    typeTitle('Sănătate și educație')
    fireEvent.click(screen.getByText('add series'))
    await waitFor(() => expect(screen.getByTestId('view')).toHaveTextContent(/^series-config:/u))
    const { chart, seriesId } = searchOf(router)
    expect(chart.title).toBe('Sănătate și educație')
    expect(chart.series).toHaveLength(2)
    expect(chart.series[0]).toEqual(SERIES)
    expect(seriesId).toBe(chart.series[1]?.id)
  })

  it('never writes chart A’s title into chart B, however soon B opens', async () => {
    const router = await openEditor(chartOf('chart-a', 'Titlul A'))
    getChartsStore().saveChartToLocalStorage(chartOf('chart-b', 'Titlul B'))
    typeTitle('Titlul A nou')
    await act(() => router.navigate({ to: '/charts/$chartId', params: { chartId: 'chart-b' }, search: { chart: chartOf('chart-b', 'Titlul B'), view: 'overview' } }))
    await waitFor(() => expect(screen.getByTestId('view')).toHaveTextContent('overview:'))
    // Past the old delay: nothing was left pending to land on B.
    await act(() => new Promise((done) => setTimeout(done, 700)))
    expect(searchOf(router).chart).toMatchObject({ id: 'chart-b', title: 'Titlul B' })
    expect(stored('chart-b')?.title).toBe('Titlul B')
    expect(stored('chart-a')?.title).toBe('Titlul A nou')
  })

  it('shows an undone or redone title in the input, the series untouched, and keeps the description committing', async () => {
    const router = await openEditor(chartOf('chart-a', 'Vechi'))
    typeTitle('Nou')
    await waitFor(() => expect(searchOf(router).chart.title).toBe('Nou'))
    fireEvent.click(screen.getByText('undo'))
    await waitFor(() => expect(screen.getByTestId('chart-title-input')).toHaveValue('Vechi'))
    expect(searchOf(router).chart.series).toEqual([SERIES])
    fireEvent.click(screen.getByText('redo'))
    await waitFor(() => expect(screen.getByTestId('chart-title-input')).toHaveValue('Nou'))

    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Sursa: execuția bugetară' } })
    await waitFor(() => expect(searchOf(router).chart.description).toBe('Sursa: execuția bugetară'))
    expect(searchOf(router).chart.title).toBe('Nou')
  })

  it('keeps the title field’s identity: id, test id and its label', async () => {
    await openEditor(chartOf('chart-a', 'Vechi'))
    const input = screen.getByTestId('chart-title-input')
    expect(input).toHaveAttribute('id', 'chart-title')
    expect(screen.getByLabelText(/Chart Title/u)).toBe(input)
  })
})

describe('the chart editor’s words (CQA-12)', () => {
  const catalog = (locale: 'en' | 'ro') => readFileSync(resolve(process.cwd(), `src/locales/${locale}/messages.po`), 'utf8')
  const msgstr = (locale: 'en' | 'ro', msgid: string) => {
    const block = catalog(locale).split('\n\n').find((entry) => entry.split('\n').includes(`msgid "${msgid}"`))
    return block?.match(/^msgstr "(.*)"$/mu)?.[1]
  }

  it('translates every label the editor used to hard-code, in English and Romanian', () => {
    expect(['Description', 'Chart', 'Chart Config', 'Untitled Chart', 'Year Range'].map((id) => [msgstr('en', id), msgstr('ro', id)])).toEqual([
      ['Description', 'Descriere'],
      ['Chart', 'Grafic'],
      ['Chart Config', 'Configurare'],
      ['Untitled Chart', 'Grafic fără titlu'],
      ['Year Range', 'Interval de ani'],
    ])
  })

  it('renders the year range label through the catalog, the range itself unchanged', () => {
    render(<YearRangeSlider value={[2016, 2024]} onChange={() => {}} min={2010} max={2025} />)
    expect(screen.getByText('Year Range')).toBeInTheDocument()
    expect(screen.getByText('2016 - 2024')).toBeInTheDocument()
  })
})
