import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { GroupedItemsDisplay } from '@/components/entities/FinancialDataCard'
import type { GroupedChapter } from '@/schemas/financial'
import { buildTreemapDataV2, type AggregatedNode } from '@/components/budget-explorer/budget-transform'
import functionalClassificationsEn from '@/assets/functional-classifications-general-en.json'
import functionalClassificationsRo from '@/assets/functional-classifications-general-ro.json'
import economicClassificationsEn from '@/assets/economic-classifications-general-en.json'
import economicClassificationsRo from '@/assets/economic-classifications-general-ro.json'
import {
  getExpenseEconomicExplanation,
  localBudgetCodeAnchorGroups,
  type LocalBudgetCodeAnchorGroupKey,
  type LocalBudgetCodeAnchorSection,
  type LocalBudgetNationalDistributionRow,
} from '@/features/challenges/content/local-budget-code-anchors'
import {
  CHALLENGE_LESSON_DEFAULT_CURRENCY,
  CHALLENGE_LESSON_DEFAULT_NATIONAL_EXPENSE_EXCLUSIONS,
  CHALLENGE_LESSON_YEAR,
  useChallengeLessonEntityBundle,
  useChallengeLessonNationalAggregatedLineItems,
} from '@/features/challenges/hooks/use-challenge-lesson-entity-data'
import type { ChallengeLocale } from '@/features/challenges/types'
import { useFinancialData } from '@/hooks/useFinancialData'
import { getUserLocale } from '@/lib/utils'

type BudgetCodeAnchorsProps = {
  readonly group: LocalBudgetCodeAnchorGroupKey
  readonly entityCui?: string
  readonly stepId?: string
  readonly locale?: ChallengeLocale
  readonly section?: number
  readonly part?: 'national' | 'grouped'
}

