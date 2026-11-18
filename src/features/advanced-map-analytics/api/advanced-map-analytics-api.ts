import type { AdvancedMapAnalyticsUrlState } from '@/schemas/advanced-map-analytics';
import {
  normalizeMapDetail,
  normalizeMapList,
  normalizeSnapshot,
  normalizeSnapshotsList,
  type AdvancedMapAnalyticsMapDetail,
  type AdvancedMapAnalyticsMapSummary,
  type AdvancedMapAnalyticsSnapshot,
  type AdvancedMapAnalyticsSnapshotsList,
  type AdvancedMapAnalyticsVisibility,
} from './schemas';
import {
  AdvancedMapAnalyticsApiError,
  asRecord,
  fetchPublicMapPayload,
  ownerRequest,
  unwrapData,
} from './advanced-map-analytics-transport';

export { AdvancedMapAnalyticsApiError } from './advanced-map-analytics-transport';

interface CreateMapInput {
  title?: string;
  description?: string | null;
  state?: AdvancedMapAnalyticsVisibility;
  schemaVersion: number;
  config: AdvancedMapAnalyticsUrlState;
}

interface UpdateMapInput {
  title?: string;
  description?: string | null;
  state?: AdvancedMapAnalyticsVisibility;
}

interface CreateSnapshotInput {
  title?: string;
  description?: string | null;
  stateAtSave?: AdvancedMapAnalyticsVisibility;
  mapPatch?: {
    title?: string;
    description?: string | null;
    state?: AdvancedMapAnalyticsVisibility;
  };
  schemaVersion: number;
  config: AdvancedMapAnalyticsUrlState;
}

function ensureBundledGroupedSeriesData(
  mapDetail: AdvancedMapAnalyticsMapDetail,
  endpointName: 'owner' | 'public'
): AdvancedMapAnalyticsMapDetail {
  if (mapDetail.groupedSeriesData !== undefined) {
    return mapDetail;
  }

  throw new AdvancedMapAnalyticsApiError(
    endpointName === 'owner'
      ? 'Owner map detail response missing grouped-series bundled data.'
      : 'Public map detail response missing grouped-series bundled data.',
    500,
    'BUNDLED_GROUPED_SERIES_MISSING'
  );
}

export async function createAdvancedMapAnalyticsMap(
  input: CreateMapInput
): Promise<AdvancedMapAnalyticsMapDetail> {
  const payload = await ownerRequest('/maps', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: input.title,
      description: input.description ?? undefined,
      visibility: input.state ?? 'private',
      state: input.config,
      schemaVersion: input.schemaVersion,
    }),
  });

  return normalizeMapDetail(unwrapData(payload));
}

export async function listAdvancedMapAnalyticsMaps(): Promise<AdvancedMapAnalyticsMapSummary[]> {
  const payload = await ownerRequest('/maps', {
    method: 'GET',
  });

  return normalizeMapList(unwrapData(payload));
}

export async function getAdvancedMapAnalyticsMap(mapId: string): Promise<AdvancedMapAnalyticsMapDetail> {
  const payload = await ownerRequest(`/maps/${encodeURIComponent(mapId)}`, {
    method: 'GET',
  });

  return ensureBundledGroupedSeriesData(normalizeMapDetail(unwrapData(payload)), 'owner');
}

export async function updateAdvancedMapAnalyticsMap(
  mapId: string,
  input: UpdateMapInput
): Promise<AdvancedMapAnalyticsMapDetail> {
  const payload = await ownerRequest(`/maps/${encodeURIComponent(mapId)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: input.title,
      description: input.description,
      visibility: input.state,
    }),
  });

  return normalizeMapDetail(unwrapData(payload));
}

export async function createAdvancedMapAnalyticsSnapshot(
  mapId: string,
  input: CreateSnapshotInput
): Promise<AdvancedMapAnalyticsSnapshot> {
  const mapPatch: Record<string, unknown> = {};
  if (input.title !== undefined) {
    mapPatch.title = input.title;
  }
  if (input.stateAtSave !== undefined) {
    mapPatch.visibility = input.stateAtSave;
  }
  if (input.mapPatch?.title !== undefined) {
    mapPatch.title = input.mapPatch.title;
  }
  if (input.mapPatch?.description !== undefined) {
    mapPatch.description = input.mapPatch.description;
  }
  if (input.mapPatch?.state !== undefined) {
    mapPatch.visibility = input.mapPatch.state;
  }

  const payload = await ownerRequest(`/maps/${encodeURIComponent(mapId)}/snapshots`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      state: input.config,
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(Object.keys(mapPatch).length > 0 ? { mapPatch } : {}),
    }),
  });

  const unwrapped = unwrapData(payload);
  const record = asRecord(unwrapped);
  return normalizeSnapshot(record.snapshot ?? unwrapped);
}

export async function listAdvancedMapAnalyticsSnapshots(
  mapId: string,
  params: { page?: number; pageSize?: number } = {}
): Promise<AdvancedMapAnalyticsSnapshotsList> {
  const queryParams = new URLSearchParams();
  if (typeof params.page === 'number' && Number.isFinite(params.page)) {
    queryParams.set('page', String(Math.max(1, Math.trunc(params.page))));
  }
  if (typeof params.pageSize === 'number' && Number.isFinite(params.pageSize)) {
    queryParams.set('pageSize', String(Math.max(1, Math.trunc(params.pageSize))));
  }
  const queryString = queryParams.toString();
  const snapshotsPath = `/maps/${encodeURIComponent(mapId)}/snapshots${
    queryString.length > 0 ? `?${queryString}` : ''
  }`;

  const payload = await ownerRequest(snapshotsPath, {
    method: 'GET',
  });

  const list = normalizeSnapshotsList(unwrapData(payload));

  const hydratedSnapshots = await Promise.all(
    list.snapshots.map(async (snapshot) => {
      if (snapshot.snapshotId.trim().length === 0) {
        return snapshot;
      }

      try {
        return await getAdvancedMapAnalyticsSnapshot(mapId, snapshot.snapshotId);
      } catch {
        return snapshot;
      }
    })
  );

  return {
    snapshots: hydratedSnapshots,
    page: list.page,
    pageSize: list.pageSize,
    total: list.total,
    hasNextPage: list.hasNextPage,
  };
}

export async function getAdvancedMapAnalyticsSnapshot(
  mapId: string,
  snapshotId: string
): Promise<AdvancedMapAnalyticsSnapshot> {
  const payload = await ownerRequest(
    `/maps/${encodeURIComponent(mapId)}/snapshots/${encodeURIComponent(snapshotId)}`,
    {
      method: 'GET',
    }
  );

  return normalizeSnapshot(unwrapData(payload));
}

export async function deleteAdvancedMapAnalyticsMap(mapId: string): Promise<void> {
  const payload = await ownerRequest(`/maps/${encodeURIComponent(mapId)}`, {
    method: 'DELETE',
  });

  // Validate envelope shape for successful 2xx responses.
  void unwrapData(payload);
}

/** A public map's payload (`fetchPublicMapPayload`), decoded. */
export function decodePublicMapPayload(payload: unknown): AdvancedMapAnalyticsMapDetail {
  return ensureBundledGroupedSeriesData(normalizeMapDetail(payload), 'public');
}

export async function getPublicAdvancedMapAnalyticsMap(publicId: string): Promise<AdvancedMapAnalyticsMapDetail> {
  return decodePublicMapPayload(await fetchPublicMapPayload(publicId));
}
