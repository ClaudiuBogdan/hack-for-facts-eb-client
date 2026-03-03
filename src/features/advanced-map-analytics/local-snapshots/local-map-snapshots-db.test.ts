import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdvancedMapAnalyticsUrlStateSchema } from '@/schemas/advanced-map-analytics';
import {
  clearLocalMapSnapshots,
  createLocalMapSnapshot,
  deleteLocalMapSnapshot,
  deleteLocalMapSnapshotsDatabase,
  getLatestLocalMapSnapshot,
  listLocalMapSnapshots,
  MAX_LOCAL_MAP_SNAPSHOTS_PER_MAP,
  updateLocalMapSnapshot,
} from './local-map-snapshots-db';

describe('local-map-snapshots-db', () => {
  beforeEach(async () => {
    await deleteLocalMapSnapshotsDatabase();
    vi.useFakeTimers({ toFake: ['Date'] });
  });

  afterEach(async () => {
    vi.useRealTimers();
    await deleteLocalMapSnapshotsDatabase();
  });

  it('creates and lists snapshots sorted by latest update', async () => {
    vi.setSystemTime(new Date('2026-03-03T10:00:00.000Z'));
    await createLocalMapSnapshot({
      mapId: 'map_1',
      source: 'auto',
      description: null,
      stateAtSave: 'private',
      mapState: AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Version one' }),
      mapDescription: '',
      comparableHash: 'hash_1',
    });

    vi.setSystemTime(new Date('2026-03-03T10:00:05.000Z'));
    await createLocalMapSnapshot({
      mapId: 'map_1',
      source: 'manual',
      description: 'checkpoint',
      stateAtSave: 'public',
      mapState: AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Version two' }),
      mapDescription: 'desc',
      comparableHash: 'hash_2',
    });

    const snapshots = await listLocalMapSnapshots('map_1');
    expect(snapshots).toHaveLength(2);
    expect(snapshots[0].mapState.mapName).toBe('Version two');
    expect(snapshots[1].mapState.mapName).toBe('Version one');
  });

  it('updates existing snapshots', async () => {
    vi.setSystemTime(new Date('2026-03-03T11:00:00.000Z'));
    const createdSnapshot = await createLocalMapSnapshot({
      mapId: 'map_1',
      source: 'auto',
      description: null,
      stateAtSave: 'private',
      mapState: AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Before update' }),
      mapDescription: '',
      comparableHash: 'hash_1',
    });

    expect(createdSnapshot?.id).toBeDefined();

    vi.setSystemTime(new Date('2026-03-03T11:00:20.000Z'));
    const updatedSnapshot = await updateLocalMapSnapshot(createdSnapshot?.id as number, {
      description: 'updated',
      stateAtSave: 'public',
      mapState: AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'After update' }),
      mapDescription: 'desc',
      comparableHash: 'hash_2',
    });

    expect(updatedSnapshot?.description).toBe('updated');
    expect(updatedSnapshot?.mapState.mapName).toBe('After update');
    expect(updatedSnapshot?.stateAtSave).toBe('public');
  });

  it('returns the most recently updated local snapshot', async () => {
    vi.setSystemTime(new Date('2026-03-03T11:00:00.000Z'));
    await createLocalMapSnapshot({
      mapId: 'map_1',
      source: 'auto',
      description: null,
      stateAtSave: 'private',
      mapState: AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Before update' }),
      mapDescription: '',
      comparableHash: 'hash_1',
    });

    vi.setSystemTime(new Date('2026-03-03T11:01:00.000Z'));
    const secondSnapshot = await createLocalMapSnapshot({
      mapId: 'map_1',
      source: 'manual',
      description: 'latest',
      stateAtSave: 'private',
      mapState: AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Latest snapshot' }),
      mapDescription: '',
      comparableHash: 'hash_2',
    });

    vi.setSystemTime(new Date('2026-03-03T11:02:00.000Z'));
    await updateLocalMapSnapshot(secondSnapshot?.id as number, {
      description: 'latest updated',
      stateAtSave: 'private',
      mapState: AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Latest snapshot updated' }),
      mapDescription: '',
      comparableHash: 'hash_3',
    });

    const latestSnapshot = await getLatestLocalMapSnapshot('map_1');
    expect(latestSnapshot?.mapState.mapName).toBe('Latest snapshot updated');
  });

  it('prunes snapshots over retention limit', async () => {
    for (let index = 0; index < MAX_LOCAL_MAP_SNAPSHOTS_PER_MAP + 5; index += 1) {
      vi.setSystemTime(new Date(`2026-03-03T12:${String(index).padStart(2, '0')}:00.000Z`));
      await createLocalMapSnapshot({
        mapId: 'map_1',
        source: 'auto',
        description: null,
        stateAtSave: 'private',
        mapState: AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: `Version ${index}` }),
        mapDescription: '',
        comparableHash: `hash_${index}`,
      });
    }

    const snapshots = await listLocalMapSnapshots('map_1');
    expect(snapshots).toHaveLength(MAX_LOCAL_MAP_SNAPSHOTS_PER_MAP);
    expect(snapshots[0].mapState.mapName).toBe('Version 54');
    expect(snapshots[snapshots.length - 1].mapState.mapName).toBe('Version 5');
  });

  it('deletes single and all snapshots', async () => {
    const firstSnapshot = await createLocalMapSnapshot({
      mapId: 'map_1',
      source: 'manual',
      description: null,
      stateAtSave: 'private',
      mapState: AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Version one' }),
      mapDescription: '',
      comparableHash: 'hash_1',
    });
    await createLocalMapSnapshot({
      mapId: 'map_1',
      source: 'manual',
      description: null,
      stateAtSave: 'private',
      mapState: AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Version two' }),
      mapDescription: '',
      comparableHash: 'hash_2',
    });

    await deleteLocalMapSnapshot(firstSnapshot?.id as number);
    expect(await listLocalMapSnapshots('map_1')).toHaveLength(1);

    await clearLocalMapSnapshots('map_1');
    expect(await listLocalMapSnapshots('map_1')).toHaveLength(0);
  });
});
