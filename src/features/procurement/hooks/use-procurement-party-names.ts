/**
 * Resolve display names for the ACTIVE party filters so badges show
 * "Primăria Cluj-Napoca", not a bare CUI. One bounded lookup through
 * procurement's own party resolver (same operation the rankings use);
 * names are stable, so the cache holds them for the session.
 */
import { useQuery } from '@tanstack/react-query'
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import {
  PROCUREMENT_PARTY_NAMES_QUERY,
  procurementPartyNamesResponseSchema,
} from '../api/graphql/procurement-queries'

export type ProcurementPartyNameLabels = {
  readonly authorityName?: string
  readonly supplierName?: string
}

const NAME_STALE_TIME_MS = 24 * 60 * 60 * 1000

export function useProcurementPartyNames(input: {
  readonly authorityCui?: string
  readonly supplierCui?: string
}): ProcurementPartyNameLabels {
  const authorityCui = input.authorityCui?.trim() || undefined
  const supplierCui = input.supplierCui?.trim() || undefined
  const query = useQuery({
    queryKey: [
      'procurement',
      'party-filter-names',
      authorityCui ?? null,
      supplierCui ?? null,
    ],
    enabled: Boolean(authorityCui ?? supplierCui),
    staleTime: NAME_STALE_TIME_MS,
    queryFn: async (): Promise<ProcurementPartyNameLabels> => {
      const raw = await graphqlQuery<unknown>(
        PROCUREMENT_PARTY_NAMES_QUERY,
        {
          authorityCuis: authorityCui ? [authorityCui] : [],
          supplierCuis: supplierCui ? [supplierCui] : [],
          includeAuthorities: Boolean(authorityCui),
          includeSuppliers: Boolean(supplierCui),
        },
        { operationName: 'ProcurementPartyNames' },
      )
      const parsed = procurementPartyNamesResponseSchema.parse(raw)
      // Correlate by POSITION, not by matching the returned cui against our
      // input: the server answers with the NORMALIZED identifier (and null for
      // unavailable ones), so `RO 4305857` in, `4305857` back — a string compare
      // would silently lose the name. We send exactly one id per role, so the
      // answer is the first element.
      //
      // Only `named` carries a real name: `placeholder` (a spine stub whose name
      // is the CUI) and `unavailable` both mean "fall back to the CUI".
      const nameOf = (
        labels: ReadonlyArray<{
          readonly canonicalName: string | null
          readonly status: string
        }>,
      ): string | undefined => {
        const hit = labels[0]
        return hit?.status === 'named' ? (hit.canonicalName ?? undefined) : undefined
      }
      const authorityName = authorityCui ? nameOf(parsed.authorities ?? []) : undefined
      const supplierName = supplierCui ? nameOf(parsed.suppliers ?? []) : undefined
      return {
        ...(authorityName ? { authorityName } : {}),
        ...(supplierName ? { supplierName } : {}),
      }
    },
  })
  return query.data ?? {}
}
