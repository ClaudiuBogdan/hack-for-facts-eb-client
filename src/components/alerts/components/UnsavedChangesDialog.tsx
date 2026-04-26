import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { Trans } from '@lingui/react/macro';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface UnsavedChangesDialogProps {
  open: boolean;
  onStay: () => void;
  onLeave: () => void;
  isSaving?: boolean;
}

export function UnsavedChangesDialog({ open, onStay, onLeave, isSaving }: UnsavedChangesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onStay()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader className="gap-2 text-left sm:text-left">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">
              <Trans>Unsaved changes</Trans>
            </span>
          </div>
          <DialogTitle className="text-lg font-semibold tracking-tight">
            <Trans>Leave without saving?</Trans>
          </DialogTitle>
          <DialogDescription className="text-sm">
            <Trans>You have unsaved changes. Are you sure you want to leave this page?</Trans>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onStay} autoFocus>
            <Trans>Stay here</Trans>
          </Button>
          <Button
            variant="destructive"
            onClick={onLeave}
            disabled={isSaving}
          >
            <Trans>Leave without saving</Trans>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
