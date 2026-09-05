import { BudgetAnalyticsError } from '@/components/entity-analytics/BudgetAnalyticsError'
import { createLazyFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { useQueries, useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { Trans } from '@lingui/react/macro'
import { useMemo, useEffect, useCallback } from 'react'

import {
  AnalyticsFilterSchema,
  AnalyticsFilterType,
  createDefaultExecutionYearReportPeriod,
} from '@/schemas/charts'
import { convertDaysToMs, generateHash } from '@/lib/utils'
import { fetchCompleteAggregatedLineItems } from '@/lib/api/entity-analytics'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

import { BudgetExplorerHeader } from '@/components/budget-explorer/BudgetExplorerHeader'
import { FloatingQuickNav } from '@/components/ui/FloatingQuickNav'
import { usePeriodLabel } from '@/hooks/use-period-label'
import { useUserCurrency } from '@/lib/hooks/useUserCurrency'
import { useUserInflationAdjusted } from '@/lib/hooks/useUserInflationAdjusted'
import { usePersistedState } from '@/lib/hooks/usePersistedState'
import { getSiteUrl } from '@/config/env'
import type { ReportPeriodInput } from '@/schemas/reporting'
import { parseSearchParamJson } from '@/lib/router-search'
import { createValidationError } from '@/lib/errors/types'
import { NationalBudgetDisclaimerCard } from '@/components/national-budget/national-budget-disclaimer-card'
import { NationalBudgetWhyDifferentCard } from '@/components/national-budget/national-budget-why-different-card'
import { NationalBudgetSectorSection } from '@/components/national-budget/national-budget-sector-section'
import { fetchBudgetSectors, fetchFundingSources } from '@/features/national-budget/national-budget-api'
import {
  getSectorDefinitionById,
  NATIONAL_BUDGET_SECTOR_ORDER,
} from '@/features/national-budget/national-budget-sector-definitions'
import {
  buildFundingSourceIdsByKey,
  buildNationalBudgetLineItemsFilter,
  buildNationalBudgetSectorBaseFilter,
  NATIONAL_BUDGET_FUNDING_SOURCE_KEYS,
  type NationalBudgetFundingSourceKey,
} from '@/features/national-budget/national-budget-filter-presets'
import { getFormulaRulesForSector } from '@/features/national-budget/national-budget-formula-rules'
import {
  buildTotalBudgetLineItemsFilter,
  filterSectionsIncludedInInformativeTotal,
  mergeNationalBudgetSectionNodes,
} from '@/features/national-budget/national-budget-total-merge'
import type { NationalBudgetAccountCategory, NationalBudgetSectorDefinition, NationalBudgetTransferFilter } from '@/features/national-budget/national-budget-types'
import type { AggregatedNode } from '@/components/budget-explorer/budget-transform'

export const Route = createLazyFileRoute('/budget-explorer')({
  component: BudgetExplorerPage,
})

const PrimaryLevelEnum = z.enum(['fn', 'ec'])
const DepthEnum = z.enum(['chapter', 'subchapter', 'paragraph'])
const TransferFilterEnum = z.enum(['all', 'no-transfers'])
const ViewEnum = z.enum(['overview', 'treemap', 'sankey', 'list'])

const baseDefaultFilter: AnalyticsFilterType = {
  report_period: createDefaultExecutionYearReportPeriod(),
  account_category: 'ch',
  report_type: 'Executie bugetara agregata la nivel de ordonator principal',
}
const defaultFilter: AnalyticsFilterType = {
  ...baseDefaultFilter,
}
const defaultReportPeriod = createDefaultExecutionYearReportPeriod() as ReportPeriodInput
type BudgetExplorerFilter = Omit<AnalyticsFilterType, 'report_period'> & { report_period: ReportPeriodInput }
const defaultBudgetExplorerFilter: BudgetExplorerFilter = {
  ...defaultFilter,
  report_period: defaultReportPeriod,
}
const BUDGET_EXPLORER_DISCLAIMER_COLLAPSED_STORAGE_KEY = 'budget-explorer:main-disclaimer-collapsed'

type BudgetExplorerSectionDefinition = {
  id: string
  label: string
  badge: string
  order: number
  sectorIdForRules?: string
  includeInTotal?: boolean
  baseFilter: AnalyticsFilterType
}

type DocumentBudgetSectionConfig = {
  id: string
  label: string
  badge: string
  order: number
  budgetSectorIdsByAccountCategory: Record<NationalBudgetAccountCategory, string[] | undefined>
  fundingSourceKeysByAccountCategory: Record<NationalBudgetAccountCategory, NationalBudgetFundingSourceKey[]>
}

const DOCUMENT_BUDGET_SECTION_CONFIGS: DocumentBudgetSectionConfig[] = [
  {
    id: 'document-institutions-own-revenue',
    label: 'Bugetul instituțiilor publice finanțate integral sau parțial din venituri proprii',
    badge: 'Venituri proprii',
    order: 6,
    budgetSectorIdsByAccountCategory: {
      ch: ['1'],
      vn: ['1'],
    },
    fundingSourceKeysByAccountCategory: {
      ch: [
        NATIONAL_BUDGET_FUNDING_SOURCE_KEYS.CREDITE_EXTERNE,
        NATIONAL_BUDGET_FUNDING_SOURCE_KEYS.CREDITE_INTERNE,
        NATIONAL_BUDGET_FUNDING_SOURCE_KEYS.FONDURI_EXTERNE_NERAMBURSABILE,
        NATIONAL_BUDGET_FUNDING_SOURCE_KEYS.ACTIVITATI_FINANTATE_INTEGRAL_DIN_VENITURI_PROPRII,
        NATIONAL_BUDGET_FUNDING_SOURCE_KEYS.INTEGRAL_VENITURI_PROPRII,
        NATIONAL_BUDGET_FUNDING_SOURCE_KEYS.VENITURI_PROPRII_SI_SUBVENTII,
        NATIONAL_BUDGET_FUNDING_SOURCE_KEYS.BUGET_PRIVATIZARE,
        NATIONAL_BUDGET_FUNDING_SOURCE_KEYS.BUGETUL_FONDULUI_PENTRU_MEDIU,
        NATIONAL_BUDGET_FUNDING_SOURCE_KEYS.BUGETUL_TREZORERIEI_STATULUI,
      ],
      vn: [
        NATIONAL_BUDGET_FUNDING_SOURCE_KEYS.ACTIVITATI_FINANTATE_INTEGRAL_DIN_VENITURI_PROPRII,
        NATIONAL_BUDGET_FUNDING_SOURCE_KEYS.INTEGRAL_VENITURI_PROPRII,
        NATIONAL_BUDGET_FUNDING_SOURCE_KEYS.VENITURI_PROPRII_SI_SUBVENTII,
      ],
    },
  },
  {
    id: 'document-fen',
    label: 'Fonduri Externe Nerambursabile',
    badge: 'Fonduri UE',
    order: 7,
    budgetSectorIdsByAccountCategory: {
      ch: [],
      vn: [],
    },
    fundingSourceKeysByAccountCategory: {
      ch: [NATIONAL_BUDGET_FUNDING_SOURCE_KEYS.FONDURI_EXTERNE_NERAMBURSABILE],
      vn: [NATIONAL_BUDGET_FUNDING_SOURCE_KEYS.FONDURI_EXTERNE_NERAMBURSABILE],
    },
  },
  {
    id: 'document-treasury',
    label: 'Bugetul Trezoreriei Statului',
    badge: 'Trezorerie',
    order: 8,
    budgetSectorIdsByAccountCategory: {
      ch: [],
      vn: [],
    },
    fundingSourceKeysByAccountCategory: {
      ch: [NATIONAL_BUDGET_FUNDING_SOURCE_KEYS.BUGETUL_TREZORERIEI_STATULUI],
      vn: [NATIONAL_BUDGET_FUNDING_SOURCE_KEYS.BUGETUL_TREZORERIEI_STATULUI],
    },
  },
]

function normalizeBudgetExplorerFilterInput(rawValue: unknown): unknown {
  const parsed = parseSearchParamJson(rawValue)

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return parsed

  const rawFilter = parsed as Record<string, unknown>
  const fixedFilter = { ...rawFilter }

  return fixedFilter
}

const BudgetExplorerFilterSchema = z.preprocess(
  normalizeBudgetExplorerFilterInput,
  AnalyticsFilterSchema,
).transform((filter): BudgetExplorerFilter => {
  return {
    ...defaultBudgetExplorerFilter,
    ...filter,
    report_period: (filter.report_period as ReportPeriodInput | undefined) ?? defaultBudgetExplorerFilter.report_period,
  }
})

const SearchSchema = z.object({
  view: ViewEnum.default('treemap').describe('Legacy view parameter kept for backward compatibility.'),
  primary: PrimaryLevelEnum.default('fn').describe('Primary grouping: fn (functional) or ec (economic).'),
  depth: DepthEnum.default('chapter').describe('Detail level: chapter (chapters) or subchapter (subcategories).'),
  transferFilter: TransferFilterEnum.default('all').describe('Transfer mode: include all transfers or exclude transfer flows.'),
  search: z.string().optional().describe('Text search within categories.'),
  filter: z.preprocess((value) => (value === undefined ? defaultFilter : value), BudgetExplorerFilterSchema).describe(
    'Budget filter including report_period, account_category, normalization, report_type.',
  ),
  treemapPrimary: PrimaryLevelEnum.optional().describe('Legacy parameter kept for backward compatibility.'),
  treemapPath: z.coerce.string().optional().describe('Legacy parameter kept for backward compatibility.'),
  year: z.coerce.number().optional().describe('Shorthand for setting report year (overrides filter.report_period).'),
})

export type BudgetExplorerState = z.infer<typeof SearchSchema>

function computeTemporalCoverage(period: BudgetExplorerState['filter']['report_period']): string | undefined {
  if (!period || !period.selection) return undefined
  const { type, selection } = period
  if (type === 'YEAR' && 'dates' in selection && Array.isArray(selection.dates) && selection.dates.length) {
    const years = selection.dates.map((d) => d.slice(0, 4)).sort()
    if (years.length === 1) return years[0]
    return `${years[0]}/${years[years.length - 1]}`
  }
  if ('interval' in selection && selection.interval?.start && selection.interval?.end) {
    return `${selection.interval.start}/${selection.interval.end}`
  }
  return undefined
}

export function head({ search }: { search: BudgetExplorerState }) {
  const site = getSiteUrl()
  const canonical = `${site}/budget-explorer`
  const period = search.filter?.report_period
  const temporalCoverage = computeTemporalCoverage(period)
  const title = 'National Budget – Transparenta.eu'
  const description = 'Segmented national budget overview by sector with transparent formula-based adjustments and quick line-item drilldowns.'

  const dataset = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Romanian Public Budget – National Segmented View',
    description,
    url: canonical,
    temporalCoverage: temporalCoverage ?? undefined,
    spatialCoverage: { '@type': 'Place', name: 'Romania' },
    publisher: { '@type': 'Organization', '@id': `${site}#organization`, name: 'Transparenta.eu', url: site },
    keywords: ['budget', 'Romania', 'public finance', 'segmented budget', 'state budget', 'local budget'],
    isBasedOn: 'https://mfinante.gov.ro/transparenta-bugetara',
  }

  return {
    meta: [
      { title },
      { name: 'description', content: description },
      { name: 'og:title', content: title },
      { name: 'og:description', content: description },
      { name: 'og:url', content: canonical },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'canonical', content: canonical },
    ],
    scripts: [
      { type: 'application/ld+json', children: JSON.stringify(dataset) },
    ],
  }
}

