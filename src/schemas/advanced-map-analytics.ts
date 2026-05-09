import { z } from 'zod';
import {
  CommitmentsSeriesConfigurationSchema,
  SeriesConfigurationSchema,
  InsSeriesConfigurationSchema,
  SeriesGroupConfigurationSchema,
  createDefaultCommitmentsYearReportPeriod,
  createDefaultExecutionYearReportPeriod,
  type CommitmentsSeriesConfiguration,
  type SeriesConfiguration,
  type InsSeriesConfiguration,
  type SeriesGroupConfiguration,
} from '@/schemas/charts';
import { DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES } from '@/lib/analytics-defaults';

export const ADVANCED_MAP_ANALYTICS_VERSION = 1 as const;
const ADVANCED_MAP_ANALYTICS_ID_LENGTH = 6;
const ADVANCED_MAP_ANALYTICS_ID_MAX_ATTEMPTS = 256;

export function createAdvancedMapAnalyticsId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, ADVANCED_MAP_ANALYTICS_ID_LENGTH);
}

export function createUniqueAdvancedMapAnalyticsId(existingIds: Iterable<string>): string {
  const usedIds = new Set(existingIds);

  for (let attempt = 0; attempt < ADVANCED_MAP_ANALYTICS_ID_MAX_ATTEMPTS; attempt += 1) {
    const candidateId = createAdvancedMapAnalyticsId();
    if (usedIds.has(candidateId)) {
      continue;
    }
    return candidateId;
  }

  throw new Error('Failed to generate a unique advanced map analytics id.');
}

export const GEOJSON_POPULATION_DATASET_KEYS = [
  'insPop2021',
] as const;

export const GeoJsonDatasetKeySchema = z.enum(GEOJSON_POPULATION_DATASET_KEYS);
export type GeoJsonDatasetKey = z.infer<typeof GeoJsonDatasetKeySchema>;

export interface GeoJsonFilterOption {
  id: number;
  name: string;
}

const GEOJSON_DATASET_LABELS_BY_KEY: Record<GeoJsonDatasetKey, string> = {
  insPop2021: 'INS Population 2021',
};

const GEOJSON_DATASET_UNITS_BY_KEY: Record<GeoJsonDatasetKey, string> = {
  insPop2021: 'inhabitants',
};

export function getGeoJsonDatasetUnit(datasetKey: GeoJsonDatasetKey): string {
  return GEOJSON_DATASET_UNITS_BY_KEY[datasetKey];
}

export function getGeoJsonDatasetLabel(datasetKey: GeoJsonDatasetKey): string {
  return GEOJSON_DATASET_LABELS_BY_KEY[datasetKey];
}

const MapSeriesDisplayConfigSchema = z.object({
  showDataLabels: z.boolean().default(false),
  color: z.string().default('#2563eb'),
}).default({
  showDataLabels: false,
  color: '#2563eb',
});

const GeoJsonFilterIdsSchema = z
  .array(z.number().int())
  .transform((ids) => [...new Set(ids)].sort((left, right) => left - right))
  .default([]);

export const TerritorialGranularitySchema = z.enum([
  'country',
  'macroregion',
  'development_region',
  'county',
  'uat',
  'locality',
  'custom',
]);
export type TerritorialGranularity = z.infer<typeof TerritorialGranularitySchema>;

const MapSeriesScopeSchema = z.object({
  groupWorkspaceId: z.string().optional(),
  granularity: TerritorialGranularitySchema.optional(),
});

function isPlainAdvancedMapAnalyticsRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}

function hasAdvancedMapAnalyticsOwnKey(input: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(input, key);
}

function migrateLegacyMapSeriesInput(input: unknown): unknown {
  if (!isPlainAdvancedMapAnalyticsRecord(input)) {
    return input;
  }

  const migratedInput: Record<string, unknown> = { ...input };
  if (
    !hasAdvancedMapAnalyticsOwnKey(migratedInput, 'groupWorkspaceId') &&
    hasAdvancedMapAnalyticsOwnKey(migratedInput, 'groupingId')
  ) {
    migratedInput.groupWorkspaceId = migratedInput.groupingId;
  }

  return migratedInput;
}

