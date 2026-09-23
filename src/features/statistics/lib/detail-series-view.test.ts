import { insSourceDescriptorSchema } from '@/lib/ins/source-contract'
import { describe, expect, it } from 'vitest'
import type { InsObservation } from '@/schemas/ins'
import type { StatisticsDatasetDetailSearch, StatisticsDatasetSeries } from '@/schemas/statistics'
import { detailDataset, detailLatest, detailObservation } from '../test/detail-fixtures'
import { deriveDetailSeriesView } from './detail-series-view'
import { resolveDetailSelection } from './source-selection'

const dataset = detailDataset()
const descriptor = insSourceDescriptorSchema.parse(dataset)

function seriesOf(
  observations: readonly InsObservation[],
  overrides: Partial<StatisticsDatasetSeries> = {},
): StatisticsDatasetSeries {
  return {
    nativeContract: 'native-v1',
    readMode: 'complete',
    sourceDescriptor: descriptor,
    observations,
    totalCount: observations.length,
    ...overrides,
  }
}

function view(params: {
  readonly search?: StatisticsDatasetDetailSearch
  readonly rows?: readonly InsObservation[]
  readonly series?: StatisticsDatasetSeries
  readonly latest?: ReturnType<typeof detailLatest> | null
  readonly answered?: boolean
}) {
  const search = params.search ?? {}
  const latest = params.latest === undefined ? detailLatest() : params.latest
  const selection = resolveDetailSelection({ search, dataset, latest })
  return deriveDetailSeriesView({
    series: params.series ?? seriesOf(params.rows ?? [2023, 2024, 2025].map((year) => detailObservation(year))),
    scope: selection.scope,
    canDerive: selection.canDerive,
    search,
    answered: params.answered ?? true,
  })
}

describe('deriveDetailSeriesView', () => {
  it('shows the whole series, unpinned, with no window in the address', () => {
    const result = view({})
    expect(result.observedSpan).toEqual({ from: 2023, to: 2025 })
    expect(result.yearWindow).toEqual({ from: 2023, to: 2025 })
    expect(result.yearWindowPinned).toBe(false)
    expect(result.yearWindowOutside).toBeNull()
    expect(result.windowedRows).toHaveLength(3)
    expect(result.chartSeries?.points).toHaveLength(3)
    expect(result.latestSourceRow?.time_period.year).toBe(2025)
    expect(result.emptyReason).toBeNull()
    expect(result.completeSourceSelection).toBe(true)
  })

  it('cuts a window to the observed span rather than emptying the chart', () => {
    const result = view({ search: { din: 1900, pana: 2024 } })
    expect(result.yearWindow).toEqual({ from: 2023, to: 2024 })
    expect(result.yearWindowPinned).toBe(true)
    expect(result.windowedRows.map((row) => row.time_period.year)).toEqual([2023, 2024])
    expect(result.emptyReason).toBeNull()
  })

  it('shows the whole span, and says which years were asked for, when the window lies past the series', () => {
    const result = view({ search: { din: 2030, pana: 2035 } })
    expect(result.yearWindow).toEqual({ from: 2023, to: 2025 })
    expect(result.yearWindowPinned).toBe(false)
    expect(result.yearWindowOutside).toEqual({ from: 2030, to: 2035 })
    expect(result.windowedRows).toHaveLength(3)
    expect(result.emptyReason).toBeNull()
  })

  it('treats a lone start past the series as outside it, not as an end before it', () => {
    const result = view({ search: { din: 2030 } })
    expect(result.yearWindow).toEqual({ from: 2023, to: 2025 })
    expect(result.yearWindowOutside).toEqual({ from: 2030, to: 2030 })
    expect(result.yearWindowPinned).toBe(false)
    const early = view({ search: { pana: 1900 } })
    expect(early.yearWindowOutside).toEqual({ from: 1900, to: 1900 })
  })

  it('puts reversed bounds in order', () => {
    const result = view({ search: { din: 2025, pana: 2024 } })
    expect(result.yearWindow).toEqual({ from: 2024, to: 2025 })
    expect(result.yearWindowPinned).toBe(true)
  })

  it('names a window that falls into a gap of the series', () => {
    const result = view({
      rows: [detailObservation(2020), detailObservation(2025)],
      search: { din: 2022, pana: 2023 },
    })
    expect(result.yearWindow).toEqual({ from: 2022, to: 2023 })
    expect(result.windowedRows).toHaveLength(0)
    expect(result.chartSeries).toBeNull()
    expect(result.emptyReason).toBe('window')
  })

  it('names rows that exist at another cadence only', () => {
    const result = view({ search: { frecventa: 'MONTHLY' } })
    expect(result.periodicityRows).toHaveLength(0)
    expect(result.emptyReason).toBe('cadence')
  })

  it('names an empty read by what narrowed it: the territory, the selection, or nothing', () => {
    expect(view({ rows: [], latest: null, search: { teritoriu: 'cod:RO11' } }).emptyReason).toBe('territory')
    expect(view({ rows: [], latest: null, search: { clasificari: ['D1:107'] } }).emptyReason).toBe('selection')
    expect(view({ rows: [], latest: null, search: { unitate: '0' } }).emptyReason).toBe('selection')
    expect(view({ rows: [], latest: null }).emptyReason).toBe('none')
  })

  it('reports no empty reason before the read has answered', () => {
    expect(view({ rows: [], answered: false }).emptyReason).toBeNull()
  })

  it('keeps the latest published cell as latest even when its value is unavailable', () => {
    const result = view({
      rows: [detailObservation(2024), detailObservation(2025, { value: null, value_status: 'c' })],
    })
    expect(result.latestSourceRow?.time_period.year).toBe(2025)
    expect(result.latestSourceRow?.value).toBeNull()
    // The facts skip the unreadable cell; the figure says it is absent instead.
    expect(result.windowStats.latest?.period).toBe('2024')
  })

  it('draws nothing from an inspection page that could not resolve the cell, but keeps its rows', () => {
    const result = view({
      latest: null,
      search: { clasificari: ['D0:931'], unitate: '0' },
      series: seriesOf([detailObservation(2025)], { readMode: 'inspection', inspectionTruncated: true }),
    })
    expect(result.sourceUnavailable).toBe(true)
    expect(result.chartSeries).toBeNull()
    expect(result.latestSourceRow).toBeNull()
    expect(result.exactRows).toHaveLength(1)
    expect(result.completeSourceSelection).toBe(false)
    expect(result.emptyReason).toBeNull()
  })
})
