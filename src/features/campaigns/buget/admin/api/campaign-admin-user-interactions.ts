import { getApiBaseUrl } from '@/config/env'
import { t } from '@lingui/core/macro'
import { API_FETCH_REFERRER_POLICY } from '@/lib/api/fetch-options'
import { getAuthToken } from '@/lib/auth'
import { createLogger } from '@/lib/logger'
import {
  parseCampaignAdminErrorEnvelope,
  parseCampaignAdminListResponse,
  parseCampaignAdminMetaResponse,
  parseCampaignAdminSubmitReviewsBody,
  parseCampaignAdminSubmitReviewsResponse,
} from '@/features/campaigns/buget/admin/schemas/api-schemas'
import type {
  CampaignAdminCampaignKey,
  CampaignAdminListResponse,
  CampaignAdminMetaResponse,
  CampaignAdminQueueFilters,
  CampaignAdminSubmitReviewsBody,
  CampaignAdminUserInteractionListItem,
} from '@/features/campaigns/buget/admin/types'

const logger = createLogger('campaign-admin-user-interactions-api')

export class CampaignAdminApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly retryable: boolean
  readonly details?: unknown

  constructor(
    message: string,
    status: number,
    options?: {
      code?: string
      retryable?: boolean
      details?: unknown
    }
  ) {
    super(message)
    this.name = 'CampaignAdminApiError'
    this.status = status
    this.code = options?.code
    this.retryable = options?.retryable ?? false
    this.details = options?.details
  }
}

function getCampaignAdminEndpoint(
  campaignKey: CampaignAdminCampaignKey,
  pathname = ''
): string {
  return `${getApiBaseUrl()}/api/v1/admin/campaigns/${encodeURIComponent(campaignKey)}${pathname}`
}

function parseJsonSafely(rawText: string): {
  readonly payload: unknown
  readonly invalidJson: boolean
} {
  if (rawText.trim().length === 0) {
    return {
      payload: null,
      invalidJson: false,
    }
  }

  try {
    return {
      payload: JSON.parse(rawText) as unknown,
      invalidJson: false,
    }
  } catch (error) {
    logger.error('Failed to parse campaign admin API response JSON', {
      error: error instanceof Error ? error.message : String(error),
      responseLength: rawText.length,
    })

    return {
      payload: null,
      invalidJson: true,
    }
  }
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504
}

function getFallbackErrorMessage(status: number): string {
  if (status === 400) {
    return t`Campaign admin request was invalid.`
  }

  if (status === 401) {
    return t`Sign in required for this campaign admin queue.`
  }

  if (status === 403) {
    return t`You do not have access to this campaign admin queue.`
  }

  if (status === 404) {
    return t`The campaign admin queue is unavailable on this server or the campaign key is not supported.`
  }

  if (status === 409) {
    return t`This interaction changed before your review was saved.`
  }

  if (status === 502) {
    return t`Campaign admin review could not be completed right now.`
  }

  return t`Campaign admin request failed.`
}

function buildCampaignAdminApiError(
  status: number,
  payload: unknown
): CampaignAdminApiError {
  const fallbackMessage = getFallbackErrorMessage(status)
  const envelope = parseCampaignAdminErrorEnvelope(payload)

  if (envelope !== null) {
    return new CampaignAdminApiError(
      envelope.message ?? envelope.error ?? fallbackMessage,
      status,
      {
        code: envelope.code,
        retryable:
          typeof envelope.retryable === 'boolean'
            ? envelope.retryable
            : isRetryableStatus(status),
        details: envelope.details,
      }
    )
  }

  return new CampaignAdminApiError(
    fallbackMessage,
    status,
    { retryable: isRetryableStatus(status) }
  )
}

