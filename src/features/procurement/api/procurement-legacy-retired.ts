import { GraphQLRequestError } from '@/lib/graphql/graphql-client'
import { isLegacyOffAnswer } from '@/lib/graphql/legacy-procurement'

/**
 * The API has legacy procurement switched off (`PROCUREMENT_LEGACY_ENABLED=false`,
 * reason `legacy_retired`): it serves no legacy record, now or on a retry. A
 * read that only the legacy surface could answer then has nothing to show,
 * which is no failed read (PROC-001).
 */
export function isLegacyRetired(error: unknown): boolean {
  return error instanceof GraphQLRequestError && isLegacyOffAnswer(error.graphQLErrors)
}
