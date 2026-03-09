import type { TreemapInput } from '@/components/budget-explorer/budget-transform'
import type { Breadcrumb } from '@/components/budget-explorer/useTreemapDrilldown'
import type { ExecutionLineItem } from '@/lib/api/entities'
import { getClassificationName } from '@/lib/classifications'
import {
  getEconomicClassificationName,
  getEconomicSubchapterName,
} from '@/lib/economic-classifications'
import type { Currency } from '@/schemas/charts'
import type {
  GroupedChapter,
  GroupedEconomic,
  GroupedFunctional,
  GroupedSubchapter,
} from '@/schemas/financial'
import type {
  ChallengeEntityAnalysisExpenseType,
  ChallengeEntityAnalysisTreemapDepth,
} from '@/features/challenges/schemas/challenge-entity-analysis-route-search-schema'
import {
  normalizeBudgetItemAnalyticsCode,
  normalizeBudgetItemAnalyticsPath,
  type BudgetItemAnalyticsPathEntry,
  type BudgetItemAnalyticsRequest,
} from './budget-item-analytics-target'

export type ChallengeEntityMarkdownExportLocale = 'ro' | 'en'

type ChallengeEntityMarkdownReportType = 'PRINCIPAL_AGGREGATED' | 'DETAILED'
type ChallengeEntityMarkdownNormalization = 'total' | 'per_capita'
type ChallengeEntityMarkdownAccountCategory = 'ch' | 'vn'
type ChallengeEntityMarkdownPrimary = 'fn' | 'ec'

type VisibleGroupedItems =
  | {
      kind: 'chapter'
      groups: readonly GroupedChapter[]
    }
  | {
      kind: 'subchapter'
      groups: readonly GroupedSubchapter[]
      codePrefix: ChallengeEntityMarkdownPrimary
    }
  | {
      kind: 'functional'
      groups: readonly GroupedFunctional[]
    }

export type ChallengeEntityMarkdownExportContext = Readonly<{
  locale: ChallengeEntityMarkdownExportLocale
  entity: Readonly<{
    name: string
    cui: string
    countyName?: string | null
    population?: number | null
  }>
  filters: Readonly<{
    year: number
    reportType: ChallengeEntityMarkdownReportType
    normalization: ChallengeEntityMarkdownNormalization
    currency: Currency
    inflationAdjusted: boolean
    treemapAccountCategory: ChallengeEntityMarkdownAccountCategory
    budgetTotal: number
    expenseType?: ChallengeEntityAnalysisExpenseType
    treemapPrimary: ChallengeEntityMarkdownPrimary
    currentTreemapPrimary: ChallengeEntityMarkdownPrimary
    treemapDepth: ChallengeEntityAnalysisTreemapDepth
    breadcrumbs: readonly Breadcrumb[]
    groupedSearchTerm?: string
    excludedEconomicCodes?: readonly string[]
    excludedFunctionalCodes?: readonly string[]
    amountRange?: Readonly<{
      minValue: number
      maxValue: number
      selectedMin: number
      selectedMax: number
    }>
  }>
  treemap: Readonly<{
    title: string
    subtitle?: string
    visibleNodes: readonly TreemapInput[]
    unavailableReason?: string
  }>
  grouped: Readonly<{
    title: string
    groupBy: ChallengeEntityMarkdownPrimary
    depth: ChallengeEntityAnalysisTreemapDepth
    baseTotal: number
    visibleItems: VisibleGroupedItems
  }>
}>

export type ChallengeEntityMarkdownExportPageContext = Omit<
  ChallengeEntityMarkdownExportContext,
  'grouped'
>

export type ChallengeEntityMarkdownGroupedSectionContext = Readonly<{
  title: string
  groupBy: ChallengeEntityMarkdownPrimary
  depth: ChallengeEntityAnalysisTreemapDepth
  baseTotal: number
}>

type ChallengeEntityMarkdownItemRequest = BudgetItemAnalyticsRequest & Readonly<{
  displayedItem?: BudgetItemAnalyticsPathEntry
}>

type ExportCopy = {
  markdownTitle: string
  intro: string
  entitySectionTitle: string
  filtersSectionTitle: string
  treemapSectionTitle: string
  groupedSectionTitle: string
  systemRoleSectionTitle: string
  systemRoleContent: string
  promptSectionTitle: string
  entityLabel: string
  cuiLabel: string
  countyLabel: string
  populationLabel: string
  yearLabel: string
  reportTypeLabel: string
  normalizationLabel: string
  currencyLabel: string
  inflationAdjustedLabel: string
  accountCategoryLabel: string
  budgetTotalLabel: string
  primaryGroupingLabel: string
  currentTreemapGroupingLabel: string
  detailLevelLabel: string
  expenseTypeLabel: string
  selectedPathLabel: string
  amountFilterLabel: string
  groupedSearchLabel: string
  excludedEconomicLabel: string
  excludedFunctionalLabel: string
  treemapTitleLabel: string
  treemapSubtitleLabel: string
  currentTreemapTotalLabel: string
  groupedBaseTotalLabel: string
  groupedVisibleTotalLabel: string
  groupedModeLabel: string
  groupedTitleLabel: string
  unavailableTreemapLabel: string
  rootLabel: string
  noneLabel: string
  yesLabel: string
  noLabel: string
  inhabitantsSuffix: string
  revenueLabel: string
  spendingLabel: string
  totalLabel: string
  perCapitaLabel: string
  reportAggregatedLabel: string
  reportDetailedLabel: string
  functionalGroupingLabel: string
  economicGroupingLabel: string
  chapterLabel: string
  subchapterLabel: string
  paragraphLabel: string
  allExpensesLabel: string
  operationsExpensesLabel: string
  developmentExpensesLabel: string
  promptInstructions: readonly string[]
  promptPlaceholderLabel: string
  selectedItemSectionTitle: string
  selectedItemLabel: string
  selectedItemPathLabel: string
  selectedItemAmountLabel: string
  detailedDescendantsSectionTitle: string
  copyPromptMenuLabel: string
  analyticsMenuLabel: string
  sectionMenuLabel: string
  copyButtonLabel: string
  copiedToastLabel: string
  copyFailedToastLabel: string
}

