import { Chart } from '@/schemas/charts';
import { useMemo, type ReactNode } from 'react';
import { yValueFormatter } from '../utils';
import { SeriesId, DataPointPayload } from '../../../hooks/useChartData';
import { Trans } from '@lingui/react/macro';

// ---------------------------------------------------------------------------
// Time-Series Tooltip
// ---------------------------------------------------------------------------


interface TooltipEntry {
    dataKey?: unknown;
    payload?: Record<SeriesId, DataPointPayload> | DataPointPayload;
    name?: string;
    color?: string;
}

interface CustomSeriesTooltipProps {
    active?: boolean;
    payload?: Array<TooltipEntry | DataPointPayload>;
    label?: string | number;
    chartConfig: Chart['config'];
    chart?: Chart;
}

export function CustomSeriesTooltip({
    active,
    payload,
    label,
    chartConfig,
}: CustomSeriesTooltipProps): ReactNode {

    const isAggregated = chartConfig.chartType.endsWith('-aggr');

    const mappedPayload = useMemo(() => {
        if (!payload) return [];
        const usedSeriesIds = new Set<string>();
        const isDataPointPayload = (candidate: unknown): candidate is DataPointPayload => {
            return (
                !!candidate &&
                typeof candidate === 'object' &&
                'id' in candidate &&
                'value' in candidate
            );
        };

        const claimFirstUnmapped = (candidates: DataPointPayload[]): DataPointPayload | undefined => {
            const available = candidates.find((candidate) => !usedSeriesIds.has(candidate.id));
            if (!available) return undefined;
            usedSeriesIds.add(available.id);
            return available;
        };

        const resolved = payload.map((entry) => {
            // Aggregated charts pass DataPointPayload directly
            if (!('payload' in entry)) {
                const candidate = entry as DataPointPayload;
                if (!isDataPointPayload(candidate) || usedSeriesIds.has(candidate.id)) return undefined;
                usedSeriesIds.add(candidate.id);
                return candidate;
            }

            const row = entry.payload as Record<SeriesId, DataPointPayload> | undefined;
            if (!row) return undefined;

            // When dataKey is a string like `${seriesId}.value`, preserve legacy behavior
            if (typeof (entry as TooltipEntry).dataKey === 'string') {
                const dk = String((entry as TooltipEntry).dataKey);
                const seriesId = dk.split('.')[0];
                const customPayload = (row as Record<string, unknown>)[seriesId];
                if (isDataPointPayload(customPayload) && !usedSeriesIds.has(customPayload.id)) {
                    usedSeriesIds.add(customPayload.id);
                    return customPayload;
                }
            }

            // For function dataKeys, prefer unique color+label matches, then color, then label.
            const name = (entry as TooltipEntry).name as string | undefined;
            const color = (entry as TooltipEntry).color as string | undefined;
            const candidates = Object.values(row).filter(isDataPointPayload);

            if (name && color) {
                const byLabelAndColor = claimFirstUnmapped(
                    candidates.filter((v) => v.series?.label === name && v.series?.config?.color === color)
                );
                if (byLabelAndColor) return byLabelAndColor;
            }

            if (color) {
                const byColor = claimFirstUnmapped(
                    candidates.filter((v) => v.series?.config?.color === color)
                );
                if (byColor) return byColor;
            }

            if (name) {
                const byLabel = claimFirstUnmapped(
                    candidates.filter((v) => v.series?.label === name)
                );
                if (byLabel) return byLabel;
            }

            return claimFirstUnmapped(candidates);
        })
            .filter((p): p is DataPointPayload => !!p && 'id' in p)
            .sort((a, b) => b.value - a.value);

        return resolved;
    }, [payload]);

    if (!active || !mappedPayload || mappedPayload.length === 0) return null;

    // Prefer the original per-series label (first payload entry) if present
    const headerLabel = (mappedPayload[0] as DataPointPayload | undefined)?.originalLabel ?? label;

    return (
        <div className="bg-background/50 backdrop-blur-sm border border-border rounded-lg shadow-lg p-4 important:z-50 select-none max-w-sm">
            <div className="font-semibold text-foreground mb-2 text-center border-b pb-1">
                {isAggregated ? <Trans>Aggregated data</Trans> : <Trans>Year {headerLabel}</Trans>}
            </div>

            <div className="flex flex-col p-4 gap-6">
                {mappedPayload.map((dataPoint) => {
                    const { value, unit, initialValue, initialUnit } = dataPoint;

                    const primaryDisplayValue = yValueFormatter(value, unit, 'compact');
                    const secondaryDisplayValue = yValueFormatter(initialValue, initialUnit, 'standard');

                    return (
                        <div
                            key={dataPoint.id}
                            className="flex items-center gap-3 min-w-[140px]"
                        >
                            <span
                                className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: dataPoint.series?.config.color }}
                            />
                            <div className="flex flex-row justify-between gap-6 items-center w-full">
                                <span className="font-medium text-sm text-foreground break-words">
                                    {dataPoint.series?.label}
                                </span>
                                <div className="flex flex-col items-end flex-shrink-0 text-right">
                                    <span className="text-sm font-semibold whitespace-nowrap">
                                        {primaryDisplayValue}
                                    </span>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {secondaryDisplayValue}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
