import { z } from 'zod'

/**
 * The legislation analytics API (`GET /api/v1/legal/analytics/:view`, server
 * `modules/legal/core/analytics/types.ts`): the published insights layer of
 * legal_v2_analytics. Counts only, never shares: every answer carries its
 * denominator (`total`), the population and the uncertain and unplaced
 * remainders, and the page divides. Value lists (Felul groups and kinds,
 * weak bases, issuer families) come from the layer's own head.
 */

export const LEGAL_ANALYTICS_VIEWS = ['head', 'summary', 'breakdown', 'series', 'grid', 'links', 'acts'] as const
export type LegalAnalyticsView = (typeof LEGAL_ANALYTICS_VIEWS)[number]

export const LEGAL_ANALYTICS_LENSES = ['felul', 'kind', 'issuer', 'family', 'type', 'versions', 'year'] as const
export type LegalAnalyticsLens = (typeof LEGAL_ANALYTICS_LENSES)[number]

export const LEGAL_ANALYTICS_ORDERS = ['amended', 'court', 'versions', 'cited', 'year'] as const
export type LegalAnalyticsOrder = (typeof LEGAL_ANALYTICS_ORDERS)[number]

/** The arguments the API takes (absent = its default); the page's question maps onto these. */
export type LegalAnalyticsArgs = {
  readonly population?: 'flow' | 'stock'
  readonly from?: number
  readonly to?: number
  readonly type?: readonly string[]
  readonly issuer?: string
  readonly family?: string
  readonly felul?: string
  readonly versions?: number
  readonly lens?: LegalAnalyticsLens
  readonly by?: LegalAnalyticsLens
  readonly limit?: number
  readonly top?: number
  readonly order?: LegalAnalyticsOrder
  readonly cursor?: string
}

const count = z.number().int().nonnegative()
const keyCount = z.object({ key: z.string().nullable(), acts: count })
/** A lens value (null: none, e.g. no issuer, unknown year) and its acts. */
export type LegalAnalyticsCount = z.infer<typeof keyCount>

export const legalAnalyticsLayerSchema = z.object({
  layerId: z.string(),
  releaseId: z.string(),
  builtAt: z.string(),
  publishedAt: z.string(),
  releaseBuiltAt: z.string(),
  releasePublishedAt: z.string(),
})
export type LegalAnalyticsLayer = z.infer<typeof legalAnalyticsLayerSchema>

const denominators = {
  total: count,
  population: count,
  uncertain: count,
  unplaced: count,
}

export const legalAnalyticsHeadSchema = z.object({
  layer: legalAnalyticsLayerSchema,
  rules: z.record(z.string(), z.string()),
  values: z.object({
    felulGroups: z.array(z.string()),
    felulKinds: z.record(z.string(), z.string()),
    stockKinds: z.array(z.string()),
    weakBases: z.array(z.string()),
    issuerFamilies: z.array(z.string()),
    linkKinds: z.array(z.string()),
    linkNotes: z.array(z.string()),
  }),
  total: count,
  population: count,
  totals: z.object({
    acts: count,
    actsWithText: count,
    inStock: count,
    uncertain: count,
    unplaced: count,
  }),
  types: z.array(keyCount),
  issuerCount: count,
  issuers: z.array(z.object({ lineage: z.string(), families: z.array(z.string()), acts: count })),
  years: z.object({ min: z.number().int().nullable(), max: z.number().int().nullable() }),
})
export type LegalAnalyticsHead = z.infer<typeof legalAnalyticsHeadSchema>

export const legalAnalyticsSummarySchema = z.object({
  ...denominators,
  withText: count,
  withVersions: count,
  felul: z.array(keyCount),
})
export type LegalAnalyticsSummary = z.infer<typeof legalAnalyticsSummarySchema>

export const legalAnalyticsBreakdownSchema = z.object({
  ...denominators,
  lens: z.enum(LEGAL_ANALYTICS_LENSES),
  rows: z.array(keyCount),
  rest: z.number().int(),
  truncated: z.boolean(),
})
export type LegalAnalyticsBreakdown = z.infer<typeof legalAnalyticsBreakdownSchema>

