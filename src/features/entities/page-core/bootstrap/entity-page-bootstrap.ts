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
import {
  settleWithinDeadline,
  type EntityPageSsrDeadline,
} from './entity-page-ssr-deadline'

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

export type EntityPageBootstrapOutcome =
  | { readonly status: 'complete'; readonly result: EntityPageBootstrapResult }
  | { readonly status: 'timed-out' }

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

export const ENTITY_PAGE_DEGRADED_RESPONSE_STATUS = 503
export const ENTITY_PAGE_DEGRADED_RETRY_AFTER_SECONDS = 5

/**
 * Mark the response as served past the SSR deadline. Browsers render a 503
 * body like any other, so readers get the shell and the client recovery, while
 * crawlers and link unfurlers — which run no JavaScript and keep whatever
 * `<title>`/`og:` tags they saw — treat it as temporary instead of indexing
 * or caching the placeholder head. Nitro's route cache stores nothing at or
 * above 400, which no `Cache-Control` value could guarantee on its own.
 *
 * The status only reaches the HTML response through `src/server.ts`: the
 * stream renderer reads the router's status store, not the response's. The
 * matching `Retry-After` travels with the route's `headers`, the one channel
 * the renderer merges into the HTML response.
 */
export const markEntityPageResponseDegraded = createIsomorphicFn()
  .client(() => undefined)
  .server(async (): Promise<void> => {
    const { setResponseStatus } = await import('@tanstack/react-start/server')

    setResponseStatus(ENTITY_PAGE_DEGRADED_RESPONSE_STATUS)
  })

/** Headers for a response served past the SSR deadline. */
export function createEntityPageDegradedHeaders(): Record<string, string> {
  return {
    'Cache-Control': 'no-store',
    'Retry-After': String(ENTITY_PAGE_DEGRADED_RETRY_AFTER_SECONDS),
  }
}

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
      // and format these numbers using the same normalization as the API.
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

type BlockingQuery = {
  readonly queryKey: readonly unknown[]
  readonly ensure: () => Promise<unknown>
}

/**
 * The one place that maps a blocking query id to its query: both running the
 * bootstrap and abandoning it on the SSR deadline go through this list, so
 * the keys abandoned are always the keys that were ensured.
 */
function resolveBlockingQueries(
  input: EntityPageBootstrapInput,
  dependencies: EntityPageBootstrapDependencies,
): readonly BlockingQuery[] {
  const {
    createEntityDetailsQueryOptions = entityDetailsQueryOptions,
    createEntityExecutionLineItemsQueryOptions =
      entityExecutionLineItemsQueryOptions,
  } = dependencies
  const blockingQueryIds =
    input.blockingQueryIds ?? DEFAULT_BLOCKING_QUERY_IDS

  return blockingQueryIds.flatMap((blockingQueryId): readonly BlockingQuery[] => {
    switch (blockingQueryId) {
      case 'entityDetails': {
        const options = createEntityDetailsQueryOptions(
          input.exactQueryInputs.entityDetails,
        )
        return [
          {
            queryKey: options.queryKey,
            ensure: () => input.queryClient.ensureQueryData(options),
          },
        ]
      }
      case 'entityExecutionLineItems': {
        if (!input.exactQueryInputs.entityExecutionLineItems) {
          return []
        }
        const options = createEntityExecutionLineItemsQueryOptions(
          input.exactQueryInputs.entityExecutionLineItems,
        )
        return [
          {
            queryKey: options.queryKey,
            ensure: () => input.queryClient.ensureQueryData(options),
          },
        ]
      }
    }
  })
}

export async function runEntityPageBlockingBootstrap(
  input: EntityPageBootstrapInput,
  dependencies: EntityPageBootstrapDependencies = {},
): Promise<EntityPageBootstrapResult> {
  const {
    createEntityDetailsQueryOptions = entityDetailsQueryOptions,
  } = dependencies
  const entityDetailsOptions = createEntityDetailsQueryOptions(
    input.exactQueryInputs.entityDetails,
  )

  await Promise.all(
    resolveBlockingQueries(input, dependencies).map((query) => query.ensure()),
  )

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

/**
 * Cancel and drop a query the server gave up on. Cancelling aborts the fetch;
 * dropping matters too: the router's query integration dehydrates every
 * query, and a pending one travels with its promise, which the client would
 * adopt as the fetch's first attempt (`hydrate` → `initialPromise`) — a
 * rejected or never-settling promise instead of a fresh request.
 */
export async function abandonServerQuery(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
): Promise<void> {
  await queryClient.cancelQueries({ queryKey, exact: true })
  queryClient.removeQueries({ queryKey, exact: true })
}

/**
 * The blocking bootstrap under the SSR deadline. When the deadline wins, the
 * in-flight blocking queries are abandoned so the server stops waiting on the
 * API and the client starts them afresh, and the caller serves the shell.
 * Without a deadline (the client, or `ENTITY_PAGE_SSR_DEADLINE_MS=0`) this is
 * exactly `runEntityPageBlockingBootstrap`.
 */
export async function runEntityPageBootstrapWithinDeadline(
  input: EntityPageBootstrapInput & {
    readonly deadline?: EntityPageSsrDeadline
  },
  dependencies: EntityPageBootstrapDependencies = {},
): Promise<EntityPageBootstrapOutcome> {
  const { deadline, ...bootstrapInput } = input
  const outcome = await settleWithinDeadline(
    runEntityPageBlockingBootstrap(bootstrapInput, dependencies),
    deadline,
  )

  if (outcome.status === 'resolved') {
    return { status: 'complete', result: outcome.value }
  }

  await Promise.all(
    resolveBlockingQueries(bootstrapInput, dependencies).map((query) =>
      abandonServerQuery(bootstrapInput.queryClient, query.queryKey),
    ),
  )

  return { status: 'timed-out' }
}
