import { z } from 'zod'
import {
  insSourceDescriptorSchema,
  validInsSourceWitnesses,
} from './source-contract'
import { inspectSourceSeries } from './source-series'

type OutcomeBase = {
  readonly dataset: unknown
  readonly latestPeriod: string | null
  readonly geographicWitnesses: unknown
}
type SourceCell = { readonly time_period: { readonly iso_period: string } }

/** Wire-shape schemas run first; these checks enforce relationships between fields. */
export function validateInsLatestOutcome(
  outcome: OutcomeBase & {
    readonly matchStrategy: string
    readonly hasData: boolean
    readonly observation: SourceCell | null
  },
): string | null {
  const datasetError = validateDataset(
    outcome.dataset,
    outcome.matchStrategy === 'NO_DATA',
  )
  if (datasetError) return datasetError
  const ambiguous = outcome.matchStrategy === 'AMBIGUOUS_GEOGRAPHY'
  if (
    !validInsSourceWitnesses({
      descriptor: outcome.dataset,
      ambiguous,
      witnesses: outcome.geographicWitnesses,
    })
  )
    return 'Latest outcome has invalid geographic witnesses'
  if (ambiguous || outcome.matchStrategy === 'NO_DATA') {
    return outcome.observation === null &&
      !outcome.hasData &&
      outcome.latestPeriod === null
      ? null
      : 'Unavailable latest outcome contains an observation or period'
  }
  if (
    !outcome.hasData ||
    outcome.observation === null ||
    outcome.latestPeriod !== outcome.observation.time_period.iso_period
  ) {
    return 'Latest success contradicts its observation or period'
  }
  return validateDefaultSeries(outcome.dataset, [outcome.observation])
}

export function validateInsDashboardOutcome(
  outcome: OutcomeBase & {
    readonly status: 'SERIES' | 'AMBIGUOUS_GEOGRAPHY'
    readonly observations: readonly SourceCell[]
    readonly truncated: boolean
  },
): string | null {
  const datasetError = validateDataset(outcome.dataset, false)
  if (datasetError) return datasetError
  const ambiguous = outcome.status === 'AMBIGUOUS_GEOGRAPHY'
  if (
    !validInsSourceWitnesses({
      descriptor: outcome.dataset,
      ambiguous,
      witnesses: outcome.geographicWitnesses,
    })
  )
    return 'Dashboard outcome has invalid geographic witnesses'
  if (ambiguous) {
    return outcome.observations.length === 0 &&
      outcome.latestPeriod === null &&
      !outcome.truncated
      ? null
      : 'Ambiguous dashboard contains observations, a period or truncation'
  }
  if (
    outcome.observations.length === 0 ||
    outcome.latestPeriod !== outcome.observations[0]?.time_period.iso_period
  ) {
    return 'Dashboard series contradicts its observations or latest period'
  }
  return validateDefaultSeries(outcome.dataset, outcome.observations)
}

function validateDefaultSeries(
  descriptor: unknown,
  observations: readonly unknown[],
): string | null {
  const source = inspectSourceSeries({ descriptor, observations })
  // Default/latest selectors describe modern exact geography. Qualified source
  // cells remain available through explicitly selected observation vectors.
  return source.status === 'SERIES' && !source.anyQualified
    ? null
    : 'Default outcome is not one complete, unqualified source series'
}

const datasetStatusSchema = z.object({
  data_status: z.enum(['AVAILABLE', 'CATALOG_ONLY']),
})
function validateDataset(
  dataset: unknown,
  allowCatalog: boolean,
): string | null {
  const status = datasetStatusSchema.safeParse(dataset)
  if (!status.success)
    return 'Outcome dataset must declare its native data status'
  if (status.data.data_status === 'CATALOG_ONLY') {
    return allowCatalog
      ? null
      : 'Catalog-only dataset cannot supply a default source outcome'
  }
  return insSourceDescriptorSchema.safeParse(dataset).success
    ? null
    : 'Available outcome requires a certified dataset descriptor'
}
