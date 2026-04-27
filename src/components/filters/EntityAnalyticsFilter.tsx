import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FilterListContainer } from './base-filter/FilterListContainer'
import { FunctionalClassificationList } from './functional-classification-filter'
import { EconomicClassificationList } from './economic-classification-filter'
import { FilterRangeContainer } from './base-filter/FilterRangeContainer'
import { AmountRangeFilter } from './amount-range-filter'
import { Calendar, ChartBar, Tags, SlidersHorizontal, MapPinned, Building2, EuroIcon, MapPin, XCircle, ArrowUpDown, Divide, Globe, MinusCircle } from 'lucide-react'
import { useMemo, useEffect, useState } from 'react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { useEntityAnalyticsFilter } from '@/hooks/useEntityAnalyticsFilter'
import type { OptionItem } from './base-filter/interfaces'
import { CountyList } from './county-filter/CountyList'
import { BudgetSectorList } from './budget-sector-filter/BudgetSectorFilter'
import { FundingSourceList } from './funding-source-filter/FundingSourceFilter'
import { UatList } from './uat-filter/UatList'
import { EntityTypeList } from './entity-type-filter/EntityTypeList'
import { EntityList } from './entity-filter/EntityList'
import { useEntityLabel, useUatLabel, useEconomicClassificationLabel, useFunctionalClassificationLabel, useBudgetSectorLabel, useFundingSourceLabel, useEntityTypeLabel } from '@/hooks/filters/useFilterLabels'
import { Button } from '@/components/ui/button'
import { FilterPrefixContainer, PrefixFilter } from './prefix-filter'
import { FilterRadioContainer } from './base-filter/FilterRadioContainer'
import { FilterContainer } from './base-filter/FilterContainer'
import { ReportTypeFilter } from './report-type-filter'
import { IsUatFilter } from './flags-filter'
import { ViewTypeRadioGroup } from './ViewTypeRadioGroup'
import { TableIcon, BarChart2Icon } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { Trans } from "@lingui/react/macro";
import { PeriodFilter } from './period-filter/PeriodFilter'
import { ReportPeriodInput } from '@/schemas/reporting'
import { getPeriodTags } from '@/lib/period-utils';
import { useUserCurrency } from '@/lib/hooks/useUserCurrency'
import { useUserInflationAdjusted } from '@/lib/hooks/useUserInflationAdjusted'
import { getEconomicPrefixLabel, getFunctionalPrefixLabel } from '@/lib/chart-filter-utils'
import { NormalizationModeSelect } from '@/components/normalization/normalization-mode-select'
import { getNormalizationUnit } from '@/lib/utils'
import type { AnalyticsFilterType } from '@/schemas/charts'

