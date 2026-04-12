import { z } from 'zod'
import {
  getSafeSessionStorageItem,
  removeSafeSessionStorageItem,
  setSafeSessionStorageItem,
} from '@/features/advanced-map-analytics/storage/safe-session-storage'
import type {
  CampaignAdminCampaignKey,
  CampaignAdminStagedReviewDraft,
} from '@/features/campaigns/buget/admin/types'

const campaignAdminStagedReviewDraftSchema = z.object({
  userId: z.string().min(1),
  recordKey: z.string().min(1),
  status: z.enum(['approved', 'rejected']),
  feedbackText: z.string(),
  approvalRiskAcknowledged: z.boolean().optional(),
}).transform((draft) => ({
  ...draft,
  approvalRiskAcknowledged: draft.approvalRiskAcknowledged ?? false,
}))

const campaignAdminStagedReviewDraftMapSchema = z.record(
  z.string(),
  campaignAdminStagedReviewDraftSchema
)

export function getCampaignAdminStagedReviewDraftsStorageKey(
  campaignKey: CampaignAdminCampaignKey,
  userId?: string
): string {
  if (userId && userId.trim().length > 0) {
    return `campaign-admin:user-interactions:${campaignKey}:${userId}:staged-review-drafts`
  }

  return `campaign-admin:user-interactions:${campaignKey}:staged-review-drafts`
}

export function readCampaignAdminStagedReviewDraftsFromSessionStorage(
  campaignKey: CampaignAdminCampaignKey,
  userId?: string
): Record<string, CampaignAdminStagedReviewDraft> {
  const rawValue = getSafeSessionStorageItem(
    getCampaignAdminStagedReviewDraftsStorageKey(campaignKey, userId)
  )

  if (rawValue === null || rawValue.trim().length === 0) {
    return {}
  }

  try {
    const parsedValue = JSON.parse(rawValue)
    const result = campaignAdminStagedReviewDraftMapSchema.safeParse(parsedValue)

    return result.success ? result.data : {}
  } catch {
    return {}
  }
}

export function writeCampaignAdminStagedReviewDraftsToSessionStorage(
  campaignKey: CampaignAdminCampaignKey,
  draftsByKey: Readonly<Record<string, CampaignAdminStagedReviewDraft>>,
  userId?: string
): void {
  const storageKey = getCampaignAdminStagedReviewDraftsStorageKey(
    campaignKey,
    userId
  )

  if (Object.keys(draftsByKey).length === 0) {
    removeSafeSessionStorageItem(storageKey)
    return
  }

  setSafeSessionStorageItem(storageKey, JSON.stringify(draftsByKey))
}