function migrateLegacyAdvancedMapAnalyticsStateInput(input: unknown): unknown {
  if (!isPlainAdvancedMapAnalyticsRecord(input)) {
    return input;
  }

  const migratedInput: Record<string, unknown> = { ...input };
  const legacyShowCountyBoundaries = migratedInput.showCountyBoundaries;
  if (typeof legacyShowCountyBoundaries === 'boolean') {
    const rawMapLayers = migratedInput.mapLayers;
    if (!isPlainAdvancedMapAnalyticsRecord(rawMapLayers)) {
      migratedInput.mapLayers = {
        countyBoundaries: legacyShowCountyBoundaries,
      };
    } else if (!hasAdvancedMapAnalyticsOwnKey(rawMapLayers, 'countyBoundaries')) {
      migratedInput.mapLayers = {
        ...rawMapLayers,
        countyBoundaries: legacyShowCountyBoundaries,
      };
    }
  }

  if (
    !hasAdvancedMapAnalyticsOwnKey(migratedInput, 'groupWorkspaces') &&
    hasAdvancedMapAnalyticsOwnKey(migratedInput, 'groupings')
  ) {
    migratedInput.groupWorkspaces = migratedInput.groupings;
  }

  if (
    !hasAdvancedMapAnalyticsOwnKey(migratedInput, 'activeGroupWorkspaceId') &&
    hasAdvancedMapAnalyticsOwnKey(migratedInput, 'activeGroupingId')
  ) {
    migratedInput.activeGroupWorkspaceId = migratedInput.activeGroupingId;
  }

  if (Array.isArray(migratedInput.series)) {
    migratedInput.series = migratedInput.series.map((series) =>
      migrateLegacyMapSeriesInput(series)
    );
  }

  return migratedInput;
}

const MapExecutionSeriesConfigurationSchema = SeriesConfigurationSchema.extend(MapSeriesScopeSchema.shape);
const MapCommitmentsSeriesConfigurationSchema = CommitmentsSeriesConfigurationSchema.extend(MapSeriesScopeSchema.shape);
const MapInsSeriesConfigurationSchema = InsSeriesConfigurationSchema.extend(MapSeriesScopeSchema.shape);
const MapSeriesGroupConfigurationSchema = SeriesGroupConfigurationSchema.extend(MapSeriesScopeSchema.shape);

export const GeoJsonDatasetSeriesConfigurationSchema = z.object({
  id: z.string().default(() => createAdvancedMapAnalyticsId()),
  type: z.literal('geojson-dataset-series'),
  enabled: z.boolean().default(true),
  label: z.string().default('GeoJSON dataset'),
  unit: z.string().optional().default(''),
  groupWorkspaceId: z.string().optional(),
  granularity: TerritorialGranularitySchema.optional(),
  datasetKey: GeoJsonDatasetKeySchema.default('insPop2021'),
  countyFilterIds: GeoJsonFilterIdsSchema,
  regionFilterIds: GeoJsonFilterIdsSchema,
  config: MapSeriesDisplayConfigSchema,
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export const UploadedMapDatasetSeriesConfigurationSchema = z.object({
  id: z.string().default(() => createAdvancedMapAnalyticsId()),
  type: z.literal('uploaded-map-dataset'),
  enabled: z.boolean().default(true),
  label: z.string().default('Uploaded dataset'),
  unit: z.string().optional().default(''),
  groupWorkspaceId: z.string().optional(),
  granularity: TerritorialGranularitySchema.optional(),
  datasetId: z.string().uuid().optional(),
  datasetPublicId: z.string().uuid().optional(),
  config: MapSeriesDisplayConfigSchema,
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
}).superRefine((series, context) => {
  const hasDatasetId = typeof series.datasetId === 'string' && series.datasetId.trim().length > 0;
  const hasDatasetPublicId =
    typeof series.datasetPublicId === 'string' && series.datasetPublicId.trim().length > 0;

  if (hasDatasetId !== hasDatasetPublicId) {
    return;
  }

  context.addIssue({
    code: z.ZodIssueCode.custom,
    path: ['datasetId'],
    message: 'uploaded-map-dataset requires exactly one of datasetId or datasetPublicId',
  });
});

export type GeoJsonDatasetSeriesConfiguration = z.infer<typeof GeoJsonDatasetSeriesConfigurationSchema>;
export type UploadedMapDatasetSeriesConfiguration = z.infer<typeof UploadedMapDatasetSeriesConfigurationSchema>;

export const MapGroupSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  memberSirutaCodes: z
    .array(z.string())
    .transform((codes) => [...new Set(codes.map((code) => code.trim()).filter(Boolean))])
    .default([]),
  primarySirutaCode: z.string().optional(),
  memberOrder: z
    .array(z.string())
    .transform((codes) => [...new Set(codes.map((code) => code.trim()).filter(Boolean))])
    .optional(),
});

export const MapGroupWorkspaceSchema = z.object({
  id: z.string(),
  key: z.string(),
  label: z.string().default('Grouping'),
  granularity: TerritorialGranularitySchema.optional(),
  groups: z.array(MapGroupSchema).default([]),
}).superRefine((grouping, context) => {
  const groupIds = new Set<string>();
  const memberOwnerBySirutaCode = new Map<string, string>();

  grouping.groups.forEach((group, groupIndex) => {
    if (groupIds.has(group.id)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['groups', groupIndex, 'id'],
        message: `Duplicate group id ${group.id}.`,
      });
    }
    groupIds.add(group.id);

    if (group.primarySirutaCode && !group.memberSirutaCodes.includes(group.primarySirutaCode)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['groups', groupIndex, 'primarySirutaCode'],
        message: 'primarySirutaCode must be part of memberSirutaCodes.',
      });
    }

    group.memberSirutaCodes.forEach((sirutaCode, memberIndex) => {
      const ownerGroupId = memberOwnerBySirutaCode.get(sirutaCode);
      if (ownerGroupId) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['groups', groupIndex, 'memberSirutaCodes', memberIndex],
          message: `SIRUTA ${sirutaCode} is already assigned to group ${ownerGroupId}.`,
        });
        return;
      }

      memberOwnerBySirutaCode.set(sirutaCode, group.id);
    });
  });
});

