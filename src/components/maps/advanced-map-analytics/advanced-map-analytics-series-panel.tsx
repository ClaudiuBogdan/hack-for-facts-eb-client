import { ChevronDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import type { MapSupportedSeries } from '@/schemas/advanced-map-analytics';
import { AdvancedMapAnalyticsSeriesList } from './advanced-map-analytics-series-list';
import { cn } from '@/lib/utils';

interface AdvancedMapAnalyticsSeriesPanelProps {
  series: MapSupportedSeries[];
  activeSeriesId?: string;
  collapsed: boolean;
  readOnly?: boolean;
  onToggleCollapsed: (collapsed: boolean) => void;
  onAddSeries: () => void;
  onSetActive: (seriesId: string) => void;
  onToggleEnabled: (seriesId: string, enabled: boolean) => void;
  onEdit: (seriesId: string) => void;
  onDelete: (seriesId: string) => void;
  onReorder: (activeSeriesId: string, overSeriesId: string) => void;
}

export function AdvancedMapAnalyticsSeriesPanel({
  series,
  activeSeriesId,
  collapsed,
  readOnly = false,
  onToggleCollapsed,
  onAddSeries,
  onSetActive,
  onToggleEnabled,
  onEdit,
  onDelete,
  onReorder,
}: Readonly<AdvancedMapAnalyticsSeriesPanelProps>) {
  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="text-2xl font-bold tracking-tight">Data Series</h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onToggleCollapsed(!collapsed)}
              aria-label={collapsed ? 'Expand panel' : 'Collapse panel'}
            >
              <ChevronDown className={cn('h-4 w-4 transition-transform', !collapsed && 'rotate-180')} />
            </Button>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{series.length} series configured</p>
        </div>

        <Button
          size="icon"
          className="h-10 w-10 shrink-0 rounded-full"
          onClick={onAddSeries}
          aria-label="Add series"
          disabled={readOnly}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      <Collapsible open={!collapsed} onOpenChange={(open) => onToggleCollapsed(!open)}>
        <CollapsibleContent className="space-y-2 data-[state=open]:animate-in data-[state=closed]:animate-out">
          <AdvancedMapAnalyticsSeriesList
            series={series}
            activeSeriesId={activeSeriesId}
            onSetActive={onSetActive}
            onToggleEnabled={onToggleEnabled}
            onEdit={onEdit}
            onDelete={onDelete}
            onReorder={onReorder}
            readOnly={readOnly}
          />
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}
