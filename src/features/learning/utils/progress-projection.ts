import {
  LEARNING_PROGRESS_SCHEMA_VERSION,
  type InteractiveStateRecord,
  type LearningContentProgress,
  type LearningContentStatus,
  type LearningGuestProgress,
  type LearningOnboardingState,
  type LearningStreakState,
  type UnifiedInteractiveState,
} from '../types'
import { maxIso } from './date-utils'

export const SYSTEM_LEARNING_ONBOARDING_RECORD_KEY = 'system:learning-onboarding'
export const SYSTEM_LEARNING_ACTIVE_PATH_RECORD_KEY = 'system:learning-active-path'
export const SYSTEM_LEARNING_STREAK_RECORD_KEY = 'system:learning-streak'
export const SYSTEM_LESSON_PROGRESS_RECORD_PREFIX = 'system:lesson-progress:'

const CONTENT_STATUS_RANK: Record<LearningContentStatus, number> = {
  not_started: 0,
  in_progress: 1,
  completed: 2,
  passed: 3,
}

const DEFAULT_CONTENT_VERSION = 'v1' as const

function readJsonValue(record: InteractiveStateRecord | undefined): Record<string, unknown> | null {
  if (!record || record.value?.kind !== 'json') {
    return null
  }

  return record.value.json.value
}

function readString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function readStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((entry): entry is string => typeof entry === 'string')
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function clampScore(value: number | undefined): number | undefined {
  if (typeof value !== 'number' || Number.isNaN(value)) return undefined
  return Math.max(0, Math.min(100, value))
}

function pickHigherStatus(
  existingStatus: LearningContentStatus | undefined,
  nextStatus: LearningContentStatus,
): LearningContentStatus {
  if (!existingStatus) {
    return nextStatus
  }

  return CONTENT_STATUS_RANK[existingStatus] >= CONTENT_STATUS_RANK[nextStatus]
    ? existingStatus
    : nextStatus
}

function projectOnboarding(
  interactiveState: UnifiedInteractiveState,
): LearningOnboardingState {
  const value = readJsonValue(interactiveState.recordsByKey[SYSTEM_LEARNING_ONBOARDING_RECORD_KEY])

  if (!value) {
    return {
      pathId: null,
      relatedPaths: [],
      completedAt: null,
    }
  }

  return {
    pathId: readString(value.pathId),
    relatedPaths: readStringArray(value.relatedPaths),
    completedAt: readString(value.completedAt),
  }
}

function projectActivePathId(interactiveState: UnifiedInteractiveState): string | null {
  const value = readJsonValue(interactiveState.recordsByKey[SYSTEM_LEARNING_ACTIVE_PATH_RECORD_KEY])
  return value ? readString(value.pathId) : null
}

function projectStreak(interactiveState: UnifiedInteractiveState): LearningStreakState {
  const value = readJsonValue(interactiveState.recordsByKey[SYSTEM_LEARNING_STREAK_RECORD_KEY])

  if (!value) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null,
    }
  }

  return {
    currentStreak: readNumber(value.currentStreak) ?? 0,
    longestStreak: readNumber(value.longestStreak) ?? 0,
    lastActivityDate: readString(value.lastActivityDate),
  }
}

function isLessonProgressRecordKey(recordKey: string): boolean {
  return recordKey.startsWith(SYSTEM_LESSON_PROGRESS_RECORD_PREFIX)
}

function projectContent(
  interactiveState: UnifiedInteractiveState,
): Readonly<Record<string, LearningContentProgress>> {
  const content: Record<string, LearningContentProgress> = {}

  for (const [recordKey, record] of Object.entries(interactiveState.recordsByKey)) {
    if (!isLessonProgressRecordKey(recordKey)) {
      continue
    }

    const value = readJsonValue(record)
    if (!value) {
      continue
    }

    const status = readString(value.status)
    const lastAttemptAt = readString(value.lastAttemptAt)
    const contentVersion = readString(value.contentVersion)

    if (
      status !== 'not_started' &&
      status !== 'in_progress' &&
      status !== 'completed' &&
      status !== 'passed'
    ) {
      continue
    }

    if (!lastAttemptAt || !contentVersion) {
      continue
    }

    content[record.lessonId] = {
      contentId: record.lessonId,
      status,
      score: readNumber(value.score),
      lastAttemptAt,
      completedAt: readString(value.completedAt) ?? undefined,
      contentVersion,
    }
  }

  return content
}

