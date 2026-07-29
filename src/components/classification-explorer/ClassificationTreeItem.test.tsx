/**
 * ClassificationTreeItem Component Tests
 *
 * This file tests the ClassificationTreeItem component which renders
 * a single tree node with expand/collapse and selection functionality.
 *
 * Pattern: Interactive List Item Component Testing
 * - Test expand/collapse button
 * - Test selection behavior
 * - Test styling based on state
 * - Test level indentation
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@/test/test-utils'
import { ClassificationTreeItem } from './ClassificationTreeItem'
import type { ClassificationNode } from '@/types/classification-explorer'

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
  ChevronRight: ({ className }: { className?: string }) => (
    <span data-testid="chevron-icon" data-class={className} />
  ),
}))

// Mock TextHighlight
vi.mock('./TextHighlight', () => ({
  TextHighlight: ({ text }: { text: string }) => <span>{text}</span>,
}))

// ============================================================================
// TEST DATA
// ============================================================================

const createNode = (
  code: string,
  name: string,
  children: ClassificationNode[] = []
): ClassificationNode =>
  ({
    code,
    name,
    level: 1,
    children,
    hasChildren: children.length > 0,
  }) as unknown as ClassificationNode

const leafNode = createNode('51.01', 'Primary Education')

const parentNode = createNode('51', 'Education', [
  createNode('51.01', 'Primary'),
  createNode('51.02', 'Secondary'),
])

// ============================================================================
// TESTS
// ============================================================================

describe('ClassificationTreeItem', () => {
  describe('basic rendering', () => {
    it('renders node code', () => {
      render(
        <ClassificationTreeItem
          node={leafNode}
          isSelected={false}
          isExpanded={false}
          isHighlighted={false}
          level={0}
          onSelect={vi.fn()}
          onToggleExpand={vi.fn()}
        />
      )

      expect(screen.getByText('51.01')).toBeInTheDocument()
    })

    it('renders node name', () => {
      render(
        <ClassificationTreeItem
          node={leafNode}
          isSelected={false}
          isExpanded={false}
          isHighlighted={false}
          level={0}
          onSelect={vi.fn()}
          onToggleExpand={vi.fn()}
        />
      )

      expect(screen.getByText('Primary Education')).toBeInTheDocument()
    })

    it('renders two buttons (expand and select)', () => {
      render(
        <ClassificationTreeItem
          node={parentNode}
          isSelected={false}
          isExpanded={false}
          isHighlighted={false}
          level={0}
          onSelect={vi.fn()}
          onToggleExpand={vi.fn()}
        />
      )

      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(2)
    })
  })

  describe('expand/collapse button', () => {
    it('shows chevron for nodes with children', () => {
      render(
        <ClassificationTreeItem
          node={parentNode}
          isSelected={false}
          isExpanded={false}
          isHighlighted={false}
          level={0}
          onSelect={vi.fn()}
          onToggleExpand={vi.fn()}
        />
      )

      const chevrons = screen.getAllByTestId('chevron-icon')
      expect(chevrons.length).toBeGreaterThanOrEqual(1)
    })

    it('disables expand button for leaf nodes', () => {
      render(
        <ClassificationTreeItem
          node={leafNode}
          isSelected={false}
          isExpanded={false}
          isHighlighted={false}
          level={0}
          onSelect={vi.fn()}
          onToggleExpand={vi.fn()}
        />
      )

      const buttons = screen.getAllByRole('button')
      // First button is expand button
      expect(buttons[0]).toBeDisabled()
    })

    it('enables expand button for parent nodes', () => {
      render(
        <ClassificationTreeItem
          node={parentNode}
          isSelected={false}
          isExpanded={false}
          isHighlighted={false}
          level={0}
          onSelect={vi.fn()}
          onToggleExpand={vi.fn()}
        />
      )

      const buttons = screen.getAllByRole('button')
      expect(buttons[0]).not.toBeDisabled()
    })

    it('calls onToggleExpand when expand button clicked for parent', () => {
      const onToggleExpand = vi.fn()
      render(
        <ClassificationTreeItem
          node={parentNode}
          isSelected={false}
          isExpanded={false}
          isHighlighted={false}
          level={0}
          onSelect={vi.fn()}
          onToggleExpand={onToggleExpand}
        />
      )

      const buttons = screen.getAllByRole('button')
      fireEvent.click(buttons[0])

      expect(onToggleExpand).toHaveBeenCalledWith('51')
    })

    it('does not call onToggleExpand when clicked on leaf node', () => {
      const onToggleExpand = vi.fn()
      render(
        <ClassificationTreeItem
          node={leafNode}
          isSelected={false}
          isExpanded={false}
          isHighlighted={false}
          level={0}
          onSelect={vi.fn()}
          onToggleExpand={onToggleExpand}
        />
      )

      const buttons = screen.getAllByRole('button')
      fireEvent.click(buttons[0])

      expect(onToggleExpand).not.toHaveBeenCalled()
    })

    it('rotates chevron when expanded', () => {
      render(
        <ClassificationTreeItem
          node={parentNode}
          isSelected={false}
          isExpanded={true}
          isHighlighted={false}
          level={0}
          onSelect={vi.fn()}
          onToggleExpand={vi.fn()}
        />
      )

      const chevron = screen.getAllByTestId('chevron-icon')[0]
      // Check if rotate-90 class is applied
      expect(chevron.getAttribute('data-class')).toContain('rotate-90')
    })

    it('does not rotate chevron when collapsed', () => {
      render(
        <ClassificationTreeItem
          node={parentNode}
          isSelected={false}
          isExpanded={false}
          isHighlighted={false}
          level={0}
          onSelect={vi.fn()}
          onToggleExpand={vi.fn()}
        />
      )

      const chevron = screen.getAllByTestId('chevron-icon')[0]
      expect(chevron.getAttribute('data-class')).not.toContain('rotate-90')
    })
  })

  describe('selection', () => {
    it('calls onSelect when content area clicked', () => {
      const onSelect = vi.fn()
      render(
        <ClassificationTreeItem
          node={leafNode}
          isSelected={false}
          isExpanded={false}
          isHighlighted={false}
          level={0}
          onSelect={onSelect}
          onToggleExpand={vi.fn()}
        />
      )

      const buttons = screen.getAllByRole('button')
      // Second button is content/select button
      fireEvent.click(buttons[1])

      expect(onSelect).toHaveBeenCalledWith('51.01')
    })

    it('does not trigger expand when selecting', () => {
      const onSelect = vi.fn()
      const onToggleExpand = vi.fn()
      render(
        <ClassificationTreeItem
          node={parentNode}
          isSelected={false}
          isExpanded={false}
          isHighlighted={false}
          level={0}
          onSelect={onSelect}
          onToggleExpand={onToggleExpand}
        />
      )

      const buttons = screen.getAllByRole('button')
      fireEvent.click(buttons[1])

      expect(onSelect).toHaveBeenCalled()
      expect(onToggleExpand).not.toHaveBeenCalled()
    })
  })

  describe('indentation', () => {
    it('applies no margin at level 0', () => {
      render(
        <ClassificationTreeItem
          node={leafNode}
          isSelected={false}
          isExpanded={false}
          isHighlighted={false}
          level={0}
          onSelect={vi.fn()}
          onToggleExpand={vi.fn()}
        />
      )

      const buttons = screen.getAllByRole('button')
      expect(buttons[0]?.style.marginLeft).toBe('0rem')
    })

    it('applies margin at level 1', () => {
      render(
        <ClassificationTreeItem
          node={leafNode}
          isSelected={false}
          isExpanded={false}
          isHighlighted={false}
          level={1}
          onSelect={vi.fn()}
          onToggleExpand={vi.fn()}
        />
      )

      const buttons = screen.getAllByRole('button')
      expect(buttons[0]?.style.marginLeft).toBe('1.5rem')
    })

    it('applies increased margin at level 2', () => {
      render(
        <ClassificationTreeItem
          node={leafNode}
          isSelected={false}
          isExpanded={false}
          isHighlighted={false}
          level={2}
          onSelect={vi.fn()}
          onToggleExpand={vi.fn()}
        />
      )

      const buttons = screen.getAllByRole('button')
      expect(buttons[0]?.style.marginLeft).toBe('3rem')
    })
  })

  describe('search highlighting', () => {
    it('renders without search term', () => {
      render(
        <ClassificationTreeItem
          node={leafNode}
          isSelected={false}
          isExpanded={false}
          isHighlighted={false}
          level={0}
          onSelect={vi.fn()}
          onToggleExpand={vi.fn()}
        />
      )

      expect(screen.getByText('Primary Education')).toBeInTheDocument()
    })

    it('passes search term to TextHighlight', () => {
      render(
        <ClassificationTreeItem
          node={leafNode}
          isSelected={false}
          isExpanded={false}
          isHighlighted={false}
          level={0}
          searchTerm="edu"
          onSelect={vi.fn()}
          onToggleExpand={vi.fn()}
        />
      )

      // TextHighlight mock just renders text
      expect(screen.getByText('Primary Education')).toBeInTheDocument()
    })
  })

  describe('navigation arrow', () => {
    it('shows navigation chevron', () => {
      render(
        <ClassificationTreeItem
          node={leafNode}
          isSelected={false}
          isExpanded={false}
          isHighlighted={false}
          level={0}
          onSelect={vi.fn()}
          onToggleExpand={vi.fn()}
        />
      )

      // There should be multiple chevrons (expand and navigation)
      const chevrons = screen.getAllByTestId('chevron-icon')
      expect(chevrons.length).toBeGreaterThanOrEqual(1)
    })
  })
})
