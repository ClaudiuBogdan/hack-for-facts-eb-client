import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { t } from '@lingui/core/macro';
import type { AdvancedMapAnalyticsMapDetail } from '@/features/advanced-map-analytics/api/schemas';
import { getLatestLocalMapSnapshot } from '@/features/advanced-map-analytics/local-snapshots/local-map-snapshots-db';
import { createComparableMapEditorHash } from '@/features/advanced-map-analytics/local-snapshots/map-editor-dirty-state';
import type { AdvancedMapAnalyticsUrlState } from '@/schemas/advanced-map-analytics';

interface UseMapEditorInitialStateInput {
  mapId: string;
  mapQueryData: AdvancedMapAnalyticsMapDetail | undefined;
  isMapQueryFetching: boolean;
  draftMapState: AdvancedMapAnalyticsUrlState;
  draftMapDescription: string;
  draftUpdatedAt: string | null;
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
  isMapQueryFetching,
  draftMapState,
  draftMapDescription,
  draftUpdatedAt,
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
  }, [mapId, setIsInitialStateResolved]);

  useEffect(() => {
    if (
      !mapQueryData ||
      isMapQueryFetching ||
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
      const serverSnapshotCreatedAtMs = toTimestampMs(
        mapQueryData.lastSnapshot.createdAt
      );
      const serverBaselineHash = createComparableMapEditorHash(
        serverSnapshotState,
        serverDescription
      );
      setBaselineFromHash(serverBaselineHash);

      let resolvedMapState = serverSnapshotState;
      let resolvedDescription = serverDescription;
      let newestDraftTimestampMs = Number.NaN;

      const draftUpdatedAtMs = toTimestampMs(draftUpdatedAt);
      if (Number.isFinite(draftUpdatedAtMs)) {
        newestDraftTimestampMs = draftUpdatedAtMs;
        resolvedMapState = draftMapState;
        resolvedDescription = draftMapDescription;
      }

      try {
        const latestLocalSnapshot = await getLatestLocalMapSnapshot(mapId);
        if (latestLocalSnapshot) {
          const latestLocalSnapshotUpdatedAtMs = toTimestampMs(latestLocalSnapshot.updatedAt);
          const shouldUseLocalSnapshot =
            Number.isFinite(latestLocalSnapshotUpdatedAtMs) &&
            (!Number.isFinite(newestDraftTimestampMs) ||
              latestLocalSnapshotUpdatedAtMs > newestDraftTimestampMs);

          if (shouldUseLocalSnapshot) {
            newestDraftTimestampMs = latestLocalSnapshotUpdatedAtMs;
            resolvedMapState = latestLocalSnapshot.mapState;
            resolvedDescription = latestLocalSnapshot.mapDescription;
          }
        }
      } catch {
        toast.error(t`Failed to load local snapshots`);
      }

      const shouldUseServerSnapshot =
        !Number.isFinite(newestDraftTimestampMs) ||
        (Number.isFinite(serverSnapshotCreatedAtMs) &&
          newestDraftTimestampMs <= serverSnapshotCreatedAtMs);

      if (shouldUseServerSnapshot) {
        resolvedMapState = serverSnapshotState;
        resolvedDescription = serverDescription;
      }

      if (isCancelled) {
        return;
      }

      setMapState(resolvedMapState);
      if (isCancelled) {
        return;
      }
      setMapDescriptionDraft(resolvedDescription);
      hasResolvedInitialStateRef.current = true;
      setIsInitialStateResolved(true);
    };

    void resolveInitialState();

    return () => {
      isCancelled = true;
    };
  }, [
    draftMapDescription,
    draftMapState,
    draftUpdatedAt,
    isMapQueryFetching,
    isLoaded,
    isSignedIn,
    mapId,
    mapQueryData,
    setBaselineFromHash,
    setMapState,
    setMapDescriptionDraft,
    setIsInitialStateResolved,
  ]);
}
