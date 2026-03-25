import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRightLeft, Building2, Info, Layers3, Users, Wallet } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EntityFinancialSummary } from '@/components/entities/EntityFinancialSummary'
import { Quiz, type QuizOption } from '@/features/learning/components/assessment/Quiz'
import {
  useCustomInteraction,
  useQuizInteraction,
} from '@/features/learning/hooks/use-learning-interactions'
import { useRegisterLessonChallenge } from '@/features/learning/components/player/lesson-challenges-context'
import { useDebouncedCallback } from '@/lib/hooks/useDebouncedCallback'
import type { ChallengeLocale } from '@/features/challenges/types'
import {
  CHALLENGE_LESSON_DEFAULT_CURRENCY,
  CHALLENGE_LESSON_DEFAULT_REPORT_TYPE,
  CHALLENGE_LESSON_YEAR,
  buildLessonTrend,
  filterLineItemsByAccountCategory,
  getLessonReportTypeLabel,
  selectLessonMetricSeries,
  selectLessonMetricValue,
  useChallengeLessonEntityBundle,
  useChallengeLessonEntitySummary,
  useChallengeLessonSubordinateInsights,
  type LessonMetricKey,
} from '@/features/challenges/hooks/use-challenge-lesson-entity-data'
import {
  buildLessonEstimateOptions,
  buildLessonExecutionTableExcerpt,
  buildLessonSingleCorrectQuizOptions,
} from './challenge-lesson-widgets.utils'
import { ChallengeDynamicQuiz } from '@/features/challenges/components/player/challenge-dynamic-quiz'
import { cn, formatCurrency, formatNumber } from '@/lib/utils'
import { useFinancialData } from '@/hooks/useFinancialData'
import { useEntityTypeLabel } from '@/hooks/filters/useFilterLabels'
import { GroupedItemsDisplay } from '@/components/entities/FinancialDataCard'
import {
  getChallengeEntityMapPreviewDefinition,
} from '@/features/challenges/components/analysis/challenge-entity-public-maps'
import { MapAnalyticsPublicPreviewCard } from '@/features/advanced-map-analytics/components/map-analytics-public-preview-card'
import {
  ChallengeEntitySubordinatesSection,
  type ChallengeEntitySubordinateCardItem,
} from '@/features/challenges/components/analysis/challenge-entity-subordinates-section'
import { buildChallengeInteractionId } from '@/features/challenges/utils/interaction-ids'
import { toReportTypeValue } from '@/schemas/reporting'

type LessonWidgetBaseProps = {
  readonly entityCui: string
  readonly stepId: string
  readonly locale: ChallengeLocale
}

type LessonBudgetEstimateProps = LessonWidgetBaseProps & {
  readonly metric?: LessonMetricKey
}

