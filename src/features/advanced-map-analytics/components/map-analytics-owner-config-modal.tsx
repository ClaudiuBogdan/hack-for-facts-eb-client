import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Switch } from '@/components/ui/switch';
import { ensureShortRedirectUrl } from '@/lib/api/shortLinks';
import type { AdvancedMapAnalyticsUrlState } from '@/schemas/advanced-map-analytics';
import { AdvancedMapAnalyticsDescriptionModal } from '@/components/maps/advanced-map-analytics/advanced-map-analytics-description-modal';
import {
  fetchAdvancedMapAnalyticsSnapshotForRestore,
  useAdvancedMapAnalyticsSnapshotsQuery,
  useDeleteAdvancedMapAnalyticsMapMutation,
  useSaveAdvancedMapAnalyticsSnapshotMutation,
  useUpdateAdvancedMapAnalyticsMapMutation,
} from '@/features/advanced-map-analytics/hooks/use-advanced-map-analytics';
import type { AdvancedMapAnalyticsVisibility } from '@/features/advanced-map-analytics/api/schemas';

interface MapAnalyticsOwnerConfigModalProps {
  open: boolean;
  mapId: string;
  currentMapState: AdvancedMapAnalyticsUrlState;
  mapName: string;
  mapDescription?: string;
  currentTitle: string;
  currentVisibility: AdvancedMapAnalyticsVisibility;
  currentPublicId: string | null;
  onOpenChange: (open: boolean) => void;
  onMapNameChange: (nextMapName: string) => void;
  onMapDescriptionChange?: (nextDescription: string) => void;
  onLoadSnapshot: (mapState: AdvancedMapAnalyticsUrlState) => void;
  onDeleted: () => void;
}

