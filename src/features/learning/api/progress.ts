import { getAuthToken } from '@/lib/auth'
import { getApiBaseUrl } from '@/config/env'
import { parseLearningProgressRemoteSnapshot } from '../schemas/progress'
import { parseLearningProgressEvents } from '../schemas/progress-events'
import type { LearningProgressEvent, LearningProgressRemoteSnapshot } from '../types'

const getApiUrl = () => getApiBaseUrl()

type ApiResponse<T> = {
  ok: boolean
  data?: T
  error?: string
}

type LearningProgressResponse = {
  snapshot: LearningProgressRemoteSnapshot
  events: LearningProgressEvent[]
  cursor: string
}

export async function fetchLearningProgress(params: { since?: string | null } = {}): Promise<LearningProgressResponse> {
  const query = params.since ? `?since=${encodeURIComponent(params.since)}` : ''
  const endpoint = `${getApiUrl()}/api/v1/learning/progress${query}`
  const token = await getAuthToken()

  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  const response = await fetch(endpoint, {
    headers,
  })

  if (!response.ok) {
    const error: ApiResponse<never> = await response.json().catch(() => ({ ok: false, error: response.statusText }))
    throw new Error(error.error || `Failed to fetch learning progress: ${response.statusText}`)
  }

  const result: ApiResponse<LearningProgressResponse> = await response.json()
  if (!result.data) {
    throw new Error('No data returned from progress fetch')
  }

  return {
    snapshot: parseLearningProgressRemoteSnapshot(result.data.snapshot),
    events: parseLearningProgressEvents(result.data.events),
    cursor: result.data.cursor,
  }
}

export async function syncLearningProgressEvents(params: {
  events: LearningProgressEvent[]
  clientUpdatedAt: string
}): Promise<void> {
  const endpoint = `${getApiUrl()}/api/v1/learning/progress`
  const token = await getAuthToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  const response = await fetch(endpoint, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      clientUpdatedAt: params.clientUpdatedAt,
      events: params.events,
    }),
  })

  if (!response.ok) {
    const error: ApiResponse<never> = await response.json().catch(() => ({ ok: false, error: response.statusText }))
    throw new Error(error.error || `Failed to sync learning progress: ${response.statusText}`)
  }
}
