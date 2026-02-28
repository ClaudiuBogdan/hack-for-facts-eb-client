import { AlertTriangle, ChevronDown, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ExperimentalMapConfigPanelProps {
  collapsed: boolean;
  mapName: string;
  warningCount: number;
  onToggleCollapsed: (collapsed: boolean) => void;
  onMapNameChange: (mapName: string) => void;
  onOpenConfig: () => void;
  onOpenWarnings: () => void;
}

export function ExperimentalMapConfigPanel({
  collapsed,
  mapName,
  warningCount,
  onToggleCollapsed,
  onMapNameChange,
  onOpenConfig,
  onOpenWarnings,
}: Readonly<ExperimentalMapConfigPanelProps>) {
  const hasWarnings = warningCount > 0;

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="text-2xl font-bold tracking-tight">Config</h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onToggleCollapsed(!collapsed)}
              aria-label={collapsed ? 'Expand config panel' : 'Collapse config panel'}
            >
              <ChevronDown className={cn('h-4 w-4 transition-transform', !collapsed && 'rotate-180')} />
            </Button>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Quick settings</p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="shrink-0"
          onClick={onOpenConfig}
          aria-label="Open config modal"
        >
          <Settings2 className="mr-2 h-4 w-4" />
          Open Config
        </Button>
      </div>

      <Collapsible open={!collapsed} onOpenChange={(open) => onToggleCollapsed(!open)}>
        <CollapsibleContent className="space-y-2 data-[state=open]:animate-in data-[state=closed]:animate-out">
          <div className="rounded-xl border bg-muted/20">
            <div className="flex items-center justify-between gap-3 border-b px-3 py-2.5">
              <span className="text-sm font-medium">Map name</span>
              <Input
                value={mapName}
                onChange={(event) => onMapNameChange(event.currentTarget.value)}
                className="h-8 max-w-[240px]"
                name="experimental-map-name"
                autoComplete="off"
                aria-label="Map name"
                placeholder="Map name…"
              />
            </div>
            <div className="flex items-center justify-between gap-3 px-3 py-2.5">
              <span className="text-sm font-medium">Warnings</span>
              {hasWarnings ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                  onClick={onOpenWarnings}
                >
                  <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
                  {warningCount} warning{warningCount === 1 ? '' : 's'}
                </Button>
              ) : (
                <span className="text-sm text-muted-foreground">No warnings</span>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}
