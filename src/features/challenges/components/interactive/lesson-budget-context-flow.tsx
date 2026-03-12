import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronLeft, ChevronRight, ChevronsUpDown, Map as MapIcon, Table2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ResponsivePopover } from '@/components/ui/ResponsivePopover'
import { useQuizInteraction } from '@/features/learning/hooks/use-learning-interactions'
import { useRegisterLessonChallenge } from '@/features/learning/components/player/lesson-challenges-context'
import { useGeoJsonData } from '@/hooks/useGeoJson'
import { useAdvancedMapAnalyticsSeriesData, advancedMapAnalyticsSeriesDataQueryOptions } from '@/hooks/useAdvancedMapAnalyticsSeriesData'
import { MapAnalyticsWorkspace } from '@/features/advanced-map-analytics/components/map-analytics-workspace'
import {
  CHALLENGE_LESSON_DEFAULT_CURRENCY,
  buildLessonTrend,
  selectLessonMetricSeries,
  selectLessonMetricValue,
  useChallengeLessonEntityBundle,
} from '@/features/challenges/hooks/use-challenge-lesson-entity-data'
import type { ChallengeLocale } from '@/features/challenges/types'
import { ChallengeDynamicQuiz } from '@/features/challenges/components/player/challenge-dynamic-quiz'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { getRemoteGroupedSeriesHash } from '@/lib/map-series/grouped-series-request'
import { buildLessonEstimateOptions } from './challenge-lesson-widgets.utils'
import {
  BUDGET_CONTEXT_MAP_OPTIONS,
  buildBudgetContextCountySeries,
  buildBudgetContextLeaderboardRows,
  buildBudgetContextTableRows,
  buildBudgetContextTopUatQuizOptions,
  buildBudgetContextCountyViewport,
  createBudgetContextMapState,
  selectBudgetContextVisibleRows,
  type BudgetContextMapSeriesId,
} from './lesson-budget-context-flow.utils'

type LessonBudgetContextFlowProps = {
  readonly entityCui: string
  readonly stepId: string
  readonly locale: ChallengeLocale
  readonly stage?: BudgetContextStageKey
}

type BudgetContextStageKey =
  | 'expenses-quiz'
  | 'income-quiz'
  | 'per-capita'
  | 'county-quiz'
  | 'county-context'

type LessonBudgetContextCopy = {
  sourceBadge: string
  loading: string
  unavailable: string
  retryLater: string
  controlsButton: string
  mapControlsTitle: string
  mapControlsSubtitle: string
  stageEyebrow: string
  totalExpensesTitle: (entityName: string) => string
  totalExpensesQuestion: (entityName: string) => string
  totalExpensesExplanation: (entityName: string) => string
  totalIncomeTitle: (entityName: string) => string
  totalIncomeQuestion: (entityName: string) => string
  totalIncomeExplanation: (entityName: string) => string
  perCapitaTitle: string
  perCapitaDescription: string
  calculationTableMetric: string
  calculationTableValue: string
  calculationTableHow: string
  totalIncomeLabel: string
  totalExpensesLabel: string
  populationLabel: string
  incomePerCapitaLabel: string
  expensesPerCapitaLabel: string
  incomeGrowthLabel: string
  expensesGrowthLabel: string
  countyQuizTitle: (countyName: string) => string
  countyQuizQuestion: (countyName: string) => string
  countyQuizExplanation: (uatName: string, countyName: string, perCapita: string, population: string) => string
  countyContextTitle: (countyName: string) => string
  countyContextDescription: string
  tableRank: string
  tableUat: string
  tableCounty: string
  tableSpendingPerCapita: string
  yourUatLabel: string
  unavailableCountyContext: string
  noCountyCode: string
  noCountyRows: string
  continueLabel: string
  backLabel: string
  finishContextLabel: string
}

