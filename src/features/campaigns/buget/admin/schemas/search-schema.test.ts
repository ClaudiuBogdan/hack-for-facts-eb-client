import { describe, expect, it } from 'vitest'
import {
  buildCampaignAdminQueueSearchFromDraft,
  createEmptyCampaignAdminQueueSearch,
  isCampaignAdminFilterDraftEqual,
  normalizeCampaignAdminQueueSearch,
  normalizeCampaignAdminUserPageSearch,
  normalizeCampaignAdminUsersSearch,
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

  it('normalizes users route search defaults', () => {
    expect(normalizeCampaignAdminUsersSearch({})).toEqual({
      limit: 50,
      sortBy: 'latestUpdatedAt',
      sortOrder: 'desc',
    })
  })

  it('trims users query text and keeps paging state', () => {
    expect(
      normalizeCampaignAdminUsersSearch({
        query: '  user-1  ',
        cursor: 'cursor-1',
        pageIndex: '2',
        sortBy: 'interactionCount',
        sortOrder: 'asc',
        limit: '25',
      })
    ).toEqual({
      query: 'user-1',
      cursor: 'cursor-1',
      pageIndex: 2,
      sortBy: 'interactionCount',
      sortOrder: 'asc',
      limit: 25,
    })
  })

  it('maps legacy child-route updatedAt sorting to the users sort key', () => {
    expect(
      normalizeCampaignAdminUsersSearch({
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      })
    ).toEqual({
      limit: 50,
      sortBy: 'latestUpdatedAt',
      sortOrder: 'desc',
    })
  })

  it('ignores child-only sort keys on the users route instead of throwing', () => {
    expect(
      normalizeCampaignAdminUsersSearch({
        sortBy: 'reviewStatus',
        sortOrder: 'asc',
      })
    ).toEqual({
      limit: 50,
      sortBy: 'latestUpdatedAt',
      sortOrder: 'asc',
    })
  })

  it('maps inherited users-route latestUpdatedAt sorting to the user page sort key', () => {
    expect(
      normalizeCampaignAdminUserPageSearch({
        sortBy: 'latestUpdatedAt',
        sortOrder: 'desc',
      })
    ).toEqual({
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    })
  })

  it('ignores users-only sort keys on the user page instead of throwing', () => {
    expect(
      normalizeCampaignAdminUserPageSearch({
        sortBy: 'interactionCount',
        sortOrder: 'asc',
      })
    ).toEqual({
      sortBy: 'updatedAt',
      sortOrder: 'asc',
    })
  })
})