export function MapAnalyticsOwnerConfigModal({
  open,
  mapId,
  currentMapState,
  mapName,
  mapDescription = '',
  currentTitle,
  currentVisibility,
  currentPublicId,
  onOpenChange,
  onMapNameChange,
  onMapDescriptionChange,
  onLoadSnapshot,
  onDeleted,
}: Readonly<MapAnalyticsOwnerConfigModalProps>) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [snapshotDescriptionDraft, setSnapshotDescriptionDraft] = useState('');
  const [visibility, setVisibility] = useState<AdvancedMapAnalyticsVisibility>(currentVisibility);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [pendingVisibilityTarget, setPendingVisibilityTarget] = useState<AdvancedMapAnalyticsVisibility | null>(null);
  const [pendingLoadSnapshotId, setPendingLoadSnapshotId] = useState<string | null>(null);
  const [isSaveCheckpointConfirmOpen, setIsSaveCheckpointConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDescriptionEditorModalOpen, setIsDescriptionEditorModalOpen] = useState(false);

  const snapshotsQuery = useAdvancedMapAnalyticsSnapshotsQuery(mapId, page, 20, open);
  const updateMapMutation = useUpdateAdvancedMapAnalyticsMapMutation();
  const saveSnapshotMutation = useSaveAdvancedMapAnalyticsSnapshotMutation();
  const deleteMapMutation = useDeleteAdvancedMapAnalyticsMapMutation();

  useEffect(() => {
    if (!open) {
      return;
    }

    setPage(1);
    setSnapshotDescriptionDraft('');
    setVisibility(currentVisibility);
    setDeleteConfirmationInput('');
    setPendingVisibilityTarget(null);
    setPendingLoadSnapshotId(null);
    setIsSaveCheckpointConfirmOpen(false);
    setIsDeleteConfirmOpen(false);
    setIsDescriptionEditorModalOpen(false);
  }, [open, currentVisibility]);

  const isBusy =
    updateMapMutation.isPending ||
    saveSnapshotMutation.isPending ||
    deleteMapMutation.isPending;

  const snapshots = snapshotsQuery.data?.snapshots ?? [];
  const canGoPrevious = page > 1;
  const canGoNext = snapshotsQuery.data?.hasNextPage ?? false;
  const trimmedSnapshotDescription = useMemo(
    () => snapshotDescriptionDraft.trim(),
    [snapshotDescriptionDraft]
  );
  const trimmedMapName = useMemo(() => mapName.trim(), [mapName]);
  const trimmedMapDescription = useMemo(() => mapDescription.trim(), [mapDescription]);
  const snapshotTitle = trimmedMapName.length > 0 ? trimmedMapName : currentTitle;
  const deleteInputMatchesTitle = deleteConfirmationInput === mapName;
  const visibilityLabel = visibility === 'public' ? 'Public' : 'Private';
  const isVisibilityConfirmOpen = pendingVisibilityTarget !== null;
  const isLoadConfirmOpen = pendingLoadSnapshotId !== null;
  const normalizedPublicId =
    typeof currentPublicId === 'string' && currentPublicId.trim().length > 0
      ? currentPublicId.trim()
      : null;
  const publicMapUrl = useMemo(() => {
    if (visibility !== 'public' || normalizedPublicId === null) {
      return '';
    }

    const path = `/maps/public/${encodeURIComponent(normalizedPublicId)}`;
    if (typeof window === 'undefined' || typeof window.location.origin !== 'string') {
      return path;
    }

    return `${window.location.origin}${path}`;
  }, [normalizedPublicId, visibility]);

  const handleRequestVisibilityToggle = (checked: boolean) => {
    const nextVisibility: AdvancedMapAnalyticsVisibility = checked ? 'public' : 'private';
    if (nextVisibility === visibility) {
      return;
    }

    setPendingVisibilityTarget(nextVisibility);
  };

  const handleConfirmVisibilityToggle = async () => {
    if (!pendingVisibilityTarget) {
      return;
    }

    const nextVisibility = pendingVisibilityTarget;

    try {
      await updateMapMutation.mutateAsync({
        mapId,
        state: nextVisibility,
      });
      setVisibility(nextVisibility);
      toast.success(nextVisibility === 'public' ? 'Map is now public' : 'Map is now private');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update map visibility';
      toast.error(message);
    } finally {
      setPendingVisibilityTarget(null);
    }
  };

  const handleSaveCheckpoint = async () => {
    try {
      await saveSnapshotMutation.mutateAsync({
        mapId,
        mapState: currentMapState,
        title: snapshotTitle,
        description: trimmedSnapshotDescription.length > 0 ? trimmedSnapshotDescription : null,
        stateAtSave: visibility,
        mapPatch: {
          description: trimmedMapDescription.length > 0 ? trimmedMapDescription : null,
        },
      });
      setSnapshotDescriptionDraft('');
      toast.success('Checkpoint saved');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save checkpoint';
      toast.error(message);
    } finally {
      setIsSaveCheckpointConfirmOpen(false);
    }
  };

  const handleRequestSaveCheckpoint = () => {
    if (visibility === 'public') {
      setIsSaveCheckpointConfirmOpen(true);
      return;
    }

    void handleSaveCheckpoint();
  };

  const handleConfirmLoadSnapshot = async () => {
    if (!pendingLoadSnapshotId) {
      return;
    }

    try {
      const snapshot = await fetchAdvancedMapAnalyticsSnapshotForRestore(mapId, pendingLoadSnapshotId);
      onLoadSnapshot(snapshot.config);
      toast.success('Snapshot loaded');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load snapshot';
      toast.error(message);
    } finally {
      setPendingLoadSnapshotId(null);
    }
  };

  const handleConfirmDeleteMap = async () => {
    try {
      await deleteMapMutation.mutateAsync({ mapId });
      toast.success('Map deleted');
      onOpenChange(false);
      onDeleted();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete map';
      toast.error(message);
    } finally {
      setIsDeleteConfirmOpen(false);
    }
  };

  const handleCopyPublicLink = async () => {
    if (publicMapUrl.length === 0) {
      return;
    }

    try {
      await navigator.clipboard.writeText(publicMapUrl);
      toast.success('Public map link copied');
    } catch {
      toast.error('Failed to copy public map link');
    }
  };

  const handleMapDescriptionChange = (nextDescription: string) => {
    onMapDescriptionChange?.(nextDescription);
  };

  const handleCopyMapLink = async () => {
    const params = new URLSearchParams();
    params.set('state', JSON.stringify(currentMapState));
    const mapClonePath = `/maps/editor/new?${params.toString()}`;
    const currentOrigin =
      typeof window !== 'undefined' && typeof window.location.origin === 'string'
        ? window.location.origin
        : '';
    const fullMapCloneUrl =
      currentOrigin.length > 0 ? `${currentOrigin}${mapClonePath}` : mapClonePath;

    let linkToCopy = fullMapCloneUrl;
    if (currentOrigin.length > 0) {
      try {
        linkToCopy = await ensureShortRedirectUrl(fullMapCloneUrl, currentOrigin, queryClient);
      } catch {
        // Short-link generation is optional for copy-map; fallback to full URL.
      }
    }

    try {
      await navigator.clipboard.writeText(linkToCopy);
      toast.success('Map link copied to clipboard', {
        description: 'Now you can share or open it in a new tab.',
      });
    } catch {
      toast.error('Failed to copy map link');
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90dvh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Map configuration</DialogTitle>
            <DialogDescription>
              Manage map visibility, checkpoints, and destructive actions in one place.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <section className="space-y-3 rounded-lg border p-3">
              <h3 className="text-sm font-semibold">Map settings</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium" htmlFor="map-title-input">
                    Map title
                  </label>
                  <Input
                    id="map-title-input"
                    value={mapName}
                    onChange={(event) => onMapNameChange(event.currentTarget.value)}
                    disabled={isBusy}
                    aria-label="Map title"
                  />
                </div>
                <div>
                  <p className="mb-1 text-sm font-medium">Visibility</p>
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <Badge variant={visibility === 'public' ? 'success' : 'secondary'}>
                      {visibilityLabel}
                    </Badge>
                    <Switch
                      checked={visibility === 'public'}
                      onCheckedChange={handleRequestVisibilityToggle}
                      disabled={isBusy}
                      aria-label="Map visibility"
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Public maps are accessible from the public route.
                  </p>
                  {visibility === 'public' ? (
                    <div className="mt-3 space-y-2">
                      <label
                        className="block text-xs font-medium text-muted-foreground"
                        htmlFor="public-map-url-input"
                      >
                        Public map URL
                      </label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="public-map-url-input"
                          value={publicMapUrl}
                          readOnly
                          aria-label="Public map URL"
                          placeholder="/maps/public/<public-id>"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleCopyPublicLink()}
                          disabled={publicMapUrl.length === 0 || isBusy}
                        >
                          Copy link
                        </Button>
                      </div>
                      {publicMapUrl.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          Public URL is not available yet. Refresh after publishing.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
              <Button
                type="button"
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={() => setIsDescriptionEditorModalOpen(true)}
              >
                Read more
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => void handleCopyMapLink()}
                disabled={isBusy}
              >
                Copy map
              </Button>
            </section>

            <section className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Snapshots</h3>
                <Button onClick={handleRequestSaveCheckpoint} disabled={isBusy} size="sm">
                  Save checkpoint
                </Button>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="snapshot-description">
                  Snapshot description (optional)
                </label>
                <Input
                  id="snapshot-description"
                  value={snapshotDescriptionDraft}
                  onChange={(event) => setSnapshotDescriptionDraft(event.currentTarget.value)}
                  disabled={isBusy}
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!canGoPrevious || isBusy}
                  onClick={() => setPage((previousPage) => previousPage - 1)}
                >
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">Page {page}</span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!canGoNext || isBusy}
                  onClick={() => setPage((previousPage) => previousPage + 1)}
                >
                  Next
                </Button>
              </div>

              {snapshotsQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner text="Loading snapshots..." />
                </div>
              ) : snapshotsQuery.error ? (
                <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {snapshotsQuery.error.message}
                </div>
              ) : snapshots.length === 0 ? (
                <div className="rounded border border-dashed p-4 text-sm text-muted-foreground">
                  No snapshots found.
                </div>
              ) : (
                <div className="max-h-[320px] space-y-2 overflow-y-auto">
                  {snapshots.map((snapshot) => (
                    <article key={snapshot.snapshotId} className="rounded border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{snapshot.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(snapshot.createdAt).toLocaleString()} · {snapshot.stateAtSave}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isBusy}
                          onClick={() => setPendingLoadSnapshotId(snapshot.snapshotId)}
                        >
                          Load
                        </Button>
                      </div>
                      {snapshot.description ? (
                        <p className="mt-2 text-xs text-muted-foreground">{snapshot.description}</p>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-3 rounded-lg border border-red-200 bg-red-50/40 p-3">
              <h3 className="text-sm font-semibold text-red-900">Danger zone</h3>
              <p className="text-xs text-red-800">
                Type the map title exactly to enable deletion.
              </p>
              <Input
                value={deleteConfirmationInput}
                onChange={(event) => setDeleteConfirmationInput(event.currentTarget.value)}
                placeholder={mapName}
                disabled={isBusy}
                aria-label="Delete map confirmation input"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={!deleteInputMatchesTitle || isBusy}
                  onClick={() => setIsDeleteConfirmOpen(true)}
                >
                  Delete map
                </Button>
              </div>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      <AdvancedMapAnalyticsDescriptionModal
        open={isDescriptionEditorModalOpen}
        onOpenChange={setIsDescriptionEditorModalOpen}
        description={mapDescription}
        mode="edit"
        onDescriptionChange={handleMapDescriptionChange}
      />

      <AlertDialog open={isVisibilityConfirmOpen} onOpenChange={(nextOpen) => !nextOpen && setPendingVisibilityTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingVisibilityTarget === 'public' ? 'Publish map?' : 'Make map private?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingVisibilityTarget === 'public'
                ? 'This map will be available on the public route.'
                : 'This map will no longer be available on the public route.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleConfirmVisibilityToggle()} disabled={isBusy}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isLoadConfirmOpen} onOpenChange={(nextOpen) => !nextOpen && setPendingLoadSnapshotId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Load snapshot?</AlertDialogTitle>
            <AlertDialogDescription>
              Loading a snapshot replaces the current editor configuration. Unsaved changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleConfirmLoadSnapshot()} disabled={isBusy}>
              Confirm load
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isSaveCheckpointConfirmOpen} onOpenChange={setIsSaveCheckpointConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save public checkpoint?</AlertDialogTitle>
            <AlertDialogDescription>
              This map is public and the latest checkpoint can be visible on the public route.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleSaveCheckpoint()} disabled={isBusy}>
              Confirm save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete map permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The map and its snapshots will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void handleConfirmDeleteMap()}
              disabled={isBusy}
            >
              Delete map
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