export type MapGroup = z.infer<typeof MapGroupSchema>;
export type MapGroupWorkspace = z.infer<typeof MapGroupWorkspaceSchema>;

export const MapGroupedValueSeriesAggregationSchema = z.enum(['sum', 'first']);
export type MapGroupedValueSeriesAggregation = z.infer<typeof MapGroupedValueSeriesAggregationSchema>;

const MapGroupedValueSeriesConfigurationBaseSchema = z.object({
  id: z.string().default(() => createAdvancedMapAnalyticsId()),
  type: z.literal('map-grouped-value-series'),
  enabled: z.boolean().default(true),
  label: z.string().default('Grouped value series'),
  unit: z.string().optional().default(''),
  sourceSeriesId: z.string().default(''),
  groupWorkspaceId: z.string().default(''),
  granularity: TerritorialGranularitySchema.optional(),
  aggregation: MapGroupedValueSeriesAggregationSchema.default('sum'),
  config: MapSeriesDisplayConfigSchema,
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export const MapGroupedValueSeriesConfigurationSchema = z.preprocess(
  migrateLegacyMapSeriesInput,
  MapGroupedValueSeriesConfigurationBaseSchema
);

export type MapGroupedValueSeriesConfiguration = z.infer<typeof MapGroupedValueSeriesConfigurationSchema>;

const MapSupportedSeriesBaseSchema = z.discriminatedUnion('type', [
  MapExecutionSeriesConfigurationSchema,
  MapCommitmentsSeriesConfigurationSchema,
  MapInsSeriesConfigurationSchema,
  GeoJsonDatasetSeriesConfigurationSchema,
  UploadedMapDatasetSeriesConfigurationSchema,
  MapGroupedValueSeriesConfigurationBaseSchema,
  MapSeriesGroupConfigurationSchema,
]);

export const MapSupportedSeriesSchema = z.preprocess(
  migrateLegacyMapSeriesInput,
  MapSupportedSeriesBaseSchema
);

export type MapSupportedSeries = z.infer<typeof MapSupportedSeriesSchema>;

export const CopiedAdvancedMapSeriesSchema = z.object({
  type: z.literal('advanced-map-series-copy'),
  payload: z.array(MapSupportedSeriesSchema),
});
export type CopiedAdvancedMapSeries = z.infer<typeof CopiedAdvancedMapSeriesSchema>;

export type MapCalculationSeries = Extract<
  MapSupportedSeries,
  { type: 'aggregated-series-calculation' }
>;
export type MapGroupedValueSeries = Extract<
  MapSupportedSeries,
  { type: 'map-grouped-value-series' }
>;

export type MapBaseSeries = Exclude<
  MapSupportedSeries,
  MapCalculationSeries | MapGroupedValueSeries
>;

export const AdvancedMapAnalyticsBinSchema = z.object({
  id: z.string().default(() => createAdvancedMapAnalyticsId()),
  min: z.number(),
  max: z.number().nullable(),
  label: z.string().default(''),
  color: z.string().default('#d7301f'),
  disabled: z.boolean().optional(),
});

export const AdvancedMapAnalyticsBinsPresetConfigSchema = z.object({
  title: z.string().default(''),
  scale: z.literal('sequential').default('sequential'),
  showBinLabelOnLegend: z.boolean().default(true),
  intervalMode: z.enum(['discrete', 'continuous']).default('discrete'),
  colorMode: z.enum(['manual', 'gradient']).default('manual'),
  gradient: z
    .object({
      startColor: z.string().default('#fff7bc'),
      endColor: z.string().default('#d7301f'),
    })
    .default({
      startColor: '#fff7bc',
      endColor: '#d7301f',
    }),
  noData: z
    .object({
      label: z.string().default('Fara date'),
      color: z.string().default('#cccccc'),
      showInTooltip: z.boolean().default(true),
    })
    .default({
      label: 'Fara date',
      color: '#cccccc',
      showInTooltip: true,
    }),
  boundaries: z
    .object({
      minInclusive: z.literal(true).default(true),
      maxExclusive: z.literal(true).default(true),
    })
    .default({
      minInclusive: true,
      maxExclusive: true,
    }),
  continuousPercentiles: z
    .object({
      min: z.number().min(0).max(100).default(5),
      max: z.number().min(0).max(100).default(95),
    })
    .superRefine((value, context) => {
      if (value.min < value.max) {
        return;
      }

      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['min'],
        message: 'continuousPercentiles.min must be less than continuousPercentiles.max.',
      });
    })
    .default({
      min: 5,
      max: 95,
    }),
  bins: z.array(AdvancedMapAnalyticsBinSchema).default([]),
  defaultBinCount: z.number().int().min(1).default(5),
});

