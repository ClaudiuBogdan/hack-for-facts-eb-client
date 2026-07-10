import { t } from '@lingui/core/macro'
import {
  getInsCountyDashboard,
  getInsDatasetsByCodes,
  getInsDatasetsCatalog,
  getInsUatDashboard,
} from '@/features/statistics/api/graphql/ins-fetchers'
import { getUatLabels } from '@/lib/api/labels'
import { API_FETCH_REFERRER_POLICY } from '@/lib/api/fetch-options'
import { getAuthToken } from '@/lib/auth'
import { getApiBaseUrl } from '@/config/env'
import { createLogger } from '@/lib/logger'
import type {
  InsDashboardData,
  InsDataset,
  InsObservation,
  InsTerritory,
  InsTimePeriod,
  InsUatDatasetGroup,
} from '@/schemas/ins'
import type {
  DatasetRequestPayload,
  DatasetRequestResult,
  StatisticsCoverageSummary,
  StatisticsDatasetSummary,
  StatisticsIndicatorTile,
  StatisticsLanding,
  StatisticsTerritoryHubResult,
  StatisticsTerritoryIdentity,
} from '@/schemas/statistics'
import { buildCoverageFromCatalog, buildDocsFallbackCoverage } from '../lib/coverage'
import { getDatasetDataStatus } from '../lib/dataset-status'
import { getLatestTimePeriod, resolveLatestPeriod } from '../lib/period'
import {
  buildTerritoryRelatedLinks,
  inferFallbackCountyCode,
  resolveTerritoryIdentity,
} from '../lib/territory'

const logger = createLogger('statistics-api-live')

/**
 * Top priority UAT-dashboard dataset codes (see `docs/ux-research/statistics.md`
 * §5: `INS_TOP_UAT_MATRIX_CODES` = POP107D, FOM104D, SOM101F, SOM103A, LOC101B).
 * Used to focus the territory hub tiles and the landing "top datasets" cards.
 */
const TOP_UAT_DATASET_CODES = [
  'POP107D',
  'FOM104D',
  'SOM101F',
  'SOM103A',
  'LOC101B',
] as const

const CATALOG_LIMIT = 2000

// ---------------------------------------------------------------------------
// Landing
// ---------------------------------------------------------------------------

/**
 * Fetches the statistics landing payload from the live INS catalog.
 *
 * Delegates to `getInsDatasetsCatalog(limit: 2000)` to build coverage and
 * the "top datasets" summaries. Coverage counts come from the catalog
 * `pageInfo.totalCount` + per-dataset `sync_status` (never invented).
 */
export async function fetchStatisticsLandingLive(): Promise<StatisticsLanding> {
  logger.info('Fetching statistics landing', {
    catalogLimit: CATALOG_LIMIT,
  })

  const catalog = await getInsDatasetsCatalog({ limit: CATALOG_LIMIT })
  const datasets = catalog.nodes ?? []

  const coverage = buildCoverageFromCatalog({
    datasets,
    totalCount: catalog.pageInfo?.totalCount ?? datasets.length,
    hasNextPage: catalog.pageInfo?.hasNextPage ?? false,
  })

  const topDatasets = await buildTopDatasetSummaries(datasets)

  const latestDataPeriod = pickLatestPeriod(
    topDatasets.map((summary) => summary.latestPeriod ?? ''),
  )

  return {
    topDatasets,
    coverage,
    latestDataPeriod,
  }
}

async function buildTopDatasetSummaries(
  catalogDatasets: readonly InsDataset[],
): Promise<readonly StatisticsDatasetSummary[]> {
  const catalogByCode = new Map(
    catalogDatasets.map((dataset) => [dataset.code, dataset]),
  )

  const missingCodes = TOP_UAT_DATASET_CODES.filter(
    (code) => !catalogByCode.has(code),
  )

  // Delegate to getInsDatasetsByCodes for any top codes not in the catalog page.
  const extraDatasets =
    missingCodes.length > 0 ? await getInsDatasetsByCodes(missingCodes) : []

  const topDatasets = TOP_UAT_DATASET_CODES.flatMap((code) => {
    const dataset = catalogByCode.get(code)
    if (dataset) return [dataset]
    return extraDatasets.filter((extra) => extra.code === code)
  })

  const catalogOnlyPreview = catalogDatasets.find(
    (dataset) =>
      getDatasetDataStatus(dataset) === 'catalog-only' &&
      !topDatasets.some((topDataset) => topDataset.code === dataset.code),
  )

  return [...topDatasets, ...(catalogOnlyPreview ? [catalogOnlyPreview] : [])]
    .map(toDatasetSummary)
}