const EXPORT_COPY = {
  ro: {
    markdownTitle: 'Analiza bugetului local',
    intro:
      'Folosește exclusiv contextul de mai jos, extras din vizualizarea curentă Transparenta.eu. Bazează răspunsul doar pe aceste date, evidențiază cele mai importante categorii și spune explicit ce informații lipsesc dacă nu poți trage o concluzie solidă.',
    entitySectionTitle: 'Context UAT',
    filtersSectionTitle: 'Filtre și context activ',
    treemapSectionTitle: 'Categorii vizibile în distribuție',
    groupedSectionTitle: 'Elemente grupate vizibile',
    systemRoleSectionTitle: 'Rol de sistem',
    systemRoleContent:
      'Ești un analist senior de finanțe publice locale și un redactor de date riguros. Folosește exclusiv contextul furnizat mai jos. Nu inventa fapte, nu presupune informații care lipsesc și diferențiază clar între observații directe, inferențe rezonabile și necunoscute. Citează concret sumele, ponderile, filtrele active, tipul de raport și calea selectată atunci când formulezi concluzii. Explică pe înțelesul publicului denumirile și codurile bugetare. Dacă datele nu susțin o concluzie fermă, spune asta explicit și indică exact ce verificări suplimentare ar fi utile.',
    promptSectionTitle: 'Instrucțiuni pentru model',
    entityLabel: 'Entitate',
    cuiLabel: 'CUI',
    countyLabel: 'Județ',
    populationLabel: 'Populație',
    yearLabel: 'An',
    reportTypeLabel: 'Tip raport',
    normalizationLabel: 'Normalizare',
    currencyLabel: 'Monedă',
    inflationAdjustedLabel: 'Ajustare cu inflația',
    accountCategoryLabel: 'Cont bugetar',
    budgetTotalLabel: 'Total buget',
    primaryGroupingLabel: 'Grupare principală',
    currentTreemapGroupingLabel: 'Gruparea vizibilă în categorii',
    detailLevelLabel: 'Nivel de detaliu',
    expenseTypeLabel: 'Tip cheltuială',
    selectedPathLabel: 'Cale selectată',
    amountFilterLabel: 'Filtru de sumă pentru categoriile vizibile',
    groupedSearchLabel: 'Căutare în elementele grupate',
    excludedEconomicLabel: 'Excluderi implicite EC',
    excludedFunctionalLabel: 'Excluderi implicite FN',
    treemapTitleLabel: 'Titlu',
    treemapSubtitleLabel: 'Descriere',
    currentTreemapTotalLabel: 'Total vizibil în categorii',
    groupedBaseTotalLabel: 'Total de bază în grupare',
    groupedVisibleTotalLabel: 'Total grupat vizibil',
    groupedModeLabel: 'Structură grupată',
    groupedTitleLabel: 'Secțiune',
    unavailableTreemapLabel: 'Distribuția pe categorii indisponibilă',
    rootLabel: 'Rădăcină',
    noneLabel: 'Niciuna',
    yesLabel: 'Da',
    noLabel: 'Nu',
    inhabitantsSuffix: 'locuitori',
    revenueLabel: 'Venituri',
    spendingLabel: 'Cheltuieli',
    totalLabel: 'Total',
    perCapitaLabel: 'Per capita',
    reportAggregatedLabel: 'Execuție bugetară agregată la nivel de ordonator principal',
    reportDetailedLabel: 'Execuție bugetară detaliată',
    functionalGroupingLabel: 'Funcțională',
    economicGroupingLabel: 'Economică',
    chapterLabel: 'Capitol',
    subchapterLabel: 'Subcapitol',
    paragraphLabel: 'Paragraf',
    allExpensesLabel: 'Toate',
    operationsExpensesLabel: 'Operațiuni',
    developmentExpensesLabel: 'Dezvoltare',
    promptInstructions: [
      'Analizează contextul de mai sus și:',
      '1. rezumă pe scurt ce arată datele;',
      '2. evidențiază cele mai mari categorii și orice concentrare neobișnuită;',
      '3. explică pe înțelesul publicului codurile și path-ul selectat;',
      '4. propune 3-5 întrebări sau verificări suplimentare bazate strict pe aceste date;',
      '5. spune explicit ce nu poate fi dedus fără alte surse.',
    ],
    promptPlaceholderLabel: 'Întrebarea mea specifică',
    selectedItemSectionTitle: 'Element selectat',
    selectedItemLabel: 'Element',
    selectedItemPathLabel: 'Path complet',
    selectedItemAmountLabel: 'Valoare selectată',
    detailedDescendantsSectionTitle: 'Subelemente detaliate',
    copyPromptMenuLabel: 'Copiază promptul',
    analyticsMenuLabel: 'Analytics',
    sectionMenuLabel: 'Acțiuni pentru secțiune',
    copyButtonLabel: 'Copiază promptul markdown',
    copiedToastLabel: 'Copiat în clipboard',
    copyFailedToastLabel: 'Copiere eșuată',
  },
  en: {
    markdownTitle: 'Local Budget Analysis',
    intro:
      'Use only the context below, captured from the current Transparenta.eu view. Base your answer strictly on this data, highlight the most important categories, and say clearly what is missing if the evidence is not enough for a solid conclusion.',
    entitySectionTitle: 'UAT Context',
    filtersSectionTitle: 'Active Filters and Context',
    treemapSectionTitle: 'Visible Category Breakdown',
    groupedSectionTitle: 'Visible Grouped Items',
    systemRoleSectionTitle: 'System Role',
    systemRoleContent:
      'You are a senior local public-finance analyst and a rigorous data journalist. Use only the context provided below. Do not invent facts, do not assume missing information, and clearly separate direct observations, reasonable inferences, and unknowns. When making claims, anchor them in the amounts, shares, active filters, report type, and selected path. Explain budget codes and labels in plain language for a general audience. If the data is insufficient for a firm conclusion, say so explicitly and identify the most useful follow-up checks.',
    promptSectionTitle: 'Model Instructions',
    entityLabel: 'Entity',
    cuiLabel: 'CUI',
    countyLabel: 'County',
    populationLabel: 'Population',
    yearLabel: 'Year',
    reportTypeLabel: 'Report type',
    normalizationLabel: 'Normalization',
    currencyLabel: 'Currency',
    inflationAdjustedLabel: 'Inflation adjusted',
    accountCategoryLabel: 'Budget account',
    budgetTotalLabel: 'Budget total',
    primaryGroupingLabel: 'Primary grouping',
    currentTreemapGroupingLabel: 'Current visible grouping',
    detailLevelLabel: 'Detail level',
    expenseTypeLabel: 'Expense type',
    selectedPathLabel: 'Selected path',
    amountFilterLabel: 'Amount filter for visible categories',
    groupedSearchLabel: 'Grouped items search',
    excludedEconomicLabel: 'Default EC exclusions',
    excludedFunctionalLabel: 'Default FN exclusions',
    treemapTitleLabel: 'Title',
    treemapSubtitleLabel: 'Description',
    currentTreemapTotalLabel: 'Visible category total',
    groupedBaseTotalLabel: 'Grouped base total',
    groupedVisibleTotalLabel: 'Visible grouped total',
    groupedModeLabel: 'Grouped structure',
    groupedTitleLabel: 'Section',
    unavailableTreemapLabel: 'Category breakdown unavailable',
    rootLabel: 'Root',
    noneLabel: 'None',
    yesLabel: 'Yes',
    noLabel: 'No',
    inhabitantsSuffix: 'inhabitants',
    revenueLabel: 'Revenue',
    spendingLabel: 'Spending',
    totalLabel: 'Total',
    perCapitaLabel: 'Per capita',
    reportAggregatedLabel: 'Aggregated budget execution at main-creditor level',
    reportDetailedLabel: 'Detailed budget execution',
    functionalGroupingLabel: 'Functional',
    economicGroupingLabel: 'Economic',
    chapterLabel: 'Chapter',
    subchapterLabel: 'Subchapter',
    paragraphLabel: 'Paragraph',
    allExpensesLabel: 'All',
    operationsExpensesLabel: 'Operations',
    developmentExpensesLabel: 'Development',
    promptInstructions: [
      'Analyze the context above and:',
      '1. briefly summarize what the data shows;',
      '2. highlight the largest categories and any unusual concentration;',
      '3. explain the selected codes and path in plain language;',
      '4. propose 3-5 follow-up questions or checks based strictly on this data;',
      '5. state clearly what cannot be inferred without additional sources.',
    ],
    promptPlaceholderLabel: 'My specific request',
    selectedItemSectionTitle: 'Selected Item',
    selectedItemLabel: 'Item',
    selectedItemPathLabel: 'Full path',
    selectedItemAmountLabel: 'Selected value',
    detailedDescendantsSectionTitle: 'Detailed descendants',
    copyPromptMenuLabel: 'Copy prompt',
    analyticsMenuLabel: 'Analytics',
    sectionMenuLabel: 'Section actions',
    copyButtonLabel: 'Copy markdown prompt',
    copiedToastLabel: 'Copied to clipboard',
    copyFailedToastLabel: 'Copy failed',
  },
} as const

