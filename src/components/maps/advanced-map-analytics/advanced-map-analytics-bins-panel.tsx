import { ChevronDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { AdvancedMapAnalyticsBinsPreset } from '@/schemas/advanced-map-analytics';
import { AdvancedMapAnalyticsBinsPresetList } from './advanced-map-analytics-bins-preset-list';
import { t } from '@lingui/core/macro';

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
  const presetsConfiguredLabel =
    presets.length === 1
      ? t`${presets.length} preset configured`
      : t`${presets.length} presets configured`;

  return (
    <section className="py-5 border-b border-border/40">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="text-lg font-bold tracking-tight">{t`Bins`}</h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onToggleCollapsed(!collapsed)}
              aria-label={collapsed ? t`Expand bins panel` : t`Collapse bins panel`}
            >
              <ChevronDown className={cn('h-4 w-4 transition-transform', !collapsed && 'rotate-180')} />
            </Button>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{presetsConfiguredLabel}</p>
        </div>

        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={onAddPreset}
          aria-label={t`Add bins preset`}
          disabled={readOnly}
        >
          <Plus className="h-4 w-4" />
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
            onAddPreset={onAddPreset}
            readOnly={readOnly}
          />
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}
