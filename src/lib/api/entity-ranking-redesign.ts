import { z } from 'zod'

import { graphqlQuery } from '@/lib/graphql/graphql-client'
import type { NormalizationOptions } from '@/lib/normalization'
import type { ReportPeriodInput } from '@/schemas/reporting'

import { MoneySchema, toBudgetNormalization } from './entities-redesign'

const MAX_VISIBLE_SUBORDINATE_CARDS = 5

const RankingResponseSchema = z.object({
  budgetEntityRanking: z.array(
    z.object({
      entityCui: z.string(),
      entityName: z.string().nullable(),
      amount: MoneySchema,
      perCapita: MoneySchema.nullable(),
      population: z.number().int().nullable(),
      countyCode: z.string().nullable(),
      entity: z
        .object({
          reference: z
            .object({
              entityType: z.string().nullable(),
              territory: z.object({ countyName: z.string().nullable() }).nullable(),
            })
            .nullable(),
        })
        .nullable(),
    }),
  ),
})

const ENTITY_SUBORDINATE_RANKING_QUERY = /* GraphQL */ `
  query EntitySubordinateRanking($filter: BudgetRankingFilter, $normalization: BudgetNormalization!, $limit: Int!) {
    budgetEntityRanking(
      filter: $filter
      metric: EXPENSE
      normalization: $normalization
      ascending: false
      limit: $limit
    ) {
      entityCui
      entityName
      amount
      perCapita
      population
      countyCode
      entity {
        reference {
          entityType
          territory {
            countyName
          }
        }
      }
    }
  }
`

export type EntitySubordinateRankingConnection = {
  readonly nodes: ReadonlyArray<{
    readonly entity_cui: string
    readonly entity_name: string
    readonly entity_type: string | null
    readonly county_code: string | null
    readonly county_name: string | null
    readonly population: number | null
    readonly amount: number
    readonly total_amount: number
    readonly per_capita_amount: number | null
  }>
  readonly pageInfo: {
    readonly totalCount: number
    readonly hasNextPage: false
    readonly hasPreviousPage: false
  }
}

function selectedPeriod(reportPeriod: ReportPeriodInput): {
  readonly year: number
  readonly month?: number
  readonly quarter?: number
} {
  const values = reportPeriod.selection.dates ?? [
    reportPeriod.selection.interval.start,
    reportPeriod.selection.interval.end,
  ]
  const uniqueValues = [...new Set(values)]
  if (uniqueValues.length !== 1) {
    throw new Error('Subordinate ranking requires one selected period')
  }

  const value = uniqueValues[0]!
  const year = Number(value.slice(0, 4))
  if (!Number.isInteger(year)) {
    throw new Error('Invalid subordinate ranking year')
  }

  if (reportPeriod.type === 'MONTH') {
    const month = Number(value.slice(5, 7))
    if (!/^\d{4}-(0[1-9]|1[0-2])$/u.test(value)) {
      throw new Error('Invalid subordinate ranking month')
    }
    return { year, month }
  }

  if (reportPeriod.type === 'QUARTER') {
    if (!/^\d{4}-Q[1-4]$/u.test(value)) {
      throw new Error('Invalid subordinate ranking quarter')
    }
    return { year, quarter: Number(value.slice(-1)) }
  }

  if (!/^\d{4}$/u.test(value)) {
    throw new Error('Invalid subordinate ranking year')
  }
  return { year }
}

export async function fetchRedesignEntitySubordinateRanking(params: {
  readonly entityCui: string
  readonly reportPeriod: ReportPeriodInput
  readonly normalizationOptions: Pick<NormalizationOptions, 'currency' | 'inflation_adjusted'>
}): Promise<EntitySubordinateRankingConnection> {
  const period = selectedPeriod(params.reportPeriod)
  const normalization = toBudgetNormalization({
    normalization: 'total',
    ...params.normalizationOptions,
  })
  const raw = await graphqlQuery<unknown>(
    ENTITY_SUBORDINATE_RANKING_QUERY,
    {
      filter: {
        year: { eq: period.year },
        frequency: { eq: params.reportPeriod.type },
        reportType: { eq: 'EXECUTION_DETAILED' },
        mainCreditorCui: { eq: params.entityCui },
        exclude: { excludeEntityCuis: { in: [params.entityCui] } },
        ...(period.month !== undefined ? { month: { eq: period.month } } : {}),
        ...(period.quarter !== undefined ? { quarter: { eq: period.quarter } } : {}),
      },
      normalization,
      limit: MAX_VISIBLE_SUBORDINATE_CARDS,
    },
    { operationName: 'entity-subordinate-ranking', auth: 'none' },
  )
  const rows = RankingResponseSchema.parse(raw).budgetEntityRanking

  return {
    nodes: rows.map((row) => ({
      entity_cui: row.entityCui,
      entity_name: row.entityName ?? row.entityCui,
      entity_type: row.entity?.reference?.entityType ?? null,
      county_code: row.countyCode,
      county_name: row.entity?.reference?.territory?.countyName ?? null,
      population: row.population,
      amount: row.amount,
      total_amount: row.amount,
      per_capita_amount: row.perCapita,
    })),
    pageInfo: {
      totalCount: rows.length,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  }
}
