import { HeatmapCountyDataPoint, HeatmapUATDataPoint } from "@/schemas/heatmap";
import { UatFeature, UatProperties } from './interfaces';
import { formatCurrency, formatNumber, getNormalizationUnit, getUserLocale } from '@/lib/utils';
import { DEFAULT_FEATURE_STYLE, PERMANENT_HIGHLIGHT_STYLE } from './constants';
import type { PathOptions, GeoJSON as LeafletGeoJSON } from 'leaflet';
import { Feature, Geometry } from 'geojson';
import { AnalyticsFilterType } from "@/schemas/charts";
import { t } from "@lingui/core/macro";

type LeafletGeoJsonWithMapRef = LeafletGeoJSON & {
  _map?: {
    getContainer?: () => HTMLElement | null;
  };
};

/**
 * Creates a concise summary of the active map filters.
 */
const createFilterSummary = (filters: AnalyticsFilterType): string => {
  const summaryItems: string[] = [];

  if (filters.report_period) {
    if (filters.report_period.selection.dates) {
      summaryItems.push(`<strong>${t`Period`}:</strong> ${filters.report_period.selection.dates.length} ${filters.report_period.type.toLowerCase()}(s)`);
    } else if (filters.report_period.selection.interval) {
        summaryItems.push(`<strong>${t`Period`}:</strong> ${filters.report_period.selection.interval.start} - ${filters.report_period.selection.interval.end}`);
    }
  }

  if (filters.account_category) {
    summaryItems.push(`<strong>${t`Type`}:</strong> ${filters.account_category === 'ch' ? t`Expenses` : t`Income`}`);
  }

  if (filters.functional_codes?.length) {
    summaryItems.push(`<strong>${t`Fn`}:</strong> ${filters.functional_codes.length} ${t`functional codes`}`);
  }

  if (filters.economic_codes?.length) {
    summaryItems.push(`<strong>${t`Ec`}:</strong> ${filters.economic_codes.length} ${t`economic codes`}`);
  }

  if (summaryItems.length === 0) {
    return '';
  }

  return `
      <div style="font-size: 0.85em; color: #444; border-top: 1px solid #eee; padding-top: 8px; margin-top: 8px; width: 100%;">
        <div style="font-weight: bold;">${t`Active filters`} (${summaryItems.length}):</div>
        <div style="display: flex; flex-direction: column; font-size: 0.75em;">
          ${summaryItems.map(item => `<span style="font-weight: bold;">${item}</span>`).join('')}
          <span style="font-weight: bold;">${t`*Check filters panel for more details.`}</span>
        </div>
      </div>
    `;
};


/**
 * Builds an O(1) lookup keyed by the feature identifier the tooltip uses
 * (`siruta_code` for UATs, `county_code` for counties).
 */
const buildHeatmapTooltipLookup = (
  heatmapData: (HeatmapUATDataPoint | HeatmapCountyDataPoint)[] | undefined,
): Map<string | number, HeatmapUATDataPoint | HeatmapCountyDataPoint> => {
  const lookup = new Map<string | number, HeatmapUATDataPoint | HeatmapCountyDataPoint>();
  if (!heatmapData) {
    return lookup;
  }

  for (const dataPoint of heatmapData) {
    if ('siruta_code' in dataPoint && dataPoint.siruta_code) {
      lookup.set(dataPoint.siruta_code, dataPoint);
    }
    if ('county_code' in dataPoint && dataPoint.county_code) {
      lookup.set(dataPoint.county_code, dataPoint);
    }
  }

  return lookup;
};

/**
 * Generates enhanced HTML content for a feature's tooltip.
 * The tooltip has a better design and includes a summary of active filters.
 * It prioritizes data from heatmapData if available for the UAT/Județ.
 */
