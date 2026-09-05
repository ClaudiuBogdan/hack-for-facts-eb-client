import { supportsEntityPopulation } from '@/lib/entity-population'
import type { QueryClient } from '@tanstack/react-query'
import { resolveAppliedNormalization } from '@/lib/normalization'
import { createIsomorphicFn } from '@tanstack/react-start'
import type { EntityDetailsData } from '@/lib/api/entities'
import {
  entityDetailsQueryOptions,
  entityExecutionLineItemsQueryOptions,
} from '@/lib/hooks/useEntityDetails'
import type { EntitySeoSnapshot } from '@/features/entities/seo/entity-share-seo'
import type {
  EntityPageExecutionContext,
  EntityPageExactQueryInputs,
} from '../types'

type EntityPageSeoEntity = Pick<
  EntityDetailsData,
  | 'name'
  | 'entity_type'
  | 'is_uat'
  | 'is_territorial_executive'
  | 'default_report_type'
  | 'uat'
  | 'totalIncome'
  | 'totalExpenses'
  | 'budgetBalance'
>

export type EntityPageLoaderPayload = {
  readonly entitySeoSnapshot: EntitySeoSnapshot
  readonly ssrEntityDetailsParams: EntityPageExactQueryInputs['entityDetails']
  readonly ssrEntityExecutionLineItemsParams?: EntityPageExactQueryInputs['entityExecutionLineItems']
  readonly requestSiteUrl?: string
}

export type EntityPageBlockingQueryId =
  | 'entityDetails'
  | 'entityExecutionLineItems'

export type EntityPageBootstrapInput = {
  readonly queryClient: QueryClient
  readonly executionContext: EntityPageExecutionContext
  readonly exactQueryInputs: EntityPageExactQueryInputs
  readonly requestSiteUrl?: string
  readonly blockingQueryIds?: readonly EntityPageBlockingQueryId[]
}

export type EntityPageBootstrapDependencies = {
  readonly createEntityDetailsQueryOptions?: typeof entityDetailsQueryOptions
  readonly createEntityExecutionLineItemsQueryOptions?: typeof entityExecutionLineItemsQueryOptions
}

export type EntityPageBootstrapResult = {
  readonly entityDetails?: EntityDetailsData
  readonly payload: EntityPageLoaderPayload
}

const DEFAULT_BLOCKING_QUERY_IDS = ['entityDetails'] as const

export const readEntityPageRequestOrigin = createIsomorphicFn()
  .client(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    return window.location.origin
  })
  .server(async (): Promise<string | undefined> => {
    const { getRequestUrl } = await import('@tanstack/react-start/server')

    return getRequestUrl().origin
  })

export function buildEntityPageSeoSnapshotBase(params: {
  readonly executionContext: EntityPageExecutionContext
}): EntitySeoSnapshot {
  const { executionContext } = params

  const appliedPublicNormalization = resolveAppliedNormalization({
    normalization: executionContext.publicSettings.normalization,
    currency: executionContext.publicSettings.currency,
    inflation_adjusted: executionContext.publicSettings.inflationAdjusted,
    show_period_growth: executionContext.publicSettings.showPeriodGrowth,
  })
  return {
    cui: executionContext.cui,
    filterContext: {
      year: executionContext.year,
      period: executionContext.period,
      month: executionContext.month,
      quarter: executionContext.quarter,
      reportType: executionContext.reportType,
      mainCreditorCui: executionContext.mainCreditorCui,
      normalization: executionContext.publicSettings.normalization,
      // Applied, not requested: the share image and the SEO description label
      // and format these numbers, and the budget API has no CPI/USD yet.
      currency: appliedPublicNormalization.currency,
      inflationAdjusted: appliedPublicNormalization.inflationAdjusted,
      showPeriodGrowth: executionContext.publicSettings.showPeriodGrowth,
      lang: executionContext.lang,
    },
  }
}

export function buildEntityPageSeoSnapshot(params: {
  readonly executionContext: EntityPageExecutionContext
  readonly entity?: EntityPageSeoEntity | null
}): EntitySeoSnapshot {
  const baseSnapshot = buildEntityPageSeoSnapshotBase({
    executionContext: params.executionContext,
  })

  if (!params.entity) {
    return baseSnapshot
  }

  return {
    ...baseSnapshot,
    name: params.entity.name,
    entityType: params.entity.entity_type,
    defaultReportType: params.entity.default_report_type,
    countyName: params.entity.uat?.county_name,
    population: supportsEntityPopulation(params.entity)
      ? params.entity.uat?.population
      : undefined,
    totalIncome: params.entity.totalIncome,
    totalExpenses: params.entity.totalExpenses,
    budgetBalance: params.entity.budgetBalance,
  }
}

export function buildEntityPageLoaderPayload(params: {
  readonly executionContext: EntityPageExecutionContext
  readonly exactQueryInputs: EntityPageExactQueryInputs
  readonly entityDetails?: EntityDetailsData
  readonly requestSiteUrl?: string
}): EntityPageLoaderPayload {
  const payload: EntityPageLoaderPayload = {
    entitySeoSnapshot: buildEntityPageSeoSnapshot({
      executionContext: params.executionContext,
      entity: params.entityDetails,
    }),
    ssrEntityDetailsParams: params.exactQueryInputs.entityDetails,
    ...(params.exactQueryInputs.entityExecutionLineItems
      ? {
        ssrEntityExecutionLineItemsParams:
          params.exactQueryInputs.entityExecutionLineItems,
      }
      : {}),
    ...(params.requestSiteUrl
      ? { requestSiteUrl: params.requestSiteUrl }
      : {}),
  }

  return payload
}

export async function runEntityPageBlockingBootstrap(
  input: EntityPageBootstrapInput,
  dependencies: EntityPageBootstrapDependencies = {},
): Promise<EntityPageBootstrapResult> {
  const {
    createEntityDetailsQueryOptions = entityDetailsQueryOptions,
    createEntityExecutionLineItemsQueryOptions =
      entityExecutionLineItemsQueryOptions,
  } = dependencies
  const blockingQueryIds =
    input.blockingQueryIds ?? DEFAULT_BLOCKING_QUERY_IDS
  const entityDetailsOptions = createEntityDetailsQueryOptions(
    input.exactQueryInputs.entityDetails,
  )

  const blockingQueries = blockingQueryIds.map((blockingQueryId) => {
    if (blockingQueryId === 'entityDetails') {
      return input.queryClient.ensureQueryData(entityDetailsOptions)
    }

    if (!input.exactQueryInputs.entityExecutionLineItems) {
      return Promise.resolve(undefined)
    }

    return input.queryClient.ensureQueryData(
      createEntityExecutionLineItemsQueryOptions(
        input.exactQueryInputs.entityExecutionLineItems,
      ),
    )
  })

  await Promise.all(blockingQueries)

  const entityDetails = input.queryClient.getQueryData<EntityDetailsData>(
    entityDetailsOptions.queryKey,
  )

  return {
    entityDetails,
    payload: buildEntityPageLoaderPayload({
      executionContext: input.executionContext,
      exactQueryInputs: input.exactQueryInputs,
      entityDetails,
      requestSiteUrl: input.requestSiteUrl,
    }),
  }
}
