/**
 * ThemeSwitcher Component Tests
 *
 * This file tests the ThemeSwitcher component which provides
 * theme selection (system, light, dark).
 *
 * Pattern: Theme Toggle Component Testing
 * - Mock theme context
 * - Test click interactions
 * - Test keyboard navigation
 * - Test accessibility
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@/test/test-utils'
import { ThemeSwitcher } from './theme-switcher'

// ============================================================================
// MOCKS
// ============================================================================

// Mock Lingui
vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useLingui: () => ({
    t: (strings: TemplateStringsArray, ...values: unknown[]) =>
      strings.reduce((text, part, index) => text + part + (index < values.length ? String(values[index]) : ''), ''),
  }),
}))

vi.mock('@lingui/core/macro', () => ({
  t: (strings: TemplateStringsArray) => strings[0],
  msg: (strings: TemplateStringsArray) => strings[0],
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Monitor: ({ className }: { className?: string }) => <span data-testid="icon-system" className={className} />,
  Sun: ({ className }: { className?: string }) => <span data-testid="icon-light" className={className} />,
  Moon: ({ className }: { className?: string }) => <span data-testid="icon-dark" className={className} />,
}))

// Mock theme provider
const mockSetTheme = vi.fn()
const mockTheme = vi.fn()

vi.mock('../theme/theme-provider', () => ({
  useTheme: () => ({
    theme: mockTheme(),
    setTheme: mockSetTheme,
  }),
}))

// Mock tooltip components
vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip">{children}</div>,
}))

// Mock dropdown menu
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenuItem: ({ children, className, onKeyDown }: { children: React.ReactNode; className?: string; onKeyDown?: (e: React.KeyboardEvent) => void }) => (
    <div data-testid="dropdown-menu-item" className={className} onKeyDown={onKeyDown}>
      {children}
    </div>
  ),
}))

// ============================================================================
// TESTS
// ============================================================================

describe('ThemeSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTheme.mockReturnValue('system')
  })

  describe('rendering', () => {
    it('renders theme label', () => {
      render(<ThemeSwitcher />)

      expect(screen.getByText('Temă')).toBeInTheDocument()
    })

    it('renders system theme button', () => {
      render(<ThemeSwitcher />)

      expect(screen.getByTestId('icon-system')).toBeInTheDocument()
    })

    it('renders light theme button', () => {
      render(<ThemeSwitcher />)

      expect(screen.getByTestId('icon-light')).toBeInTheDocument()
    })

    it('renders dark theme button', () => {
      render(<ThemeSwitcher />)

      expect(screen.getByTestId('icon-dark')).toBeInTheDocument()
    })

    it('renders three theme buttons', () => {
      render(<ThemeSwitcher />)

      const buttons = screen.getAllByRole('radio')
      expect(buttons).toHaveLength(3)
    })
  })

  describe('theme selection', () => {
    it('calls setTheme with light when light button clicked', () => {
      render(<ThemeSwitcher />)

      const buttons = screen.getAllByRole('radio')
      const lightButton = buttons.find(btn => btn.getAttribute('data-value') === 'light')
      fireEvent.click(lightButton!)

      expect(mockSetTheme).toHaveBeenCalledWith('light')
    })

    it('calls setTheme with dark when dark button clicked', () => {
      render(<ThemeSwitcher />)

      const buttons = screen.getAllByRole('radio')
      const darkButton = buttons.find(btn => btn.getAttribute('data-value') === 'dark')
      fireEvent.click(darkButton!)

      expect(mockSetTheme).toHaveBeenCalledWith('dark')
    })

    it('calls setTheme with system when system button clicked', () => {
      mockTheme.mockReturnValue('light')
      render(<ThemeSwitcher />)

      const buttons = screen.getAllByRole('radio')
      const systemButton = buttons.find(btn => btn.getAttribute('data-value') === 'system')
      fireEvent.click(systemButton!)

      expect(mockSetTheme).toHaveBeenCalledWith('system')
    })
  })

  describe('active state', () => {
    it('marks system as checked when theme is system', () => {
      mockTheme.mockReturnValue('system')
      render(<ThemeSwitcher />)

      const buttons = screen.getAllByRole('radio')
      const systemButton = buttons.find(btn => btn.getAttribute('data-value') === 'system')

      expect(systemButton).toHaveAttribute('aria-checked', 'true')
      expect(systemButton).toHaveAttribute('data-state', 'checked')
    })

    it('marks light as checked when theme is light', () => {
      mockTheme.mockReturnValue('light')
      render(<ThemeSwitcher />)

      const buttons = screen.getAllByRole('radio')
      const lightButton = buttons.find(btn => btn.getAttribute('data-value') === 'light')

      expect(lightButton).toHaveAttribute('aria-checked', 'true')
      expect(lightButton).toHaveAttribute('data-state', 'checked')
    })

    it('marks dark as checked when theme is dark', () => {
      mockTheme.mockReturnValue('dark')
      render(<ThemeSwitcher />)

      const buttons = screen.getAllByRole('radio')
      const darkButton = buttons.find(btn => btn.getAttribute('data-value') === 'dark')

      expect(darkButton).toHaveAttribute('aria-checked', 'true')
      expect(darkButton).toHaveAttribute('data-state', 'checked')
    })

    it('marks unchecked buttons as unchecked', () => {
      mockTheme.mockReturnValue('light')
      render(<ThemeSwitcher />)

      const buttons = screen.getAllByRole('radio')
      const systemButton = buttons.find(btn => btn.getAttribute('data-value') === 'system')
      const darkButton = buttons.find(btn => btn.getAttribute('data-value') === 'dark')

      expect(systemButton).toHaveAttribute('aria-checked', 'false')
      expect(darkButton).toHaveAttribute('aria-checked', 'false')
    })
  })

  describe('keyboard navigation', () => {
    it('changes theme on Enter key', () => {
      render(<ThemeSwitcher />)

      const buttons = screen.getAllByRole('radio')
      const lightButton = buttons.find(btn => btn.getAttribute('data-value') === 'light')
      fireEvent.keyDown(lightButton!, { key: 'Enter' })

      expect(mockSetTheme).toHaveBeenCalledWith('light')
    })

    it('changes theme on Space key', () => {
      render(<ThemeSwitcher />)

      const buttons = screen.getAllByRole('radio')
      const darkButton = buttons.find(btn => btn.getAttribute('data-value') === 'dark')
      fireEvent.keyDown(darkButton!, { key: ' ' })

      expect(mockSetTheme).toHaveBeenCalledWith('dark')
    })
  })

  describe('accessibility', () => {
    it('has radiogroup role', () => {
      render(<ThemeSwitcher />)

      expect(screen.getByRole('radiogroup')).toBeInTheDocument()
    })

    it('has aria-label on radiogroup', () => {
      render(<ThemeSwitcher />)

      expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-label', 'Temă')
    })

    it('has screen reader text for each button', () => {
      render(<ThemeSwitcher />)

      expect(screen.getByRole('radio', { name: 'Ca sistemul' })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: 'Luminoasă' })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: 'Întunecată' })).toBeInTheDocument()
    })
  })

  describe('tooltips', () => {
    it('renders tooltip content', () => {
      render(<ThemeSwitcher />)

      const tooltips = screen.getAllByTestId('tooltip')
      expect(tooltips.length).toBeGreaterThanOrEqual(1)
    })
  })
})
