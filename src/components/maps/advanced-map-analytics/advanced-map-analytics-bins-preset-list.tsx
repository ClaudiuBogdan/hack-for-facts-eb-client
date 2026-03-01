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
import type { AdvancedMapAnalyticsBinsPreset } from '@/schemas/advanced-map-analytics';
import { AdvancedMapAnalyticsBinsPresetListItem } from './advanced-map-analytics-bins-preset-list-item';
import { t } from '@lingui/core/macro';

interface AdvancedMapAnalyticsBinsPresetListProps {
  presets: AdvancedMapAnalyticsBinsPreset[];
  activePresetId?: string;
  readOnly?: boolean;
  onSetActive: (presetId: string) => void;
  onEdit: (presetId: string) => void;
  onDelete: (presetId: string) => void;
  onReorder: (activePresetId: string, overPresetId: string) => void;
}

export function AdvancedMapAnalyticsBinsPresetList({
  presets,
  activePresetId,
  readOnly = false,
  onSetActive,
  onEdit,
  onDelete,
  onReorder,
}: Readonly<AdvancedMapAnalyticsBinsPresetListProps>) {
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
        {t`No bins presets configured yet.`}
      </div>
    );
  }

  const renderedItems = (
    <div className="space-y-2.5">
      {presets.map((preset) => (
        <AdvancedMapAnalyticsBinsPresetListItem
          key={preset.id}
          preset={preset}
          isActive={preset.id === activePresetId}
          readOnly={readOnly}
          onSetActive={onSetActive}
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
      <SortableContext items={presets.map((preset) => preset.id)} strategy={verticalListSortingStrategy}>
        {renderedItems}
      </SortableContext>
    </DndContext>
  );
}