const WIDGET_COPY = {
  ro: {
    sourceBadge: 'Ministerul Finanțelor / ANAF',
    loading: 'Încărcăm datele pentru această lecție...',
    unavailable: 'Nu am putut pregăti datele pentru această lecție.',
    retryLater: 'Încearcă din nou după ce datele pentru entitatea selectată sunt disponibile.',
    checklistTitle: 'Bifează după ce ai identificat aceste repere',
    snapshotChecks: [
      'Am identificat anul afișat.',
      'Am identificat tipul de raport.',
      'Am înțeles că datele vin din rapoartele Ministerului Finanțelor / ANAF.',
      'Știu că valorile reale pentru venituri, cheltuieli și balanță vor fi dezvăluite în lecția următoare.',
    ],
    reportType: 'Tip raport',
    selectedYear: 'An analizat',
    dataSource: 'Sursă',
    aggregatedSourceValue: 'Execuție bugetară din datele Ministerului Finanțelor / ANAF',
    lessonReady: 'Am identificat reperele principale',
    estimateTitleIncome: 'Încearcă să estimezi totalul veniturilor din 2025',
    estimateTitleExpenses: 'Încearcă să estimezi totalul cheltuielilor din 2025',
    estimateQuestionIncome: 'Care crezi că a fost totalul veniturilor raportate de primăria selectată în 2025?',
    estimateQuestionExpenses: 'Care crezi că a fost totalul cheltuielilor raportate de primăria selectată în 2025?',
    estimateExplanationIncome: 'Acesta este totalul veniturilor din 2025 raportat în platformă pentru entitatea selectată.',
    estimateExplanationExpenses: 'Acesta este totalul cheltuielilor din 2025 raportat în platformă pentru entitatea selectată.',
    actualValue: 'Valoare corectă',
    perCapita: 'Per capita',
    comparedTo2024: 'Comparat cu 2024',
    growth: 'Schimbare',
    noPreviousYear: 'Nu există încă un reper clar pentru 2024.',
    mapContextTitle: 'Context rapid pe hartă',
    mapContextDescription: 'Folosește această mini-hartă doar ca reper secundar. Scopul principal rămâne să înțelegi mai bine localitatea selectată.',
    groupedTitle: 'Explorează capitolele principale direct din datele platformei',
    groupedSubtitle: 'Poți trece între venituri și cheltuieli fără să părăsești lecția.',
    revenueTab: 'Venituri',
    spendingTab: 'Cheltuieli',
    groupedQuizQuestion: 'Conform datelor afișate, care este capitolul de venit cu cea mai mare valoare?',
    groupedQuizExplanation: (label: string) =>
      `În datele pregătite pentru această lecție, capitolul dominant de venit este ${label}.`,
    crosswalkTitle: 'Vezi aceleași cheltuieli prin două lentile',
    crosswalkSubtitle: 'Schimbă gruparea și observă cum aceeași sumă este reorganizată după domeniu sau după tipul cheltuielii.',
    functionalTab: 'Funcțional',
    economicTab: 'Economic',
    topFunctional: 'Cel mai mare capitol funcțional',
    topEconomic: 'Cel mai mare titlu economic',
    crosswalkQuizQuestion: 'În gruparea economică, care titlu principal are cea mai mare valoare pentru entitatea selectată?',
    crosswalkQuizExplanation: (label: string) =>
      `În lentila economică, titlul dominant este ${label}.`,
    unitCaption: 'Sumele sunt afișate în mii lei.',
    unitValue: 'mii lei',
    colIndicator: 'Indicator',
    colFn: 'Cod FN',
    colEc: 'Cod EC',
    selectRowPrompt: 'Selectează un rând și explică-l în cuvintele tale.',
    selectedRow: 'Rând selectat',
    noRowSelected: 'Niciun rând selectat încă.',
    explanationPrompt: 'Explică pe scurt ce arată acest rând și de ce suma poate apărea și la alte niveluri din tabel.',
    explanationPlaceholder: 'Exemplu: acest rând arată capitolul principal, iar mai jos apar detaliile care îl compun.',
    explanationHint: 'Checkpoint-ul se activează după ce selectezi un rând și scrii o explicație scurtă.',
    documentReady: 'Am interpretat un rând din tabel',
    aggregateDetailedTitle: 'Compară agregat și detaliat',
    aggregateDetailedSubtitle: 'Comută între cele două moduri, observă cine intră în perimetrul de raportare și leagă diferența de instituțiile reale din structura UAT-ului.',
    aggregatedToggle: 'Agregat',
    detailedToggle: 'Detaliat',
    switchSeparator: 'sau',
    reportQuestion: 'Întrebarea la care răspunde',
    aggregatedQuestion: 'Cât a administrat întreaga structură bugetară a ordonatorului principal?',
    detailedQuestion: 'Ce a raportat direct primăria, separat de instituțiile care țin de același ordonator?',
    perimeterTitle: 'Ce se schimbă între cele două moduri',
    perimeterSubtitle: 'Nu schimbi anul sau sursa datelor. Schimbi perimetrul de raportare pe care îl citești.',
    perimeterAggregatedTitle: 'Agregat: primărie + subordonate',
    perimeterAggregatedBody:
      'Util când vrei imaginea completă a banilor administrați prin același ordonator principal de credite.',
    perimeterDetailedTitle: 'Detaliat: doar primăria',
    perimeterDetailedBody:
      'Util când vrei să separi aparatul propriu al primăriei de instituțiile care raportează distinct în aceeași structură.',
    noGapHeadline: 'Totalurile sunt apropiate.',
    noGapBody:
      'Asta poate însemna că nu există instituții subordonate conectate sau că ele nu au schimbat semnificativ totalurile raportate pentru 2025.',
    withGapHeadline: 'Agregatul include un perimetru mai larg.',
    differenceLabel: 'Diferență cheltuieli agregat vs detaliat',
    differenceBody:
      'Dacă agregatul este mai mare, cel mai probabil citești și instituții care nu apar în totalurile principale din modul detaliat.',
    structureSummaryWithSubordinates:
      'Instituțiile de mai jos fac parte din perimetrul ordonatorului principal și devin utile când vrei să explici de ce varianta agregată spune o poveste mai largă.',
    structureSummaryWithoutSubordinates:
      'În datele disponibile, această primărie nu are instituții subordonate conectate. În acest caz, agregat și detaliat ar trebui să schimbe mai puțin interpretarea perimetrului.',
    structureSummaryWithoutSpending:
      'Structura cu instituții subordonate există, dar pentru 2025 nu vedem cheltuieli raportate de ele în clasamentul lecției.',
    quizLoading: 'Încărcăm quizul pentru această lecție...',
    quizUnavailable: 'Nu am putut pregăti quizul pentru această lecție.',
    secondQuizQuestionNoSubordinates:
      'Pentru acest UAT nu apar instituții subordonate în datele disponibile. Ce înseamnă asta pentru diferența agregat/detaliat?',
    secondQuizExplanationNoSubordinates:
      'Dacă nu există instituții subordonate conectate în datele disponibile, diferența dintre agregat și detaliat schimbă mai puțin perimetrul instituțional.',
    secondQuizQuestionWithSubordinates:
      'De ce totalul din varianta agregată poate fi diferit de cel din varianta detaliată pentru acest UAT?',
    secondQuizExplanationWithSubordinates:
      'Agregatul poate include atât primăria, cât și instituțiile subordonate din aceeași structură de raportare.',
    secondQuizQuestionWithoutSpending:
      'Structura cu subordonate există, dar nu apar cheltuieli raportate de ele în 2025. Ce înseamnă asta?',
    secondQuizExplanationWithoutSpending:
      'Structura instituțională există în continuare, chiar dacă lecția nu arată activitate de cheltuieli raportată de subordonate pentru anul selectat.',
  },
  en: {
    sourceBadge: 'Ministry of Finance / ANAF',
    loading: 'Loading the data for this lesson...',
    unavailable: 'We could not prepare the data for this lesson.',
    retryLater: 'Please try again once the selected entity data is available.',
    checklistTitle: 'Check these once you find them in the data',
    snapshotChecks: [
      'I identified the displayed year.',
      'I identified the report type.',
      'I understand the data comes from Ministry of Finance / ANAF reports.',
      'I know the real values for income, spending, and balance will be revealed in the next lesson.',
    ],
    reportType: 'Report type',
    selectedYear: 'Selected year',
    dataSource: 'Source',
    aggregatedSourceValue: 'Budget execution from Ministry of Finance / ANAF data',
    lessonReady: 'I identified the main reference points',
    estimateTitleIncome: 'Try to estimate total 2025 income',
    estimateTitleExpenses: 'Try to estimate total 2025 spending',
    estimateQuestionIncome: 'What do you think the selected city hall reported as total income in 2025?',
    estimateQuestionExpenses: 'What do you think the selected city hall reported as total spending in 2025?',
    estimateExplanationIncome: 'This is the total 2025 income reported on the platform for the selected entity.',
    estimateExplanationExpenses: 'This is the total 2025 spending reported on the platform for the selected entity.',
    actualValue: 'Correct value',
    perCapita: 'Per capita',
    comparedTo2024: 'Compared with 2024',
    growth: 'Change',
    noPreviousYear: 'A clear 2024 comparison point is not available yet.',
    mapContextTitle: 'Quick map context',
    mapContextDescription: 'Use this mini map only as a secondary reference. The main goal is still to understand the selected locality better.',
    groupedTitle: 'Explore the main chapters directly from platform data',
    groupedSubtitle: 'You can switch between revenue and spending without leaving the lesson.',
    revenueTab: 'Revenue',
    spendingTab: 'Spending',
    groupedQuizQuestion: 'Based on the displayed data, which revenue chapter has the highest value?',
    groupedQuizExplanation: (label: string) =>
      `In the data prepared for this lesson, the dominant revenue chapter is ${label}.`,
    crosswalkTitle: 'View the same spending through two lenses',
    crosswalkSubtitle: 'Switch the grouping and observe how the same money is reorganized by domain or by spending type.',
    functionalTab: 'Functional',
    economicTab: 'Economic',
    topFunctional: 'Largest functional chapter',
    topEconomic: 'Largest economic title',
    crosswalkQuizQuestion: 'In the economic grouping, which main title has the largest value for the selected entity?',
    crosswalkQuizExplanation: (label: string) =>
      `In the economic lens, the dominant title is ${label}.`,
    unitCaption: 'Amounts are shown in thousand lei.',
    unitValue: 'thousand lei',
    colIndicator: 'Indicator',
    colFn: 'FN code',
    colEc: 'EC code',
    selectRowPrompt: 'Select a row and explain it in your own words.',
    selectedRow: 'Selected row',
    noRowSelected: 'No row selected yet.',
    explanationPrompt: 'Explain briefly what this row shows and why the amount may also appear at other levels of the table.',
    explanationPlaceholder: 'Example: this row shows a main chapter, while the rows below break it down into more detail.',
    explanationHint: 'The checkpoint becomes active after you select a row and write a short explanation.',
    documentReady: 'I interpreted one row from the table',
    aggregateDetailedTitle: 'Compare aggregated and detailed',
    aggregateDetailedSubtitle: 'Switch between the two modes, observe who is inside the reporting perimeter, and connect that difference to the real institutions in this UAT.',
    aggregatedToggle: 'Aggregated',
    detailedToggle: 'Detailed',
    switchSeparator: 'or',
    reportQuestion: 'Question this view answers',
    aggregatedQuestion: 'How much did the full budget structure under the main creditor manage?',
    detailedQuestion: 'What did the city hall report directly, separated from institutions under the same main creditor?',
    perimeterTitle: 'What changes between the two modes',
    perimeterSubtitle: 'You are not changing the year or data source. You are changing the reporting perimeter you are reading.',
    perimeterAggregatedTitle: 'Aggregated: city hall + subordinates',
    perimeterAggregatedBody:
      'Useful when you want the full picture of the money managed through the same main budget creditor.',
    perimeterDetailedTitle: 'Detailed: only the city hall',
    perimeterDetailedBody:
      'Useful when you want to separate the city hall apparatus from the institutions that report distinctly within the same structure.',
    noGapHeadline: 'The totals are close.',
    noGapBody:
      'That can mean there are no linked subordinate institutions, or that they did not materially change the 2025 totals you see here.',
    withGapHeadline: 'The aggregated view covers a wider perimeter.',
    differenceLabel: 'Spending gap: aggregated vs detailed',
    differenceBody:
      'If the aggregated total is higher, you are most likely reading institutions that are outside the main totals of the detailed mode.',
    structureSummaryWithSubordinates:
      'The institutions below sit inside the main-creditor perimeter and help explain why the aggregated view can tell a wider story than the city hall alone.',
    structureSummaryWithoutSubordinates:
      'In the available data, this city hall has no linked subordinate institutions. In this case, aggregated and detailed should change the perimeter interpretation much less.',
    structureSummaryWithoutSpending:
      'The subordinate structure exists, but for 2025 we do not see reported subordinate spending in the lesson ranking.',
    quizLoading: 'Loading the quiz for this lesson...',
    quizUnavailable: 'We could not prepare the quiz for this lesson.',
    secondQuizQuestionNoSubordinates:
      'This UAT has no subordinate institutions in the available data. What does that mean for the aggregated/detailed difference?',
    secondQuizExplanationNoSubordinates:
      'If there are no linked subordinate institutions in the available data, aggregated and detailed change the institutional perimeter much less.',
    secondQuizQuestionWithSubordinates:
      'Why can the aggregated total be different from the detailed total for this UAT?',
    secondQuizExplanationWithSubordinates:
      'The aggregated view can include both the city hall and subordinate institutions inside the same reporting structure.',
    secondQuizQuestionWithoutSpending:
      'The subordinate structure exists, but no subordinate spending appears in 2025. What does that mean?',
    secondQuizExplanationWithoutSpending:
      'The institutional structure still exists even if the lesson ranking does not show reported subordinate spending for the selected year.',
  },
} as const

