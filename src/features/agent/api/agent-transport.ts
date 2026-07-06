import { DefaultChatTransport } from 'ai'

import { getAuthToken } from '@/lib/auth'
import { getApiBaseUrl } from '@/config/env'
import { API_FETCH_REFERRER_POLICY } from '@/lib/api/fetch-options'

/**
 * Chat transport for the agent surface (server: /api/v1/agent/chat).
 * Injects a fresh Clerk Bearer token per request — same auth pattern as
 * `graphql-client.ts`. The endpoint streams AI SDK UIMessage chunks (SSE).
 */
export function createAgentTransport() {
  const authFetch: typeof fetch = async (input, init) => {
    const token = await getAuthToken()
    if (!token) throw new Error('Not authenticated')
    const headers = new Headers(init?.headers)
    headers.set('Authorization', `Bearer ${token}`)
    return fetch(input, {
      ...init,
      headers,
      referrerPolicy: API_FETCH_REFERRER_POLICY,
    })
  }

  return new DefaultChatTransport({
    api: `${getApiBaseUrl()}/api/v1/agent/chat`,
    fetch: authFetch,
  })
}
