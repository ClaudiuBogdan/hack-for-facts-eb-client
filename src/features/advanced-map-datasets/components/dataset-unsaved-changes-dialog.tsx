import { AlertTriangle } from 'lucide-react';
import { Trans } from '@lingui/react/macro';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface DatasetUnsavedChangesDialogProps {
  open: boolean;
  onStay: () => void;
  onLeave: () => void;
  isSaving?: boolean;
}

export function DatasetUnsavedChangesDialog({
  open,
  onStay,
  onLeave,
  isSaving,
}: Readonly<DatasetUnsavedChangesDialogProps>) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onStay()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="gap-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/30">
            <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-500" />
          </div>
          <div className="space-y-2 text-center">
            <DialogTitle className="text-xl font-semibold">
              <Trans>Unsaved changes</Trans>
            </DialogTitle>
            <DialogDescription className="text-base text-muted-foreground">
              <Trans>You have unsaved dataset changes. Are you sure you want to leave this page?</Trans>
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={onStay} className="flex-1 sm:flex-1" autoFocus>
            <Trans>Stay here</Trans>
          </Button>
          <Button
            variant="destructive"
            onClick={onLeave}
            disabled={isSaving}
            className="flex-1 sm:flex-1"
          >
            <Trans>Leave without saving</Trans>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
