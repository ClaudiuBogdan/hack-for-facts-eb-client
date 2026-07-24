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
      const authorityName = parsed.authorities?.edges.find(
        (edge) => edge.node.cui === authorityCui,
      )?.node.name
      const supplierName = parsed.suppliers?.edges.find(
        (edge) => edge.node.cui === supplierCui,
      )?.node.name
      return {
        ...(authorityName ? { authorityName } : {}),
        ...(supplierName ? { supplierName } : {}),
      }
    },
  })
  return query.data ?? {}
}
