import type { ReactNode } from 'react'
import { render, screen } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChallengeModulePage } from './ChallengeModulePage'

const mockUseChallengeAccess = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={typeof to === 'string' ? to : '#'} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/lib/auth', () => ({
  AuthSignInButton: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('@/config/env', () => ({
  env: {
    VITE_DISCOURSE_BASE_URL: 'https://forum.example.com',
  },
}))

vi.mock('../../hooks/use-challenge-access', () => ({
  useChallengeAccess: () => mockUseChallengeAccess(),
}))

vi.mock('../../hooks/use-challenge-progress', () => ({
  useChallengeProgress: () => ({
    getStepStatus: () => 'not_started',
    isStepCompleted: () => false,
  }),
}))

const moduleDefinition = {
  id: 'module-1',
  slug: 'test-module',
  title: { ro: 'Test module', en: 'Test module' },
  description: { ro: 'Test description', en: 'Test description' },
  challenges: [
    {
      id: 'challenge-1',
      slug: 'test-challenge',
      title: { ro: 'Test challenge', en: 'Test challenge' },
      description: { ro: 'Challenge description', en: 'Challenge description' },
      steps: [
        {
          id: 'step-1',
          slug: 'test-step',
          title: { ro: 'Test step', en: 'Test step' },
          durationMinutes: 5,
          discourseTopicId: 123,
          discourseTopicSlug: 'test-step-discussion',
        },
      ],
    },
  ],
}

vi.mock('../../utils/modules', () => ({
  getAllSteps: () => moduleDefinition.challenges.flatMap((challenge) => challenge.steps),
  getChallengeModuleBySlug: () => moduleDefinition,
  getChallengeModuleStats: () => ({
    completedCount: 0,
    totalCount: 1,
    completionPercentage: 0,
    nextChallengeSlug: 'test-challenge',
    nextStep: {
      slug: 'test-step',
    },
  }),
  getTranslatedText: (value: { ro: string; en: string }) => value.ro,
}))

describe('ChallengeModulePage', () => {
  beforeEach(() => {
    mockUseChallengeAccess.mockReturnValue({
      accessCardVariant: 'auth',
      isAccessGranted: false,
      isSubmitting: false,
      register: vi.fn(),
    })
  })

  it('keeps the module overview visible while gating the CTA', () => {
    render(
      <ChallengeModulePage
        entityCui="12345678"
        locale="ro"
        moduleSlug="test-module"
      />,
    )

    expect(screen.getByRole('heading', { name: /Test module/i })).toBeInTheDocument()
    expect(screen.getByText('Test challenge')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Test step/i })).toHaveAttribute(
      'href',
      '/primarie/12345678/buget/provocari/test-module/test-challenge/test-step',
    )
    expect(
      screen.getByRole('heading', { name: /Conectează-te ca să participi la provocări/i }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^Start$/i })).not.toBeInTheDocument()
  })

  it('renders a forum link for steps with synced discourse metadata', () => {
    render(
      <ChallengeModulePage
        entityCui="12345678"
        locale="ro"
        moduleSlug="test-module"
      />,
    )

    expect(screen.getByRole('link', { name: /Open discussion/i })).toHaveAttribute(
      'href',
      'https://forum.example.com/t/test-step-discussion/123',
    )
  })
})