export type AdvancedMapAnalyticsBin = z.infer<typeof AdvancedMapAnalyticsBinSchema>;
export type AdvancedMapAnalyticsBinsPresetConfig = z.infer<typeof AdvancedMapAnalyticsBinsPresetConfigSchema>;

export const AdvancedMapAnalyticsActiveViewSchema = z.enum(['map', 'table', 'analytics']);
export type AdvancedMapAnalyticsActiveView = z.infer<typeof AdvancedMapAnalyticsActiveViewSchema>;

export const ADVANCED_MAP_ANALYTICS_WIDGET_KEYS = [
  'series_coverage',
  'series_totals',
  'distribution',
  'outliers',
] as const;

export const AdvancedMapAnalyticsWidgetKeySchema = z.enum(ADVANCED_MAP_ANALYTICS_WIDGET_KEYS);
export type AdvancedMapAnalyticsWidgetKey = z.infer<typeof AdvancedMapAnalyticsWidgetKeySchema>;

const AdvancedMapAnalyticsWidgetBaseSchema = z.object({
  enabled: z.boolean().default(true),
});

const AdvancedMapAnalyticsSeriesCoverageWidgetSchema = AdvancedMapAnalyticsWidgetBaseSchema.extend({
  key: z.literal('series_coverage'),
  showCoveragePercent: z.boolean().default(true),
});

const AdvancedMapAnalyticsSeriesTotalsWidgetSchema = AdvancedMapAnalyticsWidgetBaseSchema.extend({
  key: z.literal('series_totals'),
});

const AdvancedMapAnalyticsWidgetViewModeSchema = z.enum(['chart', 'table']);
export type AdvancedMapAnalyticsWidgetViewMode = z.infer<typeof AdvancedMapAnalyticsWidgetViewModeSchema>;

const AdvancedMapAnalyticsBinMethodSchema = z.enum(['equal-width', 'log']);
export type AdvancedMapAnalyticsBinMethod = z.infer<typeof AdvancedMapAnalyticsBinMethodSchema>;

const AdvancedMapAnalyticsDistributionWidgetSchema = AdvancedMapAnalyticsWidgetBaseSchema.extend({
  key: z.literal('distribution'),
  seriesId: z.string().optional(),
  binCount: z.number().int().min(3).max(30).default(10),
  binMethod: AdvancedMapAnalyticsBinMethodSchema.default('log'),
  viewMode: AdvancedMapAnalyticsWidgetViewModeSchema.default('chart'),
});

const AdvancedMapAnalyticsOutliersWidgetSchema = AdvancedMapAnalyticsWidgetBaseSchema.extend({
  key: z.literal('outliers'),
  seriesId: z.string().optional(),
  method: z.literal('iqr').default('iqr'),
  iqrMultiplier: z.number().positive().default(1.5),
  limit: z.number().int().min(1).max(100).default(10),
  viewMode: AdvancedMapAnalyticsWidgetViewModeSchema.default('table'),
  scatterXSeriesId: z.string().optional(),
  scatterYSeriesId: z.string().optional(),
});

export const AdvancedMapAnalyticsWidgetSchema = z.discriminatedUnion('key', [
  AdvancedMapAnalyticsSeriesCoverageWidgetSchema,
  AdvancedMapAnalyticsSeriesTotalsWidgetSchema,
  AdvancedMapAnalyticsDistributionWidgetSchema,
  AdvancedMapAnalyticsOutliersWidgetSchema,
]);
export type AdvancedMapAnalyticsWidget = z.infer<typeof AdvancedMapAnalyticsWidgetSchema>;
export type AdvancedMapAnalyticsSeriesCoverageWidget = z.infer<typeof AdvancedMapAnalyticsSeriesCoverageWidgetSchema>;
export type AdvancedMapAnalyticsSeriesTotalsWidget = z.infer<typeof AdvancedMapAnalyticsSeriesTotalsWidgetSchema>;
export type AdvancedMapAnalyticsDistributionWidget = z.infer<typeof AdvancedMapAnalyticsDistributionWidgetSchema>;
export type AdvancedMapAnalyticsOutliersWidget = z.infer<typeof AdvancedMapAnalyticsOutliersWidgetSchema>;

export const AdvancedMapAnalyticsValueRuleJoinSchema = z.enum(['AND', 'OR']);
export type AdvancedMapAnalyticsValueRuleJoin = z.infer<typeof AdvancedMapAnalyticsValueRuleJoinSchema>;

export const AdvancedMapAnalyticsValueFilterRuleKindSchema = z.enum(['threshold', 'stats']);
export type AdvancedMapAnalyticsValueFilterRuleKind = z.infer<typeof AdvancedMapAnalyticsValueFilterRuleKindSchema>;

