import { z } from 'zod'

/**
 * Public enterprises (OUG 109 / AMEPIP) domain schemas.
 *
 * Mock-first only: the AMEPIP core scraper is live but the client API is not
 * connected yet. Every fixture must declare an explicit `dataStatus` and a
 * `sourceLineage` so the UI never implies live data when it is sampling mocks.
 *
 * Numeric indicator values are rendered as recorded by AMEPIP. The client does
 * not apply percent/currency scaling: 0.0425 with `%` stays `0,0425 %`.
 * Rows such as `mii RON` are source-labelled AMEPIP form indicators, not a
 * replacement for ONRC/ANAF accounting data.
 */

// ---------------------------------------------------------------------------
// Data status + source lineage
// ---------------------------------------------------------------------------

export const dataStatusSchema = z.enum([
  'live',
  'partial',
  'gated',
  'mock',
  'stale',
  'empty',
  'sample',
])

export type DataStatus = z.infer<typeof dataStatusSchema>

/**
 * How a fixture / response was produced. `mode` is the explicit marker that
 * prevents mocks from ever being mistaken for live evidence.
 */
export const sourceLineageModeSchema = z.enum(['live', 'sample', 'mock'])
export type SourceLineageMode = z.infer<typeof sourceLineageModeSchema>

export const sourceLineageSchema = z.object({
  sourceName: z.string(),
  sourceLabel: z.string(),
  snapshotId: z.string().nullable(),
  workbookSha256: z.string().nullable(),
  workbookDate: z.string().nullable(),
  acceptedAt: z.string().nullable(),
  loadedAt: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  license: z.string().nullable(),
  mode: sourceLineageModeSchema,
  /** Optional row-level provenance fields preserved for evidence panels. */
  sheet: z.string().nullable().optional(),
  rowKey: z.string().nullable().optional(),
  rowCount: z.number().int().nullable().optional(),
})

export type SourceLineage = z.infer<typeof sourceLineageSchema>

// ---------------------------------------------------------------------------
// Lane availability (deploy-gated supplemental lanes)
// ---------------------------------------------------------------------------

export const publicEnterpriseLaneIdSchema = z.enum([
  'amepip-core',
  'controlling-authority',
  'regas-state-aid',
  'bvb-market',
  'sanctions',
  'governance-docs',
])
export type PublicEnterpriseLaneId = z.infer<
  typeof publicEnterpriseLaneIdSchema
>

export const laneAvailabilitySchema = z.object({
  laneId: publicEnterpriseLaneIdSchema,
  available: z.boolean(),
  dataStatus: dataStatusSchema,
  /** Scraper dataset id backing this lane, for catalog cross-reference. */
  datasetId: z.string(),
  reason: z.string().nullable().optional(),
})

export type LaneAvailability = z.infer<typeof laneAvailabilitySchema>

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export const enterpriseLinkStatusSchema = z.enum([
  'linked',
  'partial',
  'unlinked',
  'unknown',
])
export type EnterpriseLinkStatus = z.infer<typeof enterpriseLinkStatusSchema>

export const enterpriseIdentitySchema = z.object({
  cui: z.string(),
  /** ONRC registration code, e.g. J1997009601400. Source-labelled, not joined. */
  registration: z.string().nullable(),
  legalName: z.string(),
  legalForm: z.string().nullable(),
  status: z
    .object({
      code: z.string(),
      label: z.string(),
    })
    .nullable(),
  caen: z
    .object({
      code: z.string(),
      label: z.string().nullable(),
    })
    .nullable(),
  /** Honesty marker: AMEPIP identity is source-labelled evidence. */
  onrcLinkStatus: enterpriseLinkStatusSchema,
  anafLinkStatus: enterpriseLinkStatusSchema,
  county: z.string().nullable(),
  locality: z.string().nullable(),
  /** BVB listing flag surfaced from AMEPIP core. */
  listed: z.boolean().nullable(),
  ticker: z.string().nullable(),
  isin: z.string().nullable(),
})

export type EnterpriseIdentity = z.infer<typeof enterpriseIdentitySchema>

// ---------------------------------------------------------------------------
// Indicator values — discriminated union on valueKind
// ---------------------------------------------------------------------------

export const indicatorValueKindSchema = z.enum(['number', 'boolean', 'text', 'empty'])
export type IndicatorValueKind = z.infer<typeof indicatorValueKindSchema>

export const indicatorSourceSheetSchema = z.enum(['calculated', 'form'])
export type IndicatorSourceSheet = z.infer<typeof indicatorSourceSheetSchema>

