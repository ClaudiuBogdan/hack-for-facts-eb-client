import { z } from 'zod'
import { Currency } from './charts'

export const RawPnrrProjectSchema = z.object({
  'Titlu Proiect': z.string(),
  'Nume Beneficiar': z.string(),
  'CUI': z.string().nullable(),
  'Județ': z.string(),
  'Sursă Finanțare': z.enum(['grant', 'loan', 'grant/loan']),
  'Valoare (EUR)': z.number(),
  'Progres Tehnic': z.string(),
  'Progres Financiar': z.string().optional(),
  'Cod Componentă': z.string(),
  'Cod Măsură': z.string(),
  'Localitate': z.string(),
  'CRI': z.string(),
})

export type RawPnrrProject = z.infer<typeof RawPnrrProjectSchema>

export type PnrrProjectStatus =
  | 'completed'
  | 'not-started'
  | 'under-30'
  | 'mid-progress'
  | 'advanced'
  | 'unknown'

export type AnomalyType =
  | 'financial-overrun'
  | 'stalled-completion'
  | 'payment-ahead-delivery'
  | 'large-low-progress'

export type DataQualitySignalType =
  | 'duplicate-conflict'
  | 'large-missing-financial-progress'
  | 'completed-missing-financial-progress'

export const PNRR_ENTITY_TYPE_VALUES = ['public', 'private'] as const

export type PnrrEntityType = typeof PNRR_ENTITY_TYPE_VALUES[number]

export const PNRR_BENEFICIARY_TYPE_VALUES = [
  'public',
  'private',
  'other-private',
  'national',
  'uat',
  'county-council',
  'ministry',
  'central-agency',
  'public-company',
  'education',
  'health',
  'military',
  'company',
  'ngo',
  'religious',
  'culture',
  'social',
  'other-public',
] as const

export type PnrrBeneficiaryType = typeof PNRR_BENEFICIARY_TYPE_VALUES[number]

export type PnrrGranularity = 'national' | 'county' | 'uat'

export type PnrrProject = {
  readonly id: string
  readonly title: string
  readonly beneficiary: string
  readonly cui: string | null
  readonly county: string
  readonly locality: string
  readonly fundingSource: 'grant' | 'loan' | 'grant/loan'
  readonly valueEur: number
  readonly techProgress: number | null | 'in-implementation'
  readonly finProgress: number | null | 'in-implementation'
  readonly status: PnrrProjectStatus
  readonly componentCode: string
  readonly measureCode: string
  readonly measureFullCode: string
  readonly cri: string
  readonly anomalies: readonly AnomalyType[]
  readonly dataQualitySignals: readonly DataQualitySignalType[]
  readonly isReform: boolean
  readonly entityType: PnrrEntityType
  readonly beneficiaryType: PnrrBeneficiaryType
  readonly sirutaCode: string | null
}

export type PnrrAggregates = {
  readonly rawTotalValue: number
  readonly deduplicatedTotalValue: number
  readonly rawProjectCount: number
  readonly deduplicatedProjectCount: number
  readonly completedCount: number
  readonly completedValue: number
  readonly inProgressCount: number
  readonly notStartedCount: number
  readonly missingFinProgressCount: number
  readonly missingFinProgressPercent: number
  readonly grantTotal: number
  readonly loanTotal: number
  readonly mixedTotal: number
  readonly loanPercent: number
  readonly componentStats: Record<
    string,
    {
      readonly count: number
      readonly value: number
      readonly missingFinProgress: number
    }
  >
  readonly countyStats: Record<
    string,
    {
      readonly count: number
      readonly value: number
    }
  >
  readonly anomalyCounts: Record<AnomalyType, { readonly count: number; readonly value: number }>
  readonly dataQualitySignalCounts: Record<
    DataQualitySignalType,
    { readonly count: number; readonly value: number }
  >
  readonly topBeneficiaries: Array<{
    readonly beneficiary: string
    readonly cui: string | null
    readonly count: number
    readonly value: number
  }>
}

export const PnrrViewSchema = z.enum(['overview', 'projects', 'anomalies', 'map', 'beneficiaries'])
export type PnrrView = z.infer<typeof PnrrViewSchema>

export const PnrrPanelSchema = z.enum([
  'project',
  'beneficiary',
  'map-county',
  'map-uat',
  'anomaly-info',
])
export type PnrrPanel = z.infer<typeof PnrrPanelSchema>

export const PnrrPanelSignalKindSchema = z.enum(['risk', 'data-quality'])
export type PnrrPanelSignalKind = z.infer<typeof PnrrPanelSignalKindSchema>

