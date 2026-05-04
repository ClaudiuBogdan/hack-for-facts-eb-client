import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { produce } from 'immer';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, BarChart3, Check, Loader2, MapIcon, MousePointer2, Pencil, Plus, Save, Star, TableIcon, Trash2, X } from 'lucide-react';
import { useHotkeys } from 'react-hotkeys-hook';
import { toast } from 'sonner';
import type { GeoJsonObject } from 'geojson';
import type { PathOptions } from 'leaflet';

import { ClientOnly } from '@/components/ssr/ClientOnly';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useGeoJsonData, type MapViewType } from '@/hooks/useGeoJson';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAdvancedMapAnalyticsSeriesData } from '@/hooks/useAdvancedMapAnalyticsSeriesData';
import { useAdvancedMapAnalyticsBins } from '@/hooks/useAdvancedMapAnalyticsBins';
import { useAdvancedMapAnalyticsTableBinsFilter } from '@/hooks/useAdvancedMapAnalyticsTableBinsFilter';
import { buildDiscretePaletteFromConfig, getContinuousGradientColor } from '@/lib/map-bins/bins';
import { getHeatmapColor, getPercentileValues, normalizeValue } from '@/components/maps/utils';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import type { UatFeature, UatProperties } from '@/components/maps/interfaces';
import type { HeatmapCountyDataPoint, HeatmapUATDataPoint } from '@/schemas/heatmap';
import { defaultMapFilters } from '@/schemas/map-filters';
import type { AnalyticsFilterType } from '@/schemas/charts';
import type {
  AdvancedMapAnalyticsTableGroupingColumn,
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
  MapGrouping,
  MapSupportedSeries,
} from '@/schemas/advanced-map-analytics';
import {
  createDefaultAdvancedMapAnalyticsValueFilterRule,
  createDefaultAdvancedMapAnalyticsSeries,
  createUniqueAdvancedMapAnalyticsId,
  getGeoJsonDatasetUnit,
} from '@/schemas/advanced-map-analytics';
import { useUserCurrency } from '@/lib/hooks/useUserCurrency';
import { useUserInflationAdjusted } from '@/lib/hooks/useUserInflationAdjusted';
import { useEntityProfile } from '@/lib/hooks/useEntityDetails';
import { buildEntityDetailsPath } from '@/lib/entity-navigation';
import { DEFAULT_FEATURE_STYLE } from '@/components/maps/constants';
import type { GroupedSeriesDataResponse, MapSeriesVectorCache } from '@/lib/map-series/interfaces';
import {
  areSeriesDomainsEqual,
  buildGroupMetadataById,
  buildGroupingValuesBySiruta,
  getGroupMetadataKey,
} from '@/lib/map-series/grouping';
import { AdvancedMapAnalyticsConfigPanel } from '@/components/maps/advanced-map-analytics/advanced-map-analytics-config-panel';
import { ViewTypeRadioGroup } from '@/components/filters/ViewTypeRadioGroup';
import { AdvancedMapAnalyticsBinsModal } from '@/components/maps/advanced-map-analytics/advanced-map-analytics-bins-modal';
import { AdvancedMapAnalyticsBinsPanel } from '@/components/maps/advanced-map-analytics/advanced-map-analytics-bins-panel';
import { AdvancedMapAnalyticsDiscreteLegend } from '@/components/maps/advanced-map-analytics/advanced-map-analytics-discrete-legend';
import { AdvancedMapAnalyticsLegendCard } from '@/components/maps/advanced-map-analytics/advanced-map-analytics-legend-card';
import { AdvancedMapAnalyticsSeriesPanel } from '@/components/maps/advanced-map-analytics/advanced-map-analytics-series-panel';
import { AdvancedMapAnalyticsValueFilterEditorModal } from '@/components/maps/advanced-map-analytics/advanced-map-analytics-value-filter-editor-modal';
import { AdvancedMapAnalyticsValueFiltersPanel } from '@/components/maps/advanced-map-analytics/advanced-map-analytics-value-filters-panel';
import { AdvancedMapAnalyticsSeriesEditorModal } from '@/components/maps/advanced-map-analytics/advanced-map-analytics-series-editor-modal';
import { AdvancedMapAnalyticsWarningsModal } from '@/components/maps/advanced-map-analytics/advanced-map-analytics-warnings-modal';
import { AdvancedMapAnalyticsAnalyticsView } from '@/components/maps/advanced-map-analytics/advanced-map-analytics-analytics-view';
import {
  MapAnalyticsEntityDetailsPanel,
  type MapAnalyticsEntityDetailsSelection,
  type MapAnalyticsEntitySeriesRow,
} from './map-analytics-entity-details-panel';
import { MapAnalyticsQuickActions } from './map-analytics-quick-actions';
import { MapAnalyticsDescriptionInline } from './map-analytics-description-inline';
import {
  applySetActiveSeries,
  applyToggleSeriesEnabled,
  convertSeriesToType,
  createCopiedMapSeriesPayload,
  duplicateSeriesAfterSource,
  ensureActiveSeriesSelection,
  normalizePastedMapSeries,
  reorderSeriesByIds,
  resolveSeriesDisplayLabel,
  resolveSeriesDisplayUnit,
} from '@/components/maps/advanced-map-analytics/advanced-map-analytics-series-utils';
import {
  escapeHtmlValue,
  getEntityCuiFromUatProperties,
  normalizeNatLevelPrefix,
  resolveUatDisplayTitle,
} from '@/components/maps/advanced-map-analytics/advanced-map-analytics-uat-properties';
import {
  createMapConfigTransferEnvelope,
  parseMapConfigTransferInput,
  type ImportedMapConfig,
} from '@/features/advanced-map-analytics/store/map-config-transfer';
import {
  createUploadedMapDatasetSeries,
  type UploadedMapDatasetReference,
} from '@/features/advanced-map-analytics/uploaded-map-dataset';
import { useUploadedMapDatasetPayloads } from '@/features/advanced-map-analytics/hooks/use-uploaded-map-dataset-payloads';
import type { AdvancedMapDatasetDetail } from '@/features/advanced-map-datasets/api/schemas';
import { loadInteractiveMapModule } from '@/features/advanced-map-analytics/analytics-map-warmup';
import type { MapEntitySelection } from '@/features/advanced-map-analytics/types/map-entity-selection';
import type { PublicMapViewport } from '@/features/advanced-map-analytics/hooks/use-public-map-viewport';
import { t } from '@lingui/core/macro';
import { cn, getUserLocale } from '@/lib/utils';

// Lazy load InteractiveMap to avoid Leaflet evaluation on the server.
const InteractiveMap = lazy(() =>
  loadInteractiveMapModule().then((module) => ({ default: module.InteractiveMap }))
);

const MANUAL_GROUPING_ID = 'manual-map-groups';
const MANUAL_GROUPING_KEY = 'manual';
const MANUAL_GROUPING_LABEL = 'Manual groups';
const MANUAL_GROUP_COLOR_PALETTE = [
  '#2563eb',
  '#059669',
  '#dc2626',
  '#7c3aed',
  '#ea580c',
  '#0891b2',
  '#be123c',
  '#4f46e5',
] as const;
const MANUAL_GROUP_UNASSIGNED_STYLE: PathOptions = {
  ...DEFAULT_FEATURE_STYLE,
  color: '#cbd5e1',
  weight: 0.8,
  opacity: 0.6,
  fillColor: '#e5e7eb',
  fillOpacity: 0.18,
};

interface EditorState {
  mode: 'add' | 'edit';
  seriesId: string;
}

interface ValueFilterEditorState {
  mode: 'add' | 'edit';
  ruleId: string;
}

type SelectedMapEntityDetails = MapAnalyticsEntityDetailsSelection;

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
  onOpenOwnerDescriptionConfig?: () => void;
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
  layout?: 'full' | 'preview';
  previewContainerClassName?: string;
  onEntityCuiSelect?: (selection: MapEntitySelection) => void;
  localValuesBySeriesId?: MapSeriesVectorCache;
  localUnitsBySeriesId?: Map<string, string | undefined>;
  displayUnitOverridesBySeriesId?: Map<string, string | null>;
  mapZoomOverride?: number;
  mapCenterOverride?: [number, number];
  mapViewType?: MapViewType;
  onMapViewportChange?: (nextViewport: PublicMapViewport) => void;
  onMapFeatureSelect?: (properties: UatProperties) => void;
}

function ensureManualGrouping(state: AdvancedMapAnalyticsUrlState): MapGrouping {
  let grouping = state.groupings.find((entry) => entry.id === MANUAL_GROUPING_ID);
  if (!grouping) {
    grouping = {
      id: MANUAL_GROUPING_ID,
      key: MANUAL_GROUPING_KEY,
      label: MANUAL_GROUPING_LABEL,
      groups: [],
    };
    state.groupings.push(grouping);
  }
  return grouping;
}

