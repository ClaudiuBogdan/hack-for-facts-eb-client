import {
  forwardRef,
  lazy,
  memo,
  Suspense,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useVirtualizer } from '@tanstack/react-virtual';
import { produce } from 'immer';
import { AnimatePresence, motion } from 'framer-motion';
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
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, BarChart3, Boxes, Check, ChevronDown, Copy, GripVertical, Loader2, MapIcon, MoreVertical, MousePointer2, Pencil, Plus, Save, Search, Star, TableIcon, Trash2, Upload, X } from 'lucide-react';
import { useHotkeys } from 'react-hotkeys-hook';
import { toast } from 'sonner';
import type { InteractiveMapFeatureStyle } from '@/components/maps/InteractiveMap';

import { ClientOnly } from '@/components/ssr/ClientOnly';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useGeoJsonData, type MapViewType } from '@/hooks/useGeoJson';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAdvancedMapAnalyticsSeriesData } from '@/hooks/useAdvancedMapAnalyticsSeriesData';
import { useAdvancedMapAnalyticsBins } from '@/hooks/useAdvancedMapAnalyticsBins';
import { useAdvancedMapAnalyticsTableBinsFilter } from '@/hooks/useAdvancedMapAnalyticsTableBinsFilter';
import { useAdvancedMapAnalyticsTableViewPreferences } from '@/hooks/useAdvancedMapAnalyticsTableViewPreferences';
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
import {
  EMPTY_ADVANCED_MAP_ANALYTICS_TABLE_ROWS_RESULT,
  buildAdvancedMapAnalyticsTableRows,
} from '@/components/maps/advanced-map-analytics/advanced-map-analytics-table-rows';
import { formatAdvancedMapAnalyticsSeriesValue } from '@/components/maps/advanced-map-analytics/advanced-map-analytics-formatting';
import type {
  AdvancedMapAnalyticsWidget,
  AdvancedMapAnalyticsWidgetKey,
  AdvancedMapAnalyticsUrlState,
  AdvancedMapAnalyticsValueFilterRule,
  GeoJsonFilterOption,
  GeoJsonDatasetSeriesConfiguration,
  MapGroup,
  MapGroupWorkspace,
  MapSupportedSeries,
} from '@/schemas/advanced-map-analytics';
import {
  createDefaultAdvancedMapAnalyticsValueFilterRule,
  createDefaultAdvancedMapAnalyticsSeries,
  createUniqueAdvancedMapAnalyticsId,
  getGeoJsonDatasetUnit,
  MapGroupWorkspaceSchema,
} from '@/schemas/advanced-map-analytics';
import { useUserCurrency } from '@/lib/hooks/useUserCurrency';
import { useUserInflationAdjusted } from '@/lib/hooks/useUserInflationAdjusted';
import { useEntityProfile } from '@/lib/hooks/useEntityDetails';
import { buildEntityDetailsPath } from '@/lib/entity-navigation';
import { DEFAULT_FEATURE_STYLE } from '@/components/maps/constants';
import type { GroupedSeriesDataResponse, MapSeriesVectorCache } from '@/lib/map-series/interfaces';
import {
  buildGroupMetadataById,
  buildGroupingValuesBySiruta,
  getGroupMetadataKey,
  resolveSeriesDisplayValueForSiruta,
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
import { buildPublicEntityGroupContext } from './map-analytics-public-view-helpers';
import { MapAnalyticsQuickActions } from './map-analytics-quick-actions';
import { MapAnalyticsDescriptionInline } from './map-analytics-description-inline';
import { MapAnalyticsGroupWorkspaceImportDialog } from './map-analytics-group-workspace-import-dialog';
import {
  useGroupWorkspaceBoundaryGeoJsonData,
  useMapGroupBoundaryGeoJsonData,
} from './map-analytics-group-boundary-hooks';
import { getAdvancedMapAnalyticsDraftSizeWarningLength } from './map-analytics-draft-size';
import {
  buildActiveMapRenderUnitContext,
  buildManualGroupDisplayValuesBySeriesId,
} from './map-analytics-render-units';
import {
  applySetActiveSeries,
  applyToggleSeriesEnabled,
  convertSeriesToType,
  createCopiedMapSeriesPayload,
  duplicateSeriesAfterSource,
  ensureActiveSeriesSelectionForGroupWorkspace,
  filterSeriesByGroupWorkspace,
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
import {
  areMapViewportsEqual,
  roundMapViewport,
} from '@/features/advanced-map-analytics/map-viewport-utils';
import { t } from '@lingui/core/macro';
import { cn, getUserLocale } from '@/lib/utils';

// Lazy load InteractiveMap to avoid evaluating the browser map renderer on the server.
const InteractiveMap = lazy(() =>
  loadInteractiveMapModule().then((module) => ({ default: module.InteractiveMap }))
);

const MANUAL_GROUP_WORKSPACE_KEY = 'manual';
const MANUAL_GROUP_WORKSPACE_LABEL = 'Manual groups';
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
const MANUAL_GROUP_FOCUS_RETRY_FRAME_LIMIT = 30;
const MANUAL_GROUP_UNASSIGNED_STYLE: InteractiveMapFeatureStyle = {
  ...DEFAULT_FEATURE_STYLE,
  color: '#cbd5e1',
  weight: 0.45,
  opacity: 0.45,
  fillColor: '#e5e7eb',
  fillOpacity: 0.14,
};
const GROUPED_RENDER_UNIT_MEMBER_STROKE: InteractiveMapFeatureStyle = {
  color: '#0f172a',
  weight: 0.2,
  opacity: 1,
  lineJoin: 'round',
  lineCap: 'round',
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

interface ManualGroupFocusTarget {
  readonly workspaceId: string;
  readonly groupId: string;
}

interface ManualGroupFocusRequest extends ManualGroupFocusTarget {
  readonly requestId: number;
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

function createManualGroupWorkspace(state: AdvancedMapAnalyticsUrlState): MapGroupWorkspace {
  const existingIds = state.groupWorkspaces.map((workspace) => workspace.id);
  const workspaceId = createUniqueAdvancedMapAnalyticsId(existingIds);
  const workspace = {
    id: workspaceId,
    key: `${MANUAL_GROUP_WORKSPACE_KEY}-${workspaceId}`,
    label: `${MANUAL_GROUP_WORKSPACE_LABEL} ${state.groupWorkspaces.length + 1}`,
    granularity: 'uat' as const,
    groups: [],
  };
  state.groupWorkspaces.push(workspace);
  return workspace;
}

function getActiveManualGroupWorkspace(state: AdvancedMapAnalyticsUrlState): MapGroupWorkspace | undefined {
  return state.activeGroupWorkspaceId
    ? state.groupWorkspaces.find((workspace) => workspace.id === state.activeGroupWorkspaceId)
    : undefined;
}

function ensureActiveManualGroupWorkspace(state: AdvancedMapAnalyticsUrlState): MapGroupWorkspace {
  const activeWorkspace = getActiveManualGroupWorkspace(state);
  if (activeWorkspace) {
    return activeWorkspace;
  }

  const workspace = createManualGroupWorkspace(state);
  state.activeGroupWorkspaceId = workspace.id;
  return workspace;
}

function findManualGroupWorkspace(
  state: AdvancedMapAnalyticsUrlState,
  workspaceId: string
): MapGroupWorkspace | undefined {
  return state.groupWorkspaces.find((workspace) => workspace.id === workspaceId);
}

function resolveManualGroupFocusTarget(params: {
  readonly sirutaCode: string;
  readonly workspaceId?: string;
  readonly groupValuesBySirutaCode: Map<string, Record<string, string | undefined>>;
  readonly groupWorkspaces: readonly MapGroupWorkspace[];
}): ManualGroupFocusTarget | undefined {
  const normalizedSirutaCode = params.sirutaCode.trim();
  if (!normalizedSirutaCode || !params.workspaceId) {
    return undefined;
  }

  const groupId = params.groupValuesBySirutaCode.get(normalizedSirutaCode)?.[params.workspaceId];
  if (!groupId) {
    return undefined;
  }

  const workspace = params.groupWorkspaces.find((entry) => entry.id === params.workspaceId);
  const group = workspace?.groups.find((entry) => entry.id === groupId);
  if (!workspace || !group) {
    return undefined;
  }

  return {
    workspaceId: workspace.id,
    groupId: group.id,
  };
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

function getManualGroupColor(groupIndex: number): string {
  return MANUAL_GROUP_COLOR_PALETTE[groupIndex % MANUAL_GROUP_COLOR_PALETTE.length];
}

function getColorMix(color: string, percent: number): string {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}

function getOrderedManualGroupMemberCodes(group: MapGroupWorkspace['groups'][number]): string[] {
  if (!group.memberOrder?.length) {
    return group.memberSirutaCodes;
  }

  const members = new Set(group.memberSirutaCodes);
  const orderedMembers = group.memberOrder.filter((sirutaCode) => members.has(sirutaCode));
  const orderedMemberSet = new Set(orderedMembers);
  const remainingMembers = group.memberSirutaCodes.filter((sirutaCode) => !orderedMemberSet.has(sirutaCode));
  return [...orderedMembers, ...remainingMembers];
}

function estimateManualGroupCardHeight(group: Pick<MapGroup, 'memberSirutaCodes'> | undefined): number {
  const memberCount = Math.max(1, group?.memberSirutaCodes.length ?? 0);
  const cardChromeHeight = 82;
  const memberRowHeight = 49;
  const rowGap = 12;
  return cardChromeHeight + memberCount * memberRowHeight + rowGap;
}

type GeoJsonCoordinate = readonly [number, number];
interface GeoJsonCoordinateBounds {
  minLongitude: number;
  maxLongitude: number;
  minLatitude: number;
  maxLatitude: number;
}

function isGeoJsonCoordinate(coordinate: unknown): coordinate is GeoJsonCoordinate {
  return (
    Array.isArray(coordinate) &&
    typeof coordinate[0] === 'number' &&
    Number.isFinite(coordinate[0]) &&
    typeof coordinate[1] === 'number' &&
    Number.isFinite(coordinate[1])
  );
}

function extendGeoJsonCoordinateBounds(value: unknown, bounds: GeoJsonCoordinateBounds): void {
  if (!Array.isArray(value)) {
    return;
  }

  if (isGeoJsonCoordinate(value)) {
    const [longitude, latitude] = value;
    bounds.minLongitude = Math.min(bounds.minLongitude, longitude);
    bounds.maxLongitude = Math.max(bounds.maxLongitude, longitude);
    bounds.minLatitude = Math.min(bounds.minLatitude, latitude);
    bounds.maxLatitude = Math.max(bounds.maxLatitude, latitude);
    return;
  }

  for (const entry of value) {
    extendGeoJsonCoordinateBounds(entry, bounds);
  }
}

function getManualGroupMapCenter(
  group: MapGroupWorkspace['groups'][number],
  geoJsonFeatures: readonly UatFeature[]
): [number, number] | undefined {
  const memberSirutaCodes = new Set(group.memberSirutaCodes);
  if (memberSirutaCodes.size === 0) {
    return undefined;
  }

  const bounds: GeoJsonCoordinateBounds = {
    minLongitude: Number.POSITIVE_INFINITY,
    maxLongitude: Number.NEGATIVE_INFINITY,
    minLatitude: Number.POSITIVE_INFINITY,
    maxLatitude: Number.NEGATIVE_INFINITY,
  };

  for (const feature of geoJsonFeatures) {
    const sirutaCode = String(feature.properties?.natcode ?? '').trim();
    if (!memberSirutaCodes.has(sirutaCode)) {
      continue;
    }

    if (feature.geometry && 'coordinates' in feature.geometry) {
      extendGeoJsonCoordinateBounds(feature.geometry.coordinates, bounds);
    }
  }

  if (
    !Number.isFinite(bounds.minLongitude) ||
    !Number.isFinite(bounds.maxLongitude) ||
    !Number.isFinite(bounds.minLatitude) ||
    !Number.isFinite(bounds.maxLatitude)
  ) {
    return undefined;
  }

  return [
    (bounds.minLatitude + bounds.maxLatitude) / 2,
    (bounds.minLongitude + bounds.maxLongitude) / 2,
  ];
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
  const [groupConfigWorkspaceId, setGroupConfigWorkspaceId] = useState<string | undefined>(undefined);
  const [isGroupWorkspaceImportOpen, setIsGroupWorkspaceImportOpen] = useState(false);
  const [manualGroupFocusRequest, setManualGroupFocusRequest] =
    useState<ManualGroupFocusRequest | null>(null);
  const [cameraCommandViewport, setCameraCommandViewport] = useState<PublicMapViewport | null>(null);
  const lastRuntimeViewportRef = useRef<PublicMapViewport>({
    mapCenter: mapCenterOverride ?? mapState.mapCenter,
    mapZoom: mapZoomOverride ?? mapState.mapZoom,
  });
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
  const visibleSeries = useMemo(
    () => filterSeriesByGroupWorkspace(mapState.series, mapState.activeGroupWorkspaceId),
    [mapState.activeGroupWorkspaceId, mapState.series]
  );
  const visibleActiveSeriesId = useMemo(() => {
    if (
      mapState.activeSeriesId &&
      visibleSeries.some((series) => series.id === mapState.activeSeriesId && series.enabled)
    ) {
      return mapState.activeSeriesId;
    }

    return visibleSeries.find((series) => series.enabled)?.id;
  }, [mapState.activeSeriesId, visibleSeries]);

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
    nextSeries.groupWorkspaceId = mapState.activeGroupWorkspaceId;

    setEditorState({ mode: 'add', seriesId: nextSeries.id });
    setSelectedSeriesId(nextSeries.id);

    updateState((draft) => {
      const isFirstSeriesInActiveGrouping =
        filterSeriesByGroupWorkspace(draft.series, draft.activeGroupWorkspaceId).length === 0;
      nextSeries.label = t`Data series ${draft.series.length + 1}`;
      draft.series.push(nextSeries);

      if (isFirstSeriesInActiveGrouping) {
        draft.activeSeriesId = nextSeries.id;
      }
    });
  }, [isReadOnly, mapState.activeGroupWorkspaceId, mapState.series, updateState]);

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
        const ensuredSelection = ensureActiveSeriesSelectionForGroupWorkspace(
          nextSeries,
          draft.activeSeriesId,
          draft.activeGroupWorkspaceId
        );
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
        draft.activeGroupWorkspaceId = nextState.activeGroupWorkspaceId;
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
        const ensuredSelection = ensureActiveSeriesSelectionForGroupWorkspace(
          nextState.series,
          nextState.activeSeriesId,
          draft.activeGroupWorkspaceId
        );
        draft.series = ensuredSelection.series;
        draft.activeSeriesId = ensuredSelection.activeSeriesId;
      });
    },
    [isReadOnly, updateState]
  );

  const addManualGroupWorkspace = useCallback(() => {
    if (isReadOnly || isPreviewLayout || mapViewType !== 'UAT') {
      return;
    }

    updateState((draft) => {
      const workspace = createManualGroupWorkspace(draft);
      draft.activeGroupWorkspaceId = workspace.id;
    });
    setSelectedMapEntity(null);
    setActiveManualGroupId(undefined);
    setIsManualGroupCreateMode(true);
  }, [isPreviewLayout, isReadOnly, mapViewType, updateState]);

  const importManualGroupWorkspace = useCallback(
    (workspaceLabel: string, groups: MapGroup[]) => {
      if (isReadOnly || isPreviewLayout || mapViewType !== 'UAT') {
        return;
      }

      const workspaceId = createUniqueAdvancedMapAnalyticsId(
        mapState.groupWorkspaces.map((workspace) => workspace.id)
      );
      const workspace = MapGroupWorkspaceSchema.parse({
        id: workspaceId,
        key: `imported-group-workspace-${workspaceId}`,
        label: workspaceLabel.trim() || t`Imported group workspace`,
        granularity: 'uat',
        groups,
      });

      updateState((draft) => {
        draft.groupWorkspaces.push(workspace);
        draft.activeGroupWorkspaceId = workspace.id;
      });
      setSelectedMapEntity(null);
      setActiveManualGroupId(undefined);
      setIsManualGroupCreateMode(false);
      setGroupConfigWorkspaceId(workspace.id);
      toast.success(t`Group workspace imported`);
    },
    [isPreviewLayout, isReadOnly, mapState.groupWorkspaces, mapViewType, updateState]
  );

  const addManualGroupItem = useCallback(
    (workspaceId: string) => {
      if (isReadOnly || isPreviewLayout) {
        return;
      }

      updateState((draft) => {
        const workspace = findManualGroupWorkspace(draft, workspaceId);
        if (!workspace) {
          return;
        }

        const groupId = createUniqueAdvancedMapAnalyticsId(workspace.groups.map((group) => group.id));
        workspace.groups.push({
          id: groupId,
          label: t`Group ${workspace.groups.length + 1}`,
          memberSirutaCodes: [],
          memberOrder: [],
        });
      });
    },
    [isPreviewLayout, isReadOnly, updateState]
  );

  const finishManualGroupCreateMode = useCallback(() => {
    setIsManualGroupCreateMode(false);
    setActiveManualGroupId(undefined);
  }, []);

  const startManualGroupCreateMode = useCallback(
    (workspaceId: string) => {
      if (isReadOnly || isPreviewLayout || mapViewType !== 'UAT') {
        return;
      }

      updateState((draft) => {
        if (!findManualGroupWorkspace(draft, workspaceId)) {
          return;
        }
        draft.activeGroupWorkspaceId = workspaceId;
      });
      setSelectedMapEntity(null);
      setActiveManualGroupId(undefined);
      setIsManualGroupCreateMode(true);
    },
    [isPreviewLayout, isReadOnly, mapViewType, updateState]
  );

  const selectManualGroup = useCallback(
    (workspaceId: string, groupId: string) => {
      if (isReadOnly || isPreviewLayout || mapViewType !== 'UAT') {
        return;
      }

      updateState((draft) => {
        const workspace = findManualGroupWorkspace(draft, workspaceId);
        if (!workspace?.groups.some((group) => group.id === groupId)) {
          return;
        }
        draft.activeGroupWorkspaceId = workspace.id;
      });
      setSelectedMapEntity(null);
      setActiveManualGroupId(groupId);
      setIsManualGroupCreateMode(true);
    },
    [isPreviewLayout, isReadOnly, mapViewType, updateState]
  );

  const setActiveManualGroupWorkspace = useCallback(
    (workspaceId: string) => {
      if (isReadOnly || isPreviewLayout) {
        return;
      }

      updateState((draft) => {
        if (!findManualGroupWorkspace(draft, workspaceId)) {
          return;
        }
        draft.activeGroupWorkspaceId = workspaceId;
        const ensuredSelection = ensureActiveSeriesSelectionForGroupWorkspace(
          draft.series,
          draft.activeSeriesId,
          draft.activeGroupWorkspaceId
        );
        draft.series = ensuredSelection.series;
        draft.activeSeriesId = ensuredSelection.activeSeriesId;
      });
      setActiveManualGroupId(undefined);
      setIsManualGroupCreateMode(false);
    },
    [isPreviewLayout, isReadOnly, updateState]
  );

  const toggleActiveManualGroupWorkspace = useCallback(
    (workspaceId: string) => {
      if (isReadOnly || isPreviewLayout) {
        return;
      }

      updateState((draft) => {
        if (!findManualGroupWorkspace(draft, workspaceId)) {
          return;
        }
        draft.activeGroupWorkspaceId =
          draft.activeGroupWorkspaceId === workspaceId ? undefined : workspaceId;
        const ensuredSelection = ensureActiveSeriesSelectionForGroupWorkspace(
          draft.series,
          draft.activeSeriesId,
          draft.activeGroupWorkspaceId
        );
        draft.series = ensuredSelection.series;
        draft.activeSeriesId = ensuredSelection.activeSeriesId;
      });
      setActiveManualGroupId(undefined);
      setIsManualGroupCreateMode(false);
    },
    [isPreviewLayout, isReadOnly, updateState]
  );

  const openManualGroupWorkspaceConfig = useCallback((workspaceId: string) => {
    setManualGroupFocusRequest(null);
    setGroupConfigWorkspaceId(workspaceId);
  }, []);

  const closeManualGroupWorkspaceConfig = useCallback(() => {
    setManualGroupFocusRequest(null);
    setGroupConfigWorkspaceId(undefined);
  }, []);

  const clearManualGroupFocusRequest = useCallback((requestId: number) => {
    setManualGroupFocusRequest((currentRequest) =>
      currentRequest?.requestId === requestId ? null : currentRequest
    );
  }, []);

  const updateManualGroupWorkspaceLabel = useCallback(
    (workspaceId: string, nextLabel: string) => {
      if (isReadOnly || isPreviewLayout) {
        return;
      }

      updateState((draft) => {
        const workspace = findManualGroupWorkspace(draft, workspaceId);
        if (!workspace) {
          return;
        }

        workspace.label = nextLabel.trim().length > 0 ? nextLabel : workspace.id;
      });
    },
    [isPreviewLayout, isReadOnly, updateState]
  );

  const deleteManualGroupWorkspace = useCallback(
    (workspaceId: string) => {
      if (isReadOnly || isPreviewLayout) {
        return;
      }

      const removedGroupedSeriesIds = new Set(
        mapState.series
          .filter(
            (series) =>
              series.groupWorkspaceId === workspaceId &&
              series.type === 'map-grouped-value-series'
          )
          .map((series) => series.id)
      );
      updateState((draft) => {
        draft.groupWorkspaces = draft.groupWorkspaces.filter((workspace) => workspace.id !== workspaceId);
        if (draft.activeGroupWorkspaceId === workspaceId) {
          draft.activeGroupWorkspaceId = undefined;
        }

        draft.series = draft.series.filter((series) => {
          if (series.groupWorkspaceId !== workspaceId) {
            return true;
          }

          if (series.type === 'map-grouped-value-series') {
            return false;
          }

          series.groupWorkspaceId = undefined;
          return true;
        });

        const ensuredSelection = ensureActiveSeriesSelectionForGroupWorkspace(
          draft.series,
          removedGroupedSeriesIds.has(draft.activeSeriesId ?? '') ? undefined : draft.activeSeriesId,
          draft.activeGroupWorkspaceId
        );
        draft.series = ensuredSelection.series;
        draft.activeSeriesId = ensuredSelection.activeSeriesId;
      });
      setActiveManualGroupId(undefined);
      setGroupConfigWorkspaceId((currentWorkspaceId) =>
        currentWorkspaceId === workspaceId ? undefined : currentWorkspaceId
      );
      setManualGroupFocusRequest((currentRequest) =>
        currentRequest?.workspaceId === workspaceId ? null : currentRequest
      );
      setEditorState((currentState) =>
        currentState && removedGroupedSeriesIds.has(currentState.seriesId) ? null : currentState
      );
      setSelectedSeriesId((currentSeriesId) =>
        currentSeriesId && removedGroupedSeriesIds.has(currentSeriesId) ? undefined : currentSeriesId
      );
      setIsManualGroupCreateMode(false);
    },
    [isPreviewLayout, isReadOnly, mapState.series, updateState]
  );

  const moveManualGroupWorkspace = useCallback(
    (workspaceId: string, direction: 'up' | 'down') => {
      if (isReadOnly || isPreviewLayout) {
        return;
      }

      updateState((draft) => {
        const sourceIndex = draft.groupWorkspaces.findIndex((workspace) => workspace.id === workspaceId);
        if (sourceIndex === -1) {
          return;
        }

        const targetIndex = direction === 'up' ? sourceIndex - 1 : sourceIndex + 1;
        if (targetIndex < 0 || targetIndex >= draft.groupWorkspaces.length) {
          return;
        }

        const [movedWorkspace] = draft.groupWorkspaces.splice(sourceIndex, 1);
        if (!movedWorkspace) {
          return;
        }
        draft.groupWorkspaces.splice(targetIndex, 0, movedWorkspace);
      });
    },
    [isPreviewLayout, isReadOnly, updateState]
  );

  const duplicateManualGroupWorkspace = useCallback(
    (workspaceId: string) => {
      if (isReadOnly || isPreviewLayout) {
        return;
      }

      let duplicatedWorkspaceId: string | undefined;
      updateState((draft) => {
        const sourceIndex = draft.groupWorkspaces.findIndex((workspace) => workspace.id === workspaceId);
        const sourceWorkspace = draft.groupWorkspaces[sourceIndex];
        if (!sourceWorkspace) {
          return;
        }

        duplicatedWorkspaceId = createUniqueAdvancedMapAnalyticsId(draft.groupWorkspaces.map((workspace) => workspace.id));
        draft.groupWorkspaces.splice(sourceIndex + 1, 0, {
          ...sourceWorkspace,
          id: duplicatedWorkspaceId,
          key: `${sourceWorkspace.key}-copy-${duplicatedWorkspaceId}`,
          label: `${sourceWorkspace.label || sourceWorkspace.id} (copy)`,
          groups: sourceWorkspace.groups.map((group) => ({
            ...group,
            memberSirutaCodes: [...group.memberSirutaCodes],
            memberOrder: group.memberOrder ? [...group.memberOrder] : undefined,
          })),
        });
        draft.activeGroupWorkspaceId = duplicatedWorkspaceId;
      });

      if (duplicatedWorkspaceId) {
        setActiveManualGroupId(undefined);
        setManualGroupFocusRequest(null);
        setGroupConfigWorkspaceId(duplicatedWorkspaceId);
      }
    },
    [isPreviewLayout, isReadOnly, updateState]
  );

  const reorderManualGroupWorkspaces = useCallback(
    (activeWorkspaceId: string, overWorkspaceId: string) => {
      if (isReadOnly || isPreviewLayout || activeWorkspaceId === overWorkspaceId) {
        return;
      }

      updateState((draft) => {
        const sourceIndex = draft.groupWorkspaces.findIndex((workspace) => workspace.id === activeWorkspaceId);
        const targetIndex = draft.groupWorkspaces.findIndex((workspace) => workspace.id === overWorkspaceId);
        if (sourceIndex === -1 || targetIndex === -1) {
          return;
        }

        const [movedWorkspace] = draft.groupWorkspaces.splice(sourceIndex, 1);
        if (!movedWorkspace) {
          return;
        }
        draft.groupWorkspaces.splice(targetIndex, 0, movedWorkspace);
      });
    },
    [isPreviewLayout, isReadOnly, updateState]
  );

  const updateManualGroupLabel = useCallback(
    (workspaceId: string, groupId: string, nextLabel: string) => {
      if (isReadOnly || isPreviewLayout) {
        return;
      }

      updateState((draft) => {
        const workspace = findManualGroupWorkspace(draft, workspaceId);
        const group = workspace?.groups.find((entry) => entry.id === groupId);
        if (!group) {
          return;
        }

        group.label = nextLabel.trim().length > 0 ? nextLabel : group.id;
      });
    },
    [isPreviewLayout, isReadOnly, updateState]
  );

  const deleteManualGroup = useCallback(
    (workspaceId: string, groupId: string) => {
      if (isReadOnly || isPreviewLayout) {
        return;
      }

      updateState((draft) => {
        const workspace = findManualGroupWorkspace(draft, workspaceId);
        if (!workspace) {
          return;
        }

        workspace.groups = workspace.groups.filter((group) => group.id !== groupId);
      });
      setActiveManualGroupId((currentGroupId) =>
        currentGroupId === groupId ? undefined : currentGroupId
      );
    },
    [isPreviewLayout, isReadOnly, updateState]
  );

  const removeManualGroupMember = useCallback(
    (workspaceId: string, groupId: string, sirutaCode: string) => {
      if (isReadOnly || isPreviewLayout) {
        return;
      }

      let nextActiveGroupId: string | undefined;
      updateState((draft) => {
        const workspace = findManualGroupWorkspace(draft, workspaceId);
        const groupIndex = workspace?.groups.findIndex((group) => group.id === groupId) ?? -1;
        const group = workspace?.groups[groupIndex];
        if (!group) {
          return;
        }

        group.memberSirutaCodes = group.memberSirutaCodes.filter((code) => code !== sirutaCode);
        group.memberOrder = group.memberOrder?.filter((code) => code !== sirutaCode);
        if (group.primarySirutaCode === sirutaCode) {
          group.primarySirutaCode = group.memberSirutaCodes[0];
        }

        if (group.memberSirutaCodes.length === 0) {
          workspace.groups.splice(groupIndex, 1);
          nextActiveGroupId = undefined;
          return;
        }

        const previousLabel = group.label;
        const nextGroupId = createManualGroupId(group.memberSirutaCodes);
        group.id = nextGroupId;
        group.label = previousLabel?.trim() || createManualGroupLabel(group.memberSirutaCodes, '');
        nextActiveGroupId = nextGroupId;
      });

      setActiveManualGroupId((currentGroupId) =>
        currentGroupId === groupId ? nextActiveGroupId : currentGroupId
      );
    },
    [isPreviewLayout, isReadOnly, updateState]
  );

  const moveManualGroupMember = useCallback(
    (workspaceId: string, groupId: string, sirutaCode: string, direction: 'previous' | 'next') => {
      if (isReadOnly || isPreviewLayout) {
        return;
      }

      updateState((draft) => {
        const workspace = findManualGroupWorkspace(draft, workspaceId);
        const group = workspace?.groups.find((entry) => entry.id === groupId);
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
      });
    },
    [isPreviewLayout, isReadOnly, updateState]
  );

  const setManualGroupPrimaryMember = useCallback(
    (workspaceId: string, groupId: string, sirutaCode: string) => {
      if (isReadOnly || isPreviewLayout) {
        return;
      }

      updateState((draft) => {
        const workspace = findManualGroupWorkspace(draft, workspaceId);
        const group = workspace?.groups.find((entry) => entry.id === groupId);
        if (!group || !group.memberSirutaCodes.includes(sirutaCode)) {
          return;
        }

        group.primarySirutaCode = sirutaCode;
      });
    },
    [isPreviewLayout, isReadOnly, updateState]
  );

  const addFeaturesToManualGroup = useCallback(
    (features: readonly UatProperties[], options?: { toggleExistingActiveMember?: boolean }) => {
      if (isReadOnly || isPreviewLayout || mapViewType !== 'UAT') {
        return;
      }

      const featuresBySirutaCode = new Map<string, UatProperties>();
      for (const feature of features) {
        const sirutaCode = String(feature?.natcode ?? '').trim();
        if (sirutaCode.length > 0 && !featuresBySirutaCode.has(sirutaCode)) {
          featuresBySirutaCode.set(sirutaCode, feature);
        }
      }

      const selectedSirutaCodes = [...featuresBySirutaCode.keys()];
      if (selectedSirutaCodes.length === 0) {
        toast.warning(t`Selected UAT does not have a SIRUTA code.`);
        return;
      }

      const firstFeature = featuresBySirutaCode.get(selectedSirutaCodes[0] ?? '');
      const firstUatName = String(firstFeature?.name ?? '').trim();
      let nextActiveGroupId: string | undefined;
      let nextMemberCount = 0;
      let addedMemberCount = 0;
      let didRemoveFromActiveGroup = false;
      let didChangeGroup = false;

      updateState((draft) => {
        const grouping = ensureActiveManualGroupWorkspace(draft);
        draft.activeGroupWorkspaceId = grouping.id;

        let isNewGroup = false;
        let targetGroup = activeManualGroupId
          ? grouping.groups.find((group) => group.id === activeManualGroupId)
          : undefined;
        if (!targetGroup) {
          isNewGroup = true;
          targetGroup = {
            id: createManualGroupId(selectedSirutaCodes),
            label: firstUatName.length > 0 ? firstUatName : undefined,
            memberSirutaCodes: [],
            memberOrder: [],
            primarySirutaCode: selectedSirutaCodes[0],
          };
          grouping.groups.push(targetGroup);
        }

        const targetGroupIndex = grouping.groups.findIndex((group) => group.id === targetGroup.id);
        const shouldToggleExistingMember =
          options?.toggleExistingActiveMember === true &&
          selectedSirutaCodes.length === 1 &&
          !isNewGroup &&
          targetGroup.memberSirutaCodes.includes(selectedSirutaCodes[0] ?? '');
        if (shouldToggleExistingMember) {
          const sirutaCode = selectedSirutaCodes[0] ?? '';
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
          didChangeGroup = true;
          return;
        }

        const selectedSirutaCodeSet = new Set(selectedSirutaCodes);
        for (let groupIndex = grouping.groups.length - 1; groupIndex >= 0; groupIndex -= 1) {
          const group = grouping.groups[groupIndex];
          if (!group || group.id === targetGroup.id) {
            continue;
          }

          const previousMemberCount = group.memberSirutaCodes.length;
          group.memberSirutaCodes = group.memberSirutaCodes.filter((code) => !selectedSirutaCodeSet.has(code));
          group.memberOrder = group.memberOrder?.filter((code) => !selectedSirutaCodeSet.has(code));
          if (group.primarySirutaCode && selectedSirutaCodeSet.has(group.primarySirutaCode)) {
            group.primarySirutaCode = group.memberSirutaCodes[0];
          }
          if (group.memberSirutaCodes.length === 0) {
            grouping.groups.splice(groupIndex, 1);
            didChangeGroup = didChangeGroup || previousMemberCount > 0;
            continue;
          }
          if (group.memberSirutaCodes.length !== previousMemberCount) {
            const previousLabel = group.label;
            group.id = createManualGroupId(group.memberSirutaCodes);
            group.label = previousLabel?.trim() || createManualGroupLabel(group.memberSirutaCodes, '');
            didChangeGroup = true;
          }
        }

        for (const sirutaCode of selectedSirutaCodes) {
          if (!targetGroup.memberSirutaCodes.includes(sirutaCode)) {
            targetGroup.memberSirutaCodes.push(sirutaCode);
            addedMemberCount += 1;
            didChangeGroup = true;
          }
        }
        targetGroup.memberOrder = [
          ...new Set([...(targetGroup.memberOrder ?? []), ...selectedSirutaCodes]),
        ].filter((code) => targetGroup.memberSirutaCodes.includes(code));
        targetGroup.primarySirutaCode = targetGroup.primarySirutaCode ?? selectedSirutaCodes[0];

        const nextGroupId = createManualGroupId(targetGroup.memberSirutaCodes);
        targetGroup.id = nextGroupId;
        if (isNewGroup || !targetGroup.label?.trim()) {
          targetGroup.label = createManualGroupLabel(targetGroup.memberSirutaCodes, firstUatName);
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
      } else if (!didChangeGroup) {
        toast.success(t`Selected UATs are already in group.`);
      } else {
        toast.success(
          addedMemberCount === 1
            ? t`Added 1 UAT to group.`
            : t`Added ${addedMemberCount} UATs to group.`
        );
      }
    },
    [activeManualGroupId, isPreviewLayout, isReadOnly, mapViewType, updateState]
  );

  const addFeatureToManualGroup = useCallback(
    (properties: UatProperties) => {
      addFeaturesToManualGroup([properties], { toggleExistingActiveMember: true });
    },
    [addFeaturesToManualGroup]
  );

  const moveSeriesUp = useCallback(
    (seriesId: string) => {
      if (isReadOnly) {
        return;
      }

      updateState((draft) => {
        const sourceIndex = visibleSeries.findIndex((series) => series.id === seriesId);
        if (sourceIndex <= 0) {
          return;
        }

        const previousSeriesId = visibleSeries[sourceIndex - 1]?.id;
        if (!previousSeriesId) {
          return;
        }

        draft.series = reorderSeriesByIds(draft.series, seriesId, previousSeriesId);
      });
    },
    [isReadOnly, updateState, visibleSeries]
  );

  const moveSeriesDown = useCallback(
    (seriesId: string) => {
      if (isReadOnly) {
        return;
      }

      updateState((draft) => {
        const sourceIndex = visibleSeries.findIndex((series) => series.id === seriesId);
        if (sourceIndex === -1 || sourceIndex >= visibleSeries.length - 1) {
          return;
        }

        const nextSeriesId = visibleSeries[sourceIndex + 1]?.id;
        if (!nextSeriesId) {
          return;
        }

        draft.series = reorderSeriesByIds(draft.series, seriesId, nextSeriesId);
      });
    },
    [isReadOnly, updateState, visibleSeries]
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
          preferredDuplicatedSeriesId,
          draft.activeGroupWorkspaceId
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
      const normalizedPasteResult = normalizePastedMapSeries(
        clipboardText,
        mapState.series,
        mapState.activeGroupWorkspaceId
      );
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
    [mapState.activeGroupWorkspaceId, mapState.series, updateState]
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
        'mapLayers',
        'showCountyBoundaries',
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

  const setCountyBoundariesEnabled = useCallback(
    (enabled: boolean) => {
      updateState((draft) => {
        draft.mapLayers.countyBoundaries = enabled;
      });
    },
    [updateState]
  );

  const setRoadsEnabled = useCallback(
    (enabled: boolean) => {
      updateState((draft) => {
        draft.mapLayers.roads = enabled;
      });
    },
    [updateState]
  );

  const setPopulationGridEnabled = useCallback(
    (enabled: boolean) => {
      updateState((draft) => {
        draft.mapLayers.populationGrid = enabled;
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
          groupWorkspaceId: currentSeries.groupWorkspaceId,
          granularity: currentSeries.granularity,
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

  const mapCenterOverrideLat = mapCenterOverride?.[0];
  const mapCenterOverrideLng = mapCenterOverride?.[1];
  const mapStateCenterLat = mapState.mapCenter?.[0];
  const mapStateCenterLng = mapState.mapCenter?.[1];
  const externalViewportKey = useMemo(
    () => JSON.stringify({
      mapCenter:
        mapCenterOverrideLat === undefined || mapCenterOverrideLng === undefined
          ? null
          : [mapCenterOverrideLat, mapCenterOverrideLng],
      mapZoom: mapZoomOverride ?? null,
    }),
    [mapCenterOverrideLat, mapCenterOverrideLng, mapZoomOverride]
  );
  useEffect(() => {
    const restoredMapCenter =
      mapCenterOverrideLat === undefined || mapCenterOverrideLng === undefined
        ? mapStateCenterLat === undefined || mapStateCenterLng === undefined
          ? undefined
          : [mapStateCenterLat, mapStateCenterLng] as [number, number]
        : [mapCenterOverrideLat, mapCenterOverrideLng] as [number, number];
    setCameraCommandViewport(null);
    lastRuntimeViewportRef.current = {
      mapCenter: restoredMapCenter,
      mapZoom: mapZoomOverride ?? mapState.mapZoom,
    };
  }, [
    externalViewportKey,
    mapCenterOverrideLat,
    mapCenterOverrideLng,
    mapState.mapZoom,
    mapStateCenterLat,
    mapStateCenterLng,
    mapZoomOverride,
  ]);

  const mapZoom = cameraCommandViewport?.mapZoom ?? mapZoomOverride ?? mapState.mapZoom ?? (isMobile ? 6 : 7.7);
  const mapCenter = cameraCommandViewport?.mapCenter ?? mapCenterOverride ?? mapState.mapCenter;
  const {
    activeBinPresetId: draftSizeActiveBinPresetId,
    activeGroupWorkspaceId: draftSizeActiveGroupWorkspaceId,
    activeSeriesId: draftSizeActiveSeriesId,
    activeView: draftSizeActiveView,
    analyticsWidgets: draftSizeAnalyticsWidgets,
    binsPanelCollapsed: draftSizeBinsPanelCollapsed,
    binsPresets: draftSizeBinsPresets,
    configPanelCollapsed: draftSizeConfigPanelCollapsed,
    groupWorkspaces: draftSizeGroupWorkspaces,
    mapLayers: draftSizeMapLayers,
    mapName: draftSizeMapName,
    series: draftSizeSeries,
    seriesPanelCollapsed: draftSizeSeriesPanelCollapsed,
    tableBinFiltersByPresetId: draftSizeTableBinFiltersByPresetId,
    valueFilters: draftSizeValueFilters,
    valueFiltersPanelCollapsed: draftSizeValueFiltersPanelCollapsed,
    version: draftSizeVersion,
  } = mapState;

  const serializedDraftLength = useMemo(
    () =>
      getAdvancedMapAnalyticsDraftSizeWarningLength({
        mapDescription,
        mapState: {
          activeBinPresetId: draftSizeActiveBinPresetId,
          activeGroupWorkspaceId: draftSizeActiveGroupWorkspaceId,
          activeSeriesId: draftSizeActiveSeriesId,
          activeView: draftSizeActiveView,
          analyticsWidgets: draftSizeAnalyticsWidgets,
          binsPanelCollapsed: draftSizeBinsPanelCollapsed,
          binsPresets: draftSizeBinsPresets,
          configPanelCollapsed: draftSizeConfigPanelCollapsed,
          groupWorkspaces: draftSizeGroupWorkspaces,
          mapLayers: draftSizeMapLayers,
          mapName: draftSizeMapName,
          series: draftSizeSeries,
          seriesPanelCollapsed: draftSizeSeriesPanelCollapsed,
          tableBinFiltersByPresetId: draftSizeTableBinFiltersByPresetId,
          valueFilters: draftSizeValueFilters,
          valueFiltersPanelCollapsed: draftSizeValueFiltersPanelCollapsed,
          version: draftSizeVersion,
        },
      }),
    [
      draftSizeActiveBinPresetId,
      draftSizeActiveGroupWorkspaceId,
      draftSizeActiveSeriesId,
      draftSizeActiveView,
      draftSizeAnalyticsWidgets,
      draftSizeBinsPanelCollapsed,
      draftSizeBinsPresets,
      draftSizeConfigPanelCollapsed,
      draftSizeGroupWorkspaces,
      draftSizeMapLayers,
      draftSizeMapName,
      draftSizeSeries,
      draftSizeSeriesPanelCollapsed,
      draftSizeTableBinFiltersByPresetId,
      draftSizeValueFilters,
      draftSizeValueFiltersPanelCollapsed,
      draftSizeVersion,
      mapDescription,
    ]
  );

  const {
    data: geoJsonData,
    isLoading: isGeoJsonLoading,
    error: geoJsonError,
  } = useGeoJsonData(mapViewType);

  const { data: countyGeoJsonData } = useGeoJsonData('County', {
    enabled: mapViewType === 'UAT' && mapState.mapLayers.countyBoundaries,
  });

  const geoJsonFeatures = useMemo<UatFeature[]>(() => {
    if (!geoJsonData || !('features' in geoJsonData) || !Array.isArray(geoJsonData.features)) {
      return [];
    }
    return geoJsonData.features as UatFeature[];
  }, [geoJsonData]);

  const activateManualGroupForDisplay = useCallback(
    (workspaceId: string, groupId: string) => {
      if (isReadOnly || isPreviewLayout || mapViewType !== 'UAT') {
        return;
      }

      const workspace = mapState.groupWorkspaces.find((entry) => entry.id === workspaceId);
      const group = workspace?.groups.find((entry) => entry.id === groupId);
      if (!workspace || !group) {
        return;
      }

      const nextZoom = Math.max(lastRuntimeViewportRef.current.mapZoom ?? mapZoom, 10);
      const isCurrentlyActiveGroup =
        activeManualGroupId === groupId && mapState.activeGroupWorkspaceId === workspaceId;
      const nextCenter = getManualGroupMapCenter(group, geoJsonFeatures);
      const nextViewport = nextCenter ? roundMapViewport(nextCenter, nextZoom) : undefined;
      const shouldClearActiveGroup = isCurrentlyActiveGroup && !nextViewport;

      updateState((draft) => {
        draft.activeGroupWorkspaceId = workspace.id;
      });

      setSelectedMapEntity(null);
      setActiveManualGroupId(shouldClearActiveGroup ? undefined : groupId);
      setIsManualGroupCreateMode(false);

      if (nextViewport) {
        lastRuntimeViewportRef.current = nextViewport;
        setCameraCommandViewport(nextViewport);
        onMapViewportChange?.(nextViewport);
      }
    },
    [
      geoJsonFeatures,
      activeManualGroupId,
      isPreviewLayout,
      isReadOnly,
      mapState.activeGroupWorkspaceId,
      mapState.groupWorkspaces,
      mapViewType,
      mapZoom,
      onMapViewportChange,
      updateState,
    ]
  );

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
    unfilteredValuesBySeriesId: rawUnfilteredValuesBySeriesId,
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
    groupWorkspaces: mapState.groupWorkspaces,
    activeSeriesId: visibleActiveSeriesId,
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
  const unfilteredValuesBySeriesId = rawUnfilteredValuesBySeriesId ?? valuesBySeriesId;

  const activeSeries = useMemo(
    () => mapState.series.find((series) => series.id === activeSeriesId && series.enabled),
    [activeSeriesId, mapState.series]
  );

  const activeUnit = activeSeries
    ? resolveSeriesDisplayUnit(activeSeries, unitsBySeriesId, displayUnitOverridesBySeriesId)
    : undefined;

  const activeMapRenderUnitContext = useMemo(
    () =>
      mapViewType === 'UAT'
        ? buildActiveMapRenderUnitContext({
            activeSeriesId,
            activeSeries,
            activeSeriesUnit: activeUnit,
            activeGroupWorkspaceId: mapState.activeGroupWorkspaceId,
            activeManualGroupId,
            groupWorkspaces: mapState.groupWorkspaces,
            valuesBySeriesId,
            mapValuesBySeriesId,
            domainsBySeriesId,
          })
        : undefined,
    [
      activeManualGroupId,
      activeSeries,
      activeSeriesId,
      activeUnit,
      domainsBySeriesId,
      mapState.activeGroupWorkspaceId,
      mapState.groupWorkspaces,
      mapValuesBySeriesId,
      mapViewType,
      valuesBySeriesId,
    ]
  );

  const activeBinsValues = useMemo(() => {
    if (!activeMapRenderUnitContext) {
      return activeValues;
    }

    return new Map(
      [...activeMapRenderUnitContext.renderUnitsById.values()].map((renderUnit) => [
        renderUnit.id,
        renderUnit.value,
      ])
    );
  }, [activeMapRenderUnitContext, activeValues]);

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
    activeValues: activeBinsValues,
    seriesWarnings,
  });

  useEffect(() => {
    if (!selectedSeriesId) {
      return;
    }

    if (visibleSeries.some((series) => series.id === selectedSeriesId)) {
      return;
    }

    setSelectedSeriesId(undefined);
  }, [selectedSeriesId, visibleSeries]);

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

    const duplicateTargetSeriesId =
      selectedSeriesId ?? activeSeriesId ?? visibleSeries.find((series) => series.enabled)?.id;
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

  const activeRenderUnits = useMemo(
    () => activeMapRenderUnitContext ? [...activeMapRenderUnitContext.renderUnitsById.values()] : undefined,
    [activeMapRenderUnitContext]
  );

  const activeHeatmapData = useMemo<HeatmapUATDataPoint[]>(() => {
    if (!activeSeries || (!activeValues && !activeMapRenderUnitContext)) {
      return [];
    }

    const rows: HeatmapUATDataPoint[] = [];
    const entries = activeMapRenderUnitContext
      ? [...activeMapRenderUnitContext.renderUnitsById.values()].map((renderUnit) => [
          renderUnit.id,
          renderUnit.value,
          renderUnit.label,
        ] as const)
      : [...(activeValues?.entries() ?? [])].map(([sirutaCode, value]) => [
          sirutaCode,
          value,
          '',
        ] as const);

    if (binsCanApply) {
      for (const [renderKey, value, label] of entries) {
        const numericValue = Number.isFinite(value) ? (value as number) : 0;
        rows.push({
          uat_id: renderKey,
          uat_code: renderKey,
          uat_name: label,
          siruta_code: renderKey,
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

    for (const [renderKey, value, label] of entries) {
      if (value === undefined || !Number.isFinite(value)) {
        continue;
      }

      rows.push({
        uat_id: renderKey,
        uat_code: renderKey,
        uat_name: label,
        siruta_code: renderKey,
        county_code: '',
        county_name: '',
        population: 0,
        amount: value,
        total_amount: value,
        per_capita_amount: value,
      });
    }

    return rows;
  }, [activeMapRenderUnitContext, activeSeries, activeValues, binsCanApply]);

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

  const manualGroupEditStylesBySirutaCode = useMemo<Map<string, InteractiveMapFeatureStyle> | undefined>(() => {
    if ((!isManualGroupCreateMode && !activeManualGroupId) || mapViewType !== 'UAT') {
      return undefined;
    }

    const manualGroupWorkspace = mapState.activeGroupWorkspaceId
      ? mapState.groupWorkspaces.find((workspace) => workspace.id === mapState.activeGroupWorkspaceId)
      : undefined;
    if (!manualGroupWorkspace || manualGroupWorkspace.groups.length === 0) {
      return new Map();
    }

    const hasActiveGroup = Boolean(activeManualGroupId);
    const stylesBySirutaCode = new Map<string, InteractiveMapFeatureStyle>();

    manualGroupWorkspace.groups.forEach((group, groupIndex) => {
      const groupColor = getManualGroupColor(groupIndex);
      const isActiveGroup = group.id === activeManualGroupId;
      if (hasActiveGroup && !isActiveGroup) {
        return;
      }

      const groupStyle: InteractiveMapFeatureStyle = {
        ...DEFAULT_FEATURE_STYLE,
        color: groupColor,
        weight: 0.25,
        opacity: isActiveGroup ? 0.12 : 0.16,
        fillColor: groupColor,
        fillOpacity: isActiveGroup ? 0.82 : 0.76,
      };

      for (const sirutaCode of group.memberSirutaCodes) {
        stylesBySirutaCode.set(sirutaCode, groupStyle);
      }
    });

    return stylesBySirutaCode;
  }, [activeManualGroupId, isManualGroupCreateMode, mapState.activeGroupWorkspaceId, mapState.groupWorkspaces, mapViewType]);

  const getFeatureStyle = useCallback(
    (
      feature: UatFeature,
      heatmapDataMap: Map<string | number, HeatmapUATDataPoint | HeatmapCountyDataPoint>
    ) => {
      const featureKey = feature?.properties?.natcode;
      if (!featureKey) {
        return DEFAULT_FEATURE_STYLE;
      }
      const featureKeyString = String(featureKey);
      const renderUnitId = activeMapRenderUnitContext?.renderUnitIdBySirutaCode.get(featureKeyString);
      const renderKey = renderUnitId ?? featureKeyString;
      const manualGroupStyle = manualGroupEditStylesBySirutaCode?.get(featureKeyString);
      const applyRenderAffordances = (style: InteractiveMapFeatureStyle): InteractiveMapFeatureStyle => {
        const groupedStyle =
          activeMapRenderUnitContext && renderUnitId
            ? {
                ...style,
                ...GROUPED_RENDER_UNIT_MEMBER_STROKE,
              }
            : style;

        return manualGroupStyle
          ? {
              ...groupedStyle,
              color: manualGroupStyle.color,
              weight: manualGroupStyle.weight,
              opacity: manualGroupStyle.opacity,
            }
          : groupedStyle;
      };

      if (activeMapRenderUnitContext && !renderUnitId) {
        return MANUAL_GROUP_UNASSIGNED_STYLE;
      }

      if (manualGroupEditStylesBySirutaCode && !activeSeries) {
        return manualGroupStyle ?? MANUAL_GROUP_UNASSIGNED_STYLE;
      }

      if (binsCanApply) {
        const classification = binsClassification.groupsBySiruta.get(renderKey);
        return applyRenderAffordances({
          ...DEFAULT_FEATURE_STYLE,
          fillColor: classification?.color ?? activeNoDataConfig?.color ?? '#cccccc',
          fillOpacity: 0.7,
        });
      }

      const noDataColor = activeNoDataConfig?.color ?? '#cccccc';
      const dataPoint = heatmapDataMap.get(renderKey);
      if (!dataPoint) {
        return applyRenderAffordances({
          ...DEFAULT_FEATURE_STYLE,
          fillOpacity: 0.1,
          fillColor: isContinuousIntervalMode ? noDataColor : '#cccccc',
        });
      }

      const value = dataPoint.amount;
      if (!Number.isFinite(value)) {
        if (!isContinuousIntervalMode) {
          return applyRenderAffordances(DEFAULT_FEATURE_STYLE);
        }
        return applyRenderAffordances({
          ...DEFAULT_FEATURE_STYLE,
          fillColor: noDataColor,
          fillOpacity: 0.7,
        });
      }

      if (isContinuousIntervalMode) {
        return applyRenderAffordances({
          ...DEFAULT_FEATURE_STYLE,
          fillColor: getContinuousGradientColor(
            value,
            { min: colorRangeMin, max: colorRangeMax },
            activeBinsPreset?.config.gradient ?? { startColor: '#fff7bc', endColor: '#d7301f' },
            noDataColor
          ),
          fillOpacity: 0.7,
        });
      }

      if (colorRangeMin === colorRangeMax) {
        return applyRenderAffordances({
          ...DEFAULT_FEATURE_STYLE,
          fillColor: value !== 0 ? getHeatmapColor(0.5) : DEFAULT_FEATURE_STYLE.fillColor,
          fillOpacity: 0.7,
        });
      }

      const normalized = normalizeValue(value, colorRangeMin, colorRangeMax);
      return applyRenderAffordances({
        ...DEFAULT_FEATURE_STYLE,
        fillColor: getHeatmapColor(normalized),
        fillOpacity: 0.7,
      });
    },
    [
      activeMapRenderUnitContext,
      activeBinsPreset?.config.gradient,
      activeNoDataConfig?.color,
      activeSeries,
      binsCanApply,
      binsClassification.groupsBySiruta,
      isContinuousIntervalMode,
      colorRangeMax,
      colorRangeMin,
      manualGroupEditStylesBySirutaCode,
    ]
  );

  const enabledSeries = useMemo(
    () => visibleSeries.filter((series) => series.enabled),
    [visibleSeries]
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

  const seriesColumnsById = useMemo(
    () => new Map(seriesColumns.map((seriesColumn) => [seriesColumn.id, seriesColumn.unit])),
    [seriesColumns]
  );

  const groupingColumns = useMemo<AdvancedMapAnalyticsTableGroupingColumn[]>(
    () =>
      mapState.groupWorkspaces.map((grouping) => ({
        id: grouping.id,
        label: grouping.label || grouping.key || grouping.id,
      })),
    [mapState.groupWorkspaces]
  );

  const groupValuesBySirutaCode = useMemo(
    () => buildGroupingValuesBySiruta({ groupWorkspaces: mapState.groupWorkspaces }),
    [mapState.groupWorkspaces]
  );

  const groupMetadataById = useMemo(
    () => buildGroupMetadataById({ groupWorkspaces: mapState.groupWorkspaces }),
    [mapState.groupWorkspaces]
  );

  const activePanelGroupWorkspaceId = useMemo(() => {
    const activeDomain = activeSeriesId ? domainsBySeriesId.get(activeSeriesId) : undefined;
    return activeDomain?.type === 'group'
      ? activeDomain.groupWorkspaceId
      : mapState.activeGroupWorkspaceId;
  }, [activeSeriesId, domainsBySeriesId, mapState.activeGroupWorkspaceId]);

  const manualGroupDisplayValuesBySeriesId = useMemo(() => {
    return buildManualGroupDisplayValuesBySeriesId({
      activeGroupWorkspaceId: activePanelGroupWorkspaceId,
      activeManualGroupId,
      groupWorkspaces: mapState.groupWorkspaces,
      enabledSeries,
      valuesBySeriesId,
      mapValuesBySeriesId,
      domainsBySeriesId,
    });
  }, [
    activeManualGroupId,
    activePanelGroupWorkspaceId,
    domainsBySeriesId,
    enabledSeries,
    mapState.groupWorkspaces,
    mapValuesBySeriesId,
    valuesBySeriesId,
  ]);

  const activeSeriesDisplayValues = activeSeriesId
    ? activeMapRenderUnitContext?.valueBySirutaCode ??
      manualGroupDisplayValuesBySeriesId?.get(activeSeriesId) ??
      activeValues
    : activeValues;

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
  const groupWorkspaceImportReferences = useMemo(
    () =>
      Array.from(uatMetadataBySirutaCode.entries()).map(([sirutaCode, metadata]) => ({
        sirutaCode,
        name: metadata.uatName,
      })),
    [uatMetadataBySirutaCode]
  );

  const activeTableGroupWorkspaceId = useMemo(() => {
    return activePanelGroupWorkspaceId;
  }, [activePanelGroupWorkspaceId]);

  const activeTableGroupWorkspace = useMemo(
    () => activeTableGroupWorkspaceId
      ? mapState.groupWorkspaces.find((workspace) => workspace.id === activeTableGroupWorkspaceId)
      : undefined,
    [activeTableGroupWorkspaceId, mapState.groupWorkspaces]
  );

  const {
    rowMode: tableRowMode,
    setRowMode: setTableRowMode,
    showMemberValues: showTableMemberValues,
    setShowMemberValues: setShowTableMemberValues,
  } = useAdvancedMapAnalyticsTableViewPreferences({
    activeGroupWorkspace: activeTableGroupWorkspace,
  });
  const isTableComputationEnabled = !isPreviewLayout && mapState.activeView === 'table';

  const selectedMapEntitySeriesRows = useMemo<MapAnalyticsEntitySeriesRow[]>(() => {
    if (!selectedMapEntity) {
      return [];
    }

    return enabledSeries.map((series) => {
      const unit = resolveSeriesDisplayUnit(series, unitsBySeriesId, displayUnitOverridesBySeriesId);
      const filteredValue =
        manualGroupDisplayValuesBySeriesId?.get(series.id)?.get(selectedMapEntity.sirutaCode) ??
        resolveSeriesDisplayValueForSiruta({
          seriesId: series.id,
          sirutaCode: selectedMapEntity.sirutaCode,
          valuesBySeriesId,
          domainsBySeriesId,
          groupValuesBySirutaCode,
        });
      const unfilteredValue = resolveSeriesDisplayValueForSiruta({
        seriesId: series.id,
        sirutaCode: selectedMapEntity.sirutaCode,
        valuesBySeriesId: unfilteredValuesBySeriesId,
        domainsBySeriesId,
        groupValuesBySirutaCode,
      });
      const isFilteredOut = filteredValue === undefined && unfilteredValue !== undefined;

      return {
        id: series.id,
        label: resolveSeriesDisplayLabel(series),
        payload:
          uploadedDatasetPayloadsBySeriesId
            .get(series.id)
            ?.get(selectedMapEntity.sirutaCode) ?? null,
        value: isFilteredOut
          ? t`Filtered out`
          : formatAdvancedMapAnalyticsSeriesValue(filteredValue, unit),
        unfilteredValue: isFilteredOut
          ? formatAdvancedMapAnalyticsSeriesValue(unfilteredValue, unit)
          : undefined,
        isFilteredOut,
        isActive: series.id === activeSeriesId,
      };
    });
  }, [
    activeSeriesId,
    displayUnitOverridesBySeriesId,
    enabledSeries,
    selectedMapEntity,
    unitsBySeriesId,
    uploadedDatasetPayloadsBySeriesId,
    unfilteredValuesBySeriesId,
    domainsBySeriesId,
    groupValuesBySirutaCode,
    manualGroupDisplayValuesBySeriesId,
    valuesBySeriesId,
  ]);

  const selectedMapEntityUatSeriesRows = useMemo<MapAnalyticsEntitySeriesRow[]>(() => {
    if (!selectedMapEntity) {
      return [];
    }

    return enabledSeries.map((series) => {
      const domain = domainsBySeriesId.get(series.id);
      const value =
        series.type === 'map-grouped-value-series'
          ? unfilteredValuesBySeriesId.get(series.sourceSeriesId)?.get(selectedMapEntity.sirutaCode)
          : domain?.type === 'group'
            ? undefined
            : unfilteredValuesBySeriesId.get(series.id)?.get(selectedMapEntity.sirutaCode);

      return {
        id: series.id,
        label: resolveSeriesDisplayLabel(series),
        payload:
          uploadedDatasetPayloadsBySeriesId
            .get(series.id)
            ?.get(selectedMapEntity.sirutaCode) ?? null,
        value: formatAdvancedMapAnalyticsSeriesValue(
          value,
          resolveSeriesDisplayUnit(series, unitsBySeriesId, displayUnitOverridesBySeriesId)
        ),
        isActive: series.id === activeSeriesId,
      };
    });
  }, [
    activeSeriesId,
    displayUnitOverridesBySeriesId,
    domainsBySeriesId,
    enabledSeries,
    selectedMapEntity,
    unitsBySeriesId,
    uploadedDatasetPayloadsBySeriesId,
    unfilteredValuesBySeriesId,
  ]);

  const selectedMapEntityGroupContext = useMemo(() => {
    if (!selectedMapEntity) {
      return undefined;
    }

    const sourceSeriesIdBySeriesId = new Map(
      enabledSeries
        .filter((series) => series.type === 'map-grouped-value-series')
        .map((series) => [series.id, series.sourceSeriesId])
    );

    return buildPublicEntityGroupContext({
      activeGroupWorkspaceId: activePanelGroupWorkspaceId,
      activeSeriesId,
      groupMetadataById,
      groupSeriesRows: selectedMapEntitySeriesRows,
      groupValuesBySirutaCode,
      selection: selectedMapEntity,
      sourceSeriesIdBySeriesId,
      uatMetadataBySirutaCode,
      uatSeriesRows: selectedMapEntityUatSeriesRows,
      valuesBySeriesId,
      unfilteredValuesBySeriesId,
      unitsBySeriesId: seriesColumnsById,
    });
  }, [
    activeSeriesId,
    activePanelGroupWorkspaceId,
    groupMetadataById,
    groupValuesBySirutaCode,
    enabledSeries,
    selectedMapEntity,
    selectedMapEntitySeriesRows,
    selectedMapEntityUatSeriesRows,
    seriesColumnsById,
    uatMetadataBySirutaCode,
    unfilteredValuesBySeriesId,
    valuesBySeriesId,
  ]);

  const tableRowsResult = useMemo(() => {
    if (!isTableComputationEnabled) {
      return EMPTY_ADVANCED_MAP_ANALYTICS_TABLE_ROWS_RESULT;
    }

    return buildAdvancedMapAnalyticsTableRows({
      rowMode: tableRowMode,
      activeGroupWorkspace: activeTableGroupWorkspace,
      seriesColumns,
      enabledSeries,
      valuesBySeriesId,
      mapValuesBySeriesId,
      displayValuesBySeriesId: manualGroupDisplayValuesBySeriesId,
      domainsBySeriesId,
      groupValuesBySirutaCode,
      uatMetadataBySirutaCode,
      activeSeriesId,
      showMemberValues: showTableMemberValues,
      unknownCountyLabel: t`Unknown county`,
    });
  }, [
    activeSeriesId,
    activeTableGroupWorkspace,
    domainsBySeriesId,
    enabledSeries,
    groupValuesBySirutaCode,
    isTableComputationEnabled,
    manualGroupDisplayValuesBySeriesId,
    mapValuesBySeriesId,
    seriesColumns,
    showTableMemberValues,
    tableRowMode,
    uatMetadataBySirutaCode,
    valuesBySeriesId,
  ]);
  const tableRows = tableRowsResult.rows;

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
      activeSeriesId,
      activeValues: activeSeriesDisplayValues,
      tableBinFiltersByPresetId: mapState.tableBinFiltersByPresetId,
      enabled: isTableComputationEnabled,
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
      const activeRenderUnitId = activeMapRenderUnitContext?.renderUnitIdBySirutaCode.get(sirutaCode);
      const activeClassificationKey = activeRenderUnitId ?? sirutaCode;
      const activeSeriesDomain = activeSeriesId ? domainsBySeriesId.get(activeSeriesId) : undefined;
      const activeGroupWorkspaceId = activeSeriesDomain?.type === 'group'
        ? activeSeriesDomain.groupWorkspaceId
        : mapState.activeGroupWorkspaceId;
      const activeGroupId = activeSeriesDomain?.type === 'group'
        ? groupValuesBySirutaCode.get(sirutaCode)?.[activeSeriesDomain.groupWorkspaceId]
        : activeRenderUnitId ?? (
            activeGroupWorkspaceId && (activeManualGroupId || isManualGroupCreateMode)
              ? groupValuesBySirutaCode.get(sirutaCode)?.[activeGroupWorkspaceId]
              : undefined
          );
      const activeGroupMetadata =
        activeGroupWorkspaceId && activeGroupId
          ? groupMetadataById.get(getGroupMetadataKey(activeGroupWorkspaceId, activeGroupId))
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
        const seriesValue = manualGroupDisplayValuesBySeriesId?.get(series.id)?.get(sirutaCode) ??
          resolveSeriesDisplayValueForSiruta({
            seriesId: series.id,
            sirutaCode,
            valuesBySeriesId,
            domainsBySeriesId,
            groupValuesBySirutaCode,
          });
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
        ? manualGroupDisplayValuesBySeriesId?.get(activeSeriesId)?.get(sirutaCode) ??
          resolveSeriesDisplayValueForSiruta({
              seriesId: activeSeriesId,
              sirutaCode,
              valuesBySeriesId,
              domainsBySeriesId,
              groupValuesBySirutaCode,
            })
        : undefined;
      const activeClassification = binsCanApply
        ? binsClassification.groupsBySiruta.get(activeClassificationKey) ??
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
      activeMapRenderUnitContext,
      activeSeries,
      activeSeriesId,
      activeManualGroupId,
      binsCanApply,
      binsClassification.groupsBySiruta,
      domainsBySeriesId,
      enabledSeries,
      displayUnitOverridesBySeriesId,
      groupMetadataById,
      groupValuesBySirutaCode,
      isManualGroupCreateMode,
      manualGroupDisplayValuesBySeriesId,
      mapState.activeGroupWorkspaceId,
      unitsBySeriesId,
      valuesBySeriesId,
    ]
  );

  const handleMapViewChange = useCallback(
    (center: [number, number], zoom: number) => {
      const nextViewport = roundMapViewport(center, zoom);
      if (areMapViewportsEqual(lastRuntimeViewportRef.current, nextViewport)) {
        return;
      }

      lastRuntimeViewportRef.current = nextViewport;
      onMapViewportChange?.(nextViewport);
    },
    [onMapViewportChange]
  );

  const hasEnabledGeoJsonDatasetSeries = enabledGeoJsonDatasetSeries.length > 0;
  const mapError = error || geoJsonError;
  const isMapLoading = isLoading || isGeoJsonLoading;
  const isTableLoading = isLoading || (hasEnabledGeoJsonDatasetSeries && isGeoJsonLoading);
  const tableError = error || (hasEnabledGeoJsonDatasetSeries ? geoJsonError : null);
  const isAnalyticsLoading = isLoading || (hasEnabledGeoJsonDatasetSeries && isGeoJsonLoading);
  const analyticsError = error || (hasEnabledGeoJsonDatasetSeries ? geoJsonError : null);
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
  const isTableViewActive = isTableComputationEnabled;
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
    mapViewType === 'UAT' && mapState.mapLayers.countyBoundaries
      ? countyGeoJsonData
      : null;

  const activeBoundaryGroupWorkspace = useMemo(() => {
    if (mapViewType !== 'UAT') {
      return undefined;
    }

    const activeSeriesDomain = activeSeriesId ? domainsBySeriesId.get(activeSeriesId) : undefined;
    const activeGroupWorkspaceId =
      activeSeriesDomain?.type === 'group'
        ? activeSeriesDomain.groupWorkspaceId
        : mapState.activeGroupWorkspaceId;

    return activeGroupWorkspaceId
      ? mapState.groupWorkspaces.find((grouping) => grouping.id === activeGroupWorkspaceId)
      : undefined;
  }, [
    activeSeriesId,
    domainsBySeriesId,
    mapState.activeGroupWorkspaceId,
    mapState.groupWorkspaces,
    mapViewType,
  ]);
  const groupingBoundaryGeoJsonData = useGroupWorkspaceBoundaryGeoJsonData({
    enabled: mapViewType === 'UAT',
    workspace: activeBoundaryGroupWorkspace,
    geoJsonFeatures,
  });


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
      const manualGroupFocusTarget = resolveManualGroupFocusTarget({
        sirutaCode,
        workspaceId: groupConfigWorkspaceId,
        groupValuesBySirutaCode,
        groupWorkspaces: mapState.groupWorkspaces,
      });
      if (manualGroupFocusTarget) {
        updateState((draft) => {
          draft.activeGroupWorkspaceId = manualGroupFocusTarget.workspaceId;
        });
        setSelectedMapEntity(null);
        setIsManualGroupCreateMode(false);
        setActiveManualGroupId(manualGroupFocusTarget.groupId);
        setManualGroupFocusRequest((previousRequest) => ({
          ...manualGroupFocusTarget,
          requestId: (previousRequest?.requestId ?? 0) + 1,
        }));
        return;
      }

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
      groupConfigWorkspaceId,
      groupValuesBySirutaCode,
      isManualGroupCreateMode,
      mapState.groupWorkspaces,
      mode,
      navigate,
      onEntityCuiSelect,
      onMapFeatureSelect,
      shouldUseEntityDetailsPanel,
      updateState,
      uatMetadataBySirutaCode,
    ]
  );

  const handleMapFeatureBoxSelect = useCallback(
    (features: UatProperties[]) => {
      if (!isManualGroupCreateMode) {
        return;
      }

      addFeaturesToManualGroup(features);
    },
    [addFeaturesToManualGroup, isManualGroupCreateMode]
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
    if (!editorState || visibleSeries.some((series) => series.id === editorState.seriesId)) {
      return;
    }

    setEditorState(null);
  }, [editorState, visibleSeries]);

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

  const activeGroupWorkspace = mapState.activeGroupWorkspaceId
    ? mapState.groupWorkspaces.find((workspace) => workspace.id === mapState.activeGroupWorkspaceId)
    : undefined;
  const groupConfigWorkspace = groupConfigWorkspaceId
    ? mapState.groupWorkspaces.find((workspace) => workspace.id === groupConfigWorkspaceId)
    : undefined;
  const activeManualGroup = activeManualGroupId
    ? activeGroupWorkspace?.groups.find((group) => group.id === activeManualGroupId)
    : undefined;
  const manualGroupWorkspaceCount = mapState.groupWorkspaces.length;
  const selectedManualGroupBoundaryGeoJsonData = useMapGroupBoundaryGeoJsonData({
    enabled: mapViewType === 'UAT',
    group: activeManualGroup,
    geoJsonFeatures,
  });
  const canCreateManualGroups = !isReadOnly && !isPreviewLayout && mapViewType === 'UAT';
  const controlsPanels = (
    <>
      <AdvancedMapAnalyticsConfigPanel
        collapsed={Boolean(mapState.configPanelCollapsed)}
        countyBoundariesEnabled={mapState.mapLayers.countyBoundaries}
        warningCount={combinedWarnings.length}
        readOnly={isReadOnly}
        onToggleCollapsed={toggleConfigPanelCollapsed}
        onCountyBoundariesEnabledChange={setCountyBoundariesEnabled}
        onOpenConfig={() => {
          if (!isReadOnly && onOpenOwnerConfig) {
            onOpenOwnerConfig();
          }
        }}
        onOpenWarnings={() => setIsWarningsModalOpen(true)}
      />
      <ManualGroupWorkspacePanel
        enabled={isManualGroupCreateMode}
        canEdit={canCreateManualGroups}
        groupWorkspaces={mapState.groupWorkspaces}
        activeGroupWorkspaceId={mapState.activeGroupWorkspaceId}
        groupWorkspaceCount={manualGroupWorkspaceCount}
        onAddGroupWorkspace={addManualGroupWorkspace}
        onImportGroupWorkspace={() => setIsGroupWorkspaceImportOpen(true)}
        onStartGroupCreateMode={startManualGroupCreateMode}
        onFinish={finishManualGroupCreateMode}
        onSetActiveGroupWorkspace={setActiveManualGroupWorkspace}
        onToggleActiveGroupWorkspace={toggleActiveManualGroupWorkspace}
        onOpenGroupWorkspaceConfig={openManualGroupWorkspaceConfig}
        onDeleteGroupWorkspace={deleteManualGroupWorkspace}
        onMoveGroupWorkspace={moveManualGroupWorkspace}
        onDuplicateGroupWorkspace={duplicateManualGroupWorkspace}
        onReorderGroupWorkspaces={reorderManualGroupWorkspaces}
      />
      <AdvancedMapAnalyticsSeriesPanel
        series={visibleSeries}
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
        series={visibleSeries}
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
                  onFeatureBoxSelect={isManualGroupCreateMode ? handleMapFeatureBoxSelect : undefined}
                  getFeatureStyle={getFeatureStyle}
                  heatmapData={activeHeatmapData}
                  geoJsonData={geoJsonData}
                  countyBoundaryGeoJsonData={countyBoundaryGeoJsonData}
                  groupingBoundaryGeoJsonData={isManualGroupCreateMode ? null : groupingBoundaryGeoJsonData}
                  selectedGroupingBoundaryGeoJsonData={selectedManualGroupBoundaryGeoJsonData}
                  alwaysResolveFeatureStyle={Boolean(manualGroupEditStylesBySirutaCode)}
                  zoom={mapZoom}
                  center={mapCenter}
                  mapViewType={mapViewType}
                  filters={defaultMapFilters}
                  mapHeight="100%"
                  showLabels={Boolean(activeSeries)}
                  labelMode="active-series"
                  activeSeriesValuesBySirutaCode={activeSeriesDisplayValues}
                  activeRenderUnits={activeRenderUnits}
                  activeSeriesUnit={activeUnit}
                  showRoads={mapState.mapLayers.roads}
                  showPopulationGrid={mapState.mapLayers.populationGrid}
                  onShowRoadsChange={setRoadsEnabled}
                  onShowPopulationGridChange={setPopulationGridEnabled}
                  onViewChange={handleMapViewChange}
                  getTooltipContent={getTooltipContent}
                  mobilePanMode="pinch-zoom-until-unlocked"
                  scrollWheelZoom={false}
                  defaultScrollWheelZoomEnabled={false}
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
            ? 'absolute inset-x-0 top-0 z-[650] max-h-[80vh] bg-card rounded-b-2xl shadow-lg'
            : 'border-r border-border bg-background text-foreground md:w-[430px] md:min-w-[430px]',
          groupConfigWorkspace ? 'overflow-hidden' : 'overflow-y-auto',
          'relative isolate flex flex-col'
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

        {!isReadOnly && groupConfigWorkspace ? (
          <ManualGroupWorkspaceConfigPanel
            workspace={groupConfigWorkspace}
            canEdit={canCreateManualGroups}
            activeGroupId={
              groupConfigWorkspace.id === mapState.activeGroupWorkspaceId ? activeManualGroupId : undefined
            }
            manualGroupFocusRequest={manualGroupFocusRequest}
            uatMetadataBySirutaCode={uatMetadataBySirutaCode}
            onClose={closeManualGroupWorkspaceConfig}
            onManualGroupFocusRequestHandled={clearManualGroupFocusRequest}
            onWorkspaceLabelChange={updateManualGroupWorkspaceLabel}
            onAddGroupItem={addManualGroupItem}
            onGroupLabelChange={updateManualGroupLabel}
            onActivateGroup={activateManualGroupForDisplay}
            onImportGroupWorkspace={() => setIsGroupWorkspaceImportOpen(true)}
            onAddToWorkspace={(workspaceId) => {
              startManualGroupCreateMode(workspaceId);
              closeManualGroupWorkspaceConfig();
            }}
            onAddToGroup={(workspaceId, groupId) => {
              selectManualGroup(workspaceId, groupId);
              closeManualGroupWorkspaceConfig();
            }}
            onDeleteWorkspace={deleteManualGroupWorkspace}
            onDeleteGroup={deleteManualGroup}
            onRemoveMember={removeManualGroupMember}
            onMoveMember={moveManualGroupMember}
            onSetPrimaryMember={setManualGroupPrimaryMember}
          />
        ) : null}
      </aside>

      <main
        className={cn(
          'flex-1 flex flex-col md:min-h-0',
          shouldOverlayMobileControls ? 'min-h-screen pt-[72px]' : 'min-h-[55vh]'
        )}
      >
        <div className="relative isolate min-h-0 flex-1 overflow-hidden">
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
                      onFeatureBoxSelect={isManualGroupCreateMode ? handleMapFeatureBoxSelect : undefined}
                      getFeatureStyle={getFeatureStyle}
                      heatmapData={activeHeatmapData}
                      geoJsonData={geoJsonData}
                      countyBoundaryGeoJsonData={countyBoundaryGeoJsonData}
                      groupingBoundaryGeoJsonData={isManualGroupCreateMode ? null : groupingBoundaryGeoJsonData}
                      selectedGroupingBoundaryGeoJsonData={selectedManualGroupBoundaryGeoJsonData}
                      alwaysResolveFeatureStyle={Boolean(manualGroupEditStylesBySirutaCode)}
                      zoom={mapZoom}
                      center={mapCenter}
                      mapViewType={mapViewType}
                      filters={defaultMapFilters}
                      showLabels={Boolean(activeSeries)}
                      labelMode="active-series"
                      activeSeriesValuesBySirutaCode={activeSeriesDisplayValues}
                      activeRenderUnits={activeRenderUnits}
                      activeSeriesUnit={activeUnit}
                      showRoads={mapState.mapLayers.roads}
                      showPopulationGrid={mapState.mapLayers.populationGrid}
                      onShowRoadsChange={setRoadsEnabled}
                      onShowPopulationGridChange={setPopulationGridEnabled}
                      onViewChange={handleMapViewChange}
                      getTooltipContent={getTooltipContent}
                      mobilePanMode="pinch-zoom-until-unlocked"
                      scrollWheelZoom
                      defaultScrollWheelZoomEnabled
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
                      groupContext={selectedMapEntityGroupContext}
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
            <div className="h-full min-h-0 w-full p-4">
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
                  rowMode={tableRowsResult.rowMode}
                  onRowModeChange={setTableRowMode}
                  groupedRowModesAvailable={Boolean(activeTableGroupWorkspace?.groups.length)}
                  showMemberValues={showTableMemberValues}
                  onShowMemberValuesChange={setShowTableMemberValues}
                  hiddenUngroupedUatCount={tableRowsResult.hiddenUngroupedUatCount}
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
        allSeries={visibleSeries}
        groupWorkspaces={mapState.groupWorkspaces}
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
        series={visibleSeries}
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

      <MapAnalyticsGroupWorkspaceImportDialog
        open={isGroupWorkspaceImportOpen}
        references={groupWorkspaceImportReferences}
        onOpenChange={setIsGroupWorkspaceImportOpen}
        onImport={importManualGroupWorkspace}
      />

    </div>
  );
}

interface ManualGroupWorkspacePanelProps {
  enabled: boolean;
  canEdit: boolean;
  groupWorkspaces: MapGroupWorkspace[];
  activeGroupWorkspaceId?: string;
  groupWorkspaceCount: number;
  onAddGroupWorkspace: () => void;
  onImportGroupWorkspace: () => void;
  onStartGroupCreateMode: (workspaceId: string) => void;
  onFinish: () => void;
  onSetActiveGroupWorkspace: (workspaceId: string) => void;
  onToggleActiveGroupWorkspace: (workspaceId: string) => void;
  onOpenGroupWorkspaceConfig: (workspaceId: string) => void;
  onDeleteGroupWorkspace: (workspaceId: string) => void;
  onMoveGroupWorkspace: (workspaceId: string, direction: 'up' | 'down') => void;
  onDuplicateGroupWorkspace: (workspaceId: string) => void;
  onReorderGroupWorkspaces: (activeWorkspaceId: string, overWorkspaceId: string) => void;
}

function ManualGroupWorkspacePanel({
  enabled,
  canEdit,
  groupWorkspaces,
  activeGroupWorkspaceId,
  groupWorkspaceCount,
  onAddGroupWorkspace,
  onImportGroupWorkspace,
  onStartGroupCreateMode,
  onFinish,
  onSetActiveGroupWorkspace,
  onToggleActiveGroupWorkspace,
  onOpenGroupWorkspaceConfig,
  onDeleteGroupWorkspace,
  onMoveGroupWorkspace,
  onDuplicateGroupWorkspace,
  onReorderGroupWorkspaces,
}: Readonly<ManualGroupWorkspacePanelProps>) {
  const [collapsed, setCollapsed] = useState(false);
  const groupsConfiguredLabel =
    groupWorkspaceCount === 1
      ? t`${groupWorkspaceCount} group workspace configured`
      : t`${groupWorkspaceCount} group workspaces configured`;
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

    onReorderGroupWorkspaces(activeId, targetId);
  };

  return (
    <section className="border-b border-border/40 py-5" data-testid="manual-grouping-panel">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="text-lg font-bold tracking-tight">{t`Groups`}</h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCollapsed((previousCollapsed) => !previousCollapsed)}
              aria-label={collapsed ? t`Expand groups panel` : t`Collapse groups panel`}
            >
              <ChevronDown className={cn('h-4 w-4 transition-transform', !collapsed && 'rotate-180')} />
            </Button>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{groupsConfiguredLabel}</p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={t`Add group`}
              disabled={!canEdit}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onAddGroupWorkspace}>
              <Plus className="mr-2 h-4 w-4" />
              {t`Add group`}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onImportGroupWorkspace}>
              <Upload className="mr-2 h-4 w-4" />
              {t`Import workspace from CSV`}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Collapsible open={!collapsed} onOpenChange={(open) => setCollapsed(!open)}>
        <CollapsibleContent className="space-y-2 data-[state=open]:animate-in data-[state=closed]:animate-out">
          {groupWorkspaces.length === 0 ? (
            <button
              type="button"
              onClick={onAddGroupWorkspace}
              disabled={!canEdit}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {t`Add group`}
            </button>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={groupWorkspaces.map((workspace) => workspace.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2.5" data-testid="manual-group-list">
                  {groupWorkspaces.map((workspace, index) => (
                    <ManualGroupWorkspaceListItem
                      key={workspace.id}
                      workspace={workspace}
                      isActive={workspace.id === activeGroupWorkspaceId}
                      isSelected={workspace.id === activeGroupWorkspaceId}
                      isAdding={enabled && workspace.id === activeGroupWorkspaceId}
                      isMoveUpDisabled={index === 0}
                      isMoveDownDisabled={index === groupWorkspaces.length - 1}
                      readOnly={!canEdit}
                      onSetActiveGroupWorkspace={onSetActiveGroupWorkspace}
                      onToggleActiveGroupWorkspace={onToggleActiveGroupWorkspace}
                      onAddToWorkspace={onStartGroupCreateMode}
                      onOpenGroupWorkspaceConfig={onOpenGroupWorkspaceConfig}
                      onDeleteGroupWorkspace={onDeleteGroupWorkspace}
                      onMoveGroupWorkspace={onMoveGroupWorkspace}
                      onDuplicateGroupWorkspace={onDuplicateGroupWorkspace}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {enabled ? (
            <div className="flex items-center justify-between gap-2 rounded-md border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              <span>{t`Click UATs on the map, or Command-drag to add many.`}</span>
              <Button
                type="button"
                size="sm"
                onClick={onFinish}
                disabled={!canEdit}
                className="h-8 shrink-0 gap-1.5 text-xs"
              >
                <Check className="h-3.5 w-3.5" />
                {t`Finish`}
              </Button>
            </div>
          ) : null}
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}

interface ManualGroupWorkspaceListItemProps {
  workspace: MapGroupWorkspace;
  isActive: boolean;
  isSelected: boolean;
  isAdding: boolean;
  isMoveUpDisabled: boolean;
  isMoveDownDisabled: boolean;
  readOnly: boolean;
  onSetActiveGroupWorkspace: (workspaceId: string) => void;
  onToggleActiveGroupWorkspace: (workspaceId: string) => void;
  onAddToWorkspace: (workspaceId: string) => void;
  onOpenGroupWorkspaceConfig: (workspaceId: string) => void;
  onDeleteGroupWorkspace: (workspaceId: string) => void;
  onMoveGroupWorkspace: (workspaceId: string, direction: 'up' | 'down') => void;
  onDuplicateGroupWorkspace: (workspaceId: string) => void;
}

function ManualGroupWorkspaceListItem({
  workspace,
  isActive,
  isSelected,
  isAdding,
  isMoveUpDisabled,
  isMoveDownDisabled,
  readOnly,
  onSetActiveGroupWorkspace,
  onToggleActiveGroupWorkspace,
  onAddToWorkspace,
  onOpenGroupWorkspaceConfig,
  onDeleteGroupWorkspace,
  onMoveGroupWorkspace,
  onDuplicateGroupWorkspace,
}: Readonly<ManualGroupWorkspaceListItemProps>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: workspace.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 'auto',
  };
  const displayLabel = workspace.label?.trim() || workspace.id;
  const groupCountLabel =
    workspace.groups.length === 1 ? t`1 merged group` : t`${workspace.groups.length} merged groups`;
  const memberCount = new Set(workspace.groups.flatMap((group) => group.memberSirutaCodes)).size;
  const memberCountLabel = memberCount === 1 ? t`1 UAT` : t`${memberCount} UATs`;
  const workspaceSummary = workspace.groups.length === 0
    ? t`No merged UAT groups`
    : `${groupCountLabel} • ${memberCountLabel}`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      role={readOnly ? undefined : 'button'}
      tabIndex={readOnly ? undefined : 0}
      aria-label={isActive ? t`Active group workspace` : t`Activate group workspace`}
      className={cn(
        'flex items-center justify-between gap-3 rounded-xl border bg-background/70 px-3 py-2.5',
        isSelected && 'border-primary bg-primary/5',
        isDragging && 'shadow-md'
      )}
      onClick={() => onToggleActiveGroupWorkspace(workspace.id)}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) {
          return;
        }
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onToggleActiveGroupWorkspace(workspace.id);
        }
      }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {readOnly ? (
          <span className="text-muted-foreground">
            <GripVertical className="h-4 w-4" />
          </span>
        ) : (
          <button
            type="button"
            aria-label={t`Reorder group`}
            className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
            onClick={(event) => event.stopPropagation()}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}

        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={cn(
            'h-7 w-7 rounded-full border shadow-sm',
            isActive
              ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
              : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted/70'
          )}
          onClick={(event) => {
            event.stopPropagation();
            onSetActiveGroupWorkspace(workspace.id);
            onOpenGroupWorkspaceConfig(workspace.id);
          }}
          aria-label={t`Edit group`}
          disabled={readOnly}
        >
          <Boxes className="h-3.5 w-3.5" />
        </Button>

        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-semibold" title={displayLabel}>
            {displayLabel}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {isAdding ? t`Adding UATs` : workspaceSummary}
          </p>
        </div>
      </div>

      {!readOnly ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              aria-label={t`Open row menu`}
              onClick={(event) => event.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
            <DropdownMenuItem onSelect={() => onOpenGroupWorkspaceConfig(workspace.id)}>
              <Pencil className="mr-2 h-4 w-4" />
              {t`Edit`}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onSetActiveGroupWorkspace(workspace.id)} disabled={isActive}>
              <Star className="mr-2 h-4 w-4" />
              {t`Make active`}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onAddToWorkspace(workspace.id)}>
              <MousePointer2 className="mr-2 h-4 w-4" />
              {t`Add UATs here`}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={isMoveUpDisabled}
              onSelect={() => onMoveGroupWorkspace(workspace.id, 'up')}
            >
              <ArrowUp className="mr-2 h-4 w-4" />
              {t`Move up`}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isMoveDownDisabled}
              onSelect={() => onMoveGroupWorkspace(workspace.id, 'down')}
            >
              <ArrowDown className="mr-2 h-4 w-4" />
              {t`Move down`}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onDuplicateGroupWorkspace(workspace.id)}>
              <Copy className="mr-2 h-4 w-4" />
              {t`Duplicate`}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => onDeleteGroupWorkspace(workspace.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t`Delete`}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}

interface ManualGroupWorkspaceConfigPanelProps {
  workspace: MapGroupWorkspace;
  canEdit: boolean;
  activeGroupId?: string;
  manualGroupFocusRequest?: ManualGroupFocusRequest | null;
  uatMetadataBySirutaCode: Map<string, Omit<AdvancedMapAnalyticsTableRow, 'sirutaCode' | 'valuesBySeriesId' | 'groupValuesByGroupingId'>>;
  onClose: () => void;
  onManualGroupFocusRequestHandled: (requestId: number) => void;
  onWorkspaceLabelChange: (workspaceId: string, nextLabel: string) => void;
  onAddGroupItem: (workspaceId: string) => void;
  onGroupLabelChange: (workspaceId: string, groupId: string, nextLabel: string) => void;
  onActivateGroup: (workspaceId: string, groupId: string) => void;
  onImportGroupWorkspace: () => void;
  onAddToWorkspace: (workspaceId: string) => void;
  onAddToGroup: (workspaceId: string, groupId: string) => void;
  onDeleteWorkspace: (workspaceId: string) => void;
  onDeleteGroup: (workspaceId: string, groupId: string) => void;
  onRemoveMember: (workspaceId: string, groupId: string, sirutaCode: string) => void;
  onMoveMember: (workspaceId: string, groupId: string, sirutaCode: string, direction: 'previous' | 'next') => void;
  onSetPrimaryMember: (workspaceId: string, groupId: string, sirutaCode: string) => void;
}

function ManualGroupWorkspaceConfigPanel({
  workspace,
  canEdit,
  activeGroupId,
  manualGroupFocusRequest,
  uatMetadataBySirutaCode,
  onClose,
  onManualGroupFocusRequestHandled,
  onWorkspaceLabelChange,
  onAddGroupItem,
  onGroupLabelChange,
  onActivateGroup,
  onImportGroupWorkspace,
  onAddToWorkspace,
  onAddToGroup,
  onDeleteWorkspace,
  onDeleteGroup,
  onRemoveMember,
  onMoveMember,
  onSetPrimaryMember,
}: Readonly<ManualGroupWorkspaceConfigPanelProps>) {
  const [isEditingWorkspaceTitle, setIsEditingWorkspaceTitle] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | undefined>(undefined);
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const deferredGroupSearchQuery = useDeferredValue(groupSearchQuery);
  const groupListScrollRef = useRef<HTMLDivElement>(null);
  const groupCardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const displayLabel = workspace.label?.trim() || workspace.id;
  const totalMemberCount = new Set(workspace.groups.flatMap((group) => group.memberSirutaCodes)).size;
  const mergedGroupCountLabel =
    workspace.groups.length === 1 ? t`1 merged group` : t`${workspace.groups.length} merged groups`;
  const totalMemberCountLabel = totalMemberCount === 1 ? t`1 UAT` : t`${totalMemberCount} UATs`;
  const normalizedGroupSearchQuery = useMemo(
    () => normalizeManualGroupSearchText(deferredGroupSearchQuery),
    [deferredGroupSearchQuery],
  );
  const visibleGroups = useMemo(
    () =>
      workspace.groups
        .map((group, groupIndex) => ({ group, groupIndex }))
        .filter(({ group }) => {
          if (!normalizedGroupSearchQuery) {
            return true;
          }

          const groupLabel = group.label?.trim() || group.id;
          const searchableValues = [
            groupLabel,
            group.id,
            ...group.memberSirutaCodes.flatMap((sirutaCode) => {
              const metadata = uatMetadataBySirutaCode.get(sirutaCode);
              return [
                sirutaCode,
                metadata?.uatName,
                metadata?.entityCui,
                metadata?.countyName,
              ];
            }),
          ];

          return searchableValues.some((value) =>
            normalizeManualGroupSearchText(value).includes(normalizedGroupSearchQuery)
          );
        }),
    [normalizedGroupSearchQuery, uatMetadataBySirutaCode, workspace.groups]
  );
  const hasGroupSearchQuery = normalizedGroupSearchQuery.length > 0;
  const groupListVirtualizer = useVirtualizer({
    count: visibleGroups.length,
    getScrollElement: () => groupListScrollRef.current,
    estimateSize: (index) => estimateManualGroupCardHeight(visibleGroups[index]?.group),
    getItemKey: (index) => visibleGroups[index]?.group.id ?? index,
    overscan: 4,
    initialRect: {
      width: 600,
      height: 640,
    },
  });
  const virtualGroupRows = groupListVirtualizer.getVirtualItems();

  useEffect(() => {
    groupListVirtualizer.scrollToOffset(0, { align: 'start' });
  }, [groupListVirtualizer, normalizedGroupSearchQuery, workspace.id]);

  useEffect(() => {
    if (
      !manualGroupFocusRequest ||
      manualGroupFocusRequest.workspaceId !== workspace.id ||
      !hasGroupSearchQuery
    ) {
      return;
    }

    const targetGroupIsVisible = visibleGroups.some(
      ({ group }) => group.id === manualGroupFocusRequest.groupId
    );
    if (!targetGroupIsVisible) {
      setGroupSearchQuery('');
    }
  }, [hasGroupSearchQuery, manualGroupFocusRequest, visibleGroups, workspace.id]);

  useEffect(() => {
    if (!manualGroupFocusRequest || manualGroupFocusRequest.workspaceId !== workspace.id) {
      return;
    }

    const visibleGroupIndex = visibleGroups.findIndex(
      ({ group }) => group.id === manualGroupFocusRequest.groupId
    );
    if (visibleGroupIndex < 0) {
      return;
    }

    const focusGroupCard = () => {
      const groupCard = groupCardRefs.current.get(manualGroupFocusRequest.groupId);
      if (!groupCard) {
        return false;
      }

      groupCard.focus({ preventScroll: true });
      groupCard.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return true;
    };

    if (focusGroupCard()) {
      onManualGroupFocusRequestHandled(manualGroupFocusRequest.requestId);
      return;
    }

    groupListVirtualizer.scrollToIndex(visibleGroupIndex, { align: 'center' });
    let frame: number | undefined;
    let attemptCount = 0;
    const retryFocusGroupCard = () => {
      if (focusGroupCard()) {
        onManualGroupFocusRequestHandled(manualGroupFocusRequest.requestId);
        return;
      }

      attemptCount += 1;
      if (attemptCount >= MANUAL_GROUP_FOCUS_RETRY_FRAME_LIMIT) {
        return;
      }

      frame = window.requestAnimationFrame(retryFocusGroupCard);
    };

    // Virtualized rows mount asynchronously after scrollToIndex. Keep the
    // request alive until the row ref exists so map-to-panel focus is not lost.
    frame = window.requestAnimationFrame(retryFocusGroupCard);

    return () => {
      if (frame !== undefined) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [
    groupListVirtualizer,
    manualGroupFocusRequest,
    onManualGroupFocusRequestHandled,
    visibleGroups,
    workspace.id,
  ]);

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-background text-foreground">
      <div className="flex min-h-0 flex-1 flex-col px-5 py-2">
        <div className="flex shrink-0 items-start gap-3 pb-5 pt-6">
          <div className="min-w-0 flex-1 space-y-1">
            {isEditingWorkspaceTitle ? (
              <input
                type="text"
                value={workspace.label ?? workspace.id}
                onChange={(event) => onWorkspaceLabelChange(workspace.id, event.target.value)}
                onBlur={() => setIsEditingWorkspaceTitle(false)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === 'Escape') {
                    event.currentTarget.blur();
                  }
                }}
                disabled={!canEdit}
                autoFocus
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-xl font-bold tracking-tight shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={t`Workspace name`}
              />
            ) : (
              <h1 className="truncate text-xl font-bold tracking-tight text-foreground" title={displayLabel}>
                {displayLabel}
              </h1>
            )}
            <p className="text-sm text-muted-foreground">
              {mergedGroupCountLabel} • {totalMemberCountLabel}
            </p>
          </div>

          {canEdit ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={t`Open workspace menu`}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setIsEditingWorkspaceTitle(true)}
                  onSelect={() => setIsEditingWorkspaceTitle(true)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  {t`Rename`}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onAddToWorkspace(workspace.id)}
                >
                  <MousePointer2 className="mr-2 h-4 w-4" />
                  {t`Merge UATs in this workspace`}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onImportGroupWorkspace}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {t`Import workspace from CSV`}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDeleteWorkspace(workspace.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t`Delete workspace`}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>

        <section className="flex min-h-0 flex-1 flex-col border-y border-border/40 py-5">
          <div className="mb-3 flex shrink-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-bold tracking-tight">{t`Groups`}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {hasGroupSearchQuery
                  ? visibleGroups.length === 1
                    ? t`1 matching group item`
                    : t`${visibleGroups.length} matching group items`
                  : workspace.groups.length === 1
                    ? t`1 group item configured`
                    : t`${workspace.groups.length} group items configured`}
              </p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => onAddGroupItem(workspace.id)}
              aria-label={t`Add group item`}
              disabled={!canEdit}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative mb-3 shrink-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={groupSearchQuery}
              onChange={(event) => setGroupSearchQuery(event.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              placeholder={t`Search by name, CUI, or SIRUTA`}
              aria-label={t`Search groups`}
            />
          </div>

          <div
            ref={groupListScrollRef}
            className="min-h-0 flex-1 overflow-y-auto pr-1"
            style={{ contain: 'strict' }}
          >
            {workspace.groups.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                {t`No merged UAT groups in this workspace.`}
              </div>
            ) : visibleGroups.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                {t`No group items match this search.`}
              </div>
            ) : (
              <div
                className="relative w-full"
                style={{ height: `${groupListVirtualizer.getTotalSize()}px` }}
              >
                {virtualGroupRows.map((virtualRow) => {
                  const visibleGroup = visibleGroups[virtualRow.index];
                  if (!visibleGroup) {
                    return null;
                  }
                  const { group, groupIndex } = visibleGroup;
                  return (
                    <div
                      key={virtualRow.key}
                      data-index={virtualRow.index}
                      ref={groupListVirtualizer.measureElement}
                      className="absolute left-0 top-0 w-full pb-3"
                      style={{ transform: `translateY(${virtualRow.start}px)` }}
                    >
                      <ManualGroupItemCard
                        ref={(node) => {
                          if (node) {
                            groupCardRefs.current.set(group.id, node);
                          } else {
                            groupCardRefs.current.delete(group.id);
                          }
                        }}
                        workspaceId={workspace.id}
                        group={group}
                        groupIndex={groupIndex}
                        canEdit={canEdit}
                        activeGroupId={activeGroupId}
                        editingGroupId={editingGroupId}
                        uatMetadataBySirutaCode={uatMetadataBySirutaCode}
                        onGroupLabelChange={onGroupLabelChange}
                        onActivateGroup={onActivateGroup}
                        onAddToGroup={onAddToGroup}
                        onDeleteGroup={onDeleteGroup}
                        onRemoveMember={onRemoveMember}
                        onMoveMember={onMoveMember}
                        onSetPrimaryMember={onSetPrimaryMember}
                        setEditingGroupId={setEditingGroupId}
                      />
                    </div>
                  );
                })}
              </div>
            )}
            <button
              type="button"
              onClick={() => onAddGroupItem(workspace.id)}
              disabled={!canEdit}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {t`Add group item`}
            </button>
          </div>
        </section>
      </div>

      <div className="border-t border-border/40 bg-background px-5 py-3">
        <Button
          type="button"
          variant="accent"
          className="w-full"
          onClick={onClose}
        >
          {t`Close`}
        </Button>
      </div>
    </div>
  );
}

