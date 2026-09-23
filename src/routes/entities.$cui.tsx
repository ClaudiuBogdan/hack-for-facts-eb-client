import { isRedesignOnlyApiDeployment } from '@/lib/api/api-mode'
import { entityDetailsQueryOptions } from '@/lib/hooks/useEntityDetails'
import { entityIdentityQueryOptions } from '@/lib/queries/entity-identity'
import { isCancelledError } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { entitySearchSchema } from '@/components/entities/validation'
import {
  abandonServerQuery,
  buildEntityPageLoaderPayload,
  createEntityPageDegradedHeaders,
  createEntityPageSsrDeadline,
  getEntityPageQueryPlan,
  markEntityPageResponseDegraded,
  readEntityPageRequestOrigin,
  resolveEntityPageQueryInputs,
  runEntityPageBootstrapWithinDeadline,
  settleWithinDeadline,
  type EntityPageExecutionContext,
  type EntityPageLoaderPayload,
} from '@/features/entities/page-core'
import { EntityPagePending } from '@/features/entities/components/entity-page-pending'
import { resolveEntityPageRouteHeadContract } from '@/features/entities/page-core/seo/entity-page-route-policy'
import { resolveEntitiesEntityRouteAdapter } from '@/features/entities/page-core/route-adapters/entities-entity-route-adapter'
import { buildEntityRouteHead } from '@/features/entities/seo/entity-share-seo'
import {
  parseBooleanParam,
  parseCurrencyParam,
  resolveNormalizationSettings,
} from '@/lib/globalSettings/params'
import { createNoStoreHeaders, createPublicPageCacheHeaders } from '@/lib/http-cache'
import { readClientCurrencyPreference, readClientInflationAdjustedPreference } from '@/lib/user-preferences'
import { toExecutionReportType } from '@/schemas/reporting'

export type EntitySearchSchema = z.infer<typeof entitySearchSchema>

type EntityPageBootstrapPayload = {
  readonly executionContext: EntityPageExecutionContext
  readonly exactQueryInputs: ReturnType<
    typeof resolveEntitiesEntityRouteAdapter
  >['exactQueryInputs']
  readonly queryPlan: ReturnType<typeof getEntityPageQueryPlan>
  readonly loaderPayload: EntityPageLoaderPayload
}

/**
 * Anything but `complete` means the payload carries no entity data and the
 * lazy route should re-run the loader on the client to complete it and the
 * `<head>`:
 * - `timed-out`: the server hit the SSR deadline before the blocking queries
 *   resolved and served the shell, as a 503 with no-store;
 * - `cancelled`: a client-side reload lost its query when the page moved on
 *   (see the loader's catch). Returning to the page later must recover again,
 *   which a `complete` payload without a name would never trigger.
 */
export type EntityRouteSsrBootstrapStatus = 'complete' | 'timed-out' | 'cancelled'

type EntityRouteLoaderData = {
  readonly entityPageBootstrap: EntityPageBootstrapPayload
  readonly initialSettings: {
    readonly currency: 'RON' | 'EUR' | 'USD'
    readonly inflationAdjusted: boolean
  }
  readonly ssrSettings: {
    readonly currency: 'RON' | 'EUR' | 'USD'
    readonly inflationAdjusted: boolean
  }
  readonly forcedOverrides: ReturnType<typeof resolveNormalizationSettings>['forcedOverrides']
  readonly ssrBootstrapStatus: EntityRouteSsrBootstrapStatus
}

type EntitiesEntityRouteAdapter = ReturnType<typeof resolveEntitiesEntityRouteAdapter>

function resolveEffectiveEntitiesPublicSettings(
  cui: string,
  search: EntitySearchSchema,
): {
  readonly adapter: ReturnType<typeof resolveEntitiesEntityRouteAdapter>
  readonly forcedOverrides: ReturnType<typeof resolveNormalizationSettings>['forcedOverrides']
  readonly ssrSettings: EntityRouteLoaderData['ssrSettings']
} {
  const adapter = resolveEntitiesEntityRouteAdapter({
    cui,
    search,
  })
  const normalizationRaw = adapter.normalizedSearch.normalization
  const { forcedOverrides } = resolveNormalizationSettings(normalizationRaw)
  const isClient = typeof globalThis.window !== 'undefined'
  const clientCurrency = isClient ? readClientCurrencyPreference() : null
  const clientInflationAdjusted = isClient
    ? readClientInflationAdjustedPreference()
    : null
  const currency =
    forcedOverrides.currency
    ?? parseCurrencyParam(search.currency)
    ?? clientCurrency
    ?? adapter.urlPublicSettings.currency
  const inflationAdjusted =
    forcedOverrides.inflationAdjusted
    ?? parseBooleanParam(
      (search as { inflation_adjusted?: unknown }).inflation_adjusted,
    )
    ?? clientInflationAdjusted
    ?? adapter.urlPublicSettings.inflationAdjusted
  const publicSettings = {
    ...adapter.urlPublicSettings,
    currency,
    inflationAdjusted,
  }

  return {
    adapter: resolveEntitiesEntityRouteAdapter({
      cui,
      search,
      publicSettingsOverride: publicSettings,
    }),
    forcedOverrides,
    ssrSettings: {
      currency,
      inflationAdjusted,
    },
  }
}

