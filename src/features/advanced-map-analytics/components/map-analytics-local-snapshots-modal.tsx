import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, HardDriveDownload, Loader2, Trash2 } from 'lucide-react';
import { t } from '@lingui/core/macro';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import type { LocalMapSnapshotRecord } from '@/features/advanced-map-analytics/local-snapshots/local-map-snapshots-db';
import { getUserLocale } from '@/lib/utils';

interface MapAnalyticsLocalSnapshotsModalProps {
  open: boolean;
  snapshots: LocalMapSnapshotRecord[];
  isLoading: boolean;
  isBusy: boolean;
  onOpenChange: (open: boolean) => void;
  onLoad: (snapshotId: number) => Promise<void> | void;
  onDelete: (snapshotId: number) => Promise<void> | void;
  onClearAll: () => Promise<void> | void;
}

export function MapAnalyticsLocalSnapshotsModal({
  open,
  snapshots,
  isLoading,
  isBusy,
  onOpenChange,
  onLoad,
  onDelete,
  onClearAll,
}: Readonly<MapAnalyticsLocalSnapshotsModalProps>) {
  const [pendingRestoreSnapshotId, setPendingRestoreSnapshotId] = useState<number | null>(null);
  const [pendingDeleteSnapshotId, setPendingDeleteSnapshotId] = useState<number | null>(null);
  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(snapshots.length / pageSize));
  const paginatedSnapshots = useMemo(
    () => snapshots.slice(currentPage * pageSize, (currentPage + 1) * pageSize),
    [snapshots, currentPage]
  );

  useEffect(() => {
    setCurrentPage(0);
  }, [snapshots.length]);

  const dateTimeLocale = useMemo(
    () => (getUserLocale() === 'en' ? 'en-US' : 'ro-RO'),
    []
  );
  const pendingRestoreSnapshot = useMemo(
    () => snapshots.find((snapshot) => snapshot.id === pendingRestoreSnapshotId),
    [pendingRestoreSnapshotId, snapshots]
  );
  const pendingDeleteSnapshot = useMemo(
    () => snapshots.find((snapshot) => snapshot.id === pendingDeleteSnapshotId),
    [pendingDeleteSnapshotId, snapshots]
  );

  const handleConfirmRestore = async () => {
    if (!pendingRestoreSnapshot || typeof pendingRestoreSnapshot.id !== 'number') {
      return;
    }

    await onLoad(pendingRestoreSnapshot.id);
    setPendingRestoreSnapshotId(null);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteSnapshot || typeof pendingDeleteSnapshot.id !== 'number') {
      return;
    }

    await onDelete(pendingDeleteSnapshot.id);
    setPendingDeleteSnapshotId(null);
  };

  const handleConfirmClearAll = async () => {
    await onClearAll();
    setIsClearAllConfirmOpen(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t`Local Snapshots`}</DialogTitle>
            <DialogDescription>
              {t`Local snapshots are stored only in this browser on this device.`}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-200">
            {t`These snapshots are local only and are not synced to your account.`}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t`Loading…`}
            </div>
          ) : snapshots.length === 0 ? (
            <EmptyState
              className="py-8"
              title={t`No local snapshots yet`}
              description={t`Local snapshots will appear here after autosave or manual save.`}
            />
          ) : (
            <div className="space-y-2">
              {paginatedSnapshots.map((snapshot) => (
                <article key={snapshot.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium" title={snapshot.mapState.mapName}>
                        {snapshot.mapState.mapName || t`Untitled map`}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(snapshot.updatedAt).toLocaleString(dateTimeLocale)}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {snapshot.source === 'auto' ? t`Auto` : t`Manual`}
                        </Badge>
                        <Badge variant={snapshot.stateAtSave === 'public' ? 'success' : 'secondary'} className="text-xs">
                          {snapshot.stateAtSave === 'public' ? t`Public` : t`Private`}
                        </Badge>
                      </div>
                      {snapshot.description ? (
                        <p className="mt-1 truncate text-xs text-muted-foreground">{snapshot.description}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (typeof snapshot.id === 'number') {
                            setPendingRestoreSnapshotId(snapshot.id);
                          }
                        }}
                        disabled={isBusy || typeof snapshot.id !== 'number'}
                      >
                        <HardDriveDownload className="mr-1.5 h-3.5 w-3.5" />
                        {t`Load`}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (typeof snapshot.id === 'number') {
                            setPendingDeleteSnapshotId(snapshot.id);
                          }
                        }}
                        disabled={isBusy || typeof snapshot.id !== 'number'}
                        aria-label={t`Delete local snapshot`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </article>
              ))}

              {totalPages > 1 ? (
                <div className="flex items-center justify-between pt-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                  >
                    <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                    {t`Previous`}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {t`${currentPage + 1} of ${totalPages}`}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={currentPage >= totalPages - 1}
                  >
                    {t`Next`}
                    <ChevronRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : null}
            </div>
          )}

          <div className="flex justify-end border-t pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsClearAllConfirmOpen(true)}
              disabled={isBusy || snapshots.length === 0}
            >
              {t`Clear all local snapshots`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={pendingRestoreSnapshotId !== null}
        onOpenChange={(nextOpen) => !nextOpen && setPendingRestoreSnapshotId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t`Load local snapshot?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {t`Your current map configuration will be replaced with this local snapshot. Unsaved changes will be lost.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBusy}>{t`Cancel`}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleConfirmRestore()} disabled={isBusy}>
              {t`Load snapshot`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingDeleteSnapshotId !== null}
        onOpenChange={(nextOpen) => !nextOpen && setPendingDeleteSnapshotId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t`Delete local snapshot?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {t`This action only deletes the local snapshot from this browser.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBusy}>{t`Cancel`}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void handleConfirmDelete()}
              disabled={isBusy}
            >
              {t`Delete`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isClearAllConfirmOpen} onOpenChange={setIsClearAllConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t`Clear all local snapshots?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {t`This will remove all local snapshots for this map from this browser only.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBusy}>{t`Cancel`}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void handleConfirmClearAll()}
              disabled={isBusy}
            >
              {t`Clear all`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
