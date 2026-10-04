import { GraphQLRequestError } from '@/lib/graphql/graphql-client'

/**
 * A search answer the client must not present: the server's final check
 * refused it (`searchEntities: null` with `SERVICE_UNAVAILABLE`), or its
 * company metadata was unreadable. It is a retry, never "no results" and
 * never a reason to keep showing an older answer.
 */
export class EntitySearchWithheldError extends Error {
  constructor(
    readonly kind: 'refused' | 'unreadable',
    options?: { readonly cause?: unknown },
  ) {
    super(
      kind === 'refused'
        ? 'The search answer was withheld by the server; retry'
        : 'The search answer was unreadable; retry',
      options,
    )
    this.name = 'EntitySearchWithheldError'
  }
}

export function isSearchWithheld(error: unknown): error is EntitySearchWithheldError {
  return error instanceof EntitySearchWithheldError
}

/** The server's refusal of a whole answer (contract r2 §5). */
export function isServiceUnavailable(error: unknown): boolean {
  return error instanceof GraphQLRequestError && error.graphQLErrors.some(
    entry => entry.extensions?.code === 'SERVICE_UNAVAILABLE',
  )
}
