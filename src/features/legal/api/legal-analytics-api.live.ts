/**
 * The legislation analytics transport: `GET /api/v1/legal/analytics/:view`
 * (server `modules/legal/shell/rest/analytics-routes.ts`). REST, not GraphQL,
 * so aggregate answers are cacheable by URL (the server sends a layer-keyed
 * ETag); the views that name acts (`acts`, `links`) come back `no-store`.
 *
 * Every failure leaves as a `LegalAnalyticsError` with a kind the page
 * branches on: `unavailable` (503: no published layer yet, or busy) is a
 * designed state, `invalid` (400) a question the layer cannot answer, and
 * `failed` anything else (network, 5xx, a payload off the contract).
 */

import { getApiBaseUrl } from '@/config/env'
import { API_FETCH_REFERRER_POLICY } from '@/lib/api/fetch-options'
import { createLogger } from '@/lib/logger'
import {
  LEGAL_ANALYTICS_DATA_SCHEMAS,
  legalAnalyticsMetaSchema,
  type LegalAnalyticsAnswer,
  type LegalAnalyticsArgs,
  type LegalAnalyticsView,
} from '@/schemas/legal-analytics'

const logger = createLogger('legal-analytics')

export const LEGAL_ANALYTICS_ENDPOINT = '/api/v1/legal/analytics'

export type LegalAnalyticsErrorKind = 'unavailable' | 'invalid' | 'failed'

export class LegalAnalyticsError extends Error {
  readonly kind: LegalAnalyticsErrorKind
  readonly status: number | null
  constructor(kind: LegalAnalyticsErrorKind, message: string, status: number | null = null) {
    super(message)
    this.name = 'LegalAnalyticsError'
    this.kind = kind
    this.status = status
  }
}

/** The refusal the server render met (503, no layer published yet), standing in until a browser read answers. */
export const LEGAL_ANALYTICS_UNAVAILABLE = new LegalAnalyticsError(
  'unavailable',
  'No legislation analytics layer is published.',
  503,
)

/** The query string of an answer: every given argument once, `type` repeated, in a fixed order. */
export function analyticsSearchParams(args: LegalAnalyticsArgs): URLSearchParams {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(args)) {
    if (value === undefined) continue
    if (Array.isArray(value)) for (const item of value as readonly string[]) params.append(key, item)
    else params.set(key, String(value))
  }
  return params
}

export function analyticsUrl(view: LegalAnalyticsView, args: LegalAnalyticsArgs): string {
  const query = analyticsSearchParams(args).toString()
  return `${getApiBaseUrl()}${LEGAL_ANALYTICS_ENDPOINT}/${view}${query ? `?${query}` : ''}`
}

function parseJsonSafely(text: string): unknown {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/** Read one view; the data is validated against the view's schema. */
export async function fetchLegalAnalyticsLive<V extends LegalAnalyticsView>(
  view: V,
  args: LegalAnalyticsArgs,
  signal?: AbortSignal,
): Promise<LegalAnalyticsAnswer<V>> {
  let response: Response
  try {
    response = await fetch(analyticsUrl(view, args), {
      method: 'GET',
      referrerPolicy: API_FETCH_REFERRER_POLICY,
      headers: { Accept: 'application/json' },
      ...(signal && { signal }),
    })
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
    const message = cause instanceof Error ? cause.message : String(cause)
    logger.error('Analytics transport error', { view, message })
    throw new LegalAnalyticsError('failed', 'Analytics request failed')
  }
  const body = parseJsonSafely(await response.text()) as { data?: unknown; meta?: unknown; message?: unknown } | null
  if (!response.ok) {
    const kind: LegalAnalyticsErrorKind =
      response.status === 503 ? 'unavailable' : response.status === 400 ? 'invalid' : 'failed'
    const message = typeof body?.message === 'string' ? body.message : `HTTP ${String(response.status)}`
    logger.warn('Analytics read refused', { view, status: response.status, kind })
    throw new LegalAnalyticsError(kind, message, response.status)
  }
  const data = LEGAL_ANALYTICS_DATA_SCHEMAS[view].safeParse(body?.data)
  const meta = legalAnalyticsMetaSchema.safeParse(body?.meta)
  if (!data.success || !meta.success) {
    logger.error('Analytics payload failed validation', {
      view,
      issues: (data.error ?? meta.error)?.issues.slice(0, 3),
    })
    throw new LegalAnalyticsError('failed', 'Analytics response did not match the contract', response.status)
  }
  return {
    data: data.data as LegalAnalyticsAnswer<V>['data'],
    layer: meta.data.layer,
    args: meta.data.args,
  }
}
