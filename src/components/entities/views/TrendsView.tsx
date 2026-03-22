import React, { useMemo } from 'react';
import { EntityDetailsData, filterLineItems } from '@/lib/api/entities';
import { Chart, SeriesConfiguration } from '@/schemas/charts';
import { useParams } from '@tanstack/react-router';
import { getChapterMap, getTopFunctionalGroupCodes } from '@/lib/analytics-utils';
import { getSeriesColor } from '@/components/charts/components/chart-renderer/utils';
import { ChartCard } from './ChartCard';
import { TrendsViewSkeleton } from './TrendsViewSkeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { t } from '@lingui/core/macro';
import { toExecutionReportType, toReportTypeValue, type ReportPeriodInput, type GqlReportType, type TMonth, type TQuarter } from '@/schemas/reporting';
import { usePeriodLabel } from '@/hooks/use-period-label'
import { useEntityExecutionLineItems } from '@/lib/hooks/useEntityDetails';
import { EntityLineItemsTabs } from '../EntityLineItemsTabs';
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { BudgetTreemap } from '@/components/budget-explorer/BudgetTreemap'
import { FilteredSpendingInfo } from '@/components/budget-explorer/FilteredSpendingInfo'
import { useTreemapDrilldown } from '@/components/budget-explorer/useTreemapDrilldown'
import { useTreemapAmountFilter } from '@/components/budget-explorer/useTreemapAmountFilter'
import type { AggregatedNode } from '@/components/budget-explorer/budget-transform'
import { getNormalizationUnit } from '@/lib/utils';
import { Trans } from '@lingui/react/macro'
import { DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES, DEFAULT_INCOME_EXCLUDE_FUNCTIONAL_PREFIXES } from '@/lib/analytics-defaults'
import type { NormalizationOptions } from '@/lib/normalization'
import { normalizeNormalizationOptions } from '@/lib/normalization'

interface BaseTrendsViewProps {
  entity?: EntityDetailsData | null | undefined;
  type: 'income' | 'expense';
  currentYear: number;
  onYearClick: (year: number) => void;
  onSelectPeriod?: (label: string) => void;
  selectedQuarter?: TQuarter;
  selectedMonth?: TMonth;
  years?: number[];
  initialIncomeSearch?: string;
  initialExpenseSearch?: string;
  onSearchChange: (type: 'income' | 'expense', search: string) => void;
  isLoading?: boolean;
  normalizationOptions: NormalizationOptions;
  onNormalizationChange: (next: NormalizationOptions) => void;
  reportPeriod: ReportPeriodInput;
  trendPeriod: ReportPeriodInput;
  reportType?: GqlReportType;
  lineItemsTab?: 'functional' | 'funding' | 'expenseType';
  onLineItemsTabChange?: (tab: 'functional' | 'funding' | 'expenseType') => void;
  selectedFundingKey?: string;
  selectedExpenseTypeKey?: string;
  onSelectedFundingKeyChange?: (key: string) => void;
  onSelectedExpenseTypeKeyChange?: (key: string) => void;
  treemapPrimary?: 'fn' | 'ec';
  onTreemapPrimaryChange?: (primary: 'fn' | 'ec') => void;
  treemapPath?: string;
  onTreemapPathChange?: (path: string | undefined) => void;
  transferFilter?: 'all' | 'no-transfers' | 'transfers-only';
  onTransferFilterChange?: (filter: 'all' | 'no-transfers' | 'transfers-only') => void;
  advancedFilter?: string;
  onAdvancedFilterChange?: (filter: string | undefined) => void;
}

const TOP_CATEGORIES_COUNT = 10;

