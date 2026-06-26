import { z } from 'zod'

/**
 * Public Investments (Investiții Publice) — URL search-state schemas.
 *
 * Each PI route owns a small permissive zod schema plus a `clean*` helper that
 * strips default/empty values so the URL stays readable (mirror of the PNRR
 * pattern in `src/schemas/pnrr.ts`). Parsers are fail-soft: garbage input is
 * normalized to defaults / undefined and never throws — TanStack Router runs
 * `validateSearch` synchronously on navigation and a thrown error there would
 * break the route.
 */

// ---------------------------------------------------------------------------
// Domain enums (shared with feature types via re-export)
// ---------------------------------------------------------------------------

export const PROGRAM_CODE_VALUES = [
  'ANGHEL_SALIGNY',
  'PNDL',
  'PNCCRS',
  'PNMC',
] as const

export type ProgramCode = (typeof PROGRAM_CODE_VALUES)[number]

export const STAGE_BUCKET_VALUES = [
  'contractat',
  'in_executie',
  'finalizat',
  'receptionat',
  'necunoscut',
] as const

export type StageBucket = (typeof STAGE_BUCKET_VALUES)[number]

export const AMOUNT_CONFIDENCE_VALUES = [
  'ok',
  'precision_warning',
  'suspect_x1000',
] as const

export type AmountConfidence = (typeof AMOUNT_CONFIDENCE_VALUES)[number]

export const DATA_QUALITY_VALUES = ['precision_warning', 'suspect_x1000'] as const

export type DataQualityFilter = (typeof DATA_QUALITY_VALUES)[number]

export const IDENTITY_CONFIDENCE_VALUES = ['high', 'medium', 'low'] as const

export type IdentityConfidence = (typeof IDENTITY_CONFIDENCE_VALUES)[number]

// Map coloring / view toggles shared across landing, search, territory.
export const MAP_VIEW_VALUES = ['program', 'stage'] as const
export type MapView = (typeof MAP_VIEW_VALUES)[number]

export const LAYOUT_VIEW_VALUES = ['list', 'map', 'split'] as const
export type LayoutView = (typeof LAYOUT_VIEW_VALUES)[number]

export const OBJECTIVE_SORT_VALUES = [
  'contracted',
  'reimbursed',
  'absorption',
  'title',
  'county',
  'stage',
] as const

export type ObjectiveSort = (typeof OBJECTIVE_SORT_VALUES)[number]

export const PAYMENT_SORT_VALUES = ['date', 'amount', 'cumulative'] as const
export type PaymentSort = (typeof PAYMENT_SORT_VALUES)[number]

export const ORDER_VALUES = ['asc', 'desc'] as const
export type SortOrder = (typeof ORDER_VALUES)[number]

export const AMOUNT_FIELD_VALUES = [
  'contracted',
  'reimbursed',
  'allocated',
] as const

export type AmountField = (typeof AMOUNT_FIELD_VALUES)[number]

export const OBJECTIVE_TAB_VALUES = [
  'prezentare',
  'plati',
  'contract',
  'parti',
  'dovezi',
] as const

export type ObjectiveTab = (typeof OBJECTIVE_TAB_VALUES)[number]

// ---------------------------------------------------------------------------
// Shared search-state defaults
// ---------------------------------------------------------------------------

export const PUBLIC_INVESTMENTS_DEFAULTS = {
  view: 'split',
  mapView: 'program',
  sort: 'contracted',
  order: 'desc',
  page: 1,
  pageSize: 25,
  tab: 'prezentare',
  amountField: 'contracted',
  paymentSort: 'date',
  paymentOrder: 'asc',
} as const

// ---------------------------------------------------------------------------
// Shared permissive preprocessors
// ---------------------------------------------------------------------------

const optionalTextSearchParam = z.preprocess(
  (value) => {
    if (value === undefined || value === null) return undefined
    if (typeof value === 'string') return value
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value)
    }
    return undefined
  },
  z.string().optional(),
)

