/**
 * Procurement map series helpers — region/county/UAT choropleths.
 * Paint party is buyer (public institutions) or supplier (registered office).
 *
 * @see docs/specs/procurement-buyer-map-requirements.md
 */
import type {
  HeatmapCountyDataPoint,
  HeatmapUATDataPoint,
} from '@/schemas/heatmap'
import type {
  ProcurementHubMapGrain,
  ProcurementHubMapParty,
} from '@/schemas/procurement-hub'
import type { RawProcurementBreakdownBucket } from '../api/graphql/procurement-queries'
import type { ProcurementGeographyOptions } from '../api/procurement-reference-api'
import { formatProcurementCountyName } from './procurement-geography'
import { MNEMONIC_TO_COUNTY_NAME } from '@/features/pnrr/lib/county-mnemonics'

export type ProcurementMapSeriesId = 'record_count' | 'value_awarded'

export type ProcurementMapGranularity = ProcurementHubMapGrain
export type ProcurementMapParty = ProcurementHubMapParty

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
    // backend); other/unknown never paint.
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
 * Region-grain paint: one point per development region, keyed to
 * region.json's `properties.mnemonic`.
 */
export function buildRegionHeatmap(
  regionBuckets: readonly ProcurementRegionMapBucket[],
  seriesId: ProcurementMapSeriesId,
): HeatmapCountyDataPoint[] {
  const points: HeatmapCountyDataPoint[] = []
  for (const bucket of regionBuckets) {
    const value = seriesValue(bucket, seriesId)
    if (value === null) continue
    points.push({
      county_code: bucket.region,
      county_name: bucket.region,
      county_population: 0,
      amount: value,
      total_amount: value,
      per_capita_amount: 0,
      county_entity: { cui: '', name: bucket.region },
    })
  }

  return points
}

/**
 * Full-country UAT paint depth: every UAT bucket (3,186 features in uat.json;
 * server SIRUTA breakdowns allow topN 3300 — TOPN_SIRUTA_MAX, 2026-07-24).
 */
export const PROCUREMENT_UAT_PAINT_TOP_N = 3300

/**
 * UAT-grain paint: SIRUTA breakdown buckets (keys = `buyer_siruta_uat` /
 * `supplier_siruta_uat` as digit strings, no leading zeros) join uat.json
 * `properties.natcode` (same format) via `siruta_code` in the shared heatmap
 * style lookup. Names/counties come from the polygons; the points carry only
 * the key + value.
 */
export function buildUatHeatmap(
  uatBuckets: readonly ProcurementRegionMapBucket[],
  seriesId: ProcurementMapSeriesId,
): HeatmapUATDataPoint[] {
  const points: HeatmapUATDataPoint[] = []
  for (const bucket of uatBuckets) {
    const value = seriesValue(bucket, seriesId)
    if (value === null) continue
    points.push({
      uat_id: bucket.region,
      uat_code: bucket.region,
      uat_name: '',
      siruta_code: bucket.region,
      county_code: '',
      county_name: '',
      population: 0,
      amount: value,
      total_amount: value,
      per_capita_amount: 0,
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
      county_entity: { cui: '', name: countyName },
    })
  }
  return points
}

/**
 * Heatmap for the active map geography level.
 *
 * Region and county paint from party geo facet dimensions; UAT paints from
 * SIRUTA breakdown buckets joined to uat.json natcode (2026-07-24).
 */
