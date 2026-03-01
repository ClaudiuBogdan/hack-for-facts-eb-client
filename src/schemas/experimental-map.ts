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
  activeView: ExperimentalMapActiveViewSchema.default('map'),
  mapName: z.string().default('Experimental UAT Map'),
  seriesPanelCollapsed: z.boolean().default(false),
  configPanelCollapsed: z.boolean().default(false),
  binsPanelCollapsed: z.boolean().default(false),
  binsPresets: z.array(ExperimentalMapBinsPresetSchema).default([]),
  activeBinPresetId: z.string().optional(),
  tableBinFiltersByPresetId: z.record(z.string(), z.array(z.string())).default({}),
  mapCenter: z.tuple([z.number(), z.number()]).optional(),
  mapZoom: z.number().optional(),
});

export type ExperimentalMapUrlState = z.infer<typeof ExperimentalMapUrlStateSchema>;

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
