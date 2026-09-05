import { insSourceDescriptorSchema } from '@/lib/ins/source-contract'
import { inspectSourceSeries } from '@/lib/ins/source-series'
import type { InsObservation, NativeInsObservation } from '@/schemas/ins'

/** Validate identity while retaining the original value, labels and provenance. */
export function validatedSourceRows(
  descriptor: unknown,
  observations: readonly InsObservation[],
) {
  const source = insSourceDescriptorSchema.parse(descriptor)
  if (
    inspectSourceSeries({ descriptor: source, observations }).status ===
      'INVALID' ||
    observations.some(
      (row) => row.value !== null && typeof row.value !== 'string',
    )
  ) {
    throw new Error('Invalid native INS source observations')
  }
  return {
    descriptor: source,
    observations: observations as readonly NativeInsObservation[],
  }
}
