import { EntityDetailsData, filterLineItems } from "@/lib/api/entities";
import { EntityFinancialSummary } from "../EntityFinancialSummary"
import { EntityFinancialTrends } from "../EntityFinancialTrends"
import { EntityLineItemsTabs } from "../EntityLineItemsTabs"
import { LineItemsAnalytics } from "../LineItemsAnalytics"
import type { GqlReportType, ReportPeriodInput, ReportPeriodType, TMonth, TQuarter } from "@/schemas/reporting";
import { getYearLabel } from "../utils";
import { toExecutionReportType, toReportTypeValue } from "@/schemas/reporting";
import { useEntityExecutionLineItems } from "@/lib/hooks/useEntityDetails";
import { EntityReportsSummary } from "../EntityReportsSummary";
import { entityDetailsQueryOptions } from '@/lib/hooks/useEntityDetails';
import { getInitialFilterState, makeTrendPeriod } from '@/schemas/reporting';
import { useDebouncedCallback } from "@/lib/hooks/useDebouncedCallback";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { BudgetTreemap } from '@/components/budget-explorer/BudgetTreemap'
import { FilteredSpendingInfo } from '@/components/budget-explorer/FilteredSpendingInfo'
import { useTreemapDrilldown } from '@/components/budget-explorer/useTreemapDrilldown'
import { useTreemapAmountFilter } from '@/components/budget-explorer/useTreemapAmountFilter'
import type { AggregatedNode } from '@/components/budget-explorer/budget-transform'
import { usePeriodLabel } from '@/hooks/use-period-label'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { Link } from '@tanstack/react-router'
import type { EntityAnalyticsUrlState } from '@/routes/entity-analytics'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { NormalizationOptions } from '@/lib/normalization'
import { normalizeNormalizationOptions } from '@/lib/normalization'
import { useQueryClient } from '@tanstack/react-query'
import { DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES, DEFAULT_INCOME_EXCLUDE_FUNCTIONAL_PREFIXES } from '@/lib/analytics-defaults'

interface OverviewProps {
    cui: string;
    entity?: EntityDetailsData | null | undefined;
    isLoading: boolean;
    selectedYear: number;
    normalizationOptions: NormalizationOptions;
    years: number[];
    periodType?: ReportPeriodType;
    reportPeriod: ReportPeriodInput;
    reportType?: GqlReportType;
    mainCreditorCui?: string;
    search: {
        expenseSearch?: string;
        incomeSearch?: string;
        analyticsChartType?: 'bar' | 'pie';
        analyticsDataType?: 'expense' | 'income';
        period?: ReportPeriodType;
        quarter?: string;
        month?: string;
        [key: string]: any; // Allow additional URL state
    };
    onChartNormalizationChange: (next: NormalizationOptions) => void;
    onYearChange: (year: number) => void;
    onPeriodItemSelect?: (label: string) => void;
    onSearchChange: (type: 'expense' | 'income', term: string) => void;
    onAnalyticsChange: (type: 'analyticsChartType' | 'analyticsDataType', value: 'bar' | 'pie' | 'income' | 'expense') => void;
    // Line items tab state
    onLineItemsTabChange?: (tab: 'functional' | 'funding' | 'expenseType') => void;
    onSelectedFundingKeyChange?: (key: string) => void;
    onSelectedExpenseTypeKeyChange?: (key: string) => void;
    // Treemap state
    treemapPrimary?: 'fn' | 'ec';
    accountCategory?: 'ch' | 'vn';
    onTreemapPrimaryChange?: (primary: 'fn' | 'ec') => void;
    onAccountCategoryChange?: (category: 'ch' | 'vn') => void;
    treemapPath?: string;
    onTreemapPathChange?: (path: string | undefined) => void;
    // Transfer filter
    transferFilter?: 'all' | 'no-transfers' | 'transfers-only';
    onTransferFilterChange?: (filter: 'all' | 'no-transfers' | 'transfers-only') => void;
    advancedFilter?: string;
    onAdvancedFilterChange?: (filter: string | undefined) => void;
}