function LessonWidgetShell({
  title,
  subtitle,
  badge,
  icon: Icon,
  children,
}: {
  readonly title?: string
  readonly subtitle?: string
  readonly badge?: string
  readonly icon?: typeof Info
  readonly children: React.ReactNode
}) {
  const showHeader = title || badge || Icon

  return (
    <Card className="not-prose my-8 overflow-hidden rounded-[32px] border-border/50 shadow-sm">
      {showHeader ? (
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            {badge ? (
              <Badge variant="outline" className="font-semibold">
                {badge}
              </Badge>
            ) : null}
            {Icon ? (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Icon className="h-4 w-4" />
              </div>
            ) : null}
          </div>
          <div className="space-y-2">
            {title ? (
              <CardTitle className="text-2xl font-black tracking-tight">
                {title}
              </CardTitle>
            ) : null}
            {subtitle ? (
              <p className="text-sm leading-6 text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
          </div>
        </CardHeader>
      ) : null}
      <CardContent className={showHeader ? 'space-y-6' : 'space-y-6 pt-6'}>
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

function DynamicLessonQuiz({
  stepId,
  entityCui,
  quizId,
  question,
  options,
  explanation,
}: {
  readonly stepId: string
  readonly entityCui: string
  readonly quizId: string
  readonly question: string
  readonly options: readonly QuizOption[]
  readonly explanation: string
}) {
  const scopedQuizId = buildChallengeInteractionId(stepId, quizId)
  const { isCorrect } = useQuizInteraction({
    contentId: stepId,
    quizId: scopedQuizId,
    options,
    contentVersion: 'v1',
    scopePolicy: 'entity',
    entityCui,
    trackContentProgress: false,
  })

  useRegisterLessonChallenge({
    id: `quiz:${scopedQuizId}`,
    isCompleted: isCorrect,
  })

  return (
    <Quiz
      id={scopedQuizId}
      question={question}
      options={options}
      explanation={explanation}
      contentId={stepId}
      scopePolicy="entity"
      entityCui={entityCui}
      trackContentProgress={false}
    />
  )
}

function LessonMetadataGrid({
  entries,
}: {
  readonly entries: ReadonlyArray<{
    readonly label: string
    readonly value: string
    readonly className?: string
  }>
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {entries.map((entry) => (
        <div
          key={entry.label}
          className={cn(
            'rounded-2xl border border-border/50 bg-muted/[0.08] px-4 py-3',
            entry.className,
          )}
        >
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
            {entry.label}
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-foreground">
            {entry.value}
          </p>
        </div>
      ))}
    </div>
  )
}

function formatDelta(previousValue: number | null | undefined, currentValue: number | null | undefined) {
  if (
    previousValue === null ||
    previousValue === undefined ||
    currentValue === null ||
    currentValue === undefined ||
    previousValue === 0
  ) {
    return null
  }

  return ((currentValue - previousValue) / previousValue) * 100
}

function toMiiLeiLabel(amount: number) {
  return formatNumber(amount / 1_000, 'standard')
}

function formatLessonAmount(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return 'N/A'
  }

  return formatCurrency(value, 'compact', CHALLENGE_LESSON_DEFAULT_CURRENCY)
}

function LessonComparisonPerimeterCard({
  title,
  body,
  amount,
  isActive,
  icon: Icon,
  onSelect,
}: {
  readonly title: string
  readonly body: string
  readonly amount: number | null | undefined
  readonly isActive: boolean
  readonly icon: typeof Building2
  readonly onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isActive}
      className={cn(
        'w-full rounded-[24px] border px-5 py-5 text-left transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/60',
        isActive
          ? 'border-primary/50 bg-primary/[0.08]'
          : 'border-border/50 bg-muted/[0.08] hover:border-primary/30 hover:bg-primary/[0.04]',
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
            isActive
              ? 'bg-primary/12 text-primary'
              : 'bg-background text-muted-foreground',
          )}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>

        <div className="min-w-0 space-y-2">
          <p className="text-sm font-black tracking-tight text-foreground">
            {title}
          </p>
          <p className="text-sm leading-6 text-muted-foreground">
            {body}
          </p>
          <div className="rounded-2xl border border-border/50 bg-background/80 px-3 py-2">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
              {CHALLENGE_LESSON_YEAR}
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {formatLessonAmount(amount)}
            </p>
          </div>
        </div>
      </div>
    </button>
  )
}

function LessonComparisonDifferenceCard({
  locale,
  headline,
  body,
  differenceLabel,
  differenceAmount,
}: {
  readonly locale: ChallengeLocale
  readonly headline: string
  readonly body: string
  readonly differenceLabel: string
  readonly differenceAmount: number | null
}) {
  return (
    <div className="rounded-[24px] border border-border/50 bg-muted/[0.08] px-5 py-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background text-muted-foreground">
          <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-black tracking-tight text-foreground">
            {headline}
          </p>
          {differenceAmount !== null ? (
            <p className="text-sm font-semibold text-foreground">
              {differenceLabel}: {formatLessonAmount(differenceAmount)}
            </p>
          ) : null}
          <p className="text-sm leading-6 text-muted-foreground">
            {body}
          </p>
          <p className="text-xs text-muted-foreground">
            {locale === 'en'
              ? 'The comparison uses 2025 total spending for the same selected UAT.'
              : 'Comparația folosește totalul cheltuielilor din 2025 pentru același UAT selectat.'}
          </p>
        </div>
      </div>
    </div>
  )
}

function buildAggregateDetailedQuizContent(params: {
  readonly copy: (typeof WIDGET_COPY)[ChallengeLocale]
  readonly locale: ChallengeLocale
  readonly entityCuiLength: number
  readonly hasLinkedSubordinates: boolean
  readonly subordinateCardCount: number
}) {
  if (!params.hasLinkedSubordinates) {
    return {
      secondQuizQuestion: params.copy.secondQuizQuestionNoSubordinates,
      secondQuizExplanation: params.copy.secondQuizExplanationNoSubordinates,
      secondQuizOptions: buildLessonSingleCorrectQuizOptions({
        correctOption: {
          id: 'no-subordinates',
          text:
            params.locale === 'en'
              ? 'The perimeter difference is smaller because no linked subordinates appear in the available data.'
              : 'Diferența de perimetru este mai mică, pentru că nu apar subordonate conectate în datele disponibile.',
        },
        distractors: [
          {
            id: 'must-be-bigger',
            text:
              params.locale === 'en'
                ? 'The aggregated total is always much larger, even without subordinates.'
                : 'Totalul agregat este întotdeauna mult mai mare, chiar și fără subordonate.',
          },
          {
            id: 'only-detailed-valid',
            text:
              params.locale === 'en'
                ? 'Only the detailed view is valid when there are no subordinates.'
                : 'Doar varianta detaliată este validă când nu există subordonate.',
          },
          {
            id: 'data-missing',
            text:
              params.locale === 'en'
                ? 'It means the execution data is incomplete and cannot be trusted.'
                : 'Înseamnă că datele de execuție sunt incomplete și nu pot fi folosite.',
          },
        ],
        seed: params.entityCuiLength + 23,
      }),
    }
  }

  if (params.subordinateCardCount === 0) {
    return {
      secondQuizQuestion: params.copy.secondQuizQuestionWithoutSpending,
      secondQuizExplanation: params.copy.secondQuizExplanationWithoutSpending,
      secondQuizOptions: buildLessonSingleCorrectQuizOptions({
        correctOption: {
          id: 'structure-exists',
          text:
            params.locale === 'en'
              ? 'The subordinate structure still exists. The lesson ranking may not show their 2025 spending, but they remain part of the budget perimeter.'
              : 'Structura cu subordonate există în continuare. Lecția poate să nu arate cheltuielile lor din 2025, dar ele rămân parte din perimetrul bugetar.',
        },
        distractors: [
          {
            id: 'subordinates-removed',
            text:
              params.locale === 'en'
                ? 'The subordinate institutions were dissolved and no longer exist in the budget structure.'
                : 'Instituțiile subordonate au fost desființate și nu mai există în structura bugetară.',
          },
          {
            id: 'detailed-includes-all',
            text:
              params.locale === 'en'
                ? 'The detailed view already includes subordinate spending in the city hall total.'
                : 'Varianta detaliată include deja cheltuielile subordonatelor în totalul primăriei.',
          },
          {
            id: 'ignore-structure',
            text:
              params.locale === 'en'
                ? 'Without reported spending, the subordinate structure is irrelevant for 2026 questions.'
                : 'Fără cheltuieli raportate, structura cu subordonate nu mai contează pentru întrebările din 2026.',
          },
        ],
        seed: params.entityCuiLength + 29,
      }),
    }
  }

  return {
    secondQuizQuestion: params.copy.secondQuizQuestionWithSubordinates,
    secondQuizExplanation: params.copy.secondQuizExplanationWithSubordinates,
    secondQuizOptions: buildLessonSingleCorrectQuizOptions({
      correctOption: {
        id: 'aggregate-broader',
        text:
          params.locale === 'en'
            ? 'The aggregated view includes both the city hall and subordinate institutions, so its perimeter can be broader.'
            : 'Varianta agregată include atât primăria, cât și instituțiile subordonate, deci perimetrul ei poate fi mai larg.',
      },
      distractors: [
        {
          id: 'detailed-broader',
          text:
            params.locale === 'en'
              ? 'The detailed view is broader because it sums the city hall and each subordinate separately.'
              : 'Varianta detaliată este mai largă pentru că însumează primăria și fiecare subordonată separat.',
        },
        {
          id: 'same-perimeter',
          text:
            params.locale === 'en'
              ? 'Both views always cover the exact same institutional perimeter.'
              : 'Ambele variante acoperă întotdeauna exact același perimetru instituțional.',
        },
        {
          id: 'rounding-difference',
          text:
            params.locale === 'en'
              ? 'The difference comes from rounding errors in the reporting system.'
              : 'Diferența vine din erori de rotunjire în sistemul de raportare.',
        },
      ],
      seed: params.entityCuiLength + params.subordinateCardCount + 31,
    }),
  }
}

export function LessonEntitySnapshot({
  entityCui,
  stepId,
  locale,
}: LessonWidgetBaseProps) {
  const copy = WIDGET_COPY[locale]
  const { aggregatedTotalSummaryQuery, selectedYear } =
    useChallengeLessonEntityBundle(entityCui)
  const interactionId = buildChallengeInteractionId(
    stepId,
    'lesson-entity-snapshot',
  )
  const snapshotInteraction = useCustomInteraction<{
    checkedItems: boolean[]
  }>({
    lessonId: stepId,
    interactionId,
    scopePolicy: 'entity',
    entityCui,
  })
  const [checkedItems, setCheckedItems] = useState<boolean[]>(
    copy.snapshotChecks.map(() => false),
  )
  const snapshotRestoreSignatureRef = useRef<string | null>(null)

  useEffect(() => {
    const nextCheckedItems = snapshotInteraction.savedValue?.checkedItems
    const normalizedCheckedItems =
      Array.isArray(nextCheckedItems) && nextCheckedItems.length === copy.snapshotChecks.length
        ? nextCheckedItems.map((value) => value === true)
        : copy.snapshotChecks.map(() => false)
    const nextSignature = `${entityCui}:${stepId}:${normalizedCheckedItems.map((value) => (value ? '1' : '0')).join('')}`

    if (snapshotRestoreSignatureRef.current === nextSignature) return

    snapshotRestoreSignatureRef.current = nextSignature
    setCheckedItems(normalizedCheckedItems)
  }, [copy.snapshotChecks, copy.snapshotChecks.length, entityCui, snapshotInteraction.savedValue?.checkedItems, stepId])

  const allChecked = checkedItems.every(Boolean)
  useRegisterLessonChallenge({
    id: interactionId,
    isCompleted: snapshotInteraction.isCompleted || allChecked,
  })

  if (aggregatedTotalSummaryQuery.isLoading) {
    return (
      <LessonWidgetShell
        badge={copy.sourceBadge}
        title={copy.checklistTitle}
        icon={Info}
      >
        <LessonLoadingState label={copy.loading} />
      </LessonWidgetShell>
    )
  }

  const entity = aggregatedTotalSummaryQuery.data
  if (!entity) {
    return (
      <LessonWidgetShell
        badge={copy.sourceBadge}
        title={copy.checklistTitle}
        icon={Info}
      >
        <LessonUnavailableState
          title={copy.unavailable}
          description={copy.retryLater}
        />
      </LessonWidgetShell>
    )
  }

  return (
    <LessonWidgetShell
      badge={copy.sourceBadge}
      title={copy.checklistTitle}
      icon={Info}
    >
      <LessonMetadataGrid
        entries={[
          {
            label: copy.selectedYear,
            value: `${selectedYear}`,
          },
          {
            label: copy.reportType,
            value: getLessonReportTypeLabel(
              CHALLENGE_LESSON_DEFAULT_REPORT_TYPE,
              locale,
            ),
          },
          {
            label: copy.dataSource,
            value: copy.aggregatedSourceValue,
          },
        ]}
      />

      <div className="grid gap-3 md:grid-cols-3">
        {[
          locale === 'en' ? 'Total income' : 'Total venituri',
          locale === 'en' ? 'Total expenses' : 'Total cheltuieli',
          locale === 'en' ? 'Budget balance' : 'Balanță bugetară',
        ].map((label) => (
          <div
            key={label}
            className="rounded-2xl border border-dashed border-border/60 bg-muted/[0.08] px-4 py-4"
          >
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
              {label}
            </p>
            <p className="mt-3 text-2xl font-black tracking-tight text-foreground/60">
              • • •
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {locale === 'en'
                ? 'The real values appear in the next lesson after you make an estimate.'
                : 'Valorile reale apar în lecția următoare, după ce faci o estimare.'}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-3">
        {copy.snapshotChecks.map((label, index) => (
          <label
            key={label}
            className="flex items-start gap-3 rounded-2xl border border-border/50 bg-background px-4 py-3"
          >
            <Checkbox
              checked={checkedItems[index]}
              onCheckedChange={(checked) => {
                setCheckedItems((current) => {
                  const nextCheckedItems = current.map((value, currentIndex) =>
                    currentIndex === index ? checked === true : value,
                  )

                  const nextValue = { checkedItems: nextCheckedItems }
                  if (nextCheckedItems.every(Boolean)) {
                    void snapshotInteraction.complete(nextValue)
                  } else {
                    void snapshotInteraction.saveDraft(nextValue)
                  }

                  return nextCheckedItems
                })
              }}
            />
            <span className="text-sm font-medium leading-6 text-foreground">
              {label}
            </span>
          </label>
        ))}
      </div>

      {snapshotInteraction.isCompleted || allChecked ? (
        <div className="rounded-[24px] border border-emerald-300 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-800">
          {copy.lessonReady}
        </div>
      ) : null}
    </LessonWidgetShell>
  )
}

export function LessonBudgetEstimate({
  entityCui,
  stepId,
  locale,
  metric = 'income',
}: LessonBudgetEstimateProps) {
  const copy = WIDGET_COPY[locale]
  const {
    aggregatedPerCapitaSummaryQuery,
    aggregatedTotalSummaryQuery,
  } = useChallengeLessonEntityBundle(entityCui)
  const quizId = `lesson-budget-estimate-${metric}`
  const totalEntity = aggregatedTotalSummaryQuery.data
  const perCapitaEntity = aggregatedPerCapitaSummaryQuery.data
  const actualValue = selectLessonMetricValue(metric, totalEntity)
  const metricSeries = selectLessonMetricSeries(metric, totalEntity)
  const trend = buildLessonTrend(metricSeries)
  const isLoading =
    aggregatedTotalSummaryQuery.isLoading || aggregatedPerCapitaSummaryQuery.isLoading

  const options = useMemo(
    () =>
      typeof actualValue === 'number'
        ? buildLessonEstimateOptions({
            actualValue,
            currency: CHALLENGE_LESSON_DEFAULT_CURRENCY,
          })
        : [],
    [actualValue],
  )
  const explanation =
    metric === 'income'
      ? copy.estimateExplanationIncome
      : copy.estimateExplanationExpenses

  const { isAnswered } = useQuizInteraction({
    contentId: stepId,
    quizId,
    options,
    contentVersion: 'v1',
    scopePolicy: 'entity',
    entityCui,
    trackContentProgress: false,
  })

  const mapPreviewDefinition = useMemo(
    () =>
      getChallengeEntityMapPreviewDefinition(
        metric === 'income' ? 'income' : 'expenses',
      ),
    [metric],
  )

  if (isLoading) {
    return (
      <LessonWidgetShell
        badge={copy.sourceBadge}
        title={
          metric === 'income' ? copy.estimateTitleIncome : copy.estimateTitleExpenses
        }
        icon={Wallet}
      >
        <LessonLoadingState label={copy.loading} />
      </LessonWidgetShell>
    )
  }

  if (!totalEntity || typeof actualValue !== 'number' || options.length === 0) {
    return (
      <LessonWidgetShell
        badge={copy.sourceBadge}
        title={
          metric === 'income' ? copy.estimateTitleIncome : copy.estimateTitleExpenses
        }
        icon={Wallet}
      >
        <LessonUnavailableState
          title={copy.unavailable}
          description={copy.retryLater}
        />
      </LessonWidgetShell>
    )
  }

  const previousValue = trend?.previousValue
  const growthPercent = formatDelta(previousValue, actualValue)
  const perCapitaValue = selectLessonMetricValue(metric, perCapitaEntity)
  const previewCopy = mapPreviewDefinition.buildPreviewCopy({
    selectedPeriodLabel: String(CHALLENGE_LESSON_YEAR),
    normalization: 'per_capita',
    currency: CHALLENGE_LESSON_DEFAULT_CURRENCY,
    inflationAdjusted: false,
    reportType: 'PRINCIPAL_AGGREGATED',
  })

  return (
    <LessonWidgetShell
      badge={copy.sourceBadge}
      title={
        metric === 'income' ? copy.estimateTitleIncome : copy.estimateTitleExpenses
      }
      subtitle={
        metric === 'income'
          ? copy.estimateQuestionIncome
          : copy.estimateQuestionExpenses
      }
      icon={Wallet}
    >
      <DynamicLessonQuiz
        stepId={stepId}
        entityCui={entityCui}
        quizId={quizId}
        question={
          metric === 'income'
            ? copy.estimateQuestionIncome
            : copy.estimateQuestionExpenses
        }
        options={options}
        explanation={explanation}
      />

      {isAnswered ? (
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-border/50 bg-muted/[0.08] px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                {copy.actualValue}
              </p>
              <p className="mt-2 text-lg font-black text-foreground">
                {formatCurrency(actualValue, 'compact', CHALLENGE_LESSON_DEFAULT_CURRENCY)}
              </p>
            </div>
            <div className="rounded-2xl border border-border/50 bg-muted/[0.08] px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                {copy.perCapita}
              </p>
              <p className="mt-2 text-lg font-black text-foreground">
                {typeof perCapitaValue === 'number'
                  ? formatCurrency(perCapitaValue, 'compact', CHALLENGE_LESSON_DEFAULT_CURRENCY)
                  : 'N/A'}
              </p>
            </div>
            <div className="rounded-2xl border border-border/50 bg-muted/[0.08] px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                {copy.comparedTo2024}
              </p>
              <p className="mt-2 text-lg font-black text-foreground">
                {growthPercent === null
                  ? copy.noPreviousYear
                  : `${growthPercent > 0 ? '+' : ''}${formatNumber(growthPercent, 'standard')}%`}
              </p>
            </div>
          </div>

          <div className="space-y-3 rounded-[24px] border border-border/50 bg-muted/[0.08] px-4 py-4">
            <div className="space-y-1">
              <h4 className="text-sm font-black uppercase tracking-[0.18em] text-muted-foreground">
                {copy.mapContextTitle}
              </h4>
              <p className="text-sm leading-6 text-muted-foreground">
                {copy.mapContextDescription}
              </p>
            </div>

            <MapAnalyticsPublicPreviewCard
              mapKey={mapPreviewDefinition.key}
              mapDescription={previewCopy.mapDescription}
              mapStateDefinition={mapPreviewDefinition.mapState}
              selectedYearOverride={CHALLENGE_LESSON_YEAR}
              normalizationOverride="per_capita"
              currencyOverride={CHALLENGE_LESSON_DEFAULT_CURRENCY}
              inflationAdjustedOverride={false}
              reportTypeOverride={toReportTypeValue('PRINCIPAL_AGGREGATED')}
              mapNameOverride={previewCopy.mapName}
            />
          </div>
        </div>
      ) : null}
    </LessonWidgetShell>
  )
}

export function LessonGroupedExplorer({
  entityCui,
  stepId,
  locale,
}: LessonWidgetBaseProps) {
  const copy = WIDGET_COPY[locale]
  const { aggregatedLineItemsQuery, aggregatedTotalSummaryQuery } =
    useChallengeLessonEntityBundle(entityCui)

  const lineItems = aggregatedLineItemsQuery.data?.nodes ?? []
  const totalIncome = aggregatedTotalSummaryQuery.data?.totalIncome ?? null
  const totalExpenses = aggregatedTotalSummaryQuery.data?.totalExpenses ?? null
  const financialData = useFinancialData(lineItems, totalIncome, totalExpenses, '', '', {
    computeEconomic: true,
    searchDebounceMs: 0,
  })
  const [activeTab, setActiveTab] = useState<'income' | 'expenses'>('income')

  const quizGroups =
    financialData.filteredIncomeGroups.length >= 2
      ? financialData.filteredIncomeGroups
      : financialData.filteredExpenseGroups
  const quizQuestion = copy.groupedQuizQuestion
  const correctGroup = quizGroups[0]
  const quizOptions = useMemo(() => {
    const fallbackOptions = [
      {
        id: 'correct-fallback',
        text: correctGroup?.description ?? 'N/A',
        isCorrect: true,
      },
      {
        id: 'fallback-2',
        text: quizGroups[1]?.description ?? 'N/A',
        isCorrect: false,
      },
    ]
    const builtOptions = quizGroups.slice(0, 4).map((group, index) => ({
      id: `group-${index}`,
      text: group.description,
      isCorrect: index === 0,
    }))
    return builtOptions.length >= 2 ? builtOptions : fallbackOptions
  }, [correctGroup?.description, quizGroups])

  if (aggregatedLineItemsQuery.isLoading || aggregatedTotalSummaryQuery.isLoading) {
    return (
      <LessonWidgetShell>
        <LessonLoadingState label={copy.loading} />
      </LessonWidgetShell>
    )
  }

  if (lineItems.length === 0) {
    return (
      <LessonWidgetShell>
        <LessonUnavailableState
          title={copy.unavailable}
          description={copy.retryLater}
        />
      </LessonWidgetShell>
    )
  }

  return (
    <LessonWidgetShell>
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'income' | 'expenses')}
      >
        <TabsList className="h-auto rounded-full p-1">
          <TabsTrigger value="income" className="rounded-full px-4 py-2">
            {copy.revenueTab}
          </TabsTrigger>
          <TabsTrigger value="expenses" className="rounded-full px-4 py-2">
            {copy.spendingTab}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="income" className="mt-4">
          <GroupedItemsDisplay
            groups={[...financialData.filteredIncomeGroups]}
            title={copy.revenueTab}
            baseTotal={financialData.incomeBase}
            searchTerm=""
            currentYear={CHALLENGE_LESSON_YEAR}
            normalization="total"
            currency={CHALLENGE_LESSON_DEFAULT_CURRENCY}
          />
        </TabsContent>

        <TabsContent value="expenses" className="mt-4">
          <GroupedItemsDisplay
            groups={[...financialData.filteredExpenseGroups]}
            title={copy.spendingTab}
            baseTotal={financialData.expenseBase}
            searchTerm=""
            currentYear={CHALLENGE_LESSON_YEAR}
            normalization="total"
            currency={CHALLENGE_LESSON_DEFAULT_CURRENCY}
          />
        </TabsContent>
      </Tabs>

      <DynamicLessonQuiz
        stepId={stepId}
        entityCui={entityCui}
        quizId="lesson-grouped-explorer"
        question={quizQuestion}
        options={quizOptions}
        explanation={copy.groupedQuizExplanation(correctGroup?.description ?? 'N/A')}
      />
    </LessonWidgetShell>
  )
}

export function LessonClassificationCrosswalk({
  entityCui,
  stepId,
  locale,
}: LessonWidgetBaseProps) {
  const copy = WIDGET_COPY[locale]
  const { aggregatedLineItemsQuery, aggregatedTotalSummaryQuery } =
    useChallengeLessonEntityBundle(entityCui)
  const lineItems = aggregatedLineItemsQuery.data?.nodes ?? []
  const totalExpenses = aggregatedTotalSummaryQuery.data?.totalExpenses ?? null
  const expenseLineItems = filterLineItemsByAccountCategory(lineItems, 'ch')
  const financialData = useFinancialData([...expenseLineItems], null, totalExpenses, '', '', {
    computeEconomic: true,
    searchDebounceMs: 0,
  })
  const [activeTab, setActiveTab] = useState<'functional' | 'economic'>('functional')

  const topFunctional = financialData.filteredExpenseGroups[0]
  const topEconomic = financialData.filteredEconomicGroups[0]
  const economicQuizOptions = useMemo(() => {
    const base = financialData.filteredEconomicGroups.slice(0, 4).map((group, index) => ({
      id: `economic-${index}`,
      text: group.description,
      isCorrect: index === 0,
    }))
    return base.length >= 2
      ? base
      : [
          {
            id: 'correct-fallback',
            text: topEconomic?.description ?? 'N/A',
            isCorrect: true,
          },
          {
            id: 'fallback-2',
            text: topFunctional?.description ?? 'N/A',
            isCorrect: false,
          },
        ]
  }, [
    financialData.filteredEconomicGroups,
    topEconomic?.description,
    topFunctional?.description,
  ])

  if (aggregatedLineItemsQuery.isLoading || aggregatedTotalSummaryQuery.isLoading) {
    return (
      <LessonWidgetShell
        badge={copy.sourceBadge}
        title={copy.crosswalkTitle}
        subtitle={copy.crosswalkSubtitle}
        icon={Layers3}
      >
        <LessonLoadingState label={copy.loading} />
      </LessonWidgetShell>
    )
  }

  if (expenseLineItems.length === 0) {
    return (
      <LessonWidgetShell
        badge={copy.sourceBadge}
        title={copy.crosswalkTitle}
        subtitle={copy.crosswalkSubtitle}
        icon={Layers3}
      >
        <LessonUnavailableState
          title={copy.unavailable}
          description={copy.retryLater}
        />
      </LessonWidgetShell>
    )
  }

  return (
    <LessonWidgetShell
      badge={copy.sourceBadge}
      title={copy.crosswalkTitle}
      subtitle={copy.crosswalkSubtitle}
      icon={Layers3}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-border/50 bg-muted/[0.08] px-4 py-3">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
            {copy.topFunctional}
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-foreground">
            {topFunctional?.description ?? 'N/A'}
          </p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-muted/[0.08] px-4 py-3">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
            {copy.topEconomic}
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-foreground">
            {topEconomic?.description ?? 'N/A'}
          </p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'functional' | 'economic')}
      >
        <TabsList className="h-auto rounded-full p-1">
          <TabsTrigger value="functional" className="rounded-full px-4 py-2">
            {copy.functionalTab}
          </TabsTrigger>
          <TabsTrigger value="economic" className="rounded-full px-4 py-2">
            {copy.economicTab}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="functional" className="mt-4">
          <GroupedItemsDisplay
            groups={[...financialData.filteredExpenseGroups]}
            title={copy.functionalTab}
            baseTotal={financialData.expenseBase}
            searchTerm=""
            currentYear={CHALLENGE_LESSON_YEAR}
            normalization="total"
            currency={CHALLENGE_LESSON_DEFAULT_CURRENCY}
          />
        </TabsContent>

        <TabsContent value="economic" className="mt-4">
          <GroupedItemsDisplay
            groups={[...financialData.filteredEconomicGroups]}
            title={copy.economicTab}
            baseTotal={financialData.expenseBase}
            searchTerm=""
            currentYear={CHALLENGE_LESSON_YEAR}
            normalization="total"
            currency={CHALLENGE_LESSON_DEFAULT_CURRENCY}
            subchapterCodePrefix="ec"
          />
        </TabsContent>
      </Tabs>

      <DynamicLessonQuiz
        stepId={stepId}
        entityCui={entityCui}
        quizId="lesson-classification-crosswalk"
        question={copy.crosswalkQuizQuestion}
        options={economicQuizOptions}
        explanation={copy.crosswalkQuizExplanation(topEconomic?.description ?? 'N/A')}
      />
    </LessonWidgetShell>
  )
}

export function LessonExecutionTableExcerpt({
  entityCui,
  stepId,
  locale,
}: LessonWidgetBaseProps) {
  const copy = WIDGET_COPY[locale]
  const { aggregatedLineItemsQuery, aggregatedTotalSummaryQuery } =
    useChallengeLessonEntityBundle(entityCui)
  const lineItems = aggregatedLineItemsQuery.data?.nodes ?? []
  const expenseLineItems = filterLineItemsByAccountCategory(lineItems, 'ch')
  const financialData = useFinancialData([...expenseLineItems], null, aggregatedTotalSummaryQuery.data?.totalExpenses ?? null, '', '', {
    computeEconomic: true,
    searchDebounceMs: 0,
  })
  const rows = useMemo(
    () =>
      buildLessonExecutionTableExcerpt({
        totalExpenses: aggregatedTotalSummaryQuery.data?.totalExpenses,
        expenseGroups: financialData.filteredExpenseGroups,
      }),
    [aggregatedTotalSummaryQuery.data?.totalExpenses, financialData.filteredExpenseGroups],
  )
  const interactionId = buildChallengeInteractionId(
    stepId,
    'lesson-execution-table-excerpt',
  )
  const executionTableInteraction = useCustomInteraction<{
    selectedRowId: string | null
    rowExplanation: string
  }>({
    lessonId: stepId,
    interactionId,
    scopePolicy: 'entity',
    entityCui,
  })
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null)
  const [rowExplanation, setRowExplanation] = useState('')
  const executionTableRestoreSignatureRef = useRef<string | null>(null)

  useEffect(() => {
    const restoredSelectedRowId =
      typeof executionTableInteraction.savedValue?.selectedRowId === 'string'
        ? executionTableInteraction.savedValue.selectedRowId
        : null
    const restoredRowExplanation =
      typeof executionTableInteraction.savedValue?.rowExplanation === 'string'
        ? executionTableInteraction.savedValue.rowExplanation
        : ''
    const nextSignature = `${entityCui}:${stepId}:${restoredSelectedRowId ?? ''}:${restoredRowExplanation}`

    if (executionTableRestoreSignatureRef.current === nextSignature) return

    executionTableRestoreSignatureRef.current = nextSignature
    setSelectedRowId(restoredSelectedRowId)
    setRowExplanation(restoredRowExplanation)
  }, [
    entityCui,
    executionTableInteraction.savedValue?.rowExplanation,
    executionTableInteraction.savedValue?.selectedRowId,
    stepId,
  ])

  const debouncedPersistExecution = useDebouncedCallback(
    (nextValue: { selectedRowId: string | null; rowExplanation: string }, isComplete: boolean) => {
      if (isComplete) {
        void executionTableInteraction.complete(nextValue)
      } else {
        void executionTableInteraction.saveDraft(nextValue)
      }
    },
    500,
  )

  useEffect(() => {
    return () => {
      debouncedPersistExecution.flush()
    }
  }, [debouncedPersistExecution])

  const selectedRow = rows.find((row) => row.id === selectedRowId) ?? null
  const isCompleted = Boolean(selectedRow) && rowExplanation.trim().length >= 30
  useRegisterLessonChallenge({
    id: interactionId,
    isCompleted: executionTableInteraction.isCompleted || isCompleted,
  })

  if (aggregatedLineItemsQuery.isLoading || aggregatedTotalSummaryQuery.isLoading) {
    return (
      <div className="not-prose my-8 flex min-h-[120px] items-center justify-center rounded-[24px] border border-border/50 bg-muted/[0.08]">
        <LoadingSpinner text={copy.loading} />
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="not-prose my-8 rounded-[24px] border border-dashed border-border/60 bg-muted/20 px-5 py-6 text-center">
        <p className="text-sm font-semibold text-foreground">{copy.unavailable}</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.retryLater}</p>
      </div>
    )
  }

  return (
    <div className="not-prose my-8 space-y-4">
      <p className="text-xs text-muted-foreground">{copy.unitCaption}</p>

      <div className="rounded-[24px] border border-border/50 bg-background p-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{copy.colIndicator}</TableHead>
              <TableHead>{copy.colFn}</TableHead>
              <TableHead>{copy.colEc}</TableHead>
              <TableHead className="text-right">2025 ({copy.unitValue})</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const isSelected = selectedRowId === row.id
              return (
                <TableRow
                  key={row.id}
                  data-state={isSelected ? 'selected' : undefined}
                  className={`cursor-pointer transition-colors hover:bg-muted/50 ${isSelected ? 'border-l-2 border-l-primary bg-muted/30' : ''}`}
                  onClick={() => {
                    debouncedPersistExecution.cancel()
                    setSelectedRowId(row.id)
                    const nextValue = {
                      selectedRowId: row.id,
                      rowExplanation,
                    }
                    if (rowExplanation.trim().length >= 30) {
                      void executionTableInteraction.complete(nextValue)
                    } else {
                      void executionTableInteraction.saveDraft(nextValue)
                    }
                  }}
                >
                  <TableCell className="font-medium">
                    <span
                      className="block"
                      style={{ paddingLeft: `${row.level * 14}px` }}
                    >
                      {row.indicator}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {row.functionalCode ?? '-'}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {row.economicCode ?? '-'}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {toMiiLeiLabel(row.amount)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3">
        {selectedRow ? (
          <p className="text-sm text-muted-foreground">
            {copy.selectedRow}:{' '}
            <span className="font-medium text-foreground">
              {selectedRow.indicator}
            </span>
          </p>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            <Info className="h-4 w-4 shrink-0" />
            {copy.selectRowPrompt}
          </div>
        )}

        <div className="space-y-1">
          <Textarea
            id="lesson-execution-row-explanation"
            aria-label={copy.explanationPrompt}
            value={rowExplanation}
            onChange={(event) => {
              const nextRowExplanation = event.target.value
              setRowExplanation(nextRowExplanation)
              const nextValue = {
                selectedRowId,
                rowExplanation: nextRowExplanation,
              }
              debouncedPersistExecution(
                nextValue,
                Boolean(selectedRowId) && nextRowExplanation.trim().length >= 30,
              )
            }}
            onBlur={() => {
              debouncedPersistExecution.flush()
            }}
            placeholder={copy.explanationPlaceholder}
            rows={3}
          />
          {rowExplanation.trim().length > 0 && rowExplanation.trim().length < 30 ? (
            <p className="text-xs tabular-nums text-muted-foreground">
              {rowExplanation.trim().length} / 30
            </p>
          ) : null}
        </div>

        {executionTableInteraction.isCompleted || isCompleted ? (
          <p className="text-sm font-semibold text-emerald-700">
            {copy.documentReady}
          </p>
        ) : null}
      </div>
    </div>
  )
}

export function LessonAggregateDetailedCompare({
  entityCui,
  stepId,
  locale,
}: LessonWidgetBaseProps) {
  const copy = WIDGET_COPY[locale]
  const entityTypeLabel = useEntityTypeLabel()
  const aggregatedSummaryQuery = useChallengeLessonEntitySummary({
    entityCui,
    reportType: 'PRINCIPAL_AGGREGATED',
    normalization: 'total',
  })
  const detailedSummaryQuery = useChallengeLessonEntitySummary({
    entityCui,
    reportType: 'DETAILED',
    normalization: 'total',
  })
  const subordinateInsights = useChallengeLessonSubordinateInsights({
    entityCui,
  })
  const interactionId = buildChallengeInteractionId(
    stepId,
    'lesson-aggregate-detailed-compare',
  )
  const aggregateDetailedInteraction = useCustomInteraction<{
    activeReportType: 'PRINCIPAL_AGGREGATED' | 'DETAILED'
    hasViewedDetailed: boolean
  }>({
    lessonId: stepId,
    interactionId,
    scopePolicy: 'entity',
    entityCui,
  })
  const [activeReportType, setActiveReportType] = useState<'PRINCIPAL_AGGREGATED' | 'DETAILED'>('PRINCIPAL_AGGREGATED')
  const [hasViewedDetailed, setHasViewedDetailed] = useState(false)
  const aggregateDetailedRestoreSignatureRef = useRef<string | null>(null)

  useEffect(() => {
    const savedReportType = aggregateDetailedInteraction.savedValue?.activeReportType
    const nextHasViewedDetailed = aggregateDetailedInteraction.savedValue?.hasViewedDetailed === true
    const nextSignature = `${entityCui}:${stepId}:${savedReportType ?? 'PRINCIPAL_AGGREGATED'}:${nextHasViewedDetailed ? '1' : '0'}`

    if (aggregateDetailedRestoreSignatureRef.current === nextSignature) return

    aggregateDetailedRestoreSignatureRef.current = nextSignature
    if (savedReportType === 'PRINCIPAL_AGGREGATED' || savedReportType === 'DETAILED') {
      setActiveReportType(savedReportType)
    } else {
      setActiveReportType('PRINCIPAL_AGGREGATED')
    }
    setHasViewedDetailed(nextHasViewedDetailed)
  }, [
    entityCui,
    aggregateDetailedInteraction.savedValue?.activeReportType,
    aggregateDetailedInteraction.savedValue?.hasViewedDetailed,
    stepId,
  ])
  const handleReportTypeChange = (
    nextValue: 'PRINCIPAL_AGGREGATED' | 'DETAILED',
  ) => {
    setActiveReportType(nextValue)
    const nextHasViewedDetailed = hasViewedDetailed || nextValue === 'DETAILED'
    if (nextValue === 'DETAILED') {
      setHasViewedDetailed(true)
    }
    const nextInteractionValue = {
      activeReportType: nextValue,
      hasViewedDetailed: nextHasViewedDetailed,
    }
    if (nextHasViewedDetailed) {
      void aggregateDetailedInteraction.complete(nextInteractionValue)
    } else {
      void aggregateDetailedInteraction.saveDraft(nextInteractionValue)
    }
  }
  const subordinateCards = useMemo<ChallengeEntitySubordinateCardItem[]>(
    () =>
      subordinateInsights.rankingNodes.map((subordinateEntity) => {
        const rawEntityTypeLabel = subordinateEntity.entity_type
          ? entityTypeLabel.map(subordinateEntity.entity_type)
          : null
        const subordinateEntityTypeLabel =
          rawEntityTypeLabel && !rawEntityTypeLabel.startsWith('id::')
            ? rawEntityTypeLabel
            : null

        return {
          entityCui: subordinateEntity.entity_cui,
          entityName: subordinateEntity.entity_name,
          entityTypeLabel: subordinateEntityTypeLabel,
          totalSpending: Number(
            subordinateEntity.total_amount ?? subordinateEntity.amount ?? 0,
          ),
          entitySearch: {
            year: CHALLENGE_LESSON_YEAR,
            period: 'YEAR',
            report_type: 'DETAILED',
            main_creditor_cui: entityCui,
          },
        }
      }),
    [entityCui, entityTypeLabel, subordinateInsights.rankingNodes],
  )

  const bothViewsSeen = activeReportType === 'DETAILED' ? true : hasViewedDetailed
  const isCompleted = bothViewsSeen
  useRegisterLessonChallenge({
    id: interactionId,
    isCompleted: aggregateDetailedInteraction.isCompleted || isCompleted,
  })

  const summaryLoading =
    aggregatedSummaryQuery.isLoading ||
    detailedSummaryQuery.isLoading

  if (summaryLoading) {
    return (
      <LessonWidgetShell
        title={copy.aggregateDetailedTitle}
        subtitle={copy.aggregateDetailedSubtitle}
      >
        <LessonLoadingState label={copy.loading} />
      </LessonWidgetShell>
    )
  }

  if (!aggregatedSummaryQuery.data || !detailedSummaryQuery.data) {
    return (
      <LessonWidgetShell
        title={copy.aggregateDetailedTitle}
        subtitle={copy.aggregateDetailedSubtitle}
      >
        <LessonUnavailableState
          title={copy.unavailable}
          description={copy.retryLater}
        />
      </LessonWidgetShell>
    )
  }

  const activeSummary =
    (activeReportType === 'DETAILED'
      ? detailedSummaryQuery.data
      : aggregatedSummaryQuery.data) ?? null
  const activeQuestion =
    activeReportType === 'DETAILED'
      ? copy.detailedQuestion
      : copy.aggregatedQuestion
  const aggregatedTotalExpenses =
    aggregatedSummaryQuery.data.totalExpenses ?? null
  const detailedTotalExpenses =
    detailedSummaryQuery.data.totalExpenses ?? null
  const rawDifference =
    aggregatedTotalExpenses !== null && detailedTotalExpenses !== null
      ? aggregatedTotalExpenses - detailedTotalExpenses
      : null
  const differenceAmount =
    rawDifference !== null && Math.abs(rawDifference) > 0
      ? Math.abs(rawDifference)
      : null
  const hasLinkedSubordinates =
    subordinateInsights.hasLinkedSubordinates || subordinateCards.length > 0
  const isSubordinatesLoading =
    (
      subordinateInsights.rankingQuery.isLoading &&
      !subordinateInsights.rankingQuery.data
    ) ||
    (
      subordinateCards.length === 0 &&
      subordinateInsights.relationshipsQuery.isLoading &&
      !subordinateInsights.relationshipsQuery.data
    )
  const isSubordinatesError =
    subordinateInsights.rankingQuery.isError ||
    (
      subordinateCards.length === 0 &&
      subordinateInsights.relationshipsQuery.isError
    )
  const subordinatesDescription =
    subordinateCards.length > 0
      ? copy.structureSummaryWithSubordinates
      : hasLinkedSubordinates
        ? copy.structureSummaryWithoutSpending
        : copy.structureSummaryWithoutSubordinates

  return (
    <LessonWidgetShell
      title={copy.aggregateDetailedTitle}
      subtitle={copy.aggregateDetailedSubtitle}
    >
      <Tabs
        value={activeReportType}
        onValueChange={(value) =>
          handleReportTypeChange(
            value as 'PRINCIPAL_AGGREGATED' | 'DETAILED',
          )}
      >
        <TabsList className="grid h-auto w-full grid-cols-[minmax(0,1fr)_72px_minmax(0,1fr)] items-stretch gap-4 bg-transparent p-0">
          <TabsTrigger
            value="PRINCIPAL_AGGREGATED"
            className="h-16 w-full rounded-[28px] border-2 border-border/60 bg-muted/[0.08] px-4 py-2 text-lg font-black data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            {copy.aggregatedToggle}
          </TabsTrigger>
          <span
            aria-hidden="true"
            className="flex h-16 items-center justify-center text-sm font-black uppercase tracking-[0.3em] text-muted-foreground"
          >
            {copy.switchSeparator}
          </span>
          <TabsTrigger
            value="DETAILED"
            className="h-16 w-full rounded-[28px] border-2 border-border/60 bg-muted/[0.08] px-4 py-2 text-lg font-black data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            {copy.detailedToggle}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeReportType} className="mt-4 space-y-4">
          <LessonMetadataGrid
            entries={[
              {
                label: copy.selectedYear,
                value: `${CHALLENGE_LESSON_YEAR}`,
                className: 'sm:col-span-1',
              },
              {
                label: copy.reportType,
                value: getLessonReportTypeLabel(activeReportType, locale),
                className: 'sm:col-span-2',
              },
            ]}
          />

          <div className="rounded-[24px] border border-border/50 bg-muted/[0.08] px-4 py-4">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
              {copy.reportQuestion}
            </p>
            <p className="mt-2 text-sm leading-6 text-foreground">
              {activeQuestion}
            </p>
          </div>

          <EntityFinancialSummary
            totalIncome={activeSummary?.totalIncome}
            totalExpenses={activeSummary?.totalExpenses}
            budgetBalance={activeSummary?.budgetBalance}
            periodLabel={`${CHALLENGE_LESSON_YEAR}`}
            normalizationOptions={{
              normalization: 'total',
              currency: CHALLENGE_LESSON_DEFAULT_CURRENCY,
            }}
            trends={{
              income: buildLessonTrend(activeSummary?.incomeTrend),
              expenses: buildLessonTrend(activeSummary?.expenseTrend),
              balance: buildLessonTrend(activeSummary?.balanceTrend),
            }}
            density="compact-desktop"
          />
        </TabsContent>
      </Tabs>

      <div className="space-y-4 rounded-[28px] border border-border/50 bg-muted/[0.08] px-4 py-4 sm:px-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-foreground">
            <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
            <p className="text-sm font-black tracking-tight">
              {copy.perimeterTitle}
            </p>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            {copy.perimeterSubtitle}
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr]">
          <LessonComparisonPerimeterCard
            title={copy.perimeterAggregatedTitle}
            body={copy.perimeterAggregatedBody}
            amount={aggregatedTotalExpenses}
            isActive={activeReportType === 'PRINCIPAL_AGGREGATED'}
            icon={Users}
            onSelect={() => handleReportTypeChange('PRINCIPAL_AGGREGATED')}
          />

          <div className="hidden items-center justify-center text-muted-foreground lg:flex">
            <ArrowRightLeft className="h-5 w-5" aria-hidden="true" />
          </div>

          <LessonComparisonPerimeterCard
            title={copy.perimeterDetailedTitle}
            body={copy.perimeterDetailedBody}
            amount={detailedTotalExpenses}
            isActive={activeReportType === 'DETAILED'}
            icon={Building2}
            onSelect={() => handleReportTypeChange('DETAILED')}
          />
        </div>

        <LessonComparisonDifferenceCard
          locale={locale}
          headline={
            differenceAmount !== null
              ? copy.withGapHeadline
              : copy.noGapHeadline
          }
          body={
            differenceAmount !== null
              ? copy.differenceBody
              : copy.noGapBody
          }
          differenceLabel={copy.differenceLabel}
          differenceAmount={differenceAmount}
        />
      </div>

      <ChallengeEntitySubordinatesSection
        locale={locale}
        items={subordinateCards}
        totalResultsCount={subordinateInsights.totalSubordinateCount}
        isLoading={isSubordinatesLoading}
        isError={isSubordinatesError}
        onRetry={() => {
          void subordinateInsights.relationshipsQuery.refetch()
          void subordinateInsights.rankingQuery.refetch()
        }}
        normalizationOptions={{
          normalization: 'total',
          currency: CHALLENGE_LESSON_DEFAULT_CURRENCY,
        }}
        description={subordinatesDescription}
        emptyStateKind={hasLinkedSubordinates ? 'spending' : 'children'}
      />

    </LessonWidgetShell>
  )
}

