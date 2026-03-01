import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { createLazyFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { produce } from 'immer';

import { ClientOnly } from '@/components/ssr/ClientOnly';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useGeoJsonData } from '@/hooks/useGeoJson';
import { useIsMobile } from '@/hooks/use-mobile';
import { useExperimentalMapSeriesData } from '@/hooks/useExperimentalMapSeriesData';
import { useExperimentalMapBins } from '@/hooks/useExperimentalMapBins';
import { useExperimentalMapTableBinsFilter } from '@/hooks/useExperimentalMapTableBinsFilter';
import { buildDiscretePaletteFromConfig } from '@/lib/map-bins/bins';
import { getHeatmapColor, getPercentileValues, normalizeValue } from '@/components/maps/utils';
import type { UatFeature, UatProperties } from '@/components/maps/interfaces';
import type { HeatmapCountyDataPoint, HeatmapUATDataPoint } from '@/schemas/heatmap';
import { defaultMapFilters } from '@/schemas/map-filters';
import type { AnalyticsFilterType } from '@/schemas/charts';
import type {
  ExperimentalMapTableRow,
  ExperimentalMapTableSeriesColumn,
} from '@/components/maps/experimental/experimental-map-table-types';
import { ExperimentalMapDataTable } from '@/components/maps/experimental/experimental-map-data-table';
import { formatExperimentalMapSeriesValue } from '@/components/maps/experimental/experimental-map-formatting';
import type {
  ExperimentalMapUrlState,
  MapSupportedSeries,
} from '@/schemas/experimental-map';
import {
  createDefaultExperimentalMapSeries,
  ExperimentalMapUrlStateSchema,
} from '@/schemas/experimental-map';
import { getSiteUrl } from '@/config/env';
import { useUserCurrency } from '@/lib/hooks/useUserCurrency';
import { useUserInflationAdjusted } from '@/lib/hooks/useUserInflationAdjusted';
import { DEFAULT_FEATURE_STYLE } from '@/components/maps/constants';
import { ExperimentalMapConfigModal } from '@/components/maps/experimental/experimental-map-config-modal';
import { ExperimentalMapConfigPanel } from '@/components/maps/experimental/experimental-map-config-panel';
import { ExperimentalMapBinsModal } from '@/components/maps/experimental/experimental-map-bins-modal';
import { ExperimentalMapBinsPanel } from '@/components/maps/experimental/experimental-map-bins-panel';
import { ExperimentalMapDiscreteLegend } from '@/components/maps/experimental/experimental-map-discrete-legend';
import { ExperimentalMapSeriesPanel } from '@/components/maps/experimental/experimental-map-series-panel';
import { ExperimentalMapSeriesEditorModal } from '@/components/maps/experimental/experimental-map-series-editor-modal';
import { ExperimentalMapWarningsModal } from '@/components/maps/experimental/experimental-map-warnings-modal';
import {
  applySetActiveSeries,
  applyToggleSeriesEnabled,
  convertSeriesToType,
  reorderSeriesByIds,
} from '@/components/maps/experimental/experimental-map-series-utils';

// Lazy load InteractiveMap to avoid Leaflet evaluation on the server.
const InteractiveMap = lazy(() =>
  import('@/components/maps/InteractiveMap').then((module) => ({ default: module.InteractiveMap }))
);

interface EditorState {
  mode: 'add' | 'edit';
  seriesId: string;
}

const DEFAULT_MAP_NAME = 'Experimental UAT Map';

export const Route = createLazyFileRoute('/experimental/map')({
  component: ExperimentalMapPage,
});

