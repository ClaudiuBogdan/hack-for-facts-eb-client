import { ChartSchema, CustomSeriesValueConfigurationSchema } from '@/schemas/charts';
import type { Chart, ChartConfig, AnalyticsFilterType } from '@/schemas/charts';
import type { ChartUrlState } from '@/components/charts/page-schema';
import { createEmptyAlert, type Alert } from '@/schemas/alerts';
import { t } from '@lingui/core/macro';
import { ensureShortRedirectUrl } from '@/lib/api/shortLinks';
import { getSiteUrl } from '@/config/env';
import type { QueryClient } from '@tanstack/react-query';

const DEFAULT_CHART_CONFIG: ChartConfig = {
  chartType: 'line',
  color: '#0062ff',
  showDataLabels: false,
  showGridLines: true,
  showLegend: true,
  showRelativeValues: false,
  showTooltip: true,
  editAnnotations: false,
  showAnnotations: false,
  showDiffControl: false,
};

export function buildAlertPreviewChartState(alert: Alert): ChartUrlState {
  // Create threshold series for each condition
  const thresholdColors = ['#f97316', '#ef4444', '#eab308', '#8b5cf6', '#ec4899'];
  const thresholdSeries = (alert.conditions ?? []).map((condition, index) => {
    const thresholdLabel = t`Threshold ${index + 1} (${condition.unit})`;
    return CustomSeriesValueConfigurationSchema.parse({
      id: `${alert.id}-threshold-${index}`,
      label: thresholdLabel,
      type: 'custom-series-value',
      value: condition.threshold,
      unit: condition.unit,
      config: {
        showDataLabels: false,
        color: thresholdColors[index % thresholdColors.length],
      },
    });
  });

  // Create a basic series configuration for preview
  let primarySeries: Record<string, unknown>;
  if (alert.seriesType === 'static' && alert.datasetId) {
    primarySeries = {
      id: `${alert.id}-series`,
      type: 'static-series',
      seriesId: alert.datasetId,
      label: alert.title || t`Alert series`,
      enabled: true,
      config: {
        showDataLabels: false,
        color: '#0062ff',
      },
    };
  } else {
    primarySeries = {
      id: `${alert.id}-series`,
      type: 'line-items-aggregated-yearly',
      label: alert.title || t`Alert series`,
      enabled: true,
      filter: alert.filter,
      config: {
        showDataLabels: false,
        color: '#0062ff',
      },
    };
  }

  const chart: Chart = ChartSchema.parse({
    id: `${alert.id}-preview`,
    title: alert.title || 'Alert Preview',
    description: alert.description,
    config: {
      ...DEFAULT_CHART_CONFIG,
      color: '#0062ff',
    },
    series: [
      primarySeries,
      ...thresholdSeries,
    ],
    annotations: [],
    createdAt: alert.createdAt,
    updatedAt: new Date().toISOString(),
  });

  return {
    chart,
    view: 'overview',
    seriesId: chart.series[0]?.id,
  };
}

export function buildAlertPreviewChartLink(alert: Alert) {
  const chartState = buildAlertPreviewChartState(alert);
  return {
    to: '/charts/$chartId' as const,
    params: { chartId: chartState.chart.id },
    search: chartState,
  };
}

export function buildAlertFromFilter(filter: AnalyticsFilterType, options?: { chartId?: string; chartTitle?: string; label?: string }): Alert {
  const alertId = crypto.randomUUID();
  const base = createEmptyAlert({
    id: alertId,
    title: options?.chartTitle ? `${options.label || 'Filter'} alert` : options?.label || 'New alert',
    description: options?.chartTitle ? `Alert created from chart "${options.chartTitle}"` : undefined,
  });

  return {
    ...base,
    filter: filter,
    conditions: base.conditions, // Keep default conditions (empty array)
  };
}

/** Build a sanitized payload for sharing/cloning an alert */
export function serializeAlertForShare(alert: Alert): Partial<Alert> {
  return {
    title: alert.title,
    description: alert.description,
    isActive: alert.isActive,
    filter: alert.filter,
    conditions: alert.conditions,
  } as Partial<Alert>;
}

export function buildAlertShareDestination(alert: Alert) {
  return {
    to: '/alerts/new' as const,
    search: { preset: serializeAlertForShare(alert) },
  };
}

export async function ensureAlertShareUrl(
  alert: Alert,
  queryClient: QueryClient
): Promise<string> {
  const dest = buildAlertShareDestination(alert);
  const params = new URLSearchParams();
  params.set('preset', encodeURIComponent(JSON.stringify(dest.search.preset)));
  const url = `${getSiteUrl()}${dest.to}?${params.toString()}`;
  return ensureShortRedirectUrl(url, getSiteUrl(), queryClient);
}
