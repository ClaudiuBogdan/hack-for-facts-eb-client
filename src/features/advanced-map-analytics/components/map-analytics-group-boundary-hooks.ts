import { useEffect, useMemo, useRef, useState } from 'react';
import type { GeoJsonObject } from 'geojson';
import type { UatFeature } from '@/components/maps/interfaces';
import type { MapGroup, MapGroupWorkspace } from '@/schemas/advanced-map-analytics';
import {
  buildGroupWorkspaceBoundaryGeoJsonData,
  buildGroupWorkspaceBoundaryKey,
  buildMapGroupBoundaryGeoJsonData,
  buildMapGroupBoundaryKey,
} from './map-analytics-group-boundaries';
import type { GroupBoundaryWorkerRequest, GroupBoundaryWorkerResponse } from './map-analytics-group-boundary.worker';

type BoundaryMessageListener = (event: MessageEvent<GroupBoundaryWorkerResponse>) => void;

type BoundaryWorkerLike = {
  addEventListener: (type: 'message', listener: BoundaryMessageListener) => void;
  removeEventListener: (type: 'message', listener: BoundaryMessageListener) => void;
  postMessage: (message: GroupBoundaryWorkerRequest) => void;
  terminate: () => void;
};

export type BoundaryWorkerFactory = () => BoundaryWorkerLike;

type BoundaryState = {
  readonly key: string;
  readonly data: GeoJsonObject | null;
};

type BoundaryHookOptions = {
  readonly enabled: boolean;
  readonly geoJsonFeatures: readonly UatFeature[];
  readonly boundaryKey: string | null;
  readonly groupCount: number;
  readonly totalMemberCount: number;
  readonly buildSync: () => GeoJsonObject | null;
  readonly postWorkerRequest: (
    worker: BoundaryWorkerLike,
    requestId: number,
    boundaryKey: string,
  ) => void;
  readonly workerFactory?: BoundaryWorkerFactory;
};

type WorkspaceBoundaryHookOptions = {
  readonly enabled: boolean;
  readonly workspace: MapGroupWorkspace | undefined;
  readonly geoJsonFeatures: readonly UatFeature[];
  readonly workerFactory?: BoundaryWorkerFactory;
};

type GroupBoundaryHookOptions = {
  readonly enabled: boolean;
  readonly group: MapGroup | undefined;
  readonly geoJsonFeatures: readonly UatFeature[];
  readonly workerFactory?: BoundaryWorkerFactory;
};

const WORKER_MIN_GROUP_COUNT = 12;
const WORKER_MIN_MEMBER_COUNT = 80;

function createDefaultBoundaryWorker(): BoundaryWorkerLike {
  return new Worker(new URL('./map-analytics-group-boundary.worker.ts', import.meta.url), {
    type: 'module',
  }) as BoundaryWorkerLike;
}

function canCreateBoundaryWorker(workerFactory: BoundaryWorkerFactory | undefined): boolean {
  return Boolean(workerFactory) || (typeof window !== 'undefined' && typeof Worker !== 'undefined');
}

function shouldUseBoundaryWorker(totalMemberCount: number, groupCount: number): boolean {
  return totalMemberCount >= WORKER_MIN_MEMBER_COUNT || groupCount >= WORKER_MIN_GROUP_COUNT;
}

function postInitGeometryIndex(
  worker: BoundaryWorkerLike,
  geoJsonFeatures: readonly UatFeature[],
): void {
  worker.postMessage({
    type: 'initGeometryIndex',
    geoJsonFeatures,
  } satisfies GroupBoundaryWorkerRequest);
}

