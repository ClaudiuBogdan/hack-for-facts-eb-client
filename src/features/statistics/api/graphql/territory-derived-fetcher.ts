import { z } from 'zod'
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { BLOCKING_VALUE_STATUSES, publishedNumber } from '../../lib/value-status'
import {
  DERIVED_FIRST_YEAR,
  DERIVED_READS,
  derivedReadKey,
  type DerivedRead,
  type DerivedScopeData,
} from '../../lib/territory-derived'

/**
 * One scope's inputs for the normalized indicators (`lib/territory-derived.ts`):
 * every matrix the indicators read, pinned to its member, as one aliased
 * document — the place by SIRUTA, or a county or Romania by code.
 *
 * Three scopes are three documents, read in parallel: measured on the dev
 * API, one document of 48 aliases took 3.5–4.7 s and three of 16 took 1.6 s
 * together. The filters travel as variables; the dataset codes are this
 * module's own constants.
 *
 * A cell reads through `publishedNumber`: one flagged as having no number
 * („c", „x", „:") is no number, never zero. Any other flag travels with its
 * cell, for the figure to carry.
 */
export function buildTerritoryDerivedQuery(reads: readonly DerivedRead[]): string {
  const variables = reads.map((_, index) => `$f${index}: InsObservationFilterInput`).join(', ')
  const fields = reads
    .map(
      (r, index) =>
        `r${index}: insObservations(datasetCode: "${r.code}", filter: $f${index}, limit: 100) { nodes { value value_status time_period { year } } }`,
    )
    .join('\n    ')
  return `query TerritoryDerivedIndicators(${variables}) {\n    ${fields}\n  }`
}

const derivedAliasSchema = z
  .object({
    nodes: z.array(
      z.object({
        value: z.string().nullable(),
        value_status: z.string().nullish(),
        time_period: z.object({ year: z.number().int() }),
      }),
    ),
  })
  .nullable()

const derivedResponseSchema = z.record(z.string(), derivedAliasSchema)

export type TerritoryDerivedScopeFilter =
  | { readonly sirutaCodes: readonly [string] }
  | { readonly territoryCodes: readonly [string] }

export async function fetchTerritoryDerivedScope(params: {
  readonly scope: TerritoryDerivedScopeFilter
  readonly lastYear: number
  readonly signal?: AbortSignal
}): Promise<DerivedScopeData> {
  const variables: Record<string, unknown> = {}
  DERIVED_READS.forEach((r, index) => {
    variables[`f${index}`] = {
      ...params.scope,
      sourcePins: r.pins,
      period: {
        type: 'YEAR',
        selection: { interval: { start: String(DERIVED_FIRST_YEAR), end: String(params.lastYear) } },
      },
    }
  })
  const response = await graphqlQuery<unknown>(buildTerritoryDerivedQuery(DERIVED_READS), variables, {
    auth: 'none',
    signal: params.signal,
    operationName: 'TerritoryDerivedIndicators',
  })
  const parsed = derivedResponseSchema.parse(response)
  const series = new Map<string, Map<number, number | null>>()
  const flags = new Map<string, Map<number, string>>()
  DERIVED_READS.forEach((r, index) => {
    const values = new Map<number, number | null>()
    const flagged = new Map<number, string>()
    for (const node of parsed[`r${index}`]?.nodes ?? []) {
      const year = node.time_period.year
      values.set(year, publishedNumber(node.value, node.value_status))
      const status = node.value_status?.trim().toLowerCase()
      if (status && !BLOCKING_VALUE_STATUSES.has(status)) flagged.set(year, status)
    }
    series.set(derivedReadKey(r), values)
    if (flagged.size > 0) flags.set(derivedReadKey(r), flagged)
  })
  return { series, flags }
}
