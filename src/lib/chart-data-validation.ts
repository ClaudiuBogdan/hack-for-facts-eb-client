import { t } from '@lingui/core/macro';
import { AnalyticsSeries } from "@/schemas/charts";
import { createLogger } from "./logger";
import { getXAxisUnit } from "./chart-data-utils";

const logger = createLogger("chart-data-validation");

export interface DataValidationError {
  type:
  | "invalid_x_value"
  | "invalid_y_value"
  | "missing_data"
  | "empty_series"
  | "invalid_aggregated_value"
  | "auto_adjusted_value";
  seriesId: string;
  message: string;
  pointIndex?: number;
  value?: unknown; // strong typing: avoid `any`
}

export interface ValidationResult {
  isValid: boolean;
  errors: DataValidationError[];
  warnings: DataValidationError[];
}

/**
 * Validates AnalyticsSeries data for chart rendering
 * - Downgrades non-numeric points to warnings (sanitizer will remove)
 */
export function validateAnalyticsSeries(seriesMap: Map<string, AnalyticsSeries>): ValidationResult {
  const errors: DataValidationError[] = [];
  const warnings: DataValidationError[] = [];
  const xUnit = getXAxisUnit(seriesMap);

  for (const [seriesId, series] of seriesMap.entries()) {
    if (series.missingPeriods?.length) warnings.push({
      type: 'missing_data', seriesId,
      message: t`Some periods are unavailable. Totals and calculations requiring them are not shown.`,
      value: series.missingPeriods,
    });
    // Check if series has data
    if (!series.data || series.data.length === 0) {
      warnings.push({
        type: "empty_series",
        seriesId,
        message: `Series '${seriesId}' has no data points. Check data source or adjust filters to include this series.`,
      });
      continue;
    }

    // Validate each data point
    series.data.forEach((point, index) => {
      // Validate x value (should be convertible to finite number for time series)
      if (xUnit === 'year') {
        const xValue = Number(point.x);
        if (!Number.isFinite(xValue)) {
            const valueType = typeof point.x;
            const expectedFormat = valueType === 'string' ? 'numeric year (e.g., "2023")' : 'finite number';
            warnings.push({
                type: "invalid_x_value",
                seriesId,
                message: `Invalid x-axis value: expected ${expectedFormat}, got ${valueType} '${point.x}' (point removed from chart)`,
                pointIndex: index,
                value: point.x,
            });
        }
    }

      // Validate y value (should be a finite number)
      if (typeof point.y !== "number" || !Number.isFinite(point.y)) {
        const valueType = point.y === null ? 'null' : point.y === undefined ? 'undefined' : typeof point.y;
        warnings.push({
          type: "invalid_y_value",
          seriesId,
          message: `Invalid y-axis value: expected finite number, got ${valueType} '${point.y}' (point removed from chart)`,
          pointIndex: index,
          value: point.y,
        });
      }
    });
  }

  const isValid = errors.length === 0;

  // Log validation results
  if (errors.length > 0) {
    logger.error("Chart data validation failed", { errors, warnings });
  } else if (warnings.length > 0) {
    logger.warn("Chart data validation completed with warnings", { warnings });
  }

  return { isValid, errors, warnings };
}

/**
 * Sanitizes AnalyticsSeries data by filtering out invalid points
 * Runs even when there are only warnings (isValid === true)
 */
export function sanitizeAnalyticsSeries(
  seriesMap: Map<string, AnalyticsSeries>,
  _validationResult: ValidationResult
): Map<string, AnalyticsSeries> {
  const sanitizedMap = new Map<string, AnalyticsSeries>();
  const xUnit = getXAxisUnit(seriesMap);

  for (const [seriesId, series] of seriesMap.entries()) {
    const validPoints = (series.data ?? []).filter((point, index) => {
      const xValid = xUnit === 'year' ? Number.isFinite(Number(point.x)) : (typeof point.x === 'string' && point.x.length > 0);
      const yValid = typeof point.y === "number" && Number.isFinite(point.y);

      if (!xValid || !yValid) {
        logger.warn(`Filtering out invalid data point at index ${index} in series ${seriesId}`, {
          point,
          xValid,
          yValid,
        });
        return false;
      }

      return true;
    });

    sanitizedMap.set(seriesId, {
      ...series,
      data: validPoints,
    });
  }

  return sanitizedMap;
}

/**
 * Creates a user-friendly message summarizing both errors and warnings
 */
export function formatValidationErrors(validationResult: ValidationResult): string {
  const { errors, warnings } = validationResult;
  if (errors.length === 0 && warnings.length === 0) return "";

  const groupBySeries = (items: DataValidationError[]) =>
    items.reduce((acc, e) => {
      (acc[e.seriesId] ||= []).push(e);
      return acc;
    }, {} as Record<string, DataValidationError[]>);

  const formatGroup = (label: string, items: DataValidationError[]) => {
    if (items.length === 0) return "";
    const grouped = groupBySeries(items);
    const lines = Object.entries(grouped).map(([seriesId, list]) => {
      const types = [...new Set(list.map((i) => i.type))].join(", ");
      return `  • ${seriesId}: ${types} (${list.length})`;
    });
    return `${label} (${items.length}):\n${lines.join("\n")}`;
  };

  const parts = [formatGroup("Errors", errors), formatGroup("Warnings", warnings)].filter(Boolean);

  return `Chart data validation issues:\n${parts.join("\n")}`;
}

