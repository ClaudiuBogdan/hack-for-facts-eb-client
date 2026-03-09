import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import {
  GroupedItemsDisplay,
  type GroupedItemAnalyticsRequest,
  type GroupedItemCopyPromptRequest,
} from '@/components/entities/FinancialDataCard'
import GroupedFunctionalAccordion from '@/components/entities/GroupedFunctionalAccordion'
import GroupedSubchapterAccordion from '@/components/entities/GroupedSubchapterAccordion'
import { match } from '@/components/entities/highlight-utils'
import { SearchToggleInput } from '@/components/entities/SearchToggleInput'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useFinancialData } from '@/hooks/useFinancialData'
import { getClassificationName } from '@/lib/classifications'
import {
  getEconomicClassificationName,
  getEconomicSubchapterName,
} from '@/lib/economic-classifications'
import type { ExecutionLineItem } from '@/lib/api/entities'
import type { NormalizationOptions } from '@/lib/normalization'
import type {
  GroupedEconomic,
  GroupedFunctional,
  GroupedSubchapter,
} from '@/schemas/financial'
import { formatNormalizedValue, formatNumber } from '@/lib/utils'
import type { ChallengeEntityAnalysisTreemapDepth } from '@/features/challenges/schemas/challenge-entity-analysis-route-search-schema'
import {
  buildChallengeEntityAnalysisMarkdown,
  buildChallengeEntityItemMarkdown,
  getChallengeEntityMarkdownCopy,
  type ChallengeEntityMarkdownExportContext,
  type ChallengeEntityMarkdownExportPageContext,
} from './challenge-entity-markdown-export'
import { Info } from 'lucide-react'
import { toast } from 'sonner'

type ChallengeGroupedLineItemsProps = {
  readonly accountTitle: string
  readonly lineItems: readonly ExecutionLineItem[]
  readonly accountCategory: 'ch' | 'vn'
  readonly groupBy: 'fn' | 'ec'
  readonly depth: ChallengeEntityAnalysisTreemapDepth
  readonly currentYear: number
  readonly normalizationOptions: Pick<
    NormalizationOptions,
    'normalization' | 'currency'
  >
  readonly presetSearchTerm?: string
  readonly onAnalyticsRequest?: (request: GroupedItemAnalyticsRequest) => void
  readonly onCopyPromptRequest?: (request: GroupedItemCopyPromptRequest) => void
  readonly exportContext: ChallengeEntityMarkdownExportPageContext
}

type FunctionalAccumulator = {
  name: string
  totalAmount: number
  economics: Map<string, GroupedEconomic>
}

type SubchapterAccumulator = {
  name: string
  totalAmount: number
  functionals: Map<string, FunctionalAccumulator>
}

type GroupedLeafDisplayProps = {
  readonly title: string
  readonly currentYear: number
  readonly baseTotal: number
  readonly searchTerm: string
  readonly showTotalValueHeader: boolean
  readonly normalizationOptions: Pick<
    NormalizationOptions,
    'normalization' | 'currency'
  >
  readonly onAnalyticsRequest?: (request: GroupedItemAnalyticsRequest) => void
  readonly onCopyPromptRequest?: (request: GroupedItemCopyPromptRequest) => void
} & (
  | {
      readonly itemType: 'functional'
      readonly items: readonly GroupedFunctional[]
    }
  | {
      readonly itemType: 'subchapter'
      readonly items: readonly GroupedSubchapter[]
      readonly codePrefix: 'fn' | 'ec'
    }
)

function normalizeCode(code: string | null | undefined) {
  return (code ?? '').replace(/[^0-9.]/g, '').trim()
}

function getCodeAtDepth(
  code: string,
  depth: Exclude<ChallengeEntityAnalysisTreemapDepth, 'chapter'>,
) {
  const normalizedCode = normalizeCode(code)

  if (!normalizedCode) {
    return ''
  }

  const segments = normalizedCode.split('.').filter(Boolean)

  if (depth === 'subchapter') {
    return segments.slice(0, Math.min(2, segments.length)).join('.')
  }

  return segments.slice(0, Math.min(3, segments.length)).join('.')
}

