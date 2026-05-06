import type { LeafletMouseEvent, PathOptions } from 'leaflet';
import type { GeoJsonObject } from 'geojson';
import type { UatFeature, UatProperties } from '@/components/maps/interfaces';
import type {
  HeatmapCountyDataPoint,
  HeatmapUATDataPoint,
} from '@/schemas/heatmap';
import type { MapSupportedSeries } from '@/schemas/advanced-map-analytics';
import type { AdvancedMapAnalyticsBinsPresetConfig } from '@/schemas/advanced-map-analytics';
import type {
  MapSeriesDomainCache,
  MapSeriesVectorCache,
} from '@/lib/map-series/interfaces';
import type { classifySeriesValues } from '@/lib/map-bins/bins';
import { DEFAULT_FEATURE_STYLE } from '@/components/maps/constants';
import { getContinuousGradientColor } from '@/lib/map-bins/bins';
import { getHeatmapColor, normalizeValue } from '@/components/maps/utils';
import {
  resolveSeriesDisplayLabel,
  resolveSeriesDisplayUnit,
} from '@/components/maps/advanced-map-analytics/advanced-map-analytics-series-utils';
import { resolveSeriesDisplayValueForSiruta } from '@/lib/map-series/grouping';
import {
  escapeHtmlValue,
  getEntityCuiFromUatProperties,
  normalizeNatLevelPrefix,
  resolveUatDisplayTitle,
} from '@/components/maps/advanced-map-analytics/advanced-map-analytics-uat-properties';
import { formatAdvancedMapAnalyticsSeriesValue } from '@/components/maps/advanced-map-analytics/advanced-map-analytics-formatting';
import type {
  MapAnalyticsEntityDetailsSelection,
  MapAnalyticsEntitySeriesRow,
} from '@/features/advanced-map-analytics/components/map-analytics-entity-details-panel';
import { t } from '@lingui/core/macro';

type BinsClassification = ReturnType<typeof classifySeriesValues>;

interface ColorRange {
  min: number;
  max: number;
}

const GROUPED_RENDER_UNIT_MEMBER_STROKE: PathOptions = {
  color: '#0f172a',
  weight: 0.2,
  opacity: 1,
  lineJoin: 'round',
  lineCap: 'round',
};

interface BuildPublicMapFeatureStyleArgs {
  binsCanApply: boolean;
  binsClassification: BinsClassification;
  activeNoDataConfig: AdvancedMapAnalyticsBinsPresetConfig['noData'] | undefined;
  isContinuousIntervalMode: boolean;
  colorRange: ColorRange;
  gradient?: AdvancedMapAnalyticsBinsPresetConfig['gradient'];
  renderUnitIdBySirutaCode?: Map<string, string>;
}

/**
 * Builds the Leaflet style function used by `InteractiveMap` on the public
 * map view. Mirrors the editor workspace logic so colors line up exactly.
 */
