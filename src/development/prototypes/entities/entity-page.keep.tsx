/**
 * Variant C — polish only the shell. The landing's frame, rules, numbered
 * bands, the new hero and the compact bar, wrapped around the components the
 * entity page renders *today*: the explainer, the financial summary cards,
 * the trends chart, the treemap with its grouped line items, the category
 * evolution, the subordinates, the reports, the view navigator and the FAQ.
 *
 * Nothing inside a reused component is restyled; their rounded cards sit
 * inside the bands as they are, so the comparison isolates what the shell
 * and the header buy on their own.
 *
 * Every props-fed component takes the fixture through a small adapter below.
 * Two components fetch for themselves (`ChallengeEntityCategoryEvolution`,
 * `ChallengeEntityReportsSection`); they render live and show their own
 * loading or error state until the API is running.
 */
import { useState, type ReactNode } from 'react'
import { BudgetTreemap } from '@/components/budget-explorer/BudgetTreemap'
import type { AggregatedNode, TreemapInput } from '@/components/budget-explorer/budget-transform'
import { useTreemapAmountFilter } from '@/components/budget-explorer/useTreemapAmountFilter'
import { useTreemapDrilldown } from '@/components/budget-explorer/useTreemapDrilldown'
import { EntityFinancialSummary, type EntityFinancialSummaryTrend } from '@/components/entities/EntityFinancialSummary'
import { EntityFinancialTrends } from '@/components/entities/EntityFinancialTrends'
import { ChallengeEntityAnalysisExplainer } from '@/features/challenges/components/analysis/challenge-entity-analysis-explainer'
import {
  buildChallengeEntityAnalysisReportPeriod,
  buildChallengeEntityAnalysisTrendPeriod,
} from '@/features/challenges/components/analysis/challenge-entity-analysis-queries'
import { ChallengeEntityCategoryEvolution } from '@/features/challenges/components/analysis/challenge-entity-category-evolution'
import { ChallengeEntityFaqSection } from '@/features/challenges/components/analysis/challenge-entity-faq-section'
import { ChallengeEntityGroupedLineItems } from '@/features/challenges/components/analysis/challenge-entity-grouped-line-items'
import type { ChallengeEntityMarkdownExportPageContext } from '@/features/challenges/components/analysis/challenge-entity-markdown-export'
import { ChallengeEntityReportsSection } from '@/features/challenges/components/analysis/challenge-entity-reports-section'
import {
  ChallengeEntitySubordinatesSection,
  type ChallengeEntitySubordinateCardItem,
} from '@/features/challenges/components/analysis/challenge-entity-subordinates-section'
import type { ChallengeEntityViewOption } from '@/features/challenges/components/analysis/challenge-entity-view-menu'
import { ChallengeEntityViewNavigator } from '@/features/challenges/components/analysis/challenge-entity-view-navigator'
import type { ExecutionLineItem } from '@/lib/api/entities'
import type { NormalizationOptions } from '@/lib/normalization'
import { cn } from '@/lib/utils'
import type { AnalyticsSeries } from '@/schemas/charts'
import type { ExecutionGqlReportType } from '@/schemas/reporting'
import { ENTITY_PAGE_TOP_ID, EntityPageSectionBands, EntityPageTop, SectionBand } from './entity-page.bands'
import { MonoLabel, PROTOTYPE_MARKER, SectionRail } from './entity-page.parts'
import {
  ENTITY_PAGE_SECTIONS,
  ENTITY_PAGE_VIEW_LABELS,
  ENTITY_PAGE_VIEWS,
  type EntityPageData,
  type EntityPagePieceProps,
  type EntityPageSectionId,
  type EntityPageView,
} from './entity-page.types'

const TOTAL = ENTITY_PAGE_SECTIONS.length
const LOCALE = 'ro' as const

/** The report period the reused components expect: a whole year, no quarter or month. */
function yearPeriod(year: number) {
  return buildChallengeEntityAnalysisReportPeriod({
    periodType: 'YEAR',
    selectedYear: year,
    quarter: 'Q1',
    month: '01',
  })
}

function toNormalizationOptions(state: EntityPagePieceProps['state']): NormalizationOptions {
  return {
    normalization: state.normalization,
    currency: 'RON',
    inflation_adjusted: false,
    show_period_growth: false,
  }
}

