import type {
  CommitmentsSeriesConfiguration,
  Currency,
  ReportPeriodInputZ,
  SeriesConfiguration,
} from '@/schemas/charts';
import {
  parseAdvancedMapAnalyticsUrlState,
  type AdvancedMapAnalyticsUrlState,
  type MapSupportedSeries,
} from '@/schemas/advanced-map-analytics';

type YearOverrideCompatibleSeries =
  | SeriesConfiguration
  | CommitmentsSeriesConfiguration;

function areReportPeriodsEqual(
  left: ReportPeriodInputZ | undefined,
  right: ReportPeriodInputZ | undefined,
): boolean {
  if (left === right) return true;
  if (left === undefined || right === undefined) return false;
  return (
    left.type === right.type &&
    JSON.stringify(left.selection) === JSON.stringify(right.selection)
  );
}

function overrideSingleYearReportPeriod(
  reportPeriod: ReportPeriodInputZ | undefined,
  selectedYearOverride: number | undefined,
): ReportPeriodInputZ | undefined {
  if (!reportPeriod || selectedYearOverride === undefined) {
    return reportPeriod;
  }

  if (reportPeriod.type !== 'YEAR') {
    return reportPeriod;
  }

  const yearLabel = String(selectedYearOverride);

  if ('interval' in reportPeriod.selection && reportPeriod.selection.interval) {
    const { start, end } = reportPeriod.selection.interval;
    if (start !== end) {
      return reportPeriod;
    }

    if (start === yearLabel && end === yearLabel) {
      return reportPeriod;
    }

    return {
      ...reportPeriod,
      selection: {
        interval: {
          start: yearLabel,
          end: yearLabel,
        },
      },
    };
  }

  if ('dates' in reportPeriod.selection && Array.isArray(reportPeriod.selection.dates)) {
    if (reportPeriod.selection.dates.length !== 1) {
      return reportPeriod;
    }

    if (reportPeriod.selection.dates[0] === yearLabel) {
      return reportPeriod;
    }

    return {
      ...reportPeriod,
      selection: {
        dates: [yearLabel],
      },
    };
  }

  return reportPeriod;
}

function overrideSeriesReportPeriod<T extends YearOverrideCompatibleSeries>(
  series: T,
  reportPeriodOverride: ReportPeriodInputZ | undefined,
  selectedYearOverride: number | undefined,
): T {
  const nextReportPeriod =
    reportPeriodOverride ??
    overrideSingleYearReportPeriod(
      series.filter.report_period,
      selectedYearOverride,
    );

  if (areReportPeriodsEqual(nextReportPeriod, series.filter.report_period)) {
    return series;
  }

  return {
    ...series,
    filter: {
      ...series.filter,
      report_period: nextReportPeriod,
    },
  } as T;
}

function overrideSeriesNormalization<T extends YearOverrideCompatibleSeries>(
  series: T,
  normalizationOverride: 'total' | 'per_capita' | undefined,
): T {
  if (
    normalizationOverride === undefined ||
    series.filter.normalization === normalizationOverride
  ) {
    return series;
  }

  return {
    ...series,
    filter: {
      ...series.filter,
      normalization: normalizationOverride,
    },
  } as T;
}

function overrideSeriesCurrency<T extends YearOverrideCompatibleSeries>(
  series: T,
  currencyOverride: Currency | undefined,
): T {
  if (
    currencyOverride === undefined ||
    series.filter.currency === currencyOverride
  ) {
    return series;
  }

  return {
    ...series,
    filter: {
      ...series.filter,
      currency: currencyOverride,
    },
  } as T;
}

function overrideSeriesInflationAdjusted<T extends YearOverrideCompatibleSeries>(
  series: T,
  inflationAdjustedOverride: boolean | undefined,
): T {
  if (
    inflationAdjustedOverride === undefined ||
    series.filter.inflation_adjusted === inflationAdjustedOverride
  ) {
    return series;
  }

  return {
    ...series,
    filter: {
      ...series.filter,
      inflation_adjusted: inflationAdjustedOverride,
    },
  } as T;
}

function overrideExecutionSeriesReportType(
  series: SeriesConfiguration,
  reportTypeOverride: SeriesConfiguration['filter']['report_type'] | undefined,
): SeriesConfiguration {
  if (
    reportTypeOverride === undefined ||
    series.filter.report_type === reportTypeOverride
  ) {
    return series;
  }

  return {
    ...series,
    filter: {
      ...series.filter,
      report_type: reportTypeOverride,
    },
  };
}

