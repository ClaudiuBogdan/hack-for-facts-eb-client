import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: Record<string, unknown>) => options,
}))

import { getGraphqlProxyTarget, Route } from './graphql'

/**
 * Every resolver case passes its sources explicitly — the server's runtime
 * env and the build-time `import.meta.env` — so nothing ambient (a checkout's
 * env files, the shell) decides the answer.
 */
const NONE = {}

describe('GraphQL server proxy target — build-time values (local development)', () => {
  it('uses the local API port when no target is configured', () => {
    expect(getGraphqlProxyTarget('http://127.0.0.1:3000/api/v1/graphql', NONE, { VITE_API_PROXY_TARGET: '', VITE_API_URL: '' })).toBe(
      'http://127.0.0.1:3001',
    )
  })

  it('prevents a same-origin proxy loop', () => {
    expect(getGraphqlProxyTarget('http://127.0.0.1:3000/api/v1/graphql', NONE, { VITE_API_PROXY_TARGET: 'http://127.0.0.1:3000' })).toBe(
      'http://127.0.0.1:3001',
    )
  })

  it('uses an explicitly configured API origin', () => {
    expect(getGraphqlProxyTarget('https://client.example.com/api/v1/graphql', NONE, { VITE_API_PROXY_TARGET: 'https://api.example.com/base' })).toBe(
      'https://api.example.com',
    )
  })

  it('treats a whitespace-only value as unset instead of throwing', () => {
    // `??` accepts "   " as configured, and `new URL("   ")` then throws —
    // which surfaced to the client as an unexplained failure with no errors[].
    expect(getGraphqlProxyTarget('http://127.0.0.1:3000/api/v1/graphql', NONE, { VITE_API_PROXY_TARGET: '   ', VITE_API_URL: '' })).toBe(
      'http://127.0.0.1:3001',
    )
  })

  it('falls back rather than crashing on a value that is not a URL', () => {
    expect(getGraphqlProxyTarget('http://127.0.0.1:3000/api/v1/graphql', NONE, { VITE_API_PROXY_TARGET: 'not a url', VITE_API_URL: '' })).toBe(
      'http://127.0.0.1:3001',
    )
  })

  it('falls through to VITE_API_URL when the proxy target is blank', () => {
    expect(
      getGraphqlProxyTarget('https://client.example.com/api/v1/graphql', NONE, { VITE_API_PROXY_TARGET: '  ', VITE_API_URL: 'https://api.example.com' }),
    ).toBe('https://api.example.com')
  })

  it('refuses a same-origin target even on a deployed host', () => {
    // Not the deployed origin, and not a loop: the local API port.
    expect(getGraphqlProxyTarget('https://app.example.com/api/v1/graphql', NONE, { VITE_API_PROXY_TARGET: 'https://app.example.com' })).toBe(
      'http://127.0.0.1:3001',
    )
  })

  it('returns null when even the fallback would be a self-loop', () => {
    // The app itself is served on the local API port — there is no upstream
    // distinct from this route, so the handler must refuse rather than recurse.
    expect(getGraphqlProxyTarget('http://127.0.0.1:3001/api/v1/graphql', NONE, { VITE_API_PROXY_TARGET: '', VITE_API_URL: '' })).toBeNull()
  })

  it('ignores the path of a configured target and keeps only the origin', () => {
    expect(
      getGraphqlProxyTarget('https://client.example.com/api/v1/graphql', NONE, { VITE_API_PROXY_TARGET: 'https://api.example.com/some/deep/path' }),
    ).toBe('https://api.example.com')
  })

  it('treats a different PORT on the same host as a distinct origin', () => {
    expect(getGraphqlProxyTarget('http://127.0.0.1:3000/api/v1/graphql', NONE, { VITE_API_PROXY_TARGET: 'http://127.0.0.1:4000' })).toBe(
      'http://127.0.0.1:4000',
    )
  })
})

