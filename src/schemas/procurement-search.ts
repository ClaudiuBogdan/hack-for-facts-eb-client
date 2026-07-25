import { z } from 'zod'
import {
  procurementGrainSchema,
  procurementStatusSchema,
  reviewSignalKindSchema,
  type ProcurementGrain,
  type ProcurementStatus,
  type ReviewSignalKind,
} from './procurement'

/**
 * Route search parser for `/procurement/search` (and reused as a subset by
 * `/procurement/categories/$code` and the deferred `/procurement/semnale`).
 *
 * Follows the parliament search-schema idiom: every field is
 * `.optional().catch(undefined)` so a hand-edited or junk URL never throws —
 * the bad facet silently drops. Defaults live outside the schema
 * (`PROCUREMENT_SEARCH_DEFAULTS` + `withProcurementSearchDefaults`) so clean
 * URLs stay minimal.
 *
 * Reserved/ignored params: `county`, `region` (buyer-territory dimensions
 * that the v1 capability gate does not allow as authoritative filters;
 * parsed and ignored so deep links do not error — the UI surfaces the
 * blocker via the coverage layer).
 */

const DEFAULT_GRAIN: ProcurementGrain = 'contracts'
const DEFAULT_SORT = 'date_desc' as const
const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 25

const toOptionalString = (value: unknown): unknown => {
  if (value === undefined || value === null) return undefined
  if (Array.isArray(value)) return value.join(',')
  return String(value)
}

const optionalStringParam = z
  .preprocess(toOptionalString, z.string().optional())
  .catch(undefined)

/**
 * Strict `YYYY-MM-DD` so a junk `?dateFrom=abc` falls to `undefined` before
 * it can reach date formatters (prevents `RangeError: Invalid time value`).
 */
const optionalIsoDateParam = z
  .preprocess(
    (value) => {
      const str = toOptionalString(value)
      return typeof str === 'string' ? str.trim() : str
    },
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  )
  .catch(undefined)

/**
 * Free-text `q` bounds, matching the server's. Below the minimum the query is
 * never sent, so a state can carry a `q` the request does not — which is why
 * anything deciding "is there something to search for" has to test the LENGTH
 * rather than presence.
 */
export const PROCUREMENT_Q_MIN_LENGTH = 3
export const PROCUREMENT_Q_MAX_LENGTH = 100

/**
 * How a multi-word `q` is read on the record list. Search-engine grains only —
 * the SQL-served `modifications` grain has one substring match and no mode.
 */
export const procurementQModeSchema = z.enum(['all', 'any', 'phrase'])
export type ProcurementQMode = z.infer<typeof procurementQModeSchema>

/**
 * `relevance` is BM25 from the search engine. It needs a `q` to rank against and
 * a search-served grain, so the hub scrubs it back to the default when either is
 * missing — the server rejects it rather than quietly answering in date order.
 */
export const procurementSortSchema = z.enum([
  'date_desc',
  'date_asc',
  'value_desc',
  'value_asc',
  'relevance',
])

export type ProcurementSort = z.infer<typeof procurementSortSchema>

/**
 * Coarse source filter (UI grouping). Maps to the prod source-system sets:
 * `elicitatie` → e-licitatie lanes, `seap` → SEAP/SICAP bulk lanes. TED is
 * raw-only (not projected into the procurement grains), so it is not a filter.
 */
export const procurementSourceSchema = z.enum(['elicitatie', 'seap'])

export type ProcurementSource = z.infer<typeof procurementSourceSchema>

/**
 * "Value quality" facet — user-facing categories over the data-layer value
 * resolution states (rules v2), aligned with the record display. The mapping to
 * raw `value_state` tokens lives in features/procurement/lib/value-category.ts.
 */
export const procurementValueCategorySchema = z.enum([
  'accepted',
  'foreign',
  'invalid',
  // Grain-ambiguous values (frameworks moved to the record-kind facet; this
  // covers the value-trust axis only).
  'ambiguous',
  'conflict',
  'missing',
])