function resolveEntitiesExecutionContext(
  cui: string,
  search: EntitySearchSchema,
): {
  readonly adapter: ReturnType<typeof resolveEntitiesEntityRouteAdapter>
  readonly executionContext: EntityPageExecutionContext
  readonly ssrSettings: EntityRouteLoaderData['ssrSettings']
  readonly forcedOverrides: EntityRouteLoaderData['forcedOverrides']
} {
  const { adapter, ssrSettings, forcedOverrides } =
    resolveEffectiveEntitiesPublicSettings(cui, search)

  return {
    adapter,
    executionContext: adapter.executionContext,
    ssrSettings,
    forcedOverrides,
  }
}

function createEntityPageBootstrapPayload(
  adapter: ReturnType<typeof resolveEntitiesEntityRouteAdapter>,
  loaderPayload: EntityPageLoaderPayload,
): EntityPageBootstrapPayload {
  return {
    executionContext: adapter.executionContext,
    exactQueryInputs: adapter.exactQueryInputs,
    queryPlan: getEntityPageQueryPlan({
      context: adapter.executionContext,
    }),
    loaderPayload,
  }
}

function resolveAdapterWithEffectiveReportType(
  adapter: EntitiesEntityRouteAdapter,
  effectiveReportType: EntityPageExecutionContext['effectiveReportType'],
): EntitiesEntityRouteAdapter {
  const executionContext: EntityPageExecutionContext = {
    ...adapter.executionContext,
    effectiveReportType,
  }

  return {
    ...adapter,
    executionContext,
    exactQueryInputs: resolveEntityPageQueryInputs({
      context: executionContext,
    }),
  }
}

