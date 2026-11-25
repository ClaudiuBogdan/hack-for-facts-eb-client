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
  /** The argument the server refused (a 400's `field`: „cursor", „from"…), when it names one. */
  readonly field: string | null
  constructor(kind: LegalAnalyticsErrorKind, message: string, status: number | null = null, field: string | null = null) {
    super(message)
    this.name = 'LegalAnalyticsError'
    this.kind = kind
    this.status = status
    this.field = field
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

/** The filter arguments, the ones that change which acts an answer counts. */
const FILTER_KEYS = ['population', 'from', 'to', 'type', 'issuer', 'family', 'felul', 'versions'] as const

/** An argument as the server's canonical form writes it: lists sorted, the default population dropped. */
function canonicalValue(key: string, value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined
  if (key === 'population' && value === 'flow') return undefined
  if (Array.isArray(value)) return value.length ? JSON.stringify([...(value as unknown[])].map(String).sort()) : undefined
  return JSON.stringify(String(value))
}

/**
 * Whether an answer is the answer to the question asked: the server echoes the view and its canonical filter
 * (`meta.view`, `meta.args`). An answer for another view or another filter (a flow answer for a stock question)
 * is refused rather than cached under the question's key.
 */
export function answersQuestion(view: LegalAnalyticsView, args: LegalAnalyticsArgs, meta: { readonly view: string; readonly args: Readonly<Record<string, unknown>> }): boolean {
  if (meta.view !== view) return false
  const asked = args as Readonly<Record<string, unknown>>
  return FILTER_KEYS.every((key) => canonicalValue(key, asked[key]) === canonicalValue(key, meta.args[key]))
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
  const body = parseJsonSafely(await response.text()) as { ok?: unknown; data?: unknown; meta?: unknown; message?: unknown; field?: unknown } | null
  if (!response.ok) {
    const kind: LegalAnalyticsErrorKind =
      response.status === 503 ? 'unavailable' : response.status === 400 ? 'invalid' : 'failed'
    const message = typeof body?.message === 'string' ? body.message : `HTTP ${String(response.status)}`
    logger.warn('Analytics read refused', { view, status: response.status, kind })
    throw new LegalAnalyticsError(kind, message, response.status, typeof body?.field === 'string' ? body.field : null)
  }
  const data = LEGAL_ANALYTICS_DATA_SCHEMAS[view].safeParse(body?.data)
  const meta = legalAnalyticsMetaSchema.safeParse(body?.meta)
  if (body?.ok !== true || !data.success || !meta.success) {
    logger.error('Analytics payload failed validation', {
      view,
      issues: (data.error ?? meta.error)?.issues.slice(0, 3),
    })
    throw new LegalAnalyticsError('failed', 'Analytics response did not match the contract', response.status)
  }
  if (!answersQuestion(view, args, meta.data)) {
    logger.error('Analytics answer is for another question', { view, asked: args, answered: meta.data.args, answeredView: meta.data.view })
    throw new LegalAnalyticsError('failed', 'Analytics response answers another question', response.status)
  }
  return {
    data: data.data as LegalAnalyticsAnswer<V>['data'],
    layer: meta.data.layer,
    args: meta.data.args,
  }
}
