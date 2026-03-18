import {
  createDefaultAdvancedMapAnalyticsBinsPreset,
  createDefaultAdvancedMapAnalyticsSeries,
  getGeoJsonDatasetUnit,
  parseAdvancedMapAnalyticsUrlState,
  type AdvancedMapAnalyticsUrlState,
} from '@/schemas/advanced-map-analytics'
import type {
  AnalyticsFilterType,
  CommitmentsFilterType,
  CommitmentsSeriesConfiguration,
  SeriesConfiguration,
} from '@/schemas/charts'
import type { ChartUrlState } from '@/components/charts/page-schema'
import { buildTreemapChartState } from '@/lib/chart-links'
import type { ChallengeLocale } from '../../types'
import type {
  BudgetItemAnalyticsPageContext,
} from './budget-item-analytics-context'
import {
  formatBudgetItemAnalyticsPeriodLabel,
} from './budget-item-analytics-context'
import type {
  BudgetItemAnalyticsTab,
  BudgetItemAnalyticsViewState,
} from './budget-item-analytics-search-state'

const DEFAULT_MAP_CENTER: [number, number] = [45.92365, 25.0035]
const DEFAULT_MAP_ZOOM = 7.3
const STATIC_SERIES_TIMESTAMP = '1970-01-01T00:00:00.000Z'

export type BudgetItemAnalyticsResolvedViewState = {
  readonly title: string
  readonly subjectLabel: string
  readonly seriesLabel: string
  readonly language: ChallengeLocale
  readonly mapTitle: string
  readonly chartSearch: ChartUrlState
  readonly mapStateDefinition: AdvancedMapAnalyticsUrlState
  readonly mapKey: string
  readonly mapDescription: string
  readonly activeTab: BudgetItemAnalyticsTab
}

type BudgetItemAnalyticsResolvedViewStateInput = {
  readonly resolvedTitle: string
  readonly seriesLabel: string
  readonly language?: ChallengeLocale
  readonly context: BudgetItemAnalyticsPageContext
  readonly analyticsView: BudgetItemAnalyticsViewState
  readonly normalizedFunctionalCode?: string
  readonly normalizedEconomicCode?: string
  readonly executionChartFilter: AnalyticsFilterType
  readonly executionMapFilter: AnalyticsFilterType
  readonly commitmentsChartFilter: CommitmentsFilterType
  readonly commitmentsMapFilter: CommitmentsFilterType
}

function resolveLocale(locale: ChallengeLocale | undefined): ChallengeLocale {
  return locale === 'en' ? 'en' : 'ro'
}

function getLocalizedCopy(language: ChallengeLocale) {
  return language === 'en'
    ? {
        title: 'Analytics',
        executionTab: 'Execution',
        commitmentsTab: 'Commitments',
        executionChartTitle: 'Budget execution evolution',
        commitmentsChartTitle: 'Commitments evolution',
        mapNamePrefix: 'Map',
        populationLabel: 'Population',
        populationUnit: getGeoJsonDatasetUnit('insPop2021'),
      }
    : {
        title: 'Analytics',
        executionTab: 'Execuție',
        commitmentsTab: 'Angajamente',
        executionChartTitle: 'Evoluție execuție bugetară',
        commitmentsChartTitle: 'Evoluție angajamente',
        mapNamePrefix: 'Hartă',
        populationLabel: 'Populație',
        populationUnit: 'loc.',
      }
}

function getMapSubjectLabel(
  seriesLabel: string,
  resolvedTitle: string,
): string {
  const trimmedSeriesLabel = seriesLabel.trim()
  return trimmedSeriesLabel.length > 0 ? trimmedSeriesLabel : resolvedTitle
}

function buildExecutionSeriesConfig(
  seriesLabel: string,
  chartFilter: AnalyticsFilterType,
  timeframe: BudgetItemAnalyticsViewState['timeframe'],
): SeriesConfiguration {
  return {
    id: `budget-item-history-${chartFilter.account_category}-${seriesLabel}`,
    type: 'line-items-aggregated-yearly',
    label: seriesLabel,
    unit: '',
    filter: chartFilter,
    enabled: true,
    ...(timeframe === 'all'
      ? {
          period: chartFilter.report_period,
        }
      : {}),
    config: {
      showDataLabels: false,
      color: '#0f172a',
    },
    createdAt: STATIC_SERIES_TIMESTAMP,
    updatedAt: STATIC_SERIES_TIMESTAMP,
  }
}

function buildCommitmentsSeriesConfig(
  seriesLabel: string,
  commitmentsChartFilter: CommitmentsFilterType,
  analyticsView: BudgetItemAnalyticsViewState,
): CommitmentsSeriesConfiguration {
  return {
    id: `budget-item-commitments-${analyticsView.commitmentsMetric}-${seriesLabel}`,
    type: 'commitments-analytics',
    label: seriesLabel,
    unit: '',
    metric: analyticsView.commitmentsMetric,
    filter: commitmentsChartFilter,
    enabled: true,
    ...(analyticsView.timeframe === 'all'
      ? {
          period: commitmentsChartFilter.report_period,
        }
      : {}),
    config: {
      showDataLabels: false,
      color: '#1d4ed8',
    },
    createdAt: STATIC_SERIES_TIMESTAMP,
    updatedAt: STATIC_SERIES_TIMESTAMP,
  }
}

