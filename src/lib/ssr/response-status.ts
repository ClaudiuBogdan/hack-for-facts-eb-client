const DEFAULT_STATUS = 200

/**
 * The status the HTML response should carry.
 *
 * TanStack Start renders the page with the router's own status (200, 404 for
 * a not-found match, 500 for an errored one, or a redirect) and ignores
 * `setResponseStatus` from a loader, while it does merge response headers set
 * the same way. A loader that has something to say about the status — the
 * entity page serving its shell past the SSR deadline as a 503 — sets it on
 * the response, and the server entry applies it here when the router itself
 * has nothing more specific than a plain 200.
 */
export function resolveSsrResponseStatus(params: {
  readonly routerStatus: number
  readonly responseStatus: number
}): number {
  const { routerStatus, responseStatus } = params
  if (routerStatus !== DEFAULT_STATUS) {
    return routerStatus
  }

  return responseStatus
}
