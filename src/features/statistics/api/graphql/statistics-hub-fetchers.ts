import { z } from 'zod'
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { createLogger } from '@/lib/logger'
import { ROMANIA_COUNTIES } from '@/lib/territory-counties'
import type { InsObservationFilterInput } from '@/schemas/ins'
import { makeSingleTimePeriod, type DateInput } from '@/schemas/reporting'
import type {
  StatisticsHubCountyLayer,
  StatisticsHubCountyValue,
  StatisticsHubData,
  StatisticsHubIndicator,
  StatisticsHubSection,
  StatisticsHubSeriesPoint,
  StatisticsLatestValue,
} from '@/schemas/statistics'
import { hubUnitOf } from '../../lib/hub-format'
import { hubStaticSeries } from '../../lib/hub-national-series'
import { BLOCKING_VALUE_STATUSES } from '../../lib/value-status'
import { HUB_COUNTY_LAYERS, HUB_NATIONAL_DATASET_CODES } from '../../lib/landing-constants'
import { fetchNativeLandingTiles } from './ins-landing-tiles'
import { INS_OBSERVATIONS_QUERY } from './ins-queries'
import { insObservationNodeRawSchema, insPageInfoRawSchema } from './statistics-raw-schemas'

const logger = createLogger('statistics-hub')

/**
 * The `/ins` hub read.
 *
 * Two sections, so a slow or failed one never blanks the page: the national
 * indicators (one `insLatestDatasetValues` at RO/NATIONAL) and three county
 * layers (one `insObservations` each at the indicator's latest year). The
 * annual histories behind the charts are kept in the client
 * (`lib/hub-national-series.ts`, captured from the same API) and only
 * extended with the live latest point when it is newer. The county layers
 * need the resolved national cell — its unit and classification members are
 * what "the total" means for each dataset — so they wait for the first read.
 */

/** The server's page ceiling; a layer past it is refused rather than drawn short. */
const COUNTY_ROW_LIMIT = 1000

const observationsPageResponseSchema = z.object({
  insObservations: z.object({
    nodes: z.array(insObservationNodeRawSchema),
    pageInfo: insPageInfoRawSchema,
  }),
})

type RawObservation = z.infer<typeof insObservationNodeRawSchema>

