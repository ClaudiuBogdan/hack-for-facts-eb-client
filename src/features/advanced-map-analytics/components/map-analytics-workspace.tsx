import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { produce } from 'immer';
import { AnimatePresence, motion } from 'framer-motion';
import { Save } from 'lucide-react';
import { useHotkeys } from 'react-hotkeys-hook';
import { toast } from 'sonner';

import { ClientOnly } from '@/components/ssr/ClientOnly';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useGeoJsonData } from '@/hooks/useGeoJson';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAdvancedMapAnalyticsSeriesData } from '@/hooks/useAdvancedMapAnalyticsSeriesData';
import { useAdvancedMapAnalyticsBins } from '@/hooks/useAdvancedMapAnalyticsBins';
import { useAdvancedMapAnalyticsTableBinsFilter } from '@/hooks/useAdvancedMapAnalyticsTableBinsFilter';
import { buildDiscretePaletteFromConfig, getContinuousGradientColor } from '@/lib/map-bins/bins';
import { getHeatmapColor, getPercentileValues, normalizeValue } from '@/components/maps/utils';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import type { UatFeature, UatProperties } from '@/components/maps/interfaces';
import type { HeatmapCountyDataPoint, HeatmapUATDataPoint } from '@/schemas/heatmap';
import { defaultMapFilters } from '@/schemas/map-filters';
import type { AnalyticsFilterType } from '@/schemas/charts';
import type {
  AdvancedMapAnalyticsTableRow,
  AdvancedMapAnalyticsTableSeriesColumn,
} from '@/components/maps/advanced-map-analytics/advanced-map-analytics-table-types';
import { AdvancedMapAnalyticsDataTable } from '@/components/maps/advanced-map-analytics/advanced-map-analytics-data-table';
import { formatAdvancedMapAnalyticsSeriesValue } from '@/components/maps/advanced-map-analytics/advanced-map-analytics-formatting';
import type {
  AdvancedMapAnalyticsWidget,
  AdvancedMapAnalyticsWidgetKey,
  AdvancedMapAnalyticsUrlState,
  AdvancedMapAnalyticsValueFilterRule,
  GeoJsonFilterOption,
  GeoJsonDatasetSeriesConfiguration,
  MapSupportedSeries,
} from '@/schemas/advanced-map-analytics';
import {
  createDefaultAdvancedMapAnalyticsValueFilterRule,
  createDefaultAdvancedMapAnalyticsSeries,
  createUniqueAdvancedMapAnalyticsId,
  getGeoJsonDatasetLabel,
  getGeoJsonDatasetUnit,
} from '@/schemas/advanced-map-analytics';
import { useUserCurrency } from '@/lib/hooks/useUserCurrency';
import { useUserInflationAdjusted } from '@/lib/hooks/useUserInflationAdjusted';
import { DEFAULT_FEATURE_STYLE } from '@/components/maps/constants';
import type { GroupedSeriesDataResponse } from '@/lib/map-series/interfaces';
import { AdvancedMapAnalyticsConfigPanel } from '@/components/maps/advanced-map-analytics/advanced-map-analytics-config-panel';
import { AdvancedMapAnalyticsBinsModal } from '@/components/maps/advanced-map-analytics/advanced-map-analytics-bins-modal';
import { AdvancedMapAnalyticsBinsPanel } from '@/components/maps/advanced-map-analytics/advanced-map-analytics-bins-panel';
import { AdvancedMapAnalyticsDiscreteLegend } from '@/components/maps/advanced-map-analytics/advanced-map-analytics-discrete-legend';
import { AdvancedMapAnalyticsSeriesPanel } from '@/components/maps/advanced-map-analytics/advanced-map-analytics-series-panel';
import { AdvancedMapAnalyticsValueFilterEditorModal } from '@/components/maps/advanced-map-analytics/advanced-map-analytics-value-filter-editor-modal';
import { AdvancedMapAnalyticsValueFiltersPanel } from '@/components/maps/advanced-map-analytics/advanced-map-analytics-value-filters-panel';
import { AdvancedMapAnalyticsSeriesEditorModal } from '@/components/maps/advanced-map-analytics/advanced-map-analytics-series-editor-modal';
import { AdvancedMapAnalyticsWarningsModal } from '@/components/maps/advanced-map-analytics/advanced-map-analytics-warnings-modal';
import { AdvancedMapAnalyticsAnalyticsView } from '@/components/maps/advanced-map-analytics/advanced-map-analytics-analytics-view';
import { MapAnalyticsQuickActions } from './map-analytics-quick-actions';
import {
  applySetActiveSeries,
  applyToggleSeriesEnabled,
  convertSeriesToType,
  createCopiedMapSeriesPayload,
  duplicateSeriesAfterSource,
  ensureActiveSeriesSelection,
  normalizePastedMapSeries,
  reorderSeriesByIds,
} from '@/components/maps/advanced-map-analytics/advanced-map-analytics-series-utils';
import {
  createMapConfigTransferEnvelope,
  parseMapConfigTransferInput,
  type ImportedMapConfig,
} from '@/features/advanced-map-analytics/store/map-config-transfer';
import { t } from '@lingui/core/macro';
import { cn, getUserLocale } from '@/lib/utils';

// Lazy load InteractiveMap to avoid Leaflet evaluation on the server.
const InteractiveMap = lazy(() =>
  import('@/components/maps/InteractiveMap').then((module) => ({ default: module.InteractiveMap }))
);

interface EditorState {
  mode: 'add' | 'edit';
  seriesId: string;
}

interface ValueFilterEditorState {
  mode: 'add' | 'edit';
  ruleId: string;
}

export interface MapAnalyticsWorkspaceCapabilities {
  readOnly: boolean;
}

interface MapAnalyticsWorkspaceProps {
  mapState: AdvancedMapAnalyticsUrlState;
  setMapState: (
    updater:
      | AdvancedMapAnalyticsUrlState
      | ((previousState: AdvancedMapAnalyticsUrlState) => AdvancedMapAnalyticsUrlState)
  ) => void;
  mapDescription?: string;
  mode: 'owner' | 'public';
  capabilities: MapAnalyticsWorkspaceCapabilities;
  onOpenOwnerConfig?: () => void;
  hasPendingChanges?: boolean;
  onRequestSaveSnapshot?: () => void;
  onOpenLocalSnapshots?: () => void;
  isSavingSnapshot?: boolean;
  localSnapshotCount?: number;
  bundledGroupedSeriesData?: GroupedSeriesDataResponse;
  bundledRemoteBaseSeriesHash?: string;
  mobileControlsDefaultCollapsed?: boolean;
  onApplyImportedConfig?: (config: ImportedMapConfig) => Promise<void> | void;
  onBeforeExportConfig?: () => Promise<void> | void;
}

// NOTE: Do not use module-scope t`` — it freezes the translation at import time.
// Use t`` at the call site instead (see mapName usage below).

