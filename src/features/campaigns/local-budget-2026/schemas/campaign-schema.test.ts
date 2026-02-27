import { describe, expect, it } from 'vitest'
import { parseCampaignDefinition } from './campaign-schema'

describe('campaign-schema', () => {
  it('parses a valid campaign definition', () => {
    const campaign = parseCampaignDefinition({
      id: 'bugete-locale-2026',
      slug: 'bugete-locale-2026',
      title: { ro: 'Campanie', en: 'Campaign' },
      description: { ro: 'Descriere', en: 'Description' },
      forumUrl: 'https://forum.transparenta.eu/tag/bugete-locale-2026',
      isActive: true,
      startDate: '2026-02-01',
      endDate: '2026-03-01',
    })

    expect(campaign.slug).toBe('bugete-locale-2026')
    expect(campaign.title.ro).toBe('Campanie')
  })

  it('rejects invalid date ordering', () => {
    expect(() =>
      parseCampaignDefinition({
        id: 'bugete-locale-2026',
        slug: 'bugete-locale-2026',
        title: { ro: 'Campanie' },
        description: { ro: 'Descriere' },
        forumUrl: 'https://forum.transparenta.eu/tag/bugete-locale-2026',
        isActive: true,
        startDate: '2026-05-01',
        endDate: '2026-03-01',
      }),
    ).toThrow()
  })
})
