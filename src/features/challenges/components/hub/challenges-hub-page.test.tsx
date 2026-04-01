import type { ReactNode } from 'react'
import { fireEvent, render, screen, waitFor } from '@/test/test-utils'
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

let stepStatuses: Record<string, 'completed' | 'not_started'> = {}
let activeChallengeModuleSlug: string | null = null
const getEntityLabelsMock = vi.fn()

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

vi.mock('@/lib/api/labels', () => ({
  getEntityLabels: (...args: unknown[]) => getEntityLabelsMock(...args),
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => authState,
  AuthSignInButton: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('@/features/campaigns/buget/hooks/use-campaign-registration', () => ({
  useCampaignRegistration: () => registrationState,
}))

vi.mock('@/features/campaigns/buget/hooks/use-campaign-progress', () => ({
  useCampaignProgress: () => ({
    progress: {
      activeChallengeModuleSlug,
    },
  }),
}))

vi.mock('../../hooks/use-challenge-progress', () => ({
  useChallengeProgress: () => ({
    getStepStatus: (stepId: string) => stepStatuses[stepId] ?? 'not_started',
    isStepCompleted: (stepId: string) => stepStatuses[stepId] === 'completed',
  }),
}))

vi.mock('../cards/ChallengeModuleCard', () => ({
  ChallengeModuleCard: ({
    variant,
    module,
  }: {
    variant: 'active' | 'other'
    module: { slug: string }
  }) => (
    <div data-testid={`module-card-${variant}`}>
      {variant}:{module.slug}
    </div>
  ),
}))

vi.mock('./BudgetTimelineStrip', () => ({
  BudgetTimelineStrip: () => <div>Budget Timeline</div>,
}))

vi.mock('./QuickResourcesPreview', () => ({
  QuickResourcesPreview: () => <div>Quick Resources</div>,
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
    stepStatuses = {}
    activeChallengeModuleSlug = null
    getEntityLabelsMock.mockReset()
    getEntityLabelsMock.mockResolvedValue([
      { id: '12345678', label: 'Primăria Cluj-Napoca' },
    ])
  })

  it('shows the auth hero for signed-out users while keeping the rest of the hub visible', async () => {
    render(<ChallengesHubPage entityCui="12345678" locale="ro" />)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          name: /Primăria Cluj-Napoca.*Pregătit de provocare/i,
        }),
      ).toBeInTheDocument()
    })
    expect(
      screen.getByRole('heading', { name: /Conectează-te ca să participi la provocări/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Sign in/i }),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('module-card-active')).not.toBeInTheDocument()
    expect(screen.getByText('Budget Timeline')).toBeInTheDocument()
    expect(screen.getByText('Quick Resources')).toBeInTheDocument()
    expect(screen.getAllByTestId('module-card-other').length).toBeGreaterThan(0)
  })

  it('resets the header label when the entity changes and the next lookup has no match', async () => {
    getEntityLabelsMock
      .mockResolvedValueOnce([{ id: '12345678', label: 'Primăria Cluj-Napoca' }])
      .mockResolvedValueOnce([])

    const { rerender } = render(<ChallengesHubPage entityCui="12345678" locale="ro" />)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          name: /Primăria Cluj-Napoca.*Pregătit de provocare/i,
        }),
      ).toBeInTheDocument()
    })

    rerender(<ChallengesHubPage entityCui="87654321" locale="ro" />)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          name: /87654321.*Pregătit de provocare/i,
        }),
      ).toBeInTheDocument()
    })

    expect(screen.queryByText('Primăria Cluj-Napoca')).not.toBeInTheDocument()
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
      name: /Join the campaign/i,
    })

    expect(registerButton).toBeDisabled()
    expect(screen.getByRole('link', { name: /termenii campaniei/i })).toHaveAttribute(
      'href',
      '/provocare/termeni-si-conditii',
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

  it('uses the stored active module slug for the hero when available', () => {
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
    activeChallengeModuleSlug = 'read-local-execution'

    render(<ChallengesHubPage entityCui="12345678" locale="ro" />)

    expect(screen.getByTestId('module-card-active')).toHaveTextContent(
      'active:read-local-execution',
    )
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
    stepStatuses = {
      'ch-civic-01-about-this-challenge': 'completed',
      'ch-civic-02-budget-calendar-and-rights': 'completed',
      'ch-civic-03-budget-status-2026': 'completed',
      'ch-civic-04-debate-request': 'completed',
      'ch-civic-05-participation-report': 'completed',
      'ch-civic-06-contestation': 'completed',
      'ch-budget-basics-01-local-budget': 'completed',
      'ch-budget-basics-02-document-states': 'completed',
      'ch-budget-basics-03-actors-and-timing': 'completed',
      'ch-budget-basics-04-budget-line': 'completed',
      'ch-budget-basics-05-functional-vs-economic': 'completed',
      'ch-budget-basics-06-functioning-vs-development': 'completed',
      'ch-read-local-execution-01-why-execution-matters': 'completed',
      'ch-read-local-execution-02-total-budget-context': 'completed',
      'ch-read-local-execution-03-follow-money': 'completed',
      'ch-read-local-execution-04-functional-economic': 'completed',
      'ch-read-local-execution-05-read-execution-table': 'completed',
      'ch-read-local-execution-06-main-creditor-questions': 'completed',
    }

    render(<ChallengesHubPage entityCui="12345678" locale="ro" />)

    expect(screen.getByTestId('module-card-active')).toHaveTextContent(
      'active:read-local-execution',
    )
    expect(screen.queryByText('Congratulations!')).not.toBeInTheDocument()
  })

  it('shows the active module card when the stored module is complete but others are not', () => {
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
    activeChallengeModuleSlug = 'budget-basics'
    stepStatuses = {
      'ch-budget-basics-01-local-budget': 'completed',
      'ch-budget-basics-02-document-states': 'completed',
      'ch-budget-basics-03-actors-and-timing': 'completed',
      'ch-budget-basics-04-budget-line': 'completed',
      'ch-budget-basics-05-functional-vs-economic': 'completed',
      'ch-budget-basics-06-functioning-vs-development': 'completed',
    }

    render(<ChallengesHubPage entityCui="12345678" locale="ro" />)

    expect(screen.getByTestId('module-card-active')).toHaveTextContent(
      'active:read-local-execution',
    )
    expect(screen.queryByText('Congratulations!')).not.toBeInTheDocument()
  })
})
