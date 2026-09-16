import { GraphQLRequestError } from '@/lib/graphql/graphql-client'

export function isSearchInputError(error: unknown): boolean {
  return error instanceof GraphQLRequestError && error.graphQLErrors.some(
    entry => entry.extensions?.code === 'INVALID_INPUT',
  )
}