function createManualGroupId(memberSirutaCodes: string[]): string {
  const sortedCodes = [...new Set(memberSirutaCodes)].sort();
  let hash = 2166136261;
  for (const character of sortedCodes.join('|')) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `grp_${(hash >>> 0).toString(36)}`;
}

function createManualGroupLabel(memberSirutaCodes: string[], fallbackUatName: string): string {
  if (memberSirutaCodes.length === 1 && fallbackUatName.trim().length > 0) {
    return fallbackUatName.trim();
  }
  return `Group ${memberSirutaCodes.length}`;
}

function getOrderedManualGroupMemberCodes(group: MapGrouping['groups'][number]): string[] {
  if (!group.memberOrder?.length) {
    return group.memberSirutaCodes;
  }

  const members = new Set(group.memberSirutaCodes);
  const orderedMembers = group.memberOrder.filter((sirutaCode) => members.has(sirutaCode));
  const orderedMemberSet = new Set(orderedMembers);
  const remainingMembers = group.memberSirutaCodes.filter((sirutaCode) => !orderedMemberSet.has(sirutaCode));
  return [...orderedMembers, ...remainingMembers];
}

function isGroupedValueSourceCandidate(series: MapSupportedSeries): boolean {
  return series.type !== 'map-grouped-value-series';
}

