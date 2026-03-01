import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { t } from '@lingui/core/macro';

interface AdvancedMapAnalyticsConfigModalProps {
  open: boolean;
  mapName: string;
  warningCount: number;
  readOnly?: boolean;
  onMapNameChange: (mapName: string) => void;
  onOpenChange: (open: boolean) => void;
  onOpenWarnings: () => void;
}

export function AdvancedMapAnalyticsConfigModal({
  open,
  mapName,
  warningCount,
  readOnly = false,
  onMapNameChange,
  onOpenChange,
  onOpenWarnings,
}: Readonly<AdvancedMapAnalyticsConfigModalProps>) {
  const hasWarnings = warningCount > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t`Map Config`}</DialogTitle>
          <DialogDescription>
            {readOnly
              ? t`Review the current map configuration.`
              : t`Update the map title and review the current advanced map analytics configuration.`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg border">
            <div className="flex items-center justify-between border-b px-3 py-2.5 text-sm">
              <span className="font-medium">{t`Map name`}</span>
              <Input
                value={mapName}
                onChange={(event) => onMapNameChange(event.currentTarget.value)}
                className="h-8 max-w-[300px]"
                name="advanced-map-analytics-name-modal"
                autoComplete="off"
                aria-label={t`Map name`}
                placeholder={t`Map name…`}
                disabled={readOnly}
              />
            </div>
            <div className="flex items-center justify-between border-b px-3 py-2.5 text-sm">
              <span className="font-medium">{t`Warnings`}</span>
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
              {t`View warnings`}
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