const indicatorRowBaseSchema = z.object({
  cui: z.string(),
  year: z.string(),
  indicator: z.string(),
  indicatorLabel: z.string().nullable(),
  /** KPI short code, e.g. "MS". May be null when the workbook omits it. */
  kpiCode: z.string().nullable(),
  measureUnit: z.string().nullable(),
  sourceSheet: indicatorSourceSheetSchema,
  warnings: z.array(z.string()).default([]),
})

export const indicatorNumberRowSchema = indicatorRowBaseSchema.extend({
  valueKind: z.literal('number'),
  numericValue: z.number(),
  booleanValue: z.null(),
  rawValue: z.string().nullable(),
})

export const indicatorBooleanRowSchema = indicatorRowBaseSchema.extend({
  valueKind: z.literal('boolean'),
  numericValue: z.null(),
  booleanValue: z.boolean(),
  rawValue: z.string().nullable(),
})

export const indicatorTextRowSchema = indicatorRowBaseSchema.extend({
  valueKind: z.literal('text'),
  numericValue: z.null(),
  booleanValue: z.null(),
  rawValue: z.string(),
})

export const indicatorEmptyRowSchema = indicatorRowBaseSchema.extend({
  valueKind: z.literal('empty'),
  numericValue: z.null(),
  booleanValue: z.null(),
  rawValue: z.null(),
})

export const indicatorValueRowSchema = z.discriminatedUnion('valueKind', [
  indicatorNumberRowSchema,
  indicatorBooleanRowSchema,
  indicatorTextRowSchema,
  indicatorEmptyRowSchema,
])

export type IndicatorValueRow = z.infer<typeof indicatorValueRowSchema>
export type IndicatorNumberRow = z.infer<typeof indicatorNumberRowSchema>
export type IndicatorBooleanRow = z.infer<typeof indicatorBooleanRowSchema>
export type IndicatorTextRow = z.infer<typeof indicatorTextRowSchema>
export type IndicatorEmptyRow = z.infer<typeof indicatorEmptyRowSchema>

// ---------------------------------------------------------------------------
// Indicator dictionary
// ---------------------------------------------------------------------------

export const indicatorDictEntrySchema = z.object({
  indicator: z.string(),
  label: z.string(),
  kpiCode: z.string().nullable(),
  measureUnit: z.string().nullable(),
  description: z.string().nullable(),
  /** Headline display priority; lower comes first. Null = not a headline. */
  headlinePriority: z.number().int().nullable(),
})

export type IndicatorDictEntry = z.infer<typeof indicatorDictEntrySchema>

// ---------------------------------------------------------------------------
// Enterprise indicators bundle
// ---------------------------------------------------------------------------

export const enterpriseIndicatorsSchema = z.object({
  cui: z.string(),
  dataStatus: dataStatusSchema,
  lineage: sourceLineageSchema,
  rows: z.array(indicatorValueRowSchema),
  dictionary: z.array(indicatorDictEntrySchema).default([]),
  /** Distinct years present across rows, sorted ascending. */
  years: z.array(z.string()).default([]),
})

export type EnterpriseIndicators = z.infer<typeof enterpriseIndicatorsSchema>

// ---------------------------------------------------------------------------
// Profile (no sanctions responsible person/role — raw-only, never in UI)
// ---------------------------------------------------------------------------

export const publicEnterpriseProfileSchema = z.object({
  cui: z.string(),
  identity: enterpriseIdentitySchema,
  dataStatus: dataStatusSchema,
  lineage: sourceLineageSchema,
  lanes: z.array(laneAvailabilitySchema).default([]),
  indicators: enterpriseIndicatorsSchema,
  /** Supplemental lane evidence is deploy-gated; surfaces only availability. */
  stateAidSummary: z
    .object({
      dataStatus: dataStatusSchema,
      count: z.number().int().nullable(),
    })
    .nullable(),
  bvbSummary: z
    .object({
      dataStatus: dataStatusSchema,
      ticker: z.string().nullable(),
    })
    .nullable(),
  sanctionsSummary: z
    .object({
      dataStatus: dataStatusSchema,
      hasSanctions: z.boolean().nullable(),
    })
    .nullable(),
  governanceSummary: z
    .object({
      dataStatus: dataStatusSchema,
      documentsCount: z.number().int().nullable(),
    })
    .nullable(),
  authoritySummary: z
    .object({
      dataStatus: dataStatusSchema,
      controllingAuthority: z.string().nullable(),
      subordination: z.string().nullable(),
      aptType: z.string().nullable(),
    })
    .nullable(),
})

