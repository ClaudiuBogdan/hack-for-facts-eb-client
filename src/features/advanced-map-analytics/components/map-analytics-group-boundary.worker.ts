import type { UatFeature } from '@/components/maps/interfaces';
import type { MapGroup } from '@/schemas/advanced-map-analytics';
import {
  buildGroupBoundaryGeometryIndex,
  buildGroupWorkspaceBoundaryGeoJsonDataFromIndex,
  buildMapGroupBoundaryGeoJsonDataFromIndex,
  type GroupBoundaryGeometryIndex,
  type GroupBoundaryGeoJsonData,
} from './map-analytics-group-boundaries';

type InitGeometryIndexRequest = {
  readonly type: 'initGeometryIndex';
  readonly geoJsonFeatures: readonly UatFeature[];
};

type BuildWorkspaceBoundaryRequest = {
  readonly type: 'buildWorkspaceBoundary';
  readonly requestId: number;
  readonly boundaryKey: string;
  readonly groups: readonly MapGroup[];
};

type BuildGroupBoundaryRequest = {
  readonly type: 'buildGroupBoundary';
  readonly requestId: number;
  readonly boundaryKey: string;
  readonly group: MapGroup;
};

export type GroupBoundaryWorkerRequest =
  | InitGeometryIndexRequest
  | BuildWorkspaceBoundaryRequest
  | BuildGroupBoundaryRequest;

export type GroupBoundaryWorkerResponse =
  | {
      readonly type: 'boundaryResult';
      readonly requestId: number;
      readonly boundaryKey: string;
      readonly data: GroupBoundaryGeoJsonData | null;
      readonly stats: {
        readonly groupCount: number;
        readonly featureCount: number;
      };
    }
  | {
      readonly type: 'boundaryError';
      readonly requestId: number;
      readonly boundaryKey: string;
      readonly message: string;
    };

let geometryIndex: GroupBoundaryGeometryIndex | null = null;

const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<GroupBoundaryWorkerRequest>) => void) | null;
  postMessage: (message: GroupBoundaryWorkerResponse) => void;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Failed to build group boundaries.';
}

workerScope.onmessage = (event) => {
  const message = event.data;

  try {
    if (message.type === 'initGeometryIndex') {
      geometryIndex = buildGroupBoundaryGeometryIndex(message.geoJsonFeatures);
      return;
    }

    if (!geometryIndex) {
      throw new Error('Group boundary geometry index is not initialized.');
    }

    const data =
      message.type === 'buildWorkspaceBoundary'
        ? buildGroupWorkspaceBoundaryGeoJsonDataFromIndex(message.groups, geometryIndex)
        : buildMapGroupBoundaryGeoJsonDataFromIndex(message.group, geometryIndex);

    workerScope.postMessage({
      type: 'boundaryResult',
      requestId: message.requestId,
      boundaryKey: message.boundaryKey,
      data,
      stats: {
        groupCount: message.type === 'buildWorkspaceBoundary' ? message.groups.length : 1,
        featureCount: data?.features.length ?? 0,
      },
    });
  } catch (error) {
    if (message.type === 'initGeometryIndex') {
      return;
    }

    workerScope.postMessage({
      type: 'boundaryError',
      requestId: message.requestId,
      boundaryKey: message.boundaryKey,
      message: getErrorMessage(error),
    });
  }
};
