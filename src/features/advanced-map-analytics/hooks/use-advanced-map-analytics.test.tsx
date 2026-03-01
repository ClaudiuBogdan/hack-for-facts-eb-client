import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import { AdvancedMapAnalyticsUrlStateSchema } from '@/schemas/advanced-map-analytics';
import type {
  AdvancedMapAnalyticsMapDetail,
  AdvancedMapAnalyticsSnapshot,
} from '@/features/advanced-map-analytics/api/schemas';
import {
  advancedMapAnalyticsKeys,
  useDeleteAdvancedMapAnalyticsMapMutation,
  useSaveAdvancedMapAnalyticsSnapshotMutation,
  useUpdateAdvancedMapAnalyticsMapMutation,
} from './use-advanced-map-analytics';

const createAdvancedMapAnalyticsMapMock = vi.fn();
const createAdvancedMapAnalyticsSnapshotMock = vi.fn();
const deleteAdvancedMapAnalyticsMapMock = vi.fn();
const getAdvancedMapAnalyticsMapMock = vi.fn();
const getAdvancedMapAnalyticsSnapshotMock = vi.fn();
const getPublicAdvancedMapAnalyticsMapMock = vi.fn();
const listAdvancedMapAnalyticsMapsMock = vi.fn();
const listAdvancedMapAnalyticsSnapshotsMock = vi.fn();
const updateAdvancedMapAnalyticsMapMock = vi.fn();