function getFunctionalLabel(code: string, fallbackName?: string | null) {
  return getClassificationName(code) || fallbackName?.trim() || code
}

function getFunctionalLeafLabel(code: string, fallbackName?: string | null) {
  return fallbackName?.trim() || getClassificationName(code) || code
}

function getEconomicLabel(code: string, fallbackName?: string | null) {
  return (
    getEconomicClassificationName(code) ||
    getEconomicSubchapterName(code) ||
    fallbackName?.trim() ||
    code
  )
}

function getEconomicLeafLabel(code: string, fallbackName?: string | null) {
  return (
    fallbackName?.trim() ||
    getEconomicClassificationName(code) ||
    getEconomicSubchapterName(code) ||
    code
  )
}

function ensureFunctionalAccumulator(
  functionals: Map<string, FunctionalAccumulator>,
  code: string,
  name: string,
) {
  const existingFunctional = functionals.get(code)

  if (existingFunctional) {
    return existingFunctional
  }

  const nextFunctional: FunctionalAccumulator = {
    name,
    totalAmount: 0,
    economics: new Map<string, GroupedEconomic>(),
  }

  functionals.set(code, nextFunctional)

  return nextFunctional
}

function ensureSubchapterAccumulator(
  subchapters: Map<string, SubchapterAccumulator>,
  code: string,
  name: string,
) {
  const existingSubchapter = subchapters.get(code)

  if (existingSubchapter) {
    return existingSubchapter
  }

  const nextSubchapter: SubchapterAccumulator = {
    name,
    totalAmount: 0,
    functionals: new Map<string, FunctionalAccumulator>(),
  }

  subchapters.set(code, nextSubchapter)

  return nextSubchapter
}

function pushEconomicAmount(
  economics: Map<string, GroupedEconomic>,
  code: string,
  fallbackName: string | null | undefined,
  amount: number,
) {
  const existingEconomic = economics.get(code)

  if (existingEconomic) {
    existingEconomic.amount += amount
    return
  }

  economics.set(code, {
    code,
    name: getEconomicLeafLabel(code, fallbackName),
    amount,
  })
}

function toSortedEconomics(economics: Map<string, GroupedEconomic>) {
  return [...economics.values()].sort((left, right) => right.amount - left.amount)
}

function toSortedFunctionals(functionals: Map<string, FunctionalAccumulator>) {
  return [...functionals.entries()]
    .map(([code, functional]) => ({
      code,
      name: functional.name,
      totalAmount: functional.totalAmount,
      economics: toSortedEconomics(functional.economics),
    }))
    .sort((left, right) => right.totalAmount - left.totalAmount)
}

function toSortedSubchapters(subchapters: Map<string, SubchapterAccumulator>) {
  return [...subchapters.entries()]
    .map(([code, subchapter]) => ({
      code,
      name: subchapter.name,
      totalAmount: subchapter.totalAmount,
      functionals: toSortedFunctionals(subchapter.functionals),
    }))
    .sort((left, right) => right.totalAmount - left.totalAmount)
}

