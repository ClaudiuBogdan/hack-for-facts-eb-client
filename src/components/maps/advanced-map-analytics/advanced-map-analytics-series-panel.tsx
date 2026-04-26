import { ChevronDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import type { MapSupportedSeries } from '@/schemas/advanced-map-analytics';
import { AdvancedMapAnalyticsSeriesList } from './advanced-map-analytics-series-list';
import { cn } from '@/lib/utils';
import { t } from '@lingui/core/macro';

interface AdvancedMapAnalyticsSeriesPanelProps {
  series: MapSupportedSeries[];
  activeSeriesId?: string;
  selectedSeriesId?: string;
  collapsed: boolean;
  readOnly?: boolean;
  onToggleCollapsed: (collapsed: boolean) => void;
  onAddSeries: () => void;
  onSelectSeries: (seriesId: string) => void;
  onActivate: (seriesId: string, enabled: boolean) => void;
  onMakeMain: (seriesId: string) => void;
  onEdit: (seriesId: string) => void;
  onMoveUp: (seriesId: string) => void;
  onMoveDown: (seriesId: string) => void;
  onDuplicate: (seriesId: string) => void;
  onCopy: (seriesId: string) => void;
  onDelete: (seriesId: string) => void;
  onReorder: (activeSeriesId: string, overSeriesId: string) => void;
}

export function AdvancedMapAnalyticsSeriesPanel({
  series,
  activeSeriesId,
  selectedSeriesId,
  collapsed,
  readOnly = false,
  onToggleCollapsed,
  onAddSeries,
  onSelectSeries,
  onActivate,
  onMakeMain,
  onEdit,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onCopy,
  onDelete,
  onReorder,
}: Readonly<AdvancedMapAnalyticsSeriesPanelProps>) {
  return (
    <section className="py-5 border-b border-border/40">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="text-lg font-bold tracking-tight">{t`Data Series`}</h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onToggleCollapsed(!collapsed)}
              aria-label={collapsed ? t`Expand panel` : t`Collapse panel`}
            >
              <ChevronDown className={cn('h-4 w-4 transition-transform', !collapsed && 'rotate-180')} />
            </Button>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{t`${series.length} series configured`}</p>
        </div>

        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={onAddSeries}
          aria-label={t`Add series`}
          disabled={readOnly}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <Collapsible open={!collapsed} onOpenChange={(open) => onToggleCollapsed(!open)}>
        <CollapsibleContent className="space-y-2 data-[state=open]:animate-in data-[state=closed]:animate-out">
          <AdvancedMapAnalyticsSeriesList
            series={series}
            activeSeriesId={activeSeriesId}
            selectedSeriesId={selectedSeriesId}
            onSelectSeries={onSelectSeries}
            onActivate={onActivate}
            onMakeMain={onMakeMain}
            onEdit={onEdit}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onDuplicate={onDuplicate}
            onCopy={onCopy}
            onDelete={onDelete}
            onReorder={onReorder}
            onAddSeries={onAddSeries}
            readOnly={readOnly}
          />
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}
