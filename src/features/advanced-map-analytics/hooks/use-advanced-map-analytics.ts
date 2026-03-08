import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
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
  public: (publicId: string) => ['advanced-map-analytics', 'public', publicId] as const,
};
const advancedMapAnalyticsPublicPrefixKey = ['advanced-map-analytics', 'public'] as const;

interface SaveSnapshotInput {
  mapId: string;
  mapState: AdvancedMapAnalyticsUrlState;
  title?: string;
  description?: string | null;
  stateAtSave?: AdvancedMapAnalyticsVisibility;
  mapPatch?: {
    title?: string;
    description?: string | null;
    state?: AdvancedMapAnalyticsVisibility;
  };
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

function normalizePublicId(value: string | null | undefined): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
}

function resolveCachedMapPublicId(queryClient: QueryClient, mapId: string): string | undefined {
  const cachedMap = queryClient.getQueryData<AdvancedMapAnalyticsMapDetail>(advancedMapAnalyticsKeys.map(mapId));
  return normalizePublicId(cachedMap?.publicId);
}

function uniquePublicIds(...values: Array<string | null | undefined>): string[] {
  const resolvedPublicIds = new Set<string>();

  for (const value of values) {
    const normalizedValue = normalizePublicId(value);
    if (normalizedValue !== undefined) {
      resolvedPublicIds.add(normalizedValue);
    }
  }

  return Array.from(resolvedPublicIds);
}

async function invalidatePublicQueries(queryClient: QueryClient, publicIds: string[]): Promise<void> {
  if (publicIds.length === 0) {
    await queryClient.invalidateQueries({ queryKey: advancedMapAnalyticsPublicPrefixKey });
    return;
  }

  await Promise.all(
    publicIds.map((publicId) =>
      queryClient.invalidateQueries({ queryKey: advancedMapAnalyticsKeys.public(publicId) })
    )
  );
}

function removePublicQueries(queryClient: QueryClient, publicIds: string[]): void {
  if (publicIds.length === 0) {
    queryClient.removeQueries({ queryKey: advancedMapAnalyticsPublicPrefixKey });
    return;
  }

  for (const publicId of publicIds) {
    queryClient.removeQueries({ queryKey: advancedMapAnalyticsKeys.public(publicId) });
  }
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

export function useAdvancedMapAnalyticsPublicMapQuery(publicId: string, enabled = true) {
  return useQuery<AdvancedMapAnalyticsMapDetail, AdvancedMapAnalyticsApiError>({
    queryKey: advancedMapAnalyticsKeys.public(publicId),
    queryFn: async () => getPublicAdvancedMapAnalyticsMap(publicId),
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
      // Force the editor route to fetch canonical detail instead of hydrating
      // from a create response that may be missing bundled data or latest snapshot state.
      queryClient.removeQueries({ queryKey: advancedMapAnalyticsKeys.map(createdMap.id) });
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
      const cachedPublicId = resolveCachedMapPublicId(queryClient, updatedMap.id);
      queryClient.setQueryData(advancedMapAnalyticsKeys.map(updatedMap.id), updatedMap);
      const publicIdsToInvalidate = uniquePublicIds(cachedPublicId, updatedMap.publicId);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: advancedMapAnalyticsKeys.maps }),
        queryClient.invalidateQueries({ queryKey: advancedMapAnalyticsKeys.map(updatedMap.id) }),
        queryClient.invalidateQueries({
          queryKey: ['advanced-map-analytics', 'snapshots', updatedMap.id],
        }),
      ]);
      await invalidatePublicQueries(queryClient, publicIdsToInvalidate);
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
        mapPatch: input.mapPatch,
        schemaVersion: input.mapState.version,
        config: input.mapState,
      }),
    onSuccess: async (_savedSnapshot, input) => {
      const publicIdsToInvalidate = uniquePublicIds(resolveCachedMapPublicId(queryClient, input.mapId));

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: advancedMapAnalyticsKeys.map(input.mapId) }),
        queryClient.invalidateQueries({
          queryKey: ['advanced-map-analytics', 'snapshots', input.mapId],
        }),
        queryClient.invalidateQueries({ queryKey: advancedMapAnalyticsKeys.maps }),
      ]);
      await invalidatePublicQueries(queryClient, publicIdsToInvalidate);
    },
  });
}

export function useDeleteAdvancedMapAnalyticsMapMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, AdvancedMapAnalyticsApiError, { mapId: string }>({
    mutationFn: async ({ mapId }) => deleteAdvancedMapAnalyticsMap(mapId),
    onSuccess: async (_result, input) => {
      const publicIdsToRemove = uniquePublicIds(resolveCachedMapPublicId(queryClient, input.mapId));
      queryClient.removeQueries({ queryKey: advancedMapAnalyticsKeys.map(input.mapId) });
      removePublicQueries(queryClient, publicIdsToRemove);
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
