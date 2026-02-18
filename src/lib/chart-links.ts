import { ChartSchema, CommitmentsReportType, createDefaultCommitmentsYearReportPeriod, defaultYearRange, ReportType } from '@/schemas/charts';
import type { Chart, Calculation, Series, Normalization, AnalyticsFilterType } from '@/schemas/charts';
import type { ChartUrlState } from '@/components/charts/page-schema';
import { generateHash, getNormalizationUnit } from '@/lib/utils';
import { t } from '@lingui/core/macro';
import { DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES, DEFAULT_INCOME_EXCLUDE_FUNCTIONAL_PREFIXES } from '@/lib/analytics-defaults';
import { normalizeNormalizationOptions, type NormalizationOptions } from '@/lib/normalization';
import type { ReportPeriodInput } from '@/schemas/reporting';
import { getSeriesColor } from '@/components/charts/components/chart-renderer/utils';

interface BuildEntityIncomeExpenseChartOptions {
    title?: string;
    reportType?: ReportType;
    incomeColor?: string;
    expenseColor?: string;
}

interface BuildEntityCommitmentsChartOptions {
    title?: string;
    reportType?: string;
    budgetColor?: string;
    commitmentsColor?: string;
    paymentsColor?: string;
}

type TemporalSplit = 'all' | 'year' | 'quarter' | 'month';

interface BuildInsStatsChartStateOptions {
    datasetCode: string;
    datasetLabel: string;
    entityName: string;
    temporalSplit: TemporalSplit;
    classificationSelections?: Record<string, string[]>;
    unitKey?: string | null;
    isCounty: boolean;
    countyCode?: string;
    sirutaCode?: string;
}

function buildChartRouteLink(search: ChartUrlState) {
    return {
        to: '/charts/$chartId' as const,
        params: { chartId: search.chart.id } as const,
        search,
    };
}

function mapTemporalSplitToInsPeriod(temporalSplit: TemporalSplit): ReportPeriodInput | undefined {
    if (temporalSplit === 'year') {
        return {
            type: 'YEAR',
            selection: {
                interval: {
                    start: '1900',
                    end: '2100',
                },
            },
        };
    }

    if (temporalSplit === 'quarter') {
        return {
            type: 'QUARTER',
            selection: {
                interval: {
                    start: '1900-Q1',
                    end: '2100-Q4',
                },
            },
        };
    }

    if (temporalSplit === 'month') {
        return {
            type: 'MONTH',
            selection: {
                interval: {
                    start: '1900-01',
                    end: '2100-12',
                },
            },
        };
    }

    return undefined;
}

/**
 * Build a ChartUrlState for a two-series chart (Income + Expense) for an entity.
 * Returns an object usable directly as TanStack Router `search` for /charts/$chartId.
 */