export const AdvancedMapAnalyticsValueFilterSeriesRefSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('active'),
  }),
  z.object({
    mode: z.literal('series'),
    seriesId: z.string(),
  }),
]);
export type AdvancedMapAnalyticsValueFilterSeriesRef = z.infer<typeof AdvancedMapAnalyticsValueFilterSeriesRefSchema>;

export const AdvancedMapAnalyticsValueFilterOperatorSchema = z.enum([
  'gt',
  'gte',
  'lt',
  'lte',
  'eq',
  'neq',
  'between',
  'not_between',
  'is_defined',
  'is_undefined',
]);
export type AdvancedMapAnalyticsValueFilterOperator = z.infer<typeof AdvancedMapAnalyticsValueFilterOperatorSchema>;

const AdvancedMapAnalyticsValueFilterRuleBaseSchema = z.object({
  id: z.string().default(() => createAdvancedMapAnalyticsId()),
  name: z.string().default(''),
  enabled: z.boolean().default(true),
  joinWithPrevious: AdvancedMapAnalyticsValueRuleJoinSchema.default('AND'),
  seriesRef: AdvancedMapAnalyticsValueFilterSeriesRefSchema.default({
    mode: 'active',
  }),
});

export const AdvancedMapAnalyticsThresholdValueFilterRuleSchema = AdvancedMapAnalyticsValueFilterRuleBaseSchema.extend({
  kind: z.literal('threshold'),
  operator: AdvancedMapAnalyticsValueFilterOperatorSchema.default('is_defined'),
  value: z.number().optional(),
  secondValue: z.number().optional(),
}).superRefine((rule, context) => {
  const operator = rule.operator;
  const hasValue = rule.value !== undefined;
  const hasSecondValue = rule.secondValue !== undefined;

  if (operator === 'is_defined' || operator === 'is_undefined') {
    if (hasValue) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['value'],
        message: `${operator} does not accept a value parameter.`,
      });
    }
    if (hasSecondValue) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['secondValue'],
        message: `${operator} does not accept a secondValue parameter.`,
      });
    }
    return;
  }

  if (operator === 'between' || operator === 'not_between') {
    if (!hasValue) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['value'],
        message: `${operator} requires a value parameter.`,
      });
    }
    if (!hasSecondValue) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['secondValue'],
        message: `${operator} requires a secondValue parameter.`,
      });
    }
    return;
  }

  if (!hasValue) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['value'],
      message: `${operator} requires a value parameter.`,
    });
  }

  if (hasSecondValue) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['secondValue'],
      message: `${operator} does not accept a secondValue parameter.`,
    });
  }
});
export type AdvancedMapAnalyticsThresholdValueFilterRule = z.infer<typeof AdvancedMapAnalyticsThresholdValueFilterRuleSchema>;

export const AdvancedMapAnalyticsStatsFilterTypeSchema = z.enum([
  'percentile_band',
  'rank',
  'median_compare',
  'zscore',
  'iqr_outlier',
  'mad_robust_zscore',
]);
export type AdvancedMapAnalyticsStatsFilterType = z.infer<typeof AdvancedMapAnalyticsStatsFilterTypeSchema>;

export const AdvancedMapAnalyticsStatsRankDirectionSchema = z.enum(['top', 'bottom']);
export type AdvancedMapAnalyticsStatsRankDirection = z.infer<typeof AdvancedMapAnalyticsStatsRankDirectionSchema>;

export const AdvancedMapAnalyticsStatsMedianCompareModeSchema = z.enum(['gt', 'gte', 'lt', 'lte']);
export type AdvancedMapAnalyticsStatsMedianCompareMode = z.infer<typeof AdvancedMapAnalyticsStatsMedianCompareModeSchema>;

export const AdvancedMapAnalyticsStatsZScoreModeSchema = z.enum(['abs_gte', 'gte', 'lte']);
export type AdvancedMapAnalyticsStatsZScoreMode = z.infer<typeof AdvancedMapAnalyticsStatsZScoreModeSchema>;

export const AdvancedMapAnalyticsStatsIqrSideSchema = z.enum(['upper', 'lower', 'both']);
export type AdvancedMapAnalyticsStatsIqrSide = z.infer<typeof AdvancedMapAnalyticsStatsIqrSideSchema>;

const AdvancedMapAnalyticsStatsPercentileRuleSchema = AdvancedMapAnalyticsValueFilterRuleBaseSchema.extend({
  kind: z.literal('stats'),
  statsType: z.literal('percentile_band'),
  minPercentile: z.number().min(0).max(100).default(0),
  maxPercentile: z.number().min(0).max(100).default(100),
});

const AdvancedMapAnalyticsStatsRankRuleSchema = AdvancedMapAnalyticsValueFilterRuleBaseSchema.extend({
  kind: z.literal('stats'),
  statsType: z.literal('rank'),
  direction: AdvancedMapAnalyticsStatsRankDirectionSchema.default('top'),
  count: z.number().int().min(1).default(10),
});