const LESSON_BUDGET_CONTEXT_COPY: Record<ChallengeLocale, LessonBudgetContextCopy> = {
  ro: {
    sourceBadge: '',
    loading: 'Încărcăm datele pentru această lecție...',
    unavailable: 'Nu am putut pregăti datele pentru această lecție.',
    retryLater: 'Încearcă din nou după ce datele pentru entitatea selectată sunt disponibile.',
    controlsButton: 'Schimbă harta',
    mapControlsTitle: 'Alege comparația de pe hartă',
    mapControlsSubtitle: 'Aceste controale schimbă doar seria afișată în hartă. Clasamentul rămâne fix pe cheltuieli per capita.',
    stageEyebrow: 'Exercițiu ghidat',
    totalExpensesTitle: (entityName: string) => `Estimează cheltuielile din 2025 pentru ${entityName}`,
    totalExpensesQuestion: (entityName: string) => `Care crezi că a fost totalul cheltuielilor raportate în 2025 de ${entityName}?`,
    totalExpensesExplanation: (entityName: string) => `Acesta este totalul cheltuielilor raportat pentru 2025 de ${entityName} în execuția agregată.`,
    totalIncomeTitle: (entityName: string) => `Estimează veniturile din 2025 pentru ${entityName}`,
    totalIncomeQuestion: (entityName: string) => `Care crezi că a fost totalul veniturilor raportate în 2025 de ${entityName}?`,
    totalIncomeExplanation: (entityName: string) => `Acesta este totalul veniturilor raportat pentru 2025 de ${entityName} în execuția agregată.`,
    perCapitaTitle: 'Cum citim corect valorile per capita',
    perCapitaDescription: 'Tabelul rezumă totalurile, valorile per capita și schimbarea față de anul anterior.',
    calculationTableMetric: 'Indicator',
    calculationTableValue: 'Valoare',
    calculationTableHow: 'Cum îl folosești',
    totalIncomeLabel: 'Venituri totale 2025',
    totalExpensesLabel: 'Cheltuieli totale 2025',
    populationLabel: 'Populație de referință',
    incomePerCapitaLabel: 'Venituri per capita',
    expensesPerCapitaLabel: 'Cheltuieli per capita',
    incomeGrowthLabel: 'Venituri 2025 vs 2024',
    expensesGrowthLabel: 'Cheltuieli 2025 vs 2024',
    countyQuizTitle: (countyName: string) => `Care UAT este pe primul loc în ${countyName}?`,
    countyQuizQuestion: (countyName: string) => `Care UAT ocupă locul 1 în județul ${countyName} după cheltuieli per capita în 2025?`,
    countyQuizExplanation: (uatName: string, countyName: string, perCapita: string, population: string) =>
      `${uatName} este pe locul 1 in ${countyName} cu ${perCapita} cheltuieli per capita (populatie: ${population}).`,
    countyContextTitle: (countyName: string) => `Clasament și hartă pentru județul ${countyName}`,
    countyContextDescription: 'Mai jos vezi clasamentul UAT-urilor din județ pentru seria selectată și poziția UAT-ului ales. Poți schimba rapid indicatorul din selectorul hărții.',
    tableRank: 'Loc',
    tableUat: 'UAT',
    tableCounty: 'Județ',
    tableSpendingPerCapita: 'Cheltuieli per capita',
    yourUatLabel: 'UAT-ul tău',
    unavailableCountyContext: 'Contextul județean nu este disponibil pentru această entitate.',
    noCountyCode: 'Nu am găsit un cod de județ valid pentru entitatea selectată.',
    noCountyRows: 'Nu există suficiente date UAT în județ pentru clasamentul per capita.',
    continueLabel: 'Continuă',
    backLabel: 'Înapoi',
    finishContextLabel: 'Am analizat contextul județean',
  },
  en: {
    sourceBadge: '',
    loading: 'Loading the data for this lesson...',
    unavailable: 'We could not prepare the data for this lesson.',
    retryLater: 'Please try again once the selected entity data is available.',
    controlsButton: 'Switch map',
    mapControlsTitle: 'Choose the map comparison',
    mapControlsSubtitle: 'These controls change only the map series. The ranking stays fixed to spending per capita.',
    stageEyebrow: 'Guided exercise',
    totalExpensesTitle: (entityName: string) => `Estimate 2025 spending for ${entityName}`,
    totalExpensesQuestion: (entityName: string) => `What do you think ${entityName} reported as total spending in 2025?`,
    totalExpensesExplanation: (entityName: string) => `This is the total 2025 spending reported by ${entityName} in the aggregated execution view.`,
    totalIncomeTitle: (entityName: string) => `Estimate 2025 income for ${entityName}`,
    totalIncomeQuestion: (entityName: string) => `What do you think ${entityName} reported as total income in 2025?`,
    totalIncomeExplanation: (entityName: string) => `This is the total 2025 income reported by ${entityName} in the aggregated execution view.`,
    perCapitaTitle: 'How to read per-capita values correctly',
    perCapitaDescription: 'The table summarizes the totals, per-capita values, and the change from the previous year.',
    calculationTableMetric: 'Metric',
    calculationTableValue: 'Value',
    calculationTableHow: 'How to use it',
    totalIncomeLabel: 'Total 2025 income',
    totalExpensesLabel: 'Total 2025 spending',
    populationLabel: 'Reference population',
    incomePerCapitaLabel: 'Income per capita',
    expensesPerCapitaLabel: 'Spending per capita',
    incomeGrowthLabel: 'Income 2025 vs 2024',
    expensesGrowthLabel: 'Spending 2025 vs 2024',
    countyQuizTitle: (countyName: string) => `Which UAT ranks first in ${countyName}?`,
    countyQuizQuestion: (countyName: string) => `Which UAT ranks #1 in ${countyName} county by spending per capita?`,
    countyQuizExplanation: (uatName: string, countyName: string, perCapita: string, population: string) =>
      `${uatName} ranks #1 in ${countyName} with ${perCapita} spending per capita (population: ${population}).`,
    countyContextTitle: (countyName: string) => `Ranking and map for ${countyName} county`,
    countyContextDescription: 'Below you can see the county ranking for the selected series and the position of the selected UAT. You can switch indicators directly from the map selector.',
    tableRank: 'Rank',
    tableUat: 'UAT',
    tableCounty: 'County',
    tableSpendingPerCapita: 'Spending per capita',
    yourUatLabel: 'Your UAT',
    unavailableCountyContext: 'County context is not available for this entity.',
    noCountyCode: 'We could not determine a valid county code for the selected entity.',
    noCountyRows: 'There is not enough UAT data in this county for a per-capita ranking.',
    continueLabel: 'Continue',
    backLabel: 'Back',
    finishContextLabel: 'I reviewed the county context',
  },
}

