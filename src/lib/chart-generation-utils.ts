import { Chart, SeriesConfiguration } from "@/schemas/charts";
import { getSeriesColor } from "@/components/charts/components/chart-renderer/utils";
import type { GroupedChapter } from "@/schemas/financial";
import type { AnalyticsFilterType } from "@/schemas/charts";
import { generateHash } from "./utils";

export const generateChartFromTopGroups = (
    groups: GroupedChapter[],
    baseTotal: number,
    filter: AnalyticsFilterType,
    title: string,
    groupBy: 'fn' | 'ec',
    filterHash?: string
): Chart => {
    const topGroups = [...groups]
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .reduce(
            (acc, group) => {
                if (acc.total < baseTotal * 0.9) {
                    acc.groups.push(group);
                    acc.total += group.totalAmount;
                }
                return acc;
            },
            { groups: [] as typeof groups, total: 0 }
        ).groups;

    const chartId = filterHash ?? generateHash(Math.random().toString());

    const series: SeriesConfiguration[] = topGroups.map((group, index) => ({
        id: `${group.prefix}-${chartId}`,
        type: 'line-items-aggregated-yearly',
        label: group.description,
        filter: {
            ...filter,
            functional_prefixes: groupBy === 'fn' ? [group.prefix] : undefined,
            economic_prefixes: groupBy === 'ec' ? [group.prefix] : undefined,
            years: undefined, // Clear years from series filter
        },
        enabled: true,
        config: { color: getSeriesColor(index), showDataLabels: false },
        unit: 'RON',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    }));


    const newChart: Chart = {
        id: chartId,
        title: `Trend for ${title}`,
        config: {
            chartType: 'line',
            showLegend: true,
            showGridLines: true,
            showTooltip: true,
            showDiffControl: true,
            editAnnotations: false,
            showAnnotations: false,
            color: '#000000',
        },
        series,
        annotations: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    return newChart;
};
