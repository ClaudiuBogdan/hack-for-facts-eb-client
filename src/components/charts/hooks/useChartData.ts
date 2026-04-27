import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { getChartAnalytics, getStaticChartAnalytics } from "@/lib/api/charts";
import { fetchCommitmentsAnalytics, type CommitmentsAnalyticsInput } from "@/lib/api/commitments";
import {
    AnalyticsFilterType,
    AnalyticsInput,
    Chart,
    AnalyticsSeries,
    Series,
    defaultYearRange,
    SeriesConfig,
    CommitmentsSeriesConfiguration,
    InsSeriesConfiguration,
    StaticSeriesConfiguration,
} from "@/schemas/charts";
import { normalizeAnalyticsFilter, prepareCommitmentsFilterForServer } from "@/lib/filterUtils";
import { generateHash, convertDaysToMs, getUserLocale } from "@/lib/utils";
import { calculateAllSeriesData } from "@/lib/chart-calculation-utils";
import {
    validateAnalyticsSeries,
    sanitizeAnalyticsSeries,
    combineValidationResults,
    type ValidationResult,
    type DataValidationError,
} from "@/lib/chart-data-validation";
import { getXAxisUnit, parseMonth, parseQuarter } from "@/lib/chart-data-utils";
import { insSeriesRuntimeMapper } from "@/lib/ins-chart-series-utils";

interface UseChartDataProps {
    chart?: Chart;
    enabled?: boolean;
}

export type SeriesId = string;
export type Unit = string;

export type DataPointPayload = {
    id: SeriesId;
    series: Pick<Series, "id" | "label"> & { config: Pick<SeriesConfig, "color"> };
    year: number | string;
    originalLabel?: string | number;
    value: number;
    unit: string;
    initialValue: number;
    initialUnit: string;
};

export type TimeSeriesDataPoint = Record<SeriesId, DataPointPayload> & {
    year: number | string;
};

export type DataSeriesMap = Map<SeriesId, AnalyticsSeries>;
export type UnitMap = Map<SeriesId, Unit>;

