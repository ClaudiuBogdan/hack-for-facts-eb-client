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
import type { MapSupportedSeries } from '@/schemas/experimental-map';
import { ExperimentalMapSeriesListItem } from './experimental-map-series-list-item';

interface ExperimentalMapSeriesListProps {
  series: MapSupportedSeries[];
  activeSeriesId?: string;
  onSetActive: (seriesId: string) => void;
  onToggleEnabled: (seriesId: string, enabled: boolean) => void;
  onEdit: (seriesId: string) => void;
  onDelete: (seriesId: string) => void;
  onReorder: (activeSeriesId: string, overSeriesId: string) => void;
}

export function ExperimentalMapSeriesList({
  series,
  activeSeriesId,
  onSetActive,
  onToggleEnabled,
  onEdit,
  onDelete,
  onReorder,
}: Readonly<ExperimentalMapSeriesListProps>) {
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

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={series.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2.5">
          {series.map((item) => (
            <ExperimentalMapSeriesListItem
              key={item.id}
              series={item}
              isActive={item.id === activeSeriesId}
              onSetActive={onSetActive}
              onToggleEnabled={onToggleEnabled}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
