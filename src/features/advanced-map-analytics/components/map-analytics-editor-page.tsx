import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { UnsavedChangesDialog } from '@/components/alerts/components/UnsavedChangesDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AuthSignInButton, useAuth } from '@/lib/auth';
import { type AdvancedMapAnalyticsUrlState } from '@/schemas/advanced-map-analytics';
import { MapAnalyticsWorkspace } from '@/features/advanced-map-analytics/components/map-analytics-workspace';
import { MapAnalyticsOwnerConfigModal } from '@/features/advanced-map-analytics/components/map-analytics-owner-config-modal';
import { MapAnalyticsSaveSnapshotDialog } from '@/features/advanced-map-analytics/components/map-analytics-save-snapshot-dialog';
import { MapAnalyticsLocalSnapshotsModal } from '@/features/advanced-map-analytics/components/map-analytics-local-snapshots-modal';
import {
  useAdvancedMapAnalyticsMapQuery,
  useSaveAdvancedMapAnalyticsSnapshotMutation,
} from '@/features/advanced-map-analytics/hooks/use-advanced-map-analytics';
import type { AdvancedMapAnalyticsApiError } from '@/features/advanced-map-analytics/api/advanced-map-analytics-api';
import { useMapLocalSnapshots } from '@/features/advanced-map-analytics/hooks/use-map-local-snapshots';
import { useMapEditorInitialState } from '@/features/advanced-map-analytics/hooks/use-map-editor-initial-state';
import { useMapEditorDraftStore } from '@/features/advanced-map-analytics/store/map-editor-draft-store';
import type { ImportedMapConfig } from '@/features/advanced-map-analytics/store/map-config-transfer';
import { getRemoteGroupedSeriesHash } from '@/lib/map-series/grouped-series-request';
import { useUploadedMapDatasetPublicGuard } from '@/features/advanced-map-analytics/hooks/use-uploaded-map-dataset-public-guard';
import {
  readMapEditorViewportRestore,
  writeMapEditorViewportRestore,
} from '@/features/advanced-map-analytics/map-editor-viewport-restore';
import type { PublicMapViewport } from '@/features/advanced-map-analytics/hooks/use-public-map-viewport';
import { t } from '@lingui/core/macro';

interface MapAnalyticsEditorPageProps {
  mapId: string;
  mapState: AdvancedMapAnalyticsUrlState;
  setMapState: (
    updater:
      | AdvancedMapAnalyticsUrlState
      | ((previousState: AdvancedMapAnalyticsUrlState) => AdvancedMapAnalyticsUrlState)
  ) => void;
}

