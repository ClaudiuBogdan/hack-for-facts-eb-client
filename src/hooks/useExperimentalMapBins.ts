import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MapSeriesWarning } from '@/lib/map-series/interfaces';
import {
  classifySeriesValues,
  generateSequentialBins,
  type BinsValidationResult,
  validateBinsConfig,
} from '@/lib/map-bins/bins';
import type {
  ExperimentalMapBinsPreset,
  ExperimentalMapBinsPresetConfig,
  ExperimentalMapUrlState,
  MapSupportedSeries,
} from '@/schemas/experimental-map';
import {
  createDefaultExperimentalMapBinsPreset,
  createUniqueExperimentalMapId,
} from '@/schemas/experimental-map';
import {
  getNextBinsPresetLabel,
  reorderBinsPresetsByIds,
} from '@/components/maps/experimental/experimental-map-bins-presets-utils';

export interface BinsEditorState {
  mode: 'add' | 'edit';
  presetId: string;
}

interface UseExperimentalMapBinsArgs {
  mapState: ExperimentalMapUrlState;
  updateState: (updater: (draft: ExperimentalMapUrlState) => void) => void;
  activeSeries: MapSupportedSeries | undefined;
  activeSeriesId: string | undefined;
  activeValues: Map<string, number | undefined> | undefined;
  seriesWarnings: MapSeriesWarning[];
}

interface UseExperimentalMapBinsResult {
  binsEditorState: BinsEditorState | null;
  activeBinsPreset: ExperimentalMapBinsPreset | undefined;
  modalBinsPreset: ExperimentalMapBinsPreset | undefined;
  binsClassification: ReturnType<typeof classifySeriesValues>;
  binsCanApply: boolean;
  combinedWarnings: MapSeriesWarning[];
  toggleBinsPanelCollapsed: (collapsed: boolean) => void;
  addBinsPreset: () => void;
  editBinsPreset: (presetId: string) => void;
  deleteBinsPreset: (presetId: string) => void;
  setActiveBinsPreset: (presetId: string) => void;
  reorderBinsPresets: (activePresetId: string, overPresetId: string) => void;
  applyBinsPreset: (
    nextPreset: ExperimentalMapBinsPreset
  ) => {
    ok: boolean;
    error?: string;
  };
  regenerateBinsPreset: (presetId: string) => boolean;
  closeBinsEditor: () => void;
  activeNoDataConfig: ExperimentalMapBinsPresetConfig['noData'] | undefined;
}

