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
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { ExperimentalMapBinsPreset } from '@/schemas/experimental-map';
import { ExperimentalMapBinsPresetListItem } from './experimental-map-bins-preset-list-item';

interface ExperimentalMapBinsPresetListProps {
  presets: ExperimentalMapBinsPreset[];
  activePresetId?: string;
  onSetActive: (presetId: string) => void;
  onEdit: (presetId: string) => void;
  onDelete: (presetId: string) => void;
  onReorder: (activePresetId: string, overPresetId: string) => void;
}

export function ExperimentalMapBinsPresetList({
  presets,
  activePresetId,
  onSetActive,
  onEdit,
  onDelete,
  onReorder,
}: Readonly<ExperimentalMapBinsPresetListProps>) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const overId = event.over?.id;
    if (!overId) {
      return;
    }

    const sourceId = String(event.active.id);
    const targetId = String(overId);

    if (sourceId === targetId) {
      return;
    }

    onReorder(sourceId, targetId);
  };

  if (presets.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
        No bins presets configured yet.
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={presets.map((preset) => preset.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2.5">
          {presets.map((preset) => (
            <ExperimentalMapBinsPresetListItem
              key={preset.id}
              preset={preset}
              isActive={preset.id === activePresetId}
              onSetActive={onSetActive}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
