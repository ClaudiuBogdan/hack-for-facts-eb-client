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

const GeoJsonFilterIdsSchema = z
  .array(z.number().int())
  .transform((ids) => [...new Set(ids)].sort((left, right) => left - right))
  .default([]);

export const GeoJsonDatasetSeriesConfigurationSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  type: z.literal('geojson-dataset-series'),
  enabled: z.boolean().default(true),
  label: z.string().default('GeoJSON dataset'),
  unit: z.string().optional().default(''),
  datasetKey: GeoJsonDatasetKeySchema.default('insPop2021'),
  countyFilterIds: GeoJsonFilterIdsSchema,
  regionFilterIds: GeoJsonFilterIdsSchema,
  config: z.object({
    showDataLabels: z.boolean().default(false),
    color: z.string().default('#2563eb'),
  }).default({
    showDataLabels: false,
    color: '#2563eb',
  }),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type GeoJsonDatasetSeriesConfiguration = z.infer<typeof GeoJsonDatasetSeriesConfigurationSchema>;

export const MapSupportedSeriesSchema = z.discriminatedUnion('type', [
  SeriesConfigurationSchema,
  CommitmentsSeriesConfigurationSchema,
  InsSeriesConfigurationSchema,
  GeoJsonDatasetSeriesConfigurationSchema,
  SeriesGroupConfigurationSchema,
]);

export type MapSupportedSeries = z.infer<typeof MapSupportedSeriesSchema>;

export type MapCalculationSeries = Extract<
  MapSupportedSeries,
  { type: 'aggregated-series-calculation' }
>;

export type MapBaseSeries = Exclude<MapSupportedSeries, MapCalculationSeries>;

export const ExperimentalMapBinSchema = z.object({
  min: z.number(),
  max: z.number().nullable(),
  label: z.string().default(''),
  color: z.string().default('#d7301f'),
  disabled: z.boolean().optional(),
});

export const ExperimentalMapBinsPresetConfigSchema = z.object({
  title: z.string().default(''),
  scale: z.literal('sequential').default('sequential'),
  showBinLabelOnLegend: z.boolean().default(true),
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
  bins: z.array(ExperimentalMapBinSchema).default([]),
  defaultBinCount: z.number().int().min(1).default(5),
});

export type ExperimentalMapBin = z.infer<typeof ExperimentalMapBinSchema>;
export type ExperimentalMapBinsPresetConfig = z.infer<typeof ExperimentalMapBinsPresetConfigSchema>;

export const ExperimentalMapActiveViewSchema = z.enum(['map', 'table']);
export type ExperimentalMapActiveView = z.infer<typeof ExperimentalMapActiveViewSchema>;

export const ExperimentalMapValueRuleJoinSchema = z.enum(['AND', 'OR']);
export type ExperimentalMapValueRuleJoin = z.infer<typeof ExperimentalMapValueRuleJoinSchema>;

export const ExperimentalMapValueFilterRuleKindSchema = z.enum(['threshold', 'stats']);
export type ExperimentalMapValueFilterRuleKind = z.infer<typeof ExperimentalMapValueFilterRuleKindSchema>;

export const ExperimentalMapValueFilterSeriesRefSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('active'),
  }),
  z.object({
    mode: z.literal('series'),
    seriesId: z.string(),
  }),
]);
export type ExperimentalMapValueFilterSeriesRef = z.infer<typeof ExperimentalMapValueFilterSeriesRefSchema>;

export const ExperimentalMapValueFilterOperatorSchema = z.enum([
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
export type ExperimentalMapValueFilterOperator = z.infer<typeof ExperimentalMapValueFilterOperatorSchema>;

const ExperimentalMapValueFilterRuleBaseSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  enabled: z.boolean().default(true),
  joinWithPrevious: ExperimentalMapValueRuleJoinSchema.default('AND'),
  seriesRef: ExperimentalMapValueFilterSeriesRefSchema.default({
    mode: 'active',
  }),
});

