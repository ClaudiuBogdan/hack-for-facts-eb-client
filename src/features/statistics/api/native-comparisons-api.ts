import { ComparisonDatasetError } from '../lib/comparison-dataset-error'
import {
  insSourceDescriptorSchema,
  normalizeInsDatasetCode,
} from '@/lib/ins/source-contract'
import { sourcePinsFilter } from '@/lib/ins/source-pins'
import { InsSourcePageError } from '@/lib/ins/source-pages'
import { resolveComparisonDefaults } from '../lib/comparison-defaults'
import {
  comparisonPublicationKey,
  projectNativeComparison,
} from '../lib/native-comparison'
import { resolveComparisonTerritories } from '../lib/comparison-territories'
import { getInsDatasetDetails } from './graphql/ins-bootstrap-fetchers'
import { fetchInsComparisonDefaults } from './graphql/ins-comparison-defaults'
import { fetchInsSourceVector } from './graphql/ins-source-fetcher'

export interface NativeComparisonRequest {
  readonly code: string
  readonly territories: unknown
  readonly classifications?: unknown
  readonly unit?: unknown
  readonly cadence?: unknown
}

/** One preparation per selection. Explicit source intent never borrows unrelated defaults. */
export async function prepareNativeComparison(
  input: NativeComparisonRequest,
  signal?: AbortSignal,
) {
  const datasetCode = normalizeInsDatasetCode(input.code)
  const selection = resolveComparisonTerritories(input.territories)
  if (!datasetCode || !selection.valid || selection.tokens.length === 0)
    throw new Error('Invalid INS comparison dataset or territories')
  const explicit =
    input.classifications !== undefined ||
    input.unit !== undefined ||
    input.cadence !== undefined
  const bootstrap = explicit
    ? null
    : await fetchInsComparisonDefaults({
        datasetCode,
        entities: selection.tokens.map((token) =>
          token.level === 'LAU'
            ? { sirutaCode: token.code }
            : { territoryCode: token.code, territoryLevel: token.level },
        ),
        signal,
      })
  const dataset =
    bootstrap?.dataset ?? (await getInsDatasetDetails(datasetCode, signal))
  if (!dataset) throw new ComparisonDatasetError('UNKNOWN')
  if (dataset.data_status === 'CATALOG_ONLY')
    throw new ComparisonDatasetError('CATALOG_ONLY')
  const descriptor = insSourceDescriptorSchema.parse(dataset)
  const resolved = resolveComparisonDefaults({
    dataset,
    latest: bootstrap?.latest ?? [],
    classifications: input.classifications,
    unit: input.unit,
    cadence: input.cadence,
  })
  return {
    dataset,
    descriptor,
    tokens: selection.tokens,
    latest: bootstrap?.latest ?? [],
    resolved,
  }
}

/** One complete vector per selection. Display-period changes do not perform network reads. */
export async function fetchNativeComparisonVector(
  prepared: Awaited<ReturnType<typeof prepareNativeComparison>>,
  signal?: AbortSignal,
) {
  const { resolved, descriptor, tokens } = prepared
  if (!resolved.ready || resolved.unit === null || resolved.cadence === null)
    throw new Error(
      'Choose complete INS comparison source coordinates, unit and cadence',
    )
  const pins = sourcePinsFilter(resolved.pins)
  const vector = await fetchInsSourceVector({
    datasetCode: descriptor.code,
    filter: {
      territoryCodes: tokens.map((token) => token.code),
      ...(pins.length > 0 && { sourcePins: pins }),
      unitCodes: [resolved.unit],
    },
    signal,
  })
  if (
    comparisonPublicationKey(vector.descriptor) !==
    comparisonPublicationKey(descriptor)
  )
    throw new InsSourcePageError('PUBLICATION_CHANGED')
  // Cadence is a local selection: the wire has no cadence filter. All source
  // alternatives are inspected across the complete history before projection.
  return { ...vector, prepared }
}

export function projectPreparedComparison(
  result: Awaited<ReturnType<typeof fetchNativeComparisonVector>>,
  requestedPeriod?: string,
) {
  const { prepared, descriptor, observations } = result
  const { resolved, tokens } = prepared
  if (resolved.cadence === null)
    throw new Error('Missing INS comparison cadence')
  return projectNativeComparison({
    descriptor,
    observations,
    expectedDescriptor: prepared.descriptor,
    territories: tokens,
    classificationPins:
      resolved.pins.size === 0
        ? undefined
        : [...resolved.pins].map(([type, code]) => `${type}:${code}`),
    unitCode: resolved.unit,
    cadence: resolved.cadence,
    requestedPeriod,
  })
}
