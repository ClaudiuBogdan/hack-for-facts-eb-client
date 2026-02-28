import { AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { MapSeriesWarning } from '@/lib/map-series/interfaces';

interface ExperimentalMapWarningsModalProps {
  open: boolean;
  warnings: MapSeriesWarning[];
  onOpenChange: (open: boolean) => void;
}

export function ExperimentalMapWarningsModal({
  open,
  warnings,
  onOpenChange,
}: Readonly<ExperimentalMapWarningsModalProps>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(96vw,1000px)] max-w-4xl h-[min(88vh,800px)] overflow-hidden p-0 gap-0 grid-rows-[auto_minmax(0,1fr)]">
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle>Warnings</DialogTitle>
          <DialogDescription>
            Detailed warnings generated for map-series fetch and calculations.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto overscroll-contain px-6 py-4">
          {warnings.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              No warnings.
            </div>
          ) : (
            <div className="space-y-3">
              {warnings.map((warning, index) => (
                <article key={buildWarningKey(warning, index)} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <div>
                      <p className="text-sm font-semibold">{formatWarningType(warning.type)}</p>
                      <p className="text-sm text-muted-foreground break-words">{warning.message}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground md:grid-cols-2">
                    <span>Series: {warning.seriesId || 'N/A'}</span>
                    <span>Dependency: {warning.dependencySeriesId || 'N/A'}</span>
                    <span>SIRUTA: {warning.sirutaCode || 'N/A'}</span>
                    <span>Type: {warning.type}</span>
                  </div>

                  {warning.details ? (
                    <div className="rounded-md bg-muted/40 p-2">
                      <pre className="text-xs whitespace-pre-wrap break-words">
                        {JSON.stringify(warning.details, null, 2)}
                      </pre>
                    </div>
                  ) : null}
                </article>
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