vi.mock('@/features/advanced-map-analytics/api/advanced-map-analytics-api', () => ({
  createAdvancedMapAnalyticsMap: (...args: unknown[]) => createAdvancedMapAnalyticsMapMock(...args),
  createAdvancedMapAnalyticsSnapshot: (...args: unknown[]) =>
    createAdvancedMapAnalyticsSnapshotMock(...args),
  deleteAdvancedMapAnalyticsMap: (...args: unknown[]) => deleteAdvancedMapAnalyticsMapMock(...args),
  getAdvancedMapAnalyticsMap: (...args: unknown[]) => getAdvancedMapAnalyticsMapMock(...args),
  getAdvancedMapAnalyticsSnapshot: (...args: unknown[]) => getAdvancedMapAnalyticsSnapshotMock(...args),
  getPublicAdvancedMapAnalyticsMap: (...args: unknown[]) => getPublicAdvancedMapAnalyticsMapMock(...args),
  listAdvancedMapAnalyticsMaps: (...args: unknown[]) => listAdvancedMapAnalyticsMapsMock(...args),
  listAdvancedMapAnalyticsSnapshots: (...args: unknown[]) => listAdvancedMapAnalyticsSnapshotsMock(...args),
  updateAdvancedMapAnalyticsMap: (...args: unknown[]) => updateAdvancedMapAnalyticsMapMock(...args),
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function createMapDetail(params?: {
  id?: string;
  publicId?: string | null;
}): AdvancedMapAnalyticsMapDetail {
  const mapId = params?.id ?? 'ama_map_1';
  const now = '2026-03-01T12:00:00.000Z';

  return {
    id: mapId,
    title: 'Map title',
    description: null,
    state: 'private',
    publicId: params?.publicId ?? null,
    snapshotCount: 1,
    createdAt: now,
    updatedAt: now,
    lastSnapshot: {
      snapshotId: 'snap_1',
      createdAt: now,
      schemaVersion: 1,
      stateAtSave: 'private',
      title: 'Snapshot',
      description: null,
      config: AdvancedMapAnalyticsUrlStateSchema.parse({}),
    },
  };
}

function createSnapshot(): AdvancedMapAnalyticsSnapshot {
  const now = '2026-03-01T12:00:00.000Z';
  return {
    snapshotId: 'snap_1',
    createdAt: now,
    schemaVersion: 1,
    stateAtSave: 'private',
    title: 'Snapshot',
    description: null,
    config: AdvancedMapAnalyticsUrlStateSchema.parse({}),
  };
}

function hasQueryKeyCall(
  calls: Array<[args: { queryKey: readonly unknown[] }]>,
  expectedQueryKey: readonly unknown[]
): boolean {
  return calls.some(([args]) => JSON.stringify(args.queryKey) === JSON.stringify(expectedQueryKey));
}

describe('use-advanced-map-analytics public cache key behavior', () => {
  beforeEach(() => {
    createAdvancedMapAnalyticsMapMock.mockReset();
    createAdvancedMapAnalyticsSnapshotMock.mockReset();
    deleteAdvancedMapAnalyticsMapMock.mockReset();
    getAdvancedMapAnalyticsMapMock.mockReset();
    getAdvancedMapAnalyticsSnapshotMock.mockReset();
    getPublicAdvancedMapAnalyticsMapMock.mockReset();
    listAdvancedMapAnalyticsMapsMock.mockReset();
    listAdvancedMapAnalyticsSnapshotsMock.mockReset();
    updateAdvancedMapAnalyticsMapMock.mockReset();
  });

  it('invalidates exact public map query keys after update when publicId is known', async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    const invalidateQueriesSpy = vi
      .spyOn(queryClient, 'invalidateQueries')
      .mockResolvedValue(undefined);

    queryClient.setQueryData(advancedMapAnalyticsKeys.map('ama_map_1'), createMapDetail({ publicId: 'public_cached' }));
    updateAdvancedMapAnalyticsMapMock.mockResolvedValue(
      createMapDetail({ id: 'ama_map_1', publicId: 'public_updated' })
    );

    const { result } = renderHook(() => useUpdateAdvancedMapAnalyticsMapMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ mapId: 'ama_map_1', state: 'public' });
    });

    const calls = invalidateQueriesSpy.mock.calls as Array<[args: { queryKey: readonly unknown[] }]>;
    expect(hasQueryKeyCall(calls, advancedMapAnalyticsKeys.public('public_cached'))).toBe(true);
    expect(hasQueryKeyCall(calls, advancedMapAnalyticsKeys.public('public_updated'))).toBe(true);
    expect(hasQueryKeyCall(calls, ['advanced-map-analytics', 'public'])).toBe(false);
  });

  it('falls back to public-prefix invalidation after update when publicId is unknown', async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    const invalidateQueriesSpy = vi
      .spyOn(queryClient, 'invalidateQueries')
      .mockResolvedValue(undefined);

    queryClient.setQueryData(advancedMapAnalyticsKeys.map('ama_map_1'), createMapDetail({ publicId: null }));
    updateAdvancedMapAnalyticsMapMock.mockResolvedValue(
      createMapDetail({ id: 'ama_map_1', publicId: null })
    );

    const { result } = renderHook(() => useUpdateAdvancedMapAnalyticsMapMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ mapId: 'ama_map_1', state: 'private' });
    });

    const calls = invalidateQueriesSpy.mock.calls as Array<[args: { queryKey: readonly unknown[] }]>;
    expect(hasQueryKeyCall(calls, ['advanced-map-analytics', 'public'])).toBe(true);
    expect(hasQueryKeyCall(calls, advancedMapAnalyticsKeys.public('ama_map_1'))).toBe(false);
  });

  it('invalidates exact public map query key after snapshot save when cached publicId is known', async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    const invalidateQueriesSpy = vi
      .spyOn(queryClient, 'invalidateQueries')
      .mockResolvedValue(undefined);

    queryClient.setQueryData(advancedMapAnalyticsKeys.map('ama_map_1'), createMapDetail({ publicId: 'public_cached' }));
    createAdvancedMapAnalyticsSnapshotMock.mockResolvedValue(createSnapshot());

    const { result } = renderHook(() => useSaveAdvancedMapAnalyticsSnapshotMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        mapId: 'ama_map_1',
        mapState: AdvancedMapAnalyticsUrlStateSchema.parse({}),
      });
    });

    const calls = invalidateQueriesSpy.mock.calls as Array<[args: { queryKey: readonly unknown[] }]>;
    expect(hasQueryKeyCall(calls, advancedMapAnalyticsKeys.public('public_cached'))).toBe(true);
    expect(hasQueryKeyCall(calls, ['advanced-map-analytics', 'public'])).toBe(false);
  });

  it('falls back to public-prefix invalidation after snapshot save when publicId is unknown', async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    const invalidateQueriesSpy = vi
      .spyOn(queryClient, 'invalidateQueries')
      .mockResolvedValue(undefined);

    createAdvancedMapAnalyticsSnapshotMock.mockResolvedValue(createSnapshot());

    const { result } = renderHook(() => useSaveAdvancedMapAnalyticsSnapshotMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        mapId: 'ama_map_1',
        mapState: AdvancedMapAnalyticsUrlStateSchema.parse({}),
      });
    });

    const calls = invalidateQueriesSpy.mock.calls as Array<[args: { queryKey: readonly unknown[] }]>;
    expect(hasQueryKeyCall(calls, ['advanced-map-analytics', 'public'])).toBe(true);
    expect(hasQueryKeyCall(calls, advancedMapAnalyticsKeys.public('ama_map_1'))).toBe(false);
  });

  it('removes exact public map query key after delete when publicId is known', async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    const removeQueriesSpy = vi.spyOn(queryClient, 'removeQueries');

    queryClient.setQueryData(advancedMapAnalyticsKeys.map('ama_map_1'), createMapDetail({ publicId: 'public_cached' }));
    deleteAdvancedMapAnalyticsMapMock.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteAdvancedMapAnalyticsMapMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ mapId: 'ama_map_1' });
    });

    const calls = removeQueriesSpy.mock.calls as Array<[args: { queryKey: readonly unknown[] }]>;
    expect(hasQueryKeyCall(calls, advancedMapAnalyticsKeys.public('public_cached'))).toBe(true);
    expect(hasQueryKeyCall(calls, ['advanced-map-analytics', 'public'])).toBe(false);
  });

  it('falls back to public-prefix remove after delete when publicId is unknown', async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    const removeQueriesSpy = vi.spyOn(queryClient, 'removeQueries');

    deleteAdvancedMapAnalyticsMapMock.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteAdvancedMapAnalyticsMapMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ mapId: 'ama_map_1' });
    });

    const calls = removeQueriesSpy.mock.calls as Array<[args: { queryKey: readonly unknown[] }]>;
    expect(hasQueryKeyCall(calls, ['advanced-map-analytics', 'public'])).toBe(true);
    expect(hasQueryKeyCall(calls, advancedMapAnalyticsKeys.public('ama_map_1'))).toBe(false);
  });
});
