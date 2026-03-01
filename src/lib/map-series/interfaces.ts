import type { MapBaseSeries } from '@/schemas/experimental-map';

export type MapSeriesWarningType =
  | 'missing_dependency'
  | 'undefined_merge_result'
  | 'divide_by_zero'
  | 'mixed_unit'
  | 'sparse_coverage'
  | 'show_period_growth_ignored'
  | 'missing_population'
  | 'missing_dataset_code'
  | 'ins_dataset_missing'
  | 'ins_no_observations'
  | 'ins_no_siruta_values'
  | 'ins_mixed_units'
  | 'ins_partial_mock_coverage'
  | 'invalid_row'
  | 'duplicate_row'
  | 'value_filter_invalid_rule'
  | 'value_filter_missing_series'
  | 'value_filter_missing_active_series'
  | 'value_filter_no_matches'
  | 'value_filter_stats_invalid_parameters'
  | 'value_filter_stats_insufficient_sample'
  | 'value_filter_stats_zero_variance'
  | 'value_filter_stats_no_defined_values'
  | 'url_budget'
  | 'bins_invalid_config'
  | 'bins_auto_regenerated'
  | 'bins_no_active_series'
  | 'bins_active_preset_missing'
  | 'bins_large_count'
  | 'bins_empty_defined_values'
  // Forward-compatibility for server warning types introduced later.
  | (string & {});

export interface MapSeriesWarning {
  type: MapSeriesWarningType;
  message: string;
  seriesId?: string;
  dependencySeriesId?: string;
  sirutaCode?: string;
  details?: Record<string, unknown>;
}

export interface GroupedSeriesRow {
  series_id: string;
  siruta_code: string;
  value: number;
}

export interface GroupedSeriesManifestEntry {
  series_id: string;
  unit?: string;
  defined_value_count?: number;
}

export interface GroupedSeriesManifest {
  generated_at: string;
  format: 'wide_matrix_v1';
  granularity: 'UAT';
  series: GroupedSeriesManifestEntry[];
}

export interface GroupedSeriesPayload {
  mime: 'text/csv';
  compression: 'none';
  data: string;
}

export interface GroupedSeriesDataResponse {
  manifest: GroupedSeriesManifest;
  payload: GroupedSeriesPayload;
  warnings?: MapSeriesWarning[];
}

export interface GroupedSeriesDataRequest {
  granularity: 'UAT';
  series: MapBaseSeries[];
}

export interface MapSeriesDataAdapter {
  fetchGroupedSeriesData: (
    request: GroupedSeriesDataRequest
  ) => Promise<GroupedSeriesDataResponse>;
}

export type MapSeriesVector = Map<string, number | undefined>;
export type MapSeriesVectorCache = Map<string, MapSeriesVector>;

export interface MapSeriesCalculationResult {
  valuesBySeriesId: MapSeriesVectorCache;
  unitsBySeriesId: Map<string, string | undefined>;
  warnings: MapSeriesWarning[];
}

export interface InsSeriesScalarResult {
  valuesBySiruta: MapSeriesVector;
  unit?: string;
  warnings: MapSeriesWarning[];
}
