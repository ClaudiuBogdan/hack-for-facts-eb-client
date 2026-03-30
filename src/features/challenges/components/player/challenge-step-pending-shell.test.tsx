import { render, screen } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { ChallengeStepPendingShell } from './challenge-step-pending-shell'

vi.mock('@/features/learning/components/loading/LessonSkeleton', () => ({
  LessonSkeleton: () => <div data-testid="lesson-skeleton">Loading skeleton</div>,
}))

describe('ChallengeStepPendingShell', () => {
  it('renders with the correct testid', () => {
    render(<ChallengeStepPendingShell />)

    expect(screen.getByTestId('challenge-step-pending-shell')).toBeInTheDocument()
  })

  it('renders the lesson skeleton', () => {
    render(<ChallengeStepPendingShell />)

    expect(screen.getByTestId('lesson-skeleton')).toBeInTheDocument()
  })
})
