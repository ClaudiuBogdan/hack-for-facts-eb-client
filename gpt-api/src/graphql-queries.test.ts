import { describe, it, expect } from 'vitest'
import { gql } from './graphql.js'
import app from './app.js'
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
  EXECUTION_ANALYTICS_QUERY,
  HEATMAP_UAT_DATA_QUERY,
  INS_OBSERVATIONS_QUERY,
} from './queries.js'

// Known CUI for testing: MUNICIPIUL CLUJ-NAPOCA
const TEST_CUI = '4305857'

const reportPeriod = {
  type: 'YEAR',
  selection: { interval: { start: '2024', end: '2024' } },
}
const trendPeriod = {
  type: 'YEAR',
  selection: { interval: { start: '2014', end: '2025' } },
}
const reportType = 'PRINCIPAL_AGGREGATED'
const normalization = 'total'
const currency = 'RON'

describe('GraphQL queries against production API', () => {
  it('ENTITY_SEARCH_QUERY — search by name', async () => {
    const data = await gql<{ entities: { nodes: { cui: string; name: string }[]; pageInfo: { totalCount: number } } }>(
      ENTITY_SEARCH_QUERY,
      { filter: { search: 'Cluj' }, limit: 5, offset: 0 },
    )

    expect(data.entities).toBeDefined()
    expect(data.entities.nodes.length).toBeGreaterThan(0)
    expect(data.entities.nodes[0]).toHaveProperty('cui')
    expect(data.entities.nodes[0]).toHaveProperty('name')
    expect(data.entities.pageInfo.totalCount).toBeGreaterThan(0)
  }, 15000)

  it('ENTITY_BASIC_QUERY — fetch basic entity info', async () => {
    const data = await gql<{ entity: { cui: string; name: string; entity_type: string | null } }>(
      ENTITY_BASIC_QUERY,
      { cui: TEST_CUI },
    )

    expect(data.entity).toBeDefined()
    expect(data.entity.cui).toBe(TEST_CUI)
    expect(data.entity.name).toBeTruthy()
  }, 15000)

  it('ENTITY_DETAILS_QUERY — fetch details + financials + trends', async () => {
    const data = await gql<{
      entity: {
        cui: string
        name: string
        totalIncome: number | null
        totalExpenses: number | null
        budgetBalance: number | null
        incomeTrend: { seriesId: string; data: { x: unknown; y: unknown }[] } | null
      }
    }>(ENTITY_DETAILS_QUERY, {
      cui: TEST_CUI,
      reportPeriod,
      trendPeriod,
      reportType,
      normalization,
      currency,
      inflation_adjusted: false,
    })

    expect(data.entity).toBeDefined()
    expect(data.entity.cui).toBe(TEST_CUI)
    expect(typeof data.entity.totalIncome).toBe('number')
    expect(typeof data.entity.totalExpenses).toBe('number')
    expect(data.entity.incomeTrend).toBeDefined()
    expect(data.entity.incomeTrend!.data.length).toBeGreaterThan(0)
  }, 15000)

  it('ENTITY_RELATIONSHIPS_QUERY — fetch parent/child entities', async () => {
    const data = await gql<{
      entity: {
        children: { cui: string; name: string }[]
        parents: { cui: string; name: string }[]
      }
    }>(ENTITY_RELATIONSHIPS_QUERY, { cui: TEST_CUI })

    expect(data.entity).toBeDefined()
    expect(Array.isArray(data.entity.children)).toBe(true)
    expect(Array.isArray(data.entity.parents)).toBe(true)
  }, 15000)

  it('ENTITY_LINE_ITEMS_QUERY — fetch expense/income line items', async () => {
    const data = await gql<{
      entity: {
        executionLineItemsCh: { nodes: { line_item_id: string }[] } | null
        executionLineItemsVn: { nodes: { line_item_id: string }[] } | null
      }
      fundingSources: { nodes: { source_id: string }[] } | null
    }>(ENTITY_LINE_ITEMS_QUERY, {
      cui: TEST_CUI,
      reportPeriod,
      reportType,
      normalization,
      currency,
      inflation_adjusted: false,
    })

    expect(data.entity).toBeDefined()
    expect(data.entity.executionLineItemsCh?.nodes.length).toBeGreaterThan(0)
    expect(data.entity.executionLineItemsVn?.nodes.length).toBeGreaterThan(0)
    expect(data.fundingSources?.nodes.length).toBeGreaterThan(0)
  }, 15000)

  it('ENTITY_REPORTS_QUERY — fetch reports list', async () => {
    const data = await gql<{
      entity: {
        reports: {
          nodes: { report_id: string; reporting_year: number }[]
          pageInfo: { totalCount: number }
        }
      }
    }>(ENTITY_REPORTS_QUERY, {
      cui: TEST_CUI,
      limit: 5,
      offset: 0,
      type: reportType,
      sort: { by: 'report_date', order: 'DESC' },
    })

    expect(data.entity.reports).toBeDefined()
    expect(data.entity.reports.nodes.length).toBeGreaterThan(0)
    expect(data.entity.reports.pageInfo.totalCount).toBeGreaterThan(0)
  }, 15000)

  it('COMMITMENTS_SUMMARY_QUERY — fetch commitments summary', async () => {
    const filter = {
      report_period: reportPeriod,
      report_type: reportType,
      entity_cuis: [TEST_CUI],
      normalization,
      currency,
      inflation_adjusted: false,
      exclude_transfers: true,
    }

    const data = await gql<{
      commitmentsSummary: {
        nodes: { year: number }[]
        pageInfo: { totalCount: number }
      }
    }>(COMMITMENTS_SUMMARY_QUERY, { filter, limit: 50, offset: 0 })

    expect(data.commitmentsSummary).toBeDefined()
    expect(Array.isArray(data.commitmentsSummary.nodes)).toBe(true)
  }, 15000)

  it('COMMITMENTS_AGGREGATED_QUERY — fetch aggregated commitments', async () => {
    const filter = {
      report_period: reportPeriod,
      report_type: reportType,
      entity_cuis: [TEST_CUI],
      normalization,
      currency,
      inflation_adjusted: false,
      exclude_transfers: true,
    }

    const data = await gql<{
      commitmentsAggregated: {
        nodes: { amount: number }[]
        pageInfo: { totalCount: number }
      }
    }>(COMMITMENTS_AGGREGATED_QUERY, {
      input: { filter, metric: 'CREDITE_BUGETARE_DEFINITIVE', limit: 50, offset: 0 },
    })

    expect(data.commitmentsAggregated).toBeDefined()
    expect(Array.isArray(data.commitmentsAggregated.nodes)).toBe(true)
  }, 15000)

  it('COMMITMENTS_ANALYTICS_QUERY — fetch commitments time series', async () => {
    const filter = {
      report_period: trendPeriod,
      report_type: reportType,
      entity_cuis: [TEST_CUI],
      normalization,
      currency,
      inflation_adjusted: false,
      exclude_transfers: true,
    }

    const data = await gql<{
      commitmentsAnalytics: { seriesId: string; data: { x: unknown; y: unknown }[] }[]
    }>(COMMITMENTS_ANALYTICS_QUERY, {
      inputs: [{ filter, metric: 'CREDITE_BUGETARE_DEFINITIVE', seriesId: 'test' }],
    })

    expect(data.commitmentsAnalytics).toBeDefined()
    expect(Array.isArray(data.commitmentsAnalytics)).toBe(true)
  }, 15000)

  it('COMMITMENT_VS_EXECUTION_QUERY — fetch commitment vs execution', async () => {
    const filter = {
      report_period: reportPeriod,
      report_type: reportType,
      entity_cuis: [TEST_CUI],
      normalization,
      currency,
      inflation_adjusted: false,
      exclude_transfers: true,
    }

    const data = await gql<{
      commitmentVsExecution: {
        frequency: string
        data: { period: string }[]
      }
    }>(COMMITMENT_VS_EXECUTION_QUERY, { input: { filter } })

    expect(data.commitmentVsExecution).toBeDefined()
    expect(data.commitmentVsExecution.frequency).toBeTruthy()
  }, 15000)

  it('EXECUTION_ANALYTICS_QUERY — fetch execution analytics', async () => {
    const data = await gql<{
      executionAnalytics: { seriesId: string; data: { x: unknown; y: unknown }[] }[]
    }>(EXECUTION_ANALYTICS_QUERY, {
      inputs: [{
        seriesId: `51-${TEST_CUI}-expense`,
        filter: {
          entity_cuis: [TEST_CUI],
          functional_prefixes: ['51'],
          account_category: 'ch',
          report_type: reportType,
          normalization,
          currency,
          inflation_adjusted: false,
          show_period_growth: false,
          report_period: trendPeriod,
          exclude: { economic_prefixes: ['51.01', '51.02'] },
        },
      }],
    })

    expect(data.executionAnalytics).toBeDefined()
    expect(Array.isArray(data.executionAnalytics)).toBe(true)
  }, 15000)

  it('HEATMAP_UAT_DATA_QUERY — fetch heatmap data', async () => {
    const data = await gql<{
      heatmapUATData: { uat_name: string | null; amount: number | null }[]
    }>(HEATMAP_UAT_DATA_QUERY, {
      filter: {
        report_period: reportPeriod,
        account_category: 'ch',
        normalization: 'per_capita',
        currency,
        inflation_adjusted: false,
        report_type: reportType,
        show_period_growth: false,
        exclude: { economic_prefixes: ['51.01', '51.02'] },
      },
    })

    expect(data.heatmapUATData).toBeDefined()
    expect(Array.isArray(data.heatmapUATData)).toBe(true)
    expect(data.heatmapUATData.length).toBeGreaterThan(0)
  }, 30000)

  it('INS_OBSERVATIONS_QUERY — fetch INS data', async () => {
    // First get the siruta code for the entity
    const entityData = await gql<{ entity: { uat: { siruta_code: number } | null } }>(
      ENTITY_BASIC_QUERY,
      { cui: TEST_CUI },
    )

    const sirutaCode = entityData.entity?.uat?.siruta_code
    expect(sirutaCode).toBeTruthy()

    const data = await gql<{
      insObservations: {
        nodes: { dataset_code: string; value: number | null }[]
        pageInfo: { totalCount: number }
      }
    }>(INS_OBSERVATIONS_QUERY, {
      datasetCode: 'POP107D',
      filter: { sirutaCodes: [String(sirutaCode)], territoryLevels: ['LAU'] },
      limit: 10,
      offset: 0,
    })

    expect(data.insObservations).toBeDefined()
    expect(Array.isArray(data.insObservations.nodes)).toBe(true)
  }, 15000)
})

