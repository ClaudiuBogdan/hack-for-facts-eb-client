import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Database, HardDriveDownload, Loader2, Trash2 } from 'lucide-react';
import { t } from '@lingui/core/macro';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
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
import type { LocalDatasetSnapshotRecord } from '@/features/advanced-map-datasets/local-snapshots/local-dataset-snapshots-db';
import { getUserLocale } from '@/lib/utils';

interface DatasetLocalSnapshotsModalProps {
  open: boolean;
  snapshots: LocalDatasetSnapshotRecord[];
  isLoading: boolean;
  isBusy: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveCurrent: (description: string | null) => Promise<void> | void;
  onLoad: (snapshotId: number) => Promise<void> | void;
  onDelete: (snapshotId: number) => Promise<void> | void;
  onClearAll: () => Promise<void> | void;
}

export function DatasetLocalSnapshotsModal({
  open,
  snapshots,
  isLoading,
  isBusy,
  onOpenChange,
  onSaveCurrent,
  onLoad,
  onDelete,
  onClearAll,
}: Readonly<DatasetLocalSnapshotsModalProps>) {
  const [pendingRestoreSnapshotId, setPendingRestoreSnapshotId] = useState<number | null>(null);
  const [pendingDeleteSnapshotId, setPendingDeleteSnapshotId] = useState<number | null>(null);
  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false);
  const [snapshotDescriptionDraft, setSnapshotDescriptionDraft] = useState('');
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

  useEffect(() => {
    if (!open) {
      return;
    }

    setSnapshotDescriptionDraft('');
  }, [open]);

  const dateTimeLocale = useMemo(() => (getUserLocale() === 'en' ? 'en-US' : 'ro-RO'), []);

  const pendingRestoreSnapshot = useMemo(
    () => snapshots.find((snapshot) => snapshot.id === pendingRestoreSnapshotId),
    [pendingRestoreSnapshotId, snapshots]
  );
  const pendingDeleteSnapshot = useMemo(
    () => snapshots.find((snapshot) => snapshot.id === pendingDeleteSnapshotId),
    [pendingDeleteSnapshotId, snapshots]
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold tracking-tight">{t`Local snapshots`}</DialogTitle>
            <DialogDescription className="text-sm">
              {t`Saved only in this browser. Not synced to your account.`}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="flex-1">
                <FormField label={t`Snapshot note`} htmlFor="dataset-local-snapshot-note">
                  <Input
                    id="dataset-local-snapshot-note"
                    value={snapshotDescriptionDraft}
                    onChange={(event) => setSnapshotDescriptionDraft(event.currentTarget.value)}
                    placeholder={t`Optional note about this version`}
                    disabled={isBusy}
                  />
                </FormField>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => void onSaveCurrent(snapshotDescriptionDraft.trim() || null)}
                disabled={isBusy}
              >
                {t`Save snapshot`}
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t`Loading…`}
            </div>
          ) : snapshots.length === 0 ? (
            <EmptyState
              icon={<Database className="h-8 w-8" />}
              className="py-10"
              title={t`No local snapshots yet`}
              description={t`Snapshots will appear here after autosave or manual save.`}
            />
          ) : (
            <div className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/60">
              {paginatedSnapshots.map((snapshot) => (
                <article
                  key={snapshot.id}
                  className="flex items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {snapshot.draft.title.trim() || t`Untitled data series`}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                      <span>{new Date(snapshot.updatedAt).toLocaleString(dateTimeLocale)}</span>
                      {snapshot.description ? (
                        <>
                          <span aria-hidden className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                          <span className="truncate">{snapshot.description}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5"
                      disabled={isBusy || typeof snapshot.id !== 'number'}
                      onClick={() => {
                        if (typeof snapshot.id === 'number') {
                          setPendingRestoreSnapshotId(snapshot.id);
                        }
                      }}
                    >
                      <HardDriveDownload className="h-3.5 w-3.5" />
                      {t`Load`}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      disabled={isBusy || typeof snapshot.id !== 'number'}
                      onClick={() => {
                        if (typeof snapshot.id === 'number') {
                          setPendingDeleteSnapshotId(snapshot.id);
                        }
                      }}
                      aria-label={t`Delete local snapshot`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}

          {totalPages > 1 ? (
            <div className="flex items-center justify-between">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                {t`Previous`}
              </Button>
              <span className="text-xs text-muted-foreground tabular-nums">
                {t`${currentPage + 1} of ${totalPages}`}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
                className="gap-1"
              >
                {t`Next`}
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : null}

          {snapshots.length > 0 ? (
            <div className="flex justify-end border-t border-border/60 pt-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => setIsClearAllConfirmOpen(true)}
                disabled={isBusy}
              >
                {t`Clear all snapshots`}
              </Button>
            </div>
          ) : null}
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
              {t`Your current dataset draft will be replaced with this local snapshot. Unsaved changes will be lost.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBusy}>{t`Cancel`}</AlertDialogCancel>
            <AlertDialogAction
              disabled={isBusy}
              onClick={() => {
                if (pendingRestoreSnapshot && typeof pendingRestoreSnapshot.id === 'number') {
                  void onLoad(pendingRestoreSnapshot.id);
                }
                setPendingRestoreSnapshotId(null);
              }}
            >
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
              disabled={isBusy}
              onClick={() => {
                if (pendingDeleteSnapshot && typeof pendingDeleteSnapshot.id === 'number') {
                  void onDelete(pendingDeleteSnapshot.id);
                }
                setPendingDeleteSnapshotId(null);
              }}
            >
              {t`Delete snapshot`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isClearAllConfirmOpen} onOpenChange={setIsClearAllConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t`Clear all local snapshots?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {t`This will remove every local dataset snapshot saved in this browser for the current draft.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBusy}>{t`Cancel`}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isBusy}
              onClick={() => {
                void onClearAll();
                setIsClearAllConfirmOpen(false);
              }}
            >
              {t`Clear snapshots`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