function useBoundaryGeoJsonData({
  enabled,
  geoJsonFeatures,
  boundaryKey,
  groupCount,
  totalMemberCount,
  buildSync,
  postWorkerRequest,
  workerFactory,
}: BoundaryHookOptions): GeoJsonObject | null {
  const [boundaryState, setBoundaryState] = useState<BoundaryState | null>(null);
  const workerRef = useRef<BoundaryWorkerLike | null>(null);
  const workerGeometryFeaturesRef = useRef<readonly UatFeature[] | null>(null);
  const latestRequestIdRef = useRef(0);
  const latestRequestKeyRef = useRef<string | null>(null);
  const canUseWorker = canCreateBoundaryWorker(workerFactory);
  const useWorker = enabled && Boolean(boundaryKey) && canUseWorker &&
    shouldUseBoundaryWorker(totalMemberCount, groupCount);

  const syncBoundaryData = useMemo(() => {
    if (!enabled || !boundaryKey || useWorker) {
      return null;
    }

    return buildSync();
  }, [boundaryKey, buildSync, enabled, useWorker]);

  useEffect(() => () => {
    workerRef.current?.terminate();
    workerRef.current = null;
    workerGeometryFeaturesRef.current = null;
  }, []);

  useEffect(() => {
    if (!enabled || !boundaryKey || !useWorker) {
      latestRequestKeyRef.current = null;
      return;
    }

    if (latestRequestKeyRef.current === boundaryKey && workerGeometryFeaturesRef.current === geoJsonFeatures) {
      return;
    }

    const worker = workerRef.current ?? (workerFactory ?? createDefaultBoundaryWorker)();
    workerRef.current = worker;

    if (workerGeometryFeaturesRef.current !== geoJsonFeatures) {
      postInitGeometryIndex(worker, geoJsonFeatures);
      workerGeometryFeaturesRef.current = geoJsonFeatures;
    }

    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;
    latestRequestKeyRef.current = boundaryKey;
    setBoundaryState(null);

    const handleMessage = (event: MessageEvent<GroupBoundaryWorkerResponse>) => {
      const response = event.data;
      if (response.requestId !== latestRequestIdRef.current || response.boundaryKey !== boundaryKey) {
        return;
      }

      if (response.type === 'boundaryError') {
        setBoundaryState({ key: boundaryKey, data: null });
        return;
      }

      setBoundaryState({ key: boundaryKey, data: response.data });
    };

    worker.addEventListener('message', handleMessage);
    postWorkerRequest(worker, requestId, boundaryKey);

    return () => {
      worker.removeEventListener('message', handleMessage);
    };
  }, [
    boundaryKey,
    enabled,
    geoJsonFeatures,
    postWorkerRequest,
    useWorker,
    workerFactory,
  ]);

  if (!enabled || !boundaryKey) {
    return null;
  }

  if (!useWorker) {
    return syncBoundaryData;
  }

  return boundaryState?.key === boundaryKey ? boundaryState.data : null;
}

export function useGroupWorkspaceBoundaryGeoJsonData({
  enabled,
  workspace,
  geoJsonFeatures,
  workerFactory,
}: WorkspaceBoundaryHookOptions): GeoJsonObject | null {
  const boundaryKey = useMemo(
    () => buildGroupWorkspaceBoundaryKey(enabled ? workspace : undefined),
    [enabled, workspace],
  );
  const totalMemberCount = workspace?.groups.reduce(
    (total, group) => total + group.memberSirutaCodes.length,
    0,
  ) ?? 0;

  const buildSync = useMemo(
    () => () => workspace
      ? buildGroupWorkspaceBoundaryGeoJsonData(workspace.groups, geoJsonFeatures)
      : null,
    [geoJsonFeatures, workspace],
  );
  const postWorkerRequest = useMemo(
    () => (
      worker: BoundaryWorkerLike,
      requestId: number,
      requestBoundaryKey: string,
    ) => {
      worker.postMessage({
        type: 'buildWorkspaceBoundary',
        requestId,
        boundaryKey: requestBoundaryKey,
        groups: workspace?.groups ?? [],
      } satisfies GroupBoundaryWorkerRequest);
    },
    [workspace],
  );

  return useBoundaryGeoJsonData({
    enabled: enabled && Boolean(workspace),
    geoJsonFeatures,
    boundaryKey,
    groupCount: workspace?.groups.length ?? 0,
    totalMemberCount,
    buildSync,
    postWorkerRequest,
    workerFactory,
  });
}

export function useMapGroupBoundaryGeoJsonData({
  enabled,
  group,
  geoJsonFeatures,
  workerFactory,
}: GroupBoundaryHookOptions): GeoJsonObject | null {
  const boundaryKey = useMemo(
    () => buildMapGroupBoundaryKey(enabled ? group : undefined),
    [enabled, group],
  );
  const totalMemberCount = group?.memberSirutaCodes.length ?? 0;
  const buildSync = useMemo(
    () => () => group ? buildMapGroupBoundaryGeoJsonData(group, geoJsonFeatures) : null,
    [geoJsonFeatures, group],
  );
  const postWorkerRequest = useMemo(
    () => (
      worker: BoundaryWorkerLike,
      requestId: number,
      requestBoundaryKey: string,
    ) => {
      if (!group) {
        return;
      }

      worker.postMessage({
        type: 'buildGroupBoundary',
        requestId,
        boundaryKey: requestBoundaryKey,
        group,
      } satisfies GroupBoundaryWorkerRequest);
    },
    [group],
  );

  return useBoundaryGeoJsonData({
    enabled: enabled && Boolean(group),
    geoJsonFeatures,
    boundaryKey,
    groupCount: group ? 1 : 0,
    totalMemberCount,
    buildSync,
    postWorkerRequest,
    workerFactory,
  });
}