function buildChartSearch(
  input: BudgetItemAnalyticsResolvedViewStateInput,
  activeTab: BudgetItemAnalyticsTab,
): ChartUrlState {
  const isCommitmentsTab = activeTab === 'commitments'
  const seriesConfigs = [
    isCommitmentsTab
      ? buildCommitmentsSeriesConfig(
          input.seriesLabel,
          input.commitmentsChartFilter,
          input.analyticsView,
        )
      : buildExecutionSeriesConfig(
          input.seriesLabel,
          input.executionChartFilter,
          input.analyticsView.timeframe,
        ),
  ]
  const baseChartSearch = buildTreemapChartState({
    title: input.resolvedTitle,
    seriesConfigs,
    normalization: input.context.normalization,
  })

  return {
    ...baseChartSearch,
    chart: {
      ...baseChartSearch.chart,
      title: input.resolvedTitle,
      config: {
        ...baseChartSearch.chart.config,
        chartType: 'line',
        showLegend: true,
        showTooltip: true,
        showGridLines: true,
        showDiffControl: false,
      },
      series: seriesConfigs,
    },
  }
}

function buildMapStateDefinition(
  input: BudgetItemAnalyticsResolvedViewStateInput,
  language: ChallengeLocale,
  activeTab: BudgetItemAnalyticsTab,
): AdvancedMapAnalyticsUrlState {
  const copy = getLocalizedCopy(language)
  const isCommitmentsTab = activeTab === 'commitments'
  const mapSubjectLabel = getMapSubjectLabel(
    input.seriesLabel,
    input.resolvedTitle,
  )
  const mapPeriodLabel = formatBudgetItemAnalyticsPeriodLabel(
    isCommitmentsTab
      ? input.commitmentsMapFilter.report_period
      : input.executionMapFilter.report_period,
  )
  const dataSeries = createDefaultAdvancedMapAnalyticsSeries(
    isCommitmentsTab ? 'commitments-analytics' : 'line-items-aggregated-yearly',
  )
  const populationSeries = createDefaultAdvancedMapAnalyticsSeries(
    'geojson-dataset-series',
  )
  if (populationSeries.type !== 'geojson-dataset-series') {
    throw new Error('Expected geojson dataset series for budget item analytics map.')
  }

  if (
    !isCommitmentsTab &&
    dataSeries.type !== 'line-items-aggregated-yearly'
  ) {
    throw new Error('Expected execution series for budget item analytics map.')
  }

  if (isCommitmentsTab && dataSeries.type !== 'commitments-analytics') {
    throw new Error('Expected commitments series for budget item analytics map.')
  }

  const binsPreset = createDefaultAdvancedMapAnalyticsBinsPreset(
    `${mapSubjectLabel} bins`,
  )
  const mapTitle = mapPeriodLabel
    ? `${copy.mapNamePrefix} (${mapPeriodLabel})`
    : copy.mapNamePrefix

  return parseAdvancedMapAnalyticsUrlState({
    mapName: `${mapTitle}: ${mapSubjectLabel}`,
    activeView: 'map',
    activeSeriesId: dataSeries.id,
    activeBinPresetId: binsPreset.id,
    binsPresets: [
      {
        ...binsPreset,
        label: mapSubjectLabel,
        config: {
          ...binsPreset.config,
          title: mapSubjectLabel,
          colorMode: 'gradient',
          gradient: {
            startColor: '#dbeafe',
            endColor: '#1d4ed8',
          },
          intervalMode: 'continuous',
          continuousPercentiles: {
            min: 5,
            max: 95,
          },
        },
      },
    ],
    mapCenter: DEFAULT_MAP_CENTER,
    mapZoom: DEFAULT_MAP_ZOOM,
    series: [
      isCommitmentsTab
        ? {
            ...dataSeries,
            label: input.seriesLabel,
            metric: input.analyticsView.commitmentsMetric,
            filter: input.commitmentsMapFilter,
            config: {
              ...dataSeries.config,
              color: '#1d4ed8',
            },
          }
        : {
            ...dataSeries,
            label: input.seriesLabel,
            filter: input.executionMapFilter,
            config: {
              ...dataSeries.config,
              color: '#2563eb',
            },
          },
      {
        ...populationSeries,
        label: copy.populationLabel,
        unit: copy.populationUnit,
      },
    ],
  })
}