export type PublicEnterpriseProfile = z.infer<
  typeof publicEnterpriseProfileSchema
>

// ---------------------------------------------------------------------------
// Landing summary
// ---------------------------------------------------------------------------

export const publicEnterpriseLandingSummarySchema = z.object({
  dataStatus: dataStatusSchema,
  lineage: sourceLineageSchema,
  totalEnterprises: z.number().int(),
  listedCount: z.number().int().nullable(),
  byStatus: z
    .array(
      z.object({
        status: z.string(),
        count: z.number().int(),
      }),
    )
    .default([]),
  byCounty: z
    .array(
      z.object({
        county: z.string(),
        count: z.number().int(),
      }),
    )
    .default([]),
  headlineKpis: z
    .array(
      z.object({
        kpiCode: z.string(),
        label: z.string(),
        value: z.number().nullable(),
        measureUnit: z.string().nullable(),
      }),
    )
    .default([]),
})

export type PublicEnterpriseLandingSummary = z.infer<
  typeof publicEnterpriseLandingSummarySchema
>

// ---------------------------------------------------------------------------
// Search — landing/listing filter state
// ---------------------------------------------------------------------------

export const publicEnterpriseSortSchema = z.enum([
  'legalName',
  'cui',
  'county',
  'status',
])
export type PublicEnterpriseSort = z.infer<typeof publicEnterpriseSortSchema>

export const publicEnterpriseLinkStatusFilterSchema = z.enum([
  'linked',
  'partial',
  'unlinked',
  'unknown',
])
export type PublicEnterpriseLinkStatusFilter = z.infer<
  typeof publicEnterpriseLinkStatusFilterSchema
>

export const publicEnterpriseStatusFilterSchema = z.enum([
  'functiune',
  'dizolvare',
  'radiere',
  'faliment',
  'suspendare',
])
export type PublicEnterpriseStatusFilter = z.infer<
  typeof publicEnterpriseStatusFilterSchema
>

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 20
const DEFAULT_SORT: PublicEnterpriseSort = 'legalName'

/**
 * Robust comma/array parser. Accepts a native array, a comma-separated string,
 * or a single value. Invalid entries are dropped, never thrown.
 */
function parseStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  if (Array.isArray(value)) {
    const items = value
      .map((item) => (typeof item === 'string' ? item.trim() : String(item)))
      .filter((item) => item.length > 0)
    return items.length > 0 ? items : undefined
  }
  if (typeof value === 'string') {
    const items = value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
    return items.length > 0 ? items : undefined
  }
  return undefined
}

function parseBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  if (typeof value === 'boolean') {
    return value
  }
  const normalized = String(value).trim().toLowerCase()
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false
  }
  return undefined
}

function parseInteger(value: unknown, min: number, max: number): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  const numeric =
    typeof value === 'number'
      ? value
      : Number(String(value).trim().replace(/[^\d-]/g, ''))
  if (!Number.isFinite(numeric)) {
    return undefined
  }
  const integer = Math.trunc(numeric)
  if (integer < min || integer > max) {
    return undefined
  }
  return integer
}

export const publicEnterpriseSearchSchema = z
  .object({
    q: z.string().trim().catch('').optional(),
    county: z
      .unknown()
      .transform((value) => parseStringArray(value))
      .pipe(z.array(z.string()).catch([]).optional())
      .optional(),
    status: z
      .unknown()
      .transform((value) => parseStringArray(value))
      .pipe(
        z
          .array(publicEnterpriseStatusFilterSchema)
          .catch([])
          .optional(),
      )
      .optional(),
    caen: z
      .unknown()
      .transform((value) => parseStringArray(value))
      .pipe(z.array(z.string()).catch([]).optional())
      .optional(),
    subordination: z
      .unknown()
      .transform((value) => parseStringArray(value))
      .pipe(z.array(z.string()).catch([]).optional())
      .optional(),
    aptType: z
      .unknown()
      .transform((value) => parseStringArray(value))
      .pipe(z.array(z.string()).catch([]).optional())
      .optional(),
    listed: z
      .unknown()
      .transform((value) => parseBoolean(value))
      .pipe(z.boolean().optional())
      .optional(),
    hasSanctions: z
      .unknown()
      .transform((value) => parseBoolean(value))
      .pipe(z.boolean().optional())
      .optional(),
    hasStateAid: z
      .unknown()
      .transform((value) => parseBoolean(value))
      .pipe(z.boolean().optional())
      .optional(),
    linkStatus: z
      .unknown()
      .transform((value) => parseStringArray(value))
      .pipe(
        z
          .array(publicEnterpriseLinkStatusFilterSchema)
          .catch([])
          .optional(),
      )
      .optional(),
    includeS1001: z
      .unknown()
      .transform((value) => parseBoolean(value))
      .pipe(z.boolean().optional())
      .optional(),
    sort: publicEnterpriseSortSchema.catch(DEFAULT_SORT).optional(),
    page: z
      .unknown()
      .transform((value) => parseInteger(value, 1, 10_000) ?? DEFAULT_PAGE)
      .pipe(z.number().int().catch(DEFAULT_PAGE))
      .optional(),
    pageSize: z
      .unknown()
      .transform(
        (value) => parseInteger(value, 1, 200) ?? DEFAULT_PAGE_SIZE,
      )
      .pipe(z.number().int().catch(DEFAULT_PAGE_SIZE))
      .optional(),
  })
  .catch({
    q: '',
    sort: DEFAULT_SORT,
    page: DEFAULT_PAGE,
    pageSize: DEFAULT_PAGE_SIZE,
  })

