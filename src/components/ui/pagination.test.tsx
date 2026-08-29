/**
 * Pagination Component Tests
 *
 * This file tests the Pagination component which provides
 * accessible pagination controls with page size selection.
 *
 * Pattern: Interactive Navigation Component Testing
 * - Test page navigation
 * - Test page size selection
 * - Test boundary conditions
 * - Test disabled states
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@/test/test-utils'
import { Pagination } from './pagination'

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
  ChevronLeft: () => <span data-testid="chevron-left" />,
  ChevronRight: () => <span data-testid="chevron-right" />,
  ChevronsLeft: () => <span data-testid="chevrons-left" />,
  ChevronsRight: () => <span data-testid="chevrons-right" />,
}))

// Mock Select component
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value }: { children: React.ReactNode; onValueChange: (v: string) => void; value: string }) => (
    <div data-testid="select" data-value={value}>
      {children}
      <button data-testid="select-trigger" onClick={() => onValueChange('50')}>
        Change
      </button>
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`select-item-${value}`}>{children}</div>
  ),
  SelectValue: () => <span />,
}))

// Mock Input component
vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input data-testid="page-jump-input" {...props} />
  ),
}))

// ============================================================================
// TESTS
// ============================================================================

describe('Pagination', () => {
  const defaultProps = {
    currentPage: 1,
    pageSize: 25,
    totalCount: 100,
    onPageChange: vi.fn(),
  }

  describe('entries info', () => {
    it('shows correct entries range', () => {
      render(<Pagination {...defaultProps} />)

      expect(screen.getByText(/Se afișează 1–25 din 100 rânduri/)).toBeInTheDocument()
    })

    it('shows correct range for middle page', () => {
      render(<Pagination {...defaultProps} currentPage={2} />)

      expect(screen.getByText(/Se afișează 26–50 din 100 rânduri/)).toBeInTheDocument()
    })

    it('shows correct range for last page', () => {
      render(<Pagination {...defaultProps} currentPage={4} />)

      expect(screen.getByText(/Se afișează 76–100 din 100 rânduri/)).toBeInTheDocument()
    })

    it('shows 0-0 for empty results', () => {
      render(<Pagination {...defaultProps} totalCount={0} />)

      expect(screen.getByText(/Se afișează 0–0 din 0 rânduri/)).toBeInTheDocument()
    })
  })

  describe('navigation buttons', () => {
    it('renders first page button', () => {
      render(<Pagination {...defaultProps} />)

      expect(screen.getByLabelText('Prima pagină')).toBeInTheDocument()
    })

    it('renders previous page button', () => {
      render(<Pagination {...defaultProps} />)

      expect(screen.getByLabelText('Pagina anterioară')).toBeInTheDocument()
    })

    it('renders next page button', () => {
      render(<Pagination {...defaultProps} />)

      expect(screen.getByLabelText('Pagina următoare')).toBeInTheDocument()
    })

    it('renders last page button', () => {
      render(<Pagination {...defaultProps} />)

      expect(screen.getByLabelText(/Ultima pagină/)).toBeInTheDocument()
    })

    it('disables first and previous on first page', () => {
      render(<Pagination {...defaultProps} currentPage={1} />)

      expect(screen.getByLabelText('Prima pagină')).toBeDisabled()
      expect(screen.getByLabelText('Pagina anterioară')).toBeDisabled()
    })

    it('disables next and last on last page', () => {
      render(<Pagination {...defaultProps} currentPage={4} />)

      expect(screen.getByLabelText('Pagina următoare')).toBeDisabled()
      expect(screen.getByLabelText(/Ultima pagină/)).toBeDisabled()
    })

    it('enables all buttons on middle page', () => {
      render(<Pagination {...defaultProps} currentPage={2} />)

      expect(screen.getByLabelText('Prima pagină')).not.toBeDisabled()
      expect(screen.getByLabelText('Pagina anterioară')).not.toBeDisabled()
      expect(screen.getByLabelText('Pagina următoare')).not.toBeDisabled()
      expect(screen.getByLabelText(/Ultima pagină/)).not.toBeDisabled()
    })
  })

  describe('page change callbacks', () => {
    it('calls onPageChange with 1 when first clicked', () => {
      const onPageChange = vi.fn()
      render(<Pagination {...defaultProps} currentPage={2} onPageChange={onPageChange} />)

      fireEvent.click(screen.getByLabelText('Prima pagină'))
      expect(onPageChange).toHaveBeenCalledWith(1)
    })

    it('calls onPageChange with previous page', () => {
      const onPageChange = vi.fn()
      render(<Pagination {...defaultProps} currentPage={3} onPageChange={onPageChange} />)

      fireEvent.click(screen.getByLabelText('Pagina anterioară'))
      expect(onPageChange).toHaveBeenCalledWith(2)
    })

    it('calls onPageChange with next page', () => {
      const onPageChange = vi.fn()
      render(<Pagination {...defaultProps} currentPage={2} onPageChange={onPageChange} />)

      fireEvent.click(screen.getByLabelText('Pagina următoare'))
      expect(onPageChange).toHaveBeenCalledWith(3)
    })

    it('calls onPageChange with last page', () => {
      const onPageChange = vi.fn()
      render(<Pagination {...defaultProps} currentPage={2} onPageChange={onPageChange} />)

      fireEvent.click(screen.getByLabelText(/Ultima pagină/))
      expect(onPageChange).toHaveBeenCalledWith(4)
    })
  })

  describe('page size selector', () => {
    it('renders page size selector when onPageSizeChange provided', () => {
      render(<Pagination {...defaultProps} onPageSizeChange={vi.fn()} />)

      expect(screen.getByText('Rânduri:')).toBeInTheDocument()
    })

    it('does not render page size selector when onPageSizeChange not provided', () => {
      render(<Pagination {...defaultProps} />)

      expect(screen.queryByText('Rânduri:')).not.toBeInTheDocument()
    })

    it('calls onPageSizeChange when size changed', () => {
      const onPageSizeChange = vi.fn()
      render(<Pagination {...defaultProps} onPageSizeChange={onPageSizeChange} />)

      fireEvent.click(screen.getByTestId('select-trigger'))
      expect(onPageSizeChange).toHaveBeenCalledWith(50)
    })
  })

  describe('page jump input', () => {
    it('renders page jump input when more than 1 page', () => {
      render(<Pagination {...defaultProps} />)

      expect(screen.getByTestId('page-jump-input')).toBeInTheDocument()
    })

    it('does not render page jump when only 1 page', () => {
      render(<Pagination {...defaultProps} totalCount={10} pageSize={25} />)

      expect(screen.queryByTestId('page-jump-input')).not.toBeInTheDocument()
    })

    it('calls onPageChange on Enter key', () => {
      const onPageChange = vi.fn()
      render(<Pagination {...defaultProps} onPageChange={onPageChange} />)

      const input = screen.getByTestId('page-jump-input')
      fireEvent.change(input, { target: { value: '3' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      expect(onPageChange).toHaveBeenCalledWith(3)
    })

    it('clamps page number to valid range', () => {
      const onPageChange = vi.fn()
      render(<Pagination {...defaultProps} onPageChange={onPageChange} />)

      const input = screen.getByTestId('page-jump-input')
      fireEvent.change(input, { target: { value: '100' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      expect(onPageChange).toHaveBeenCalledWith(4) // Max page
    })
  })

  describe('loading state', () => {
    it('disables all buttons when loading', () => {
      render(<Pagination {...defaultProps} currentPage={2} isLoading={true} />)

      // Note: First/Previous are disabled when on page 1, but here we're on page 2
      // All buttons should be disabled due to loading
      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).toBeDisabled()
      })
    })
  })

  describe('single page', () => {
    it('handles single page correctly', () => {
      render(<Pagination {...defaultProps} totalCount={5} pageSize={25} />)

      expect(screen.getByText(/Se afișează 1–5 din 5 rânduri/)).toBeInTheDocument()
      expect(screen.getByLabelText('Prima pagină')).toBeDisabled()
      expect(screen.getByLabelText(/Ultima pagină/)).toBeDisabled()
    })
  })

  describe('edge cases', () => {
    it('handles zero total count', () => {
      render(<Pagination {...defaultProps} totalCount={0} />)

      expect(screen.getByText(/Se afișează 0–0 din 0 rânduri/)).toBeInTheDocument()
    })

    it('handles current page exceeding total pages', () => {
      render(<Pagination {...defaultProps} currentPage={100} totalCount={50} />)

      // Should clamp to last page (2)
      expect(screen.getByText(/Se afișează 26–50 din 50 rânduri/)).toBeInTheDocument()
    })

    it('handles negative current page', () => {
      render(<Pagination {...defaultProps} currentPage={-1} />)

      // Should default to page 1
      expect(screen.getByText(/Se afișează 1–25 din 100 rânduri/)).toBeInTheDocument()
    })
  })

  describe('custom page size options', () => {
    it('uses custom page size options', () => {
      render(
        <Pagination
          {...defaultProps}
          onPageSizeChange={vi.fn()}
          pageSizeOptions={[5, 10, 20]}
        />
      )

      expect(screen.getByTestId('select-item-5')).toBeInTheDocument()
      expect(screen.getByTestId('select-item-10')).toBeInTheDocument()
      expect(screen.getByTestId('select-item-20')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has aria-live for entries info', () => {
      render(<Pagination {...defaultProps} />)

      expect(screen.getByText(/Se afișează/)).toHaveAttribute('aria-live', 'polite')
    })

    it('has aria-label on navigation', () => {
      render(<Pagination {...defaultProps} />)

      expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'Paginare')
    })
  })
})