function toDatasetSummary(dataset: InsDataset): StatisticsDatasetSummary {
  const dataStatus = getDatasetDataStatus(dataset)
  const yearRange = dataset.year_range
  const latestYear =
    dataStatus === 'available' && yearRange && yearRange.length > 0
      ? yearRange[yearRange.length - 1]
      : null

  return {
    code: dataset.code,
    nameRo: dataset.name_ro ?? null,
    nameEn: dataset.name_en ?? null,
    periodicity: dataset.periodicity,
    yearRange: dataset.year_range ?? null,
    hasUatData: dataset.has_uat_data,
    hasCountyData: dataset.has_county_data,
    hasSiruta: dataset.has_siruta,
    dataStatus,
    latestPeriod: latestYear ? latestYear.toString() : null,
    contextNameRo: dataset.context_name_ro ?? null,
    contextPath: dataset.context_path ?? null,
  }
}

// ---------------------------------------------------------------------------
// Territory hub
// ---------------------------------------------------------------------------

/**
 * Fetches the territory hub for a SIRUTA code from the live INS APIs.
 *
 * Delegates to:
 * - `getInsUatDashboard` for LAU territories (the verified UAT dashboard use
 *   case). This is the primary path and is NOT gated on
 *   `assertLiveApiAvailable` — the INS module is `apiReady: true`.
 * - `getInsCountyDashboard` for inferred county territories.
 * - `getInsDatasetsByCodes` to resolve top/catalog dataset metadata.
 * - `getUatLabels` for a territory display name when the dashboard territory
 *   record is missing one.
 *
 * Returns an explicit fallback identity when name/level enrichment is
 * missing, but does NOT block the live dashboard calls.
 */
export async function fetchStatisticsTerritoryHubLive(
  siruta: string,
): Promise<StatisticsTerritoryHubResult | null> {
  const normalizedSiruta = siruta.trim()
  if (normalizedSiruta.length === 0) {
    return null
  }

  logger.info('Fetching statistics territory hub', {
    siruta: normalizedSiruta,
  })

  // Fetched unfiltered on purpose: the hub is filtered by period client-side
  // (see `lib/hub-period.ts`), so switching periods never costs a round-trip.
  const dashboard = await getInsUatDashboard({
    sirutaCode: normalizedSiruta,
  })
  let countyDashboard: InsDashboardData | null = null

  if (dashboard.groups.length === 0) {
    const fallbackCountyCode = inferFallbackCountyCode(normalizedSiruta)
    if (fallbackCountyCode) {
      countyDashboard = await fetchCountyDashboardByCountyCode(fallbackCountyCode)
    }

    if (!countyDashboard || countyDashboard.groups.length === 0) {
      const labels = await getSafeUatLabels(normalizedSiruta)
      if (labels.length === 0) {
        return null
      }
    }
  }

  if (!countyDashboard) {
    countyDashboard = await fetchCountyDashboardForIdentity(dashboard)
  }

  if (
    dashboard.groups.length === 0 &&
    (!countyDashboard || countyDashboard.groups.length === 0)
  ) {
    return null
  }

  const primaryDashboard =
    countyDashboard && countyDashboard.groups.length > 0
      ? countyDashboard
      : dashboard

  const identity = await resolveHubIdentity(
    normalizedSiruta,
    primaryDashboard,
    countyDashboard,
  )

  const tiles = buildIndicatorTiles(primaryDashboard.groups)
  const availableDatasetCodes = primaryDashboard.groups
    .filter((group) => getDatasetDataStatus(group.dataset) === 'available')
    .map((group) => group.dataset.code)

  const coverage = await buildHubCoverage()
  const relatedLinks = buildTerritoryRelatedLinks({ identity })

  const latestDataPeriod = resolveHubLatestPeriod(primaryDashboard)

  return {
    identity,
    tiles,
    availableDatasetCodes,
    coverage,
    relatedLinks,
    latestDataPeriod,
    partial: primaryDashboard.partial,
  }
}

