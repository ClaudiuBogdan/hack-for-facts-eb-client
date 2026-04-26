import { useState } from 'react';
import { AlertTriangle, ChevronDown, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { AdvancedMapAnalyticsDescriptionModal } from './advanced-map-analytics-description-modal';
import { t } from '@lingui/core/macro';

interface AdvancedMapAnalyticsConfigPanelProps {
  collapsed: boolean;
  mapName: string;
  showCountyBoundaries: boolean;
  mapDescription?: string;
  warningCount: number;
  readOnly?: boolean;
  onToggleCollapsed: (collapsed: boolean) => void;
  onShowCountyBoundariesChange: (enabled: boolean) => void;
  onOpenConfig: () => void;
  onOpenWarnings: () => void;
}

export function AdvancedMapAnalyticsConfigPanel({
  collapsed,
  mapName,
  showCountyBoundaries,
  mapDescription = '',
  warningCount,
  readOnly = false,
  onToggleCollapsed,
  onShowCountyBoundariesChange,
  onOpenConfig,
  onOpenWarnings,
}: Readonly<AdvancedMapAnalyticsConfigPanelProps>) {
  const hasWarnings = warningCount > 0;
  const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);
  const trimmedMapDescription = mapDescription.trim();
  const hasMapDescription = trimmedMapDescription.length > 0;

  return (
    <section className="py-5 border-b border-border/40">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="text-lg font-bold tracking-tight">{t`Config`}</h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onToggleCollapsed(!collapsed)}
              aria-label={collapsed ? t`Expand config panel` : t`Collapse config panel`}
            >
              <ChevronDown className={cn('h-4 w-4 transition-transform', !collapsed && 'rotate-180')} />
            </Button>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{t`Quick settings`}</p>
        </div>

        <div className="flex items-center gap-1">
          {hasWarnings ? (
            <Button
              variant="ghost"
              size="icon"
              className="relative h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-500 dark:hover:bg-amber-950/50"
              onClick={onOpenWarnings}
              aria-label={warningCount === 1 ? t`${warningCount} warning` : t`${warningCount} warnings`}
            >
              <AlertTriangle className="h-4 w-4" />
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white">
                {warningCount}
              </span>
            </Button>
          ) : null}

          {!readOnly ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onOpenConfig}
              aria-label={t`Open config modal`}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>

      <Collapsible open={!collapsed} onOpenChange={(open) => onToggleCollapsed(!open)}>
        <CollapsibleContent className="space-y-5 data-[state=open]:animate-in data-[state=closed]:animate-out">
          {/* Map title */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t`Map name`}</p>
            <p className="truncate text-lg font-semibold tracking-tight" title={mapName}>
              {mapName}
            </p>
            {hasMapDescription ? (
              <button
                type="button"
                onClick={() => setIsDescriptionModalOpen(true)}
                className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
              >
                {t`Read more`}
              </button>
            ) : null}
          </div>

          {/* County boundaries */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">{t`County boundaries`}</span>
            <Switch
              checked={showCountyBoundaries}
              onCheckedChange={onShowCountyBoundariesChange}
              disabled={readOnly}
              aria-label={t`Toggle county boundaries`}
            />
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