function buildMapDescription(
  subjectLabel: string,
  language: ChallengeLocale,
  periodLabel: string | undefined,
  normalizedFunctionalCode: string | undefined,
  normalizedEconomicCode: string | undefined,
  expenseType: BudgetItemAnalyticsPageContext['expenseType'],
): string {
  const labels =
    language === 'en'
      ? {
          forItem: 'Map preview for',
          period: 'Period',
          fn: 'Functional code',
          ec: 'Economic code',
          expenseType: 'Expense type',
          expenseTypeValues: {
            functionare: 'Operations',
            dezvoltare: 'Development',
          },
        }
      : {
          forItem: 'Hartă pentru',
          period: 'Perioadă',
          fn: 'Cod funcțional',
          ec: 'Cod economic',
          expenseType: 'Tip cheltuială',
          expenseTypeValues: {
            functionare: 'Operațiuni',
            dezvoltare: 'Dezvoltare',
          },
        }

  const codeLines = [
    periodLabel ? `- ${labels.period}: ${periodLabel}` : null,
    normalizedFunctionalCode
      ? `- ${labels.fn}: \`fn:${normalizedFunctionalCode}\``
      : null,
    normalizedEconomicCode
      ? `- ${labels.ec}: \`ec:${normalizedEconomicCode}\``
      : null,
    expenseType
      ? `- ${labels.expenseType}: ${labels.expenseTypeValues[expenseType]}`
      : null,
  ].filter(Boolean)

  return `${labels.forItem} **${subjectLabel}**.\n\n${codeLines.join('\n')}`.trim()
}

function getEffectiveTab(
  context: BudgetItemAnalyticsPageContext,
  analyticsView: BudgetItemAnalyticsViewState,
): BudgetItemAnalyticsTab {
  if (context.accountCategory === 'vn') {
    return 'execution'
  }

  return analyticsView.tab
}

export function getBudgetItemAnalyticsTabLabel(
  tab: BudgetItemAnalyticsTab,
  language: ChallengeLocale | undefined,
): string {
  const copy = getLocalizedCopy(resolveLocale(language))
  return tab === 'commitments' ? copy.commitmentsTab : copy.executionTab
}

export function getBudgetItemAnalyticsChartCardTitle(
  tab: BudgetItemAnalyticsTab,
  language: ChallengeLocale | undefined,
  commitmentsMetricLabel: string | undefined,
): string {
  const copy = getLocalizedCopy(resolveLocale(language))
  if (tab === 'commitments') {
    return commitmentsMetricLabel
      ? `${copy.commitmentsChartTitle} · ${commitmentsMetricLabel}`
      : copy.commitmentsChartTitle
  }

  return copy.executionChartTitle
}

export function getBudgetItemAnalyticsMapCardTitle(
  reportPeriod:
    | AnalyticsFilterType['report_period']
    | CommitmentsFilterType['report_period']
    | undefined,
  language: ChallengeLocale | undefined,
): string {
  const copy = getLocalizedCopy(resolveLocale(language))
  const mapPeriodLabel = formatBudgetItemAnalyticsPeriodLabel(reportPeriod)

  return mapPeriodLabel
    ? `${copy.mapNamePrefix} (${mapPeriodLabel})`
    : copy.mapNamePrefix
}

export function buildBudgetItemAnalyticsViewState(
  input: Readonly<BudgetItemAnalyticsResolvedViewStateInput>,
): BudgetItemAnalyticsResolvedViewState {
  const language = resolveLocale(input.language)
  const activeTab = getEffectiveTab(input.context, input.analyticsView)
  const mapSubjectLabel = getMapSubjectLabel(
    input.seriesLabel,
    input.resolvedTitle,
  )
  const mapReportPeriod =
    activeTab === 'commitments'
      ? input.commitmentsMapFilter.report_period
      : input.executionMapFilter.report_period

  return {
    title: getLocalizedCopy(language).title,
      subjectLabel: input.resolvedTitle,
      seriesLabel: input.seriesLabel,
      language,
      mapTitle: getBudgetItemAnalyticsMapCardTitle(mapReportPeriod, language),
    chartSearch: buildChartSearch(input, activeTab),
    mapStateDefinition: buildMapStateDefinition(input, language, activeTab),
    mapKey: [
      'budget-item-analytics',
      input.context.entityCui,
      input.context.accountCategory,
      activeTab,
      input.analyticsView.timeframe,
      input.normalizedFunctionalCode ?? 'all-fn',
      input.normalizedEconomicCode ?? 'all-ec',
      activeTab === 'execution' && input.context.accountCategory === 'ch'
        ? (input.context.expenseType ?? 'all-expense-types')
        : 'expense-type-ignored',
      input.analyticsView.commitmentsMetric,
    ].join(':'),
    mapDescription: buildMapDescription(
      mapSubjectLabel,
      language,
      formatBudgetItemAnalyticsPeriodLabel(mapReportPeriod),
      input.normalizedFunctionalCode,
      input.normalizedEconomicCode,
      activeTab === 'execution' && input.context.accountCategory === 'ch'
        ? input.context.expenseType
        : undefined,
    ),
    activeTab,
  }
}
