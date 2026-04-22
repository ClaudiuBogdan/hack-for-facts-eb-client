import { getApiBaseUrl } from '@/config/env'
import { API_FETCH_REFERRER_POLICY } from '@/lib/api/fetch-options'
import { getAuthToken } from '@/lib/auth'
import {
  parseCampaignEntityPublicConfigResponse,
  type CampaignEntityPublicConfig,
} from '../schemas/campaign-entity-public-config'

type ApiErrorEnvelope = {
  readonly code?: string
  readonly error?: string
  readonly message?: string
  readonly details?: unknown
}

export class CampaignEntityPublicConfigApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly details?: unknown

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: unknown,
  ) {
    super(message)
    this.name = 'CampaignEntityPublicConfigApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

function getCampaignEntityPublicConfigEndpoint(params: {
  readonly campaignKey: string
  readonly entityCui: string
}): string {
  return `${getApiBaseUrl()}/api/v1/campaigns/${encodeURIComponent(params.campaignKey)}/entities/${encodeURIComponent(params.entityCui)}/config`
}

function parseJsonSafely(rawText: string): unknown {
  if (rawText.trim().length === 0) {
    return null
  }

  try {
    return JSON.parse(rawText) as unknown
  } catch {
    return null
  }
}

function getFallbackErrorMessage(status: number): string {
  if (status === 401) {
    return 'Sign in required for city hall campaign details.'
  }

  if (status === 403) {
    return 'You do not have access to these city hall campaign details.'
  }

  if (status === 404) {
    return 'Requested city hall campaign details were not found.'
  }

  return 'Failed to load city hall campaign details.'
}

function buildApiError(
  status: number,
  payload: unknown,
  rawText: string,
): CampaignEntityPublicConfigApiError {
  const fallbackMessage = getFallbackErrorMessage(status)

  if (typeof payload !== 'object' || payload === null) {
    return new CampaignEntityPublicConfigApiError(
      rawText.trim().length > 0 ? rawText.trim() : fallbackMessage,
      status,
    )
  }

  const errorPayload = payload as ApiErrorEnvelope
  return new CampaignEntityPublicConfigApiError(
    errorPayload.message?.trim()
      || errorPayload.error?.trim()
      || fallbackMessage,
    status,
    errorPayload.code,
    errorPayload.details,
  )
}

export async function getCampaignEntityPublicConfig(params: {
  readonly campaignKey: string
  readonly entityCui: string
}): Promise<CampaignEntityPublicConfig> {
  const token = await getAuthToken()

  if (token === null || token.trim().length === 0) {
    throw new CampaignEntityPublicConfigApiError(
      'Sign in required for city hall campaign details.',
      401,
    )
  }

  const response = await fetch(getCampaignEntityPublicConfigEndpoint(params), {
    method: 'GET',
    referrerPolicy: API_FETCH_REFERRER_POLICY,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  const rawText = await response.text()
  const payload = parseJsonSafely(rawText)

  if (!response.ok) {
    throw buildApiError(response.status, payload, rawText)
  }

  try {
    return parseCampaignEntityPublicConfigResponse(payload)
  } catch (error) {
    throw new CampaignEntityPublicConfigApiError(
      error instanceof Error
        ? error.message
        : 'Campaign entity public config response was invalid.',
      502,
      'invalid_response',
      payload,
    )
  }
}