export function useChartData({ chart, enabled = true }: UseChartDataProps) {
    const locale = getUserLocale();

    const analyticsInputs = useMemo(() => {
        if (!chart) return [];

        return chart.series
            .filter((series) => series.type === "line-items-aggregated-yearly")
            .map((series) => {
                const filter = series.filter as AnalyticsFilterType;
                const account_category = (filter.account_category ?? "ch") as "ch" | "vn";
                const normalizedFilter = normalizeAnalyticsFilter(
                    { ...filter, account_category } as AnalyticsFilterType
                );
                return {
                    seriesId: series.id,
                    filter: normalizedFilter,
                };
            });
    }, [chart]);

    const staticSeries = useMemo(() => {
        if (!chart) return [];
        return chart.series
            .filter((series) => series.type === "static-series")
            .map((series) => series as StaticSeriesConfiguration);
    }, [chart]);

    const insSeries = useMemo(() => {
        if (!chart) return [];
        return chart.series
            .filter((series) => series.type === "ins-series")
            .map((series) => series as InsSeriesConfiguration);
    }, [chart]);

    const commitmentsSeriesInputs = useMemo<CommitmentsAnalyticsInput[]>(() => {
        if (!chart) return [];

        return chart.series
            .filter((series) => series.type === "commitments-analytics")
            .map((series) => {
                const commitmentsSeries = series as CommitmentsSeriesConfiguration;
                return {
                    seriesId: commitmentsSeries.id,
                    metric: commitmentsSeries.metric,
                    filter: prepareCommitmentsFilterForServer(commitmentsSeries.filter),
                } as CommitmentsAnalyticsInput;
            });
    }, [chart]);

    const analyticsInputsHash = useMemo(
        () => getAnalyticsInputHash(analyticsInputs),
        [analyticsInputs]
    );
    const staticSeriesIds = useMemo(
        () =>
            [
                ...new Set(
                    staticSeries.map((s) => s.seriesId).filter((id): id is string => !!id)
                ),
            ],
        [staticSeries]
    );
    const staticSeriesIdsHash = useMemo(
        () => getStaticSeriesInputHash(staticSeriesIds),
        [staticSeriesIds]
    );
    const insSeriesHash = useMemo(() => getInsSeriesInputHash(insSeries), [insSeries]);
    const commitmentsSeriesInputsHash = useMemo(
        () => getCommitmentsSeriesInputHash(commitmentsSeriesInputs),
        [commitmentsSeriesInputs]
    );

    const hasChart = !!chart;
    const hasFilters = analyticsInputs.length > 0;
    const hasStaticSeries = staticSeries.length > 0;
    const hasInsSeries = insSeries.length > 0;
    const hasCommitmentsSeries = commitmentsSeriesInputs.length > 0;

    // Fetch dynamic series
    const {
        data: serverChartData,
        isLoading: isLoadingData,
        error: dataError,
    } = useQuery({
        queryKey: ["chart-data", analyticsInputsHash],
        queryFn: () => getChartAnalytics(analyticsInputs),
        enabled: enabled && hasChart && hasFilters,
        staleTime: convertDaysToMs(1),
        gcTime: convertDaysToMs(3),
    });

    // Fetch static series
    const {
        data: staticServerChartData,
        isLoading: isLoadingStaticData,
        error: staticDataError,
    } = useQuery({
        queryKey: ["chart-data", staticSeriesIdsHash, locale],
        queryFn: () => getStaticChartAnalytics(staticSeriesIds, locale),
        enabled: enabled && hasChart && hasStaticSeries,
        staleTime: convertDaysToMs(1),
        gcTime: convertDaysToMs(3),
    });

    // Fetch INS series and map observations to chart runtime series shape
    const {
        data: insSeriesResults,
        isLoading: isLoadingInsData,
        error: insDataError,
    } = useQuery({
        queryKey: ["chart-data-ins", insSeriesHash],
        queryFn: async () => {
            const results = await Promise.all(
                insSeries.map((series) => insSeriesRuntimeMapper.mapSeries({ series }))
            );
            return results;
        },
        enabled: enabled && hasChart && hasInsSeries,
        staleTime: convertDaysToMs(1),
        gcTime: convertDaysToMs(3),
    });

    const {
        data: commitmentsSeriesData,
        isLoading: isLoadingCommitmentsData,
        error: commitmentsDataError,
    } = useQuery({
        queryKey: ["chart-data-commitments", commitmentsSeriesInputsHash],
        queryFn: () => fetchCommitmentsAnalytics(commitmentsSeriesInputs),
        enabled: enabled && hasChart && hasCommitmentsSeries,
        staleTime: convertDaysToMs(1),
        gcTime: convertDaysToMs(3),
    });

    // Merge server data, static series, and calculated/custom series
    const computedSeries = useMemo(() => {
        if (!chart)
            return undefined as
                | undefined
                | {
                    map: Map<SeriesId, AnalyticsSeries>;
                    calcWarnings: ValidationResult["warnings"];
                    insWarnings: ValidationResult["warnings"];
                };

        const map = new Map<SeriesId, AnalyticsSeries>();
        const insWarnings: DataValidationError[] = [];

        if (serverChartData) {
            serverChartData.forEach((data) => {
                map.set(data.seriesId, data);
            });
        }

        if (staticServerChartData) {
            const staticServerChartDataMap = staticServerChartData.reduce(
                (acc, data) => {
                    acc.set(data.seriesId, data);
                    return acc;
                },
                new Map<string, AnalyticsSeries>()
            );

            staticSeries.forEach((series) => {
                if (series.seriesId) {
                    const data = staticServerChartDataMap.get(series.seriesId);
                    if (data) {
                        map.set(series.id, {
                            ...data,
                            seriesId: series.id,
                            yAxis: {
                                ...data.yAxis,
                                unit: series.unit || data.yAxis.unit,
                            },
                        });
                    }
                }
            });
        }

        if (insSeriesResults) {
            insSeriesResults.forEach((result) => {
                insWarnings.push(...result.warnings);
                if (result.series) {
                    map.set(result.series.seriesId, result.series);
                }
            });
        }

        if (commitmentsSeriesData) {
            commitmentsSeriesData.forEach((seriesData) => {
                map.set(seriesData.seriesId, {
                    seriesId: seriesData.seriesId,
                    xAxis: seriesData.xAxis as AnalyticsSeries["xAxis"],
                    yAxis: seriesData.yAxis as AnalyticsSeries["yAxis"],
                    data: seriesData.data.map((point) => ({ x: point.x, y: point.y })),
                });
            });
        }

        // Include calculated/custom series
        const calc = calculateAllSeriesData(chart.series, map);
        return { map: calc.dataSeriesMap, calcWarnings: calc.warnings, insWarnings };
    }, [chart, serverChartData, staticServerChartData, staticSeries, insSeriesResults, commitmentsSeriesData]);

    const dataSeriesMap = computedSeries?.map;

    // Validate the data (base validation + calculation warnings)
    const validationResult = useMemo(() => {
        if (!dataSeriesMap) return null;
        const base = validateAnalyticsSeries(dataSeriesMap);
        const calculationWarnings = computedSeries?.calcWarnings ?? [];
        const insWarnings = computedSeries?.insWarnings ?? [];
        const calcWarningsResult =
            calculationWarnings.length > 0
                ? ({
                    isValid: true,
                    errors: [],
                    warnings: calculationWarnings,
                } as ValidationResult)
                : null;
        const insWarningsResult =
            insWarnings.length > 0
                ? ({
                    isValid: true,
                    errors: [],
                    warnings: insWarnings,
                } as ValidationResult)
                : null;
        return combineValidationResults(base, calcWarningsResult, insWarningsResult);
    }, [dataSeriesMap, computedSeries]);

    // Sanitize invalid points if needed
    const sanitizedDataSeriesMap = useMemo(() => {
        if (!dataSeriesMap || !validationResult) return dataSeriesMap;

        if (!validationResult.isValid || validationResult.warnings.length > 0) {
            return sanitizeAnalyticsSeries(dataSeriesMap, validationResult);
        }

        return dataSeriesMap;
    }, [dataSeriesMap, validationResult]);

    return {
        dataSeriesMap: sanitizedDataSeriesMap,
        isLoadingData: isLoadingData || isLoadingStaticData || isLoadingInsData || isLoadingCommitmentsData,
        dataError: dataError || staticDataError || insDataError || commitmentsDataError,
        validationResult,
    };
}