export const createTooltipContent = (
  properties: UatProperties,
  heatmapData: (HeatmapUATDataPoint | HeatmapCountyDataPoint)[] | undefined,
  mapViewType: 'UAT' | 'County',
  filters: AnalyticsFilterType
): string => {
  const isUAT = mapViewType === 'UAT';
  const featureIdentifier = isUAT ? properties.natcode : properties.mnemonic;
  const filterSummaryHtml = createFilterSummary(filters);

  const unit = getNormalizationUnit({ normalization: filters.normalization as any, currency: (filters as any).currency });
  const currencyCode: 'RON' | 'EUR' = unit.includes('EUR') ? 'EUR' : 'RON';
  const isPerCapitaNorm = (filters.normalization === 'per_capita' || filters.normalization === 'per_capita_euro');
  const isPercentGdpNorm = filters.normalization === 'percent_gdp';
  const numberLocale = getUserLocale() === 'en' ? 'en-US' : 'ro-RO';

  // Common styles for the tooltip
  const styles = {
    container: `font-family: 'Inter', sans-serif; font-size: 14px; max-width: 350px; padding: 10px; color: #333;`,
    header: `font-size: 1.1em; font-weight: bold; margin-bottom: 4px;`,
    subHeader: `color: #666; font-size: 0.9em; margin-bottom: 12px;`,
    dataGrid: `display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; align-items: center;`,
    dataLabel: `font-weight: 600; color: #555;`,
    dataValue: `text-align: right;`,
    highlight: `font-weight: bold; color: #000;`,
    noData: `font-style: italic; color: #666; margin-top: 4px; display: flex; flex-direction: column; `
  };

  // O(1) keyed lookup avoids re-scanning heatmapData on every hover.
  const lookup = buildHeatmapTooltipLookup(heatmapData);
  const candidateKey =
    typeof featureIdentifier === 'string' || typeof featureIdentifier === 'number'
      ? featureIdentifier
      : undefined;
  const candidate = candidateKey !== undefined ? lookup.get(candidateKey) : undefined;
  const dataPoint = candidate
    ? (isUAT
        ? ('siruta_code' in candidate ? candidate : undefined)
        : ('county_code' in candidate ? candidate : undefined))
    : undefined;

  // --- Tooltip for features WITH data ---
  if (dataPoint) {
    let name, subtext, population, perCapitaAmount, totalAmount, normalizedAmount;

    if (isUAT && 'siruta_code' in dataPoint) {
      name = dataPoint.uat_name || properties.name;
      subtext = t`County:` + ` ${dataPoint.county_name || properties.county || t`N/A`}`;
      population = dataPoint.population;
      perCapitaAmount = dataPoint.per_capita_amount;
      totalAmount = dataPoint.total_amount;
      normalizedAmount = dataPoint.amount;
    } else if (!isUAT && 'county_code' && 'county_population' in dataPoint) {
      name = dataPoint.county_name || properties.name;
      subtext = t`Mnemonic:` + ` ${featureIdentifier}`;
      population = dataPoint.county_population;
      perCapitaAmount = dataPoint.per_capita_amount;
      totalAmount = dataPoint.total_amount;
      normalizedAmount = dataPoint.amount;
    } else {
      // Fallback if dataPoint is found but type guard fails
      return `<div>${t`Error: Invalid data point type.`}</div>`;
    }

    return `
      <div style="${styles.container}">
        <div style="${styles.header}">${name}</div>
        <div style="${styles.subHeader}">${subtext}</div>
        <div style="${styles.dataGrid}">
          <div style="${styles.dataLabel}">${t`Population`}</div>
          <div style="${styles.dataValue}">
            ${population?.toLocaleString(numberLocale) ?? t`N/A`}
          </div>

          ${isPercentGdpNorm
            ? `
              <div style="${styles.dataLabel}">${t`% of GDP`}</div>
              <div style="${styles.dataValue} ${styles.highlight}">
                ${formatNumber(normalizedAmount, 'compact')}%
              </div>
            `
            : `
              <div style="${styles.dataLabel}">${t`Total Amount`}</div>
              <div style="${styles.dataValue} ${!isPerCapitaNorm ? styles.highlight : ''}">
                ${formatCurrency(totalAmount, 'compact', currencyCode)}
              </div>

              <div style="${styles.dataLabel}">${t`Amount Per Capita`}</div>
              <div style="${styles.dataValue} ${isPerCapitaNorm ? styles.highlight : ''}">
                ${formatCurrency(perCapitaAmount, 'compact', currencyCode)} ${unit.includes('capita') ? t` / capita` : ''}
              </div>
            `}
        </div>
        ${filterSummaryHtml}
      </div>
    `;
  }

  // --- Tooltip for features WITHOUT data ---
  const locationName = properties.name;
  const locationSubtext = isUAT ? t`County:` + ` ${properties.county || t`N/A`}` : t`Mnemonic:` + ` ${featureIdentifier}`;

  return `
    <div style="${styles.container}">
      <div style="${styles.header}">${locationName}</div>
      <div style="${styles.subHeader}">${locationSubtext}</div>
      <div style="${styles.noData}">
        <span>
            ${t`No aggregated data`}
        </span>
        <span>
            ${t`for the selected filters.`}
        </span>
      </div>
      ${filterSummaryHtml}
    </div>
  `;
};