export function useExperimentalMapBins({
  mapState,
  updateState,
  activeSeries,
  activeSeriesId,
  activeValues,
  seriesWarnings,
}: Readonly<UseExperimentalMapBinsArgs>): UseExperimentalMapBinsResult {
  const [binsEditorState, setBinsEditorState] = useState<BinsEditorState | null>(null);

  const activeBinsPreset = useMemo(
    () =>
      mapState.activeBinPresetId
        ? mapState.binsPresets.find((preset) => preset.id === mapState.activeBinPresetId)
        : undefined,
    [mapState.activeBinPresetId, mapState.binsPresets]
  );

  const activeBinsValidation = useMemo<BinsValidationResult>(
    () =>
      activeBinsPreset
        ? validateBinsConfig(activeBinsPreset.config)
        : { isValid: true, errors: [], warnings: [] },
    [activeBinsPreset]
  );

  const binsClassification = useMemo(
    () =>
      activeBinsPreset
        ? classifySeriesValues(activeValues, activeBinsPreset.config)
        : { groupsBySiruta: new Map(), palette: [], warnings: [] as MapSeriesWarning[] },
    [activeValues, activeBinsPreset]
  );

  const binsWarnings = useMemo<MapSeriesWarning[]>(() => {
    const warnings: MapSeriesWarning[] = [];

    if (mapState.activeBinPresetId && !activeBinsPreset) {
      warnings.push({
        type: 'bins_active_preset_missing',
        message: 'The active bins preset no longer exists.',
        details: {
          activeBinPresetId: mapState.activeBinPresetId,
        },
      });
    }

    if (!activeBinsPreset) {
      return warnings;
    }

    if (!activeSeries) {
      warnings.push({
        type: 'bins_no_active_series',
        message: 'An active bins preset exists but no active data series is selected.',
      });
    }

    warnings.push(...binsClassification.warnings);
    return warnings;
  }, [
    activeSeries,
    activeBinsPreset,
    binsClassification.warnings,
    mapState.activeBinPresetId,
  ]);

  const combinedWarnings = useMemo(
    () => [...seriesWarnings, ...binsWarnings],
    [binsWarnings, seriesWarnings]
  );

  const activeBinsConfigIsValidForApply = Boolean(activeBinsPreset) &&
    activeBinsValidation.isValid &&
    (activeBinsPreset?.config.bins.length ?? 0) > 0;

  const binsCanApply =
    Boolean(activeSeries) &&
    Boolean(activeBinsPreset) &&
    activeBinsConfigIsValidForApply &&
    binsClassification.groupsBySiruta.size > 0;

  const toggleBinsPanelCollapsed = useCallback(
    (collapsed: boolean) => {
      updateState((draft) => {
        draft.binsPanelCollapsed = collapsed;
      });
    },
    [updateState]
  );

  const addBinsPreset = useCallback(() => {
    const presetLabel = getNextBinsPresetLabel(mapState.binsPresets);
    const nextPreset = createDefaultExperimentalMapBinsPreset(presetLabel);
    nextPreset.id = createUniqueExperimentalMapId(mapState.binsPresets.map((preset) => preset.id));

    setBinsEditorState({ mode: 'add', presetId: nextPreset.id });

    updateState((draft) => {
      draft.binsPresets.push(nextPreset);
    });
  }, [mapState.binsPresets, updateState]);

  const editBinsPreset = useCallback((presetId: string) => {
    setBinsEditorState({ mode: 'edit', presetId });
  }, []);

  const deleteBinsPreset = useCallback(
    (presetId: string) => {
      updateState((draft) => {
        draft.binsPresets = draft.binsPresets.filter((preset) => preset.id !== presetId);
        if (draft.activeBinPresetId === presetId) {
          draft.activeBinPresetId = undefined;
        }
        delete draft.tableBinFiltersByPresetId[presetId];
      });

      setBinsEditorState((prevState) =>
        prevState?.presetId === presetId ? null : prevState
      );
    },
    [updateState]
  );

  const setActiveBinsPreset = useCallback(
    (presetId: string) => {
      updateState((draft) => {
        draft.activeBinPresetId =
          draft.activeBinPresetId === presetId ? undefined : presetId;
      });
    },
    [updateState]
  );

  const reorderBinsPresets = useCallback(
    (activePresetId: string, overPresetId: string) => {
      updateState((draft) => {
        draft.binsPresets = reorderBinsPresetsByIds(
          draft.binsPresets,
          activePresetId,
          overPresetId
        );
      });
    },
    [updateState]
  );

  const applyBinsPreset = useCallback(
    (
      nextPreset: ExperimentalMapBinsPreset
    ): {
      ok: boolean;
      error?: string;
    } => {
      const validation = validateBinsConfig(nextPreset.config);
      if (!validation.isValid) {
        return {
          ok: false,
          error: validation.errors[0],
        };
      }

      updateState((draft) => {
        const presetIndex = draft.binsPresets.findIndex((preset) => preset.id === nextPreset.id);
        if (presetIndex === -1) {
          return;
        }
        draft.binsPresets[presetIndex] = nextPreset;
      });
      return { ok: true };
    },
    [updateState]
  );

  const regenerateBinsPreset = useCallback(
    (presetId: string): boolean => {
      if (!activeSeriesId) {
        return false;
      }

      const preset = mapState.binsPresets.find((entry) => entry.id === presetId);
      if (!preset) {
        return false;
      }

      const generatedBins = generateSequentialBins(
        getFiniteValuesArray(activeValues),
        preset.config.defaultBinCount,
        preset.config.colorMode,
        preset.config.gradient
      );
      if (generatedBins.length === 0) {
        return false;
      }

      const nextPreset: ExperimentalMapBinsPreset = {
        ...preset,
        config: {
          ...preset.config,
          bins: generatedBins,
        },
        updatedAt: new Date().toISOString(),
      };

      const validation = validateBinsConfig(nextPreset.config);
      if (!validation.isValid) {
        return false;
      }

      updateState((draft) => {
        const presetIndex = draft.binsPresets.findIndex((entry) => entry.id === presetId);
        if (presetIndex === -1) {
          return;
        }
        draft.binsPresets[presetIndex] = nextPreset;
      });

      return true;
    },
    [activeSeriesId, activeValues, mapState.binsPresets, updateState]
  );

  const modalBinsPreset = binsEditorState
    ? mapState.binsPresets.find((preset) => preset.id === binsEditorState.presetId)
    : undefined;

  useEffect(() => {
    if (binsEditorState?.mode === 'edit' && !modalBinsPreset) {
      setBinsEditorState(null);
    }
  }, [binsEditorState, modalBinsPreset]);

  const closeBinsEditor = useCallback(() => {
    setBinsEditorState(null);
  }, []);

  return {
    binsEditorState,
    activeBinsPreset,
    modalBinsPreset,
    binsClassification,
    binsCanApply,
    combinedWarnings,
    toggleBinsPanelCollapsed,
    addBinsPreset,
    editBinsPreset,
    deleteBinsPreset,
    setActiveBinsPreset,
    reorderBinsPresets,
    applyBinsPreset,
    regenerateBinsPreset,
    closeBinsEditor,
    activeNoDataConfig: activeBinsPreset?.config.noData,
  };
}

function getFiniteValuesArray(values: Map<string, number | undefined> | undefined): number[] {
  if (!values || values.size === 0) {
    return [];
  }

  const result: number[] = [];
  for (const value of values.values()) {
    if (Number.isFinite(value)) {
      result.push(value as number);
    }
  }
  return result;
}
