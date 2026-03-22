import { getApiBaseUrl } from '@/config/env'
import { getAuthToken } from '@/lib/auth'
import { parseLearningProgressEvents } from '@/features/learning/schemas/progress-events'
import { parseLearningProgressRemoteSnapshot } from '@/features/learning/schemas/progress'
import type { InteractiveStateRecord, LearningProgressEvent } from '@/features/learning/types'
import {
  filterCampaignProgressEvents,
  filterCampaignProgressRecords,
  projectCampaignProgressFromRemoteSnapshot,
} from '../utils/progress-records'
import type { CampaignProgressSnapshot } from '../types'

type CampaignProgressResponse = {
  readonly snapshot: CampaignProgressSnapshot
  readonly recordsByKey: Readonly<Record<string, InteractiveStateRecord>>
  readonly events: readonly Extract<LearningProgressEvent, { readonly type: 'interactive.updated' }>[]
  readonly cursor: string
}

type ApiResponse<T> = {
  readonly ok: boolean
  readonly data?: T
  readonly error?: string
  readonly message?: string
}

export async function fetchCampaignProgress(params: {
  since?: string | null
}): Promise<CampaignProgressResponse> {
  const query = params.since ? `?since=${encodeURIComponent(params.since)}` : ''
  const endpoint = `${getApiBaseUrl()}/api/v1/learning/progress${query}`
  const token = await getAuthToken()

  const response = await fetch(endpoint, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!response.ok) {
    const errorPayload: ApiResponse<never> = await response
      .json()
      .catch(() => ({ ok: false, error: response.statusText, message: response.statusText }))
    throw new Error(
      errorPayload.error
      || errorPayload.message
      || `Failed to fetch campaign progress: ${response.statusText}`,
    )
  }

  const payload: ApiResponse<{
    snapshot: unknown
    events: unknown
    cursor: string
  }> = await response.json()
  if (!payload.data) {
    throw new Error('Campaign progress response did not include data.')
  }

  const remoteSnapshot = parseLearningProgressRemoteSnapshot(payload.data.snapshot)
  const recordsByKey = filterCampaignProgressRecords(remoteSnapshot.recordsByKey)
  const events = filterCampaignProgressEvents(parseLearningProgressEvents(payload.data.events))

  return {
    snapshot: projectCampaignProgressFromRemoteSnapshot(remoteSnapshot),
    recordsByKey,
    events,
    cursor: payload.data.cursor,
  }
}

export async function syncCampaignProgress(params: {
  events: readonly LearningProgressEvent[]
  clientUpdatedAt: string
}): Promise<void> {
  const endpoint = `${getApiBaseUrl()}/api/v1/learning/progress`
  const token = await getAuthToken()

  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      clientUpdatedAt: params.clientUpdatedAt,
      events: params.events,
    }),
  })

  if (!response.ok) {
    const errorPayload: ApiResponse<never> = await response
      .json()
      .catch(() => ({ ok: false, error: response.statusText, message: response.statusText }))
    throw new Error(
      errorPayload.error
      || errorPayload.message
      || `Failed to sync campaign progress: ${response.statusText}`,
    )
  }
}
