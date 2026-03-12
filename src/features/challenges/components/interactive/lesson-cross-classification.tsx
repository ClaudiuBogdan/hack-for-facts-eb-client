import { useMemo } from 'react'
import { ArrowRight } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import functionalClassificationsEn from '@/assets/functional-classifications-general-en.json'
import functionalClassificationsRo from '@/assets/functional-classifications-general-ro.json'
import economicClassificationsEn from '@/assets/economic-classifications-general-en.json'
import economicClassificationsRo from '@/assets/economic-classifications-general-ro.json'
import {
  useChallengeLessonEntityBundle,
} from '@/features/challenges/hooks/use-challenge-lesson-entity-data'
import type { ChallengeLocale } from '@/features/challenges/types'
import { useFinancialData } from '@/hooks/useFinancialData'
import { formatCurrency } from '@/lib/utils'
import {
  buildCrossClassificationView,
  type CrossChapterEntry,
  type CrossBreakdownEntry,
} from './lesson-cross-classification.utils'

type LessonCrossClassificationProps = {
  readonly entityCui: string
  readonly stepId: string
  readonly locale: ChallengeLocale
}

type ClassificationNode = {
  readonly code?: string
  readonly description: string
  readonly children?: readonly ClassificationNode[]
}

function buildChapterDescriptionMap(source: readonly ClassificationNode[]): Map<string, string> {
  const descriptionMap = new Map<string, string>()
  const stack = [...source]

  while (stack.length > 0) {
    const node = stack.pop()
    if (!node) continue

    if (typeof node.code === 'string' && /^\d{2}$/.test(node.code)) {
      descriptionMap.set(node.code, node.description)
    }

    if (Array.isArray(node.children)) {
      stack.push(...node.children)
    }
  }

  return descriptionMap
}

const functionalChapterDescriptionMaps = {
  ro: buildChapterDescriptionMap(functionalClassificationsRo as unknown as ClassificationNode[]),
  en: buildChapterDescriptionMap(functionalClassificationsEn as unknown as ClassificationNode[]),
} as const

const economicChapterDescriptionMaps = {
  ro: buildChapterDescriptionMap(economicClassificationsRo as unknown as ClassificationNode[]),
  en: buildChapterDescriptionMap(economicClassificationsEn as unknown as ClassificationNode[]),
} as const

const COPY = {
  en: {
    fnToEcLabel: 'Functional',
    fnToEcTarget: 'Economic',
    fnToEcDesc: 'Which economic types make up the top spending domains?',
    ecToFnLabel: 'Economic',
    ecToFnTarget: 'Functional',
    ecToFnDesc: 'Which domains absorb the top economic types?',
    loading: 'Loading cross-classification...',
    unavailable: 'Data not available.',
    unavailableDetail: 'Try again once the selected entity data is available.',
  },
  ro: {
    fnToEcLabel: 'Functional',
    fnToEcTarget: 'Economic',
    fnToEcDesc: 'Ce tipuri economice compun principalele domenii?',
    ecToFnLabel: 'Economic',
    ecToFnTarget: 'Functional',
    ecToFnDesc: 'Ce domenii absorb principalele tipuri economice?',
    loading: 'Se incarca datele...',
    unavailable: 'Datele nu sunt disponibile.',
    unavailableDetail: 'Incearca din nou dupa ce datele pentru entitatea selectata sunt disponibile.',
  },
} as const

function resolveBreakdownLabel(
  code: string,
  direction: 'fnToEc' | 'ecToFn',
  locale: ChallengeLocale,
): string {
  const map = direction === 'fnToEc'
    ? economicChapterDescriptionMaps[locale]
    : functionalChapterDescriptionMaps[locale]
  return map.get(code) ?? code
}

function formatPercentage(value: number, locale: ChallengeLocale) {
  const numberLocale = locale === 'ro' ? 'ro-RO' : 'en-GB'
  return `${new Intl.NumberFormat(numberLocale, {
    style: 'decimal',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)}%`
}

function BreakdownRow({
  entry,
  direction,
  locale,
}: {
  readonly entry: CrossBreakdownEntry
  readonly direction: 'fnToEc' | 'ecToFn'
  readonly locale: ChallengeLocale
}) {
  const label = resolveBreakdownLabel(entry.code, direction, locale)

  return (
    <div className="flex items-baseline gap-3 py-2 pl-4">
      <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-muted-foreground">
        {entry.code}
      </span>
      <span className="min-w-0 flex-1 text-sm text-foreground">
        {label}
      </span>
      <span className="shrink-0 text-right font-mono text-sm tabular-nums text-foreground">
        {formatCurrency(entry.amount, 'compact', 'RON')}
      </span>
      <span className="w-14 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
        {formatPercentage(entry.shareOfChapter, locale)}
      </span>
    </div>
  )
}