function buildFunctionalSubchapterGroups(
  lineItems: readonly ExecutionLineItem[],
): GroupedSubchapter[] {
  const subchapters = new Map<string, SubchapterAccumulator>()

  lineItems.forEach((lineItem) => {
    const functionalCode = normalizeCode(
      lineItem.functionalClassification?.functional_code,
    )

    if (!functionalCode) {
      return
    }

    const subchapterCode = getCodeAtDepth(functionalCode, 'subchapter')
    const paragraphCode = getCodeAtDepth(functionalCode, 'paragraph')
    const amount = Number(lineItem.amount ?? 0)
    const subchapter = ensureSubchapterAccumulator(
      subchapters,
      subchapterCode,
      getFunctionalLabel(
        subchapterCode,
        lineItem.functionalClassification?.functional_name,
      ),
    )
    const functional = ensureFunctionalAccumulator(
      subchapter.functionals,
      paragraphCode,
      getFunctionalLeafLabel(
        paragraphCode,
        lineItem.functionalClassification?.functional_name,
      ),
    )

    functional.totalAmount += amount
    subchapter.totalAmount += amount

    const economicCode = normalizeCode(
      lineItem.economicClassification?.economic_code,
    )

    if (!economicCode) {
      return
    }

    pushEconomicAmount(
      functional.economics,
      economicCode,
      lineItem.economicClassification?.economic_name,
      amount,
    )
  })

  return toSortedSubchapters(subchapters)
}

function buildFunctionalParagraphGroups(
  lineItems: readonly ExecutionLineItem[],
): GroupedFunctional[] {
  const functionals = new Map<string, FunctionalAccumulator>()

  lineItems.forEach((lineItem) => {
    const functionalCode = normalizeCode(
      lineItem.functionalClassification?.functional_code,
    )

    if (!functionalCode) {
      return
    }

    const paragraphCode = getCodeAtDepth(functionalCode, 'paragraph')
    const amount = Number(lineItem.amount ?? 0)
    const functional = ensureFunctionalAccumulator(
      functionals,
      paragraphCode,
      getFunctionalLeafLabel(
        paragraphCode,
        lineItem.functionalClassification?.functional_name,
      ),
    )

    functional.totalAmount += amount

    const economicCode = normalizeCode(
      lineItem.economicClassification?.economic_code,
    )

    if (!economicCode) {
      return
    }

    pushEconomicAmount(
      functional.economics,
      economicCode,
      lineItem.economicClassification?.economic_name,
      amount,
    )
  })

  return toSortedFunctionals(functionals)
}

function buildEconomicGroupsAtDepth(
  lineItems: readonly ExecutionLineItem[],
  depth: 'subchapter' | 'paragraph',
): GroupedSubchapter[] {
  const groups = new Map<string, SubchapterAccumulator>()

  lineItems.forEach((lineItem) => {
    const economicCode = normalizeCode(
      lineItem.economicClassification?.economic_code,
    )

    if (!economicCode) {
      return
    }

    const groupCode = getCodeAtDepth(economicCode, depth)
    const amount = Number(lineItem.amount ?? 0)
    const group = ensureSubchapterAccumulator(
      groups,
      groupCode,
      depth === 'paragraph'
        ? getEconomicLeafLabel(
            groupCode,
            lineItem.economicClassification?.economic_name,
          )
        : getEconomicLabel(groupCode, lineItem.economicClassification?.economic_name),
    )
    group.totalAmount += amount

    const functionalCode = normalizeCode(
      lineItem.functionalClassification?.functional_code,
    )

    if (!functionalCode) {
      return
    }

    const paragraphCode = getCodeAtDepth(functionalCode, 'paragraph')
    const functional = ensureFunctionalAccumulator(
      group.functionals,
      paragraphCode,
      getFunctionalLeafLabel(
        paragraphCode,
        lineItem.functionalClassification?.functional_name,
      ),
    )

    functional.totalAmount += amount
  })

  return toSortedSubchapters(groups)
}

function filterFunctionalGroups(
  groups: readonly GroupedFunctional[],
  searchTerm: string,
) {
  const trimmedSearchTerm = searchTerm.trim()

  if (!trimmedSearchTerm) {
    return [...groups]
  }

  return groups
    .flatMap((functional) => {
      const functionalText = `${functional.name} fn:${functional.code}`

      if (match(functionalText, trimmedSearchTerm).length > 0) {
        return [functional]
      }

      const matchedEconomics = functional.economics.filter((economic) =>
        match(`${economic.name} ec:${economic.code}`, trimmedSearchTerm).length > 0,
      )

      if (matchedEconomics.length === 0) {
        return []
      }

      return [
        {
          ...functional,
          economics: matchedEconomics,
          totalAmount: matchedEconomics.reduce(
            (sum, economic) => sum + economic.amount,
            0,
          ),
        },
      ]
    })
    .sort((left, right) => right.totalAmount - left.totalAmount)
}

