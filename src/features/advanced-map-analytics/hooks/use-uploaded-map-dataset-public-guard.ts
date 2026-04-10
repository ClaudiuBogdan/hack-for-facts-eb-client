import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { t } from '@lingui/core/macro';
import { advancedMapDatasetOwnerDetailQueryOptions } from '@/features/advanced-map-datasets/hooks/use-advanced-map-datasets';
import type { MapSupportedSeries } from '@/schemas/advanced-map-analytics';

interface UploadedMapDatasetPublicGuardResult {
  privateDatasetTitles: string[];
  blockingMessage: string | null;
  isChecking: boolean;
}

export function useUploadedMapDatasetPublicGuard(
  seriesList: MapSupportedSeries[],
  enabled = true
): UploadedMapDatasetPublicGuardResult {
  const uploadedDatasetIds = useMemo(
    () =>
      Array.from(
        new Set(
          seriesList
            .filter((series) => series.type === 'uploaded-map-dataset')
            .map((series) => series.datasetId)
            .filter((datasetId): datasetId is string => typeof datasetId === 'string' && datasetId.trim().length > 0)
        )
      ),
    [seriesList]
  );

  const datasetQueries = useQueries({
    queries: uploadedDatasetIds.map((datasetId) => ({
      ...advancedMapDatasetOwnerDetailQueryOptions(datasetId),
      enabled,
      retry: false,
    })),
  });

  const privateDatasetTitles = useMemo(
    () =>
      datasetQueries
        .map((query) => query.data)
        .filter((dataset): dataset is NonNullable<typeof datasetQueries[number]['data']> => dataset !== undefined)
        .filter((dataset) => dataset.visibility === 'private')
        .map((dataset) => dataset.title),
    [datasetQueries]
  );

  const blockingMessage =
    privateDatasetTitles.length > 0
      ? t`Public maps can use only unlisted or public datasets. Update visibility for: ${privateDatasetTitles.join(', ')}`
      : null;

  return {
    privateDatasetTitles,
    blockingMessage,
    isChecking: enabled && datasetQueries.some((query) => query.isLoading || query.isFetching),
  };
}
