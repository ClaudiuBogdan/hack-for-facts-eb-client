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
 * Route search parser for `/achizitii/cautare` (and reused as a subset by
 * `/achizitii/cpv/$code` and the deferred `/achizitii/semnale`).
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

const optionalStringParam = z.preprocess((value) => {
  if (value === undefined || value === null) return undefined
  if (Array.isArray(value)) return value.join(',')
  return String(value)
}, z.string().optional())

export const procurementSortSchema = z.enum([
  'date_desc',
  'date_asc',
  'value_desc',
  'value_asc',
])

export type ProcurementSort = z.infer<typeof procurementSortSchema>

export const procurementSourceSchema = z.enum([
  'elicitatie',
  'seap',
  'ted',
])

export type ProcurementSource = z.infer<typeof procurementSourceSchema>

const commaListStatus = optionalStringParam
  .transform((value) => {
    if (typeof value !== 'string') return undefined
    const parts = value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean) as ProcurementStatus[]
    if (parts.length === 0) return undefined
    // Validate against the enum so an invalid value normalizes away.
    const valid = parts.filter((part) =>
      (procurementStatusSchema.options as readonly string[]).includes(part),
    )
    return valid.length > 0 ? (valid as ProcurementStatus[]) : undefined
  })

export const procurementSearchSchema = z
  .object({
    grain: procurementGrainSchema.catch(DEFAULT_GRAIN).default(DEFAULT_GRAIN),
    q: optionalStringParam,
    authority_cui: optionalStringParam,
    supplier_cui: optionalStringParam,
    cpv: optionalStringParam,
    cpv_division: optionalStringParam,
    source: z.preprocess((value) => {
      if (value === undefined || value === null) return undefined
      return String(value)
    }, procurementSourceSchema.optional()),
    status: commaListStatus,
    // Reserved/ignored buyer-territory dimensions (parsed, not authoritative).
    county: optionalStringParam,
    region: optionalStringParam,
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    dateFrom: optionalStringParam,
    dateTo: optionalStringParam,
    valueMin: z.coerce.number().optional(),
    valueMax: z.coerce.number().optional(),
    signal: reviewSignalKindSchema.optional(),
    sort: procurementSortSchema.catch(DEFAULT_SORT).default(DEFAULT_SORT),
    page: z.coerce.number().int().min(1).catch(DEFAULT_PAGE).default(DEFAULT_PAGE),
    pageSize: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .catch(DEFAULT_PAGE_SIZE)
      .default(DEFAULT_PAGE_SIZE),
    // Detail-only context param (preserved when deep-linked into search).
    from: optionalStringParam,
    highlight: optionalStringParam,
  })
  .passthrough()

export type ProcurementSearchParams = z.input<typeof procurementSearchSchema>
export type ProcurementSearchState = z.output<typeof procurementSearchSchema>

export const PROCUREMENT_SEARCH_DEFAULTS = {
  grain: DEFAULT_GRAIN,
  sort: DEFAULT_SORT,
  page: DEFAULT_PAGE,
  pageSize: DEFAULT_PAGE_SIZE,
} as const satisfies Pick<
  ProcurementSearchState,
  'grain' | 'sort' | 'page' | 'pageSize'
>

export function parseProcurementSearch(
  search: Record<string, unknown>,
): ProcurementSearchState {
  return procurementSearchSchema.parse(search)
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

  return cleaned
}

export type ReviewSignalKindValue = ReviewSignalKind

export const REVIEW_SIGNAL_KIND_VALUES: readonly ReviewSignalKind[] = [
  'same_day',
  'repeated_pairs',
  'modification_inflation',
  'young_suppliers',
]