function toExecutionReportType(data: EntityPageData): ExecutionGqlReportType {
  const type = data.entity.default_report_type
  return type === 'SECONDARY_AGGREGATED' || type === 'DETAILED' ? type : 'PRINCIPAL_AGGREGATED'
}

// ---------------------------------------------------------------------------
// Adapters: fixture → the shapes the existing components take
// ---------------------------------------------------------------------------

function toSeries({
  data,
  pick,
  seriesId,
}: {
  readonly data: EntityPageData
  readonly pick: (point: EntityPageData['trend'][number]) => number
  readonly seriesId: string
}): AnalyticsSeries {
  return {
    seriesId,
    xAxis: { name: 'Year', type: 'STRING', unit: '' },
    yAxis: { name: 'Amount', type: 'FLOAT', unit: 'RON' },
    data: data.trend.map((point) => ({ x: String(point.year), y: pick(point) })),
  }
}

function toSummaryTrend({
  data,
  year,
  pick,
}: {
  readonly data: EntityPageData
  readonly year: number
  readonly pick: (point: EntityPageData['trend'][number]) => number
}): EntityFinancialSummaryTrend | undefined {
  const current = data.trend.find((point) => point.year === year)
  const previous = data.trend.find((point) => point.year === year - 1)
  if (!current || !previous) return undefined
  return { currentValue: pick(current), previousValue: pick(previous) }
}

function toAggregatedNodes(lineItems: readonly ExecutionLineItem[]): AggregatedNode[] {
  return lineItems.map((lineItem) => ({
    fn_c: lineItem.functionalClassification?.functional_code ?? '',
    fn_n: lineItem.functionalClassification?.functional_name ?? '',
    ec_c: lineItem.economicClassification?.economic_code ?? '',
    ec_n: lineItem.economicClassification?.economic_name ?? '',
    amount: Number(lineItem.amount ?? 0),
    count: 1,
  }))
}

function toSubordinateCards({
  data,
  state,
}: Pick<EntityPagePieceProps, 'data' | 'state'>): ChallengeEntitySubordinateCardItem[] {
  return data.subordinates.map((subordinate) => ({
    entityCui: subordinate.cui,
    entityName: subordinate.name,
    entityTypeLabel: subordinate.kind,
    totalSpending: subordinate.totalExpenses,
    entitySearch: {
      year: state.year,
      period: 'YEAR',
      report_type: 'DETAILED',
      main_creditor_cui: data.entity.cui,
      normalization: state.normalization,
    },
  }))
}

function isEntityPageView(value: string): value is EntityPageView {
  return (ENTITY_PAGE_VIEWS as readonly string[]).includes(value)
}

// ---------------------------------------------------------------------------
// 01 — explainer, summary cards, trends chart
// ---------------------------------------------------------------------------