const AdvancedMapAnalyticsStatsMedianRuleSchema = AdvancedMapAnalyticsValueFilterRuleBaseSchema.extend({
  kind: z.literal('stats'),
  statsType: z.literal('median_compare'),
  mode: AdvancedMapAnalyticsStatsMedianCompareModeSchema.default('gte'),
});

const AdvancedMapAnalyticsStatsZScoreRuleSchema = AdvancedMapAnalyticsValueFilterRuleBaseSchema.extend({
  kind: z.literal('stats'),
  statsType: z.literal('zscore'),
  mode: AdvancedMapAnalyticsStatsZScoreModeSchema.default('abs_gte'),
  threshold: z.number().positive().default(2),
});

const AdvancedMapAnalyticsStatsIqrRuleSchema = AdvancedMapAnalyticsValueFilterRuleBaseSchema.extend({
  kind: z.literal('stats'),
  statsType: z.literal('iqr_outlier'),
  side: AdvancedMapAnalyticsStatsIqrSideSchema.default('both'),
  multiplier: z.number().positive().default(1.5),
});

const AdvancedMapAnalyticsStatsMadRuleSchema = AdvancedMapAnalyticsValueFilterRuleBaseSchema.extend({
  kind: z.literal('stats'),
  statsType: z.literal('mad_robust_zscore'),
  threshold: z.number().positive().default(3.5),
});

export const AdvancedMapAnalyticsStatsValueFilterRuleSchema = z.union([
  AdvancedMapAnalyticsStatsPercentileRuleSchema,
  AdvancedMapAnalyticsStatsRankRuleSchema,
  AdvancedMapAnalyticsStatsMedianRuleSchema,
  AdvancedMapAnalyticsStatsZScoreRuleSchema,
  AdvancedMapAnalyticsStatsIqrRuleSchema,
  AdvancedMapAnalyticsStatsMadRuleSchema,
]);
export type AdvancedMapAnalyticsStatsValueFilterRule = z.infer<typeof AdvancedMapAnalyticsStatsValueFilterRuleSchema>;

const AdvancedMapAnalyticsAnyValueFilterRuleSchema = z.union([
  AdvancedMapAnalyticsThresholdValueFilterRuleSchema,
  AdvancedMapAnalyticsStatsPercentileRuleSchema,
  AdvancedMapAnalyticsStatsRankRuleSchema,
  AdvancedMapAnalyticsStatsMedianRuleSchema,
  AdvancedMapAnalyticsStatsZScoreRuleSchema,
  AdvancedMapAnalyticsStatsIqrRuleSchema,
  AdvancedMapAnalyticsStatsMadRuleSchema,
]);

export const AdvancedMapAnalyticsValueFilterRuleSchema = AdvancedMapAnalyticsAnyValueFilterRuleSchema;
export type AdvancedMapAnalyticsValueFilterRule = z.infer<typeof AdvancedMapAnalyticsValueFilterRuleSchema>;

export const AdvancedMapAnalyticsValueFilterGroupSchema = z.object({
  rules: z.array(AdvancedMapAnalyticsValueFilterRuleSchema).default([]),
}).strict();
export type AdvancedMapAnalyticsValueFilterGroup = z.infer<typeof AdvancedMapAnalyticsValueFilterGroupSchema>;

export function createDefaultAdvancedMapAnalyticsBinsPresetConfig(): AdvancedMapAnalyticsBinsPresetConfig {
  return AdvancedMapAnalyticsBinsPresetConfigSchema.parse({});
}

