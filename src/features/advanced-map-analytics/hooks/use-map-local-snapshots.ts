import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { t } from '@lingui/core/macro';
import type { AdvancedMapAnalyticsVisibility } from '@/features/advanced-map-analytics/api/schemas';
import {
  clearLocalMapSnapshots,
  createLocalMapSnapshot,
  deleteLocalMapSnapshot,
  getLocalMapSnapshot,
  listLocalMapSnapshots,
  updateLocalMapSnapshot,
  type LocalMapSnapshotRecord,
} from '@/features/advanced-map-analytics/local-snapshots/local-map-snapshots-db';
import { createComparableMapEditorHash } from '@/features/advanced-map-analytics/local-snapshots/map-editor-dirty-state';
import { useDebouncedCallback } from '@/lib/hooks/useDebouncedCallback';
import type { AdvancedMapAnalyticsUrlState } from '@/schemas/advanced-map-analytics';

const LOCAL_AUTOSAVE_DEBOUNCE_MS = 2_000;
const AUTO_SNAPSHOT_COALESCE_WINDOW_MS = 5 * 60_000;

interface UseMapLocalSnapshotsParams {
  mapId: string;
  mapState: AdvancedMapAnalyticsUrlState;
  mapDescription: string;
  currentVisibility: AdvancedMapAnalyticsVisibility;
  enabled?: boolean;
  isBaselineReady?: boolean;
}

interface CreateManualSnapshotInput {
  description: string | null;
  stateAtSave: AdvancedMapAnalyticsVisibility;
}

interface UseMapLocalSnapshotsResult {
  snapshots: LocalMapSnapshotRecord[];
  isLoading: boolean;
  isDirty: boolean;
  lastAutosavedAt: string | null;
  requestAutosave: () => void;
  createManualSnapshot: (input: CreateManualSnapshotInput) => Promise<void>;
  restoreSnapshot: (snapshotId: number) => Promise<LocalMapSnapshotRecord | null>;
  deleteSnapshot: (snapshotId: number) => Promise<void>;
  clearSnapshots: () => Promise<void>;
  markCurrentAsSaved: () => void;
  setBaselineFromHash: (hash: string) => void;
}