const optionalIdentifierSearchParam = z.preprocess(
  (value) => {
    if (value === undefined || value === null) return undefined
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value)
    }
    if (typeof value !== 'string') return undefined

    const trimmed = value.trim()
    if (!trimmed) return undefined

    try {
      const parsed = JSON.parse(trimmed)
      if (
        typeof parsed === 'string' ||
        typeof parsed === 'number' ||
        typeof parsed === 'boolean'
      ) {
        return String(parsed)
      }
    } catch {
      // Not a JSON-encoded primitive — keep the trimmed raw value.
    }

    return trimmed
  },
  z.string().optional(),
)

function asSearchObject(search: unknown): Record<string, unknown> {
  if (!search || typeof search !== 'object' || Array.isArray(search)) {
    return {}
  }
  return search as Record<string, unknown>
}

/**
 * Parse a URL param value into an array of strings, accepting:
 * - a JSON-encoded array (`["a","b"]`),
 * - a comma-separated list (`a,b`),
 * - a single value (`a` → `['a']`),
 * - an already-array value (TanStack Router repeated params / array mode).
 * Invalid/garbage entries are dropped, never thrown.
 */
export function parseArraySearchParam(
  value: unknown,
  filter: (item: string) => boolean = () => true,
): string[] | undefined {
  if (value === undefined || value === null) return undefined

  const candidates: unknown[] = Array.isArray(value) ? value : [value]

  const collected: string[] = []
  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) continue

    if (typeof candidate === 'string') {
      const trimmed = candidate.trim()
      if (!trimmed) continue

      // JSON-encoded array.
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        let decoded: unknown
        try {
          decoded = JSON.parse(trimmed)
        } catch {
          // Fall through to comma-split handling.
          decoded = null
        }
        if (Array.isArray(decoded)) {
          for (const item of decoded) {
            if (typeof item === 'string') {
              const trimmedItem = item.trim()
              if (trimmedItem && filter(trimmedItem)) {
                collected.push(trimmedItem)
              }
            } else if (typeof item === 'number' || typeof item === 'boolean') {
              const asString = String(item)
              if (filter(asString)) collected.push(asString)
            }
          }
          continue
        }
      }

      // Comma-separated list.
      if (trimmed.includes(',')) {
        for (const item of trimmed.split(',')) {
          const trimmedItem = item.trim()
          if (trimmedItem && filter(trimmedItem)) {
            collected.push(trimmedItem)
          }
        }
        continue
      }

      // Single value.
      if (filter(trimmed)) collected.push(trimmed)
      continue
    }

    if (typeof candidate === 'number' || typeof candidate === 'boolean') {
      const asString = String(candidate)
      if (filter(asString)) collected.push(asString)
    }
  }

  return collected.length > 0 ? collected : undefined
}

/**
 * Parse an enum-typed array param case-insensitively, returning the canonical
 * casing from `allowed`. Unknown enum values are silently dropped
 * (permissive), so the route never throws on bad input. This handles the
 * mixed casing across PI enums (programs are UPPER_CASE, stage buckets are
 * snake_lower).
 */
function parseEnumArrayParam<T extends readonly string[]>(
  value: unknown,
  allowed: T,
): readonly T[number][] | undefined {
  const canonicalByLower = new Map<string, string>()
  for (const item of allowed) {
    canonicalByLower.set(item.toLowerCase(), item)
  }

  const rawParsed = parseArraySearchParam(value)
  if (!rawParsed) return undefined

  const collected: T[number][] = []
  for (const item of rawParsed) {
    const canonical = canonicalByLower.get(item.toLowerCase())
    if (canonical) {
      collected.push(canonical as T[number])
    }
  }
  return collected.length > 0 ? collected : undefined
}

function isProgramCode(value: string): value is ProgramCode {
  return (PROGRAM_CODE_VALUES as readonly string[]).includes(value)
}

function isStageBucket(value: string): value is StageBucket {
  return (STAGE_BUCKET_VALUES as readonly string[]).includes(value)
}

const optionalProgramsParam = z.preprocess(
  (value) => parseEnumArrayParam(value, PROGRAM_CODE_VALUES),
  z.array(z.enum(PROGRAM_CODE_VALUES)).optional(),
)

const optionalStagesParam = z.preprocess(
  (value) => parseEnumArrayParam(value, STAGE_BUCKET_VALUES),
  z.array(z.enum(STAGE_BUCKET_VALUES)).optional(),
)