export const AdvancedMapAnalyticsBinsPresetSchema = z.object({
  id: z.string().default(() => createAdvancedMapAnalyticsId()),
  label: z.string().default('Bins preset'),
  config: AdvancedMapAnalyticsBinsPresetConfigSchema.default(createDefaultAdvancedMapAnalyticsBinsPresetConfig()),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type AdvancedMapAnalyticsBinsPreset = z.infer<typeof AdvancedMapAnalyticsBinsPresetSchema>;

export function createDefaultAdvancedMapAnalyticsBinsPreset(
  label: string = 'Bins preset'
): AdvancedMapAnalyticsBinsPreset {
  return AdvancedMapAnalyticsBinsPresetSchema.parse({
    label,
  });
}

type AdvancedMapAnalyticsWidgetByKey<T extends AdvancedMapAnalyticsWidgetKey> = Extract<
  AdvancedMapAnalyticsWidget,
  { key: T }
>;

function createDefaultAdvancedMapAnalyticsWidget<T extends AdvancedMapAnalyticsWidgetKey>(
  key: T
): AdvancedMapAnalyticsWidgetByKey<T> {
  if (key === 'series_coverage') {
    return AdvancedMapAnalyticsWidgetSchema.parse({
      key,
      enabled: true,
      showCoveragePercent: true,
    }) as AdvancedMapAnalyticsWidgetByKey<T>;
  }

  if (key === 'series_totals') {
    return AdvancedMapAnalyticsWidgetSchema.parse({
      key,
      enabled: true,
    }) as AdvancedMapAnalyticsWidgetByKey<T>;
  }

  if (key === 'distribution') {
    return AdvancedMapAnalyticsWidgetSchema.parse({
      key,
      enabled: true,
      binCount: 10,
    }) as AdvancedMapAnalyticsWidgetByKey<T>;
  }

  return AdvancedMapAnalyticsWidgetSchema.parse({
    key: 'outliers',
    enabled: true,
    method: 'iqr',
    iqrMultiplier: 1.5,
    limit: 10,
  }) as AdvancedMapAnalyticsWidgetByKey<T>;
}

export function createDefaultAdvancedMapAnalyticsWidgets(): AdvancedMapAnalyticsWidget[] {
  return ADVANCED_MAP_ANALYTICS_WIDGET_KEYS.map((key) =>
    createDefaultAdvancedMapAnalyticsWidget(key)
  );
}

function normalizeAdvancedMapAnalyticsWidgets(input: unknown): AdvancedMapAnalyticsWidget[] {
  const firstWidgetByKey = new Map<AdvancedMapAnalyticsWidgetKey, AdvancedMapAnalyticsWidget>();
  const orderedWidgetKeys: AdvancedMapAnalyticsWidgetKey[] = [];

  if (Array.isArray(input)) {
    for (const rawWidget of input) {
      const parsedWidget = AdvancedMapAnalyticsWidgetSchema.safeParse(rawWidget);
      if (!parsedWidget.success || firstWidgetByKey.has(parsedWidget.data.key)) {
        continue;
      }

      firstWidgetByKey.set(parsedWidget.data.key, parsedWidget.data);
      orderedWidgetKeys.push(parsedWidget.data.key);
    }
  }

  for (const widgetKey of ADVANCED_MAP_ANALYTICS_WIDGET_KEYS) {
    if (firstWidgetByKey.has(widgetKey)) {
      continue;
    }
    orderedWidgetKeys.push(widgetKey);
  }

  return orderedWidgetKeys.map((widgetKey) =>
    firstWidgetByKey.get(widgetKey) ?? createDefaultAdvancedMapAnalyticsWidget(widgetKey)
  );
}

const AdvancedMapAnalyticsWidgetsSchema = z.preprocess(
  (value) => normalizeAdvancedMapAnalyticsWidgets(value),
  z.array(AdvancedMapAnalyticsWidgetSchema)
);

export const AdvancedMapAnalyticsMapLayersSchema = z.object({
  countyBoundaries: z.boolean().default(true),
  roads: z.boolean().default(false),
  populationGrid: z.boolean().default(false),
});

export const AdvancedMapAnalyticsUrlStateSchema = z.preprocess(
  migrateLegacyAdvancedMapAnalyticsStateInput,
  z.object({
    version: z.literal(ADVANCED_MAP_ANALYTICS_VERSION).default(ADVANCED_MAP_ANALYTICS_VERSION),
    series: z.array(MapSupportedSeriesSchema).default([]),
    activeSeriesId: z.string().optional(),
    groupWorkspaces: z.array(MapGroupWorkspaceSchema).default([]),
    activeGroupWorkspaceId: z.string().optional(),
    valueFilters: AdvancedMapAnalyticsValueFilterGroupSchema.default({ rules: [] }),
    activeView: AdvancedMapAnalyticsActiveViewSchema.default('map'),
    analyticsWidgets: AdvancedMapAnalyticsWidgetsSchema.default(createDefaultAdvancedMapAnalyticsWidgets()),
    mapName: z.string().default('Untitled map'),
    mapLayers: AdvancedMapAnalyticsMapLayersSchema.default({
      countyBoundaries: true,
      roads: false,
      populationGrid: false,
    }),
    seriesPanelCollapsed: z.boolean().default(false),
    configPanelCollapsed: z.boolean().default(false),
    valueFiltersPanelCollapsed: z.boolean().default(false),
    binsPanelCollapsed: z.boolean().default(false),
    binsPresets: z.array(AdvancedMapAnalyticsBinsPresetSchema).default([]),
    activeBinPresetId: z.string().optional(),
    tableBinFiltersByPresetId: z.record(z.string(), z.array(z.string())).default({}),
    mapCenter: z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)]).optional(),
    mapZoom: z.number().min(1).max(20).optional(),
  })
);

export type AdvancedMapAnalyticsUrlState = z.infer<typeof AdvancedMapAnalyticsUrlStateSchema>;

export function parseAdvancedMapAnalyticsUrlState(input: unknown): AdvancedMapAnalyticsUrlState {
  return AdvancedMapAnalyticsUrlStateSchema.parse(input);
}

export function createDefaultAdvancedMapAnalyticsValueFilterRule(): AdvancedMapAnalyticsThresholdValueFilterRule {
  return AdvancedMapAnalyticsValueFilterRuleSchema.parse({
    kind: 'threshold',
  }) as AdvancedMapAnalyticsThresholdValueFilterRule;
}

type AdvancedMapAnalyticsStatsRuleByType<T extends AdvancedMapAnalyticsStatsFilterType> = Extract<
  AdvancedMapAnalyticsStatsValueFilterRule,
  { statsType: T }