// Helper function to calculate percentile values
export const getPercentileValues = (
  data: (HeatmapUATDataPoint | HeatmapCountyDataPoint)[] | undefined,
  lowerPercentile: number,
  upperPercentile: number,
  valueKey: 'amount' | 'total_amount' | 'per_capita_amount'
): { min: number; max: number } => {
  if (!data || data.length === 0) {
    return { min: 0, max: 0 };
  }

  const amounts = data.map(d => {
    if (valueKey in d && typeof d[valueKey] === 'number') {
      return d[valueKey] as number;
    }
    return 0;
  }).sort((a, b) => a - b);


  const lowerIndex = Math.floor((lowerPercentile / 100) * (amounts.length - 1));
  const upperIndex = Math.ceil((upperPercentile / 100) * (amounts.length - 1));


  let min = amounts[lowerIndex];
  let max = amounts[upperIndex];

  if (min === max) {
    if (amounts.length > 0) {
      const actualMin = amounts[0];
      const actualMax = amounts[amounts.length - 1];
      if (actualMin === actualMax) {
        min = actualMin * 0.9;
        max = actualMax * 1.1;
        if (min === 0 && max === 0 && actualMin === 0) {
          return { min: 0, max: 1 };
        }
      } else {
        min = actualMin;
        max = actualMax;
      }
    } else {
      return { min: 0, max: 1 };
    }
  }


  return {
    min,
    max,
  };
};

// Helper function to normalize a value within a given range
export const normalizeValue = (value: number, min: number, max: number): number => {
  if (max === min) {
    return value === 0 ? 0 : 0.5;
  }
  const clampedValue = Math.max(min, Math.min(value, max));
  return (clampedValue - min) / (max - min);
};

// Helper function to get a heatmap color (blue -> yellow -> red) for a normalized value (0-1)
const parseHsl = (hslColor: string): [number, number, number] | null => {
  const match = hslColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return null;
  return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
};

export const getHeatmapColor = (value: number): string => {
  const clampedValue = Math.max(0, Math.min(1, value));
  const colors = [
    { stop: 0, color: 'hsl(60, 100%, 90%)' },    // Light Yellow
    { stop: 0.25, color: 'hsl(55, 100%, 75%)' }, // Yellow
    { stop: 0.5, color: 'hsl(40, 100%, 60%)' },    // Orange
    { stop: 0.75, color: 'hsl(20, 100%, 55%)' }, // Orange-Red
    { stop: 1, color: 'hsl(0, 100%, 50%)' },      // Red
  ];

  for (let i = 1; i < colors.length; i++) {
    if (clampedValue <= colors[i].stop) {
      const lower = colors[i - 1];
      const upper = colors[i];

      const lowerHsl = parseHsl(lower.color);
      const upperHsl = parseHsl(upper.color);

      if (!lowerHsl || !upperHsl) {
        return colors[0].color; // Fallback to a default color
      }

      const [h1, s1, l1] = lowerHsl;
      const [h2, s2, l2] = upperHsl;

      const range = upper.stop - lower.stop;
      const scaledValue = (clampedValue - lower.stop) / range;

      const h = h1 + (h2 - h1) * scaledValue;
      const s = s1 + (s2 - s1) * scaledValue;
      const l = l1 + (l2 - l1) * scaledValue;

      return `hsl(${h}, ${s}%, ${l}%)`;
    }
  }
  return colors[colors.length - 1].color;
};


export const createHeatmapStyleFunction = (
  heatmapData: (HeatmapUATDataPoint | HeatmapCountyDataPoint)[] | undefined,
  min: number,
  max: number,
  mapViewType: 'UAT' | 'County',
  valueKey: 'amount' | 'total_amount' | 'per_capita_amount'
): ((feature: UatFeature) => PathOptions) => {
  // Build the lookup once per style-function instance. The previous
  // implementation ran an O(n) `.find()` on every feature; since this style
  // function is invoked once per feature on every restyle pass, that quickly
  // dominates large GeoJSON renders.
  const isUAT = mapViewType === 'UAT';
  const lookup = new Map<string | number, HeatmapUATDataPoint | HeatmapCountyDataPoint>();
  if (heatmapData) {
    for (const dataPoint of heatmapData) {
      if (isUAT && 'siruta_code' in dataPoint && dataPoint.siruta_code) {
        lookup.set(dataPoint.siruta_code, dataPoint);
      }
      if (!isUAT && 'county_code' in dataPoint && dataPoint.county_code) {
        lookup.set(dataPoint.county_code, dataPoint);
      }
    }
  }

  return (feature: UatFeature) => {
    if (!feature || !feature.properties) {
      return DEFAULT_FEATURE_STYLE;
    }

    if (!heatmapData) {
      return DEFAULT_FEATURE_STYLE;
    }

    const rawFeatureKey = isUAT ? feature.properties.natcode : feature.properties.mnemonic;
    const featureKey =
      typeof rawFeatureKey === 'string' || typeof rawFeatureKey === 'number'
        ? rawFeatureKey
        : undefined;
    const dataPoint = featureKey !== undefined ? lookup.get(featureKey) : undefined;

    if (!dataPoint) {
      return { ...DEFAULT_FEATURE_STYLE, fillOpacity: 0.1, fillColor: "#cccccc" };
    }

    const value = (valueKey in dataPoint && typeof dataPoint[valueKey] === 'number') ? dataPoint[valueKey] : 0;

    if (min === max) {
      const style = {
        ...DEFAULT_FEATURE_STYLE,
        fillColor: value !== 0 ? getHeatmapColor(0.5) : DEFAULT_FEATURE_STYLE.fillColor,
        fillOpacity: 0.7,
      };
      return style;
    }

    const normalized = normalizeValue(value, min, max);
    const color = getHeatmapColor(normalized);
    const finalStyle = {
      ...DEFAULT_FEATURE_STYLE,
      fillColor: color,
      fillOpacity: 0.7,
    };

    return finalStyle;
  };
};

