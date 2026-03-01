import { AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { mediumLargeModalClassName, modalHeaderClassName } from '@/components/ui/modal-sizes';
import { ModalSection } from '@/components/ui/modal-section';
import type { MapSeriesWarning } from '@/lib/map-series/interfaces';
import { t } from '@lingui/core/macro';

interface AdvancedMapAnalyticsWarningsModalProps {
  open: boolean;
  warnings: MapSeriesWarning[];
  onOpenChange: (open: boolean) => void;
}

export function AdvancedMapAnalyticsWarningsModal({
  open,
  warnings,
  onOpenChange,
}: Readonly<AdvancedMapAnalyticsWarningsModalProps>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${mediumLargeModalClassName} max-w-4xl`}>
        <DialogHeader className={modalHeaderClassName}>
          <DialogTitle>{t`Warnings`}</DialogTitle>
          <DialogDescription>
            {t`Detailed warnings generated for map-series fetch and calculations.`}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto overscroll-contain px-6 py-4">
          {warnings.length === 0 ? (
            <EmptyState title={t`No warnings.`} icon={<AlertTriangle className="h-8 w-8" />} />
          ) : (
            <div className="space-y-3">
              {warnings.map((warning, index) => (
                <ModalSection key={buildWarningKey(warning, index)} className="p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{formatWarningType(warning.type)}</p>
                      <p className="text-sm text-muted-foreground break-words">{warning.message}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground md:grid-cols-2">
                    <span>{t`Series`}: {warning.seriesId || t`N/A`}</span>
                    <span>{t`Dependency`}: {warning.dependencySeriesId || t`N/A`}</span>
                    <span>{t`SIRUTA`}: {warning.sirutaCode || t`N/A`}</span>
                    <span>{t`Type`}: {warning.type}</span>
                  </div>

                  {warning.details ? (
                    <div className="rounded-md bg-muted/40 p-2">
                      <pre className="text-xs whitespace-pre-wrap break-words">
                        {JSON.stringify(warning.details, null, 2)}
                      </pre>
                    </div>
                  ) : null}
                </ModalSection>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatWarningType(type: MapSeriesWarning['type']): string {
  return type
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildWarningKey(warning: MapSeriesWarning, index: number): string {
  return `${warning.type}-${warning.seriesId ?? 'global'}-${warning.dependencySeriesId ?? 'none'}-${
    warning.sirutaCode ?? 'none'
  }-${index}`;
}
