import { GRAPHQL_INVALID_INPUT_CODE, GraphQLRequestError } from '@/lib/graphql/graphql-client'

/**
 * How a company read can fail because of the ONRC registry rather than the
 * network. The API pins one registry scope per request and says so:
 *
 * - the answer came back under another scope than the page pinned (the
 *   server re-pinned after a publish, withdrawal or access change), the
 *   server could not hold one scope through the request, or it refused a
 *   continuation cursor of another scope or the page's `registryScope` key
 *   (the resolver) — `CompanyRegistryScopeMovedError`:
 *   nothing of it is shown or cached, and the page re-reads the registry;
 * - the registry has no published edition, so a registry filter, sort,
 *   grouping or lookup cannot be answered — `CompanyRegistryUnavailableError`:
 *   a state to show, never an empty result;
 * - a read that depends on a company the page shows found no directory
 *   company for the CUI any more (`company: null`: it turned non-public or
 *   left the directory) — `CompanyRegistryParentMissingError`: what the page
 *   showed of it is withdrawn and read again; never a legal fact about it.
 */

const SERVICE_UNAVAILABLE_CODE = 'SERVICE_UNAVAILABLE'

/** The server's words for a scope that moved under one request (core/registry.ts). */
const MOVED_DURING_REQUEST = /changed during the request/iu
/** The server's words for a refused continuation (a cursor of another scope, or a malformed one). */
const RESTART_PAGINATION = /restart pagination/iu
/**
 * The resolver's words (`companyResolveResult`, repair 04) for a `registryScope`
 * it refuses: the scope moved since the page's key was issued, or the key is
 * not one this API issues (the page's key is stale). Only these two documented
 * messages: any other refused input is the caller's own failure, never a move.
 */
const REGISTRY_SCOPE_REFUSED = /since registryScope was issued|registryScope is not a registry scope key issued by this API/iu

export class CompanyRegistryScopeMovedError extends Error {
  constructor(
    /** The scope the answer carried, when it carried one. */
    readonly responseScopeKey: string | null = null,
  ) {
    super('The ONRC registry scope changed during the read')
    this.name = 'CompanyRegistryScopeMovedError'
  }
}

export class CompanyRegistryUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CompanyRegistryUnavailableError'
  }
}

export class CompanyRegistryParentMissingError extends Error {
  constructor() {
    super('The company the read depends on is no longer a public directory company')
    this.name = 'CompanyRegistryParentMissingError'
  }
}

function codes(error: GraphQLRequestError): readonly string[] {
  return error.graphQLErrors.flatMap((entry) => (typeof entry.extensions?.code === 'string' ? [entry.extensions.code] : []))
}

/**
 * The registry meaning of a failed read, else the error as it came.
 * `continuation`: the read sent a cursor, so an invalid input is the server
 * refusing that cursor, not the filter.
 */
export function classifyRegistryError(error: unknown, { continuation = false }: { readonly continuation?: boolean } = {}): unknown {
  if (!(error instanceof GraphQLRequestError)) return error
  const messages = error.graphQLErrors.map((entry) => entry.message).join('; ')
  const raised = codes(error)
  if (raised.includes(SERVICE_UNAVAILABLE_CODE)) {
    return MOVED_DURING_REQUEST.test(messages) ? new CompanyRegistryScopeMovedError() : new CompanyRegistryUnavailableError(messages)
  }
  if (continuation && raised.includes(GRAPHQL_INVALID_INPUT_CODE) && RESTART_PAGINATION.test(messages)) {
    return new CompanyRegistryScopeMovedError()
  }
  // The error carries no `field` (the companies mapper exposes code and type only): code + documented message decide.
  if (raised.includes(GRAPHQL_INVALID_INPUT_CODE) && REGISTRY_SCOPE_REFUSED.test(messages)) {
    return new CompanyRegistryScopeMovedError()
  }
  return error
}

/** An answer under another scope than the one pinned is never kept as the pinned one's. */
export function assertRegistryScope(actual: string, expected: string): void {
  if (actual !== expected) throw new CompanyRegistryScopeMovedError(actual)
}

export function isRegistryScopeMoved(error: unknown): error is CompanyRegistryScopeMovedError {
  return error instanceof CompanyRegistryScopeMovedError
}

export function isRegistryUnavailable(error: unknown): error is CompanyRegistryUnavailableError {
  return error instanceof CompanyRegistryUnavailableError
}

export function isRegistryParentMissing(error: unknown): error is CompanyRegistryParentMissingError {
  return error instanceof CompanyRegistryParentMissingError
}

/** A refusal the page answers by re-reading the registry: a moved scope, an unavailable registry, a company gone from the directory. */
export function isRegistryRefusal(error: unknown): boolean {
  return isRegistryScopeMoved(error) || isRegistryUnavailable(error) || isRegistryParentMissing(error)
}

/**
 * A bound read is retried for a transient failure only: a scope that moved
 * waits for the page to re-pin, an unavailable registry answers the same
 * until it publishes, and a company gone from the directory is read again by
 * the page, not by the read.
 */
export function retryRegistryRead(failureCount: number, error: unknown): boolean {
  return !isRegistryRefusal(error) && failureCount < 2
}
