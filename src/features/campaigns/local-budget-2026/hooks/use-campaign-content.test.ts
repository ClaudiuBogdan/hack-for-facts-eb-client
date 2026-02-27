import { describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import {
  getCampaignChallengeBySlug,
  getCampaignChallengeList,
  getCampaignDefinition,
  getCampaignResources,
  getCampaignTimelineDefinition,
  useCampaignChallengeContent,
} from './use-campaign-content'

vi.mock('./campaign-challenge-mdx-index', () => ({
  campaignChallengeMdxModules: {
    '/src/content/campaigns/bugete-locale-2026/challenges/cauta-bugetul-localitatii-tale/index.ro.mdx': {
      default: () => null,
    },
  },
}))

describe('use-campaign-content', () => {
  it('loads campaign static definitions', () => {
    const campaign = getCampaignDefinition()
    const timeline = getCampaignTimelineDefinition()
    const resources = getCampaignResources()
    const challenges = getCampaignChallengeList()

    expect(campaign.id).toBe('bugete-locale-2026')
    expect(timeline.entries.length).toBeGreaterThan(0)
    expect(resources.length).toBeGreaterThan(0)
    expect(challenges.length).toBeGreaterThan(0)
  })

  it('returns null for unknown challenge slug', () => {
    const challenge = getCampaignChallengeBySlug('unknown-challenge-slug')
    expect(challenge).toBeNull()
  })

  it('resolves challenge content with locale fallback for SSR-safe rendering', () => {
    const { result } = renderHook(() =>
      useCampaignChallengeContent({
        challengeSlug: 'cauta-bugetul-localitatii-tale',
        locale: 'en',
      }),
    )

    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.Component).toBeTruthy()
  })
})
