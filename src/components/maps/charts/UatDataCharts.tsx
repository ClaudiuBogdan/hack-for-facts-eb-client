import React from 'react';
import { HeatmapCountyDataPoint, HeatmapUATDataPoint } from '@/schemas/heatmap';
import { UatTopNBarChart } from './UatTopNBarChart';
import { UatPopulationSpendingScatterPlot } from './UatPopulationSpendingScatterPlot';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { useMapFilter } from '@/hooks/useMapFilter';
import { useUserCurrency } from '@/lib/hooks/useUserCurrency';
import { AnalyticsFilterType, Chart, Normalization } from '@/schemas/charts';
import { ChartPreview } from '@/components/charts/components/chart-preview/ChartPreview';
import { buildMapTopEntitiesEvolutionChartLink } from '@/lib/chart-links';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { Link } from '@tanstack/react-router';

interface UatDataChartsProps {
    data: (HeatmapUATDataPoint | HeatmapCountyDataPoint)[];
    mapViewType: "UAT" | "County";
    effectiveFilter: AnalyticsFilterType;
}

type TopEntity = {
    id: string;
    label: string;
};

const TOP_ENTITIES_COUNT = 15;

export const UatDataCharts: React.FC<UatDataChartsProps> = ({ data, mapViewType, effectiveFilter }) => {
    const { mapState } = useMapFilter();
    const [userCurrency] = useUserCurrency();
    const chartData = data ?? [];
    const hasChartData = chartData.length > 0;

    const isUatView = mapViewType === 'UAT';
    const normalizationRaw = mapState.filters.normalization ?? 'total';
    let normalization: Normalization;
    if (normalizationRaw === 'total_euro') {
        normalization = 'total';
    } else if (normalizationRaw === 'per_capita_euro') {
        normalization = 'per_capita';
    } else {
        normalization = normalizationRaw;
    }
    const currency =
        normalizationRaw === 'total_euro' || normalizationRaw === 'per_capita_euro'
            ? 'EUR'
            : (mapState.filters.currency ?? userCurrency);
    const hasIntervalSelection = Boolean(effectiveFilter.report_period?.selection?.interval);

    const topEntities = React.useMemo<TopEntity[]>(() => {
        const entities: TopEntity[] = [];
        const seenEntityIds = new Set<string>();
        const rankedData = [...chartData].sort((a, b) => b.total_amount - a.total_amount);

        for (const item of rankedData) {
            const entityId =
                isUatView
                    ? ('uat_code' in item ? item.uat_code : undefined)
                    : ('county_entity' in item ? item.county_entity?.cui : undefined);
            const label =
                isUatView
                    ? ('uat_name' in item ? item.uat_name : undefined)
                    : ('county_name' in item ? item.county_name : undefined);

            if (!entityId || !label || seenEntityIds.has(entityId)) continue;

            entities.push({ id: entityId, label });
            seenEntityIds.add(entityId);

            if (entities.length >= TOP_ENTITIES_COUNT) break;
        }

        return entities;
    }, [chartData, isUatView]);

    const intervalEvolutionChartLink = React.useMemo(() => {
        if (!hasIntervalSelection || topEntities.length === 0) return null;
        return buildMapTopEntitiesEvolutionChartLink({
            topEntities,
            effectiveFilter,
            mapViewType,
        });
    }, [effectiveFilter, hasIntervalSelection, mapViewType, topEntities]);

    const intervalEvolutionChart: Chart | null = intervalEvolutionChartLink?.search.chart ?? null;

    if (!hasChartData) {
        return <p className="text-center text-muted-foreground">{t`No data available to display charts.`}</p>;
    }

    return (
        <div className="space-y-8 p-4 md:p-6 pb-12 md:pb-14">
            <div className="p-4 border rounded-lg bg-card shadow-lg">
                <UatTopNBarChart
                    data={chartData}
                    valueKey="total_amount"
                    nameKey={isUatView ? "uat_name" : "county_name"}
                    topN={15}
                    chartTitle={isUatView ? t`Top 15 UATs by Total Amount` : t`Top 15 Counties by Total Amount`}
                    xAxisLabel={t`Amount`}
                    yAxisLabel={isUatView ? t`UAT` : t`County`}
                    isCurrency={true}
                    normalization={normalization}
                    currency={currency}
                />
            </div>

            {hasIntervalSelection && (
                <div className="p-4 pb-8 border rounded-lg bg-card shadow-lg">
                    {intervalEvolutionChartLink && (
                        <div className="mb-4 flex justify-end">
                            <Button asChild variant="outline" size="sm">
                                <Link
                                    to={intervalEvolutionChartLink.to}
                                    params={intervalEvolutionChartLink.params}
                                    search={intervalEvolutionChartLink.search}
                                    preload="intent"
                                >
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    <Trans>Open in Chart Editor</Trans>
                                </Link>
                            </Button>
                        </div>
                    )}
                    {intervalEvolutionChart ? (
                        <ChartPreview chart={intervalEvolutionChart} height={420} margins={{ bottom: 24 }} />
                    ) : (
                        <p className="text-center text-sm text-muted-foreground">{t`Not enough entities available to display evolution.`}</p>
                    )}
                </div>
            )}

            <div className="p-4 border rounded-lg bg-card shadow-lg">
                <UatPopulationSpendingScatterPlot
                    data={chartData}
                    chartTitle={t`Population vs. Total Amount`}
                    xAxisLabel={t`Population`}
                    yAxisLabel={t`Amount`}
                    normalization={normalization}
                    currency={currency}
                />
            </div>

            {/* Removed county-level charts per request */}
        </div>
    );
};
