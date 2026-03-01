import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, MoreVertical, Palette, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { AdvancedMapAnalyticsBinsPreset } from '@/schemas/advanced-map-analytics';
import { t } from '@lingui/core/macro';

interface AdvancedMapAnalyticsBinsPresetListItemProps {
  preset: AdvancedMapAnalyticsBinsPreset;
  isActive: boolean;
  readOnly?: boolean;
  onSetActive: (presetId: string) => void;
  onEdit: (presetId: string) => void;
  onDelete: (presetId: string) => void;
}

export const AdvancedMapAnalyticsBinsPresetListItem = memo(function AdvancedMapAnalyticsBinsPresetListItem({
  preset,
  isActive,
  readOnly = false,
  onSetActive,
  onEdit,
  onDelete,
}: Readonly<AdvancedMapAnalyticsBinsPresetListItemProps>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: preset.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 'auto',
  };

  const displayLabel = preset.label.trim().length > 0 ? preset.label : t`Bins preset`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center justify-between gap-3 rounded-xl border bg-background/70 px-3 py-2.5',
        isDragging && 'shadow-md'
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {readOnly ? (
          <span className="text-muted-foreground">
            <GripVertical className="h-4 w-4" />
          </span>
        ) : (
          <button
            type="button"
            aria-label={t`Reorder bins preset`}
            className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
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
              ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
              : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted/70'
          )}
          onClick={(event) => {
            event.stopPropagation();
            onSetActive(preset.id);
          }}
          aria-label={isActive ? t`Unset active bins preset` : t`Set active bins preset`}
          disabled={readOnly}
        >
          <Palette className="h-3.5 w-3.5" />
        </Button>

        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => onEdit(preset.id)}
          aria-label={t`Edit bins preset`}
          disabled={readOnly}
        >
          <p className="truncate text-sm font-semibold" title={displayLabel}>
            {displayLabel}
          </p>
          <p className="text-xs text-muted-foreground">{preset.id.slice(0, 6)}</p>
        </button>
      </div>

      {!readOnly ? (
        <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            aria-label={t`Open bins preset menu`}
            onClick={(event) => event.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
          <DropdownMenuItem onSelect={() => onEdit(preset.id)}>
            <Pencil className="mr-2 h-4 w-4" />
            {t`Edit`}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => onDelete(preset.id)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t`Delete`}
          </DropdownMenuItem>
        </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
});