function KeepSynthesis({ data, state, onStateChange }: EntityPagePieceProps) {
  const normalizationOptions = toNormalizationOptions(state)
  const { year } = state
  return (
    <div className="space-y-4 sm:space-y-6">
      <ChallengeEntityAnalysisExplainer
        locale={LOCALE}
        reportType={toExecutionReportType(data)}
        inflationAdjusted={false}
        copyVariant={data.entity.is_uat ? 'city-hall' : 'entity'}
      />
      <EntityFinancialSummary
        totalIncome={data.entity.totalIncome}
        totalExpenses={data.entity.totalExpenses}
        budgetBalance={data.entity.budgetBalance}
        periodLabel={year === data.period.year ? data.period.label : String(year)}
        normalizationOptions={normalizationOptions}
        trends={{
          income: toSummaryTrend({ data, year, pick: (point) => point.income }),
          expenses: toSummaryTrend({ data, year, pick: (point) => point.expenses }),
          balance: toSummaryTrend({ data, year, pick: (point) => point.income - point.expenses }),
        }}
        density="compact-desktop"
      />
      <EntityFinancialTrends
        entityCui={data.entity.cui}
        incomeTrend={toSeries({ data, seriesId: 'income', pick: (point) => point.income })}
        expenseTrend={toSeries({ data, seriesId: 'expenses', pick: (point) => point.expenses })}
        balanceTrend={toSeries({ data, seriesId: 'balance', pick: (point) => point.income - point.expenses })}
        currentYear={year}
        entityName={data.entity.name}
        normalizationOptions={normalizationOptions}
        onYearChange={(next) => onStateChange({ year: next })}
        periodType="YEAR"
        showControls={false}
        showChartEditorLink={false}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// 02 / 03 — treemap + grouped line items, one instance per account category
// ---------------------------------------------------------------------------

/** The existing page's grouping toggle, in the shell's control style (same as the hero's normalization toggle). */
function GroupingToggle({
  value,
  onChange,
  disabledEconomic,
}: {
  readonly value: 'fn' | 'ec'
  readonly onChange: (next: 'fn' | 'ec') => void
  readonly disabledEconomic?: boolean
}) {
  const options = [
    { value: 'fn', label: 'Funcțional' },
    { value: 'ec', label: 'Economic' },
  ] as const
  return (
    <div
      role="group"
      aria-label="Grupare"
      className="inline-flex h-9 overflow-hidden rounded-md border border-input bg-background text-sm"
    >
      {options.map((option, index) => {
        const isPressed = value === option.value
        const isDisabled = option.value === 'ec' && disabledEconomic
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isPressed}
            disabled={isDisabled}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex h-full items-center px-3 font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
              index > 0 && 'border-l border-input',
              isPressed
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

function KeepComposition({
  data,
  state,
  onStateChange,
  accountCategory,
}: EntityPagePieceProps & { readonly accountCategory: 'ch' | 'vn' }) {
  const lineItems = data.lineItems.filter((item) => item.account_category === accountCategory)
  const normalizationOptions = toNormalizationOptions(state)
  // Income has no economic breakdown worth showing (the real page says so in
  // its own words); the toggle is pinned to functional there.
  const primary = accountCategory === 'vn' ? 'fn' : state.grouping
  const { activePrimary, treemapData, breadcrumbs, excludedItemsSummary, onNodeClick, onBreadcrumbClick } =
    useTreemapDrilldown({
      nodes: toAggregatedNodes(lineItems),
      initialPrimary: primary,
      rootDepth: 2,
    })
  const { amountFilter } = useTreemapAmountFilter({
    data: treemapData,
    normalization: normalizationOptions.normalization,
    currency: normalizationOptions.currency,
  })
  const total =
    accountCategory === 'vn' ? Number(data.entity.totalIncome ?? 0) : Number(data.entity.totalExpenses ?? 0)
  const title = accountCategory === 'vn' ? 'Structura veniturilor' : 'Structura cheltuielilor'
  const visibleNodes: readonly TreemapInput[] = treemapData
  const exportContext: ChallengeEntityMarkdownExportPageContext = {
    locale: LOCALE,
    entity: {
      name: data.entity.name,
      cui: data.entity.cui,
      countyName: data.entity.uat?.county_name,
      population: data.entity.uat?.population,
    },
    filters: {
      year: state.year,
      reportType: toExecutionReportType(data),
      normalization: state.normalization,
      currency: 'RON',
      inflationAdjusted: false,
      treemapAccountCategory: accountCategory,
      budgetTotal: total,
      treemapPrimary: primary,
      currentTreemapPrimary: activePrimary,
      treemapDepth: 'chapter',
      breadcrumbs,
    },
    treemap: { title, visibleNodes },
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <GroupingToggle
          value={primary}
          onChange={(next) => onStateChange({ grouping: next })}
          disabledEconomic={accountCategory === 'vn'}
        />
        <MonoLabel className="text-muted-foreground">
          {accountCategory === 'vn' ? 'Total venituri' : 'Total cheltuieli'} · {data.period.label}
        </MonoLabel>
      </div>
      <BudgetTreemap
        data={treemapData}
        primary={activePrimary}
        onNodeClick={onNodeClick}
        onBreadcrumbClick={onBreadcrumbClick}
        path={breadcrumbs}
        normalization={normalizationOptions.normalization}
        currency={normalizationOptions.currency}
        excludedItemsSummary={excludedItemsSummary}
        amountFilter={amountFilter}
      />
      <ChallengeEntityGroupedLineItems
        accountTitle={title}
        lineItems={lineItems}
        accountCategory={accountCategory}
        groupBy={primary}
        depth="chapter"
        currentYear={state.year}
        normalizationOptions={normalizationOptions}
        exportContext={exportContext}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// 04 — category evolution (fetches for itself)
// ---------------------------------------------------------------------------

function KeepEvolution({ data, state, onStateChange }: EntityPagePieceProps) {
  const [accountCategory, setAccountCategory] = useState<'ch' | 'vn'>('ch')
  const [primary, setPrimary] = useState<'fn' | 'ec'>('fn')
  const normalizationOptions = toNormalizationOptions(state)
  return (
    <ChallengeEntityCategoryEvolution
      locale={LOCALE}
      entityCui={data.entity.cui}
      lineItems={[...data.lineItems]}
      currentYear={state.year}
      reportType={toExecutionReportType(data)}
      periodType="YEAR"
      trendPeriod={buildChallengeEntityAnalysisTrendPeriod({ periodType: 'YEAR', selectedYear: state.year })}
      queryNormalizationOptions={normalizationOptions}
      displayNormalizationOptions={normalizationOptions}
      onYearChange={(next) => onStateChange({ year: next })}
      accountCategory={accountCategory}
      primary={primary}
      onStateChange={(patch) => {
        if (patch.evolutionAccountCategory) setAccountCategory(patch.evolutionAccountCategory)
        if (patch.evolutionPrimary) setPrimary(patch.evolutionPrimary)
      }}
    />
  )
}

// ---------------------------------------------------------------------------
// The variant
// ---------------------------------------------------------------------------

type KeepSection = {
  readonly id: Exclude<EntityPageSectionId, 'sinteza'>
  readonly render: (props: EntityPagePieceProps) => ReactNode
}

const KEEP_SECTIONS: readonly KeepSection[] = [
  { id: 'structura', render: (props) => <KeepComposition {...props} accountCategory="ch" /> },
  { id: 'venituri', render: (props) => <KeepComposition {...props} accountCategory="vn" /> },
  { id: 'evolutie', render: (props) => <KeepEvolution {...props} /> },
  {
    id: 'subordonate',
    render: ({ data, state }) => (
      <ChallengeEntitySubordinatesSection
        locale={LOCALE}
        items={toSubordinateCards({ data, state })}
        totalResultsCount={data.subordinatesTotal}
        isLoading={false}
        isError={false}
        onRetry={() => undefined}
        normalizationOptions={toNormalizationOptions(state)}
        emptyStateKind="spending"
        variant="subordinates"
      />
    ),
  },
  {
    id: 'rapoarte',
    render: ({ data, state }) => (
      <ChallengeEntityReportsSection
        locale={LOCALE}
        entityCui={data.entity.cui}
        reportPeriod={yearPeriod(state.year)}
        reportType={data.entity.default_report_type}
      />
    ),
  },
  {
    id: 'intrebari',
    render: ({ state, onStateChange }) => {
      const views: readonly ChallengeEntityViewOption[] = ENTITY_PAGE_VIEWS.map((view) => ({
        id: view,
        label: ENTITY_PAGE_VIEW_LABELS[view],
      }))
      return (
        <div className="space-y-4 sm:space-y-6">
          <ChallengeEntityViewNavigator
            views={views}
            activeView={state.view}
            onViewChange={(view) => {
              if (isEntityPageView(view)) onStateChange({ view })
            }}
            locale={LOCALE}
          />
          <ChallengeEntityFaqSection locale={LOCALE} inflationAdjusted={false} />
        </div>
      )
    },
  },
]

export function EntityPageKeep(props: EntityPagePieceProps) {
  const isMain = props.state.view === 'main-info'
  return (
    <div id={ENTITY_PAGE_TOP_ID} className="relative w-full bg-background" data-dev-marker={PROTOTYPE_MARKER}>
      <EntityPageTop {...props} />
      {isMain ? (
        <>
          <SectionBand id="sinteza" framed labelledBy="sinteza">
            <SectionRail id="sinteza" number="01" label="Sinteză" total={TOTAL} />
            <div className="mt-8">
              <KeepSynthesis {...props} />
            </div>
          </SectionBand>
          {KEEP_SECTIONS.map(({ id, render }) => {
            const section = ENTITY_PAGE_SECTIONS.find((entry) => entry.id === id)
            if (!section) return null
            return (
              <SectionBand key={id} id={id} framed labelledBy={id}>
                <SectionRail id={id} number={section.number} label={section.label} total={TOTAL} />
                <div className="mt-8">{render(props)}</div>
              </SectionBand>
            )
          })}
        </>
      ) : (
        <EntityPageSectionBands {...props} framed />
      )}
    </div>
  )
}