function ChapterGroup({
  chapter,
  direction,
  locale,
}: {
  readonly chapter: CrossChapterEntry
  readonly direction: 'fnToEc' | 'ecToFn'
  readonly locale: ChallengeLocale
}) {
  return (
    <div>
      {/* Chapter row */}
      <div className="flex items-baseline gap-3 py-2">
        <span className="shrink-0 rounded bg-foreground/10 px-1.5 py-0.5 font-mono text-xs font-bold tabular-nums">
          {chapter.code}
        </span>
        <span className="min-w-0 flex-1 text-sm font-semibold text-foreground">
          {chapter.label}
        </span>
        <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-foreground">
          {formatCurrency(chapter.totalAmount, 'compact', 'RON')}
        </span>
      </div>

      {/* Breakdown rows, indented */}
      <div className="border-l-2 border-border/50 ml-2">
        {chapter.breakdowns.map((entry) => (
          <BreakdownRow
            key={entry.code}
            entry={entry}
            direction={direction}
            locale={locale}
          />
        ))}
      </div>
    </div>
  )
}

function DirectionSection({
  sourceLabel,
  targetLabel,
  description,
  chapters,
  direction,
  locale,
}: {
  readonly sourceLabel: string
  readonly targetLabel: string
  readonly description: string
  readonly chapters: readonly CrossChapterEntry[]
  readonly direction: 'fnToEc' | 'ecToFn'
  readonly locale: ChallengeLocale
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <span>{sourceLabel}</span>
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
          <span>{targetLabel}</span>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>

      <div className="space-y-1">
        {chapters.map((chapter) => (
          <ChapterGroup
            key={chapter.code}
            chapter={chapter}
            direction={direction}
            locale={locale}
          />
        ))}
      </div>
    </div>
  )
}

export function LessonCrossClassification({
  entityCui,
  locale,
}: LessonCrossClassificationProps) {
  const copy = COPY[locale]
  const { aggregatedLineItemsQuery, aggregatedTotalSummaryQuery } =
    useChallengeLessonEntityBundle(entityCui)

  const lineItems = aggregatedLineItemsQuery.data?.nodes ?? []
  const totalIncome = aggregatedTotalSummaryQuery.data?.totalIncome ?? null
  const totalExpenses = aggregatedTotalSummaryQuery.data?.totalExpenses ?? null

  const financialData = useFinancialData(
    lineItems,
    totalIncome,
    totalExpenses,
    '',
    '',
    { computeEconomic: true, searchDebounceMs: 0 },
  )

  const crossData = useMemo(
    () =>
      buildCrossClassificationView({
        expenseGroups: financialData.filteredExpenseGroups,
        economicGroups: financialData.filteredEconomicGroups,
      }),
    [financialData.filteredExpenseGroups, financialData.filteredEconomicGroups],
  )

  const isLoading =
    aggregatedLineItemsQuery.isLoading || aggregatedTotalSummaryQuery.isLoading

  if (isLoading) {
    return (
      <div className="not-prose my-8 flex min-h-[120px] items-center justify-center rounded-[24px] border border-border/50 bg-muted/[0.08]">
        <LoadingSpinner text={copy.loading} />
      </div>
    )
  }

  const hasData = crossData.fnToEc.length > 0 || crossData.ecToFn.length > 0

  if (!hasData) {
    return (
      <div className="not-prose my-8 rounded-[24px] border border-dashed border-border/60 bg-muted/20 px-5 py-6 text-center">
        <p className="text-sm font-semibold text-foreground">{copy.unavailable}</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.unavailableDetail}</p>
      </div>
    )
  }

  return (
    <div className="not-prose my-8 space-y-6 rounded-[24px] border border-border/50 bg-background p-5">
      {crossData.fnToEc.length > 0 ? (
        <DirectionSection
          sourceLabel={copy.fnToEcLabel}
          targetLabel={copy.fnToEcTarget}
          description={copy.fnToEcDesc}
          chapters={crossData.fnToEc}
          direction="fnToEc"
          locale={locale}
        />
      ) : null}

      {crossData.fnToEc.length > 0 && crossData.ecToFn.length > 0 ? (
        <hr className="border-border/40" />
      ) : null}

      {crossData.ecToFn.length > 0 ? (
        <DirectionSection
          sourceLabel={copy.ecToFnLabel}
          targetLabel={copy.ecToFnTarget}
          description={copy.ecToFnDesc}
          chapters={crossData.ecToFn}
          direction="ecToFn"
          locale={locale}
        />
      ) : null}
    </div>
  )
}