export const PnrrProjectSortBySchema = z.enum([
  'value',
  'title',
  'techProgress',
  'finProgress',
  'county',
  'beneficiary',
  'component',
])
export type PnrrProjectSortBy = z.infer<typeof PnrrProjectSortBySchema>

export const PnrrBeneficiarySortBySchema = z.enum([
  'value',
  'beneficiary',
  'count',
  'component',
  'techProgress',
  'finProgress',
])
export type PnrrBeneficiarySortBy = z.infer<typeof PnrrBeneficiarySortBySchema>

export const PNRR_SEARCH_DEFAULTS = {
  view: 'overview',
  onlyAnomalies: false,
  excludeMicro: false,
  granularity: 'county',
  includeNational: true,
  sortBy: 'value',
  sortOrder: 'desc',
  page: 1,
  pageSize: 25,
  beneficiarySortBy: 'value',
  beneficiarySortOrder: 'desc',
  beneficiaryPage: 1,
} as const

const optionalTextSearchParam = z.preprocess(
  (value) => {
    if (value === undefined || value === null) return undefined
    if (typeof value === 'string') return value
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value)
    }
    return value
  },
  z.string().optional(),
)

const optionalIdentifierSearchParam = z.preprocess(
  (value) => {
    if (value === undefined || value === null) return undefined
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value)
    }
    if (typeof value !== 'string') return value

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
      // Keep the trimmed raw value when it is not a JSON-encoded primitive.
    }

    return trimmed
  },
  z.string().optional(),
)

function isPnrrEntityType(value: unknown): value is PnrrEntityType {
  return (
    typeof value === 'string' &&
    PNRR_ENTITY_TYPE_VALUES.includes(value as PnrrEntityType)
  )
}

const optionalEntityTypesSearchParam = z.preprocess(
  (value) => {
    if (value === undefined || value === null) return undefined
    const values = Array.isArray(value) ? value : [value]
    return values.filter(isPnrrEntityType)
  },
  z.array(z.enum(PNRR_ENTITY_TYPE_VALUES)).optional(),
)

export const PnrrSearchSchema = z.object({
  view: PnrrViewSchema.default(PNRR_SEARCH_DEFAULTS.view),
  search: optionalTextSearchParam,
  beneficiarySearch: optionalTextSearchParam,
  beneficiaryCui: optionalIdentifierSearchParam,
  uatSiruta: optionalIdentifierSearchParam,
  uatName: optionalTextSearchParam,
  uatSirutas: z.array(z.string()).optional(),
  components: z.array(z.string()).optional(),
  counties: z.array(z.string()).optional(),
  fundingSources: z.array(z.enum(['grant', 'loan', 'grant/loan'])).optional(),
  measures: z.array(z.string()).optional(),
  cris: z.array(z.string()).optional(),
  progressCategories: z
    .array(z.enum(['completed', 'advanced', 'mid', 'under30', 'not-started', 'unknown']))
    .optional(),
  onlyAnomalies: z.boolean().optional().default(PNRR_SEARCH_DEFAULTS.onlyAnomalies),
  excludeMicro: z.boolean().optional().default(PNRR_SEARCH_DEFAULTS.excludeMicro),
  anomalyTypes: z.array(z.string()).optional(),
  dataQualitySignalTypes: z.array(z.string()).optional(),
  granularity: z
    .enum(['national', 'county', 'uat'])
    .optional()
    .default(PNRR_SEARCH_DEFAULTS.granularity),
  entityTypes: optionalEntityTypesSearchParam,
  beneficiaryTypes: z.array(z.enum(PNRR_BENEFICIARY_TYPE_VALUES)).optional(),
  currency: Currency.optional(),
  includeNational: z.boolean().optional().default(PNRR_SEARCH_DEFAULTS.includeNational),
  sortBy: PnrrProjectSortBySchema.default(PNRR_SEARCH_DEFAULTS.sortBy),
  sortOrder: z.enum(['asc', 'desc']).default(PNRR_SEARCH_DEFAULTS.sortOrder),
  page: z.preprocess(
    (val) => {
      if (val === undefined) return PNRR_SEARCH_DEFAULTS.page
      const n = Number(val)
      return Number.isFinite(n) && n >= 1 ? Math.floor(n) : PNRR_SEARCH_DEFAULTS.page
    },
    z.number()
  ),
  pageSize: z.preprocess(
    (val) => {
      if (val === undefined) return PNRR_SEARCH_DEFAULTS.pageSize
      const n = Number(val)
      return Number.isFinite(n) && n >= 1 ? Math.floor(n) : PNRR_SEARCH_DEFAULTS.pageSize
    },
    z.number()
  ),
  beneficiarySortBy: PnrrBeneficiarySortBySchema.default(
    PNRR_SEARCH_DEFAULTS.beneficiarySortBy,
  ),
  beneficiarySortOrder: z
    .enum(['asc', 'desc'])
    .default(PNRR_SEARCH_DEFAULTS.beneficiarySortOrder),
  beneficiaryPage: z.preprocess(
    (val) => {
      if (val === undefined) return PNRR_SEARCH_DEFAULTS.beneficiaryPage
      const n = Number(val)
      return Number.isFinite(n) && n >= 1
        ? Math.floor(n)
        : PNRR_SEARCH_DEFAULTS.beneficiaryPage
    },
    z.number(),
  ),
  mapLat: z.coerce.number().optional(),
  mapLng: z.coerce.number().optional(),
  mapZoom: z.coerce.number().optional(),
  panel: PnrrPanelSchema.optional(),
  panelProjectId: optionalIdentifierSearchParam,
  panelBeneficiaryCui: optionalIdentifierSearchParam,
  panelCountyCode: optionalIdentifierSearchParam,
  panelUatSiruta: optionalIdentifierSearchParam,
  panelSignalKind: PnrrPanelSignalKindSchema.optional(),
  panelSignalType: optionalIdentifierSearchParam,
})