function buildInvalidCampaignAdminResponseError(input: {
  readonly message: string
  readonly logMessage: string
  readonly error: unknown
}): CampaignAdminApiError {
  logger.error(input.logMessage, {
    error: input.error instanceof Error ? input.error.message : String(input.error),
  })

  return new CampaignAdminApiError(input.message, 502, {
    code: 'invalid_response',
    retryable: false,
  })
}

function parseCampaignAdminSuccessPayload<T>(input: {
  readonly payload: unknown
  readonly parse: (payload: unknown) => T
  readonly errorMessage: string
  readonly logMessage: string
}): T {
  try {
    return input.parse(input.payload)
  } catch (error) {
    throw buildInvalidCampaignAdminResponseError({
      message: input.errorMessage,
      logMessage: input.logMessage,
      error,
    })
  }
}

function getDownloadFilename(
  contentDisposition: string | null,
  fallbackFilename: string
): string {
  if (contentDisposition === null) {
    return fallbackFilename
  }

  const filenameStarMatch = contentDisposition.match(
    /filename\*\s*=\s*(?:"([^"]+)"|([^;]+))/i
  )
  const encodedFilename = filenameStarMatch?.[1] ?? filenameStarMatch?.[2]
  if (encodedFilename !== undefined) {
    const normalizedFilename = encodedFilename
      .replace(/^UTF-8''/i, '')
      .trim()

    try {
      return decodeURIComponent(normalizedFilename)
    } catch {
      return normalizedFilename
    }
  }

  const filenameMatch = contentDisposition.match(
    /filename\s*=\s*(?:"([^"]+)"|([^;]+))/i
  )
  const filename = filenameMatch?.[1] ?? filenameMatch?.[2]?.trim()

  return filename || fallbackFilename
}

async function authorizedResponse(
  campaignKey: CampaignAdminCampaignKey,
  pathname: string,
  init: RequestInit
): Promise<Response> {
  const token = await getAuthToken()
  if (token === null || token.trim().length === 0) {
    throw new CampaignAdminApiError(
      t`Sign in required for this campaign admin queue.`,
      401
    )
  }

  return fetch(getCampaignAdminEndpoint(campaignKey, pathname), {
    ...init,
    referrerPolicy: API_FETCH_REFERRER_POLICY,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  })
}

async function authorizedRequest(
  campaignKey: CampaignAdminCampaignKey,
  pathname: string,
  init: RequestInit
): Promise<unknown> {
  const response = await authorizedResponse(campaignKey, pathname, init)

  const rawText = await response.text()
  const { payload, invalidJson } = parseJsonSafely(rawText)

  if (!response.ok) {
    throw buildCampaignAdminApiError(response.status, payload)
  }

  if (invalidJson) {
    throw new CampaignAdminApiError(
      t`Campaign admin server returned invalid JSON.`,
      502,
      {
        code: 'invalid_json_response',
        retryable: false,
      }
    )
  }

  return payload
}

function appendOptionalSearchParam(
  searchParams: URLSearchParams,
  key: string,
  value: string | number | boolean | undefined
) {
  if (value === undefined) {
    return
  }

  searchParams.set(key, String(value))
}

