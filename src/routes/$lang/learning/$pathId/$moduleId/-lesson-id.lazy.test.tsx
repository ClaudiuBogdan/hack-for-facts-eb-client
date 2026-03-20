import type { ComponentType } from 'react'
import { render, screen } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', () => ({
  createLazyFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    options,
  }),
}))

vi.mock('@/features/learning/components/player/LessonPlayer', () => ({
  LessonPlayer: () => <div>Lesson player</div>,
}))

vi.mock('@/features/learning/components/player/lesson-player-shell', () => ({
  LessonRoutePending: () => <div>Learning pending shell</div>,
}))

vi.mock('@/features/learning/hooks/use-auto-onboarding', () => ({
  useAutoOnboarding: vi.fn(),
}))

describe('learning lesson lazy route', () => {
  it('registers a route pending component for lesson transitions', async () => {
    const { Route } = await import('./$lessonId.lazy')

    expect(Route.options.pendingComponent).toBeTypeOf('function')

    const PendingComponent = Route.options.pendingComponent as ComponentType
    render(<PendingComponent />)

    expect(screen.getByText('Learning pending shell')).toBeInTheDocument()
  })
})
