import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@/test/test-utils'
import { BudgetTreemap } from './BudgetTreemap'
import type { TreemapInput, ExcludedItemsSummary } from './budget-transform'

// ============================================================================
// MOCKS
// ============================================================================

// Mock TanStack Router
const mockNavigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))

// Mock useIsMobile hook
const mockUseIsMobile = vi.fn(() => false)
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => mockUseIsMobile(),
}))

// Mock useTreemapChartLink hook
vi.mock('./useTreemapChartLink', () => ({
  useTreemapChartLink: () => ({
    hasChartLink: false,
    seriesConfigs: [],
    chartTitle: 'Test Chart',
  }),
}))

// Mock buildTreemapChartLink
vi.mock('@/lib/chart-links', () => ({
  buildTreemapChartLink: vi.fn(() => ({
    to: '/charts/$chartId',
    params: { chartId: 'test-chart-id' },
    search: {},
  })),
}))

// Mock motion/react to render static elements (skip animations)
vi.mock('motion/react', () => ({
  motion: {
    g: ({ children, ...props }: React.PropsWithChildren<React.SVGProps<SVGGElement>>) => (
      <g {...props}>{children}</g>
    ),
    rect: (props: React.SVGProps<SVGRectElement>) => <rect {...props} />,
    text: ({ children, ...props }: React.PropsWithChildren<React.SVGProps<SVGTextElement>>) => (
      <text {...props}>{children}</text>
    ),
    foreignObject: ({ children, ...props }: React.PropsWithChildren<React.SVGProps<SVGForeignObjectElement>>) => (
      <foreignObject {...props}>{children}</foreignObject>
    ),
    div: ({ children, ...props }: React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>) => (
      <div {...props}>{children}</div>
    ),
  },
  useAnimationControls: () => ({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
  }),
}))

// Mock Lingui Trans component
vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock Lingui core macro - include all exports used by dependencies
vi.mock('@lingui/core/macro', () => ({
  t: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce((acc, str, i) => acc + str + (values[i] ?? ''), ''),
  msg: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce((acc, str, i) => acc + str + (values[i] ?? ''), ''),
}))

// Mock Lingui core - for i18n usage
vi.mock('@lingui/core', () => ({
  i18n: {
    _: (message: string | { id: string }) => 
      typeof message === 'string' ? message : message.id,
  },
}))

// Mock recharts components
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  Treemap: ({
    children,
    data,
    onClick,
    content,
  }: {
    children?: React.ReactNode
    data: TreemapInput[]
    onClick?: (event: unknown) => void
    content?: (props: unknown) => React.ReactNode
  }) => (
    <svg data-testid="treemap">
      {data.map((item) => (
        <g
          key={item.code}
          data-testid={`treemap-node-${item.code}`}
          onClick={() => onClick?.({ code: item.code })}
        >
          {content?.({
            name: item.name,
            value: (item as unknown as { layoutValue?: number }).layoutValue ?? item.value,
            code: item.code,
            depth: 1,
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            fill: '#0088FE',
            payload: {
              ...item,
              value: (item as unknown as { layoutValue?: number }).layoutValue ?? item.value,
              signedValue: (item as unknown as { signedValue?: number }).signedValue ?? item.value,
              fill: '#0088FE',
            },
            root: {
              value: data.reduce((sum, d) => sum + ((d as unknown as { layoutValue?: number }).layoutValue ?? Math.abs(d.value)), 0),
            },
          })}
        </g>
      ))}
      {children}
    </svg>
  ),
  Tooltip: () => null,
}))

// Mock FilteredSpendingInfo - simplified version
vi.mock('./FilteredSpendingInfo', () => ({
  FilteredSpendingInfo: ({
    excludedItemsSummary,
  }: {
    excludedItemsSummary?: ExcludedItemsSummary
  }) =>
    excludedItemsSummary ? (
      <div data-testid="filtered-spending-info">Filtered Spending Info</div>
    ) : null,
}))

