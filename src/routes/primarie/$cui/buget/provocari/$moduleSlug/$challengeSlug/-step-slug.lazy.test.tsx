import type { ComponentType } from 'react'
import { render, screen } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', () => ({
  createLazyFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    options,
  }),
  useNavigate: () => vi.fn(),
}))

vi.mock('@/features/campaigns/buget/schemas/campaign-route-search-schema', () => ({
  resolveCampaignLocale: () => 'ro',
}))

vi.mock('@/features/challenges/components/player/ChallengeStepPlayer', () => ({
  ChallengeStepPlayer: () => <div>Challenge step player</div>,
}))

vi.mock('@/features/challenges/components/player/challenge-step-pending-shell', () => ({
  ChallengeStepPendingShell: () => <div>Challenge pending shell</div>,
}))

vi.mock('@/features/challenges/utils/challenge-step-route-search', () => ({
  resolveChallengeStepRouteSearch: () => ({
    section: undefined,
    view: undefined,
  }),
  buildChallengeStepRouteLoaderData: vi.fn(),
}))

describe('challenge step lazy route', () => {
  it('registers a route pending component for challenge step transitions', async () => {
    const { Route } = await import('./$stepSlug.lazy')

    expect(Route.options.pendingComponent).toBeTypeOf('function')

    const PendingComponent = Route.options.pendingComponent as ComponentType
    render(<PendingComponent />)

    expect(screen.getByText('Challenge pending shell')).toBeInTheDocument()
  })
})