export function buildEntityIncomeExpenseChartState(
    cui: string,
    entityName: string,
    normalizationOptions: NormalizationOptions,
    options?: BuildEntityIncomeExpenseChartOptions
): ChartUrlState {
    const normalized = normalizeNormalizationOptions(normalizationOptions)
    const years = Array.from({ length: defaultYearRange.end - defaultYearRange.start + 1 }, (_, i) => defaultYearRange.start + i);
    const chartId = generateHash(JSON.stringify({ cui, kind: 'income-expense' }));
    const title = options?.title ?? t`Financial Evolution - ${entityName}`;
    const reportType = options?.reportType ?? 'Executie bugetara agregata la nivel de ordonator principal';
    const incomeColor = options?.incomeColor ?? '#10B981';
    const expenseColor = options?.expenseColor ?? '#EF4444';

    const baseIncomeSeries = {
        label: "Income",
        type: 'line-items-aggregated-yearly' as const,
        unit: '',
        filter: {
            entity_cuis: [cui],
            account_category: 'vn' as const,
            report_type: reportType,
            normalization: normalized.normalization,
            currency: normalized.currency,
            inflation_adjusted: normalized.inflation_adjusted,
            show_period_growth: normalized.show_period_growth,
            exclude: {
                functional_prefixes: [...DEFAULT_INCOME_EXCLUDE_FUNCTIONAL_PREFIXES],
            },
        },
        config: { showDataLabels: false, color: incomeColor },
    };

    const baseExpenseSeries = {
        label: "Expenses",
        type: 'line-items-aggregated-yearly' as const,
        unit: '',
        filter: {
            entity_cuis: [cui],
            account_category: 'ch' as const,
            report_type: reportType,
            normalization: normalized.normalization,
            currency: normalized.currency,
            inflation_adjusted: normalized.inflation_adjusted,
            show_period_growth: normalized.show_period_growth,
            exclude: {
                economic_prefixes: [...DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES],
            },
        },
        config: { showDataLabels: false, color: expenseColor },
    };

    const incomeSeriesId = generateSeriesId(baseIncomeSeries);
    const expenseSeriesId = generateSeriesId(baseExpenseSeries);

    const baseBalanceSeries = {
        label: "Balance",
        type: 'aggregated-series-calculation' as const,
        unit: getNormalizationUnit({ normalization: normalized.normalization, currency: normalized.currency, show_period_growth: normalized.show_period_growth }),
        config: { showDataLabels: false, color: '#ee8420' },
        calculation: {
            op: 'subtract' as const,
            args: [incomeSeriesId, expenseSeriesId],
        },
    };
    const balanceSeriesId = generateSeriesId(baseBalanceSeries);

    const chart: Chart = ChartSchema.parse({
        id: chartId,
        title,
        config: {
            chartType: 'line',
            showGridLines: true,
            showLegend: true,
            showTooltip: true,
            editAnnotations: false,
            showAnnotations: true,
            showDiffControl: true,
            yearRange: { start: years[0], end: years[years.length - 1] },
        },
        series: [
            {
                ...baseIncomeSeries,
                id: incomeSeriesId,
                enabled: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
            {
                ...baseExpenseSeries,
                id: expenseSeriesId,
                enabled: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
            {
                ...baseBalanceSeries,
                id: balanceSeriesId,
                enabled: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
        ],
        annotations: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });

    return { chart, view: 'overview' };
}

/**
 * Convenience helper to produce params and search for the charts route.
 */
export function buildEntityIncomeExpenseChartLink(
    cui: string,
    entityName: string,
    normalizationOptions: NormalizationOptions,
    options?: BuildEntityIncomeExpenseChartOptions
) {
    const search = buildEntityIncomeExpenseChartState(cui, entityName, normalizationOptions, options);
    return buildChartRouteLink(search);
}

function normalizeCommitmentsChartReportType(reportType?: string): CommitmentsReportType {
    if (
        reportType === "PRINCIPAL_AGGREGATED" ||
        reportType === "SECONDARY_AGGREGATED" ||
        reportType === "DETAILED"
    ) {
        return reportType;
    }

    if (reportType === "COMMITMENT_PRINCIPAL_AGGREGATED") return "PRINCIPAL_AGGREGATED";
    if (reportType === "COMMITMENT_SECONDARY_AGGREGATED") return "SECONDARY_AGGREGATED";
    if (reportType === "COMMITMENT_DETAILED") return "DETAILED";

    return "PRINCIPAL_AGGREGATED";
}

/**
 * Build a ChartUrlState for commitment trends for an entity.
 * Returns an object usable directly as TanStack Router `search` for /charts/$chartId.
 */
export function buildEntityCommitmentsChartState(
    cui: string,
    entityName: string,
    normalizationOptions: NormalizationOptions,
    options?: BuildEntityCommitmentsChartOptions
): ChartUrlState {
    const normalized = normalizeNormalizationOptions(normalizationOptions);
    const years = Array.from(
        { length: defaultYearRange.end - defaultYearRange.start + 1 },
        (_, i) => defaultYearRange.start + i
    );
    const chartId = generateHash(JSON.stringify({ cui, kind: "entity-commitments-trends" }));
    const title = options?.title ?? t`Commitments Evolution - ${entityName}`;
    const reportType = normalizeCommitmentsChartReportType(options?.reportType);
    const budgetColor = options?.budgetColor ?? "#10B981";
    const commitmentsColor = options?.commitmentsColor ?? "#3B82F6";
    const paymentsColor = options?.paymentsColor ?? "#0EA5E9";

    const baseFilter = {
        report_period: createDefaultCommitmentsYearReportPeriod(),
        entity_cuis: [cui],
        report_type: reportType,
        normalization: normalized.normalization,
        currency: normalized.currency,
        inflation_adjusted: normalized.inflation_adjusted,
        show_period_growth: normalized.show_period_growth,
        exclude: {
            economic_prefixes: [...DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES],
        },
    };

    const baseBudgetSeries = {
        label: "Budget credits",
        type: "commitments-analytics" as const,
        metric: "CREDITE_BUGETARE_DEFINITIVE" as const,
        unit: "",
        filter: baseFilter,
        config: { showDataLabels: false, color: budgetColor },
    };
    const baseCommitmentsSeries = {
        label: "Legal commitments",
        type: "commitments-analytics" as const,
        metric: "CREDITE_ANGAJAMENT" as const,
        unit: "",
        filter: baseFilter,
        config: { showDataLabels: false, color: commitmentsColor },
    };
    const baseTreasuryPaymentsSeries = {
        label: "Treasury payments",
        type: "commitments-analytics" as const,
        metric: "PLATI_TREZOR" as const,
        unit: "",
        filter: baseFilter,
        config: { showDataLabels: false, color: paymentsColor },
    };
    const baseNonTreasuryPaymentsSeries = {
        label: "Non treasury payments",
        type: "commitments-analytics" as const,
        metric: "PLATI_NON_TREZOR" as const,
        unit: "",
        filter: baseFilter,
        config: { showDataLabels: false, color: paymentsColor },
    };

    const budgetSeriesId = generateSeriesId(baseBudgetSeries);
    const commitmentsSeriesId = generateSeriesId(baseCommitmentsSeries);
    const treasuryPaymentsSeriesId = generateSeriesId(baseTreasuryPaymentsSeries);
    const nonTreasuryPaymentsSeriesId = generateSeriesId(baseNonTreasuryPaymentsSeries);

    const basePaymentsSeries = {
        label: "Payments",
        type: "aggregated-series-calculation" as const,
        unit: getNormalizationUnit({
            normalization: normalized.normalization,
            currency: normalized.currency,
            show_period_growth: normalized.show_period_growth,
        }),
        config: { showDataLabels: false, color: paymentsColor },
        calculation: {
            op: "sum" as const,
            args: [treasuryPaymentsSeriesId, nonTreasuryPaymentsSeriesId],
        },
    };
    const paymentsSeriesId = generateSeriesId(basePaymentsSeries);

    const chart: Chart = ChartSchema.parse({
        id: chartId,
        title,
        config: {
            chartType: "line",
            showGridLines: true,
            showLegend: true,
            showTooltip: true,
            editAnnotations: false,
            showAnnotations: true,
            showDiffControl: true,
            yearRange: { start: years[0], end: years[years.length - 1] },
        },
        series: [
            {
                ...baseBudgetSeries,
                id: budgetSeriesId,
                enabled: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
            {
                ...baseCommitmentsSeries,
                id: commitmentsSeriesId,
                enabled: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
            {
                ...baseTreasuryPaymentsSeries,
                id: treasuryPaymentsSeriesId,
                enabled: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
            {
                ...baseNonTreasuryPaymentsSeries,
                id: nonTreasuryPaymentsSeriesId,
                enabled: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
            {
                ...basePaymentsSeries,
                id: paymentsSeriesId,
                enabled: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
        ],
        annotations: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });

    return { chart, view: "overview" };
}

/**
 * Convenience helper to produce params and search for the commitments trends charts route.
 */
export function buildEntityCommitmentsChartLink(
    cui: string,
    entityName: string,
    normalizationOptions: NormalizationOptions,
    options?: BuildEntityCommitmentsChartOptions
) {
    const search = buildEntityCommitmentsChartState(cui, entityName, normalizationOptions, options);
    return buildChartRouteLink(search);
}

interface BuildTreemapChartStateOptions {
    title: string
    seriesConfigs: Series[]
    normalization?: Normalization
}

interface BuildMapTopEntitiesEvolutionChartStateOptions {
    topEntities: Array<{ id: string; label: string }>;
    effectiveFilter: AnalyticsFilterType;
    mapViewType: 'UAT' | 'County';
}

export function buildMapTopEntitiesEvolutionChartState(
    options: BuildMapTopEntitiesEvolutionChartStateOptions
): ChartUrlState {
    const { topEntities, effectiveFilter, mapViewType } = options;
    const baseFilterHash = generateHash(JSON.stringify(effectiveFilter));
    const topEntityIds = topEntities.map((entity) => entity.id);
    const chartId = generateHash(
        JSON.stringify({ type: 'map-top-entities-evolution', mapViewType, baseFilterHash, topEntityIds })
    );

    const series = topEntities.map((entity, index) => ({
        id: generateHash(JSON.stringify({ chartId, entityId: entity.id })),
        type: 'line-items-aggregated-yearly' as const,
        label: entity.label,
        filter: {
            ...effectiveFilter,
            entity_cuis: [entity.id],
        },
        config: {
            color: getSeriesColor(index),
            showDataLabels: false,
        },
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    }));

    const chart: Chart = ChartSchema.parse({
        id: chartId,
        title: mapViewType === 'UAT' ? t`Evolution of Top 15 UATs` : t`Evolution of Top 15 Counties`,
        config: {
            chartType: 'line',
            showLegend: true,
            showTooltip: true,
            showGridLines: true,
            editAnnotations: false,
            showAnnotations: false,
            showDiffControl: false,
        },
        series,
        annotations: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });

    return { chart, view: 'overview' };
}

export function buildMapTopEntitiesEvolutionChartLink(
    options: BuildMapTopEntitiesEvolutionChartStateOptions
) {
    const search = buildMapTopEntitiesEvolutionChartState(options);
    return buildChartRouteLink(search);
}

/**
 * Build a ChartUrlState from treemap series configurations.
 * Creates a multi-series chart based on treemap drill-down state.
 */
export function buildTreemapChartState(
    options: BuildTreemapChartStateOptions
): ChartUrlState {
    const { title, seriesConfigs } = options
    const years = Array.from({ length: defaultYearRange.end - defaultYearRange.start + 1 }, (_, i) => defaultYearRange.start + i)

    // This process is done in two passes to handle dependencies between series.
    // Calculation series may refer to other series by their IDs. When we generate new
    // hash-based IDs, we must update these references.

    // Pass 1: Generate IDs for data series (non-calculation) and create a map from old to new IDs.
    const idMap = new Map<string, string>();
    const dataSeries = seriesConfigs.filter(s => s.type !== 'aggregated-series-calculation');
    const calculationSeries = seriesConfigs.filter(
        (s): s is Extract<Series, { type: 'aggregated-series-calculation' }> => s.type === 'aggregated-series-calculation'
    );

    const dataSeriesWithIds = dataSeries.map(seriesConfig => {
        const newId = generateSeriesId(seriesConfig);
        if (seriesConfig.id) {
            idMap.set(seriesConfig.id, newId);
        }
        return { ...seriesConfig, id: newId };
    });

    // Pass 2: Update calculation series with the new IDs and then generate their own IDs.
    const calculationSeriesWithIds = calculationSeries.map(seriesConfig => {
        let updatedCalculation = seriesConfig.calculation;
        if (updatedCalculation) {
            const calc = updatedCalculation as Calculation;
            updatedCalculation = {
                ...calc,
                args: calc.args.map((arg) => (typeof arg === 'string' && idMap.has(arg) ? idMap.get(arg)! : arg)),
            } as Calculation;
        }

        const newId = generateSeriesId({ ...seriesConfig, calculation: updatedCalculation });
        if (seriesConfig.id) {
            idMap.set(seriesConfig.id, newId);
        }
        return { ...seriesConfig, id: newId, calculation: updatedCalculation };
    });

    const seriesWithIds = [...dataSeriesWithIds, ...calculationSeriesWithIds];

    const chartId = generateHash(JSON.stringify({ title, series: seriesWithIds.map(s => s.id) }))

    const chart: Chart = ChartSchema.parse({
        id: chartId,
        title,
        config: {
            chartType: 'bar',
            showGridLines: true,
            showLegend: true,
            showTooltip: true,
            editAnnotations: false,
            showAnnotations: true,
            showDiffControl: false,
            yearRange: { start: years[0], end: years[years.length - 1] },
        },
        series: seriesWithIds,
        annotations: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    })

    return { chart, view: 'overview' }
}

/**
 * Convenience helper to produce params and search for the charts route from treemap.
 */
export function buildTreemapChartLink(
    options: BuildTreemapChartStateOptions
) {
    const search = buildTreemapChartState(options)
    return buildChartRouteLink(search)
}

export function buildInsStatsChartState(
    options: BuildInsStatsChartStateOptions
): ChartUrlState {
    const {
        datasetCode,
        datasetLabel,
        entityName,
        temporalSplit,
        classificationSelections,
        unitKey,
        isCounty,
        countyCode,
        sirutaCode,
    } = options;
    const years = Array.from(
        { length: defaultYearRange.end - defaultYearRange.start + 1 },
        (_, i) => defaultYearRange.start + i
    );

    const normalizedDatasetLabel = datasetLabel.trim() || datasetCode;
    const chartId = crypto.randomUUID();
    const seriesId = crypto.randomUUID();

    const normalizedClassificationSelections = Object.fromEntries(
        Object.entries(classificationSelections ?? {})
            .map(([typeCode, rawCodes]) => [
                typeCode.trim(),
                Array.from(
                    new Set(
                        rawCodes
                            .map((rawCode) => rawCode.trim())
                            .filter(Boolean)
                    )
                ),
            ])
            .filter(([typeCode, codes]) => typeCode.length > 0 && codes.length > 0)
    );

    const normalizedUnitCodes =
        unitKey && unitKey !== '__none__' ? [unitKey] : undefined;
    const period = mapTemporalSplitToInsPeriod(temporalSplit);
    const normalizedSirutaCode = sirutaCode?.trim();
    const normalizedCountyCode = countyCode?.trim().toUpperCase();

    const chart: Chart = ChartSchema.parse({
        id: chartId,
        title: t`INS Trends - ${normalizedDatasetLabel} (${entityName})`,
        config: {
            chartType: 'line',
            showGridLines: true,
            showLegend: true,
            showTooltip: true,
            editAnnotations: false,
            showAnnotations: true,
            showDiffControl: true,
            yearRange: { start: years[0], end: years[years.length - 1] },
        },
        series: [
            {
                id: seriesId,
                type: 'ins-series',
                label: normalizedDatasetLabel,
                enabled: true,
                unit: '',
                datasetCode,
                aggregation: 'sum',
                hasValue: true,
                period,
                sirutaCodes: !isCounty && normalizedSirutaCode ? [normalizedSirutaCode] : undefined,
                territoryCodes: isCounty && normalizedCountyCode ? [normalizedCountyCode] : undefined,
                unitCodes: normalizedUnitCodes,
                classificationSelections:
                    Object.keys(normalizedClassificationSelections).length > 0
                        ? normalizedClassificationSelections
                        : undefined,
                config: {
                    showDataLabels: false,
                    color: '#1d4ed8',
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
        ],
        annotations: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });

    return { chart, view: 'overview' };
}

export function buildInsStatsChartLink(options: BuildInsStatsChartStateOptions) {
    const search = buildInsStatsChartState(options);
    return buildChartRouteLink(search);
}

/**
 * Generate a deterministic series ID from the series configuration.
 * Uses generateHash to create a hash based on label, color, filter, type, unit, etc.
 * Same configuration will always generate the same ID.
 */
function generateSeriesId(seriesConfig: {
    label: string;
    type: string;
    config: { color: string;[key: string]: unknown };
    filter?: Record<string, unknown>;
    calculation?: Calculation;
    unit?: string;
}): string {
    const hashInput = {
        label: seriesConfig.label,
        type: seriesConfig.type,
        color: seriesConfig.config.color,
        filter: seriesConfig.filter,
        calculation: seriesConfig.calculation,
        unit: seriesConfig.unit,
    };
    return generateHash(JSON.stringify(hashInput));
}