const optionalDomainsParam = z.preprocess(
  (value) => parseArraySearchParam(value),
  z.array(z.string()).optional(),
)

const optionalCountiesParam = z.preprocess(
  (value) =>
    parseArraySearchParam(value, (item) => item.length > 0 && item.length <= 4),
  z.array(z.string()).optional(),
)

const optionalIdentityParam = z.preprocess(
  (value) => parseEnumArrayParam(value, IDENTITY_CONFIDENCE_VALUES),
  z.array(z.enum(IDENTITY_CONFIDENCE_VALUES)).optional(),
)

const optionalDataQualityParam = z.preprocess(
  (value) => parseEnumArrayParam(value, DATA_QUALITY_VALUES),
  z.array(z.enum(DATA_QUALITY_VALUES)).optional(),
)

function parseBooleanish(value: unknown): boolean | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase()
    if (trimmed === 'true' || trimmed === '1') return true
    if (trimmed === 'false' || trimmed === '0') return false
    return undefined
  }
  if (typeof value === 'number') return value !== 0
  return undefined
}

const optionalBooleanParam = z.preprocess(
  parseBooleanish,
  z.boolean().optional(),
)

function parseOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return undefined
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  if (typeof value === 'boolean') return undefined
  return undefined
}

const optionalAmountParam = z.preprocess(
  (value) => {
    const parsed = parseOptionalNumber(value)
    if (parsed === undefined || parsed < 0) return undefined
    return parsed
  },
  z.number().min(0).optional(),
)

const optionalAbsParam = z.preprocess(
  (value) => {
    const parsed = parseOptionalNumber(value)
    if (parsed === undefined) return undefined
    return Math.min(100, Math.max(0, parsed))
  },
  z.number().min(0).max(100).optional(),
)

const positiveIntParam = (defaultValue: number) =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === null) return defaultValue
      const parsed = parseOptionalNumber(value)
      if (parsed === undefined) return defaultValue
      return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : defaultValue
    },
    z.number().int().min(1),
  )

// ---------------------------------------------------------------------------
// Layout search state (shared `dovada` deep-link + optional backtrack context)
// ---------------------------------------------------------------------------

export const PublicInvestmentsLayoutSearchSchema = z.object({
  dovada: optionalIdentifierSearchParam,
  objectiveId: optionalIdentifierSearchParam,
  from: optionalTextSearchParam,
  county: optionalIdentifierSearchParam,
  siruta: optionalIdentifierSearchParam,
})

export type PublicInvestmentsLayoutSearchState = z.infer<
  typeof PublicInvestmentsLayoutSearchSchema
>

export function cleanLayoutSearch(
  search: Partial<PublicInvestmentsLayoutSearchState>,
): Partial<PublicInvestmentsLayoutSearchState> {
  const cleaned: Partial<PublicInvestmentsLayoutSearchState> = { ...search }

  for (const key of ['dovada', 'objectiveId', 'from', 'county', 'siruta'] as const) {
    const value = cleaned[key]
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed) {
        cleaned[key] = key === 'county' ? trimmed.toUpperCase() : trimmed
      } else {
        delete cleaned[key]
      }
    } else {
      delete cleaned[key]
    }
  }

  return cleaned
}

export function parseLayoutSearch(
  search: unknown,
): Partial<PublicInvestmentsLayoutSearchState> {
  return cleanLayoutSearch(
    PublicInvestmentsLayoutSearchSchema.parse(asSearchObject(search)),
  )
}

// ---------------------------------------------------------------------------
// Landing search state
// ---------------------------------------------------------------------------

