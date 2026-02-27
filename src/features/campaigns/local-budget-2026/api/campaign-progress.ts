import { getApiBaseUrl } from '@/config/env'
import { getAuthToken } from '@/lib/auth'
import { parseCampaignProgressSnapshot } from '../schemas/progress-schema'
import type { CampaignProgressSnapshot } from '../types'

type CampaignProgressResponse = {
  readonly snapshot: CampaignProgressSnapshot
  readonly cursor?: string
}

type ApiResponse<T> = {
  readonly ok: boolean
  readonly data?: T
  readonly error?: string
}

export async function fetchCampaignProgress(params: {
  campaignId: string
  since?: string | null
}): Promise<CampaignProgressResponse> {
  const query = params.since ? `?since=${encodeURIComponent(params.since)}` : ''
  const endpoint = `${getApiBaseUrl()}/api/v1/campaigns/${encodeURIComponent(params.campaignId)}/progress${query}`
  const token = await getAuthToken()

  const response = await fetch(endpoint, {
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
    },
  })

  if (!response.ok) {
    const errorPayload: ApiResponse<never> = await response
      .json()
      .catch(() => ({ ok: false, error: response.statusText }))
    throw new Error(errorPayload.error || `Failed to fetch campaign progress: ${response.statusText}`)
  }

  const payload: ApiResponse<CampaignProgressResponse> = await response.json()
  if (!payload.data) {
    throw new Error('Campaign progress response did not include data.')
  }

  return {
    snapshot: parseCampaignProgressSnapshot(payload.data.snapshot),
    cursor: payload.data.cursor,
  }
}

export async function syncCampaignProgress(params: {
  campaignId: string
  snapshot: CampaignProgressSnapshot
  clientUpdatedAt: string
}): Promise<void> {
  const endpoint = `${getApiBaseUrl()}/api/v1/campaigns/${encodeURIComponent(params.campaignId)}/progress`
  const token = await getAuthToken()

  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
    body: JSON.stringify({
      clientUpdatedAt: params.clientUpdatedAt,
      snapshot: params.snapshot,
    }),
  })

  if (!response.ok) {
    const errorPayload: ApiResponse<never> = await response
      .json()
      .catch(() => ({ ok: false, error: response.statusText }))
    throw new Error(errorPayload.error || `Failed to sync campaign progress: ${response.statusText}`)
  }
}