export function buildProcurementMapHeatmap(
  mapGrain: ProcurementMapGranularity,
  geography: ProcurementGeographyOptions | undefined,
  regionBuckets: readonly ProcurementRegionMapBucket[],
  seriesId: ProcurementMapSeriesId,
): (HeatmapCountyDataPoint | HeatmapUATDataPoint)[] {
  if (mapGrain === 'region') {
    return buildRegionHeatmap(regionBuckets, seriesId)
  }
  if (mapGrain === 'county') {
    return buildCountyHeatmap(geography, regionBuckets, seriesId)
  }
  return buildUatHeatmap(regionBuckets, seriesId)
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
  | 'supplierRegion'
  | 'supplierCounty'
  | 'supplierSiruta'

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

type MapPartyGeo = {
  readonly party?: ProcurementMapParty
  readonly buyerRegion?: string
  readonly buyerCounty?: string
  readonly buyerSiruta?: string
  readonly supplierRegion?: string
  readonly supplierCounty?: string
  readonly supplierSiruta?: string
}

function partyGeoDims(party: ProcurementMapParty): {
  readonly region: ProcurementMapAnalysisDimension
  readonly county: ProcurementMapAnalysisDimension
  readonly siruta: ProcurementMapAnalysisDimension
} {
  if (party === 'supplier') {
    return {
      region: 'supplierRegion',
      county: 'supplierCounty',
      siruta: 'supplierSiruta',
    }
  }
  return {
    region: 'buyerRegion',
    county: 'buyerCounty',
    siruta: 'buyerSiruta',
  }
}

/**
 * Pick a map analysis dimension that is not already fixed by the paint party's
 * geography scope. ClickHouse rejects `breakdown(X)` when `scope.X` is set
 * (single-bucket = use stats). After Apply we drill to the next finer grain,
 * or paint a single territory from stats.
 */
export function resolveProcurementMapAnalysisPlan(
  mapGrain: ProcurementMapGranularity,
  geo: MapPartyGeo,
): ProcurementMapAnalysisPlan {
  const party: ProcurementMapParty = geo.party ?? 'buyer'
  const dims = partyGeoDims(party)
  const siruta =
    (party === 'supplier' ? geo.supplierSiruta : geo.buyerSiruta)?.trim() ||
    undefined
  const county =
    (party === 'supplier' ? geo.supplierCounty : geo.buyerCounty)?.trim() ||
    undefined
  const region =
    (party === 'supplier' ? geo.supplierRegion : geo.buyerRegion)?.trim() ||
    undefined

  // Single-territory modes paint from STATS; the facet dimension is a
  // placeholder that must never collide with a scope-fixed dimension. The
  // finest UNSET party-geo dim is structurally free — unlike the old
  // cpvDivision placeholder, which broke under CPV filters (C1). Normalized
  // state sets at most ONE level per party; if a raw caller ever sets all
  // three, fall to the OTHER party's SIRUTA (a state fixing both is
  // impossible — geo normalization keeps one level per party).
  const oppositeDims = partyGeoDims(party === 'supplier' ? 'buyer' : 'supplier')
  const freePlaceholderDim = !siruta
    ? dims.siruta
    : !county
      ? dims.county
      : !region
        ? dims.region
        : oppositeDims.siruta
  if (siruta) {
    return {
      dimension: freePlaceholderDim,
      paintMode: 'single-uat',
      topN: 1,
      singleTerritoryId: siruta,
    }
  }

  if (county) {
    if (mapGrain === 'uat') {
      return {
        dimension: dims.siruta,
        paintMode: 'uat',
        topN: PROCUREMENT_UAT_PAINT_TOP_N,
      }
    }
    return {
      dimension: freePlaceholderDim,
      paintMode: 'single-county',
      topN: 1,
      singleTerritoryId: county,
    }
  }

  if (region) {
    // Region is fixed — region breakdown is invalid. Paint counties (or UATs)
    // inside the scoped region instead.
    if (mapGrain === 'uat') {
      return {
        dimension: dims.siruta,
        paintMode: 'uat',
        topN: PROCUREMENT_UAT_PAINT_TOP_N,
      }
    }
    return { dimension: dims.county, paintMode: 'county', topN: 100 }
  }

  if (mapGrain === 'uat') {
    return {
      dimension: dims.siruta,
      paintMode: 'uat',
      topN: PROCUREMENT_UAT_PAINT_TOP_N,
    }
  }
  if (mapGrain === 'county') {
    return { dimension: dims.county, paintMode: 'county', topN: 100 }
  }
  return { dimension: dims.region, paintMode: 'region', topN: 20 }
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
): (HeatmapCountyDataPoint | HeatmapUATDataPoint)[] {
  if (paintMode === 'region' || paintMode === 'single-region') {
    return buildRegionHeatmap(regionBuckets, seriesId)
  }
  if (paintMode === 'county' || paintMode === 'single-county') {
    return buildCountyHeatmap(geography, regionBuckets, seriesId)
  }
  // 'uat' paints every bucket; 'single-uat' paints the one scoped territory
  // (regionBuckets already carries the single stats-derived point).
  return buildUatHeatmap(regionBuckets, seriesId)
}
