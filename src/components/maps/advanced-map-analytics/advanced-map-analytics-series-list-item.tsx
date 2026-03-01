import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { MapSupportedSeries } from '@/schemas/advanced-map-analytics';
import { SERIES_TYPE_ICONS, SERIES_TYPE_LABELS } from './advanced-map-analytics-series-utils';

interface AdvancedMapAnalyticsSeriesListItemProps {
  series: MapSupportedSeries;
  isActive: boolean;
  readOnly?: boolean;
  onSetActive: (seriesId: string) => void;
  onToggleEnabled: (seriesId: string, enabled: boolean) => void;
  onEdit: (seriesId: string) => void;
  onDelete: (seriesId: string) => void;
}

export const AdvancedMapAnalyticsSeriesListItem = memo(function AdvancedMapAnalyticsSeriesListItem({
  series,
  isActive,
  readOnly = false,
  onSetActive,
  onToggleEnabled,
  onEdit,
  onDelete,
}: Readonly<AdvancedMapAnalyticsSeriesListItemProps>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: series.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 'auto',
  };

  const TypeIcon = SERIES_TYPE_ICONS[series.type];
  const typeLabel = SERIES_TYPE_LABELS[series.type];
  const displayLabel = series.label?.trim() || typeLabel;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center justify-between gap-3 rounded-xl border bg-background/70 px-3 py-2.5',
        isDragging && 'shadow-md'
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {readOnly ? (
          <span className="text-muted-foreground">
            <GripVertical className="h-4 w-4" />
          </span>
        ) : (
          <button
            type="button"
            aria-label="Reorder series"
            className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
            onClick={(event) => event.stopPropagation()}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}

        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={cn(
            'h-7 w-7 rounded-full border shadow-sm',
            isActive
              ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
              : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted/70'
          )}
          onClick={(event) => {
            event.stopPropagation();
            onSetActive(series.id);
          }}
          aria-label={isActive ? 'Series is active' : 'Set active series'}
          disabled={readOnly}
        >
          <TypeIcon className="h-3.5 w-3.5" />
        </Button>

        <button
          type="button"
          className="flex-1 min-w-0 text-left"
          onClick={() => onEdit(series.id)}
          aria-label="Edit series"
          disabled={readOnly}
        >
          <p className="truncate text-sm font-semibold" title={displayLabel}>
            {displayLabel}
          </p>
          <p className="text-xs text-muted-foreground">{series.id.slice(0, 6)}</p>
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        <Switch
          checked={series.enabled}
          onClick={(event) => event.stopPropagation()}
          onCheckedChange={(checked) => onToggleEnabled(series.id, checked)}
          aria-label={series.enabled ? 'Disable series' : 'Enable series'}
          disabled={readOnly}
        />

        {!readOnly ? (
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              aria-label="Open row menu"
              onClick={(event) => event.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
            <DropdownMenuItem onSelect={() => onEdit(series.id)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => onDelete(series.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </div>
  );
});