type BudgetContextMapControlsProps = {
  readonly locale: ChallengeLocale
  readonly activeOptionId: BudgetContextMapSeriesId
  readonly onSelect: (nextSeriesId: BudgetContextMapSeriesId) => void
}

function LessonWidgetShell({
  badge,
  eyebrow,
  title,
  subtitle,
  children,
}: {
  readonly badge?: string
  readonly eyebrow?: string
  readonly title: string
  readonly subtitle?: string
  readonly children: ReactNode
}) {
  return (
    <Card className="not-prose my-8 overflow-hidden rounded-[32px] border-border/50 bg-background/95 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.2)]">
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          {badge ? (
            <Badge variant="outline" className="font-semibold">
              {badge}
            </Badge>
          ) : null}
          {eyebrow ? (
            <span className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
              {eyebrow}
            </span>
          ) : null}
        </div>

        <div className="space-y-2">
          <CardTitle className="text-pretty text-2xl font-black tracking-tight md:text-[2rem]">
            {title}
          </CardTitle>
          {subtitle ? (
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground md:text-[1.05rem]">
              {subtitle}
            </p>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {children}
      </CardContent>
    </Card>
  )
}

function LessonLoadingState({ label }: { readonly label: string }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-[24px] border border-border/50 bg-muted/[0.12]">
      <LoadingSpinner text={label} />
    </div>
  )
}

function LessonUnavailableState({
  title,
  description,
}: {
  readonly title: string
  readonly description: string
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-border/60 bg-muted/20 px-6 py-8 text-center">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  )
}

function SlideProgress({
  total,
  currentIndex,
}: {
  readonly total: number
  readonly currentIndex: number
}) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, index) => (
        <div
          key={index}
          className={`h-2 flex-1 rounded-full ${
            index <= currentIndex ? 'bg-foreground' : 'bg-muted'
          }`}
        />
      ))}
    </div>
  )
}