export const Overview = ({
    cui,
    entity,
    isLoading,
    selectedYear,
    normalizationOptions,
    years,
    periodType,
    reportPeriod,
    reportType,
    search,
    mainCreditorCui,
    onChartNormalizationChange,
    onYearChange,
    onPeriodItemSelect,
    onSearchChange,
    onAnalyticsChange,
    onLineItemsTabChange,
    onSelectedFundingKeyChange,
    onSelectedExpenseTypeKeyChange,
    treemapPrimary,
    accountCategory: accountCategoryProp,
    onTreemapPrimaryChange,
    onAccountCategoryChange,
    treemapPath,
    onTreemapPathChange,
    transferFilter,
    onTransferFilterChange,
    advancedFilter,
    onAdvancedFilterChange,
}: OverviewProps) => {
    const queryClient = useQueryClient();
    const normalized = normalizeNormalizationOptions(normalizationOptions)
    const { data: lineItems, isLoading: isLoadingLineItems } = useEntityExecutionLineItems({
        cui,
        normalization: normalized.normalization as any,
        currency: normalized.currency,
        inflation_adjusted: normalized.inflation_adjusted,
        reportPeriod,
        reportType,
        enabled: true,
        mainCreditorCui: mainCreditorCui
    });

    const filteredLineItemsData = useMemo(() => {
        if (!lineItems) return undefined;
        return {
            ...lineItems,
            nodes: filterLineItems(lineItems.nodes, advancedFilter)
        };
    }, [lineItems, advancedFilter]);

    const debouncedPrefetch = useDebouncedCallback(
        (options: { reportPeriod: ReportPeriodInput, trendPeriod: ReportPeriodInput, reportType?: GqlReportType }) => {
            queryClient.prefetchQuery(entityDetailsQueryOptions({
                cui,
                normalization: normalized.normalization as any,
                currency: normalized.currency,
                inflation_adjusted: normalized.inflation_adjusted,
                show_period_growth: normalized.show_period_growth,
                reportPeriod: options.reportPeriod,
                reportType: options.reportType,
                trendPeriod: options.trendPeriod,
                mainCreditorCui,
            }));
        },
        100
    );

    const handleYearChange = (year: number) => {
        onYearChange(year);
    }
    const handlePrefetchYear = (year: number) => {
        const nextReport = getInitialFilterState(periodType ?? 'YEAR', year, search.month as TMonth ?? '01', search.quarter as TQuarter ?? 'Q1');
        const nextTrend = makeTrendPeriod(periodType ?? 'YEAR', year, years[years.length - 1], years[0]);
        debouncedPrefetch({ reportPeriod: nextReport, trendPeriod: nextTrend, reportType });
    }
    const handleSearchChange = (type: 'expense' | 'income', term: string) => {
        onSearchChange(type, term);
    }
    const handleAnalyticsChange = (type: 'analyticsChartType' | 'analyticsDataType', value: 'bar' | 'pie' | 'income' | 'expense') => {
        onAnalyticsChange(type, value);
    }

    const handlePrefetchPeriod = useCallback((label: string) => {
        if ((periodType ?? 'YEAR') === 'YEAR') {
            const y = Number(label)
            if (!Number.isNaN(y)) handlePrefetchYear(y)
        } else {
            const year = selectedYear
            const currentPeriod = periodType ?? 'YEAR'
            const nextReport = getInitialFilterState(currentPeriod, year, currentPeriod === 'MONTH' ? label as TMonth : search.month as TMonth ?? '01', currentPeriod === 'QUARTER' ? label as TQuarter : search.quarter as TQuarter ?? 'Q1')
            const nextTrend = makeTrendPeriod(currentPeriod, year, years[years.length - 1], years[0])
            debouncedPrefetch({ reportPeriod: nextReport, trendPeriod: nextTrend, reportType })
        }
    }, [periodType, selectedYear, search.month, search.quarter, years, years.length, years[years.length - 1], years[0], debouncedPrefetch, reportType, handlePrefetchYear])

    const [accountCategory, setAccountCategory] = useState<'ch' | 'vn'>(accountCategoryProp ?? 'ch')

    const handleAccountCategoryChange = (category: 'ch' | 'vn') => {
        setAccountCategory(category)
        onAccountCategoryChange?.(category)
        if (category === 'vn') {
            setPrimary('fn')
        }
        reset()
    }

    const filteredItems = useMemo(() => {
        const nodes = filteredLineItemsData?.nodes ?? []
        return nodes.filter((n: any) => n?.account_category === accountCategory)
    }, [filteredLineItemsData, accountCategory])

    // Sync local state with prop when it changes
    useEffect(() => {
        if (accountCategoryProp !== undefined) {
            setAccountCategory(accountCategoryProp)
        }
    }, [accountCategoryProp])

    const aggregatedNodes = useMemo<AggregatedNode[]>(() => {
        return filteredItems.map((n: any) => ({
            fn_c: n?.functionalClassification?.functional_code ?? null,
            fn_n: n?.functionalClassification?.functional_name ?? null,
            ec_c: n?.economicClassification?.economic_code ?? null,
            ec_n: n?.economicClassification?.economic_name ?? null,
            amount: Number(n?.amount ?? 0),
            // count is used by some grouping; default to 1 if missing
            count: Number.isFinite((n as any)?.count) ? (n as any).count : 1,
        }))
    }, [filteredItems])

    // Exclude non-direct spending items for expense view
    const excludeEcCodes = accountCategory === 'ch' ? [...DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES] : []
    // Exclude transfer codes for income view
    const excludeFnCodes = accountCategory === 'vn' ? [...DEFAULT_INCOME_EXCLUDE_FUNCTIONAL_PREFIXES] : []

    const { primary, activePrimary, setPrimary, treemapData, breadcrumbs, excludedItemsSummary, onNodeClick, onBreadcrumbClick, reset } = useTreemapDrilldown({
        nodes: aggregatedNodes,
        initialPrimary: treemapPrimary ?? 'fn',
        rootDepth: 2,
        excludeEcCodes,
        excludeFnCodes,
        onPrimaryChange: onTreemapPrimaryChange,
        initialPath: (treemapPath ?? '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        onPathChange: (codes) => onTreemapPathChange?.(codes.join(',') || undefined),
    })
    const { amountFilter, unit: treemapUnit } = useTreemapAmountFilter({
        data: treemapData,
        normalization: normalized.normalization as any,
        currency: normalized.currency as any,
    })

    const entityAnalyticsLink = useMemo<EntityAnalyticsUrlState>(() => ({
        view: 'line-items',
        sortOrder: 'desc',
        page: 1,
        pageSize: 25,
        filter: {
            entity_cuis: [cui],
            report_period: reportPeriod,
            account_category: accountCategory,
            normalization: normalized.normalization as any,
            currency: normalized.currency,
            inflation_adjusted: normalized.inflation_adjusted,
            report_type: toReportTypeValue(toExecutionReportType(reportType) ?? 'PRINCIPAL_AGGREGATED'),
        },
        treemapPrimary: primary,
        treemapDepth: 'chapter',
    }), [cui, reportPeriod, accountCategory, normalized.normalization, normalized.currency, normalized.inflation_adjusted, reportType, primary])

    const periodLabel = usePeriodLabel(reportPeriod)

    return (
        <div className="space-y-6 sm:space-y-8">
            <EntityFinancialSummary
                totalIncome={entity?.totalIncome}
                totalExpenses={entity?.totalExpenses}
                budgetBalance={entity?.budgetBalance}
                periodLabel={getYearLabel(selectedYear, search.month as TMonth, search.quarter as TQuarter)}
                isLoading={isLoading}
                normalizationOptions={normalizationOptions}
            />

            <EntityFinancialTrends
                entityCui={cui}
                incomeTrend={entity?.incomeTrend ?? null}
                expenseTrend={entity?.expenseTrend ?? null}
                balanceTrend={entity?.balanceTrend ?? null}
                currentYear={selectedYear}
                entityName={entity?.name ?? ''}
                normalizationOptions={normalizationOptions}
                onNormalizationChange={onChartNormalizationChange}
                allowPerCapita={Boolean(entity?.is_uat || entity?.entity_type === 'admin_county_council')}
                onYearChange={onYearChange}
                periodType={periodType ?? 'YEAR'}
                onSelectPeriod={onPeriodItemSelect}
                selectedQuarter={search?.quarter as string | undefined}
                selectedMonth={search?.month as string | undefined}
                isLoading={isLoading}
                onPrefetchPeriod={handlePrefetchPeriod}
            />

            <Card className="shadow-sm">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                        <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                            <Trans>Budget Distribution</Trans> - {periodLabel}
                            <Button
                                asChild
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                aria-label={t`Open in entity analytics`}
                            >
                                <Link
                                    to="/entity-analytics"
                                    search={entityAnalyticsLink}
                                    preload="intent"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                </Link>
                            </Button>
                        </h3>
                        <div className="flex flex-col sm:flex-row w-full sm:w-auto items-stretch sm:items-center gap-2 sm:gap-3">
                            <ToggleGroup type="single" value={accountCategory} onValueChange={(v) => v && handleAccountCategoryChange(v as 'ch' | 'vn')} variant="outline" size="sm" className="w-full sm:w-auto justify-between">
                                <ToggleGroupItem value="vn" className="data-[state=on]:bg-foreground data-[state=on]:text-background px-4 flex-1 sm:flex-none"><Trans>Income</Trans></ToggleGroupItem>
                                <ToggleGroupItem value="ch" className="data-[state=on]:bg-foreground data-[state=on]:text-background px-4 flex-1 sm:flex-none"><Trans>Expenses</Trans></ToggleGroupItem>
                            </ToggleGroup>
                            <ToggleGroup type="single" value={primary} onValueChange={(v) => v && setPrimary(v as 'fn' | 'ec')} variant="outline" size="sm" className="w-full sm:w-auto justify-between">
                                <ToggleGroupItem value="fn" className="data-[state=on]:bg-foreground data-[state=on]:text-background px-4 flex-1 sm:flex-none"><Trans>Functional</Trans></ToggleGroupItem>
                                <ToggleGroupItem value="ec" disabled={accountCategory === 'vn'} className="data-[state=on]:bg-foreground data-[state=on]:text-background px-4 flex-1 sm:flex-none"><Trans>Economic</Trans></ToggleGroupItem>
                            </ToggleGroup>
                            <FilteredSpendingInfo
                                excludedItemsSummary={excludedItemsSummary ?? undefined}
                                unit={treemapUnit}
                                amountFilter={amountFilter}
                                triggerVariant="icon"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="-mx-4 sm:mx-0 px-4 sm:px-0">
                    {isLoading || isLoadingLineItems ? (
                        <Skeleton className="w-full h-[600px]" />
                    ) : (
                        <BudgetTreemap
                            data={treemapData}
                            primary={activePrimary}
                            onNodeClick={onNodeClick}
                            onBreadcrumbClick={onBreadcrumbClick}
                            path={breadcrumbs}
                            normalization={normalized.normalization as any}
                            currency={normalized.currency as any}
                            excludedItemsSummary={excludedItemsSummary}
                            amountFilter={amountFilter}
                        />
                    )}
                </CardContent>
            </Card>

            <div className="space-y-6">
                <EntityLineItemsTabs
                    lineItems={filteredLineItemsData?.nodes ?? []}
                    fundingSources={lineItems?.fundingSources ?? []}
                    currentYear={selectedYear}
                    month={search.month as TMonth}
                    quarter={search.quarter as TQuarter}
                    years={years}
                    onYearChange={handleYearChange}
                    onPrefetchYear={handlePrefetchYear}
                    initialExpenseSearchTerm={search.expenseSearch ?? ''}
                    initialIncomeSearchTerm={search.incomeSearch ?? ''}
                    onSearchChange={(type: 'expense' | 'income', term: string) => handleSearchChange(type, term)}
                    isLoading={isLoading || isLoadingLineItems}
                    normalization={normalized.normalization as any}
                    currency={normalized.currency as any}
                    lineItemsTab={search.lineItemsTab as 'functional' | 'funding' | 'expenseType' | undefined}
                    onLineItemsTabChange={onLineItemsTabChange}
                    selectedFundingKey={search.selectedFundingKey as string | undefined}
                    selectedExpenseTypeKey={search.selectedExpenseTypeKey as string | undefined}
                    onSelectedFundingKeyChange={onSelectedFundingKeyChange}
                    onSelectedExpenseTypeKeyChange={onSelectedExpenseTypeKeyChange}
                    transferFilter={transferFilter}
                    onTransferFilterChange={onTransferFilterChange}
                    advancedFilter={advancedFilter}
                    onAdvancedFilterChange={onAdvancedFilterChange}
                />

                <LineItemsAnalytics
                    lineItems={filteredLineItemsData}
                    analyticsYear={selectedYear}
                    month={search.month as TMonth}
                    quarter={search.quarter as TQuarter}
                    years={years}
                    onYearChange={handleYearChange}
                    onPrefetchYear={handlePrefetchYear}
                    chartType={search.analyticsChartType ?? 'bar'}
                    onChartTypeChange={(type: 'bar' | 'pie') => handleAnalyticsChange('analyticsChartType', type)}
                    dataType={search.analyticsDataType ?? 'expense'}
                    onDataTypeChange={(type: 'income' | 'expense') => handleAnalyticsChange('analyticsDataType', type)}
                    isLoading={isLoading || isLoadingLineItems}
                    normalization={normalized.normalization as any}
                    currency={normalized.currency as any}
                />
            </div>

            {entity ? (
                <div className="mt-6">
                    <EntityReportsSummary
                        cui={cui}
                        reportPeriod={reportPeriod}
                        reportType={reportType ?? entity.default_report_type}
                        mainCreditorCui={(search as any).main_creditor_cui}
                        limit={12}
                    />
                </div>
            ) : null}

        </div>
    )
}
