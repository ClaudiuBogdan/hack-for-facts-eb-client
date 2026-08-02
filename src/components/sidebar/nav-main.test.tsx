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

const publicEnterpriseMockEnabled = vi.fn()

vi.mock('@/features/public-enterprises/lib/mock-mode', () => ({
  isPublicEnterpriseMockEnabled: () => publicEnterpriseMockEnabled(),
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  LayoutDashboard: () => <span data-testid="icon-dashboard" />,
  BarChart2: () => <span data-testid="icon-charts" />,
  Map: () => <span data-testid="icon-map" />,
  ListOrdered: () => <span data-testid="icon-entity-analytics" />,
  Boxes: () => <span data-testid="icon-budget-explorer" />,
  Landmark: () => <span data-testid="icon-achizitii" />,
  Scale: () => <span data-testid="icon-legislation" />,
  Building2: () => <span data-testid="icon-public-enterprises" />,
  Briefcase: () => <span data-testid="icon-companies" />,
  Vote: () => <span data-testid="icon-elections" />,
  HeartHandshake: () => <span data-testid="icon-ngos" />,
  Activity: () => <span data-testid="icon-statistics" />,
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

async function renderNavMain(options?: { readonly mockPublicEnterprises?: boolean }) {
  if (options?.mockPublicEnterprises !== undefined) {
    publicEnterpriseMockEnabled.mockReturnValue(options.mockPublicEnterprises)
    vi.resetModules()
  }

  const { NavMain } = await import('./nav-main')
  return render(<NavMain />)
}

describe('NavMain', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    publicEnterpriseMockEnabled.mockReturnValue(false)
    mockMatches.mockReturnValue([{ pathname: '/' }])
    mockSidebarState.mockReturnValue({
      state: 'expanded',
      isMobile: false,
      setOpenMobile: mockSetOpenMobile,
    })
  })

  describe('menu items', () => {
    it('renders Dashboard link', async () => {
      await renderNavMain()

      expect(screen.getByTestId('link-/')).toBeInTheDocument()
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    it('renders Map link', async () => {
      await renderNavMain()

      expect(screen.getByTestId('link-/map')).toBeInTheDocument()
      expect(screen.getByText('Map')).toBeInTheDocument()
    })

    it('renders Charts link', async () => {
      await renderNavMain()

      expect(screen.getByTestId('link-/charts')).toBeInTheDocument()
      expect(screen.getByText('Charts')).toBeInTheDocument()
    })

    it('renders Budget Explorer link', async () => {
      await renderNavMain()

      expect(screen.getByTestId('link-/budget-explorer')).toBeInTheDocument()
      expect(screen.getByText('National Budget')).toBeInTheDocument()
    })

    it('renders Entity Analytics link', async () => {
      await renderNavMain()

      expect(screen.getByTestId('link-/entity-analytics')).toBeInTheDocument()
      expect(screen.getByText('Entity Analytics')).toBeInTheDocument()
    })

    it('renders Achizitii publice link', async () => {
      await renderNavMain()

      expect(screen.getByTestId('link-/procurement')).toBeInTheDocument()
      expect(screen.getByText('Achiziții publice')).toBeInTheDocument()
    })

    it('renders Legislație link', async () => {
      await renderNavMain()

      expect(screen.getByTestId('link-/legislation')).toBeInTheDocument()
      expect(screen.getByText('Legislație')).toBeInTheDocument()
    })

    it('renders Elections link', async () => {
      await renderNavMain()

      expect(screen.getByTestId('link-/alegeri')).toBeInTheDocument()
      expect(screen.getByText('Alegeri')).toBeInTheDocument()
    })

    it('renders ONG-uri link', async () => {
      await renderNavMain()

      expect(screen.getByTestId('link-/ong-uri')).toBeInTheDocument()
      expect(screen.getByText('ONG-uri')).toBeInTheDocument()
    })

    it('renders Statistics link', async () => {
      await renderNavMain()

      expect(screen.getByTestId('link-/statistici')).toBeInTheDocument()
      expect(screen.getByText('Statistici')).toBeInTheDocument()
    })

    it('renders all menu items', async () => {
      await renderNavMain()

      const menuItems = screen.getAllByTestId('sidebar-menu-item')
      expect(menuItems).toHaveLength(11)
    })

    it('shows public enterprises navigation only while mock mode is enabled', async () => {
      await renderNavMain({ mockPublicEnterprises: true })

      expect(screen.getByTestId('link-/intreprinderi-publice')).toBeInTheDocument()
      expect(screen.getByText('Întreprinderi publice')).toBeInTheDocument()
      expect(screen.getAllByTestId('sidebar-menu-item')).toHaveLength(12)
    })
  })

  describe('icons', () => {
    it('renders dashboard icon', async () => {
      await renderNavMain()

      expect(screen.getByTestId('icon-dashboard')).toBeInTheDocument()
    })

    it('renders map icon', async () => {
      await renderNavMain()

      expect(screen.getByTestId('icon-map')).toBeInTheDocument()
    })

    it('renders charts icon', async () => {
      await renderNavMain()

      expect(screen.getByTestId('icon-charts')).toBeInTheDocument()
    })

    it('renders achizitii icon', async () => {
      await renderNavMain()

      expect(screen.getByTestId('icon-achizitii')).toBeInTheDocument()
    })

    it('renders public enterprises icon when mock mode is enabled', async () => {
      await renderNavMain({ mockPublicEnterprises: true })

      expect(screen.getByTestId('icon-public-enterprises')).toBeInTheDocument()
    })

    it('renders companies icon', async () => {
      await renderNavMain()

      expect(screen.getByTestId('icon-companies')).toBeInTheDocument()
    })

    it('renders elections icon', async () => {
      await renderNavMain()

      expect(screen.getByTestId('icon-elections')).toBeInTheDocument()
    })

    it('renders ONG-uri icon', async () => {
      await renderNavMain()

      expect(screen.getByTestId('icon-ngos')).toBeInTheDocument()
    })

    it('renders statistics icon', async () => {
      await renderNavMain()

      expect(screen.getByTestId('icon-statistics')).toBeInTheDocument()
    })
  })

  describe('active state', () => {
    it('marks Dashboard as active when on root', async () => {
      mockMatches.mockReturnValue([{ pathname: '/' }])
      await renderNavMain()

      const dashboardLink = screen.getByTestId('link-/')
      expect(dashboardLink).toHaveClass('bg-muted')
    })

    it('marks Map as active when on /map', async () => {
      mockMatches.mockReturnValue([{ pathname: '/map' }])
      await renderNavMain()

      const mapLink = screen.getByTestId('link-/map')
      expect(mapLink).toHaveClass('bg-muted')
    })

    it('does not mark Map as active for /maps sibling routes', async () => {
      mockMatches.mockReturnValue([{ pathname: '/maps/editor' }])
      await renderNavMain()

      const mapLink = screen.getByTestId('link-/map')
      expect(mapLink).not.toHaveClass('bg-muted')
    })

    it('marks Charts as active when on /charts subpath', async () => {
      mockMatches.mockReturnValue([{ pathname: '/charts/123' }])
      await renderNavMain()

      const chartsLink = screen.getByTestId('link-/charts')
      expect(chartsLink).toHaveClass('bg-muted')
    })

    it('marks public enterprises as active on profile routes when mock mode is enabled', async () => {
      mockMatches.mockReturnValue([{ pathname: '/intreprinderi-publice/10020943' }])
      await renderNavMain({ mockPublicEnterprises: true })

      expect(screen.getByTestId('link-/intreprinderi-publice')).toHaveClass('bg-muted')
    })

    it('marks ONG-uri as active when on /ong-uri subpath', async () => {
      mockMatches.mockReturnValue([{ pathname: '/ong-uri/12345678' }])
      await renderNavMain()

      const ngosLink = screen.getByTestId('link-/ong-uri')
      expect(ngosLink).toHaveClass('bg-muted')
    })

    it('marks Statistics as active when on /statistici subpath', async () => {
      mockMatches.mockReturnValue([{ pathname: '/statistici/teritorii/54975' }])
      await renderNavMain()

      const statisticsLink = screen.getByTestId('link-/statistici')
      expect(statisticsLink).toHaveClass('bg-muted')
    })

    it('does not mark Dashboard as active on other pages', async () => {
      mockMatches.mockReturnValue([{ pathname: '/map' }])
      await renderNavMain()

      const dashboardLink = screen.getByTestId('link-/')
      expect(dashboardLink).not.toHaveClass('bg-muted')
    })

    it('marks Achizitii as active when on /procurement subpath', async () => {
      mockMatches.mockReturnValue([{ pathname: '/procurement/search' }])
      await renderNavMain()

      const achizitiiLink = screen.getByTestId('link-/procurement')
      expect(achizitiiLink).toHaveClass('bg-muted')
    })

    it('marks Elections as active when on /alegeri subpath', async () => {
      mockMatches.mockReturnValue([{ pathname: '/alegeri/contest/local-2024-cluj-napoca-primar' }])
      await renderNavMain()

      const electionsLink = screen.getByTestId('link-/alegeri')
      expect(electionsLink).toHaveClass('bg-muted')
    })
  })

  describe('collapsed state', () => {
    it('shows labels when expanded', async () => {
      mockSidebarState.mockReturnValue({
        state: 'expanded',
        isMobile: false,
        setOpenMobile: mockSetOpenMobile,
      })
      await renderNavMain()

      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Map')).toBeInTheDocument()
    })

    it('hides labels when collapsed', async () => {
      mockSidebarState.mockReturnValue({
        state: 'collapsed',
        isMobile: false,
        setOpenMobile: mockSetOpenMobile,
      })
      await renderNavMain()

      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
      expect(screen.queryByText('Map')).not.toBeInTheDocument()
    })
  })

  describe('mobile behavior', () => {
    it('closes sidebar on mobile when link clicked', async () => {
      mockSidebarState.mockReturnValue({
        state: 'expanded',
        isMobile: true,
        setOpenMobile: mockSetOpenMobile,
      })
      await renderNavMain()

      fireEvent.click(screen.getByTestId('link-/map'))

      expect(mockSetOpenMobile).toHaveBeenCalledWith(false)
    })

    it('does not close sidebar on desktop when link clicked', async () => {
      mockSidebarState.mockReturnValue({
        state: 'expanded',
        isMobile: false,
        setOpenMobile: mockSetOpenMobile,
      })
      await renderNavMain()

      fireEvent.click(screen.getByTestId('link-/map'))

      expect(mockSetOpenMobile).not.toHaveBeenCalled()
    })
  })

  describe('structure', () => {
    it('renders sidebar group', async () => {
      await renderNavMain()

      expect(screen.getByTestId('sidebar-group')).toBeInTheDocument()
    })

    it('renders sidebar menu', async () => {
      await renderNavMain()

      expect(screen.getByTestId('sidebar-menu')).toBeInTheDocument()
    })
  })
})