function getAnalyticsInputHash(analyticsInputs: AnalyticsInput[]) {
    if (analyticsInputs.length === 0) return "";
    const payloadHash = analyticsInputs
        .sort((a, b) => a.seriesId.localeCompare(b.seriesId))
        .reduce((acc, input) => {
            return acc + input.seriesId + "::" + JSON.stringify(input.filter);
        }, "");
    return generateHash(payloadHash);
}

function getStaticSeriesInputHash(seriesIds: string[]) {
    if (seriesIds.length === 0) return "";
    const payloadHash = seriesIds
        .sort((a, b) => a.localeCompare(b))
        .reduce((acc, input) => acc + input, "");
    return generateHash(payloadHash);
}

function getInsSeriesInputHash(seriesList: InsSeriesConfiguration[]) {
    if (seriesList.length === 0) return "";
    const payloadHash = seriesList
        .sort((a, b) => a.id.localeCompare(b.id))
        .reduce((acc, series) => acc + series.id + "::" + JSON.stringify(series), "");
    return generateHash(payloadHash);
}

function getCommitmentsSeriesInputHash(inputs: CommitmentsAnalyticsInput[]) {
    if (inputs.length === 0) return "";
    const payloadHash = inputs
        .sort((a, b) => String(a.seriesId ?? "").localeCompare(String(b.seriesId ?? "")))
        .reduce((acc, input) => acc + (input.seriesId ?? "") + "::" + input.metric + "::" + JSON.stringify(input.filter), "");
    return generateHash(payloadHash);
}

export interface ChartDataResult<T> {
    data: T;
    unitMap: UnitMap;
    validation: ValidationResult;
}

/**
 * Processes and validates time-series data in a single pass.
 * Returns data, unit map, and complete validation results.
 */
