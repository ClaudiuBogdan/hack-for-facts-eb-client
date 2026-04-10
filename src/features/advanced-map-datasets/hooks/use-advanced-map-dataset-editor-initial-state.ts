import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { t } from '@lingui/core/macro';
import { getLatestLocalDatasetSnapshot } from '@/features/advanced-map-datasets/local-snapshots/local-dataset-snapshots-db';
import { createComparableAdvancedMapDatasetDraftHash } from '@/features/advanced-map-datasets/utils/draft';
import type { AdvancedMapDatasetDetail } from '@/features/advanced-map-datasets/api/schemas';
import {
  hasAdvancedMapDatasetPayloadDraftData,
  mapDatasetDetailToDraft,
  type AdvancedMapDatasetDraft,
  type AdvancedMapDatasetReferenceRow,
} from '@/features/advanced-map-datasets/types';

interface UseAdvancedMapDatasetEditorInitialStateInput {
  resourceKey: string;
  datasetQueryData: AdvancedMapDatasetDetail | undefined;
  referenceRows: AdvancedMapDatasetReferenceRow[];
  isDatasetQueryFetching: boolean;
  draft: AdvancedMapDatasetDraft;
  draftUpdatedAt: string | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  setDraft: (draft: AdvancedMapDatasetDraft) => void;
  setBaselineFromHash: (hash: string) => void;
  setIsInitialStateResolved: (value: boolean) => void;
}

function toTimestampMs(value: string | null | undefined): number {
  if (typeof value !== 'string') {
    return Number.NaN;
  }

  return new Date(value).getTime();
}

function readDraftRowValueText(row: AdvancedMapDatasetDraft['rows'][number]): string {
  if (typeof row.valueNumber === 'string') {
    return row.valueNumber;
  }

  if (typeof row.rawValue === 'string') {
    return row.rawValue;
  }

  if (typeof row.valueText === 'string') {
    return row.valueText;
  }

  if (typeof row.value === 'string') {
    return row.value;
  }

  if (typeof row.value === 'number' && Number.isFinite(row.value)) {
    return String(row.value);
  }

  return '';
}

function isBootstrapDraftShell(
  draft: AdvancedMapDatasetDraft,
  datasetQueryData: AdvancedMapDatasetDetail
): boolean {
  if (draft.datasetId === datasetQueryData.id) {
    return false;
  }

  if (datasetQueryData.publicId !== null && draft.publicId === datasetQueryData.publicId) {
    return false;
  }

  const hasMetadata =
    draft.title.trim() !== '' ||
    draft.description.trim() !== '' ||
    draft.markdown.trim() !== '' ||
    draft.unit.trim() !== '' ||
    draft.visibility !== 'private';
  const hasRowValues = draft.rows.some(
    (row) => readDraftRowValueText(row).trim() !== '' || row.valueJson !== null || hasAdvancedMapDatasetPayloadDraftData(row.payloadDraft)
  );

  return !hasMetadata && !hasRowValues;
}

export function useAdvancedMapDatasetEditorInitialState({
  resourceKey,
  datasetQueryData,
  referenceRows,
  isDatasetQueryFetching,
  draft,
  draftUpdatedAt,
  isLoaded,
  isSignedIn,
  setDraft,
  setBaselineFromHash,
  setIsInitialStateResolved,
}: Readonly<UseAdvancedMapDatasetEditorInitialStateInput>): void {
  const hasResolvedInitialStateRef = useRef(false);

  useEffect(() => {
    hasResolvedInitialStateRef.current = false;
    setIsInitialStateResolved(false);
  }, [resourceKey, setIsInitialStateResolved]);

  useEffect(() => {
    if (
      !datasetQueryData ||
      referenceRows.length === 0 ||
      isDatasetQueryFetching ||
      !isLoaded ||
      !isSignedIn ||
      hasResolvedInitialStateRef.current
    ) {
      return;
    }

    let isCancelled = false;

    const resolveInitialState = async () => {
      const serverUpdatedAtMs = toTimestampMs(datasetQueryData.updatedAt);
      const referenceRowsBySirutaCode = new Map(
        referenceRows.map((row) => [row.sirutaCode, row])
      );
      const serverDraft = mapDatasetDetailToDraft(
        resourceKey,
        datasetQueryData,
        referenceRowsBySirutaCode
      );
      setBaselineFromHash(createComparableAdvancedMapDatasetDraftHash(serverDraft));

      let resolvedDraft = draft;
      let newestDraftTimestampMs = Number.NaN;

      const draftBelongsToLoadedDataset =
        typeof draft.datasetId === 'string' &&
        draft.datasetId === datasetQueryData.id;
      const draftUpdatedAtMs = toTimestampMs(draftUpdatedAt);
      if (draftBelongsToLoadedDataset && Number.isFinite(draftUpdatedAtMs)) {
        newestDraftTimestampMs = draftUpdatedAtMs;
      } else {
        resolvedDraft = serverDraft;
      }

      try {
        const latestLocalSnapshot = await getLatestLocalDatasetSnapshot(resourceKey);
        if (latestLocalSnapshot && !isBootstrapDraftShell(latestLocalSnapshot.draft, datasetQueryData)) {
          const latestLocalSnapshotUpdatedAtMs = toTimestampMs(latestLocalSnapshot.updatedAt);
          const shouldUseLocalSnapshot =
            Number.isFinite(latestLocalSnapshotUpdatedAtMs) &&
            (!Number.isFinite(newestDraftTimestampMs) || latestLocalSnapshotUpdatedAtMs > newestDraftTimestampMs);

          if (shouldUseLocalSnapshot) {
            newestDraftTimestampMs = latestLocalSnapshotUpdatedAtMs;
            resolvedDraft = latestLocalSnapshot.draft;
          }
        }
      } catch {
        toast.error(t`Failed to load local snapshots`);
      }

      const shouldUseServerState =
        !Number.isFinite(newestDraftTimestampMs) ||
        (Number.isFinite(serverUpdatedAtMs) && newestDraftTimestampMs <= serverUpdatedAtMs);

      if (shouldUseServerState) {
        resolvedDraft = serverDraft;
      }

      if (isCancelled) {
        return;
      }

      setDraft(resolvedDraft);
      hasResolvedInitialStateRef.current = true;
      setIsInitialStateResolved(true);
    };

    void resolveInitialState();

    return () => {
      isCancelled = true;
    };
  }, [
    datasetQueryData,
    referenceRows,
    draft,
    draftUpdatedAt,
    isDatasetQueryFetching,
    isLoaded,
    isSignedIn,
    resourceKey,
    setBaselineFromHash,
    setDraft,
    setIsInitialStateResolved,
  ]);
}