export function EntityAnalyticsFilter() {
  const { filter, setFilter, resetFilter, view, setView } = useEntityAnalyticsFilter()
  const [userCurrency, setUserCurrency] = useUserCurrency()
  const [userInflationAdjusted, setUserInflationAdjusted] = useUserInflationAdjusted()

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

    if (shouldPatchFilter) setFilter(nextFilterPatch)
  }, [
    filter.currency,
    filter.inflation_adjusted,
    filter.normalization,
    setFilter,
    setUserCurrency,
    setUserInflationAdjusted,
    userCurrency,
    userInflationAdjusted,
  ]);

  // Label stores (cache + API-backed)
  const entityLabelsStore = useEntityLabel((filter.entity_cuis ?? []) as string[])
  const uatLabelsStore = useUatLabel((filter.uat_ids ?? []).map((id) => String(id)))
  const economicLabelsStore = useEconomicClassificationLabel(filter.economic_codes ?? [])
  const functionalLabelsStore = useFunctionalClassificationLabel(filter.functional_codes ?? [])
  const budgetSectorLabelsStore = useBudgetSectorLabel(filter.budget_sector_ids ?? [])
  const fundingSourceLabelsStore = useFundingSourceLabel(filter.funding_source_ids ?? [])
  const entityTypeLabelsStore = useEntityTypeLabel()

  // Selected options builders
  const selectedUatOptions = useMemo<OptionItem<string | number>[]>(
    () => (filter.uat_ids ?? []).map((id) => ({ id, label: uatLabelsStore.map(String(id)) })),
    [filter.uat_ids, uatLabelsStore],
  )
  const selectedEntityOptions = useMemo<OptionItem<string>[]>(
    () => (filter.entity_cuis ?? []).map((cui) => ({ id: cui, label: entityLabelsStore.map(cui) })),
    [filter.entity_cuis, entityLabelsStore],
  )
  const mainCreditorLabelStore = useEntityLabel(filter.main_creditor_cui ? [filter.main_creditor_cui] as string[] : [])
  const selectedMainCreditorOption = useMemo<OptionItem<string>[]>(
    () => (filter.main_creditor_cui ? [{ id: filter.main_creditor_cui, label: mainCreditorLabelStore.map(filter.main_creditor_cui) }] : []),
    [filter.main_creditor_cui, mainCreditorLabelStore],
  )
  const selectedCountyOptions = useMemo<OptionItem<string>[]>(
    () => (filter.county_codes ?? []).map((c) => ({ id: c, label: String(c) })),
    [filter.county_codes],
  )
  const selectedEntityTypeOptions = useMemo<OptionItem<string>[]>(
    () => (filter.entity_types ?? []).map((id) => ({ id, label: entityTypeLabelsStore.map(id) })),
    [filter.entity_types, entityTypeLabelsStore],
  )
  const selectedFunctionalOptions = useMemo<OptionItem<string>[]>(
    () => (filter.functional_codes ?? []).map((code) => ({ id: code, label: functionalLabelsStore.map(code) })),
    [filter.functional_codes, functionalLabelsStore],
  )
  const selectedEconomicOptions = useMemo<OptionItem<string>[]>(
    () => (filter.economic_codes ?? []).map((code) => ({ id: code, label: economicLabelsStore.map(code) })),
    [filter.economic_codes, economicLabelsStore],
  )
  const selectedBudgetSectorOptions = useMemo<OptionItem<string | number>[]>(
    () => (filter.budget_sector_ids ?? []).map((id) => ({ id, label: budgetSectorLabelsStore.map(id) })),
    [filter.budget_sector_ids, budgetSectorLabelsStore],
  )
  const selectedFundingSourceOptions = useMemo<OptionItem<string | number>[]>(
    () => (filter.funding_source_ids ?? []).map((id) => ({ id, label: fundingSourceLabelsStore.map(id) })),
    [filter.funding_source_ids, fundingSourceLabelsStore],
  )

  // Updaters following LineItemsFilter behavior
  const updatePeriod = (period?: ReportPeriodInput) => {
    setFilter({ report_period: period as ReportPeriodInput | undefined })
  }

  const handleRemovePeriodTag = (tagToRemove: OptionItem) => {
    const { report_period } = filter;
    if (!report_period) return;

    if (report_period.selection.dates) {
      const newDates = report_period.selection.dates.filter(d => d !== tagToRemove.id);
      if (newDates.length > 0) {
        updatePeriod({ ...report_period, selection: { dates: newDates } as ReportPeriodInput['selection'] });
      } else {
        updatePeriod(undefined);
      }
    } else if (report_period.selection.interval) {
      updatePeriod(undefined);
    }
  };

  const periodTags = getPeriodTags(filter.report_period as ReportPeriodInput).map(tag => ({
    id: String(tag.value),
    label: String(tag.value),
  }));

  const updateUatOptions = (
    updater: OptionItem<string | number>[] | ((prev: OptionItem<string | number>[]) => OptionItem<string | number>[])
  ) => {
    const next = typeof updater === 'function' ? updater(selectedUatOptions) : updater
    uatLabelsStore.add(next.map(({ id, label }) => ({ id, label })))
    setFilter({ uat_ids: next.map((o) => String(o.id)) })
  }
  const updateEntityOptions = (
    updater: OptionItem<string | number>[] | ((prev: OptionItem<string | number>[]) => OptionItem<string | number>[]),
  ) => {
    const next = typeof updater === 'function' ? updater(selectedEntityOptions) : updater
    entityLabelsStore.add(next.map(({ id, label }) => ({ id, label })))
    setFilter({ entity_cuis: next.map((o) => String(o.id)) })
  }
  const setMainCreditor = (cui: string | undefined) => {
    setFilter({ main_creditor_cui: cui })
  }
  const updateCountyOptions = (
    updater: OptionItem<string | number>[] | ((prev: OptionItem<string | number>[]) => OptionItem<string | number>[]),
  ) => {
    const next = typeof updater === 'function' ? updater(selectedCountyOptions) : updater
    setFilter({ county_codes: next.map((o) => String(o.id)) })
  }
  const updateEntityTypeOptions = (
    updater: OptionItem<string | number>[] | ((prev: OptionItem<string | number>[]) => OptionItem<string | number>[]),
  ) => {
    const next = typeof updater === 'function' ? updater(selectedEntityTypeOptions) : updater
    setFilter({ entity_types: next.map((o) => String(o.id)) })
  }
  const updateFunctionalOptions = (
    updater: OptionItem<string | number>[] | ((prev: OptionItem<string | number>[]) => OptionItem<string | number>[]),
  ) => {
    const next = typeof updater === 'function' ? updater(selectedFunctionalOptions) : updater
    functionalLabelsStore.add(next.map(({ id, label }) => ({ id, label })))
    setFilter({ functional_codes: next.map((o) => String(o.id)) })
  }
  const updateEconomicOptions = (
    updater: OptionItem<string | number>[] | ((prev: OptionItem<string | number>[]) => OptionItem<string | number>[]),
  ) => {
    const next = typeof updater === 'function' ? updater(selectedEconomicOptions) : updater
    economicLabelsStore.add(next.map(({ id, label }) => ({ id, label })))
    setFilter({ economic_codes: next.map((o) => String(o.id)) })
  }
  const updateFunctionalPrefixes = (value: string[] | undefined) => setFilter({ functional_prefixes: value && value.length > 0 ? value : undefined })
  const updateEconomicPrefixes = (value: string[] | undefined) => setFilter({ economic_prefixes: value && value.length > 0 ? value : undefined })
  const updateBudgetSectorOptions = (
    updater: OptionItem<string | number>[] | ((prev: OptionItem<string | number>[]) => OptionItem<string | number>[]),
  ) => {
    const next = typeof updater === 'function' ? updater(selectedBudgetSectorOptions) : updater
    budgetSectorLabelsStore.add(next.map(({ id, label }) => ({ id, label })))
    setFilter({ budget_sector_ids: next.map((o) => String(o.id)) })
  }
  const updateFundingSourceOptions = (
    updater: OptionItem<string | number>[] | ((prev: OptionItem<string | number>[]) => OptionItem<string | number>[]),
  ) => {
    const next = typeof updater === 'function' ? updater(selectedFundingSourceOptions) : updater
    fundingSourceLabelsStore.add(next.map(({ id, label }) => ({ id, label })))
    setFilter({ funding_source_ids: next.map((o) => String(o.id)) })
  }

  const updateAccountCategory = (accountCategory: 'ch' | 'vn') => setFilter({ account_category: accountCategory })
  const updateNormalization = (normalization: AnalyticsFilterType['normalization']) => setFilter({ normalization })
  const updateMinAmount = (minAmount: string | undefined) => setFilter({ aggregate_min_amount: minAmount ? Number(minAmount) : undefined })
  const updateMaxAmount = (maxAmount: string | undefined) => setFilter({ aggregate_max_amount: maxAmount ? Number(maxAmount) : undefined })
  const updateMinPopulation = (min: string | undefined) => setFilter({ min_population: min ? Number(min) : undefined })
  const updateMaxPopulation = (max: string | undefined) => setFilter({ max_population: max ? Number(max) : undefined })
  const setReportType = (value: string | undefined) => setFilter({ report_type: value as 'Executie bugetara agregata la nivel de ordonator principal' | 'Executie bugetara detaliata' })
  const setIsUat = (value: boolean | undefined) => setFilter({ is_uat: value })

  const amountUnit = useMemo(
    () => getNormalizationUnit({ normalization: filter.normalization as 'total' | 'per_capita' | 'percent_gdp' | 'total_euro' | 'per_capita_euro', currency: userCurrency as 'RON' | 'EUR' | 'USD' }),
    [filter.normalization, userCurrency],
  )

  // ============================================================================
  // EXCLUDE FILTERS STATE MANAGEMENT
  // ============================================================================

  const exclude = filter.exclude ?? {}

  // Label stores for exclude filters
  const excludeEntityLabelsStore = useEntityLabel((exclude.entity_cuis ?? []) as string[])
  const excludeUatLabelsStore = useUatLabel((exclude.uat_ids ?? []).map(String))
  const excludeEconomicLabelsStore = useEconomicClassificationLabel(exclude.economic_codes ?? [])
  const excludeFunctionalLabelsStore = useFunctionalClassificationLabel(exclude.functional_codes ?? [])
  const excludeBudgetSectorLabelsStore = useBudgetSectorLabel(exclude.budget_sector_ids ?? [])
  const excludeFundingSourceLabelsStore = useFundingSourceLabel(exclude.funding_source_ids ?? [])

  // Exclude filter selected options
  const excludeSelectedEntityOptions = useMemo<OptionItem<string>[]>(
    () => (exclude.entity_cuis ?? []).map((cui) => ({ id: cui, label: excludeEntityLabelsStore.map(cui) })),
    [exclude.entity_cuis, excludeEntityLabelsStore],
  )

  const excludeSelectedMainCreditorOption = useMemo<OptionItem<string>[]>(
    () => (exclude.main_creditor_cui ? [{ id: exclude.main_creditor_cui, label: excludeEntityLabelsStore.map(exclude.main_creditor_cui) }] : []),
    [exclude.main_creditor_cui, excludeEntityLabelsStore],
  )

  const excludeSelectedUatOptions = useMemo<OptionItem<string | number>[]>(
    () => (exclude.uat_ids ?? []).map((id) => ({ id, label: excludeUatLabelsStore.map(String(id)) })),
    [exclude.uat_ids, excludeUatLabelsStore],
  )

  const excludeSelectedCountyOptions = useMemo<OptionItem<string>[]>(
    () => (exclude.county_codes ?? []).map((c) => ({ id: c, label: String(c) })),
    [exclude.county_codes],
  )

  const excludeSelectedEntityTypeOptions = useMemo<OptionItem<string>[]>(
    () => (exclude.entity_types ?? []).map((id) => ({ id, label: entityTypeLabelsStore.map(id) })),
    [exclude.entity_types, entityTypeLabelsStore],
  )

  const excludeSelectedFunctionalOptions = useMemo<OptionItem<string>[]>(
    () => (exclude.functional_codes ?? []).map((code) => ({ id: code, label: excludeFunctionalLabelsStore.map(code) })),
    [exclude.functional_codes, excludeFunctionalLabelsStore],
  )

  const excludeSelectedEconomicOptions = useMemo<OptionItem<string>[]>(
    () => (exclude.economic_codes ?? []).map((code) => ({ id: code, label: excludeEconomicLabelsStore.map(code) })),
    [exclude.economic_codes, excludeEconomicLabelsStore],
  )

  const excludeSelectedBudgetSectorOptions = useMemo<OptionItem<string | number>[]>(
    () => (exclude.budget_sector_ids ?? []).map((id) => ({ id, label: excludeBudgetSectorLabelsStore.map(id) })),
    [exclude.budget_sector_ids, excludeBudgetSectorLabelsStore],
  )

  const excludeSelectedFundingSourceOptions = useMemo<OptionItem<string | number>[]>(
    () => (exclude.funding_source_ids ?? []).map((id) => ({ id, label: excludeFundingSourceLabelsStore.map(id) })),
    [exclude.funding_source_ids, excludeFundingSourceLabelsStore],
  )

  // Exclude filter updaters
  const updateExcludeEntityOptions = (updater: OptionItem<string | number>[] | ((prev: OptionItem<string | number>[]) => OptionItem<string | number>[])) => {
    const next = typeof updater === 'function' ? updater(excludeSelectedEntityOptions) : updater
    excludeEntityLabelsStore.add(next.map(({ id, label }) => ({ id, label })))
    const newExclude = { ...exclude, entity_cuis: next.map((o) => String(o.id)) }
    setFilter({ exclude: newExclude })
  }

  const setExcludeMainCreditor = (cui: string | undefined) => {
    const newExclude = { ...exclude, main_creditor_cui: cui }
    setFilter({ exclude: newExclude })
  }

  const updateExcludeUatOptions = (updater: OptionItem<string | number>[] | ((prev: OptionItem<string | number>[]) => OptionItem<string | number>[])) => {
    const next = typeof updater === 'function' ? updater(excludeSelectedUatOptions) : updater
    excludeUatLabelsStore.add(next.map(({ id, label }) => ({ id, label })))
    const newExclude = { ...exclude, uat_ids: next.map((o) => String(o.id)) }
    setFilter({ exclude: newExclude })
  }

  const updateExcludeCountyOptions = (updater: OptionItem<string | number>[] | ((prev: OptionItem<string | number>[]) => OptionItem<string | number>[])) => {
    const next = typeof updater === 'function' ? updater(excludeSelectedCountyOptions) : updater
    const newExclude = { ...exclude, county_codes: next.map((o) => String(o.id)) }
    setFilter({ exclude: newExclude })
  }

  const updateExcludeEntityTypeOptions = (updater: OptionItem<string | number>[] | ((prev: OptionItem<string | number>[]) => OptionItem<string | number>[])) => {
    const next = typeof updater === 'function' ? updater(excludeSelectedEntityTypeOptions) : updater
    const newExclude = { ...exclude, entity_types: next.map((o) => String(o.id)) }
    setFilter({ exclude: newExclude })
  }

  const updateExcludeFunctionalOptions = (updater: OptionItem<string | number>[] | ((prev: OptionItem<string | number>[]) => OptionItem<string | number>[])) => {
    const next = typeof updater === 'function' ? updater(excludeSelectedFunctionalOptions) : updater
    excludeFunctionalLabelsStore.add(next.map(({ id, label }) => ({ id, label })))
    const newExclude = { ...exclude, functional_codes: next.map((o) => String(o.id)) }
    setFilter({ exclude: newExclude })
  }

  const updateExcludeEconomicOptions = (updater: OptionItem<string | number>[] | ((prev: OptionItem<string | number>[]) => OptionItem<string | number>[])) => {
    const next = typeof updater === 'function' ? updater(excludeSelectedEconomicOptions) : updater
    excludeEconomicLabelsStore.add(next.map(({ id, label }) => ({ id, label })))
    const newExclude = { ...exclude, economic_codes: next.map((o) => String(o.id)) }
    setFilter({ exclude: newExclude })
  }

  const updateExcludeBudgetSectorOptions = (updater: OptionItem<string | number>[] | ((prev: OptionItem<string | number>[]) => OptionItem<string | number>[])) => {
    const next = typeof updater === 'function' ? updater(excludeSelectedBudgetSectorOptions) : updater
    excludeBudgetSectorLabelsStore.add(next.map(({ id, label }) => ({ id, label })))
    const newExclude = { ...exclude, budget_sector_ids: next.map((o) => String(o.id)) }
    setFilter({ exclude: newExclude })
  }

  const updateExcludeFundingSourceOptions = (updater: OptionItem<string | number>[] | ((prev: OptionItem<string | number>[]) => OptionItem<string | number>[])) => {
    const next = typeof updater === 'function' ? updater(excludeSelectedFundingSourceOptions) : updater
    excludeFundingSourceLabelsStore.add(next.map(({ id, label }) => ({ id, label })))
    const newExclude = { ...exclude, funding_source_ids: next.map((o) => String(o.id)) }
    setFilter({ exclude: newExclude })
  }

  const updateExcludeFunctionalPrefixes = (value: string[] | undefined) => {
    const newExclude = { ...exclude, functional_prefixes: value && value.length > 0 ? value : undefined }
    setFilter({ exclude: newExclude })
  }

  const updateExcludeEconomicPrefixes = (value: string[] | undefined) => {
    const newExclude = { ...exclude, economic_prefixes: value && value.length > 0 ? value : undefined }
    setFilter({ exclude: newExclude })
  }

  const clearAllExcludeFilters = () => {
    setFilter({ exclude: undefined })
  }

  // Count selected filters similar to LineItemsFilter
  const totalSelectedFilters =
    (filter.report_period ? 1 : 0) +
    [
      selectedEntityOptions,
      selectedMainCreditorOption,
      selectedUatOptions,
      selectedCountyOptions,
      selectedEntityTypeOptions,
      selectedFunctionalOptions,
      selectedEconomicOptions,
      selectedBudgetSectorOptions,
      selectedFundingSourceOptions,
    ].reduce((count, options) => count + options.length, 0) +
    (filter.aggregate_min_amount !== undefined ? 1 : 0) +
    (filter.aggregate_max_amount !== undefined ? 1 : 0) +
    (filter.min_population !== undefined ? 1 : 0) +
    (filter.max_population !== undefined ? 1 : 0) +
    (filter.report_type ? 1 : 0) +
    (filter.is_uat !== undefined ? 1 : 0) +
    (filter.functional_prefixes?.length ?? 0) +
    (filter.economic_prefixes?.length ?? 0)

  const totalExcludeFilters =
    [
      excludeSelectedEntityOptions,
      excludeSelectedMainCreditorOption,
      excludeSelectedUatOptions,
      excludeSelectedCountyOptions,
      excludeSelectedEntityTypeOptions,
      excludeSelectedFunctionalOptions,
      excludeSelectedEconomicOptions,
      excludeSelectedBudgetSectorOptions,
      excludeSelectedFundingSourceOptions,
    ].reduce((count, options) => count + options.length, 0) +
    (exclude.functional_prefixes?.length ?? 0) +
    (exclude.economic_prefixes?.length ?? 0)

  // Accordion open state - auto-open when there are active exclude filters
  const [excludeValue, setExcludeValue] = useState<string>('')

  useEffect(() => {
    if (totalExcludeFilters > 0) {
      setExcludeValue((prev) => (prev === '' ? 'exclude' : prev))
      return
    }
    setExcludeValue('')
  }, [totalExcludeFilters])

  const accordionValue = excludeValue

  return (
    <Card className="flex flex-col w-full h-full">
      <CardHeader className="sticky top-0 z-10 bg-background py-4 px-6 border-b flex-shrink-0">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold"><Trans>Filters</Trans></CardTitle>
          {(totalSelectedFilters > 0 || totalExcludeFilters > 0) && (
            <Button variant="ghost" size="sm" onClick={resetFilter} className="text-sm">
              <XCircle className="w-4 h-4 mr-1" />
              <Trans>Clear filters</Trans> ({totalSelectedFilters + totalExcludeFilters})
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 min-h-0 p-0 space-y-1 overflow-y-auto">

        <div className="p-3 border-b">
          <h4 className="mb-2 text-sm font-medium flex items-center">
            <BarChart2Icon className="w-4 h-4 mr-2" />
            <Trans>View</Trans>
          </h4>
          <ViewTypeRadioGroup value={view} onChange={(v) => setView(v)} viewOptions={[
            { id: 'table', label: t`Table`, icon: TableIcon },
            { id: 'line-items', label: t`Line Items`, icon: BarChart2Icon },
          ]} />
        </div>
        <div className="p-3 border-b">
          <h4 className="mb-2 text-sm font-medium flex items-center">
            <ArrowUpDown className="w-4 h-4 mr-2" />
            <Trans>Revenues/Expenses</Trans>
          </h4>
          <ViewTypeRadioGroup
            value={filter.account_category}
            onChange={(accountCategory) => updateAccountCategory(accountCategory)}
            viewOptions={[
              { id: 'ch', label: t`Expenses` },
              { id: 'vn', label: t`Income` },
            ]}
          />
        </div>

                <div className="p-3 border-b" data-testid="entity-analytics-normalization-section">
                    <h4 className="mb-2 text-sm font-medium flex items-center">
                        <Divide className="w-4 h-4 mr-2" />
                        <Trans>Normalization</Trans>
                    </h4>
          <NormalizationModeSelect
            value={filter.normalization}
            allowPerCapita
            onChange={updateNormalization}
            triggerClassName="w-full"
            triggerTestId="entity-analytics-normalization-select"
          />
        </div>

        <FilterContainer
          title={t`Period`}
          icon={<Calendar className="w-4 h-4" />}
          selectedOptions={periodTags}
          onClearOption={handleRemovePeriodTag}
          onClearAll={() => updatePeriod(undefined)}
        >
          <PeriodFilter value={filter.report_period as ReportPeriodInput | undefined} onChange={updatePeriod} />
        </FilterContainer>

        <FilterListContainer
          title={t`Entities`}
          icon={<Building2 className="w-4 h-4" />}
          listComponent={EntityList}
          selected={selectedEntityOptions}
          setSelected={updateEntityOptions}
        />

        <FilterContainer
          title={t`Main Creditor`}
          icon={<Building2 className="w-4 h-4" />}
          selectedOptions={selectedMainCreditorOption}
          onClearOption={() => setMainCreditor(undefined)}
          onClearAll={() => setMainCreditor(undefined)}
        >
          <EntityList
            selectedOptions={selectedMainCreditorOption}
            toggleSelect={(option) => setMainCreditor(String(option.id))}
            pageSize={100}
          />
        </FilterContainer>

        <FilterListContainer
          title={t`UAT`}
          icon={<MapPin className="w-4 h-4" />}
          listComponent={UatList}
          selected={selectedUatOptions}
          setSelected={updateUatOptions}
        />

        <FilterListContainer
          title={t`County`}
          icon={<MapPinned className="w-4 h-4" />}
          listComponent={CountyList}
          selected={selectedCountyOptions}
          setSelected={updateCountyOptions}
        />

        <FilterListContainer
          title={t`Entity Type`}
          icon={<ChartBar className="w-4 h-4" />}
          listComponent={EntityTypeList}
          selected={selectedEntityTypeOptions}
          setSelected={updateEntityTypeOptions}
        />

        <FilterListContainer
          title={t`Functional Classification`}
          icon={<ChartBar className="w-4 h-4" />}
          listComponent={FunctionalClassificationList}
          selected={selectedFunctionalOptions}
          setSelected={updateFunctionalOptions}
        />

        <FilterPrefixContainer
          title={t`Functional Prefixes`}
          icon={<ChartBar className="w-4 h-4" />}
          prefixComponent={PrefixFilter}
          value={filter.functional_prefixes}
          onValueChange={updateFunctionalPrefixes}
          mapPrefixToLabel={getFunctionalPrefixLabel}
        />

        <FilterListContainer
          title={t`Economic Classification`}
          icon={<Tags className="w-4 h-4" />}
          listComponent={EconomicClassificationList}
          selected={selectedEconomicOptions}
          setSelected={updateEconomicOptions}
        />

        <FilterPrefixContainer
          title={t`Economic Prefixes`}
          icon={<Tags className="w-4 h-4" />}
          prefixComponent={PrefixFilter}
          value={filter.economic_prefixes}
          onValueChange={updateEconomicPrefixes}
          mapPrefixToLabel={getEconomicPrefixLabel}
        />

        <FilterListContainer
          title={t`Budget Sector`}
          icon={<Building2 className="w-4 h-4" />}
          listComponent={BudgetSectorList}
          selected={selectedBudgetSectorOptions}
          setSelected={updateBudgetSectorOptions}
        />

        <FilterListContainer
          title={t`Funding Source`}
          icon={<EuroIcon className="w-4 h-4" />}
          listComponent={FundingSourceList}
          selected={selectedFundingSourceOptions}
          setSelected={updateFundingSourceOptions}
        />

        <FilterRadioContainer
          title={t`Report Type`}
          icon={<ArrowUpDown className="w-4 h-4" />}
          selectedOption={(filter.report_type) ? { id: filter.report_type, label: filter.report_type } : null}
          onClear={() => setReportType('Executie bugetara agregata la nivel de ordonator principal')}
        >
          <ReportTypeFilter reportType={filter.report_type} setReportType={setReportType} />
        </FilterRadioContainer>

        <FilterContainer
          title={t`Is UAT`}
          icon={<ArrowUpDown className="w-4 h-4" />}
          selectedOptions={filter.is_uat === undefined ? [] : [{ id: 'is_uat', label: filter.is_uat ? t`UAT: Yes` : t`UAT: No` }]}
          onClearOption={() => setIsUat(undefined)}
          onClearAll={() => setIsUat(undefined)}
        >
          <IsUatFilter isUat={filter.is_uat} setIsUat={setIsUat} />
        </FilterContainer>

        <FilterRangeContainer
          title={t`Amount Range`}
          icon={<SlidersHorizontal className="w-4 h-4" />}
          unit={amountUnit}
          rangeComponent={AmountRangeFilter}
          minValue={filter.aggregate_min_amount}
          onMinValueChange={updateMinAmount}
          maxValue={filter.aggregate_max_amount}
          onMaxValueChange={updateMaxAmount}
        />

        <FilterRangeContainer
          title={t`Population Range`}
          icon={<Globe className="w-4 h-4" />}
          unit="people"
          rangeComponent={AmountRangeFilter}
          minValue={filter.min_population}
          onMinValueChange={updateMinPopulation}
          maxValue={filter.max_population}
          onMaxValueChange={updateMaxPopulation}
          maxValueAllowed={100_000_000}
        />

        {/* Exclude Filters Section (Advanced) */}
        <div className="border-t mt-2">
          <Accordion type="single" collapsible value={accordionValue} onValueChange={setExcludeValue}>
            <AccordionItem value="exclude" className="border-none">
              <div className="flex items-center justify-between gap-2 px-4 py-3">
                <AccordionTrigger className="flex-1 text-sm font-medium hover:bg-muted/50 hover:no-underline px-0">
                  <div className="flex items-center gap-2">
                    <MinusCircle className="w-4 h-4 text-destructive" />
                    <span>
                      <Trans>Exclude Filters</Trans>
                    </span>
                    {totalExcludeFilters > 0 && (
                      <Badge variant="destructive" className="rounded-full px-2 text-xs">
                        {totalExcludeFilters}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                {totalExcludeFilters > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-destructive hover:text-destructive h-auto py-1 px-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearAllExcludeFilters();
                    }}
                  >
                    <XCircle className="w-3 h-3 mr-1" />
                    <Trans>Clear all</Trans>
                  </Button>
                )}
              </div>
              <AccordionContent>
                <div className="px-4 py-2 text-xs text-muted-foreground bg-muted/30 border-b">
                  <Trans>Filters marked as exclude will remove data matching these criteria from the results.</Trans>
                </div>

                {/* Exclude filter components - mirror the include filters */}
                <div className="bg-muted/10">
                  <FilterListContainer
                    title={`${t`Exclude`} ${t`Entities`}`}
                    icon={<Building2 className="w-4 h-4 text-destructive" />}
                    listComponent={EntityList}
                    selected={excludeSelectedEntityOptions}
                    setSelected={updateExcludeEntityOptions}
                  />

                  <FilterContainer
                    title={`${t`Exclude`} ${t`Main Creditor`}`}
                    icon={<Building2 className="w-4 h-4 text-destructive" />}
                    selectedOptions={excludeSelectedMainCreditorOption}
                    onClearOption={() => setExcludeMainCreditor(undefined)}
                    onClearAll={() => setExcludeMainCreditor(undefined)}
                  >
                    <EntityList
                      selectedOptions={excludeSelectedMainCreditorOption}
                      toggleSelect={(option) => setExcludeMainCreditor(String(option.id))}
                      pageSize={100}
                    />
                  </FilterContainer>

                  <FilterListContainer
                    title={`${t`Exclude`} ${t`UAT`}`}
                    icon={<MapPin className="w-4 h-4 text-destructive" />}
                    listComponent={UatList}
                    selected={excludeSelectedUatOptions}
                    setSelected={updateExcludeUatOptions}
                  />

                  <FilterListContainer
                    title={`${t`Exclude`} ${t`County`}`}
                    icon={<MapPinned className="w-4 h-4 text-destructive" />}
                    listComponent={CountyList}
                    selected={excludeSelectedCountyOptions}
                    setSelected={updateExcludeCountyOptions}
                  />

                  <FilterListContainer
                    title={`${t`Exclude`} ${t`Entity Type`}`}
                    icon={<ChartBar className="w-4 h-4 text-destructive" />}
                    listComponent={EntityTypeList}
                    selected={excludeSelectedEntityTypeOptions}
                    setSelected={updateExcludeEntityTypeOptions}
                  />

                  <FilterListContainer
                    title={`${t`Exclude`} ${t`Functional Classification`}`}
                    icon={<ChartBar className="w-4 h-4 text-destructive" />}
                    listComponent={FunctionalClassificationList}
                    selected={excludeSelectedFunctionalOptions}
                    setSelected={updateExcludeFunctionalOptions}
                  />

                  <FilterPrefixContainer
                    title={`${t`Exclude`} ${t`Functional Prefixes`}`}
                    icon={<ChartBar className="w-4 h-4 text-destructive" />}
                    prefixComponent={PrefixFilter}
                    value={exclude.functional_prefixes}
                    onValueChange={updateExcludeFunctionalPrefixes}
                    mapPrefixToLabel={getFunctionalPrefixLabel}
                  />

                  <FilterListContainer
                    title={`${t`Exclude`} ${t`Economic Classification`}`}
                    icon={<Tags className="w-4 h-4 text-destructive" />}
                    listComponent={EconomicClassificationList}
                    selected={excludeSelectedEconomicOptions}
                    setSelected={updateExcludeEconomicOptions}
                  />

                  <FilterPrefixContainer
                    title={`${t`Exclude`} ${t`Economic Prefixes`}`}
                    icon={<Tags className="w-4 h-4 text-destructive" />}
                    prefixComponent={PrefixFilter}
                    value={exclude.economic_prefixes}
                    onValueChange={updateExcludeEconomicPrefixes}
                    mapPrefixToLabel={getEconomicPrefixLabel}
                  />

                  <FilterListContainer
                    title={`${t`Exclude`} ${t`Budget Sector`}`}
                    icon={<Building2 className="w-4 h-4 text-destructive" />}
                    listComponent={BudgetSectorList}
                    selected={excludeSelectedBudgetSectorOptions}
                    setSelected={updateExcludeBudgetSectorOptions}
                  />

                  <FilterListContainer
                    title={`${t`Exclude`} ${t`Funding Source`}`}
                    icon={<EuroIcon className="w-4 h-4 text-destructive" />}
                    listComponent={FundingSourceList}
                    selected={excludeSelectedFundingSourceOptions}
                    setSelected={updateExcludeFundingSourceOptions}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </CardContent>
    </Card>
  )
}
