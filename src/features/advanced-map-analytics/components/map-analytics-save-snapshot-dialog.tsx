import { useEffect, useMemo, useState } from 'react';
import { Globe, Loader2 } from 'lucide-react';
import { t } from '@lingui/core/macro';
import type { AdvancedMapAnalyticsVisibility } from '@/features/advanced-map-analytics/api/schemas';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

interface SaveSnapshotDialogConfirmInput {
  description: string | null;
  stateAtSave: AdvancedMapAnalyticsVisibility;
}

interface MapAnalyticsSaveSnapshotDialogProps {
  open: boolean;
  defaultVisibility: AdvancedMapAnalyticsVisibility;
  isPending: boolean;
  publicVisibilityErrorMessage?: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (input: SaveSnapshotDialogConfirmInput) => Promise<void> | void;
}

export function MapAnalyticsSaveSnapshotDialog({
  open,
  defaultVisibility,
  isPending,
  publicVisibilityErrorMessage = null,
  onOpenChange,
  onConfirm,
}: Readonly<MapAnalyticsSaveSnapshotDialogProps>) {
  const [snapshotDescription, setSnapshotDescription] = useState('');
  const [visibilityAtSave, setVisibilityAtSave] =
    useState<AdvancedMapAnalyticsVisibility>(defaultVisibility);

  useEffect(() => {
    if (!open) {
      return;
    }

    setSnapshotDescription('');
    setVisibilityAtSave(defaultVisibility);
  }, [defaultVisibility, open]);

  const trimmedDescription = useMemo(
    () => snapshotDescription.trim(),
    [snapshotDescription]
  );

  const handleConfirm = async () => {
    await onConfirm({
      description: trimmedDescription.length > 0 ? trimmedDescription : null,
      stateAtSave: visibilityAtSave,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onOpenAutoFocus={(event) => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{t`Save Snapshot`}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">{t`Visibility at save`}</p>
              <p className="text-xs text-muted-foreground">
                {visibilityAtSave === 'public'
                  ? t`Anyone with the public link will see this saved version.`
                  : t`Only you can access this saved version.`}
              </p>
            </div>
            <Switch
              checked={visibilityAtSave === 'public'}
              onCheckedChange={(checked) => {
                if (checked && publicVisibilityErrorMessage) {
                  return;
                }

                setVisibilityAtSave(checked ? 'public' : 'private');
              }}
              aria-label={t`Toggle snapshot visibility`}
              disabled={isPending}
            />
          </div>

          {publicVisibilityErrorMessage ? (
            <p className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-2 text-xs text-amber-900">
              {publicVisibilityErrorMessage}
            </p>
          ) : null}

          {visibilityAtSave === 'public' ? (
            <p className="flex items-start gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-2 text-xs text-emerald-900 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-200">
              <Globe className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{t`This snapshot will be visible on the public map URL.`}</span>
            </p>
          ) : null}

          <FormField label={t`Snapshot note`} htmlFor="save-snapshot-description-input">
            <Input
              autoFocus
              id="save-snapshot-description-input"
              value={snapshotDescription}
              onChange={(event) => setSnapshotDescription(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !isPending) {
                  event.preventDefault();
                  void handleConfirm();
                }
              }}
              placeholder={t`Optional note about what changed…`}
              disabled={isPending}
            />
          </FormField>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {t`Cancel`}
          </Button>
          <Button type="button" onClick={() => void handleConfirm()} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t`Saving…`}
              </>
            ) : (
              t`Save snapshot`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