export function convertToTimeSeriesData(
    dataSeriesMap: Map<SeriesId, AnalyticsSeries>,
    chart: Chart
): ChartDataResult<TimeSeriesDataPoint[]> {
    if (dataSeriesMap.size === 0) {
        return {
            data: [],
            unitMap: new Map<SeriesId, Unit>(),
            validation: { isValid: true, errors: [], warnings: [] }
        };
    }

    // Infer x-axis semantics from the first series. Server provides xAxis.unit and x values as strings.
    const xUnit = getXAxisUnit(dataSeriesMap);
    const isMonth = xUnit === 'month';
    const isQuarter = xUnit === 'quarter';
    const isYear = xUnit === 'year';

    // Build a quick lookup from series id -> series configuration (for per-series x-label transforms)
    const seriesMap = chart.series.reduce(
        (acc, series) => {
            acc[series.id] = series;
            return acc;
        },
        {} as Record<SeriesId, Series>
    );

    // Per-series x-axis label transformation (strip configured prefix if present)
    const transformXLabel = (seriesId: SeriesId, raw: string): string => {
        const input = String(raw).trim();
        const series = seriesMap[seriesId] as Series | undefined;
        const prefix = series?.config?.xAxisPrefixToRemove;
        if (prefix && input.startsWith(prefix)) {
            return input.slice(prefix.length);
        }
        return input;
    };

    // Collect x-buckets (preserve display labels after per-series transforms)
    const buckets = new Set<string>();
    dataSeriesMap.forEach((series, seriesId) => {
        series.data.forEach((point) => {
            const label = transformXLabel(seriesId, String(point.x));
            if (label !== '' && label !== 'NaN') buckets.add(label);
        });
    });

    // Sort buckets depending on unit
    const sortedBuckets = Array.from(buckets).sort((a, b) => {
        if (isYear) return Number(a) - Number(b);
        if (isQuarter) {
            const quarterA = parseQuarter(a);
            const quarterB = parseQuarter(b);
            const yearA = quarterA.y ?? 0;
            const yearB = quarterB.y ?? 0;
            if (yearA !== yearB) return yearA - yearB;
            const qa = quarterA.q ?? 0;
            const qb = quarterB.q ?? 0;
            return qa - qb;
        }
        if (isMonth) {
            const pa = parseMonth(a).m ?? 0;
            const pb = parseMonth(b).m ?? 0;
            // If include year prefix, sort by year then month
            const ya = parseMonth(a).y ?? 0;
            const yb = parseMonth(b).y ?? 0;
            if (ya !== yb) return ya - yb;
            return pa - pb;
        }
        return String(a).localeCompare(String(b));
    });
    // For year we can respect chart yearRange
    const filteredBuckets = isYear
        ? sortedBuckets.filter((label) => {
            const n = Number(label);
            const start = chart.config.yearRange?.start ?? (Number(sortedBuckets[0]) || defaultYearRange.start);
            const end = chart.config.yearRange?.end ?? (Number(sortedBuckets[sortedBuckets.length - 1]) || defaultYearRange.end);
            return Number.isFinite(n) && n >= start && n <= end;
        })
        : sortedBuckets;

    const unitMap = new Map<SeriesId, Unit>();

    const warnings: DataValidationError[] = [];
    const errors: DataValidationError[] = [];

    // Validate input data structure
    if (!chart.config) {
        errors.push({
            type: 'missing_data',
            seriesId: 'chart',
            message: 'Chart configuration is missing or invalid'
        });
    }

    const isRelative = chart.config.showRelativeValues ?? false;
    const data = filteredBuckets.map((bucketLabel) => {
        // Build a plain record first to avoid mutating a fully-cast object
        const row: Record<SeriesId, DataPointPayload> = Object.create(null);

        dataSeriesMap.forEach((seriesData, seriesId) => {
            const match = seriesData.data.find((p) => transformXLabel(seriesId, String(p.x)) === bucketLabel);
            const initialValue = match?.y ?? 0;
            const initialUnit = seriesData.yAxis.unit || "";

            const series = seriesMap[seriesId];

            unitMap.set(seriesId, initialUnit);
            row[seriesId] = {
                id: seriesId,
                series,
                year: isYear ? Number(bucketLabel) : bucketLabel,
                originalLabel: match?.x ?? bucketLabel,
                value: initialValue,
                unit: initialUnit,
                initialValue,
                initialUnit,
            };
        });

        if (isRelative) {
            // Per-unit baseline by first series (in chart order) for that unit and year
            const firstSeriesMap = new Map<Unit, number>();
            chart.series.forEach((series) => {
                const d = dataSeriesMap.get(series.id);
                const unit = d?.yAxis.unit || "";
                if (!firstSeriesMap.has(unit)) {
                    const v = d?.data.find((p) => transformXLabel(series.id, String(p.x)) === bucketLabel)?.y ?? 0;
                    firstSeriesMap.set(unit, v);
                }
            });

            Object.keys(row).forEach((sid) => {
                const seriesId = sid as SeriesId;
                const payload = row[seriesId];
                const base = firstSeriesMap.get(payload.unit) ?? 0;

                if (base === 0 || !Number.isFinite(base)) {
                    warnings.push({
                        type: "auto_adjusted_value",
                        seriesId,
                        message: `Relative base is ${base}. Auto-set ${seriesId} to 0% for ${bucketLabel}.`,
                        value: { base, year: row[seriesId].year, unit: payload.initialUnit },
                    });
                    payload.value = 0;
                    payload.unit = "%";
                    unitMap.set(seriesId, "%");
                } else {
                    const computed = (payload.value / base) * 100;
                    if (!Number.isFinite(computed)) {
                        warnings.push({
                            type: "auto_adjusted_value",
                            seriesId,
                            message: `Computed relative value not finite (${bucketLabel}). Auto-set ${seriesId} to 0%.`,
                            value: { base, value: payload.value, year: row[seriesId].year },
                        });
                    }
                    payload.value = Number.isFinite(computed) ? computed : 0;
                    payload.unit = "%";
                    unitMap.set(seriesId, "%");
                }
            });
        }

        const dataPoint: TimeSeriesDataPoint = Object.assign(row, { year: isYear ? Number(bucketLabel) : bucketLabel });
        return dataPoint;
    });

    // Validate processed data points
    data.forEach((point, index) => {
        Object.keys(point).forEach(key => {
            if (key !== 'year') {
                const payload = point[key as SeriesId];
                if (payload && (typeof payload.value !== 'number' || !Number.isFinite(payload.value))) {
                    warnings.push({
                        type: 'invalid_y_value',
                        seriesId: key,
                        message: `Processed value is invalid for year ${point.year}. This may cause chart rendering issues.`,
                        pointIndex: index,
                        value: payload.value
                    });
                }
            }
        });
    });

    const validation: ValidationResult = {
        isValid: errors.length === 0,
        errors,
        warnings
    };

    return { data, unitMap, validation };
}