export const legalAnalyticsSeriesSchema = z.object({
  ...denominators,
  lens: z.enum(LEGAL_ANALYTICS_LENSES),
  keys: z.array(z.string().nullable()),
  years: z.array(z.object({ year: z.number().int(), acts: z.array(count) })),
  restKey: z.literal(true),
  unknownYear: count,
})
export type LegalAnalyticsSeries = z.infer<typeof legalAnalyticsSeriesSchema>

export const legalAnalyticsGridSchema = z.object({
  ...denominators,
  lens: z.enum(LEGAL_ANALYTICS_LENSES),
  by: z.enum(LEGAL_ANALYTICS_LENSES),
  rows: z.array(keyCount),
  cols: z.array(keyCount),
  cells: z.array(z.array(count)),
})
export type LegalAnalyticsGrid = z.infer<typeof legalAnalyticsGridSchema>

/** An act id is the server's decimal bigint string. Links are built from it, so nothing else passes: a slash or a „?" would change where the link leads. */
const actId = z.string().regex(/^\d+$/u)
const actRef = z.object({ actId, citation: z.string(), title: z.string().nullable() })
export type LegalAnalyticsActRef = z.infer<typeof actRef>

export const legalAnalyticsLinksSchema = z.object({
  ...denominators,
  daysMeasure: z.string(),
  byKind: z.array(z.object({ kind: z.string(), note: z.string(), links: count })),
  amends: z.array(z.object({ sourceBand: z.string(), target: z.string(), links: count })),
  topTargets: z.array(z.object({ kind: z.string(), target: actRef, links: count })),
  days: z.array(
    z.object({
      kind: z.string(),
      links: count,
      p25: z.number().int().nullable(),
      median: z.number().int().nullable(),
      p75: z.number().int().nullable(),
    }),
  ),
})
export type LegalAnalyticsLinks = z.infer<typeof legalAnalyticsLinksSchema>

export const legalAnalyticsActRowSchema = actRef.extend({
  year: z.number().int().nullable(),
  type: z.string(),
  issuer: z.string().nullable(),
  family: z.string(),
  felul: z.string(),
  kind: z.string(),
  guess: z.object({ group: z.string(), kind: z.string() }).nullable(),
  amended: count,
  court: count,
  versions: count,
  cited: count,
  hasText: z.boolean(),
})
export type LegalAnalyticsActRow = z.infer<typeof legalAnalyticsActRowSchema>

export const legalAnalyticsActsSchema = z.object({
  ...denominators,
  order: z.enum(LEGAL_ANALYTICS_ORDERS),
  rows: z.array(legalAnalyticsActRowSchema),
  hidden: count,
  next: z.string().nullable(),
})
export type LegalAnalyticsActs = z.infer<typeof legalAnalyticsActsSchema>

export const LEGAL_ANALYTICS_DATA_SCHEMAS = {
  head: legalAnalyticsHeadSchema,
  summary: legalAnalyticsSummarySchema,
  breakdown: legalAnalyticsBreakdownSchema,
  series: legalAnalyticsSeriesSchema,
  grid: legalAnalyticsGridSchema,
  links: legalAnalyticsLinksSchema,
  acts: legalAnalyticsActsSchema,
} as const

export type LegalAnalyticsData<V extends LegalAnalyticsView> = z.infer<(typeof LEGAL_ANALYTICS_DATA_SCHEMAS)[V]>

/** One answer: the view's data, the layer it was read from and the canonical arguments. */
export type LegalAnalyticsAnswer<V extends LegalAnalyticsView> = {
  readonly data: LegalAnalyticsData<V>
  readonly layer: LegalAnalyticsLayer
  readonly args: Readonly<Record<string, unknown>>
}

export const legalAnalyticsMetaSchema = z.object({
  view: z.enum(LEGAL_ANALYTICS_VIEWS),
  layer: legalAnalyticsLayerSchema,
  args: z.record(z.string(), z.unknown()),
})