async function resolveHubIdentity(
  siruta: string,
  dashboard: InsDashboardData,
  countyDashboard: InsDashboardData | null,
): Promise<StatisticsTerritoryIdentity> {
  const territory = pickDashboardTerritory(dashboard.groups)
  const countyTerritory = countyDashboard
    ? pickDashboardTerritory(countyDashboard.groups)
    : null

  let liveName = territory?.name_ro ?? null
  const liveLevel = (territory?.level ?? null) as
    | StatisticsTerritoryIdentity['level']
    | null
  const liveCountyName = countyTerritory?.name_ro ?? null
  const liveCountyCode = countyTerritory?.code ?? null

  // getUatLabels can supply a UAT display name when the dashboard territory
  // record carries none. Best-effort; failures degrade to fallback identity.
  if (!liveName) {
    const labels = await getSafeUatLabels(siruta)
    const match = labels.find((label) => label.id === siruta)
    if (match) {
      liveName = match.label
    }
  }

  return resolveTerritoryIdentity({
    siruta,
    liveName,
    liveLevel,
    liveCountyName,
    liveCountyCode,
  })
}

async function getSafeUatLabels(
  siruta: string,
): Promise<readonly { id: string; label: string }[]> {
  try {
    return await getUatLabels([siruta])
  } catch (error) {
    logger.warn('getUatLabels failed for territory name enrichment', {
      siruta,
      error,
    })
    return []
  }
}

/**
 * Fetches a county-level dashboard when the territory appears to be a county
 * (NUTS3). Uses the SIRUTA as the county code when the UAT dashboard
 * territory reports level `NUTS3`; otherwise returns null. Best-effort:
 * failures degrade to a null county dashboard, never blocking the UAT path.
 */
async function fetchCountyDashboardForIdentity(
  dashboard: InsDashboardData,
): Promise<InsDashboardData | null> {
  if (dashboard.groups.length === 0) {
    return null
  }

  const territory = pickDashboardTerritory(dashboard.groups)
  const isCounty = territory?.level === 'NUTS3' || territory?.level === 'NUTS2'
  if (!isCounty || !territory?.code) {
    return null
  }

  const countyDatasetCodes = dashboard.groups
    .filter((group) => group.dataset.has_county_data)
    .map((group) => group.dataset.code)

  if (countyDatasetCodes.length === 0) {
    return null
  }

  try {
    return await getInsCountyDashboard({
      countyCode: territory.code,
      datasetCodes: countyDatasetCodes,
    })
  } catch (error) {
    logger.warn('getInsCountyDashboard failed for county enrichment', {
      countyCode: territory.code,
      error,
    })
    return null
  }
}

async function fetchCountyDashboardByCountyCode(
  countyCode: string,
): Promise<InsDashboardData | null> {
  try {
    return await getInsCountyDashboard({
      countyCode,
      datasetCodes: [...TOP_UAT_DATASET_CODES],
    })
  } catch (error) {
    logger.warn('getInsCountyDashboard failed for direct county lookup', {
      countyCode,
      error,
    })
    return null
  }
}

function pickDashboardTerritory(
  groups: readonly InsUatDatasetGroup[],
): InsTerritory | null {
  for (const group of groups) {
    for (const observation of group.observations) {
      if (observation.territory) {
        return observation.territory
      }
    }
  }
  return null
}

function buildIndicatorTiles(
  groups: readonly InsUatDatasetGroup[],
): readonly StatisticsIndicatorTile[] {
  return groups.map((group) => {
    const latest = pickLatestObservation(group.observations)
    const sparkline = buildSparkline(group.observations)
    const dataStatus = getDatasetDataStatus(group.dataset)
    const tileState =
      dataStatus === 'catalog-only'
        ? 'catalog-only'
        : group.observations.length === 0
          ? 'no-data'
          : 'available'

    return {
      datasetCode: group.dataset.code,
      datasetNameRo: group.dataset.name_ro ?? null,
      datasetNameEn: group.dataset.name_en ?? null,
      periodicity: group.dataset.periodicity,
      dataStatus,
      tileState,
      value: latest?.value ?? null,
      valueStatus: latest?.value_status ?? null,
      unitSymbol: latest?.unit?.symbol ?? null,
      unitNameRo: latest?.unit?.name_ro ?? null,
      latestPeriod: resolveLatestPeriod({
        latestPeriod: group.latestPeriod,
        observations: group.observations,
      }),
      latestYear: latest?.time_period.year ?? null,
      sparkline,
    }
  })
}

