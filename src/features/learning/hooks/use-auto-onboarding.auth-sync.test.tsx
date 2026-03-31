import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAutoOnboarding } from './use-auto-onboarding'

const saveOnboardingMock = vi.fn(async () => {})

const learningProgressState = {
  isReady: true,
  bootstrapPhase: 'loading' as 'loading' | 'ready' | 'failed',
  progress: {
    onboarding: {
      completedAt: null,
    },
  },
  saveOnboarding: saveOnboardingMock,
}

vi.mock('./use-learning-progress', () => ({
  useLearningProgress: () => learningProgressState,
}))

vi.mock('../utils/paths', () => ({
  getLearningPathById: (pathId: string) => {
    return pathId === 'budget-basics' ? { id: pathId } : null
  },
}))

describe('useAutoOnboarding auth sync guard', () => {
  beforeEach(() => {
    saveOnboardingMock.mockClear()
    learningProgressState.isReady = true
    learningProgressState.bootstrapPhase = 'loading'
    learningProgressState.progress.onboarding.completedAt = null
  })

  it('waits for auth-synced progress before auto-completing onboarding', () => {
    const { rerender } = renderHook(() => useAutoOnboarding({ pathId: 'budget-basics' }))

    expect(saveOnboardingMock).not.toHaveBeenCalled()

    learningProgressState.bootstrapPhase = 'ready'
    rerender()

    expect(saveOnboardingMock).toHaveBeenCalledWith({ pathId: 'budget-basics' })
  })
})
