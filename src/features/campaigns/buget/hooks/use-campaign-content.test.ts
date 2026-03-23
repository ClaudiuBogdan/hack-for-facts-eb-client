import { describe, expect, it } from 'vitest'
import {
  getCampaignDefinition,
  getCampaignResources,
  getCampaignTimelineDefinition,
} from './use-campaign-content'

describe('use-campaign-content', () => {
  it('loads campaign static definitions', () => {
    const campaign = getCampaignDefinition()
    const timeline = getCampaignTimelineDefinition()
    const resources = getCampaignResources()

    expect(campaign.id).toBe('buget')
    expect(timeline.entries.length).toBeGreaterThan(0)
    expect(resources.length).toBeGreaterThan(0)
  })
})