export const PublicInvestmentsLandingSearchSchema = z.object({
  view: z
    .preprocess(
      (value) => {
        if (value === undefined || value === null) {
          return PUBLIC_INVESTMENTS_DEFAULTS.mapView
        }
        if (typeof value !== 'string') {
          return PUBLIC_INVESTMENTS_DEFAULTS.mapView
        }
        const normalized = value.trim().toLowerCase()
        return (MAP_VIEW_VALUES as readonly string[]).includes(normalized)
          ? (normalized as MapView)
          : PUBLIC_INVESTMENTS_DEFAULTS.mapView
      },
      z.enum(MAP_VIEW_VALUES),
    )
    .default(PUBLIC_INVESTMENTS_DEFAULTS.mapView),
  program: z.preprocess((value) => {
    if (value === undefined || value === null) return undefined
    if (typeof value !== 'string') return undefined
    const normalized = value.trim().toUpperCase()
    return isProgramCode(normalized) ? normalized : undefined
  }, z.enum(PROGRAM_CODE_VALUES).optional()),
  mapLat: z.preprocess(parseOptionalNumber, z.number().optional()),
  mapLng: z.preprocess(parseOptionalNumber, z.number().optional()),
  mapZoom: z.preprocess(parseOptionalNumber, z.number().optional()),
})

export type PublicInvestmentsLandingSearchState = z.infer<
  typeof PublicInvestmentsLandingSearchSchema
>

export function cleanLandingSearch(
  search: Partial<PublicInvestmentsLandingSearchState>,
): Partial<PublicInvestmentsLandingSearchState> {
  const cleaned: Partial<PublicInvestmentsLandingSearchState> = { ...search }

  if (cleaned.view === PUBLIC_INVESTMENTS_DEFAULTS.mapView) {
    delete cleaned.view
  }

  if (!cleaned.program) {
    delete cleaned.program
  }

  // Camera must be all-or-none.
  if (
    cleaned.mapLat == null ||
    cleaned.mapLng == null ||
    cleaned.mapZoom == null
  ) {
    delete cleaned.mapLat
    delete cleaned.mapLng
    delete cleaned.mapZoom
  }

  for (const key of Object.keys(cleaned) as (keyof PublicInvestmentsLandingSearchState)[]) {
    if (cleaned[key] === undefined) {
      delete cleaned[key]
    }
  }

  return cleaned
}

export function parseLandingSearch(
  search: unknown,
): Partial<PublicInvestmentsLandingSearchState> {
  return cleanLandingSearch(
    PublicInvestmentsLandingSearchSchema.parse(asSearchObject(search)),
  )
}

// ---------------------------------------------------------------------------
// Search (cautare) search state
// ---------------------------------------------------------------------------

export const PublicInvestmentsSearchSchema = z.object({
  q: optionalTextSearchParam,
  programs: optionalProgramsParam,
  domains: optionalDomainsParam,
  counties: optionalCountiesParam,
  siruta: optionalIdentifierSearchParam,
  stages: optionalStagesParam,
  amountField: z
    .preprocess(
      (value) => {
        if (value === undefined || value === null) {
          return PUBLIC_INVESTMENTS_DEFAULTS.amountField
        }
        if (typeof value !== 'string') {
          return PUBLIC_INVESTMENTS_DEFAULTS.amountField
        }
        const normalized = value.trim().toLowerCase()
        return (AMOUNT_FIELD_VALUES as readonly string[]).includes(normalized)
          ? (normalized as AmountField)
          : PUBLIC_INVESTMENTS_DEFAULTS.amountField
      },
      z.enum(AMOUNT_FIELD_VALUES),
    )
    .default(PUBLIC_INVESTMENTS_DEFAULTS.amountField),
  amountMin: optionalAmountParam,
  amountMax: optionalAmountParam,
  absMin: optionalAbsParam,
  absMax: optionalAbsParam,
  dataQuality: optionalDataQualityParam,
  hasContractorCui: optionalBooleanParam,
  hasDesignerCui: optionalBooleanParam,
  hasSiruta: optionalBooleanParam,
  identity: optionalIdentityParam,
  view: z
    .preprocess(
      (value) => {
        if (value === undefined || value === null) {
          return PUBLIC_INVESTMENTS_DEFAULTS.view
        }
        if (typeof value !== 'string') {
          return PUBLIC_INVESTMENTS_DEFAULTS.view
        }
        const normalized = value.trim().toLowerCase()
        return (LAYOUT_VIEW_VALUES as readonly string[]).includes(normalized)
          ? (normalized as LayoutView)
          : PUBLIC_INVESTMENTS_DEFAULTS.view
      },
      z.enum(LAYOUT_VIEW_VALUES),
    )
    .default(PUBLIC_INVESTMENTS_DEFAULTS.view),
  sort: z
    .preprocess(
      (value) => {
        if (value === undefined || value === null) {
          return PUBLIC_INVESTMENTS_DEFAULTS.sort
        }
        if (typeof value !== 'string') {
          return PUBLIC_INVESTMENTS_DEFAULTS.sort
        }
        const normalized = value.trim().toLowerCase()
        return (OBJECTIVE_SORT_VALUES as readonly string[]).includes(normalized)
          ? (normalized as ObjectiveSort)
          : PUBLIC_INVESTMENTS_DEFAULTS.sort
      },
      z.enum(OBJECTIVE_SORT_VALUES),
    )
    .default(PUBLIC_INVESTMENTS_DEFAULTS.sort),
  order: z
    .preprocess(
      (value) => {
        if (value === undefined || value === null) {
          return PUBLIC_INVESTMENTS_DEFAULTS.order
        }
        if (typeof value !== 'string') {
          return PUBLIC_INVESTMENTS_DEFAULTS.order
        }
        const normalized = value.trim().toLowerCase()
        return (ORDER_VALUES as readonly string[]).includes(normalized)
          ? (normalized as SortOrder)
          : PUBLIC_INVESTMENTS_DEFAULTS.order
      },
      z.enum(ORDER_VALUES),
    )
    .default(PUBLIC_INVESTMENTS_DEFAULTS.order),
  page: positiveIntParam(PUBLIC_INVESTMENTS_DEFAULTS.page),
  pageSize: positiveIntParam(PUBLIC_INVESTMENTS_DEFAULTS.pageSize),
  selected: optionalIdentifierSearchParam,
})

