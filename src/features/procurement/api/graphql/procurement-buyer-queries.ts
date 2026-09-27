/**
 * GraphQL documents + raw-response Zod schemas for one buyer's page
 * (`/procurement/institutions/$cui`). The profile is three multi-root requests
 * over the buyer's scope (keys, figures with the national months that date
 * SEAP's cutoff, the CPV levels — see `BuyerFieldGroup`) and the budget
 * platform's identity record in a fourth. The follow-up needs the keys and
 * the identity: supplier names, each top supplier's years, the county's
 * total.
 */
import { z } from 'zod'

/** Decimal strings from the API, as numbers; null stays null (unknown, never 0). */
const decimal = z
  .union([z.string(), z.number()])
  .nullable()
  .transform((value) => (value === null ? null : Number(value)))

export const buyerStatsSchema = z.object({
  blocks: z.array(z.object({ recordCount: decimal, withValueCount: decimal, valueAwardedSum: decimal })),
})

export const buyerSeriesSchema = z.array(z.object({ points: z.array(z.object({ bucket: z.string(), value: decimal })).nullable() }))

export const buyerBreakdownSchema = z.array(
  z.object({
    rankedBy: z.string().nullable(),
    buckets: z
      .array(
        z.object({ key: z.string().nullable(), kind: z.string(), recordCount: decimal, withValueCount: decimal.optional(), valueSum: decimal, shareOfScope: decimal }),
      )
      .nullable(),
  }),
)

export const buyerEntitySchema = z
  .object({
    annualPopulation: z.object({ year: z.number(), population: decimal }).nullable().optional(),
    organization: z.object({ name: z.string() }).nullable(),
    territory: z
      .object({ kind: z.string().nullable(), name: z.string(), countyCode: z.string().nullable(), countyName: z.string().nullable() })
      .nullable(),
    reference: z
      .object({ name: z.string().nullable(), address: z.string().nullable(), entityType: z.string().nullable(), isTerritorialExecutive: z.boolean() })
      .nullable(),
    budget: z.object({ presence: z.boolean() }).nullable(),
  })
  .nullable()

/** An identifier the spine cannot resolve (a foreign tax ID) answers `unavailable` with no CUI; the lookup is positional. */
export const buyerLabelsSchema = z.array(z.object({ cui: z.string().nullable(), canonicalName: z.string().nullable(), status: z.string() }))

export type RawBuyerStats = z.infer<typeof buyerStatsSchema>
export type RawBuyerSeries = z.infer<typeof buyerSeriesSchema>
export type RawBuyerBreakdown = z.infer<typeof buyerBreakdownSchema>

const STATS = 'blocks { recordCount withValueCount valueAwardedSum }'
const SERIES = 'points { bucket value }'
const BREAKDOWN = 'rankedBy buckets { key kind recordCount withValueCount valueSum shareOfScope }'

/**
 * Which of the profile's requests a read goes in. The API resolves one
 * request's fields one after another, so the profile is three requests side
 * by side (and the identity a fourth): the keys the follow-up needs
 * (suppliers, the buyer's county) come back first and start it while the
 * figures and the CPV levels are still being read.
 */
export type BuyerFieldGroup = 'keys' | 'figures' | 'categories'

/** One aliased analysis read; the scope is its variable of the same name. */
export interface BuyerField {
  readonly alias: string
  readonly kind: 'stats' | 'series' | 'breakdown'
  readonly scope: Readonly<Record<string, unknown>>
  /** The shape's own arguments (`bucket`/`measure`, `dimension`/`topN`/`rankBy`); enum literals, never input. */
  readonly args?: string
  /** The profile request it belongs to; the follow-up's reads have none. */
  readonly group?: BuyerFieldGroup
}

function fieldOf(field: BuyerField): string {
  if (field.kind === 'stats') return `${field.alias}: procurementStats(scope: $${field.alias}) { ${STATS} }`
  if (field.kind === 'series') return `${field.alias}: procurementSeries(scope: $${field.alias}, ${field.args ?? ''}) { ${SERIES} }`
  return `${field.alias}: procurementBreakdown(scope: $${field.alias}, ${field.args ?? ''}) { ${BREAKDOWN} }`
}

const ENTITY =
  'entity(cui: $entityCui) { annualPopulation(year: $populationYear) { year population } organization { name } territory { kind name countyCode countyName } reference { name address entityType isTerritorialExecutive } budget { presence } }'

/**
 * One of the profile's documents for a list of analysis reads, or the budget
 * platform's identity record alone (its own request, for a CUI the platform
 * can hold). Variables: one scope per alias, or `entityCui`/`populationYear`.
 */
export function procurementBuyerQuery(operationName: string, fields: readonly BuyerField[], withEntity: boolean): string {
  const declarations = fields.map((field) => `$${field.alias}: ProcurementAnalysisScopeInput!`)
  if (withEntity) declarations.push('$entityCui: CUI!', '$populationYear: Int!')
  const body = fields.map(fieldOf)
  if (withEntity) body.push(ENTITY)
  return `query ${operationName}(${declarations.join(', ')}) {\n  ${body.join('\n  ')}\n}`
}

/** The follow-up: supplier names, each top supplier's years, the county's direct purchases. */
export function procurementBuyerExtrasQuery(fields: readonly BuyerField[]): string {
  const declarations = [...fields.map((field) => `$${field.alias}: ProcurementAnalysisScopeInput!`), '$cuis: [String!]!']
  const body = [...fields.map(fieldOf), 'labels: organizationLabels(cuis: $cuis) { cui canonicalName status }']
  return `query ProcurementBuyerExtras(${declarations.join(', ')}) {\n  ${body.join('\n  ')}\n}`
}
