import Dexie, { type Table } from 'dexie';
import type { AdvancedMapAnalyticsVisibility } from '@/features/advanced-map-analytics/api/schemas';
import type { AdvancedMapAnalyticsUrlState } from '@/schemas/advanced-map-analytics';

const LOCAL_MAP_SNAPSHOTS_DB_NAME = 'advanced-map-analytics-local';
const LOCAL_MAP_SNAPSHOTS_TABLE_NAME = 'localSnapshots';

export const MAX_LOCAL_MAP_SNAPSHOTS_PER_MAP = 50;

export type LocalMapSnapshotSource = 'auto' | 'manual';

export interface LocalMapSnapshotRecord {
  id?: number;
  mapId: string;
  createdAt: string;
  updatedAt: string;
  source: LocalMapSnapshotSource;
  description: string | null;
  stateAtSave: AdvancedMapAnalyticsVisibility;
  mapState: AdvancedMapAnalyticsUrlState;
  mapDescription: string;
  comparableHash: string;
}

export interface LocalMapSnapshotInput {
  mapId: string;
  source: LocalMapSnapshotSource;
  description: string | null;
  stateAtSave: AdvancedMapAnalyticsVisibility;
  mapState: AdvancedMapAnalyticsUrlState;
  mapDescription: string;
  comparableHash: string;
}

class LocalMapSnapshotsDatabase extends Dexie {
  localSnapshots!: Table<LocalMapSnapshotRecord, number>;

  constructor() {
    super(LOCAL_MAP_SNAPSHOTS_DB_NAME);

    this.version(1).stores({
      [LOCAL_MAP_SNAPSHOTS_TABLE_NAME]: '++id,mapId,updatedAt,createdAt,source,comparableHash',
    });
  }
}

let localMapSnapshotsDatabase: LocalMapSnapshotsDatabase | null = null;

function isIndexedDbAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.indexedDB !== 'undefined'
  );
}

function getLocalMapSnapshotsDatabase(): LocalMapSnapshotsDatabase {
  if (!localMapSnapshotsDatabase) {
    localMapSnapshotsDatabase = new LocalMapSnapshotsDatabase();
  }

  return localMapSnapshotsDatabase;
}

async function pruneSnapshotsForMap(
  database: LocalMapSnapshotsDatabase,
  mapId: string
): Promise<void> {
  const snapshots = await database.localSnapshots.where('mapId').equals(mapId).sortBy('updatedAt');
  if (snapshots.length <= MAX_LOCAL_MAP_SNAPSHOTS_PER_MAP) {
    return;
  }

  const snapshotsToDelete = snapshots.slice(
    0,
    snapshots.length - MAX_LOCAL_MAP_SNAPSHOTS_PER_MAP
  );
  const snapshotIds = snapshotsToDelete
    .map((snapshot) => snapshot.id)
    .filter((snapshotId): snapshotId is number => typeof snapshotId === 'number');

  if (snapshotIds.length > 0) {
    await database.localSnapshots.bulkDelete(snapshotIds);
  }
}

export async function listLocalMapSnapshots(mapId: string): Promise<LocalMapSnapshotRecord[]> {
  if (!isIndexedDbAvailable() || mapId.trim().length === 0) {
    return [];
  }

  const database = getLocalMapSnapshotsDatabase();
  const snapshots = await database.localSnapshots.where('mapId').equals(mapId).sortBy('updatedAt');
  return snapshots.reverse();
}

export async function getLatestLocalMapSnapshot(
  mapId: string
): Promise<LocalMapSnapshotRecord | null> {
  if (!isIndexedDbAvailable() || mapId.trim().length === 0) {
    return null;
  }

  const snapshots = await listLocalMapSnapshots(mapId);
  return snapshots[0] ?? null;
}

export async function getLocalMapSnapshot(snapshotId: number): Promise<LocalMapSnapshotRecord | undefined> {
  if (!isIndexedDbAvailable()) {
    return undefined;
  }

  const database = getLocalMapSnapshotsDatabase();
  return database.localSnapshots.get(snapshotId);
}

export async function createLocalMapSnapshot(
  input: LocalMapSnapshotInput
): Promise<LocalMapSnapshotRecord | null> {
  if (!isIndexedDbAvailable() || input.mapId.trim().length === 0) {
    return null;
  }

  const database = getLocalMapSnapshotsDatabase();
  const nowIsoTimestamp = new Date().toISOString();
  const snapshot: LocalMapSnapshotRecord = {
    ...input,
    createdAt: nowIsoTimestamp,
    updatedAt: nowIsoTimestamp,
  };

  const snapshotId = await database.transaction('rw', database.localSnapshots, async () => {
    const nextSnapshotId = await database.localSnapshots.add(snapshot);
    await pruneSnapshotsForMap(database, input.mapId);
    return nextSnapshotId;
  });

  const persistedSnapshot = await database.localSnapshots.get(snapshotId);
  return persistedSnapshot ?? { ...snapshot, id: snapshotId };
}

export async function updateLocalMapSnapshot(
  snapshotId: number,
  input: Omit<LocalMapSnapshotInput, 'mapId' | 'source'>
): Promise<LocalMapSnapshotRecord | null> {
  if (!isIndexedDbAvailable()) {
    return null;
  }

  const database = getLocalMapSnapshotsDatabase();
  const existingSnapshot = await database.localSnapshots.get(snapshotId);
  if (!existingSnapshot) {
    return null;
  }

  const nowIsoTimestamp = new Date().toISOString();
  const updatedSnapshot: LocalMapSnapshotRecord = {
    ...existingSnapshot,
    ...input,
    updatedAt: nowIsoTimestamp,
  };

  await database.transaction('rw', database.localSnapshots, async () => {
    await database.localSnapshots.put(updatedSnapshot);
    await pruneSnapshotsForMap(database, existingSnapshot.mapId);
  });

  return updatedSnapshot;
}

export async function deleteLocalMapSnapshot(snapshotId: number): Promise<void> {
  if (!isIndexedDbAvailable()) {
    return;
  }

  const database = getLocalMapSnapshotsDatabase();
  await database.localSnapshots.delete(snapshotId);
}

export async function clearLocalMapSnapshots(mapId: string): Promise<void> {
  if (!isIndexedDbAvailable() || mapId.trim().length === 0) {
    return;
  }

  const database = getLocalMapSnapshotsDatabase();
  await database.localSnapshots.where('mapId').equals(mapId).delete();
}

export async function deleteLocalMapSnapshotsDatabase(): Promise<void> {
  if (localMapSnapshotsDatabase) {
    localMapSnapshotsDatabase.close();
    localMapSnapshotsDatabase = null;
  }

  await Dexie.delete(LOCAL_MAP_SNAPSHOTS_DB_NAME);
}
