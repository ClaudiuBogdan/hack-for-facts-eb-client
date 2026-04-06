import { describe, expect, it } from 'vitest'
import { parseCampaignDefinition } from './campaign-schema'

describe('campaign-schema', () => {
  it('parses a valid campaign definition', () => {
    const campaign = parseCampaignDefinition({
      id: 'buget',
      slug: 'buget',
      title: { ro: 'Campanie', en: 'Campaign' },
      description: { ro: 'Descriere', en: 'Description' },
      forumUrl: 'https://forum.transparenta.eu/c/cu-ochii-pe-bugetele-locale/7',
      isActive: true,
      startDate: '2026-02-01',
      endDate: '2026-03-01',
    })

    expect(campaign.slug).toBe('buget')
    expect(campaign.title.ro).toBe('Campanie')
  })

  it('rejects invalid date ordering', () => {
    expect(() =>
      parseCampaignDefinition({
        id: 'buget',
        slug: 'buget',
        title: { ro: 'Campanie' },
        description: { ro: 'Descriere' },
        forumUrl: 'https://forum.transparenta.eu/c/cu-ochii-pe-bugetele-locale/7',
        isActive: true,
        startDate: '2026-05-01',
        endDate: '2026-03-01',
      }),
    ).toThrow()
  })
})
