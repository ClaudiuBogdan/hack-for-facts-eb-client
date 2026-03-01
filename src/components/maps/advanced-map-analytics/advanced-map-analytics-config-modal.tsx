import { AlertTriangle, CheckCircle2, MapIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { ModalHeader, ModalTitle } from '@/components/ui/modal-header';
import { ModalSection } from '@/components/ui/modal-section';
import { modalSizes } from '@/components/ui/modal-sizes';
import { cn } from '@/lib/utils';
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
  const modalDescription = readOnly
    ? t`View map details and status.`
    : t`Configure the map name and review its status.`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={modalSizes.md} aria-describedby={undefined}>
        <ModalHeader align="default" variant="bordered">
          <DialogTitle asChild>
            <ModalTitle
              icon={<MapIcon className="h-6 w-6 text-primary" />}
              subtitle={modalDescription}
            >
              {t`Map Settings`}
            </ModalTitle>
          </DialogTitle>
        </ModalHeader>

        <div className="space-y-5">
          {/* Map Name Section */}
          <FormField
            label={t`Map name`}
            htmlFor="advanced-map-analytics-name-modal"
            className={readOnly ? 'opacity-70' : undefined}
          >
            <Input
              id="advanced-map-analytics-name-modal"
              value={mapName}
              onChange={(event) => onMapNameChange(event.currentTarget.value)}
              placeholder={t`My interactive budget map…`}
              autoComplete="off"
              disabled={readOnly}
            />
            <p className="text-xs text-muted-foreground">
              {readOnly
                ? t`You are viewing a shared map. Only the owner can edit the name.`
                : t`This name appears as the map title for viewers.`}
            </p>
          </FormField>

          {/* Status Section */}
          <ModalSection title={t`Map status`}>
            <div
              className={cn(
                'flex items-start gap-3 rounded-lg border p-4 transition-colors',
                hasWarnings
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-emerald-50 border-emerald-200'
              )}
            >
              {hasWarnings ? (
                <>
                  <div className="shrink-0">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-amber-900">
                        {t`Warnings detected`}
                      </p>
                      <Badge variant="warning">
                        {warningCount}
                      </Badge>
                    </div>
                    <p className="text-sm text-amber-800">
                      {warningCount === 1
                        ? t`There is 1 warning that may affect how your map is displayed.`
                        : t`There are ${warningCount} warnings that may affect how your map is displayed.`
                      }
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 hover:text-amber-950"
                      onClick={() => {
                        onOpenWarnings();
                        onOpenChange(false);
                      }}
                    >
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      {warningCount === 1
                        ? t`View 1 warning`
                        : t`View ${warningCount} warnings`}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-emerald-900">
                      {t`No issues found`}
                    </p>
                    <p className="text-sm text-emerald-800">
                      {t`Your map configuration is valid and ready to display.`}
                    </p>
                  </div>
                </>
              )}
            </div>
          </ModalSection>
        </div>
      </DialogContent>
    </Dialog>
  );
}