function buildCampaignAdminQueueQueryString(
  filters: CampaignAdminQueueFilters,
  cursor: string | null,
  limit: number
): string {
  const searchParams = new URLSearchParams()

  appendOptionalSearchParam(searchParams, 'phase', filters.phase)
  appendOptionalSearchParam(searchParams, 'reviewStatus', filters.reviewStatus)
  appendOptionalSearchParam(searchParams, 'interactionId', filters.interactionId)
  appendOptionalSearchParam(searchParams, 'lessonId', filters.lessonId)
  appendOptionalSearchParam(searchParams, 'entityCui', filters.entityCui)
  appendOptionalSearchParam(searchParams, 'scopeType', filters.scopeType)
  appendOptionalSearchParam(searchParams, 'payloadKind', filters.payloadKind)
  appendOptionalSearchParam(searchParams, 'submissionPath', filters.submissionPath)
  appendOptionalSearchParam(searchParams, 'userId', filters.userId)
  appendOptionalSearchParam(searchParams, 'recordKey', filters.recordKey)
  appendOptionalSearchParam(searchParams, 'recordKeyPrefix', filters.recordKeyPrefix)
  appendOptionalSearchParam(searchParams, 'submittedAtFrom', filters.submittedAtFrom)
  appendOptionalSearchParam(searchParams, 'submittedAtTo', filters.submittedAtTo)
  appendOptionalSearchParam(searchParams, 'updatedAtFrom', filters.updatedAtFrom)
  appendOptionalSearchParam(searchParams, 'updatedAtTo', filters.updatedAtTo)
  appendOptionalSearchParam(
    searchParams,
    'hasInstitutionThread',
    filters.hasInstitutionThread
  )
  appendOptionalSearchParam(searchParams, 'threadPhase', filters.threadPhase)
  appendOptionalSearchParam(searchParams, 'sortBy', filters.sortBy)
  appendOptionalSearchParam(searchParams, 'sortOrder', filters.sortOrder)
  appendOptionalSearchParam(searchParams, 'cursor', cursor ?? undefined)
  appendOptionalSearchParam(searchParams, 'limit', limit)

  const nextSearch = searchParams.toString()
  return nextSearch.length > 0 ? `?${nextSearch}` : ''
}

function buildCampaignAdminExportQueryString(
  filters: CampaignAdminQueueFilters
): string {
  const searchParams = new URLSearchParams()

  appendOptionalSearchParam(searchParams, 'phase', filters.phase)
  appendOptionalSearchParam(searchParams, 'reviewStatus', filters.reviewStatus)
  appendOptionalSearchParam(searchParams, 'interactionId', filters.interactionId)
  appendOptionalSearchParam(searchParams, 'lessonId', filters.lessonId)
  appendOptionalSearchParam(searchParams, 'entityCui', filters.entityCui)
  appendOptionalSearchParam(searchParams, 'scopeType', filters.scopeType)
  appendOptionalSearchParam(searchParams, 'payloadKind', filters.payloadKind)
  appendOptionalSearchParam(searchParams, 'submissionPath', filters.submissionPath)
  appendOptionalSearchParam(searchParams, 'userId', filters.userId)
  appendOptionalSearchParam(searchParams, 'recordKey', filters.recordKey)
  appendOptionalSearchParam(searchParams, 'recordKeyPrefix', filters.recordKeyPrefix)
  appendOptionalSearchParam(searchParams, 'submittedAtFrom', filters.submittedAtFrom)
  appendOptionalSearchParam(searchParams, 'submittedAtTo', filters.submittedAtTo)
  appendOptionalSearchParam(searchParams, 'updatedAtFrom', filters.updatedAtFrom)
  appendOptionalSearchParam(searchParams, 'updatedAtTo', filters.updatedAtTo)
  appendOptionalSearchParam(
    searchParams,
    'hasInstitutionThread',
    filters.hasInstitutionThread
  )
  appendOptionalSearchParam(searchParams, 'threadPhase', filters.threadPhase)
  appendOptionalSearchParam(searchParams, 'sortBy', filters.sortBy)
  appendOptionalSearchParam(searchParams, 'sortOrder', filters.sortOrder)

  const nextSearch = searchParams.toString()
  return nextSearch.length > 0 ? `?${nextSearch}` : ''
}

export async function listCampaignAdminUserInteractions(input: {
  readonly campaignKey: CampaignAdminCampaignKey
  readonly filters: CampaignAdminQueueFilters
  readonly cursor: string | null
  readonly limit: number
}): Promise<CampaignAdminListResponse> {
  const payload = await authorizedRequest(
    input.campaignKey,
    `/user-interactions${buildCampaignAdminQueueQueryString(
      input.filters,
      input.cursor,
      input.limit
    )}`,
    {
      method: 'GET',
    }
  )

  return parseCampaignAdminSuccessPayload({
    payload,
    parse: parseCampaignAdminListResponse,
    errorMessage: t`Campaign admin queue response was invalid.`,
    logMessage: 'Campaign admin queue response did not match the expected schema',
  })
}

