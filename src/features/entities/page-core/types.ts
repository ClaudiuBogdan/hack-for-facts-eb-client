import type { Currency, Normalization } from '@/schemas/charts'
import type { GqlReportType, ReportPeriodInput, ReportPeriodType, TMonth, TQuarter } from '@/schemas/reporting'

export type EntityPageRouteId = 'entities' | 'primarie'

export type EntityPageLocale = 'ro' | 'en'

export type EntityPagePublicSettings = {
  readonly normalization: Normalization
  readonly currency: Currency
  readonly inflationAdjusted: boolean
  readonly showPeriodGrowth: boolean
}

export type EntityPageExecutionContext = {
  readonly routeId: EntityPageRouteId
  readonly cui: string
  readonly lang?: EntityPageLocale
  readonly period: ReportPeriodType
  readonly year: number
  readonly month?: TMonth
  readonly quarter?: TQuarter
  readonly reportType?: GqlReportType
  readonly effectiveReportType?: GqlReportType
  readonly mainCreditorCui?: string
  readonly activeView?: string
  readonly publicSettings: EntityPagePublicSettings
}

export type EntityPageExactQueryInputs = {
  readonly entityDetails: {
    readonly cui: string
    readonly reportPeriod: ReportPeriodInput
    readonly reportType?: GqlReportType
    readonly trendPeriod: ReportPeriodInput
    readonly mainCreditorCui?: string
    readonly normalization: Normalization
    readonly currency: Currency
    readonly inflation_adjusted: boolean
    readonly show_period_growth: boolean
  }
  readonly entityExecutionLineItems?: {
    readonly cui: string
    readonly reportPeriod: ReportPeriodInput
    readonly reportType?: GqlReportType
    readonly mainCreditorCui?: string
    readonly normalization: Normalization
    readonly currency: Currency
    readonly inflation_adjusted: boolean
  }
}

export type EntityPageQueryPlanStep = {
  readonly id: string
  readonly queryKey: readonly unknown[]
  readonly executionClass: 'blocking' | 'backgroundPrefetch' | 'clientOnly'
  readonly requiresEntityDetails?: boolean
  readonly requiresExecutionLineItems?: boolean
}

export type EntityPageQueryPlan = {
  readonly blocking: readonly EntityPageQueryPlanStep[]
  readonly backgroundPrefetch: readonly EntityPageQueryPlanStep[]
  readonly clientOnly: readonly EntityPageQueryPlanStep[]
}

export type EntityPageCanonicalRedirect = {
  readonly destinationSearch: Record<string, unknown>
  readonly replace: boolean
}

export type EntityPageRoutePolicy = {
  readonly routeId: EntityPageRouteId
  readonly canonicalPathname: string
  readonly shareImagePathname: string
  readonly isIndexable: boolean
}
