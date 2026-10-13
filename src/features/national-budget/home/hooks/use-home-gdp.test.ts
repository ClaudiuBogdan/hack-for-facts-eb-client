import { QueryClient } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchObservations } from '@/features/national-budget/analytics/api/national-budget-api'
import type { BudgetNationalCatalog } from '@/schemas/national-budget-api'
import { viewOfYear } from '../lib/home-data'
import { gdpDenominatorOptions, gdpSharesOptions } from './use-home-data'

const graphql = vi.hoisted(() => ({ query: vi.fn() }))
vi.mock('@/lib/graphql/graphql-client', () => ({
  graphqlQuery: graphql.query,
  GraphQLRequestError: class GraphQLRequestError extends Error {},
}))

/** The GDP row the August 2026 release serves: the Sinteza's printed current GDP. */
const sintezaGdp = {
  month: '2026-08',
  input: 'SINTEZA',
  section: null,
  lineItem: 'pib',
  component: 'gdp',
  measure: 'GDP_DENOMINATOR',
  periodRole: 'CURRENT',
  disposition: 'FACT',
  value: '2056000000000',
  unit: 'RON',
  sourceToken: '2056000',
  referenceYear: 2026,
  catalogItem: null,
  reportPeriod: { start: '2026-01-01', end: '2026-08-31' },
  executionStatus: null,
  finality: null,
  locator: { kind: 'pdf_cell', sheet: null, cell: null, page: 1, row: 0, column: 0 },
  labelEvidence: null,
  document: { url: 'https://mfinante.gov.ro/static/10/Mfp/buletin/executii/Anexa2_bgc31082026.pdf', sha256: 'a1c1096cd753f889c70232d5b5610f6d74e1185a84fab0ca88064b694f8b4c32' },
}
const answer = (nodes: readonly unknown[]) => ({
  budgetExecutionObservations: { snapshot: 'e1', pageInfo: { hasNextPage: false, endCursor: null }, edges: nodes.map((node) => ({ node })) },
})

describe('reading the GDP observations', () => {
  beforeEach(() => graphql.query.mockReset())

  it('reads the BGC alone unless a reader names its families, and selects each row’s family and year', async () => {
    graphql.query.mockResolvedValue(answer([]))
    await fetchObservations({ months: ['2026-08'], measures: ['GDP_SHARE'] }, 'e1')
    await fetchObservations({ months: ['2026-08'], inputs: ['BGC', 'SINTEZA'], measures: ['GDP_DENOMINATOR'], lineItems: ['pib'] }, 'e1')
    const [[document, shares], [, denominators]] = graphql.query.mock.calls as [string, { input: Record<string, unknown>; expectedSnapshot: string }][]
    expect(shares.input).toMatchObject({ inputs: ['BGC'], periodRoles: ['CURRENT'], measures: ['GDP_SHARE'] })
    expect(denominators.input).toMatchObject({ inputs: ['BGC', 'SINTEZA'], periodRoles: ['CURRENT'], measures: ['GDP_DENOMINATOR'], lineItems: ['pib'] })
    expect([shares.expectedSnapshot, denominators.expectedSnapshot]).toEqual(['e1', 'e1'])
    expect(document).toMatch(/\binput\b/u)
    expect(document).toMatch(/\breferenceYear\b/u)
  })

  it('keeps the served family and reference year of the Sinteza GDP, and refuses a row without its family', async () => {
    graphql.query.mockResolvedValue(answer([sintezaGdp]))
    const { rows } = await fetchObservations({ months: ['2026-08'], inputs: ['BGC', 'SINTEZA'], measures: ['GDP_DENOMINATOR'] }, 'e1')
    expect(rows).toEqual([sintezaGdp])
    graphql.query.mockResolvedValue(answer([{ ...sintezaGdp, input: undefined }]))
    await expect(fetchObservations({ months: ['2026-08'], inputs: ['BGC', 'SINTEZA'], measures: ['GDP_DENOMINATOR'] }, 'e1')).rejects.toThrow()
  })

  it('caches the BGC shares and the GDP apart, both on the execution snapshot', () => {
    const catalog = {
      snapshots: { approved: 'a1', execution: 'e1' },
      execution: { coverage: { firstMonth: '2006-01', lastMonth: '2026-08', missingMonths: [] }, seriesItems: [] },
      approved: { editions: [], totals: [] },
    } as unknown as BudgetNationalCatalog
    const view = viewOfYear(catalog, 2026)
    const client = new QueryClient()
    const shares = gdpSharesOptions(client, catalog, view).queryKey
    const denominators = gdpDenominatorOptions(client, catalog, view).queryKey
    expect(shares).not.toEqual(denominators)
    expect(shares).toContain('e1')
    expect(denominators).toContain('e1')
    expect(shares[3]).toEqual({ months: ['2026-08'], measures: ['GDP_SHARE'], lineItems: ['venituri totale', 'cheltuieli totale', 'excedent(+) / deficit(-)'] })
    expect(denominators[3]).toEqual({ months: ['2026-08'], inputs: ['BGC', 'SINTEZA'], measures: ['GDP_DENOMINATOR'], lineItems: ['pib'] })
  })
})