export function useMapLocalSnapshots({
  mapId,
  mapState,
  mapDescription,
  currentVisibility,
  enabled = true,
  isBaselineReady = true,
}: Readonly<UseMapLocalSnapshotsParams>): UseMapLocalSnapshotsResult {
  const [snapshots, setSnapshots] = useState<LocalMapSnapshotRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastAutosavedAt, setLastAutosavedAt] = useState<string | null>(null);
  const comparableHash = useMemo(
    () => createComparableMapEditorHash(mapState, mapDescription),
    [mapDescription, mapState]
  );
  const [baselineComparableHash, setBaselineComparableHash] = useState(comparableHash);
  const isDirty = isBaselineReady && baselineComparableHash !== comparableHash;
  const autosaveWriteInFlightRef = useRef(false);

  useEffect(() => {
    setBaselineComparableHash(comparableHash);
    setLastAutosavedAt(null);
  }, [mapId]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshSnapshots = useCallback(async () => {
    if (!enabled || mapId.trim().length === 0) {
      setSnapshots([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const nextSnapshots = await listLocalMapSnapshots(mapId);
      setSnapshots(nextSnapshots);
    } catch {
      setSnapshots([]);
      toast.error(t`Failed to load local snapshots`);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, mapId]);

  useEffect(() => {
    void refreshSnapshots();
  }, [refreshSnapshots]);

  const writeAutosaveSnapshot = useCallback(async () => {
    if (
      !enabled ||
      !isBaselineReady ||
      !isDirty ||
      mapId.trim().length === 0 ||
      autosaveWriteInFlightRef.current
    ) {
      return;
    }

    autosaveWriteInFlightRef.current = true;

    try {
      const latestSnapshots = await listLocalMapSnapshots(mapId);
      const latestSnapshot = latestSnapshots[0];

      if (latestSnapshot?.comparableHash === comparableHash) {
        return;
      }

      const nowTimestampMs = Date.now();
      const latestSnapshotUpdatedAtMs =
        latestSnapshot ? new Date(latestSnapshot.updatedAt).getTime() : 0;
      const canCoalesceAutoSnapshot =
        latestSnapshot?.source === 'auto' &&
        nowTimestampMs - latestSnapshotUpdatedAtMs <= AUTO_SNAPSHOT_COALESCE_WINDOW_MS &&
        typeof latestSnapshot.id === 'number';

      if (canCoalesceAutoSnapshot && latestSnapshot.id !== undefined) {
        await updateLocalMapSnapshot(latestSnapshot.id, {
          description: null,
          stateAtSave: currentVisibility,
          mapState,
          mapDescription,
          comparableHash,
        });
      } else {
        await createLocalMapSnapshot({
          mapId,
          source: 'auto',
          description: null,
          stateAtSave: currentVisibility,
          mapState,
          mapDescription,
          comparableHash,
        });
      }

      setLastAutosavedAt(new Date(nowTimestampMs).toISOString());
      const nextSnapshots = await listLocalMapSnapshots(mapId);
      setSnapshots(nextSnapshots);
    } catch {
      toast.error(t`Failed to autosave local snapshot`);
    } finally {
      autosaveWriteInFlightRef.current = false;
    }
  }, [
    comparableHash,
    currentVisibility,
    enabled,
    isBaselineReady,
    isDirty,
    mapDescription,
    mapId,
    mapState,
  ]);

  const debouncedAutosave = useDebouncedCallback(() => {
    void writeAutosaveSnapshot();
  }, LOCAL_AUTOSAVE_DEBOUNCE_MS);

  const requestAutosave = useCallback(() => {
    if (!isBaselineReady) {
      return;
    }

    debouncedAutosave();
  }, [debouncedAutosave, isBaselineReady]);

  useEffect(() => {
    if (!enabled || !isBaselineReady || mapId.trim().length === 0) {
      return;
    }

    requestAutosave();
  }, [comparableHash, enabled, isBaselineReady, mapDescription, mapId, requestAutosave]);

  const createManualSnapshot = useCallback(
    async (input: CreateManualSnapshotInput) => {
      if (!enabled || mapId.trim().length === 0) {
        return;
      }

      try {
        await createLocalMapSnapshot({
          mapId,
          source: 'manual',
          description: input.description,
          stateAtSave: input.stateAtSave,
          mapState,
          mapDescription,
          comparableHash,
        });
        await refreshSnapshots();
      } catch {
        toast.error(t`Failed to save local snapshot`);
      }
    },
    [comparableHash, enabled, mapDescription, mapId, mapState, refreshSnapshots]
  );

  const restoreSnapshot = useCallback(
    async (snapshotId: number): Promise<LocalMapSnapshotRecord | null> => {
      if (!enabled || mapId.trim().length === 0) {
        return null;
      }

      try {
        const snapshot = await getLocalMapSnapshot(snapshotId);
        if (!snapshot || snapshot.mapId !== mapId) {
          return null;
        }

        return snapshot;
      } catch {
        toast.error(t`Failed to restore local snapshot`);
        return null;
      }
    },
    [enabled, mapId]
  );

  const removeSnapshot = useCallback(
    async (snapshotId: number) => {
      try {
        await deleteLocalMapSnapshot(snapshotId);
        await refreshSnapshots();
      } catch {
        toast.error(t`Failed to delete local snapshot`);
      }
    },
    [refreshSnapshots]
  );

  const clearSnapshots = useCallback(async () => {
    if (mapId.trim().length === 0) {
      return;
    }

    try {
      await clearLocalMapSnapshots(mapId);
      await refreshSnapshots();
    } catch {
      toast.error(t`Failed to clear local snapshots`);
    }
  }, [mapId, refreshSnapshots]);

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
    requestAutosave,
    createManualSnapshot,
    restoreSnapshot,
    deleteSnapshot: removeSnapshot,
    clearSnapshots,
    markCurrentAsSaved,
    setBaselineFromHash,
  };
}