export type PublicEnterpriseSearch = z.infer<typeof publicEnterpriseSearchSchema>

export function parsePublicEnterpriseSearch(
  search: Record<string, unknown>,
): PublicEnterpriseSearch {
  return publicEnterpriseSearchSchema.parse(search)
}

/**
 * Returns true only when the user has actively set at least one listing filter.
 * Default sort/page/pageSize alone do NOT count as active filters, so a landing
 * page can distinguish "no filters applied" from "filtered listing".
 */
export function hasPublicEnterpriseListingFilters(
  search: Record<string, unknown>,
): boolean {
  const parsed = parsePublicEnterpriseSearch(search)
  if (parsed.q && parsed.q.trim().length > 0) {
    return true
  }
  const isNonEmptyArray = (value: unknown): boolean =>
    Array.isArray(value) && value.length > 0
  if (
    isNonEmptyArray(parsed.county) ||
    isNonEmptyArray(parsed.status) ||
    isNonEmptyArray(parsed.caen) ||
    isNonEmptyArray(parsed.subordination) ||
    isNonEmptyArray(parsed.aptType) ||
    isNonEmptyArray(parsed.linkStatus)
  ) {
    return true
  }
  if (
    parsed.listed !== undefined ||
    parsed.hasSanctions !== undefined ||
    parsed.hasStateAid !== undefined ||
    parsed.includeS1001 !== undefined
  ) {
    return true
  }
  if (
    (parsed.page !== undefined && parsed.page !== DEFAULT_PAGE) ||
    (parsed.pageSize !== undefined && parsed.pageSize !== DEFAULT_PAGE_SIZE) ||
    (parsed.sort !== undefined && parsed.sort !== DEFAULT_SORT)
  ) {
    return true
  }
  return false
}

// ---------------------------------------------------------------------------
// Profile search state (tab + indicator view controls)
// ---------------------------------------------------------------------------

export const publicEnterpriseProfileTabSchema = z.enum([
  'profil',
  'indicatori',
  'autoritate',
  'guvernanta',
  'sanctiuni',
  'bursa',
  'ajutor-de-stat',
  'relatii',
])
export type PublicEnterpriseProfileTab = z.infer<
  typeof publicEnterpriseProfileTabSchema
>

export const indicatorSheetFilterSchema = z.enum(['all', 'calculated', 'form'])
export type IndicatorSheetFilter = z.infer<typeof indicatorSheetFilterSchema>

export const indicatorViewModeSchema = z.enum(['both', 'chart', 'table'])
export type IndicatorViewMode = z.infer<typeof indicatorViewModeSchema>

/**
 * Years filter: a comma/space separated string of years, an array of year
 * numbers/strings, a single year number, or a normalized object `{ from, to }`.
 * Malformed values catch to undefined (all years) so malformed URLs never throw.
 */