const TrendsViewComponent: React.FC<BaseTrendsViewProps> = ({ entity, type, currentYear, onYearClick, onSelectPeriod, initialIncomeSearch, initialExpenseSearch, onSearchChange, isLoading, normalizationOptions, onNormalizationChange, reportPeriod, trendPeriod, reportType, years = [], lineItemsTab = 'functional', onLineItemsTabChange, selectedFundingKey = '', selectedExpenseTypeKey = '', onSelectedFundingKeyChange, onSelectedExpenseTypeKeyChange, treemapPrimary, onTreemapPrimaryChange, treemapPath, onTreemapPathChange, transferFilter = 'no-transfers', onTransferFilterChange, advancedFilter, onAdvancedFilterChange }) => {
  const { cui } = useParams({ from: '/entities/$cui' });
  const isMobile = useIsMobile();
  const chapterMap = useMemo(() => getChapterMap(), []);
  const accountCategory = type === 'income' ? 'vn' : 'ch';
  const normalized = normalizeNormalizationOptions(normalizationOptions)

  // Compute selected month/quarter from the report period anchor
  const anchor = (reportPeriod.selection as any)?.interval?.start as string | undefined;
  const selectedMonth: TMonth | undefined = reportPeriod.type === 'MONTH' && anchor ? (anchor.split('-')[1] as TMonth) : undefined;
  const selectedQuarter: TQuarter | undefined = reportPeriod.type === 'QUARTER' && anchor ? (anchor.split('-')[1] as TQuarter) : undefined;

  // Lazy load full line items, then filter locally
  const { data: fullLineItems } = useEntityExecutionLineItems({
    cui,
    normalization: normalized.normalization,
    currency: normalized.currency,
    inflation_adjusted: normalized.inflation_adjusted,
    // Use report period and report type from controls
    reportPeriod,
    reportType: reportType ?? entity?.default_report_type,
    enabled: !!cui,
  });

  const lineItems = useMemo(() => {
    const nodes = fullLineItems?.nodes ?? [];
    const accountCategory = type === 'income' ? 'vn' : 'ch';
    const basicFiltered = nodes.filter(item => item.account_category === accountCategory);
    return filterLineItems(basicFiltered, advancedFilter);
  }, [fullLineItems, type, advancedFilter]);

  const fundingSources = (fullLineItems as any)?.fundingSources ?? [];

  const topFunctionalGroups = useMemo(() => {
    return getTopFunctionalGroupCodes(lineItems, TOP_CATEGORIES_COUNT);
  }, [lineItems]);

  const entityNameRaw = entity?.name ?? '';

  const trendChart = useMemo<Chart | null>(() => {
    if (!entity) return null;
    const timestamp = new Date().toISOString();
    const entityName = entityNameRaw.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    const title = type === 'income' ? t`Top ${TOP_CATEGORIES_COUNT} Income Categories for ${entityName}` : t`Top ${TOP_CATEGORIES_COUNT} Spending Categories for ${entityName}`;
    const defaultExclude = accountCategory === 'ch'
      ? { economic_prefixes: [...DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES] }
      : { functional_prefixes: [...DEFAULT_INCOME_EXCLUDE_FUNCTIONAL_PREFIXES] };

    const series: SeriesConfiguration[] = topFunctionalGroups.map((prefix, index) => ({
      id: `${prefix}${cui}-${type}`,
      type: 'line-items-aggregated-yearly',
      label: chapterMap.get(prefix) || prefix,
      filter: {
        entity_cuis: [cui],
        functional_prefixes: [prefix],
        account_category: accountCategory,
        report_type: toReportTypeValue(toExecutionReportType(reportType ?? entity.default_report_type) ?? 'PRINCIPAL_AGGREGATED'),
        normalization: normalized.normalization,
        currency: normalized.currency,
        inflation_adjusted: normalized.inflation_adjusted,
        show_period_growth: normalized.show_period_growth,
        report_period: trendPeriod,
        exclude: defaultExclude,
      },
      enabled: true,
      config: { color: getSeriesColor(index), showDataLabels: false },
      unit: getNormalizationUnit({ normalization: normalized.normalization, currency: normalized.currency, show_period_growth: normalized.show_period_growth }),
      createdAt: timestamp,
      updatedAt: timestamp,
    }));

    return {
      id: `trends-${entity.name}-${cui}-${type}`,
      title,
      config: {
        chartType: 'line',
        showLegend: false,
        showGridLines: true,
        showTooltip: isMobile ? false : true,
        showDiffControl: true,
        editAnnotations: false,
      },
      series,
      createdAt: timestamp,
      updatedAt: timestamp,
    } as Chart;
  }, [topFunctionalGroups, cui, type, chapterMap, entity, entityNameRaw, normalized, trendPeriod, reportType]);

  const handleXAxisClick = (value: number | string) => {
    const raw = String(value);
    if (reportPeriod.type === 'YEAR') {
      const y = Number(raw.slice(0, 4));
      if (Number.isFinite(y)) onYearClick(y);
      return;
    }
    if (reportPeriod.type === 'MONTH') {
      const m = raw.match(/^\d{4}-(0[1-9]|1[0-2])$/) || raw.match(/^(0[1-9]|1[0-2])$/);
      if (m) onSelectPeriod?.(m[1]);
      return;
    }
    if (reportPeriod.type === 'QUARTER') {
      const q = raw.match(/^\d{4}-(Q[1-4])$/) || raw.match(/^(Q[1-4])$/);
      if (q) onSelectPeriod?.(q[1]);
    }
  };

  // Build xAxis marker value to reflect current selection
  const xAxisMarker = reportPeriod.type === 'YEAR' ? currentYear : anchor;

  const periodLabel = usePeriodLabel(reportPeriod)

  const aggregatedNodes = useMemo<AggregatedNode[]>(() => {
    return (lineItems ?? []).map((n: any) => ({
      fn_c: n?.functionalClassification?.functional_code ?? null,
      fn_n: n?.functionalClassification?.functional_name ?? null,
      ec_c: n?.economicClassification?.economic_code ?? null,
      ec_n: n?.economicClassification?.economic_name ?? null,
      amount: Number(n?.amount ?? 0),
      count: Number.isFinite(n?.count) ? n.count : 1,
    }))
  }, [lineItems])

  // Exclude non-direct spending items for expense view
  const excludeEcCodes = type === 'expense' ? [...DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES] : []
  // Exclude transfer codes for income view
  const excludeFnCodes = type === 'income' ? [...DEFAULT_INCOME_EXCLUDE_FUNCTIONAL_PREFIXES] : []

  const {
    primary,
    activePrimary,
    setPrimary,
    treemapData,
    breadcrumbs,
    excludedItemsSummary,
    onNodeClick,
    onBreadcrumbClick,
  } = useTreemapDrilldown({
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
    normalization: normalized.normalization,
    currency: normalized.currency,
  })

  if (isLoading || !entity || !trendChart) {
    return <TrendsViewSkeleton />;
  }

  return (
    <div className="space-y-8">
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <h3 className="text-base sm:text-lg font-semibold"><Trans>Budget Distribution</Trans> - {periodLabel}</h3>
            <div className="flex items-center gap-3">
              <ToggleGroup type="single" value={primary} onValueChange={(v) => v && setPrimary(v as 'fn' | 'ec')} variant="outline" size="sm">
                <ToggleGroupItem value="fn" className="data-[state=on]:bg-foreground data-[state=on]:text-background px-4"><Trans>Functional</Trans></ToggleGroupItem>
                <ToggleGroupItem value="ec" disabled={type === 'income'} className="data-[state=on]:bg-foreground data-[state=on]:text-background px-4"><Trans>Economic</Trans></ToggleGroupItem>
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
        <CardContent>
          {isLoading || !fullLineItems ? (
            <Skeleton className="w-full h-[600px]" />
          ) : (
            <BudgetTreemap
              data={treemapData}
              primary={activePrimary}
              onNodeClick={onNodeClick}
              onBreadcrumbClick={onBreadcrumbClick}
              path={breadcrumbs}
              normalization={normalized.normalization}
              currency={normalized.currency}
              excludedItemsSummary={excludedItemsSummary}
              amountFilter={amountFilter}
            />
          )}
        </CardContent>
      </Card>

      <ChartCard
        chart={trendChart}
        xAxisMarker={xAxisMarker as any}
        onXAxisItemClick={handleXAxisClick}
        onYearClick={onYearClick}
        currentYear={currentYear}
        normalizationOptions={normalizationOptions}
        onNormalizationChange={onNormalizationChange}
        allowPerCapita={Boolean(entity?.is_uat || entity?.entity_type === 'admin_county_council')}
      />
      <EntityLineItemsTabs
        lineItems={lineItems}
        fundingSources={fundingSources}
        currentYear={currentYear}
        month={selectedMonth}
        quarter={selectedQuarter}
        years={years}
        onYearChange={onYearClick}
        initialExpenseSearchTerm={initialExpenseSearch ?? ''}
        initialIncomeSearchTerm={initialIncomeSearch ?? ''}
        onSearchChange={onSearchChange}
        isLoading={isLoading || !fullLineItems}
        normalization={normalized.normalization}
        currency={normalized.currency}
        lineItemsTab={lineItemsTab}
        onLineItemsTabChange={onLineItemsTabChange}
        selectedFundingKey={selectedFundingKey}
        selectedExpenseTypeKey={selectedExpenseTypeKey}
        onSelectedFundingKeyChange={onSelectedFundingKeyChange}
        onSelectedExpenseTypeKeyChange={onSelectedExpenseTypeKeyChange}
        transferFilter={transferFilter}
        onTransferFilterChange={onTransferFilterChange}
        advancedFilter={advancedFilter}
        onAdvancedFilterChange={onAdvancedFilterChange}
        types={[type]}
      />
    </div>
  );
};

export const TrendsView = React.memo(TrendsViewComponent);