export type PnrrSearchState = z.infer<typeof PnrrSearchSchema>

export const arraySearchKeys = [
  'components',
  'counties',
  'fundingSources',
  'measures',
  'cris',
  'progressCategories',
  'anomalyTypes',
  'dataQualitySignalTypes',
  'entityTypes',
  'beneficiaryTypes',
  'uatSirutas',
] as const satisfies readonly (keyof PnrrSearchState)[]

export function cleanPnrrSearch(search: Partial<PnrrSearchState>): Partial<PnrrSearchState> {
  const cleaned: Partial<PnrrSearchState> = { ...search }

  const searchText = cleaned.search?.trim()
  if (searchText) {
    cleaned.search = searchText
  } else {
    delete cleaned.search
  }

  const beneficiarySearchText = cleaned.beneficiarySearch?.trim()
  if (beneficiarySearchText) {
    cleaned.beneficiarySearch = beneficiarySearchText
  } else {
    delete cleaned.beneficiarySearch
  }

  const beneficiaryCuiText = cleaned.beneficiaryCui?.trim()
  if (beneficiaryCuiText) {
    cleaned.beneficiaryCui = beneficiaryCuiText
  } else {
    delete cleaned.beneficiaryCui
  }

  const uatSirutaText = cleaned.uatSiruta?.trim()
  if (uatSirutaText) {
    cleaned.uatSiruta = uatSirutaText
  } else {
    delete cleaned.uatSiruta
  }

  delete cleaned.uatName

  const panelProjectIdText = cleaned.panelProjectId?.trim()
  const panelBeneficiaryCuiText = cleaned.panelBeneficiaryCui?.trim()
  const panelCountyCodeText = cleaned.panelCountyCode?.trim()
  const panelUatSirutaText = cleaned.panelUatSiruta?.trim()
  const panelSignalTypeText = cleaned.panelSignalType?.trim()

  delete cleaned.panelProjectId
  delete cleaned.panelBeneficiaryCui
  delete cleaned.panelCountyCode
  delete cleaned.panelUatSiruta
  delete cleaned.panelSignalKind
  delete cleaned.panelSignalType

  if (cleaned.panel === 'project' && panelProjectIdText) {
    cleaned.panelProjectId = panelProjectIdText
  } else if (cleaned.panel === 'beneficiary' && panelBeneficiaryCuiText) {
    cleaned.panelBeneficiaryCui = panelBeneficiaryCuiText
  } else if (cleaned.panel === 'map-county' && panelCountyCodeText) {
    cleaned.panelCountyCode = panelCountyCodeText.toUpperCase()
    if (panelProjectIdText) {
      cleaned.panelProjectId = panelProjectIdText
    }
  } else if (cleaned.panel === 'map-uat' && panelUatSirutaText) {
    cleaned.panelUatSiruta = panelUatSirutaText
    if (panelProjectIdText) {
      cleaned.panelProjectId = panelProjectIdText
    }
  } else if (cleaned.panel === 'anomaly-info') {
    if (search.panelSignalKind && panelSignalTypeText) {
      cleaned.panelSignalKind = search.panelSignalKind
      cleaned.panelSignalType = panelSignalTypeText
    }
  } else {
    delete cleaned.panel
  }

  for (const key of arraySearchKeys) {
    if (!cleaned[key]?.length) {
      delete cleaned[key]
    }
  }

  if (cleaned.view === PNRR_SEARCH_DEFAULTS.view) delete cleaned.view
  if (cleaned.onlyAnomalies === PNRR_SEARCH_DEFAULTS.onlyAnomalies) delete cleaned.onlyAnomalies
  if (cleaned.excludeMicro === PNRR_SEARCH_DEFAULTS.excludeMicro) delete cleaned.excludeMicro
  if (cleaned.granularity === PNRR_SEARCH_DEFAULTS.granularity) delete cleaned.granularity
  if (cleaned.includeNational === PNRR_SEARCH_DEFAULTS.includeNational) delete cleaned.includeNational
  if (cleaned.sortBy === PNRR_SEARCH_DEFAULTS.sortBy) delete cleaned.sortBy
  if (cleaned.sortOrder === PNRR_SEARCH_DEFAULTS.sortOrder) delete cleaned.sortOrder
  if (cleaned.page === PNRR_SEARCH_DEFAULTS.page) delete cleaned.page
  if (cleaned.pageSize === PNRR_SEARCH_DEFAULTS.pageSize) delete cleaned.pageSize
  if (cleaned.beneficiarySortBy === PNRR_SEARCH_DEFAULTS.beneficiarySortBy) {
    delete cleaned.beneficiarySortBy
  }
  if (
    cleaned.beneficiarySortOrder === PNRR_SEARCH_DEFAULTS.beneficiarySortOrder
  ) {
    delete cleaned.beneficiarySortOrder
  }
  if (cleaned.beneficiaryPage === PNRR_SEARCH_DEFAULTS.beneficiaryPage) {
    delete cleaned.beneficiaryPage
  }

  if (cleaned.mapLat == null || cleaned.mapLng == null || cleaned.mapZoom == null) {
    delete cleaned.mapLat
    delete cleaned.mapLng
    delete cleaned.mapZoom
  }

  for (const key of Object.keys(cleaned) as (keyof PnrrSearchState)[]) {
    if (cleaned[key] === undefined) {
      delete cleaned[key]
    }
  }

  return cleaned
}

