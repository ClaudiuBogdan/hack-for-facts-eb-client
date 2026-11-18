import { z } from "zod";
import { CHART_TYPES } from "./chart-defaults";

export { DEFAULT_CHART_CONFIG, createDefaultChart } from "./chart-defaults";

export const ChartTypeEnum = z.enum(CHART_TYPES);
export type ChartType = z.infer<typeof ChartTypeEnum>;

export const AnnotationTypeEnum = z.enum(['point', 'line', 'threshold', 'region']);
export type AnnotationType = z.infer<typeof AnnotationTypeEnum>;

export const DEFAULT_SERIES_CONFIG = {
    yAxisId: 'left' as const,
};

export const DEFAULT_AXIS_CONFIG = {
    showTicks: true,
    showTickLabels: true,
    scale: 'linear',
    formatter: 'number',
};
