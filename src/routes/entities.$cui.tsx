import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { entitySearchSchema } from '@/components/entities/validation'
import { ViewLoading } from '@/components/ui/ViewLoading'
import {
  buildEntityPageLoaderPayload,
  getEntityPageQueryPlan,
  readEntityPageRequestOrigin,
  resolveEntityPageQueryInputs,
  runEntityPageBlockingBootstrap,
  type EntityPageBlockingQueryId,
  type EntityPageExecutionContext,
  type EntityPageLoaderPayload,
} from '@/features/entities/page-core'
import { resolveEntityPageRouteHeadContract } from '@/features/entities/page-core/seo/entity-page-route-policy'
import { resolveEntitiesEntityRouteAdapter } from '@/features/entities/page-core/route-adapters/entities-entity-route-adapter'
import { buildEntityRouteHead } from '@/features/entities/seo/entity-share-seo'
import {
  parseBooleanParam,
  parseCurrencyParam,
  resolveNormalizationSettings,
} from '@/lib/globalSettings/params'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
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
}

type EntitiesEntityRouteAdapter = ReturnType<typeof resolveEntitiesEntityRouteAdapter>

const ENTITY_DETAILS_STEP_ID = 'entity-details' as const

function hasPlannedStep(
  steps: readonly { id: string }[],
  stepId: string,
): boolean {
  return steps.some((step) => step.id === stepId)
}

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
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 300,
      staleWhileRevalidateSeconds: 86400,
    }),
  validateSearch: entitySearchSchema,
  head: ({ params, match }) => {
    const loaderData = match.loaderData as EntityRouteLoaderData | undefined
    const loaderPayload = loaderData?.entityPageBootstrap?.loaderPayload

    return buildEntityRouteHead(resolveEntityPageRouteHeadContract({
      routeId: 'entities',
      cui: params.cui,
      seoSnapshot: loaderPayload?.entitySeoSnapshot,
      requestOrigin: loaderPayload?.requestSiteUrl,
      localeSearchContext: {
        lang: (match.search as EntitySearchSchema | undefined)?.lang,
      },
    }))
  },
  loader: async ({ context, params, location }) => {
    const queryClient = context.queryClient
    const requestSiteUrl = await readEntityPageRequestOrigin()
    const search = entitySearchSchema.parse(location.search)
    const { adapter, executionContext, ssrSettings, forcedOverrides } =
      resolveEntitiesExecutionContext(params.cui, search)
    const queryPlan = getEntityPageQueryPlan({
      context: executionContext,
    })
    const shouldResolveDefaultReportType =
      executionContext.reportType === undefined &&
      executionContext.effectiveReportType === undefined
    const blockingQueryIds: EntityPageBlockingQueryId[] =
      shouldResolveDefaultReportType
        ? ['entityDetails']
        : (
            hasPlannedStep(queryPlan.blocking, ENTITY_DETAILS_STEP_ID)
              ? ['entityDetails', 'entityExecutionLineItems']
              : ['entityExecutionLineItems']
          )
    const baseLoaderPayload = buildEntityPageLoaderPayload({
      executionContext,
      exactQueryInputs: adapter.exactQueryInputs,
      requestSiteUrl,
    })

    let entityPageBootstrap = createEntityPageBootstrapPayload(
      adapter,
      baseLoaderPayload,
    )

    try {
      let activeAdapter = adapter
      let bootstrapResult = await runEntityPageBlockingBootstrap({
        queryClient,
        executionContext,
        exactQueryInputs: adapter.exactQueryInputs,
        requestSiteUrl,
        blockingQueryIds,
      })
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
        const effectiveQueryPlan = getEntityPageQueryPlan({
          context: activeAdapter.executionContext,
        })
        const effectiveBlockingQueryIds: EntityPageBlockingQueryId[] =
          hasPlannedStep(effectiveQueryPlan.blocking, ENTITY_DETAILS_STEP_ID)
            ? ['entityDetails', 'entityExecutionLineItems']
            : ['entityExecutionLineItems']

        bootstrapResult = await runEntityPageBlockingBootstrap({
          queryClient,
          executionContext: activeAdapter.executionContext,
          exactQueryInputs: activeAdapter.exactQueryInputs,
          requestSiteUrl,
          blockingQueryIds: effectiveBlockingQueryIds,
        })
      }

      entityPageBootstrap = createEntityPageBootstrapPayload(
        activeAdapter,
        bootstrapResult.payload,
      )

      // A missing `entityDetails` is not special-cased: the page renders the
      // same payload either way and resolves the entity through its own
      // queries. (Both arms of the branch this replaces returned an identical
      // object.)
      return {
        entityPageBootstrap,
        initialSettings: ssrSettings,
        ssrSettings,
        forcedOverrides,
      } satisfies EntityRouteLoaderData
    } catch (error) {
      if (!import.meta.env.DEV) {
        throw error
      }

      console.warn('[entities/$cui] SSR entity prefetch failed', {
        cui: params.cui,
        error,
      })

      return {
        entityPageBootstrap,
        initialSettings: ssrSettings,
        ssrSettings,
        forcedOverrides,
      } satisfies EntityRouteLoaderData
    }
  },
  pendingComponent: ViewLoading,
  component: () => null,
})