export type PublicInvestmentsSearchState = z.infer<
  typeof PublicInvestmentsSearchSchema
>

export const PUBLIC_INVESTMENTS_SEARCH_ARRAY_KEYS = [
  'programs',
  'domains',
  'counties',
  'stages',
  'dataQuality',
  'identity',
] as const satisfies readonly (keyof PublicInvestmentsSearchState)[]

export function cleanSearchState(
  search: Partial<PublicInvestmentsSearchState>,
): Partial<PublicInvestmentsSearchState> {
  const cleaned: Partial<PublicInvestmentsSearchState> = { ...search }

  const q = cleaned.q?.trim()
  if (q) {
    cleaned.q = q
  } else {
    delete cleaned.q
  }

  for (const key of PUBLIC_INVESTMENTS_SEARCH_ARRAY_KEYS) {
    if (!cleaned[key] || (cleaned[key] as readonly unknown[] | undefined)?.length === 0) {
      delete cleaned[key]
    }
  }

  const siruta = cleaned.siruta?.trim()
  if (siruta) {
    cleaned.siruta = siruta
  } else {
    delete cleaned.siruta
  }

  const selected = cleaned.selected?.trim()
  if (selected) {
    cleaned.selected = selected
  } else {
    delete cleaned.selected
  }

  if (cleaned.amountField === PUBLIC_INVESTMENTS_DEFAULTS.amountField) {
    delete cleaned.amountField
  }
  if (cleaned.view === PUBLIC_INVESTMENTS_DEFAULTS.view) delete cleaned.view
  if (cleaned.sort === PUBLIC_INVESTMENTS_DEFAULTS.sort) delete cleaned.sort
  if (cleaned.order === PUBLIC_INVESTMENTS_DEFAULTS.order) delete cleaned.order
  if (cleaned.page === PUBLIC_INVESTMENTS_DEFAULTS.page) delete cleaned.page
  if (cleaned.pageSize === PUBLIC_INVESTMENTS_DEFAULTS.pageSize) {
    delete cleaned.pageSize
  }

  // Validate amount range coherence: if min > max, drop both (permissive).
  if (
    cleaned.amountMin != null &&
    cleaned.amountMax != null &&
    cleaned.amountMin > cleaned.amountMax
  ) {
    delete cleaned.amountMin
    delete cleaned.amountMax
  }
  if (
    cleaned.absMin != null &&
    cleaned.absMax != null &&
    cleaned.absMin > cleaned.absMax
  ) {
    delete cleaned.absMin
    delete cleaned.absMax
  }

  for (const key of Object.keys(cleaned) as (keyof PublicInvestmentsSearchState)[]) {
    if (cleaned[key] === undefined) {
      delete cleaned[key]
    }
  }

  return cleaned
}

