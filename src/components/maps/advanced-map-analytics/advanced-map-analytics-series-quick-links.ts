import type { ChartUrlState } from '@/components/charts/page-schema';
import { generateHash } from '@/lib/utils';
import { ChartSchema, type SeriesConfiguration } from '@/schemas/charts';
import type { EntityAnalyticsUrlState } from '@/routes/entity-analytics';

function buildExecutionSeriesSignature(series: SeriesConfiguration) {
  return {
    label: series.label,
    unit: series.unit ?? '',
    filter: series.filter,
    color: series.config.color ?? null,
    showDataLabels: Boolean(series.config.showDataLabels),
  };
}

export function buildExecutionSeriesTableSearch(
  series: SeriesConfiguration
): EntityAnalyticsUrlState {
  return {
    view: 'table',
    sortOrder: 'desc',
    page: 1,
    pageSize: 25,
    filter: { ...series.filter },
  };
}

export function buildExecutionSeriesChartSearch(
  series: SeriesConfiguration
): ChartUrlState {
  const signature = buildExecutionSeriesSignature(series);
  const chartId = generateHash(
    JSON.stringify({
      type: 'advanced-map-analytics-execution-series-quick-chart',
      signature,
    })
  );
  const seriesId = generateHash(
    JSON.stringify({
      type: 'advanced-map-analytics-execution-series-quick-chart-series',
      chartId,
      signature,
    })
  );
  const now = new Date().toISOString();
  const seriesLabel = series.label.trim().length > 0 ? series.label : 'Execution analytics';
  const seriesColor = series.config.color ?? '#2563eb';

  const chart = ChartSchema.parse({
    id: chartId,
    title: seriesLabel,
    config: {
      chartType: 'bar',
      showGridLines: true,
      showLegend: true,
      showTooltip: true,
      editAnnotations: false,
      showAnnotations: true,
      showDiffControl: false,
    },
    series: [
      {
        id: seriesId,
        type: 'line-items-aggregated-yearly',
        enabled: true,
        label: seriesLabel,
        unit: series.unit ?? '',
        filter: { ...series.filter },
        config: {
          color: seriesColor,
          showDataLabels: Boolean(series.config.showDataLabels),
        },
        createdAt: now,
        updatedAt: now,
      },
    ],
    annotations: [],
    createdAt: now,
    updatedAt: now,
  });

  return {
    chart,
    view: 'overview',
  };
}