function getExportCopy(locale: ChallengeEntityMarkdownExportLocale): ExportCopy {
  return EXPORT_COPY[locale]
}

export function getChallengeEntityMarkdownCopy(
  locale: ChallengeEntityMarkdownExportLocale,
) {
  const copy = getExportCopy(locale)

  return {
    analyticsMenuLabel: copy.analyticsMenuLabel,
    copyButtonLabel: copy.copyButtonLabel,
    copyPromptMenuLabel: copy.copyPromptMenuLabel,
    copiedToastLabel: copy.copiedToastLabel,
    copyFailedToastLabel: copy.copyFailedToastLabel,
    sectionMenuLabel: copy.sectionMenuLabel,
  }
}

function normalizeInlineText(value: string | null | undefined) {
  return (value ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\|/g, '\\|')
}

function normalizeCode(value: string | null | undefined) {
  return (value ?? '').replace(/[^0-9.]/g, '').trim()
}

function getCodeDepth(code: string) {
  return normalizeCode(code).split('.').filter(Boolean).length
}

function formatLocaleNumber(
  value: number,
  locale: ChallengeEntityMarkdownExportLocale,
) {
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'ro-RO', {
    maximumFractionDigits: 2,
  }).format(value)
}

function formatPopulation(
  value: number,
  locale: ChallengeEntityMarkdownExportLocale,
  copy: ExportCopy,
) {
  return `${formatLocaleNumber(value, locale)} ${copy.inhabitantsSuffix}`
}

