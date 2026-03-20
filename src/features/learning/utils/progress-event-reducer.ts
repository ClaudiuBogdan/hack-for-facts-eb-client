import { getEmptyLearningGuestProgress } from '../schemas/progress'
import {
  withInteractiveAuditEvents,
  withInteractiveRecord,
} from './interactive-state'
import { projectLearningGuestProgress } from './progress-projection'
import { isoToTime, maxIsoRequired } from './date-utils'
import type {
  LearningGuestProgress,
  LearningProgressEvent,
} from '../types'

function applyInteractiveUpdatedEvent(
  progress: LearningGuestProgress,
  event: Extract<LearningProgressEvent, { readonly type: 'interactive.updated' }>,
): LearningGuestProgress {
  let interactiveState = withInteractiveRecord(
    progress.interactiveState,
    event.payload.record,
  )

  interactiveState = withInteractiveAuditEvents(
    interactiveState,
    event.payload.auditEvents,
  )

  return projectLearningGuestProgress({
    interactiveState,
    lastUpdated: maxIsoRequired(progress.lastUpdated, event.occurredAt),
  })
}

function applyProgressResetEvent(
  _progress: LearningGuestProgress,
  event: Extract<LearningProgressEvent, { readonly type: 'progress.reset' }>,
): LearningGuestProgress {
  return {
    ...getEmptyLearningGuestProgress(),
    lastUpdated: event.occurredAt,
  }
}

export function applyLearningProgressEvent(
  progress: LearningGuestProgress,
  event: LearningProgressEvent,
): LearningGuestProgress {
  switch (event.type) {
    case 'interactive.updated':
      return applyInteractiveUpdatedEvent(progress, event)
    case 'progress.reset':
      return applyProgressResetEvent(progress, event)
  }
}

export function sortLearningProgressEvents(
  events: LearningProgressEvent[],
): LearningProgressEvent[] {
  return [...events].sort((a, b) => {
    const timeDiff = isoToTime(a.occurredAt) - isoToTime(b.occurredAt)
    if (timeDiff !== 0) return timeDiff
    return a.eventId.localeCompare(b.eventId)
  })
}

export function reduceLearningProgressEvents(
  events: LearningProgressEvent[],
): LearningGuestProgress {
  const sorted = sortLearningProgressEvents(events)
  let progress = getEmptyLearningGuestProgress()

  for (const event of sorted) {
    progress = applyLearningProgressEvent(progress, event)
  }

  if (sorted.length > 0) {
    progress = {
      ...progress,
      lastUpdated: sorted.reduce(
        (latest, event) => maxIsoRequired(latest, event.occurredAt),
        progress.lastUpdated,
      ),
    }
  }

  return progress
}
