import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Copy, EyeOff, FileText, Globe, Loader2, Share2, Trash2 } from 'lucide-react';
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
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';

import { ModalHeader, ModalTitle } from '@/components/ui/modal-header';
import { ModalSection } from '@/components/ui/modal-section';
import { modalHeaderClassName, modalSizes } from '@/components/ui/modal-sizes';
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
import { t } from '@lingui/core/macro';
import { cn, getUserLocale } from '@/lib/utils';

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
  const dateTimeLocale = getUserLocale() === 'en' ? 'en-US' : 'ro-RO';
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [snapshotDescriptionDraft, setSnapshotDescriptionDraft] = useState('');
  const [visibility, setVisibility] = useState<AdvancedMapAnalyticsVisibility>(currentVisibility);
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
  const trimmedMapDescription = useMemo(() => mapDescription.trim(), [mapDescription]);
  const snapshotTitle = mapName.trim().length > 0 ? mapName.trim() : currentTitle;
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
  const modalDescription = t`Manage your map settings, visibility, and version history.`;

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
      toast.success(nextVisibility === 'public' ? t`Map is now public` : t`Map is now private`);
    } catch (error) {
      const message = error instanceof Error ? error.message : t`Failed to update map visibility`;
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
      toast.success(t`Snapshot saved`);
    } catch (error) {
      const message = error instanceof Error ? error.message : t`Failed to save snapshot`;
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
      toast.success(t`Version restored`);
    } catch (error) {
      const message = error instanceof Error ? error.message : t`Failed to restore version`;
      toast.error(message);
    } finally {
      setPendingLoadSnapshotId(null);
    }
  };

  const handleConfirmDeleteMap = async () => {
    try {
      await deleteMapMutation.mutateAsync({ mapId });
      toast.success(t`Map deleted`);
      onOpenChange(false);
      onDeleted();
    } catch (error) {
      const message = error instanceof Error ? error.message : t`Failed to delete map`;
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
      toast.success(t`Public map link copied`);
    } catch {
      toast.error(t`Failed to copy public map link`);
    }
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
      toast.success(t`Configuration link copied`, {
        description: t`Share this link so others can create a map based on your setup.`,
      });
    } catch {
      toast.error(t`Failed to copy map link`);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(modalSizes.xl, "max-h-[90dvh] overflow-y-auto p-0 gap-0")}
          aria-describedby={undefined}
        >
          {/* Header */}
          <div className={modalHeaderClassName}>
            <ModalHeader>
              <DialogTitle asChild>
                <ModalTitle subtitle={modalDescription}>{t`Map Settings`}</ModalTitle>
              </DialogTitle>
            </ModalHeader>
          </div>

          {/* Content */}
          <div className="px-6 py-5 space-y-6">
            {/* General Section */}
            <ModalSection title={t`General`} variant="muted">
              <FormField label={t`Map title`} htmlFor="map-title-input">
                <Input
                  id="map-title-input"
                  value={mapName}
                  onChange={(event) => onMapNameChange(event.currentTarget.value)}
                  disabled={isBusy}
                  placeholder={t`My Budget Analysis Map…`}

                />
                <p className="text-xs text-muted-foreground">
                  {t`This title is displayed at the top of your map.`}
                </p>
              </FormField>

              <div className="flex gap-3 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDescriptionEditorModalOpen(true)}
                  disabled={isBusy}
                  className="flex-1"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {t`Edit description`}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleCopyMapLink()}
                  disabled={isBusy}
                  className="flex-1"
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  {t`Share configuration`}
                </Button>
              </div>
            </ModalSection>

            {/* Visibility Section */}
            <ModalSection title={t`Visibility`}>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  {visibility === 'public' ? (
                    <Globe className="h-5 w-5 text-emerald-700 shrink-0" />
                  ) : (
                    <EyeOff className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{visibility === 'public' ? t`Public` : t`Private`}</span>
                      <Badge variant={visibility === 'public' ? 'success' : 'secondary'} className="text-xs">
                        {visibility === 'public' ? t`Anyone with link` : t`Only you`}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {visibility === 'public'
                        ? t`Anyone with the public link can view this map.`
                        : t`Only you can access this map.`
                      }
                    </p>
                  </div>
                </div>
                <Switch
                  checked={visibility === 'public'}
                  onCheckedChange={handleRequestVisibilityToggle}
                  disabled={isBusy}
                  aria-label={t`Toggle map visibility`}
                />
              </div>

              {visibility === 'public' && normalizedPublicId && (
                <FormField label={t`Public link`} htmlFor="public-map-url-input" className="mt-4">
                  <div className="flex items-center gap-2">
                    <Input
                      id="public-map-url-input"
                      value={publicMapUrl}
                      readOnly
                      className="h-9 text-sm bg-background"
                    />
                    <Button
                      size="sm"
                      onClick={() => void handleCopyPublicLink()}
                      disabled={isBusy}
                      variant="secondary"
                      aria-label={t`Copy link`}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </FormField>
              )}
            </ModalSection>

            {/* Version History Section */}
            <ModalSection
              title={t`Version history`}
              actions={
                <Button
                  onClick={handleRequestSaveCheckpoint}
                  disabled={isBusy}
                  size="sm"
                  variant="default"
                >
                  {t`Save snapshot`}
                </Button>
              }
            >
              <FormField label={t`Snapshot note`} htmlFor="snapshot-description">
                <Input
                  id="snapshot-description"
                  value={snapshotDescriptionDraft}
                  onChange={(event) => setSnapshotDescriptionDraft(event.currentTarget.value)}
                  disabled={isBusy}
                  placeholder={t`Optional note about what changed…`}
                />
                <p className="text-xs text-muted-foreground">
                  {t`Add a brief note to help identify this version later.`}
                </p>
              </FormField>

              {snapshotsQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">{t`Loading…`}</span>
                </div>
              ) : snapshotsQuery.error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {snapshotsQuery.error.message}
                </div>
              ) : snapshots.length === 0 ? (
                <EmptyState
                  title={t`No saved versions yet`}
                  description={t`Save versions of your map to track changes over time.`}
                  className="mt-4"
                />
              ) : (
                <div className="space-y-2 mt-4">
                  {snapshots.map((snapshot) => (
                    <article
                      key={snapshot.snapshotId}
                      className="group flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/30"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{snapshot.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {new Date(snapshot.createdAt).toLocaleString(dateTimeLocale)}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {snapshot.stateAtSave === 'public' ? t`Public` : t`Private`}
                          </Badge>
                        </div>
                        {snapshot.description && (
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {snapshot.description}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isBusy}
                        onClick={() => setPendingLoadSnapshotId(snapshot.snapshotId)}
                        className="shrink-0"
                      >
                        {t`Restore`}
                      </Button>
                    </article>
                  ))}

                  <div className="flex items-center justify-end gap-1 pt-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!canGoPrevious || isBusy}
                      onClick={() => setPage((p) => p - 1)}
                      className="h-7 px-2"
                    >
                      {t`Previous`}
                    </Button>
                    <span className="text-xs text-muted-foreground px-2">
                      {t`Page ${page}`}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!canGoNext || isBusy}
                      onClick={() => setPage((p) => p + 1)}
                      className="h-7 px-2"
                    >
                      {t`Next`}
                    </Button>
                  </div>
                </div>
              )}
            </ModalSection>

            {/* Danger Zone */}
            <ModalSection title={t`Danger zone`} variant="danger">
              <div className="space-y-3">
                <p className="text-sm text-destructive">
                  {t`Permanently delete this map and all saved versions. This cannot be undone.`}
                </p>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={isBusy}
                  onClick={() => setIsDeleteConfirmOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t`Delete map`}
                </Button>
              </div>
            </ModalSection>
          </div>
        </DialogContent>
      </Dialog>

      <AdvancedMapAnalyticsDescriptionModal
        open={isDescriptionEditorModalOpen}
        onOpenChange={setIsDescriptionEditorModalOpen}
        description={mapDescription}
        mode="edit"
        onDescriptionChange={(desc) => onMapDescriptionChange?.(desc)}
      />

      <AlertDialog open={isVisibilityConfirmOpen} onOpenChange={(nextOpen) => !nextOpen && setPendingVisibilityTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingVisibilityTarget === 'public' ? t`Make map public?` : t`Make map private?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingVisibilityTarget === 'public'
                ? t`Your map will be accessible to anyone with the link. You can change this back at any time.`
                : t`Your map will only be visible to you. Public links will no longer work.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBusy}>{t`Cancel`}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleConfirmVisibilityToggle()} disabled={isBusy}>
              {pendingVisibilityTarget === 'public' ? t`Make public` : t`Make private`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isLoadConfirmOpen} onOpenChange={(nextOpen) => !nextOpen && setPendingLoadSnapshotId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t`Restore this version?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {t`Your current configuration will be replaced with this saved version. Unsaved changes will be lost.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBusy}>{t`Cancel`}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleConfirmLoadSnapshot()} disabled={isBusy}>
              {t`Restore`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isSaveCheckpointConfirmOpen} onOpenChange={setIsSaveCheckpointConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t`Save version to public map?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {t`This map is public. The latest saved version will be visible to anyone with the link.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBusy}>{t`Cancel`}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleSaveCheckpoint()} disabled={isBusy}>
              {t`Save anyway`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t`Delete this map?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {t`This will permanently delete the map and all ${snapshots.length} saved versions. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBusy}>{t`Cancel`}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void handleConfirmDeleteMap()}
              disabled={isBusy}
            >
              {t`Delete permanently`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
