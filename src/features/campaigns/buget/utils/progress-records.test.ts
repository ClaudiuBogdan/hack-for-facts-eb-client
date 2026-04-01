import { describe, expect, it } from 'vitest'
import type { InteractiveStateRecord, LearningProgressRemoteSnapshot } from '@/features/learning/types'
import { CAMPAIGN_ID } from '../constants'
import {
  BUDGET_DOCUMENT_LINK_INTERACTION,
  PRIMARIE_CONTACT_INFO_INTERACTION,
  PRIMARIE_WEBSITE_LINK_INTERACTION,
} from '../civic-interaction-definitions'
import { getEmptyCampaignProgressSnapshot } from '../schemas/progress-schema'
import {
  CAMPAIGN_ACTIVE_MODULE_RECORD_KEY,
  CAMPAIGN_ONBOARDING_RECORD_KEY,
  CAMPAIGN_SELECTED_ENTITY_RECORD_KEY,
  applyCampaignProgressEventsToRecords,
  buildCampaignProgressRecords,
  createCampaignActiveModuleRecord,
  createCampaignChallengeRecord,
  createCampaignEntityAcceptedTermsRecord,
  createCampaignOnboardingRecord,
  createCampaignSelectedEntityRecord,
  diffCampaignProgressRecords,
  filterCampaignProgressRecords,
  getCampaignChallengeRecordKey,
  getCampaignEntityAcceptedTermsRecordKey,
  mergeCampaignProgressRecords,
  projectCampaignProgressFromRecords,
  projectCampaignProgressFromRemoteSnapshot,
} from './progress-records'

const ISO_1 = '2026-01-01T00:00:00.000Z'
const ISO_2 = '2026-01-02T00:00:00.000Z'
const ISO_3 = '2026-01-03T00:00:00.000Z'

function createRemoteSnapshot(
  recordsByKey: Readonly<Record<string, InteractiveStateRecord>>,
  lastUpdated: string | null = ISO_3,
): LearningProgressRemoteSnapshot {
  return {
    version: 1,
    recordsByKey,
    lastUpdated,
  }
}

