import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearLocalDatasetSnapshots,
  createLocalDatasetSnapshot,
  deleteLocalDatasetSnapshot,
  deleteLocalDatasetSnapshotsDatabase,
  getLatestLocalDatasetSnapshot,
  listLocalDatasetSnapshots,
  MAX_LOCAL_DATASET_SNAPSHOTS_PER_RESOURCE,
  migrateLocalDatasetSnapshotsResourceKey,
  updateLocalDatasetSnapshot,
} from './local-dataset-snapshots-db';
import {
  createEmptyAdvancedMapDatasetDraft,
  type AdvancedMapDatasetReferenceRow,
} from '@/features/advanced-map-datasets/types';

const referenceRows: AdvancedMapDatasetReferenceRow[] = [
  {
    uatId: 'uat-1',
    cui: '123',
    sirutaCode: '1001',
    name: 'Alpha',
    countyName: 'CJ',
    countyCode: 'CJ',
    isCounty: false,
  },
];

describe('local-dataset-snapshots-db', () => {
  beforeEach(async () => {
    await deleteLocalDatasetSnapshotsDatabase();
    vi.useFakeTimers({ toFake: ['Date'] });
  });

  afterEach(async () => {
    vi.useRealTimers();
    await deleteLocalDatasetSnapshotsDatabase();
  });

  function createDraft(title: string) {
    const draft = createEmptyAdvancedMapDatasetDraft('resource-1', referenceRows);
    draft.title = title;
    draft.metadata.title = title;
    draft.unit = 'RON';
    draft.metadata.unit = 'RON';
    return draft;
  }

  it('creates, lists, and updates snapshots', async () => {
    vi.setSystemTime(new Date('2026-04-09T10:00:00.000Z'));
    const created = await createLocalDatasetSnapshot({
      resourceKey: 'resource-1',
      source: 'auto',
      description: null,
      draft: createDraft('One'),
      comparableHash: 'hash-1',
    });

    vi.setSystemTime(new Date('2026-04-09T10:00:05.000Z'));
    await createLocalDatasetSnapshot({
      resourceKey: 'resource-1',
      source: 'manual',
      description: 'checkpoint',
      draft: createDraft('Two'),
      comparableHash: 'hash-2',
    });

    const snapshots = await listLocalDatasetSnapshots('resource-1');
    expect(snapshots).toHaveLength(2);
    expect(snapshots[0].draft.metadata.title).toBe('Two');

    vi.setSystemTime(new Date('2026-04-09T10:00:10.000Z'));
    const updated = await updateLocalDatasetSnapshot(created?.id as number, {
      description: 'updated',
      draft: createDraft('One updated'),
      comparableHash: 'hash-3',
    });

    expect(updated?.description).toBe('updated');
    expect((await getLatestLocalDatasetSnapshot('resource-1'))?.draft.metadata.title).toBe(
      'One updated'
    );
  });

  it('migrates a snapshot bucket to a new resource key', async () => {
    await createLocalDatasetSnapshot({
      resourceKey: 'resource-a',
      source: 'manual',
      description: null,
      draft: createDraft('Migrated'),
      comparableHash: 'hash-1',
    });

    await migrateLocalDatasetSnapshotsResourceKey('resource-a', 'resource-b');

    expect(await listLocalDatasetSnapshots('resource-a')).toHaveLength(0);
    expect(await listLocalDatasetSnapshots('resource-b')).toHaveLength(1);
  });

  it('prunes snapshots over the retention limit', async () => {
    for (let index = 0; index < MAX_LOCAL_DATASET_SNAPSHOTS_PER_RESOURCE + 3; index += 1) {
      vi.setSystemTime(new Date(`2026-04-09T12:${String(index).padStart(2, '0')}:00.000Z`));
      await createLocalDatasetSnapshot({
        resourceKey: 'resource-1',
        source: 'auto',
        description: null,
        draft: createDraft(`Version ${index}`),
        comparableHash: `hash-${index}`,
      });
    }

    expect(await listLocalDatasetSnapshots('resource-1')).toHaveLength(
      MAX_LOCAL_DATASET_SNAPSHOTS_PER_RESOURCE
    );
  });

  it('deletes and clears snapshots', async () => {
    const created = await createLocalDatasetSnapshot({
      resourceKey: 'resource-1',
      source: 'manual',
      description: null,
      draft: createDraft('One'),
      comparableHash: 'hash-1',
    });
    await createLocalDatasetSnapshot({
      resourceKey: 'resource-1',
      source: 'manual',
      description: null,
      draft: createDraft('Two'),
      comparableHash: 'hash-2',
    });

    await deleteLocalDatasetSnapshot(created?.id as number);
    expect(await listLocalDatasetSnapshots('resource-1')).toHaveLength(1);

    await clearLocalDatasetSnapshots('resource-1');
    expect(await listLocalDatasetSnapshots('resource-1')).toHaveLength(0);
  });
});
