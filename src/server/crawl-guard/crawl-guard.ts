/**
 * Keeps crawlers off a non-production deployment (Chronos dev), whose pages
 * read a shared ClickHouse that crawler traffic saturates.
 *
 * Two runtime switches, read from the server's environment at startup and set
 * only in `k8s/overlays/chronos-dev/configmap-patch.yaml`:
 * - `ROBOTS_DISALLOW_ALL="true"`: `/robots.txt` (GET and HEAD) disallows
 *   everything and names no sitemap, and every response carries
 *   `X-Robots-Tag: noindex, nofollow`.
 * - `REQUEST_UA_LOG="true"`: one stdout line per response with the method,
 *   path, status, duration and user agent, so impolite crawlers can be named.
 *   No IP, query string or cookies. Temporary: remove it once the caller is
 *   named (docs/issues/DEV-CRAWL-001-dev-crawler-load.md).
 *
 * Only the exact string "true" turns a switch on. With both unset (production)
 * nothing here runs: `public/robots.txt` stays a static file and every
 * response is the app's own.
 */
export type CrawlGuard = {
  readonly disallowAll: boolean
  readonly uaLog: boolean
}

export type FetchHandler = (request: Request) => Response | Promise<Response>

export const NOINDEX_HEADER = 'X-Robots-Tag'
export const NOINDEX_VALUE = 'noindex, nofollow'
export const DISALLOW_ALL_ROBOTS_TXT = 'User-agent: *\nDisallow: /\n'

export function crawlGuardOf(
  env: Readonly<Record<string, string | undefined>>,
): CrawlGuard {
  return {
    disallowAll: env.ROBOTS_DISALLOW_ALL === 'true',
    uaLog: env.REQUEST_UA_LOG === 'true',
  }
}

export const isGuardOn = (guard: CrawlGuard): boolean =>
  guard.disallowAll || guard.uaLog

const pathOf = (url: string): string =>
  URL.canParse(url, 'http://localhost')
    ? new URL(url, 'http://localhost').pathname
    : '(unparsed)'

function disallowAllRobots(method: string): Response {
  return new Response(method === 'HEAD' ? null : DISALLOW_ALL_ROBOTS_TXT, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Length': String(DISALLOW_ALL_ROBOTS_TXT.length),
    },
  })
}

/** The response with the noindex header; a response whose headers are immutable is copied. */
function withNoindex(response: Response): Response {
  try {
    response.headers.set(NOINDEX_HEADER, NOINDEX_VALUE)
    return response
  } catch {
    const copy = new Response(response.body, response)
    copy.headers.set(NOINDEX_HEADER, NOINDEX_VALUE)
    return copy
  }
}

export type UaLogInput = {
  readonly method: string
  readonly url: string
  readonly status: number
  readonly durationMs: number
  readonly userAgent: string | null
}

/** The path alone: the query string can carry search terms or tokens. */
export function uaLogLineOf(input: UaLogInput): string {
  return JSON.stringify({
    msg: 'request',
    method: input.method,
    path: pathOf(input.url),
    status: input.status,
    ms: Math.round(input.durationMs),
    ua: input.userAgent ?? '',
  })
}

/**
 * The server's fetch handler under the guard. It sits in front of everything
 * Nitro serves, static files included, so `/robots.txt` is answered here
 * before `public/` is consulted, and every response gets the header and the
 * log line. Off, it returns the handler itself.
 */
export function guardedFetch(
  guard: CrawlGuard,
  handler: FetchHandler,
  log: (line: string) => void,
  now: () => number = () => performance.now(),
): FetchHandler {
  if (!isGuardOn(guard)) return handler
  return async (request) => {
    const started = now()
    const robots =
      guard.disallowAll &&
      (request.method === 'GET' || request.method === 'HEAD') &&
      pathOf(request.url) === '/robots.txt'
    const response = robots ? disallowAllRobots(request.method) : await handler(request)
    const guarded = guard.disallowAll ? withNoindex(response) : response
    if (guard.uaLog) {
      log(
        uaLogLineOf({
          method: request.method,
          url: request.url,
          status: guarded.status,
          durationMs: now() - started,
          userAgent: request.headers.get('user-agent'),
        }),
      )
    }
    return guarded
  }
}

export const currentCrawlGuard = (): CrawlGuard =>
  crawlGuardOf(typeof process === 'undefined' ? {} : process.env)