function pickLatestObservation(
  observations: readonly InsObservation[],
): InsObservation | null {
  let latest: InsObservation | null = null
  let latestKey = Number.NEGATIVE_INFINITY

  for (const observation of observations) {
    const key =
      observation.time_period.year * 10000 +
      (observation.time_period.quarter ?? 0) * 100 +
      (observation.time_period.month ?? 0)
    if (key > latestKey) {
      latestKey = key
      latest = observation
    }
  }

  return latest
}

function buildSparkline(
  observations: readonly InsObservation[],
): readonly (readonly [InsTimePeriod, string | null])[] {
  return [...observations]
    .sort((a, b) => {
      const keyA =
        a.time_period.year * 10000 +
        (a.time_period.quarter ?? 0) * 100 +
        (a.time_period.month ?? 0)
      const keyB =
        b.time_period.year * 10000 +
        (b.time_period.quarter ?? 0) * 100 +
        (b.time_period.month ?? 0)
      return keyA - keyB
    })
    .map(
      (observation) =>
        [
          observation.time_period,
          observation.value,
        ] as readonly [InsTimePeriod, string | null],
    )
}


async function buildHubCoverage(): Promise<StatisticsCoverageSummary> {
  try {
    const catalog = await getInsDatasetsCatalog({ limit: CATALOG_LIMIT })
    return buildCoverageFromCatalog({
      datasets: catalog.nodes ?? [],
      totalCount: catalog.pageInfo?.totalCount ?? (catalog.nodes?.length ?? 0),
      hasNextPage: catalog.pageInfo?.hasNextPage ?? false,
    })
  } catch (error) {
    logger.warn('Live catalog unavailable for territory coverage', { error })
    // Catalog failure must not break the dashboard; fall back to the
    // docs-grounded 27/1898 constants (cited in lib/coverage.ts).
    return {
      ...buildDocsFallbackCoverage(),
      partial: true,
    }
  }
}

/**
 * Picks the chronologically latest non-empty period string from a list.
 * Used to derive the landing "data-through" period from dataset summaries
 * without `Array.prototype.at` (keeps the lib target compatible).
 */
function pickLatestPeriod(periods: readonly string[]): string | null {
  let latest: string | null = null
  for (const period of periods) {
    if (period.length === 0) continue
    if (latest === null || period > latest) {
      latest = period
    }
  }
  return latest
}

function resolveHubLatestPeriod(dashboard: InsDashboardData): string | null {
  let latest: string | null = null
  let latestKey = Number.NEGATIVE_INFINITY

  for (const group of dashboard.groups) {
    const period = resolveLatestPeriod({
      latestPeriod: group.latestPeriod,
      observations: group.observations,
    })
    if (!period) continue

    const latestTimePeriod = getLatestTimePeriod(group.observations)
    const key = latestTimePeriod
      ? latestTimePeriod.year * 10000 +
        (latestTimePeriod.quarter ?? 0) * 100 +
        (latestTimePeriod.month ?? 0)
      : 0

    if (key > latestKey) {
      latestKey = key
      latest = period
    }
  }

  return latest
}

// ---------------------------------------------------------------------------
// Dataset request
// ---------------------------------------------------------------------------

/**
 * Live "request this dataset" action for catalog-only entries.
 *
 * Posts to the server's REST endpoint — there is no GraphQL mutation surface
 * for the INS module. Authentication is optional: a signed-out request still
 * records the demand signal, but the server deliberately discards the contact
 * email and the note for it, because without a Clerk user id there is no
 * `user.deleted` event that could ever anonymize them. The UI says so before
 * the user types.
 */
export async function submitDatasetRequestLive(
  payload: DatasetRequestPayload,
): Promise<DatasetRequestResult> {
  const token = await getAuthToken()

  const response = await fetch(`${getApiBaseUrl()}/api/ins/dataset-requests`, {
    method: 'POST',
    referrerPolicy: API_FETCH_REFERRER_POLICY,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    logger.warn('Dataset request rejected', {
      datasetCode: payload.datasetCode,
      status: response.status,
    })

    return {
      accepted: false,
      datasetCode: payload.datasetCode,
      message:
        response.status === 400
          ? t`Cererea nu a fost acceptată. Verifică setul de date selectat.`
          : t`Nu am putut trimite cererea. Încearcă din nou mai târziu.`,
    }
  }

  return {
    accepted: true,
    datasetCode: payload.datasetCode,
    message: t`Cererea a fost înregistrată. Îți mulțumim!`,
  }
}