export const ExperimentalMapThresholdValueFilterRuleSchema = ExperimentalMapValueFilterRuleBaseSchema.extend({
  kind: z.literal('threshold').default('threshold'),
  operator: ExperimentalMapValueFilterOperatorSchema.default('is_defined'),
  value: z.number().optional(),
  secondValue: z.number().optional(),
});
export type ExperimentalMapThresholdValueFilterRule = z.infer<typeof ExperimentalMapThresholdValueFilterRuleSchema>;

export const ExperimentalMapStatsFilterTypeSchema = z.enum([
  'percentile_band',
  'rank',
  'median_compare',
  'zscore',
  'iqr_outlier',
  'mad_robust_zscore',
]);
export type ExperimentalMapStatsFilterType = z.infer<typeof ExperimentalMapStatsFilterTypeSchema>;

export const ExperimentalMapStatsRankDirectionSchema = z.enum(['top', 'bottom']);
export type ExperimentalMapStatsRankDirection = z.infer<typeof ExperimentalMapStatsRankDirectionSchema>;

export const ExperimentalMapStatsMedianCompareModeSchema = z.enum(['gt', 'gte', 'lt', 'lte']);
export type ExperimentalMapStatsMedianCompareMode = z.infer<typeof ExperimentalMapStatsMedianCompareModeSchema>;

export const ExperimentalMapStatsZScoreModeSchema = z.enum(['abs_gte', 'gte', 'lte']);
export type ExperimentalMapStatsZScoreMode = z.infer<typeof ExperimentalMapStatsZScoreModeSchema>;

export const ExperimentalMapStatsIqrSideSchema = z.enum(['upper', 'lower', 'both']);
export type ExperimentalMapStatsIqrSide = z.infer<typeof ExperimentalMapStatsIqrSideSchema>;

const ExperimentalMapStatsPercentileRuleSchema = ExperimentalMapValueFilterRuleBaseSchema.extend({
  kind: z.literal('stats'),
  statsType: z.literal('percentile_band'),
  minPercentile: z.number().default(0),
  maxPercentile: z.number().default(100),
});

const ExperimentalMapStatsRankRuleSchema = ExperimentalMapValueFilterRuleBaseSchema.extend({
  kind: z.literal('stats'),
  statsType: z.literal('rank'),
  direction: ExperimentalMapStatsRankDirectionSchema.default('top'),
  count: z.number().int().min(1).default(10),
});

const ExperimentalMapStatsMedianRuleSchema = ExperimentalMapValueFilterRuleBaseSchema.extend({
  kind: z.literal('stats'),
  statsType: z.literal('median_compare'),
  mode: ExperimentalMapStatsMedianCompareModeSchema.default('gte'),
});

const ExperimentalMapStatsZScoreRuleSchema = ExperimentalMapValueFilterRuleBaseSchema.extend({
  kind: z.literal('stats'),
  statsType: z.literal('zscore'),
  mode: ExperimentalMapStatsZScoreModeSchema.default('abs_gte'),
  threshold: z.number().default(2),
});

const ExperimentalMapStatsIqrRuleSchema = ExperimentalMapValueFilterRuleBaseSchema.extend({
  kind: z.literal('stats'),
  statsType: z.literal('iqr_outlier'),
  side: ExperimentalMapStatsIqrSideSchema.default('both'),
  multiplier: z.number().default(1.5),
});

const ExperimentalMapStatsMadRuleSchema = ExperimentalMapValueFilterRuleBaseSchema.extend({
  kind: z.literal('stats'),
  statsType: z.literal('mad_robust_zscore'),
  threshold: z.number().default(3.5),
});

export const ExperimentalMapStatsValueFilterRuleSchema = z.union([
  ExperimentalMapStatsPercentileRuleSchema,
  ExperimentalMapStatsRankRuleSchema,
  ExperimentalMapStatsMedianRuleSchema,
  ExperimentalMapStatsZScoreRuleSchema,
  ExperimentalMapStatsIqrRuleSchema,
  ExperimentalMapStatsMadRuleSchema,
]);
export type ExperimentalMapStatsValueFilterRule = z.infer<typeof ExperimentalMapStatsValueFilterRuleSchema>;

