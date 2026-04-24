import { getAuthToken } from '@/lib/auth'
import { getApiBaseUrl } from '@/config/env'
import { LearningProgressRemoteSnapshotSchema } from '../schemas/progress'
import { parseLearningProgressEvents } from '../schemas/progress-events'
import type { InteractiveAuditEvent, LearningProgressEvent, LearningProgressRemoteSnapshot } from '../types'

const getApiUrl = () => getApiBaseUrl()

type ApiResponse<T> = {
  ok: boolean
  data?: T
  error?: string
  message?: string
  retryable?: boolean
  details?: unknown
}

type LearningProgressResponse = {
  snapshot: LearningProgressRemoteSnapshot
  events: LearningProgressEvent[]
  cursor: string
}

export type LearningProgressSyncFailedEvent = {
  readonly eventId: string
  readonly errorType: 'InvalidEventError'
  readonly message: string
}

export type LearningProgressSyncSuccess = {
  readonly ok: true
  readonly data: {
    readonly newEventsCount: number
    readonly failedEvents: readonly LearningProgressSyncFailedEvent[]
  }
}

export type LearningProgressSyncFailure = {
  readonly ok: false
  readonly error: {
    readonly status: number
    readonly errorType: string
    readonly message: string
    readonly retryable: boolean
    readonly details?: unknown
  }
}

export type LearningProgressSyncResult =
  | LearningProgressSyncSuccess
  | LearningProgressSyncFailure

export class UnsupportedLearningProgressSnapshotVersionError extends Error {
  constructor() {
    super('Unsupported learning progress snapshot version returned by the server.')
    this.name = 'UnsupportedLearningProgressSnapshotVersionError'
  }
}

function isRetryableSyncError(params: { readonly status: number; readonly errorType: string }): boolean {
  return (
    params.errorType === 'DatabaseError'
    || params.status === 429
    || params.status === 502
    || params.status === 503
    || params.status === 504
  )
}

function parseApiErrorResponse(
  response: Response,
  payload: ApiResponse<never>,
): LearningProgressSyncFailure['error'] {
  const errorType = payload.error || 'UnknownError'
  return {
    status: response.status,
    errorType,
    message: payload.message || payload.error || response.statusText || 'Request failed',
    retryable: typeof payload.retryable === 'boolean'
      ? payload.retryable
      : isRetryableSyncError({ status: response.status, errorType }),
    details: payload.details,
  }
}

function isPublicUserAuditEvent(auditEvent: InteractiveAuditEvent): auditEvent is Extract<
  InteractiveAuditEvent,
  { readonly type: 'submitted' }
> {
  return auditEvent.type === 'submitted' && auditEvent.actor === 'user'
}

function sanitizeEventForPublicSync(event: LearningProgressEvent): LearningProgressEvent {
  if (event.type !== 'interactive.updated') {
    return event
  }

  const publicAuditEvents = event.payload.auditEvents?.filter(isPublicUserAuditEvent)
  if (publicAuditEvents?.length === event.payload.auditEvents?.length) {
    return event
  }

  const { auditEvents: _auditEvents, ...payloadWithoutAuditEvents } = event.payload
  void _auditEvents

  return {
    ...event,
    payload: publicAuditEvents && publicAuditEvents.length > 0
      ? {
          ...payloadWithoutAuditEvents,
          auditEvents: publicAuditEvents,
        }
      : payloadWithoutAuditEvents,
  }
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
    throw new Error(error.message || error.error || `Failed to fetch learning progress: ${response.statusText}`)
  }

  const result: ApiResponse<LearningProgressResponse> = await response.json()
  if (!result.data) {
    throw new Error('No data returned from progress fetch')
  }

  const snapshot = LearningProgressRemoteSnapshotSchema.safeParse(result.data.snapshot)
  if (!snapshot.success) {
    throw new UnsupportedLearningProgressSnapshotVersionError()
  }

  return {
    snapshot: snapshot.data,
    events: parseLearningProgressEvents(result.data.events),
    cursor: result.data.cursor,
  }
}

export async function syncLearningProgressEvents(params: {
  events: LearningProgressEvent[]
  clientUpdatedAt: string
}): Promise<LearningProgressSyncResult> {
  const endpoint = `${getApiUrl()}/api/v1/learning/progress`
  const token = await getAuthToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  try {
    const response = await fetch(endpoint, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        clientUpdatedAt: params.clientUpdatedAt,
        events: params.events.map(sanitizeEventForPublicSync),
      }),
    })

    if (!response.ok) {
      const error: ApiResponse<never> = await response.json().catch(() => ({ ok: false, error: response.statusText }))
      return {
        ok: false,
        error: parseApiErrorResponse(response, error),
      }
    }

    const result: ApiResponse<{
      newEventsCount: number
      failedEvents: LearningProgressSyncFailedEvent[]
    }> = await response.json()

    if (
      !result.data
      || typeof result.data.newEventsCount !== 'number'
      || !Array.isArray(result.data.failedEvents)
    ) {
      return {
        ok: false,
        error: {
          status: response.status,
          errorType: 'InvalidResponseError',
          message: 'Learning progress sync returned an invalid response payload.',
          retryable: false,
        },
      }
    }

    return {
      ok: true,
      data: {
        newEventsCount: result.data.newEventsCount,
        failedEvents: result.data.failedEvents,
      },
    }
  } catch (error) {
    return {
      ok: false,
      error: {
        status: 0,
        errorType: 'NetworkError',
        message: error instanceof Error ? error.message : 'Learning progress sync failed',
        retryable: true,
      },
    }
  }
}
