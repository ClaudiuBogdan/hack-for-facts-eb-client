import type {
  InteractiveAuditEvent,
  InteractiveStateRecord,
  LearningGuestProgress,
  UnifiedInteractiveState,
} from '../types'
import { projectLearningGuestProgress } from './progress-projection'
import { isoToTime, maxIsoRequired } from './date-utils'

function mergeInteractiveRecords(
  localRecords: UnifiedInteractiveState['recordsByKey'],
  remoteRecords: UnifiedInteractiveState['recordsByKey'],
): UnifiedInteractiveState['recordsByKey'] {
  const mergedKeys = new Set([
    ...Object.keys(localRecords),
    ...Object.keys(remoteRecords),
  ])
  const mergedRecords: Record<string, InteractiveStateRecord> = {}

  for (const key of mergedKeys) {
    const localRecord = localRecords[key]
    const remoteRecord = remoteRecords[key]

    if (localRecord && remoteRecord) {
      mergedRecords[key] =
        isoToTime(localRecord.updatedAt) >= isoToTime(remoteRecord.updatedAt)
          ? localRecord
          : remoteRecord
      continue
    }

    if (localRecord) {
      mergedRecords[key] = localRecord
      continue
    }

    if (remoteRecord) {
      mergedRecords[key] = remoteRecord
    }
  }

  return mergedRecords
}

function mergeAuditEvents(
  localEvents: readonly InteractiveAuditEvent[] | undefined,
  remoteEvents: readonly InteractiveAuditEvent[] | undefined,
): readonly InteractiveAuditEvent[] {
  if (!localEvents && !remoteEvents) {
    return []
  }

  const mergedById = new Map<string, InteractiveAuditEvent>()
  for (const event of [...(localEvents ?? []), ...(remoteEvents ?? [])]) {
    if (!mergedById.has(event.id)) {
      mergedById.set(event.id, event)
    }
  }

  return Array.from(mergedById.values()).sort((leftEvent, rightEvent) => {
    const timeDiff = isoToTime(leftEvent.at) - isoToTime(rightEvent.at)
    if (timeDiff !== 0) {
      return timeDiff
    }

    return leftEvent.id.localeCompare(rightEvent.id)
  })
}

function mergeInteractiveState(
  localState: UnifiedInteractiveState,
  remoteState: UnifiedInteractiveState,
): UnifiedInteractiveState {
  const recordKeys = new Set([
    ...Object.keys(localState.eventLogByRecordKey),
    ...Object.keys(remoteState.eventLogByRecordKey),
  ])
  const mergedEventLogByRecordKey: Record<string, readonly InteractiveAuditEvent[]> = {}

  for (const recordKey of recordKeys) {
    const mergedEvents = mergeAuditEvents(
      localState.eventLogByRecordKey[recordKey],
      remoteState.eventLogByRecordKey[recordKey],
    )
    if (mergedEvents.length > 0) {
      mergedEventLogByRecordKey[recordKey] = mergedEvents
    }
  }

  return {
    recordsByKey: mergeInteractiveRecords(
      localState.recordsByKey,
      remoteState.recordsByKey,
    ),
    eventLogByRecordKey: mergedEventLogByRecordKey,
  }
}

export function mergeLearningGuestProgress(local: LearningGuestProgress, remote: LearningGuestProgress): LearningGuestProgress {
  return projectLearningGuestProgress({
    interactiveState: mergeInteractiveState(local.interactiveState, remote.interactiveState),
    lastUpdated: maxIsoRequired(local.lastUpdated, remote.lastUpdated),
  })
}