/**
 * Validates aggregated series data used by aggregated charts (e.g., bar-aggr)
 * Ensures values are finite numbers and that data exists
 */
export function validateAggregatedData(
  aggregatedData: Array<{ id: string; value: number }>,
  options?: { treatMissingAsZero?: boolean }
): ValidationResult {
  const errors: DataValidationError[] = [];
  const warnings: DataValidationError[] = [];

  if (!aggregatedData || aggregatedData.length === 0) {
    warnings.push({
      type: "missing_data",
      seriesId: "aggregated",
      message: "No aggregated data points to display. Verify data source and aggregation settings.",
    });
    return { isValid: errors.length === 0, errors, warnings };
  }

  aggregatedData.forEach((point, index) => {
    const numeric = point.value;
    if (!Number.isFinite(numeric)) {
      const valueType = point.value === null ? 'null' : point.value === undefined ? 'undefined' : typeof point.value;
      // If we can quick-fix by setting to zero, classify as a warning
      if (options?.treatMissingAsZero !== false) {
        warnings.push({
          type: "invalid_aggregated_value",
          seriesId: point.id,
          message: `Invalid aggregated value: expected finite number, got ${valueType} '${point.value}' (auto-set to 0). This may affect chart totals.`,
          pointIndex: index,
          value: point.value,
        });
      } else {
        errors.push({
          type: "invalid_aggregated_value",
          seriesId: point.id,
          message: `Invalid aggregated value: expected finite number, got ${valueType} '${point.value}'. Chart cannot render with invalid data.`,
          pointIndex: index,
          value: point.value,
        });
      }
    }
  });

  const isValid = errors.length === 0;
  if (!isValid) {
    logger.error("Aggregated data validation failed", { errors, warnings });
  }

  return { isValid, errors, warnings };
}

/**
 * Sets non-finite aggregated values to 0 (per spec)
 */
export function sanitizeAggregatedData(
  aggregatedData: Array<{ id: string; value: number }>
): Array<{ id: string; value: number }> {
  return aggregatedData.map((p) => ({
    id: p.id,
    value: Number.isFinite(p.value) ? p.value : 0,
  }));
}

/**
 * Combines multiple validation results into a single result
 */
export function combineValidationResults(
  ...results: Array<ValidationResult | null | undefined>
): ValidationResult {
  const combined: ValidationResult = { isValid: true, errors: [], warnings: [] };
  for (const res of results) {
    if (!res) continue;
    combined.errors = combined.errors.concat(res.errors);
    combined.warnings = combined.warnings.concat(res.warnings);
    if (!res.isValid) combined.isValid = false;
  }
  return combined;
}

/**
 * Warn when series are missing data for years in the selected chart range
 */
export function validateSeriesCompleteness(
  seriesMap: Map<string, AnalyticsSeries>,
  range: { start: number; end: number }
): ValidationResult {
  const warnings: DataValidationError[] = [];
  const errors: DataValidationError[] = [];
  
  // Pre-calculate expected years set for efficiency
  const expectedYears = new Set<number>();
  for (let y = range.start; y <= range.end; y++) {
    expectedYears.add(y);
  }
  const totalExpectedYears = expectedYears.size;

  for (const [seriesId, series] of seriesMap.entries()) {
    // Extract valid years in a single pass
    const presentYears = new Set(
      series.data
        .map((p) => Number(p.x))
        .filter((n) => Number.isFinite(n) && expectedYears.has(n))
    );
    
    logger.debug(`Series ${seriesId} completeness:`, { 
      presentYears: Array.from(presentYears).sort(), 
      totalPoints: series.data.length,
      coverage: `${presentYears.size}/${totalExpectedYears}` 
    });
    
    const missingCount = totalExpectedYears - presentYears.size;
    
    if (missingCount === totalExpectedYears) {
      // Entire range missing
      warnings.push({
        type: "missing_data",
        seriesId,
        message: `No data available for ${range.start}-${range.end}. Chart will be empty for this series.`,
      });
    } else if (missingCount > 0) {
      // Calculate missing years only when needed
      const missing = Array.from(expectedYears).filter(y => !presentYears.has(y)).sort();
      const yearPlural = missing.length > 1 ? 'years' : 'year';
      warnings.push({
        type: "missing_data",
        seriesId,
        message: `Missing data for ${missing.length} ${yearPlural} (${missing.join(', ')}). Chart may show gaps or incomplete trends.`,
      });
    }
  }

  return { isValid: true, errors, warnings };
}