describe('GraphQL server proxy target — the deployment’s runtime configuration', () => {
  const POD = 'https://dev-client.example.com/api/v1/graphql'
  const INTERNAL = 'http://api.internal.svc.cluster.local'
  const PUBLIC = 'https://public-api.example.com'

  it('uses the runtime public API origin when the image baked none (the deployed failure)', () => {
    expect(getGraphqlProxyTarget(POD, { VITE_API_URL: PUBLIC }, NONE)).toBe(PUBLIC)
  })

  it('prefers the private INTERNAL_API_URL server rendering uses, as the pod configures both', () => {
    expect(getGraphqlProxyTarget(POD, { INTERNAL_API_URL: INTERNAL, VITE_API_URL: PUBLIC }, NONE)).toBe(INTERNAL)
  })

  it('takes the runtime value over a different baked one, every baked key included', () => {
    const baked = { VITE_API_PROXY_TARGET: 'https://baked-proxy.example.com', VITE_API_URL: 'https://baked-api.example.com' }
    expect(getGraphqlProxyTarget(POD, { VITE_API_URL: PUBLIC }, baked)).toBe(PUBLIC)
    expect(getGraphqlProxyTarget(POD, { INTERNAL_API_URL: INTERNAL }, baked)).toBe(INTERNAL)
    // Without runtime configuration the build-time values still apply, as before.
    expect(getGraphqlProxyTarget(POD, NONE, baked)).toBe('https://baked-proxy.example.com')
  })

  it('keeps an explicit runtime proxy target first (local development loads its env files into the server process)', () => {
    expect(getGraphqlProxyTarget('http://127.0.0.1:3000/api/v1/graphql', { VITE_API_PROXY_TARGET: 'http://127.0.0.1:4000', INTERNAL_API_URL: INTERNAL, VITE_API_URL: PUBLIC }, NONE)).toBe(
      'http://127.0.0.1:4000',
    )
  })

  it('never reads INTERNAL_API_URL from the build', () => {
    expect(getGraphqlProxyTarget(POD, NONE, { INTERNAL_API_URL: INTERNAL })).toBe('http://127.0.0.1:3001')
  })

  it('keeps the guards for runtime values: blank skipped, invalid and same-origin fall back, a self-loop refused', () => {
    expect(getGraphqlProxyTarget(POD, { INTERNAL_API_URL: '  ', VITE_API_URL: PUBLIC }, NONE)).toBe(PUBLIC)
    expect(getGraphqlProxyTarget(POD, { INTERNAL_API_URL: 'not a url', VITE_API_URL: PUBLIC }, NONE)).toBe('http://127.0.0.1:3001')
    expect(getGraphqlProxyTarget(POD, { VITE_API_URL: 'https://dev-client.example.com' }, NONE)).toBe('http://127.0.0.1:3001')
    expect(getGraphqlProxyTarget('http://127.0.0.1:3001/api/v1/graphql', { VITE_API_URL: 'http://127.0.0.1:3001' }, NONE)).toBeNull()
  })
})

describe('GraphQL server proxy — the route handler with runtime-only configuration', () => {
  const INTERNAL = 'http://api.internal.svc.cluster.local'
  const handler = (Route as unknown as { server: { handlers: { POST: (input: { request: Request }) => Promise<Response> } } }).server.handlers.POST
  const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>()

  /** Exactly the configuration the pod has at runtime: the API origins are set, nothing else is ambient. */
  function runtimeOnly(values: { INTERNAL_API_URL?: string; VITE_API_URL?: string }) {
    vi.stubEnv('VITE_API_PROXY_TARGET', '')
    vi.stubEnv('INTERNAL_API_URL', values.INTERNAL_API_URL ?? '')
    vi.stubEnv('VITE_API_URL', values.VITE_API_URL ?? '')
    vi.stubGlobal('fetch', fetchMock)
  }

  const request = (origin: string) =>
    new Request(`${origin}/api/v1/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/graphql-response+json', Authorization: 'Bearer reader-token' },
      body: '{"query":"query Q { ping }"}',
    })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  it('forwards to the runtime INTERNAL_API_URL with body and auth, and passes the answer through unchanged', async () => {
    runtimeOnly({ INTERNAL_API_URL: INTERNAL, VITE_API_URL: 'https://public-api.example.com' })
    fetchMock.mockResolvedValue(new Response('{"errors":[{"message":"no"}]}', { status: 401, statusText: 'Unauthorized', headers: { 'content-type': 'application/json' } }))

    const response = await handler({ request: request('https://dev-client.example.com') })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe(`${INTERNAL}/api/v1/graphql`)
    expect(init).toMatchObject({
      method: 'POST',
      body: '{"query":"query Q { ping }"}',
      headers: { Accept: 'application/graphql-response+json', 'Content-Type': 'application/json', Authorization: 'Bearer reader-token' },
    })
    expect(response.status).toBe(401)
    expect(await response.text()).toBe('{"errors":[{"message":"no"}]}')
  })

  it('reports an unreachable upstream as the GraphQL-shaped 502', async () => {
    runtimeOnly({ VITE_API_URL: 'https://public-api.example.com' })
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))

    const response = await handler({ request: request('https://dev-client.example.com') })

    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://public-api.example.com/api/v1/graphql')
    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({
      data: null,
      errors: [{ message: 'GraphQL upstream unreachable: fetch failed', extensions: { code: 'UPSTREAM_UNAVAILABLE' } }],
    })
  })

  it('refuses with the GraphQL-shaped 503 when no upstream is distinct from itself', async () => {
    runtimeOnly({})

    const response = await handler({ request: request('http://127.0.0.1:3001') })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ errors: [{ extensions: { code: 'PROXY_MISCONFIGURED' } }] })
  })
})
