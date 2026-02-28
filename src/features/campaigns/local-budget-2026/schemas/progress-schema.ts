import { z } from 'zod'
import {
  CAMPAIGN_ID,
  CAMPAIGN_PROGRESS_SCHEMA_VERSION,
} from '../constants'
import type {
  CampaignChallengeProgress,
  CampaignProgressSnapshot,
} from '../types'

const CampaignChallengeStatusSchema = z.enum([
  'not_started',
  'in_progress',
  'pending_review',
  'completed',
  'locked',
])

export const CampaignChallengeProgressSchema = z.object({
  status: CampaignChallengeStatusSchema,
  updatedAt: z.string().min(1),
  attempts: z.number().int().min(0),
})

export const CampaignProgressSnapshotSchema = z.object({
  version: z.literal(CAMPAIGN_PROGRESS_SCHEMA_VERSION),
  campaignId: z.string().min(1),
  onboardingCompletedAt: z.string().min(1).nullable(),
  selectedLocality: z.string().min(1).nullable(),
  selectedEntityCui: z.string().min(1).nullable().optional().default(null),
  challenges: z.record(z.string(), CampaignChallengeProgressSchema),
  lastUpdated: z.string().min(1),
})

export function getEmptyCampaignProgressSnapshot(): CampaignProgressSnapshot {
  const now = new Date().toISOString()
  return {
    version: CAMPAIGN_PROGRESS_SCHEMA_VERSION,
    campaignId: CAMPAIGN_ID,
    onboardingCompletedAt: null,
    selectedLocality: null,
    selectedEntityCui: null,
    challenges: {},
    lastUpdated: now,
  }
}

export function parseCampaignProgressSnapshot(value: unknown): CampaignProgressSnapshot {
  return CampaignProgressSnapshotSchema.parse(value)
}

export function createChallengeProgress(
  status: CampaignChallengeProgress['status'],
  previousAttempts = 0,
): CampaignChallengeProgress {
  return {
    status,
    attempts: Math.max(0, previousAttempts),
    updatedAt: new Date().toISOString(),
  }
}