export function MapAnalyticsEditorPage({ mapId, mapState, setMapState }: Readonly<MapAnalyticsEditorPageProps>) {
  const { isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate({ from: '/maps/editor/$mapId' });
  const [isOwnerConfigModalOpen, setIsOwnerConfigModalOpen] = useState(false);
  const [ownerConfigDescriptionEditorOpen, setOwnerConfigDescriptionEditorOpen] = useState(false);
  const [isSaveSnapshotDialogOpen, setIsSaveSnapshotDialogOpen] = useState(false);
  const [isLocalSnapshotsModalOpen, setIsLocalSnapshotsModalOpen] = useState(false);
  const [isInitialStateResolved, setIsInitialStateResolved] = useState(false);
  const skipUnsavedChangesBlockerRef = useRef(false);
  const mapDescriptionDraft = useMapEditorDraftStore(mapId, (state) => state.mapDescription);
  const draftUpdatedAt = useMapEditorDraftStore(mapId, (state) => state.updatedAt);
  const setMapDescriptionDraft = useMapEditorDraftStore(mapId, (state) => state.updateMapDescription);

  const mapQuery = useAdvancedMapAnalyticsMapQuery(mapId, isLoaded && isSignedIn);
  const saveSnapshotMutation = useSaveAdvancedMapAnalyticsSnapshotMutation();
  const {
    blockingMessage: uploadedDatasetPublicBlockingMessage,
  } = useUploadedMapDatasetPublicGuard(mapState.series, isLoaded && isSignedIn);
  const {
    snapshots: localSnapshots,
    isLoading: isLocalSnapshotsLoading,
    isDirty,
    createManualSnapshot,
    restoreSnapshot,
    deleteSnapshot,
    clearSnapshots,
    markCurrentAsSaved,
    setBaselineFromHash,
  } = useMapLocalSnapshots({
    mapId,
    mapState,
    mapDescription: mapDescriptionDraft,
    currentVisibility: mapQuery.data?.state ?? 'private',
    enabled: isLoaded && isSignedIn && Boolean(mapQuery.data),
    isBaselineReady: isInitialStateResolved,
  });

  const blocker = useBlocker({
    shouldBlockFn: ({ current, next }) => {
      if (skipUnsavedChangesBlockerRef.current) {
        skipUnsavedChangesBlockerRef.current = false;
        return false;
      }

      return isDirty && next.pathname !== current.pathname;
    },
    withResolver: true,
    enableBeforeUnload: false,
  });

  useMapEditorInitialState({
    mapId,
    mapQueryData: mapQuery.data,
    isMapQueryFetching: mapQuery.isFetching,
    draftMapState: mapState,
    draftMapDescription: mapDescriptionDraft,
    draftUpdatedAt,
    isLoaded,
    isSignedIn,
    setMapState,
    setBaselineFromHash,
    setMapDescriptionDraft,
    setIsInitialStateResolved,
  });

  useEffect(() => {
    setIsSaveSnapshotDialogOpen(false);
    setIsLocalSnapshotsModalOpen(false);
  }, [mapId]);

  const viewportRestore = useMemo(() => readMapEditorViewportRestore(mapId), [mapId]);
  const handleMapViewportChange = useCallback(
    (nextViewport: PublicMapViewport) => {
      writeMapEditorViewportRestore(mapId, nextViewport);
    },
    [mapId]
  );

  const forbiddenError = useMemo(() => {
    if (!mapQuery.error) {
      return null;
    }

    const error = mapQuery.error as AdvancedMapAnalyticsApiError;
    return error.status === 403 ? error : null;
  }, [mapQuery.error]);

  const bundledRemoteBaseSeriesHash = useMemo(() => {
    if (!mapQuery.data) {
      return undefined;
    }

    return getRemoteGroupedSeriesHash(mapQuery.data.lastSnapshot.config.series);
  }, [mapQuery.data]);

  const handleConfirmSaveSnapshot = async (input: {
    description: string | null;
    stateAtSave: 'private' | 'public';
  }) => {
    if (!mapQuery.data) {
      return;
    }

    if (input.stateAtSave === 'public' && uploadedDatasetPublicBlockingMessage) {
      toast.error(uploadedDatasetPublicBlockingMessage);
      return;
    }

    const mapTitle = mapState.mapName.trim();
    const trimmedMapDescription = mapDescriptionDraft.trim();

    try {
      await saveSnapshotMutation.mutateAsync({
        mapId,
        mapState,
        title: mapTitle.length > 0 ? mapTitle : mapQuery.data.title,
        description: input.description,
        stateAtSave: input.stateAtSave,
        mapPatch: {
          description: trimmedMapDescription.length > 0 ? trimmedMapDescription : null,
          state: input.stateAtSave,
        },
      });
      try {
        await createManualSnapshot({
          description: input.description,
          stateAtSave: input.stateAtSave,
        });
      } catch {
        // Local snapshot failure is non-fatal — server save already succeeded
      }
      markCurrentAsSaved();
      setIsSaveSnapshotDialogOpen(false);
      toast.success(t`Snapshot saved`);
    } catch (error) {
      const message = error instanceof Error ? error.message : t`Failed to save snapshot`;
      toast.error(message);
    }
  };

  const handleRestoreLocalSnapshot = async (snapshotId: number) => {
    const snapshot = await restoreSnapshot(snapshotId);
    if (!snapshot) {
      return;
    }

    setMapState(snapshot.mapState);
    setMapDescriptionDraft(snapshot.mapDescription);
    setIsLocalSnapshotsModalOpen(false);
    toast.success(t`Local snapshot restored`);
  };

  const handleApplyImportedConfig = useCallback(async (nextConfig: ImportedMapConfig) => {
    if (mapQuery.data) {
      try {
        await createManualSnapshot({
          description: t`Backup before config import`,
          stateAtSave: mapQuery.data.state,
        });
      } catch {
        // Best-effort backup. Import should still continue when local snapshots fail.
      }
    }

    setMapState(nextConfig.mapState);
    setMapDescriptionDraft(nextConfig.mapDescription);
    toast.success(t`Map configuration imported`);
  }, [createManualSnapshot, mapQuery.data, setMapDescriptionDraft, setMapState]);

  const handleBeforeExportConfig = useCallback(async () => {
    if (!mapQuery.data) {
      return;
    }

    try {
      await createManualSnapshot({
        description: t`Backup before config export`,
        stateAtSave: mapQuery.data.state,
      });
    } catch {
      // Best-effort backup. Export should still continue when local snapshots fail.
    }
  }, [createManualSnapshot, mapQuery.data]);

  const workspaceCapabilities = useMemo(() => ({ readOnly: false }), []);
  const openOwnerConfig = useCallback(() => setIsOwnerConfigModalOpen(true), []);
  const openOwnerDescriptionConfig = useCallback(() => {
    setIsOwnerConfigModalOpen(true);
    setOwnerConfigDescriptionEditorOpen(true);
  }, []);
  const requestSaveSnapshot = useCallback(() => setIsSaveSnapshotDialogOpen(true), []);
  const openLocalSnapshots = useCallback(() => setIsLocalSnapshotsModalOpen(true), []);
  const handleOwnerConfigOpenChange = useCallback((nextOpen: boolean) => {
    setIsOwnerConfigModalOpen(nextOpen);
    if (!nextOpen) {
      setOwnerConfigDescriptionEditorOpen(false);
    }
  }, []);
  const handleMapNameChange = useCallback((nextMapName: string) => {
    setMapState((previousState) => ({
      ...previousState,
      mapName: nextMapName,
    }));
  }, [setMapState]);
  const handleLoadSnapshot = useCallback((nextMapState: AdvancedMapAnalyticsUrlState, nextMapDescription: string) => {
    setMapState(nextMapState);
    setMapDescriptionDraft(nextMapDescription);
  }, [setMapDescriptionDraft, setMapState]);
  const handleDeleted = useCallback(() => {
    skipUnsavedChangesBlockerRef.current = true;
    navigate({ to: '/maps/editor', replace: true });
  }, [navigate]);

  if (!isLoaded || (mapQuery.isLoading && isSignedIn)) {
    return (
      <div className="container mx-auto py-12">
        <LoadingSpinner text={t`Loading map editor...`} />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>{t`Sign in required`}</CardTitle>
            <CardDescription>{t`You need to be signed in to access map editor.`}</CardDescription>
          </CardHeader>
          <CardContent>
            <AuthSignInButton>
              <Button>{t`Sign In`}</Button>
            </AuthSignInButton>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (forbiddenError) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>{t`Access denied`}</CardTitle>
            <CardDescription>{forbiddenError.message}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (mapQuery.error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>{t`Failed to load map`}</CardTitle>
            <CardDescription>{mapQuery.error.message}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!mapQuery.data) {
    return null;
  }

  return (
    <>
      <UnsavedChangesDialog
        open={blocker.status === 'blocked' && isDirty}
        onStay={() => blocker.reset?.()}
        onLeave={() => blocker.proceed?.()}
        isSaving={saveSnapshotMutation.isPending}
      />

      <MapAnalyticsWorkspace
        mode="owner"
        mapState={mapState}
        setMapState={setMapState}
        mapDescription={mapDescriptionDraft}
        capabilities={workspaceCapabilities}
        onOpenOwnerConfig={openOwnerConfig}
        onOpenOwnerDescriptionConfig={openOwnerDescriptionConfig}
        hasPendingChanges={isInitialStateResolved && isDirty}
        onRequestSaveSnapshot={requestSaveSnapshot}
        onOpenLocalSnapshots={openLocalSnapshots}
        isSavingSnapshot={saveSnapshotMutation.isPending}
        localSnapshotCount={localSnapshots.length}
        bundledGroupedSeriesData={mapQuery.data.groupedSeriesData}
        bundledRemoteBaseSeriesHash={bundledRemoteBaseSeriesHash}
        onApplyImportedConfig={handleApplyImportedConfig}
        onBeforeExportConfig={handleBeforeExportConfig}
        mapZoomOverride={viewportRestore.mapZoom}
        mapCenterOverride={viewportRestore.mapCenter}
        onMapViewportChange={handleMapViewportChange}
      />

      <MapAnalyticsOwnerConfigModal
        open={isOwnerConfigModalOpen}
        mapId={mapId}
        currentMapState={mapState}
        mapName={mapState.mapName}
        currentVisibility={mapQuery.data.state}
        currentPublicId={mapQuery.data.publicId}
        publicVisibilityErrorMessage={uploadedDatasetPublicBlockingMessage}
        openDescriptionEditor={ownerConfigDescriptionEditorOpen}
        mapDescription={mapDescriptionDraft}
        onMapDescriptionChange={setMapDescriptionDraft}
        onOpenChange={handleOwnerConfigOpenChange}
        onRequestSaveSnapshot={requestSaveSnapshot}
        onBeforeExportConfig={handleBeforeExportConfig}
        onMapNameChange={handleMapNameChange}
        onLoadSnapshot={handleLoadSnapshot}
        onApplyImportedConfig={handleApplyImportedConfig}
        onDeleted={handleDeleted}
      />

      <MapAnalyticsSaveSnapshotDialog
        open={isSaveSnapshotDialogOpen}
        defaultVisibility={mapQuery.data.state}
        isPending={saveSnapshotMutation.isPending}
        publicVisibilityErrorMessage={uploadedDatasetPublicBlockingMessage}
        onOpenChange={setIsSaveSnapshotDialogOpen}
        onConfirm={handleConfirmSaveSnapshot}
      />

      <MapAnalyticsLocalSnapshotsModal
        open={isLocalSnapshotsModalOpen}
        snapshots={localSnapshots}
        isLoading={isLocalSnapshotsLoading}
        isBusy={saveSnapshotMutation.isPending}
        onOpenChange={setIsLocalSnapshotsModalOpen}
        onLoad={handleRestoreLocalSnapshot}
        onDelete={deleteSnapshot}
        onClearAll={clearSnapshots}
      />
    </>
  );
}