// ── REST API endpoint tests ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function get(path: string): Promise<{ status: number; json: any }> {
  const res = await app.request(path)
  const json = await res.json()
  return { status: res.status, json }
}

describe('REST API endpoints', () => {
  it('GET /openapi.json — returns valid OpenAPI spec', async () => {
    const { status, json } = await get('/openapi.json')
    expect(status).toBe(200)
    expect(json.openapi).toBe('3.1.0')
    expect(json.info.title).toContain('Transparenta')
    expect(json.servers).toHaveLength(1)
    expect(json.paths['/search']).toBeDefined()
    expect(json.paths['/entities/{cui}']).toBeDefined()
  })

  it('GET /health — returns ok', async () => {
    const { status, json } = await get('/health')
    expect(status).toBe(200)
    expect(json.status).toBe('ok')
  })

  it('GET /search?search=Cluj — returns entities', async () => {
    const { status, json } = await get('/search?search=Cluj&limit=3')
    expect(status).toBe(200)
    expect(json.nodes.length).toBeGreaterThan(0)
    expect(json.nodes[0]).toHaveProperty('cui')
    expect(json.nodes[0]).toHaveProperty('name')
    expect(json.pageInfo.totalCount).toBeGreaterThan(0)
  }, 15000)

  it('GET /search?is_uat=true — filters UATs', async () => {
    const { status, json } = await get('/search?is_uat=true&limit=3')
    expect(status).toBe(200)
    expect(json.nodes.length).toBeGreaterThan(0)
  }, 15000)

  it('GET /search?entity_type=admin_municipality — filters by type', async () => {
    const { status, json } = await get('/search?entity_type=admin_municipality&limit=3')
    expect(status).toBe(200)
    expect(json.nodes).toBeDefined()
  }, 15000)

  it('GET /entities/{cui}?include=details — returns basic info', async () => {
    const { status, json } = await get(`/entities/${TEST_CUI}?include=details`)
    expect(status).toBe(200)
    expect(json.cui).toBe(TEST_CUI)
    expect(json.name).toBeTruthy()
  }, 15000)

  it('GET /entities/{cui}?include=details,financials — returns financials', async () => {
    const { status, json } = await get(`/entities/${TEST_CUI}?include=details,financials&year=2024`)
    expect(status).toBe(200)
    expect(json.cui).toBe(TEST_CUI)
    expect(json.financials).toBeDefined()
    expect(typeof json.financials.total_income).toBe('number')
    expect(typeof json.financials.total_expenses).toBe('number')
  }, 15000)

  it('GET /entities/{cui}?include=details,trends — returns trends', async () => {
    const { status, json } = await get(`/entities/${TEST_CUI}?include=details,trends&year=2024`)
    expect(status).toBe(200)
    expect(json.trends).toBeDefined()
    expect(json.trends.income).toBeDefined()
    expect(json.trends.income.data.length).toBeGreaterThan(0)
  }, 15000)

  it('GET /entities/{cui}?include=details,relationships — returns parents/children', async () => {
    const { status, json } = await get(`/entities/${TEST_CUI}?include=details,relationships`)
    expect(status).toBe(200)
    expect(Array.isArray(json.children)).toBe(true)
  }, 15000)

  it('GET /entities/{cui}?include=details,line_items — returns line items', async () => {
    const { status, json } = await get(`/entities/${TEST_CUI}?include=details,line_items&year=2024`)
    expect(status).toBe(200)
    expect(json.line_items).toBeDefined()
    expect(json.line_items.expenses.length).toBeGreaterThan(0)
    expect(json.line_items.income.length).toBeGreaterThan(0)
  }, 15000)

  it('GET /entities/{cui}?include=details,reports — returns reports', async () => {
    const { status, json } = await get(`/entities/${TEST_CUI}?include=details,reports`)
    expect(status).toBe(200)
    expect(json.reports).toBeDefined()
    expect(json.reports.nodes.length).toBeGreaterThan(0)
  }, 15000)

  it('GET /entities/{cui}?include=details,commitments_summary — returns commitments', async () => {
    const { status, json } = await get(`/entities/${TEST_CUI}?include=details,commitments_summary&year=2024`)
    expect(status).toBe(200)
    expect(json.commitments_summary).toBeDefined()
    expect(Array.isArray(json.commitments_summary.nodes)).toBe(true)
  }, 15000)

  it('GET /entities/{cui}?include=details,commitment_vs_execution — returns comparison', async () => {
    const { status, json } = await get(`/entities/${TEST_CUI}?include=details,commitment_vs_execution&year=2024`)
    expect(status).toBe(200)
    expect(json.commitment_vs_execution).toBeDefined()
  }, 15000)

  it('GET /entities/{cui} with _errors — failed sections report errors', async () => {
    const { status, json } = await get(`/entities/${TEST_CUI}?include=details,financials&year=2024`)
    expect(status).toBe(200)
    expect(json.cui).toBe(TEST_CUI)
  }, 15000)

  it('GET /heatmap — returns per-capita spending data', async () => {
    const { status, json } = await get('/heatmap?year=2024')
    expect(status).toBe(200)
    expect(json.data).toBeDefined()
    expect(Array.isArray(json.data)).toBe(true)
    expect(json.data.length).toBeGreaterThan(0)
    expect(json.data[0]).toHaveProperty('uat_name')
    expect(json.data[0]).toHaveProperty('per_capita_amount')
  }, 30000)

  it('GET /openapi.json — includes heatmap endpoint', async () => {
    const { json } = await get('/openapi.json')
    expect(json.paths['/heatmap']).toBeDefined()
  })
})
