import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { Dispatch, SetStateAction, ReactNode } from 'react';
import { AnimatePresence } from 'framer-motion';
import { produce } from 'immer';

import { ClientOnly } from '@/components/ssr/ClientOnly';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AdvancedMapAnalyticsAnalyticsView } from '@/components/maps/advanced-map-analytics/advanced-map-analytics-analytics-view';
import { AdvancedMapAnalyticsDataTable } from '@/components/maps/advanced-map-analytics/advanced-map-analytics-data-table';
import { AdvancedMapAnalyticsDiscreteLegend } from '@/components/maps/advanced-map-analytics/advanced-map-analytics-discrete-legend';
import { AdvancedMapAnalyticsLegendCard } from '@/components/maps/advanced-map-analytics/advanced-map-analytics-legend-card';
import type {
  AdvancedMapAnalyticsTableRow,
  AdvancedMapAnalyticsTableSeriesColumn,
} from '@/components/maps/advanced-map-analytics/advanced-map-analytics-table-types';
import {
  resolveSeriesDisplayLabel,
  resolveSeriesDisplayUnit,
} from '@/components/maps/advanced-map-analytics/advanced-map-analytics-series-utils';
import { buildDiscretePaletteFromConfig } from '@/lib/map-bins/bins';
import { getPercentileValues } from '@/components/maps/utils';
import type { UatProperties } from '@/components/maps/interfaces';
import { useGeoJsonData } from '@/hooks/useGeoJson';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAdvancedMapAnalyticsBins } from '@/hooks/useAdvancedMapAnalyticsBins';
import { useAdvancedMapAnalyticsSeriesData } from '@/hooks/useAdvancedMapAnalyticsSeriesData';
import { useAdvancedMapAnalyticsTableBinsFilter } from '@/hooks/useAdvancedMapAnalyticsTableBinsFilter';
import { useUserCurrency } from '@/lib/hooks/useUserCurrency';
import { useUserInflationAdjusted } from '@/lib/hooks/useUserInflationAdjusted';
import { useEntityProfile } from '@/lib/hooks/useEntityDetails';
import { defaultMapFilters } from '@/schemas/map-filters';
import type {
  AdvancedMapAnalyticsActiveView,
  AdvancedMapAnalyticsUrlState,
  AdvancedMapAnalyticsWidget,
  AdvancedMapAnalyticsWidgetKey,
  MapSupportedSeries,
} from '@/schemas/advanced-map-analytics';
import type { GroupedSeriesDataResponse } from '@/lib/map-series/interfaces';
import { loadInteractiveMapModule } from '@/features/advanced-map-analytics/analytics-map-warmup';
import {
  MapAnalyticsEntityDetailsPanel,
  type MapAnalyticsEntityDetailsSelection,
} from '@/features/advanced-map-analytics/components/map-analytics-entity-details-panel';
import { MapAnalyticsQuickActions } from '@/features/advanced-map-analytics/components/map-analytics-quick-actions';
import { MapAnalyticsDescriptionInline } from '@/features/advanced-map-analytics/components/map-analytics-description-inline';
import { MapAnalyticsSeriesSelector } from '@/features/advanced-map-analytics/components/map-analytics-series-selector';
import {
  buildPublicEntitySeriesRows,
  buildPublicHeatmapData,
  buildPublicMapFeatureStyle,
  buildPublicMapTooltipContent,
  buildUatMetadataBySirutaCode,
  computePublicHeatmapDataRange,
  createPublicEntitySelection,
  selectUatFeatures,
} from '@/features/advanced-map-analytics/components/map-analytics-public-view-helpers';
import { cn } from '@/lib/utils';
import { buildEntityDetailsPath } from '@/lib/entity-navigation';
import { t } from '@lingui/core/macro';

const InteractiveMap = lazy(() =>
  loadInteractiveMapModule().then((module) => ({ default: module.InteractiveMap }))
);