/**
 * Converts a period string (YYYY, YYYY-MM, YYYY-Qx) to a Date object.
 * This is useful for comparing periods of different granularities.
 * @param period The period string.
 * @param boundary Whether to return the start or end of the period.
 * @returns A Date object, or null if the format is invalid.
 */
function periodToDate(period: string, boundary: "start" | "end"): Date | null {
    if (typeof period !== 'string') return null;
    const trimmedPeriod = period.trim();

    // YYYY
    const yearMatch = trimmedPeriod.match(/^(\d{4})$/);
    if (yearMatch) {
        const year = parseInt(yearMatch[1], 10);
        if (boundary === "start") return new Date(Date.UTC(year, 0, 1));
        return new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
    }

    // YYYY-MM
    const monthMatch = trimmedPeriod.match(/^(\d{4})-(\d{2})$/);
    if (monthMatch) {
        const year = parseInt(monthMatch[1], 10);
        const month = parseInt(monthMatch[2], 10);
        if (month < 1 || month > 12) return null;
        if (boundary === "start") return new Date(Date.UTC(year, month - 1, 1));
        const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
        return new Date(Date.UTC(year, month - 1, lastDay, 23, 59, 59, 999));
    }

    // YYYY-Q[1-4]
    const quarterMatch = trimmedPeriod.match(/^(\d{4})-Q([1-4])$/);
    if (quarterMatch) {
        const year = parseInt(quarterMatch[1], 10);
        const quarter = parseInt(quarterMatch[2], 10);
        const startMonthIndex = (quarter - 1) * 3;
        if (boundary === "start") {
            return new Date(Date.UTC(year, startMonthIndex, 1));
        } else {
            const endMonthIndex = startMonthIndex + 2;
            const lastDay = new Date(Date.UTC(year, endMonthIndex + 1, 0)).getUTCDate();
            return new Date(Date.UTC(year, endMonthIndex, lastDay, 23, 59, 59, 999));
        }
    }

    return null;
}


/**
 * Processes and validates aggregated data in a single pass.
 * Returns data, unit map, and complete validation results.
 */
