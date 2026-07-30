/**
 * Typed GraphQL transport for the redesign API.
 *
 * POSTs to `${getApiBaseUrl()}/api/v1/graphql` (the redesign GraphQL endpoint,
 * NOT the legacy REST surface). Feature `.live.ts` modules call `graphqlQuery`
 * with a query string + variables and then Zod-parse the returned `data`.
 *
 * This module is deliberately generic — it knows nothing about companies,
 * parliament, or any feature. Per-feature schemas + queries live next to the
 * feature; this is the shared transport every feature reuses.
 */
import { getApiBaseUrl } from '@/config/env'
import { getAuthToken } from '@/lib/auth'
import { API_FETCH_REFERRER_POLICY } from '@/lib/api/fetch-options'
import { createLogger } from '@/lib/logger'

const logger = createLogger('graphql-client')

const GRAPHQL_PATH = '/api/v1/graphql'

export interface GraphQLErrorEntry {
  readonly message: string
  readonly path?: ReadonlyArray<string | number>
  readonly locations?: ReadonlyArray<{ line: number; column: number }>
  readonly extensions?: Record<string, unknown>
}

interface GraphQLResponseBody<T> {
  data?: T | null
  errors?: GraphQLErrorEntry[]
}

/**
 * Thrown when the GraphQL request fails at the HTTP layer or the response
 * carries a non-empty `errors[]`. Callers can inspect `graphQLErrors` to
 * distinguish a `null`-but-valid field (handled by the caller) from a true
 * error.
 */
export class GraphQLRequestError extends Error {
  constructor(
    message: string,
    readonly options: {
      readonly status?: number
      readonly graphQLErrors?: GraphQLErrorEntry[]
      readonly query?: string
    } = {},
  ) {
    super(message)
    this.name = 'GraphQLRequestError'
  }

  get graphQLErrors(): GraphQLErrorEntry[] {
    return this.options.graphQLErrors ?? []
  }

  get status(): number | undefined {
    return this.options.status
  }
}

function formatGraphQLErrors(errors: GraphQLErrorEntry[]): string {
  const messages = errors
    .map((entry) => entry?.message)
    .filter((message): message is string => typeof message === 'string' && message.trim().length > 0)
  return messages.length > 0 ? messages.join('; ') : 'Unknown GraphQL error'
}

function parseJsonSafely(text: string): unknown {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export interface GraphQLQueryOptions {
  /** AbortSignal so React Query / route loaders can cancel in-flight requests. */
  readonly signal?: AbortSignal
  /**
   * Short label used in logs/error messages (e.g. "company", "companies").
   * Helps trace which feature query failed without dumping the full query.
   */
  readonly operationName?: string
  /**
   * Public reads can bypass Clerk initialization entirely. The default remains
   * optional auth so existing private/mixed surfaces keep attaching a token
   * whenever one is available.
   */
  readonly auth?: 'optional' | 'none'
}

/**
 * Execute a GraphQL query and return the unwrapped `data`.
 *
 * - HTTP failure (`!response.ok`) → throws `GraphQLRequestError` with status.
 * - Non-empty `errors[]` → throws `GraphQLRequestError` with `graphQLErrors`.
 * - Missing/`null` `data` → throws (a `null` *field* inside `data` is fine and
 *   is the caller's responsibility, e.g. `company(cui)` returning `null` for an
 *   unknown CUI).
 */
export async function graphqlQuery<T>(
  query: string,
  variables?: Record<string, unknown>,
  options: GraphQLQueryOptions = {},
): Promise<T> {
  const endpoint = `${getApiBaseUrl()}${GRAPHQL_PATH}`
  const label = options.operationName ?? 'graphql'

  let token: string | null = null
  if (options.auth !== 'none') {
    try {
      token = await getAuthToken()
    } catch {
      // Anonymous access is supported for public data; ignore token failures.
    }
  }

  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      referrerPolicy: API_FETCH_REFERRER_POLICY,
      signal: options.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ query, variables }),
    })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause)
    logger.error('GraphQL transport error', { label, message })
    throw new GraphQLRequestError(`GraphQL request failed: ${message}`, { query })
  }

  const rawText = await response.text()
  const parsed = parseJsonSafely(rawText) as GraphQLResponseBody<T> | null

  if (!response.ok) {
    const errors = Array.isArray(parsed?.errors) ? parsed!.errors : []
    const detail = errors.length > 0 ? ` - ${formatGraphQLErrors(errors)}` : rawText ? ` - ${rawText}` : ''
    logger.error('GraphQL HTTP error', { label, status: response.status })
    throw new GraphQLRequestError(
      `GraphQL request failed: ${response.status} ${response.statusText}${detail}`,
      { status: response.status, graphQLErrors: errors, query },
    )
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new GraphQLRequestError('GraphQL response was not valid JSON', { query })
  }

  if (Array.isArray(parsed.errors) && parsed.errors.length > 0) {
    logger.error('GraphQL errors', { label, errors: parsed.errors })
    throw new GraphQLRequestError(`GraphQL errors: ${formatGraphQLErrors(parsed.errors)}`, {
      graphQLErrors: parsed.errors,
      query,
    })
  }

  if (parsed.data == null) {
    throw new GraphQLRequestError('GraphQL response contained no data', { query })
  }

  return parsed.data
}
