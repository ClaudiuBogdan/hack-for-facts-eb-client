import { useMemo } from 'react';
import {
  buildDiscretePaletteFromConfig,
  classifySeriesValues,
  NO_DATA_GROUP_ID,
  validateBinsConfig,
} from '@/lib/map-bins/bins';
import type {
  ExperimentalMapBinsFilterSection,
  ExperimentalMapBinsFilterSelectionByPresetId,
  ExperimentalMapTableRow,
} from '@/components/maps/experimental/experimental-map-table-types';
import type { ExperimentalMapBinsPreset } from '@/schemas/experimental-map';

interface UseExperimentalMapTableBinsFilterArgs {
  rows: ExperimentalMapTableRow[];
  binsPresets: ExperimentalMapBinsPreset[];
  activeValues: Map<string, number | undefined> | undefined;
  tableBinFiltersByPresetId: ExperimentalMapBinsFilterSelectionByPresetId;
}

interface UseExperimentalMapTableBinsFilterResult {
  filteredRows: ExperimentalMapTableRow[];
  binsFilterSections: ExperimentalMapBinsFilterSection[];
  hasActiveBinFilters: boolean;
}

export function deriveExperimentalMapTableBinsFilter({
  rows,
  binsPresets,
  activeValues,
  tableBinFiltersByPresetId,
}: Readonly<UseExperimentalMapTableBinsFilterArgs>): UseExperimentalMapTableBinsFilterResult {
  const selectedGroupIdsByPresetId = new Map<string, Set<string>>();
  const groupIdBySirutaCodeByPresetId = new Map<string, Map<string, string>>();
  const binsFilterSections: ExperimentalMapBinsFilterSection[] = [];

  for (const preset of binsPresets) {
    const validationResult = validateBinsConfig(preset.config);
    const palette = buildDiscretePaletteFromConfig(preset.config);
    const availableGroupIds = new Set(palette.map((entry) => entry.groupId));
    const selectedGroupIds = (tableBinFiltersByPresetId[preset.id] ?? []).filter((groupId) =>
      availableGroupIds.has(groupId)
    );
    const selectedGroupIdsSet = new Set(selectedGroupIds);
    const isPresetValid = validationResult.isValid;

    binsFilterSections.push({
      presetId: preset.id,
      presetLabel: preset.label.trim().length > 0 ? preset.label : 'Bins preset',
      options: palette.map((entry) => ({
        groupId: entry.groupId,
        label: entry.label,
        color: entry.color,
        checked: selectedGroupIdsSet.has(entry.groupId),
      })),
      disabledReason: isPresetValid ? undefined : 'Invalid bins config',
    });

    if (!isPresetValid) {
      continue;
    }

    if (selectedGroupIdsSet.size > 0) {
      selectedGroupIdsByPresetId.set(preset.id, selectedGroupIdsSet);
    }

    const classificationResult = classifySeriesValues(activeValues, preset.config);
    const groupIdBySirutaCode = new Map<string, string>();
    for (const [sirutaCode, classification] of classificationResult.groupsBySiruta.entries()) {
      groupIdBySirutaCode.set(sirutaCode, classification.groupId);
    }
    groupIdBySirutaCodeByPresetId.set(preset.id, groupIdBySirutaCode);
  }

  if (selectedGroupIdsByPresetId.size === 0) {
    return {
      filteredRows: rows,
      binsFilterSections,
      hasActiveBinFilters: Object.values(tableBinFiltersByPresetId).some(
        (groupIds) => groupIds.length > 0
      ),
    };
  }

  const filteredRows = rows.filter((row) => {
    for (const [presetId, selectedGroupIds] of selectedGroupIdsByPresetId.entries()) {
      const groupId =
        groupIdBySirutaCodeByPresetId.get(presetId)?.get(row.sirutaCode) ?? NO_DATA_GROUP_ID;
      if (selectedGroupIds.has(groupId)) {
        return true;
      }
    }
    return false;
  });

  return {
    filteredRows,
    binsFilterSections,
    hasActiveBinFilters: true,
  };
}

export function useExperimentalMapTableBinsFilter(
  args: Readonly<UseExperimentalMapTableBinsFilterArgs>
): UseExperimentalMapTableBinsFilterResult {
  return useMemo(
    () => deriveExperimentalMapTableBinsFilter(args),
    [args.activeValues, args.binsPresets, args.rows, args.tableBinFiltersByPresetId]
  );
}
