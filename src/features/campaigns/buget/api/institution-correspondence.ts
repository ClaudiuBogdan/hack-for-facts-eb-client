import { getApiBaseUrl } from '@/config/env'
import { getAuthToken } from '@/lib/auth'

type ApiResponse<T> = {
  readonly ok: boolean
  readonly data?: T
  readonly error?: string
  readonly message?: string
}

export type PreparePublicDebateSelfSendResponse = {
  readonly created: boolean
  readonly existingThread: unknown
  readonly threadKey: string
  readonly captureAddress: string | null
  readonly subject: string | null
  readonly body: string | null
  readonly cc: readonly string[]
}

const PREPARE_TIMEOUT_MS = 30_000

export async function preparePublicDebateSelfSend(params: {
  readonly entityCui: string
  readonly institutionEmail: string
  readonly requesterOrganizationName: string | null
  readonly consentCapturedAt: string | null
}): Promise<PreparePublicDebateSelfSendResponse> {
  const endpoint = `${getApiBaseUrl()}/api/v1/institution-correspondence/public-debate/self-send/prepare`
  const token = await getAuthToken()

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), PREPARE_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        entityCui: params.entityCui,
        institutionEmail: params.institutionEmail,
        requesterOrganizationName: params.requesterOrganizationName,
        consentCapturedAt: params.consentCapturedAt,
      }),
      signal: controller.signal,
    })
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('The request timed out. Please try again.')
    }
    throw error
  }

  clearTimeout(timeoutId)

  if (!response.ok) {
    const errorPayload: ApiResponse<never> = await response
      .json()
      .catch(() => ({ ok: false, error: response.statusText, message: response.statusText }))
    throw new Error(
      errorPayload.error
      || errorPayload.message
      || `Failed to prepare self-send email: ${response.statusText}`,
    )
  }

  const payload: ApiResponse<PreparePublicDebateSelfSendResponse> = await response.json()
  if (!payload.data) {
    throw new Error('Self-send prepare response did not include data.')
  }

  return payload.data
}
