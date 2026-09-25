import { z } from 'zod'
import { graphqlQuery, isAbortError } from '@/lib/graphql/graphql-client'
import { throwIfCancelled } from '@/lib/ssr/deadline-signal'
import { createLogger } from '@/lib/logger'
import { sourcePinsFilter } from '@/lib/ins/source-pins'
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
import { hubUnitOf } from '../../lib/units'
import { hubStaticSeries } from '../../lib/hub-national-series'
import { publishedNumber } from '../../lib/value-status'
import { HUB_COUNTY_ANCHOR_CODES, HUB_COUNTY_LAYERS, HUB_NATIONAL_DATASET_CODES } from '../../lib/landing-constants'
import { fetchNationalLatest } from './national-latest'
import { INS_OBSERVATIONS_QUERY } from './ins-queries'
import { insObservationNodeRawSchema, insPageInfoRawSchema } from './statistics-raw-schemas'

const logger = createLogger('statistics-hub')

/**
 * The `/ins` hub read.
 *
 * Two sections, so a slow or failed one never blanks the page: the national
 * indicators (one `insLatestDatasetValues` at RO/NATIONAL) and six county
 * layers (one `insObservations` each at the indicator's latest year), each
 * layer on its own so one that fails leaves the others on the map. The
 * layers' anchors that are not rows of the hub's own are a second, parallel
 * national read, failing the map alone. The
 * annual histories behind the charts are kept in the client
 * (`lib/hub-national-series.ts`, captured from the same API) and only
 * extended with the live latest point when it is newer. The county layers
 * need the resolved national cell — its unit and classification members are
 * what "the total" means for each dataset — so they wait for the first read.
 * A matrix the API no longer knows is one missing figure, not a failed
 * section: the page shows what came back.
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
  return publishedNumber(latest.value, latest.valueStatus)
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
  // The national cell's members on every axis but the territory: the read is
  // the counties' 42 cells, not the matrix — FOM106E holds 8,000 county cells
  // a year, one per activity and sex. With no layout to tell the territory
  // apart — mock data carries none — the read stays whole and the rows are
  // matched below.
  const dimensions = latest.source?.descriptor?.dimensions
  const territorial = new Set((dimensions ?? []).filter((dimension) => dimension.type === 'TERRITORIAL').map((dimension) => `D${dimension.index}`))
  const pins = dimensions
    ? sourcePinsFilter(new Map(latest.resolvedClassifications.filter((entry) => !territorial.has(entry.typeCode)).map((entry) => [entry.typeCode, entry.code])))
    : []
  const filter: InsObservationFilterInput = {
    territoryLevels: ['NUTS3'],
    period: makeSingleTimePeriod('YEAR', year as DateInput),
    ...(pins.length > 0 && { sourcePins: pins }),
  }
  const response = await graphqlQuery<unknown>(
    INS_OBSERVATIONS_QUERY,
    { datasetCode: code, filter, limit: COUNTY_ROW_LIMIT, offset: 0 },
    { auth: 'none', signal },
  )
  throwIfCancelled(signal)
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
    const value = publishedNumber(row.value, row.value_status)
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

/**
 * The county layers that could be read. A failed layer names the section as
 * failed — the render is not cached and the browser reads again — but the
 * layers that answered are kept, so the map is not blank for one of six.
 */
async function settleLayers(
  reads: readonly Promise<StatisticsHubCountyLayer>[],
  failures: StatisticsHubSection[],
): Promise<StatisticsHubCountyLayer[]> {
  const layers: StatisticsHubCountyLayer[] = []
  let failed = false
  for (const result of await Promise.allSettled(reads)) {
    if (result.status === 'fulfilled') {
      layers.push(result.value)
      continue
    }
    if (isAbortError(result.reason)) throw result.reason
    const error = result.reason
    logger.warn('Statistics hub county layer unavailable', { error: error instanceof Error ? error.message : String(error) })
    failed = true
  }
  if (failed) failures.push('counties')
  return layers
}

async function settle<T>(section: StatisticsHubSection, read: Promise<T>, failures: StatisticsHubSection[]): Promise<T | null> {
  try {
    return await read
  } catch (error) {
    // The caller gave up: nothing to record. A read past its deadline is a
    // failure of the section, and is recorded as one.
    if (isAbortError(error)) throw error
    logger.warn('Statistics hub section unavailable', { section, error: error instanceof Error ? error.message : String(error) })
    failures.push(section)
    return null
  }
}

export async function fetchStatisticsHub(signal?: AbortSignal): Promise<StatisticsHubData> {
  const failures: StatisticsHubSection[] = []
  const [tiles, anchors] = await Promise.all([
    settle('indicators', fetchNationalLatest(HUB_NATIONAL_DATASET_CODES, signal), failures),
    // The map's own anchors, read apart: a cell of theirs that fails fails the map alone.
    settle('counties', fetchNationalLatest(HUB_COUNTY_ANCHOR_CODES, signal, 'InsCountyAnchors'), failures),
  ])
  throwIfCancelled(signal)

  const latestByCode = new Map([...(tiles?.nationalValues ?? []), ...(anchors?.nationalValues ?? [])].map((latest) => [latest.datasetCode, latest]))
  const indicators: StatisticsHubIndicator[] | null = tiles
    ? HUB_NATIONAL_DATASET_CODES.flatMap((code) => {
        const latest = latestByCode.get(code)
        if (!latest) return []
        const indicator = toIndicator(latest)
        // The blocked value the row hides must not resurface as a chart point.
        return [{ ...indicator, series: seriesFor(latest, indicator.value) }]
      })
    : null
  // The layers anchored on the rows' read never run without it: no national year to anchor on.
  if (!tiles) failures.push('counties')
  const counties: StatisticsHubCountyLayer[] | null =
    tiles || anchors
      ? await settleLayers(
          HUB_COUNTY_LAYERS.flatMap((layer) => {
            const latest = latestByCode.get(layer.code)
            return latest?.hasData ? [fetchCountyLayer(layer.code, latest, signal)] : []
          }),
          failures,
        )
      : null

  return {
    nativeContract: 'hub-v1',
    indicators,
    counties,
    failures: [...new Set(failures)],
  }
}

