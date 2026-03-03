import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@/test/test-utils'

import { NationalBudgetSectorSection } from './national-budget-sector-section'
import type { AnalyticsFilterType } from '@/schemas/charts'
import type { AggregatedNode, ExcludedItemsSummary, TreemapInput } from '@/components/budget-explorer/budget-transform'

const useTreemapDrilldownSpy = vi.hoisted(() => vi.fn())
const budgetTreemapSpy = vi.hoisted(() => vi.fn())

vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, search }: { children: React.ReactNode; to: string; search?: unknown }) => (
    <a href={`${to}?${encodeURIComponent(JSON.stringify(search ?? {}))}`}>{children}</a>
  ),
}))

vi.mock('@/components/budget-explorer/useTreemapDrilldown', () => ({
  useTreemapDrilldown: (args: unknown) => {
    useTreemapDrilldownSpy(args)
    return {
      activePrimary: 'fn' as const,
      breadcrumbs: [],
      treemapData: [{ name: 'Education', code: '65', value: 100, children: [] }] as unknown as TreemapInput[],
      excludedItemsSummary: undefined as ExcludedItemsSummary | undefined,
      onNodeClick: vi.fn(),
      onBreadcrumbClick: vi.fn(),
    }
  },
}))

vi.mock('@/components/budget-explorer/BudgetTreemap', () => ({
  BudgetTreemap: (props: unknown) => {
    budgetTreemapSpy(props)
    return <div data-testid="budget-treemap" />
  },
}))

const baseFilter: AnalyticsFilterType = {
  account_category: 'ch',
  report_type: 'Executie bugetara agregata la nivel de ordonator principal',
  report_period: {
    type: 'YEAR',
    selection: {
      dates: ['2025'],
    },
  },
  normalization: 'total',
  currency: 'RON',
}

const nodes: AggregatedNode[] = [
  { fn_c: '65', fn_n: 'Education', ec_c: '10.01', ec_n: 'Personnel', amount: 100, count: 1 },
]

describe('NationalBudgetSectorSection', () => {
  beforeEach(() => {
    useTreemapDrilldownSpy.mockClear()
    budgetTreemapSpy.mockClear()
  })

  it('renders treemap and deep-link action', () => {
    render(
      <NationalBudgetSectorSection
        sectorId="1"
        sectorLabel="Bugetul de stat"
        sectorBadge="Administrație centrală"
        sectionDescription="Agregat informativ"
        periodLabel="2025"
        accountCategory="ch"
        filter={baseFilter}
        lineItemsFilter={baseFilter}
        deepLinkTransferFilter="no-transfers"
        treemapPrimary="ec"
        treemapDepth="subchapter"
        treemapPath={['65', '65.01']}
        nodes={nodes}
        excludeEconomicPrefixes={['51.01', '51.02']}
        excludeFunctionalPrefixes={[]}
        isLoading={false}
        hasError={false}
      />,
    )

    expect(screen.getByTestId('budget-treemap')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Analyze line items/i })).toHaveAttribute('href', expect.stringContaining('/entity-analytics'))
    expect(screen.getByText('Agregat informativ')).toBeInTheDocument()

    expect(useTreemapDrilldownSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        nodes,
        initialPrimary: 'ec',
        initialPath: ['65', '65.01'],
        rootDepth: 4,
        excludeEcCodes: ['51.01', '51.02'],
        excludeFnCodes: [],
      }),
    )
  })

  it('forces functional primary for income view', () => {
    render(
      <NationalBudgetSectorSection
        sectorId="3"
        sectorLabel="Bugetul asigurărilor sociale"
        sectorBadge="Asigurări sociale"
        periodLabel="2025"
        accountCategory="vn"
        filter={{ ...baseFilter, account_category: 'vn' }}
        lineItemsFilter={{ ...baseFilter, account_category: 'vn' }}
        treemapPrimary="ec"
        treemapDepth="chapter"
        treemapPath={[]}
        nodes={nodes}
        excludeEconomicPrefixes={[]}
        excludeFunctionalPrefixes={['04', '11']}
        isLoading={false}
        hasError={false}
      />,
    )

    expect(useTreemapDrilldownSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        initialPrimary: 'fn',
        rootDepth: 2,
        excludeFnCodes: ['04', '11'],
      }),
    )
  })

  it('passes through spending transfer mode in deep link search', () => {
    render(
      <NationalBudgetSectorSection
        sectorId="2"
        sectorLabel="Bugetul local"
        sectorBadge="Administrație locală"
        periodLabel="2025"
        accountCategory="ch"
        filter={baseFilter}
        lineItemsFilter={baseFilter}
        deepLinkTransferFilter="no-transfers"
        treemapPrimary="fn"
        treemapDepth="chapter"
        treemapPath={[]}
        nodes={nodes}
        excludeEconomicPrefixes={[]}
        excludeFunctionalPrefixes={[]}
        isLoading={false}
        hasError={false}
      />,
    )

    const deepLink = screen.getByRole('link', { name: /Analyze line items/i })
    const encodedSearch = deepLink.getAttribute('href')?.split('?')[1] ?? ''
    const decodedSearch = decodeURIComponent(encodedSearch)
    expect(decodedSearch).toContain('"transferFilter":"no-transfers"')
  })

  it('shows loading state while sector query is in progress', () => {
    render(
      <NationalBudgetSectorSection
        sectorId="2"
        sectorLabel="Bugetul local"
        sectorBadge="Administrație locală"
        periodLabel="2025"
        accountCategory="ch"
        filter={baseFilter}
        lineItemsFilter={baseFilter}
        treemapPrimary="fn"
        treemapDepth="paragraph"
        nodes={nodes}
        excludeEconomicPrefixes={[]}
        excludeFunctionalPrefixes={[]}
        isLoading
        hasError={false}
      />,
    )

    expect(screen.queryByTestId('budget-treemap')).not.toBeInTheDocument()
  })
})