export function projectLearningGuestProgress(params: {
  readonly interactiveState: UnifiedInteractiveState
  readonly lastUpdated?: string | null
}): LearningGuestProgress {
  const projectedLastUpdated = Object.values(params.interactiveState.recordsByKey).reduce<string | null>(
    (latest, record) => maxIso(latest, record.updatedAt),
    params.lastUpdated ?? null,
  )

  return {
    version: LEARNING_PROGRESS_SCHEMA_VERSION,
    onboarding: projectOnboarding(params.interactiveState),
    activePathId: projectActivePathId(params.interactiveState),
    content: projectContent(params.interactiveState),
    interactiveState: params.interactiveState,
    streak: projectStreak(params.interactiveState),
    lastUpdated: projectedLastUpdated ?? new Date().toISOString(),
  }
}

function createReservedRecord(params: {
  readonly key: string
  readonly lessonId: string
  readonly updatedAt: string
  readonly value: Record<string, unknown>
}): InteractiveStateRecord {
  return {
    key: params.key,
    interactionId: params.key,
    lessonId: params.lessonId,
    kind: 'custom',
    scope: { type: 'global' },
    completionRule: { type: 'resolved' },
    phase: 'resolved',
    value: {
      kind: 'json',
      json: {
        value: params.value,
      },
    },
    result: null,
    updatedAt: params.updatedAt,
    submittedAt: null,
  }
}

export function createLearningOnboardingRecord(params: {
  readonly pathId: string | null
  readonly relatedPaths: readonly string[]
  readonly completedAt: string | null
  readonly updatedAt: string
}): InteractiveStateRecord {
  return createReservedRecord({
    key: SYSTEM_LEARNING_ONBOARDING_RECORD_KEY,
    lessonId: SYSTEM_LEARNING_ONBOARDING_RECORD_KEY,
    updatedAt: params.updatedAt,
    value: {
      pathId: params.pathId,
      relatedPaths: [...params.relatedPaths],
      completedAt: params.completedAt,
    },
  })
}

export function createLearningActivePathRecord(params: {
  readonly pathId: string | null
  readonly updatedAt: string
}): InteractiveStateRecord {
  return createReservedRecord({
    key: SYSTEM_LEARNING_ACTIVE_PATH_RECORD_KEY,
    lessonId: SYSTEM_LEARNING_ACTIVE_PATH_RECORD_KEY,
    updatedAt: params.updatedAt,
    value: {
      pathId: params.pathId,
    },
  })
}

export function createLearningStreakRecord(params: {
  readonly streak: LearningStreakState
  readonly updatedAt: string
}): InteractiveStateRecord {
  return createReservedRecord({
    key: SYSTEM_LEARNING_STREAK_RECORD_KEY,
    lessonId: SYSTEM_LEARNING_STREAK_RECORD_KEY,
    updatedAt: params.updatedAt,
    value: {
      currentStreak: params.streak.currentStreak,
      longestStreak: params.streak.longestStreak,
      lastActivityDate: params.streak.lastActivityDate,
    },
  })
}

export function createLessonProgressRecord(params: {
  readonly progress: LearningContentProgress
  readonly updatedAt: string
}): InteractiveStateRecord {
  return createReservedRecord({
    key: `${SYSTEM_LESSON_PROGRESS_RECORD_PREFIX}${params.progress.contentId}`,
    lessonId: params.progress.contentId,
    updatedAt: params.updatedAt,
    value: {
      status: params.progress.status,
      score: params.progress.score ?? null,
      lastAttemptAt: params.progress.lastAttemptAt,
      completedAt: params.progress.completedAt ?? null,
      contentVersion: params.progress.contentVersion,
    },
  })
}

export function toDateString(iso: string): string {
  if (!iso || iso.length < 10) return iso
  return iso.slice(0, 10)
}

export function upsertProjectedContentProgress(params: {
  readonly existing: LearningContentProgress | undefined
  readonly now: string
  readonly contentId: string
  readonly status: LearningContentStatus
  readonly score?: number
  readonly contentVersion?: string
}): LearningContentProgress {
  const score = clampScore(params.score)
  const contentVersion =
    params.contentVersion ?? params.existing?.contentVersion ?? DEFAULT_CONTENT_VERSION

  if (!params.existing) {
    return {
      contentId: params.contentId,
      status: params.status,
      score,
      lastAttemptAt: params.now,
      completedAt:
        params.status === 'completed' || params.status === 'passed'
          ? params.now
          : undefined,
      contentVersion,
    }
  }

  const status = pickHigherStatus(params.existing.status, params.status)
  const completedAt =
    status === 'completed' || status === 'passed'
      ? params.existing.completedAt ??
        (params.status === 'completed' || params.status === 'passed'
          ? params.now
          : undefined)
      : params.existing.completedAt

  const mergedScore = (() => {
    const existingScore = params.existing.score
    if (typeof score !== 'number') return existingScore
    if (typeof existingScore !== 'number') return score
    return Math.max(existingScore, score)
  })()

  return {
    contentId: params.existing.contentId,
    status,
    score: mergedScore,
    lastAttemptAt: params.now,
    completedAt,
    contentVersion,
  }
}