const ExperimentalMapAnyValueFilterRuleSchema = z.union([
  ExperimentalMapThresholdValueFilterRuleSchema,
  ExperimentalMapStatsPercentileRuleSchema,
  ExperimentalMapStatsRankRuleSchema,
  ExperimentalMapStatsMedianRuleSchema,
  ExperimentalMapStatsZScoreRuleSchema,
  ExperimentalMapStatsIqrRuleSchema,
  ExperimentalMapStatsMadRuleSchema,
]);

function normalizeValueFilterRuleKind(input: unknown): unknown {
  if (typeof input !== 'object' || input === null) {
    return input;
  }

  const record = input as Record<string, unknown>;
  if (typeof record.kind === 'string') {
    if (record.kind === 'stats' && typeof record.statsType !== 'string') {
      return {
        ...record,
        statsType: 'percentile_band',
      };
    }

    return record;
  }

  return {
    ...record,
    kind: 'threshold',
  };
}

export const ExperimentalMapValueFilterRuleSchema = z.preprocess(
  normalizeValueFilterRuleKind,
  ExperimentalMapAnyValueFilterRuleSchema
);
export type ExperimentalMapValueFilterRule = z.infer<typeof ExperimentalMapValueFilterRuleSchema>;

function normalizeLegacyCombinator(value: unknown): ExperimentalMapValueRuleJoin | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalizedValue = value.trim().toUpperCase();
  if (normalizedValue === 'AND' || normalizedValue === 'OR') {
    return normalizedValue;
  }

  return undefined;
}

function migrateLegacyValueFilterGroup(input: unknown): unknown {
  if (typeof input !== 'object' || input === null) {
    return input;
  }

  const record = input as Record<string, unknown>;
  const rules = record.rules;
  if (!Array.isArray(rules) || rules.length === 0) {
    return input;
  }

  const legacyCombinator = normalizeLegacyCombinator(record.combinator);
  if (!legacyCombinator) {
    return input;
  }

  const migratedRules = rules.map((rule, index) => {
    if (typeof rule !== 'object' || rule === null) {
      return rule;
    }

    const normalizedRule = rule as Record<string, unknown>;
    if (typeof normalizedRule.joinWithPrevious === 'string') {
      return normalizedRule;
    }

    return {
      ...normalizedRule,
      joinWithPrevious: index === 0 ? 'AND' : legacyCombinator,
    };
  });

  return {
    ...record,
    rules: migratedRules,
  };
}

export const ExperimentalMapValueFilterGroupSchema = z.preprocess(
  migrateLegacyValueFilterGroup,
  z.object({
    rules: z.array(ExperimentalMapValueFilterRuleSchema).default([]),
  })
);
export type ExperimentalMapValueFilterGroup = z.infer<typeof ExperimentalMapValueFilterGroupSchema>;

export function createDefaultExperimentalMapBinsPresetConfig(): ExperimentalMapBinsPresetConfig {
  return ExperimentalMapBinsPresetConfigSchema.parse({});
}

export const ExperimentalMapBinsPresetSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  label: z.string().default('Bins preset'),
  config: ExperimentalMapBinsPresetConfigSchema.default(createDefaultExperimentalMapBinsPresetConfig()),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type ExperimentalMapBinsPreset = z.infer<typeof ExperimentalMapBinsPresetSchema>;

export function createDefaultExperimentalMapBinsPreset(
  label: string = 'Bins preset'
): ExperimentalMapBinsPreset {
  return ExperimentalMapBinsPresetSchema.parse({
    label,
  });
}

