import { beforeEach, describe, expect, it } from 'vitest'
import {
  getCampaignAdminStagedReviewDraftsStorageKey,
  readCampaignAdminStagedReviewDraftsFromSessionStorage,
  writeCampaignAdminStagedReviewDraftsToSessionStorage,
} from './staged-review-session-storage'

describe('staged-review-session-storage', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('defaults legacy staged drafts to an unacknowledged approval risk state', () => {
    window.sessionStorage.setItem(
      getCampaignAdminStagedReviewDraftsStorageKey('funky'),
      JSON.stringify({
        'user-1::record-1': {
          userId: 'user-1',
          recordKey: 'record-1',
          status: 'approved',
          feedbackText: '',
        },
      })
    )

    expect(readCampaignAdminStagedReviewDraftsFromSessionStorage('funky')).toEqual({
      'user-1::record-1': {
        userId: 'user-1',
        recordKey: 'record-1',
        status: 'approved',
        feedbackText: '',
        approvalRiskAcknowledged: false,
        sendNotification: false,
      },
    })
  })

  it('persists explicit approval-risk acknowledgments', () => {
    writeCampaignAdminStagedReviewDraftsToSessionStorage('funky', {
      'user-1::record-1': {
        userId: 'user-1',
        recordKey: 'record-1',
        status: 'approved',
        feedbackText: '',
        approvalRiskAcknowledged: true,
      },
    })

    expect(readCampaignAdminStagedReviewDraftsFromSessionStorage('funky')).toEqual({
      'user-1::record-1': {
        userId: 'user-1',
        recordKey: 'record-1',
        status: 'approved',
        feedbackText: '',
        approvalRiskAcknowledged: true,
        sendNotification: false,
      },
    })
  })
})
