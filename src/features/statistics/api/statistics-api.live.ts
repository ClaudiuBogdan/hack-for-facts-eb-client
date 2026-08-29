import { t } from '@lingui/core/macro'
import { z } from 'zod'
import {
  fetchStatisticsTerritoryHubContext,
  fetchStatisticsTerritoryHubData,
} from '@/features/statistics/api/graphql/statistics-fetchers'
import { API_FETCH_REFERRER_POLICY } from '@/lib/api/fetch-options'
import { getAuthToken } from '@/lib/auth'
import { getApiBaseUrl } from '@/config/env'
import { createLogger } from '@/lib/logger'
import type {
  InsObservation,
  InsTimePeriod,
  InsUatDatasetGroup,
} from '@/schemas/ins'
import type {
  DatasetRequestPayload,
  DatasetRequestResult,
  StatisticsIndicatorTile,
  StatisticsTerritoryHubResult,
  StatisticsTileBenchmark,
} from '@/schemas/statistics'
import { getDatasetDataStatus } from '../lib/dataset-status'
import { LANDING_NATIONAL_DATASET_CODES } from '../lib/landing-constants'
import { getLatestTimePeriod, resolveLatestPeriod } from '../lib/period'
import { buildTerritoryRelatedLinks, resolveTerritoryIdentity } from '../lib/territory'

const logger = createLogger('statistics-api-live')

/** The `insUatDashboard` observation budget; at the cap the result is partial. */
const UAT_DASHBOARD_LIMIT = 2000

// ---------------------------------------------------------------------------
// Territory hub
// ---------------------------------------------------------------------------

/**
 * The hub in exactly TWO POSTs:
 *
 *   1. `insUatDashboard` + the territory identity (the only source of the
 *      county breadcrumb) as two root fields of one operation;
 *   2. exact catalog counts + county/national benchmarks for the headline
 *      datasets, aliased into one operation.
 *
 * The old path (county-dashboard fallback, label lookups, a clamped
 * 2000-row catalog scan for the ribbon) is retired: the hub is LAU-only and
 * counts come from `totalCount` probes, never from scanning pages.
 */
export async function fetchStatisticsTerritoryHubLive(
  siruta: string,
): Promise<StatisticsTerritoryHubResult | null> {
  const normalizedSiruta = siruta.trim()
  if (normalizedSiruta.length === 0) {
    return null
  }

  logger.info('Fetching statistics territory hub', { siruta: normalizedSiruta })

  const { groups, identity: territoryRow } = await fetchStatisticsTerritoryHubData({
    siruta: normalizedSiruta,
  })

  if (!territoryRow && groups.length === 0) {
    return null
  }

  const identity = resolveTerritoryIdentity({
    siruta: normalizedSiruta,
    liveName: territoryRow?.name ?? null,
    liveLevel: territoryRow?.level ?? null,
    liveCountyName: territoryRow?.countyName ?? null,
    liveCountyCode: territoryRow?.countyCode ?? null,
  })

  // POST 2 is enrichment: its failure degrades to tiles-without-benchmarks
  // and a hidden ribbon, never a blank hub.
  let context: Awaited<ReturnType<typeof fetchStatisticsTerritoryHubContext>> | null =
    null
  try {
    context = await fetchStatisticsTerritoryHubContext({
      countyCode: territoryRow?.countyCode ?? null,
      benchmarkCodes: LANDING_NATIONAL_DATASET_CODES,
    })
  } catch (error) {
    logger.warn('Hub context (counts + benchmarks) unavailable', {
      siruta: normalizedSiruta,
      error,
    })
  }

  const benchmarks: Record<string, StatisticsTileBenchmark> = {}
  for (const code of LANDING_NATIONAL_DATASET_CODES) {
    const county =
      context?.county.find((value) => value.datasetCode === code) ?? null
    const national =
      context?.national.find((value) => value.datasetCode === code) ?? null
    if (county?.hasData || national?.hasData) {
      benchmarks[code] = {
        county: county?.hasData ? county : null,
        national: national?.hasData ? national : null,
      }
    }
  }

  const tiles = buildIndicatorTiles(groups)
  const totalObservations = groups.reduce(
    (total, group) => total + group.observations.length,
    0,
  )

  return {
    identity,
    tiles,
    availableDatasetCodes: groups
      .filter((group) => getDatasetDataStatus(group.dataset) === 'available')
      .map((group) => group.dataset.code),
    coverage: context
      ? {
          availableDatasetCount: context.loadedCount,
          totalDatasetCount: context.catalogCount,
          catalogOnlyDatasetCount: Math.max(
            context.catalogCount - context.loadedCount,
            0,
          ),
          partial: false,
        }
      : null,
    relatedLinks: buildTerritoryRelatedLinks({ identity }),
    latestDataPeriod: resolveHubLatestPeriod(groups),
    partial: totalObservations >= UAT_DASHBOARD_LIMIT,
    benchmarks,
  }
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

function resolveHubLatestPeriod(
  groups: readonly InsUatDatasetGroup[],
): string | null {
  let latest: string | null = null
  let latestKey = Number.NEGATIVE_INFINITY

  for (const group of groups) {
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

  const envelope = await parseDatasetRequestEnvelope(response)

  // The REST contract answers { ok: boolean } on EVERY status — a 2xx body
  // can still carry ok:false, so acceptance reads the envelope, never the
  // HTTP status alone.
  if (!response.ok || envelope?.ok !== true) {
    logger.warn('Dataset request rejected', {
      datasetCode: payload.datasetCode,
      status: response.status,
      envelopeError: envelope?.error ?? null,
    })

    return {
      accepted: false,
      datasetCode: payload.datasetCode,
      message:
        response.status === 429
          ? t`Prea multe cereri într-un minut. Așteaptă puțin și încearcă din nou.`
          : response.status === 400 || envelope?.error === 'ValidationError'
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

const datasetRequestEnvelopeSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
  message: z.string().optional(),
})

/** Body-parse failure yields null: an unreadable envelope is a rejection. */
async function parseDatasetRequestEnvelope(
  response: Response,
): Promise<z.infer<typeof datasetRequestEnvelopeSchema> | null> {
  try {
    const body: unknown = await response.json()
    return datasetRequestEnvelopeSchema.parse(body)
  } catch {
    return null
  }
}
