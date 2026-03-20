import { beforeEach, describe, expect, it, vi } from 'vitest'

const routeStub = vi.fn((options: Record<string, unknown>) => options)
const notFoundMock = vi.fn(() => new Error('NOT_FOUND'))
const resolveCampaignLocaleMock = vi.fn(() => 'ro')
const getChallengeModuleBySlugMock = vi.fn()
const preloadChallengeStepContentMock = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => routeStub,
  notFound: notFoundMock,
}))

vi.mock(
  '@/features/campaigns/buget/schemas/campaign-route-search-schema',
  () => ({
    CampaignRouteSearchSchema: {},
    resolveCampaignLocale: resolveCampaignLocaleMock,
  }),
)

vi.mock('@/features/campaigns/buget/seo/campaign-seo', () => ({
  buildCampaignRouteHead: vi.fn(() => ({ meta: [] })),
}))

vi.mock('@/lib/http-cache', () => ({
  createPublicPageCacheHeaders: vi.fn(() => ({})),
}))

vi.mock('@/features/challenges/utils/modules', () => ({
  getChallengeModuleBySlug: getChallengeModuleBySlugMock,
}))

vi.mock('@/features/challenges/utils/challenge-step-content-resolver', () => ({
  preloadChallengeStepContent: preloadChallengeStepContentMock,
}))

describe('challenge step route loader', () => {
  beforeEach(() => {
    vi.resetModules()
    routeStub.mockClear()
    notFoundMock.mockClear()
    resolveCampaignLocaleMock.mockReset()
    getChallengeModuleBySlugMock.mockReset()
    preloadChallengeStepContentMock.mockReset()
    resolveCampaignLocaleMock.mockReturnValue('ro')
    preloadChallengeStepContentMock.mockResolvedValue(undefined)
  })

  it('preloads the selected challenge step content for SSR', async () => {
    getChallengeModuleBySlugMock.mockReturnValue({
      challenges: [
        {
          slug: 'challenge-a',
          steps: [
            {
              slug: 'step-a',
              contentDir: 'budget-basics/step-a',
            },
          ],
        },
      ],
    })

    const { Route } = await import('./$stepSlug')
    const routeWithLoader = Route as unknown as {
      loader: (input: Record<string, unknown>) => Promise<Record<string, unknown>>
      pendingMs: number
      pendingMinMs: number
    }

    await expect(
      routeWithLoader.loader({
        params: {
          cui: '123',
          moduleSlug: 'module-a',
          challengeSlug: 'challenge-a',
          stepSlug: 'step-a',
        },
        deps: {
          section: 'intro',
          view: 'section',
        },
        location: {
          search: { lang: 'ro' },
        },
      }),
    ).resolves.toEqual({
      section: 'intro',
      view: 'section',
    })

    expect(getChallengeModuleBySlugMock).toHaveBeenCalledWith('module-a')
    expect(resolveCampaignLocaleMock).toHaveBeenCalledWith({ lang: 'ro' })
    expect(preloadChallengeStepContentMock).toHaveBeenCalledWith({
      contentDir: 'budget-basics/step-a',
      locale: 'ro',
    })
    expect(routeWithLoader.pendingMs).toBe(0)
    expect(routeWithLoader.pendingMinMs).toBe(250)
  })

  it('throws notFound when the module, challenge, or step is missing', async () => {
    const { Route } = await import('./$stepSlug')
    const routeWithLoader = Route as unknown as {
      loader: (input: Record<string, unknown>) => Promise<Record<string, unknown>>
      pendingMs: number
      pendingMinMs: number
    }

    getChallengeModuleBySlugMock.mockReturnValue(null)
    await expect(
      routeWithLoader.loader({
        params: {
          cui: '123',
          moduleSlug: 'missing-module',
          challengeSlug: 'challenge-a',
          stepSlug: 'step-a',
        },
        deps: {},
        location: { search: {} },
      }),
    ).rejects.toThrow('NOT_FOUND')

    getChallengeModuleBySlugMock.mockReturnValue({ challenges: [] })
    await expect(
      routeWithLoader.loader({
        params: {
          cui: '123',
          moduleSlug: 'module-a',
          challengeSlug: 'missing-challenge',
          stepSlug: 'step-a',
        },
        deps: {},
        location: { search: {} },
      }),
    ).rejects.toThrow('NOT_FOUND')

    getChallengeModuleBySlugMock.mockReturnValue({
      challenges: [
        {
          slug: 'challenge-a',
          steps: [],
        },
      ],
    })
    await expect(
      routeWithLoader.loader({
        params: {
          cui: '123',
          moduleSlug: 'module-a',
          challengeSlug: 'challenge-a',
          stepSlug: 'missing-step',
        },
        deps: {},
        location: { search: {} },
      }),
    ).rejects.toThrow('NOT_FOUND')

    expect(preloadChallengeStepContentMock).not.toHaveBeenCalled()
  })
})
