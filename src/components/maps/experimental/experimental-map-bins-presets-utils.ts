import type { ExperimentalMapBinsPreset } from '@/schemas/experimental-map';

const DEFAULT_PRESET_LABEL_PREFIX = 'Bins preset';

export function reorderBinsPresetsByIds(
  presetList: ExperimentalMapBinsPreset[],
  activePresetId: string,
  overPresetId: string
): ExperimentalMapBinsPreset[] {
  if (activePresetId === overPresetId) {
    return presetList;
  }

  const currentIndex = presetList.findIndex((preset) => preset.id === activePresetId);
  const nextIndex = presetList.findIndex((preset) => preset.id === overPresetId);

  if (currentIndex === -1 || nextIndex === -1) {
    return presetList;
  }

  const reordered = [...presetList];
  const [movedPreset] = reordered.splice(currentIndex, 1);
  if (!movedPreset) {
    return presetList;
  }

  reordered.splice(nextIndex, 0, movedPreset);
  return reordered;
}

export function getNextBinsPresetLabel(presets: ExperimentalMapBinsPreset[]): string {
  return `${DEFAULT_PRESET_LABEL_PREFIX} ${presets.length + 1}`;
}
