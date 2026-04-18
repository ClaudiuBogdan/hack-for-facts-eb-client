import { QueryClient, queryOptions } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import type { EntityDetailsData } from '@/lib/api/entities'
import { resolveEntityPageQueryInputs } from '../request/entity-page-query-inputs'
import type { EntityPageExecutionContext } from '../types'
import {
  buildEntityPageSeoSnapshot,
  buildEntityPageSeoSnapshotBase,
  type EntityPageBootstrapDependencies,
  runEntityPageBlockingBootstrap,
} from './entity-page-bootstrap'

function createExecutionContext(): EntityPageExecutionContext {
  return {
    routeId: 'primarie',
    cui: '4267117',
    lang: 'ro',
    period: 'MONTH',
    year: 2024,
    month: '03',
    reportType: 'COMMITMENT_DETAILED',
    effectiveReportType: 'COMMITMENT_PRINCIPAL_AGGREGATED',
    mainCreditorCui: '1234567',
    activeView: 'overview',
    publicSettings: {
      normalization: 'per_capita',
      currency: 'EUR',
      inflationAdjusted: true,
      showPeriodGrowth: true,
    },
  }
}

function createEntityDetails(): EntityDetailsData {
  return {
    cui: '4267117',
    name: 'Consiliul Judetean Test',
    default_report_type: 'PRINCIPAL_AGGREGATED',
    entity_type: 'admin_county_council',
    uat: {
      county_name: 'Cluj',
      population: 700000,
    },
    totalIncome: 1234567,
    totalExpenses: 1200000,
    budgetBalance: 34567,
  }
}

function createBootstrapDependencies(params: {
  readonly entityDetails: EntityDetailsData
  readonly entityExecutionLineItems?: { readonly nodes: readonly [] }
}) {
  const entityDetailsQueryFn = vi.fn(async () => params.entityDetails)
  const entityExecutionLineItemsQueryFn = vi.fn(
    async () => params.entityExecutionLineItems ?? { nodes: [] as const },
  )

  return {
    entityDetailsQueryFn,
    entityExecutionLineItemsQueryFn,
    dependencies: {
      createEntityDetailsQueryOptions: (queryParams: unknown) =>
        queryOptions({
          queryKey: ['test', 'entityDetails', queryParams] as const,
          queryFn: entityDetailsQueryFn,
        }),
      createEntityExecutionLineItemsQueryOptions: (queryParams: unknown) =>
        queryOptions({
          queryKey: ['test', 'entityExecutionLineItems', queryParams] as const,
          queryFn: entityExecutionLineItemsQueryFn,
        }),
    } as unknown as EntityPageBootstrapDependencies,
  }
}

