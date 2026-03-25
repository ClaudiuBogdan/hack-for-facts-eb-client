import type {
  InteractiveStateRecord,
  LearningProgressEvent,
  LearningProgressRemoteSnapshot,
} from '@/features/learning/types'
import { deriveInteractiveLifecycleState } from '@/features/learning/utils/interactive-state'
import {
  getCampaignInteractiveDefinitionByInteractionId,
  getCampaignInteractiveDefinitionsForChallenge,
} from '../civic-interaction-definitions'
import {
  CAMPAIGN_ID,
  CAMPAIGN_PROGRESS_SCHEMA_VERSION,
} from '../constants'
import { getEmptyCampaignProgressSnapshot } from '../schemas/progress-schema'
import type {
  CampaignChallengeProgress,
  CampaignChallengeStatus,
  CampaignProgressSnapshot,
} from '../types'

const CAMPAIGN_RECORD_PREFIX = `system:campaign:${CAMPAIGN_ID}`
const CAMPAIGN_RECORD_LESSON_ID = `${CAMPAIGN_RECORD_PREFIX}:state`

export const CAMPAIGN_ONBOARDING_RECORD_KEY = `${CAMPAIGN_RECORD_PREFIX}:onboarding`
export const CAMPAIGN_ACCEPTED_TERMS_RECORD_KEY = `${CAMPAIGN_RECORD_PREFIX}:accepted-terms`
export const CAMPAIGN_SELECTED_ENTITY_RECORD_KEY = `${CAMPAIGN_RECORD_PREFIX}:selected-entity`
export const CAMPAIGN_ACTIVE_MODULE_RECORD_KEY = `${CAMPAIGN_RECORD_PREFIX}:active-module`

export type CampaignProgressRecordMap = Readonly<Record<string, InteractiveStateRecord>>

type CampaignChallengeInteractionCandidateSource =
  | 'approved'
  | 'pending'
  | 'failed'
  | 'draft'

export type CampaignChallengeInteractionCandidate = {
  readonly ownerChallengeSlug: string
  readonly status: Exclude<CampaignChallengeStatus, 'locked'>
  readonly source: CampaignChallengeInteractionCandidateSource
  readonly updatedAt: string
}

const CHALLENGE_STATUS_PRIORITY: Readonly<Record<Exclude<CampaignChallengeStatus, 'locked'>, number>> = {
  completed: 3,
  pending_review: 2,
  in_progress: 1,
  not_started: 0,
} as const

const CANDIDATE_SOURCE_PRIORITY: Readonly<Record<CampaignChallengeInteractionCandidateSource, number>> = {
  approved: 3,
  pending: 2,
  failed: 1,
  draft: 0,
} as const

function maxIso(left: string | null, right: string | null): string | null {
  if (!left) return right
  if (!right) return left
  return left >= right ? left : right
}

function readJsonValue(record: InteractiveStateRecord | undefined): Record<string, unknown> | null {
  if (!record || record.value?.kind !== 'json') {
    return null
  }

  return record.value.json.value
}

function readNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function readNonNegativeInteger(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0
}

function isCampaignChallengeStatus(value: unknown): value is CampaignChallengeStatus {
  return value === 'not_started'
    || value === 'in_progress'
    || value === 'pending_review'
    || value === 'completed'
    || value === 'locked'
}

function isCampaignRecordKey(recordKey: string): boolean {
  return recordKey.startsWith(`${CAMPAIGN_RECORD_PREFIX}:`)
}

function isTrackedCampaignInteractionRecord(record: InteractiveStateRecord): boolean {
  return getCampaignInteractiveDefinitionByInteractionId(record.interactionId) !== null
}

