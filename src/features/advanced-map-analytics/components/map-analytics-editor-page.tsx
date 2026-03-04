import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
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
  const [isSaveSnapshotDialogOpen, setIsSaveSnapshotDialogOpen] = useState(false);
  const [isLocalSnapshotsModalOpen, setIsLocalSnapshotsModalOpen] = useState(false);
  const [isInitialStateResolved, setIsInitialStateResolved] = useState(false);
  const mapDescriptionDraft = useMapEditorDraftStore(mapId, (state) => state.mapDescription);
  const draftUpdatedAt = useMapEditorDraftStore(mapId, (state) => state.updatedAt);
  const setMapDescriptionDraft = useMapEditorDraftStore(mapId, (state) => state.updateMapDescription);

  const mapQuery = useAdvancedMapAnalyticsMapQuery(mapId, isLoaded && isSignedIn);
  const saveSnapshotMutation = useSaveAdvancedMapAnalyticsSnapshotMutation();
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

  useMapEditorInitialState({
    mapId,
    mapQueryData: mapQuery.data,
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

  const handleApplyImportedConfig = async (nextConfig: ImportedMapConfig) => {
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
  };

  const handleBeforeExportConfig = async () => {
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
  };

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
      <MapAnalyticsWorkspace
        mode="owner"
        mapState={mapState}
        setMapState={setMapState}
        mapDescription={mapDescriptionDraft}
        capabilities={{ readOnly: false }}
        onOpenOwnerConfig={() => setIsOwnerConfigModalOpen(true)}
        hasPendingChanges={isInitialStateResolved && isDirty}
        onRequestSaveSnapshot={() => setIsSaveSnapshotDialogOpen(true)}
        onOpenLocalSnapshots={() => setIsLocalSnapshotsModalOpen(true)}
        isSavingSnapshot={saveSnapshotMutation.isPending}
        localSnapshotCount={localSnapshots.length}
        bundledGroupedSeriesData={mapQuery.data.groupedSeriesData}
        bundledRemoteBaseSeriesHash={bundledRemoteBaseSeriesHash}
        onApplyImportedConfig={handleApplyImportedConfig}
        onBeforeExportConfig={handleBeforeExportConfig}
      />

      <MapAnalyticsOwnerConfigModal
        open={isOwnerConfigModalOpen}
        mapId={mapId}
        currentMapState={mapState}
        mapName={mapState.mapName}
        currentVisibility={mapQuery.data.state}
        currentPublicId={mapQuery.data.publicId}
        mapDescription={mapDescriptionDraft}
        onMapDescriptionChange={setMapDescriptionDraft}
        onOpenChange={setIsOwnerConfigModalOpen}
        onRequestSaveSnapshot={() => setIsSaveSnapshotDialogOpen(true)}
        onBeforeExportConfig={handleBeforeExportConfig}
        onMapNameChange={(nextMapName) => {
          setMapState((previousState) => ({
            ...previousState,
            mapName: nextMapName,
          }));
        }}
        onLoadSnapshot={(nextMapState, nextMapDescription) => {
          setMapState(nextMapState);
          setMapDescriptionDraft(nextMapDescription);
        }}
        onApplyImportedConfig={handleApplyImportedConfig}
        onDeleted={() => {
          navigate({ to: '/maps/editor', replace: true });
        }}
      />

      <MapAnalyticsSaveSnapshotDialog
        open={isSaveSnapshotDialogOpen}
        defaultVisibility={mapQuery.data.state}
        isPending={saveSnapshotMutation.isPending}
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
