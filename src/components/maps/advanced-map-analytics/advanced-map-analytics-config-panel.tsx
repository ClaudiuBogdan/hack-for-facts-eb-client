import { useState } from 'react';
import { AlertTriangle, ChevronDown, MapIcon, Settings2, TableIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { AdvancedMapAnalyticsActiveView } from '@/schemas/advanced-map-analytics';
import { ViewTypeRadioGroup } from '@/components/filters/ViewTypeRadioGroup';
import { AdvancedMapAnalyticsDescriptionModal } from './advanced-map-analytics-description-modal';

interface AdvancedMapAnalyticsConfigPanelProps {
  collapsed: boolean;
  activeView: AdvancedMapAnalyticsActiveView;
  mapName: string;
  mapDescription?: string;
  warningCount: number;
  readOnly?: boolean;
  onToggleCollapsed: (collapsed: boolean) => void;
  onActiveViewChange: (view: AdvancedMapAnalyticsActiveView) => void;
  onOpenConfig: () => void;
  onOpenWarnings: () => void;
}

export function AdvancedMapAnalyticsConfigPanel({
  collapsed,
  activeView,
  mapName,
  mapDescription = '',
  warningCount,
  readOnly = false,
  onToggleCollapsed,
  onActiveViewChange,
  onOpenConfig,
  onOpenWarnings,
}: Readonly<AdvancedMapAnalyticsConfigPanelProps>) {
  const hasWarnings = warningCount > 0;
  const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);
  const trimmedMapDescription = mapDescription.trim();
  const hasMapDescription = trimmedMapDescription.length > 0;

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

        {!readOnly ? (
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
        ) : null}
      </div>

      <Collapsible open={!collapsed} onOpenChange={(open) => onToggleCollapsed(!open)}>
        <CollapsibleContent className="space-y-2 data-[state=open]:animate-in data-[state=closed]:animate-out">
          <div className="rounded-xl border bg-muted/20">
            <div className="border-b px-3 py-2.5">
              <p className="truncate text-sm font-medium" title={mapName}>
                {mapName}
              </p>
            </div>
            <div className="border-b px-3 py-2.5">
              <div className="mb-2 text-sm font-medium">View</div>
              <ViewTypeRadioGroup
                value={activeView}
                onChange={onActiveViewChange}
                viewOptions={[
                  { id: 'map', label: 'Map', icon: MapIcon },
                  { id: 'table', label: 'Table', icon: TableIcon },
                ]}
                ariaLabel="Advanced map analytics active view"
              />
            </div>
            <div className="border-b px-3 py-2.5">
              <Button
                type="button"
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={() => setIsDescriptionModalOpen(true)}
                disabled={!hasMapDescription}
              >
                Read more
              </Button>
            </div>
            {hasWarnings ? (
              <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                <span className="text-sm font-medium">Warnings</span>
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
              </div>
            ) : null}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <AdvancedMapAnalyticsDescriptionModal
        open={isDescriptionModalOpen}
        onOpenChange={setIsDescriptionModalOpen}
        description={mapDescription}
        mode="preview"
      />

    </section>
  );
}
