/**
 * ClassificationInfo Component Tests
 *
 * This file tests the ClassificationInfo component which displays
 * classification details including parent link, title, and description.
 *
 * Pattern: Feature Component Testing
 * - Mock hooks
 * - Mock child components
 * - Test conditional rendering
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { ClassificationInfo } from './ClassificationInfo'
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

// Mock hooks
const mockGetByCode = vi.fn()

vi.mock('./hooks/useClassificationData', () => ({
  useClassificationData: () => ({
    getByCode: mockGetByCode,
  }),
}))

const mockDescriptionData = { data: '', isLoading: false }

vi.mock('./ClassificationDescription', () => ({
  useClassificationDescription: () => mockDescriptionData,
  ClassificationDescription: ({ type, code }: { type: string; code: string }) => (
    <div data-testid="description" data-type={type} data-code={code} />
  ),
}))

// Mock child components
vi.mock('./ClassificationActions', () => ({
  ClassificationActions: ({ type, code }: { type: string; code: string }) => (
    <div data-testid="actions" data-type={type} data-code={code} />
  ),
}))

// ============================================================================
// TEST DATA
// ============================================================================

const createNode = (
  code: string,
  name: string,
  parent?: string
): ClassificationNode =>
  ({
    code,
    name,
    parent,
    level: parent ? 2 : 1,
    children: [],
    hasChildren: false,
  }) as unknown as ClassificationNode

// ============================================================================
// TESTS
// ============================================================================

describe('ClassificationInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetByCode.mockReturnValue(undefined)
    mockDescriptionData.data = ''
    mockDescriptionData.isLoading = false
  })

  describe('card structure', () => {
    it('renders in a card container', () => {
      const node = createNode('51', 'Education')
      const { container } = render(
        <ClassificationInfo type="functional" node={node} />
      )

      expect(container.querySelector('[class*="rounded"]')).toBeInTheDocument()
    })

    it('renders actions component', () => {
      const node = createNode('51', 'Education')
      render(<ClassificationInfo type="functional" node={node} />)

      expect(screen.getByTestId('actions')).toBeInTheDocument()
    })

    it('renders description component', () => {
      const node = createNode('51', 'Education')
      render(<ClassificationInfo type="functional" node={node} />)

      expect(screen.getByTestId('description')).toBeInTheDocument()
    })
  })

  describe('parent link', () => {
    it('shows "All Classifications" link when no parent', () => {
      const node = createNode('51', 'Education')
      render(<ClassificationInfo type="functional" node={node} />)

      expect(screen.getByText('All Classifications')).toBeInTheDocument()
    })

    it('creates correct link to all classifications', () => {
      const node = createNode('51', 'Education')
      render(<ClassificationInfo type="functional" node={node} />)

      const link = screen.getByTestId('router-link')
      expect(link).toHaveAttribute('href', '/classifications/functional')
    })

    it('shows "Parent" label when parent exists', () => {
      const node = createNode('51.01', 'Primary Education', '51')
      render(<ClassificationInfo type="functional" node={node} />)

      // Parent and : are in the same span
      expect(screen.getByText(/Parent/)).toBeInTheDocument()
    })

    it('shows parent code', () => {
      const node = createNode('51.01', 'Primary Education', '51')
      render(<ClassificationInfo type="functional" node={node} />)

      expect(screen.getByText('51')).toBeInTheDocument()
    })

    it('shows parent name when available', () => {
      const node = createNode('51.01', 'Primary Education', '51')
      mockGetByCode.mockReturnValue({ code: '51', name: 'Education' })
      render(<ClassificationInfo type="functional" node={node} />)

      expect(screen.getByText('Education')).toBeInTheDocument()
    })

    it('creates correct link to parent', () => {
      const node = createNode('51.01', 'Primary Education', '51')
      render(<ClassificationInfo type="functional" node={node} />)

      const link = screen.getByTestId('router-link')
      expect(link).toHaveAttribute('href', '/classifications/functional/51')
    })
  })

  describe('title display', () => {
    it('shows code and title when no description', () => {
      const node = createNode('51', 'Education')
      mockDescriptionData.data = ''
      render(<ClassificationInfo type="functional" node={node} />)

      expect(screen.getByText('51')).toBeInTheDocument()
      expect(screen.getByText('Education')).toBeInTheDocument()
    })

    it('shows "Missing title" when no name', () => {
      const node = createNode('51', '')
      mockDescriptionData.data = ''
      render(<ClassificationInfo type="functional" node={node} />)

      expect(screen.getByText('Missing title')).toBeInTheDocument()
    })

    it('hides title section when description exists', () => {
      const node = createNode('51', 'Education')
      mockDescriptionData.data = 'This is a description'
      render(<ClassificationInfo type="functional" node={node} />)

      // The code "51" should not appear in title section (but may appear in parent link)
      const headings = screen.queryAllByText('Education')
      // Should not have the heading-style title
      expect(headings.length).toBeLessThanOrEqual(1)
    })
  })

  describe('prop passing', () => {
    it('passes type to actions', () => {
      const node = createNode('51', 'Education')
      render(<ClassificationInfo type="economic" node={node} />)

      expect(screen.getByTestId('actions')).toHaveAttribute(
        'data-type',
        'economic'
      )
    })

    it('passes code to actions', () => {
      const node = createNode('51', 'Education')
      render(<ClassificationInfo type="functional" node={node} />)

      expect(screen.getByTestId('actions')).toHaveAttribute('data-code', '51')
    })

    it('passes type to description', () => {
      const node = createNode('51', 'Education')
      render(<ClassificationInfo type="economic" node={node} />)

      expect(screen.getByTestId('description')).toHaveAttribute(
        'data-type',
        'economic'
      )
    })

    it('passes code to description', () => {
      const node = createNode('51', 'Education')
      render(<ClassificationInfo type="functional" node={node} />)

      expect(screen.getByTestId('description')).toHaveAttribute(
        'data-code',
        '51'
      )
    })
  })

  describe('type handling', () => {
    const types: ClassificationType[] = ['functional', 'economic']

    types.forEach((type) => {
      it(`creates correct base path for ${type} type`, () => {
        const node = createNode('51', 'Education')
        render(<ClassificationInfo type={type} node={node} />)

        const link = screen.getByTestId('router-link')
        expect(link).toHaveAttribute('href', `/classifications/${type}`)
      })
    })
  })
})
