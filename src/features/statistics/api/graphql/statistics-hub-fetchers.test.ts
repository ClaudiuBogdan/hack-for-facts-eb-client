import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/graphql/graphql-client', async (importActual) => ({
  ...(await importActual<typeof import('@/lib/graphql/graphql-client')>()),
  graphqlQuery: vi.fn(),
}))
import { GraphQLRequestError, graphqlQuery } from '@/lib/graphql/graphql-client'
import { HUB_SERIES_CAPTURED_AT, HUB_STATIC_SERIES, hubStaticSeries } from '../../lib/hub-national-series'
import { HUB_FIGURE_CODES } from '../../lib/landing-constants'
import { HUB_COUNTY_ONLY_SPECS, HUB_NATIONAL_SPECS, hubCountyResponse, hubTilesResponse } from '../../test/hub-fixtures'
import { hubUnitOf } from '../../lib/units'
import { fetchStatisticsHub } from './statistics-hub-fetchers'

const spec = (code: string) => {
  const found = [...HUB_NATIONAL_SPECS, ...HUB_COUNTY_ONLY_SPECS].find((entry) => entry.code === code)
  if (!found) throw new Error(code)
  return found
}

type Call = { readonly query: string; readonly variables: Record<string, unknown> | undefined }

/** Routes each operation to its fixture; county pages by dataset code. */
function answer(overrides: {
  readonly tiles?: unknown
  readonly counties?: Partial<Record<string, unknown>>
  readonly failCounty?: string
} = {}) {
  const calls: Call[] = []
  vi.mocked(graphqlQuery).mockImplementation(async (query: string, variables?: unknown) => {
    calls.push({ query, variables: variables as Record<string, unknown> | undefined })
    // Each national read answers for the codes it asked for, as the API does.
    if (query.includes('query InsNationalLatest') || query.includes('query InsCountyAnchors')) {
      const codes = (variables as { codes: readonly string[] }).codes
      const tiles = (overrides.tiles ?? hubTilesResponse()) as ReturnType<typeof hubTilesResponse>
      return { latest: tiles.latest.filter((entry) => codes.includes(entry.dataset.code)) }
    }
    if (query.includes('query InsObservations(')) {
      const code = String((variables as { datasetCode: string }).datasetCode)
      if (overrides.failCounty === code) throw new Error(`${code} down`)
      const fixture = overrides.counties?.[code]
      if (fixture) return fixture
      return hubCountyResponse(spec(code), [])
    }
    throw new Error(`Unexpected operation: ${query.slice(0, 60)}`)
  })
  return calls
}

