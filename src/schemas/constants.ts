import { z } from "zod";

export const ChartTypeEnum = z.enum(['line', 'bar', 'area', 'bar-aggr', 'pie-aggr', 'treemap-aggr', 'sankey-aggr']);
export type ChartType = z.infer<typeof ChartTypeEnum>;

export const AnnotationTypeEnum = z.enum(['point', 'line', 'threshold', 'region']);
export type AnnotationType = z.infer<typeof AnnotationTypeEnum>;

export const DEFAULT_CHART_CONFIG = {
    chartType: 'line' as ChartType,
    color: '#0062ff',
    showDataLabels: false,
    showGridLines: true,
    showLegend: true,
    showRelativeValues: false,
    showTooltip: true,
    editAnnotations: true,
    showAnnotations: true,
};

export const DEFAULT_SERIES_CONFIG = {
    yAxisId: 'left' as const,
};

export const DEFAULT_AXIS_CONFIG = {
    showTicks: true,
    showTickLabels: true,
    scale: 'linear',
    formatter: 'number',
};


/**
 * A factory, not a constant: `id`, `createdAt` and `updatedAt` have to be
 * minted per chart. As a module-level object literal these were evaluated once
 * at import, so every chart falling back to this default shared one UUID and
 * one timestamp — on the SSR server, the timestamp of process start.
 */
export const createDefaultChart = () => ({
    id: crypto.randomUUID(),
    title: '',
    description: '',
    config: DEFAULT_CHART_CONFIG,
    series: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    annotations: [],
});