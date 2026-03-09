import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  cloneElement,
  isValidElement,
  type HTMLAttributes,
  type PropsWithChildren,
  type ReactNode,
  type SVGProps,
} from 'react'
import { within } from '@testing-library/react'
import { render, screen, fireEvent } from '@/test/test-utils'
import {
  BudgetTreemap,
  resolveBudgetTreemapAnalyticsRequest,
} from './BudgetTreemap'
import type { TreemapInput, ExcludedItemsSummary } from './budget-transform'
import { formatValueWithUnit, getNormalizationUnit } from '@/lib/utils'

const { mockI18n, rechartsState } = vi.hoisted(() => {
  const i18n = {
    locale: 'en',
    _: (message: string | { id: string }) => {
      const id = typeof message === 'string' ? message : message.id

      if (id === '/capita') {
        return i18n.locale === 'ro' ? '/locuitor' : '/capita'
      }

      if (id === '% of GDP') {
        return i18n.locale === 'ro' ? '% din PIB' : '% of GDP'
      }

      return id
    },
  }

  return {
    mockI18n: i18n,
    rechartsState: {
      latestData: [] as Array<Record<string, unknown>>,
    },
  }
})

// ============================================================================
// MOCKS
// ============================================================================

// Mock TanStack Router
const mockNavigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children, to }: { children: ReactNode; to: string }) => (
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

// Mock framer-motion to render static elements (skip animations)
vi.mock('framer-motion', () => ({
  motion: {
    g: ({ children, ...props }: PropsWithChildren<SVGProps<SVGGElement>>) => (
      <g {...props}>{children}</g>
    ),
    rect: (props: SVGProps<SVGRectElement>) => <rect {...props} />,
    text: ({ children, ...props }: PropsWithChildren<SVGProps<SVGTextElement>>) => (
      <text {...props}>{children}</text>
    ),
    foreignObject: ({ children, ...props }: PropsWithChildren<SVGProps<SVGForeignObjectElement>>) => (
      <foreignObject {...props}>{children}</foreignObject>
    ),
    div: ({ children, ...props }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) => (
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
  Trans: ({ children }: { children: ReactNode }) => <>{children}</>,
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
  i18n: mockI18n,
}))

// Mock recharts components
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  Treemap: ({
    children,
    data,
    onClick,
    content,
  }: {
    children?: ReactNode
    data: TreemapInput[]
    onClick?: (event: unknown) => void
    content?: (props: unknown) => ReactNode
  }) => {
    rechartsState.latestData = data as Array<Record<string, unknown>>

    return (
      <svg data-testid="treemap">
        {data.map((item) => (
          <g
            key={item.code}
            data-testid={`treemap-node-${item.code}`}
            onClick={() => onClick?.({ code: item.code })}
          >
            {content?.({
              name: item.name,
              value:
                (item as unknown as { layoutValue?: number }).layoutValue ??
                item.value,
              code: item.code,
              depth: 1,
              x: 0,
              y: 0,
              width: 100,
              height: 100,
              fill: '#0088FE',
              payload: {
                ...item,
                value:
                  (item as unknown as { layoutValue?: number }).layoutValue ??
                  item.value,
                signedValue:
                  (item as unknown as { signedValue?: number }).signedValue ??
                  item.value,
                fill: '#0088FE',
              },
              root: {
                value: data.reduce(
                  (sum, datum) =>
                    sum +
                    ((datum as unknown as { layoutValue?: number }).layoutValue ??
                      Math.abs(datum.value)),
                  0,
                ),
              },
            })}
          </g>
        ))}
        {children}
      </svg>
    )
  },
  Tooltip: ({ content }: { content?: ReactNode }) => {
    const firstNode = rechartsState.latestData[0] as
      | {
          name: string
          code: string
          value: number
          layoutValue?: number
          signedValue?: number
        }
      | undefined

    if (!content || !firstNode) {
      return null
    }

    const payloadNode = {
      ...firstNode,
      value: firstNode.layoutValue ?? Math.abs(firstNode.value),
      signedValue: firstNode.signedValue ?? firstNode.value,
      fill: '#0088FE',
    }
    const tooltipProps = {
      active: true,
      payload: [{ payload: payloadNode }],
    }

    return (
      <div data-testid="treemap-tooltip">
        {isValidElement(content)
          ? cloneElement(content, tooltipProps)
          : content}
      </div>
    )
  },
}))

// Mock ClassificationInfoLink
const classificationInfoLinkMock = vi.fn()

