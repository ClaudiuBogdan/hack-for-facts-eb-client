import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChallengesHubPage } from './ChallengesHubPage'

type MockAuthState = {
  isEnabled: boolean
  isLoaded: boolean
  isSignedIn: boolean
}

type MockRegistrationState = {
  isReady: boolean
  isRegistered: boolean
  isSubmitting: boolean
  register: () => Promise<void>
}

let authState: MockAuthState = {
  isEnabled: true,
  isLoaded: true,
  isSignedIn: false,
}

const registerMock = vi.fn(async () => {})

let registrationState: MockRegistrationState = {
  isReady: true,
  isRegistered: false,
  isSubmitting: false,
  register: registerMock,
}

let allStepsCompleted = false

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, search, ...props }: any) => {
    const href = typeof to === 'string'
      ? `${to}${search?.lang === 'en' ? '?lang=en' : ''}`
      : '#'

    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  },
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => authState,
  AuthSignInButton: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('@/features/campaigns/buget/hooks/use-campaign-registration', () => ({
  useCampaignRegistration: () => registrationState,
}))

vi.mock('../../hooks/use-challenge-progress', () => ({
  useChallengeProgress: () => ({
    getStepStatus: () => (allStepsCompleted ? 'completed' : 'not_started'),
    isStepCompleted: () => allStepsCompleted,
  }),
}))

vi.mock('../cards/ChallengeModuleCard', () => ({
  ChallengeModuleCard: ({ variant }: { variant: 'active' | 'other' }) => (
    <div data-testid={`module-card-${variant}`}>{variant}</div>
  ),
}))

vi.mock('./BudgetTimelineStrip', () => ({
  BudgetTimelineStrip: () => <div>Budget Timeline</div>,
}))

vi.mock('./QuickResourcesPreview', () => ({
  QuickResourcesPreview: () => <div>Quick Resources</div>,
}))

vi.mock('./UatSwitchBadge', () => ({
  UatSwitchBadge: () => <div>Change Entity</div>,
}))

describe('ChallengesHubPage', () => {
  beforeEach(() => {
    authState = {
      isEnabled: true,
      isLoaded: true,
      isSignedIn: false,
    }
    registerMock.mockClear()
    registrationState = {
      isReady: true,
      isRegistered: false,
      isSubmitting: false,
      register: registerMock,
    }
    allStepsCompleted = false
  })

  it('shows the auth hero for signed-out users while keeping the rest of the hub visible', () => {
    render(<ChallengesHubPage entityCui="12345678" locale="ro" />)

    expect(
      screen.getByRole('heading', { name: /Conectează-te ca să participi la provocări/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Conectează-te/i })).toBeInTheDocument()
    expect(screen.queryByTestId('module-card-active')).not.toBeInTheDocument()
    expect(screen.getByText('Budget Timeline')).toBeInTheDocument()
    expect(screen.getByText('Quick Resources')).toBeInTheDocument()
    expect(screen.getAllByTestId('module-card-other').length).toBeGreaterThan(0)
  })

  it('shows the registration hero and requires checkbox consent before registering', () => {
    authState = {
      isEnabled: true,
      isLoaded: true,
      isSignedIn: true,
    }

    render(<ChallengesHubPage entityCui="12345678" locale="ro" />)

    expect(
      screen.getByRole('heading', { name: /Activează participarea în campanie/i }),
    ).toBeInTheDocument()

    const registerButton = screen.getByRole('button', {
      name: /Mă înscriu în campanie/i,
    })

    expect(registerButton).toBeDisabled()
    expect(screen.getByRole('link', { name: /termenii campaniei/i })).toHaveAttribute(
      'href',
      '/terms',
    )

    fireEvent.click(screen.getByRole('checkbox'))
    expect(registerButton).toBeEnabled()

    fireEvent.click(registerButton)
    expect(registerMock).toHaveBeenCalledTimes(1)
  })

  it('shows the active challenge hero for registered users', () => {
    authState = {
      isEnabled: true,
      isLoaded: true,
      isSignedIn: true,
    }
    registrationState = {
      isReady: true,
      isRegistered: true,
      isSubmitting: false,
      register: registerMock,
    }

    render(<ChallengesHubPage entityCui="12345678" locale="ro" />)

    expect(screen.getByTestId('module-card-active')).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: /Activează participarea în campanie/i }),
    ).not.toBeInTheDocument()
  })

  it('bypasses auth gating when authentication is disabled', () => {
    authState = {
      isEnabled: false,
      isLoaded: true,
      isSignedIn: false,
    }

    render(<ChallengesHubPage entityCui="12345678" locale="ro" />)

    expect(screen.getByTestId('module-card-active')).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: /Conectează-te ca să participi/i }),
    ).not.toBeInTheDocument()
  })

  it('keeps the completed campaign state for registered users', () => {
    authState = {
      isEnabled: true,
      isLoaded: true,
      isSignedIn: true,
    }
    registrationState = {
      isReady: true,
      isRegistered: true,
      isSubmitting: false,
      register: registerMock,
    }
    allStepsCompleted = true

    render(<ChallengesHubPage entityCui="12345678" locale="ro" />)

    expect(screen.getByText('Congratulations!')).toBeInTheDocument()
    expect(screen.queryByTestId('module-card-active')).not.toBeInTheDocument()
  })
})