interface MapAnalyticsPublicViewProps {
  mapState: AdvancedMapAnalyticsUrlState;
  setMapState: Dispatch<SetStateAction<AdvancedMapAnalyticsUrlState>>;
  mapDescription: string;
  bundledGroupedSeriesData?: GroupedSeriesDataResponse;
  bundledRemoteBaseSeriesHash?: string;
  /**
   * SIRUTA code to seed the entity details panel with on first render
   * and re-sync on URL navigations. When set, the panel auto-opens for
   * that UAT once the GeoJSON has resolved.
   */
  selectedSirutaOverride?: string;
  /**
   * Notifies the route layer that the user changed (or cleared) the
   * selected UAT, so the URL search can be kept in sync for sharing.
   */
  onSelectedSirutaChange?: (nextSiruta: string | undefined) => void;
}

/**
 * Public-first composition for `/maps/public/$mapId`. Reuses the analytics
 * data hooks from the editor and renders a polished, read-only layout with
 * a dedicated left sidebar (title, description, series selector, legend,
 * action buttons) and a full-bleed map.
 */
export function MapAnalyticsPublicView({
  mapState,
  setMapState,
  mapDescription,
  bundledGroupedSeriesData,
  bundledRemoteBaseSeriesHash,
  selectedSirutaOverride,
  onSelectedSirutaChange,
}: Readonly<MapAnalyticsPublicViewProps>) {
  const isMobile = useIsMobile();
  const [userCurrency] = useUserCurrency();
  const [userInflationAdjusted] = useUserInflationAdjusted();
  const [selectedSiruta, setSelectedSiruta] = useState<string | undefined>(
    selectedSirutaOverride
  );
  const [mobileFooterExpanded, setMobileFooterExpanded] = useState(false);

  const updateMapStateDraft = useCallback(
    (updater: (draft: AdvancedMapAnalyticsUrlState) => void) => {
      setMapState((previousState) => produce(previousState, updater));
    },
    [setMapState]
  );

  const enabledSeries = useMemo<MapSupportedSeries[]>(
    () => mapState.series.filter((series) => series.enabled),
    [mapState.series]
  );

  const seriesDataResult = useAdvancedMapAnalyticsSeriesData({
    series: mapState.series,
    activeSeriesId: mapState.activeSeriesId,
    defaultCurrency: userCurrency,
    defaultInflationAdjusted: userInflationAdjusted,
    valueFilterRules: mapState.valueFilters.rules,
    bundledGroupedSeriesData,
    bundledRemoteBaseSeriesHash,
    enabled: true,
  });

  const {
    valuesBySeriesId,
    unitsBySeriesId,
    activeValues,
    activeSeriesId: resolvedActiveSeriesId,
    warnings: seriesWarnings,
    isLoading: isSeriesLoading,
    error: seriesError,
  } = seriesDataResult;

  const activeSeries = useMemo<MapSupportedSeries | undefined>(() => {
    if (!resolvedActiveSeriesId) {
      return undefined;
    }
    return enabledSeries.find((series) => series.id === resolvedActiveSeriesId);
  }, [enabledSeries, resolvedActiveSeriesId]);

  const binsResult = useAdvancedMapAnalyticsBins({
    mapState,
    updateState: updateMapStateDraft,
    activeSeries,
    activeSeriesId: resolvedActiveSeriesId,
    activeValues,
    seriesWarnings,
  });

  const {
    activeBinsPreset,
    binsClassification,
    binsCanApply,
    activeNoDataConfig,
  } = binsResult;

  const isContinuousIntervalMode = activeBinsPreset?.config.intervalMode === 'continuous';

  const activeHeatmapData = useMemo(
    () => buildPublicHeatmapData({ activeSeries, activeValues, binsCanApply }),
    [activeSeries, activeValues, binsCanApply]
  );

  const realDataRange = useMemo(
    () => computePublicHeatmapDataRange({ heatmapData: activeHeatmapData }),
    [activeHeatmapData]
  );

  const colorRange = useMemo(() => {
    if (activeHeatmapData.length === 0) {
      return { min: 0, max: 0 };
    }

    const percentiles = activeBinsPreset?.config.continuousPercentiles;
    const lowerPercentile = isContinuousIntervalMode ? (percentiles?.min ?? 5) : 5;
    const upperPercentile = isContinuousIntervalMode ? (percentiles?.max ?? 95) : 95;
    return getPercentileValues(activeHeatmapData, lowerPercentile, upperPercentile, 'amount');
  }, [
    activeBinsPreset?.config.continuousPercentiles,
    activeHeatmapData,
    isContinuousIntervalMode,
  ]);

  const getFeatureStyle = useMemo(
    () =>
      buildPublicMapFeatureStyle({
        binsCanApply,
        binsClassification,
        activeNoDataConfig,
        isContinuousIntervalMode,
        colorRange,
        gradient: activeBinsPreset?.config.gradient,
      }),
    [
      activeBinsPreset?.config.gradient,
      activeNoDataConfig,
      binsCanApply,
      binsClassification,
      colorRange,
      isContinuousIntervalMode,
    ]
  );

  const getTooltipContent = useMemo(
    () =>
      buildPublicMapTooltipContent({
        enabledSeries,
        activeSeries,
        activeSeriesId: resolvedActiveSeriesId,
        valuesBySeriesId,
        unitsBySeriesId,
        binsCanApply,
        binsClassification,
        activeNoDataConfig,
      }),
    [
      activeNoDataConfig,
      activeSeries,
      binsCanApply,
      binsClassification,
      enabledSeries,
      resolvedActiveSeriesId,
      unitsBySeriesId,
      valuesBySeriesId,
    ]
  );

  const {
    data: geoJsonData,
    isLoading: isGeoJsonLoading,
    error: geoJsonError,
  } = useGeoJsonData('UAT');

  const { data: countyGeoJsonData } = useGeoJsonData('County', {
    enabled: mapState.showCountyBoundaries,
  });

  const geoJsonFeatures = useMemo(() => selectUatFeatures(geoJsonData), [geoJsonData]);

  const uatMetadataBySirutaCode = useMemo(
    () => buildUatMetadataBySirutaCode(geoJsonFeatures),
    [geoJsonFeatures]
  );

  const seriesColumns = useMemo<AdvancedMapAnalyticsTableSeriesColumn[]>(
    () =>
      enabledSeries.map((series) => ({
        id: series.id,
        label: resolveSeriesDisplayLabel(series),
        unit: resolveSeriesDisplayUnit(series, unitsBySeriesId),
      })),
    [enabledSeries, unitsBySeriesId]
  );

  const tableRows = useMemo<AdvancedMapAnalyticsTableRow[]>(() => {
    const activeSeriesColumn = resolvedActiveSeriesId
      ? seriesColumns.find((seriesColumn) => seriesColumn.id === resolvedActiveSeriesId)
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
  }, [resolvedActiveSeriesId, seriesColumns, uatMetadataBySirutaCode, valuesBySeriesId]);

  const toggleBinFilterSelection = useCallback(
    (presetId: string, groupId: string, checked: boolean) => {
      updateMapStateDraft((draft) => {
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
    [updateMapStateDraft]
  );

  const clearPresetBinFilters = useCallback(
    (presetId: string) => {
      updateMapStateDraft((draft) => {
        delete draft.tableBinFiltersByPresetId[presetId];
      });
    },
    [updateMapStateDraft]
  );

  const clearAllBinFilters = useCallback(() => {
    updateMapStateDraft((draft) => {
      draft.tableBinFiltersByPresetId = {};
    });
  }, [updateMapStateDraft]);

  const { filteredRows: filteredTableRows, binsFilterSections, hasActiveBinFilters } =
    useAdvancedMapAnalyticsTableBinsFilter({
      rows: tableRows,
      binsPresets: mapState.binsPresets,
      activeValues,
      tableBinFiltersByPresetId: mapState.tableBinFiltersByPresetId,
    });

  // Re-sync internal selection when the URL override changes (e.g. browser
  // back/forward navigation or shared link landing).
  useEffect(() => {
    setSelectedSiruta((current) => {
      if (selectedSirutaOverride === current) {
        return current;
      }
      return selectedSirutaOverride;
    });
  }, [selectedSirutaOverride]);

  const featureBySirutaCode = useMemo(() => {
    const map = new Map<string, (typeof geoJsonFeatures)[number]>();
    for (const feature of geoJsonFeatures) {
      const sirutaCode = String(feature?.properties?.natcode ?? '').trim();
      if (sirutaCode.length === 0) {
        continue;
      }
      map.set(sirutaCode, feature);
    }
    return map;
  }, [geoJsonFeatures]);

  const selectedMapEntity = useMemo<MapAnalyticsEntityDetailsSelection | null>(() => {
    if (!selectedSiruta) {
      return null;
    }
    const feature = featureBySirutaCode.get(selectedSiruta);
    if (!feature?.properties) {
      // Geometry not yet loaded (or unknown SIRUTA) — wait for resolution.
      return null;
    }
    return createPublicEntitySelection({
      properties: feature.properties,
      uatMetadataBySirutaCode,
    });
  }, [featureBySirutaCode, selectedSiruta, uatMetadataBySirutaCode]);

  const selectedMapEntitySeriesRows = useMemo(() => {
    if (!selectedMapEntity) {
      return [];
    }
    return buildPublicEntitySeriesRows({
      enabledSeries,
      activeSeriesId: resolvedActiveSeriesId,
      selection: selectedMapEntity,
      valuesBySeriesId,
      unitsBySeriesId,
    });
  }, [enabledSeries, resolvedActiveSeriesId, selectedMapEntity, unitsBySeriesId, valuesBySeriesId]);

  const selectedEntityProfileQuery = useEntityProfile(selectedMapEntity?.entityCui);
  const selectedEntityProfileErrorMessage =
    selectedEntityProfileQuery.error instanceof Error
      ? selectedEntityProfileQuery.error.message
      : selectedEntityProfileQuery.error
        ? String(selectedEntityProfileQuery.error)
        : undefined;
  const selectedMapEntityHref = selectedMapEntity?.entityCui
    ? buildEntityDetailsPath(selectedMapEntity.entityCui)
    : undefined;

  // Track the latest URL writer in a ref so the click/close callbacks stay
  // referentially stable even when the parent component recreates them.
  const onSelectedSirutaChangeRef = useRef(onSelectedSirutaChange);
  useEffect(() => {
    onSelectedSirutaChangeRef.current = onSelectedSirutaChange;
  }, [onSelectedSirutaChange]);

  const updateSelectedSiruta = useCallback((nextSiruta: string | undefined) => {
    setSelectedSiruta((current) => (current === nextSiruta ? current : nextSiruta));
    onSelectedSirutaChangeRef.current?.(nextSiruta);
  }, []);

  const handleMapFeatureClick = useCallback(
    (properties: UatProperties) => {
      const sirutaCode = String(properties?.natcode ?? '').trim();
      if (sirutaCode.length === 0) {
        return;
      }
      updateSelectedSiruta(sirutaCode);
    },
    [updateSelectedSiruta]
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

      updateMapStateDraft((draft) => {
        draft.mapCenter = nextCenter;
        draft.mapZoom = nextZoom;
      });
    },
    [mapState.mapCenter, mapState.mapZoom, updateMapStateDraft]
  );

  const handleCloseEntityPanel = useCallback(() => {
    updateSelectedSiruta(undefined);
  }, [updateSelectedSiruta]);

  const handleActiveViewChange = useCallback(
    (nextView: AdvancedMapAnalyticsActiveView) => {
      updateMapStateDraft((draft) => {
        draft.activeView = nextView;
      });
    },
    [updateMapStateDraft]
  );

  const handleTableRowClick = useCallback(
    (row: AdvancedMapAnalyticsTableRow) => {
      updateSelectedSiruta(row.sirutaCode);
      handleActiveViewChange('map');
    },
    [handleActiveViewChange, updateSelectedSiruta]
  );

  const handleToggleWidgetEnabled = useCallback(
    (_widgetKey: AdvancedMapAnalyticsWidgetKey, _enabled: boolean) => {},
    []
  );
  const handleReorderWidgets = useCallback(
    (_activeWidgetKey: AdvancedMapAnalyticsWidgetKey, _overWidgetKey: AdvancedMapAnalyticsWidgetKey) => {},
    []
  );
  const handleUpdateWidget = useCallback((_nextWidget: AdvancedMapAnalyticsWidget) => {}, []);

  const mapZoom = mapState.mapZoom ?? (isMobile ? 6 : 7.7);
  const mapCenter = mapState.mapCenter;
  const activeUnit = activeSeries
    ? resolveSeriesDisplayUnit(activeSeries, unitsBySeriesId)
    : undefined;
  const activeBinsLegendTitle = useMemo(() => {
    const presetTitle = activeBinsPreset?.config.title?.trim();
    if (presetTitle && presetTitle.length > 0) {
      return presetTitle;
    }
    return activeSeries?.label || t`Active series`;
  }, [activeBinsPreset?.config.title, activeSeries?.label]);

  const isMapLoading = isSeriesLoading || isGeoJsonLoading;
  const mapError = seriesError ?? geoJsonError;
  const canRenderInteractiveMap = Boolean(geoJsonData);
  const activeView = mapState.activeView ?? 'map';
  const isMapViewActive = activeView === 'map';
  const isTableViewActive = activeView === 'table';
  const isAnalyticsViewActive = activeView === 'analytics';
  const hasEnabledGeoJsonDatasetSeries = enabledSeries.some(
    (series) => series.type === 'geojson-dataset-series'
  );
  const isTableLoading = isSeriesLoading || (hasEnabledGeoJsonDatasetSeries && isGeoJsonLoading);
  const tableError = seriesError ?? (hasEnabledGeoJsonDatasetSeries ? geoJsonError : null);
  const isAnalyticsLoading = isSeriesLoading || (hasEnabledGeoJsonDatasetSeries && isGeoJsonLoading);
  const analyticsError = seriesError ?? (hasEnabledGeoJsonDatasetSeries ? geoJsonError : null);

  const trimmedMapName = mapState.mapName?.trim();
  const displayTitle =
    trimmedMapName && trimmedMapName.length > 0 ? trimmedMapName : t`Untitled map`;
  const hasDescription = mapDescription.trim().length > 0;

  const renderLegend = (variant: 'floating' | 'inline') =>
    activeSeries ? (
      binsCanApply ? (
        <AdvancedMapAnalyticsDiscreteLegend
          title={activeBinsLegendTitle}
          entries={binsClassification.palette}
          variant={variant}
        />
      ) : (
        <AdvancedMapAnalyticsLegendCard
          min={realDataRange.min}
          max={realDataRange.max}
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
          variant={variant}
        />
      )
    ) : null;

  const sidebarLegend = renderLegend('inline');
  const mobileLegend = renderLegend('inline');

  const seriesSecondaryLabel = activeUnit
    ? activeUnit
    : activeSeries
      ? t`Click a region for detailed numbers.`
      : undefined;

  return (
    <div
      className="flex h-dvh flex-col bg-background md:flex-row"
      data-testid="map-analytics-public-view"
    >
      <header
        className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 md:hidden"
        data-testid="map-analytics-public-mobile-header"
      >
        <h1
          className="min-w-0 flex-1 truncate text-base font-semibold leading-tight"
          title={displayTitle}
        >
          {displayTitle}
        </h1>
        {isMobile ? (
          <MapAnalyticsQuickActions
            mode="public"
            mapState={mapState}
            mapDescription={mapDescription}
            variant="inline"
            className="shrink-0"
          />
        ) : null}
      </header>

      <aside
        className="hidden border-r border-border bg-card text-card-foreground md:flex md:w-[400px] md:min-w-[400px] md:flex-col"
        data-testid="map-analytics-public-sidebar"
      >
        <ScrollArea className="h-full">
          <div className="flex min-w-0 flex-col gap-7 p-5">
            <SidebarHeader
              title={displayTitle}
              tabs={
                <MapAnalyticsPublicViewSelector
                  activeView={activeView}
                  onViewChange={handleActiveViewChange}
                />
              }
            >
              {!isMobile ? (
                <MapAnalyticsQuickActions
                  mode="public"
                  mapState={mapState}
                  mapDescription={mapDescription}
                  variant="inline"
                />
              ) : null}
            </SidebarHeader>

            {hasDescription ? (
              <SidebarSection title={t`About this map`}>
                <MapAnalyticsDescriptionInline
                  description={mapDescription}
                  defaultExpanded={false}
                  expandedMaxHeightClassName="max-h-[40vh]"
                  fadeFromClassName="from-card"
                />
              </SidebarSection>
            ) : null}

            <SidebarSection title={t`Data series`}>
              <MapAnalyticsSeriesSelector
                mapState={mapState}
                setMapState={setMapState}
                className="w-full"
                secondaryLabel={seriesSecondaryLabel}
              />
            </SidebarSection>

            {sidebarLegend ? (
              <SidebarSection title={t`Legend`} testId="map-legend-container">
                {sidebarLegend}
              </SidebarSection>
            ) : null}
          </div>
        </ScrollArea>
      </aside>

      {hasDescription ? (
        <div className="border-b border-border bg-background px-4 py-3 md:hidden">
          <MapAnalyticsDescriptionInline
            description={mapDescription}
            defaultExpanded={false}
            collapsedMaxHeightClassName="max-h-24"
            expandedMaxHeightClassName="max-h-[60vh]"
            fadeFromClassName="from-background"
          />
        </div>
      ) : null}

      <main className={cn('relative min-h-0 flex-1 overflow-hidden', isMobile ? 'min-h-[35dvh]' : '')}>
        {isMapViewActive ? (
          <>
            {canRenderInteractiveMap ? (
              <ClientOnly fallback={<PublicMapSurfaceLoading text={t`Loading map...`} />}>
                <Suspense fallback={<PublicMapSurfaceLoading text={t`Loading map...`} />}>
                  <InteractiveMap
                    onFeatureClick={handleMapFeatureClick}
                    getFeatureStyle={getFeatureStyle}
                    heatmapData={activeHeatmapData}
                    geoJsonData={geoJsonData ?? null}
                    countyBoundaryGeoJsonData={
                      mapState.showCountyBoundaries ? (countyGeoJsonData ?? null) : null
                    }
                    zoom={mapZoom}
                    center={mapCenter}
                    mapViewType="UAT"
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
            ) : (
              <PublicMapSurfaceLoading
                text={isGeoJsonLoading ? t`Loading map data...` : t`Map geometry unavailable.`}
              />
            )}

            {isMapLoading && geoJsonData ? (
              <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-background/20 backdrop-blur-[1px]">
                <div className="rounded-md border border-border bg-card/95 shadow-sm">
                  <LoadingSpinner size="md" text={t`Loading map data...`} />
                </div>
              </div>
            ) : null}

            {mapError ? (
              <div className="pointer-events-none absolute inset-x-4 top-4 z-30">
                <div className="pointer-events-auto rounded-md border border-destructive/40 bg-card/95 px-3 py-2 text-sm text-destructive shadow-sm">
                  {mapError.message}
                </div>
              </div>
            ) : null}

            {!isMapLoading && !activeSeries ? (
              <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-4">
                <div className="rounded-md border bg-card/95 px-3 py-2 text-sm text-muted-foreground shadow-sm">
                  {t`No active series selected.`}
                </div>
              </div>
            ) : null}

            <AnimatePresence>
              {selectedMapEntity ? (
                <MapAnalyticsEntityDetailsPanel
                  selection={selectedMapEntity}
                  seriesRows={selectedMapEntitySeriesRows}
                  isMobile={isMobile}
                  isProfileLoading={selectedEntityProfileQuery.isLoading}
                  profile={selectedEntityProfileQuery.data}
                  profileErrorMessage={selectedEntityProfileErrorMessage}
                  onClose={handleCloseEntityPanel}
                  entityHref={selectedMapEntityHref}
                />
              ) : null}
            </AnimatePresence>
          </>
        ) : isTableViewActive ? (
          <div className="h-full w-full overflow-auto p-4">
            {isTableLoading ? (
              <div className="flex h-full items-center justify-center">
                <LoadingSpinner size="lg" text={t`Loading table data...`} />
              </div>
            ) : tableError ? (
              <div className="flex h-full items-center justify-center text-destructive">
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
                mapTitle={displayTitle}
                showExportCsv={false}
                activeSeriesId={resolvedActiveSeriesId}
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
          <div className="h-full w-full overflow-auto p-4">
            {isAnalyticsLoading ? (
              <div className="flex h-full items-center justify-center">
                <LoadingSpinner size="lg" text={t`Loading analytics data...`} />
              </div>
            ) : analyticsError ? (
              <div className="flex h-full items-center justify-center text-destructive">
                {analyticsError.message}
              </div>
            ) : (
              <AdvancedMapAnalyticsAnalyticsView
                widgets={mapState.analyticsWidgets}
                series={mapState.series}
                activeSeriesId={resolvedActiveSeriesId}
                valuesBySeriesId={valuesBySeriesId}
                unitsBySeriesId={unitsBySeriesId}
                uatMetadataBySirutaCode={uatMetadataBySirutaCode}
                readOnly={true}
                onToggleWidgetEnabled={handleToggleWidgetEnabled}
                onReorderWidgets={handleReorderWidgets}
                onUpdateWidget={handleUpdateWidget}
              />
            )}
          </div>
        ) : null}
      </main>

      <div className="flex flex-col border-t border-border bg-card px-4 py-3 md:hidden">
        <button
          type="button"
          onClick={() => setMobileFooterExpanded((prev) => !prev)}
          className="flex w-full items-center justify-between gap-2 text-left"
          aria-expanded={mobileFooterExpanded}
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t`Map data`}
          </span>
          {mobileFooterExpanded ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
        </button>
        {mobileFooterExpanded ? (
          <div className="mt-3 flex max-h-[45dvh] flex-col gap-3 overflow-y-auto">
            <MapAnalyticsPublicViewSelector
              activeView={activeView}
              onViewChange={handleActiveViewChange}
            />
            <MapAnalyticsSeriesSelector
              mapState={mapState}
              setMapState={setMapState}
              secondaryLabel={seriesSecondaryLabel}
            />
            {mobileLegend ? (
              <div data-testid="map-legend-container">{mobileLegend}</div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface SidebarHeaderProps {
  title: string;
  children?: ReactNode;
  tabs?: ReactNode;
}

function SidebarHeader({ title, children, tabs }: Readonly<SidebarHeaderProps>) {
  return (
    <header className="flex min-w-0 flex-col gap-3 pb-1">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <p className="min-w-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t`Public map`}
        </p>
        {children ? <div className="flex shrink-0 items-center gap-1">{children}</div> : null}
      </div>
      <h1 className="break-words text-2xl font-semibold leading-tight tracking-tight" title={title}>
        {title}
      </h1>
      {tabs ? <div className="-mx-1">{tabs}</div> : null}
    </header>
  );
}

interface SidebarSectionProps {
  title: string;
  children: ReactNode;
  testId?: string;
}

function SidebarSection({ title, children, testId }: Readonly<SidebarSectionProps>) {
  return (
    <section className="flex min-w-0 flex-col gap-3" data-testid={testId}>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="flex min-w-0 flex-col gap-2">{children}</div>
    </section>
  );
}

interface MapAnalyticsPublicViewSelectorProps {
  activeView: AdvancedMapAnalyticsActiveView;
  onViewChange: (nextView: AdvancedMapAnalyticsActiveView) => void;
}

function MapAnalyticsPublicViewSelector({
  activeView,
  onViewChange,
}: Readonly<MapAnalyticsPublicViewSelectorProps>) {
  const viewOptions: Array<{
    value: AdvancedMapAnalyticsActiveView;
    label: string;
  }> = [
    { value: 'map', label: t`Map` },
    { value: 'table', label: t`Table` },
    { value: 'analytics', label: t`Analytics` },
  ];

  return (
    <div
      className="flex min-w-0 border-b border-border"
      role="tablist"
      aria-label={t`Public map view`}
    >
      {viewOptions.map((option) => {
        const isActive = activeView === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={cn(
              'relative -mb-px flex min-w-0 items-center justify-center px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isActive
                ? 'text-foreground after:absolute after:inset-x-1 after:bottom-0 after:h-0.5 after:bg-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => onViewChange(option.value)}
          >
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function PublicMapSurfaceLoading({ text }: Readonly<{ text: string }>) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/20">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}