export function LessonAggregateDetailedQuiz({
  entityCui,
  stepId,
  locale,
}: LessonWidgetBaseProps) {
  const copy = WIDGET_COPY[locale]
  const subordinateInsights = useChallengeLessonSubordinateInsights({
    entityCui,
  })

  const hasLinkedSubordinates =
    subordinateInsights.hasLinkedSubordinates ||
    subordinateInsights.rankingNodes.length > 0
  const isQuizLoading =
    (
      subordinateInsights.rankingQuery.isLoading &&
      !subordinateInsights.rankingQuery.data
    ) ||
    (
      subordinateInsights.rankingNodes.length === 0 &&
      subordinateInsights.relationshipsQuery.isLoading &&
      !subordinateInsights.relationshipsQuery.data
    )
  const isQuizError =
    subordinateInsights.rankingQuery.isError ||
    (
      subordinateInsights.rankingNodes.length === 0 &&
      subordinateInsights.relationshipsQuery.isError
    )

  const quizContent = useMemo(
    () => buildAggregateDetailedQuizContent({
      copy,
      locale,
      entityCuiLength: entityCui.length,
      hasLinkedSubordinates,
      subordinateCardCount: subordinateInsights.rankingNodes.length,
    }),
    [copy, locale, entityCui.length, hasLinkedSubordinates, subordinateInsights.rankingNodes.length],
  )
  const quizId = buildChallengeInteractionId(
    stepId,
    'lesson-aggregate-detailed-interpretation',
  )

  if (isQuizLoading) {
    return (
      <div className="not-prose my-8">
        <LessonLoadingState label={copy.quizLoading} />
      </div>
    )
  }

  if (isQuizError) {
    return (
      <div className="not-prose my-8">
        <LessonUnavailableState
          title={copy.quizUnavailable}
          description={copy.retryLater}
        />
      </div>
    )
  }

  return (
    <div className="not-prose my-6">
      <ChallengeDynamicQuiz
        contentId={stepId}
        quizId={quizId}
        question={quizContent.secondQuizQuestion}
        options={quizContent.secondQuizOptions}
        explanation={quizContent.secondQuizExplanation}
        scopePolicy="entity"
        entityCui={entityCui}
      />
    </div>
  )
}