describe('campaign progress records', () => {
  it('projects an empty campaign snapshot from unrelated learning records', () => {
    const snapshot = projectCampaignProgressFromRemoteSnapshot(createRemoteSnapshot({
      'system:lesson-progress:lesson-1': {
        key: 'system:lesson-progress:lesson-1',
        interactionId: 'system:lesson-progress:lesson-1',
        lessonId: 'lesson-1',
        kind: 'custom',
        scope: { type: 'global' },
        completionRule: { type: 'resolved' },
        phase: 'resolved',
        value: {
          kind: 'json',
          json: { value: { status: 'completed' } },
        },
        result: null,
        updatedAt: ISO_1,
        submittedAt: null,
      },
    }))

    expect(snapshot).toEqual({
      ...getEmptyCampaignProgressSnapshot(),
      campaignId: CAMPAIGN_ID,
      version: 1,
      lastUpdated: ISO_3,
    })
  })

  it('filters non-campaign records and projects campaign fields', () => {
    const unrelatedRecord: InteractiveStateRecord = {
      key: 'system:lesson-progress:lesson-1',
      interactionId: 'system:lesson-progress:lesson-1',
      lessonId: 'lesson-1',
      kind: 'custom',
      scope: { type: 'global' },
      completionRule: { type: 'resolved' },
      phase: 'resolved',
      value: {
        kind: 'json',
        json: { value: { status: 'completed' } },
      },
      result: null,
      updatedAt: ISO_1,
      submittedAt: null,
    }

    const records: Readonly<Record<string, InteractiveStateRecord>> = {
      [CAMPAIGN_ONBOARDING_RECORD_KEY]: createCampaignOnboardingRecord({
        locality: 'Cluj',
        completedAt: ISO_1,
        updatedAt: ISO_1,
      }),
      [getCampaignEntityAcceptedTermsRecordKey('12345678')]: createCampaignEntityAcceptedTermsRecord({
        entityCui: '12345678',
        acceptedTermsAt: ISO_2,
        updatedAt: ISO_2,
      }),
      [CAMPAIGN_SELECTED_ENTITY_RECORD_KEY]: createCampaignSelectedEntityRecord({
        entityCui: '12345678',
        updatedAt: ISO_2,
      }),
      [CAMPAIGN_ACTIVE_MODULE_RECORD_KEY]: createCampaignActiveModuleRecord({
        moduleSlug: 'read-local-execution',
        updatedAt: ISO_3,
      }),
      [getCampaignChallengeRecordKey('challenge-1')]: createCampaignChallengeRecord({
        challengeSlug: 'challenge-1',
        status: 'completed',
        attempts: 2,
        updatedAt: ISO_2,
      }),
      'system:lesson-progress:lesson-1': unrelatedRecord,
    }

    const filtered = filterCampaignProgressRecords(records)
    const snapshot = projectCampaignProgressFromRecords(filtered)

    expect(Object.keys(filtered)).toHaveLength(5)
    expect(snapshot.selectedLocality).toBe('Cluj')
    expect(snapshot.acceptedTermsByEntity['12345678']).toBe(ISO_2)
    expect(snapshot.selectedEntityCui).toBe('12345678')
    expect(snapshot.activeChallengeModuleSlug).toBe('read-local-execution')
    expect(snapshot.challenges['challenge-1']).toEqual({
      status: 'completed',
      attempts: 2,
      updatedAt: ISO_2,
    })
    expect(snapshot.lastUpdated).toBe(ISO_3)
  })

  it('derives challenge completion from approved review records', () => {
    const challengeRecord = createCampaignChallengeRecord({
      challengeSlug: 'civic-monitor-and-request',
      status: 'pending_review',
      attempts: 1,
      updatedAt: ISO_1,
    })

    const snapshot = projectCampaignProgressFromRecords({
      [challengeRecord.key]: challengeRecord,
      'campaign:primarie-website-url::entity:4305857': {
        key: 'campaign:primarie-website-url::entity:4305857',
        interactionId: 'campaign:primarie-website-url',
        lessonId: 'civic-monitor-and-request',
        kind: 'custom',
        scope: { type: 'entity', entityCui: '4305857' },
        completionRule: { type: 'resolved' },
        phase: 'resolved',
        value: {
          kind: 'json',
          json: { value: { websiteUrl: 'https://example.com' } },
        },
        result: null,
        review: {
          status: 'approved',
          reviewedAt: ISO_2,
        },
        updatedAt: ISO_2,
        submittedAt: ISO_1,
      },
    })

    expect(snapshot.challenges['civic-monitor-and-request']).toEqual({
      status: 'completed',
      attempts: 1,
      updatedAt: ISO_2,
    })
  })

  it('derives challenge retry state from rejected review records', () => {
    const challengeRecord = createCampaignChallengeRecord({
      challengeSlug: 'civic-monitor-and-request',
      status: 'pending_review',
      attempts: 2,
      updatedAt: ISO_1,
    })

    const snapshot = projectCampaignProgressFromRecords({
      [challengeRecord.key]: challengeRecord,
      'campaign:primarie-website-url::entity:4305857': {
        key: 'campaign:primarie-website-url::entity:4305857',
        interactionId: 'campaign:primarie-website-url',
        lessonId: 'civic-monitor-and-request',
        kind: 'custom',
        scope: { type: 'entity', entityCui: '4305857' },
        completionRule: { type: 'resolved' },
        phase: 'failed',
        value: {
          kind: 'json',
          json: { value: { websiteUrl: 'https://example.com' } },
        },
        result: null,
        review: {
          status: 'rejected',
          reviewedAt: ISO_3,
          feedbackText: 'Please use the official website.',
        },
        updatedAt: ISO_3,
        submittedAt: ISO_1,
      },
    })

    expect(snapshot.challenges['civic-monitor-and-request']).toEqual({
      status: 'in_progress',
      attempts: 2,
      updatedAt: ISO_3,
    })
  })

  it('does not let a newer draft downgrade a completed sibling challenge state', () => {
    const snapshot = projectCampaignProgressFromRecords({
      [getCampaignChallengeRecordKey('civic-monitor-and-request')]: createCampaignChallengeRecord({
        challengeSlug: 'civic-monitor-and-request',
        status: 'completed',
        attempts: 2,
        updatedAt: ISO_2,
      }),
      'campaign:primarie-contact-info::entity:4305857': {
        key: 'campaign:primarie-contact-info::entity:4305857',
        interactionId: PRIMARIE_CONTACT_INFO_INTERACTION.interactionId,
        lessonId: PRIMARIE_CONTACT_INFO_INTERACTION.ownerChallengeSlug,
        kind: 'custom',
        scope: { type: 'entity', entityCui: '4305857' },
        completionRule: { type: 'resolved' },
        phase: 'draft',
        value: {
          kind: 'json',
          json: { value: { email: 'primaria@example.ro' } },
        },
        result: null,
        updatedAt: ISO_3,
        submittedAt: null,
      },
    })

    expect(snapshot.challenges['civic-monitor-and-request']).toEqual({
      status: 'completed',
      attempts: 2,
      updatedAt: ISO_2,
    })
  })

  it('does not let a newer draft downgrade a pending sibling challenge state', () => {
    const snapshot = projectCampaignProgressFromRecords({
      [getCampaignChallengeRecordKey('civic-monitor-and-request')]: createCampaignChallengeRecord({
        challengeSlug: 'civic-monitor-and-request',
        status: 'pending_review',
        attempts: 1,
        updatedAt: ISO_2,
      }),
      'campaign:primarie-contact-info::entity:4305857': {
        key: 'campaign:primarie-contact-info::entity:4305857',
        interactionId: PRIMARIE_CONTACT_INFO_INTERACTION.interactionId,
        lessonId: PRIMARIE_CONTACT_INFO_INTERACTION.ownerChallengeSlug,
        kind: 'custom',
        scope: { type: 'entity', entityCui: '4305857' },
        completionRule: { type: 'resolved' },
        phase: 'draft',
        value: {
          kind: 'json',
          json: { value: { email: 'primaria@example.ro' } },
        },
        result: null,
        updatedAt: ISO_3,
        submittedAt: null,
      },
    })

    expect(snapshot.challenges['civic-monitor-and-request']).toEqual({
      status: 'pending_review',
      attempts: 1,
      updatedAt: ISO_2,
    })
  })

  it('keeps explicit challenge resets authoritative over older tracked interactions', () => {
    const snapshot = projectCampaignProgressFromRecords({
      [getCampaignChallengeRecordKey('civic-monitor-and-request')]: createCampaignChallengeRecord({
        challengeSlug: 'civic-monitor-and-request',
        status: 'not_started',
        attempts: 0,
        updatedAt: ISO_3,
      }),
      'campaign:primarie-website-url::entity:4305857': {
        key: 'campaign:primarie-website-url::entity:4305857',
        interactionId: PRIMARIE_WEBSITE_LINK_INTERACTION.interactionId,
        lessonId: PRIMARIE_WEBSITE_LINK_INTERACTION.ownerChallengeSlug,
        kind: 'custom',
        scope: { type: 'entity', entityCui: '4305857' },
        completionRule: { type: 'resolved' },
        phase: 'pending',
        value: {
          kind: 'json',
          json: { value: { websiteUrl: 'https://example.com' } },
        },
        result: null,
        updatedAt: ISO_2,
        submittedAt: ISO_2,
      },
    })

    expect(snapshot.challenges['civic-monitor-and-request']).toBeUndefined()
  })

  it('projects the strongest sibling interaction when no aggregate record exists', () => {
    const snapshot = projectCampaignProgressFromRecords({
      'campaign:primarie-contact-info::entity:4305857': {
        key: 'campaign:primarie-contact-info::entity:4305857',
        interactionId: PRIMARIE_CONTACT_INFO_INTERACTION.interactionId,
        lessonId: PRIMARIE_CONTACT_INFO_INTERACTION.ownerChallengeSlug,
        kind: 'custom',
        scope: { type: 'entity', entityCui: '4305857' },
        completionRule: { type: 'resolved' },
        phase: 'draft',
        value: {
          kind: 'json',
          json: { value: { email: 'primaria@example.ro' } },
        },
        result: null,
        updatedAt: ISO_3,
        submittedAt: null,
      },
      'campaign:budget-document-url::entity:4305857': {
        key: 'campaign:budget-document-url::entity:4305857',
        interactionId: BUDGET_DOCUMENT_LINK_INTERACTION.interactionId,
        lessonId: BUDGET_DOCUMENT_LINK_INTERACTION.ownerChallengeSlug,
        kind: 'custom',
        scope: { type: 'entity', entityCui: '4305857' },
        completionRule: { type: 'resolved' },
        phase: 'pending',
        value: {
          kind: 'json',
          json: { value: { documentUrl: 'https://example.com/document.pdf' } },
        },
        result: null,
        updatedAt: ISO_1,
        submittedAt: ISO_1,
      },
    })

    expect(snapshot.challenges['civic-monitor-and-request']).toEqual({
      status: 'pending_review',
      attempts: 0,
      updatedAt: ISO_1,
    })
  })

  it('prefers the latest record when merging record maps', () => {
    const entityTermsKey = getCampaignEntityAcceptedTermsRecordKey('11111111')
    const local = {
      [entityTermsKey]: createCampaignEntityAcceptedTermsRecord({
        entityCui: '11111111',
        acceptedTermsAt: ISO_3,
        updatedAt: ISO_3,
      }),
      [CAMPAIGN_SELECTED_ENTITY_RECORD_KEY]: createCampaignSelectedEntityRecord({
        entityCui: '11111111',
        updatedAt: ISO_3,
      }),
    }
    const remote = {
      [entityTermsKey]: createCampaignEntityAcceptedTermsRecord({
        entityCui: '11111111',
        acceptedTermsAt: ISO_1,
        updatedAt: ISO_1,
      }),
      [CAMPAIGN_SELECTED_ENTITY_RECORD_KEY]: createCampaignSelectedEntityRecord({
        entityCui: '22222222',
        updatedAt: ISO_1,
      }),
      [getCampaignChallengeRecordKey('challenge-1')]: createCampaignChallengeRecord({
        challengeSlug: 'challenge-1',
        status: 'in_progress',
        attempts: 1,
        updatedAt: ISO_2,
      }),
    }

    const merged = mergeCampaignProgressRecords(local, remote)

    expect(merged[entityTermsKey]?.updatedAt).toBe(ISO_3)
    expect(merged[CAMPAIGN_SELECTED_ENTITY_RECORD_KEY]?.value).toEqual({
      kind: 'json',
      json: { value: { entityCui: '11111111' } },
    })
    expect(merged[getCampaignChallengeRecordKey('challenge-1')]?.updatedAt).toBe(ISO_2)
  })

  it('keeps reset/default challenge records out of the sparse challenges map', () => {
    const snapshot = projectCampaignProgressFromRecords({
      [getCampaignChallengeRecordKey('challenge-1')]: createCampaignChallengeRecord({
        challengeSlug: 'challenge-1',
        status: 'not_started',
        attempts: 0,
        updatedAt: ISO_2,
      }),
    })

    expect(snapshot.challenges).toEqual({})
  })

  it('identifies newer or missing records for sync', () => {
    const candidate = {
      [CAMPAIGN_SELECTED_ENTITY_RECORD_KEY]: createCampaignSelectedEntityRecord({
        entityCui: '11111111',
        updatedAt: ISO_3,
      }),
      [CAMPAIGN_ACTIVE_MODULE_RECORD_KEY]: createCampaignActiveModuleRecord({
        moduleSlug: 'read-local-execution',
        updatedAt: ISO_2,
      }),
    }
    const baseline = {
      [CAMPAIGN_SELECTED_ENTITY_RECORD_KEY]: createCampaignSelectedEntityRecord({
        entityCui: '11111111',
        updatedAt: ISO_1,
      }),
    }

    const diff = diffCampaignProgressRecords(candidate, baseline)

    expect(diff.map((record) => record.key).sort()).toEqual([
      CAMPAIGN_ACTIVE_MODULE_RECORD_KEY,
      CAMPAIGN_SELECTED_ENTITY_RECORD_KEY,
    ])
  })

  it('rebuilds records from a projected snapshot and reapplies pending events', () => {
    const snapshot = {
      ...getEmptyCampaignProgressSnapshot(),
      acceptedTermsByEntity: { '12345678': ISO_1 },
      selectedEntityCui: '12345678',
      lastUpdated: ISO_1,
    }

    const records = buildCampaignProgressRecords(snapshot)
    const nextRecords = applyCampaignProgressEventsToRecords(records, [{
      eventId: 'event-1',
      clientId: 'client-1',
      occurredAt: ISO_2,
      type: 'interactive.updated',
      payload: {
        record: createCampaignActiveModuleRecord({
          moduleSlug: 'budget-basics',
          updatedAt: ISO_2,
        }),
      },
    }])

    const projected = projectCampaignProgressFromRecords(nextRecords)

    expect(projected.acceptedTermsByEntity['12345678']).toBe(ISO_1)
    expect(projected.selectedEntityCui).toBe('12345678')
    expect(projected.activeChallengeModuleSlug).toBe('budget-basics')
  })
})
