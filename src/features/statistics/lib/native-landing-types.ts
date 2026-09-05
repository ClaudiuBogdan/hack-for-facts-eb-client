import type { InsSourceDescriptor } from '@/lib/ins/source-contract'
import type { InsPeriodicity, NativeInsObservation } from '@/schemas/ins'

/** Internal fetcher boundary. Full vectors are validated before building compact SSR results. */
export interface NativeLandingSource {
  readonly descriptor: InsSourceDescriptor
  readonly observations: readonly NativeInsObservation[]
  readonly territories: readonly {
    readonly code: string
    readonly level: string
    readonly name: string | null
  }[]
  readonly classificationPins: readonly string[]
  readonly unitCode: string
  readonly cadence: InsPeriodicity
}

export type NativeLandingProvenance = Omit<NativeLandingSource, 'observations'>

export interface NativeLandingIssue {
  readonly code: string
  readonly observations?: readonly NativeInsObservation[]
  readonly reason:
    'MISSING' | 'AMBIGUOUS' | 'QUALIFIED' | 'STATUS' | 'DENOMINATOR' | 'PERIOD'
}