export function MapAnalyticsWorkspace({
  mapState,
  setMapState,
  mapDescription = '',
  mode,
  capabilities,
  onOpenOwnerConfig,
  hasPendingChanges = false,
  onRequestSaveSnapshot,
  onOpenLocalSnapshots,
  isSavingSnapshot = false,
  localSnapshotCount = 0,
  bundledGroupedSeriesData,
  bundledRemoteBaseSeriesHash,
  mobileControlsDefaultCollapsed = false,
  onApplyImportedConfig,
  onBeforeExportConfig,
}: Readonly<MapAnalyticsWorkspaceProps>) {
  const navigate = useNavigate();
  const [userCurrency] = useUserCurrency();
  const [userInflationAdjusted] = useUserInflationAdjusted();
  const isMobile = useIsMobile();
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [valueFilterEditorState, setValueFilterEditorState] = useState<ValueFilterEditorState | null>(null);
  const [isWarningsModalOpen, setIsWarningsModalOpen] = useState(false);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | undefined>(undefined);
  const [isMobileControlsCollapsed, setIsMobileControlsCollapsed] = useState(
    mobileControlsDefaultCollapsed
  );
  const isReadOnly = mode === 'public' || capabilities.readOnly;
  const isMobileControlsCollapseEnabled = isMobile && mobileControlsDefaultCollapsed;
  const shouldOverlayMobileControls = mode === 'public' && isMobileControlsCollapseEnabled && mapState.activeView === 'map';
  const mobileControlsContentId = 'map-analytics-mobile-controls';

  const updateState = useCallback(
    (updater: (draft: AdvancedMapAnalyticsUrlState) => void) => {
      setMapState((previousState) => {
        return produce(previousState, updater);
      });
    },
    [setMapState]
  );

  const updateSeries = useCallback(
    (seriesId: string, updater: (draft: MapSupportedSeries) => void) => {
      if (isReadOnly) {
        return;
      }

      updateState((draft) => {
        const index = draft.series.findIndex((series) => series.id === seriesId);
        if (index === -1) {
          return;
        }

        updater(draft.series[index]);
        draft.series[index].updatedAt = new Date().toISOString();
      });
    },
    [isReadOnly, updateState]
  );

  const updateValueFilterRule = useCallback(
    (ruleId: string, updater: (draft: AdvancedMapAnalyticsValueFilterRule) => void) => {
      if (isReadOnly) {
        return;
      }

      updateState((draft) => {
        const ruleIndex = draft.valueFilters.rules.findIndex((rule) => rule.id === ruleId);
        if (ruleIndex === -1) {
          return;
        }

        updater(draft.valueFilters.rules[ruleIndex]);
      });
    },
    [isReadOnly, updateState]
  );

  const selectSeries = useCallback((seriesId: string) => {
    setSelectedSeriesId(seriesId);
  }, []);

  const addSeries = useCallback(() => {
    if (isReadOnly) {
      return;
    }

    const nextSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    nextSeries.id = createUniqueAdvancedMapAnalyticsId(mapState.series.map((series) => series.id));

    setEditorState({ mode: 'add', seriesId: nextSeries.id });
    setSelectedSeriesId(nextSeries.id);

    updateState((draft) => {
      const isFirstSeries = draft.series.length === 0;
      nextSeries.label = t`Data series ${draft.series.length + 1}`;
      draft.series.push(nextSeries);

      if (isFirstSeries) {
        draft.activeSeriesId = nextSeries.id;
      }
    });
  }, [isReadOnly, mapState.series, updateState]);

  const editSeries = useCallback((seriesId: string) => {
    if (isReadOnly) {
      return;
    }

    setSelectedSeriesId(seriesId);
    setEditorState({ mode: 'edit', seriesId });
  }, [isReadOnly]);

  const deleteSeries = useCallback(
    (seriesId: string) => {
      if (isReadOnly) {
        return;
      }

      updateState((draft) => {
        const nextSeries = draft.series.filter((series) => series.id !== seriesId);
        const ensuredSelection = ensureActiveSeriesSelection(nextSeries, draft.activeSeriesId);
        draft.series = ensuredSelection.series;
        draft.activeSeriesId = ensuredSelection.activeSeriesId;
      });

      setEditorState((prevState) =>
        prevState?.seriesId === seriesId ? null : prevState
      );
      setSelectedSeriesId((previousSelectedSeriesId) =>
        previousSelectedSeriesId === seriesId ? undefined : previousSelectedSeriesId
      );
    },
    [isReadOnly, updateState]
  );

  const makeSeriesMain = useCallback(
    (seriesId: string) => {
      if (isReadOnly) {
        return;
      }

      setSelectedSeriesId(seriesId);
      updateState((draft) => {
        const nextState = applySetActiveSeries(draft, seriesId);
        draft.series = nextState.series;
        draft.activeSeriesId = nextState.activeSeriesId;
      });
    },
    [isReadOnly, updateState]
  );

  const setSeriesActivation = useCallback(
    (seriesId: string, enabled: boolean) => {
      if (isReadOnly) {
        return;
      }

      setSelectedSeriesId(seriesId);
      updateState((draft) => {
        const nextState = applyToggleSeriesEnabled(draft, seriesId, enabled);
        draft.series = nextState.series;
        draft.activeSeriesId = nextState.activeSeriesId;
      });
    },
    [isReadOnly, updateState]
  );

  const moveSeriesUp = useCallback(
    (seriesId: string) => {
      if (isReadOnly) {
        return;
      }

      updateState((draft) => {
        const sourceIndex = draft.series.findIndex((series) => series.id === seriesId);
        if (sourceIndex <= 0) {
          return;
        }

        const previousSeriesId = draft.series[sourceIndex - 1]?.id;
        if (!previousSeriesId) {
          return;
        }

        draft.series = reorderSeriesByIds(draft.series, seriesId, previousSeriesId);
      });
    },
    [isReadOnly, updateState]
  );

  const moveSeriesDown = useCallback(
    (seriesId: string) => {
      if (isReadOnly) {
        return;
      }

      updateState((draft) => {
        const sourceIndex = draft.series.findIndex((series) => series.id === seriesId);
        if (sourceIndex === -1 || sourceIndex >= draft.series.length - 1) {
          return;
        }

        const nextSeriesId = draft.series[sourceIndex + 1]?.id;
        if (!nextSeriesId) {
          return;
        }

        draft.series = reorderSeriesByIds(draft.series, seriesId, nextSeriesId);
      });
    },
    [isReadOnly, updateState]
  );

  const duplicateSeries = useCallback(
    (seriesId: string) => {
      if (isReadOnly) {
        return;
      }

      const preferredDuplicatedSeriesId = createUniqueAdvancedMapAnalyticsId(
        mapState.series.map((series) => series.id)
      );
      updateState((draft) => {
        const duplicateResult = duplicateSeriesAfterSource(
          draft.series,
          seriesId,
          preferredDuplicatedSeriesId
        );
        draft.series = duplicateResult.series;
      });

      setSelectedSeriesId(preferredDuplicatedSeriesId);
    },
    [isReadOnly, mapState.series, updateState]
  );

  const copySeriesToClipboard = useCallback(
    async (seriesId: string) => {
      if (isReadOnly) {
        return;
      }

      const clipboardPayload = createCopiedMapSeriesPayload(mapState.series, seriesId);
      if (!clipboardPayload) {
        toast.error(t`Copy failed`);
        return;
      }

      try {
        await navigator.clipboard.writeText(JSON.stringify(clipboardPayload));
        toast.success(t`Series copied to clipboard`);
      } catch {
        toast.error(t`Could not copy series to clipboard`);
      }
    },
    [isReadOnly, mapState.series]
  );

  const copyMapConfigToClipboard = useCallback(async () => {
    if (isReadOnly) {
      return;
    }

    const clipboardPayload = createMapConfigTransferEnvelope({
      mapState,
      mapDescription,
    });

    try {
      await navigator.clipboard.writeText(JSON.stringify(clipboardPayload, null, 2));
      toast.success(t`Map configuration copied to clipboard`);
    } catch {
      toast.error(t`Could not copy map configuration`);
    }
  }, [isReadOnly, mapDescription, mapState]);

  const pasteSeriesFromClipboardText = useCallback(
    (clipboardText: string): boolean => {
      const normalizedPasteResult = normalizePastedMapSeries(clipboardText, mapState.series);
      if (!normalizedPasteResult) {
        return false;
      }

      if (normalizedPasteResult.seriesToInsert.length === 0) {
        if (normalizedPasteResult.skippedUnsupportedCount > 0) {
          toast.warning(t`No compatible series found in clipboard`);
        } else {
          toast.warning(t`Nothing to paste`);
        }
        return true;
      }

      const firstPastedSeriesId = normalizedPasteResult.seriesToInsert[0]?.id;

      updateState((draft) => {
        draft.series.push(...normalizedPasteResult.seriesToInsert);
      });

      if (firstPastedSeriesId) {
        setSelectedSeriesId(firstPastedSeriesId);
      }

      toast.success(
        t`${normalizedPasteResult.seriesToInsert.length} series pasted`
      );

      if (normalizedPasteResult.skippedUnsupportedCount > 0) {
        toast.warning(
          t`${normalizedPasteResult.skippedUnsupportedCount} unsupported series were skipped`
        );
      }
      return true;
    },
    [mapState.series, updateState]
  );

  const pasteMapConfigFromClipboardText = useCallback(
    async (clipboardText: string): Promise<boolean> => {
      if (clipboardText.trim().length === 0) {
        return false;
      }

      let parsedClipboardValue: unknown;
      try {
        parsedClipboardValue = JSON.parse(clipboardText) as unknown;
      } catch {
        return false;
      }

      if (
        typeof parsedClipboardValue !== 'object' ||
        parsedClipboardValue === null
      ) {
        return false;
      }

      const clipboardRecord = parsedClipboardValue as Record<string, unknown>;
      const hasExplicitConfigShape =
        clipboardRecord.type === 'advanced-map-analytics-config' ||
        Object.prototype.hasOwnProperty.call(clipboardRecord, 'mapState');
      const hasMapStateHintKeys = [
        'series',
        'activeView',
        'mapName',
        'valueFilters',
        'binsPresets',
      ].some((key) => Object.prototype.hasOwnProperty.call(clipboardRecord, key));

      if (!hasExplicitConfigShape && !hasMapStateHintKeys) {
        return false;
      }

      const importedConfig = parseMapConfigTransferInput(parsedClipboardValue);
      if (!importedConfig) {
        toast.warning(t`Map configuration in clipboard is invalid`);
        return true;
      }

      try {
        if (onApplyImportedConfig) {
          await onApplyImportedConfig(importedConfig);
        } else {
          setMapState(importedConfig.mapState);
          toast.success(t`Map configuration imported`);
        }
      } catch {
        toast.error(t`Failed to import map configuration`);
      }

      return true;
    },
    [onApplyImportedConfig, setMapState]
  );

  const pasteFromClipboard = useCallback(async () => {
    if (isReadOnly) {
      return;
    }

    try {
      const clipboardText = await navigator.clipboard.readText();
      if (selectedSeriesId) {
        if (pasteSeriesFromClipboardText(clipboardText)) {
          return;
        }

        if (await pasteMapConfigFromClipboardText(clipboardText)) {
          return;
        }
      } else {
        if (await pasteMapConfigFromClipboardText(clipboardText)) {
          return;
        }

        if (pasteSeriesFromClipboardText(clipboardText)) {
          return;
        }
      }

      toast.warning(t`Nothing to paste`);
    } catch {
      toast.error(t`Paste failed`);
    }
  }, [isReadOnly, pasteMapConfigFromClipboardText, pasteSeriesFromClipboardText, selectedSeriesId]);

  const reorderSeries = useCallback(
    (activeSeriesId: string, overSeriesId: string) => {
      if (isReadOnly) {
        return;
      }

      updateState((draft) => {
        draft.series = reorderSeriesByIds(draft.series, activeSeriesId, overSeriesId);
      });
    },
    [isReadOnly, updateState]
  );

  const togglePanelCollapsed = useCallback(
    (collapsed: boolean) => {
      updateState((draft) => {
        draft.seriesPanelCollapsed = collapsed;
      });
    },
    [updateState]
  );

  const toggleConfigPanelCollapsed = useCallback(
    (collapsed: boolean) => {
      updateState((draft) => {
        draft.configPanelCollapsed = collapsed;
      });
    },
    [updateState]
  );

  const toggleValueFiltersPanelCollapsed = useCallback(
    (collapsed: boolean) => {
      updateState((draft) => {
        draft.valueFiltersPanelCollapsed = collapsed;
      });
    },
    [updateState]
  );

  const addValueFilterRule = useCallback(() => {
    if (isReadOnly) {
      return;
    }

    updateState((draft) => {
      const nextRule = createDefaultAdvancedMapAnalyticsValueFilterRule();
      nextRule.id = createUniqueAdvancedMapAnalyticsId(draft.valueFilters.rules.map((rule) => rule.id));
      draft.valueFilters.rules.push(nextRule);
    });
  }, [isReadOnly, updateState]);

  const editValueFilterRule = useCallback((ruleId: string) => {
    if (isReadOnly) {
      return;
    }

    setValueFilterEditorState({
      mode: 'edit',
      ruleId,
    });
  }, [isReadOnly]);

  const deleteValueFilterRule = useCallback(
    (ruleId: string) => {
      if (isReadOnly) {
        return;
      }

      updateState((draft) => {
        draft.valueFilters.rules = draft.valueFilters.rules.filter((rule) => rule.id !== ruleId);
      });

      setValueFilterEditorState((previousState) =>
        previousState?.ruleId === ruleId ? null : previousState
      );
    },
    [isReadOnly, updateState]
  );

  const moveValueFilterRule = useCallback(
    (ruleId: string, direction: 'up' | 'down') => {
      if (isReadOnly) {
        return;
      }

      updateState((draft) => {
        const currentIndex = draft.valueFilters.rules.findIndex((rule) => rule.id === ruleId);
        if (currentIndex === -1) {
          return;
        }

        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= draft.valueFilters.rules.length) {
          return;
        }

        const reorderedRules = [...draft.valueFilters.rules];
        const [movedRule] = reorderedRules.splice(currentIndex, 1);
        if (!movedRule) {
          return;
        }
        reorderedRules.splice(targetIndex, 0, movedRule);
        draft.valueFilters.rules = reorderedRules;
      });
    },
    [isReadOnly, updateState]
  );

  const reorderValueFilterRules = useCallback(
    (activeRuleId: string, overRuleId: string) => {
      if (isReadOnly) {
        return;
      }

      if (activeRuleId === overRuleId) {
        return;
      }

      updateState((draft) => {
        const currentIndex = draft.valueFilters.rules.findIndex((rule) => rule.id === activeRuleId);
        const targetIndex = draft.valueFilters.rules.findIndex((rule) => rule.id === overRuleId);
        if (currentIndex === -1 || targetIndex === -1) {
          return;
        }

        const reorderedRules = [...draft.valueFilters.rules];
        const [movedRule] = reorderedRules.splice(currentIndex, 1);
        if (!movedRule) {
          return;
        }
        reorderedRules.splice(targetIndex, 0, movedRule);
        draft.valueFilters.rules = reorderedRules;
      });
    },
    [isReadOnly, updateState]
  );

  const updateValueFilterRuleEnabled = useCallback(
    (ruleId: string, enabled: boolean) => {
      updateValueFilterRule(ruleId, (rule) => {
        rule.enabled = enabled;
      });
    },
    [updateValueFilterRule]
  );

  const replaceValueFilterRule = useCallback(
    (ruleId: string, nextRule: AdvancedMapAnalyticsValueFilterRule) => {
      updateState((draft) => {
        const ruleIndex = draft.valueFilters.rules.findIndex((rule) => rule.id === ruleId);
        if (ruleIndex === -1) {
          return;
        }

        draft.valueFilters.rules[ruleIndex] = {
          ...nextRule,
          id: ruleId,
        };
      });
    },
    [updateState]
  );

  const setActiveView = useCallback(
    (activeView: AdvancedMapAnalyticsUrlState['activeView']) => {
      updateState((draft) => {
        draft.activeView = activeView;
      });
    },
    [updateState]
  );

  const toggleAnalyticsWidgetEnabled = useCallback(
    (widgetKey: AdvancedMapAnalyticsWidgetKey, enabled: boolean) => {
      if (isReadOnly) {
        return;
      }

      updateState((draft) => {
        const widget = draft.analyticsWidgets.find((entry) => entry.key === widgetKey);
        if (!widget) {
          return;
        }

        widget.enabled = enabled;
      });
    },
    [isReadOnly, updateState]
  );

  const reorderAnalyticsWidgets = useCallback(
    (activeWidgetKey: AdvancedMapAnalyticsWidgetKey, overWidgetKey: AdvancedMapAnalyticsWidgetKey) => {
      if (isReadOnly || activeWidgetKey === overWidgetKey) {
        return;
      }

      updateState((draft) => {
        const activeIndex = draft.analyticsWidgets.findIndex((widget) => widget.key === activeWidgetKey);
        const overIndex = draft.analyticsWidgets.findIndex((widget) => widget.key === overWidgetKey);
        if (activeIndex === -1 || overIndex === -1) {
          return;
        }

        const reorderedWidgets = [...draft.analyticsWidgets];
        const [movedWidget] = reorderedWidgets.splice(activeIndex, 1);
        if (!movedWidget) {
          return;
        }
        reorderedWidgets.splice(overIndex, 0, movedWidget);
        draft.analyticsWidgets = reorderedWidgets;
      });
    },
    [isReadOnly, updateState]
  );

  const updateAnalyticsWidget = useCallback(
    (nextWidget: AdvancedMapAnalyticsWidget) => {
      if (isReadOnly) {
        return;
      }

      updateState((draft) => {
        const widgetIndex = draft.analyticsWidgets.findIndex((widget) => widget.key === nextWidget.key);
        if (widgetIndex === -1) {
          return;
        }

        draft.analyticsWidgets[widgetIndex] = nextWidget;
      });
    },
    [isReadOnly, updateState]
  );

  const setShowCountyBoundaries = useCallback(
    (enabled: boolean) => {
      updateState((draft) => {
        draft.showCountyBoundaries = enabled;
      });
    },
    [updateState]
  );

  const changeSeriesType = useCallback(
    (seriesId: string, type: MapSupportedSeries['type']) => {
      if (isReadOnly) {
        return;
      }

      updateState((draft) => {
        const index = draft.series.findIndex((series) => series.id === seriesId);
        if (index === -1) {
          return;
        }

        const currentSeries = draft.series[index];
        if (currentSeries.type === type) {
          return;
        }

        draft.series[index] = convertSeriesToType(currentSeries, type);
      });
    },
    [isReadOnly, updateState]
  );

  const mapZoom = mapState.mapZoom ?? (isMobile ? 6 : 7.7);

  const serializedDraftLength = useMemo(
    () => JSON.stringify({ mapState, mapDescription }).length,
    [mapDescription, mapState]
  );

  const {
    data: geoJsonData,
    isLoading: isGeoJsonLoading,
    error: geoJsonError,
  } = useGeoJsonData('UAT');

  const { data: countyGeoJsonData } = useGeoJsonData('County');

  const geoJsonFeatures = useMemo<UatFeature[]>(() => {
    if (!geoJsonData || !('features' in geoJsonData) || !Array.isArray(geoJsonData.features)) {
      return [];
    }
    return geoJsonData.features as UatFeature[];
  }, [geoJsonData]);

  const geoJsonCountyOptions = useMemo(
    () => buildGeoJsonIdNameOptions(geoJsonFeatures, 'countyId', 'county'),
    [geoJsonFeatures]
  );

  const geoJsonRegionOptions = useMemo(
    () => buildGeoJsonIdNameOptions(geoJsonFeatures, 'regionId', 'region'),
    [geoJsonFeatures]
  );

  const enabledGeoJsonDatasetSeries = useMemo(
    () =>
      mapState.series.filter(
        (series): series is GeoJsonDatasetSeriesConfiguration =>
          series.enabled && series.type === 'geojson-dataset-series'
      ),
    [mapState.series]
  );

  const localGeoJsonValuesBySeriesId = useMemo(() => {
    const valuesBySeriesId = new Map<string, Map<string, number | undefined>>();

    if (enabledGeoJsonDatasetSeries.length === 0 || geoJsonFeatures.length === 0) {
      return valuesBySeriesId;
    }

    for (const series of enabledGeoJsonDatasetSeries) {
      const vector = new Map<string, number | undefined>();
      const selectedPopulationKey = series.datasetKey;
      const countyFilterIdSet = new Set(series.countyFilterIds);
      const regionFilterIdSet = new Set(series.regionFilterIds);

      for (const feature of geoJsonFeatures) {
        const properties = feature?.properties;
        const sirutaCode = String(properties?.natcode ?? '').trim();
        if (!sirutaCode) {
          continue;
        }

        if (countyFilterIdSet.size > 0) {
          const countyId = readFiniteNumber(properties?.countyId);
          if (countyId === undefined || !countyFilterIdSet.has(countyId)) {
            continue;
          }
        }

        if (regionFilterIdSet.size > 0) {
          const regionId = readFiniteNumber(properties?.regionId);
          if (regionId === undefined || !regionFilterIdSet.has(regionId)) {
            continue;
          }
        }

        const populationValue = readFiniteNumber(properties?.[selectedPopulationKey]);
        if (populationValue === undefined) {
          continue;
        }

        vector.set(sirutaCode, populationValue);
      }

      valuesBySeriesId.set(series.id, vector);
    }

    return valuesBySeriesId;
  }, [enabledGeoJsonDatasetSeries, geoJsonFeatures]);

  const localGeoJsonUnitsBySeriesId = useMemo(() => {
    const unitsBySeriesId = new Map<string, string | undefined>();
    for (const series of enabledGeoJsonDatasetSeries) {
      const unitOverride = typeof series.unit === 'string' ? series.unit.trim() : '';
      unitsBySeriesId.set(
        series.id,
        unitOverride.length > 0
          ? unitOverride
          : getGeoJsonDatasetUnit(series.datasetKey)
      );
    }
    return unitsBySeriesId;
  }, [enabledGeoJsonDatasetSeries]);

  const {
    valuesBySeriesId,
    unitsBySeriesId,
    warnings: seriesWarnings,
    activeSeriesId,
    activeValues,
    isLoading,
    error,
  } = useAdvancedMapAnalyticsSeriesData({
    series: mapState.series,
    activeSeriesId: mapState.activeSeriesId,
    valueFilterRules: mapState.valueFilters.rules,
    defaultCurrency: userCurrency,
    defaultInflationAdjusted: userInflationAdjusted,
    serializedDraftLength,
    enabled: editorState == null,
    localValuesBySeriesId: localGeoJsonValuesBySeriesId,
    localUnitsBySeriesId: localGeoJsonUnitsBySeriesId,
    bundledGroupedSeriesData,
    bundledRemoteBaseSeriesHash,
  });

  const activeSeries = useMemo(
    () => mapState.series.find((series) => series.id === activeSeriesId && series.enabled),
    [activeSeriesId, mapState.series]
  );

  const {
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
    closeBinsEditor,
    activeNoDataConfig,
  } = useAdvancedMapAnalyticsBins({
    mapState,
    updateState,
    activeSeries,
    activeSeriesId,
    activeValues,
    seriesWarnings,
  });

  useEffect(() => {
    if (!selectedSeriesId) {
      return;
    }

    if (mapState.series.some((series) => series.id === selectedSeriesId)) {
      return;
    }

    setSelectedSeriesId(undefined);
  }, [mapState.series, selectedSeriesId]);

  const areSeriesHotkeysDisabled =
    isReadOnly ||
    editorState !== null ||
    valueFilterEditorState !== null ||
    binsEditorState !== null ||
    isWarningsModalOpen;

  useHotkeys('mod+c', (event) => {
    if (
      areSeriesHotkeysDisabled ||
      isEditableEventTarget(event.target)
    ) {
      return;
    }

    event.preventDefault();
    if (selectedSeriesId) {
      void copySeriesToClipboard(selectedSeriesId);
      return;
    }

    void copyMapConfigToClipboard();
  });

  useHotkeys('mod+v', (event) => {
    if (areSeriesHotkeysDisabled || isEditableEventTarget(event.target)) {
      return;
    }

    event.preventDefault();
    void pasteFromClipboard();
  });

  useHotkeys('mod+d', (event) => {
    if (areSeriesHotkeysDisabled || isEditableEventTarget(event.target)) {
      return;
    }

    const duplicateTargetSeriesId = selectedSeriesId ?? activeSeriesId ?? mapState.series[0]?.id;
    if (!duplicateTargetSeriesId) {
      return;
    }

    event.preventDefault();
    duplicateSeries(duplicateTargetSeriesId);
  });

  const activeBinsLegendTitle = useMemo(() => {
    const title = activeBinsPreset?.config.title?.trim();
    if (title && title.length > 0) {
      return title;
    }
    return activeSeries?.label || t`Active series`;
  }, [activeBinsPreset?.config.title, activeSeries?.label]);
  const isContinuousIntervalMode = activeBinsPreset?.config.intervalMode === 'continuous';
  const activeContinuousPercentiles = activeBinsPreset?.config.continuousPercentiles;

  const activeHeatmapData = useMemo<HeatmapUATDataPoint[]>(() => {
    if (!activeSeries || !activeValues) {
      return [];
    }

    const rows: HeatmapUATDataPoint[] = [];

    if (binsCanApply) {
      for (const [sirutaCode, value] of activeValues.entries()) {
        const numericValue = Number.isFinite(value) ? (value as number) : 0;
        rows.push({
          uat_id: sirutaCode,
          uat_code: sirutaCode,
          uat_name: '',
          siruta_code: sirutaCode,
          county_code: '',
          county_name: '',
          population: 0,
          amount: numericValue,
          total_amount: numericValue,
          per_capita_amount: numericValue,
        });
      }
      return rows;
    }

    for (const [sirutaCode, value] of activeValues.entries()) {
      if (value === undefined || !Number.isFinite(value)) {
        continue;
      }

      rows.push({
        uat_id: sirutaCode,
        uat_code: sirutaCode,
        uat_name: '',
        siruta_code: sirutaCode,
        county_code: '',
        county_name: '',
        population: 0,
        amount: value,
        total_amount: value,
        per_capita_amount: value,
      });
    }

    return rows;
  }, [activeSeries, activeValues, binsCanApply]);

  const { min: colorRangeMin, max: colorRangeMax } = useMemo(() => {
    if (activeHeatmapData.length === 0) {
      return { min: 0, max: 0 };
    }

    const lowerPercentile = isContinuousIntervalMode ? (activeContinuousPercentiles?.min ?? 5) : 5;
    const upperPercentile = isContinuousIntervalMode ? (activeContinuousPercentiles?.max ?? 95) : 95;
    return getPercentileValues(activeHeatmapData, lowerPercentile, upperPercentile, 'amount');
  }, [
    activeContinuousPercentiles?.max,
    activeContinuousPercentiles?.min,
    activeHeatmapData,
    isContinuousIntervalMode,
  ]);

  const { min: realDataMin, max: realDataMax } = useMemo(() => {
    if (activeHeatmapData.length === 0) {
      return { min: 0, max: 0 };
    }

    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;

    for (const row of activeHeatmapData) {
      const value = row.amount;
      if (!Number.isFinite(value)) {
        continue;
      }

      if (value < min) {
        min = value;
      }
      if (value > max) {
        max = value;
      }
    }

    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return { min: 0, max: 0 };
    }

    return { min, max };
  }, [activeHeatmapData]);

  const getFeatureStyle = useCallback(
    (
      feature: UatFeature,
      heatmapDataMap: Map<string | number, HeatmapUATDataPoint | HeatmapCountyDataPoint>
    ) => {
      const featureKey = feature?.properties?.natcode;
      if (!featureKey) {
        return DEFAULT_FEATURE_STYLE;
      }

      if (binsCanApply) {
        const classification = binsClassification.groupsBySiruta.get(String(featureKey));
        return {
          ...DEFAULT_FEATURE_STYLE,
          fillColor: classification?.color ?? activeNoDataConfig?.color ?? '#cccccc',
          fillOpacity: 0.7,
        };
      }

      const noDataColor = activeNoDataConfig?.color ?? '#cccccc';
      const dataPoint = heatmapDataMap.get(featureKey);
      if (!dataPoint) {
        return {
          ...DEFAULT_FEATURE_STYLE,
          fillOpacity: 0.1,
          fillColor: isContinuousIntervalMode ? noDataColor : '#cccccc',
        };
      }

      const value = dataPoint.amount;
      if (!Number.isFinite(value)) {
        if (!isContinuousIntervalMode) {
          return DEFAULT_FEATURE_STYLE;
        }
        return {
          ...DEFAULT_FEATURE_STYLE,
          fillColor: noDataColor,
          fillOpacity: 0.7,
        };
      }

      if (isContinuousIntervalMode) {
        return {
          ...DEFAULT_FEATURE_STYLE,
          fillColor: getContinuousGradientColor(
            value,
            { min: colorRangeMin, max: colorRangeMax },
            activeBinsPreset?.config.gradient ?? { startColor: '#fff7bc', endColor: '#d7301f' },
            noDataColor
          ),
          fillOpacity: 0.7,
        };
      }

      if (colorRangeMin === colorRangeMax) {
        return {
          ...DEFAULT_FEATURE_STYLE,
          fillColor: value !== 0 ? getHeatmapColor(0.5) : DEFAULT_FEATURE_STYLE.fillColor,
          fillOpacity: 0.7,
        };
      }

      const normalized = normalizeValue(value, colorRangeMin, colorRangeMax);
      return {
        ...DEFAULT_FEATURE_STYLE,
        fillColor: getHeatmapColor(normalized),
        fillOpacity: 0.7,
      };
    },
    [
      activeBinsPreset?.config.gradient,
      activeNoDataConfig?.color,
      binsCanApply,
      binsClassification.groupsBySiruta,
      isContinuousIntervalMode,
      colorRangeMax,
      colorRangeMin,
    ]
  );

  const enabledSeries = useMemo(
    () => mapState.series.filter((series) => series.enabled),
    [mapState.series]
  );

  const seriesColumns = useMemo<AdvancedMapAnalyticsTableSeriesColumn[]>(() => {
    if (enabledSeries.length === 0) {
      return [];
    }

    return enabledSeries.map((series) => ({
      id: series.id,
      label: resolveSeriesDisplayLabel(series),
      unit: resolveSeriesDisplayUnit(series, unitsBySeriesId),
    }));
  }, [enabledSeries, unitsBySeriesId]);

  const uatMetadataBySirutaCode = useMemo(() => {
    const metadataBySirutaCode = new Map<string, Omit<AdvancedMapAnalyticsTableRow, 'sirutaCode' | 'valuesBySeriesId'>>();

    for (const feature of geoJsonFeatures) {
      const properties = feature?.properties;
      const sirutaCode = String(properties?.natcode ?? '').trim();
      if (!sirutaCode) {
        continue;
      }

      metadataBySirutaCode.set(sirutaCode, {
        uatName: String(properties?.name ?? ''),
        countyName: String(properties?.county ?? ''),
        entityCui: getEntityCuiFromUatProperties(properties),
      });
    }

    return metadataBySirutaCode;
  }, [geoJsonFeatures]);

  const tableRows = useMemo<AdvancedMapAnalyticsTableRow[]>(() => {
    const activeSeriesColumn = activeSeriesId
      ? seriesColumns.find((seriesColumn) => seriesColumn.id === activeSeriesId)
      : undefined;
    const rowScopeSeriesColumns = activeSeriesColumn ? [activeSeriesColumn] : seriesColumns;
    const uniqueSirutaCodes = new Set<string>();

    for (const seriesColumn of rowScopeSeriesColumns) {
      const vector = valuesBySeriesId.get(seriesColumn.id);
      if (!vector) {
        continue;
      }

      for (const [sirutaCode, value] of vector.entries()) {
        if (value === undefined) {
          continue;
        }

        uniqueSirutaCodes.add(String(sirutaCode));
      }
    }

    return [...uniqueSirutaCodes]
      .map((sirutaCode) => {
        const metadata = uatMetadataBySirutaCode.get(sirutaCode);
        const rowValuesBySeriesId: Record<string, number | undefined> = {};

        for (const seriesColumn of seriesColumns) {
          rowValuesBySeriesId[seriesColumn.id] = valuesBySeriesId
            .get(seriesColumn.id)
            ?.get(sirutaCode);
        }

        return {
          sirutaCode,
          uatName: metadata?.uatName || `UAT ${sirutaCode}`,
          countyName: metadata?.countyName || t`Unknown county`,
          entityCui: metadata?.entityCui,
          valuesBySeriesId: rowValuesBySeriesId,
        };
      })
      .sort((left, right) => {
        const nameCompare = left.uatName.localeCompare(right.uatName, undefined, {
          sensitivity: 'base',
        });
        if (nameCompare !== 0) {
          return nameCompare;
        }
        return left.sirutaCode.localeCompare(right.sirutaCode);
      });
  }, [activeSeriesId, seriesColumns, uatMetadataBySirutaCode, valuesBySeriesId]);

  const toggleBinFilterSelection = useCallback(
    (presetId: string, groupId: string, checked: boolean) => {
      if (isReadOnly) {
        return;
      }

      updateState((draft) => {
        const preset = draft.binsPresets.find((entry) => entry.id === presetId);
        if (!preset) {
          delete draft.tableBinFiltersByPresetId[presetId];
          return;
        }

        const validGroupIds = new Set(
          buildDiscretePaletteFromConfig(preset.config).map((entry) => entry.groupId)
        );
        if (!validGroupIds.has(groupId)) {
          return;
        }

        const previousSelection = draft.tableBinFiltersByPresetId[presetId] ?? [];
        const sanitizedSelection = [...new Set(previousSelection)].filter((id) =>
          validGroupIds.has(id)
        );

        const nextSelection = checked
          ? sanitizedSelection.includes(groupId)
            ? sanitizedSelection
            : [...sanitizedSelection, groupId]
          : sanitizedSelection.filter((id) => id !== groupId);

        if (nextSelection.length === 0) {
          delete draft.tableBinFiltersByPresetId[presetId];
          return;
        }

        draft.tableBinFiltersByPresetId[presetId] = nextSelection;
      });
    },
    [isReadOnly, updateState]
  );

  const clearPresetBinFilters = useCallback(
    (presetId: string) => {
      if (isReadOnly) {
        return;
      }

      updateState((draft) => {
        delete draft.tableBinFiltersByPresetId[presetId];
      });
    },
    [isReadOnly, updateState]
  );

  const clearAllBinFilters = useCallback(() => {
    if (isReadOnly) {
      return;
    }

    updateState((draft) => {
      draft.tableBinFiltersByPresetId = {};
    });
  }, [isReadOnly, updateState]);

  const { filteredRows: filteredTableRows, binsFilterSections, hasActiveBinFilters } =
    useAdvancedMapAnalyticsTableBinsFilter({
      rows: tableRows,
      binsPresets: mapState.binsPresets,
      activeValues,
      tableBinFiltersByPresetId: mapState.tableBinFiltersByPresetId,
    });

  const getTooltipContent = useCallback(
    ({
      properties,
    }: {
      properties: UatProperties;
      heatmapData: HeatmapUATDataPoint[] | HeatmapCountyDataPoint[];
      mapViewType: 'UAT' | 'County';
      filters: AnalyticsFilterType;
    }) => {
      const uatName = String(properties.name ?? t`UAT`).trim();
      const natLevelName = normalizeNatLevelPrefix(properties.natLevName);
      const countyName = typeof properties.county === 'string'
        ? properties.county.trim()
        : '';
      const entityCui = getEntityCuiFromUatProperties(properties);
      const tooltipTitle = natLevelName.length > 0 ? `${natLevelName} ${uatName}` : uatName;
      const countyLabel = escapeHtml(t`County`);
      const countyRowHtml = countyName.length > 0
        ? `<div style="font-size:12px;color:#6b7280;margin-bottom:10px;">${countyLabel}: ${escapeHtml(countyName)}</div>`
        : '';

      if (!activeSeries) {
        return `
          <div style="font-family:Inter,sans-serif;font-size:13px;line-height:1.4;white-space:normal;overflow-wrap:anywhere;word-break:break-word;min-width:220px;max-width:320px;padding:8px;">
            <div style="font-weight:700;font-size:14px;margin-bottom:4px;">${escapeHtml(tooltipTitle)}</div>
            <div style="font-size:12px;color:#6b7280;margin-bottom:${countyName.length > 0 ? '2px' : '6px'};">${escapeHtml(t`CUI`)}: ${escapeHtml(entityCui ?? t`N/A`)}</div>
            ${countyName.length > 0
              ? `<div style="font-size:12px;color:#6b7280;margin-bottom:6px;">${countyLabel}: ${escapeHtml(countyName)}</div>`
              : ''
            }
            <div style="color:#6b7280;">${escapeHtml(t`No active series selected.`)}</div>
          </div>
        `;
      }

      const sirutaCode = String(properties.natcode ?? '');
      const seriesRows = enabledSeries.map((series) => {
        const seriesValue = valuesBySeriesId.get(series.id)?.get(sirutaCode);
        const unit = resolveSeriesDisplayUnit(series, unitsBySeriesId);
        const formattedValue = formatAdvancedMapAnalyticsSeriesValue(seriesValue, unit);
        return {
          label: resolveSeriesDisplayLabel(series),
          value: formattedValue,
          isActive: series.id === activeSeriesId,
        };
      });

      const rowsHtml = seriesRows
        .map(
          (seriesRow) => `
            <div style="display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:12px;align-items:flex-start;">
              <span style="min-width:0;font-weight:${seriesRow.isActive ? '700' : '500'};color:${
                seriesRow.isActive ? '#111827' : '#374151'
              };overflow-wrap:anywhere;word-break:break-word;">${escapeHtml(seriesRow.label)}</span>
              <span style="font-weight:${seriesRow.isActive ? '700' : '500'};text-align:right;white-space:nowrap;">${escapeHtml(
                seriesRow.value
              )}</span>
            </div>
          `
        )
        .join('');

      const activeSeriesValue = activeSeriesId
        ? valuesBySeriesId.get(activeSeriesId)?.get(sirutaCode)
        : undefined;
      const activeClassification = binsCanApply
        ? binsClassification.groupsBySiruta.get(sirutaCode) ??
          (activeNoDataConfig
            ? {
                label: activeNoDataConfig.label,
                isNoData: true,
              }
            : undefined)
        : undefined;

      const shouldShowNoDataTooltipMarker = binsCanApply
        ? Boolean(activeNoDataConfig?.showInTooltip && activeClassification?.isNoData)
        : Boolean(
            activeNoDataConfig &&
              activeNoDataConfig.showInTooltip &&
              (activeSeriesValue === undefined || !Number.isFinite(activeSeriesValue))
          );

      let noDataTooltipMarker = '';
      if (shouldShowNoDataTooltipMarker && activeNoDataConfig) {
        noDataTooltipMarker = `
          <div style="margin-top:8px;padding-top:8px;border-top:1px solid #e5e7eb;color:#6b7280;">
            ${escapeHtml(activeNoDataConfig.label)}
          </div>
        `;
      }

      return `
        <div style="font-family:Inter,sans-serif;font-size:13px;line-height:1.4;white-space:normal;overflow-wrap:anywhere;word-break:break-word;min-width:260px;max-width:360px;padding:8px;">
          <div style="font-weight:700;font-size:14px;margin-bottom:2px;">${escapeHtml(tooltipTitle)}</div>
          <div style="font-size:12px;color:#6b7280;margin-bottom:${countyName.length > 0 ? '2px' : '10px'};">${escapeHtml(t`CUI`)}: ${escapeHtml(entityCui ?? t`N/A`)}</div>
          ${countyRowHtml}
          <div style="display:flex;flex-direction:column;gap:6px;">
            ${rowsHtml || `<span>${escapeHtml(t`No enabled series`)}</span>`}
          </div>
          ${noDataTooltipMarker}
        </div>
      `;
    },
    [
      activeNoDataConfig,
      activeSeries,
      activeSeriesId,
      binsCanApply,
      binsClassification.groupsBySiruta,
      enabledSeries,
      unitsBySeriesId,
      valuesBySeriesId,
    ]
  );

  const handleMapViewChange = useCallback(
    (center: [number, number], zoom: number) => {
      const roundTo = (value: number, decimals: number) => {
        const factor = 10 ** decimals;
        return Math.round(value * factor) / factor;
      };

      const nextCenter: [number, number] = [roundTo(center[0], 5), roundTo(center[1], 5)];
      const nextZoom = roundTo(zoom, 1);

      updateState((draft) => {
        draft.mapCenter = nextCenter;
        draft.mapZoom = nextZoom;
      });
    },
    [updateState]
  );

  const hasEnabledGeoJsonDatasetSeries = enabledGeoJsonDatasetSeries.length > 0;
  const mapError = error || geoJsonError;
  const isMapLoading = isLoading || isGeoJsonLoading;
  const isTableLoading = isLoading || (hasEnabledGeoJsonDatasetSeries && isGeoJsonLoading);
  const tableError = error || (hasEnabledGeoJsonDatasetSeries ? geoJsonError : null);
  const isAnalyticsLoading = isLoading || (hasEnabledGeoJsonDatasetSeries && isGeoJsonLoading);
  const analyticsError = error || (hasEnabledGeoJsonDatasetSeries ? geoJsonError : null);
  const activeUnit = activeSeries
    ? resolveSeriesDisplayUnit(activeSeries, unitsBySeriesId)
    : undefined;
  const modalSeries = editorState
    ? mapState.series.find((series) => series.id === editorState.seriesId)
    : undefined;
  const modalValueFilterRule = valueFilterEditorState
    ? mapState.valueFilters.rules.find((rule) => rule.id === valueFilterEditorState.ruleId)
    : undefined;
  const modalValueFilterRuleIndex = modalValueFilterRule
    ? mapState.valueFilters.rules.findIndex((rule) => rule.id === modalValueFilterRule.id)
    : -1;
  const activeSeriesDisplayLabel = activeSeries
    ? resolveSeriesDisplayLabel(activeSeries)
    : activeSeriesId || t`None`;
  const mapName = mapState.mapName || t`Untitled map`;
  const isMapViewActive = mapState.activeView === 'map';
  const isTableViewActive = mapState.activeView === 'table';
  const isAnalyticsViewActive = mapState.activeView === 'analytics';
  const canOpenLocalSnapshots = !isReadOnly && typeof onOpenLocalSnapshots === 'function';
  const shouldShowSaveSnapshotCallToAction =
    !isReadOnly &&
    isMapViewActive &&
    hasPendingChanges &&
    typeof onRequestSaveSnapshot === 'function';
  const countyBoundaryGeoJsonData = mapState.showCountyBoundaries ? countyGeoJsonData : null;


  const handleTableRowClick = useCallback(
    (row: AdvancedMapAnalyticsTableRow) => {
      if (!row.entityCui) {
        return;
      }

      navigate({
        to: '/entities/$cui',
        params: { cui: row.entityCui },
      });
    },
    [navigate]
  );

  const handleMapFeatureClick = useCallback(
    (properties: UatProperties) => {
      if (mode !== 'public') {
        return;
      }

      const directEntityCui = getEntityCuiFromUatProperties(properties);
      const sirutaCode = String(properties?.natcode ?? '').trim();
      const metadataEntityCui =
        sirutaCode.length > 0 ? uatMetadataBySirutaCode.get(sirutaCode)?.entityCui : undefined;
      const entityCui = directEntityCui ?? metadataEntityCui;

      if (!entityCui) {
        return;
      }

      navigate({
        to: '/entities/$cui',
        params: { cui: entityCui },
      });
    },
    [mode, navigate, uatMetadataBySirutaCode]
  );

  useEffect(() => {
    if (editorState?.mode === 'edit' && !modalSeries) {
      setEditorState(null);
    }
  }, [editorState, modalSeries]);

  useEffect(() => {
    if (valueFilterEditorState?.mode === 'edit' && !modalValueFilterRule) {
      setValueFilterEditorState(null);
    }
  }, [modalValueFilterRule, valueFilterEditorState]);

  useEffect(() => {
    if (!isMobileControlsCollapseEnabled) {
      setIsMobileControlsCollapsed(false);
      return;
    }

    setIsMobileControlsCollapsed(true);
  }, [isMobileControlsCollapseEnabled]);

  const controlsPanels = (
    <>
      <AdvancedMapAnalyticsConfigPanel
        collapsed={Boolean(mapState.configPanelCollapsed)}
        activeView={mapState.activeView}
        mapName={mapName}
        showCountyBoundaries={mapState.showCountyBoundaries}
        mapDescription={mapDescription}
        warningCount={combinedWarnings.length}
        readOnly={isReadOnly}
        onToggleCollapsed={toggleConfigPanelCollapsed}
        onActiveViewChange={setActiveView}
        onShowCountyBoundariesChange={setShowCountyBoundaries}
        onOpenConfig={() => {
          if (!isReadOnly && onOpenOwnerConfig) {
            onOpenOwnerConfig();
          }
        }}
        onOpenWarnings={() => setIsWarningsModalOpen(true)}
      />
      <AdvancedMapAnalyticsSeriesPanel
        series={mapState.series}
        activeSeriesId={activeSeriesId}
        selectedSeriesId={selectedSeriesId}
        collapsed={Boolean(mapState.seriesPanelCollapsed)}
        readOnly={isReadOnly}
        onToggleCollapsed={togglePanelCollapsed}
        onAddSeries={addSeries}
        onSelectSeries={selectSeries}
        onActivate={setSeriesActivation}
        onMakeMain={makeSeriesMain}
        onEdit={editSeries}
        onMoveUp={moveSeriesUp}
        onMoveDown={moveSeriesDown}
        onDuplicate={duplicateSeries}
        onCopy={(seriesId) => void copySeriesToClipboard(seriesId)}
        onDelete={deleteSeries}
        onReorder={reorderSeries}
      />
      <AdvancedMapAnalyticsValueFiltersPanel
        collapsed={Boolean(mapState.valueFiltersPanelCollapsed)}
        rules={mapState.valueFilters.rules}
        series={mapState.series}
        readOnly={isReadOnly}
        onToggleCollapsed={toggleValueFiltersPanelCollapsed}
        onAddRule={addValueFilterRule}
        onReorder={reorderValueFilterRules}
        onEditRule={editValueFilterRule}
        onDeleteRule={deleteValueFilterRule}
        onMoveRule={moveValueFilterRule}
        onRuleEnabledChange={updateValueFilterRuleEnabled}
      />
      <AdvancedMapAnalyticsBinsPanel
        collapsed={Boolean(mapState.binsPanelCollapsed)}
        presets={mapState.binsPresets}
        activePresetId={mapState.activeBinPresetId}
        readOnly={isReadOnly}
        onToggleCollapsed={toggleBinsPanelCollapsed}
        onAddPreset={addBinsPreset}
        onSetActivePreset={setActiveBinsPreset}
        onEditPreset={editBinsPreset}
        onDeletePreset={deleteBinsPreset}
        onReorderPresets={reorderBinsPresets}
      />
    </>
  );

  const geoJsonSourceFooter = (
    <footer className="border-t pt-3 text-xs text-muted-foreground">
      <div className="flex items-center gap-1">
        <span>{t`GeoJSON source:`}</span>
        <a
          href="https://geo-spatial.org?utm_source=transparenta.eu"
          target="_blank"
          rel="noopener noreferrer"
          data-testid="map-geojson-source-link"
          className="rounded-sm underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t`geo-spatial.org`}
        </a>
      </div>
    </footer>
  );

  const localSnapshotsFooter = canOpenLocalSnapshots ? (
    <section className="rounded-xl border bg-muted/20 p-3">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={onOpenLocalSnapshots}
        disabled={isSavingSnapshot}
      >
        {localSnapshotCount > 0
          ? t`Local snapshots (${localSnapshotCount})`
          : t`Local snapshots`}
      </Button>
      <p className="mt-2 text-xs text-muted-foreground">
        {t`Stored only in this browser on this device.`}
      </p>
    </section>
  ) : null;

  return (
    <div className="relative flex flex-col bg-background md:h-screen md:flex-row">
      <MapAnalyticsQuickActions
        mode={mode}
        mapState={mapState}
        mapDescription={mapDescription}
        onBeforeExportConfig={onBeforeExportConfig}
        hiddenOnMobile={shouldOverlayMobileControls && !isMobileControlsCollapsed}
      />
      {shouldOverlayMobileControls && !isMobileControlsCollapsed ? (
        <div
          className="fixed inset-0 z-[640] bg-black/40"
          onClick={() => setIsMobileControlsCollapsed(true)}
          aria-hidden="true"
        />
      ) : null}
      <aside
        className={
          shouldOverlayMobileControls
            ? 'absolute inset-x-0 top-0 z-[650] max-h-[80vh] overflow-y-auto bg-card rounded-b-2xl shadow-lg'
            : 'border-r border-border bg-card text-card-foreground overflow-y-auto md:w-[430px] md:min-w-[430px]'
        }
      >
        <div className="space-y-4 p-4">
          {isMobileControlsCollapseEnabled ? (
            <>
              <section className="rounded-2xl border bg-card p-3 shadow-sm">
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-left text-sm font-medium hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setIsMobileControlsCollapsed((previousState) => !previousState)}
                  aria-expanded={!isMobileControlsCollapsed}
                  aria-controls={mobileControlsContentId}
                >
                  {isMobileControlsCollapsed ? t`Show Map Controls` : t`Hide Map Controls`}
                </button>
                {isMobileControlsCollapsed ? (
                  <p className="mt-2 truncate text-sm text-muted-foreground" title={mapState.mapName}>
                    {mapState.mapName}
                  </p>
                ) : null}
              </section>

              <Collapsible
                open={!isMobileControlsCollapsed}
                onOpenChange={(isOpen) => setIsMobileControlsCollapsed(!isOpen)}
              >
                <CollapsibleContent
                  id={mobileControlsContentId}
                  className="space-y-4 data-[state=open]:animate-in data-[state=closed]:animate-out"
                >
                  {controlsPanels}
                  {geoJsonSourceFooter}
                  {localSnapshotsFooter}
                </CollapsibleContent>
              </Collapsible>
            </>
          ) : (
            <>
              {controlsPanels}
              {geoJsonSourceFooter}
              {localSnapshotsFooter}
            </>
          )}
        </div>
      </aside>

      <main
        className={cn(
          'flex-1 flex flex-col md:min-h-0',
          shouldOverlayMobileControls ? 'min-h-screen pt-[72px]' : 'min-h-[55vh]'
        )}
      >
        <div className="flex-1 relative isolate overflow-hidden">
          {isMapViewActive ? (
            isMapLoading ? (
              <div className="h-full w-full flex items-center justify-center">
                <LoadingSpinner size="lg" text={t`Loading advanced map analytics...`} />
              </div>
            ) : mapError ? (
              <div className="h-full w-full flex items-center justify-center text-red-600">
                {mapError.message}
              </div>
            ) : !geoJsonData ? (
              <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                {t`Map geometry is unavailable.`}
              </div>
            ) : (
              <>
                <ClientOnly
                  fallback={
                    <div className="h-full w-full flex items-center justify-center">
                      <LoadingSpinner size="lg" text={t`Loading map...`} />
                    </div>
                  }
                >
                  <Suspense
                    fallback={
                      <div className="h-full w-full flex items-center justify-center">
                        <LoadingSpinner size="lg" text={t`Loading map...`} />
                      </div>
                    }
                  >
                    <InteractiveMap
                      onFeatureClick={handleMapFeatureClick}
                      getFeatureStyle={getFeatureStyle}
                      heatmapData={activeHeatmapData}
                      geoJsonData={geoJsonData}
                      countyBoundaryGeoJsonData={countyBoundaryGeoJsonData}
                      zoom={mapZoom}
                      center={mapState.mapCenter}
                      mapViewType="UAT"
                      filters={defaultMapFilters}
                      showLabels={Boolean(activeSeries)}
                      labelMode="active-series"
                      activeSeriesValuesBySirutaCode={activeValues}
                      activeSeriesUnit={activeUnit}
                      onViewChange={handleMapViewChange}
                      getTooltipContent={getTooltipContent}
                    />
                  </Suspense>
                </ClientOnly>

                {!activeSeries ? (
                  <div className="pointer-events-none absolute inset-0 z-[500] flex items-center justify-center p-4">
                    <div className="rounded-md border bg-card/95 px-3 py-2 text-sm text-muted-foreground shadow-sm">
                      {t`No active series selected.`}
                    </div>
                  </div>
                ) : null}

                <AnimatePresence>
                  {shouldShowSaveSnapshotCallToAction ? (
                    <motion.div
                      key="save-snapshot-cta"
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="pointer-events-none absolute inset-x-0 bottom-14 z-[520] flex justify-center px-4"
                    >
                      <button
                        type="button"
                        onClick={() => onRequestSaveSnapshot?.()}
                        disabled={isSavingSnapshot}
                        className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-2 text-sm font-medium text-accent shadow-lg shadow-accent/10 backdrop-blur-md transition-colors hover:bg-accent/20 disabled:pointer-events-none disabled:opacity-50 dark:border-accent-foreground/20 dark:bg-accent dark:text-accent-foreground dark:shadow-accent/5 dark:hover:bg-accent/80"
                      >
                        <Save className="h-3.5 w-3.5" />
                        {isSavingSnapshot ? t`Saving…` : t`Save snapshot`}
                      </button>
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                {activeSeries ? (
                  <div className="absolute bottom-4 right-4 z-[500]">
                    {binsCanApply ? (
                      <AdvancedMapAnalyticsDiscreteLegend
                        title={activeBinsLegendTitle}
                        entries={binsClassification.palette}
                      />
                    ) : (
                      <LegendCard
                        min={isContinuousIntervalMode ? realDataMin : colorRangeMin}
                        max={isContinuousIntervalMode ? realDataMax : colorRangeMax}
                        unit={activeUnit}
                        title={
                          isContinuousIntervalMode
                            ? activeBinsLegendTitle
                            : resolveSeriesDisplayLabel(activeSeries)
                        }
                        startColor={
                          isContinuousIntervalMode
                            ? (activeBinsPreset?.config.gradient.startColor ?? '#fff7bc')
                            : undefined
                        }
                        endColor={
                          isContinuousIntervalMode
                            ? (activeBinsPreset?.config.gradient.endColor ?? '#d7301f')
                            : undefined
                        }
                      />
                    )}
                  </div>
                ) : null}

              </>
            )
          ) : isTableViewActive ? (
            <div className="h-full w-full p-4">
              {isTableLoading ? (
                <div className="flex h-full items-center justify-center">
                  <LoadingSpinner size="lg" text={t`Loading table data...`} />
                </div>
              ) : tableError ? (
                <div className="flex h-full items-center justify-center text-red-600">
                  {tableError.message}
                </div>
              ) : enabledSeries.length === 0 ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  {t`No enabled series.`}
                </div>
              ) : tableRows.length === 0 ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  {t`No data available for table.`}
                </div>
              ) : (
                <AdvancedMapAnalyticsDataTable
                  rows={filteredTableRows}
                  seriesColumns={seriesColumns}
                  mapTitle={mapState.mapName}
                  showExportCsv={mode === 'owner'}
                  activeSeriesId={activeSeriesId}
                  onRowClick={handleTableRowClick}
                  binsFilterSections={binsFilterSections}
                  onToggleBinFilter={toggleBinFilterSelection}
                  onClearPresetBinFilters={clearPresetBinFilters}
                  onClearAllBinFilters={clearAllBinFilters}
                  hasActiveBinFilters={hasActiveBinFilters}
                />
              )}
            </div>
          ) : isAnalyticsViewActive ? (
            <div className="h-full w-full p-4">
              {isAnalyticsLoading ? (
                <div className="flex h-full items-center justify-center">
                  <LoadingSpinner size="lg" text={t`Loading analytics data...`} />
                </div>
              ) : analyticsError ? (
                <div className="flex h-full items-center justify-center text-red-600">
                  {analyticsError.message}
                </div>
              ) : (
                <AdvancedMapAnalyticsAnalyticsView
                  widgets={mapState.analyticsWidgets}
                  series={mapState.series}
                  activeSeriesId={activeSeriesId}
                  valuesBySeriesId={valuesBySeriesId}
                  unitsBySeriesId={unitsBySeriesId}
                  uatMetadataBySirutaCode={uatMetadataBySirutaCode}
                  readOnly={isReadOnly}
                  onToggleWidgetEnabled={toggleAnalyticsWidgetEnabled}
                  onReorderWidgets={reorderAnalyticsWidgets}
                  onUpdateWidget={updateAnalyticsWidget}
                />
              )}
            </div>
          ) : null}
        </div>
      </main>

      <AdvancedMapAnalyticsSeriesEditorModal
        open={!isReadOnly && editorState != null && modalSeries != null}
        mode={editorState?.mode ?? 'edit'}
        series={modalSeries}
        allSeries={mapState.series}
        geoJsonCountyOptions={geoJsonCountyOptions}
        geoJsonRegionOptions={geoJsonRegionOptions}
        onOpenChange={(open) => {
          if (!open) {
            setEditorState(null);
          }
        }}
        onUpdateSeries={updateSeries}
        onChangeSeriesType={changeSeriesType}
      />

      <AdvancedMapAnalyticsValueFilterEditorModal
        open={!isReadOnly && valueFilterEditorState != null && modalValueFilterRule != null}
        mode={valueFilterEditorState?.mode ?? 'edit'}
        rule={modalValueFilterRule}
        ruleIndex={modalValueFilterRuleIndex}
        series={mapState.series}
        onOpenChange={(open) => {
          if (!open) {
            setValueFilterEditorState(null);
          }
        }}
        onRuleChange={(nextRule) => {
          if (!modalValueFilterRule) {
            return;
          }

          replaceValueFilterRule(modalValueFilterRule.id, nextRule);
        }}
      />

      <AdvancedMapAnalyticsBinsModal
        open={!isReadOnly && binsEditorState != null && modalBinsPreset != null}
        preset={modalBinsPreset}
        activeSeriesLabel={activeSeriesDisplayLabel}
        activeSeriesValues={activeValues}
        onOpenChange={(open) => {
          if (!open) {
            closeBinsEditor();
          }
        }}
        onApplyPreset={applyBinsPreset}
      />

      <AdvancedMapAnalyticsWarningsModal
        open={isWarningsModalOpen}
        warnings={combinedWarnings}
        onOpenChange={setIsWarningsModalOpen}
      />
    </div>
  );
}