function parseDecimal(value: string | null | undefined): number | null {
  if (value === null || value === undefined) return null
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

/** `type_code → member code` of the resolved national cell. */
function cellMembers(latest: StatisticsLatestValue): ReadonlyMap<string, string> {
  return new Map(latest.resolvedClassifications.map((entry) => [entry.typeCode, entry.code]))
}

function rowMembers(row: RawObservation): ReadonlyMap<string, string> {
  const members = new Map<string, string>()
  for (const entry of row.classifications ?? []) {
    if (entry.type_code && entry.code) members.set(entry.type_code, entry.code)
  }
  return members
}

/**
 * The axes on which a row differs from the national cell. `null` when the
 * row does not carry every axis the national cell has.
 */
function differingAxes(row: RawObservation, cell: ReadonlyMap<string, string>): readonly string[] | null {
  const members = rowMembers(row)
  if (members.size !== cell.size) return null
  const different: string[] = []
  for (const [typeCode, code] of cell) {
    const member = members.get(typeCode)
    if (member === undefined) return null
    if (member !== code) different.push(typeCode)
  }
  return different
}

/**
 * Whether the matrix publishes places at all. Read off the certified layout;
 * a layout that failed to parse keeps the territory, which every matrix with
 * a geography axis needs and a national-only one tolerates.
 */
function hasGeographyAxis(latest: StatisticsLatestValue): boolean {
  const dimensions = latest.source?.descriptor?.dimensions
  return dimensions ? dimensions.some((dimension) => dimension.type === 'TERRITORIAL') : true
}

/** A confidential or missing cell keeps its flag and has no number. */
function unflaggedValue(latest: StatisticsLatestValue): number | null {
  return BLOCKING_VALUE_STATUSES.has(latest.valueStatus?.trim().toLowerCase() ?? '') ? null : parseDecimal(latest.value)
}

function toIndicator(latest: StatisticsLatestValue): StatisticsHubIndicator {
  return {
    code: latest.datasetCode,
    nameRo: latest.datasetNameRo,
    value: unflaggedValue(latest),
    rawValue: latest.value,
    valueStatus: latest.valueStatus,
    unit: hubUnitOf(latest),
    unitLabel: latest.unitNameRo ?? latest.unitSymbol,
    unitCode: latest.unitCode,
    period: latest.period,
    periodicity: latest.resolvedPeriodicity,
    pins: latest.resolvedClassifications.map((entry) => `${entry.typeCode}:${entry.code}`),
    hasGeography: hasGeographyAxis(latest),
    series: [],
  }
}

/**
 * The captured history, extended with the live latest point when that point
 * is a newer year of the same cell and unit. A live point of another cell is
 * not appended: a series that changes definition at its last point misleads
 * more than one that ends a year early.
 */
function seriesFor(latest: StatisticsLatestValue, value: number | null): readonly StatisticsHubSeriesPoint[] {
  const stored = hubStaticSeries(latest.datasetCode)
  if (!stored) return []
  const points = stored.points
  const last = points[points.length - 1]
  const period = latest.period
  const pins = latest.resolvedClassifications.map((entry) => `${entry.typeCode}:${entry.code}`)
  const sameCell =
    latest.unitCode === stored.unitCode &&
    pins.length === stored.pins.length &&
    pins.every((pin) => stored.pins.includes(pin))
  if (
    !sameCell ||
    value === null ||
    latest.resolvedPeriodicity !== 'ANNUAL' ||
    !period ||
    !/^\d{4}$/.test(period) ||
    (last && period <= last.period)
  )
    return points
  return [...points, { period, value }]
}

/** One dataset over the counties at the year of its national latest cell. */
async function fetchCountyLayer(
  code: string,
  latest: StatisticsLatestValue,
  signal?: AbortSignal,
): Promise<StatisticsHubCountyLayer> {
  const year = latest.period ? /^(\d{4})/.exec(latest.period)?.[1] : undefined
  if (!year) throw new Error(`No national period to anchor the county layer of ${code}`)
  const filter: InsObservationFilterInput = {
    territoryLevels: ['NUTS3'],
    period: makeSingleTimePeriod('YEAR', year as DateInput),
  }
  const response = await graphqlQuery<unknown>(
    INS_OBSERVATIONS_QUERY,
    { datasetCode: code, filter, limit: COUNTY_ROW_LIMIT, offset: 0 },
    { auth: 'none', signal },
  )
  signal?.throwIfAborted()
  const { insObservations } = observationsPageResponseSchema.parse(response)
  if (insObservations.pageInfo.hasNextPage) throw new Error(`County layer of ${code} truncated`)
  const cell = cellMembers(latest)
  const known = new Set<string>(ROMANIA_COUNTIES.map((county) => county.code))
  const values = new Map<string, StatisticsHubCountyValue>()
  // A county row is the national cell with the county member on exactly one
  // axis — the territorial one, whatever its index (D0 on FOM104D, D2 on
  // POP217A). The first accepted row fixes that axis for the whole layer, so
  // a sibling cell that differs on a different single axis (a sector, a sex)
  // is refused however the API ordered the rows.
  let countyAxis: string | null = null
  for (const row of insObservations.nodes) {
    const countyCode = row.territory?.code
    if (!countyCode || row.territory?.level !== 'NUTS3' || !known.has(countyCode)) continue
    if (row.time_period.periodicity !== 'ANNUAL') continue
    if ((row.unit?.code ?? null) !== latest.unitCode) continue
    const axes = differingAxes(row, cell)
    if (!axes || axes.length !== 1) continue
    const axis = axes[0] as string
    if (countyAxis === null) countyAxis = axis
    else if (axis !== countyAxis) continue
    // The flags the national figures honour: a confidential or missing cell
    // has no number to colour a county with, whatever the value field holds.
    if (BLOCKING_VALUE_STATUSES.has(row.value_status?.trim().toLowerCase() ?? '')) continue
    const value = parseDecimal(row.value)
    if (value === null || values.has(countyCode)) continue
    const name = ROMANIA_COUNTIES.find((county) => county.code === countyCode)?.nameRo ?? row.territory?.name_ro ?? countyCode
    values.set(countyCode, { code: countyCode, name, value })
  }
  return {
    code,
    period: year,
    unit: hubUnitOf(latest),
    unitLabel: latest.unitNameRo ?? latest.unitSymbol,
    values: [...values.values()],
    missingCounties: ROMANIA_COUNTIES.map((county) => county.code).filter((countyCode) => !values.has(countyCode)),
    // The reference the ranking measures each county against. A monthly
    // latest cell anchors the year but is not that year's national figure.
    national: latest.period === year ? unflaggedValue(latest) : null,
  }
}

async function settle<T>(section: StatisticsHubSection, read: Promise<T>, failures: StatisticsHubSection[]): Promise<T | null> {
  try {
    return await read
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    logger.warn('Statistics hub section unavailable', { section, error: error instanceof Error ? error.message : String(error) })
    failures.push(section)
    return null
  }
}

export async function fetchStatisticsHub(signal?: AbortSignal): Promise<StatisticsHubData> {
  const failures: StatisticsHubSection[] = []
  const tiles = await settle(
    'indicators',
    fetchNativeLandingTiles(signal, HUB_NATIONAL_DATASET_CODES),
    failures,
  )
  signal?.throwIfAborted()

  let indicators: StatisticsHubIndicator[] | null = null
  let counties: StatisticsHubCountyLayer[] | null = null
  if (tiles) {
    const latestByCode = new Map(tiles.nationalValues.map((latest) => [latest.datasetCode, latest]))
    const layers = await settle(
      'counties',
      Promise.all(
        HUB_COUNTY_LAYERS.flatMap((layer) => {
          const latest = latestByCode.get(layer.code)
          return latest?.hasData ? [fetchCountyLayer(layer.code, latest, signal)] : []
        }),
      ),
      failures,
    )
    indicators = HUB_NATIONAL_DATASET_CODES.flatMap((code) => {
      const latest = latestByCode.get(code)
      if (!latest) return []
      const indicator = toIndicator(latest)
      // The blocked value the row hides must not resurface as a chart point.
      return [{ ...indicator, series: seriesFor(latest, indicator.value) }]
    })
    counties = layers
  } else {
    // No national year to anchor on, so the county read never ran.
    failures.push('counties')
  }

  return {
    nativeContract: 'hub-v1',
    indicators,
    counties,
    failures,
  }
}