function formatAmount(
  value: number,
  options: Readonly<{
    locale: ChallengeEntityMarkdownExportLocale
    normalization: ChallengeEntityMarkdownNormalization
    currency: Currency
  }>,
) {
  const formattedNumber = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value)
  const formattedAmount = `${formattedNumber} ${options.currency}`

  if (options.normalization === 'per_capita') {
    return `${formattedAmount}/capita`
  }

  return formattedAmount
}

function formatPercentage(
  amount: number,
  total: number,
  locale: ChallengeEntityMarkdownExportLocale,
) {
  if (!Number.isFinite(total) || total <= 0) {
    return null
  }

  return `${formatLocaleNumber((amount / total) * 100, locale)}%`
}

function toLine(label: string, value: string | null | undefined) {
  if (!value) {
    return null
  }

  return `- ${label}: ${value}`
}

function formatReportType(
  reportType: ChallengeEntityMarkdownReportType,
  copy: ExportCopy,
) {
  return reportType === 'DETAILED'
    ? copy.reportDetailedLabel
    : copy.reportAggregatedLabel
}

function formatNormalization(
  normalization: ChallengeEntityMarkdownNormalization,
  copy: ExportCopy,
) {
  return normalization === 'per_capita'
    ? copy.perCapitaLabel
    : copy.totalLabel
}

function formatAccountCategory(
  accountCategory: ChallengeEntityMarkdownAccountCategory,
  copy: ExportCopy,
) {
  return accountCategory === 'vn' ? copy.revenueLabel : copy.spendingLabel
}

function formatPrimary(
  primary: ChallengeEntityMarkdownPrimary,
  copy: ExportCopy,
) {
  return primary === 'ec'
    ? copy.economicGroupingLabel
    : copy.functionalGroupingLabel
}

function formatDepth(
  depth: ChallengeEntityAnalysisTreemapDepth,
  copy: ExportCopy,
) {
  if (depth === 'paragraph') {
    return copy.paragraphLabel
  }

  if (depth === 'subchapter') {
    return copy.subchapterLabel
  }

  return copy.chapterLabel
}

function formatExpenseType(
  expenseType: ChallengeEntityAnalysisExpenseType | undefined,
  copy: ExportCopy,
) {
  if (expenseType === 'functionare') {
    return copy.operationsExpensesLabel
  }

  if (expenseType === 'dezvoltare') {
    return copy.developmentExpensesLabel
  }

  return copy.allExpensesLabel
}

function formatBreadcrumbs(
  breadcrumbs: readonly Breadcrumb[],
  copy: ExportCopy,
) {
  if (!breadcrumbs.length) {
    return copy.rootLabel
  }

  return breadcrumbs
    .map((breadcrumb) => {
      const prefix = breadcrumb.type.toUpperCase()
      const label = normalizeInlineText(breadcrumb.label)
      return label
        ? `\`${prefix}:${breadcrumb.code}\` ${label}`
        : `\`${prefix}:${breadcrumb.code}\``
    })
    .join(' -> ')
}

function formatAnalyticsPath(path: readonly { type: 'fn' | 'ec'; code: string }[]) {
  return path
    .map((pathEntry) => `\`${pathEntry.type.toUpperCase()}:${pathEntry.code}\``)
    .join(' -> ')
}

function normalizeDisplayedAnalyticsItem(
  displayedItem: BudgetItemAnalyticsPathEntry | undefined,
) {
  if (!displayedItem) {
    return undefined
  }

  const normalizedCode = normalizeBudgetItemAnalyticsCode(displayedItem.code)
  if (!normalizedCode) {
    return undefined
  }

  return {
    type: displayedItem.type,
    code: normalizedCode,
  } satisfies BudgetItemAnalyticsPathEntry
}

function getLineItemCode(
  lineItem: ExecutionLineItem,
  type: 'fn' | 'ec',
) {
  return type === 'fn'
    ? normalizeCode(lineItem.functionalClassification?.functional_code)
    : normalizeCode(lineItem.economicClassification?.economic_code)
}

function getCodeAtDepth(code: string, depth: 'subchapter' | 'paragraph') {
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
    getEconomicClassificationName(code)
    || getEconomicSubchapterName(code)
    || fallbackName?.trim()
    || code
  )
}