function filterSubchapterGroups(
  groups: readonly GroupedSubchapter[],
  searchTerm: string,
  codePrefix: 'fn' | 'ec',
) {
  const trimmedSearchTerm = searchTerm.trim()

  if (!trimmedSearchTerm) {
    return [...groups]
  }

  return groups
    .flatMap((subchapter) => {
      const subchapterText = `${subchapter.name} ${codePrefix}:${subchapter.code}`

      if (match(subchapterText, trimmedSearchTerm).length > 0) {
        return [subchapter]
      }

      const matchedFunctionals = subchapter.functionals.flatMap((functional) => {
        const functionalText = `${functional.name} fn:${functional.code}`

        if (match(functionalText, trimmedSearchTerm).length > 0) {
          return [functional]
        }

        return []
      })

      if (matchedFunctionals.length === 0) {
        return []
      }

      const nextFunctionals = [...matchedFunctionals].sort(
        (left, right) => right.totalAmount - left.totalAmount,
      )

      return [
        {
          ...subchapter,
          functionals: nextFunctionals,
          totalAmount: nextFunctionals.reduce(
            (sum, functional) => sum + functional.totalAmount,
            0,
          ),
        },
      ]
    })
    .sort((left, right) => right.totalAmount - left.totalAmount)
}

function GroupedLeafDisplay({
  title,
  currentYear,
  baseTotal,
  searchTerm,
  showTotalValueHeader,
  normalizationOptions,
  onAnalyticsRequest,
  onCopyPromptRequest,
  ...displayProps
}: GroupedLeafDisplayProps) {
  const normalizationFormatOptions = {
    normalization: normalizationOptions.normalization,
    currency: normalizationOptions.currency,
  } as const
  const totalValueFiltered = displayProps.items.reduce(
    (sum, item) => sum + item.totalAmount,
    0,
  )
  const totalPercentageFiltered =
    baseTotal > 0 ? (totalValueFiltered / baseTotal) * 100 : 0

  const TotalValueComponent = () => (
    <div className="flex flex-col">
      <p className="m-4 mb-0 flex items-center justify-end font-semibold">
        Total:{' '}
        {formatNormalizedValue(
          totalValueFiltered,
          normalizationFormatOptions,
          'standard',
        )}
        {totalPercentageFiltered > 0 && totalPercentageFiltered <= 99.99 ? (
          <span className="pl-2 text-sm text-muted-foreground">
            ({formatNumber(totalPercentageFiltered)}%)
          </span>
        ) : null}
      </p>
      <p className="m-4 mt-0 text-right text-sm text-muted-foreground">
        {formatNormalizedValue(
          totalValueFiltered,
          normalizationFormatOptions,
          'compact',
        )}
      </p>
    </div>
  )

  if (displayProps.items.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-4">
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          {searchTerm
            ? `No results for "${searchTerm}"`
            : `No data available for ${title} in ${currentYear}.`}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {showTotalValueHeader ? <TotalValueComponent /> : null}
      {displayProps.itemType === 'functional'
        ? displayProps.items.map((functional) => (
            <GroupedFunctionalAccordion
              key={functional.code}
              func={functional}
              baseTotal={baseTotal}
              searchTerm={searchTerm}
              normalization={normalizationOptions.normalization}
              currency={normalizationOptions.currency}
              onAnalyticsRequest={onAnalyticsRequest}
              onCopyPromptRequest={onCopyPromptRequest}
            />
          ))
        : displayProps.items.map((subchapter) => (
            <GroupedSubchapterAccordion
              key={subchapter.code}
              sub={subchapter}
              baseTotal={baseTotal}
              searchTerm={searchTerm}
              normalization={normalizationOptions.normalization}
              currency={normalizationOptions.currency}
              codePrefix={displayProps.codePrefix}
              analyticsPathOrder={
                displayProps.codePrefix === 'ec'
                  ? ['ec', 'fn']
                  : ['fn', 'ec']
              }
              onAnalyticsRequest={onAnalyticsRequest}
              onCopyPromptRequest={onCopyPromptRequest}
            />
          ))}
      <TotalValueComponent />
    </div>
  )
}

