import { describe, expect, it } from 'vitest'
import {
  BUDGET_PUBLICATION_TIMELINE_ENTRY_ID,
  resolveCampaignTimelineOverride,
} from './campaign-timeline-override'

describe('resolveCampaignTimelineOverride', () => {
  it('prefers the configured budget publication date over other sources', () => {
    expect(
      resolveCampaignTimelineOverride({
        baseOverride: {
          [BUDGET_PUBLICATION_TIMELINE_ENTRY_ID]: '2026-01-18',
        },
        configBudgetPublicationDate: '2026-01-15',
        userBudgetPublicationDate: '2026-01-20',
      }),
    ).toEqual({
      [BUDGET_PUBLICATION_TIMELINE_ENTRY_ID]: '2026-01-15',
    })
  })

  it('keeps existing override entries and only fills the publication date from the user when needed', () => {
    expect(
      resolveCampaignTimelineOverride({
        baseOverride: {
          'vot-aprobare-buget-local': '2026-02-10',
        },
        userBudgetPublicationDate: '2026-01-20',
      }),
    ).toEqual({
      'vot-aprobare-buget-local': '2026-02-10',
      [BUDGET_PUBLICATION_TIMELINE_ENTRY_ID]: '2026-01-20',
    })
  })

  it('returns the base override unchanged when it already has the publication date and no config is present', () => {
    expect(
      resolveCampaignTimelineOverride({
        baseOverride: {
          [BUDGET_PUBLICATION_TIMELINE_ENTRY_ID]: '2026-01-18',
        },
        userBudgetPublicationDate: '2026-01-20',
      }),
    ).toEqual({
      [BUDGET_PUBLICATION_TIMELINE_ENTRY_ID]: '2026-01-18',
    })
  })

  it('returns undefined when no override source exists', () => {
    expect(resolveCampaignTimelineOverride({})).toBeUndefined()
  })
})