export const Route = createFileRoute('/entities/$cui')({
  validateSearch: entitySearchSchema,
  loader: async ({ context, params, location }): Promise<EntityRouteLoaderData> => {
    const queryClient = context.queryClient
    const requestSiteUrl = await readEntityPageRequestOrigin()
    const search = entitySearchSchema.parse(location.search)
    const { adapter, executionContext, ssrSettings, forcedOverrides } =
      resolveEntitiesExecutionContext(params.cui, search)
    const shouldResolveDefaultReportType =
      executionContext.reportType === undefined &&
      executionContext.effectiveReportType === undefined
    const settings = {
      initialSettings: ssrSettings,
      ssrSettings,
      forcedOverrides,
    }
    // Server only. The client has no deadline: its pending component covers a
    // slow loader, and the server's shell is what the deadline protects.
    const deadline = createEntityPageSsrDeadline()
    // The payload without entity data: the response when the SSR deadline
    // wins, and the fallback when the prefetch cannot complete.
    const withoutEntityDetails = (
      payloadAdapter: EntitiesEntityRouteAdapter,
      ssrBootstrapStatus: EntityRouteSsrBootstrapStatus,
    ): EntityRouteLoaderData => ({
      entityPageBootstrap: createEntityPageBootstrapPayload(
        payloadAdapter,
        buildEntityPageLoaderPayload({
          executionContext: payloadAdapter.executionContext,
          exactQueryInputs: payloadAdapter.exactQueryInputs,
          requestSiteUrl,
        }),
      ),
      ...settings,
      ssrBootstrapStatus,
    })
    const timedOut = async (
      payloadAdapter: EntitiesEntityRouteAdapter,
    ): Promise<EntityRouteLoaderData> => {
      await markEntityPageResponseDegraded()
      return withoutEntityDetails(payloadAdapter, 'timed-out')
    }

    try {
      if (isRedesignOnlyApiDeployment() && adapter.normalizedSearch.view === 'ins') {
        const identityOptions = entityIdentityQueryOptions(
          params.cui,
          adapter.normalizedSearch.year,
        )
        const identity = await settleWithinDeadline(
          queryClient.ensureQueryData(identityOptions),
          deadline,
        )
        if (identity.status === 'timed-out') {
          await abandonServerQuery(queryClient, identityOptions.queryKey)
          return timedOut(adapter)
        }

        return withoutEntityDetails(adapter, 'complete')
      }

      let activeAdapter = adapter
      let bootstrapOutcome = await runEntityPageBootstrapWithinDeadline({
        queryClient,
        executionContext,
        exactQueryInputs: adapter.exactQueryInputs,
        requestSiteUrl,
        deadline,
      })
      if (bootstrapOutcome.status === 'timed-out') {
        return timedOut(adapter)
      }

      let bootstrapResult = bootstrapOutcome.result
      const defaultExecutionReportType = toExecutionReportType(
        bootstrapResult.entityDetails?.default_report_type,
      )

      if (
        shouldResolveDefaultReportType &&
        defaultExecutionReportType !== undefined
      ) {
        activeAdapter = resolveAdapterWithEffectiveReportType(
          adapter,
          defaultExecutionReportType,
        )
        // The native adapter already queried this effective report type. Reuse
        // that result without refreshing its age or replacing newer target data.
        const sourceKey = entityDetailsQueryOptions(
          adapter.exactQueryInputs.entityDetails,
        ).queryKey
        const targetKey = entityDetailsQueryOptions(
          activeAdapter.exactQueryInputs.entityDetails,
        ).queryKey
        const sourceState = queryClient.getQueryState(sourceKey)
        const targetState = queryClient.getQueryState(targetKey)
        if (
          sourceState?.status === 'success' &&
          !sourceState.isInvalidated &&
          sourceState.data !== undefined &&
          sourceState.dataUpdatedAt > (targetState?.dataUpdatedAt ?? 0)
        ) {
          queryClient.setQueryData(targetKey, sourceState.data, {
            updatedAt: sourceState.dataUpdatedAt,
          })
        }
        bootstrapOutcome = await runEntityPageBootstrapWithinDeadline({
          queryClient,
          executionContext: activeAdapter.executionContext,
          exactQueryInputs: activeAdapter.exactQueryInputs,
          requestSiteUrl,
          deadline,
        })
        if (bootstrapOutcome.status === 'timed-out') {
          return timedOut(activeAdapter)
        }
        bootstrapResult = bootstrapOutcome.result
      }

      // A missing `entityDetails` is not special-cased: the page renders the
      // same payload either way and resolves the entity through its own
      // queries. (Both arms of the branch this replaces returned an identical
      // object.)
      return {
        entityPageBootstrap: createEntityPageBootstrapPayload(
          activeAdapter,
          bootstrapResult.payload,
        ),
        ...settings,
        ssrBootstrapStatus: 'complete',
      }
    } catch (error) {
      // Now that the entity query consumes its abort signal, the cache cancels
      // an in-flight fetch when its last observer leaves (the reader changed
      // year or navigated while a client-side reload — the SSR recovery, or a
      // stale-match reload — was joined to it). The page has already moved on
      // to another query, and the next navigation runs this loader again, so
      // the reload gives up on the payload instead of erroring the match.
      if (isCancelledError(error)) {
        return withoutEntityDetails(adapter, 'cancelled')
      }

      if (!import.meta.env.DEV) {
        throw error
      }

      console.warn('[entities/$cui] SSR entity prefetch failed', {
        cui: params.cui,
        error,
      })

      return withoutEntityDetails(adapter, 'complete')
    }
  },
  headers: ({ loaderData }) => {
    // A shell served past the SSR deadline carries no entity data, and an
    // errored match has no loader data at all; caching either would hand the
    // degraded page to every reader until it expired.
    if (loaderData?.ssrBootstrapStatus === 'timed-out') {
      return createEntityPageDegradedHeaders()
    }
    if (!loaderData) {
      return createNoStoreHeaders()
    }

    return createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 300,
      staleWhileRevalidateSeconds: 86400,
    })
  },
  head: ({ params, match }) => {
    const loaderPayload = match.loaderData?.entityPageBootstrap.loaderPayload

    return buildEntityRouteHead(resolveEntityPageRouteHeadContract({
      routeId: 'entities',
      cui: params.cui,
      seoSnapshot: loaderPayload?.entitySeoSnapshot,
      requestOrigin: loaderPayload?.requestSiteUrl,
      localeSearchContext: {
        lang: match.search.lang,
      },
    }))
  },
  pendingComponent: EntityPagePending,
  component: () => null,
})