function getDefaultGroupedSeriesGroupingId(
  groupings: MapGrouping[],
  activeGroupingId?: string
): string | undefined {
  const activeGrouping = activeGroupingId
    ? groupings.find((grouping) => grouping.id === activeGroupingId && grouping.groups.length > 0)
    : undefined;

  return activeGrouping?.id ?? groupings.find((grouping) => grouping.groups.length > 0)?.id;
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
  onOpenOwnerDescriptionConfig,
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
  layout = 'full',
  previewContainerClassName,
  onEntityCuiSelect,
  localValuesBySeriesId,
  localUnitsBySeriesId,
  displayUnitOverridesBySeriesId,
  mapZoomOverride,
  mapCenterOverride,
  mapViewType = 'UAT',
  onMapViewportChange,
  onMapFeatureSelect,
}: Readonly<MapAnalyticsWorkspaceProps>) {
  const navigate = useNavigate();
  const [userCurrency] = useUserCurrency();
  const [userInflationAdjusted] = useUserInflationAdjusted();
  const isMobile = useIsMobile();
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [valueFilterEditorState, setValueFilterEditorState] = useState<ValueFilterEditorState | null>(null);
  const [isWarningsModalOpen, setIsWarningsModalOpen] = useState(false);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | undefined>(undefined);
  const [selectedMapEntity, setSelectedMapEntity] = useState<SelectedMapEntityDetails | null>(null);
  const [isManualGroupCreateMode, setIsManualGroupCreateMode] = useState(false);
  const [activeManualGroupId, setActiveManualGroupId] = useState<string | undefined>(undefined);
  const [isMobileControlsCollapsed, setIsMobileControlsCollapsed] = useState(
    mobileControlsDefaultCollapsed
  );
  const isReadOnly = mode === 'public' || capabilities.readOnly;
  const isPreviewLayout = layout === 'preview';
  const shouldUseEntityDetailsPanel =
    !isPreviewLayout &&
    typeof onEntityCuiSelect !== 'function' &&
    typeof onMapFeatureSelect !== 'function';
  const isMobileControlsCollapseEnabled = isMobile && mobileControlsDefaultCollapsed;
  const shouldOverlayMobileControls =
    !isPreviewLayout &&
    mode === 'public' &&
    isMobileControlsCollapseEnabled &&
    mapState.activeView === 'map';
  const mobileControlsContentId = 'map-analytics-mobile-controls';
  const selectedEntityProfileQuery = useEntityProfile(selectedMapEntity?.entityCui);

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

  const addGroupedValueSeries = useCallback(() => {
    if (isReadOnly) {
      return;
    }

    const groupingId = getDefaultGroupedSeriesGroupingId(
      mapState.groupings,
      mapState.activeGroupingId
    );
    if (!groupingId) {
      toast.warning(t`Create a group before adding a grouped series.`);
      return;
    }

    const sourceSeriesOptions = mapState.series.filter(isGroupedValueSourceCandidate);
    const preferredSourceSeriesId = selectedSeriesId ?? mapState.activeSeriesId;
    const sourceSeries =
      sourceSeriesOptions.find((candidate) => candidate.id === preferredSourceSeriesId) ??
      sourceSeriesOptions[0];
    if (!sourceSeries) {
      toast.warning(t`Create a source series before adding a grouped series.`);
      return;
    }

    const nextSeries = createDefaultAdvancedMapAnalyticsSeries('map-grouped-value-series');
    if (nextSeries.type !== 'map-grouped-value-series') {
      return;
    }

    nextSeries.id = createUniqueAdvancedMapAnalyticsId(mapState.series.map((series) => series.id));
    nextSeries.label = t`Grouped ${resolveSeriesDisplayLabel(sourceSeries)}`;
    nextSeries.sourceSeriesId = sourceSeries.id;
    nextSeries.groupingId = groupingId;
    nextSeries.aggregation = 'sum';

    setEditorState({ mode: 'add', seriesId: nextSeries.id });
    setSelectedSeriesId(nextSeries.id);

    updateState((draft) => {
      draft.series.push(nextSeries);
      draft.activeSeriesId = nextSeries.id;
      draft.activeGroupingId = groupingId;
    });
  }, [
    isReadOnly,
    mapState.activeGroupingId,
    mapState.activeSeriesId,
    mapState.groupings,
    mapState.series,
    selectedSeriesId,
    updateState,
  ]);

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
        draft.activeGroupingId = nextState.activeGroupingId;
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

  const startManualGroupCreateMode = useCallback(() => {
    if (isReadOnly || isPreviewLayout || mapViewType !== 'UAT') {
      return;
    }

    updateState((draft) => {
      ensureManualGrouping(draft);
      draft.activeGroupingId = MANUAL_GROUPING_ID;
    });
    setSelectedMapEntity(null);
    setActiveManualGroupId(undefined);
    setIsManualGroupCreateMode(true);
  }, [isPreviewLayout, isReadOnly, mapViewType, updateState]);

  const startNextManualGroup = useCallback(() => {
    if (isReadOnly || isPreviewLayout || mapViewType !== 'UAT') {
      return;
    }

    updateState((draft) => {
      ensureManualGrouping(draft);
      draft.activeGroupingId = MANUAL_GROUPING_ID;
    });
    setSelectedMapEntity(null);
    setActiveManualGroupId(undefined);
    setIsManualGroupCreateMode(true);
  }, [isPreviewLayout, isReadOnly, mapViewType, updateState]);

  const finishManualGroupCreateMode = useCallback(() => {
    setIsManualGroupCreateMode(false);
    setActiveManualGroupId(undefined);
  }, []);

  const updateManualGroupingLabel = useCallback(
    (nextLabel: string) => {
      if (isReadOnly || isPreviewLayout) {
        return;
      }

      updateState((draft) => {
        const grouping = ensureManualGrouping(draft);
        grouping.label = nextLabel.trim().length > 0
          ? nextLabel
          : MANUAL_GROUPING_LABEL;
        draft.activeGroupingId = grouping.id;
      });
    },
    [isPreviewLayout, isReadOnly, updateState]
  );

  const setActiveGrouping = useCallback(
    (nextGroupingId: string | undefined) => {
      if (isReadOnly || isPreviewLayout) {
        return;
      }

      updateState((draft) => {
        const normalizedGroupingId = nextGroupingId?.trim();
        draft.activeGroupingId =
          normalizedGroupingId &&
          draft.groupings.some((grouping) => grouping.id === normalizedGroupingId)
            ? normalizedGroupingId
            : undefined;
      });
    },
    [isPreviewLayout, isReadOnly, updateState]
  );

  const selectManualGroup = useCallback(
    (groupId: string) => {
      if (isReadOnly || isPreviewLayout || mapViewType !== 'UAT') {
        return;
      }

      updateState((draft) => {
        ensureManualGrouping(draft);
        draft.activeGroupingId = MANUAL_GROUPING_ID;
      });
      setSelectedMapEntity(null);
      setActiveManualGroupId(groupId);
      setIsManualGroupCreateMode(true);
    },
    [isPreviewLayout, isReadOnly, mapViewType, updateState]
  );

  const updateManualGroupLabel = useCallback(
    (groupId: string, nextLabel: string) => {
      if (isReadOnly || isPreviewLayout) {
        return;
      }

      updateState((draft) => {
        const grouping = ensureManualGrouping(draft);
        const group = grouping.groups.find((entry) => entry.id === groupId);
        if (!group) {
          return;
        }

        group.label = nextLabel.trim().length > 0 ? nextLabel : group.id;
        draft.activeGroupingId = grouping.id;
      });
    },
    [isPreviewLayout, isReadOnly, updateState]
  );

  const deleteManualGroup = useCallback(
    (groupId: string) => {
      if (isReadOnly || isPreviewLayout) {
        return;
      }

      updateState((draft) => {
        const grouping = ensureManualGrouping(draft);
        grouping.groups = grouping.groups.filter((group) => group.id !== groupId);
        draft.activeGroupingId = grouping.id;
      });
      setActiveManualGroupId((currentGroupId) =>
        currentGroupId === groupId ? undefined : currentGroupId
      );
    },
    [isPreviewLayout, isReadOnly, updateState]
  );

  const removeManualGroupMember = useCallback(
    (groupId: string, sirutaCode: string) => {
      if (isReadOnly || isPreviewLayout) {
        return;
      }

      let nextActiveGroupId: string | undefined;
      updateState((draft) => {
        const grouping = ensureManualGrouping(draft);
        const groupIndex = grouping.groups.findIndex((group) => group.id === groupId);
        const group = grouping.groups[groupIndex];
        if (!group) {
          return;
        }

        group.memberSirutaCodes = group.memberSirutaCodes.filter((code) => code !== sirutaCode);
        group.memberOrder = group.memberOrder?.filter((code) => code !== sirutaCode);
        if (group.primarySirutaCode === sirutaCode) {
          group.primarySirutaCode = group.memberSirutaCodes[0];
        }

        if (group.memberSirutaCodes.length === 0) {
          grouping.groups.splice(groupIndex, 1);
          nextActiveGroupId = undefined;
          draft.activeGroupingId = grouping.id;
          return;
        }

        const previousLabel = group.label;
        const nextGroupId = createManualGroupId(group.memberSirutaCodes);
        group.id = nextGroupId;
        group.label = previousLabel?.trim() || createManualGroupLabel(group.memberSirutaCodes, '');
        nextActiveGroupId = nextGroupId;
        draft.activeGroupingId = grouping.id;
      });

      setActiveManualGroupId((currentGroupId) =>
        currentGroupId === groupId ? nextActiveGroupId : currentGroupId
      );
    },
    [isPreviewLayout, isReadOnly, updateState]
  );

  const moveManualGroupMember = useCallback(
    (groupId: string, sirutaCode: string, direction: 'previous' | 'next') => {
      if (isReadOnly || isPreviewLayout) {
        return;
      }

      updateState((draft) => {
        const grouping = ensureManualGrouping(draft);
        const group = grouping.groups.find((entry) => entry.id === groupId);
        if (!group) {
          return;
        }

        const orderedMembers = getOrderedManualGroupMemberCodes(group);
        const memberIndex = orderedMembers.indexOf(sirutaCode);
        if (memberIndex === -1) {
          return;
        }

        const nextMemberIndex = direction === 'previous' ? memberIndex - 1 : memberIndex + 1;
        if (nextMemberIndex < 0 || nextMemberIndex >= orderedMembers.length) {
          return;
        }

        [orderedMembers[memberIndex], orderedMembers[nextMemberIndex]] = [
          orderedMembers[nextMemberIndex],
          orderedMembers[memberIndex],
        ];
        group.memberOrder = orderedMembers;
        draft.activeGroupingId = grouping.id;
      });
    },
    [isPreviewLayout, isReadOnly, updateState]
  );

  const setManualGroupPrimaryMember = useCallback(
    (groupId: string, sirutaCode: string) => {
      if (isReadOnly || isPreviewLayout) {
        return;
      }

      updateState((draft) => {
        const grouping = ensureManualGrouping(draft);
        const group = grouping.groups.find((entry) => entry.id === groupId);
        if (!group || !group.memberSirutaCodes.includes(sirutaCode)) {
          return;
        }

        group.primarySirutaCode = sirutaCode;
        draft.activeGroupingId = grouping.id;
      });
    },
    [isPreviewLayout, isReadOnly, updateState]
  );

  const addFeatureToManualGroup = useCallback(
    (properties: UatProperties) => {
      if (isReadOnly || isPreviewLayout || mapViewType !== 'UAT') {
        return;
      }

      const sirutaCode = String(properties?.natcode ?? '').trim();
      if (sirutaCode.length === 0) {
        toast.warning(t`Selected UAT does not have a SIRUTA code.`);
        return;
      }

      const uatName = String(properties?.name ?? '').trim();
      let nextActiveGroupId: string | undefined;
      let nextMemberCount = 0;
      let didRemoveFromActiveGroup = false;

      updateState((draft) => {
        const grouping = ensureManualGrouping(draft);
        draft.activeGroupingId = grouping.id;

        let isNewGroup = false;
        let targetGroup = activeManualGroupId
          ? grouping.groups.find((group) => group.id === activeManualGroupId)
          : undefined;
        if (!targetGroup) {
          isNewGroup = true;
          targetGroup = {
            id: createManualGroupId([sirutaCode]),
            label: uatName.length > 0 ? uatName : undefined,
            memberSirutaCodes: [],
            memberOrder: [],
            primarySirutaCode: sirutaCode,
          };
          grouping.groups.push(targetGroup);
        }

        const targetGroupIndex = grouping.groups.findIndex((group) => group.id === targetGroup.id);
        if (!isNewGroup && targetGroup.memberSirutaCodes.includes(sirutaCode)) {
          didRemoveFromActiveGroup = true;
          targetGroup.memberSirutaCodes = targetGroup.memberSirutaCodes.filter((code) => code !== sirutaCode);
          targetGroup.memberOrder = targetGroup.memberOrder?.filter((code) => code !== sirutaCode);
          if (targetGroup.primarySirutaCode === sirutaCode) {
            targetGroup.primarySirutaCode = targetGroup.memberSirutaCodes[0];
          }

          if (targetGroup.memberSirutaCodes.length === 0) {
            if (targetGroupIndex !== -1) {
              grouping.groups.splice(targetGroupIndex, 1);
            }
            nextActiveGroupId = undefined;
            nextMemberCount = 0;
            return;
          }

          const previousLabel = targetGroup.label;
          const nextGroupId = createManualGroupId(targetGroup.memberSirutaCodes);
          targetGroup.id = nextGroupId;
          targetGroup.label = previousLabel?.trim() || createManualGroupLabel(targetGroup.memberSirutaCodes, '');
          nextActiveGroupId = nextGroupId;
          nextMemberCount = targetGroup.memberSirutaCodes.length;
          return;
        }

        for (let groupIndex = grouping.groups.length - 1; groupIndex >= 0; groupIndex -= 1) {
          const group = grouping.groups[groupIndex];
          if (!group || group.id === targetGroup.id) {
            continue;
          }

          group.memberSirutaCodes = group.memberSirutaCodes.filter((code) => code !== sirutaCode);
          group.memberOrder = group.memberOrder?.filter((code) => code !== sirutaCode);
          if (group.primarySirutaCode === sirutaCode) {
            group.primarySirutaCode = group.memberSirutaCodes[0];
          }
          if (group.memberSirutaCodes.length === 0) {
            grouping.groups.splice(groupIndex, 1);
          }
        }

        if (!targetGroup.memberSirutaCodes.includes(sirutaCode)) {
          targetGroup.memberSirutaCodes.push(sirutaCode);
        }
        targetGroup.memberOrder = [
          ...new Set([...(targetGroup.memberOrder ?? []), sirutaCode]),
        ].filter((code) => targetGroup.memberSirutaCodes.includes(code));
        targetGroup.primarySirutaCode = targetGroup.primarySirutaCode ?? sirutaCode;

        const nextGroupId = createManualGroupId(targetGroup.memberSirutaCodes);
        targetGroup.id = nextGroupId;
        if (isNewGroup || !targetGroup.label?.trim()) {
          targetGroup.label = createManualGroupLabel(targetGroup.memberSirutaCodes, uatName);
        }
        nextActiveGroupId = nextGroupId;
        nextMemberCount = targetGroup.memberSirutaCodes.length;
      });

      setActiveManualGroupId(nextActiveGroupId);
      if (didRemoveFromActiveGroup) {
        toast.success(
          nextMemberCount === 0
            ? t`Removed UAT and deleted the empty group.`
            : t`Removed UAT from group.`
        );
      } else {
        toast.success(
          nextMemberCount === 1
            ? t`Added 1 UAT to group.`
            : t`Added ${nextMemberCount} UATs to group.`
        );
      }
    },
    [activeManualGroupId, isPreviewLayout, isReadOnly, mapViewType, updateState]
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

  const assignUploadedDatasetSeries = useCallback(
    (
      seriesId: string,
      selection: UploadedMapDatasetReference,
      dataset: AdvancedMapDatasetDetail
    ) => {
      if (isReadOnly) {
        return;
      }

      updateState((draft) => {
        const index = draft.series.findIndex((series) => series.id === seriesId);
        if (index === -1) {
          return;
        }

        const currentSeries = draft.series[index];

        const nextLabel = dataset.title.trim().length > 0 ? dataset.title.trim() : 'Uploaded dataset';

        draft.series[index] = createUploadedMapDatasetSeries(dataset, selection, {
          id: currentSeries.id,
          enabled: currentSeries.enabled,
          label: nextLabel,
          unit: currentSeries.unit ?? '',
          createdAt: currentSeries.createdAt,
          updatedAt: new Date().toISOString(),
        });

        if (!draft.activeSeriesId) {
          draft.activeSeriesId = currentSeries.id;
        }
      });
    },
    [isReadOnly, updateState]
  );

  const mapZoom = mapZoomOverride ?? mapState.mapZoom ?? (isMobile ? 6 : 7.7);
  const mapCenter = mapCenterOverride ?? mapState.mapCenter;

  const serializedDraftLength = useMemo(
    () => JSON.stringify({ mapState, mapDescription }).length,
    [mapDescription, mapState]
  );

  const {
    data: geoJsonData,
    isLoading: isGeoJsonLoading,
    error: geoJsonError,
  } = useGeoJsonData(mapViewType);

  const { data: countyGeoJsonData } = useGeoJsonData('County', {
    enabled: mapViewType === 'UAT' && mapState.showCountyBoundaries,
  });

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

  const mergedLocalValuesBySeriesId = useMemo(() => {
    const valuesBySeriesId = new Map<string, Map<string, number | undefined>>();

    for (const [seriesId, vector] of localGeoJsonValuesBySeriesId.entries()) {
      valuesBySeriesId.set(seriesId, new Map(vector));
    }

    if (localValuesBySeriesId?.size) {
      for (const [seriesId, vector] of localValuesBySeriesId.entries()) {
        valuesBySeriesId.set(seriesId, new Map(vector));
      }
    }

    return valuesBySeriesId;
  }, [localGeoJsonValuesBySeriesId, localValuesBySeriesId]);

  const mergedLocalUnitsBySeriesId = useMemo(() => {
    const unitsBySeriesId = new Map<string, string | undefined>(
      localGeoJsonUnitsBySeriesId
    );

    if (!localUnitsBySeriesId?.size) {
      return unitsBySeriesId;
    }

    for (const [seriesId, unit] of localUnitsBySeriesId.entries()) {
      unitsBySeriesId.set(seriesId, unit);
    }

    return unitsBySeriesId;
  }, [localGeoJsonUnitsBySeriesId, localUnitsBySeriesId]);

  const {
    valuesBySeriesId,
    mapValuesBySeriesId,
    domainsBySeriesId,
    unitsBySeriesId,
    warnings: seriesWarnings,
    activeSeriesId,
    activeValues,
    isLoading,
    error,
  } = useAdvancedMapAnalyticsSeriesData({
    series: mapState.series,
    groupings: mapState.groupings,
    activeSeriesId: mapState.activeSeriesId,
    valueFilterRules: mapState.valueFilters.rules,
    defaultCurrency: userCurrency,
    defaultInflationAdjusted: userInflationAdjusted,
    serializedDraftLength,
    enabled: editorState == null,
    localValuesBySeriesId: mergedLocalValuesBySeriesId,
    localUnitsBySeriesId: mergedLocalUnitsBySeriesId,
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
  const closeSelectedMapEntityPanel = useCallback(() => {
    setSelectedMapEntity(null);
  }, []);

  useHotkeys('esc', () => {
    if (!shouldUseEntityDetailsPanel || mapState.activeView !== 'map' || selectedMapEntity === null) {
      return;
    }

    closeSelectedMapEntityPanel();
  });

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

  const manualGroupEditStylesBySirutaCode = useMemo<Map<string, PathOptions> | undefined>(() => {
    if (!isManualGroupCreateMode || mapViewType !== 'UAT') {
      return undefined;
    }

    const manualGrouping = mapState.groupings.find((grouping) => grouping.id === MANUAL_GROUPING_ID);
    if (!manualGrouping || manualGrouping.groups.length === 0) {
      return new Map();
    }

    const hasActiveGroup = Boolean(activeManualGroupId);
    const stylesBySirutaCode = new Map<string, PathOptions>();

    manualGrouping.groups.forEach((group, groupIndex) => {
      const groupColor = MANUAL_GROUP_COLOR_PALETTE[groupIndex % MANUAL_GROUP_COLOR_PALETTE.length];
      const isActiveGroup = group.id === activeManualGroupId;
      const isWashedOutGroup = hasActiveGroup && !isActiveGroup;
      const groupStyle: PathOptions = {
        ...DEFAULT_FEATURE_STYLE,
        color: isActiveGroup ? '#0f172a' : groupColor,
        weight: isActiveGroup ? 2.2 : 1.1,
        opacity: isWashedOutGroup ? 0.45 : 0.95,
        fillColor: groupColor,
        fillOpacity: isWashedOutGroup ? 0.28 : 0.72,
      };

      for (const sirutaCode of group.memberSirutaCodes) {
        stylesBySirutaCode.set(sirutaCode, groupStyle);
      }
    });

    return stylesBySirutaCode;
  }, [activeManualGroupId, isManualGroupCreateMode, mapState.groupings, mapViewType]);

  const getFeatureStyle = useCallback(
    (
      feature: UatFeature,
      heatmapDataMap: Map<string | number, HeatmapUATDataPoint | HeatmapCountyDataPoint>
    ) => {
      const featureKey = feature?.properties?.natcode;
      if (!featureKey) {
        return DEFAULT_FEATURE_STYLE;
      }

      if (manualGroupEditStylesBySirutaCode) {
        return manualGroupEditStylesBySirutaCode.get(String(featureKey)) ?? MANUAL_GROUP_UNASSIGNED_STYLE;
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
      manualGroupEditStylesBySirutaCode,
    ]
  );

  const enabledSeries = useMemo(
    () => mapState.series.filter((series) => series.enabled),
    [mapState.series]
  );
  const hasEnabledUploadedDatasetSeries = useMemo(
    () => enabledSeries.some((series) => series.type === 'uploaded-map-dataset'),
    [enabledSeries]
  );
  const { payloadsBySeriesId: uploadedDatasetPayloadsBySeriesId } =
    useUploadedMapDatasetPayloads(
      enabledSeries,
      (isPreviewLayout || mapState.activeView === 'map') &&
        hasEnabledUploadedDatasetSeries
    );

  const seriesColumns = useMemo<AdvancedMapAnalyticsTableSeriesColumn[]>(() => {
    if (enabledSeries.length === 0) {
      return [];
    }

    return enabledSeries.map((series) => ({
      id: series.id,
      label: resolveSeriesDisplayLabel(series),
      unit: resolveSeriesDisplayUnit(series, unitsBySeriesId, displayUnitOverridesBySeriesId),
    }));
  }, [displayUnitOverridesBySeriesId, enabledSeries, unitsBySeriesId]);

  const groupingColumns = useMemo<AdvancedMapAnalyticsTableGroupingColumn[]>(
    () =>
      mapState.groupings.map((grouping) => ({
        id: grouping.id,
        label: grouping.label || grouping.key || grouping.id,
      })),
    [mapState.groupings]
  );

  const groupValuesBySirutaCode = useMemo(
    () => buildGroupingValuesBySiruta({ groupings: mapState.groupings }),
    [mapState.groupings]
  );

  const groupMetadataById = useMemo(
    () => buildGroupMetadataById({ groupings: mapState.groupings }),
    [mapState.groupings]
  );

  const uatMetadataBySirutaCode = useMemo(() => {
    const metadataBySirutaCode = new Map<string, Omit<AdvancedMapAnalyticsTableRow, 'sirutaCode' | 'valuesBySeriesId' | 'groupValuesByGroupingId'>>();

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

  const selectedMapEntitySeriesRows = useMemo<MapAnalyticsEntitySeriesRow[]>(() => {
    if (!selectedMapEntity) {
      return [];
    }

    return enabledSeries.map((series) => ({
      id: series.id,
      label: resolveSeriesDisplayLabel(series),
      payload:
        uploadedDatasetPayloadsBySeriesId
          .get(series.id)
          ?.get(selectedMapEntity.sirutaCode) ?? null,
      value: formatAdvancedMapAnalyticsSeriesValue(
        mapValuesBySeriesId.get(series.id)?.get(selectedMapEntity.sirutaCode),
        resolveSeriesDisplayUnit(series, unitsBySeriesId, displayUnitOverridesBySeriesId)
      ),
      isActive: series.id === activeSeriesId,
    }));
  }, [
    activeSeriesId,
    displayUnitOverridesBySeriesId,
    enabledSeries,
    selectedMapEntity,
    unitsBySeriesId,
    uploadedDatasetPayloadsBySeriesId,
    mapValuesBySeriesId,
  ]);

  const tableRows = useMemo<AdvancedMapAnalyticsTableRow[]>(() => {
    const activeDomain = activeSeriesId ? domainsBySeriesId.get(activeSeriesId) : undefined;
    if (activeDomain?.type === 'group') {
      const activeSeriesColumn = seriesColumns.find((seriesColumn) => seriesColumn.id === activeSeriesId);
      const rowScopeSeriesColumns = activeSeriesColumn ? [activeSeriesColumn] : seriesColumns;
      const uniqueGroupIds = new Set<string>();

      for (const seriesColumn of rowScopeSeriesColumns) {
        const vector = valuesBySeriesId.get(seriesColumn.id);
        if (!vector) {
          continue;
        }

        const seriesDomain = domainsBySeriesId.get(seriesColumn.id);
        if (
          !seriesDomain ||
          seriesDomain.type !== 'group' ||
          seriesDomain.groupingId !== activeDomain.groupingId
        ) {
          continue;
        }

        for (const [groupId, value] of vector.entries()) {
          if (value === undefined) {
            continue;
          }

          uniqueGroupIds.add(String(groupId));
        }
      }

      return [...uniqueGroupIds]
        .map((groupId) => {
          const metadata = groupMetadataById.get(getGroupMetadataKey(activeDomain.groupingId, groupId));
          const rowValuesBySeriesId: Record<string, number | undefined> = {};

          for (const seriesColumn of seriesColumns) {
            const seriesDomain = domainsBySeriesId.get(seriesColumn.id);
            rowValuesBySeriesId[seriesColumn.id] =
              seriesDomain && areSeriesDomainsEqual(seriesDomain, activeDomain)
                ? valuesBySeriesId.get(seriesColumn.id)?.get(groupId)
                : undefined;
          }

          return {
            sirutaCode: groupId,
            uatName: metadata?.groupLabel || groupId,
            countyName: metadata?.groupingLabel || t`Group`,
            groupValuesByGroupingId: {
              [activeDomain.groupingId]: groupId,
            },
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
    }

    const activeSeriesColumn = activeSeriesId
      ? seriesColumns.find((seriesColumn) => seriesColumn.id === activeSeriesId)
      : undefined;
    const rowScopeSeriesColumns = activeSeriesColumn ? [activeSeriesColumn] : seriesColumns;
    const uniqueSirutaCodes = new Set<string>();

    for (const seriesColumn of rowScopeSeriesColumns) {
      const vector = mapValuesBySeriesId.get(seriesColumn.id);
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
          rowValuesBySeriesId[seriesColumn.id] = mapValuesBySeriesId
            .get(seriesColumn.id)
            ?.get(sirutaCode);
        }

        return {
          sirutaCode,
          uatName: metadata?.uatName || `UAT ${sirutaCode}`,
          countyName: metadata?.countyName || t`Unknown county`,
          entityCui: metadata?.entityCui,
          groupValuesByGroupingId: groupValuesBySirutaCode.get(sirutaCode),
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
  }, [
    activeSeriesId,
    domainsBySeriesId,
    groupMetadataById,
    groupValuesBySirutaCode,
    mapValuesBySeriesId,
    seriesColumns,
    uatMetadataBySirutaCode,
    valuesBySeriesId,
  ]);

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
      const sirutaCode = String(properties.natcode ?? '').trim();
      const activeSeriesDomain = activeSeriesId ? domainsBySeriesId.get(activeSeriesId) : undefined;
      const activeGroupId = activeSeriesDomain?.type === 'group'
        ? groupValuesBySirutaCode.get(sirutaCode)?.[activeSeriesDomain.groupingId]
        : undefined;
      const activeGroupMetadata =
        activeSeriesDomain?.type === 'group' && activeGroupId
          ? groupMetadataById.get(getGroupMetadataKey(activeSeriesDomain.groupingId, activeGroupId))
          : undefined;
      const tooltipTitle = activeGroupMetadata?.groupLabel ??
        (natLevelName.length > 0 ? `${natLevelName} ${uatName}` : uatName);
      const countyLabel = escapeHtmlValue(t`County`);
      const countyRowHtml = countyName.length > 0
        ? `<div style="font-size:12px;color:#6b7280;margin-bottom:10px;">${countyLabel}: ${escapeHtmlValue(countyName)}</div>`
        : '';
      const memberCountLabel = activeGroupMetadata
        ? activeGroupMetadata.memberSirutaCodes.length === 1
          ? t`1 UAT`
          : t`${activeGroupMetadata.memberSirutaCodes.length} UATs`
        : '';
      const groupRowsHtml = activeGroupMetadata
        ? `
          <div style="font-size:12px;color:#6b7280;margin-bottom:2px;">${escapeHtmlValue(t`Grouping`)}: ${escapeHtmlValue(activeGroupMetadata.groupingLabel)}</div>
          <div style="font-size:12px;color:#6b7280;margin-bottom:10px;">${escapeHtmlValue(t`Members`)}: ${escapeHtmlValue(memberCountLabel)}</div>
        `
        : '';

      if (!activeSeries) {
        return `
          <div style="font-family:Inter,sans-serif;font-size:13px;line-height:1.4;white-space:normal;overflow-wrap:anywhere;word-break:break-word;min-width:220px;max-width:320px;padding:8px;">
            <div style="font-weight:700;font-size:14px;margin-bottom:4px;">${escapeHtmlValue(tooltipTitle)}</div>
            <div style="font-size:12px;color:#6b7280;margin-bottom:${countyName.length > 0 ? '2px' : '6px'};">${escapeHtmlValue(t`CUI`)}: ${escapeHtmlValue(entityCui ?? t`N/A`)}</div>
            ${countyName.length > 0
              ? `<div style="font-size:12px;color:#6b7280;margin-bottom:6px;">${countyLabel}: ${escapeHtmlValue(countyName)}</div>`
              : ''
            }
            <div style="color:#6b7280;">${escapeHtmlValue(t`No active series selected.`)}</div>
          </div>
        `;
      }

      const seriesRows = enabledSeries.map((series) => {
        const seriesValue = mapValuesBySeriesId.get(series.id)?.get(sirutaCode);
        const unit = resolveSeriesDisplayUnit(series, unitsBySeriesId, displayUnitOverridesBySeriesId);
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
              };overflow-wrap:anywhere;word-break:break-word;">${escapeHtmlValue(seriesRow.label)}</span>
              <span style="font-weight:${seriesRow.isActive ? '700' : '500'};text-align:right;white-space:nowrap;">${escapeHtmlValue(
                seriesRow.value
              )}</span>
            </div>
          `
        )
        .join('');

      const activeSeriesValue = activeSeriesId
        ? mapValuesBySeriesId.get(activeSeriesId)?.get(sirutaCode)
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
            ${escapeHtmlValue(activeNoDataConfig.label)}
          </div>
        `;
      }

      return `
        <div style="font-family:Inter,sans-serif;font-size:13px;line-height:1.4;white-space:normal;overflow-wrap:anywhere;word-break:break-word;min-width:260px;max-width:360px;padding:8px;">
          <div style="font-weight:700;font-size:14px;margin-bottom:2px;">${escapeHtmlValue(tooltipTitle)}</div>
          ${activeGroupMetadata
            ? groupRowsHtml
            : `
              <div style="font-size:12px;color:#6b7280;margin-bottom:${countyName.length > 0 ? '2px' : '10px'};">${escapeHtmlValue(t`CUI`)}: ${escapeHtmlValue(entityCui ?? t`N/A`)}</div>
              ${countyRowHtml}
            `
          }
          <div style="display:flex;flex-direction:column;gap:6px;">
            ${rowsHtml || `<span>${escapeHtmlValue(t`No enabled series`)}</span>`}
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
      domainsBySeriesId,
      enabledSeries,
      displayUnitOverridesBySeriesId,
      groupMetadataById,
      groupValuesBySirutaCode,
      unitsBySeriesId,
      mapValuesBySeriesId,
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

      const hasSameCenter =
        mapState.mapCenter?.[0] === nextCenter[0] && mapState.mapCenter?.[1] === nextCenter[1];
      const hasSameZoom = mapState.mapZoom === nextZoom;

      if (hasSameCenter && hasSameZoom) {
        return;
      }

      updateState((draft) => {
        draft.mapCenter = nextCenter;
        draft.mapZoom = nextZoom;
      });

      onMapViewportChange?.({
        mapCenter: nextCenter,
        mapZoom: nextZoom,
      });
    },
    [mapState.mapCenter, mapState.mapZoom, onMapViewportChange, updateState]
  );

  const hasEnabledGeoJsonDatasetSeries = enabledGeoJsonDatasetSeries.length > 0;
  const mapError = error || geoJsonError;
  const isMapLoading = isLoading || isGeoJsonLoading;
  const isTableLoading = isLoading || (hasEnabledGeoJsonDatasetSeries && isGeoJsonLoading);
  const tableError = error || (hasEnabledGeoJsonDatasetSeries ? geoJsonError : null);
  const isAnalyticsLoading = isLoading || (hasEnabledGeoJsonDatasetSeries && isGeoJsonLoading);
  const analyticsError = error || (hasEnabledGeoJsonDatasetSeries ? geoJsonError : null);
  const activeUnit = activeSeries
    ? resolveSeriesDisplayUnit(activeSeries, unitsBySeriesId, displayUnitOverridesBySeriesId)
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
  const isMapViewActive = isPreviewLayout || mapState.activeView === 'map';
  const isTableViewActive = !isPreviewLayout && mapState.activeView === 'table';
  const isAnalyticsViewActive = !isPreviewLayout && mapState.activeView === 'analytics';
  const isEntityDetailsPanelOpen =
    shouldUseEntityDetailsPanel && !isPreviewLayout && isMapViewActive && selectedMapEntity !== null;
  const selectedEntityProfileErrorMessage =
    selectedEntityProfileQuery.error instanceof Error
      ? selectedEntityProfileQuery.error.message
      : selectedEntityProfileQuery.error
        ? t`Failed to load UAT profile details.`
        : undefined;
  const legendContainerClassName = cn(
    'absolute z-20',
    shouldUseEntityDetailsPanel
      ? isMobile
        ? 'left-4 top-4'
        : 'bottom-4 left-4'
      : 'bottom-4 right-4'
  );
  const canOpenLocalSnapshots = !isReadOnly && typeof onOpenLocalSnapshots === 'function';
  const shouldShowSaveSnapshotCallToAction =
    !isReadOnly &&
    isMapViewActive &&
    hasPendingChanges &&
    typeof onRequestSaveSnapshot === 'function';
  const countyBoundaryGeoJsonData =
    mapViewType === 'UAT' && mapState.showCountyBoundaries
      ? countyGeoJsonData
      : null;

  const groupingBoundaryGeoJsonData = useMemo<GeoJsonObject | null>(() => {
    if (mapViewType !== 'UAT') {
      return null;
    }

    const activeSeriesDomain = activeSeriesId ? domainsBySeriesId.get(activeSeriesId) : undefined;
    const activeGroupingId =
      activeSeriesDomain?.type === 'group'
        ? activeSeriesDomain.groupingId
        : mapState.activeGroupingId;
    const activeGrouping = activeGroupingId
      ? mapState.groupings.find((grouping) => grouping.id === activeGroupingId)
      : undefined;

    if (!activeGrouping) {
      return null;
    }

    const memberSirutaCodes = new Set(
      activeGrouping.groups.flatMap((group) => group.memberSirutaCodes)
    );
    const features = geoJsonFeatures.filter((feature) =>
      memberSirutaCodes.has(String(feature.properties?.natcode ?? '').trim())
    );

    if (features.length === 0) {
      return null;
    }

    return {
      type: 'FeatureCollection',
      features,
    } as GeoJsonObject;
  }, [
    activeSeriesId,
    domainsBySeriesId,
    geoJsonFeatures,
    mapState.activeGroupingId,
    mapState.groupings,
    mapViewType,
  ]);


  const handleTableRowClick = useCallback(
    (row: AdvancedMapAnalyticsTableRow) => {
      if (!row.entityCui) {
        return;
      }

      if (mode === 'public' && onEntityCuiSelect) {
        onEntityCuiSelect({
          entityCui: row.entityCui,
          entityName: row.uatName,
          countyName: row.countyName,
        });
        return;
      }

      navigate({
        to: '/entities/$cui',
        params: { cui: row.entityCui },
      });
    },
    [mode, navigate, onEntityCuiSelect]
  );

  const handleMapFeatureClick = useCallback(
    (properties: UatProperties) => {
      if (isManualGroupCreateMode) {
        addFeatureToManualGroup(properties);
        return;
      }

      const directEntityCui = getEntityCuiFromUatProperties(properties);
      const sirutaCode = String(properties?.natcode ?? '').trim();
      const metadata =
        sirutaCode.length > 0 ? uatMetadataBySirutaCode.get(sirutaCode) : undefined;
      const metadataEntityCui = metadata?.entityCui;
      const entityCui = directEntityCui ?? metadataEntityCui;
      const uatName = String(properties?.name ?? '').trim() || metadata?.uatName || t`Selected UAT`;
      const countyName = String(properties?.county ?? '').trim() || metadata?.countyName || '';
      const title = resolveUatDisplayTitle(properties, metadata?.uatName);

      if (shouldUseEntityDetailsPanel) {
        setSelectedMapEntity({
          entityCui,
          sirutaCode: sirutaCode || entityCui || uatName,
          title,
          uatName,
          countyName,
        });
        return;
      }

      if (mode !== 'public') {
        onMapFeatureSelect?.(properties);
        return;
      }

      if (!entityCui) {
        return;
      }

      if (onEntityCuiSelect) {
        onEntityCuiSelect({
          entityCui,
          entityName: uatName,
          countyName,
        });
        return;
      }

      navigate({
        to: '/entities/$cui',
        params: { cui: entityCui },
      });
    },
    [
      addFeatureToManualGroup,
      isManualGroupCreateMode,
      mode,
      navigate,
      onEntityCuiSelect,
      onMapFeatureSelect,
      shouldUseEntityDetailsPanel,
      uatMetadataBySirutaCode,
    ]
  );

  const selectedMapEntityHref = selectedMapEntity?.entityCui
    ? buildEntityDetailsPath(selectedMapEntity.entityCui)
    : undefined;

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
    if (!isEntityDetailsPanelOpen && selectedMapEntity !== null && !isMapViewActive) {
      setSelectedMapEntity(null);
    }
  }, [isEntityDetailsPanelOpen, isMapViewActive, selectedMapEntity]);

  useEffect(() => {
    if (!isMobileControlsCollapseEnabled) {
      setIsMobileControlsCollapsed(false);
      return;
    }

    setIsMobileControlsCollapsed(true);
  }, [isMobileControlsCollapseEnabled]);

  const manualGrouping = mapState.groupings.find((grouping) => grouping.id === MANUAL_GROUPING_ID);
  const activeManualGroup = activeManualGroupId
    ? manualGrouping?.groups.find((group) => group.id === activeManualGroupId)
    : undefined;
  const activeManualGroupMemberCount = activeManualGroup?.memberSirutaCodes.length ?? 0;
  const manualGroupCount = manualGrouping?.groups.length ?? 0;
  const selectedManualGroupBoundaryGeoJsonData = useMemo<GeoJsonObject | null>(() => {
    if (!isManualGroupCreateMode || mapViewType !== 'UAT' || !activeManualGroup) {
      return null;
    }

    const selectedMemberSirutaCodes = new Set(activeManualGroup.memberSirutaCodes);
    const features = geoJsonFeatures.filter((feature) =>
      selectedMemberSirutaCodes.has(String(feature.properties?.natcode ?? '').trim())
    );

    if (features.length === 0) {
      return null;
    }

    return {
      type: 'FeatureCollection',
      features,
    } as GeoJsonObject;
  }, [activeManualGroup, geoJsonFeatures, isManualGroupCreateMode, mapViewType]);
  const canCreateManualGroups = !isReadOnly && !isPreviewLayout && mapViewType === 'UAT';
  const groupedSeriesDefaultGroupingId = getDefaultGroupedSeriesGroupingId(
    mapState.groupings,
    mapState.activeGroupingId
  );
  const groupedSeriesSourceOptions = mapState.series.filter(isGroupedValueSourceCandidate);
  const groupedSeriesDisabledReason =
    groupedSeriesDefaultGroupingId
      ? groupedSeriesSourceOptions.length > 0
        ? undefined
        : t`Create a source series first.`
      : t`Create a group first.`;
  const canAddGroupedSeries =
    !isReadOnly &&
    Boolean(groupedSeriesDefaultGroupingId) &&
    groupedSeriesSourceOptions.length > 0;

  const controlsPanels = (
    <>
      <AdvancedMapAnalyticsConfigPanel
        collapsed={Boolean(mapState.configPanelCollapsed)}
        showCountyBoundaries={mapState.showCountyBoundaries}
        warningCount={combinedWarnings.length}
        readOnly={isReadOnly}
        onToggleCollapsed={toggleConfigPanelCollapsed}
        onShowCountyBoundariesChange={setShowCountyBoundaries}
        onOpenConfig={() => {
          if (!isReadOnly && onOpenOwnerConfig) {
            onOpenOwnerConfig();
          }
        }}
        onOpenWarnings={() => setIsWarningsModalOpen(true)}
      />
      <ManualGroupingPanel
        enabled={isManualGroupCreateMode}
        canEdit={canCreateManualGroups}
        grouping={manualGrouping}
        groupings={mapState.groupings}
        activeGroupingId={mapState.activeGroupingId}
        activeGroupId={activeManualGroupId}
        uatMetadataBySirutaCode={uatMetadataBySirutaCode}
        activeGroupMemberCount={activeManualGroupMemberCount}
        groupCount={manualGroupCount}
        onStart={startManualGroupCreateMode}
        onStartNext={startNextManualGroup}
        onFinish={finishManualGroupCreateMode}
        onActiveGroupingChange={setActiveGrouping}
        onGroupingLabelChange={updateManualGroupingLabel}
        onSelectGroup={selectManualGroup}
        onGroupLabelChange={updateManualGroupLabel}
        onDeleteGroup={deleteManualGroup}
        onRemoveMember={removeManualGroupMember}
        onMoveMember={moveManualGroupMember}
        onSetPrimaryMember={setManualGroupPrimaryMember}
      />
      <AdvancedMapAnalyticsSeriesPanel
        series={mapState.series}
        activeSeriesId={activeSeriesId}
        selectedSeriesId={selectedSeriesId}
        collapsed={Boolean(mapState.seriesPanelCollapsed)}
        readOnly={isReadOnly}
        canAddGroupedSeries={canAddGroupedSeries}
        groupedSeriesDisabledReason={groupedSeriesDisabledReason}
        onToggleCollapsed={togglePanelCollapsed}
        onAddSeries={addSeries}
        onAddGroupedSeries={isReadOnly ? undefined : addGroupedValueSeries}
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
    <footer className="text-[11px] text-muted-foreground/60">
      <div className="flex items-center gap-1">
        <span>{t`GeoJSON source:`}</span>
        <a
          href="https://geo-spatial.org?utm_source=transparenta.eu"
          target="_blank"
          rel="noopener noreferrer"
          data-testid="map-geojson-source-link"
          className="hover:text-muted-foreground underline underline-offset-2 transition-colors"
        >
          {t`geo-spatial.org`}
        </a>
      </div>
    </footer>
  );

  const localSnapshotsFooter = canOpenLocalSnapshots ? (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={onOpenLocalSnapshots}
        disabled={isSavingSnapshot}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border p-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
      >
        {localSnapshotCount > 0
          ? t`Local snapshots (${localSnapshotCount})`
          : t`Local snapshots`}
      </button>
      <p className="text-[11px] text-muted-foreground/60">
        {t`Stored only in this browser on this device.`}
      </p>
    </div>
  ) : null;

  if (isPreviewLayout) {
    return (
      <div
        className={cn(
          'relative isolate h-[420px] overflow-hidden sm:h-[460px]',
          previewContainerClassName,
        )}
      >
        {isMapLoading ? (
          <div className="flex h-full w-full items-center justify-center">
            <LoadingSpinner size="lg" text={t`Loading advanced map analytics...`} />
          </div>
        ) : mapError ? (
          <div className="flex h-full w-full items-center justify-center p-6 text-center text-red-600">
            {mapError.message}
          </div>
        ) : !geoJsonData ? (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            {t`Map geometry is unavailable.`}
          </div>
        ) : (
          <>
            <ClientOnly
              fallback={
                <div className="flex h-full w-full items-center justify-center">
                  <LoadingSpinner size="lg" text={t`Loading map...`} />
                </div>
              }
            >
              <Suspense
                fallback={
                  <div className="flex h-full w-full items-center justify-center">
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
                  groupingBoundaryGeoJsonData={groupingBoundaryGeoJsonData}
                  selectedGroupingBoundaryGeoJsonData={selectedManualGroupBoundaryGeoJsonData}
                  alwaysResolveFeatureStyle={isManualGroupCreateMode && mapViewType === 'UAT'}
                  zoom={mapZoom}
                  center={mapCenter}
                  mapViewType={mapViewType}
                  filters={defaultMapFilters}
                  mapHeight="100%"
                  showLabels={Boolean(activeSeries)}
                  labelMode="active-series"
                  activeSeriesValuesBySirutaCode={activeValues}
                  activeSeriesUnit={activeUnit}
                  onViewChange={handleMapViewChange}
                  getTooltipContent={getTooltipContent}
                  mobilePanMode="pinch-zoom-until-unlocked"
                  preferCanvasRenderer={false}
                />
              </Suspense>
            </ClientOnly>

            {!activeSeries ? (
              <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-4">
                <div className="rounded-md border bg-card/95 px-3 py-2 text-sm text-muted-foreground shadow-sm">
                  {t`No active series selected.`}
                </div>
              </div>
            ) : null}

            {activeSeries ? (
              <div className="absolute bottom-4 right-4 z-20">
                {binsCanApply ? (
                  <AdvancedMapAnalyticsDiscreteLegend
                    title={activeBinsLegendTitle}
                    entries={binsClassification.palette}
                  />
                ) : (
                  <AdvancedMapAnalyticsLegendCard
                    min={realDataMin}
                    max={realDataMax}
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
        )}
      </div>
    );
  }

  return (
    <div className="relative flex flex-col bg-background md:h-screen md:flex-row">
      <MapAnalyticsQuickActions
        mode={mode}
        mapState={mapState}
        mapDescription={mapDescription}
        onBeforeExportConfig={onBeforeExportConfig}
        hidden={isEntityDetailsPanelOpen}
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
        className={cn(
          shouldOverlayMobileControls
            ? 'absolute inset-x-0 top-0 z-[650] max-h-[80vh] overflow-y-auto bg-card rounded-b-2xl shadow-lg'
            : 'border-r border-border bg-background text-foreground overflow-y-auto md:w-[430px] md:min-w-[430px]',
          'flex flex-col'
        )}
      >
        <div className="flex-1 space-y-0 px-5 py-2">
          <div className="pt-2 pb-4">
            <ViewTypeRadioGroup
              value={mapState.activeView}
              onChange={setActiveView}
              viewOptions={[
                { id: 'map', label: t`Map`, icon: MapIcon },
                { id: 'table', label: t`Table`, icon: TableIcon },
                { id: 'analytics', label: t`Analytics`, icon: BarChart3 },
              ]}
              ariaLabel={t`Advanced map analytics active view`}
            />
          </div>

          {/* Map title and description */}
          <div className="pb-4 space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-foreground">{mapName}</h1>
            {mapDescription.trim().length > 0 ? (
              <MapAnalyticsDescriptionInline
                description={mapDescription}
                collapsedMaxHeightClassName="max-h-24"
                fadeFromClassName={shouldOverlayMobileControls ? 'from-card' : 'from-background'}
              />
            ) : null}
            {!isReadOnly && onOpenOwnerDescriptionConfig ? (
              <button
                type="button"
                onClick={onOpenOwnerDescriptionConfig}
                className="inline-flex w-fit items-center gap-1 rounded text-xs font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Pencil className="h-3 w-3" />
                {mapDescription.trim().length > 0 ? t`Edit description` : t`Add description`}
              </button>
            ) : null}
          </div>

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
                  {localSnapshotsFooter}
                </CollapsibleContent>
              </Collapsible>
            </>
          ) : (
            <>
              {controlsPanels}
              {localSnapshotsFooter}
            </>
          )}
        </div>

        <div className="px-5 py-3 border-t border-border/40">
          {geoJsonSourceFooter}
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
                      groupingBoundaryGeoJsonData={groupingBoundaryGeoJsonData}
                      selectedGroupingBoundaryGeoJsonData={selectedManualGroupBoundaryGeoJsonData}
                      alwaysResolveFeatureStyle={isManualGroupCreateMode && mapViewType === 'UAT'}
                      zoom={mapZoom}
                      center={mapCenter}
                      mapViewType={mapViewType}
                      filters={defaultMapFilters}
                      showLabels={Boolean(activeSeries)}
                      labelMode="active-series"
                      activeSeriesValuesBySirutaCode={activeValues}
                      activeSeriesUnit={activeUnit}
                      onViewChange={handleMapViewChange}
                      getTooltipContent={getTooltipContent}
                      mobilePanMode="pinch-zoom-until-unlocked"
                    />
                  </Suspense>
                </ClientOnly>

                {!activeSeries ? (
                  <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-4">
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
                      className="pointer-events-none absolute inset-x-0 bottom-14 z-30 flex justify-center px-4"
                    >
                      <button
                        type="button"
                        onClick={() => onRequestSaveSnapshot?.()}
                        disabled={isSavingSnapshot}
                        className="pointer-events-auto rounded-full bg-[linear-gradient(90deg,#ef4444,#f59e0b,#22c55e,#06b6d4,#6366f1,#ec4899,#ef4444)] p-px shadow-2xl shadow-black/25 transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50 dark:shadow-black/40"
                      >
                        <span className="inline-flex items-center gap-2 rounded-full bg-background px-4 py-2 text-sm font-medium text-foreground backdrop-blur-md dark:bg-accent dark:text-accent-foreground">
                          {isSavingSnapshot ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Save className="h-3.5 w-3.5" />
                          )}
                          {isSavingSnapshot ? t`Saving…` : t`Save snapshot`}
                        </span>
                      </button>
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                {activeSeries ? (
                  <div className={legendContainerClassName} data-testid="map-legend-container">
                    {binsCanApply ? (
                      <AdvancedMapAnalyticsDiscreteLegend
                        title={activeBinsLegendTitle}
                        entries={binsClassification.palette}
                      />
                    ) : (
                      <AdvancedMapAnalyticsLegendCard
                        min={realDataMin}
                        max={realDataMax}
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

                <AnimatePresence>
                  {isEntityDetailsPanelOpen && selectedMapEntity ? (
                    <MapAnalyticsEntityDetailsPanel
                      selection={selectedMapEntity}
                      seriesRows={selectedMapEntitySeriesRows}
                      isMobile={isMobile}
                      isProfileLoading={selectedEntityProfileQuery.isLoading}
                      profile={selectedEntityProfileQuery.data}
                      profileErrorMessage={selectedEntityProfileErrorMessage}
                      onClose={closeSelectedMapEntityPanel}
                      entityHref={selectedMapEntityHref}
                    />
                  ) : null}
                </AnimatePresence>

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
                  groupingColumns={groupingColumns}
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
                  domainsBySeriesId={domainsBySeriesId}
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
        groupings={mapState.groupings}
        geoJsonCountyOptions={geoJsonCountyOptions}
        geoJsonRegionOptions={geoJsonRegionOptions}
        onOpenChange={(open) => {
          if (!open) {
            setEditorState(null);
          }
        }}
        onUpdateSeries={updateSeries}
        onChangeSeriesType={changeSeriesType}
        onAssignUploadedDatasetSeries={assignUploadedDatasetSeries}
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

interface ManualGroupingPanelProps {
  enabled: boolean;
  canEdit: boolean;
  grouping?: MapGrouping;
  groupings: MapGrouping[];
  activeGroupingId?: string;
  activeGroupId?: string;
  uatMetadataBySirutaCode: Map<string, Omit<AdvancedMapAnalyticsTableRow, 'sirutaCode' | 'valuesBySeriesId' | 'groupValuesByGroupingId'>>;
  groupCount: number;
  activeGroupMemberCount: number;
  onStart: () => void;
  onStartNext: () => void;
  onFinish: () => void;
  onActiveGroupingChange: (groupingId: string | undefined) => void;
  onGroupingLabelChange: (nextLabel: string) => void;
  onSelectGroup: (groupId: string) => void;
  onGroupLabelChange: (groupId: string, nextLabel: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onRemoveMember: (groupId: string, sirutaCode: string) => void;
  onMoveMember: (groupId: string, sirutaCode: string, direction: 'previous' | 'next') => void;
  onSetPrimaryMember: (groupId: string, sirutaCode: string) => void;
}

function ManualGroupingPanel({
  enabled,
  canEdit,
  grouping,
  groupings,
  activeGroupingId,
  activeGroupId,
  uatMetadataBySirutaCode,
  groupCount,
  activeGroupMemberCount,
  onStart,
  onStartNext,
  onFinish,
  onActiveGroupingChange,
  onGroupingLabelChange,
  onSelectGroup,
  onGroupLabelChange,
  onDeleteGroup,
  onRemoveMember,
  onMoveMember,
  onSetPrimaryMember,
}: Readonly<ManualGroupingPanelProps>) {
  const groupingLabel = grouping?.label ?? MANUAL_GROUPING_LABEL;

  return (
    <section className="border-b border-border/40 py-5" data-testid="manual-grouping-panel">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="text-lg font-bold tracking-tight">{t`Groups`}</h2>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {enabled
              ? t`Click UATs on the map to add them.`
              : t`${groupCount} manual groups configured`}
          </p>
        </div>
        <div
          className={cn(
            'rounded-full px-2 py-1 text-[11px] font-medium',
            enabled
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {enabled ? t`Active` : t`Idle`}
        </div>
      </div>

      <div className="space-y-3">
        {groupings.length > 0 ? (
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">{t`Rendered grouping`}</span>
            <select
              value={activeGroupingId ?? ''}
              onChange={(event) => {
                onActiveGroupingChange(event.target.value || undefined);
              }}
              disabled={!canEdit}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={t`Rendered grouping`}
            >
              <option value="">{t`No grouping`}</option>
              {groupings.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label || entry.key || entry.id}
                </option>
              ))}
            </select>
            <span className="block text-[11px] text-muted-foreground">
              {t`Grouped active series render their own grouping.`}
            </span>
          </label>
        ) : null}

        {grouping ? (
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">{t`Grouping name`}</span>
            <input
              type="text"
              value={groupingLabel}
              onChange={(event) => onGroupingLabelChange(event.target.value)}
              disabled={!canEdit}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={t`Grouping name`}
            />
          </label>
        ) : null}

        <div className="rounded-md border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          {enabled
            ? activeGroupMemberCount > 0
              ? t`${activeGroupMemberCount} UATs in current group`
              : t`Current group is empty. Click a UAT to start it.`
            : t`Create mode stores clicked UATs in the active manual grouping.`}
        </div>

        <div className="flex flex-wrap gap-2">
          {enabled ? (
            <>
              <button
                type="button"
                onClick={onStartNext}
                disabled={!canEdit}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                {t`New group`}
              </button>
              <button
                type="button"
                onClick={onFinish}
                disabled={!canEdit}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" />
                {t`Finish`}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onStart}
              disabled={!canEdit}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
              data-testid="create-group-mode-button"
            >
              <MousePointer2 className="h-3.5 w-3.5" />
              {t`Create group`}
            </button>
          )}
        </div>

        {grouping?.groups.length ? (
          <div className="space-y-2" data-testid="manual-group-list">
            {grouping.groups.map((group) => {
              const isActiveGroup = group.id === activeGroupId;
              return (
                <div
                  key={group.id}
                  className={cn(
                    'rounded-md border p-3',
                    isActiveGroup ? 'border-primary/60 bg-primary/5' : 'border-border bg-background'
                  )}
                >
                  <div className="flex items-start gap-2">
                    <label className="min-w-0 flex-1 space-y-1">
                      <span className="sr-only">{t`Group name`}</span>
                      <input
                        type="text"
                        value={group.label ?? group.id}
                        onChange={(event) => onGroupLabelChange(group.id, event.target.value)}
                        disabled={!canEdit}
                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={t`Group name`}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => onSelectGroup(group.id)}
                      disabled={!canEdit}
                      className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-border px-2 text-xs font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
                    >
                      <MousePointer2 className="h-3.5 w-3.5" />
                      {isActiveGroup && enabled ? t`Adding` : t`Add here`}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteGroup(group.id)}
                      disabled={!canEdit}
                      aria-label={t`Delete group`}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {getOrderedManualGroupMemberCodes(group).map((sirutaCode, memberIndex, orderedMembers) => {
                      const metadata = uatMetadataBySirutaCode.get(sirutaCode);
                      const memberLabel = metadata?.uatName || `UAT ${sirutaCode}`;
                      const isPrimaryMember = group.primarySirutaCode === sirutaCode;
                      return (
                        <span
                          key={sirutaCode}
                          className="inline-flex max-w-full items-center gap-1 rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground"
                        >
                          <span className="truncate">{memberLabel}</span>
                          {isPrimaryMember ? (
                            <span className="rounded-full bg-background px-1 text-[10px] font-medium text-foreground">
                              {t`Primary`}
                            </span>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => onMoveMember(group.id, sirutaCode, 'previous')}
                            disabled={!canEdit || memberIndex === 0}
                            aria-label={t`Move UAT earlier in group`}
                            className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                          >
                            <ArrowLeft className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onMoveMember(group.id, sirutaCode, 'next')}
                            disabled={!canEdit || memberIndex === orderedMembers.length - 1}
                            aria-label={t`Move UAT later in group`}
                            className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                          >
                            <ArrowRight className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onSetPrimaryMember(group.id, sirutaCode)}
                            disabled={!canEdit || isPrimaryMember}
                            aria-label={t`Set primary UAT for group`}
                            className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                          >
                            <Star className={cn('h-3 w-3', isPrimaryMember && 'fill-current')} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveMember(group.id, sirutaCode)}
                            disabled={!canEdit}
                            aria-label={t`Remove UAT from group`}
                            className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
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