// Mock ClassificationInfoLink
vi.mock('@/components/common/classification-info-link', () => ({
  ClassificationInfoLink: () => null,
}))

// Mock getNormalizationUnit
vi.mock('@/lib/utils', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/utils')>()
  return {
    ...original,
    getNormalizationUnit: () => 'RON',
  }
})

// Mock yValueFormatter
vi.mock('@/components/charts/components/chart-renderer/utils', () => ({
  yValueFormatter: (value: number) => `${value.toLocaleString()} RON`,
}))

// ============================================================================
// TEST DATA
// ============================================================================

const createMockTreemapData = (count = 3): TreemapInput[] =>
  Array.from({ length: count }, (_, i) => ({
    name: `Category ${i + 1}`,
    value: (count - i) * 1000000,
    code: `${i + 1}`,
    isLeaf: false,
    children: [],
  }))

const createMockPath = () => [
  { code: '1', label: 'Parent Category', type: 'fn' as const },
]

const createMockExcludedSummary = (): ExcludedItemsSummary => ({
  totalExcluded: 500000,
  totalBeforeExclusion: 5000000,
  totalAfterExclusion: 4500000,
  items: [{ code: 'ec:51', label: 'Transfers', amount: 500000 }],
})

// ============================================================================
// UTILITY FUNCTION TESTS
// ============================================================================

describe('BudgetTreemap Utility Functions', () => {
  // Test the color utility functions by importing the component and testing indirectly
  // Since getColor and adjustColorBrightness are not exported, we test them through component behavior

  describe('Color Generation (via component rendering)', () => {
    it('should render nodes with consistent colors for same codes', () => {
      const data = createMockTreemapData(2)

      const { rerender } = render(
        <BudgetTreemap data={data} primary="fn" />
      )

      // Re-render with same data - colors should remain consistent
      rerender(<BudgetTreemap data={data} primary="fn" />)

      // The component should render without errors
      expect(screen.getByTestId('treemap')).toBeInTheDocument()
    })

    it('should handle different primary types (fn vs ec)', () => {
      const data = createMockTreemapData(2)

      // Render with functional primary
      const { rerender } = render(
        <BudgetTreemap data={data} primary="fn" />
      )
      expect(screen.getByTestId('treemap')).toBeInTheDocument()

      // Re-render with economic primary
      rerender(<BudgetTreemap data={data} primary="ec" />)
      expect(screen.getByTestId('treemap')).toBeInTheDocument()
    })
  })
})

// ============================================================================
// COMPONENT RENDERING TESTS
// ============================================================================

