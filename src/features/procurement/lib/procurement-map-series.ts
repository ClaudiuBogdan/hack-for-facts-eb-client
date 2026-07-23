/**
 * Buyer map series helpers — region choropleth via county polygons (M1).
 *
 * @see docs/specs/procurement-buyer-map-requirements.md
 */
import type { HeatmapCountyDataPoint } from '@/schemas/heatmap'
import type { ProcurementHubMapGrain } from '@/schemas/procurement-hub'
import type { RawProcurementBreakdownBucket } from '../api/graphql/procurement-queries'
import type { ProcurementGeographyOptions } from '../api/procurement-reference-api'
import { formatProcurementCountyName } from './procurement-geography'
import { MNEMONIC_TO_COUNTY_NAME } from '@/features/pnrr/lib/county-mnemonics'

export type ProcurementMapSeriesId = 'record_count' | 'value_awarded'

export type ProcurementMapGranularity = ProcurementHubMapGrain

export type ProcurementRegionMapBucket = {
  readonly region: string
  readonly recordCount: number | null
  readonly valueAwardedSum: number | null
  readonly kind: string
}

function parseNullableNumber(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/** Facet/breakdown buckets → named region totals (drops unknown/other for paint). */
export function regionBucketsFromBreakdown(
  buckets: readonly RawProcurementBreakdownBucket[] | null | undefined,
): readonly ProcurementRegionMapBucket[] {
  if (!buckets?.length) return []
  const out: ProcurementRegionMapBucket[] = []
  for (const bucket of buckets) {
    // Named buckets only: facets emit kind 'value' (PG) or 'top' (ClickHouse
    // dev backend); other/unknown never paint.
    if ((bucket.kind !== 'value' && bucket.kind !== 'top') || !bucket.key?.trim()) continue
    out.push({
      region: bucket.key.trim(),
      recordCount: parseNullableNumber(bucket.recordCount),
      valueAwardedSum: parseNullableNumber(bucket.valueAwardedSum),
      kind: bucket.kind,
    })
  }
  return out
}

function seriesValue(
  bucket: ProcurementRegionMapBucket,
  seriesId: ProcurementMapSeriesId,
): number | null {
  return seriesId === 'value_awarded'
    ? bucket.valueAwardedSum
    : bucket.recordCount
}

/**
 * Paint every county with its parent region's series value so the choropleth
 * reads as eight development regions without a separate region GeoJSON.
 */
export function buildRegionHeatmapByCounty(
  geography: ProcurementGeographyOptions | undefined,
  regionBuckets: readonly ProcurementRegionMapBucket[],
  seriesId: ProcurementMapSeriesId,
): HeatmapCountyDataPoint[] {
  const valueByRegion = new Map<string, number>()
  for (const bucket of regionBuckets) {
    const value = seriesValue(bucket, seriesId)
    if (value === null) continue
    valueByRegion.set(bucket.region, value)
  }

  const counties = geography?.counties ?? []
  const points: HeatmapCountyDataPoint[] = []

  for (const county of counties) {
    if (!county.region || !county.countyCode) continue
    const amount = valueByRegion.get(county.region)
    if (amount === undefined) continue
    const countyName =
      formatProcurementCountyName(county.countyName) ||
      MNEMONIC_TO_COUNTY_NAME[county.countyCode] ||
      county.countyCode
    points.push({
      county_code: county.countyCode,
      county_name: countyName,
      county_population: 0,
      amount,
      total_amount: amount,
      per_capita_amount: 0,
      county_entity: { cui: '', name: county.region },
    })
  }

  return points
}

/** County-grain paint: buckets keyed by county code map 1:1 onto polygons. */
export function buildCountyHeatmap(
  geography: ProcurementGeographyOptions | undefined,
  countyBuckets: readonly ProcurementRegionMapBucket[],
  seriesId: ProcurementMapSeriesId,
): HeatmapCountyDataPoint[] {
  const valueByCounty = new Map<string, number>()
  for (const bucket of countyBuckets) {
    const value = seriesValue(bucket, seriesId)
    if (value === null) continue
    valueByCounty.set(bucket.region, value)
  }
  const points: HeatmapCountyDataPoint[] = []
  for (const county of geography?.counties ?? []) {
    if (!county.countyCode) continue
    const amount = valueByCounty.get(county.countyCode)
    if (amount === undefined) continue
    const countyName =
      formatProcurementCountyName(county.countyName) ||
      MNEMONIC_TO_COUNTY_NAME[county.countyCode] ||
      county.countyCode
    points.push({
      county_code: county.countyCode,
      county_name: countyName,
      county_population: 0,
      amount,
      total_amount: amount,
      per_capita_amount: 0,
      county_entity: { cui: '', name: county.region ?? '' },
    })
  }
  return points
}

/**
 * Heatmap for the active map geography level.
 *
 * Region and county paint from the buyerRegion/buyerCounty facet dimensions
 * (ClickHouse dev backend). UAT needs the UAT geometry layer — data is
 * plumbed (dimension buyerSiruta) but paint stays empty until then.
 */
export function buildProcurementMapHeatmap(
  mapGrain: ProcurementMapGranularity,
  geography: ProcurementGeographyOptions | undefined,
  regionBuckets: readonly ProcurementRegionMapBucket[],
  seriesId: ProcurementMapSeriesId,
): HeatmapCountyDataPoint[] {
  if (mapGrain === 'region') {
    return buildRegionHeatmapByCounty(geography, regionBuckets, seriesId)
  }
  if (mapGrain === 'county') {
    return buildCountyHeatmap(geography, regionBuckets, seriesId)
  }
  return []
}

export function findRegionForCountyCode(
  geography: ProcurementGeographyOptions | undefined,
  countyCode: string | undefined,
): string | undefined {
  if (!countyCode) return undefined
  return (
    geography?.counties.find((c) => c.countyCode === countyCode)?.region ??
    undefined
  )
}

export function findRegionBucket(
  regionBuckets: readonly ProcurementRegionMapBucket[],
  region: string,
): ProcurementRegionMapBucket | undefined {
  return regionBuckets.find((bucket) => bucket.region === region)
}

export type ProcurementMapAnalysisDimension =
  | 'buyerRegion'
  | 'buyerCounty'
  | 'buyerSiruta'
  | 'cpvDivision'

export type ProcurementMapPaintMode =
  | 'region'
  | 'county'
  | 'uat'
  | 'single-region'
  | 'single-county'
  | 'single-uat'

export type ProcurementMapAnalysisPlan = {
  /** Facet dimension — never the same key already fixed in scope. */
  readonly dimension: ProcurementMapAnalysisDimension
  /** How choropleth rows are built from facet buckets or stats. */
  readonly paintMode: ProcurementMapPaintMode
  readonly topN: number
  /**
   * When paintMode is `single-*`, the scoped territory key used to place one
   * heatmap point from procurementStats (facets would be a one-bucket noop).
   */
  readonly singleTerritoryId?: string
}

/**
 * Pick a map analysis dimension that is not already fixed by buyer geo scope.
 * ClickHouse rejects `breakdown(buyerRegion)` when `scope.buyerRegion` is set
 * (single-bucket = use stats). After Apply filter we drill to the next finer
 * grain, or paint a single territory from stats.
 */
export function resolveProcurementMapAnalysisPlan(
  mapGrain: ProcurementMapGranularity,
  buyerGeo: {
    readonly buyerRegion?: string
    readonly buyerCounty?: string
    readonly buyerSiruta?: string
  },
): ProcurementMapAnalysisPlan {
  const buyerSiruta = buyerGeo.buyerSiruta?.trim() || undefined
  const buyerCounty = buyerGeo.buyerCounty?.trim() || undefined
  const buyerRegion = buyerGeo.buyerRegion?.trim() || undefined

  if (buyerSiruta) {
    return {
      dimension: 'cpvDivision',
      paintMode: 'single-uat',
      topN: 1,
      singleTerritoryId: buyerSiruta,
    }
  }

  if (buyerCounty) {
    if (mapGrain === 'uat') {
      return { dimension: 'buyerSiruta', paintMode: 'uat', topN: 100 }
    }
    return {
      dimension: 'cpvDivision',
      paintMode: 'single-county',
      topN: 1,
      singleTerritoryId: buyerCounty,
    }
  }

  if (buyerRegion) {
    // Region is fixed — region breakdown is invalid. Paint counties (or UATs)
    // inside the scoped region instead.
    if (mapGrain === 'uat') {
      return { dimension: 'buyerSiruta', paintMode: 'uat', topN: 100 }
    }
    return { dimension: 'buyerCounty', paintMode: 'county', topN: 100 }
  }

  if (mapGrain === 'uat') {
    return { dimension: 'buyerSiruta', paintMode: 'uat', topN: 100 }
  }
  if (mapGrain === 'county') {
    return { dimension: 'buyerCounty', paintMode: 'county', topN: 100 }
  }
  return { dimension: 'buyerRegion', paintMode: 'region', topN: 20 }
}

/**
 * Territory grain for map clicks / drawer / Apply — follows paint mode, not the
 * toolbar `mapGrain`. Otherwise a county/UAT paint under `mapGrain=region`
 * would resolve clicks to the parent region and broaden an existing filter.
 */
export function selectionGrainFromPaintMode(
  paintMode: ProcurementMapPaintMode,
): ProcurementMapGranularity {
  if (paintMode === 'county' || paintMode === 'single-county') {
    return 'county'
  }
  if (paintMode === 'uat' || paintMode === 'single-uat') {
    return 'uat'
  }
  return 'region'
}

/** True only when a county has a painted choropleth value in the active scope. */
export function isProcurementMapCountyPainted(
  countyCode: string | undefined,
  paintedCountyCodes: ReadonlySet<string>,
): countyCode is string {
  return countyCode !== undefined && paintedCountyCodes.has(countyCode)
}

/** Build heatmap using the resolved paint mode (may differ from toolbar mapGrain). */
export function buildProcurementMapHeatmapForPaintMode(
  paintMode: ProcurementMapPaintMode,
  geography: ProcurementGeographyOptions | undefined,
  regionBuckets: readonly ProcurementRegionMapBucket[],
  seriesId: ProcurementMapSeriesId,
): HeatmapCountyDataPoint[] {
  if (paintMode === 'region' || paintMode === 'single-region') {
    return buildRegionHeatmapByCounty(geography, regionBuckets, seriesId)
  }
  if (paintMode === 'county' || paintMode === 'single-county') {
    return buildCountyHeatmap(geography, regionBuckets, seriesId)
  }
  return []
}
