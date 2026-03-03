import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { t } from '@lingui/core/macro';
import type { AdvancedMapAnalyticsMapDetail } from '@/features/advanced-map-analytics/api/schemas';
import { getLatestLocalMapSnapshot } from '@/features/advanced-map-analytics/local-snapshots/local-map-snapshots-db';
import { createComparableMapEditorHash } from '@/features/advanced-map-analytics/local-snapshots/map-editor-dirty-state';
import { hasMapEditorSearchParams } from '@/features/advanced-map-analytics/map-editor-search';
import type { AdvancedMapAnalyticsUrlState } from '@/schemas/advanced-map-analytics';

interface UseMapEditorInitialStateInput {
  mapId: string;
  mapQueryData: AdvancedMapAnalyticsMapDetail | undefined;
  isLoaded: boolean;
  isSignedIn: boolean;
  setMapState: (
    updater:
      | AdvancedMapAnalyticsUrlState
      | ((prev: AdvancedMapAnalyticsUrlState) => AdvancedMapAnalyticsUrlState)
  ) => void;
  setBaselineFromHash: (hash: string) => void;
  setMapDescriptionDraft: (value: string) => void;
  setIsInitialStateResolved: (value: boolean) => void;
}

function toTimestampMs(value: string | null | undefined): number {
  if (typeof value !== 'string') {
    return Number.NaN;
  }

  return new Date(value).getTime();
}

export function useMapEditorInitialState({
  mapId,
  mapQueryData,
  isLoaded,
  isSignedIn,
  setMapState,
  setBaselineFromHash,
  setMapDescriptionDraft,
  setIsInitialStateResolved,
}: Readonly<UseMapEditorInitialStateInput>): void {
  const hasResolvedInitialStateRef = useRef(false);

  useEffect(() => {
    hasResolvedInitialStateRef.current = false;
    setIsInitialStateResolved(false);
    setMapDescriptionDraft('');
  }, [mapId, setIsInitialStateResolved, setMapDescriptionDraft]);

  useEffect(() => {
    if (
      !mapQueryData ||
      !isLoaded ||
      !isSignedIn ||
      hasResolvedInitialStateRef.current
    ) {
      return;
    }

    let isCancelled = false;

    const resolveInitialState = async () => {
      const serverSnapshotState = mapQueryData.lastSnapshot.config;
      const serverDescription = mapQueryData.description ?? '';
      const serverBaselineHash = createComparableMapEditorHash(
        serverSnapshotState,
        serverDescription
      );
      setBaselineFromHash(serverBaselineHash);

      const hasUrlEditorState = hasMapEditorSearchParams(
        typeof window === 'undefined' ? '' : window.location.search
      );
      let resolvedMapState = serverSnapshotState;
      let resolvedDescription = serverDescription;

      if (!hasUrlEditorState) {
        try {
          const latestLocalSnapshot = await getLatestLocalMapSnapshot(mapId);
          if (latestLocalSnapshot) {
            const latestLocalSnapshotUpdatedAtMs = toTimestampMs(latestLocalSnapshot.updatedAt);
            const serverSnapshotCreatedAtMs = toTimestampMs(
              mapQueryData.lastSnapshot.createdAt
            );
            const isLocalSnapshotNewerThanServerSnapshot =
              Number.isFinite(latestLocalSnapshotUpdatedAtMs) &&
              (!Number.isFinite(serverSnapshotCreatedAtMs) ||
                latestLocalSnapshotUpdatedAtMs > serverSnapshotCreatedAtMs);

            if (isLocalSnapshotNewerThanServerSnapshot) {
              resolvedMapState = latestLocalSnapshot.mapState;
              resolvedDescription = latestLocalSnapshot.mapDescription;
            }
          }
        } catch {
          toast.error(t`Failed to load local snapshots`);
        }
      }

      if (isCancelled) {
        return;
      }

      if (!hasUrlEditorState) {
        setMapState(resolvedMapState);
      }
      setMapDescriptionDraft(resolvedDescription);
      hasResolvedInitialStateRef.current = true;
      setIsInitialStateResolved(true);
    };

    void resolveInitialState();

    return () => {
      isCancelled = true;
    };
  }, [isLoaded, isSignedIn, mapId, mapQueryData, setBaselineFromHash, setMapState, setMapDescriptionDraft, setIsInitialStateResolved]);
}
