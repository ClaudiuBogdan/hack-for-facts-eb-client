import { afterEach, describe, expect, it, vi } from 'vitest'

import { getGraphqlProxyTarget } from './graphql'

describe('GraphQL server proxy target', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses the local API port when no target is configured', () => {
    vi.stubEnv('VITE_API_PROXY_TARGET', '')
    vi.stubEnv('VITE_API_URL', '')

    expect(getGraphqlProxyTarget('http://127.0.0.1:3000/api/v1/graphql')).toBe(
      'http://127.0.0.1:3001',
    )
  })

  it('prevents a same-origin proxy loop', () => {
    vi.stubEnv('VITE_API_PROXY_TARGET', 'http://127.0.0.1:3000')

    expect(getGraphqlProxyTarget('http://127.0.0.1:3000/api/v1/graphql')).toBe(
      'http://127.0.0.1:3001',
    )
  })

  it('uses an explicitly configured API origin', () => {
    vi.stubEnv('VITE_API_PROXY_TARGET', 'https://api.example.com/base')

    expect(getGraphqlProxyTarget('https://client.example.com/api/v1/graphql')).toBe(
      'https://api.example.com',
    )
  })

  it('treats a whitespace-only value as unset instead of throwing', () => {
    // `??` accepts "   " as configured, and `new URL("   ")` then throws —
    // which surfaced to the client as an unexplained failure with no errors[].
    vi.stubEnv('VITE_API_PROXY_TARGET', '   ')
    vi.stubEnv('VITE_API_URL', '')

    expect(getGraphqlProxyTarget('http://127.0.0.1:3000/api/v1/graphql')).toBe(
      'http://127.0.0.1:3001',
    )
  })

  it('falls back rather than crashing on a value that is not a URL', () => {
    vi.stubEnv('VITE_API_PROXY_TARGET', 'not a url')
    vi.stubEnv('VITE_API_URL', '')

    expect(getGraphqlProxyTarget('http://127.0.0.1:3000/api/v1/graphql')).toBe(
      'http://127.0.0.1:3001',
    )
  })

  it('falls through to VITE_API_URL when the proxy target is blank', () => {
    vi.stubEnv('VITE_API_PROXY_TARGET', '  ')
    vi.stubEnv('VITE_API_URL', 'https://api.example.com')

    expect(getGraphqlProxyTarget('https://client.example.com/api/v1/graphql')).toBe(
      'https://api.example.com',
    )
  })

  it('refuses a same-origin target even on a deployed host', () => {
    vi.stubEnv('VITE_API_PROXY_TARGET', 'https://app.example.com')

    // Not the deployed origin, and not a loop: the local API port.
    expect(getGraphqlProxyTarget('https://app.example.com/api/v1/graphql')).toBe(
      'http://127.0.0.1:3001',
    )
  })

  it('returns null when even the fallback would be a self-loop', () => {
    // The app itself is served on the local API port — there is no upstream
    // distinct from this route, so the handler must refuse rather than recurse.
    vi.stubEnv('VITE_API_PROXY_TARGET', '')
    vi.stubEnv('VITE_API_URL', '')

    expect(getGraphqlProxyTarget('http://127.0.0.1:3001/api/v1/graphql')).toBeNull()
  })

  it('ignores the path of a configured target and keeps only the origin', () => {
    vi.stubEnv('VITE_API_PROXY_TARGET', 'https://api.example.com/some/deep/path')

    expect(getGraphqlProxyTarget('https://client.example.com/api/v1/graphql')).toBe(
      'https://api.example.com',
    )
  })

  it('treats a different PORT on the same host as a distinct origin', () => {
    vi.stubEnv('VITE_API_PROXY_TARGET', 'http://127.0.0.1:4000')

    expect(getGraphqlProxyTarget('http://127.0.0.1:3000/api/v1/graphql')).toBe(
      'http://127.0.0.1:4000',
    )
  })
})
