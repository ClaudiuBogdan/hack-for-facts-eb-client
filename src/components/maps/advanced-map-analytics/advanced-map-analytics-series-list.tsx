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
import type { MapSupportedSeries } from '@/schemas/advanced-map-analytics';
import { AdvancedMapAnalyticsSeriesListItem } from './advanced-map-analytics-series-list-item';

interface AdvancedMapAnalyticsSeriesListProps {
  series: MapSupportedSeries[];
  activeSeriesId?: string;
  readOnly?: boolean;
  onSetActive: (seriesId: string) => void;
  onToggleEnabled: (seriesId: string, enabled: boolean) => void;
  onEdit: (seriesId: string) => void;
  onDelete: (seriesId: string) => void;
  onReorder: (activeSeriesId: string, overSeriesId: string) => void;
}

export function AdvancedMapAnalyticsSeriesList({
  series,
  activeSeriesId,
  readOnly = false,
  onSetActive,
  onToggleEnabled,
  onEdit,
  onDelete,
  onReorder,
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
      <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
        No series configured yet.
      </div>
    );
  }

  const renderedItems = (
    <div className="space-y-2.5">
      {series.map((item) => (
        <AdvancedMapAnalyticsSeriesListItem
          key={item.id}
          series={item}
          isActive={item.id === activeSeriesId}
          readOnly={readOnly}
          onSetActive={onSetActive}
          onToggleEnabled={onToggleEnabled}
          onEdit={onEdit}
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