function applyRuntimeYearOverride(
  series: MapSupportedSeries,
  reportPeriodOverride: ReportPeriodInputZ | undefined,
  selectedYearOverride: number | undefined,
): MapSupportedSeries {
  if (
    reportPeriodOverride === undefined &&
    selectedYearOverride === undefined
  ) {
    return series;
  }

  if (series.type === 'line-items-aggregated-yearly') {
    return overrideSeriesReportPeriod(
      series,
      reportPeriodOverride,
      selectedYearOverride,
    );
  }

  if (series.type === 'commitments-analytics') {
    return overrideSeriesReportPeriod(
      series,
      reportPeriodOverride,
      selectedYearOverride,
    );
  }

  return series;
}

function applyRuntimeReportTypeOverride(
  series: MapSupportedSeries,
  reportTypeOverride: SeriesConfiguration['filter']['report_type'] | undefined,
): MapSupportedSeries {
  if (series.type === 'line-items-aggregated-yearly') {
    return overrideExecutionSeriesReportType(series, reportTypeOverride);
  }

  return series;
}

function applyRuntimeNormalizationOverride(
  series: MapSupportedSeries,
  normalizationOverride: 'total' | 'per_capita' | undefined,
): MapSupportedSeries {
  if (series.type === 'line-items-aggregated-yearly') {
    return overrideSeriesNormalization(series, normalizationOverride);
  }

  if (series.type === 'commitments-analytics') {
    return overrideSeriesNormalization(series, normalizationOverride);
  }

  return series;
}

function applyRuntimeCurrencyOverride(
  series: MapSupportedSeries,
  currencyOverride: Currency | undefined,
): MapSupportedSeries {
  if (series.type === 'line-items-aggregated-yearly') {
    return overrideSeriesCurrency(series, currencyOverride);
  }

  if (series.type === 'commitments-analytics') {
    return overrideSeriesCurrency(series, currencyOverride);
  }

  return series;
}

function applyRuntimeInflationAdjustedOverride(
  series: MapSupportedSeries,
  inflationAdjustedOverride: boolean | undefined,
): MapSupportedSeries {
  if (series.type === 'line-items-aggregated-yearly') {
    return overrideSeriesInflationAdjusted(series, inflationAdjustedOverride);
  }

  if (series.type === 'commitments-analytics') {
    return overrideSeriesInflationAdjusted(
      series,
      inflationAdjustedOverride,
    );
  }

  return series;
}

export function applyMapRuntimeConfig(
  mapConfig: AdvancedMapAnalyticsUrlState,
  {
    reportPeriodOverride,
    selectedYearOverride,
    reportTypeOverride,
    normalizationOverride,
    currencyOverride,
    inflationAdjustedOverride,
    mapNameOverride,
    forceMapActiveView = false,
  }: {
    reportPeriodOverride?: ReportPeriodInputZ;
    selectedYearOverride?: number;
    reportTypeOverride?: SeriesConfiguration['filter']['report_type'];
    normalizationOverride?: 'total' | 'per_capita';
    currencyOverride?: Currency;
    inflationAdjustedOverride?: boolean;
    mapNameOverride?: string;
    forceMapActiveView?: boolean;
  },
): AdvancedMapAnalyticsUrlState {
  let didChangeSeries = false;
  const nextSeries = mapConfig.series.map((series) => {
    const nextSeriesEntry = applyRuntimeInflationAdjustedOverride(
      applyRuntimeCurrencyOverride(
        applyRuntimeNormalizationOverride(
          applyRuntimeReportTypeOverride(
            applyRuntimeYearOverride(
              series,
              reportPeriodOverride,
              selectedYearOverride,
            ),
            reportTypeOverride,
          ),
          normalizationOverride,
        ),
        currencyOverride,
      ),
      inflationAdjustedOverride,
    );
    if (nextSeriesEntry !== series) {
      didChangeSeries = true;
    }
    return nextSeriesEntry;
  });

  const shouldForceMapActiveView =
    forceMapActiveView && mapConfig.activeView !== 'map';
  const hasMapNameOverride =
    typeof mapNameOverride === 'string' &&
    mapNameOverride.trim().length > 0 &&
    mapConfig.mapName !== mapNameOverride;

  if (!didChangeSeries && !shouldForceMapActiveView && !hasMapNameOverride) {
    return parseAdvancedMapAnalyticsUrlState(mapConfig);
  }

  return parseAdvancedMapAnalyticsUrlState({
    ...mapConfig,
    series: didChangeSeries ? nextSeries : mapConfig.series,
    ...(hasMapNameOverride ? { mapName: mapNameOverride } : {}),
    ...(shouldForceMapActiveView ? { activeView: 'map' as const } : {}),
  });
}
