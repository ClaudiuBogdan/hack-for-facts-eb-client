/**
 * Keeps crawlers off a non-production deployment (Chronos dev), whose pages
 * read a shared ClickHouse that crawler traffic saturates.
 *
 * Two runtime switches, read from the server's environment at startup and set
 * only in `k8s/overlays/chronos-dev/configmap-patch.yaml`:
 * - `ROBOTS_DISALLOW_ALL="true"`: `/robots.txt` (GET and HEAD) disallows
 *   everything and names no sitemap, and every response carries
 *   `X-Robots-Tag: noindex, nofollow`.
 * - `REQUEST_UA_LOG="true"`: one stdout line per request the app answers, with the method,
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

/**
 * The path as Nitro's static handler resolves it (decoded, without trailing
 * slashes), so `/robots.txt/` or `/%72obots.txt` cannot reach the public file.
 */
function staticPathOf(url: string): string {
  const path = pathOf(url).replace(/\/+$/u, '') || '/'
  try {
    return decodeURIComponent(path)
  } catch {
    return path
  }
}

/** Routes whose path segment after the prefix authorises something (`/unsubscribe/$token`) or names a private link (`/share/$code`). */
const SECRET_PATHS = ['/unsubscribe/', '/share/']

/** A segment that could be a token rather than a slug or an id: long and holding a digit, or just long. */
const OPAQUE_SEGMENT = (segment: string) => (segment.length >= 20 && /\d/u.test(segment)) || segment.length >= 40

const decodedOf = (segment: string): string => {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

/**
 * The path to log, read as the router reads it (decoded, any case): a secret
 * route's rest, and any segment that could be a token, redacted.
 */
export function loggablePathOf(url: string): string {
  const segments = pathOf(url).split('/').map(decodedOf)
  const decoded = segments.join('/').replace(/\/{2,}/gu, '/')
  const secret = SECRET_PATHS.find((prefix) => decoded.toLowerCase().startsWith(prefix))
  if (secret) return `${secret}:redacted`
  return segments.map((segment) => (OPAQUE_SEGMENT(segment) ? ':redacted' : encodeURI(segment))).join('/')
}

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

/** The path alone, tokens redacted: the query string can carry search terms or tokens, and some paths do. */
export function uaLogLineOf(input: UaLogInput): string {
  return JSON.stringify({
    msg: 'request',
    method: input.method,
    path: loggablePathOf(input.url),
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
  onError: (error: unknown) => void = () => {},
): FetchHandler {
  if (!isGuardOn(guard)) return handler
  const logged = (request: Request, status: number, started: number) => {
    if (!guard.uaLog) return
    log(
      uaLogLineOf({
        method: request.method,
        url: request.url,
        status,
        durationMs: now() - started,
        userAgent: request.headers.get('user-agent'),
      }),
    )
  }
  return async (request) => {
    const started = now()
    const robots =
      guard.disallowAll &&
      (request.method === 'GET' || request.method === 'HEAD') &&
      staticPathOf(request.url) === '/robots.txt'
    let response: Response
    try {
      response = robots ? disallowAllRobots(request.method) : await handler(request)
    } catch (error) {
      // A rejection past H3's own error handling: the Node adapter would leave it unanswered, so it is reported and answered here.
      onError(error)
      response = new Response(null, { status: 500 })
    }
    const guarded = guard.disallowAll ? withNoindex(response) : response
    logged(request, guarded.status, started)
    return guarded
  }
}

type WriteHead = (this: NodeResponse, statusCode: number, ...rest: unknown[]) => unknown

/** The part of Node's `http.ServerResponse` the header needs. */
export interface NodeResponse {
  hasHeader(name: string): boolean
  setHeader(name: string, value: string): unknown
}

function rawHeadersHave(headers: unknown, name: string): boolean {
  const lower = name.toLowerCase()
  if (Array.isArray(headers)) {
    return Array.isArray(headers[0])
      ? (headers as unknown[][]).some((pair) => String(pair[0]).toLowerCase() === lower)
      : headers.some((value, index) => index % 2 === 0 && String(value).toLowerCase() === lower)
  }
  return headers !== null && typeof headers === 'object' && Object.keys(headers).some((key) => key.toLowerCase() === lower)
}

/**
 * Every response Node's HTTP/1 server writes through `ServerResponse` carries
 * the noindex header — also those written outside the app's fetch handler
 * (Node's own 417 for `Expect`, the adapter's 500 on a failed stream), which
 * no `Response` of the app's passes through. Not covered: the 400 Node's
 * parser writes straight to the socket for a malformed request, and HTTP/2,
 * which this server does not speak. Installed only with `ROBOTS_DISALLOW_ALL`
 * on; returns the uninstall.
 */
export function noindexNodeResponses(prototype: { writeHead: WriteHead }): () => void {
  const original = prototype.writeHead
  prototype.writeHead = function (this: NodeResponse, statusCode: number, ...rest: unknown[]) {
    const at = rest.findIndex((arg) => typeof arg === 'object' && arg !== null)
    const headers = at === -1 ? undefined : rest[at]
    if (this.hasHeader(NOINDEX_HEADER) || rawHeadersHave(headers, NOINDEX_HEADER)) return original.call(this, statusCode, ...rest)
    if (at === -1) {
      this.setHeader(NOINDEX_HEADER, NOINDEX_VALUE)
      return original.call(this, statusCode, ...rest)
    }
    // A copy: the caller's headers may be frozen, or shared.
    const tagged = Array.isArray(headers)
      ? Array.isArray(headers[0])
        ? [...(headers as unknown[][]), [NOINDEX_HEADER, NOINDEX_VALUE]]
        : [...headers, NOINDEX_HEADER, NOINDEX_VALUE]
      : { ...(headers as Record<string, unknown>), [NOINDEX_HEADER]: NOINDEX_VALUE }
    const args = [...rest]
    args[at] = tagged
    return original.call(this, statusCode, ...args)
  }
  return () => {
    prototype.writeHead = original
  }
}

export const currentCrawlGuard = (): CrawlGuard =>
  crawlGuardOf(typeof process === 'undefined' ? {} : process.env)