>;

export function createDefaultAdvancedMapAnalyticsStatsValueFilterRule<
  T extends AdvancedMapAnalyticsStatsFilterType = 'percentile_band',
>(statsType: T = 'percentile_band' as T): AdvancedMapAnalyticsStatsRuleByType<T> {
  if (statsType === 'percentile_band') {
    return AdvancedMapAnalyticsValueFilterRuleSchema.parse({
      kind: 'stats',
      statsType,
      minPercentile: 0,
      maxPercentile: 100,
    }) as AdvancedMapAnalyticsStatsRuleByType<T>;
  }

  if (statsType === 'rank') {
    return AdvancedMapAnalyticsValueFilterRuleSchema.parse({
      kind: 'stats',
      statsType,
      direction: 'top',
      count: 10,
    }) as AdvancedMapAnalyticsStatsRuleByType<T>;
  }

  if (statsType === 'median_compare') {
    return AdvancedMapAnalyticsValueFilterRuleSchema.parse({
      kind: 'stats',
      statsType,
      mode: 'gte',
    }) as AdvancedMapAnalyticsStatsRuleByType<T>;
  }

  if (statsType === 'zscore') {
    return AdvancedMapAnalyticsValueFilterRuleSchema.parse({
      kind: 'stats',
      statsType,
      mode: 'abs_gte',
      threshold: 2,
    }) as AdvancedMapAnalyticsStatsRuleByType<T>;
  }

  if (statsType === 'iqr_outlier') {
    return AdvancedMapAnalyticsValueFilterRuleSchema.parse({
      kind: 'stats',
      statsType,
      side: 'both',
      multiplier: 1.5,
    }) as AdvancedMapAnalyticsStatsRuleByType<T>;
  }

  return AdvancedMapAnalyticsValueFilterRuleSchema.parse({
    kind: 'stats',
    statsType: 'mad_robust_zscore',
    threshold: 3.5,
  }) as AdvancedMapAnalyticsStatsRuleByType<T>;
}

const DEFAULT_EXECUTION_REPORT_TYPE =
  'Executie bugetara agregata la nivel de ordonator principal' as const;

export function createDefaultAdvancedMapAnalyticsSeries(
  type: MapSupportedSeries['type']
): MapSupportedSeries {
  if (type === 'line-items-aggregated-yearly') {
    const series = SeriesConfigurationSchema.parse({
      id: createAdvancedMapAnalyticsId(),
      type,
      label: 'Execution analytics',
      filter: {
        account_category: 'ch',
        report_type: DEFAULT_EXECUTION_REPORT_TYPE,
        report_period: createDefaultExecutionYearReportPeriod(),
        normalization: 'total',
        is_uat: true,
        exclude: {
          economic_prefixes: [...DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES],
        },
      },
    }) as SeriesConfiguration;
    return series;
  }

  if (type === 'commitments-analytics') {
    const series = CommitmentsSeriesConfigurationSchema.parse({
      id: createAdvancedMapAnalyticsId(),
      type,
      label: 'Commitments analytics',
      metric: 'CREDITE_ANGAJAMENT',
      filter: {
        report_type: 'PRINCIPAL_AGGREGATED',
        report_period: createDefaultCommitmentsYearReportPeriod(),
        normalization: 'total',
        is_uat: true,
        exclude: {
          economic_prefixes: [...DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES],
        },
      },
    }) as CommitmentsSeriesConfiguration;
    return series;
  }

  if (type === 'ins-series') {
    const series = InsSeriesConfigurationSchema.parse({
      id: createAdvancedMapAnalyticsId(),
      type,
      label: 'INS series',
      aggregation: 'sum',
      hasValue: true,
      unit: '',
    }) as InsSeriesConfiguration;
    return series;
  }

  if (type === 'geojson-dataset-series') {
    const defaultDatasetKey: GeoJsonDatasetKey = 'insPop2021';
    const series = GeoJsonDatasetSeriesConfigurationSchema.parse({
      id: createAdvancedMapAnalyticsId(),
      type,
      label: 'GeoJSON dataset',
      datasetKey: defaultDatasetKey,
    }) as GeoJsonDatasetSeriesConfiguration;
    return series;
  }

  if (type === 'uploaded-map-dataset') {
    throw new Error('Uploaded map dataset series requires explicit dataset selection.');
  }

  if (type === 'map-grouped-value-series') {
    const series = MapGroupedValueSeriesConfigurationSchema.parse({
      id: createAdvancedMapAnalyticsId(),
      type,
      label: 'Grouped value series',
      aggregation: 'sum',
    }) as MapGroupedValueSeriesConfiguration;
    return series;
  }

  const series = SeriesGroupConfigurationSchema.parse({
    id: createAdvancedMapAnalyticsId(),
    type: 'aggregated-series-calculation',
    label: 'Calculated series',
    calculation: {
      op: 'sum',
      args: [],
    },
  }) as SeriesGroupConfiguration;

  return series;
}