const profileYearsSchema = z
  .unknown()
  .transform((value) => {
    if (value === undefined || value === null || value === '') {
      return undefined
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
      const record = value as Record<string, unknown>
      const from = parseInteger(record.from, 1900, 2100)
      const to = parseInteger(record.to, 1900, 2100)
      if (from === undefined && to === undefined) {
        return undefined
      }
      return { from: from ?? null, to: to ?? null }
    }
    if (Array.isArray(value)) {
      const years = value
        .map((item) => parseInteger(item, 1900, 2100))
        .filter((year): year is number => year !== undefined)
        .sort((a, b) => a - b)
      return years.length > 0 ? years : undefined
    }
    if (typeof value === 'string') {
      const items = value
        .split(/[\s,]+/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
      const years = items
        .map((item) => parseInteger(item, 1900, 2100))
        .filter((year): year is number => year !== undefined)
        .sort((a, b) => a - b)
      return years.length > 0 ? years : undefined
    }
    if (typeof value === 'number') {
      const year = parseInteger(value, 1900, 2100)
      return year !== undefined ? [year] : undefined
    }
    return undefined
  })
  .pipe(
    z
      .union([
        z.array(z.number().int()),
        z.object({ from: z.number().nullable(), to: z.number().nullable() }),
      ])
      .optional(),
  )

/**
 * Parsed profile years filter: either an explicit list of years, or a
 * `{ from, to }` range (null bound = open-ended). `undefined` means all years.
 */
export type PublicEnterpriseProfileYears =
  | readonly number[]
  | { readonly from: number | null; readonly to: number | null }

export const publicEnterpriseProfileSearchSchema = z
  .object({
    tab: publicEnterpriseProfileTabSchema.catch('profil').optional(),
    kpis: z
      .unknown()
      .transform((value) => parseStringArray(value))
      .pipe(z.array(z.string()).catch([]).optional())
      .optional(),
    years: profileYearsSchema.optional(),
    sheet: indicatorSheetFilterSchema.catch('all').optional(),
    view: indicatorViewModeSchema.catch('both').optional(),
  })
  .catch({
    tab: 'profil',
    sheet: 'all',
    view: 'both',
    kpis: [],
  })

export type PublicEnterpriseProfileSearch = z.infer<
  typeof publicEnterpriseProfileSearchSchema
>

export function parsePublicEnterpriseProfileSearch(
  search: Record<string, unknown>,
): PublicEnterpriseProfileSearch {
  return publicEnterpriseProfileSearchSchema.parse(search)
}

// ---------------------------------------------------------------------------
// Search result + facets
// ---------------------------------------------------------------------------

export const publicEnterpriseSearchHitSchema = z.object({
  cui: z.string(),
  legalName: z.string(),
  registration: z.string().nullable(),
  status: z.string().nullable(),
  statusCode: publicEnterpriseStatusFilterSchema.nullable(),
  caen: z.string().nullable(),
  county: z.string().nullable(),
  subordination: z.enum(['central', 'local']).nullable(),
  aptType: z.string().nullable(),
  listed: z.boolean().nullable(),
  ticker: z.string().nullable(),
  hasSanctions: z.boolean().nullable(),
  hasStateAid: z.boolean().nullable(),
  linkStatus: enterpriseLinkStatusSchema,
})

export type PublicEnterpriseSearchHit = z.infer<
  typeof publicEnterpriseSearchHitSchema
>

export const publicEnterpriseFacetBucketSchema = z.object({
  value: z.string(),
  label: z.string().nullable(),
  count: z.number().int(),
})
export type PublicEnterpriseFacetBucket = z.infer<
  typeof publicEnterpriseFacetBucketSchema
>

export const publicEnterpriseFacetsSchema = z.object({
  status: z.array(publicEnterpriseFacetBucketSchema).default([]),
  county: z.array(publicEnterpriseFacetBucketSchema).default([]),
  caen: z.array(publicEnterpriseFacetBucketSchema).default([]),
  subordination: z.array(publicEnterpriseFacetBucketSchema).default([]),
  aptType: z.array(publicEnterpriseFacetBucketSchema).default([]),
  linkStatus: z.array(publicEnterpriseFacetBucketSchema).default([]),
})
export type PublicEnterpriseFacets = z.infer<
  typeof publicEnterpriseFacetsSchema
>

const emptyPublicEnterpriseFacets: PublicEnterpriseFacets = {
  status: [],
  county: [],
  caen: [],
  subordination: [],
  aptType: [],
  linkStatus: [],
}

export const publicEnterpriseSearchResultSchema = z.object({
  dataStatus: dataStatusSchema,
  lineage: sourceLineageSchema,
  query: publicEnterpriseSearchSchema,
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  hits: z.array(publicEnterpriseSearchHitSchema),
  facets: publicEnterpriseFacetsSchema.default(emptyPublicEnterpriseFacets),
})
export type PublicEnterpriseSearchResult = z.infer<
  typeof publicEnterpriseSearchResultSchema
>
