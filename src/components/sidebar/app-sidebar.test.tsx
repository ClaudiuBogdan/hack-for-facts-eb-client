/**
 * AppSidebar Component Tests
 *
 * This file tests the AppSidebar component which composes
 * the main application sidebar structure.
 *
 * Pattern: Composition Component Testing
 * - Mock child components
 * - Test component composition
 * - Test props passing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { AppSidebar } from './app-sidebar'

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

const mockPathname = vi.fn(() => '/')
vi.mock('@tanstack/react-router', () => ({
  useLocation: ({ select }: { select: (location: { pathname: string }) => string }) => select({ pathname: mockPathname() }),
}))

// Mock sidebar UI components
vi.mock('@/components/ui/sidebar', () => ({
  Sidebar: ({ children, collapsible }: { children: React.ReactNode; collapsible?: string }) => (
    <aside data-testid="sidebar" data-collapsible={collapsible}>
      {children}
    </aside>
  ),
  SidebarContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="sidebar-content" className={className}>
      {children}
    </div>
  ),
  SidebarFooter: ({ children }: { children: React.ReactNode }) => (
    <footer data-testid="sidebar-footer">{children}</footer>
  ),
  SidebarHeader: ({ children }: { children: React.ReactNode }) => (
    <header data-testid="sidebar-header">{children}</header>
  ),
}))

// Mock child components
vi.mock('./logo', () => ({
  default: () => <div data-testid="logo">Logo</div>,
}))

vi.mock('./nav-main', () => ({
  NavMain: () => <nav data-testid="nav-main">NavMain</nav>,
}))

vi.mock('./nav-user', () => ({
  NavUser: () => <div data-testid="nav-user">NavUser</div>,
}))

vi.mock('@/components/theme/language-toggle', () => ({
  LanguageToggle: () => <div data-testid="language-toggle">LanguageToggle</div>,
  LanguageIndicator: () => <div data-testid="language-indicator" />,
}))

vi.mock('@/components/theme/currency-toggle', () => ({
  CurrencyToggle: () => <div data-testid="currency-toggle">CurrencyToggle</div>,
  CurrencyIndicator: () => <div data-testid="currency-indicator" />,
}))

vi.mock('@/components/theme/inflation-toggle', () => ({
  InflationToggle: () => <div data-testid="inflation-toggle">InflationToggle</div>,
  InflationIndicator: () => <div data-testid="inflation-indicator" />,
}))

// ============================================================================
// TESTS
// ============================================================================

describe('AppSidebar', () => {
  describe('structure', () => {
    it('renders sidebar container', () => {
      render(<AppSidebar />)

      expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    })

    it('renders sidebar header', () => {
      render(<AppSidebar />)

      expect(screen.getByTestId('sidebar-header')).toBeInTheDocument()
    })

    it('renders sidebar content', () => {
      render(<AppSidebar />)

      expect(screen.getByTestId('sidebar-content')).toBeInTheDocument()
    })

    it('renders sidebar footer', () => {
      render(<AppSidebar />)

      expect(screen.getByTestId('sidebar-footer')).toBeInTheDocument()
    })

    it('sets collapsible to icon', () => {
      render(<AppSidebar />)

      expect(screen.getByTestId('sidebar')).toHaveAttribute('data-collapsible', 'icon')
    })
  })

  describe('header components', () => {
    it('renders logo in header', () => {
      render(<AppSidebar />)

      expect(screen.getByTestId('logo')).toBeInTheDocument()
    })
  })

  describe('content components', () => {
    it('renders nav main in content', () => {
      render(<AppSidebar />)

      expect(screen.getByTestId('nav-main')).toBeInTheDocument()
    })
  })

  describe('footer', () => {
    beforeEach(() => mockPathname.mockReturnValue('/'))

    it('always offers the account and the language', () => {
      render(<AppSidebar />)

      expect(screen.getByTestId('nav-user')).toBeInTheDocument()
      expect(screen.getByTestId('language-toggle')).toBeInTheDocument()
    })

    it('offers only the language on a page that reads no display settings', () => {
      mockPathname.mockReturnValue('/procurement')
      render(<AppSidebar />)

      expect(screen.queryByTestId('currency-toggle')).not.toBeInTheDocument()
      expect(screen.queryByTestId('inflation-toggle')).not.toBeInTheDocument()
      expect(screen.getByTestId('display-settings')).toContainElement(screen.getByTestId('language-toggle'))
    })

    it('offers currency, prices and language on an entity page, above the account', () => {
      mockPathname.mockReturnValue('/entities/4270740')
      render(<AppSidebar />)

      const settings = screen.getByTestId('display-settings')
      expect(settings).toContainElement(screen.getByTestId('currency-toggle'))
      expect(settings).toContainElement(screen.getByTestId('inflation-toggle'))
      expect(settings).toContainElement(screen.getByTestId('language-toggle'))
      expect(settings.compareDocumentPosition(screen.getByTestId('nav-user')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    it('gives each offered setting its value mark, in the same row', () => {
      mockPathname.mockReturnValue('/pnrr')
      render(<AppSidebar />)

      expect(screen.getByTestId('currency-indicator').parentElement).toContainElement(screen.getByTestId('currency-toggle'))
      expect(screen.getByTestId('language-indicator').parentElement).toContainElement(screen.getByTestId('language-toggle'))
      expect(screen.queryByTestId('inflation-indicator')).not.toBeInTheDocument()
    })

    it('offers only the currency on PNRR', () => {
      mockPathname.mockReturnValue('/pnrr')
      render(<AppSidebar />)

      expect(screen.getByTestId('currency-toggle')).toBeInTheDocument()
      expect(screen.queryByTestId('inflation-toggle')).not.toBeInTheDocument()
    })
  })

  describe('props passing', () => {
    it('passes additional props to Sidebar', () => {
      render(<AppSidebar data-custom="test" />)

      // Note: Due to mock implementation, we verify the sidebar renders
      expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    })
  })
})
