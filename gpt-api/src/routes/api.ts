import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { gql } from '../graphql.js'
import {
  SearchResponseSchema,
  EntityDataResponseSchema,
  HeatmapResponseSchema,
  HeatmapCountyResponseSchema,
  RankingsResponseSchema,
  AggregatedLineItemsResponseSchema,
  LineItemsResponseSchema,
  CommitmentsLineItemsResponseSchema,
  ClassificationsResponseSchema,
  InsContextsResponseSchema,
  InsDatasetsResponseSchema,
  InsObservationsResponseSchema,
  InsDatasetDetailsSchema,
  InsDimensionValuesResponseSchema,
  INCLUDE_SECTIONS,
  DEFAULT_INCLUDES,
  type EntityDataResponse,
  type IncludeSection,
} from '../schemas.js'
import {
  ENTITY_SEARCH_QUERY,
  ENTITY_DETAILS_QUERY,
  ENTITY_BASIC_QUERY,
  ENTITY_RELATIONSHIPS_QUERY,
  ENTITY_LINE_ITEMS_QUERY,
  ENTITY_REPORTS_QUERY,
  COMMITMENTS_SUMMARY_QUERY,
  COMMITMENTS_AGGREGATED_QUERY,
  COMMITMENTS_ANALYTICS_QUERY,
  COMMITMENT_VS_EXECUTION_QUERY,
  COMMITMENTS_LINE_ITEMS_QUERY,
  EXECUTION_ANALYTICS_QUERY,
  HEATMAP_UAT_DATA_QUERY,
  HEATMAP_COUNTY_DATA_QUERY,
  ENTITY_ANALYTICS_QUERY,
  AGGREGATED_LINE_ITEMS_QUERY,
  EXECUTION_LINE_ITEMS_QUERY,
  ALL_FUNCTIONAL_CLASSIFICATIONS_QUERY,
  ALL_ECONOMIC_CLASSIFICATIONS_QUERY,
  BUDGET_SECTORS_QUERY,
  FUNDING_SOURCES_QUERY,
  INS_OBSERVATIONS_QUERY,
  INS_CONTEXTS_QUERY,
  INS_DATASETS_QUERY,
  INS_DATASET_DETAILS_QUERY,
  INS_DATASET_DIMENSION_VALUES_QUERY,
} from '../queries.js'

type SearchResponse = z.infer<typeof SearchResponseSchema>

const app = new OpenAPIHono()

// ── Helpers ──

function buildReportPeriod(year: string, periodType: string) {
  return {
    type: periodType,
    selection: { interval: { start: year, end: year } },
  }
}

function buildTrendPeriod(year: string, periodType: string) {
  const y = parseInt(year, 10)
  if (periodType === 'QUARTER') {
    return { type: 'QUARTER', selection: { interval: { start: `${y}-Q1`, end: `${y}-Q4` } } }
  }
  if (periodType === 'MONTH') {
    return { type: 'MONTH', selection: { interval: { start: `${y}-01`, end: `${y}-12` } } }
  }
  return { type: 'YEAR', selection: { interval: { start: `${y - 10}`, end: `${y + 1}` } } }
}

function buildCommitmentsFilter(
  cui: string,
  reportPeriod: ReturnType<typeof buildReportPeriod>,
  opts: { reportType: string; normalization: string; currency: string; inflationAdjusted: boolean },
) {
  return {
    report_period: reportPeriod,
    report_type: opts.reportType,
    entity_cuis: [cui],
    normalization: opts.normalization,
    currency: opts.currency,
    inflation_adjusted: opts.inflationAdjusted,
    exclude_transfers: true,
  }
}