type ResolvedDistributionRow = {
  readonly code: string
  readonly label: string
  readonly percentage: number
  readonly explanation: string
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

function resolveChapterLabel(
  grouping: 'functional' | 'economic',
  code: string,
  locale: 'ro' | 'en',
) {
  const descriptionMap = grouping === 'functional'
    ? functionalChapterDescriptionMaps[locale]
    : economicChapterDescriptionMaps[locale]

  return descriptionMap.get(code) ?? code
}

function formatPercentage(value: number, locale: 'ro' | 'en') {
  const numberLocale = locale === 'ro' ? 'ro-RO' : 'en-GB'

  return `${new Intl.NumberFormat(numberLocale, {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}%`
}

function DistributionState({
  label,
}: Readonly<{
  label: string
}>) {
  return (
    <div className="flex min-h-[120px] items-center justify-center rounded-[24px] border border-border/50 bg-muted/[0.08]">
      <LoadingSpinner text={label} />
    </div>
  )
}

function DistributionMessage({
  title,
  description,
}: Readonly<{
  title: string
  description: string
}>) {
  return (
    <div className="rounded-[24px] border border-dashed border-border/60 bg-muted/20 px-5 py-6 text-center">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  )
}

function DistributionTable({
  tableId,
  rows,
  locale,
  expanded,
  onToggleExpanded,
}: Readonly<{
  tableId: string
  rows: readonly ResolvedDistributionRow[]
  locale: 'ro' | 'en'
  expanded: boolean
  onToggleExpanded: () => void
}>) {
  const visibleRows = expanded ? rows : rows.slice(0, 5)
  const canExpand = rows.length > 5

  return (
    <div className="rounded-[24px] border border-border/50 bg-background p-3">
      <Table id={tableId}>
        <TableHeader>
          <TableRow>
            <TableHead>{locale === 'en' ? 'Code' : 'Cod'}</TableHead>
            <TableHead>{locale === 'en' ? 'Description' : 'Descriere'}</TableHead>
            <TableHead className="text-right">
              {locale === 'en' ? 'Share of total' : 'Pondere din total'}
            </TableHead>
            <TableHead>{locale === 'en' ? 'Short explanation' : 'Explicație scurtă'}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleRows.map((row) => (
            <TableRow key={row.code}>
              <TableCell className="font-mono text-xs font-semibold tabular-nums">{row.code}</TableCell>
              <TableCell className="font-medium">{row.label}</TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {formatPercentage(row.percentage, locale)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {row.explanation}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {canExpand ? (
        <div className="mt-4 flex justify-start">
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-controls={tableId}
            aria-expanded={expanded}
            onClick={onToggleExpanded}
          >
            {expanded
              ? (locale === 'en' ? 'Show Less' : 'Arată Mai Puțin')
              : (locale === 'en' ? 'Show More' : 'Vezi Mai Mult')}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function resolveStaticDistributionRows(
  rows: readonly LocalBudgetNationalDistributionRow[],
  grouping: 'functional' | 'economic',
  locale: 'ro' | 'en',
): ResolvedDistributionRow[] {
  return rows.map((row) => ({
    code: row.code,
    label: resolveChapterLabel(grouping, row.code, locale),
    percentage: row.percentage,
    explanation: row.explanation[locale],
  }))
}

function resolveLiveEconomicRows(
  nodes: AggregatedNode[],
  locale: 'ro' | 'en',
): ResolvedDistributionRow[] {
  const chapterRows = buildTreemapDataV2({
    data: nodes,
    primary: 'ec',
    path: [],
    rootDepth: 2,
    excludeEcCodes: [...CHALLENGE_LESSON_DEFAULT_NATIONAL_EXPENSE_EXCLUSIONS],
  })
  const total = chapterRows.reduce((sum, row) => sum + row.value, 0)

  return chapterRows.map((row) => ({
    code: row.code,
    label: resolveChapterLabel('economic', row.code, locale),
    percentage: total > 0 ? (row.value / total) * 100 : 0,
    explanation: getExpenseEconomicExplanation(
      row.code,
      locale,
      resolveChapterLabel('economic', row.code, locale),
    ),
  }))
}

function GroupedItemsState({
  section,
  locale,
  isLoading,
  groups,
  baseTotal,
  entityName,
}: Readonly<{
  section: LocalBudgetCodeAnchorSection
  locale: 'ro' | 'en'
  isLoading: boolean
  groups: GroupedChapter[]
  baseTotal: number
  entityName: string | null
}>) {
  if (isLoading) {
    return (
      <DistributionState
        label={locale === 'en' ? 'Loading live grouped items...' : 'Încărcăm gruparea live...'}
      />
    )
  }

  if (groups.length === 0) {
    return (
      <DistributionMessage
        title={locale === 'en' ? 'Live grouped items are not available yet.' : 'Gruparea live nu este disponibilă încă.'}
        description={
          locale === 'en'
            ? 'The national table remains visible, but the selected UAT does not currently have enough lesson data for this view.'
            : 'Tabelul național rămâne vizibil, dar UAT-ul selectat nu are încă suficiente date pentru această vedere.'
        }
      />
    )
  }

  return (
    <div>
      {entityName ? (
        <p className="mb-3 text-sm font-semibold text-muted-foreground">
          {entityName} ({CHALLENGE_LESSON_YEAR})
        </p>
      ) : null}
      <GroupedItemsDisplay
        groups={groups}
        title={section.groupedItemsTitle[locale]}
        baseTotal={baseTotal}
        searchTerm=""
        currentYear={CHALLENGE_LESSON_YEAR}
        normalization="total"
        currency={CHALLENGE_LESSON_DEFAULT_CURRENCY}
        subchapterCodePrefix={section.groupedItemsKind === 'expense-economic' ? 'ec' : 'fn'}
      />
    </div>
  )
}

export function BudgetCodeAnchors({
  group,
  entityCui,
  locale,
  section: sectionIndex,
  part,
}: BudgetCodeAnchorsProps) {
  const resolvedLocale = locale ?? getUserLocale()
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({})
  const anchorGroup = useMemo(
    () => localBudgetCodeAnchorGroups[group],
    [group],
  )

  const { aggregatedLineItemsQuery, aggregatedTotalSummaryQuery } =
    useChallengeLessonEntityBundle(entityCui ?? '')

  const shouldLoadNationalEconomic = anchorGroup.sections.some(
    (s) => s.nationalSource === 'live-all-uats',
  )

  const nationalEconomicQuery = useChallengeLessonNationalAggregatedLineItems({
    accountCategory: 'ch',
    excludeEconomicPrefixes: CHALLENGE_LESSON_DEFAULT_NATIONAL_EXPENSE_EXCLUSIONS,
    enabled: Boolean(entityCui) && shouldLoadNationalEconomic,
  })

  const entityName = aggregatedTotalSummaryQuery.data?.name ?? null
  const lineItems = aggregatedLineItemsQuery.data?.nodes ?? []
  const totalIncome = aggregatedTotalSummaryQuery.data?.totalIncome ?? null
  const totalExpenses = aggregatedTotalSummaryQuery.data?.totalExpenses ?? null

  const financialData = useFinancialData(
    lineItems,
    totalIncome,
    totalExpenses,
    '',
    '',
    {
      computeEconomic: true,
      searchDebounceMs: 0,
    },
  )

  const liveEconomicNationalRows = useMemo(
    () => resolveLiveEconomicRows(nationalEconomicQuery.data?.nodes ?? [], resolvedLocale),
    [nationalEconomicQuery.data?.nodes, resolvedLocale],
  )

  if (!entityCui || sectionIndex == null || !part) {
    return null
  }

  const section = anchorGroup.sections[sectionIndex]
  if (!section) return null

  const nationalRows = section.nationalSource === 'static'
    ? resolveStaticDistributionRows(section.nationalRows ?? [], section.grouping, resolvedLocale)
    : liveEconomicNationalRows

  if (part === 'national') {
    const isNationalLoading =
      section.nationalSource === 'live-all-uats'
        ? nationalEconomicQuery.isLoading
        : false

    const hasNationalError =
      section.nationalSource === 'live-all-uats'
        ? nationalEconomicQuery.isError
        : false

    const isExpanded = Boolean(expandedTables[section.id])
    const tableId = `budget-code-anchors-${section.id}`

    return (
      <div className="not-prose my-8">
        {isNationalLoading ? (
          <DistributionState
            label={resolvedLocale === 'en' ? 'Loading national distribution...' : 'Încărcăm distribuția națională...'}
          />
        ) : hasNationalError ? (
          <DistributionMessage
            title={resolvedLocale === 'en' ? 'National distribution could not be loaded.' : 'Distribuția națională nu a putut fi încărcată.'}
            description={
              resolvedLocale === 'en'
                ? 'The live UAT grouping can still appear below when the selected entity data is available.'
                : 'Gruparea live a UAT-ului poate apărea totuși mai jos, dacă datele entității selectate sunt disponibile.'
            }
          />
        ) : nationalRows.length === 0 ? (
          <DistributionMessage
            title={resolvedLocale === 'en' ? 'No national rows are available.' : 'Nu există încă rânduri naționale disponibile.'}
            description={
              resolvedLocale === 'en'
                ? 'Try again later or switch to another lesson section.'
                : 'Încearcă din nou mai târziu sau treci la o altă secțiune a lecției.'
            }
          />
        ) : (
          <DistributionTable
            tableId={tableId}
            rows={nationalRows}
            locale={resolvedLocale}
            expanded={isExpanded}
            onToggleExpanded={() => {
              setExpandedTables((previousState) => ({
                ...previousState,
                [section.id]: !previousState[section.id],
              }))
            }}
          />
        )}
      </div>
    )
  }

  // part === 'grouped'
  const groupedItems = section.groupedItemsKind === 'income'
    ? financialData.filteredIncomeGroups
    : section.groupedItemsKind === 'expense-economic'
      ? financialData.filteredEconomicGroups
      : financialData.filteredExpenseGroups

  const groupedItemsBaseTotal = section.groupedItemsKind === 'income'
    ? financialData.incomeBase
    : financialData.expenseBase

  return (
    <div className="not-prose my-8">
      <GroupedItemsState
        section={section}
        locale={resolvedLocale}
        isLoading={
          aggregatedLineItemsQuery.isLoading ||
          aggregatedTotalSummaryQuery.isLoading
        }
        groups={groupedItems}
        baseTotal={groupedItemsBaseTotal}
        entityName={entityName}
      />
    </div>
  )
}
