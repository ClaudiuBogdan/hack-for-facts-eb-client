import type { AdvancedMapDatasetJsonItem } from '@/features/advanced-map-datasets/types';

/**
 * A dataset cell's typed payload as text. Kept apart from `draft.ts`, whose
 * spreadsheet import pulls in SheetJS and Papa Parse: the read-only map views
 * that show a payload never parse a file.
 */
export function formatAdvancedMapDatasetJsonValue(
  valueJson: AdvancedMapDatasetJsonItem | null | undefined
): string {
  if (!valueJson) {
    return '';
  }

  if (valueJson.type === 'text') {
    return valueJson.value.text;
  }

  if (valueJson.type === 'markdown') {
    return valueJson.value.markdown;
  }

  const label = valueJson.value.label?.trim() ?? '';
  return label.length > 0 ? `[${label}](${valueJson.value.url})` : valueJson.value.url;
}
