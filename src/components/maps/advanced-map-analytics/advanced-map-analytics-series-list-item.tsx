import { memo, type MouseEvent } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, Copy, GripVertical, MoreVertical, Pencil, Star, ToggleLeft, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { MapSupportedSeries } from '@/schemas/advanced-map-analytics';
import { SERIES_TYPE_ICONS, SERIES_TYPE_LABELS } from './advanced-map-analytics-series-utils';
import { t } from '@lingui/core/macro';

interface AdvancedMapAnalyticsSeriesListItemProps {
  series: MapSupportedSeries;
  isActive: boolean;
  isSelected: boolean;
  isMoveUpDisabled: boolean;
  isMoveDownDisabled: boolean;
  readOnly?: boolean;
  onSelectSeries: (seriesId: string) => void;
  onMakeMain: (seriesId: string) => void;
  onActivate: (seriesId: string, enabled: boolean) => void;
  onEdit: (seriesId: string) => void;
  onMoveUp: (seriesId: string) => void;
  onMoveDown: (seriesId: string) => void;
  onDuplicate: (seriesId: string) => void;
  onCopy: (seriesId: string) => void;
  onDelete: (seriesId: string) => void;
}

export const AdvancedMapAnalyticsSeriesListItem = memo(function AdvancedMapAnalyticsSeriesListItem({
  series,
  isActive,
  isSelected,
  isMoveUpDisabled,
  isMoveDownDisabled,
  readOnly = false,
  onSelectSeries,
  onMakeMain,
  onActivate,
  onEdit,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onCopy,
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
  const stopMenuItemClickPropagation = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center justify-between gap-3 rounded-xl border bg-background/70 px-3 py-2.5',
        isSelected && 'border-primary bg-primary/5',
        isDragging && 'shadow-md'
      )}
      onClick={() => onSelectSeries(series.id)}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {readOnly ? (
          <span className="text-muted-foreground">
            <GripVertical className="h-4 w-4" />
          </span>
        ) : (
          <button
            type="button"
            aria-label={t`Reorder series`}
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
            onSelectSeries(series.id);
            onMakeMain(series.id);
          }}
          aria-label={isActive ? t`Series is active` : t`Set active series`}
          disabled={readOnly}
        >
          <TypeIcon className="h-3.5 w-3.5" />
        </Button>

        <button
          type="button"
          className="flex-1 min-w-0 text-left"
          onClick={() => {
            onSelectSeries(series.id);
            onEdit(series.id);
          }}
          aria-label={t`Edit series`}
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
          onCheckedChange={(checked) => onActivate(series.id, checked)}
          aria-label={series.enabled ? t`Disable series` : t`Enable series`}
          disabled={readOnly}
        />

        {!readOnly ? (
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              aria-label={t`Open row menu`}
              onClick={(event) => event.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
            <DropdownMenuItem
              onSelect={() => {
                onSelectSeries(series.id);
                onEdit(series.id);
              }}
              onClick={stopMenuItemClickPropagation}
            >
              <Pencil className="mr-2 h-4 w-4" />
              {t`Edit`}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                onSelectSeries(series.id);
                onMakeMain(series.id);
              }}
              onClick={stopMenuItemClickPropagation}
              disabled={isActive}
            >
              <Star className="mr-2 h-4 w-4" />
              {t`Make main`}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                onSelectSeries(series.id);
                onActivate(series.id, !series.enabled);
              }}
              onClick={stopMenuItemClickPropagation}
            >
              <ToggleLeft className="mr-2 h-4 w-4" />
              {series.enabled ? t`Deactivate` : t`Activate`}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={isMoveUpDisabled}
              onSelect={() => {
                onSelectSeries(series.id);
                onMoveUp(series.id);
              }}
              onClick={stopMenuItemClickPropagation}
            >
              <ArrowUp className="mr-2 h-4 w-4" />
              {t`Move up`}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isMoveDownDisabled}
              onSelect={() => {
                onSelectSeries(series.id);
                onMoveDown(series.id);
              }}
              onClick={stopMenuItemClickPropagation}
            >
              <ArrowDown className="mr-2 h-4 w-4" />
              {t`Move down`}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                onSelectSeries(series.id);
                onDuplicate(series.id);
              }}
              onClick={stopMenuItemClickPropagation}
            >
              <Copy className="mr-2 h-4 w-4" />
              {t`Duplicate`}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                onSelectSeries(series.id);
                onCopy(series.id);
              }}
              onClick={stopMenuItemClickPropagation}
            >
              <Copy className="mr-2 h-4 w-4" />
              {t`Copy`}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => {
                onSelectSeries(series.id);
                onDelete(series.id);
              }}
              onClick={stopMenuItemClickPropagation}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t`Delete`}
            </DropdownMenuItem>
          </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </div>
  );
});
