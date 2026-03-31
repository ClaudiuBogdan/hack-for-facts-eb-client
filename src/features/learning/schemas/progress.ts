import { z } from 'zod'
import {
  LEARNING_PROGRESS_SCHEMA_VERSION,
  LEARNING_CERTIFICATES_SCHEMA_VERSION,
  type LearningProgressRemoteSnapshot,
  type LearningCertificatesState,
  type LearningGuestProgress,
} from '../types'
import { getEmptyUnifiedInteractiveState } from '../utils/interactive-state'
import {
  InteractiveAuditEventSchema,
  InteractiveStateRecordSchema,
} from './interactive-record'

export const LearningContentStatusSchema = z.enum(['not_started', 'in_progress', 'completed', 'passed'])

const UnifiedInteractiveStateSchema = z.object({
  recordsByKey: z.record(z.string(), InteractiveStateRecordSchema),
  eventLogByRecordKey: z.record(z.string(), z.array(InteractiveAuditEventSchema)),
})

export const LearningContentProgressSchema = z.object({
  contentId: z.string().min(1),
  status: LearningContentStatusSchema,
  score: z.number().min(0).max(100).optional(),
  lastAttemptAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  contentVersion: z.string().min(1),
})

export const LearningOnboardingStateSchema = z.object({
  pathId: z.string().nullable(),
  relatedPaths: z.array(z.string()).default([]),
  completedAt: z.string().datetime().nullable(),
})

export const LearningStreakStateSchema = z.object({
  currentStreak: z.number().int().min(0),
  longestStreak: z.number().int().min(0),
  lastActivityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
})

const LearningGuestProgressSchema = z.object({
  version: z.literal(LEARNING_PROGRESS_SCHEMA_VERSION),
  onboarding: LearningOnboardingStateSchema,
  activePathId: z.string().nullable(),
  content: z.record(z.string(), LearningContentProgressSchema),
  interactiveState: UnifiedInteractiveStateSchema,
  streak: LearningStreakStateSchema,
  lastUpdated: z.string().datetime(),
})

export const LearningProgressRemoteSnapshotSchema = z.object({
  version: z.literal(LEARNING_PROGRESS_SCHEMA_VERSION),
  recordsByKey: z.record(z.string(), InteractiveStateRecordSchema),
  lastUpdated: z.string().datetime().nullable(),
})

export function getEmptyLearningGuestProgress(): LearningGuestProgress {
  return {
    version: LEARNING_PROGRESS_SCHEMA_VERSION,
    onboarding: { pathId: null, relatedPaths: [], completedAt: null },
    activePathId: null,
    content: {},
    interactiveState: getEmptyUnifiedInteractiveState(),
    streak: { currentStreak: 0, longestStreak: 0, lastActivityDate: null },
    lastUpdated: new Date().toISOString(),
  }
}

export function parseLearningGuestProgress(raw: unknown): LearningGuestProgress {
  const parsed = LearningGuestProgressSchema.safeParse(normalizeLearningGuestProgress(raw))
  if (parsed.success) return parsed.data as LearningGuestProgress
  return getEmptyLearningGuestProgress()
}

export function getEmptyLearningProgressRemoteSnapshot(): LearningProgressRemoteSnapshot {
  return {
    version: LEARNING_PROGRESS_SCHEMA_VERSION,
    recordsByKey: {},
    lastUpdated: null,
  }
}

export function parseLearningProgressRemoteSnapshot(raw: unknown): LearningProgressRemoteSnapshot {
  const parsed = LearningProgressRemoteSnapshotSchema.safeParse(raw)
  if (parsed.success) return parsed.data
  return getEmptyLearningProgressRemoteSnapshot()
}

function normalizeLearningGuestProgress(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw
  const draft = { ...(raw as Record<string, unknown>) }

  const onboarding = (draft as { onboarding?: Record<string, unknown> }).onboarding
  if (onboarding && typeof onboarding === 'object') {
    const onboardingRecord = onboarding as Record<string, unknown>
    if (!('pathId' in onboardingRecord)) {
      const role = onboardingRecord.role
      onboardingRecord.pathId = typeof role === 'string' ? role : null
    }
    if ('role' in onboardingRecord) {
      delete onboardingRecord.role
    }
    draft.onboarding = onboardingRecord
  }

  // Add default streak if missing (migration from old progress)
  if (!draft.streak || typeof draft.streak !== 'object') {
    draft.streak = { currentStreak: 0, longestStreak: 0, lastActivityDate: null }
  }
  return draft
}

export const LearningCertificateTierSchema = z.enum(['bronze', 'silver', 'gold'])

export const LearningCertificateSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  pathId: z.string().min(1),
  recipientName: z.string().min(1),
  tier: LearningCertificateTierSchema,
  completionPercentage: z.number().min(0).max(100),
  issuedAt: z.string().datetime(),
})

export const LearningCertificatesStateSchema = z.object({
  version: z.literal(LEARNING_CERTIFICATES_SCHEMA_VERSION),
  certificatesById: z.record(z.string(), LearningCertificateSchema),
})

export function getEmptyLearningCertificatesState(): LearningCertificatesState {
  return {
    version: LEARNING_CERTIFICATES_SCHEMA_VERSION,
    certificatesById: {},
  }
}

export function parseLearningCertificatesState(raw: unknown): LearningCertificatesState {
  const parsed = LearningCertificatesStateSchema.safeParse(raw)
  if (parsed.success) return parsed.data
  return getEmptyLearningCertificatesState()
}
