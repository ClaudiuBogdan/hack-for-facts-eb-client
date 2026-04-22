import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { fireEvent, render, screen } from '@/test/test-utils'
import { CampaignEntityLocalUpdateCard } from './campaign-entity-local-update-card'
import { CampaignEntityPublicConfigApiError } from '../../api/campaign-entity-public-config'
import type { CampaignEntityPublicConfig } from '../../schemas/campaign-entity-public-config'

let authState = {
  isEnabled: true,
  isLoaded: true,
  isSignedIn: true,
}

let queryState: {
  readonly data?: CampaignEntityPublicConfig
  readonly isLoading: boolean
  readonly isError: boolean
  readonly error: unknown
} = {
  data: undefined,
  isLoading: false,
  isError: false,
  error: null,
}

type MockLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  readonly children?: ReactNode
  readonly to?: string
  readonly search?: Record<string, string>
}

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, search, ...props }: MockLinkProps) => {
    const query = search ? new URLSearchParams(search).toString() : ''
    const href = typeof to === 'string'
      ? `${to}${query ? `?${query}` : ''}`
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
}))

vi.mock('../../hooks/use-campaign-entity-public-config', () => ({
  useCampaignEntityPublicConfig: () => queryState,
}))

function createConfig(
  overrides: Partial<CampaignEntityPublicConfig> = {},
): CampaignEntityPublicConfig {
  return {
    campaignKey: 'funky',
    entityCui: '12345678',
    entityName: 'Oras Test',
    isConfigured: true,
    values: {
      budgetPublicationDate: null,
      officialBudgetUrl: null,
      public_debate: null,
    },
    ...overrides,
  }
}

