import Dexie, { type Table } from 'dexie';
import type { AdvancedMapDatasetDraft } from '@/features/advanced-map-datasets/types';

const LOCAL_DATASET_SNAPSHOTS_DB_NAME = 'advanced-map-datasets-local';
const LOCAL_DATASET_SNAPSHOTS_TABLE_NAME = 'localSnapshots';

export const MAX_LOCAL_DATASET_SNAPSHOTS_PER_RESOURCE = 50;

export type LocalDatasetSnapshotSource = 'auto' | 'manual';

export interface LocalDatasetSnapshotRecord {
  id?: number;
  resourceKey: string;
  createdAt: string;
  updatedAt: string;
  source: LocalDatasetSnapshotSource;
  description: string | null;
  draft: AdvancedMapDatasetDraft;
  comparableHash: string;
}

export interface LocalDatasetSnapshotInput {
  resourceKey: string;
  source: LocalDatasetSnapshotSource;
  description: string | null;
  draft: AdvancedMapDatasetDraft;
  comparableHash: string;
}

class LocalDatasetSnapshotsDatabase extends Dexie {
  localSnapshots!: Table<LocalDatasetSnapshotRecord, number>;

  constructor() {
    super(LOCAL_DATASET_SNAPSHOTS_DB_NAME);

    this.version(1).stores({
      [LOCAL_DATASET_SNAPSHOTS_TABLE_NAME]: '++id,resourceKey,updatedAt,createdAt,source,comparableHash',
    });
  }
}

let localDatasetSnapshotsDatabase: LocalDatasetSnapshotsDatabase | null = null;

function isIndexedDbAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

function getLocalDatasetSnapshotsDatabase(): LocalDatasetSnapshotsDatabase {
  if (!localDatasetSnapshotsDatabase) {
    localDatasetSnapshotsDatabase = new LocalDatasetSnapshotsDatabase();
  }

  return localDatasetSnapshotsDatabase;
}

async function pruneSnapshotsForResource(
  database: LocalDatasetSnapshotsDatabase,
  resourceKey: string
): Promise<void> {
  const snapshots = await database.localSnapshots.where('resourceKey').equals(resourceKey).sortBy('updatedAt');
  if (snapshots.length <= MAX_LOCAL_DATASET_SNAPSHOTS_PER_RESOURCE) {
    return;
  }

  const snapshotIds = snapshots
    .slice(0, snapshots.length - MAX_LOCAL_DATASET_SNAPSHOTS_PER_RESOURCE)
    .map((snapshot) => snapshot.id)
    .filter((snapshotId): snapshotId is number => typeof snapshotId === 'number');

  if (snapshotIds.length > 0) {
    await database.localSnapshots.bulkDelete(snapshotIds);
  }
}

export async function listLocalDatasetSnapshots(resourceKey: string): Promise<LocalDatasetSnapshotRecord[]> {
  if (!isIndexedDbAvailable() || resourceKey.trim() === '') {
    return [];
  }

  const database = getLocalDatasetSnapshotsDatabase();
  const snapshots = await database.localSnapshots.where('resourceKey').equals(resourceKey).sortBy('updatedAt');
  return snapshots.reverse();
}

export async function getLatestLocalDatasetSnapshot(resourceKey: string): Promise<LocalDatasetSnapshotRecord | null> {
  const snapshots = await listLocalDatasetSnapshots(resourceKey);
  return snapshots[0] ?? null;
}

export async function getLocalDatasetSnapshot(snapshotId: number): Promise<LocalDatasetSnapshotRecord | undefined> {
  if (!isIndexedDbAvailable()) {
    return undefined;
  }

  return getLocalDatasetSnapshotsDatabase().localSnapshots.get(snapshotId);
}

export async function createLocalDatasetSnapshot(
  input: LocalDatasetSnapshotInput
): Promise<LocalDatasetSnapshotRecord | null> {
  if (!isIndexedDbAvailable() || input.resourceKey.trim() === '') {
    return null;
  }

  const database = getLocalDatasetSnapshotsDatabase();
  const nowIsoTimestamp = new Date().toISOString();
  const snapshot: LocalDatasetSnapshotRecord = {
    ...input,
    createdAt: nowIsoTimestamp,
    updatedAt: nowIsoTimestamp,
  };

  const snapshotId = await database.transaction('rw', database.localSnapshots, async () => {
    const nextSnapshotId = await database.localSnapshots.add(snapshot);
    await pruneSnapshotsForResource(database, input.resourceKey);
    return nextSnapshotId;
  });

  const persisted = await database.localSnapshots.get(snapshotId);
  return persisted ?? { ...snapshot, id: snapshotId };
}

export async function updateLocalDatasetSnapshot(
  snapshotId: number,
  input: Omit<LocalDatasetSnapshotInput, 'resourceKey' | 'source'>
): Promise<LocalDatasetSnapshotRecord | null> {
  if (!isIndexedDbAvailable()) {
    return null;
  }

  const database = getLocalDatasetSnapshotsDatabase();
  const existingSnapshot = await database.localSnapshots.get(snapshotId);
  if (!existingSnapshot) {
    return null;
  }

  const updatedSnapshot: LocalDatasetSnapshotRecord = {
    ...existingSnapshot,
    ...input,
    updatedAt: new Date().toISOString(),
  };

  await database.transaction('rw', database.localSnapshots, async () => {
    await database.localSnapshots.put(updatedSnapshot);
    await pruneSnapshotsForResource(database, existingSnapshot.resourceKey);
  });

  return updatedSnapshot;
}

export async function deleteLocalDatasetSnapshot(snapshotId: number): Promise<void> {
  if (!isIndexedDbAvailable()) {
    return;
  }

  await getLocalDatasetSnapshotsDatabase().localSnapshots.delete(snapshotId);
}

export async function clearLocalDatasetSnapshots(resourceKey: string): Promise<void> {
  if (!isIndexedDbAvailable() || resourceKey.trim() === '') {
    return;
  }

  await getLocalDatasetSnapshotsDatabase().localSnapshots.where('resourceKey').equals(resourceKey).delete();
}

export async function migrateLocalDatasetSnapshotsResourceKey(
  fromResourceKey: string,
  toResourceKey: string
): Promise<void> {
  if (!isIndexedDbAvailable() || fromResourceKey.trim() === '' || toResourceKey.trim() === '') {
    return;
  }

  const database = getLocalDatasetSnapshotsDatabase();
  const snapshots = await database.localSnapshots.where('resourceKey').equals(fromResourceKey).toArray();

  await database.transaction('rw', database.localSnapshots, async () => {
    for (const snapshot of snapshots) {
      if (typeof snapshot.id !== 'number') {
        continue;
      }

      await database.localSnapshots.put({
        ...snapshot,
        resourceKey: toResourceKey,
        draft: {
          ...snapshot.draft,
          resourceKey: toResourceKey,
        },
      });
    }
  });
}

export async function deleteLocalDatasetSnapshotsDatabase(): Promise<void> {
  if (localDatasetSnapshotsDatabase) {
    localDatasetSnapshotsDatabase.close();
    localDatasetSnapshotsDatabase = null;
  }

  await Dexie.delete(LOCAL_DATASET_SNAPSHOTS_DB_NAME);
}
