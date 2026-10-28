import { describe, expect, it } from 'vitest'
import { GraphQLRequestError } from '@/lib/graphql/graphql-client'
import { createQueryClient, shouldRetryQuery } from './queryClient'

const removedField = () =>
  new GraphQLRequestError('GraphQL errors: Cannot query field', {
    graphQLErrors: [
      { message: 'Unknown type "ElectionCatalogFilter".', locations: [{ line: 1, column: 32 }] },
      { message: 'Cannot query field "electionCatalog" on type "Query".', locations: [{ line: 1, column: 69 }] },
    ],
  })
const fieldError = (code?: string) =>
  new GraphQLRequestError('GraphQL errors: field', {
    graphQLErrors: [{ message: 'field', path: ['electionContests'], ...(code ? { extensions: { code } } : {}) }],
  })

describe('shouldRetryQuery', () => {
  it('never retries a document the server rejects before running it', () => {
    expect(shouldRetryQuery(0, removedField())).toBe(false)
  })

  it('never retries a refused input or a missing record', () => {
    expect(shouldRetryQuery(0, fieldError('INVALID_INPUT'))).toBe(false)
    expect(shouldRetryQuery(0, fieldError('NOT_FOUND'))).toBe(false)
    expect(shouldRetryQuery(0, fieldError('BAD_USER_INPUT'))).toBe(false)
  })

  it('never retries a client error status, except a timeout or a rate limit', () => {
    expect(shouldRetryQuery(0, new GraphQLRequestError('400', { status: 400 }))).toBe(false)
    expect(shouldRetryQuery(0, new GraphQLRequestError('408', { status: 408 }))).toBe(true)
    expect(shouldRetryQuery(0, new GraphQLRequestError('429', { status: 429 }))).toBe(true)
  })

  it('retries once a network failure, a timeout, a 5xx or a field that failed for another reason', () => {
    for (const error of [
      new GraphQLRequestError('GraphQL request failed: fetch failed'),
      new GraphQLRequestError('timed out', { timedOut: true }),
      new GraphQLRequestError('502', { status: 502 }),
      fieldError('INTERNAL_SERVER_ERROR'),
      fieldError(),
      new TypeError('Failed to fetch'),
    ]) {
      expect(shouldRetryQuery(0, error)).toBe(true)
      expect(shouldRetryQuery(1, error)).toBe(false)
    }
  })

  it('retries a request-level error that points nowhere in the document', () => {
    expect(shouldRetryQuery(0, new GraphQLRequestError('context', { graphQLErrors: [{ message: 'Internal server error' }] }))).toBe(true)
  })

  it('a mixed answer stays retryable when any field failed for another reason', () => {
    const mixed = new GraphQLRequestError('mixed', {
      graphQLErrors: [
        { message: 'refused', path: ['a'], extensions: { code: 'INVALID_INPUT' } },
        { message: 'db', path: ['b'], extensions: { code: 'INTERNAL_SERVER_ERROR' } },
      ],
    })
    expect(shouldRetryQuery(0, mixed)).toBe(true)
  })

  it('is the client default', () => {
    expect(createQueryClient().getDefaultOptions().queries?.retry).toBe(shouldRetryQuery)
  })
})