describe('fetchStatisticsHub', () => {
  beforeEach(() => vi.resetAllMocks())

  it('reads the national cells and keys each indicator on the resolved unit and pins', async () => {
    const calls = answer()
    const hub = await fetchStatisticsHub()
    expect(hub.failures).toEqual([])
    expect(hub.indicators?.map((indicator) => indicator.code)).toEqual(HUB_NATIONAL_SPECS.map((entry) => entry.code))
    const population = hub.indicators?.find((indicator) => indicator.code === 'POP105A')
    expect(population).toMatchObject({
      value: 19043151,
      rawValue: '19043151',
      unit: 'persons',
      unitCode: '9685',
      period: '2025',
      periodicity: 'ANNUAL',
      pins: ['D0:1', 'D1:105', 'D2:108', 'D3:112'],
      hasGeography: true,
    })
    const rate = hub.indicators?.find((indicator) => indicator.code === 'SOM103B')
    expect(rate).toMatchObject({ value: 3.2, unit: 'percent', period: '2026-05', periodicity: 'MONTHLY' })
    // Only the indicators, the map's own anchors and the county layers: nothing about the catalog.
    const national = calls.filter((call) => !call.query.includes('query InsObservations('))
    expect(national.map((call) => call.query.match(/query (\w+)/)?.[1])).toEqual(['InsNationalLatest', 'InsCountyAnchors'])
    expect(national[1]?.variables?.codes).toEqual(['FOM106E', 'CON103H', 'POP215A', 'POP110A'])
  })

  it('accepts a matrix with no geography axis as national, and says so on the indicator', async () => {
    answer()
    const hub = await fetchStatisticsHub()
    expect(hub.failures).toEqual([])
    const inflation = hub.indicators?.find((indicator) => indicator.code === 'IPC102E')
    expect(inflation).toMatchObject({ value: 110.85, rawValue: '110.85', unit: 'percent', period: '2026-05', pins: ['D0:12668'], hasGeography: false })
    const earnings = hub.indicators?.find((indicator) => indicator.code === 'FOM106D')
    expect(earnings).toMatchObject({ value: 5914, unit: 'other', unitLabel: 'Lei RON', period: '2025-12', hasGeography: false })
  })

  it('refuses a national-only cell that names a territory', async () => {
    const tiles = hubTilesResponse()
    const inflation = tiles.latest.find((entry) => entry.dataset.code === 'IPC102E')
    if (inflation?.observation) {
      ;(inflation.observation as { territory: unknown }).territory = { code: 'CJ', siruta_code: null, level: 'NUTS3', name_ro: 'Cluj' }
    }
    answer({ tiles })
    const hub = await fetchStatisticsHub()
    expect(hub.indicators).toBeNull()
    expect(hub.failures).toContain('indicators')
  })

  it('serves the captured history and appends the live point only when it is a newer year of the same cell', async () => {
    answer({
      tiles: hubTilesResponse({
        FOM104D: { value: '5500000', period: '2026' },
        POP217A: { value: '99', period: '2026', members: ['1', '105', '112'] },
      }),
    })
    const hub = await fetchStatisticsHub()
    const employees = hub.indicators?.find((indicator) => indicator.code === 'FOM104D')
    const stored = hubStaticSeries('FOM104D')?.points ?? []
    expect(employees?.series).toHaveLength(stored.length + 1)
    expect(employees?.series[employees.series.length - 1]).toEqual({ period: '2026', value: 5500000 })
    // A different cell (males rather than the total) is not appended.
    const life = hub.indicators?.find((indicator) => indicator.code === 'POP217A')
    expect(life?.series).toEqual(hubStaticSeries('POP217A')?.points)
    // A latest period equal to the last captured year is not duplicated.
    const births = hub.indicators?.find((indicator) => indicator.code === 'POP201D')
    expect(births?.series).toEqual(hubStaticSeries('POP201D')?.points)
    expect(HUB_SERIES_CAPTURED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  // A row whose history was never captured renders without its sparkline, and
  // says nothing about it. That is how POP107D and LOC101B went a week without
  // one, so the band's codes are checked against the captures here.
  it('carries a well-formed capture for every row of the figures band', () => {
    for (const code of HUB_FIGURE_CODES) {
      const series = hubStaticSeries(code)
      expect(series, `no captured history for ${code}`).toBeDefined()
      expect(series?.points.length ?? 0).toBeGreaterThan(1)
    }
    for (const series of HUB_STATIC_SERIES) {
      const years = series.points.map((point) => Number(point.period))
      expect(years, `${series.code} is not one contiguous run of years`).toEqual(
        years.map((_, index) => years[0] + index),
      )
      for (const point of series.points) {
        expect(point.period, `${series.code} has a non-annual period`).toMatch(/^\d{4}$/)
        expect(Number.isFinite(point.value), `${series.code} ${point.period} is not a number`).toBe(true)
      }
      expect(series.pins.length, `${series.code} has no cell pins`).toBeGreaterThan(0)
      expect(series.unitCode, `${series.code} has no unit`).toBeTruthy()
    }
  })

  it('keeps only county rows that are the national cell on every axis but the county one, and names what is missing', async () => {
    const life = spec('POP217A')
    answer({
      counties: {
        POP217A: hubCountyResponse(life, [
          { county: { code: 'VL', name: 'Vâlcea' }, value: '82.01', countyAxis: 2 },
          { county: { code: 'CL', name: 'Călărași' }, value: '74.82', countyAxis: 2 },
          // Sibling cell: males, not the total — must not become Cluj's value.
          { county: { code: 'CJ', name: 'Cluj' }, value: '75.1', countyAxis: 2, memberOverrides: { 1: '1' } },
          { county: { code: 'CJ', name: 'Cluj' }, value: '78.71', countyAxis: 2 },
          // Another unit is another number.
          { county: { code: 'B', name: 'București' }, value: '1', countyAxis: 2, unit: { code: '0', symbol: 'x', name_ro: 'x', kind: 'other' } },
        ]),
      },
    })
    const hub = await fetchStatisticsHub()
    const layer = hub.counties?.find((entry) => entry.code === 'POP217A')
    expect(layer?.period).toBe('2025')
    expect(layer?.unit).toBe('years')
    expect(layer?.values).toEqual([
      { code: 'VL', name: 'Vâlcea', value: 82.01 },
      { code: 'CL', name: 'Călărași', value: 74.82 },
      { code: 'CJ', name: 'Cluj', value: 78.71 },
    ])
    expect(layer?.missingCounties).toContain('B')
    expect(layer?.missingCounties).toHaveLength(42 - 3)
    // The national cell the rows were matched against is the ranking's reference.
    expect(layer?.national).toBe(77.45)
  })

  it('gives a county layer no national reference when the latest national cell is a month, not the year', async () => {
    answer({
      tiles: hubTilesResponse({ SOM103A: { period: '2025-12', periodicity: 'MONTHLY', value: '3.1' } }),
      counties: { SOM103A: hubCountyResponse(spec('SOM103A'), [{ county: { code: 'TR', name: 'Teleorman' }, value: '9.3', countyAxis: 1 }]) },
    })
    const hub = await fetchStatisticsHub()
    const layer = hub.counties?.find((entry) => entry.code === 'SOM103A')
    expect(layer?.period).toBe('2025')
    expect(layer?.values).toEqual([{ code: 'TR', name: 'Teleorman', value: 9.3 }])
    // December's 3,1% is not 2025's rate; the ranking draws no line rather than the wrong one.
    expect(layer?.national).toBeNull()
  })

  it('gives a county layer no national reference when INS flags the national cell', async () => {
    const tiles = hubTilesResponse()
    const life = tiles.latest.find((entry) => entry.dataset.code === 'POP217A')
    if (life?.observation) (life.observation as { value_status: string | null }).value_status = 'c'
    answer({
      tiles,
      counties: { POP217A: hubCountyResponse(spec('POP217A'), [{ county: { code: 'VL', name: 'Vâlcea' }, value: '82.01', countyAxis: 2 }]) },
    })
    const hub = await fetchStatisticsHub()
    const layer = hub.counties?.find((entry) => entry.code === 'POP217A')
    expect(layer?.values).toHaveLength(1)
    expect(layer?.national).toBeNull()
  })

  it('refuses a sibling cell that differs on another single axis, whatever order the API returns rows in', async () => {
    const earnings = spec('FOM106E')
    answer({
      counties: {
        // A sex first: a county row of one sex differs on two axes and is
        // refused; a row whose single differing axis is not the layer's county
        // axis is refused too, however the API ordered them.
        FOM106E: hubCountyResponse(earnings, [
          { county: { code: 'CJ', name: 'Cluj' }, value: '9', countyAxis: 2, memberOverrides: { 1: '106' } },
          { county: { code: 'CJ', name: 'Cluj' }, value: '5921', countyAxis: 2 },
          { county: { code: 'TM', name: 'Timiș' }, value: '5508', countyAxis: 2 },
          { county: { code: 'B', name: 'București' }, value: '1', countyAxis: 0 },
        ]),
      },
    })
    const hub = await fetchStatisticsHub()
    const layer = hub.counties?.find((entry) => entry.code === 'FOM106E')
    expect(layer?.values).toEqual([
      { code: 'CJ', name: 'Cluj', value: 5921 },
      { code: 'TM', name: 'Timiș', value: 5508 },
    ])
  })

  it('shows no number for a cell INS marked confidential or missing, but keeps its flag', async () => {
    const tiles = hubTilesResponse({ LOC101B: { value: '12' } })
    const blocked = tiles.latest.find((entry) => entry.dataset.code === 'LOC101B')
    if (blocked?.observation) (blocked.observation as { value_status: string | null }).value_status = 'c'
    answer({ tiles })
    const hub = await fetchStatisticsHub()
    const dwellings = hub.indicators?.find((indicator) => indicator.code === 'LOC101B')
    expect(dwellings).toMatchObject({ value: null, rawValue: '12', valueStatus: 'c' })
  })

  it('keeps a blocked latest value out of the chart series too', async () => {
    const tiles = hubTilesResponse({ FOM104D: { value: '5500000', period: '2026' } })
    const blocked = tiles.latest.find((entry) => entry.dataset.code === 'FOM104D')
    if (blocked?.observation) (blocked.observation as { value_status: string | null }).value_status = ':'
    answer({ tiles })
    const hub = await fetchStatisticsHub()
    const employees = hub.indicators?.find((indicator) => indicator.code === 'FOM104D')
    expect(employees?.value).toBeNull()
    expect(employees?.series).toEqual(hubStaticSeries('FOM104D')?.points)
  })

  it('names the counties section as failed when there is no national year to anchor it on', async () => {
    vi.mocked(graphqlQuery).mockImplementation(async (query: string) => {
      if (query.includes('query InsNationalLatest')) throw new Error('tiles down')
      throw new Error('unexpected')
    })
    const hub = await fetchStatisticsHub()
    expect(hub.indicators).toBeNull()
    expect(hub.counties).toBeNull()
    expect([...hub.failures].sort()).toEqual(['counties', 'indicators'])
  })

  it('anchors every county read on the national indicator year and the national cell, and requests NUTS3 only', async () => {
    const calls = answer()
    await fetchStatisticsHub()
    const countyCalls = calls.filter((call) => call.query.includes('query InsObservations('))
    expect(countyCalls.map((call) => call.variables?.datasetCode)).toEqual(['POP217A', 'FOM106E', 'CON103H', 'SOM103A', 'POP215A', 'POP110A'])
    // Every axis but the territory pinned to the national cell's member: the counties' cells, not FOM106E's 8,000.
    expect(countyCalls[1]?.variables?.filter).toEqual({
      territoryLevels: ['NUTS3'],
      period: { type: 'YEAR', selection: { interval: { start: '2024', end: '2024' } } },
      sourcePins: [
        { dimensionIndex: 0, memberCode: '9001' },
        { dimensionIndex: 1, memberCode: '105' },
      ],
    })
  })

  it('serves the figures that came back when the API no longer knows a matrix', async () => {
    const tiles = hubTilesResponse()
    tiles.latest = tiles.latest.filter((entry) => entry.dataset.code !== 'TUR104E')
    answer({ tiles })
    const hub = await fetchStatisticsHub()
    expect(hub.failures).toEqual([])
    expect(hub.indicators?.map((indicator) => indicator.code)).not.toContain('TUR104E')
    expect(hub.indicators).toHaveLength(HUB_NATIONAL_SPECS.length - 1)
    expect(hub.counties).toHaveLength(6)
  })

  it('reads no county layer for a matrix the API no longer knows, and records no failure', async () => {
    const tiles = hubTilesResponse()
    tiles.latest = tiles.latest.filter((entry) => entry.dataset.code !== 'POP217A')
    const calls = answer({ tiles })
    const hub = await fetchStatisticsHub()
    expect(hub.failures).toEqual([])
    expect(hub.counties?.map((layer) => layer.code)).toEqual(['FOM106E', 'CON103H', 'SOM103A', 'POP215A', 'POP110A'])
    expect(calls.filter((call) => call.query.includes('query InsObservations(')).map((call) => call.variables?.datasetCode)).toEqual([
      'FOM106E',
      'CON103H',
      'SOM103A',
      'POP215A',
      'POP110A',
    ])
  })

  it('fails the map alone when its own anchors do not read, keeping the figures and the layers anchored on them', async () => {
    const calls: string[] = []
    vi.mocked(graphqlQuery).mockImplementation(async (query: string, variables?: unknown) => {
      calls.push(query)
      if (query.includes('query InsCountyAnchors')) throw new Error('anchors down')
      if (query.includes('query InsNationalLatest')) {
        const codes = (variables as { codes: readonly string[] }).codes
        return { latest: hubTilesResponse().latest.filter((entry) => codes.includes(entry.dataset.code)) }
      }
      return hubCountyResponse(spec(String((variables as { datasetCode: string }).datasetCode)), [])
    })
    const hub = await fetchStatisticsHub()
    expect(hub.indicators).toHaveLength(HUB_NATIONAL_SPECS.length)
    expect(hub.counties?.map((layer) => layer.code)).toEqual(['POP217A', 'SOM103A'])
    expect(hub.failures).toEqual(['counties'])
  })

  it('lets a caller abort through rather than recording a failed section', async () => {
    const controller = new AbortController()
    vi.mocked(graphqlQuery).mockImplementation(async () => {
      controller.abort()
      throw controller.signal.reason
    })
    await expect(fetchStatisticsHub(controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('records a read past its deadline as a failed section, so the page renders and the browser reads again', async () => {
    vi.mocked(graphqlQuery).mockRejectedValue(new GraphQLRequestError('timed out', { timedOut: true }))
    const hub = await fetchStatisticsHub()
    expect(hub.indicators).toBeNull()
    expect(hub.failures).toEqual(['indicators', 'counties'])
  })

  it('keeps the county layers that answered when one fails, and names the section', async () => {
    answer({ failCounty: 'SOM103A' })
    const hub = await fetchStatisticsHub()
    expect(hub.counties?.map((layer) => layer.code)).toEqual(['POP217A', 'FOM106E', 'CON103H', 'POP215A', 'POP110A'])
    expect(hub.indicators).toHaveLength(HUB_NATIONAL_SPECS.length)
    expect(hub.failures).toEqual(['counties'])
  })

  it('leaves a county INS flagged confidential or missing out of the map, as the national figures do', async () => {
    const life = spec('POP217A')
    const page = hubCountyResponse(life, [
      { county: { code: 'VL', name: 'Vâlcea' }, value: '82.01', countyAxis: 2 },
      { county: { code: 'CL', name: 'Călărași' }, value: '0', countyAxis: 2 },
    ])
    ;(page.insObservations.nodes[1] as { value_status: string | null }).value_status = 'c'
    answer({ counties: { POP217A: page } })
    const hub = await fetchStatisticsHub()
    const layer = hub.counties?.find((entry) => entry.code === 'POP217A')
    expect(layer?.values.map((county) => county.code)).toEqual(['VL'])
    expect(layer?.missingCounties).toContain('CL')
  })

  it('refuses a truncated county page rather than drawing a partial map', async () => {
    answer({ counties: { FOM106E: hubCountyResponse(spec('FOM106E'), [{ county: { code: 'CJ', name: 'Cluj' }, value: '1' }], true) } })
    const hub = await fetchStatisticsHub()
    expect(hub.counties?.map((layer) => layer.code)).toEqual(['POP217A', 'CON103H', 'SOM103A', 'POP215A', 'POP110A'])
    expect(hub.failures).toContain('counties')
  })

  it('names the unit from what the API resolved, never from the dataset', () => {
    expect(hubUnitOf({ unitSymbol: 'persons', unitCode: '9685', unitNameRo: 'Numar persoane' })).toBe('persons')
    expect(hubUnitOf({ unitSymbol: 'other', unitCode: '9361', unitNameRo: 'Ani' })).toBe('years')
    expect(hubUnitOf({ unitSymbol: 'other', unitCode: '9496', unitNameRo: 'Kilometri' })).toBe('other')
    expect(hubUnitOf({ unitSymbol: null, unitCode: null, unitNameRo: null })).toBe('other')
  })
})
