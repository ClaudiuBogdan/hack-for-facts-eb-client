import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface ExperimentalMapConfigModalProps {
  open: boolean;
  mapName: string;
  warningCount: number;
  onMapNameChange: (mapName: string) => void;
  onOpenChange: (open: boolean) => void;
  onOpenWarnings: () => void;
}

export function ExperimentalMapConfigModal({
  open,
  mapName,
  warningCount,
  onMapNameChange,
  onOpenChange,
  onOpenWarnings,
}: Readonly<ExperimentalMapConfigModalProps>) {
  const hasWarnings = warningCount > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Map Config</DialogTitle>
          <DialogDescription>
            Update the map title and review the current experimental map configuration.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg border">
            <div className="flex items-center justify-between border-b px-3 py-2.5 text-sm">
              <span className="font-medium">Map name</span>
              <Input
                value={mapName}
                onChange={(event) => onMapNameChange(event.currentTarget.value)}
                className="h-8 max-w-[300px]"
                name="experimental-map-name-modal"
                autoComplete="off"
                aria-label="Map name"
                placeholder="Map name…"
              />
            </div>
            <div className="flex items-center justify-between border-b px-3 py-2.5 text-sm">
              <span className="font-medium">Warnings</span>
              <span className="text-muted-foreground">{warningCount}</span>
            </div>
          </div>

          {hasWarnings ? (
            <Button
              type="button"
              variant="outline"
              className="w-full justify-center border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
              onClick={() => {
                onOpenWarnings();
                onOpenChange(false);
              }}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              View warnings
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