export type ProcurementValueCategory = z.infer<
  typeof procurementValueCategorySchema
>

export const PROCUREMENT_VALUE_CATEGORIES: readonly ProcurementValueCategory[] =
  procurementValueCategorySchema.options

/**
 * The record-kind facet (serving convention 2026-07-23): what a contract row
 * IS — an actual purchase vs a framework umbrella. Orthogonal to value
 * quality. Contracts grain only.
 */
export const procurementRecordKindSchema = z.enum(['purchases', 'frameworks'])

export type ProcurementRecordKindOption = z.infer<
  typeof procurementRecordKindSchema
>

export const PROCUREMENT_RECORD_KIND_OPTIONS: readonly ProcurementRecordKindOption[] =
  procurementRecordKindSchema.options

const commaListStatus = z
  .preprocess(toOptionalString, z.string().optional())
  .transform((value) => {
    if (typeof value !== 'string') return undefined
    const parts = value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
    if (parts.length === 0) return undefined
    // Validate against the enum so an invalid value normalizes away.
    const valid = parts.filter((part): part is ProcurementStatus =>
      (procurementStatusSchema.options as readonly string[]).includes(part),
    )
    return valid.length > 0 ? valid : undefined
  })
  .catch(undefined)

/** Comma-list of record-kind options (unknown tokens normalize away). */
const commaListRecordKind = z
  .preprocess(toOptionalString, z.string().optional())
  .transform((value) => {
    if (typeof value !== 'string') return undefined
    const parts = value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
    if (parts.length === 0) return undefined
    const valid = parts.filter((part): part is ProcurementRecordKindOption =>
      (procurementRecordKindSchema.options as readonly string[]).includes(part),
    )
    return valid.length > 0 ? valid : undefined
  })
  .catch(undefined)

/** Comma-list of value-quality categories (unknown tokens normalize away). */
const commaListValueCategory = z
  .preprocess(toOptionalString, z.string().optional())
  .transform((value) => {
    if (typeof value !== 'string') return undefined
    const parts = value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
    if (parts.length === 0) return undefined
    const valid = parts.filter((part): part is ProcurementValueCategory =>
      (procurementValueCategorySchema.options as readonly string[]).includes(
        part,
      ),
    )
    return valid.length > 0 ? valid : undefined
  })
  .catch(undefined)

export const procurementSearchSchema = z
  .object({
    grain: procurementGrainSchema.optional().catch(undefined),
    q: optionalStringParam,
    qmode: procurementQModeSchema.optional().catch(undefined),
    authority_cui: optionalStringParam,
    supplier_cui: optionalStringParam,
    cpv: optionalStringParam,
    cpv_division: optionalStringParam,
    // CPV hierarchy levels (canonical 8-digit codes). Display/roundtrip only
    // on the list surface — no list builder sends them (aggregates scope them
    // via the hub; the list has no CPV prefix filter yet).
    cpv_group: optionalStringParam,
    cpv_class: optionalStringParam,
    cpv_category: optionalStringParam,
    // Party geography — authoritative list filters since the search engine
    // took over the record list (2026-07-25). Buyer = the institution's
    // administrative territory, supplier = the awarded company's registered
    // office; supplier geography does not exist on the procedures grain.
    buyerRegion: optionalStringParam,
    buyerCounty: optionalStringParam,
    buyerSiruta: optionalStringParam,
    supplierRegion: optionalStringParam,
    supplierCounty: optionalStringParam,
    supplierSiruta: optionalStringParam,
    source: procurementSourceSchema.optional().catch(undefined),
    // `.optional()` on the outside keeps the key optional in the inferred
    // type (the transform chain would otherwise mark it required).
    status: commaListStatus.optional(),
    value_state: commaListValueCategory.optional(),
    record_kind: commaListRecordKind.optional(),
    // Reserved/ignored buyer-territory dimensions (parsed, not authoritative).
    county: optionalStringParam,
    region: optionalStringParam,
    year: z.coerce.number().int().min(2000).max(2100).optional().catch(undefined),
    dateFrom: optionalIsoDateParam,
    dateTo: optionalIsoDateParam,
    valueMin: z.coerce.number().nonnegative().optional().catch(undefined),
    valueMax: z.coerce.number().nonnegative().optional().catch(undefined),
    signal: reviewSignalKindSchema.optional().catch(undefined),
    sort: procurementSortSchema.optional().catch(undefined),
    page: z.coerce.number().int().min(1).optional().catch(undefined),
    pageSize: z.coerce.number().int().min(1).max(100).optional().catch(undefined),
    // Detail-only context params (preserved when deep-linked into search).
    from: optionalStringParam,
    highlight: optionalStringParam,
  })
  .passthrough()

