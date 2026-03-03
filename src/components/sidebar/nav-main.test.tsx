/**
 * NavMain Component Tests
 *
 * This file tests the NavMain component which displays
 * the main navigation menu in the sidebar.
 *
 * Pattern: Navigation Component Testing
 * - Mock router hooks
 * - Mock sidebar context
 * - Test active state
 * - Test mobile behavior
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@/test/test-utils'
import { NavMain } from './nav-main'

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
  LayoutDashboard: () => <span data-testid="icon-dashboard" />,
  BarChart2: () => <span data-testid="icon-charts" />,
  Map: () => <span data-testid="icon-map" />,
  ListOrdered: () => <span data-testid="icon-entity-analytics" />,
  Boxes: () => <span data-testid="icon-budget-explorer" />,
}))

// Mock router
const mockMatches = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    onClick,
    className,
  }: {
    children: React.ReactNode
    to: string
    onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void
    className?: string
  }) => (
    <a
      href={to}
      onClick={(event) => {
        event.preventDefault()
        onClick?.(event)
      }}
      className={className}
      data-testid={`link-${to}`}
    >
      {children}
    </a>
  ),
  useMatches: () => mockMatches(),
}))

// Mock sidebar context
const mockSetOpenMobile = vi.fn()
const mockSidebarState = vi.fn()

vi.mock('@/components/ui/sidebar', () => ({
  SidebarGroup: ({ children }: { children: React.ReactNode }) => <div data-testid="sidebar-group">{children}</div>,
  SidebarMenu: ({ children }: { children: React.ReactNode }) => <ul data-testid="sidebar-menu">{children}</ul>,
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => <li data-testid="sidebar-menu-item">{children}</li>,
  SidebarMenuButton: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useSidebar: () => mockSidebarState(),
}))

// ============================================================================
// TESTS
// ============================================================================

describe('NavMain', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMatches.mockReturnValue([{ pathname: '/' }])
    mockSidebarState.mockReturnValue({
      state: 'expanded',
      isMobile: false,
      setOpenMobile: mockSetOpenMobile,
    })
  })

  describe('menu items', () => {
    it('renders Dashboard link', () => {
      render(<NavMain />)

      expect(screen.getByTestId('link-/')).toBeInTheDocument()
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    it('renders Map link', () => {
      render(<NavMain />)

      expect(screen.getByTestId('link-/map')).toBeInTheDocument()
      expect(screen.getByText('Map')).toBeInTheDocument()
    })

    it('renders Charts link', () => {
      render(<NavMain />)

      expect(screen.getByTestId('link-/charts')).toBeInTheDocument()
      expect(screen.getByText('Charts')).toBeInTheDocument()
    })

    it('renders Budget Explorer link', () => {
      render(<NavMain />)

      expect(screen.getByTestId('link-/budget-explorer')).toBeInTheDocument()
      expect(screen.getByText('National Budget')).toBeInTheDocument()
    })

    it('renders Entity Analytics link', () => {
      render(<NavMain />)

      expect(screen.getByTestId('link-/entity-analytics')).toBeInTheDocument()
      expect(screen.getByText('Entity Analytics')).toBeInTheDocument()
    })

    it('renders all menu items', () => {
      render(<NavMain />)

      const menuItems = screen.getAllByTestId('sidebar-menu-item')
      expect(menuItems).toHaveLength(5)
    })
  })

  describe('icons', () => {
    it('renders dashboard icon', () => {
      render(<NavMain />)

      expect(screen.getByTestId('icon-dashboard')).toBeInTheDocument()
    })

    it('renders map icon', () => {
      render(<NavMain />)

      expect(screen.getByTestId('icon-map')).toBeInTheDocument()
    })

    it('renders charts icon', () => {
      render(<NavMain />)

      expect(screen.getByTestId('icon-charts')).toBeInTheDocument()
    })
  })

  describe('active state', () => {
    it('marks Dashboard as active when on root', () => {
      mockMatches.mockReturnValue([{ pathname: '/' }])
      render(<NavMain />)

      const dashboardLink = screen.getByTestId('link-/')
      expect(dashboardLink).toHaveClass('bg-muted')
    })

    it('marks Map as active when on /map', () => {
      mockMatches.mockReturnValue([{ pathname: '/map' }])
      render(<NavMain />)

      const mapLink = screen.getByTestId('link-/map')
      expect(mapLink).toHaveClass('bg-muted')
    })

    it('marks Charts as active when on /charts subpath', () => {
      mockMatches.mockReturnValue([{ pathname: '/charts/123' }])
      render(<NavMain />)

      const chartsLink = screen.getByTestId('link-/charts')
      expect(chartsLink).toHaveClass('bg-muted')
    })

    it('does not mark Dashboard as active on other pages', () => {
      mockMatches.mockReturnValue([{ pathname: '/map' }])
      render(<NavMain />)

      const dashboardLink = screen.getByTestId('link-/')
      expect(dashboardLink).not.toHaveClass('bg-muted')
    })
  })

  describe('collapsed state', () => {
    it('shows labels when expanded', () => {
      mockSidebarState.mockReturnValue({
        state: 'expanded',
        isMobile: false,
        setOpenMobile: mockSetOpenMobile,
      })
      render(<NavMain />)

      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Map')).toBeInTheDocument()
    })

    it('hides labels when collapsed', () => {
      mockSidebarState.mockReturnValue({
        state: 'collapsed',
        isMobile: false,
        setOpenMobile: mockSetOpenMobile,
      })
      render(<NavMain />)

      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
      expect(screen.queryByText('Map')).not.toBeInTheDocument()
    })
  })

  describe('mobile behavior', () => {
    it('closes sidebar on mobile when link clicked', () => {
      mockSidebarState.mockReturnValue({
        state: 'expanded',
        isMobile: true,
        setOpenMobile: mockSetOpenMobile,
      })
      render(<NavMain />)

      fireEvent.click(screen.getByTestId('link-/map'))

      expect(mockSetOpenMobile).toHaveBeenCalledWith(false)
    })

    it('does not close sidebar on desktop when link clicked', () => {
      mockSidebarState.mockReturnValue({
        state: 'expanded',
        isMobile: false,
        setOpenMobile: mockSetOpenMobile,
      })
      render(<NavMain />)

      fireEvent.click(screen.getByTestId('link-/map'))

      expect(mockSetOpenMobile).not.toHaveBeenCalled()
    })
  })

  describe('structure', () => {
    it('renders sidebar group', () => {
      render(<NavMain />)

      expect(screen.getByTestId('sidebar-group')).toBeInTheDocument()
    })

    it('renders sidebar menu', () => {
      render(<NavMain />)

      expect(screen.getByTestId('sidebar-menu')).toBeInTheDocument()
    })
  })
})