export function ChallengeEntityGroupedLineItems({
  accountTitle,
  lineItems,
  accountCategory,
  groupBy,
  depth,
  currentYear,
  normalizationOptions,
  presetSearchTerm,
  onAnalyticsRequest,
  onCopyPromptRequest,
  exportContext,
}: ChallengeGroupedLineItemsProps) {
  const markdownCopy = useMemo(
    () => getChallengeEntityMarkdownCopy(exportContext.locale),
    [exportContext.locale],
  )
  const normalizedLineItems = useMemo(() => [...lineItems], [lineItems])
  const totalAmount = useMemo(
    () =>
      normalizedLineItems.reduce(
        (sum, lineItem) => sum + Number(lineItem.amount ?? 0),
        0,
      ),
    [normalizedLineItems],
  )
  const [expenseSearchTerm, setExpenseSearchTerm] = useState(
    () => presetSearchTerm ?? '',
  )
  const [expenseSearchActive, setExpenseSearchActive] = useState(
    () => Boolean(presetSearchTerm),
  )
  const [incomeSearchTerm, setIncomeSearchTerm] = useState('')
  const [incomeSearchActive, setIncomeSearchActive] = useState(false)
  const previousPresetSearchTermRef = useRef<string | undefined>(
    presetSearchTerm,
  )
  const deferredExpenseSearchTerm = useDeferredValue(expenseSearchTerm)
  const deferredIncomeSearchTerm = useDeferredValue(incomeSearchTerm)

  const {
    filteredExpenseGroups,
    expenseBase,
    filteredIncomeGroups,
    incomeBase,
    filteredEconomicGroups,
  } = useFinancialData(
    normalizedLineItems,
    accountCategory === 'vn' ? totalAmount : null,
    accountCategory === 'ch' ? totalAmount : null,
    deferredExpenseSearchTerm,
    deferredIncomeSearchTerm,
    {
      computeEconomic: groupBy === 'ec',
      searchDebounceMs: 0,
    },
  )

  useEffect(() => {
    if (previousPresetSearchTermRef.current === presetSearchTerm) {
      return
    }

    previousPresetSearchTermRef.current = presetSearchTerm

    const nextExpenseSearchTerm = presetSearchTerm ?? ''
    const shouldActivateExpenseSearch = nextExpenseSearchTerm.length > 0

    setExpenseSearchTerm(nextExpenseSearchTerm)
    setExpenseSearchActive(shouldActivateExpenseSearch)
  }, [presetSearchTerm])

  const chapterGroupsToDisplay =
    groupBy === 'ec'
      ? filteredEconomicGroups
      : accountCategory === 'vn'
        ? filteredIncomeGroups
        : filteredExpenseGroups
  const baseTotalToDisplay =
    accountCategory === 'vn' ? incomeBase : expenseBase
  const currentSearchInputTerm =
    accountCategory === 'vn' ? incomeSearchTerm : expenseSearchTerm
  const currentSearchFilterTerm =
    groupBy === 'ec'
      ? deferredExpenseSearchTerm
      : accountCategory === 'vn'
        ? deferredIncomeSearchTerm
        : deferredExpenseSearchTerm
  const currentSearchActive =
    groupBy === 'ec'
      ? expenseSearchActive
      : accountCategory === 'vn'
        ? incomeSearchActive
        : expenseSearchActive

  const subchapterGroupsToDisplay = useMemo(() => {
    if (depth === 'chapter') {
      return []
    }

    if (groupBy === 'fn') {
      return filterSubchapterGroups(
        buildFunctionalSubchapterGroups(normalizedLineItems),
        currentSearchFilterTerm,
        'fn',
      )
    }

    return filterSubchapterGroups(
      buildEconomicGroupsAtDepth(normalizedLineItems, depth),
      currentSearchFilterTerm,
      'ec',
    )
  }, [currentSearchFilterTerm, depth, groupBy, normalizedLineItems])

  const paragraphGroupsToDisplay = useMemo(() => {
    if (depth !== 'paragraph' || groupBy !== 'fn') {
      return []
    }

    return filterFunctionalGroups(
      buildFunctionalParagraphGroups(normalizedLineItems),
      currentSearchFilterTerm,
    )
  }, [currentSearchFilterTerm, depth, groupBy, normalizedLineItems])

  const handleSearchChange = (value: string) => {
    if (accountCategory === 'vn') {
      setIncomeSearchTerm(value)
      return
    }

    setExpenseSearchTerm(value)
  }

  const handleSearchToggle = (isActive: boolean) => {
    if (accountCategory === 'vn') {
      setIncomeSearchActive(isActive)
      return
    }

    setExpenseSearchActive(isActive)
  }

  const searchFocusKey = accountCategory === 'vn' ? 'mod+l' : 'mod+j'
  const visibleItemsForExport = useMemo<
    ChallengeEntityMarkdownExportContext['grouped']['visibleItems']
  >(() => {
    if (depth === 'chapter') {
      return {
        kind: 'chapter',
        groups: chapterGroupsToDisplay,
      }
    }

    if (depth === 'paragraph' && groupBy === 'fn') {
      return {
        kind: 'functional',
        groups: paragraphGroupsToDisplay,
      }
    }

    return {
      kind: 'subchapter',
      groups: subchapterGroupsToDisplay,
      codePrefix: groupBy,
    }
  }, [
    chapterGroupsToDisplay,
    depth,
    groupBy,
    paragraphGroupsToDisplay,
    subchapterGroupsToDisplay,
  ])
  const markdownPrompt = useMemo(
    () =>
      buildChallengeEntityAnalysisMarkdown({
        ...exportContext,
        grouped: {
          title: accountTitle,
          groupBy,
          depth,
          baseTotal: baseTotalToDisplay,
          visibleItems: visibleItemsForExport,
        },
        filters: {
          ...exportContext.filters,
          ...(currentSearchFilterTerm
            ? { groupedSearchTerm: currentSearchFilterTerm }
            : {}),
        },
      }),
    [
      accountTitle,
      baseTotalToDisplay,
      currentSearchFilterTerm,
      depth,
      exportContext,
      groupBy,
      visibleItemsForExport,
    ],
  )

  const handleCopyMarkdown = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(markdownPrompt)
      toast.success(markdownCopy.copiedToastLabel)
    } catch (error) {
      console.error('Failed to copy markdown prompt', error)
      toast.error(markdownCopy.copyFailedToastLabel)
    }
  }, [markdownCopy.copiedToastLabel, markdownCopy.copyFailedToastLabel, markdownPrompt])

  const handleSectionAnalytics = useCallback(() => {
    onAnalyticsRequest?.({
      subjectLabel: accountTitle,
      path: [],
    })
  }, [accountTitle, onAnalyticsRequest])

  const handleCopyItemPrompt = useCallback(
    async (request: GroupedItemCopyPromptRequest) => {
      const itemPrompt = buildChallengeEntityItemMarkdown({
        pageContext: {
          ...exportContext,
          filters: {
            ...exportContext.filters,
            groupedSearchTerm: undefined,
          },
        },
        groupedContext: {
          title: accountTitle,
          groupBy,
          depth,
          baseTotal: baseTotalToDisplay,
        },
        request,
        lineItems: normalizedLineItems,
      })

      try {
        await navigator.clipboard.writeText(itemPrompt)
        toast.success(markdownCopy.copiedToastLabel)
        onCopyPromptRequest?.(request)
      } catch (error) {
        console.error('Failed to copy item markdown prompt', error)
        toast.error(markdownCopy.copyFailedToastLabel)
      }
    },
    [
      accountTitle,
      baseTotalToDisplay,
      depth,
      exportContext,
      groupBy,
      markdownCopy.copiedToastLabel,
      markdownCopy.copyFailedToastLabel,
      normalizedLineItems,
      onCopyPromptRequest,
    ],
  )

  return (
    <section
      className="space-y-4 border-t border-border/50 pt-4"
      data-testid="challenge-grouped-line-items"
    >
      <div
        className="group/challenge-grouped-header flex items-center justify-between gap-3"
        data-testid="challenge-grouped-line-items-header"
      >
        <div className="flex min-w-0 items-center gap-2 pr-2">
          <h4 className="text-xl font-black tracking-tight">{accountTitle}</h4>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-full text-muted-foreground opacity-100 transition-opacity hover:text-foreground md:opacity-0 md:group-hover/challenge-grouped-header:opacity-100 md:group-focus-within/challenge-grouped-header:opacity-100"
                aria-label={markdownCopy.sectionMenuLabel}
                title={markdownCopy.sectionMenuLabel}
                data-testid="challenge-grouped-line-items-menu-trigger"
              >
                <Info className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {onAnalyticsRequest ? (
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault()
                    handleSectionAnalytics()
                  }}
                >
                  {markdownCopy.analyticsMenuLabel}
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault()
                  void handleCopyMarkdown()
                }}
              >
                {markdownCopy.copyPromptMenuLabel}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="ml-auto flex-shrink-0">
          <SearchToggleInput
            active={currentSearchActive}
            initialSearchTerm={currentSearchInputTerm}
            onToggle={handleSearchToggle}
            onChange={handleSearchChange}
            focusKey={searchFocusKey}
            debounceMs={0}
          />
        </div>
      </div>

      {depth === 'chapter' ? (
        <GroupedItemsDisplay
          groups={chapterGroupsToDisplay}
          title={accountTitle}
          baseTotal={baseTotalToDisplay}
          searchTerm={currentSearchFilterTerm}
          currentYear={currentYear}
          showTotalValueHeader={currentSearchActive}
          normalization={normalizationOptions.normalization}
          currency={normalizationOptions.currency}
          subchapterCodePrefix={groupBy}
          onAnalyticsRequest={onAnalyticsRequest}
          onCopyPromptRequest={handleCopyItemPrompt}
        />
      ) : depth === 'paragraph' && groupBy === 'fn' ? (
        <GroupedLeafDisplay
          itemType="functional"
          items={paragraphGroupsToDisplay}
          title={accountTitle}
          currentYear={currentYear}
          baseTotal={baseTotalToDisplay}
          searchTerm={currentSearchFilterTerm}
          showTotalValueHeader={currentSearchActive}
          normalizationOptions={normalizationOptions}
          onAnalyticsRequest={onAnalyticsRequest}
          onCopyPromptRequest={handleCopyItemPrompt}
        />
      ) : (
        <GroupedLeafDisplay
          itemType="subchapter"
          items={subchapterGroupsToDisplay}
          codePrefix={groupBy}
          title={accountTitle}
          currentYear={currentYear}
          baseTotal={baseTotalToDisplay}
          searchTerm={currentSearchFilterTerm}
          showTotalValueHeader={currentSearchActive}
          normalizationOptions={normalizationOptions}
          onAnalyticsRequest={onAnalyticsRequest}
          onCopyPromptRequest={handleCopyItemPrompt}
        />
      )}
    </section>
  )
}