// ================= Additional utilities extracted from InteractiveMap =================

/**
 * Pure style computer – given a GeoJSON feature and inputs, returns a Leaflet style.
 * Keeping this pure avoids stale closures and makes behavior predictable.
 */
export function getStyleForFeature(
  feature: Feature<Geometry, unknown> | undefined,
  args: {
    heatmapDataMap: Map<string | number, HeatmapUATDataPoint | HeatmapCountyDataPoint>;
    getFeatureStyle: (feature: UatFeature, heatmapDataMap: Map<string | number, HeatmapUATDataPoint | HeatmapCountyDataPoint>) => PathOptions;
    highlightedFeatureId?: string | number;
  }
): PathOptions {
  if (feature?.properties) {
    const uatProperties = feature.properties as UatProperties;
    const baseStyle = args.heatmapDataMap.size > 0
      ? args.getFeatureStyle(feature as UatFeature, args.heatmapDataMap)
      : DEFAULT_FEATURE_STYLE;

    if (
      args.highlightedFeatureId &&
      (uatProperties.natcode === args.highlightedFeatureId ||
        uatProperties.mnemonic === args.highlightedFeatureId)
    ) {
      return { ...baseStyle, ...PERMANENT_HIGHLIGHT_STYLE };
    }

    return baseStyle;
  }
  return DEFAULT_FEATURE_STYLE;
}

/**
 * Builds a lookup map from heatmap data for O(1) access by feature key.
 */
export function buildHeatmapDataMap(
  heatmapData: Array<HeatmapUATDataPoint | HeatmapCountyDataPoint>
): Map<string | number, HeatmapUATDataPoint | HeatmapCountyDataPoint> {
  const map = new Map<string | number, HeatmapUATDataPoint | HeatmapCountyDataPoint>();
  for (const item of heatmapData) {
    if ('uat_code' in item) {
      // Index UAT by both uat_code and siruta_code to match GeoJSON natcode
      const uatKey = item.uat_code;
      const sirutaKey = item.siruta_code;
      if (uatKey) map.set(uatKey, item);
      if (sirutaKey) map.set(sirutaKey, item);
    } else {
      // County
      const countyKey = item.county_code;
      if (countyKey) map.set(countyKey, item);
    }
  }
  return map;
}

type StyleFunctionTracker = LeafletGeoJSON & {
  __lastAppliedStyleFn?: (feature?: Feature<Geometry, unknown>) => PathOptions;
};

/**
 * Re-applies styles to all features from the current GeoJSON layer group.
 * Note: This function is only safe to call on the client side.
 *
 * Bails out early when the layer is detached or when the same style function
 * reference has already been applied since the last data change, avoiding a
 * full per-feature `setStyle` pass on every render.
 */
export function restyleAllFeatures(
  layerGroup: LeafletGeoJSON | null,
  styleFn: (feature?: Feature<Geometry, unknown>) => PathOptions
) {
  if (!layerGroup) return;
  const map = (layerGroup as LeafletGeoJsonWithMapRef)._map;
  const container = map?.getContainer?.();

  // Skip style updates while the layer is detached during map teardown.
  if (!map || !container || !container.isConnected) return;

  // Fast bail: skip redundant restyles when the style function reference is
  // unchanged since the last successful pass on this layer group.
  const tracker = layerGroup as StyleFunctionTracker;
  if (tracker.__lastAppliedStyleFn === styleFn) {
    return;
  }

  try {
    layerGroup.eachLayer((layer) => {
      const feature = (layer as unknown as { feature?: Feature<Geometry, unknown> }).feature;
      if (!feature) return;
      const nextStyle = styleFn(feature);
      // Use duck typing instead of instanceof to avoid runtime Leaflet import
      const layerWithStyle = layer as unknown as { setStyle?: (style: PathOptions) => void };
      if (typeof layerWithStyle.setStyle === 'function') {
        layerWithStyle.setStyle(nextStyle);
      }
    });
    tracker.__lastAppliedStyleFn = styleFn;
  } catch {
    // Silently ignore styling errors for resilience in production
  }
}