function createSafeGql(errors: { section: string; error: string }[]) {
  return async function safeGql<T>(section: string, query: string, variables?: Record<string, unknown>): Promise<T | null> {
    try {
      return await gql<T>(query, variables)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[${section}] GraphQL error:`, msg)
      errors.push({ section, error: msg })
      return null
    }
  }
}

function extractBasicInfo(entity: Record<string, unknown>) {
  return {
    cui: entity.cui,
    name: entity.name,
    address: entity.address ?? null,
    entity_type: entity.entity_type ?? null,
    is_uat: entity.is_uat ?? null,
    default_report_type: entity.default_report_type ?? null,
    uat: entity.uat ?? null,
    parents: entity.parents ?? [],
  }
}

// ── GET /search ──

const searchRoute = createRoute({
  method: 'get',
  path: '/search',
  operationId: 'searchEntities',
  tags: ['Search'],
  summary: 'Search for public entities by name, location, or type',
  description: 'Search for Romanian public entities and get their CUI identifiers. Use this first to find the CUI, then call GET /entities/{cui} for budget data. Supports free-text search, entity type filtering, and UAT filtering.',
  request: {
    query: z.object({
      search: z.string().optional().openapi({
        description: 'Free-text search on entity name (fuzzy matching).',
        example: 'Cluj',
      }),
      entity_type: z.string().optional().openapi({
        description: 'Filter by type: admin_county_council, admin_city_hall, admin_town_hall, admin_commune_hall, admin_municipality, edu_university, edu_school, health_hospital, justice_court, ministry, agency, authority, other.',
      }),
      is_uat: z.coerce.boolean().optional().openapi({
        description: 'If true, only UATs (municipalities/cities/communes). If false, only non-UAT entities.',
      }),
      limit: z.coerce.number().int().min(1).max(100).optional().default(20).openapi({
        description: 'Maximum results (1-100). Default: 20.',
      }),
      offset: z.coerce.number().int().min(0).optional().default(0).openapi({
        description: 'Pagination offset. Default: 0.',
      }),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: SearchResponseSchema } },
      description: 'Matching entities with CUI identifiers.',
    },
  },
})

app.openapi(searchRoute, async (c) => {
  const q = c.req.valid('query')

  const filter: Record<string, unknown> = {}
  if (q.search) filter.search = q.search
  if (q.entity_type) filter.entity_type = q.entity_type
  if (q.is_uat !== undefined) filter.is_uat = q.is_uat

  const data = await gql<{ entities: SearchResponse }>(
    ENTITY_SEARCH_QUERY,
    { filter, limit: q.limit, offset: q.offset },
  )

  return c.json(data.entities, 200)
})

// ── GET /entities/{cui} ──

const entityDataRoute = createRoute({
  method: 'get',
  path: '/entities/{cui}',
  operationId: 'getEntityData',
  tags: ['Entity Data'],
  summary: 'Get comprehensive budget data for a public entity',
  description: 'Returns budget data for an entity by CUI. Use the include parameter to select sections: details, financials, trends, line_items, reports, relationships, commitments, execution_analytics, etc. All sections fetched by default.',
  request: {
    params: z.object({
      cui: z.string().openapi({
        description: 'CUI (Cod Unic de Identificare). Get this from /search.',
        example: '2845710',
      }),
    }),
    query: z.object({
      include: z.string().optional().openapi({
        description: `Comma-separated sections to include, or "all" for everything. Available values: all, ${INCLUDE_SECTIONS.join(', ')}. Default: all (except ins_observations and heatmap which need extra params).`,
        example: 'all',
      }),
      year: z.string().optional().openapi({
        description: 'Budget year (e.g. "2025"). Default: previous year.',
        example: '2025',
      }),
      period_type: z.enum(['YEAR', 'QUARTER', 'MONTH']).optional().default('YEAR').openapi({
        description: 'Period granularity. Default: YEAR.',
      }),
      report_type: z.enum([
        'PRINCIPAL_AGGREGATED',
        'SECONDARY_AGGREGATED',
        'DETAILED',
        'COMMITMENT_PRINCIPAL_AGGREGATED',
        'COMMITMENT_SECONDARY_AGGREGATED',
        'COMMITMENT_DETAILED',
      ]).optional().default('PRINCIPAL_AGGREGATED').openapi({
        description: 'Report type. Default: PRINCIPAL_AGGREGATED.',
      }),
      normalization: z.enum(['total', 'per_capita']).optional().default('total').openapi({
        description: '"total" = raw amounts. "per_capita" = per inhabitant.',
      }),
      currency: z.enum(['RON', 'EUR']).optional().default('RON').openapi({
        description: 'Currency. Default: RON.',
      }),
      inflation_adjusted: z.coerce.boolean().optional().default(false).openapi({
        description: 'Inflation-adjusted amounts. Default: false.',
      }),
      ins_dataset_codes: z.string().optional().openapi({
        description: 'Comma-separated INS dataset codes for ins_observations include. Example: POP107D,FOM104D',
        example: 'POP107D,FOM104D',
      }),
      commitments_metrics: z.string().optional().openapi({
        description: 'Comma-separated metrics for commitments_aggregated/analytics. Available: CREDITE_BUGETARE_DEFINITIVE, CREDITE_ANGAJAMENT, PLATI_TREZOR, PLATI_NON_TREZOR, RECEPTII_TOTALE.',
        example: 'CREDITE_BUGETARE_DEFINITIVE,CREDITE_ANGAJAMENT,PLATI_TREZOR',
      }),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: EntityDataResponseSchema } },
      description: 'Entity data with requested sections. Failed sections are null with errors in _errors.',
    },
  },
})

app.openapi(entityDataRoute, async (c) => {
  const { cui } = c.req.valid('param')
  const q = c.req.valid('query')

  const defaultYear = String(new Date().getFullYear() - 1)
  const year = q.year ?? defaultYear
  const periodType = q.period_type ?? 'YEAR'
  const reportType = q.report_type ?? 'PRINCIPAL_AGGREGATED'
  const normalization = q.normalization ?? 'total'
  const currency = q.currency ?? 'RON'
  const inflationAdjusted = q.inflation_adjusted ?? false

  const rawInclude = q.include?.trim()
  const includes = new Set<IncludeSection>(
    !rawInclude || rawInclude === 'all'
      ? [...INCLUDE_SECTIONS]
      : (rawInclude.split(',').map((s) => s.trim()).filter((s) => INCLUDE_SECTIONS.includes(s as IncludeSection)) as IncludeSection[]),
  )
  includes.add('details')

  const reportPeriod = buildReportPeriod(year, periodType)
  const trendPeriod = buildTrendPeriod(year, periodType)
  const commitmentMetrics = q.commitments_metrics
    ? q.commitments_metrics.split(',').map((s) => s.trim()).filter(Boolean)
    : ['CREDITE_BUGETARE_DEFINITIVE', 'CREDITE_ANGAJAMENT', 'PLATI_TREZOR']
  const needsFinancials = includes.has('financials') || includes.has('trends')

  const errors: { section: string; error: string }[] = []
  const safe = createSafeGql(errors)
  const response: Record<string, unknown> = {}

  // ── 1. Entity details + financials + trends (combined query) ──
  if (needsFinancials) {
    const data = await safe<{ entity: Record<string, unknown> | null }>(
      'details+financials+trends',
      ENTITY_DETAILS_QUERY,
      { cui, reportPeriod, trendPeriod, reportType, normalization, currency, inflation_adjusted: inflationAdjusted },
    )

    if (!data?.entity) {
      const basicData = await safe<{ entity: Record<string, unknown> | null }>('details', ENTITY_BASIC_QUERY, { cui })
      if (!basicData?.entity) {
        return c.json({ error: `Entity with CUI ${cui} not found`, _errors: errors } as unknown as EntityDataResponse, 404 as unknown as 200)
      }
      Object.assign(response, extractBasicInfo(basicData.entity))
    } else {
      Object.assign(response, extractBasicInfo(data.entity))
      if (includes.has('financials')) {
        response.financials = {
          total_income: data.entity.totalIncome ?? null,
          total_expenses: data.entity.totalExpenses ?? null,
          budget_balance: data.entity.budgetBalance ?? null,
          period: { type: periodType, year },
          normalization,
          currency,
        }
      }
      if (includes.has('trends')) {
        response.trends = {
          income: data.entity.incomeTrend ?? null,
          expenses: data.entity.expenseTrend ?? null,
          balance: data.entity.balanceTrend ?? null,
        }
      }
    }
  } else {
    const data = await safe<{ entity: Record<string, unknown> | null }>('details', ENTITY_BASIC_QUERY, { cui })
    if (!data?.entity) {
      return c.json({ error: `Entity with CUI ${cui} not found`, _errors: errors } as unknown as EntityDataResponse, 404 as unknown as 200)
    }
    Object.assign(response, extractBasicInfo(data.entity))
  }

  // ── Parallel fetches ──
  const promises: Promise<void>[] = []
  const sharedOpts = { reportType, normalization, currency, inflationAdjusted }

  if (includes.has('relationships')) {
    promises.push(
      safe<{ entity: { children?: Record<string, unknown>[]; parents?: Record<string, unknown>[] } | null }>(
        'relationships', ENTITY_RELATIONSHIPS_QUERY, { cui },
      ).then((data) => {
        response.children = data?.entity?.children ?? []
      }),
    )
  }

  if (includes.has('line_items') || includes.has('funding_sources')) {
    promises.push(
      safe<{
        entity: {
          executionLineItemsCh?: { nodes: Record<string, unknown>[] } | null
          executionLineItemsVn?: { nodes: Record<string, unknown>[] } | null
        } | null
        fundingSources?: { nodes: Record<string, unknown>[] } | null
      }>('line_items', ENTITY_LINE_ITEMS_QUERY, {
        cui, reportPeriod, reportType, normalization, currency, inflation_adjusted: inflationAdjusted,
      }).then((data) => {
        if (includes.has('line_items')) {
          response.line_items = {
            expenses: data?.entity?.executionLineItemsCh?.nodes ?? [],
            income: data?.entity?.executionLineItemsVn?.nodes ?? [],
          }
        }
        if (includes.has('funding_sources')) {
          response.funding_sources = data?.fundingSources?.nodes ?? []
        }
      }),
    )
  }

  if (includes.has('reports')) {
    promises.push(
      safe<{ entity: { reports: { nodes: Record<string, unknown>[]; pageInfo: Record<string, unknown> } } | null }>(
        'reports', ENTITY_REPORTS_QUERY, { cui, limit: 50, offset: 0, type: reportType, sort: { by: 'report_date', order: 'DESC' } },
      ).then((data) => {
        response.reports = data?.entity?.reports ?? { nodes: [], pageInfo: { totalCount: 0, hasNextPage: false, hasPreviousPage: false } }
      }),
    )
  }

  if (includes.has('commitments_summary')) {
    const filter = buildCommitmentsFilter(cui, reportPeriod, sharedOpts)
    promises.push(
      safe<{ commitmentsSummary: { nodes: Record<string, unknown>[]; pageInfo: Record<string, unknown> } }>(
        'commitments_summary', COMMITMENTS_SUMMARY_QUERY, { filter, limit: 50, offset: 0 },
      ).then((data) => {
        response.commitments_summary = data?.commitmentsSummary ?? null
      }),
    )
  }

  if (includes.has('commitments_aggregated')) {
    const filter = buildCommitmentsFilter(cui, reportPeriod, sharedOpts)
    const aggPromises = commitmentMetrics.map((metric) =>
      safe<{ commitmentsAggregated: { nodes: Record<string, unknown>[]; pageInfo: Record<string, unknown> } }>(
        `commitments_aggregated:${metric}`, COMMITMENTS_AGGREGATED_QUERY,
        { input: { filter, metric, limit: 500, offset: 0 } },
      ).then((data) => ({
        metric,
        result: data?.commitmentsAggregated ?? { nodes: [], pageInfo: { totalCount: 0, hasNextPage: false, hasPreviousPage: false } },
      })),
    )
    promises.push(
      Promise.all(aggPromises).then((results) => {
        const aggregated: Record<string, unknown> = {}
        for (const { metric, result } of results) aggregated[metric] = result
        response.commitments_aggregated = aggregated
      }),
    )
  }

  if (includes.has('commitments_analytics')) {
    const filter = buildCommitmentsFilter(cui, buildTrendPeriod(year, periodType), sharedOpts)
    const inputs = commitmentMetrics.map((metric) => ({
      filter, metric, seriesId: metric.toLowerCase(),
    }))
    promises.push(
      safe<{ commitmentsAnalytics: Record<string, unknown>[] }>(
        'commitments_analytics', COMMITMENTS_ANALYTICS_QUERY, { inputs },
      ).then((data) => {
        response.commitments_analytics = data?.commitmentsAnalytics ?? null
      }),
    )
  }

  if (includes.has('commitment_vs_execution')) {
    const filter = buildCommitmentsFilter(cui, reportPeriod, sharedOpts)
    promises.push(
      safe<{ commitmentVsExecution: Record<string, unknown> }>(
        'commitment_vs_execution', COMMITMENT_VS_EXECUTION_QUERY, { input: { filter } },
      ).then((data) => {
        response.commitment_vs_execution = data?.commitmentVsExecution ?? null
      }),
    )
  }

  if (includes.has('execution_analytics')) {
    const prefixes = ['51', '54', '61', '65', '66', '67', '68', '70', '74', '84']
    const inputs = prefixes.map((prefix) => ({
      seriesId: `${prefix}-${cui}-expense`,
      filter: {
        entity_cuis: [cui],
        functional_prefixes: [prefix],
        account_category: 'ch',
        report_type: reportType,
        normalization, currency,
        inflation_adjusted: inflationAdjusted,
        show_period_growth: false,
        report_period: buildTrendPeriod(year, periodType),
        exclude: { economic_prefixes: ['51.01', '51.02'] },
      },
    }))
    promises.push(
      safe<{ executionAnalytics: Record<string, unknown>[] }>(
        'execution_analytics', EXECUTION_ANALYTICS_QUERY, { inputs },
      ).then((data) => {
        response.execution_analytics = data?.executionAnalytics ?? null
      }),
    )
  }

  if (includes.has('ins_observations') && q.ins_dataset_codes) {
    const datasetCodes = q.ins_dataset_codes.split(',').map((s) => s.trim()).filter(Boolean)
    const sirutaCode = (response as Record<string, { siruta_code?: number }>).uat?.siruta_code

    if (sirutaCode && datasetCodes.length > 0) {
      const insFilter = { sirutaCodes: [String(sirutaCode)], territoryLevels: ['LAU'] }
      const insPromises = datasetCodes.map((code) =>
        safe<{ insObservations: { nodes: Record<string, unknown>[]; pageInfo: Record<string, unknown> } }>(
          `ins_observations:${code}`, INS_OBSERVATIONS_QUERY,
          { datasetCode: code, filter: insFilter, limit: 200, offset: 0 },
        ).then((data) => ({
          code,
          result: data?.insObservations ?? { nodes: [], pageInfo: { totalCount: 0, hasNextPage: false, hasPreviousPage: false } },
        })),
      )
      promises.push(
        Promise.all(insPromises).then((results) => {
          const observations: Record<string, unknown> = {}
          for (const { code, result } of results) observations[code] = result
          response.ins_observations = observations
        }),
      )
    }
  }

  await Promise.all(promises)

  if (errors.length > 0) {
    response._errors = errors
  }

  return c.json(response as EntityDataResponse, 200)
})

// ── GET /heatmap ──

const heatmapRoute = createRoute({
  method: 'get',
  path: '/heatmap',
  operationId: 'getHeatmapData',
  tags: ['Heatmap'],
  summary: 'Get per-capita spending data for all UATs in Romania',
  description: 'Returns per-capita spending data for all UATs (municipalities, cities, communes) across Romania. Does not require a CUI. Useful for maps, rankings, or spending comparisons.',
  request: {
    query: z.object({
      year: z.string().optional().openapi({
        description: 'Budget year (e.g. "2025"). Default: previous year.',
        example: '2025',
      }),
      report_type: z.enum([
        'PRINCIPAL_AGGREGATED',
        'SECONDARY_AGGREGATED',
        'DETAILED',
      ]).optional().default('PRINCIPAL_AGGREGATED').openapi({
        description: 'Report type. Default: PRINCIPAL_AGGREGATED.',
      }),
      currency: z.enum(['RON', 'EUR']).optional().default('RON').openapi({
        description: 'Currency. Default: RON.',
      }),
      inflation_adjusted: z.coerce.boolean().optional().default(false).openapi({
        description: 'Inflation-adjusted amounts. Default: false.',
      }),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: HeatmapResponseSchema } },
      description: 'Per-capita spending data for all UATs.',
    },
  },
})

app.openapi(heatmapRoute, async (c) => {
  const q = c.req.valid('query')

  const defaultYear = String(new Date().getFullYear() - 1)
  const year = q.year ?? defaultYear
  const reportType = q.report_type ?? 'PRINCIPAL_AGGREGATED'
  const currency = q.currency ?? 'RON'
  const inflationAdjusted = q.inflation_adjusted ?? false

  const reportPeriod = buildReportPeriod(year, 'YEAR')

  const data = await gql<{ heatmapUATData: Record<string, unknown>[] }>(
    HEATMAP_UAT_DATA_QUERY,
    {
      filter: {
        report_period: reportPeriod,
        account_category: 'ch',
        normalization: 'per_capita',
        currency,
        inflation_adjusted: inflationAdjusted,
        report_type: reportType,
        show_period_growth: false,
        exclude: { economic_prefixes: ['51.01', '51.02'] },
      },
    },
  )

  return c.json({ data: data.heatmapUATData }, 200)
})

// ── GET /heatmap/counties ──

const heatmapCountiesRoute = createRoute({
  method: 'get',
  path: '/heatmap/counties',
  operationId: 'getHeatmapCountyData',
  tags: ['Heatmap'],
  summary: 'Get per-capita spending data aggregated by county',
  description: 'Returns per-capita spending data aggregated at the county (judet) level. Useful for county-level comparisons across Romania.',
  request: {
    query: z.object({
      year: z.string().optional().openapi({ description: 'Budget year. Default: previous year.', example: '2025' }),
      report_type: z.enum(['PRINCIPAL_AGGREGATED', 'SECONDARY_AGGREGATED', 'DETAILED']).optional().default('PRINCIPAL_AGGREGATED'),
      currency: z.enum(['RON', 'EUR']).optional().default('RON'),
      inflation_adjusted: z.coerce.boolean().optional().default(false),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: HeatmapCountyResponseSchema } },
      description: 'Per-capita spending data by county.',
    },
  },
})

app.openapi(heatmapCountiesRoute, async (c) => {
  const q = c.req.valid('query')
  const year = q.year ?? String(new Date().getFullYear() - 1)

  const data = await gql<{ heatmapCountyData: Record<string, unknown>[] }>(
    HEATMAP_COUNTY_DATA_QUERY,
    {
      filter: {
        report_period: buildReportPeriod(year, 'YEAR'),
        account_category: 'ch',
        normalization: 'per_capita',
        currency: q.currency ?? 'RON',
        inflation_adjusted: q.inflation_adjusted ?? false,
        report_type: q.report_type ?? 'PRINCIPAL_AGGREGATED',
        show_period_growth: false,
        exclude: { economic_prefixes: ['51.01', '51.02'] },
      },
    },
  )

  return c.json({ data: data.heatmapCountyData } as z.infer<typeof HeatmapCountyResponseSchema>, 200)
})

// ── GET /rankings ──

const rankingsRoute = createRoute({
  method: 'get',
  path: '/rankings',
  operationId: 'getEntityRankings',
  tags: ['Rankings'],
  summary: 'Rank entities by budget spending or income',
  description: 'Get a ranked list of entities by total spending (or income). Supports filtering by county, entity type, functional category, and more. Useful for "top spenders" type queries.',
  request: {
    query: z.object({
      year: z.string().optional().openapi({ description: 'Budget year. Default: previous year.', example: '2025' }),
      account_category: z.enum(['ch', 'vn']).optional().default('ch').openapi({ description: '"ch" = expenses, "vn" = income. Default: ch.' }),
      report_type: z.enum(['PRINCIPAL_AGGREGATED', 'SECONDARY_AGGREGATED', 'DETAILED']).optional().default('PRINCIPAL_AGGREGATED'),
      normalization: z.enum(['total', 'per_capita']).optional().default('total'),
      currency: z.enum(['RON', 'EUR']).optional().default('RON'),
      inflation_adjusted: z.coerce.boolean().optional().default(false),
      county_codes: z.string().optional().openapi({ description: 'Comma-separated county codes (e.g. "CJ,BV,TM")' }),
      entity_types: z.string().optional().openapi({ description: 'Comma-separated entity types' }),
      functional_prefixes: z.string().optional().openapi({ description: 'Comma-separated functional classification prefixes (e.g. "65,68")' }),
      is_uat: z.coerce.boolean().optional().openapi({ description: 'Filter to UATs only' }),
      sort_by: z.enum(['amount', 'per_capita_amount', 'total_amount']).optional().default('amount'),
      sort_order: z.enum(['ASC', 'DESC']).optional().default('DESC'),
      limit: z.coerce.number().int().min(1).max(500).optional().default(50),
      offset: z.coerce.number().int().min(0).optional().default(0),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: RankingsResponseSchema } },
      description: 'Ranked list of entities with spending data.',
    },
  },
})

app.openapi(rankingsRoute, async (c) => {
  const q = c.req.valid('query')
  const year = q.year ?? String(new Date().getFullYear() - 1)

  const filter: Record<string, unknown> = {
    report_period: buildReportPeriod(year, 'YEAR'),
    account_category: q.account_category ?? 'ch',
    report_type: q.report_type ?? 'PRINCIPAL_AGGREGATED',
    normalization: q.normalization ?? 'total',
    currency: q.currency ?? 'RON',
    inflation_adjusted: q.inflation_adjusted ?? false,
    exclude: { economic_prefixes: ['51.01', '51.02'] },
  }

  if (q.county_codes) filter.county_codes = q.county_codes.split(',').map((s) => s.trim())
  if (q.entity_types) filter.entity_types = q.entity_types.split(',').map((s) => s.trim())
  if (q.functional_prefixes) filter.functional_prefixes = q.functional_prefixes.split(',').map((s) => s.trim())
  if (q.is_uat !== undefined) filter.is_uat = q.is_uat

  const data = await gql<{ entityAnalytics: { nodes: Record<string, unknown>[]; pageInfo: Record<string, unknown> } }>(
    ENTITY_ANALYTICS_QUERY,
    {
      filter,
      sort: { by: q.sort_by ?? 'amount', order: q.sort_order ?? 'DESC' },
      limit: q.limit ?? 50,
      offset: q.offset ?? 0,
    },
  )

  return c.json(data.entityAnalytics as z.infer<typeof RankingsResponseSchema>, 200)
})

// ── GET /aggregated ──

const aggregatedRoute = createRoute({
  method: 'get',
  path: '/aggregated',
  operationId: 'getAggregatedLineItems',
  tags: ['Analytics'],
  summary: 'Get budget data aggregated by functional/economic classification',
  description: 'Returns budget amounts aggregated by functional and economic classification codes. Useful for "how much is spent on education nationally" type queries.',
  request: {
    query: z.object({
      year: z.string().optional().openapi({ description: 'Budget year. Default: previous year.', example: '2025' }),
      account_category: z.enum(['ch', 'vn']).optional().default('ch'),
      report_type: z.enum(['PRINCIPAL_AGGREGATED', 'SECONDARY_AGGREGATED', 'DETAILED']).optional().default('PRINCIPAL_AGGREGATED'),
      normalization: z.enum(['total', 'per_capita']).optional().default('total'),
      currency: z.enum(['RON', 'EUR']).optional().default('RON'),
      inflation_adjusted: z.coerce.boolean().optional().default(false),
      entity_cuis: z.string().optional().openapi({ description: 'Comma-separated entity CUIs to filter' }),
      county_codes: z.string().optional().openapi({ description: 'Comma-separated county codes' }),
      functional_prefixes: z.string().optional().openapi({ description: 'Comma-separated functional prefixes' }),
      limit: z.coerce.number().int().min(1).max(1000).optional().default(500),
      offset: z.coerce.number().int().min(0).optional().default(0),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: AggregatedLineItemsResponseSchema } },
      description: 'Aggregated budget data by classification.',
    },
  },
})

app.openapi(aggregatedRoute, async (c) => {
  const q = c.req.valid('query')
  const year = q.year ?? String(new Date().getFullYear() - 1)

  const filter: Record<string, unknown> = {
    report_period: buildReportPeriod(year, 'YEAR'),
    account_category: q.account_category ?? 'ch',
    report_type: q.report_type ?? 'PRINCIPAL_AGGREGATED',
    normalization: q.normalization ?? 'total',
    currency: q.currency ?? 'RON',
    inflation_adjusted: q.inflation_adjusted ?? false,
    exclude: { economic_prefixes: ['51.01', '51.02'] },
  }

  if (q.entity_cuis) filter.entity_cuis = q.entity_cuis.split(',').map((s) => s.trim())
  if (q.county_codes) filter.county_codes = q.county_codes.split(',').map((s) => s.trim())
  if (q.functional_prefixes) filter.functional_prefixes = q.functional_prefixes.split(',').map((s) => s.trim())

  const data = await gql<{ aggregatedLineItems: { nodes: Record<string, unknown>[]; pageInfo: Record<string, unknown> } }>(
    AGGREGATED_LINE_ITEMS_QUERY,
    { filter, limit: q.limit ?? 500, offset: q.offset ?? 0 },
  )

  return c.json(data.aggregatedLineItems as z.infer<typeof AggregatedLineItemsResponseSchema>, 200)
})

// ── GET /line-items ──

const lineItemsRoute = createRoute({
  method: 'get',
  path: '/line-items',
  operationId: 'getExecutionLineItems',
  tags: ['Analytics'],
  summary: 'Search individual budget execution line items',
  description: 'Query individual budget execution line items across all entities. Useful for finding specific spending items by classification code.',
  request: {
    query: z.object({
      year: z.string().optional().openapi({ description: 'Budget year. Default: previous year.', example: '2025' }),
      account_category: z.enum(['ch', 'vn']).optional().default('ch'),
      report_type: z.enum(['PRINCIPAL_AGGREGATED', 'SECONDARY_AGGREGATED', 'DETAILED']).optional().default('PRINCIPAL_AGGREGATED'),
      normalization: z.enum(['total', 'per_capita']).optional().default('total'),
      currency: z.enum(['RON', 'EUR']).optional().default('RON'),
      entity_cuis: z.string().optional().openapi({ description: 'Comma-separated entity CUIs' }),
      functional_prefixes: z.string().optional().openapi({ description: 'Comma-separated functional prefixes' }),
      economic_prefixes: z.string().optional().openapi({ description: 'Comma-separated economic prefixes' }),
      sort_by: z.enum(['amount', 'year']).optional().default('amount'),
      sort_order: z.enum(['ASC', 'DESC']).optional().default('DESC'),
      limit: z.coerce.number().int().min(1).max(500).optional().default(100),
      offset: z.coerce.number().int().min(0).optional().default(0),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: LineItemsResponseSchema } },
      description: 'Individual execution line items.',
    },
  },
})

app.openapi(lineItemsRoute, async (c) => {
  const q = c.req.valid('query')
  const year = q.year ?? String(new Date().getFullYear() - 1)

  const filter: Record<string, unknown> = {
    report_period: buildReportPeriod(year, 'YEAR'),
    account_category: q.account_category ?? 'ch',
    report_type: q.report_type ?? 'PRINCIPAL_AGGREGATED',
    normalization: q.normalization ?? 'total',
    currency: q.currency ?? 'RON',
  }

  if (q.entity_cuis) filter.entity_cuis = q.entity_cuis.split(',').map((s) => s.trim())
  if (q.functional_prefixes) filter.functional_prefixes = q.functional_prefixes.split(',').map((s) => s.trim())
  if (q.economic_prefixes) filter.economic_prefixes = q.economic_prefixes.split(',').map((s) => s.trim())

  const data = await gql<{ executionLineItems: { nodes: Record<string, unknown>[]; pageInfo: Record<string, unknown> } }>(
    EXECUTION_LINE_ITEMS_QUERY,
    {
      filter,
      sort: { by: q.sort_by ?? 'amount', order: q.sort_order ?? 'DESC' },
      limit: q.limit ?? 100,
      offset: q.offset ?? 0,
    },
  )

  return c.json(data.executionLineItems as z.infer<typeof LineItemsResponseSchema>, 200)
})

// ── GET /commitments/line-items ──

const commitmentsLineItemsRoute = createRoute({
  method: 'get',
  path: '/commitments/line-items',
  operationId: 'getCommitmentsLineItems',
  tags: ['Commitments'],
  summary: 'Get detailed commitment line items for an entity',
  description: 'Returns detailed commitment line items showing budget credits, commitments, payments, and receptions at the individual line item level.',
  request: {
    query: z.object({
      entity_cuis: z.string().openapi({ description: 'Comma-separated entity CUIs (required)', example: '2845710' }),
      year: z.string().optional().openapi({ description: 'Budget year. Default: previous year.', example: '2025' }),
      period_type: z.enum(['YEAR', 'QUARTER', 'MONTH']).optional().default('YEAR'),
      report_type: z.enum(['PRINCIPAL_AGGREGATED', 'SECONDARY_AGGREGATED', 'DETAILED']).optional().default('PRINCIPAL_AGGREGATED'),
      normalization: z.enum(['total', 'per_capita']).optional().default('total'),
      currency: z.enum(['RON', 'EUR']).optional().default('RON'),
      inflation_adjusted: z.coerce.boolean().optional().default(false),
      limit: z.coerce.number().int().min(1).max(500).optional().default(50),
      offset: z.coerce.number().int().min(0).optional().default(0),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: CommitmentsLineItemsResponseSchema } },
      description: 'Detailed commitment line items.',
    },
  },
})

app.openapi(commitmentsLineItemsRoute, async (c) => {
  const q = c.req.valid('query')
  const year = q.year ?? String(new Date().getFullYear() - 1)

  const filter = {
    report_period: buildReportPeriod(year, q.period_type ?? 'YEAR'),
    report_type: q.report_type ?? 'PRINCIPAL_AGGREGATED',
    entity_cuis: q.entity_cuis.split(',').map((s) => s.trim()),
    normalization: q.normalization ?? 'total',
    currency: q.currency ?? 'RON',
    inflation_adjusted: q.inflation_adjusted ?? false,
    exclude_transfers: true,
  }

  const data = await gql<{ commitmentsLineItems: { nodes: Record<string, unknown>[]; pageInfo: Record<string, unknown> } }>(
    COMMITMENTS_LINE_ITEMS_QUERY,
    { filter, limit: q.limit ?? 50, offset: q.offset ?? 0 },
  )

  return c.json(data.commitmentsLineItems as z.infer<typeof CommitmentsLineItemsResponseSchema>, 200)
})

// ── GET /classifications ──

const classificationsRoute = createRoute({
  method: 'get',
  path: '/classifications',
  operationId: 'getClassifications',
  tags: ['Reference Data'],
  summary: 'Get budget classification codes and names',
  description: 'Returns functional classifications (budget categories like education, health, defense), economic classifications (spending types like salaries, goods, transfers), budget sectors, and funding sources.',
  request: {
    query: z.object({
      type: z.enum(['functional', 'economic', 'budget_sectors', 'funding_sources', 'all']).optional().default('all').openapi({
        description: 'Which classification type to return. Default: all.',
      }),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: ClassificationsResponseSchema } },
      description: 'Classification reference data.',
    },
  },
})

app.openapi(classificationsRoute, async (c) => {
  const q = c.req.valid('query')
  const type = q.type ?? 'all'
  const result: Record<string, unknown> = {}

  const promises: Promise<void>[] = []

  if (type === 'all' || type === 'functional') {
    promises.push(
      gql<{ functionalClassifications: { nodes: { code: string; name: string }[] } }>(
        ALL_FUNCTIONAL_CLASSIFICATIONS_QUERY,
      ).then((data) => {
        result.functional = data.functionalClassifications.nodes
      }).catch(() => { result.functional = [] }),
    )
  }

  if (type === 'all' || type === 'economic') {
    promises.push(
      gql<{ economicClassifications: { nodes: { code: string; name: string }[] } }>(
        ALL_ECONOMIC_CLASSIFICATIONS_QUERY,
      ).then((data) => {
        result.economic = data.economicClassifications.nodes
      }).catch(() => { result.economic = [] }),
    )
  }

  if (type === 'all' || type === 'budget_sectors') {
    promises.push(
      gql<{ budgetSectors: { nodes: Record<string, unknown>[] } }>(
        BUDGET_SECTORS_QUERY,
      ).then((data) => {
        result.budget_sectors = data.budgetSectors.nodes
      }).catch(() => { result.budget_sectors = [] }),
    )
  }

  if (type === 'all' || type === 'funding_sources') {
    promises.push(
      gql<{ fundingSources: { nodes: Record<string, unknown>[] } }>(
        FUNDING_SOURCES_QUERY,
      ).then((data) => {
        result.funding_sources = data.fundingSources.nodes
      }).catch(() => { result.funding_sources = [] }),
    )
  }

  await Promise.all(promises)
  return c.json(result as z.infer<typeof ClassificationsResponseSchema>, 200)
})

// ── GET /ins/contexts ──

const insContextsRoute = createRoute({
  method: 'get',
  path: '/ins/contexts',
  operationId: 'getInsContexts',
  tags: ['INS Statistics'],
  summary: 'Browse INS (National Statistics Institute) context hierarchy',
  description: 'Returns the hierarchical context tree for INS statistical datasets. Contexts organize datasets by topic (e.g., Population, Economy, Education).',
  request: {
    query: z.object({
      search: z.string().optional().openapi({ description: 'Search term' }),
      level: z.coerce.number().int().optional().openapi({ description: 'Filter by hierarchy level' }),
      parent_code: z.string().optional().openapi({ description: 'Filter by parent context code' }),
      limit: z.coerce.number().int().min(1).max(500).optional().default(200),
      offset: z.coerce.number().int().min(0).optional().default(0),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: InsContextsResponseSchema } },
      description: 'INS context hierarchy.',
    },
  },
})

app.openapi(insContextsRoute, async (c) => {
  const q = c.req.valid('query')
  const filter: Record<string, unknown> = {}
  if (q.search) filter.search = q.search
  if (q.level !== undefined) filter.level = q.level
  if (q.parent_code) filter.parentCode = q.parent_code

  const data = await gql<{ insContexts: { nodes: Record<string, unknown>[]; pageInfo: Record<string, unknown> } }>(
    INS_CONTEXTS_QUERY,
    { filter, limit: q.limit ?? 200, offset: q.offset ?? 0 },
  )

  return c.json(data.insContexts as z.infer<typeof InsContextsResponseSchema>, 200)
})

// ── GET /ins/datasets ──

const insDatasetsRoute = createRoute({
  method: 'get',
  path: '/ins/datasets',
  operationId: 'getInsDatasets',
  tags: ['INS Statistics'],
  summary: 'Search INS statistical datasets',
  description: 'Browse and search available INS datasets. Filter by topic context, data availability (UAT/county level), and periodicity.',
  request: {
    query: z.object({
      search: z.string().optional().openapi({ description: 'Search term for dataset name/description' }),
      context_code: z.string().optional().openapi({ description: 'Filter by context code (topic)' }),
      has_uat_data: z.coerce.boolean().optional().openapi({ description: 'Only datasets with UAT-level (municipality) data' }),
      has_county_data: z.coerce.boolean().optional().openapi({ description: 'Only datasets with county-level data' }),
      codes: z.string().optional().openapi({ description: 'Comma-separated dataset codes to fetch specific datasets' }),
      limit: z.coerce.number().int().min(1).max(500).optional().default(50),
      offset: z.coerce.number().int().min(0).optional().default(0),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: InsDatasetsResponseSchema } },
      description: 'INS dataset catalog.',
    },
  },
})

app.openapi(insDatasetsRoute, async (c) => {
  const q = c.req.valid('query')
  const filter: Record<string, unknown> = {}
  if (q.search) filter.search = q.search
  if (q.context_code) filter.contextCode = q.context_code
  if (q.has_uat_data !== undefined) filter.hasUatData = q.has_uat_data
  if (q.has_county_data !== undefined) filter.hasCountyData = q.has_county_data
  if (q.codes) filter.codes = q.codes.split(',').map((s) => s.trim())

  const data = await gql<{ insDatasets: { nodes: Record<string, unknown>[]; pageInfo: Record<string, unknown> } }>(
    INS_DATASETS_QUERY,
    { filter, limit: q.limit ?? 50, offset: q.offset ?? 0 },
  )

  return c.json(data.insDatasets as z.infer<typeof InsDatasetsResponseSchema>, 200)
})

// ── GET /ins/datasets/{code} ──

const insDatasetDetailsRoute = createRoute({
  method: 'get',
  path: '/ins/datasets/{code}',
  operationId: 'getInsDatasetDetails',
  tags: ['INS Statistics'],
  summary: 'Get details and dimensions for an INS dataset',
  description: 'Returns full details about an INS dataset including its dimensions (time, territory, classifications, units). Use this to understand what filters are available before querying observations.',
  request: {
    params: z.object({
      code: z.string().openapi({ description: 'Dataset code (e.g. POP107D)', example: 'POP107D' }),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: InsDatasetDetailsSchema } },
      description: 'Dataset details with dimensions.',
    },
  },
})

app.openapi(insDatasetDetailsRoute, async (c) => {
  const { code } = c.req.valid('param')

  const data = await gql<{ insDataset: Record<string, unknown> | null }>(
    INS_DATASET_DETAILS_QUERY,
    { code },
  )

  if (!data.insDataset) {
    return c.json({ error: `Dataset ${code} not found` } as unknown as z.infer<typeof InsDatasetDetailsSchema>, 404 as unknown as 200)
  }

  return c.json(data.insDataset as z.infer<typeof InsDatasetDetailsSchema>, 200)
})

// ── GET /ins/observations/{datasetCode} ──

const insObservationsRoute = createRoute({
  method: 'get',
  path: '/ins/observations/{datasetCode}',
  operationId: 'getInsObservations',
  tags: ['INS Statistics'],
  summary: 'Query INS statistical observations for a dataset',
  description: 'Returns observation data for a specific INS dataset. Filter by territory (SIRUTA codes), time period, and territory level (NATIONAL, NUTS1, NUTS2, NUTS3, LAU).',
  request: {
    params: z.object({
      datasetCode: z.string().openapi({ description: 'Dataset code (e.g. POP107D)', example: 'POP107D' }),
    }),
    query: z.object({
      siruta_codes: z.string().optional().openapi({ description: 'Comma-separated SIRUTA codes for territory filtering', example: '130981' }),
      territory_codes: z.string().optional().openapi({ description: 'Comma-separated territory codes (e.g. county codes like "CJ")' }),
      territory_levels: z.string().optional().openapi({ description: 'Comma-separated territory levels: NATIONAL, NUTS1, NUTS2, NUTS3, LAU', example: 'LAU' }),
      year_start: z.string().optional().openapi({ description: 'Start year for period filter', example: '2020' }),
      year_end: z.string().optional().openapi({ description: 'End year for period filter', example: '2025' }),
      limit: z.coerce.number().int().min(1).max(1000).optional().default(200),
      offset: z.coerce.number().int().min(0).optional().default(0),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: InsObservationsResponseSchema } },
      description: 'INS observation data.',
    },
  },
})

app.openapi(insObservationsRoute, async (c) => {
  const { datasetCode } = c.req.valid('param')
  const q = c.req.valid('query')

  const filter: Record<string, unknown> = {}
  if (q.siruta_codes) filter.sirutaCodes = q.siruta_codes.split(',').map((s) => s.trim())
  if (q.territory_codes) filter.territoryCodes = q.territory_codes.split(',').map((s) => s.trim())
  if (q.territory_levels) filter.territoryLevels = q.territory_levels.split(',').map((s) => s.trim())
  if (q.year_start || q.year_end) {
    filter.period = {
      type: 'YEAR',
      selection: {
        interval: {
          start: q.year_start ?? '1900',
          end: q.year_end ?? '2100',
        },
      },
    }
  }

  const data = await gql<{ insObservations: { nodes: Record<string, unknown>[]; pageInfo: Record<string, unknown> } }>(
    INS_OBSERVATIONS_QUERY,
    { datasetCode, filter, limit: q.limit ?? 200, offset: q.offset ?? 0 },
  )

  return c.json(data.insObservations as z.infer<typeof InsObservationsResponseSchema>, 200)
})

// ── GET /ins/datasets/{code}/dimensions/{index}/values ──

const insDimensionValuesRoute = createRoute({
  method: 'get',
  path: '/ins/datasets/{code}/dimensions/{index}/values',
  operationId: 'getInsDimensionValues',
  tags: ['INS Statistics'],
  summary: 'Get available values for an INS dataset dimension',
  description: 'Returns the available values for a specific dimension of an INS dataset. Use this to discover what territory, time period, classification, or unit options are available.',
  request: {
    params: z.object({
      code: z.string().openapi({ description: 'Dataset code', example: 'POP107D' }),
      index: z.coerce.number().int().openapi({ description: 'Dimension index (0-based)', example: 0 }),
    }),
    query: z.object({
      search: z.string().optional().openapi({ description: 'Search term to filter values' }),
      limit: z.coerce.number().int().min(1).max(500).optional().default(50),
      offset: z.coerce.number().int().min(0).optional().default(0),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: InsDimensionValuesResponseSchema } },
      description: 'Dimension values.',
    },
  },
})

app.openapi(insDimensionValuesRoute, async (c) => {
  const { code, index } = c.req.valid('param')
  const q = c.req.valid('query')

  const data = await gql<{ insDatasetDimensionValues: { nodes: Record<string, unknown>[]; pageInfo: Record<string, unknown> } }>(
    INS_DATASET_DIMENSION_VALUES_QUERY,
    {
      datasetCode: code,
      dimensionIndex: index,
      search: q.search ?? '',
      limit: q.limit ?? 50,
      offset: q.offset ?? 0,
    },
  )

  return c.json(data.insDatasetDimensionValues as z.infer<typeof InsDimensionValuesResponseSchema>, 200)
})

export default app
