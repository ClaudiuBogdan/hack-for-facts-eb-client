import { getAuthToken } from '@/lib/auth'
import { getApiBaseUrl } from '@/config/env'
import { API_FETCH_REFERRER_POLICY } from '@/lib/api/fetch-options'
import type { UIMessage } from 'ai'

export interface AgentConversationSummary {
  id: string
  title: string | null
  createdAt: string
  updatedAt: string
}

export interface AgentConversationDetail extends AgentConversationSummary {
  messages: UIMessage[]
}

export interface AgentQuota {
  usedTokens: number
  budgetTokens: number
  remainingTokens: number
  unlimited: boolean
}

async function agentFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAuthToken()
  if (!token) throw new Error('Not authenticated')

  const response = await fetch(`${getApiBaseUrl()}/api/v1/agent${path}`, {
    ...init,
    referrerPolicy: API_FETCH_REFERRER_POLICY,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  })
  if (!response.ok) {
    throw new Error(`Agent API ${path} failed: ${response.status}`)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export async function listAgentConversations(): Promise<AgentConversationSummary[]> {
  const result = await agentFetch<{ conversations: AgentConversationSummary[] }>('/conversations')
  return result.conversations
}

export function getAgentConversation(id: string): Promise<AgentConversationDetail> {
  return agentFetch<AgentConversationDetail>(`/conversations/${encodeURIComponent(id)}`)
}

export function deleteAgentConversation(id: string): Promise<void> {
  return agentFetch<void>(`/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function getAgentQuota(): Promise<AgentQuota> {
  return agentFetch<AgentQuota>('/quota')
}
