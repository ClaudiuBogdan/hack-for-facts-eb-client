import { scrubScopeForAnalysisGrain } from '@/schemas/procurement-hub'
import type { ProcurementAnalysisGrain } from '@/schemas/procurement'

/** The six populations a public buyer can appear in. */
export const INSTITUTION_POPULATION_GRAINS: readonly ProcurementAnalysisGrain[] =
  ['procedure', 'contract', 'direct_acquisition', 'framework', 'calloff', 'modification']

/**
 * One scope per population, scrubbed for what each population actually
 * carries — the server rejects dimensions a population has no column for
 * (frameworks have no supplier, call-offs and modifications no fine CPV), and
 * a single rejected dimension would fail the whole spine operation.
 *
 * Uses the hub's own scrubber so the profile and the hub can never drift.
 */
export function buildInstitutionScopes(
  scope: Record<string, unknown> = {},
): Record<ProcurementAnalysisGrain, Record<string, unknown>> {
  return Object.fromEntries(
    INSTITUTION_POPULATION_GRAINS.map((grain) => [
      grain,
      scrubScopeForAnalysisGrain(scope, grain).scope as Record<string, unknown>,
    ]),
  ) as Record<ProcurementAnalysisGrain, Record<string, unknown>>
}