describe('entity-page-bootstrap', () => {
  it('runs the requested blocking queries and returns the shared payload shape', async () => {
    const executionContext = createExecutionContext()
    const exactQueryInputs = resolveEntityPageQueryInputs({ context: executionContext })
    const queryClient = new QueryClient()
    const entityDetails = createEntityDetails()
    const harness = createBootstrapDependencies({
      entityDetails,
      entityExecutionLineItems: { nodes: [] },
    })

    const result = await runEntityPageBlockingBootstrap(
      {
        queryClient,
        executionContext,
        exactQueryInputs,
        requestSiteUrl: 'https://transparenta.test',
        blockingQueryIds: ['entityDetails', 'entityExecutionLineItems'],
      },
      harness.dependencies,
    )

    expect(harness.entityDetailsQueryFn).toHaveBeenCalledOnce()
    expect(harness.entityExecutionLineItemsQueryFn).toHaveBeenCalledOnce()
    expect(result.entityDetails).toStrictEqual(entityDetails)
    expect(result.payload).toStrictEqual({
      entitySeoSnapshot: {
        cui: '4267117',
        name: 'Consiliul Judetean Test',
        entityType: 'admin_county_council',
        defaultReportType: 'PRINCIPAL_AGGREGATED',
        countyName: 'Cluj',
        population: 700000,
        totalIncome: 1234567,
        totalExpenses: 1200000,
        budgetBalance: 34567,
        filterContext: {
          year: 2024,
          period: 'MONTH',
          month: '03',
          quarter: undefined,
          reportType: 'COMMITMENT_DETAILED',
          mainCreditorCui: '1234567',
          normalization: 'per_capita',
          currency: 'EUR',
          inflationAdjusted: true,
          showPeriodGrowth: true,
          lang: 'ro',
        },
      },
      ssrEntityDetailsParams: exactQueryInputs.entityDetails,
      ssrEntityExecutionLineItemsParams: exactQueryInputs.entityExecutionLineItems,
      requestSiteUrl: 'https://transparenta.test',
    })
  })

  it('builds the SEO snapshot from entity details and falls back to the base snapshot', () => {
    const executionContext = createExecutionContext()
    const baseSnapshot = buildEntityPageSeoSnapshotBase({ executionContext })
    const entityDetails = createEntityDetails()

    expect(buildEntityPageSeoSnapshot({
      executionContext,
      entity: entityDetails,
    })).toStrictEqual({
      ...baseSnapshot,
      name: 'Consiliul Judetean Test',
      entityType: 'admin_county_council',
      defaultReportType: 'PRINCIPAL_AGGREGATED',
      countyName: 'Cluj',
      population: 700000,
      totalIncome: 1234567,
      totalExpenses: 1200000,
      budgetBalance: 34567,
    })
    expect(buildEntityPageSeoSnapshot({
      executionContext,
      entity: undefined,
    })).toStrictEqual(baseSnapshot)
  })

  it('returns SSR placeholder params consistently regardless of blocking query selection', async () => {
    const executionContext = createExecutionContext()
    const exactQueryInputs = resolveEntityPageQueryInputs({ context: executionContext })
    const detailsOnlyQueryClient = new QueryClient()
    const withLineItemsQueryClient = new QueryClient()
    const entityDetails = createEntityDetails()
    const detailsOnlyHarness = createBootstrapDependencies({
      entityDetails,
      entityExecutionLineItems: { nodes: [] },
    })
    const withLineItemsHarness = createBootstrapDependencies({
      entityDetails,
      entityExecutionLineItems: { nodes: [] },
    })

    const detailsOnlyResult = await runEntityPageBlockingBootstrap(
      {
        queryClient: detailsOnlyQueryClient,
        executionContext,
        exactQueryInputs,
        blockingQueryIds: ['entityDetails'],
      },
      detailsOnlyHarness.dependencies,
    )
    const withLineItemsResult = await runEntityPageBlockingBootstrap(
      {
        queryClient: withLineItemsQueryClient,
        executionContext,
        exactQueryInputs,
        blockingQueryIds: ['entityDetails', 'entityExecutionLineItems'],
      },
      withLineItemsHarness.dependencies,
    )

    expect(detailsOnlyHarness.entityDetailsQueryFn).toHaveBeenCalledOnce()
    expect(detailsOnlyHarness.entityExecutionLineItemsQueryFn).not.toHaveBeenCalled()
    expect(withLineItemsHarness.entityDetailsQueryFn).toHaveBeenCalledOnce()
    expect(withLineItemsHarness.entityExecutionLineItemsQueryFn).toHaveBeenCalledOnce()
    expect(detailsOnlyResult.payload.ssrEntityDetailsParams).toStrictEqual(
      exactQueryInputs.entityDetails,
    )
    expect(detailsOnlyResult.payload.ssrEntityExecutionLineItemsParams).toStrictEqual(
      exactQueryInputs.entityExecutionLineItems,
    )
    expect(withLineItemsResult.payload.ssrEntityDetailsParams).toStrictEqual(
      detailsOnlyResult.payload.ssrEntityDetailsParams,
    )
    expect(withLineItemsResult.payload.ssrEntityExecutionLineItemsParams).toStrictEqual(
      detailsOnlyResult.payload.ssrEntityExecutionLineItemsParams,
    )
  })
})
