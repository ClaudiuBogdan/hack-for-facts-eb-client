import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import type {
  MapSupportedSeries,
  UploadedMapDatasetSeriesConfiguration,
} from '@/schemas/advanced-map-analytics';
import {
  advancedMapDatasetOwnerDetailQueryOptions,
  advancedMapDatasetPublicDetailQueryOptions,
} from '@/features/advanced-map-datasets/hooks/use-advanced-map-datasets';
import type { AdvancedMapDatasetJsonItem } from '@/features/advanced-map-datasets/types';
import {
  getUploadedMapDatasetReference,
  isUploadedMapDatasetSeries,
  type UploadedMapDatasetReference,
} from '@/features/advanced-map-analytics/uploaded-map-dataset';

interface UploadedMapDatasetPayloadsResult {
  payloadsBySeriesId: Map<string, Map<string, AdvancedMapDatasetJsonItem>>;
  isLoading: boolean;
}

export function getUploadedMapDatasetPayloadReferenceKey(
  reference: UploadedMapDatasetReference
): string {
  return reference.source === 'owner'
    ? `owner:${reference.datasetId}`
    : `public:${reference.datasetPublicId}`;
}

export function buildUploadedMapDatasetPayloadsBySeriesId(
  uploadedDatasetSeries: readonly UploadedMapDatasetSeriesConfiguration[],
  datasetDetailsByReferenceKey: ReadonlyMap<
    string,
    {
      rows: readonly {
        sirutaCode: string;
        valueJson: AdvancedMapDatasetJsonItem | null;
      }[];
    } | undefined
  >
): Map<string, Map<string, AdvancedMapDatasetJsonItem>> {
  const nextPayloadsBySeriesId = new Map<string, Map<string, AdvancedMapDatasetJsonItem>>();

  for (const series of uploadedDatasetSeries) {
    const reference = getUploadedMapDatasetReference(series);
    if (!reference) {
      continue;
    }

    const detail = datasetDetailsByReferenceKey.get(
      getUploadedMapDatasetPayloadReferenceKey(reference)
    );
    if (!detail) {
      continue;
    }

    const payloadsBySirutaCode = new Map<string, AdvancedMapDatasetJsonItem>();
    for (const row of detail.rows) {
      if (!row.valueJson) {
        continue;
      }

      payloadsBySirutaCode.set(row.sirutaCode, row.valueJson);
    }

    if (payloadsBySirutaCode.size > 0) {
      nextPayloadsBySeriesId.set(series.id, payloadsBySirutaCode);
    }
  }

  return nextPayloadsBySeriesId;
}

export function useUploadedMapDatasetPayloads(
  seriesList: readonly MapSupportedSeries[],
  enabled = true
): UploadedMapDatasetPayloadsResult {
  const uploadedDatasetSeries = useMemo(
    () => seriesList.filter(isUploadedMapDatasetSeries),
    [seriesList]
  );

  const uniqueReferences = useMemo(() => {
    const referencesByKey = new Map<string, UploadedMapDatasetReference>();

    for (const series of uploadedDatasetSeries) {
      const reference = getUploadedMapDatasetReference(series);
      if (!reference) {
        continue;
      }

      referencesByKey.set(getUploadedMapDatasetPayloadReferenceKey(reference), reference);
    }

    return [...referencesByKey.values()];
  }, [uploadedDatasetSeries]);

  const datasetQueries = useQueries({
    queries: uniqueReferences.map((reference) => ({
      ...(reference.source === 'owner'
        ? advancedMapDatasetOwnerDetailQueryOptions(reference.datasetId)
        : advancedMapDatasetPublicDetailQueryOptions(reference.datasetPublicId)),
      enabled,
      retry: false,
    })),
  });

  const datasetDetailsByReferenceKey = useMemo(() => {
    const detailsByReferenceKey = new Map<string, (typeof datasetQueries)[number]['data']>();

    uniqueReferences.forEach((reference, index) => {
      const detail = datasetQueries[index]?.data;
      if (!detail) {
        return;
      }

      detailsByReferenceKey.set(
        getUploadedMapDatasetPayloadReferenceKey(reference),
        detail
      );
    });

    return detailsByReferenceKey;
  }, [datasetQueries, uniqueReferences]);

  const payloadsBySeriesId = useMemo(() => {
    return buildUploadedMapDatasetPayloadsBySeriesId(
      uploadedDatasetSeries,
      datasetDetailsByReferenceKey
    );
  }, [datasetDetailsByReferenceKey, uploadedDatasetSeries]);

  return {
    payloadsBySeriesId,
    isLoading: enabled && datasetQueries.some((query) => query.isLoading || query.isFetching),
  };
}