export async function listAllCampaignAdminUserInteractions(input: {
  readonly campaignKey: CampaignAdminCampaignKey
  readonly filters: CampaignAdminQueueFilters
  readonly limit?: number
  readonly maxPages?: number
}): Promise<readonly CampaignAdminUserInteractionListItem[]> {
  const limit = input.limit ?? 100
  const maxPages = input.maxPages ?? 1000
  const items: CampaignAdminUserInteractionListItem[] = []
  const seenCursors = new Set<string | null>()
  let cursor: string | null = null

  for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
    if (seenCursors.has(cursor)) {
      logger.warn('Campaign admin all-items query encountered a repeated cursor', {
        campaignKey: input.campaignKey,
        cursor,
        pageIndex,
      })
      break
    }

    seenCursors.add(cursor)

    const response = await listCampaignAdminUserInteractions({
      campaignKey: input.campaignKey,
      filters: input.filters,
      cursor,
      limit,
    })

    items.push(...response.items)

    if (!response.page.hasMore || response.page.nextCursor === null) {
      break
    }

    if (pageIndex === maxPages - 1) {
      logger.error('Campaign admin all-items query exceeded the safe pagination limit', {
        campaignKey: input.campaignKey,
        userId: input.filters.userId ?? null,
        maxPages,
        limit,
      })

      throw new CampaignAdminApiError(
        t`Campaign admin user page exceeded the safe pagination limit.`,
        502,
        {
          code: 'pagination_limit_exceeded',
          retryable: false,
        }
      )
    }

    cursor = response.page.nextCursor
  }

  return items
}

export async function getCampaignAdminUserInteractionsMeta(input: {
  readonly campaignKey: CampaignAdminCampaignKey
}): Promise<CampaignAdminMetaResponse> {
  const payload = await authorizedRequest(
    input.campaignKey,
    '/user-interactions/meta',
    {
      method: 'GET',
    }
  )

  return parseCampaignAdminSuccessPayload({
    payload,
    parse: parseCampaignAdminMetaResponse,
    errorMessage: t`Campaign admin metadata response was invalid.`,
    logMessage: 'Campaign admin metadata response did not match the expected schema',
  })
}

export async function downloadCampaignAdminUserInteractionsCsv(input: {
  readonly campaignKey: CampaignAdminCampaignKey
  readonly filters: CampaignAdminQueueFilters
}): Promise<{ readonly blob: Blob; readonly filename: string }> {
  const response = await authorizedResponse(
    input.campaignKey,
    `/user-interactions/export${buildCampaignAdminExportQueryString(input.filters)}`,
    {
      method: 'GET',
    }
  )

  if (!response.ok) {
    const rawText = await response.text()
    const { payload } = parseJsonSafely(rawText)
    throw buildCampaignAdminApiError(response.status, payload)
  }

  return {
    blob: await response.blob(),
    filename: getDownloadFilename(
      response.headers.get('Content-Disposition'),
      'campaign-admin-user-interactions.csv'
    ),
  }
}

export async function submitCampaignAdminReviews(input: {
  readonly campaignKey: CampaignAdminCampaignKey
  readonly body: CampaignAdminSubmitReviewsBody
}): Promise<readonly CampaignAdminUserInteractionListItem[]> {
  const body = parseCampaignAdminSubmitReviewsBody(input.body)
  const payload = await authorizedRequest(
    input.campaignKey,
    '/user-interactions/reviews',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )

  return parseCampaignAdminSuccessPayload({
    payload,
    parse: parseCampaignAdminSubmitReviewsResponse,
    errorMessage: t`Campaign admin review response was invalid.`,
    logMessage: 'Campaign admin review response did not match the expected schema',
  })
}