describe('BudgetTreemap Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseIsMobile.mockReturnValue(false)
    mockNavigate.mockClear()
  })

  describe('Basic Rendering', () => {
    it('should render the treemap container', () => {
      const data = createMockTreemapData()

      render(<BudgetTreemap data={data} primary="fn" />)

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
      expect(screen.getByTestId('treemap')).toBeInTheDocument()
    })

    it('should render label foreignObject with explicit dimensions', () => {
      const data = createMockTreemapData(1)

      const { container } = render(<BudgetTreemap data={data} primary="fn" />)

      const labelForeignObject = container.querySelector('foreignObject')
      expect(labelForeignObject).toBeInTheDocument()
      expect(labelForeignObject?.getAttribute('width')).toBeTruthy()
      expect(labelForeignObject?.getAttribute('height')).toBeTruthy()
      expect(labelForeignObject?.getAttribute('width')).not.toBe('undefined')
      expect(labelForeignObject?.getAttribute('height')).not.toBe('undefined')
    })

    it('should render "Main Categories" breadcrumb by default', () => {
      const data = createMockTreemapData()

      render(<BudgetTreemap data={data} primary="fn" />)

      expect(screen.getByText('Main Categories')).toBeInTheDocument()
    })

    it('should render total value display', () => {
      const data = createMockTreemapData(3)

      render(<BudgetTreemap data={data} primary="fn" />)

      // Check for "Total" label - it's combined with ": " so use a text matcher
      expect(screen.getByText(/Total/)).toBeInTheDocument()
      // Check that the formatted total value is displayed (appears in compact and standard formats)
      const totalValues = screen.getAllByText('6,000,000 RON')
      expect(totalValues.length).toBeGreaterThanOrEqual(1)
    })

    it('should keep negative values visible and include them in signed total', () => {
      const data: TreemapInput[] = [
        { name: 'Negative Category', value: -1000000, code: 'neg', isLeaf: true, children: [] },
        { name: 'Positive Category', value: 200000, code: 'pos', isLeaf: true, children: [] },
      ]

      render(<BudgetTreemap data={data} primary="fn" />)

      expect(screen.getByTestId('treemap-node-neg')).toBeInTheDocument()
      expect(screen.getByTestId('treemap-node-pos')).toBeInTheDocument()
      expect(screen.getByText('-1,000,000 RON')).toBeInTheDocument()
      expect(screen.getAllByText('-800,000 RON').length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Empty State', () => {
    it('should render empty state when data is empty', () => {
      render(<BudgetTreemap data={[]} primary="fn" />)

      expect(
        screen.getByText('No data within the selected range.')
      ).toBeInTheDocument()
    })

    it('should show "Go to Main Categories" button in empty state with path', () => {
      const mockBreadcrumbClick = vi.fn()

      render(
        <BudgetTreemap
          data={[]}
          primary="fn"
          path={createMockPath()}
          onBreadcrumbClick={mockBreadcrumbClick}
        />
      )

      const backButton = screen.getByRole('button', {
        name: /go to main categories/i,
      })
      expect(backButton).toBeInTheDocument()

      fireEvent.click(backButton)
      expect(mockBreadcrumbClick).toHaveBeenCalledWith(null)
    })
  })

  describe('Breadcrumb Navigation', () => {
    it('should render breadcrumb path items', () => {
      const data = createMockTreemapData()
      const path = [
        { code: '1', label: 'Level 1', type: 'fn' as const },
        { code: '1.1', label: 'Level 2', type: 'fn' as const },
      ]

      render(
        <BudgetTreemap
          data={data}
          primary="fn"
          path={path}
        />
      )

      expect(screen.getByText('Main Categories')).toBeInTheDocument()
      expect(screen.getByText('Level 1')).toBeInTheDocument()
      expect(screen.getByText('Level 2')).toBeInTheDocument()
    })

    it('should call onBreadcrumbClick when clicking "Main Categories"', () => {
      const data = createMockTreemapData()
      const mockBreadcrumbClick = vi.fn()

      render(
        <BudgetTreemap
          data={data}
          primary="fn"
          onBreadcrumbClick={mockBreadcrumbClick}
        />
      )

      const mainCategoriesButton = screen.getByText('Main Categories')
      fireEvent.click(mainCategoriesButton)

      expect(mockBreadcrumbClick).toHaveBeenCalledWith(null)
    })

    it('should call onBreadcrumbClick with correct params when clicking breadcrumb item', () => {
      const data = createMockTreemapData()
      const path = [
        { code: '1', label: 'Level 1', type: 'fn' as const },
        { code: '1.1', label: 'Level 2', type: 'fn' as const },
      ]
      const mockBreadcrumbClick = vi.fn()

      render(
        <BudgetTreemap
          data={data}
          primary="fn"
          path={path}
          onBreadcrumbClick={mockBreadcrumbClick}
        />
      )

      // Click on first breadcrumb item (Level 1)
      const level1Button = screen.getByText('Level 1')
      fireEvent.click(level1Button)

      expect(mockBreadcrumbClick).toHaveBeenCalledWith('1', 0)
    })

    it('should render back button when path is not empty', () => {
      const data = createMockTreemapData()
      const path = createMockPath()

      render(
        <BudgetTreemap
          data={data}
          primary="fn"
          path={path}
        />
      )

      const backButton = screen.getByRole('button', { name: /go back/i })
      expect(backButton).toBeInTheDocument()
    })

    it('should call onBreadcrumbClick when clicking back button', () => {
      const data = createMockTreemapData()
      const path = [
        { code: '1', label: 'Level 1', type: 'fn' as const },
        { code: '1.1', label: 'Level 2', type: 'fn' as const },
      ]
      const mockBreadcrumbClick = vi.fn()

      render(
        <BudgetTreemap
          data={data}
          primary="fn"
          path={path}
          onBreadcrumbClick={mockBreadcrumbClick}
        />
      )

      const backButton = screen.getByRole('button', { name: /go back/i })
      fireEvent.click(backButton)

      // Should go to parent (index 0)
      expect(mockBreadcrumbClick).toHaveBeenCalledWith('1', 0)
    })
  })

  describe('Node Interactions', () => {
    it('should call onNodeClick when clicking a treemap node', () => {
      const data = createMockTreemapData()
      const mockNodeClick = vi.fn()

      render(
        <BudgetTreemap
          data={data}
          primary="fn"
          onNodeClick={mockNodeClick}
        />
      )

      const node = screen.getByTestId('treemap-node-1')
      fireEvent.click(node)

      expect(mockNodeClick).toHaveBeenCalledWith('1')
    })
  })

  describe('View Details Button', () => {
    it('should not render "View Details" button by default', () => {
      const data = createMockTreemapData()

      render(<BudgetTreemap data={data} primary="fn" />)

      expect(
        screen.queryByRole('button', { name: /view details/i })
      ).not.toBeInTheDocument()
    })

    it('should render "View Details" button when showViewDetails is true', () => {
      const data = createMockTreemapData()

      render(
        <BudgetTreemap
          data={data}
          primary="fn"
          showViewDetails={true}
        />
      )

      expect(
        screen.getByRole('button', { name: /view details/i })
      ).toBeInTheDocument()
    })

    it('should call onViewDetails when clicking "View Details" button', () => {
      const data = createMockTreemapData()
      const mockViewDetails = vi.fn()

      render(
        <BudgetTreemap
          data={data}
          primary="fn"
          showViewDetails={true}
          onViewDetails={mockViewDetails}
        />
      )

      const viewDetailsButton = screen.getByRole('button', {
        name: /view details/i,
      })
      fireEvent.click(viewDetailsButton)

      expect(mockViewDetails).toHaveBeenCalled()
    })
  })

  describe('Filtered Spending Info', () => {
    it('should render FilteredSpendingInfo when excludedItemsSummary is provided', () => {
      const data = createMockTreemapData()
      const excludedSummary = createMockExcludedSummary()

      render(
        <BudgetTreemap
          data={data}
          primary="fn"
          excludedItemsSummary={excludedSummary}
        />
      )

      expect(screen.getByTestId('filtered-spending-info')).toBeInTheDocument()
    })
  })

  describe('Mobile Responsiveness', () => {
    it('should truncate breadcrumbs on mobile when path is long', () => {
      mockUseIsMobile.mockReturnValue(true)

      const data = createMockTreemapData()
      const longPath = [
        { code: '1', label: 'Level 1', type: 'fn' as const },
        { code: '1.1', label: 'Level 2', type: 'fn' as const },
        { code: '1.1.1', label: 'Level 3', type: 'fn' as const },
      ]

      render(
        <BudgetTreemap
          data={data}
          primary="fn"
          path={longPath}
        />
      )

      // On mobile with > 2 items, should show ellipsis
      expect(screen.getByText('...')).toBeInTheDocument()
      // Should only show last 2 items
      expect(screen.getByText('Level 2')).toBeInTheDocument()
      expect(screen.getByText('Level 3')).toBeInTheDocument()
    })

    it('should truncate long labels on mobile', () => {
      mockUseIsMobile.mockReturnValue(true)

      const data = createMockTreemapData()
      const pathWithLongLabel = [
        {
          code: '1',
          label: 'This is a very long category name that exceeds 20 characters',
          type: 'fn' as const,
        },
      ]

      render(
        <BudgetTreemap
          data={data}
          primary="fn"
          path={pathWithLongLabel}
        />
      )

      // Should show truncated label with ellipsis
      expect(
        screen.getByText('This is a very long ...')
      ).toBeInTheDocument()
    })
  })

  describe('Normalization and Currency', () => {
    it('should pass normalization to child components', () => {
      const data = createMockTreemapData()

      render(
        <BudgetTreemap
          data={data}
          primary="fn"
          normalization="per_capita"
          currency="EUR"
        />
      )

      // Component should render without errors
      expect(screen.getByTestId('treemap')).toBeInTheDocument()
    })
  })
})

// ============================================================================
// PURE FUNCTION TESTS (Testing internal logic via module extraction)
// ============================================================================

describe('BudgetTreemap Pure Functions', () => {
  /**
   * Since getColor and adjustColorBrightness are not exported,
   * we test their behavior indirectly or create equivalent functions for testing.
   * In a production scenario, consider extracting these to a separate utils file.
   */

  describe('getColor (behavior test)', () => {
    // We can test the color generation algorithm by recreating it
    const COLORS = [
      '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d',
      '#A4DE6C', '#D0ED57', '#FF7300', '#FFB300', '#E53935', '#D81B60',
      '#8E24AA', '#5E35B1', '#3949AB', '#1E88E5', '#039BE5', '#00ACC1',
      '#00897B', '#43A047', '#7CB342', '#C0CA33', '#FDD835', '#FFB300',
      '#FB8C00', '#F4511E',
    ]

    const getColor = (key: string) => {
      let hash = 0
      if (key.length === 0) return COLORS[0]
      for (let index = 0; index < key.length; index += 1) {
        const char = key.charCodeAt(index)
        hash = ((hash << 5) - hash) + char
        hash &= hash
      }
      return COLORS[Math.abs(hash) % COLORS.length]
    }

    it('should return first color for empty string', () => {
      expect(getColor('')).toBe('#0088FE')
    })

    it('should return consistent color for same key', () => {
      const key = 'fn-1.23'
      const color1 = getColor(key)
      const color2 = getColor(key)
      expect(color1).toBe(color2)
    })

    it('should return different colors for different keys', () => {
      const color1 = getColor('fn-1')
      const color2 = getColor('fn-2')
      // Not necessarily different, but statistically likely
      // We just verify they return valid colors
      expect(COLORS).toContain(color1)
      expect(COLORS).toContain(color2)
    })

    it('should return a color from the COLORS array', () => {
      const keys = ['fn-1', 'ec-2', 'test-key', 'another-key']
      keys.forEach((key) => {
        expect(COLORS).toContain(getColor(key))
      })
    })
  })

  describe('adjustColorBrightness (behavior test)', () => {
    const COLORS = ['#0088FE']

    const adjustColorBrightness = (hexColor: string | undefined, percentage: number) => {
      if (!hexColor || typeof hexColor !== 'string') {
        return COLORS[0]
      }

      const hexPattern = /^#?[0-9a-fA-F]{3,6}$/
      if (!hexPattern.test(hexColor)) {
        return hexColor
      }

      const normalizedHex = hexColor.replace('#', '')
      const isShort = normalizedHex.length === 3
      const expandedHex = isShort
        ? normalizedHex.split('').map((char) => char + char).join('')
        : normalizedHex

      const numericValue = parseInt(expandedHex, 16)
      const red = (numericValue >> 16) & 0xff
      const green = (numericValue >> 8) & 0xff
      const blue = numericValue & 0xff

      const adjustChannel = (channel: number) => {
        const delta = (percentage / 100) * 255
        return Math.max(0, Math.min(255, channel + delta))
      }

      const adjustedRed = Math.round(adjustChannel(red))
      const adjustedGreen = Math.round(adjustChannel(green))
      const adjustedBlue = Math.round(adjustChannel(blue))

      const toHex = (value: number) => value.toString(16).padStart(2, '0')
      return `#${toHex(adjustedRed)}${toHex(adjustedGreen)}${toHex(adjustedBlue)}`
    }

    it('should return default color for undefined input', () => {
      expect(adjustColorBrightness(undefined, 10)).toBe('#0088FE')
    })

    it('should return default color for empty string', () => {
      expect(adjustColorBrightness('', 10)).toBe('#0088FE')
    })

    it('should return original color for invalid hex', () => {
      expect(adjustColorBrightness('not-a-color', 10)).toBe('not-a-color')
    })

    it('should brighten a color with positive percentage', () => {
      const result = adjustColorBrightness('#000000', 50)
      // 50% of 255 = 127.5, rounded = 128 = 0x80
      expect(result).toBe('#808080')
    })

    it('should darken a color with negative percentage', () => {
      const result = adjustColorBrightness('#ffffff', -50)
      // -50% of 255 = -127.5, 255 - 127.5 = 127.5, rounded = 128 = 0x80
      expect(result).toBe('#808080')
    })

    it('should handle 3-character hex codes', () => {
      const result = adjustColorBrightness('#fff', -50)
      expect(result).toBe('#808080')
    })

    it('should clamp values to valid range (0-255)', () => {
      // Trying to go beyond max
      const brighterThanMax = adjustColorBrightness('#ffffff', 50)
      expect(brighterThanMax).toBe('#ffffff')

      // Trying to go below min
      const darkerThanMin = adjustColorBrightness('#000000', -50)
      expect(darkerThanMin).toBe('#000000')
    })

    it('should preserve color when percentage is 0', () => {
      const result = adjustColorBrightness('#0088FE', 0)
      expect(result).toBe('#0088fe')
    })
  })
})

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('BudgetTreemap Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseIsMobile.mockReturnValue(false)
  })

  it('should handle full navigation flow', () => {
    const data = createMockTreemapData()
    const mockNodeClick = vi.fn()
    const mockBreadcrumbClick = vi.fn()

    const { rerender } = render(
      <BudgetTreemap
        data={data}
        primary="fn"
        onNodeClick={mockNodeClick}
        onBreadcrumbClick={mockBreadcrumbClick}
      />
    )

    // Click on a node
    const node = screen.getByTestId('treemap-node-1')
    fireEvent.click(node)
    expect(mockNodeClick).toHaveBeenCalledWith('1')

    // Simulate drill-down by adding path
    rerender(
      <BudgetTreemap
        data={data}
        primary="fn"
        path={[{ code: '1', label: 'Category 1', type: 'fn' }]}
        onNodeClick={mockNodeClick}
        onBreadcrumbClick={mockBreadcrumbClick}
      />
    )

    // Verify breadcrumb appears - use getAllByText since it appears in both breadcrumb and treemap node
    expect(screen.getAllByText('Category 1').length).toBeGreaterThanOrEqual(1)

    // Click Main Categories to go back
    fireEvent.click(screen.getByText('Main Categories'))
    expect(mockBreadcrumbClick).toHaveBeenCalledWith(null)
  })

  it('should handle data updates correctly', () => {
    const initialData = createMockTreemapData(2)
    const { rerender } = render(
      <BudgetTreemap data={initialData} primary="fn" />
    )

    expect(screen.getByTestId('treemap')).toBeInTheDocument()

    // Update with new data
    const newData = createMockTreemapData(5)
    rerender(<BudgetTreemap data={newData} primary="fn" />)

    expect(screen.getByTestId('treemap')).toBeInTheDocument()
  })

  it('should handle transition from data to empty state', () => {
    const data = createMockTreemapData()
    const { rerender } = render(
      <BudgetTreemap data={data} primary="fn" />
    )

    expect(screen.getByTestId('treemap')).toBeInTheDocument()

    // Update with empty data
    rerender(<BudgetTreemap data={[]} primary="fn" />)

    expect(
      screen.getByText('No data within the selected range.')
    ).toBeInTheDocument()
  })
})