export function buildPublicMapFeatureStyle({
  binsCanApply,
  binsClassification,
  activeNoDataConfig,
  isContinuousIntervalMode,
  colorRange,
  gradient,
  renderUnitIdBySirutaCode,
}: BuildPublicMapFeatureStyleArgs): (
  feature: UatFeature,
  heatmapDataMap: Map<string | number, HeatmapUATDataPoint | HeatmapCountyDataPoint>
) => PathOptions {
  const noDataColor = activeNoDataConfig?.color ?? '#cccccc';
  const safeGradient = gradient ?? { startColor: '#fff7bc', endColor: '#d7301f' };

  return (feature, heatmapDataMap) => {
    const featureKey = feature?.properties?.natcode;
    if (!featureKey) {
      return DEFAULT_FEATURE_STYLE;
    }

    const featureKeyString = String(featureKey);
    const renderUnitId = renderUnitIdBySirutaCode?.get(featureKeyString);
    const renderKey = renderUnitId ?? featureKeyString;
    const applyRenderAffordance = (style: PathOptions): PathOptions =>
      renderUnitId
        ? {
            ...style,
            ...GROUPED_RENDER_UNIT_MEMBER_STROKE,
          }
        : style;

    if (binsCanApply) {
      const classification = binsClassification.groupsBySiruta.get(renderKey);
      return applyRenderAffordance({
        ...DEFAULT_FEATURE_STYLE,
        fillColor: classification?.color ?? noDataColor,
        fillOpacity: 0.7,
      });
    }

    const dataPoint = heatmapDataMap.get(renderKey);
    if (!dataPoint) {
      return applyRenderAffordance({
        ...DEFAULT_FEATURE_STYLE,
        fillOpacity: 0.1,
        fillColor: isContinuousIntervalMode ? noDataColor : '#cccccc',
      });
    }

    const value = dataPoint.amount;
    if (!Number.isFinite(value)) {
      if (!isContinuousIntervalMode) {
        return applyRenderAffordance(DEFAULT_FEATURE_STYLE);
      }
      return applyRenderAffordance({
        ...DEFAULT_FEATURE_STYLE,
        fillColor: noDataColor,
        fillOpacity: 0.7,
      });
    }

    if (isContinuousIntervalMode) {
      return applyRenderAffordance({
        ...DEFAULT_FEATURE_STYLE,
        fillColor: getContinuousGradientColor(value, colorRange, safeGradient, noDataColor),
        fillOpacity: 0.7,
      });
    }

    if (colorRange.min === colorRange.max) {
      return applyRenderAffordance({
        ...DEFAULT_FEATURE_STYLE,
        fillColor: value !== 0 ? getHeatmapColor(0.5) : DEFAULT_FEATURE_STYLE.fillColor,
        fillOpacity: 0.7,
      });
    }

    const normalized = normalizeValue(value, colorRange.min, colorRange.max);
    return applyRenderAffordance({
      ...DEFAULT_FEATURE_STYLE,
      fillColor: getHeatmapColor(normalized),
      fillOpacity: 0.7,
    });
  };
}

interface BuildPublicMapTooltipArgs {
  enabledSeries: MapSupportedSeries[];
  activeSeries: MapSupportedSeries | undefined;
  activeSeriesId: string | undefined;
  valuesBySeriesId: MapSeriesVectorCache;
  displayValuesBySeriesId?: MapSeriesVectorCache;
  unitsBySeriesId: Map<string, string | undefined>;
  binsCanApply: boolean;
  binsClassification: BinsClassification;
  activeNoDataConfig: AdvancedMapAnalyticsBinsPresetConfig['noData'] | undefined;
  domainsBySeriesId?: MapSeriesDomainCache;
  groupValuesBySirutaCode?: Map<string, Record<string, string | undefined>>;
  groupMetadataById?: Map<string, {
    groupWorkspaceId: string;
    groupingLabel: string;
    groupLabel: string;
    memberSirutaCodes: string[];
  }>;
  activeGroupWorkspaceId?: string;
  renderUnitIdBySirutaCode?: Map<string, string>;
}

interface PublicMapTooltipContext {
  properties: UatProperties;
  heatmapData: HeatmapUATDataPoint[] | HeatmapCountyDataPoint[];
  mapViewType: 'UAT' | 'County';
  filters: unknown;
}

/**
 * Builds the HTML tooltip string that the public map view passes to
 * `InteractiveMap`. The structure matches the editor tooltip so users see
 * the same information regardless of which surface they look at.
 */
