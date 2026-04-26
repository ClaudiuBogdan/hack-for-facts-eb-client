import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import type { MapSupportedSeries } from '@/schemas/advanced-map-analytics';
import { AdvancedMapAnalyticsSeriesListItem } from './advanced-map-analytics-series-list-item';
import { t } from '@lingui/core/macro';

interface AdvancedMapAnalyticsSeriesListProps {
  series: MapSupportedSeries[];
  activeSeriesId?: string;
  selectedSeriesId?: string;
  readOnly?: boolean;
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
  onAddSeries?: () => void;
}

export function AdvancedMapAnalyticsSeriesList({
  series,
  activeSeriesId,
  selectedSeriesId,
  readOnly = false,
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
  onAddSeries,
}: Readonly<AdvancedMapAnalyticsSeriesListProps>) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const overId = event.over?.id;
    if (!overId) {
      return;
    }

    const activeId = String(event.active.id);
    const targetId = String(overId);

    if (activeId === targetId) {
      return;
    }

    onReorder(activeId, targetId);
  };

  if (series.length === 0) {
    return (
      <button
        type="button"
        onClick={onAddSeries}
        disabled={readOnly || !onAddSeries}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
      >
        <Plus className="h-4 w-4" />
        {t`Add new series`}
      </button>
    );
  }

  const renderedItems = (
    <div className="space-y-2.5">
      {series.map((item, index) => (
        <AdvancedMapAnalyticsSeriesListItem
          key={item.id}
          series={item}
          isActive={item.id === activeSeriesId}
          isSelected={item.id === selectedSeriesId}
          isMoveUpDisabled={index === 0}
          isMoveDownDisabled={index === series.length - 1}
          readOnly={readOnly}
          onSelectSeries={onSelectSeries}
          onActivate={onActivate}
          onMakeMain={onMakeMain}
          onEdit={onEdit}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onDuplicate={onDuplicate}
          onCopy={onCopy}
          onDelete={onDelete}
        />
      ))}
    </div>
  );

  if (readOnly) {
    return renderedItems;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={series.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        {renderedItems}
      </SortableContext>
    </DndContext>
  );
}