export function BudgetContextMapControls({
  locale,
  activeOptionId,
  onSelect,
}: BudgetContextMapControlsProps) {
  const copy = LESSON_BUDGET_CONTEXT_COPY[locale]
  const [isOpen, setIsOpen] = useState(false)
  const activeOption =
    BUDGET_CONTEXT_MAP_OPTIONS.find((option) => option.id === activeOptionId) ??
    BUDGET_CONTEXT_MAP_OPTIONS[0]

  return (
    <ResponsivePopover
      open={isOpen}
      onOpenChange={setIsOpen}
      align="start"
      className="w-full rounded-t-3xl border-0 p-0 sm:w-[24rem] sm:rounded-3xl sm:border sm:border-border/70"
      trigger={
        <Button
          type="button"
          variant="outline"
          className="rounded-full border-border/70 bg-background/95 px-5 shadow-sm"
        >
          <MapIcon className="mr-2 h-4 w-4" aria-hidden="true" />
          {copy.controlsButton}: {activeOption.label[locale]}
          <ChevronsUpDown className="ml-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </Button>
      }
      content={
        <div className="overflow-hidden rounded-[1.5rem] bg-background pt-3 sm:pt-0">
          <div className="divide-y divide-border/60">
            {BUDGET_CONTEXT_MAP_OPTIONS.map((option) => {
              const isActive = option.id === activeOptionId

              return (
                <button
                  key={option.id}
                  type="button"
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                    isActive
                      ? 'bg-muted/70 text-foreground'
                      : 'bg-background text-foreground hover:bg-muted/40'
                  }`}
                  onClick={() => {
                    onSelect(option.id)
                    setIsOpen(false)
                  }}
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-background text-muted-foreground">
                    <MapIcon className="h-4 w-4" aria-hidden="true" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold leading-6">
                      {option.label[locale]}
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                      {option.description[locale]}
                    </span>
                  </span>

                  <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center">
                    {isActive ? (
                      <Check className="h-4 w-4 text-foreground" aria-hidden="true" />
                    ) : null}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      }
    />
  )
}

export function LessonBudgetContextFlow({
  entityCui,
  stepId,
  locale,
  stage,
}: LessonBudgetContextFlowProps) {
  const copy = LESSON_BUDGET_CONTEXT_COPY[locale]
  const {
    aggregatedPerCapitaSummaryQuery,
    aggregatedTotalSummaryQuery,
  } = useChallengeLessonEntityBundle(entityCui)
  const [interactiveSlideIndex, setInteractiveSlideIndex] = useState(0)
  const [activeMapSeriesId, setActiveMapSeriesId] =
    useState<BudgetContextMapSeriesId>('lesson-expenses-per-capita')
  const stageOrder: readonly BudgetContextStageKey[] = [
    'expenses-quiz',
    'income-quiz',
    'per-capita',
    'county-quiz',
    'county-context',
  ]
  const forcedSlideIndex =
    stage ? stageOrder.findIndex((stageKey) => stageKey === stage) : -1
  const isSingleStageMode = forcedSlideIndex >= 0
  const activeSlideIndex =
    forcedSlideIndex >= 0 ? forcedSlideIndex : interactiveSlideIndex

  const entity = aggregatedTotalSummaryQuery.data
  const perCapitaEntity = aggregatedPerCapitaSummaryQuery.data
  const entityName = entity?.name?.trim() || entityCui
  const countyCode = entity?.uat?.county_code?.trim().toUpperCase() ?? null
  const countyName = entity?.uat?.county_name?.trim() ?? null

  const totalExpenses = selectLessonMetricValue('expenses', entity)
  const totalIncome = selectLessonMetricValue('income', entity)
  const expensesTrend = buildLessonTrend(selectLessonMetricSeries('expenses', entity))
  const incomeTrend = buildLessonTrend(selectLessonMetricSeries('income', entity))
  const expensesPerCapita = selectLessonMetricValue('expenses', perCapitaEntity)
  const incomePerCapita = selectLessonMetricValue('income', perCapitaEntity)
  const shouldLoadCountyContext = activeSlideIndex >= 3 && Boolean(countyCode)

  const expenseQuizId = 'lesson-budget-context-expenses'
  const incomeQuizId = 'lesson-budget-context-income'
  const countyQuizId = 'lesson-budget-context-county-top'

  const expenseOptions = useMemo(
    () =>
      typeof totalExpenses === 'number'
        ? buildLessonEstimateOptions({
            actualValue: totalExpenses,
            currency: CHALLENGE_LESSON_DEFAULT_CURRENCY,
          })
        : [],
    [totalExpenses],
  )
  const incomeOptions = useMemo(
    () =>
      typeof totalIncome === 'number'
        ? buildLessonEstimateOptions({
            actualValue: totalIncome,
            currency: CHALLENGE_LESSON_DEFAULT_CURRENCY,
          })
        : [],
    [totalIncome],
  )

  const expenseQuizState = useQuizInteraction({
    contentId: stepId,
    quizId: expenseQuizId,
    options: expenseOptions,
    contentVersion: 'v1',
  })
  const incomeQuizState = useQuizInteraction({
    contentId: stepId,
    quizId: incomeQuizId,
    options: incomeOptions,
    contentVersion: 'v1',
  })

  const countySeries = useMemo(
    () => (countyCode ? buildBudgetContextCountySeries(countyCode) : []),
    [countyCode],
  )
  const countySeriesHash = useMemo(
    () => getRemoteGroupedSeriesHash(countySeries),
    [countySeries],
  )

  const groupedSeriesQuery = useQuery({
    ...advancedMapAnalyticsSeriesDataQueryOptions({
      series: countySeries,
    }),
    enabled: shouldLoadCountyContext && countySeries.length > 0,
  })

  const countySeriesData = useAdvancedMapAnalyticsSeriesData({
    series: countySeries,
    activeSeriesId: activeMapSeriesId,
    defaultCurrency: CHALLENGE_LESSON_DEFAULT_CURRENCY,
    defaultInflationAdjusted: false,
    enabled: shouldLoadCountyContext && countySeries.length > 0,
    bundledGroupedSeriesData: groupedSeriesQuery.data,
    bundledRemoteBaseSeriesHash: countySeriesHash,
  })

  const geoJsonQuery = useGeoJsonData('UAT', {
    enabled: shouldLoadCountyContext && countySeries.length > 0,
  })
  const countyGeoJsonQuery = useGeoJsonData('County', {
    enabled: shouldLoadCountyContext && Boolean(countyCode),
  })

  const seriesColumns = useMemo(
    () =>
      BUDGET_CONTEXT_MAP_OPTIONS.map((option) => ({
        id: option.id,
        label: option.label[locale],
        unit: countySeriesData.unitsBySeriesId.get(option.id),
      })),
    [countySeriesData.unitsBySeriesId, locale],
  )

  const countyTableRows = useMemo(
    () =>
      buildBudgetContextTableRows({
        geoJsonData: geoJsonQuery.data,
        seriesColumns,
        valuesBySeriesId: countySeriesData.valuesBySeriesId,
      }),
    [countySeriesData.valuesBySeriesId, geoJsonQuery.data, seriesColumns],
  )

  const spendingPerCapitaLeaderboard = useMemo(
    () =>
      buildBudgetContextLeaderboardRows({
        rows: countyTableRows,
        seriesId: 'lesson-expenses-per-capita',
      }),
    [countyTableRows],
  )
  const activeMapOption =
    BUDGET_CONTEXT_MAP_OPTIONS.find((option) => option.id === activeMapSeriesId) ??
    BUDGET_CONTEXT_MAP_OPTIONS[0]
  const activeMapLeaderboard = useMemo(
    () =>
      buildBudgetContextLeaderboardRows({
        rows: countyTableRows,
        seriesId: activeMapSeriesId,
      }),
    [activeMapSeriesId, countyTableRows],
  )
  const visibleCountyRows = useMemo(
    () =>
      selectBudgetContextVisibleRows({
        rows: activeMapLeaderboard,
        userEntityCui: entity?.cui,
        limit: 5,
      }),
    [activeMapLeaderboard, entity?.cui],
  )
  const topCountyRow = spendingPerCapitaLeaderboard[0]
  const countyQuizOptions = useMemo(
    () =>
      buildBudgetContextTopUatQuizOptions({
        rows: spendingPerCapitaLeaderboard,
        locale,
      }),
    [locale, spendingPerCapitaLeaderboard],
  )
  const countyViewport = useMemo(
    () =>
      buildBudgetContextCountyViewport({
        geoJsonData: countyGeoJsonQuery.data,
        countyCode,
      }),
    [countyCode, countyGeoJsonQuery.data],
  )

  const countyQuizState = useQuizInteraction({
    contentId: stepId,
    quizId: countyQuizId,
    options: countyQuizOptions,
    contentVersion: 'v1',
  })

  const [mapState, setMapState] = useState(() =>
    createBudgetContextMapState({
      locale,
      countyName,
      activeSeriesId: activeMapSeriesId,
      series: countySeries,
      mapCenter: countyViewport?.mapCenter,
      mapZoom: countyViewport?.mapZoom,
    }),
  )

  useEffect(() => {
    setMapState(
      createBudgetContextMapState({
        locale,
        countyName,
        activeSeriesId: activeMapSeriesId,
        series: countySeries,
        mapCenter: countyViewport?.mapCenter,
        mapZoom: countyViewport?.mapZoom,
      }),
    )
  }, [activeMapSeriesId, countyName, countySeries, countyViewport?.mapCenter, countyViewport?.mapZoom, locale])

  const stageCount = 5
  const countyComparisonAvailable =
    Boolean(countyCode) && spendingPerCapitaLeaderboard.length > 0
  const finalStageSeen = activeSlideIndex >= stageCount - 1
  useRegisterLessonChallenge({
    id: `lesson-budget-context-final-stage:${stepId}`,
    isCompleted: isSingleStageMode || finalStageSeen,
  })

  const isLoadingTotals =
    aggregatedTotalSummaryQuery.isLoading || aggregatedPerCapitaSummaryQuery.isLoading

  if (isLoadingTotals) {
    return (
      <LessonWidgetShell
        badge={copy.sourceBadge}
        eyebrow={copy.stageEyebrow}
        title={copy.totalExpensesTitle(entityName)}
      >
        <LessonLoadingState label={copy.loading} />
      </LessonWidgetShell>
    )
  }

  if (
    !entity ||
    typeof totalExpenses !== 'number' ||
    typeof totalIncome !== 'number'
  ) {
    return (
      <LessonWidgetShell
        badge={copy.sourceBadge}
        eyebrow={copy.stageEyebrow}
        title={copy.totalExpensesTitle(entityName)}
      >
        <LessonUnavailableState
          title={copy.unavailable}
          description={copy.retryLater}
        />
      </LessonWidgetShell>
    )
  }

  const expenseGrowthLabel =
    expensesTrend?.previousValue && expensesTrend.previousValue !== 0
      ? `${formatNumber(((totalExpenses - expensesTrend.previousValue) / expensesTrend.previousValue) * 100, 'standard')}%`
      : 'N/A'
  const incomeGrowthLabel =
    incomeTrend?.previousValue && incomeTrend.previousValue !== 0
      ? `${formatNumber(((totalIncome - incomeTrend.previousValue) / incomeTrend.previousValue) * 100, 'standard')}%`
      : 'N/A'

  const activeSlide = ((): {
    title: string
    subtitle?: string
    canContinue: boolean
    content: ReactNode
  } => {
    if (activeSlideIndex === 0) {
      return {
        title: copy.totalExpensesTitle(entityName),
        subtitle: undefined,
        canContinue: expenseQuizState.isCorrect,
        content: (
          <ChallengeDynamicQuiz
            contentId={stepId}
            quizId={expenseQuizId}
            question={copy.totalExpensesQuestion(entityName)}
            options={expenseOptions}
            explanation={copy.totalExpensesExplanation(entityName)}
          />
        ),
      }
    }

    if (activeSlideIndex === 1) {
      return {
        title: copy.totalIncomeTitle(entityName),
        subtitle: undefined,
        canContinue: incomeQuizState.isCorrect,
        content: (
          <ChallengeDynamicQuiz
            contentId={stepId}
            quizId={incomeQuizId}
            question={copy.totalIncomeQuestion(entityName)}
            options={incomeOptions}
            explanation={copy.totalIncomeExplanation(entityName)}
          />
        ),
      }
    }

    if (activeSlideIndex === 2) {
      return {
        title: copy.perCapitaTitle,
        subtitle: isSingleStageMode ? undefined : copy.perCapitaDescription,
        canContinue: true,
        content: (
          <div className="overflow-hidden rounded-[22px] border border-border/60 bg-background/95 pl-3 shadow-sm md:pl-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{copy.calculationTableMetric}</TableHead>
                  <TableHead className="text-right">{copy.calculationTableValue}</TableHead>
                  <TableHead>{copy.calculationTableHow}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-semibold">{copy.totalIncomeLabel}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatCurrency(totalIncome, 'compact', CHALLENGE_LESSON_DEFAULT_CURRENCY)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {locale === 'en'
                      ? 'The absolute revenue reported for 2025.'
                      : 'Valoarea brută a veniturilor raportate pentru 2025.'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-semibold">{copy.totalExpensesLabel}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatCurrency(totalExpenses, 'compact', CHALLENGE_LESSON_DEFAULT_CURRENCY)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {locale === 'en'
                      ? 'The absolute spending reported for 2025.'
                      : 'Valoarea brută a cheltuielilor raportate pentru 2025.'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-semibold">{copy.populationLabel}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {typeof entity.uat?.population === 'number'
                      ? formatNumber(entity.uat.population, 'standard')
                      : 'N/A'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {locale === 'en'
                      ? 'The shared population baseline used for per-capita comparison.'
                      : 'Populația de referință folosită pentru comparația per capita.'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-semibold">{copy.incomePerCapitaLabel}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {typeof incomePerCapita === 'number'
                      ? formatCurrency(incomePerCapita, 'compact', CHALLENGE_LESSON_DEFAULT_CURRENCY)
                      : 'N/A'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {locale === 'en'
                      ? 'Use this when you compare the locality with other UATs.'
                      : 'Util când compari localitatea cu alte UAT-uri.'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-semibold">{copy.expensesPerCapitaLabel}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {typeof expensesPerCapita === 'number'
                      ? formatCurrency(expensesPerCapita, 'compact', CHALLENGE_LESSON_DEFAULT_CURRENCY)
                      : 'N/A'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {locale === 'en'
                      ? 'Useful for county ranking and peer context.'
                      : 'Util pentru clasamentul din județ și contextul comparativ.'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-semibold">{copy.incomeGrowthLabel}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {incomeGrowthLabel}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {locale === 'en'
                      ? 'Shows how fast total income changed year over year.'
                      : 'Arată ritmul în care s-au schimbat veniturile față de anul anterior.'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-semibold">{copy.expensesGrowthLabel}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {expenseGrowthLabel}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {locale === 'en'
                      ? 'Shows how fast total spending changed year over year.'
                      : 'Arată ritmul în care s-au schimbat cheltuielile față de anul anterior.'}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        ),
      }
    }

    if (activeSlideIndex === 3) {
      if (!countyComparisonAvailable || !topCountyRow || countyQuizOptions.length < 2) {
        return {
          title: copy.countyQuizTitle(countyName ?? ''),
          subtitle: copy.unavailableCountyContext,
          canContinue: true,
          content: (
            <LessonUnavailableState
              title={copy.unavailableCountyContext}
              description={countyCode ? copy.noCountyRows : copy.noCountyCode}
            />
          ),
        }
      }

      return {
        title: copy.countyQuizTitle(countyName ?? ''),
        subtitle: copy.countyQuizQuestion(countyName ?? ''),
        canContinue: countyQuizState.isCorrect,
        content: (
          <ChallengeDynamicQuiz
            contentId={stepId}
            quizId={countyQuizId}
            question={copy.countyQuizQuestion(countyName ?? '')}
            options={countyQuizOptions}
            explanation={copy.countyQuizExplanation(
              topCountyRow.uatName,
              countyName ?? '',
              formatCurrency(topCountyRow.value),
              formatNumber(
                topCountyRow.valuesBySeriesId['lesson-expenses-total'] != null &&
                  topCountyRow.value > 0
                  ? Math.round(topCountyRow.valuesBySeriesId['lesson-expenses-total']! / topCountyRow.value)
                  : null,
              ),
            )}
          />
        ),
      }
    }

    return {
      title: copy.countyContextTitle(countyName ?? ''),
      subtitle: copy.countyContextDescription,
      canContinue: false,
      content: !countyComparisonAvailable ? (
        <LessonUnavailableState
          title={copy.unavailableCountyContext}
          description={countyCode ? copy.noCountyRows : copy.noCountyCode}
        />
      ) : (
        <div className="space-y-5">
          <BudgetContextMapControls
            locale={locale}
            activeOptionId={activeMapSeriesId}
            onSelect={setActiveMapSeriesId}
          />

          <Card className="overflow-hidden rounded-[28px] border-border/50">
            <CardHeader className="space-y-2">
              <CardTitle className="text-xl font-black tracking-tight">
                {activeMapOption.label[locale]}
              </CardTitle>
              <p className="text-sm leading-6 text-muted-foreground">
                {activeMapOption.description[locale]}
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {groupedSeriesQuery.isLoading || geoJsonQuery.isLoading || countyGeoJsonQuery.isLoading ? (
                <LessonLoadingState label={copy.loading} />
              ) : groupedSeriesQuery.error || countySeriesData.error || geoJsonQuery.error || countyGeoJsonQuery.error ? (
                <LessonUnavailableState
                  title={copy.unavailable}
                  description={copy.retryLater}
                />
              ) : (
                <MapAnalyticsWorkspace
                  mode="public"
                  layout="preview"
                  mapState={mapState}
                  setMapState={setMapState}
                  mapDescription={
                    activeMapOption.description[locale]
                  }
                  capabilities={{ readOnly: true }}
                  mobileControlsDefaultCollapsed={true}
                  bundledGroupedSeriesData={groupedSeriesQuery.data}
                  bundledRemoteBaseSeriesHash={countySeriesHash}
                />
              )}
            </CardContent>
          </Card>

          <div className="rounded-[24px] border border-border/50 bg-muted/[0.08] px-4 py-4">
            <div className="mb-4 flex items-center gap-2">
              <Table2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm font-semibold text-foreground">
                {activeMapOption.label[locale]}
              </p>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{copy.tableRank}</TableHead>
                  <TableHead>{copy.tableUat}</TableHead>
                  <TableHead>{copy.tableCounty}</TableHead>
                  <TableHead className="text-right">{activeMapOption.label[locale]}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleCountyRows.map((row) => {
                  const isUserRow = row.entityCui === entity.cui
                  return (
                    <TableRow
                      key={`${row.sirutaCode}-${row.rank}`}
                      data-state={isUserRow ? 'selected' : undefined}
                    >
                      <TableCell className="font-semibold">{row.rank}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{row.uatName}</span>
                          {isUserRow ? (
                            <Badge variant="secondary">{copy.yourUatLabel}</Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>{row.countyName}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(row.value, 'compact', CHALLENGE_LESSON_DEFAULT_CURRENCY)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>

          </div>
        </div>
      ),
    }
  })()

  const shouldUseMinimalSectionLayout =
    isSingleStageMode &&
    (activeSlideIndex === 0 || activeSlideIndex === 1 || activeSlideIndex === 2 || activeSlideIndex === 3 || activeSlideIndex === 4)

  if (shouldUseMinimalSectionLayout) {
    return <div className="not-prose my-6">{activeSlide.content}</div>
  }

  return (
    <LessonWidgetShell
      badge={copy.sourceBadge}
      eyebrow={copy.stageEyebrow}
      title={activeSlide.title}
      subtitle={activeSlide.subtitle}
    >
      {isSingleStageMode ? null : (
        <SlideProgress total={stageCount} currentIndex={activeSlideIndex} />
      )}

      {activeSlide.content}

      {isSingleStageMode ? null : (
        <div className="flex items-center justify-between gap-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setInteractiveSlideIndex((currentIndex) => Math.max(0, currentIndex - 1))}
            disabled={activeSlideIndex === 0}
            className="rounded-full px-5"
          >
          <ChevronLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            {copy.backLabel}
          </Button>

          {activeSlideIndex < stageCount - 1 ? (
            <Button
              type="button"
              onClick={() => setInteractiveSlideIndex((currentIndex) => currentIndex + 1)}
              disabled={!activeSlide.canContinue}
              className="rounded-full px-6"
            >
              {copy.continueLabel}
              <ChevronRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      )}
    </LessonWidgetShell>
  )
}
