import { createFileRoute } from '@tanstack/react-router'

const API_PATH = '/api/v1/graphql'
const LOCAL_API_ORIGIN = 'http://127.0.0.1:3001'

/**
 * Resolve the upstream GraphQL origin.
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
export function getGraphqlProxyTarget(requestUrl: string): string | null {
  const configuredTarget = [
    import.meta.env.VITE_API_PROXY_TARGET,
    import.meta.env.VITE_API_URL,
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
  code: 'UPSTREAM_UNAVAILABLE' | 'PROXY_MISCONFIGURED',
  message: string,
): Response {
  return new Response(
    JSON.stringify({ data: null, errors: [{ message, extensions: { code } }] }),
    { status, headers: { 'Content-Type': 'application/json' } },
  )
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
        return new Response(await response.text(), {
          status: response.status,
          statusText: response.statusText,
          headers: {
            'Content-Type':
              response.headers.get('content-type') ?? 'application/json',
          },
        })
      },
    },
  },
})