function LegendCard({
  min,
  max,
  unit,
  title,
  startColor,
  endColor,
}: Readonly<{
  min: number;
  max: number;
  unit?: string;
  title: string;
  startColor?: string;
  endColor?: string;
}>) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return null;
  }

  const gradient =
    startColor && endColor
      ? `linear-gradient(to right, ${startColor}, ${endColor})`
      : `linear-gradient(to right, ${Array.from({ length: 100 }, (_, index) => getHeatmapColor(index / 99)).join(', ')})`;

  return (
    <div className="bg-card/90 backdrop-blur-sm p-3 rounded-md border border-border shadow-sm w-[280px]">
      <h4 className="mb-2 text-xs font-semibold leading-snug break-words">{title}</h4>
      <div className="h-4 w-full border border-border rounded-sm" style={{ background: gradient }} />
      <div className="mt-1 flex justify-between text-xs">
        <span>{formatAdvancedMapAnalyticsSeriesValue(min, unit)}</span>
        <span>{formatAdvancedMapAnalyticsSeriesValue(max, unit)}</span>
      </div>
    </div>
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getEntityCuiFromUatProperties(properties: UatProperties | undefined): string | undefined {
  if (!properties) {
    return undefined;
  }

  const rawCandidates = [
    properties.cui,
    properties.uat_code,
    properties.uatCode,
    properties.entity_cui,
    properties.entityCui,
  ];

  for (const candidate of rawCandidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }

    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return String(candidate);
    }
  }

  return undefined;
}

