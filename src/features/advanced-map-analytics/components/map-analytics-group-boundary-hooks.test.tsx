import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { FeatureCollection, MultiLineString } from 'geojson';
import type { UatFeature } from '@/components/maps/interfaces';
import type { MapGroupWorkspace } from '@/schemas/advanced-map-analytics';
import {
  useGroupWorkspaceBoundaryGeoJsonData,
  type BoundaryWorkerFactory,
} from './map-analytics-group-boundary-hooks';
import type { GroupBoundaryWorkerRequest, GroupBoundaryWorkerResponse } from './map-analytics-group-boundary.worker';

class FakeBoundaryWorker {
  readonly messages: GroupBoundaryWorkerRequest[] = [];
  private readonly listeners = new Set<(event: MessageEvent<GroupBoundaryWorkerResponse>) => void>();

  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<GroupBoundaryWorkerResponse>) => void,
  ): void {
    if (type === 'message') {
      this.listeners.add(listener);
    }
  }

  removeEventListener(
    type: 'message',
    listener: (event: MessageEvent<GroupBoundaryWorkerResponse>) => void,
  ): void {
    if (type === 'message') {
      this.listeners.delete(listener);
    }
  }

  postMessage(message: GroupBoundaryWorkerRequest): void {
    this.messages.push(message);
  }

  terminate(): void {
    this.listeners.clear();
  }

  emit(message: GroupBoundaryWorkerResponse): void {
    for (const listener of this.listeners) {
      listener({ data: message } as MessageEvent<GroupBoundaryWorkerResponse>);
    }
  }
}

function createSquareFeature(sirutaCode: string, offset: number): UatFeature {
  return {
    type: 'Feature',
    properties: {
      natcode: sirutaCode,
      name: `UAT ${sirutaCode}`,
      county: 'Alba',
    },
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [offset, 0],
          [offset + 1, 0],
          [offset + 1, 1],
          [offset, 1],
          [offset, 0],
        ],
      ],
    },
  };
}

function createWorkspace(id: string, groupCount: number): MapGroupWorkspace {
  return {
    id,
    key: id,
    label: id,
    groups: Array.from({ length: groupCount }, (_, index) => ({
      id: `${id}-group-${index}`,
      memberSirutaCodes: [`${1000 + index}`],
    })),
  };
}

function createBoundaryResult(requestId: number, boundaryKey: string): GroupBoundaryWorkerResponse {
  return {
    type: 'boundaryResult',
    requestId,
    boundaryKey,
    data: {
      type: 'FeatureCollection',
      features: [],
    } satisfies FeatureCollection<MultiLineString, { id: string; groupId: string }>,
    stats: {
      groupCount: 0,
      featureCount: 0,
    },
  };
}

function BoundaryProbe({
  workspace,
  geoJsonFeatures,
  workerFactory,
}: {
  readonly workspace: MapGroupWorkspace;
  readonly geoJsonFeatures: readonly UatFeature[];
  readonly workerFactory?: BoundaryWorkerFactory;
}) {
  const boundaryData = useGroupWorkspaceBoundaryGeoJsonData({
    enabled: true,
    workspace,
    geoJsonFeatures,
    workerFactory,
  });

  return <output data-testid="boundary-state">{boundaryData?.type ?? 'none'}</output>;
}

describe('group boundary hooks', () => {
  it('uses a worker for large workspace boundary builds', () => {
    const worker = new FakeBoundaryWorker();
    const workerFactory = () => worker;
    const workspace = createWorkspace('workspace-a', 12);
    const geoJsonFeatures = workspace.groups.map((group, index) =>
      createSquareFeature(group.memberSirutaCodes[0] ?? '', index),
    );

    render(
      <BoundaryProbe
        workspace={workspace}
        geoJsonFeatures={geoJsonFeatures}
        workerFactory={workerFactory}
      />,
    );

    expect(worker.messages.map((message) => message.type)).toEqual([
      'initGeometryIndex',
      'buildWorkspaceBoundary',
    ]);
  });

  it('does not issue a new worker request when the workspace membership key is unchanged', () => {
    const worker = new FakeBoundaryWorker();
    const workerFactory = () => worker;
    const workspace = createWorkspace('workspace-a', 12);
    const geoJsonFeatures = workspace.groups.map((group, index) =>
      createSquareFeature(group.memberSirutaCodes[0] ?? '', index),
    );
    const { rerender } = render(
      <BoundaryProbe
        workspace={workspace}
        geoJsonFeatures={geoJsonFeatures}
        workerFactory={workerFactory}
      />,
    );

    rerender(
      <BoundaryProbe
        workspace={{ ...workspace, label: 'Renamed workspace' }}
        geoJsonFeatures={geoJsonFeatures}
        workerFactory={workerFactory}
      />,
    );

    expect(worker.messages.filter((message) => message.type === 'buildWorkspaceBoundary')).toHaveLength(1);
  });

  it('ignores stale worker responses after switching workspaces', () => {
    const worker = new FakeBoundaryWorker();
    const workerFactory = () => worker;
    const workspaceA = createWorkspace('workspace-a', 12);
    const workspaceB = createWorkspace('workspace-b', 12);
    const geoJsonFeatures = workspaceA.groups.map((group, index) =>
      createSquareFeature(group.memberSirutaCodes[0] ?? '', index),
    );
    const { rerender } = render(
      <BoundaryProbe
        workspace={workspaceA}
        geoJsonFeatures={geoJsonFeatures}
        workerFactory={workerFactory}
      />,
    );
    const firstBuild = worker.messages.find((message) => message.type === 'buildWorkspaceBoundary');

    rerender(
      <BoundaryProbe
        workspace={workspaceB}
        geoJsonFeatures={geoJsonFeatures}
        workerFactory={workerFactory}
      />,
    );
    const buildRequests = worker.messages.filter((message) => message.type === 'buildWorkspaceBoundary');
    const secondBuild = buildRequests[1];

    if (!firstBuild || firstBuild.type !== 'buildWorkspaceBoundary' || !secondBuild || secondBuild.type !== 'buildWorkspaceBoundary') {
      throw new Error('Expected two worker build requests');
    }

    act(() => {
      worker.emit(createBoundaryResult(firstBuild.requestId, firstBuild.boundaryKey));
    });
    expect(screen.getByTestId('boundary-state')).toHaveTextContent('none');

    act(() => {
      worker.emit(createBoundaryResult(secondBuild.requestId, secondBuild.boundaryKey));
    });
    expect(screen.getByTestId('boundary-state')).toHaveTextContent('FeatureCollection');
  });

  it('falls back to synchronous boundary generation for small workspaces', () => {
    const workspace = createWorkspace('workspace-a', 1);
    const geoJsonFeatures = [createSquareFeature('1000', 0)];

    render(<BoundaryProbe workspace={workspace} geoJsonFeatures={geoJsonFeatures} />);

    expect(screen.getByTestId('boundary-state')).toHaveTextContent('FeatureCollection');
  });
});