describe('CampaignEntityLocalUpdateCard', () => {
  beforeEach(() => {
    window.localStorage.clear()
    authState = {
      isEnabled: true,
      isLoaded: true,
      isSignedIn: true,
    }
    queryState = {
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    }
  })

  it('renders nothing when the user is not signed in', () => {
    authState = {
      isEnabled: true,
      isLoaded: true,
      isSignedIn: false,
    }

    const { container } = render(
      <CampaignEntityLocalUpdateCard entityCui="12345678" locale="en" />,
    )

    expect(container.innerHTML).toBe('')
  })

  it('shows a loading skeleton while the config query is pending', () => {
    queryState = {
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    }

    const { container } = render(
      <CampaignEntityLocalUpdateCard entityCui="12345678" locale="en" />,
    )

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('shows a neutral unavailable state for safe 404 responses', () => {
    queryState = {
      data: undefined,
      isLoading: false,
      isError: true,
      error: new CampaignEntityPublicConfigApiError('Missing', 404),
    }

    render(<CampaignEntityLocalUpdateCard entityCui="12345678" locale="en" />)

    expect(screen.getByText('Local details unavailable')).toBeInTheDocument()
    expect(
      screen.getByText('This page cannot show budget or debate details for this city hall right now.'),
    ).toBeInTheDocument()
  })

  it('shows the no-update state when the entity has no published config yet', () => {
    queryState = {
      data: createConfig({
        isConfigured: false,
      }),
      isLoading: false,
      isError: false,
      error: null,
    }

    const { container } = render(<CampaignEntityLocalUpdateCard entityCui="12345678" locale="en" />)

    expect(container.innerHTML).toBe('')
  })

  it('renders nothing when no public debate payload is available', () => {
    queryState = {
      data: createConfig({
        values: {
          budgetPublicationDate: '2026-03-20',
          officialBudgetUrl: 'https://primarie.ro/buget.pdf',
          public_debate: null,
        },
      }),
      isLoading: false,
      isError: false,
      error: null,
    }

    const { container } = render(<CampaignEntityLocalUpdateCard entityCui="12345678" locale="en" />)

    expect(container.innerHTML).toBe('')
  })

  it('shows the full public debate details when they are available', () => {
    queryState = {
      data: createConfig({
        values: {
          budgetPublicationDate: '2026-03-20',
          officialBudgetUrl: 'https://primarie.ro/buget.pdf',
          public_debate: {
            date: '2026-04-02',
            time: '18:30',
            location: 'Council hall',
            announcement_link: 'https://primarie.ro/anunt',
            online_participation_link: 'https://meet.example.com/public-debate',
            description: 'Bring your questions about the draft budget.',
          },
        },
      }),
      isLoading: false,
      isError: false,
      error: null,
    }

    render(<CampaignEntityLocalUpdateCard entityCui="12345678" locale="en" />)

    expect(screen.getByText('Public debate announced')).toBeInTheDocument()
    expect(screen.getByText('2 April 2026')).toBeInTheDocument()
    expect(screen.getByText('18:30')).toBeInTheDocument()
    expect(screen.getByText('Council hall')).toBeInTheDocument()
    expect(screen.getByText('Bring your questions about the draft budget.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open announcement' })).toHaveAttribute(
      'href',
      'https://primarie.ro/anunt',
    )
    expect(screen.getByRole('link', { name: 'Join online' })).toHaveAttribute(
      'href',
      'https://meet.example.com/public-debate',
    )
    expect(screen.queryByRole('link', { name: 'Request a public debate' })).not.toBeInTheDocument()
  })

  it('collapses long details with a show more and show less toggle', () => {
    const longDescription = 'Bring your questions about the draft budget and review the annexes before the meeting. '.repeat(4)

    queryState = {
      data: createConfig({
        values: {
          budgetPublicationDate: '2026-03-20',
          officialBudgetUrl: 'https://primarie.ro/buget.pdf',
          public_debate: {
            date: '2026-04-02',
            time: '18:30',
            location: 'Council hall',
            announcement_link: 'https://primarie.ro/anunt',
            description: longDescription,
          },
        },
      }),
      isLoading: false,
      isError: false,
      error: null,
    }

    render(<CampaignEntityLocalUpdateCard entityCui="12345678" locale="en" />)

    expect(screen.getByRole('button', { name: 'Show more' })).toBeInTheDocument()
    expect(screen.queryByText(longDescription)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Show more' }))

    expect(screen.getByText('Details').parentElement).toHaveTextContent(longDescription.trim())
    expect(screen.getByRole('button', { name: 'Show less' })).toBeInTheDocument()
  })

  it('persists the public debate collapsed state in local storage', () => {
    queryState = {
      data: createConfig({
        values: {
          budgetPublicationDate: '2026-03-20',
          officialBudgetUrl: 'https://primarie.ro/buget.pdf',
          public_debate: {
            date: '2026-04-02',
            time: '18:30',
            location: 'Council hall',
            announcement_link: 'https://primarie.ro/anunt',
            description: 'Bring your questions about the draft budget.',
          },
        },
      }),
      isLoading: false,
      isError: false,
      error: null,
    }

    const { unmount } = render(
      <CampaignEntityLocalUpdateCard entityCui="12345678" locale="en" />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Hide details' }))

    expect(window.localStorage.getItem('campaign-public-debate-section-collapsed:12345678')).toBe('true')
    expect(screen.getByRole('button', { name: 'Show details' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Open announcement' })).not.toBeInTheDocument()

    unmount()

    render(<CampaignEntityLocalUpdateCard entityCui="12345678" locale="en" />)

    expect(screen.getByRole('button', { name: 'Show details' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Open announcement' })).not.toBeInTheDocument()
  })

  it('omits optional public debate fields when they are not provided or empty', () => {
    queryState = {
      data: createConfig({
        values: {
          budgetPublicationDate: null,
          officialBudgetUrl: null,
          public_debate: {
            date: '2026-04-02',
            time: '18:30',
            location: 'Council hall',
            announcement_link: 'https://primarie.ro/anunt',
            description: '   ',
          },
        },
      }),
      isLoading: false,
      isError: false,
      error: null,
    }

    render(<CampaignEntityLocalUpdateCard entityCui="12345678" locale="en" />)

    expect(screen.getByText('Public debate announced')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Join online' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Open official budget draft' })).not.toBeInTheDocument()
    expect(screen.queryByText('Details')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument()
  })
})
