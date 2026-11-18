import { z } from 'zod';
import { lazySchema, type LazyOutput } from '@/lib/route-contract';
import { analyticsFilterSchema } from './analytics-filter-search';
import { DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES } from '@/lib/analytics-defaults';

export const alertOperatorEnum = lazySchema(() => z.enum(['gt', 'gte', 'lt', 'lte', 'eq']));
export type AlertOperator = LazyOutput<typeof alertOperatorEnum>;

export const alertConditionSchema = lazySchema(() => z.object({
  operator: alertOperatorEnum.schema().default('gt'),
  threshold: z.number().default(0),
  unit: z.string().default('RON'),
}).describe('Simple comparison condition evaluated when new data for the series is available.'));

export type AlertCondition = LazyOutput<typeof alertConditionSchema>;

export const alertSchema = lazySchema(() => z.object({
  id: z.string().uuid().optional(),
  title: z.string().max(200, { message: 'Title must be 200 characters or fewer' }).optional(),
  description: z.string().max(1000, { message: 'Description must be 1000 characters or fewer' }).optional(),
  isActive: z.boolean().optional().default(true),
  notificationType: z.enum(['alert_series_analytics', 'alert_series_static']).optional(),
  // Which kind of alert source: analytics-backed filter vs static dataset
  seriesType: z.enum(['analytics', 'static']).default('analytics'),
  filter: analyticsFilterSchema.schema().default({
    account_category: 'ch',
    report_type: 'Executie bugetara agregata la nivel de ordonator principal',
    exclude: {
      economic_prefixes: [...DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES],
    },
  }),
  // When seriesType is 'static', use datasetId to reference backend dataset
  datasetId: z.string().optional(),
  conditions: z.array(alertConditionSchema.schema()).default([]),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
  lastEvaluatedAt: z.string().optional(),
}).describe('Client-side representation of a data series alert included in monthly newsletters.'));

export type Alert = LazyOutput<typeof alertSchema>;

export const alertViewEnum = lazySchema(() => z.enum(['overview', 'filters', 'preview', 'history']));
export type AlertView = LazyOutput<typeof alertViewEnum>;

export const alertEditorModeEnum = lazySchema(() => z.enum(['create', 'edit']));
export type AlertEditorMode = LazyOutput<typeof alertEditorModeEnum>;

export const alertUrlStateSchema = lazySchema(() => z.object({
  alert: alertSchema.schema(),
  view: alertViewEnum.schema().default('overview'),
  mode: alertEditorModeEnum.schema().default('edit'),
}).describe('Router search schema used when creating or editing alerts.'));

export type AlertUrlState = LazyOutput<typeof alertUrlStateSchema>;

export const newAlertSearchSchema = lazySchema(() => z.object({
  alert: alertSchema.schema().optional(),
  view: alertViewEnum.schema().default('overview'),
  copyFrom: z.string().optional(),
  preset: alertSchema.schema().partial().optional(),
}));