export function parsePnrrSearch(search: unknown): Partial<PnrrSearchState> {
  return cleanPnrrSearch(PnrrSearchSchema.parse(search))
}

const arraySearchKeySet = new Set<string>(arraySearchKeys)
const textSearchKeySet = new Set<string>([
  'view',
  'search',
  'beneficiarySearch',
  'beneficiaryCui',
  'uatSiruta',
  'uatName',
  'granularity',
  'currency',
  'sortBy',
  'sortOrder',
  'beneficiarySortBy',
  'beneficiarySortOrder',
  'panel',
  'panelProjectId',
  'panelBeneficiaryCui',
  'panelCountyCode',
  'panelUatSiruta',
  'panelSignalKind',
  'panelSignalType',
])
const booleanSearchKeySet = new Set<string>([
  'onlyAnomalies',
  'excludeMicro',
  'includeNational',
])
const numberSearchKeySet = new Set<string>([
  'page',
  'pageSize',
  'beneficiaryPage',
  'mapLat',
  'mapLng',
  'mapZoom',
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

function parseArraySearchValue(value: string): unknown {
  const parsed = parseJsonSearchValue(value)
  return Array.isArray(parsed) ? parsed : [value]
}

function parseBooleanSearchValue(value: string): unknown {
  if (value === 'true') return true
  if (value === 'false') return false
  return value
}

function parseNumberSearchValue(value: string): unknown {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : value
}

function parseSearchValue(key: string, value: string): unknown {
  if (arraySearchKeySet.has(key)) return parseArraySearchValue(value)
  if (textSearchKeySet.has(key)) return value
  if (booleanSearchKeySet.has(key)) return parseBooleanSearchValue(value)
  if (numberSearchKeySet.has(key)) return parseNumberSearchValue(value)
  return value
}

export function parsePnrrSearchString(searchStr: string): Partial<PnrrSearchState> {
  const rawSearch: Record<string, unknown> = {}
  const params = new URLSearchParams(searchStr)

  params.forEach((value, key) => {
    rawSearch[key] = parseSearchValue(key, value)
  })

  return parsePnrrSearch(rawSearch)
}
