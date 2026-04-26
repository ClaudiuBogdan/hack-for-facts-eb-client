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
import { Plus } from 'lucide-react';
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
  onAddPreset?: () => void;
}

export function AdvancedMapAnalyticsBinsPresetList({
  presets,
  activePresetId,
  readOnly = false,
  onSetActive,
  onEdit,
  onDelete,
  onReorder,
  onAddPreset,
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
      <button
        type="button"
        onClick={onAddPreset}
        disabled={readOnly || !onAddPreset}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
      >
        <Plus className="h-4 w-4" />
        {t`Add new preset`}
      </button>
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
