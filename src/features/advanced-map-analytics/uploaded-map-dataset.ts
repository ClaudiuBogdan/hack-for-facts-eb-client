import type {
  AdvancedMapDatasetDetail,
  AdvancedMapDatasetSummary,
} from '@/features/advanced-map-datasets/api/schemas';
import {
  AdvancedMapAnalyticsUrlStateSchema,
  UploadedMapDatasetSeriesConfigurationSchema,
  type MapSupportedSeries,
  type AdvancedMapAnalyticsUrlState,
  type UploadedMapDatasetSeriesConfiguration,
} from '@/schemas/advanced-map-analytics';

export type UploadedMapDatasetReference =
  | {
      source: 'owner';
      datasetId: string;
      datasetPublicId?: undefined;
    }
  | {
      source: 'public';
      datasetPublicId: string;
      datasetId?: undefined;
    };

export type UploadedMapDatasetLike = Pick<
  AdvancedMapDatasetSummary | AdvancedMapDatasetDetail,
  'title' | 'description' | 'unit'
>;

export type UploadedMapDatasetReferenceSource = Pick<
  AdvancedMapDatasetSummary | AdvancedMapDatasetDetail,
  'id' | 'publicId' | 'visibility'
>;

export function isUploadedMapDatasetSeries(
  series: MapSupportedSeries
): series is UploadedMapDatasetSeriesConfiguration {
  return series.type === 'uploaded-map-dataset';
}

export function getUploadedMapDatasetReference(
  series: Pick<UploadedMapDatasetSeriesConfiguration, 'datasetId' | 'datasetPublicId'>
): UploadedMapDatasetReference | null {
  if (typeof series.datasetId === 'string' && series.datasetId.trim().length > 0) {
    return {
      source: 'owner',
      datasetId: series.datasetId,
    };
  }

  if (typeof series.datasetPublicId === 'string' && series.datasetPublicId.trim().length > 0) {
    return {
      source: 'public',
      datasetPublicId: series.datasetPublicId,
    };
  }

  return null;
}

export function getPreferredUploadedMapDatasetReference(
  dataset: UploadedMapDatasetReferenceSource
): UploadedMapDatasetReference {
  // See docs/specs/specs-202604092015-custom-map-data-series-editor.md:
  // shareable/public map flows prefer publicId; owner datasetId stays internal.
  if (
    typeof dataset.publicId === 'string' &&
    dataset.publicId.trim().length > 0 &&
    dataset.visibility !== 'private'
  ) {
    return {
      source: 'public',
      datasetPublicId: dataset.publicId,
    };
  }

  return {
    source: 'owner',
    datasetId: dataset.id,
  };
}

export function createUploadedMapDatasetSeries(
  dataset: UploadedMapDatasetLike,
  reference: UploadedMapDatasetReference,
  options: {
    id?: string;
    enabled?: boolean;
    label?: string;
    unit?: string;
    createdAt?: string;
    updatedAt?: string;
  } = {}
): UploadedMapDatasetSeriesConfiguration {
  const label = options.label?.trim() || dataset.title.trim() || 'Uploaded dataset';

  return UploadedMapDatasetSeriesConfigurationSchema.parse({
    id: options.id,
    type: 'uploaded-map-dataset',
    enabled: options.enabled ?? true,
    label,
    unit: options.unit ?? dataset.unit ?? '',
    ...(reference.source === 'owner'
      ? { datasetId: reference.datasetId }
      : { datasetPublicId: reference.datasetPublicId }),
    config: {
      showDataLabels: false,
      color: '#2563eb',
    },
    createdAt: options.createdAt,
    updatedAt: options.updatedAt,
  });
}

export function createAdvancedMapStateFromUploadedDataset(
  dataset: UploadedMapDatasetLike,
  reference: UploadedMapDatasetReference,
  options: {
    mapName?: string;
    seriesId?: string;
    label?: string;
    unit?: string;
    createdAt?: string;
    updatedAt?: string;
  } = {}
): AdvancedMapAnalyticsUrlState {
  const uploadedSeries = createUploadedMapDatasetSeries(dataset, reference, {
    id: options.seriesId,
    label: options.label,
    unit: options.unit,
    createdAt: options.createdAt,
    updatedAt: options.updatedAt,
  });

  return AdvancedMapAnalyticsUrlStateSchema.parse({
    mapName: options.mapName?.trim() || dataset.title.trim() || 'Uploaded dataset map',
    activeSeriesId: uploadedSeries.id,
    activeView: 'map',
    series: [uploadedSeries],
  });
}