function getEconomicLeafLabel(code: string, fallbackName?: string | null) {
  return (
    fallbackName?.trim()
    || getEconomicClassificationName(code)
    || getEconomicSubchapterName(code)
    || code
  )
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

function buildEconomicLeafItems(
  lineItems: readonly ExecutionLineItem[],
): GroupedEconomic[] {
  const economics = new Map<string, GroupedEconomic>()

  lineItems.forEach((lineItem) => {
    const economicCode = normalizeCode(
      lineItem.economicClassification?.economic_code,
    )

    if (!economicCode) {
      return
    }

    const existingEconomic = economics.get(economicCode)
    const amount = Number(lineItem.amount ?? 0)

    if (existingEconomic) {
      existingEconomic.amount += amount
      return
    }

    economics.set(economicCode, {
      code: economicCode,
      name: getEconomicLeafLabel(
        economicCode,
        lineItem.economicClassification?.economic_name,
      ),
      amount,
    })
  })

  return [...economics.values()].sort((left, right) => right.amount - left.amount)
}

function buildFunctionalLeafItems(
  lineItems: readonly ExecutionLineItem[],
): GroupedFunctional[] {
  const functionals = new Map<string, GroupedFunctional>()

  lineItems.forEach((lineItem) => {
    const functionalCode = normalizeCode(
      lineItem.functionalClassification?.functional_code,
    )

    if (!functionalCode) {
      return
    }

    const existingFunctional = functionals.get(functionalCode)
    const amount = Number(lineItem.amount ?? 0)

    if (existingFunctional) {
      existingFunctional.totalAmount += amount
      return
    }

    functionals.set(functionalCode, {
      code: functionalCode,
      name: getFunctionalLeafLabel(
        functionalCode,
        lineItem.functionalClassification?.functional_name,
      ),
      totalAmount: amount,
      economics: [],
    })
  })

  return [...functionals.values()].sort((left, right) => right.totalAmount - left.totalAmount)
}

function filterLineItemsByAnalyticsRequest(
  lineItems: readonly ExecutionLineItem[],
  request: BudgetItemAnalyticsRequest,
) {
  const normalizedPath = normalizeBudgetItemAnalyticsPath(request.path)

  return lineItems.filter((lineItem) =>
    normalizedPath.every((pathEntry) => {
      const code = getLineItemCode(lineItem, pathEntry.type)
      return Boolean(code) && code.startsWith(pathEntry.code)
    }),
  )
}

type ItemScopedDescendants =
  | {
      kind: 'subchapter'
      groups: readonly GroupedSubchapter[]
      codePrefix: ChallengeEntityMarkdownPrimary
    }
  | {
      kind: 'functional'
      groups: readonly GroupedFunctional[]
    }
  | {
      kind: 'economic-leaf'
      groups: readonly GroupedEconomic[]
    }

function buildItemScopedDescendants(
  lineItems: readonly ExecutionLineItem[],
  request: BudgetItemAnalyticsRequest,
) {
  const normalizedPath = normalizeBudgetItemAnalyticsPath(request.path)
  const deepestPathEntry = normalizedPath[normalizedPath.length - 1]

  if (!deepestPathEntry) {
    return {
      kind: 'subchapter',
      groups: [] as readonly GroupedSubchapter[],
      codePrefix: 'fn' as const,
    } satisfies ItemScopedDescendants
  }

  const codeDepth = getCodeDepth(deepestPathEntry.code)
  const withoutCurrentItem = <T extends { code: string }>(groups: readonly T[]) =>
    groups.filter((group) => group.code !== deepestPathEntry.code)

  if (deepestPathEntry.type === 'fn') {
    if (codeDepth <= 1) {
      return {
        kind: 'subchapter',
        groups: withoutCurrentItem(buildFunctionalSubchapterGroups(lineItems)),
        codePrefix: 'fn' as const,
      } satisfies ItemScopedDescendants
    }

    if (codeDepth === 2) {
      return {
        kind: 'functional',
        groups: withoutCurrentItem(buildFunctionalParagraphGroups(lineItems)),
      } satisfies ItemScopedDescendants
    }

    return {
      kind: 'economic-leaf',
      groups: buildEconomicLeafItems(lineItems),
    } satisfies ItemScopedDescendants
  }

  if (codeDepth <= 1) {
    return {
      kind: 'subchapter',
      groups: withoutCurrentItem(buildEconomicGroupsAtDepth(lineItems, 'subchapter')),
      codePrefix: 'ec' as const,
    } satisfies ItemScopedDescendants
  }

  if (codeDepth === 2) {
    return {
      kind: 'subchapter',
      groups: withoutCurrentItem(buildEconomicGroupsAtDepth(lineItems, 'paragraph')),
      codePrefix: 'ec' as const,
    } satisfies ItemScopedDescendants
  }

  return {
    kind: 'functional',
    groups: withoutCurrentItem(buildFunctionalLeafItems(lineItems)),
  } satisfies ItemScopedDescendants
}

function getVisibleGroupedTotal(visibleItems: VisibleGroupedItems) {
  return visibleItems.groups.reduce(
    (sum, group) => sum + group.totalAmount,
    0,
  )
}

function formatGroupedStructureSummary(
  depth: ChallengeEntityAnalysisTreemapDepth,
  groupBy: ChallengeEntityMarkdownPrimary,
  copy: ExportCopy,
) {
  return `${formatPrimary(groupBy, copy)} · ${formatDepth(depth, copy)}`
}

function buildIndentedLine(
  indentLevel: number,
  text: string,
) {
  return `${'  '.repeat(indentLevel)}- ${text}`
}

function formatCodeLine(
  prefix: 'FN' | 'EC',
  code: string,
  label: string,
  amount: number,
  baseTotal: number,
  options: Readonly<{
    locale: ChallengeEntityMarkdownExportLocale
    normalization: ChallengeEntityMarkdownNormalization
    currency: Currency
  }>,
  percentageAmount = amount,
) {
  const normalizedLabel = normalizeInlineText(label)
  const formattedDisplayAmount = formatAmount(amount, options)
  const percentage = formatPercentage(
    percentageAmount,
    baseTotal,
    options.locale,
  )
  const formattedAmount = percentage
    ? `${formattedDisplayAmount} (${percentage})`
    : formattedDisplayAmount
  return normalizedLabel
    ? `\`${prefix}:${code}\` ${normalizedLabel}: ${formattedAmount}`
    : `\`${prefix}:${code}\`: ${formattedAmount}`
}

function buildFunctionalLines(
  functionals: readonly GroupedFunctional[],
  baseTotal: number,
  options: Readonly<{
    locale: ChallengeEntityMarkdownExportLocale
    normalization: ChallengeEntityMarkdownNormalization
    currency: Currency
  }>,
  indentLevel: number,
) {
  const lines: string[] = []

  for (const functional of functionals) {
    lines.push(
      buildIndentedLine(
        indentLevel,
        formatCodeLine(
          'FN',
          functional.code,
          functional.name,
          functional.totalAmount,
          baseTotal,
          options,
        ),
      ),
    )

    for (const economic of functional.economics) {
      lines.push(
        buildIndentedLine(
          indentLevel + 1,
          formatCodeLine(
            'EC',
            economic.code,
            economic.name,
            economic.amount,
            baseTotal,
            options,
          ),
        ),
      )
    }
  }

  return lines
}

function buildSubchapterLines(
  groups: readonly GroupedSubchapter[],
  baseTotal: number,
  options: Readonly<{
    locale: ChallengeEntityMarkdownExportLocale
    normalization: ChallengeEntityMarkdownNormalization
    currency: Currency
  }>,
  codePrefix: ChallengeEntityMarkdownPrimary,
  indentLevel: number,
) {
  const lines: string[] = []
  const topLevelPrefix = codePrefix === 'ec' ? 'EC' : 'FN'

  for (const group of groups) {
    lines.push(
      buildIndentedLine(
        indentLevel,
        formatCodeLine(
          topLevelPrefix,
          group.code,
          group.name,
          group.totalAmount,
          baseTotal,
          options,
        ),
      ),
    )
    lines.push(
      ...buildFunctionalLines(
        group.functionals,
        baseTotal,
        options,
        indentLevel + 1,
      ),
    )
  }

  return lines
}

function buildChapterLines(
  groups: readonly GroupedChapter[],
  baseTotal: number,
  options: Readonly<{
    locale: ChallengeEntityMarkdownExportLocale
    normalization: ChallengeEntityMarkdownNormalization
    currency: Currency
  }>,
  topLevelPrefix: ChallengeEntityMarkdownPrimary,
) {
  const lines: string[] = []
  const chapterPrefix = topLevelPrefix === 'ec' ? 'EC' : 'FN'

  for (const group of groups) {
    lines.push(
      buildIndentedLine(
        0,
        formatCodeLine(
          chapterPrefix,
          group.prefix,
          group.description,
          group.totalAmount,
          baseTotal,
          options,
        ),
      ),
    )

    if (group.functionals.length > 0) {
      lines.push(...buildFunctionalLines(group.functionals, baseTotal, options, 1))
    }

    if (group.subchapters && group.subchapters.length > 0) {
      lines.push(
        ...buildSubchapterLines(
          group.subchapters,
          baseTotal,
          options,
          topLevelPrefix,
          1,
        ),
      )
    }
  }

  return lines
}

function buildGroupedItemLines(
  visibleItems: VisibleGroupedItems,
  baseTotal: number,
  options: Readonly<{
    locale: ChallengeEntityMarkdownExportLocale
    normalization: ChallengeEntityMarkdownNormalization
    currency: Currency
  }>,
  groupBy: ChallengeEntityMarkdownPrimary,
) {
  if (visibleItems.kind === 'functional') {
    return buildFunctionalLines(visibleItems.groups, baseTotal, options, 0)
  }

  if (visibleItems.kind === 'subchapter') {
    return buildSubchapterLines(
      visibleItems.groups,
      baseTotal,
      options,
      visibleItems.codePrefix,
      0,
    )
  }

  return buildChapterLines(visibleItems.groups, baseTotal, options, groupBy)
}

function buildEconomicLeafLines(
  economics: readonly GroupedEconomic[],
  baseTotal: number,
  options: Readonly<{
    locale: ChallengeEntityMarkdownExportLocale
    normalization: ChallengeEntityMarkdownNormalization
    currency: Currency
  }>,
) {
  return economics.map((economic) =>
    buildIndentedLine(
      0,
      formatCodeLine(
        'EC',
        economic.code,
        economic.name,
        economic.amount,
        baseTotal,
        options,
      ),
    ),
  )
}

function buildItemScopedDescendantLines(
  descendants: ItemScopedDescendants,
  baseTotal: number,
  options: Readonly<{
    locale: ChallengeEntityMarkdownExportLocale
    normalization: ChallengeEntityMarkdownNormalization
    currency: Currency
  }>,
) {
  if (descendants.kind === 'economic-leaf') {
    return buildEconomicLeafLines(descendants.groups, baseTotal, options)
  }

  if (descendants.kind === 'functional') {
    return buildFunctionalLines(descendants.groups, baseTotal, options, 0)
  }

  return buildSubchapterLines(
    descendants.groups,
    baseTotal,
    options,
    descendants.codePrefix,
    0,
  )
}

function buildEntitySection(
  context: ChallengeEntityMarkdownExportContext,
  copy: ExportCopy,
) {
  const lines = [
    toLine(copy.entityLabel, normalizeInlineText(context.entity.name)),
    toLine(copy.cuiLabel, `\`${context.entity.cui}\``),
    toLine(copy.countyLabel, normalizeInlineText(context.entity.countyName)),
    typeof context.entity.population === 'number'
      ? toLine(
          copy.populationLabel,
          formatPopulation(context.entity.population, context.locale, copy),
        )
      : null,
  ].filter(Boolean)

  return [`## ${copy.entitySectionTitle}`, ...lines].join('\n')
}

function buildFiltersSection(
  context: ChallengeEntityMarkdownExportContext,
  copy: ExportCopy,
) {
  const { filters } = context
  const lines = [
    toLine(copy.yearLabel, `\`${String(filters.year)}\``),
    toLine(copy.reportTypeLabel, formatReportType(filters.reportType, copy)),
    toLine(
      copy.normalizationLabel,
      formatNormalization(filters.normalization, copy),
    ),
    toLine(copy.currencyLabel, filters.currency),
    toLine(
      copy.inflationAdjustedLabel,
      filters.inflationAdjusted ? copy.yesLabel : copy.noLabel,
    ),
    toLine(
      copy.accountCategoryLabel,
      formatAccountCategory(filters.treemapAccountCategory, copy),
    ),
    toLine(
      copy.budgetTotalLabel,
      formatAmount(filters.budgetTotal, {
        locale: context.locale,
        normalization: filters.normalization,
        currency: filters.currency,
      }),
    ),
    toLine(copy.primaryGroupingLabel, formatPrimary(filters.treemapPrimary, copy)),
    toLine(
      copy.currentTreemapGroupingLabel,
      formatPrimary(filters.currentTreemapPrimary, copy),
    ),
    toLine(copy.detailLevelLabel, formatDepth(filters.treemapDepth, copy)),
    filters.treemapAccountCategory === 'ch'
      ? toLine(copy.expenseTypeLabel, formatExpenseType(filters.expenseType, copy))
      : null,
    toLine(copy.selectedPathLabel, formatBreadcrumbs(filters.breadcrumbs, copy)),
    filters.groupedSearchTerm
      ? toLine(
          copy.groupedSearchLabel,
          `\`${normalizeInlineText(filters.groupedSearchTerm)}\``,
        )
      : null,
    filters.amountRange
      ? toLine(
          copy.amountFilterLabel,
          `${formatAmount(filters.amountRange.selectedMin, {
            locale: context.locale,
            normalization: filters.normalization,
            currency: filters.currency,
          })} -> ${formatAmount(filters.amountRange.selectedMax, {
            locale: context.locale,
            normalization: filters.normalization,
            currency: filters.currency,
          })} (${formatAmount(filters.amountRange.minValue, {
            locale: context.locale,
            normalization: filters.normalization,
            currency: filters.currency,
          })} -> ${formatAmount(filters.amountRange.maxValue, {
            locale: context.locale,
            normalization: filters.normalization,
            currency: filters.currency,
          })})`,
        )
      : null,
    filters.excludedEconomicCodes && filters.excludedEconomicCodes.length > 0
      ? toLine(
          copy.excludedEconomicLabel,
          filters.excludedEconomicCodes.map((code) => `\`${code}\``).join(', '),
        )
      : null,
    filters.excludedFunctionalCodes && filters.excludedFunctionalCodes.length > 0
      ? toLine(
          copy.excludedFunctionalLabel,
          filters.excludedFunctionalCodes.map((code) => `\`${code}\``).join(', '),
        )
      : null,
  ].filter(Boolean)

  return [`## ${copy.filtersSectionTitle}`, ...lines].join('\n')
}

function buildTreemapSection(
  context: ChallengeEntityMarkdownExportContext,
  copy: ExportCopy,
) {
  const amountOptions = {
    locale: context.locale,
    normalization: context.filters.normalization,
    currency: context.filters.currency,
  } as const
  const visibleTreemapTotal = context.treemap.visibleNodes.reduce(
    (sum, node) => sum + Math.abs(Number.isFinite(node.value) ? node.value : 0),
    0,
  )
  const metadataLines = [
    toLine(copy.treemapTitleLabel, normalizeInlineText(context.treemap.title)),
    context.treemap.subtitle
      ? toLine(copy.treemapSubtitleLabel, normalizeInlineText(context.treemap.subtitle))
      : null,
    toLine(
      copy.currentTreemapTotalLabel,
      formatAmount(visibleTreemapTotal, amountOptions),
    ),
  ].filter(Boolean)

  const visibleNodeLines = context.treemap.visibleNodes.map((node) =>
    buildIndentedLine(
      0,
      formatCodeLine(
        context.filters.currentTreemapPrimary === 'ec' ? 'EC' : 'FN',
        node.code,
        node.name,
        node.value,
        visibleTreemapTotal,
        amountOptions,
        Math.abs(Number.isFinite(node.value) ? node.value : 0),
      ),
    ),
  )

  if (context.treemap.unavailableReason) {
    visibleNodeLines.unshift(
      buildIndentedLine(
        0,
        `${copy.unavailableTreemapLabel}: ${normalizeInlineText(
          context.treemap.unavailableReason,
        )}`,
      ),
    )
  }

  if (visibleNodeLines.length === 0) {
    visibleNodeLines.push(buildIndentedLine(0, copy.noneLabel))
  }

  return [
    `## ${copy.treemapSectionTitle}`,
    ...metadataLines,
    ...visibleNodeLines,
  ].join('\n')
}

function buildGroupedSection(
  context: ChallengeEntityMarkdownExportContext,
  copy: ExportCopy,
) {
  const amountOptions = {
    locale: context.locale,
    normalization: context.filters.normalization,
    currency: context.filters.currency,
  } as const
  const visibleGroupedTotal = getVisibleGroupedTotal(context.grouped.visibleItems)
  const metadataLines = [
    toLine(copy.groupedTitleLabel, normalizeInlineText(context.grouped.title)),
    toLine(
      copy.groupedModeLabel,
      formatGroupedStructureSummary(
        context.grouped.depth,
        context.grouped.groupBy,
        copy,
      ),
    ),
    toLine(
      copy.groupedBaseTotalLabel,
      formatAmount(context.grouped.baseTotal, amountOptions),
    ),
    toLine(
      copy.groupedVisibleTotalLabel,
      formatAmount(visibleGroupedTotal, amountOptions),
    ),
  ].filter(Boolean)

  const groupedItemLines = buildGroupedItemLines(
    context.grouped.visibleItems,
    context.grouped.baseTotal,
    amountOptions,
    context.grouped.groupBy,
  )

  if (groupedItemLines.length === 0) {
    groupedItemLines.push(buildIndentedLine(0, copy.noneLabel))
  }

  return [
    `## ${copy.groupedSectionTitle}`,
    ...metadataLines,
    ...groupedItemLines,
  ].join('\n')
}

function buildSystemRoleSection(copy: ExportCopy) {
  return [
    `## ${copy.systemRoleSectionTitle}`,
    copy.systemRoleContent,
  ].join('\n')
}

function buildPromptSection(copy: ExportCopy) {
  return [
    `## ${copy.promptSectionTitle}`,
    ...copy.promptInstructions,
    '',
    `${copy.promptPlaceholderLabel}:`,
  ].join('\n')
}

function buildSelectedItemSection(
  copy: ExportCopy,
  request: ChallengeEntityMarkdownItemRequest,
  selectedAmount: number,
  options: Readonly<{
    locale: ChallengeEntityMarkdownExportLocale
    normalization: ChallengeEntityMarkdownNormalization
    currency: Currency
  }>,
) {
  const normalizedPath = normalizeBudgetItemAnalyticsPath(request.path)
  const selectedPathEntry =
    normalizeDisplayedAnalyticsItem(request.displayedItem)
    ?? normalizedPath[normalizedPath.length - 1]
  const selectedItemCode = selectedPathEntry
    ? `\`${selectedPathEntry.type.toUpperCase()}:${selectedPathEntry.code}\``
    : copy.noneLabel
  const selectedItemLabel = normalizeInlineText(request.subjectLabel) || copy.noneLabel

  return [
    `## ${copy.selectedItemSectionTitle}`,
    toLine(
      copy.selectedItemLabel,
      `${selectedItemCode}${selectedItemLabel !== copy.noneLabel ? ` ${selectedItemLabel}` : ''}`,
    ),
    toLine(
      copy.selectedItemPathLabel,
      normalizedPath.length > 0 ? formatAnalyticsPath(normalizedPath) : copy.rootLabel,
    ),
    toLine(
      copy.selectedItemAmountLabel,
      formatAmount(selectedAmount, options),
    ),
  ]
    .filter(Boolean)
    .join('\n')
}

function buildDetailedDescendantsSection(
  copy: ExportCopy,
  descendantLines: readonly string[],
) {
  const resolvedLines =
    descendantLines.length > 0 ? descendantLines : [buildIndentedLine(0, copy.noneLabel)]

  return [
    `## ${copy.detailedDescendantsSectionTitle}`,
    ...resolvedLines,
  ].join('\n')
}

export function buildChallengeEntityAnalysisMarkdown(
  context: ChallengeEntityMarkdownExportContext,
) {
  const copy = getExportCopy(context.locale)

  return [
    `# ${copy.markdownTitle}`,
    buildSystemRoleSection(copy),
    copy.intro,
    buildEntitySection(context, copy),
    buildFiltersSection(context, copy),
    buildTreemapSection(context, copy),
    buildGroupedSection(context, copy),
    buildPromptSection(copy),
  ].join('\n\n')
}

export function buildChallengeEntityItemMarkdown(params: Readonly<{
  pageContext: ChallengeEntityMarkdownExportPageContext
  groupedContext: ChallengeEntityMarkdownGroupedSectionContext
  request: ChallengeEntityMarkdownItemRequest
  lineItems: readonly ExecutionLineItem[]
}>) {
  const copy = getExportCopy(params.pageContext.locale)
  const filteredLineItems = filterLineItemsByAnalyticsRequest(
    params.lineItems,
    params.request,
  )
  const selectedAmount = filteredLineItems.reduce(
    (sum, lineItem) => sum + Number(lineItem.amount ?? 0),
    0,
  )
  const descendants = buildItemScopedDescendants(filteredLineItems, params.request)
  const amountOptions = {
    locale: params.pageContext.locale,
    normalization: params.pageContext.filters.normalization,
    currency: params.pageContext.filters.currency,
  } as const
  const descendantLines = buildItemScopedDescendantLines(
    descendants,
    selectedAmount,
    amountOptions,
  )

  return [
    `# ${copy.markdownTitle}`,
    buildSystemRoleSection(copy),
    copy.intro,
    buildEntitySection(
      {
        ...params.pageContext,
        grouped: {
          title: params.groupedContext.title,
          groupBy: params.groupedContext.groupBy,
          depth: params.groupedContext.depth,
          baseTotal: params.groupedContext.baseTotal,
          visibleItems: {
            kind: 'chapter',
            groups: [],
          },
        },
      },
      copy,
    ),
    buildFiltersSection(
      {
        ...params.pageContext,
        grouped: {
          title: params.groupedContext.title,
          groupBy: params.groupedContext.groupBy,
          depth: params.groupedContext.depth,
          baseTotal: params.groupedContext.baseTotal,
          visibleItems: {
            kind: 'chapter',
            groups: [],
          },
        },
      },
      copy,
    ),
    buildSelectedItemSection(copy, params.request, selectedAmount, amountOptions),
    buildDetailedDescendantsSection(copy, descendantLines),
    buildPromptSection(copy),
  ].join('\n\n')
}