/** Parsed URL search — every facet optional (junk drops to `undefined`). */
export type ProcurementSearch = z.output<typeof procurementSearchSchema>
export type ProcurementSearchParams = z.input<typeof procurementSearchSchema>

/** Defaults-applied search state consumed by the API layer and the UI. */
export type ProcurementSearchState = ProcurementSearch & {
  grain: ProcurementGrain
  sort: ProcurementSort
  page: number
  pageSize: number
}

export const PROCUREMENT_SEARCH_DEFAULTS = {
  grain: DEFAULT_GRAIN,
  sort: DEFAULT_SORT,
  page: DEFAULT_PAGE,
  pageSize: DEFAULT_PAGE_SIZE,
} as const satisfies Pick<
  ProcurementSearchState,
  'grain' | 'sort' | 'page' | 'pageSize'
>

export function withProcurementSearchDefaults(
  search: ProcurementSearch,
): ProcurementSearchState {
  return {
    ...search,
    grain: search.grain ?? PROCUREMENT_SEARCH_DEFAULTS.grain,
    sort: search.sort ?? PROCUREMENT_SEARCH_DEFAULTS.sort,
    page: search.page ?? PROCUREMENT_SEARCH_DEFAULTS.page,
    pageSize: search.pageSize ?? PROCUREMENT_SEARCH_DEFAULTS.pageSize,
  }
}

export function parseProcurementSearch(
  search: Record<string, unknown>,
): ProcurementSearchState {
  return withProcurementSearchDefaults(procurementSearchSchema.parse(search))
}

export function cleanProcurementSearch(
  search: ProcurementSearchState,
): Partial<ProcurementSearchState> {
  const cleaned: Partial<ProcurementSearchState> = { ...search }

  const trimmedText: Array<keyof ProcurementSearchState> = [
    'q',
    'authority_cui',
    'supplier_cui',
    'cpv',
    'cpv_division',
    'county',
    'region',
    'from',
    'highlight',
    'dateFrom',
    'dateTo',
  ]
  for (const key of trimmedText) {
    const value = cleaned[key]
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed.length === 0) {
        delete cleaned[key]
      } else {
        ;(cleaned as Record<string, unknown>)[key] = trimmed
      }
    }
  }

  if (cleaned.grain === PROCUREMENT_SEARCH_DEFAULTS.grain) {
    delete cleaned.grain
  }
  if (cleaned.sort === PROCUREMENT_SEARCH_DEFAULTS.sort) {
    delete cleaned.sort
  }
  if (cleaned.page === PROCUREMENT_SEARCH_DEFAULTS.page) {
    delete cleaned.page
  }
  if (cleaned.pageSize === PROCUREMENT_SEARCH_DEFAULTS.pageSize) {
    delete cleaned.pageSize
  }
  if (!cleaned.status?.length) delete cleaned.status
  if (!cleaned.value_state?.length) delete cleaned.value_state
  if (!cleaned.record_kind?.length) delete cleaned.record_kind

  return cleaned
}

export type ReviewSignalKindValue = ReviewSignalKind

export const REVIEW_SIGNAL_KIND_VALUES: readonly ReviewSignalKind[] = [
  'same_day',
  'repeated_pairs',
]
