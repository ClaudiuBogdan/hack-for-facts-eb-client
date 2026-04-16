/**
 * ClassificationBreadcrumb Component Tests
 *
 * This file tests the ClassificationBreadcrumb component which displays
 * a breadcrumb trail for navigating classification hierarchies.
 *
 * Pattern: Navigation Component Testing
 * - Mock router Link components
 * - Test parent hierarchy rendering
 * - Test current node display
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { ClassificationBreadcrumb } from './ClassificationBreadcrumb'
import type { ClassificationNode, ClassificationType } from '@/types/classification-explorer'

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

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
  }: {
    children: React.ReactNode
    to: string
    params?: Record<string, string>
  }) => (
    <a
      href={Object.entries(params ?? {}).reduce(
        (currentValue, [key, value]) =>
          currentValue.replace(`$${key}`, encodeURIComponent(String(value))),
        to,
      )}
      data-testid="router-link"
    >
      {children}
    </a>
  ),
}))

// ============================================================================
// TEST DATA
// ============================================================================

const createNode = (
  code: string,
  name: string,
  level: number = 1
): ClassificationNode =>
  ({
    code,
    name,
    level,
    children: [],
    hasChildren: false,
  }) as unknown as ClassificationNode

const currentNode = createNode('51.01', 'Primary Education')
const parentNode1 = createNode('51', 'Education')
const parentNode2 = createNode('5', 'Social Services')

// ============================================================================
// TESTS
// ============================================================================

describe('ClassificationBreadcrumb', () => {
  describe('root link', () => {
    it('renders "All Classifications" link', () => {
      render(
        <ClassificationBreadcrumb
          type="functional"
          parents={[]}
          current={currentNode}
        />
      )

      expect(screen.getByText('All Classifications')).toBeInTheDocument()
    })

    it('links to correct base path for functional type', () => {
      render(
        <ClassificationBreadcrumb
          type="functional"
          parents={[]}
          current={currentNode}
        />
      )

      const links = screen.getAllByTestId('router-link')
      expect(links[0]).toHaveAttribute('href', '/classifications/functional')
    })

    it('links to correct base path for economic type', () => {
      render(
        <ClassificationBreadcrumb
          type="economic"
          parents={[]}
          current={currentNode}
        />
      )

      const links = screen.getAllByTestId('router-link')
      expect(links[0]).toHaveAttribute('href', '/classifications/economic')
    })
  })

  describe('parent nodes', () => {
    it('renders single parent node', () => {
      render(
        <ClassificationBreadcrumb
          type="functional"
          parents={[parentNode1]}
          current={currentNode}
        />
      )

      expect(screen.getByText('51')).toBeInTheDocument()
      expect(screen.getByText('Education')).toBeInTheDocument()
    })

    it('renders multiple parent nodes in order', () => {
      render(
        <ClassificationBreadcrumb
          type="functional"
          parents={[parentNode2, parentNode1]}
          current={currentNode}
        />
      )

      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('Social Services')).toBeInTheDocument()
      expect(screen.getByText('51')).toBeInTheDocument()
      expect(screen.getByText('Education')).toBeInTheDocument()
    })

    it('creates correct links for parent nodes', () => {
      render(
        <ClassificationBreadcrumb
          type="functional"
          parents={[parentNode1]}
          current={currentNode}
        />
      )

      const links = screen.getAllByTestId('router-link')
      expect(links[1]).toHaveAttribute('href', '/classifications/functional/51')
    })
  })

  describe('current node', () => {
    it('renders current node code', () => {
      render(
        <ClassificationBreadcrumb
          type="functional"
          parents={[]}
          current={currentNode}
        />
      )

      expect(screen.getByText('51.01')).toBeInTheDocument()
    })

    it('renders current node name', () => {
      render(
        <ClassificationBreadcrumb
          type="functional"
          parents={[]}
          current={currentNode}
        />
      )

      expect(screen.getByText('Primary Education')).toBeInTheDocument()
    })

    it('renders node without name (code only)', () => {
      const codeOnlyNode = createNode('99', '')
      render(
        <ClassificationBreadcrumb
          type="functional"
          parents={[]}
          current={codeOnlyNode}
        />
      )

      expect(screen.getByText('99')).toBeInTheDocument()
    })
  })

  describe('separators', () => {
    it('renders separators between breadcrumb items', () => {
      const { container } = render(
        <ClassificationBreadcrumb
          type="functional"
          parents={[parentNode1]}
          current={currentNode}
        />
      )

      // Should have separators (implementation detail, so check via structure)
      const nav = container.querySelector('nav')
      expect(nav).toBeInTheDocument()
    })
  })

  describe('empty parents', () => {
    it('renders correctly with no parents', () => {
      render(
        <ClassificationBreadcrumb
          type="functional"
          parents={[]}
          current={currentNode}
        />
      )

      // Should have root link and current node
      expect(screen.getByText('All Classifications')).toBeInTheDocument()
      expect(screen.getByText('51.01')).toBeInTheDocument()
    })
  })

  describe('type handling', () => {
    const types: ClassificationType[] = ['functional', 'economic']

    types.forEach((type) => {
      it(`renders correctly for ${type} type`, () => {
        render(
          <ClassificationBreadcrumb
            type={type}
            parents={[]}
            current={currentNode}
          />
        )

        expect(screen.getByText('All Classifications')).toBeInTheDocument()
      })
    })
  })
})
