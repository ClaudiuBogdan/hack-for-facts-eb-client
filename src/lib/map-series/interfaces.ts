import type { MapBaseSeries } from '@/schemas/experimental-map';

export type MapSeriesWarningType =
  | 'missing_dependency'
  | 'undefined_merge_result'
  | 'divide_by_zero'
  | 'mixed_unit'
  | 'sparse_coverage'
  | 'invalid_row'
  | 'duplicate_row'
  | 'url_budget'
  | 'bins_invalid_config'
  | 'bins_auto_regenerated'
  | 'bins_no_active_series'
  | 'bins_active_preset_missing'
  | 'bins_large_count'
  | 'bins_empty_defined_values';

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
  row_count?: number;
}

export interface GroupedSeriesManifest {
  generated_at: string;
  format: 'long_rows_v1';
  granularity: 'UAT';
  series: GroupedSeriesManifestEntry[];
}

export interface GroupedSeriesDataResponse {
  manifest: GroupedSeriesManifest;
  rows: GroupedSeriesRow[];
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