function createCampaignRecord(params: {
  readonly key: string
  readonly updatedAt: string
  readonly value: Record<string, unknown>
}): InteractiveStateRecord {
  return {
    key: params.key,
    interactionId: params.key,
    lessonId: CAMPAIGN_RECORD_LESSON_ID,
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

function shouldPersistChallengeProgress(progress: CampaignChallengeProgress): boolean {
  return !(progress.status === 'not_started' && progress.attempts === 0)
}

function recordsAreEqual(left: InteractiveStateRecord, right: InteractiveStateRecord): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function toChallengeCandidateFromRecord(
  record: InteractiveStateRecord,
): CampaignChallengeInteractionCandidate | null {
  const definition = getCampaignInteractiveDefinitionByInteractionId(record.interactionId)
  if (!definition) {
    return null
  }

  const lifecycle = deriveInteractiveLifecycleState(record, definition.lifecycleMode)
  if (lifecycle.status === 'passed') {
    return {
      ownerChallengeSlug: definition.ownerChallengeSlug,
      status: 'completed',
      source: 'approved',
      updatedAt: record.updatedAt,
    }
  }

  if (lifecycle.status === 'pending') {
    return {
      ownerChallengeSlug: definition.ownerChallengeSlug,
      status: 'pending_review',
      source: 'pending',
      updatedAt: record.updatedAt,
    }
  }

  if (lifecycle.status === 'failed') {
    return {
      ownerChallengeSlug: definition.ownerChallengeSlug,
      status: 'in_progress',
      source: 'failed',
      updatedAt: record.updatedAt,
    }
  }

  if (lifecycle.status === 'draft') {
    return {
      ownerChallengeSlug: definition.ownerChallengeSlug,
      status: 'in_progress',
      source: 'draft',
      updatedAt: record.updatedAt,
    }
  }

  return null
}

function compareChallengeCandidates(
  leftCandidate: CampaignChallengeInteractionCandidate,
  rightCandidate: CampaignChallengeInteractionCandidate,
): number {
  const statusDiff =
    CHALLENGE_STATUS_PRIORITY[leftCandidate.status]
    - CHALLENGE_STATUS_PRIORITY[rightCandidate.status]
  if (statusDiff !== 0) {
    return statusDiff
  }

  if (leftCandidate.updatedAt !== rightCandidate.updatedAt) {
    return leftCandidate.updatedAt.localeCompare(rightCandidate.updatedAt)
  }

  return CANDIDATE_SOURCE_PRIORITY[leftCandidate.source] - CANDIDATE_SOURCE_PRIORITY[rightCandidate.source]
}

function readExplicitChallengeProgressBySlug(
  recordsByKey: CampaignProgressRecordMap,
): Record<string, CampaignChallengeProgress> {
  const challengeProgressBySlug: Record<string, CampaignChallengeProgress> = {}

  for (const [recordKey, record] of Object.entries(recordsByKey)) {
    if (!recordKey.startsWith(`${CAMPAIGN_RECORD_PREFIX}:challenge:`)) {
      continue
    }

    const value = readJsonValue(record)
    if (!value) {
      continue
    }

    const status = value.status
    if (!isCampaignChallengeStatus(status)) {
      continue
    }

    const challengeSlug =
      readNullableString(value.challengeSlug) ?? recordKey.slice(`${CAMPAIGN_RECORD_PREFIX}:challenge:`.length)
    challengeProgressBySlug[challengeSlug] = {
      status,
      attempts: readNonNegativeInteger(value.attempts),
      updatedAt: record.updatedAt,
    }
  }

  return challengeProgressBySlug
}

export function deriveCampaignChallengeInteractionCandidate(
  ownerChallengeSlug: string,
  records: readonly InteractiveStateRecord[],
): CampaignChallengeInteractionCandidate | null {
  const trackedInteractionIds = new Set(
    getCampaignInteractiveDefinitionsForChallenge(ownerChallengeSlug).map((definition) => definition.interactionId),
  )

  let strongestCandidate: CampaignChallengeInteractionCandidate | null = null

  for (const record of records) {
    if (!trackedInteractionIds.has(record.interactionId)) {
      continue
    }

    const candidate = toChallengeCandidateFromRecord(record)
    if (!candidate) {
      continue
    }

    if (
      strongestCandidate === null
      || compareChallengeCandidates(candidate, strongestCandidate) > 0
    ) {
      strongestCandidate = candidate
    }
  }

  return strongestCandidate
}

function mergeChallengeProgressWithInteractionCandidate(
  explicitProgress: CampaignChallengeProgress | undefined,
  candidate: CampaignChallengeInteractionCandidate | null,
): CampaignChallengeProgress | null {
  if (explicitProgress?.status === 'locked') {
    return explicitProgress
  }

  if (!explicitProgress) {
    if (!candidate || candidate.status === 'not_started') {
      return null
    }

    return {
      status: candidate.status,
      attempts: 0,
      updatedAt: candidate.updatedAt,
    }
  }

  if (!candidate) {
    return explicitProgress
  }

  if (candidate.updatedAt <= explicitProgress.updatedAt) {
    return explicitProgress
  }

  if (candidate.status === 'completed') {
    return {
      status: 'completed',
      attempts: explicitProgress.attempts,
      updatedAt: candidate.updatedAt,
    }
  }

  if (candidate.status === 'pending_review') {
    if (explicitProgress.status === 'completed') {
      return explicitProgress
    }

    return {
      status: 'pending_review',
      attempts: explicitProgress.attempts,
      updatedAt: candidate.updatedAt,
    }
  }

  if (candidate.status === 'in_progress') {
    if (
      (candidate.source === 'draft' && (
        explicitProgress.status === 'pending_review'
        || explicitProgress.status === 'completed'
      ))
      || (candidate.source === 'failed' && explicitProgress.status === 'completed')
    ) {
      return explicitProgress
    }

    return {
      status: 'in_progress',
      attempts: explicitProgress.attempts,
      updatedAt: candidate.updatedAt,
    }
  }

  return explicitProgress
}

export function getCampaignChallengeRecordKey(challengeSlug: string): string {
  return `${CAMPAIGN_RECORD_PREFIX}:challenge:${challengeSlug}`
}

export function createCampaignOnboardingRecord(params: {
  readonly completedAt: string | null
  readonly locality: string | null
  readonly updatedAt: string
}): InteractiveStateRecord {
  return createCampaignRecord({
    key: CAMPAIGN_ONBOARDING_RECORD_KEY,
    updatedAt: params.updatedAt,
    value: {
      completedAt: params.completedAt,
      locality: params.locality,
    },
  })
}

export function createCampaignAcceptedTermsRecord(params: {
  readonly acceptedTermsAt: string | null
  readonly updatedAt: string
}): InteractiveStateRecord {
  return createCampaignRecord({
    key: CAMPAIGN_ACCEPTED_TERMS_RECORD_KEY,
    updatedAt: params.updatedAt,
    value: {
      acceptedTermsAt: params.acceptedTermsAt,
    },
  })
}

export function createCampaignSelectedEntityRecord(params: {
  readonly entityCui: string | null
  readonly updatedAt: string
}): InteractiveStateRecord {
  return createCampaignRecord({
    key: CAMPAIGN_SELECTED_ENTITY_RECORD_KEY,
    updatedAt: params.updatedAt,
    value: {
      entityCui: params.entityCui,
    },
  })
}

export function createCampaignActiveModuleRecord(params: {
  readonly moduleSlug: string | null
  readonly updatedAt: string
}): InteractiveStateRecord {
  return createCampaignRecord({
    key: CAMPAIGN_ACTIVE_MODULE_RECORD_KEY,
    updatedAt: params.updatedAt,
    value: {
      moduleSlug: params.moduleSlug,
    },
  })
}

export function createCampaignChallengeRecord(params: {
  readonly challengeSlug: string
  readonly status: CampaignChallengeStatus
  readonly attempts: number
  readonly updatedAt: string
}): InteractiveStateRecord {
  return createCampaignRecord({
    key: getCampaignChallengeRecordKey(params.challengeSlug),
    updatedAt: params.updatedAt,
    value: {
      challengeSlug: params.challengeSlug,
      status: params.status,
      attempts: Math.max(0, params.attempts),
    },
  })
}

export function filterCampaignProgressRecords(
  recordsByKey: Readonly<Record<string, InteractiveStateRecord>>,
): Record<string, InteractiveStateRecord> {
  return Object.fromEntries(
    Object.entries(recordsByKey).filter(([, record]) => {
      return isCampaignRecordKey(record.key) || isTrackedCampaignInteractionRecord(record)
    }),
  )
}

export function filterCampaignProgressEvents(
  events: readonly LearningProgressEvent[],
): Extract<LearningProgressEvent, { readonly type: 'interactive.updated' }>[] {
  return events.filter((event): event is Extract<LearningProgressEvent, { readonly type: 'interactive.updated' }> => {
    return event.type === 'interactive.updated'
      && (
        isCampaignRecordKey(event.payload.record.key)
        || isTrackedCampaignInteractionRecord(event.payload.record)
      )
  })
}

export function mergeCampaignProgressRecords(
  localRecords: CampaignProgressRecordMap,
  remoteRecords: CampaignProgressRecordMap,
): Record<string, InteractiveStateRecord> {
  const mergedKeys = new Set([
    ...Object.keys(localRecords),
    ...Object.keys(remoteRecords),
  ])
  const mergedRecords: Record<string, InteractiveStateRecord> = {}

  for (const key of mergedKeys) {
    const localRecord = localRecords[key]
    const remoteRecord = remoteRecords[key]

    if (localRecord && remoteRecord) {
      mergedRecords[key] = localRecord.updatedAt >= remoteRecord.updatedAt
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

export function applyCampaignProgressEventsToRecords(
  baseRecords: CampaignProgressRecordMap,
  events: readonly LearningProgressEvent[],
): Record<string, InteractiveStateRecord> {
  const nextRecords = { ...baseRecords }

  for (const event of filterCampaignProgressEvents(events)) {
    const nextRecord = event.payload.record
    const currentRecord = nextRecords[nextRecord.key]

    if (
      !currentRecord
      || nextRecord.updatedAt > currentRecord.updatedAt
      || (nextRecord.updatedAt === currentRecord.updatedAt && !recordsAreEqual(nextRecord, currentRecord))
    ) {
      nextRecords[nextRecord.key] = nextRecord
    }
  }

  return nextRecords
}

export function diffCampaignProgressRecords(
  candidateRecords: CampaignProgressRecordMap,
  baselineRecords: CampaignProgressRecordMap,
): InteractiveStateRecord[] {
  return Object.values(candidateRecords).filter((candidateRecord) => {
    const baselineRecord = baselineRecords[candidateRecord.key]

    if (!baselineRecord) {
      return true
    }

    if (candidateRecord.updatedAt > baselineRecord.updatedAt) {
      return true
    }

    if (candidateRecord.updatedAt < baselineRecord.updatedAt) {
      return false
    }

    return !recordsAreEqual(candidateRecord, baselineRecord)
  })
}

export function buildCampaignProgressRecords(
  snapshot: CampaignProgressSnapshot,
): Record<string, InteractiveStateRecord> {
  const records: Record<string, InteractiveStateRecord> = {}

  if (snapshot.onboardingCompletedAt || snapshot.selectedLocality) {
    records[CAMPAIGN_ONBOARDING_RECORD_KEY] = createCampaignOnboardingRecord({
      completedAt: snapshot.onboardingCompletedAt,
      locality: snapshot.selectedLocality,
      updatedAt: snapshot.onboardingCompletedAt ?? snapshot.lastUpdated,
    })
  }

  if (snapshot.acceptedTermsAt) {
    records[CAMPAIGN_ACCEPTED_TERMS_RECORD_KEY] = createCampaignAcceptedTermsRecord({
      acceptedTermsAt: snapshot.acceptedTermsAt,
      updatedAt: snapshot.acceptedTermsAt,
    })
  }

  if (snapshot.selectedEntityCui) {
    records[CAMPAIGN_SELECTED_ENTITY_RECORD_KEY] = createCampaignSelectedEntityRecord({
      entityCui: snapshot.selectedEntityCui,
      updatedAt: snapshot.lastUpdated,
    })
  }

  if (snapshot.activeChallengeModuleSlug) {
    records[CAMPAIGN_ACTIVE_MODULE_RECORD_KEY] = createCampaignActiveModuleRecord({
      moduleSlug: snapshot.activeChallengeModuleSlug,
      updatedAt: snapshot.lastUpdated,
    })
  }

  for (const [challengeSlug, challengeProgress] of Object.entries(snapshot.challenges)) {
    if (!shouldPersistChallengeProgress(challengeProgress)) {
      continue
    }

    const record = createCampaignChallengeRecord({
      challengeSlug,
      status: challengeProgress.status,
      attempts: challengeProgress.attempts,
      updatedAt: challengeProgress.updatedAt,
    })
    records[record.key] = record
  }

  return records
}

export function projectCampaignProgressFromRecords(
  recordsByKey: CampaignProgressRecordMap,
  fallbackLastUpdated?: string | null,
): CampaignProgressSnapshot {
  const emptySnapshot = getEmptyCampaignProgressSnapshot()
  const campaignRecords = filterCampaignProgressRecords(recordsByKey)
  let lastUpdated = fallbackLastUpdated ?? null

  for (const record of Object.values(campaignRecords)) {
    lastUpdated = maxIso(lastUpdated, record.updatedAt)
  }

  const onboardingValue = readJsonValue(campaignRecords[CAMPAIGN_ONBOARDING_RECORD_KEY])
  const acceptedTermsValue = readJsonValue(campaignRecords[CAMPAIGN_ACCEPTED_TERMS_RECORD_KEY])
  const selectedEntityValue = readJsonValue(campaignRecords[CAMPAIGN_SELECTED_ENTITY_RECORD_KEY])
  const activeModuleValue = readJsonValue(campaignRecords[CAMPAIGN_ACTIVE_MODULE_RECORD_KEY])
  const explicitChallengeProgressBySlug = readExplicitChallengeProgressBySlug(campaignRecords)
  const trackedInteractionRecords = Object.values(campaignRecords).filter(isTrackedCampaignInteractionRecord)
  const challenges: Record<string, CampaignChallengeProgress> = {}

  const candidateChallengeSlugs = new Set<string>()
  for (const record of trackedInteractionRecords) {
    const definition = getCampaignInteractiveDefinitionByInteractionId(record.interactionId)
    if (!definition) {
      continue
    }

    candidateChallengeSlugs.add(definition.ownerChallengeSlug)
  }

  const challengeSlugs = new Set([
    ...Object.keys(explicitChallengeProgressBySlug),
    ...candidateChallengeSlugs,
  ])

  for (const challengeSlug of challengeSlugs) {
    const mergedChallengeProgress = mergeChallengeProgressWithInteractionCandidate(
      explicitChallengeProgressBySlug[challengeSlug],
      deriveCampaignChallengeInteractionCandidate(challengeSlug, trackedInteractionRecords),
    )

    if (!mergedChallengeProgress || !shouldPersistChallengeProgress(mergedChallengeProgress)) {
      continue
    }

    challenges[challengeSlug] = mergedChallengeProgress
  }

  return {
    version: CAMPAIGN_PROGRESS_SCHEMA_VERSION,
    campaignId: CAMPAIGN_ID,
    onboardingCompletedAt: readNullableString(onboardingValue?.completedAt),
    acceptedTermsAt: readNullableString(acceptedTermsValue?.acceptedTermsAt),
    selectedLocality: readNullableString(onboardingValue?.locality),
    selectedEntityCui: readNullableString(selectedEntityValue?.entityCui),
    activeChallengeModuleSlug: readNullableString(activeModuleValue?.moduleSlug),
    challenges,
    lastUpdated: lastUpdated ?? emptySnapshot.lastUpdated,
  }
}

export function projectCampaignProgressFromRemoteSnapshot(
  snapshot: LearningProgressRemoteSnapshot,
): CampaignProgressSnapshot {
  return projectCampaignProgressFromRecords(
    filterCampaignProgressRecords(snapshot.recordsByKey),
    snapshot.lastUpdated,
  )
}