export function convertToAggregatedData(
    dataSeriesMap: DataSeriesMap,
    chart: Chart
): ChartDataResult<DataPointPayload[]> {
    if (!chart || !dataSeriesMap) {
        return {
            data: [],
            unitMap: new Map<SeriesId, Unit>(),
            validation: { isValid: true, errors: [], warnings: [] }
        };
    }

    const enabledSeries = chart.series.filter((s) => s.enabled);

    const unitMap = new Map<SeriesId, Unit>();
    const isRelative = chart.config.showRelativeValues ?? false;

    let firstSeriesValue = 1;
    const warnings: DataValidationError[] = [];
    const errors: DataValidationError[] = [];

    // Validate input data
    if (!enabledSeries.length) {
        warnings.push({
            type: 'empty_series',
            seriesId: 'chart',
            message: 'No enabled series available for aggregation. Enable at least one series.'
        });
    }

    const data = enabledSeries.map((series: Series, index: number) => {
        const dataSeries = dataSeriesMap.get(series.id);
        const points = dataSeries?.data ?? [];

        let filteredPoints = points;
        let periodString: string | undefined;

        // Use `any` for series to access the `period` property which may not be in the base Series type
        const seriesConfig = series as Series & { period?: { selection?: { interval?: { start: string; end: string }; dates?: string[] } } };

        if (seriesConfig.period?.selection?.interval) {
            const { start, end } = seriesConfig.period.selection.interval;
            periodString = start === end ? start : `${start}-${end}`;

            const startDate = periodToDate(start, "start");
            const endDate = periodToDate(end, "end");

            if (startDate && endDate) {
                filteredPoints = points.filter((trend) => {
                    const pointDate = periodToDate(String(trend.x), "start");
                    return pointDate && pointDate >= startDate && pointDate <= endDate;
                });
            } else {
                warnings.push({
                    type: "invalid_aggregated_value",
                    seriesId: series.id,
                    message: `Invalid period interval format for aggregation: '${start}-${end}'. Aggregating all points for this series.`,
                });
            }
        } else if (seriesConfig.period?.selection?.dates) {
            const dates = new Set(seriesConfig.period.selection.dates.map((d: string) => String(d).trim()));
            periodString = seriesConfig.period.selection.dates.join(', ');
            filteredPoints = points.filter((trend) => dates.has(String(trend.x).trim()));
        }

        const totalValueRaw = filteredPoints
            .reduce((acc, trend) => acc + (Number.isFinite(trend.y) ? trend.y : 0), 0);

        if (!Number.isFinite(totalValueRaw)) {
            warnings.push({
                type: "invalid_aggregated_value",
                seriesId: series.id,
                message: `Invalid aggregated value auto-set to 0 for period: ${periodString ?? 'all time'}.`,
                value: totalValueRaw,
            });
        }

        const totalValue = Number.isFinite(totalValueRaw) ? totalValueRaw : 0;

        const initialValue = totalValue;
        const initialUnit = dataSeries?.yAxis.unit || "";
        let value = initialValue;
        let unit = initialUnit;

        if (isRelative && index === 0) {
            firstSeriesValue = totalValue;
        }
        if (isRelative) {
            if (firstSeriesValue === 0 || !Number.isFinite(firstSeriesValue)) {
                warnings.push({
                    type: "auto_adjusted_value",
                    seriesId: series.id,
                    message: `Relative base is ${firstSeriesValue}. Auto-set value to 0 for aggregated period ${periodString ?? 'all time'}.`,
                    value: { base: firstSeriesValue, total: totalValue },
                });
                value = 0;
            } else {
                const computed = (totalValue / firstSeriesValue) * 100;
                if (!Number.isFinite(computed)) {
                    warnings.push({
                        type: "auto_adjusted_value",
                        seriesId: series.id,
                        message: `Computed relative value not finite. Auto-set to 0 for ${periodString ?? 'all time'}.`,
                        value: { base: firstSeriesValue, total: totalValue },
                    });
                }
                value = Number.isFinite(computed) ? computed : 0;
            }
            unit = "%";
        }

        unitMap.set(series.id, unit);

        const aggregatedDataPoint: DataPointPayload = {
            id: series.id,
            year: periodString ?? "Aggregated",
            originalLabel: periodString ?? "Aggregated",
            series,
            value,
            unit,
            initialValue,
            initialUnit,
        };

        return aggregatedDataPoint;
    });

    // Validate final aggregated data
    data.forEach((point, index) => {
        if (typeof point.value !== 'number' || !Number.isFinite(point.value)) {
            warnings.push({
                type: 'invalid_aggregated_value',
                seriesId: point.id,
                message: `Final aggregated value is invalid. This will affect chart display.`,
                pointIndex: index,
                value: point.value
            });
        }
    });

    const validation: ValidationResult = {
        isValid: errors.length === 0,
        errors,
        warnings
    };

    return { data, unitMap, validation };
}
