import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Database, HardDriveDownload, Loader2, Trash2 } from 'lucide-react';
import { t } from '@lingui/core/macro';
import { Badge } from '@/components/ui/badge';
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
            <DialogTitle>{t`Local snapshots`}</DialogTitle>
            <DialogDescription>
              {t`Local snapshots are stored only in this browser on this device.`}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300">
            {t`These snapshots are local only and are not synced to your account.`}
          </div>

          <div className="rounded-lg border bg-muted/20 p-3">
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
                onClick={() => void onSaveCurrent(snapshotDescriptionDraft.trim() || null)}
                disabled={isBusy}
              >
                {t`Save current snapshot`}
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t`Loading…`}
            </div>
          ) : snapshots.length === 0 ? (
            <EmptyState
              icon={<Database className="h-10 w-10" />}
              className="py-8"
              title={t`No local snapshots yet`}
              description={t`Local dataset snapshots will appear here after autosave or manual save.`}
            />
          ) : (
            <div className="space-y-2">
              {paginatedSnapshots.map((snapshot) => (
                <article key={snapshot.id} className="rounded-lg border p-3 transition-colors hover:bg-muted/30">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {snapshot.draft.title.trim() || t`Untitled data series`}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(snapshot.updatedAt).toLocaleString(dateTimeLocale)}
                        </span>
                        {snapshot.description ? (
                          <Badge variant="outline" className="text-[10px]">{snapshot.description}</Badge>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
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
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
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
                    className="gap-1"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
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
                    className="gap-1"
                  >
                    {t`Next`}
                    <ChevronRight className="h-3.5 w-3.5" />
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
