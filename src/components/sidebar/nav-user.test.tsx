/**
 * NavUser Component Tests
 *
 * This file tests the NavUser component which displays
 * user information and dropdown menu in the sidebar.
 *
 * Pattern: Auth-Dependent Component Testing
 * - Mock auth hook
 * - Mock sidebar context
 * - Test signed in/out states
 * - Test dropdown menu
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { NavUser } from './nav-user'

// ============================================================================
// MOCKS
// ============================================================================

// Mock Lingui
vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@lingui/core/macro', () => ({
  t: (strings: TemplateStringsArray) => strings[0],
  msg: (strings: TemplateStringsArray) => strings[0],
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Bell: () => <span data-testid="icon-bell" />,
  ChevronsUpDown: () => <span data-testid="icon-chevrons" />,
  Keyboard: () => <span data-testid="icon-keyboard" />,
  LogIn: () => <span data-testid="icon-login" />,
  LogOut: () => <span data-testid="icon-logout" />,
  Settings: () => <span data-testid="icon-settings" />,
}))

// Mock router
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, onClick }: { children: React.ReactNode; to: string; onClick?: () => void }) => (
    <a href={to} onClick={onClick} data-testid={`link-${to}`}>
      {children}
    </a>
  ),
}))

// Mock sidebar context
const mockSetOpenMobile = vi.fn()
const mockSetIsOverlayLockedOpen = vi.fn()
const mockSidebarState = vi.fn()

vi.mock('@/components/ui/sidebar', () => ({
  SidebarMenu: ({ children }: { children: React.ReactNode }) => <div data-testid="sidebar-menu">{children}</div>,
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => <div data-testid="sidebar-menu-item">{children}</div>,
  SidebarMenuButton: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <button data-testid="sidebar-menu-button" className={className}>
      {children}
    </button>
  ),
  useSidebar: () => mockSidebarState(),
}))

// Mock auth
const mockSignOut = vi.fn()
const mockAuthState = vi.fn()

vi.mock('@/lib/auth', () => ({
  AUTH_ACCOUNT_URL: 'https://accounts.transparenta.eu/user',
  useAuth: () => mockAuthState(),
  AuthSignInButton: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-sign-in-button">{children}</div>
  ),
}))

// Mock utils
const mockLocale = vi.fn(() => 'en')
vi.mock('@/lib/utils', () => ({
  getUserLocale: () => mockLocale(),
  cn: (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' '),
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
  }),
}))

// Mock dropdown menu
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children, onOpenChange }: { children: React.ReactNode; onOpenChange?: (open: boolean) => void }) => (
    <div data-testid="dropdown-menu" onClick={() => onOpenChange?.(true)}>
      {children}
    </div>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <div data-testid="dropdown-item" onClick={onClick}>
      {children}
    </div>
  ),
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-label">{children}</div>,
  DropdownMenuSeparator: () => <hr data-testid="dropdown-separator" />,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-trigger">{children}</div>,
}))

// Mock avatar
vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => <div data-testid="avatar">{children}</div>,
  AvatarImage: ({ alt }: { alt?: string }) => <img data-testid="avatar-image" alt={alt} />,
  AvatarFallback: ({ children }: { children: React.ReactNode }) => <span data-testid="avatar-fallback">{children}</span>,
}))

// Mock theme switcher
vi.mock('./theme-switcher', () => ({
  ThemeSwitcher: () => <div data-testid="theme-switcher" />,
}))

// Mock shortcuts modal
vi.mock('@/components/ui/shortcuts-modal', () => ({
  ShortcutsModal: ({ open }: { open: boolean }) => open ? <div data-testid="shortcuts-modal" /> : null,
}))

// ============================================================================
// TESTS
// ============================================================================

describe('NavUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocale.mockReturnValue('en')
    mockSidebarState.mockReturnValue({
      isMobile: false,
      setOpenMobile: mockSetOpenMobile,
      setIsOverlayLockedOpen: mockSetIsOverlayLockedOpen,
    })
    mockAuthState.mockReturnValue({
      user: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
      isSignedIn: true,
      isLoaded: true,
      signOut: mockSignOut,
    })
  })

  describe('loading state', () => {
    it('renders the guest slot while auth is loading', () => {
      mockAuthState.mockReturnValue({
        user: null,
        isSignedIn: false,
        isLoaded: false,
        signOut: mockSignOut,
      })

      render(<NavUser />)

      expect(screen.getAllByText('Guest').length).toBeGreaterThan(0)
      expect(screen.getByTestId('icon-login')).toBeInTheDocument()
    })
  })

  describe('signed in state', () => {
    it('renders user display name', () => {
      render(<NavUser />)

      expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0)
    })

    it('renders user email', () => {
      render(<NavUser />)

      expect(screen.getAllByText('john@example.com').length).toBeGreaterThan(0)
    })

    it('renders user initials in avatar', () => {
      render(<NavUser />)

      expect(screen.getAllByText('JD').length).toBeGreaterThan(0)
    })

    it('renders logout option when signed in', () => {
      render(<NavUser />)

      expect(screen.getByText('Log out')).toBeInTheDocument()
    })

    it('renders account link', () => {
      render(<NavUser />)

      expect(screen.getByText('Account')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Account' })).toHaveAttribute('href', 'https://accounts.transparenta.eu/user')
    })

    it('renders notifications link', () => {
      render(<NavUser />)

      expect(screen.getByText('Notifications')).toBeInTheDocument()
    })

    it('renders theme switcher', () => {
      render(<NavUser />)

      expect(screen.getByTestId('theme-switcher')).toBeInTheDocument()
    })
  })

  describe('signed out state', () => {
    beforeEach(() => {
      mockAuthState.mockReturnValue({
        user: null,
        isSignedIn: false,
        isLoaded: true,
        signOut: mockSignOut,
      })
    })

    it('renders guest display name', () => {
      render(<NavUser />)

      expect(screen.getAllByText('Guest').length).toBeGreaterThan(0)
    })

    it('renders guest initials', () => {
      render(<NavUser />)

      expect(screen.getAllByText('GU').length).toBeGreaterThan(0)
    })

    it('renders sign in option', () => {
      render(<NavUser />)

      expect(screen.getByText('Sign in')).toBeInTheDocument()
    })

    it('wraps sign in with AuthSignInButton', () => {
      render(<NavUser />)

      expect(screen.getByTestId('auth-sign-in-button')).toBeInTheDocument()
    })

    it('renders Romanian sign-in copy when locale is ro', () => {
      mockLocale.mockReturnValue('ro')

      render(<NavUser />)

      expect(screen.getByText('Conectare')).toBeInTheDocument()
    })
  })

  describe('Romanian labels', () => {
    it('renders Romanian logout copy when locale is ro', () => {
      mockLocale.mockReturnValue('ro')

      render(<NavUser />)

      expect(screen.getByText('Deconectare')).toBeInTheDocument()
    })
  })

  describe('user name handling', () => {
    it('handles user with only first name', () => {
      mockAuthState.mockReturnValue({
        user: { firstName: 'John', lastName: null, email: 'john@example.com' },
        isSignedIn: true,
        isLoaded: true,
        signOut: mockSignOut,
      })

      render(<NavUser />)

      expect(screen.getAllByText('John').length).toBeGreaterThan(0)
    })

    it('handles user with no name', () => {
      mockAuthState.mockReturnValue({
        user: { firstName: null, lastName: null, email: 'john@example.com' },
        isSignedIn: true,
        isLoaded: true,
        signOut: mockSignOut,
      })

      render(<NavUser />)

      expect(screen.getAllByText('User').length).toBeGreaterThan(0)
    })
  })

  describe('keyboard shortcuts', () => {
    it('shows keyboard shortcuts option on desktop', () => {
      mockSidebarState.mockReturnValue({
        isMobile: false,
        setOpenMobile: mockSetOpenMobile,
        setIsOverlayLockedOpen: mockSetIsOverlayLockedOpen,
      })

      render(<NavUser />)

      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument()
    })

    it('hides keyboard shortcuts option on mobile', () => {
      mockSidebarState.mockReturnValue({
        isMobile: true,
        setOpenMobile: mockSetOpenMobile,
        setIsOverlayLockedOpen: mockSetIsOverlayLockedOpen,
      })

      render(<NavUser />)

      expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument()
    })
  })

  describe('structure', () => {
    it('renders sidebar menu', () => {
      render(<NavUser />)

      expect(screen.getByTestId('sidebar-menu')).toBeInTheDocument()
    })

    it('renders dropdown menu', () => {
      render(<NavUser />)

      expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument()
    })

    it('renders avatar', () => {
      render(<NavUser />)

      expect(screen.getAllByTestId('avatar').length).toBeGreaterThan(0)
    })
  })
})
