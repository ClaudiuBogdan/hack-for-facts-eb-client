import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdvancedMapAnalyticsUrlState } from '@/schemas/advanced-map-analytics';
import {
  createAdvancedMapAnalyticsMap,
  createAdvancedMapAnalyticsSnapshot,
  deleteAdvancedMapAnalyticsMap,
  getAdvancedMapAnalyticsMap,
  getAdvancedMapAnalyticsSnapshot,
  getPublicAdvancedMapAnalyticsMap,
  listAdvancedMapAnalyticsMaps,
  listAdvancedMapAnalyticsSnapshots,
  updateAdvancedMapAnalyticsMap,
  type AdvancedMapAnalyticsApiError,
} from '@/features/advanced-map-analytics/api/advanced-map-analytics-api';
import type {
  AdvancedMapAnalyticsMapDetail,
  AdvancedMapAnalyticsMapSummary,
  AdvancedMapAnalyticsSnapshot,
  AdvancedMapAnalyticsSnapshotsList,
  AdvancedMapAnalyticsVisibility,
} from '@/features/advanced-map-analytics/api/schemas';

export const advancedMapAnalyticsKeys = {
  maps: ['advanced-map-analytics', 'maps'] as const,
  map: (mapId: string) => ['advanced-map-analytics', 'map', mapId] as const,
  snapshots: (mapId: string, page: number, pageSize: number) =>
    ['advanced-map-analytics', 'snapshots', mapId, page, pageSize] as const,
  public: (mapId: string) => ['advanced-map-analytics', 'public', mapId] as const,
};

interface SaveSnapshotInput {
  mapId: string;
  mapState: AdvancedMapAnalyticsUrlState;
  title?: string;
  description?: string | null;
  stateAtSave?: AdvancedMapAnalyticsVisibility;
}

interface CreateMapInput {
  mapState: AdvancedMapAnalyticsUrlState;
  title?: string;
  description?: string | null;
  state?: AdvancedMapAnalyticsVisibility;
}

interface UpdateMapInput {
  mapId: string;
  title?: string;
  description?: string | null;
  state?: AdvancedMapAnalyticsVisibility;
}

export function useAdvancedMapAnalyticsMapsQuery() {
  return useQuery<AdvancedMapAnalyticsMapSummary[], AdvancedMapAnalyticsApiError>({
    queryKey: advancedMapAnalyticsKeys.maps,
    queryFn: async () => listAdvancedMapAnalyticsMaps(),
    staleTime: 60_000,
  });
}

export function useAdvancedMapAnalyticsMapQuery(mapId: string, enabled = true) {
  return useQuery<AdvancedMapAnalyticsMapDetail, AdvancedMapAnalyticsApiError>({
    queryKey: advancedMapAnalyticsKeys.map(mapId),
    queryFn: async () => getAdvancedMapAnalyticsMap(mapId),
    enabled,
    staleTime: 30_000,
  });
}

export function useAdvancedMapAnalyticsSnapshotsQuery(
  mapId: string,
  page = 1,
  pageSize = 20,
  enabled = true
) {
  return useQuery<AdvancedMapAnalyticsSnapshotsList, AdvancedMapAnalyticsApiError>({
    queryKey: advancedMapAnalyticsKeys.snapshots(mapId, page, pageSize),
    queryFn: async () => listAdvancedMapAnalyticsSnapshots(mapId, { page, pageSize }),
    enabled,
    staleTime: 30_000,
  });
}

export function useAdvancedMapAnalyticsPublicMapQuery(mapId: string, enabled = true) {
  return useQuery<AdvancedMapAnalyticsMapDetail, AdvancedMapAnalyticsApiError>({
    queryKey: advancedMapAnalyticsKeys.public(mapId),
    queryFn: async () => getPublicAdvancedMapAnalyticsMap(mapId),
    enabled,
    staleTime: 60_000,
  });
}

export function useCreateAdvancedMapAnalyticsMapMutation() {
  const queryClient = useQueryClient();

  return useMutation<AdvancedMapAnalyticsMapDetail, AdvancedMapAnalyticsApiError, CreateMapInput>({
    mutationFn: async (input) =>
      createAdvancedMapAnalyticsMap({
        title: input.title,
        description: input.description,
        state: input.state,
        schemaVersion: input.mapState.version,
        config: input.mapState,
      }),
    onSuccess: async (createdMap) => {
      queryClient.setQueryData(advancedMapAnalyticsKeys.map(createdMap.id), createdMap);
      await queryClient.invalidateQueries({ queryKey: advancedMapAnalyticsKeys.maps });
    },
  });
}

export function useUpdateAdvancedMapAnalyticsMapMutation() {
  const queryClient = useQueryClient();

  return useMutation<AdvancedMapAnalyticsMapDetail, AdvancedMapAnalyticsApiError, UpdateMapInput>({
    mutationFn: async (input) =>
      updateAdvancedMapAnalyticsMap(input.mapId, {
        title: input.title,
        description: input.description,
        state: input.state,
      }),
    onSuccess: async (updatedMap) => {
      queryClient.setQueryData(advancedMapAnalyticsKeys.map(updatedMap.id), updatedMap);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: advancedMapAnalyticsKeys.maps }),
        queryClient.invalidateQueries({ queryKey: advancedMapAnalyticsKeys.map(updatedMap.id) }),
        queryClient.invalidateQueries({
          queryKey: ['advanced-map-analytics', 'snapshots', updatedMap.id],
        }),
        queryClient.invalidateQueries({ queryKey: advancedMapAnalyticsKeys.public(updatedMap.id) }),
      ]);
    },
  });
}

export function useSaveAdvancedMapAnalyticsSnapshotMutation() {
  const queryClient = useQueryClient();

  return useMutation<AdvancedMapAnalyticsSnapshot, AdvancedMapAnalyticsApiError, SaveSnapshotInput>({
    mutationFn: async (input) =>
      createAdvancedMapAnalyticsSnapshot(input.mapId, {
        title: input.title,
        description: input.description,
        stateAtSave: input.stateAtSave,
        schemaVersion: input.mapState.version,
        config: input.mapState,
      }),
    onSuccess: async (_savedSnapshot, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: advancedMapAnalyticsKeys.map(input.mapId) }),
        queryClient.invalidateQueries({
          queryKey: ['advanced-map-analytics', 'snapshots', input.mapId],
        }),
        queryClient.invalidateQueries({ queryKey: advancedMapAnalyticsKeys.maps }),
        queryClient.invalidateQueries({ queryKey: advancedMapAnalyticsKeys.public(input.mapId) }),
      ]);
    },
  });
}

export function useDeleteAdvancedMapAnalyticsMapMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, AdvancedMapAnalyticsApiError, { mapId: string }>({
    mutationFn: async ({ mapId }) => deleteAdvancedMapAnalyticsMap(mapId),
    onSuccess: async (_result, input) => {
      queryClient.removeQueries({ queryKey: advancedMapAnalyticsKeys.map(input.mapId) });
      queryClient.removeQueries({ queryKey: advancedMapAnalyticsKeys.public(input.mapId) });
      await queryClient.invalidateQueries({ queryKey: advancedMapAnalyticsKeys.maps });
    },
  });
}

export async function fetchAdvancedMapAnalyticsSnapshotForRestore(
  mapId: string,
  snapshotId: string
): Promise<AdvancedMapAnalyticsSnapshot> {
  return getAdvancedMapAnalyticsSnapshot(mapId, snapshotId);
}
