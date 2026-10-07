import { graphqlQuery } from '@/lib/graphql/graphql-client'
import {
  judicialCaseLinkPageSchema,
  judicialCompanyLitigationSchema,
  type JudicialCaseLinkPage,
  type JudicialCompanyLitigation,
} from '@/schemas/judicial'
import { z } from 'zod'

/**
 * A company's court cases, read from the judicial API. The API counts only
 * the cases linked to the company through a published name-to-CUI match, so
 * every figure here is a floor, and a company with no published link reads
 * as `coverage` 0 — unknown, never „no cases".
 */

export const COMPANY_LITIGATION_PAGE_SIZE = 20

const COMPANY_LITIGATION_QUERY = /* GraphQL */ `
  query JudicialCompanyLitigation($cui: String!) {
    judicialCompanyLitigation(cui: $cui) {
      cui
      caseCount
      courtLevels {
        courtLevel
        count
      }
      years {
        year
        count
      }
      coverage
      caveats
    }
  }
`

const COMPANY_LITIGATION_CASES_QUERY = /* GraphQL */ `
  query JudicialCompanyLitigationCases($cui: String!, $first: Int!, $after: String) {
    judicialCompanyLitigationCases(cui: $cui, first: $first, after: $after) {
      edges {
        node {
          caseId
          institutionCode
          caseNumber
          category
          sourceOpenedAt
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`

const litigationResponseSchema = z.object({ judicialCompanyLitigation: judicialCompanyLitigationSchema })

const casesResponseSchema = z.object({
  judicialCompanyLitigationCases: z.object({
    edges: z.array(z.object({ node: z.unknown() })),
    pageInfo: z.object({ hasNextPage: z.boolean(), endCursor: z.string().nullable() }),
  }),
})

export async function fetchCompanyLitigation(cui: string, signal?: AbortSignal): Promise<JudicialCompanyLitigation> {
  const data = await graphqlQuery<unknown>(COMPANY_LITIGATION_QUERY, { cui }, { operationName: 'JudicialCompanyLitigation', signal })
  return litigationResponseSchema.parse(data).judicialCompanyLitigation
}

export async function fetchCompanyLitigationCases(
  cui: string,
  after: string | null,
  signal?: AbortSignal,
): Promise<JudicialCaseLinkPage> {
  const data = await graphqlQuery<unknown>(
    COMPANY_LITIGATION_CASES_QUERY,
    { cui, first: COMPANY_LITIGATION_PAGE_SIZE, after },
    { operationName: 'JudicialCompanyLitigationCases', signal },
  )
  const connection = casesResponseSchema.parse(data).judicialCompanyLitigationCases
  return judicialCaseLinkPageSchema.parse({
    cases: connection.edges.map((edge) => edge.node),
    endCursor: connection.pageInfo.endCursor,
    hasNextPage: connection.pageInfo.hasNextPage,
  })
}

/**
 * Whether a company's litigation can be shown: only when published links
 * count at least one case. Without one the API cannot tell „no cases" from
 * „not linked yet", so there is nothing honest to show.
 */
export function hasPublishedLitigation(litigation: JudicialCompanyLitigation | undefined): litigation is JudicialCompanyLitigation {
  return litigation !== undefined && litigation.coverage > 0 && litigation.caseCount > 0
}