function BudgetExplorerPage() {
  const raw = useSearch({ from: '/budget-explorer' })
  const navigate = useNavigate({ from: '/budget-explorer' })
  const parsedSearch = SearchSchema.safeParse(raw)
  if (!parsedSearch.success) {
    const hints = parsedSearch.error.issues
      .map((issue) => {
        const path = issue.path.length ? issue.path.join('.') : 'search'
        return `${path}: ${issue.message}`
      })
      .join('; ')

    throw createValidationError('invalid-search-params', `Invalid URL parameters: ${hints}`)
  }

  const search = parsedSearch.data
  const [userCurrency, setUserCurrency] = useUserCurrency()
  const [userInflationAdjusted, setUserInflationAdjusted] = useUserInflationAdjusted()
  const [isMainDisclaimerCollapsed, setIsMainDisclaimerCollapsed] = usePersistedState<boolean>(
    BUDGET_EXPLORER_DISCLAIMER_COLLAPSED_STORAGE_KEY,
    false,
  )
  const { year } = search

  const filter = useMemo(() => {
    if (year && Number.isFinite(year)) {
      return {
        ...search.filter,
        report_period: {
          type: 'YEAR' as const,
          selection: { dates: [String(year)] },
        },
      }
    }
    return search.filter
  }, [search.filter, year])

  const effectiveNormalization = useMemo(() => {
    const rawNormalization = filter.normalization ?? 'total'
    let normalized = rawNormalization
    if (rawNormalization === 'total_euro') {
      normalized = 'total'
    } else if (rawNormalization === 'per_capita_euro') {
      normalized = 'per_capita'
    }
    return normalized
  }, [filter.normalization])

  const effectiveCurrency = useMemo(() => {
    const rawNormalization = filter.normalization
    if (rawNormalization === 'total_euro' || rawNormalization === 'per_capita_euro') return 'EUR'
    return filter.currency ?? userCurrency
  }, [filter.currency, filter.normalization, userCurrency])

  const effectiveInflationAdjusted = useMemo(() => {
    if (effectiveNormalization === 'percent_gdp') return false
    return Boolean(filter.inflation_adjusted ?? userInflationAdjusted)
  }, [effectiveNormalization, filter.inflation_adjusted, userInflationAdjusted])

  const effectiveFilter: AnalyticsFilterType = useMemo(() => ({
    ...filter,
    normalization: effectiveNormalization,
    currency: effectiveCurrency,
    inflation_adjusted: effectiveInflationAdjusted,
  }), [effectiveCurrency, effectiveInflationAdjusted, effectiveNormalization, filter])
  const effectiveTreemapPrimary: 'fn' | 'ec' = effectiveFilter.account_category === 'vn' ? 'fn' : search.primary
  const parsedTreemapPath = useMemo(
    () =>
      (search.treemapPath ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    [search.treemapPath],
  )

  const handleFilterChange = useCallback((partial: Partial<BudgetExplorerState>) => {
    const { filter: partialFilter, ...restPartial } = partial
    const nextFilter = {
      ...defaultFilter,
      ...filter,
      ...(partialFilter ?? {}),
    }

    navigate({
      search: (prev) => ({
        ...(prev as unknown as BudgetExplorerState),
        ...restPartial,
        filter: nextFilter,
      }),
      replace: true,
      resetScroll: false,
    })
  }, [filter, navigate])

  useEffect(() => {
    const urlCurrency = filter.currency
    const urlInflationAdjusted = filter.inflation_adjusted
    const normalizationRaw = filter.normalization

    const nextFilterPatch: Partial<AnalyticsFilterType> = {}
    let shouldPatchFilter = false

    if (urlCurrency !== undefined) {
      if (urlCurrency !== userCurrency) setUserCurrency(urlCurrency)
      nextFilterPatch.currency = undefined
      shouldPatchFilter = true
    }

    if (urlInflationAdjusted !== undefined) {
      if (Boolean(urlInflationAdjusted) !== Boolean(userInflationAdjusted)) {
        setUserInflationAdjusted(Boolean(urlInflationAdjusted))
      }
      nextFilterPatch.inflation_adjusted = undefined
      shouldPatchFilter = true
    }

    if (normalizationRaw === 'total_euro' || normalizationRaw === 'per_capita_euro') {
      if (userCurrency !== 'EUR') setUserCurrency('EUR')
      nextFilterPatch.normalization = normalizationRaw === 'total_euro' ? 'total' : 'per_capita'
      shouldPatchFilter = true
    }

    if (shouldPatchFilter) {
      handleFilterChange({ filter: nextFilterPatch as BudgetExplorerState['filter'] })
    }
  }, [
    filter.currency,
    filter.inflation_adjusted,
    filter.normalization,
    userCurrency,
    userInflationAdjusted,
    setUserCurrency,
    setUserInflationAdjusted,
    handleFilterChange,
  ])

  const filterHash = generateHash(JSON.stringify(effectiveFilter))
  const periodLabel = usePeriodLabel(filter.report_period as ReportPeriodInput | undefined)

  const {
    data: availableBudgetSectors,
    isLoading: isLoadingBudgetSectors,
    error: budgetSectorsError,
  } = useQuery({
    queryKey: ['budget-explorer', 'native-budget-sectors'],
    queryFn: ({ signal }) => fetchBudgetSectors(signal),
    staleTime: convertDaysToMs(7),
    gcTime: convertDaysToMs(7),
    refetchOnWindowFocus: false,
  })

  const {
    data: availableFundingSources,
    isLoading: isLoadingFundingSources,
  } = useQuery({
    queryKey: ['budget-explorer', 'native-funding-sources'],
    queryFn: ({ signal }) => fetchFundingSources(signal),
    staleTime: convertDaysToMs(7),
    gcTime: convertDaysToMs(7),
    refetchOnWindowFocus: false,
  })

  const fundingSourceIdsByKey = useMemo(
    () => buildFundingSourceIdsByKey(availableFundingSources ?? []),
    [availableFundingSources],
  )
  const fundingSourceIdsByKeyHash = useMemo(
    () => generateHash(JSON.stringify(fundingSourceIdsByKey)),
    [fundingSourceIdsByKey],
  )

  const visibleSectors = useMemo(() => {
    const apiById = new Map((availableBudgetSectors ?? []).map((sector) => [sector.sector_id, sector]))

    const ids = budgetSectorsError
      ? NATIONAL_BUDGET_SECTOR_ORDER
      : NATIONAL_BUDGET_SECTOR_ORDER.filter((sectorId) => apiById.has(sectorId))

    return ids
      .map((sectorId) => {
        const fallbackDefinition = getSectorDefinitionById(sectorId)
        if (!fallbackDefinition) return null

        const apiSector = apiById.get(sectorId)
        const label = apiSector?.sector_description?.trim() || fallbackDefinition.label

        return {
          ...fallbackDefinition,
          label,
        }
      })
      .filter((sector): sector is NationalBudgetSectorDefinition => Boolean(sector))
  }, [availableBudgetSectors, budgetSectorsError])

  const documentBudgetSections = useMemo(() => {
    const accountCategory: NationalBudgetAccountCategory = effectiveFilter.account_category ?? 'ch'

    return DOCUMENT_BUDGET_SECTION_CONFIGS.map((config): BudgetExplorerSectionDefinition | null => {
      const fundingSourceKeys = config.fundingSourceKeysByAccountCategory[accountCategory]
      const fundingSourceIds = fundingSourceKeys
        .map((sourceKey) => fundingSourceIdsByKey[sourceKey])
        .filter((sourceId): sourceId is string => Boolean(sourceId))

      // Avoid rendering broad incorrect sections if any required source mapping is unavailable.
      if (fundingSourceIds.length !== fundingSourceKeys.length) return null

      const baseSectorFilter = buildNationalBudgetSectorBaseFilter(effectiveFilter, '1', { fundingSourceIdsByKey })

      return {
        id: config.id,
        label: config.label,
        badge: config.badge,
        order: config.order,
        includeInTotal: false,
        baseFilter: {
          ...baseSectorFilter,
          budget_sector_ids: config.budgetSectorIdsByAccountCategory[accountCategory],
          funding_source_ids: fundingSourceIds.length > 0 ? fundingSourceIds : undefined,
        },
      }
    }).filter((section): section is BudgetExplorerSectionDefinition => Boolean(section))
  }, [effectiveFilter, fundingSourceIdsByKey])

  const sectionDefinitions = useMemo(() => {
    const sectorSections: BudgetExplorerSectionDefinition[] = visibleSectors.map((sector) => ({
      id: sector.id,
      label: sector.label,
      badge: sector.badge,
      order: sector.order,
      sectorIdForRules: sector.id,
      includeInTotal: true,
      baseFilter: buildNationalBudgetSectorBaseFilter(effectiveFilter, sector.id, { fundingSourceIdsByKey }),
    }))

    return [...sectorSections, ...documentBudgetSections].sort((a, b) => a.order - b.order)
  }, [documentBudgetSections, effectiveFilter, fundingSourceIdsByKey, visibleSectors])

  const sectorQueries = useQueries({
    queries: sectionDefinitions.map((section) => ({
      queryKey: ['budget-explorer', 'native-sector-aggregated-line-items', section.id, filterHash, fundingSourceIdsByKeyHash],
      queryFn: ({ signal }) => fetchCompleteAggregatedLineItems(section.baseFilter, signal),
      staleTime: convertDaysToMs(3),
      gcTime: convertDaysToMs(3),
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
      enabled: sectionDefinitions.length > 0 && !isLoadingFundingSources,
    })),
  })

  const sectorSections = useMemo(() => {
    return sectionDefinitions.map((section, index) => {
      const query = sectorQueries[index]
      const nodes: AggregatedNode[] = (query?.data?.nodes ?? []).map((node) => ({
        fn_c: node.fn_c,
        fn_n: node.fn_n,
        ec_c: node.ec_c,
        ec_n: node.ec_n,
        amount: node.amount,
        count: node.count,
      }))

      const accountCategory: NationalBudgetAccountCategory = effectiveFilter.account_category ?? 'ch'
      const formulaRules = section.sectorIdForRules
        ? getFormulaRulesForSector(section.sectorIdForRules, accountCategory)
        : []
      const lineItemsFilter = buildNationalBudgetLineItemsFilter(section.baseFilter, {
        sectorId: section.sectorIdForRules ?? section.id,
        rules: formulaRules,
        transferFilter: search.transferFilter,
      })
      const excludeEconomicPrefixes = lineItemsFilter.exclude?.economic_prefixes ?? []
      const excludeFunctionalPrefixes = lineItemsFilter.exclude?.functional_prefixes ?? []

      return {
        section,
        nodes,
        lineItemsFilter,
        excludeEconomicPrefixes,
        excludeFunctionalPrefixes,
        isLoading: query?.isLoading ?? false,
        hasError: Boolean(query?.error),
      }
    })
  }, [effectiveFilter.account_category, search.transferFilter, sectionDefinitions, sectorQueries])

  const totalSection = useMemo(() => {
    const totalEligibleSections = filterSectionsIncludedInInformativeTotal(sectorSections)
    if (totalEligibleSections.length === 0) return null

    const mergedNodes = mergeNationalBudgetSectionNodes(totalEligibleSections.map((sectionData) => sectionData.nodes))
    const totalLineItemsFilter = buildTotalBudgetLineItemsFilter({
      baseFilter: effectiveFilter,
      sectionLineItemsFilters: totalEligibleSections.map((sectionData) => sectionData.lineItemsFilter),
      transferFilter: search.transferFilter,
    })
    const helperText = search.transferFilter === 'no-transfers'
      ? 'Totalul însumează cele 5 componente principale vizibile, fără secțiunile documentare suplimentare și fără transferurile interne. Rămâne un agregat informativ, nu consolidarea oficială BGC.'
      : 'Totalul însumează cele 5 componente principale vizibile, fără secțiunile documentare suplimentare. Cu transferurile interne incluse, poate depăși consolidarea oficială BGC.'

    return {
      id: 'total-budget',
      label: 'Total buget',
      badge: 'Agregat informativ',
      lineItemsFilter: totalLineItemsFilter,
      nodes: mergedNodes,
      excludeEconomicPrefixes: totalLineItemsFilter.exclude?.economic_prefixes ?? [],
      excludeFunctionalPrefixes: totalLineItemsFilter.exclude?.functional_prefixes ?? [],
      isLoading: totalEligibleSections.some((sectionData) => sectionData.isLoading),
      hasError: totalEligibleSections.some((sectionData) => sectionData.hasError),
      helperText,
    }
  }, [effectiveFilter, search.transferFilter, sectorSections])

  const analyticsError = sectorQueries.find((query) => query.error instanceof Error)?.error

  const nextAccountCategory = effectiveFilter.account_category === 'ch' ? 'vn' : 'ch'
  const quickSwitchLabel = nextAccountCategory === 'vn' ? 'Vezi venituri' : 'Vezi cheltuieli'

  return (
    <div className="px-4 lg:px-6 py-4">
      <FloatingQuickNav
        mapViewType="UAT"
        mapActive
        tableActive
        chartActive
        filterInput={effectiveFilter}
      />
      <div className="w-full max-w-[1200px] mx-auto space-y-6 lg:space-y-8">
        <BudgetExplorerHeader state={search} onChange={handleFilterChange} />
        {analyticsError instanceof Error && <BudgetAnalyticsError error={analyticsError} />}

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-balance">
            <Trans>National Budget</Trans>
          </h1>
          <p className="text-sm text-muted-foreground">
            <Trans>Budget Distribution</Trans> {periodLabel}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Nivel de detaliu</p>
            <ToggleGroup
              type="single"
              value={search.depth}
              onValueChange={(value: 'chapter' | 'subchapter' | 'paragraph') => {
                if (!value) return
                handleFilterChange({ depth: value })
              }}
              variant="outline"
              size="default"
              className="w-full sm:w-auto justify-start"
            >
              <ToggleGroupItem value="chapter" className="data-[state=on]:bg-foreground data-[state=on]:text-background">
                <Trans>Chapter</Trans>
              </ToggleGroupItem>
              <ToggleGroupItem value="subchapter" className="data-[state=on]:bg-foreground data-[state=on]:text-background">
                <Trans>Subchapter</Trans>
              </ToggleGroupItem>
              <ToggleGroupItem value="paragraph" className="data-[state=on]:bg-foreground data-[state=on]:text-background">
                <Trans>Paragraph</Trans>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Transferuri</p>
            <ToggleGroup
              type="single"
              value={search.transferFilter}
              onValueChange={(value) => {
                if (value !== 'all' && value !== 'no-transfers') return
                handleFilterChange({ transferFilter: value as NationalBudgetTransferFilter })
              }}
              variant="outline"
              size="default"
              className="w-full sm:w-auto justify-start"
            >
              <ToggleGroupItem value="all" className="data-[state=on]:bg-foreground data-[state=on]:text-background">
                Include transferuri
              </ToggleGroupItem>
              <ToggleGroupItem value="no-transfers" className="data-[state=on]:bg-foreground data-[state=on]:text-background">
                Exclude transferuri
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {!isMainDisclaimerCollapsed ? (
          <NationalBudgetDisclaimerCard
            readMoreHref="#budget-explanations"
            onClose={() => {
              setIsMainDisclaimerCollapsed(true)
            }}
          />
        ) : null}

        {isLoadingBudgetSectors ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                <Trans>Loading budget sectors…</Trans>
              </p>
            </CardContent>
          </Card>
        ) : null}

        {budgetSectorsError ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-red-500">
                <Trans>Failed to load budget sectors. Falling back to predefined sectors 1-5.</Trans>
              </p>
            </CardContent>
          </Card>
        ) : null}

        {totalSection ? (
          <NationalBudgetSectorSection
            key={`${totalSection.id}-${effectiveTreemapPrimary}-${search.depth}-${search.transferFilter}-${parsedTreemapPath.join('.')}`}
            sectorId={totalSection.id}
            sectorLabel={totalSection.label}
            sectorBadge={totalSection.badge}
            periodLabel={periodLabel}
            accountCategory={effectiveFilter.account_category ?? 'ch'}
            filter={effectiveFilter}
            lineItemsFilter={totalSection.lineItemsFilter}
            treemapPrimary={effectiveTreemapPrimary}
            treemapDepth={search.depth}
            treemapPath={parsedTreemapPath}
            nodes={totalSection.nodes}
            excludeEconomicPrefixes={totalSection.excludeEconomicPrefixes}
            excludeFunctionalPrefixes={totalSection.excludeFunctionalPrefixes}
            deepLinkTransferFilter={search.transferFilter}
            sectionDescription={totalSection.helperText}
            isLoading={totalSection.isLoading}
            hasError={totalSection.hasError}
          />
        ) : null}

        {sectorSections.map(
          ({
            section,
            nodes,
            lineItemsFilter,
            excludeEconomicPrefixes,
            excludeFunctionalPrefixes,
            isLoading,
            hasError,
          }) => (
          <NationalBudgetSectorSection
            key={`${section.id}-${effectiveTreemapPrimary}-${search.depth}-${search.transferFilter}-${parsedTreemapPath.join('.')}`}
            sectorId={section.id}
            sectorLabel={section.label}
            sectorBadge={section.badge}
            periodLabel={periodLabel}
            accountCategory={effectiveFilter.account_category ?? 'ch'}
            filter={effectiveFilter}
            lineItemsFilter={lineItemsFilter}
            treemapPrimary={effectiveTreemapPrimary}
            treemapDepth={search.depth}
            treemapPath={parsedTreemapPath}
            nodes={nodes}
            excludeEconomicPrefixes={excludeEconomicPrefixes}
            excludeFunctionalPrefixes={excludeFunctionalPrefixes}
            deepLinkTransferFilter={search.transferFilter}
            isLoading={isLoading}
            hasError={hasError}
          />
        ))}

        <div id="budget-explanations" className="space-y-6 scroll-mt-24">
          <Button
            type="button"
            size="lg"
            className="w-full sm:w-auto text-base px-6 py-6"
            onClick={() => {
              handleFilterChange({
                filter: {
                  ...effectiveFilter,
                  account_category: nextAccountCategory,
                } as BudgetExplorerState['filter'],
                primary: nextAccountCategory === 'vn' ? 'fn' : search.primary,
              })
            }}
          >
            {quickSwitchLabel}
          </Button>

          {isMainDisclaimerCollapsed ? <NationalBudgetDisclaimerCard /> : null}

          <NationalBudgetWhyDifferentCard />
        </div>
      </div>
    </div>
  )
}