export function parseSearchState(
  search: unknown,
): Partial<PublicInvestmentsSearchState> {
  return cleanSearchState(PublicInvestmentsSearchSchema.parse(asSearchObject(search)))
}

// ---------------------------------------------------------------------------
// Objective detail search state
// ---------------------------------------------------------------------------

export const PublicInvestmentsObjectiveSearchSchema = z.object({
  tab: z
    .preprocess(
      (value) => {
        if (value === undefined || value === null) {
          return PUBLIC_INVESTMENTS_DEFAULTS.tab
        }
        if (typeof value !== 'string') {
          return PUBLIC_INVESTMENTS_DEFAULTS.tab
        }
        const normalized = value.trim().toLowerCase()
        return (OBJECTIVE_TAB_VALUES as readonly string[]).includes(normalized)
          ? (normalized as ObjectiveTab)
          : PUBLIC_INVESTMENTS_DEFAULTS.tab
      },
      z.enum(OBJECTIVE_TAB_VALUES),
    )
    .default(PUBLIC_INVESTMENTS_DEFAULTS.tab),
  stage: optionalIdentifierSearchParam,
  from: optionalTextSearchParam,
  county: optionalIdentifierSearchParam,
  siruta: optionalIdentifierSearchParam,
  paySort: z
    .preprocess(
      (value) => {
        if (value === undefined || value === null) {
          return PUBLIC_INVESTMENTS_DEFAULTS.paymentSort
        }
        if (typeof value !== 'string') {
          return PUBLIC_INVESTMENTS_DEFAULTS.paymentSort
        }
        const normalized = value.trim().toLowerCase()
        return (PAYMENT_SORT_VALUES as readonly string[]).includes(normalized)
          ? (normalized as PaymentSort)
          : PUBLIC_INVESTMENTS_DEFAULTS.paymentSort
      },
      z.enum(PAYMENT_SORT_VALUES),
    )
    .default(PUBLIC_INVESTMENTS_DEFAULTS.paymentSort),
  payOrder: z
    .preprocess(
      (value) => {
        if (value === undefined || value === null) {
          return PUBLIC_INVESTMENTS_DEFAULTS.paymentOrder
        }
        if (typeof value !== 'string') {
          return PUBLIC_INVESTMENTS_DEFAULTS.paymentOrder
        }
        const normalized = value.trim().toLowerCase()
        return (ORDER_VALUES as readonly string[]).includes(normalized)
          ? (normalized as SortOrder)
          : PUBLIC_INVESTMENTS_DEFAULTS.paymentOrder
      },
      z.enum(ORDER_VALUES),
    )
    .default(PUBLIC_INVESTMENTS_DEFAULTS.paymentOrder),
})

export type PublicInvestmentsObjectiveSearchState = z.infer<
  typeof PublicInvestmentsObjectiveSearchSchema
>

export function cleanObjectiveSearch(
  search: Partial<PublicInvestmentsObjectiveSearchState>,
): Partial<PublicInvestmentsObjectiveSearchState> {
  const cleaned: Partial<PublicInvestmentsObjectiveSearchState> = { ...search }

  if (cleaned.tab === PUBLIC_INVESTMENTS_DEFAULTS.tab) {
    delete cleaned.tab
  }

  // paySort/payOrder are only meaningful on the `plati` tab; clean them
  // unless the user is on the payments tab so the URL stays minimal.
  const isPaymentsTab = cleaned.tab === 'plati'
  if (!isPaymentsTab) {
    delete cleaned.paySort
    delete cleaned.payOrder
  } else {
    if (cleaned.paySort === PUBLIC_INVESTMENTS_DEFAULTS.paymentSort) {
      delete cleaned.paySort
    }
    if (cleaned.payOrder === PUBLIC_INVESTMENTS_DEFAULTS.paymentOrder) {
      delete cleaned.payOrder
    }
  }

  for (const key of ['stage', 'from', 'siruta'] as const) {
    const value = cleaned[key]
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed) {
        cleaned[key] = trimmed
      } else {
        delete cleaned[key]
      }
    } else {
      delete cleaned[key]
    }
  }

  const county = cleaned.county?.trim()
  if (county) {
    cleaned.county = county.toUpperCase()
  } else {
    delete cleaned.county
  }

  for (const key of Object.keys(cleaned) as (keyof PublicInvestmentsObjectiveSearchState)[]) {
    if (cleaned[key] === undefined) {
      delete cleaned[key]
    }
  }

  return cleaned
}

