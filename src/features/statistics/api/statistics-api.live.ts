import { selectInsPeriodObservation } from '@/lib/ins/source-period'
import { isInsChartPeriodicity } from '@/lib/ins/source-contract'
import { t } from '@lingui/core/macro'
import { z } from 'zod'
import {
  fetchStatisticsTerritoryHubContext,
  fetchStatisticsTerritoryHubData,
} from '@/features/statistics/api/graphql/statistics-fetchers'
import { API_FETCH_REFERRER_POLICY } from '@/lib/api/fetch-options'
import { getAuthToken } from '@/lib/auth'
import { getApiBaseUrl } from '@/config/env'
import { isGraphQLInvalidInput } from '@/lib/graphql/graphql-client'
import { createLogger } from '@/lib/logger'
import type { InsPeriodicity, NativeInsUatDatasetGroup } from '@/schemas/ins'
import type {
  DatasetRequestPayload,
  DatasetRequestResult,
  StatisticsIndicatorTile,
  StatisticsTerritoryHubResult,
  StatisticsTileBenchmark,
} from '@/schemas/statistics'
import { getDatasetDataStatus } from '../lib/dataset-status'
import { TERRITORY_HEADLINE_CODES } from '../lib/territory-groups'
import { getLatestTimePeriod, periodSortKey, resolveLatestPeriod } from '../lib/period'
import { resolveTerritoryIdentity } from '../lib/territory'

const logger = createLogger('statistics-api-live')

// ---------------------------------------------------------------------------
// Territory hub
// ---------------------------------------------------------------------------

/**
 * The hub in exactly TWO POSTs:
 *
 *   1. `insUatDashboard` + the territory identity (the only source of the
 *      county breadcrumb) as two root fields of one operation;
 *   2. the county and national references for the headline datasets,
 *      aliased into one operation.
 *
 * Both read only the fields the page shows and the certification checks
 * (`TERRITORY_DATASET_FIELDS`, `TERRITORY_OBSERVATION_FIELDS`); the old
 * exhaustive fragments cost 4.7 MB per territory.
 */
export async function fetchStatisticsTerritoryHubLive(
  siruta: string,
  signal?: AbortSignal,
): Promise<StatisticsTerritoryHubResult | null> {
  const normalizedSiruta = siruta.trim()
  if (normalizedSiruta.length === 0) {
    return null
  }

  logger.info('Fetching statistics territory hub', { siruta: normalizedSiruta })

  let read: Awaited<ReturnType<typeof fetchStatisticsTerritoryHubData>>
  try {
    read = await fetchStatisticsTerritoryHubData({ siruta: normalizedSiruta, signal })
  } catch (error) {
    // The server refuses a code that names no INS territory — a mistyped or
    // crawled address, a Bucharest sector — as invalid input, before any
    // `null` could come back. That is the not-found the contract promises.
    if (isGraphQLInvalidInput(error)) return null
    throw error
  }
  const { groups, identity: territoryRow } = read

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

  // POST 2 is enrichment: its failure degrades to tiles without references
  // and a note that says so, never a blank hub.
  let context: Awaited<ReturnType<typeof fetchStatisticsTerritoryHubContext>> | null = null
  try {
    context = await fetchStatisticsTerritoryHubContext({
      countyCode: territoryRow?.countyCode ?? null,
      benchmarkCodes: TERRITORY_HEADLINE_CODES,
      signal,
    })
  } catch (error) {
    if (signal?.aborted) throw error
    logger.warn('Hub references (county and national benchmarks) unavailable', {
      siruta: normalizedSiruta,
      error,
    })
  }

  const benchmarks: Record<string, StatisticsTileBenchmark> = {}
  for (const code of TERRITORY_HEADLINE_CODES) {
    const county = context?.county.find((value) => value.datasetCode === code) ?? null
    const national = context?.national.find((value) => value.datasetCode === code) ?? null
    if (county?.hasData || national?.hasData) {
      benchmarks[code] = {
        county: county?.hasData ? county : null,
        national: national?.hasData ? national : null,
      }
    }
  }

  return {
    identity,
    tiles: buildIndicatorTiles(groups),
    latestDataPeriod: resolveHubLatestPeriod(groups),
    benchmarks,
    benchmarksUnavailable: context === null,
  }
}

function buildIndicatorTiles(
  groups: readonly NativeInsUatDatasetGroup[],
): readonly StatisticsIndicatorTile[] {
  return groups.map((group) => {
    const selection = selectInsPeriodObservation(group.observations, group.latestPeriod)
    const latest = selection.status === 'OBSERVATION' ? selection.observation : null
    // The history drawn is the cadence the headline value comes from: a
    // matrix mixing monthly and annual rows keeps its monthly line rather
    // than no line at all. Only a cadence a chart can draw is drawn.
    const cadence: InsPeriodicity | null = latest?.time_period.periodicity ?? null
    const sparklineCadence = cadence !== null && isInsChartPeriodicity(cadence) ? cadence : null
    const dataStatus = getDatasetDataStatus(group.dataset)
    const tileState =
      dataStatus === 'catalog-only'
        ? 'catalog-only'
        : group.status === 'AMBIGUOUS_GEOGRAPHY'
          ? 'ambiguous'
          : selection.status === 'AMBIGUOUS'
            ? 'period-ambiguous'
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
      truncated: group.truncated,
      observations: [...group.observations]
        .sort((left, right) => periodSortKey(left.time_period) - periodSortKey(right.time_period))
        .map((row) => ({
          time_period: row.time_period,
          value: row.value,
          valueStatus: row.value_status ?? null,
        })),
      sparklineCadence,
      value: latest?.value ?? null,
      valueStatus: latest?.value_status ?? null,
      unitSymbol: latest?.unit?.symbol ?? null,
      unitNameRo: latest?.unit?.name_ro ?? null,
      unitNameEn: latest?.unit?.name_en ?? null,
      latestPeriod: latest?.time_period.iso_period ?? null,
      latestYear: latest?.time_period.year ?? null,
    }
  })
}

function resolveHubLatestPeriod(
  groups: readonly NativeInsUatDatasetGroup[],
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
    const key = latestTimePeriod ? periodSortKey(latestTimePeriod) : 0

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
