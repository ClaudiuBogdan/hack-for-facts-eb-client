import { createFileRoute } from '@tanstack/react-router'
import { carriesOlderKey } from '@/lib/disclosure-key'

const API_PATH = '/api/v1/graphql'
const LOCAL_API_ORIGIN = 'http://127.0.0.1:3001'

type ConfigSource = Readonly<Record<string, unknown>>

/** The server's own environment, read per request: what the deployment sets, never baked into the image. */
function runtimeConfig(): ConfigSource {
  return typeof process === 'undefined' ? {} : process.env
}

/**
 * Resolve the upstream GraphQL origin.
 *
 * The server's runtime configuration comes first. `import.meta.env` is
 * inlined at build time, and the image is built without env files, so in a
 * deployment it holds no API origin — only local development puts one there.
 * At runtime: an explicit proxy target, then the private `INTERNAL_API_URL`
 * that server rendering also uses, then the public `VITE_API_URL`; then the
 * build-time values.
 *
 * Three ways this used to break, all of which looked identical to the client
 * (an unexplained failure with no `errors[]`):
 *  - an env var set to `""` or `"   "` — present, so `??` accepted it, then
 *    `new URL('')` threw. Values are trimmed and blanks are treated as unset.
 *  - a value that is not a URL at all — same throw. It now falls back rather
 *    than taking the route down.
 *  - a target equal to THIS route's own origin — the handler would fetch
 *    itself, recursively, until the request died. Same-origin targets are
 *    refused, and so is the local fallback when the app itself is served on it
 *    (which would just be a slower loop).
 */
export function getGraphqlProxyTarget(
  requestUrl: string,
  runtime: ConfigSource = runtimeConfig(),
  build: ConfigSource = import.meta.env,
): string | null {
  const configuredTarget = [
    runtime.VITE_API_PROXY_TARGET,
    runtime.INTERNAL_API_URL,
    runtime.VITE_API_URL,
    build.VITE_API_PROXY_TARGET,
    build.VITE_API_URL,
  ]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .find((value) => value.length > 0)

  const requestOrigin = safeOrigin(requestUrl)
  const configuredOrigin = configuredTarget
    ? safeOrigin(configuredTarget)
    : null

  // A same-origin target would send this server route back into itself forever.
  // Local development serves the API on 3001 and the client on 3000.
  if (configuredOrigin && configuredOrigin !== requestOrigin) {
    return configuredOrigin
  }

  // No usable configuration. The local API port is the intended default — but
  // only when it is not this app's own origin, or we have just rebuilt the loop.
  return LOCAL_API_ORIGIN === requestOrigin ? null : LOCAL_API_ORIGIN
}

function safeOrigin(value: string): string | null {
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

/**
 * A GraphQL-shaped error envelope.
 *
 * The client's transport branches on `errors[].extensions.code`, so a proxy
 * failure has to speak the same language as the API instead of returning an
 * HTML error page or an empty body. `UPSTREAM_UNAVAILABLE` /
 * `PROXY_MISCONFIGURED` are deliberately NOT any of the module's data codes
 * (`NOT_FOUND`, `TRANSCRIPT_UNAVAILABLE`, `SEARCH_UNAVAILABLE`): a reader must
 * never be told a record does not exist because a proxy hop failed.
 */
function transportErrorResponse(
  status: number,
  code: 'UPSTREAM_UNAVAILABLE' | 'PROXY_MISCONFIGURED' | 'STALE_DISCLOSURE',
  message: string,
): Response {
  return new Response(
    JSON.stringify({ data: null, errors: [{ message, extensions: { code } }] }),
    { status, headers: { 'Content-Type': 'application/json' } },
  )
}

/**
 * Whether a proxied body carries a `meta.disclosureKey` older than the newest
 * seen. Checked only, never noted: the proxy forwards any caller's document,
 * and a caller's aliases must not move the process's newest key. A body that
 * is not JSON is passed on as it is.
 */
function isStaleDisclosure(text: string): boolean {
  try {
    return carriesOlderKey((JSON.parse(text) as { data?: unknown }).data)
  } catch {
    return false
  }
}

export const Route = createFileRoute('/api/v1/graphql')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const target = getGraphqlProxyTarget(request.url)
        if (!target) {
          return transportErrorResponse(
            503,
            'PROXY_MISCONFIGURED',
            'GraphQL proxy has no upstream target distinct from its own origin.',
          )
        }

        const body = await request.text()

        let response: Response
        try {
          response = await fetch(`${target}${API_PATH}`, {
            method: 'POST',
            headers: {
              Accept: request.headers.get('accept') ?? 'application/json',
              'Content-Type':
                request.headers.get('content-type') ?? 'application/json',
              ...(request.headers.has('authorization')
                ? { Authorization: request.headers.get('authorization')! }
                : {}),
            },
            body,
          })
        } catch (cause) {
          // The upstream was never reached. Reported as a transport failure —
          // 502, GraphQL-shaped — so the client can say "we could not contact
          // the server" instead of inventing a data answer.
          return transportErrorResponse(
            502,
            'UPSTREAM_UNAVAILABLE',
            `GraphQL upstream unreachable: ${
              cause instanceof Error ? cause.message : String(cause)
            }`,
          )
        }

        // Pass the upstream answer through UNCHANGED — status and body both.
        // A GraphQL error carries a 200 with `errors[]`, and an auth failure
        // carries its own status; rewriting either would erase the distinction
        // the client branches on.
        const text = await response.text()
        // D6 (API doc 10): never pass on an answer under an older supplier-privacy publication than this process has seen —
        // the same check the transport makes (`@/lib/disclosure-key`). Used only by `vite dev` (`env.ts`: a production build
        // calls the API directly), but served by every build.
        if (isStaleDisclosure(text)) {
          return transportErrorResponse(409, 'STALE_DISCLOSURE', 'GraphQL answer under an older supplier-privacy publication than one already seen.')
        }
        // The API's own caching word travels with its answer: it marks one that names a DA supplier `no-store`
        // (PROC-VDWQ), which no cache may then keep.
        const cacheControl = response.headers.get('cache-control')
        return new Response(text, {
          status: response.status,
          statusText: response.statusText,
          headers: {
            'Content-Type':
              response.headers.get('content-type') ?? 'application/json',
            ...(cacheControl ? { 'Cache-Control': cacheControl } : {}),
          },
        })
      },
    },
  },
})