export function parseObjectiveSearch(
  search: unknown,
): Partial<PublicInvestmentsObjectiveSearchState> {
  return cleanObjectiveSearch(
    PublicInvestmentsObjectiveSearchSchema.parse(asSearchObject(search)),
  )
}

// ---------------------------------------------------------------------------
// Territory (locality / county) search state
// ---------------------------------------------------------------------------

export const PublicInvestmentsTerritorySearchSchema = z.object({
  programs: optionalProgramsParam,
  domains: optionalDomainsParam,
  stages: optionalStagesParam,
  sort: z
    .preprocess(
      (value) => {
        if (value === undefined || value === null) {
          return PUBLIC_INVESTMENTS_DEFAULTS.sort
        }
        if (typeof value !== 'string') {
          return PUBLIC_INVESTMENTS_DEFAULTS.sort
        }
        const normalized = value.trim().toLowerCase()
        return (OBJECTIVE_SORT_VALUES as readonly string[]).includes(normalized)
          ? (normalized as ObjectiveSort)
          : PUBLIC_INVESTMENTS_DEFAULTS.sort
      },
      z.enum(OBJECTIVE_SORT_VALUES),
    )
    .default(PUBLIC_INVESTMENTS_DEFAULTS.sort),
  order: z
    .preprocess(
      (value) => {
        if (value === undefined || value === null) {
          return PUBLIC_INVESTMENTS_DEFAULTS.order
        }
        if (typeof value !== 'string') {
          return PUBLIC_INVESTMENTS_DEFAULTS.order
        }
        const normalized = value.trim().toLowerCase()
        return (ORDER_VALUES as readonly string[]).includes(normalized)
          ? (normalized as SortOrder)
          : PUBLIC_INVESTMENTS_DEFAULTS.order
      },
      z.enum(ORDER_VALUES),
    )
    .default(PUBLIC_INVESTMENTS_DEFAULTS.order),
  view: z
    .preprocess(
      (value) => {
        if (value === undefined || value === null) {
          return PUBLIC_INVESTMENTS_DEFAULTS.view
        }
        if (typeof value !== 'string') {
          return PUBLIC_INVESTMENTS_DEFAULTS.view
        }
        const normalized = value.trim().toLowerCase()
        return (LAYOUT_VIEW_VALUES as readonly string[]).includes(normalized)
          ? (normalized as LayoutView)
          : PUBLIC_INVESTMENTS_DEFAULTS.view
      },
      z.enum(LAYOUT_VIEW_VALUES),
    )
    .default(PUBLIC_INVESTMENTS_DEFAULTS.view),
  selected: optionalIdentifierSearchParam,
})

export type PublicInvestmentsTerritorySearchState = z.infer<
  typeof PublicInvestmentsTerritorySearchSchema
>

export const PUBLIC_INVESTMENTS_TERRITORY_ARRAY_KEYS = [
  'programs',
  'domains',
  'stages',
] as const satisfies readonly (keyof PublicInvestmentsTerritorySearchState)[]