interface ManualGroupItemCardProps {
  workspaceId: string;
  group: MapGroup;
  groupIndex: number;
  canEdit: boolean;
  activeGroupId?: string;
  editingGroupId?: string;
  uatMetadataBySirutaCode: Map<string, Omit<AdvancedMapAnalyticsTableRow, 'sirutaCode' | 'valuesBySeriesId' | 'groupValuesByGroupingId'>>;
  onGroupLabelChange: (workspaceId: string, groupId: string, nextLabel: string) => void;
  onActivateGroup: (workspaceId: string, groupId: string) => void;
  onAddToGroup: (workspaceId: string, groupId: string) => void;
  onDeleteGroup: (workspaceId: string, groupId: string) => void;
  onRemoveMember: (workspaceId: string, groupId: string, sirutaCode: string) => void;
  onMoveMember: (workspaceId: string, groupId: string, sirutaCode: string, direction: 'previous' | 'next') => void;
  onSetPrimaryMember: (workspaceId: string, groupId: string, sirutaCode: string) => void;
  setEditingGroupId: Dispatch<SetStateAction<string | undefined>>;
}

const ManualGroupItemCard = memo(forwardRef<HTMLDivElement, Readonly<ManualGroupItemCardProps>>(
  function ManualGroupItemCard({
    workspaceId,
    group,
    groupIndex,
    canEdit,
    activeGroupId,
    editingGroupId,
    uatMetadataBySirutaCode,
    onGroupLabelChange,
    onActivateGroup,
    onAddToGroup,
    onDeleteGroup,
    onRemoveMember,
    onMoveMember,
    onSetPrimaryMember,
    setEditingGroupId,
  }, ref) {
    const orderedMembers = getOrderedManualGroupMemberCodes(group);
    const groupLabel = group.label?.trim() || group.id;
    const isActiveGroup = group.id === activeGroupId;
    const hasActiveGroup = Boolean(activeGroupId);
    const isEditingGroupTitle = editingGroupId === group.id;
    const groupColor = getManualGroupColor(groupIndex);
    const groupCardStyle = {
      borderColor: isActiveGroup ? groupColor : undefined,
      backgroundColor: isActiveGroup
        ? getColorMix(groupColor, 10)
        : hasActiveGroup
          ? getColorMix(groupColor, 4)
          : undefined,
    };

    return (
      <div
        ref={ref}
        className={cn(
          'group/group-card cursor-pointer rounded-lg border bg-background/70 px-3 py-2.5 transition-colors',
          hasActiveGroup && !isActiveGroup && 'opacity-65'
        )}
        style={groupCardStyle}
        onClick={() => onActivateGroup(workspaceId, group.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) {
            return;
          }
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onActivateGroup(workspaceId, group.id);
          }
        }}
        aria-pressed={isActiveGroup}
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  'h-2.5 w-2.5 shrink-0 rounded-full',
                  hasActiveGroup && !isActiveGroup && 'opacity-40'
                )}
                style={{ backgroundColor: groupColor }}
                aria-hidden="true"
              />
              <input
                type="text"
                value={group.label ?? group.id}
                onChange={(event) => onGroupLabelChange(workspaceId, group.id, event.target.value)}
                onBlur={() => setEditingGroupId(undefined)}
                onKeyDown={(event) => {
                  event.stopPropagation();
                  if (event.key === 'Enter' || event.key === 'Escape') {
                    event.currentTarget.blur();
                  }
                }}
                onClick={(event) => {
                  if (isEditingGroupTitle) {
                    event.stopPropagation();
                  }
                }}
                readOnly={!isEditingGroupTitle}
                disabled={!canEdit}
                autoFocus={isEditingGroupTitle}
                className={cn(
                  'h-7 w-full truncate border-0 bg-transparent px-0 text-sm font-semibold shadow-none outline-none transition-colors focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50',
                  isEditingGroupTitle && 'rounded-md border border-input bg-background px-2 shadow-sm focus-visible:ring-2 focus-visible:ring-ring',
                  !isEditingGroupTitle && 'pointer-events-none'
                )}
                aria-label={t`Group name`}
                title={groupLabel}
              />
            </div>
            <span className="block truncate text-xs text-muted-foreground">
              {orderedMembers.length === 1
                ? t`1 UAT`
                : t`${orderedMembers.length} UATs`}
            </span>
          </div>
          {canEdit ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover/group-card:opacity-100 group-focus-within/group-card:opacity-100 data-[state=open]:opacity-100"
                  aria-label={t`Open group menu`}
                  onClick={(event) => event.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
                <DropdownMenuItem
                  onClick={() => setEditingGroupId(group.id)}
                  onSelect={() => setEditingGroupId(group.id)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  {t`Rename`}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onAddToGroup(workspaceId, group.id)}
                >
                  <MousePointer2 className="mr-2 h-4 w-4" />
                  {t`Add UATs to this group`}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDeleteGroup(workspaceId, group.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t`Delete group`}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
        {orderedMembers.length > 0 ? (
          <div className="mt-2 divide-y divide-border/40 rounded-md bg-muted/20">
            {orderedMembers.map((sirutaCode, memberIndex) => {
              const metadata = uatMetadataBySirutaCode.get(sirutaCode);
              const memberLabel = metadata?.uatName || `UAT ${sirutaCode}`;
              const isPrimaryMember = group.primarySirutaCode === sirutaCode;
              return (
                <div
                  key={sirutaCode}
                  className="group/member-row flex items-center gap-2 px-2 py-1.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{memberLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {isPrimaryMember ? t`Primary UAT` : sirutaCode}
                    </p>
                  </div>
                  {canEdit ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover/member-row:opacity-100 group-focus-within/member-row:opacity-100 data-[state=open]:opacity-100"
                          aria-label={t`Open UAT menu`}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
                        <DropdownMenuItem
                          onClick={() => onMoveMember(workspaceId, group.id, sirutaCode, 'previous')}
                          disabled={memberIndex === 0}
                        >
                          <ArrowUp className="mr-2 h-4 w-4" />
                          {t`Move earlier`}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onMoveMember(workspaceId, group.id, sirutaCode, 'next')}
                          disabled={memberIndex === orderedMembers.length - 1}
                        >
                          <ArrowDown className="mr-2 h-4 w-4" />
                          {t`Move later`}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onSetPrimaryMember(workspaceId, group.id, sirutaCode)}
                          disabled={isPrimaryMember}
                        >
                          <Star className="mr-2 h-4 w-4" />
                          {t`Set primary`}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => onRemoveMember(workspaceId, group.id, sirutaCode)}
                        >
                          <X className="mr-2 h-4 w-4" />
                          {t`Remove from group`}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-2 rounded-md bg-muted/30 px-2 py-1.5 text-xs text-muted-foreground">
            {t`No UATs in ${groupLabel}.`}
          </p>
        )}
      </div>
    );
  }
));

function normalizeManualGroupSearchText(value: unknown): string {
  return String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase();
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