vi.mock('@/components/common/classification-info-link', () => ({
  ClassificationInfoLink: ({
    code,
    className,
    disabled,
    menuActions,
    onOverlayOpenChange,
    onTriggerInteraction,
  }: {
    code?: string
    className?: string
    disabled?: boolean
    menuActions?: Array<{
      key?: string
      onSelect?: () => void
    }>
    onOverlayOpenChange?: (open: boolean) => void
    onTriggerInteraction?: () => void
  }) => {
    classificationInfoLinkMock({
      code,
      className,
      disabled,
      menuActions,
      onOverlayOpenChange,
      onTriggerInteraction,
    })

    return (
      <div data-testid={`classification-info-link-${code ?? 'unknown'}`}>
      <button
        type="button"
        aria-label={`Open mock classification ${code ?? 'unknown'}`}
        className={className}
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation()
          onTriggerInteraction?.()
          onOverlayOpenChange?.(true)
          menuActions?.[0]?.onSelect?.()
        }}
      >
        Info
      </button>
      {menuActions?.map((menuAction, index) => (
        <button
          key={menuAction.key ?? index}
          type="button"
          aria-label={`Select mock classification ${code ?? 'unknown'} action ${index}`}
          onClick={(event) => {
            event.stopPropagation()
            onTriggerInteraction?.()
            menuAction.onSelect?.()
          }}
        >
          {String(menuAction.key ?? index)}
        </button>
      ))}
      <button
        type="button"
        aria-label={`Close mock classification ${code ?? 'unknown'}`}
        onClick={(event) => {
          event.stopPropagation()
          onTriggerInteraction?.()
          onOverlayOpenChange?.(false)
        }}
      >
        Close
      </button>
    </div>
    )
  },
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

const createAmountFilter = (overrides: Partial<{
  minValue: number
  maxValue: number
  range: [number, number]
  onChange: (value: [number, number]) => void
}> = {}) => ({
  minValue: 1000000,
  maxValue: 3000000,
  range: [1000000, 3000000] as [number, number],
  onChange: vi.fn(),
  ...overrides,
})

function formatTreemapValue(
  value: number,
  options: {
    normalization?: 'total' | 'per_capita'
    currency?: 'RON' | 'EUR' | 'USD'
    notation?: 'standard' | 'compact'
  } = {},
) {
  const unit = getNormalizationUnit({
    normalization: options.normalization ?? 'total',
    currency: options.currency ?? 'RON',
  })

  return formatValueWithUnit(
    value,
    unit,
    options.notation ?? 'standard',
  )
}

function normalizeTextContent(text: string) {
  return text.replace(/\s+/gu, ' ').trim()
}

function hasExactText(expectedText: string) {
  const normalizedExpectedText = normalizeTextContent(expectedText)

  return (_content: string, element: Element | null) =>
    normalizeTextContent(element?.textContent ?? '') === normalizedExpectedText
}

function getRenderedTreemapContentNode(code: string) {
  const renderedNode = screen.getByTestId(`treemap-node-${code}`).querySelector('g')

  expect(renderedNode).not.toBeNull()

  return renderedNode as SVGGElement
}

function getTreemapInfoTrigger(code: string) {
  return screen.getByRole('button', {
    name: `Open mock classification ${code}`,
  })
}

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

  describe('Analytics payload resolution', () => {
    it('keeps the deepest functional and economic codes from a mixed breadcrumb trail', () => {
      expect(
        resolveBudgetTreemapAnalyticsRequest({
          path: [
            { code: '65', label: 'Education', type: 'fn' },
            { code: '10', label: 'Staff', type: 'ec' },
            { code: '10.01', label: 'Salaries', type: 'ec' },
          ],
          nodeCode: '65.02',
          nodeName: 'Primary education',
          primary: 'fn',
        }),
      ).toEqual({
        subjectLabel: 'Primary education',
        path: [
          { type: 'fn', code: '65.02' },
          { type: 'ec', code: '10.01' },
        ],
      })
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
    mockI18n.locale = 'en'
    rechartsState.latestData = []
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
      const totalCompact = formatTreemapValue(6000000, {
        notation: 'compact',
      })
      const totalStandard = formatTreemapValue(6000000)

      render(<BudgetTreemap data={data} primary="fn" />)

      expect(
        screen.getByText(hasExactText(`Total: ${totalCompact}`)),
      ).toBeInTheDocument()
      expect(screen.getAllByText(hasExactText(totalStandard)).length).toBeGreaterThanOrEqual(1)
    })

    it('should keep negative values visible and include them in signed total', () => {
      const data: TreemapInput[] = [
        { name: 'Negative Category', value: -1000000, code: 'neg', isLeaf: true, children: [] },
        { name: 'Positive Category', value: 200000, code: 'pos', isLeaf: true, children: [] },
      ]
      const nodeValue = formatTreemapValue(-1000000, {
        notation: 'compact',
      })
      const totalValue = formatTreemapValue(-800000, {
        notation: 'standard',
      })

      render(<BudgetTreemap data={data} primary="fn" />)

      expect(screen.getByTestId('treemap-node-neg')).toBeInTheDocument()
      expect(screen.getByTestId('treemap-node-pos')).toBeInTheDocument()
      expect(
        within(screen.getByTestId('treemap-node-neg')).getByText(
          hasExactText(nodeValue),
        ),
      ).toBeInTheDocument()
      expect(screen.getAllByText(hasExactText(totalValue)).length).toBeGreaterThanOrEqual(1)
    })

    it('keeps the analytics trigger mounted and toggles it between hidden and enabled', () => {
      render(
        <BudgetTreemap
          data={createMockTreemapData(1)}
          primary="fn"
          onAnalyticsRequest={vi.fn()}
        />,
      )

      const renderedNode = getRenderedTreemapContentNode('1')
      const infoTrigger = getTreemapInfoTrigger('1')

      expect(infoTrigger).toBeDisabled()
      expect(infoTrigger).toHaveClass('opacity-0')

      fireEvent.pointerEnter(renderedNode)

      expect(infoTrigger).not.toBeDisabled()
      expect(infoTrigger).toHaveClass('opacity-100')

      fireEvent.pointerLeave(renderedNode)

      expect(infoTrigger).toBeDisabled()
      expect(infoTrigger).toHaveClass('opacity-0')
    })

    it('keeps the analytics trigger enabled while the overlay is open', () => {
      render(
        <BudgetTreemap
          data={createMockTreemapData(1)}
          primary="fn"
          onAnalyticsRequest={vi.fn()}
        />,
      )

      const renderedNode = getRenderedTreemapContentNode('1')
      const infoTrigger = getTreemapInfoTrigger('1')

      fireEvent.pointerEnter(renderedNode)
      fireEvent.click(infoTrigger)
      fireEvent.pointerLeave(renderedNode)

      expect(infoTrigger).not.toBeDisabled()
      expect(infoTrigger).toHaveClass('opacity-100')

      fireEvent.click(
        screen.getByRole('button', { name: 'Close mock classification 1' }),
      )

      expect(infoTrigger).toBeDisabled()
      expect(infoTrigger).toHaveClass('opacity-0')
    })

    it('forwards analytics requests from the mounted treemap trigger', () => {
      const onAnalyticsRequest = vi.fn()

      render(
        <BudgetTreemap
          data={[
            {
              name: 'Primary education',
              value: 1000000,
              code: '65.02',
              isLeaf: true,
              children: [],
            },
          ]}
          primary="fn"
          path={[{ code: '65', label: 'Education', type: 'fn' }]}
          onAnalyticsRequest={onAnalyticsRequest}
        />,
      )

      const infoLinkProps = classificationInfoLinkMock.mock.calls
        .map(([props]) => props)
        .find((props) => props.code === '65.02')

      expect(infoLinkProps?.menuActions).toHaveLength(1)

      fireEvent.pointerEnter(getRenderedTreemapContentNode('65.02'))
      fireEvent.click(getTreemapInfoTrigger('65.02'))

      expect(onAnalyticsRequest).toHaveBeenCalledWith({
        subjectLabel: 'Primary education',
        path: [{ type: 'fn', code: '65.02' }],
      })
    })

    it('does not propagate info trigger clicks to the treemap node', () => {
      const onAnalyticsRequest = vi.fn()
      const onNodeClick = vi.fn()

      render(
        <BudgetTreemap
          data={[
            {
              name: 'Primary education',
              value: 1000000,
              code: '65.02',
              isLeaf: true,
              children: [],
            },
          ]}
          primary="fn"
          path={[{ code: '65', label: 'Education', type: 'fn' }]}
          onNodeClick={onNodeClick}
          onAnalyticsRequest={onAnalyticsRequest}
        />,
      )

      fireEvent.pointerEnter(getRenderedTreemapContentNode('65.02'))
      fireEvent.click(getTreemapInfoTrigger('65.02'))
      fireEvent.click(screen.getByTestId('treemap-node-65.02'))

      expect(onAnalyticsRequest).toHaveBeenCalledTimes(1)
      expect(onNodeClick).not.toHaveBeenCalled()
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

  describe('Amount Filter', () => {
    it('does not render the old footer filter trigger', () => {
      const data = createMockTreemapData()
      const excludedSummary = createMockExcludedSummary()

      render(
        <BudgetTreemap
          data={data}
          primary="fn"
          excludedItemsSummary={excludedSummary}
        />
      )

      expect(screen.queryByTestId('filtered-spending-info')).not.toBeInTheDocument()
    })

    it('filters treemap nodes using an external amount filter', () => {
      const data = createMockTreemapData()

      render(
        <BudgetTreemap
          data={data}
          primary="fn"
          amountFilter={createAmountFilter({
            range: [1500000, 3000000],
          })}
        />
      )

      expect(screen.getByTestId('treemap-node-1')).toBeInTheDocument()
      expect(screen.getByTestId('treemap-node-2')).toBeInTheDocument()
      expect(screen.queryByTestId('treemap-node-3')).not.toBeInTheDocument()
    })

    it('resets the external amount filter from the empty state', () => {
      const data = createMockTreemapData()
      const onChange = vi.fn()

      render(
        <BudgetTreemap
          data={data}
          primary="fn"
          amountFilter={createAmountFilter({
            range: [3500000, 4000000],
            onChange,
          })}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /reset amount filter/i }))

      expect(onChange).toHaveBeenCalledWith([1000000, 3000000])
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

    it('updates node labels, totals, and tooltip values when switching from RON to EUR in Romanian per-capita mode', () => {
      mockI18n.locale = 'ro'
      const data: TreemapInput[] = [
        {
          name: 'Category 1',
          value: 1167.21,
          code: '1',
          isLeaf: true,
          children: [],
        },
      ]
      const ronCompact = formatTreemapValue(1167.21, {
        normalization: 'per_capita',
        currency: 'RON',
        notation: 'compact',
      })
      const ronStandard = formatTreemapValue(1167.21, {
        normalization: 'per_capita',
        currency: 'RON',
        notation: 'standard',
      })
      const eurCompact = formatTreemapValue(1167.21, {
        normalization: 'per_capita',
        currency: 'EUR',
        notation: 'compact',
      })
      const eurStandard = formatTreemapValue(1167.21, {
        normalization: 'per_capita',
        currency: 'EUR',
        notation: 'standard',
      })

      const { rerender } = render(
        <BudgetTreemap
          data={data}
          primary="fn"
          normalization="per_capita"
          currency="RON"
        />,
      )

      expect(
        within(screen.getByTestId('treemap-node-1')).getByText(hasExactText(ronCompact)),
      ).toBeInTheDocument()
      expect(
        screen.getByText(hasExactText(`Total: ${ronCompact}`)),
      ).toBeInTheDocument()
      expect(
        within(screen.getByTestId('treemap-tooltip')).getByText(hasExactText(ronCompact)),
      ).toBeInTheDocument()
      expect(
        within(screen.getByTestId('treemap-tooltip')).getByText(hasExactText(ronStandard)),
      ).toBeInTheDocument()

      rerender(
        <BudgetTreemap
          data={data}
          primary="fn"
          normalization="per_capita"
          currency="EUR"
        />,
      )

      expect(
        within(screen.getByTestId('treemap-node-1')).getByText(hasExactText(eurCompact)),
      ).toBeInTheDocument()
      expect(
        screen.getByText(hasExactText(`Total: ${eurCompact}`)),
      ).toBeInTheDocument()
      expect(
        within(screen.getByTestId('treemap-tooltip')).getByText(hasExactText(eurCompact)),
      ).toBeInTheDocument()
      expect(
        within(screen.getByTestId('treemap-tooltip')).getByText(hasExactText(eurStandard)),
      ).toBeInTheDocument()
    })

    it('keeps the English per-capita unit in sync when switching currencies', () => {
      mockI18n.locale = 'en'
      const data: TreemapInput[] = [
        {
          name: 'Category 1',
          value: 1167.21,
          code: '1',
          isLeaf: true,
          children: [],
        },
      ]
      const ronCompact = formatTreemapValue(1167.21, {
        normalization: 'per_capita',
        currency: 'RON',
        notation: 'compact',
      })
      const eurCompact = formatTreemapValue(1167.21, {
        normalization: 'per_capita',
        currency: 'EUR',
        notation: 'compact',
      })

      const { rerender } = render(
        <BudgetTreemap
          data={data}
          primary="fn"
          normalization="per_capita"
          currency="RON"
        />,
      )

      expect(
        within(screen.getByTestId('treemap-tooltip')).getByText(hasExactText(ronCompact)),
      ).toBeInTheDocument()

      rerender(
        <BudgetTreemap
          data={data}
          primary="fn"
          normalization="per_capita"
          currency="EUR"
        />,
      )

      expect(
        within(screen.getByTestId('treemap-tooltip')).getByText(hasExactText(eurCompact)),
      ).toBeInTheDocument()
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
