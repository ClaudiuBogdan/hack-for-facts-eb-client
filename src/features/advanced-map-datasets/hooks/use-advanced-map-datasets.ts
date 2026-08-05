import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import {
  createAdvancedMapDataset,
  deleteAdvancedMapDataset,
  getAdvancedMapDataset,
  getPublicAdvancedMapDataset,
  listAdvancedMapDatasets,
  listPublicAdvancedMapDatasets,
  replaceAdvancedMapDatasetRows,
  updateAdvancedMapDatasetMetadata,
  type AdvancedMapDatasetCreateInput,
  type AdvancedMapDatasetReplaceRowsInput,
  type AdvancedMapDatasetUpdateMetadataInput,
  type AdvancedMapDatasetsApiError,
} from '@/features/advanced-map-datasets/api/advanced-map-datasets-api';
import type {
  AdvancedMapDatasetDetail,
  AdvancedMapDatasetSummary,
} from '@/features/advanced-map-datasets/api/schemas';

export const advancedMapDatasetsKeys = {
  all: ['advanced-map-datasets'] as const,
  ownerLists: () => ['advanced-map-datasets', 'owner-lists'] as const,
  ownerList: (input?: { limit?: number; offset?: number }) =>
    ['advanced-map-datasets', 'owner-list', input?.limit ?? null, input?.offset ?? null] as const,
  ownerDetail: (datasetId: string) => ['advanced-map-datasets', 'owner-detail', datasetId] as const,
  publicLists: () => ['advanced-map-datasets', 'public-lists'] as const,
  publicList: (input?: { limit?: number; offset?: number }) =>
    ['advanced-map-datasets', 'public-list', input?.limit ?? null, input?.offset ?? null] as const,
  publicDetail: (publicId: string) => ['advanced-map-datasets', 'public-detail', publicId] as const,
};

function invalidateAllDatasetQueries(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: advancedMapDatasetsKeys.all });
}

export function advancedMapDatasetsOwnerListQueryOptions(input?: { limit?: number; offset?: number }) {
  return queryOptions<AdvancedMapDatasetSummary[], AdvancedMapDatasetsApiError>({
    queryKey: advancedMapDatasetsKeys.ownerList(input),
    queryFn: async () => {
      const result = await listAdvancedMapDatasets(input);
      return result.nodes;
    },
    staleTime: 30_000,
  });
}

export function advancedMapDatasetOwnerDetailQueryOptions(datasetId: string) {
  return queryOptions<AdvancedMapDatasetDetail, AdvancedMapDatasetsApiError>({
    queryKey: advancedMapDatasetsKeys.ownerDetail(datasetId),
    queryFn: async () => getAdvancedMapDataset(datasetId),
    staleTime: 30_000,
  });
}

export function advancedMapDatasetsPublicListQueryOptions(input?: { limit?: number; offset?: number }) {
  return queryOptions<AdvancedMapDatasetSummary[], AdvancedMapDatasetsApiError>({
    queryKey: advancedMapDatasetsKeys.publicList(input),
    queryFn: async () => {
      const result = await listPublicAdvancedMapDatasets(input);
      return result.nodes;
    },
    staleTime: 60_000,
  });
}

export function advancedMapDatasetPublicDetailQueryOptions(publicId: string) {
  return queryOptions<AdvancedMapDatasetDetail, AdvancedMapDatasetsApiError>({
    queryKey: advancedMapDatasetsKeys.publicDetail(publicId),
    queryFn: async () => getPublicAdvancedMapDataset(publicId),
    staleTime: 60_000,
  });
}

export function useAdvancedMapDatasetsOwnerListQuery(
  input?: { limit?: number; offset?: number },
  enabled = true
) {
  return useQuery({
    ...advancedMapDatasetsOwnerListQueryOptions(input),
    enabled,
  });
}

export function useAdvancedMapDatasetOwnerDetailQuery(datasetId: string, enabled = true) {
  return useQuery({
    ...advancedMapDatasetOwnerDetailQueryOptions(datasetId),
    enabled,
  });
}

export function useAdvancedMapDatasetsPublicListQuery(
  input?: { limit?: number; offset?: number },
  enabled = true
) {
  return useQuery({
    ...advancedMapDatasetsPublicListQueryOptions(input),
    enabled,
  });
}

export function useAdvancedMapDatasetPublicDetailQuery(publicId: string, enabled = true) {
  return useQuery({
    ...advancedMapDatasetPublicDetailQueryOptions(publicId),
    enabled,
  });
}

export function useCreateAdvancedMapDatasetMutation() {
  const queryClient = useQueryClient();

  return useMutation<AdvancedMapDatasetDetail, AdvancedMapDatasetsApiError, AdvancedMapDatasetCreateInput>({
    mutationFn: async (input) => createAdvancedMapDataset(input),
    onSuccess: async (createdDataset) => {
      if (createdDataset.id) {
        queryClient.setQueryData(advancedMapDatasetsKeys.ownerDetail(createdDataset.id), createdDataset);
      }

      await invalidateAllDatasetQueries(queryClient);
    },
  });
}

export function useUpdateAdvancedMapDatasetMetadataMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    AdvancedMapDatasetDetail,
    AdvancedMapDatasetsApiError,
    { datasetId: string; input: AdvancedMapDatasetUpdateMetadataInput }
  >({
    mutationFn: async ({ datasetId, input }) => updateAdvancedMapDatasetMetadata(datasetId, input),
    onSuccess: async (updatedDataset) => {
      if (updatedDataset.id) {
        queryClient.setQueryData(advancedMapDatasetsKeys.ownerDetail(updatedDataset.id), updatedDataset);
      }

      await invalidateAllDatasetQueries(queryClient);
    },
  });
}

export function useReplaceAdvancedMapDatasetRowsMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    AdvancedMapDatasetDetail,
    AdvancedMapDatasetsApiError,
    { datasetId: string; input: AdvancedMapDatasetReplaceRowsInput }
  >({
    mutationFn: async ({ datasetId, input }) => replaceAdvancedMapDatasetRows(datasetId, input),
    onSuccess: async (updatedDataset) => {
      if (updatedDataset.id) {
        queryClient.setQueryData(advancedMapDatasetsKeys.ownerDetail(updatedDataset.id), updatedDataset);
      }

      await invalidateAllDatasetQueries(queryClient);
    },
  });
}

export function useDeleteAdvancedMapDatasetMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, AdvancedMapDatasetsApiError, { datasetId: string }>({
    mutationFn: async ({ datasetId }) => deleteAdvancedMapDataset(datasetId),
    onSuccess: async (_result, input) => {
      queryClient.removeQueries({ queryKey: advancedMapDatasetsKeys.ownerDetail(input.datasetId) });
      await invalidateAllDatasetQueries(queryClient);
    },
  });
}