export function buildPublicMapTooltipContent({
  enabledSeries,
  activeSeries,
  activeSeriesId,
  valuesBySeriesId,
  displayValuesBySeriesId,
  unitsBySeriesId,
  binsCanApply,
  binsClassification,
  activeNoDataConfig,
  domainsBySeriesId,
  groupValuesBySirutaCode,
  groupMetadataById,
  activeGroupWorkspaceId,
  renderUnitIdBySirutaCode,
}: BuildPublicMapTooltipArgs): (context: PublicMapTooltipContext) => string {
  return ({ properties }) => {
    const uatName = String(properties.name ?? t`UAT`).trim();
    const natLevelName = normalizeNatLevelPrefix(properties.natLevName);
    const countyName =
      typeof properties.county === 'string' ? properties.county.trim() : '';
    const entityCui = getEntityCuiFromUatProperties(properties);
    const sirutaCode = String(properties.natcode ?? '').trim();
    const activeRenderUnitId = renderUnitIdBySirutaCode?.get(sirutaCode);
    const activeClassificationKey = activeRenderUnitId ?? sirutaCode;
    const activeSeriesDomain = activeSeriesId ? domainsBySeriesId?.get(activeSeriesId) : undefined;
    const resolvedActiveGroupWorkspaceId = activeSeriesDomain?.type === 'group'
      ? activeSeriesDomain.groupWorkspaceId
      : activeGroupWorkspaceId;
    const activeGroupId = activeSeriesDomain?.type === 'group'
      ? groupValuesBySirutaCode?.get(sirutaCode)?.[activeSeriesDomain.groupWorkspaceId]
      : activeRenderUnitId;
    const activeGroupMetadata =
      resolvedActiveGroupWorkspaceId && activeGroupId
        ? groupMetadataById?.get(`${resolvedActiveGroupWorkspaceId}::${activeGroupId}`)
        : undefined;
    const tooltipTitle = activeGroupMetadata?.groupLabel ??
      (natLevelName.length > 0 ? `${natLevelName} ${uatName}` : uatName);
    const countyLabel = escapeHtmlValue(t`County`);
    const countyRowHtml =
      countyName.length > 0
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
          ${
            countyName.length > 0
              ? `<div style="font-size:12px;color:#6b7280;margin-bottom:6px;">${countyLabel}: ${escapeHtmlValue(countyName)}</div>`
              : ''
          }
          <div style="color:#6b7280;">${escapeHtmlValue(t`No active series selected.`)}</div>
        </div>
      `;
    }

    const seriesRows = enabledSeries.map((series) => {
      const seriesValue =
        displayValuesBySeriesId?.get(series.id)?.get(sirutaCode) ??
        resolveSeriesDisplayValueForSiruta({
          seriesId: series.id,
          sirutaCode,
          valuesBySeriesId,
          domainsBySeriesId: domainsBySeriesId ?? new Map(),
          groupValuesBySirutaCode: groupValuesBySirutaCode ?? new Map(),
        });
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
            };overflow-wrap:anywhere;word-break:break-word;">${escapeHtmlValue(seriesRow.label)}</span>
            <span style="font-weight:${seriesRow.isActive ? '700' : '500'};text-align:right;white-space:nowrap;">${escapeHtmlValue(
              seriesRow.value
            )}</span>
          </div>
        `
      )
      .join('');

    const activeSeriesValue = activeSeriesId
      ? displayValuesBySeriesId?.get(activeSeriesId)?.get(sirutaCode) ??
        resolveSeriesDisplayValueForSiruta({
          seriesId: activeSeriesId,
          sirutaCode,
          valuesBySeriesId,
          domainsBySeriesId: domainsBySeriesId ?? new Map(),
          groupValuesBySirutaCode: groupValuesBySirutaCode ?? new Map(),
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
  };
}

interface BuildPublicEntitySeriesRowsArgs {
  enabledSeries: MapSupportedSeries[];
  activeSeriesId: string | undefined;
  selection: MapAnalyticsEntityDetailsSelection;
  valuesBySeriesId: MapSeriesVectorCache;
  displayValuesBySeriesId?: MapSeriesVectorCache;
  unitsBySeriesId: Map<string, string | undefined>;
  domainsBySeriesId?: MapSeriesDomainCache;
  groupValuesBySirutaCode?: Map<string, Record<string, string | undefined>>;
}

/**
 * Produces the entity-detail rows shown inside `MapAnalyticsEntityDetailsPanel`
 * after the user clicks a UAT.
 */
export function buildPublicEntitySeriesRows({
  enabledSeries,
  activeSeriesId,
  selection,
  valuesBySeriesId,
  displayValuesBySeriesId,
  unitsBySeriesId,
  domainsBySeriesId,
  groupValuesBySirutaCode,
}: BuildPublicEntitySeriesRowsArgs): MapAnalyticsEntitySeriesRow[] {
  return enabledSeries.map((series) => ({
    id: series.id,
    label: resolveSeriesDisplayLabel(series),
    payload: null,
    value: formatAdvancedMapAnalyticsSeriesValue(
      displayValuesBySeriesId?.get(series.id)?.get(selection.sirutaCode) ??
        resolveSeriesDisplayValueForSiruta({
          seriesId: series.id,
          sirutaCode: selection.sirutaCode,
          valuesBySeriesId,
          domainsBySeriesId: domainsBySeriesId ?? new Map(),
          groupValuesBySirutaCode: groupValuesBySirutaCode ?? new Map(),
        }),
      resolveSeriesDisplayUnit(series, unitsBySeriesId)
    ),
    isActive: series.id === activeSeriesId,
  }));
}

interface BuildPublicHeatmapDataArgs {
  activeSeries: MapSupportedSeries | undefined;
  activeValues: Map<string, number | undefined> | undefined;
  binsCanApply: boolean;
}

/**
 * Builds the `heatmapData` array that `InteractiveMap` expects from the
 * active series values map.
 */
export function buildPublicHeatmapData({
  activeSeries,
  activeValues,
  binsCanApply,
}: BuildPublicHeatmapDataArgs): HeatmapUATDataPoint[] {
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
}

interface BuildPublicHeatmapPercentilesArgs {
  heatmapData: HeatmapUATDataPoint[];
}

/**
 * Computes the actual data min/max used for both the legend and the
 * non-binned color range. Mirrors the workspace's `realDataMin/realDataMax`.
 */
export function computePublicHeatmapDataRange({
  heatmapData,
}: BuildPublicHeatmapPercentilesArgs): ColorRange {
  if (heatmapData.length === 0) {
    return { min: 0, max: 0 };
  }

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (const row of heatmapData) {
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
}

interface CreatePublicEntitySelectionArgs {
  properties: UatProperties;
  uatMetadataBySirutaCode: Map<string, { uatName: string; countyName: string; entityCui?: string }>;
}

/**
 * Translates a clicked UAT GeoJSON feature into the selection payload
 * consumed by `MapAnalyticsEntityDetailsPanel`.
 */
export function createPublicEntitySelection({
  properties,
  uatMetadataBySirutaCode,
}: CreatePublicEntitySelectionArgs): MapAnalyticsEntityDetailsSelection {
  const directEntityCui = getEntityCuiFromUatProperties(properties);
  const sirutaCode = String(properties?.natcode ?? '').trim();
  const metadata = sirutaCode.length > 0 ? uatMetadataBySirutaCode.get(sirutaCode) : undefined;
  const metadataEntityCui = metadata?.entityCui;
  const entityCui = directEntityCui ?? metadataEntityCui;
  const uatName = String(properties?.name ?? '').trim() || metadata?.uatName || t`Selected UAT`;
  const countyName = String(properties?.county ?? '').trim() || metadata?.countyName || '';
  const title = resolveUatDisplayTitle(properties, metadata?.uatName);

  return {
    entityCui,
    sirutaCode: sirutaCode || entityCui || uatName,
    title,
    uatName,
    countyName,
  };
}

/**
 * Builds the per-siruta UAT metadata lookup that powers the entity panel.
 */
export function buildUatMetadataBySirutaCode(features: UatFeature[]): Map<
  string,
  { uatName: string; countyName: string; entityCui?: string }
> {
  const metadataBySirutaCode = new Map<
    string,
    { uatName: string; countyName: string; entityCui?: string }
  >();

  for (const feature of features) {
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
}

/**
 * Type-guard helper for narrowing GeoJSON feature collections to
 * `UatFeature[]` arrays. Mirrors the workspace's pattern.
 */
export function selectUatFeatures(
  geoJsonData: GeoJsonObject | null | undefined
): UatFeature[] {
  if (!geoJsonData || !('features' in geoJsonData)) {
    return [];
  }

  const candidateFeatures = (geoJsonData as { features?: unknown }).features;
  if (!Array.isArray(candidateFeatures)) {
    return [];
  }

  return candidateFeatures as UatFeature[];
}

// LeafletMouseEvent re-exported here so the public view doesn't have to
// reach into Leaflet types directly when wiring the click handler.
export type { LeafletMouseEvent };