function resolveSeriesDisplayLabel(series: MapSupportedSeries): string {
  const trimmedLabel = series.label.trim();
  if (trimmedLabel.length > 0) {
    return trimmedLabel;
  }

  if (series.type === 'geojson-dataset-series') {
    return getGeoJsonDatasetLabel(series.datasetKey);
  }

  return series.id;
}

function resolveSeriesDisplayUnit(
  series: MapSupportedSeries,
  unitsBySeriesId: Map<string, string | undefined>
): string | undefined {
  const derivedUnit = unitsBySeriesId.get(series.id);
  if (typeof derivedUnit === 'string') {
    const trimmedDerivedUnit = derivedUnit.trim();
    if (trimmedDerivedUnit.length > 0) {
      return trimmedDerivedUnit;
    }
  }

  const fallbackUnit = typeof series.unit === 'string' ? series.unit.trim() : '';
  if (series.type === 'geojson-dataset-series' && fallbackUnit.length === 0) {
    return getGeoJsonDatasetUnit(series.datasetKey);
  }

  if (fallbackUnit.length === 0) {
    return undefined;
  }

  if (series.type === 'ins-series' && fallbackUnit.toUpperCase() === 'RON') {
    return undefined;
  }

  return fallbackUnit;
}

function isEditableEventTarget(eventTarget: EventTarget | null): boolean {
  if (!(eventTarget instanceof HTMLElement)) {
    return false;
  }

  if (eventTarget.isContentEditable) {
    return true;
  }

  const closestEditableElement = eventTarget.closest('input, textarea, select, [contenteditable="true"]');
  return closestEditableElement !== null;
}

function readFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim();
    if (trimmedValue.length === 0) {
      return undefined;
    }

    const parsedValue = Number(trimmedValue);
    if (Number.isFinite(parsedValue)) {
      return parsedValue;
    }
  }

  return undefined;
}

function buildGeoJsonIdNameOptions(
  features: UatFeature[],
  idKey: 'countyId' | 'regionId',
  nameKey: 'county' | 'region'
): GeoJsonFilterOption[] {
  const namesById = new Map<number, string>();

  for (const feature of features) {
    const properties = feature?.properties;
    const rawId = readFiniteNumber(properties?.[idKey]);
    if (rawId === undefined) {
      continue;
    }

    const name = typeof properties?.[nameKey] === 'string'
      ? properties[nameKey].trim()
      : '';
    if (name.length === 0 || namesById.has(rawId)) {
      continue;
    }

    namesById.set(rawId, name);
  }

  return [...namesById.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((left, right) => {
      const locale = getUserLocale() === 'en' ? 'en' : 'ro';
      const nameCompare = left.name.localeCompare(right.name, locale, { sensitivity: 'base' });
      if (nameCompare !== 0) {
        return nameCompare;
      }

      return left.id - right.id;
    });
}

function normalizeNatLevelPrefix(rawNatLevelName: unknown): string {
  if (typeof rawNatLevelName !== 'string') {
    return '';
  }

  const normalized = rawNatLevelName
    .replace(/\s*,?\s*altul decat resedinta de judet/gi, '')
    .replace(/\s*,?\s*resedinta de judet/gi, '')
    .replace(/\s*,?\s*sectoarele municipiului Bucuresti/gi, '')

    .trim()
    .replace(/\s+/g, ' ');

  return normalized;
}
