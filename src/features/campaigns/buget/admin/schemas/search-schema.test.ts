import { describe, expect, it } from 'vitest'
import {
  buildCampaignAdminQueueSearchFromDraft,
  createEmptyCampaignAdminQueueSearch,
  isCampaignAdminFilterDraftEqual,
  normalizeCampaignAdminQueueSearch,
} from './search-schema'

describe('campaign admin search schema', () => {
  it('normalizes empty inputs to the default page limit', () => {
    expect(normalizeCampaignAdminQueueSearch({})).toEqual({
      limit: 50,
      reviewStatus: 'pending',
    })
  })

  it('converts date inputs into UTC range boundaries', () => {
    const nextSearch = buildCampaignAdminQueueSearchFromDraft(
      {
        phase: '',
        reviewStatus: '',
        interactionId: '',
        lessonId: '',
        entityCui: '12345678',
        scopeType: '',
        payloadKind: '',
        userId: '',
        recordKey: '',
        recordKeyPrefix: 'funky:interaction:',
        submittedAtFrom: '',
        submittedAtTo: '',
        updatedAtFrom: '2026-04-10',
        updatedAtTo: '2026-04-12',
        hasInstitutionThread: 'true',
        threadPhase: '',
        limit: 25,
      },
      { limit: 25 }
    )

    expect(nextSearch).toEqual({
      reviewStatusMode: 'all',
      entityCui: '12345678',
      recordKeyPrefix: 'funky:interaction:',
      updatedAtFrom: '2026-04-10T00:00:00.000Z',
      updatedAtTo: '2026-04-12T23:59:59.999Z',
      hasInstitutionThread: true,
      limit: 25,
    })
  })

  it('accepts sidebar selection state without changing default queue filters', () => {
    expect(
      normalizeCampaignAdminQueueSearch({
        reviewSelectionKey: 'user-1::funky:interaction:public_debate_request::entity:12345678',
      })
    ).toEqual({
      limit: 50,
      reviewStatus: 'pending',
      reviewSelectionKey: 'user-1::funky:interaction:public_debate_request::entity:12345678',
    })
  })

  it('ignores sidebar selection state when comparing filter equality', () => {
    expect(
      isCampaignAdminFilterDraftEqual(
        { limit: 50, reviewStatus: 'pending' },
        {
          limit: 50,
          reviewStatus: 'pending',
          reviewSelectionKey: 'user-1::funky:interaction:public_debate_request::entity:12345678',
        }
      )
    ).toBe(true)
  })

  it('accepts cursor and pageIndex route state without changing default filters', () => {
    expect(
      normalizeCampaignAdminQueueSearch({
        cursor: 'cursor-1',
        pageIndex: '2',
        reviewSelectionKey:
          'user-1::funky:interaction:public_debate_request::entity:12345678',
      })
    ).toEqual({
      limit: 50,
      reviewStatus: 'pending',
      cursor: 'cursor-1',
      pageIndex: 2,
      reviewSelectionKey:
        'user-1::funky:interaction:public_debate_request::entity:12345678',
    })
  })

  it('ignores cursor and pageIndex when comparing filter equality', () => {
    expect(
      isCampaignAdminFilterDraftEqual(
        { limit: 50, reviewStatus: 'pending' },
        {
          limit: 50,
          reviewStatus: 'pending',
          cursor: 'cursor-1',
          pageIndex: 2,
        }
      )
    ).toBe(true)
  })

  it('preserves an explicit all-status search instead of defaulting back to pending', () => {
    expect(
      normalizeCampaignAdminQueueSearch({
        reviewStatusMode: 'all',
      })
    ).toEqual({
      limit: 50,
      reviewStatusMode: 'all',
    })
  })

  it('does not preserve an inherited submission path when applying visible filters', () => {
    expect(
      buildCampaignAdminQueueSearchFromDraft(
        {
          phase: '',
          reviewStatus: '',
          interactionId: '',
          lessonId: '',
          entityCui: '12345678',
          scopeType: '',
          payloadKind: '',
          userId: '',
          recordKey: '',
          recordKeyPrefix: '',
          submittedAtFrom: '',
          submittedAtTo: '',
          updatedAtFrom: '',
          updatedAtTo: '',
          hasInstitutionThread: '',
          threadPhase: '',
          limit: 50,
        },
        {
          limit: 50,
          reviewStatus: 'pending',
          submissionPath: 'send_email',
        }
      )
    ).toEqual({
      reviewStatusMode: 'all',
      entityCui: '12345678',
      limit: 50,
    })
  })

  it('does not preserve an inherited submission path when resetting filters', () => {
    expect(
      createEmptyCampaignAdminQueueSearch(25, {
        limit: 25,
        entityCui: '12345678',
        submissionPath: 'send_email',
      })
    ).toEqual({
      limit: 25,
      reviewStatus: 'pending',
    })
  })
})
