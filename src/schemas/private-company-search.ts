import { z } from 'zod'

/**
 * URL state for the /companies search page. TanStack Router JSON-parses search
 * params, so `?q=14399840` can arrive as a number — coerce to string. Filters
 * map onto the redesign GraphQL `companies(filter, q, sort, first, after)`
 * query (see `api/graphql/company-filters.ts`).
 */
export const privateCompanyDirectorySearchSchema = z.object({
  q: z.coerce.string().optional().catch(undefined),
  county: z.coerce.string().optional().catch(undefined),
  status: z.coerce.string().optional().catch(undefined),
  caen: z.coerce.string().optional().catch(undefined),
  sort: z.enum(['name', 'registration-date', 'cui']).optional().catch(undefined),
})

export type PrivateCompanyDirectorySearchState = z.infer<
  typeof privateCompanyDirectorySearchSchema
>

export function parsePrivateCompanyDirectorySearch(
  search: Record<string, unknown>,
): PrivateCompanyDirectorySearchState {
  return privateCompanyDirectorySearchSchema.parse(search)
}

/**
 * Internal query passed to the live API. `pageSize`/`cursor` drive the GraphQL
 * connection; the URL only carries the user-facing filters.
 */
export type PrivateCompanySearchQuery = {
  readonly q?: string
  readonly county?: string
  readonly status?: string
  readonly caen?: string
  readonly sort?: 'name' | 'registration-date' | 'cui'
  readonly pageSize: number
  readonly cursor?: string | null
  readonly signal?: AbortSignal
}

/** A selectable county facet (display name + active-company count). */
export type PrivateCompanyCountyFacet = {
  readonly name: string
  readonly count: number
}

/**
 * Status-code options for the directory status filter, by descending company
 * count in prod (`companies.registrations.status_code`). Codes verified against
 * the production DB on 2026-06-17.
 */
export const PRIVATE_COMPANY_STATUS_OPTIONS = [
  { code: '1084', label: 'radiată' },
  { code: '1048', label: 'funcțiune' },
  { code: '1074', label: 'întrerupere temporară de activitate' },
  { code: '1049', label: 'dizolvare' },
  { code: '1052', label: 'lichidare' },
  { code: '1070', label: 'faliment' },
  { code: '1107', label: 'insolvență' },
] as const

/** One result page from the GraphQL `companies` connection. */
export type PrivateCompanySearchResultPage = {
  readonly items: ReadonlyArray<{
    readonly cui: string
    readonly name: string
    readonly legalForm: string | null
    readonly status: { code: string; label: string } | null
    readonly county: string | null
    readonly vatPayer: boolean | null
    readonly declaredFiscallyInactive: boolean | null
    readonly registrationDate: string | null
  }>
  readonly nextCursor: string | null
  readonly totalCount: number | null
  readonly totalEstimated: boolean
}
