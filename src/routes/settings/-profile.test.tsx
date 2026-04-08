import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/test-utils'

const mockAuthState = vi.fn()
const mockLocale = vi.fn(() => 'en')

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({}),
}))

vi.mock('@/lib/auth', () => ({
  AUTH_ACCOUNT_URL: 'https://accounts.transparenta.eu/user',
  useAuth: () => mockAuthState(),
  AuthSignInButton: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-sign-in-button">{children}</div>
  ),
  AuthSignOutButton: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-sign-out-button">{children}</div>
  ),
}))

vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>()
  return {
    ...actual,
    getUserLocale: () => mockLocale(),
  }
})

import { ProfilePage } from '@/features/auth/components/ProfilePage'

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocale.mockReturnValue('en')
  })

  it('renders the external account link for signed-in users', () => {
    mockAuthState.mockReturnValue({
      user: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
      isSignedIn: true,
      isLoaded: true,
    })

    render(<ProfilePage />)

    expect(screen.getByText('Account')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open account' })).toHaveAttribute(
      'href',
      'https://accounts.transparenta.eu/user',
    )
    expect(screen.getByTestId('auth-sign-out-button')).toBeInTheDocument()
  })

  it('renders Romanian account copy when locale is ro', () => {
    mockLocale.mockReturnValue('ro')
    mockAuthState.mockReturnValue({
      user: { firstName: 'Ion', lastName: 'Popescu', email: 'ion@example.com' },
      isSignedIn: true,
      isLoaded: true,
    })

    render(<ProfilePage />)

    expect(screen.getByText('Cont')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Deschide contul' })).toHaveAttribute(
      'href',
      'https://accounts.transparenta.eu/user',
    )
  })

  it('renders the sign-in entry point for signed-out users', () => {
    mockAuthState.mockReturnValue({
      user: null,
      isSignedIn: false,
      isLoaded: true,
    })

    render(<ProfilePage />)

    expect(screen.getByTestId('auth-sign-in-button')).toBeInTheDocument()
    expect(screen.getByText('Sign in')).toBeInTheDocument()
  })
})
