import { ChevronDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { AdvancedMapAnalyticsBinsPreset } from '@/schemas/advanced-map-analytics';
import { AdvancedMapAnalyticsBinsPresetList } from './advanced-map-analytics-bins-preset-list';

interface AdvancedMapAnalyticsBinsPanelProps {
  collapsed: boolean;
  presets: AdvancedMapAnalyticsBinsPreset[];
  activePresetId?: string;
  readOnly?: boolean;
  onToggleCollapsed: (collapsed: boolean) => void;
  onAddPreset: () => void;
  onSetActivePreset: (presetId: string) => void;
  onEditPreset: (presetId: string) => void;
  onDeletePreset: (presetId: string) => void;
  onReorderPresets: (activePresetId: string, overPresetId: string) => void;
}

export function AdvancedMapAnalyticsBinsPanel({
  collapsed,
  presets,
  activePresetId,
  readOnly = false,
  onToggleCollapsed,
  onAddPreset,
  onSetActivePreset,
  onEditPreset,
  onDeletePreset,
  onReorderPresets,
}: Readonly<AdvancedMapAnalyticsBinsPanelProps>) {
  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="text-2xl font-bold tracking-tight">Bins</h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onToggleCollapsed(!collapsed)}
              aria-label={collapsed ? 'Expand bins panel' : 'Collapse bins panel'}
            >
              <ChevronDown className={cn('h-4 w-4 transition-transform', !collapsed && 'rotate-180')} />
            </Button>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{presets.length} presets configured</p>
        </div>

        <Button
          size="icon"
          className="h-10 w-10 shrink-0 rounded-full"
          onClick={onAddPreset}
          aria-label="Add bins preset"
          disabled={readOnly}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      <Collapsible open={!collapsed} onOpenChange={(open) => onToggleCollapsed(!open)}>
        <CollapsibleContent className="space-y-2 data-[state=open]:animate-in data-[state=closed]:animate-out">
          <AdvancedMapAnalyticsBinsPresetList
            presets={presets}
            activePresetId={activePresetId}
            onSetActive={onSetActivePreset}
            onEdit={onEditPreset}
            onDelete={onDeletePreset}
            onReorder={onReorderPresets}
            readOnly={readOnly}
          />
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}