export const ExperimentalMapUrlStateSchema = z.object({
  series: z.array(MapSupportedSeriesSchema).default([]),
  activeSeriesId: z.string().optional(),
  valueFilters: ExperimentalMapValueFilterGroupSchema.default({ rules: [] }),
  activeView: ExperimentalMapActiveViewSchema.default('map'),
  mapName: z.string().default('Experimental UAT Map'),
  seriesPanelCollapsed: z.boolean().default(false),
  configPanelCollapsed: z.boolean().default(false),
  valueFiltersPanelCollapsed: z.boolean().default(false),
  binsPanelCollapsed: z.boolean().default(false),
  binsPresets: z.array(ExperimentalMapBinsPresetSchema).default([]),
  activeBinPresetId: z.string().optional(),
  tableBinFiltersByPresetId: z.record(z.string(), z.array(z.string())).default({}),
  mapCenter: z.tuple([z.number(), z.number()]).optional(),
  mapZoom: z.number().optional(),
});

export type ExperimentalMapUrlState = z.infer<typeof ExperimentalMapUrlStateSchema>;

export function createDefaultExperimentalMapValueFilterRule(): ExperimentalMapThresholdValueFilterRule {
  return ExperimentalMapValueFilterRuleSchema.parse({
    kind: 'threshold',
  }) as ExperimentalMapThresholdValueFilterRule;
}

type ExperimentalMapStatsRuleByType<T extends ExperimentalMapStatsFilterType> = Extract<
  ExperimentalMapStatsValueFilterRule,
  { statsType: T }
>;

export function createDefaultExperimentalMapStatsValueFilterRule<
  T extends ExperimentalMapStatsFilterType = 'percentile_band',
>(statsType: T = 'percentile_band' as T): ExperimentalMapStatsRuleByType<T> {
  if (statsType === 'percentile_band') {
    return ExperimentalMapValueFilterRuleSchema.parse({
      kind: 'stats',
      statsType,
      minPercentile: 0,
      maxPercentile: 100,
    }) as ExperimentalMapStatsRuleByType<T>;
  }

  if (statsType === 'rank') {
    return ExperimentalMapValueFilterRuleSchema.parse({
      kind: 'stats',
      statsType,
      direction: 'top',
      count: 10,
    }) as ExperimentalMapStatsRuleByType<T>;
  }

  if (statsType === 'median_compare') {
    return ExperimentalMapValueFilterRuleSchema.parse({
      kind: 'stats',
      statsType,
      mode: 'gte',
    }) as ExperimentalMapStatsRuleByType<T>;
  }

  if (statsType === 'zscore') {
    return ExperimentalMapValueFilterRuleSchema.parse({
      kind: 'stats',
      statsType,
      mode: 'abs_gte',
      threshold: 2,
    }) as ExperimentalMapStatsRuleByType<T>;
  }

  if (statsType === 'iqr_outlier') {
    return ExperimentalMapValueFilterRuleSchema.parse({
      kind: 'stats',
      statsType,
      side: 'both',
      multiplier: 1.5,
    }) as ExperimentalMapStatsRuleByType<T>;
  }

  return ExperimentalMapValueFilterRuleSchema.parse({
    kind: 'stats',
    statsType: 'mad_robust_zscore',
    threshold: 3.5,
  }) as ExperimentalMapStatsRuleByType<T>;
}

const DEFAULT_EXECUTION_REPORT_TYPE =
  'Executie bugetara agregata la nivel de ordonator principal' as const;

export function createDefaultExperimentalMapSeries(
  type: MapSupportedSeries['type']
): MapSupportedSeries {
  if (type === 'line-items-aggregated-yearly') {
    const series = SeriesConfigurationSchema.parse({
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
      type,
      label: 'GeoJSON dataset',
      datasetKey: defaultDatasetKey,
    }) as GeoJsonDatasetSeriesConfiguration;
    return series;
  }

  const series = SeriesGroupConfigurationSchema.parse({
    type: 'aggregated-series-calculation',
    label: 'Calculated series',
    calculation: {
      op: 'sum',
      args: [],
    },
  }) as SeriesGroupConfiguration;

  return series;
}
