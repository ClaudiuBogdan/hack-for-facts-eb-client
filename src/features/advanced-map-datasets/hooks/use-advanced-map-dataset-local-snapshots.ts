import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { t } from '@lingui/core/macro';
import {
  clearLocalDatasetSnapshots,
  createLocalDatasetSnapshot,
  deleteLocalDatasetSnapshot,
  getLocalDatasetSnapshot,
  listLocalDatasetSnapshots,
  updateLocalDatasetSnapshot,
  type LocalDatasetSnapshotRecord,
} from '@/features/advanced-map-datasets/local-snapshots/local-dataset-snapshots-db';
import { createComparableAdvancedMapDatasetDraftHash } from '@/features/advanced-map-datasets/utils/draft';
import { useDebouncedCallback } from '@/lib/hooks/useDebouncedCallback';
import {
  toSerializableAdvancedMapDatasetDraft,
  type AdvancedMapDatasetDraft,
} from '@/features/advanced-map-datasets/types';

const LOCAL_AUTOSAVE_DEBOUNCE_MS = 2_000;
const AUTO_SNAPSHOT_COALESCE_WINDOW_MS = 5 * 60_000;

interface UseAdvancedMapDatasetLocalSnapshotsParams {
  resourceKey: string;
  draft: AdvancedMapDatasetDraft;
  enabled?: boolean;
  isBaselineReady?: boolean;
}

interface CreateManualSnapshotInput {
  description: string | null;
}

export function useAdvancedMapDatasetLocalSnapshots({
  resourceKey,
  draft,
  enabled = true,
  isBaselineReady = true,
}: Readonly<UseAdvancedMapDatasetLocalSnapshotsParams>) {
  const serializableDraft = useMemo(() => toSerializableAdvancedMapDatasetDraft(draft), [draft]);
  const [snapshots, setSnapshots] = useState<LocalDatasetSnapshotRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastAutosavedAt, setLastAutosavedAt] = useState<string | null>(null);
  const comparableHash = useMemo(
    () => createComparableAdvancedMapDatasetDraftHash(serializableDraft),
    [serializableDraft]
  );
  const [baselineComparableHash, setBaselineComparableHash] = useState(comparableHash);
  const isDirty = isBaselineReady && baselineComparableHash !== comparableHash;
  const autosaveWriteInFlightRef = useRef(false);

  useEffect(() => {
    setBaselineComparableHash(comparableHash);
    setLastAutosavedAt(null);
  }, [resourceKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshSnapshots = useCallback(async () => {
    if (!enabled || resourceKey.trim() === '') {
      setSnapshots([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      setSnapshots(await listLocalDatasetSnapshots(resourceKey));
    } catch {
      setSnapshots([]);
      toast.error(t`Failed to load local snapshots`);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, resourceKey]);

  useEffect(() => {
    void refreshSnapshots();
  }, [refreshSnapshots]);

  const writeAutosaveSnapshot = useCallback(async () => {
    if (!enabled || !isBaselineReady || !isDirty || resourceKey.trim() === '' || autosaveWriteInFlightRef.current) {
      return;
    }

    autosaveWriteInFlightRef.current = true;

    try {
      const latestSnapshots = await listLocalDatasetSnapshots(resourceKey);
      const latestSnapshot = latestSnapshots[0];

      if (latestSnapshot?.comparableHash === comparableHash) {
        return;
      }

      const nowTimestampMs = Date.now();
      const latestSnapshotUpdatedAtMs = latestSnapshot ? new Date(latestSnapshot.updatedAt).getTime() : 0;
      const canCoalesceAutoSnapshot =
        latestSnapshot?.source === 'auto' &&
        nowTimestampMs - latestSnapshotUpdatedAtMs <= AUTO_SNAPSHOT_COALESCE_WINDOW_MS &&
        typeof latestSnapshot.id === 'number';

      if (canCoalesceAutoSnapshot) {
        const updatedSnapshot = await updateLocalDatasetSnapshot(latestSnapshot.id!, {
          description: null,
          draft: serializableDraft,
          comparableHash,
        });
        if (updatedSnapshot === null) {
          throw new Error('Local snapshots are unavailable');
        }
      } else {
        const createdSnapshot = await createLocalDatasetSnapshot({
          resourceKey,
          source: 'auto',
          description: null,
          draft: serializableDraft,
          comparableHash,
        });
        if (createdSnapshot === null) {
          throw new Error('Local snapshots are unavailable');
        }
      }

      setLastAutosavedAt(new Date(nowTimestampMs).toISOString());
      setSnapshots(await listLocalDatasetSnapshots(resourceKey));
    } catch {
      toast.error(t`Failed to autosave local snapshot`);
    } finally {
      autosaveWriteInFlightRef.current = false;
    }
  }, [comparableHash, enabled, isBaselineReady, isDirty, resourceKey, serializableDraft]);

  const debouncedAutosave = useDebouncedCallback(() => {
    void writeAutosaveSnapshot();
  }, LOCAL_AUTOSAVE_DEBOUNCE_MS);

  useEffect(() => {
    if (!enabled || !isBaselineReady || resourceKey.trim() === '') {
      return;
    }

    debouncedAutosave();
  }, [comparableHash, debouncedAutosave, enabled, isBaselineReady, resourceKey]);

  const createManualSnapshot = useCallback(
    async (input: CreateManualSnapshotInput): Promise<boolean> => {
      if (!enabled || resourceKey.trim() === '') {
        return false;
      }

      try {
        const createdSnapshot = await createLocalDatasetSnapshot({
          resourceKey,
          source: 'manual',
          description: input.description,
          draft: serializableDraft,
          comparableHash,
        });
        if (createdSnapshot === null) {
          throw new Error('Local snapshots are unavailable');
        }
        await refreshSnapshots();
        return true;
      } catch {
        toast.error(t`Failed to save local snapshot`);
        return false;
      }
    },
    [comparableHash, enabled, refreshSnapshots, resourceKey, serializableDraft]
  );

  const restoreSnapshot = useCallback(
    async (snapshotId: number): Promise<LocalDatasetSnapshotRecord | null> => {
      if (!enabled || resourceKey.trim() === '') {
        return null;
      }

      try {
        const snapshot = await getLocalDatasetSnapshot(snapshotId);
        if (!snapshot || snapshot.resourceKey !== resourceKey) {
          return null;
        }

        return snapshot;
      } catch {
        toast.error(t`Failed to restore local snapshot`);
        return null;
      }
    },
    [enabled, resourceKey]
  );

  const deleteSnapshot = useCallback(
    async (snapshotId: number) => {
      try {
        await deleteLocalDatasetSnapshot(snapshotId);
        await refreshSnapshots();
      } catch {
        toast.error(t`Failed to delete local snapshot`);
      }
    },
    [refreshSnapshots]
  );

  const clearSnapshots = useCallback(async () => {
    if (resourceKey.trim() === '') {
      return;
    }

    try {
      await clearLocalDatasetSnapshots(resourceKey);
      await refreshSnapshots();
    } catch {
      toast.error(t`Failed to clear local snapshots`);
    }
  }, [refreshSnapshots, resourceKey]);

  const markCurrentAsSaved = useCallback(() => {
    setBaselineComparableHash(comparableHash);
  }, [comparableHash]);

  const setBaselineFromHash = useCallback((hash: string) => {
    setBaselineComparableHash(hash);
  }, []);

  return {
    snapshots,
    isLoading,
    isDirty,
    lastAutosavedAt,
    createManualSnapshot,
    restoreSnapshot,
    deleteSnapshot,
    clearSnapshots,
    markCurrentAsSaved,
    setBaselineFromHash,
  };
}