export function ExperimentalMapPage() {
  const navigate = useNavigate({ from: '/experimental/map' });
  const search = useSearch({ from: '/experimental/map' });
  const mapState = ExperimentalMapUrlStateSchema.parse(search);
  const [userCurrency] = useUserCurrency();
  const [userInflationAdjusted] = useUserInflationAdjusted();
  const isMobile = useIsMobile();
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isWarningsModalOpen, setIsWarningsModalOpen] = useState(false);

  const updateState = useCallback(
    (updater: (draft: ExperimentalMapUrlState) => void) => {
      navigate({
        search: (prev) => {
          const parsed = ExperimentalMapUrlStateSchema.parse(prev);
          return produce(parsed, updater);
        },
        replace: true,
        resetScroll: false,
      });
    },
    [navigate]
  );

  const updateSeries = useCallback(
    (seriesId: string, updater: (draft: MapSupportedSeries) => void) => {
      updateState((draft) => {
        const index = draft.series.findIndex((series) => series.id === seriesId);
        if (index === -1) {
          return;
        }

        updater(draft.series[index]);
        draft.series[index].updatedAt = new Date().toISOString();
      });
    },
    [updateState]
  );

  const addSeries = useCallback(() => {
    const nextSeries = createDefaultExperimentalMapSeries('line-items-aggregated-yearly');

    setEditorState({ mode: 'add', seriesId: nextSeries.id });

    updateState((draft) => {
      draft.series.push(nextSeries);
    });
  }, [updateState]);

  const editSeries = useCallback((seriesId: string) => {
    setEditorState({ mode: 'edit', seriesId });
  }, []);

  const deleteSeries = useCallback(
    (seriesId: string) => {
      updateState((draft) => {
        draft.series = draft.series.filter((series) => series.id !== seriesId);
        if (draft.activeSeriesId === seriesId) {
          draft.activeSeriesId = undefined;
        }
      });

      setEditorState((prevState) =>
        prevState?.seriesId === seriesId ? null : prevState
      );
    },
    [updateState]
  );

  const setActiveSeries = useCallback(
    (seriesId: string) => {
      updateState((draft) => {
        const nextState = applySetActiveSeries(draft, seriesId);
        draft.series = nextState.series;
        draft.activeSeriesId = nextState.activeSeriesId;
      });
    },
    [updateState]
  );

  const toggleSeriesEnabled = useCallback(
    (seriesId: string, enabled: boolean) => {
      updateState((draft) => {
        const nextState = applyToggleSeriesEnabled(draft, seriesId, enabled);
        draft.series = nextState.series;
        draft.activeSeriesId = nextState.activeSeriesId;
      });
    },
    [updateState]
  );

  const reorderSeries = useCallback(
    (activeSeriesId: string, overSeriesId: string) => {
      updateState((draft) => {
        draft.series = reorderSeriesByIds(draft.series, activeSeriesId, overSeriesId);
      });
    },
    [updateState]
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

  const setMapName = useCallback(
    (nextMapName: string) => {
      updateState((draft) => {
        const normalizedName = nextMapName.trim();
        draft.mapName = normalizedName.length > 0 ? normalizedName : DEFAULT_MAP_NAME;
      });
    },
    [updateState]
  );

  const setActiveView = useCallback(
    (activeView: 'map' | 'table') => {
      updateState((draft) => {
        draft.activeView = activeView;
      });
    },
    [updateState]
  );

  const changeSeriesType = useCallback(
    (seriesId: string, type: MapSupportedSeries['type']) => {
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
    [updateState]
  );

  const mapZoom = mapState.mapZoom ?? (isMobile ? 6 : 7.7);

  const serializedSearchLength = useMemo(() => {
    if (typeof window !== 'undefined') {
      return window.location.search.length;
    }
    return JSON.stringify(mapState).length;
  }, [mapState]);

  const {
    valuesBySeriesId,
    unitsBySeriesId,
    warnings: seriesWarnings,
    activeSeriesId,
    activeValues,
    isLoading,
    error,
  } = useExperimentalMapSeriesData({
    series: mapState.series,
    activeSeriesId: mapState.activeSeriesId,
    defaultCurrency: userCurrency,
    defaultInflationAdjusted: userInflationAdjusted,
    urlSearchLength: serializedSearchLength,
    enabled: editorState == null,
  });

  const {
    data: geoJsonData,
    isLoading: isGeoJsonLoading,
    error: geoJsonError,
  } = useGeoJsonData('UAT');

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
  } = useExperimentalMapBins({
    mapState,
    updateState,
    activeSeries,
    activeSeriesId,
    activeValues,
    seriesWarnings,
  });

  const activeBinsLegendTitle = useMemo(() => {
    const title = activeBinsPreset?.config.title?.trim();
    if (title && title.length > 0) {
      return title;
    }
    return activeSeries?.label || 'Active series';
  }, [activeBinsPreset?.config.title, activeSeries?.label]);

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

  const { min: minAggregatedValue, max: maxAggregatedValue } = useMemo(() => {
    if (activeHeatmapData.length === 0) {
      return { min: 0, max: 0 };
    }

    return getPercentileValues(activeHeatmapData, 5, 95, 'amount');
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

      const dataPoint = heatmapDataMap.get(featureKey);
      if (!dataPoint) {
        return {
          ...DEFAULT_FEATURE_STYLE,
          fillOpacity: 0.1,
          fillColor: '#cccccc',
        };
      }

      const value = dataPoint.amount;
      if (!Number.isFinite(value)) {
        return DEFAULT_FEATURE_STYLE;
      }

      if (minAggregatedValue === maxAggregatedValue) {
        return {
          ...DEFAULT_FEATURE_STYLE,
          fillColor: value !== 0 ? getHeatmapColor(0.5) : DEFAULT_FEATURE_STYLE.fillColor,
          fillOpacity: 0.7,
        };
      }

      const normalized = normalizeValue(value, minAggregatedValue, maxAggregatedValue);
      return {
        ...DEFAULT_FEATURE_STYLE,
        fillColor: getHeatmapColor(normalized),
        fillOpacity: 0.7,
      };
    },
    [
      activeNoDataConfig?.color,
      binsCanApply,
      binsClassification.groupsBySiruta,
      maxAggregatedValue,
      minAggregatedValue,
    ]
  );

  const enabledSeries = useMemo(
    () => mapState.series.filter((series) => series.enabled),
    [mapState.series]
  );

  const seriesColumns = useMemo<ExperimentalMapTableSeriesColumn[]>(() => {
    if (enabledSeries.length === 0) {
      return [];
    }

    const activeSeries = activeSeriesId
      ? enabledSeries.find((series) => series.id === activeSeriesId)
      : undefined;
    const orderedSeries = activeSeries
      ? [activeSeries, ...enabledSeries.filter((series) => series.id !== activeSeries.id)]
      : enabledSeries;

    return orderedSeries.map((series) => ({
      id: series.id,
      label: resolveSeriesDisplayLabel(series),
      unit: resolveSeriesDisplayUnit(series, unitsBySeriesId),
    }));
  }, [activeSeriesId, enabledSeries, unitsBySeriesId]);

  const geoJsonFeatures = useMemo<UatFeature[]>(() => {
    if (!geoJsonData || !('features' in geoJsonData) || !Array.isArray(geoJsonData.features)) {
      return [];
    }
    return geoJsonData.features as UatFeature[];
  }, [geoJsonData]);

  const uatMetadataBySirutaCode = useMemo(() => {
    const metadataBySirutaCode = new Map<string, Omit<ExperimentalMapTableRow, 'sirutaCode' | 'valuesBySeriesId'>>();

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

  const tableRows = useMemo<ExperimentalMapTableRow[]>(() => {
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
          countyName: metadata?.countyName || 'Unknown county',
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
    [updateState]
  );

  const clearPresetBinFilters = useCallback(
    (presetId: string) => {
      updateState((draft) => {
        delete draft.tableBinFiltersByPresetId[presetId];
      });
    },
    [updateState]
  );

  const clearAllBinFilters = useCallback(() => {
    updateState((draft) => {
      draft.tableBinFiltersByPresetId = {};
    });
  }, [updateState]);

  const { filteredRows: filteredTableRows, binsFilterSections, hasActiveBinFilters } =
    useExperimentalMapTableBinsFilter({
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
      if (!activeSeries) {
        return `
          <div style="font-family:Inter,sans-serif;font-size:13px;line-height:1.4;white-space:normal;overflow-wrap:anywhere;word-break:break-word;min-width:220px;max-width:320px;padding:8px;">
            <div style="font-weight:700;font-size:14px;margin-bottom:4px;">${escapeHtml(
              String(properties.name ?? 'UAT')
            )}</div>
            <div style="color:#6b7280;">No active series selected.</div>
          </div>
        `;
      }

      const sirutaCode = String(properties.natcode ?? '');
      const seriesRows = enabledSeries.map((series) => {
        const seriesValue = valuesBySeriesId.get(series.id)?.get(sirutaCode);
        const unit = resolveSeriesDisplayUnit(series, unitsBySeriesId);
        const formattedValue = formatExperimentalMapSeriesValue(seriesValue, unit);
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

      const binsAnalyticsRows =
        binsCanApply && activeClassification
          ? `
            <div style="margin-top:8px;padding-top:8px;border-top:1px solid #e5e7eb;display:flex;flex-direction:column;gap:4px;">
              <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;">
                <span style="font-weight:500;color:#374151;">Bins</span>
                <span style="font-weight:500;text-align:right;">${escapeHtml(activeBinsLegendTitle)}</span>
              </div>
              <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;">
                <span style="font-weight:500;color:#374151;">Group</span>
                <span style="font-weight:500;text-align:right;">${escapeHtml(activeClassification.label)}</span>
              </div>
            </div>
          `
          : '';

      return `
        <div style="font-family:Inter,sans-serif;font-size:13px;line-height:1.4;white-space:normal;overflow-wrap:anywhere;word-break:break-word;min-width:260px;max-width:360px;padding:8px;">
          <div style="font-weight:700;font-size:14px;margin-bottom:2px;">${escapeHtml(
            String(properties.name ?? 'UAT')
          )}</div>
          <div style="font-size:12px;color:#6b7280;margin-bottom:10px;">SIRUTA: ${escapeHtml(
            sirutaCode
          )}</div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            ${rowsHtml || '<span>No enabled series</span>'}
          </div>
          ${binsAnalyticsRows}
          ${noDataTooltipMarker}
        </div>
      `;
    },
    [
      activeBinsLegendTitle,
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

  const mapError = error || geoJsonError;
  const isMapLoading = isLoading || isGeoJsonLoading;
  const isTableLoading = isLoading;
  const activeUnit = activeSeries
    ? resolveSeriesDisplayUnit(activeSeries, unitsBySeriesId)
    : undefined;
  const modalSeries = editorState
    ? mapState.series.find((series) => series.id === editorState.seriesId)
    : undefined;
  const activeSeriesDisplayLabel = activeSeries
    ? resolveSeriesDisplayLabel(activeSeries)
    : activeSeriesId || 'None';
  const mapName = mapState.mapName || DEFAULT_MAP_NAME;
  const isMapViewActive = mapState.activeView !== 'table';

  const handleTableRowClick = useCallback(
    (row: ExperimentalMapTableRow) => {
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

  useEffect(() => {
    if (editorState?.mode === 'edit' && !modalSeries) {
      setEditorState(null);
    }
  }, [editorState, modalSeries]);

  return (
    <div className="flex flex-col md:flex-row md:h-screen bg-background">
      <aside className="md:w-[430px] md:min-w-[430px] border-r border-border bg-card text-card-foreground overflow-y-auto">
        <div className="space-y-4 p-4">
          <ExperimentalMapConfigPanel
            collapsed={Boolean(mapState.configPanelCollapsed)}
            activeView={mapState.activeView}
            mapName={mapName}
            warningCount={combinedWarnings.length}
            onToggleCollapsed={toggleConfigPanelCollapsed}
            onActiveViewChange={setActiveView}
            onMapNameChange={setMapName}
            onOpenConfig={() => setIsConfigModalOpen(true)}
            onOpenWarnings={() => setIsWarningsModalOpen(true)}
          />
          <ExperimentalMapSeriesPanel
            series={mapState.series}
            activeSeriesId={activeSeriesId}
            collapsed={Boolean(mapState.seriesPanelCollapsed)}
            onToggleCollapsed={togglePanelCollapsed}
            onAddSeries={addSeries}
            onSetActive={setActiveSeries}
            onToggleEnabled={toggleSeriesEnabled}
            onEdit={editSeries}
            onDelete={deleteSeries}
            onReorder={reorderSeries}
          />
          <ExperimentalMapBinsPanel
            collapsed={Boolean(mapState.binsPanelCollapsed)}
            presets={mapState.binsPresets}
            activePresetId={mapState.activeBinPresetId}
            onToggleCollapsed={toggleBinsPanelCollapsed}
            onAddPreset={addBinsPreset}
            onSetActivePreset={setActiveBinsPreset}
            onEditPreset={editBinsPreset}
            onDeletePreset={deleteBinsPreset}
            onReorderPresets={reorderBinsPresets}
          />
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-h-[55vh] md:min-h-0">
        <div className="flex-1 relative overflow-hidden">
          {isMapViewActive ? (
            isMapLoading ? (
              <div className="h-full w-full flex items-center justify-center">
                <LoadingSpinner size="lg" text="Loading experimental map..." />
              </div>
            ) : mapError ? (
              <div className="h-full w-full flex items-center justify-center text-red-600">
                {mapError.message}
              </div>
            ) : !geoJsonData ? (
              <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                Map geometry is unavailable.
              </div>
            ) : (
              <>
                <ClientOnly
                  fallback={
                    <div className="h-full w-full flex items-center justify-center">
                      <LoadingSpinner size="lg" text="Loading map..." />
                    </div>
                  }
                >
                  <Suspense
                    fallback={
                      <div className="h-full w-full flex items-center justify-center">
                        <LoadingSpinner size="lg" text="Loading map..." />
                      </div>
                    }
                  >
                    <InteractiveMap
                      onFeatureClick={() => {
                        // Navigation is intentionally disabled in the experimental route.
                      }}
                      getFeatureStyle={getFeatureStyle}
                      heatmapData={activeHeatmapData}
                      geoJsonData={geoJsonData}
                      zoom={mapZoom}
                      center={mapState.mapCenter}
                      mapViewType="UAT"
                      filters={defaultMapFilters}
                      showLabels={false}
                      onViewChange={handleMapViewChange}
                      getTooltipContent={getTooltipContent}
                    />
                  </Suspense>
                </ClientOnly>

                {!activeSeries ? (
                  <div className="pointer-events-none absolute left-4 top-4 z-[500] rounded-md border bg-card/95 px-3 py-2 text-sm text-muted-foreground shadow-sm">
                    No active series selected.
                  </div>
                ) : null}

                {activeSeries ? (
                  <div className="absolute bottom-4 right-4 z-[500]">
                    {binsCanApply ? (
                      <ExperimentalMapDiscreteLegend
                        title={activeBinsLegendTitle}
                        entries={binsClassification.palette}
                      />
                    ) : (
                      <LegendCard
                        min={minAggregatedValue}
                        max={maxAggregatedValue}
                        unit={activeUnit}
                        title={resolveSeriesDisplayLabel(activeSeries)}
                      />
                    )}
                  </div>
                ) : null}
              </>
            )
          ) : (
            <div className="h-full w-full p-4">
              {isTableLoading ? (
                <div className="flex h-full items-center justify-center">
                  <LoadingSpinner size="lg" text="Loading table data..." />
                </div>
              ) : error ? (
                <div className="flex h-full items-center justify-center text-red-600">
                  {error.message}
                </div>
              ) : enabledSeries.length === 0 ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  No enabled series.
                </div>
              ) : tableRows.length === 0 ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  No data available for table.
                </div>
              ) : (
                <ExperimentalMapDataTable
                  rows={filteredTableRows}
                  seriesColumns={seriesColumns}
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
          )}
        </div>
      </main>

      <ExperimentalMapSeriesEditorModal
        open={editorState != null && modalSeries != null}
        mode={editorState?.mode ?? 'edit'}
        series={modalSeries}
        allSeries={mapState.series}
        onOpenChange={(open) => {
          if (!open) {
            setEditorState(null);
          }
        }}
        onUpdateSeries={updateSeries}
        onChangeSeriesType={changeSeriesType}
      />

      <ExperimentalMapConfigModal
        open={isConfigModalOpen}
        mapName={mapName}
        warningCount={combinedWarnings.length}
        onMapNameChange={setMapName}
        onOpenChange={setIsConfigModalOpen}
        onOpenWarnings={() => setIsWarningsModalOpen(true)}
      />

      <ExperimentalMapBinsModal
        open={binsEditorState != null && modalBinsPreset != null}
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

      <ExperimentalMapWarningsModal
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
}: Readonly<{ min: number; max: number; unit?: string; title: string }>) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return null;
  }

  const gradientStops = Array.from({ length: 100 }, (_, index) => getHeatmapColor(index / 99));
  const gradient = `linear-gradient(to right, ${gradientStops.join(', ')})`;

  return (
    <div className="bg-card/90 backdrop-blur-sm p-3 rounded-md border border-border shadow-sm w-[280px]">
      <h4 className="mb-2 text-xs font-semibold leading-snug break-words">{title}</h4>
      <div className="h-4 w-full border border-border rounded-sm" style={{ background: gradient }} />
      <div className="mt-1 flex justify-between text-xs">
        <span>{formatExperimentalMapSeriesValue(min, unit)}</span>
        <span>{formatExperimentalMapSeriesValue(max, unit)}</span>
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
  if (fallbackUnit.length === 0) {
    return undefined;
  }

  if (series.type === 'ins-series' && fallbackUnit.toUpperCase() === 'RON') {
    return undefined;
  }

  return fallbackUnit;
}

function buildExperimentalMapHead() {
  const site = getSiteUrl();
  const canonical = `${site}/experimental/map`;
  const title = 'Experimental Map - Series Engine';
  const description =
    'Experimental map route for multi-series UAT vectors and client-side map calculations.';

  return {
    meta: [
      { title },
      { name: 'description', content: description },
      { name: 'og:title', content: title },
      { name: 'og:description', content: description },
      { name: 'og:url', content: canonical },
      { name: 'canonical', content: canonical },
    ],
  };
}

export function head() {
  return buildExperimentalMapHead();
}