export function cleanTerritorySearch(
  search: Partial<PublicInvestmentsTerritorySearchState>,
): Partial<PublicInvestmentsTerritorySearchState> {
  const cleaned: Partial<PublicInvestmentsTerritorySearchState> = { ...search }

  for (const key of PUBLIC_INVESTMENTS_TERRITORY_ARRAY_KEYS) {
    if (!cleaned[key] || (cleaned[key] as readonly unknown[] | undefined)?.length === 0) {
      delete cleaned[key]
    }
  }

  const selected = cleaned.selected?.trim()
  if (selected) {
    cleaned.selected = selected
  } else {
    delete cleaned.selected
  }

  if (cleaned.sort === PUBLIC_INVESTMENTS_DEFAULTS.sort) delete cleaned.sort
  if (cleaned.order === PUBLIC_INVESTMENTS_DEFAULTS.order) delete cleaned.order
  if (cleaned.view === PUBLIC_INVESTMENTS_DEFAULTS.view) delete cleaned.view

  for (const key of Object.keys(cleaned) as (keyof PublicInvestmentsTerritorySearchState)[]) {
    if (cleaned[key] === undefined) {
      delete cleaned[key]
    }
  }

  return cleaned
}

export function parseTerritorySearch(
  search: unknown,
): Partial<PublicInvestmentsTerritorySearchState> {
  return cleanTerritorySearch(
    PublicInvestmentsTerritorySearchSchema.parse(asSearchObject(search)),
  )
}

// ---------------------------------------------------------------------------
// URL-search-string bridge (used by route loaders / deep-link entry)
// ---------------------------------------------------------------------------

const searchArrayKeySet = new Set<string>([
  ...PUBLIC_INVESTMENTS_SEARCH_ARRAY_KEYS,
  ...PUBLIC_INVESTMENTS_TERRITORY_ARRAY_KEYS,
])
const searchTextKeySet = new Set<string>([
  'view',
  'mapView',
  'program',
  'q',
  'siruta',
  'amountField',
  'sort',
  'order',
  'tab',
  'stage',
  'dovada',
  'from',
  'county',
  'selected',
  'paySort',
  'payOrder',
])
const searchBooleanKeySet = new Set<string>([
  'hasContractorCui',
  'hasDesignerCui',
  'hasSiruta',
])
const searchNumberKeySet = new Set<string>([
  'page',
  'pageSize',
  'mapLat',
  'mapLng',
  'mapZoom',
  'amountMin',
  'amountMax',
  'absMin',
  'absMax',
])

function parseJsonSearchValue(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    // Continue to the router-compatible URI-decoding fallback.
  }

  try {
    return JSON.parse(decodeURIComponent(value.replace(/\+/g, '%20')))
  } catch {
    return value
  }
}

function parseArraySearchStringValue(value: string): unknown {
  const parsed = parseJsonSearchValue(value)
  return Array.isArray(parsed) ? parsed : [value]
}

function parseBooleanSearchStringValue(value: string): unknown {
  if (value === 'true') return true
  if (value === 'false') return false
  return value
}

function parseNumberSearchStringValue(value: string): unknown {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : value
}

function parseSearchStringValue(key: string, value: string): unknown {
  if (searchArrayKeySet.has(key)) return parseArraySearchStringValue(value)
  if (searchTextKeySet.has(key)) return value
  if (searchBooleanKeySet.has(key)) return parseBooleanSearchStringValue(value)
  if (searchNumberKeySet.has(key)) return parseNumberSearchStringValue(value)
  return value
}

/**
 * Parse a raw `?a=b&c=d` string into the appropriate permissive search-state
 * object. The `surface` selects which route's schema/cleaner is applied.
 */
export function parsePublicInvestmentsSearchString(
  searchStr: string,
  surface: 'layout' | 'landing' | 'search' | 'objective' | 'territory',
):
  | Partial<PublicInvestmentsLayoutSearchState>
  | Partial<PublicInvestmentsLandingSearchState>
  | Partial<PublicInvestmentsSearchState>
  | Partial<PublicInvestmentsObjectiveSearchState>
  | Partial<PublicInvestmentsTerritorySearchState> {
  const rawSearch: Record<string, unknown> = {}
  const params = new URLSearchParams(searchStr)

  params.forEach((value, key) => {
    rawSearch[key] = parseSearchStringValue(key, value)
  })

  switch (surface) {
    case 'layout':
      return parseLayoutSearch(rawSearch)
    case 'landing':
      return parseLandingSearch(rawSearch)
    case 'objective':
      return parseObjectiveSearch(rawSearch)
    case 'territory':
      return parseTerritorySearch(rawSearch)
    case 'search':
    default:
      return parseSearchState(rawSearch)
  }
}

export { isProgramCode, isStageBucket }
