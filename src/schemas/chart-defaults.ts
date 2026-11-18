export const defaultYearRange = {
  start: 2016,
  end: 2026,
};

export const DEFAULT_SELECTED_YEAR = 2025;

export const defaultExecutionPeriodStartYear = defaultYearRange.start;
export const defaultCommitmentsPeriodStartYear = 2019;

export function createDefaultExecutionYearReportPeriod() {
  const latestDefaultYear = String(DEFAULT_SELECTED_YEAR);
  return {
    type: 'YEAR' as const,
    selection: {
      interval: {
        start: latestDefaultYear,
        end: latestDefaultYear,
      },
    },
  };
}

export function createDefaultCommitmentsYearReportPeriod() {
  const latestDefaultYear = String(defaultYearRange.end);
  return {
    type: 'YEAR' as const,
    selection: {
      interval: {
        start: latestDefaultYear,
        end: latestDefaultYear,
      },
    },
  };
}

export const CHART_TYPES = ['line', 'bar', 'area', 'bar-aggr', 'pie-aggr', 'treemap-aggr', 'sankey-aggr'] as const;

export const DEFAULT_CHART_CONFIG = {
    chartType: 'line' as (typeof CHART_TYPES)[number],
    color: '#0062ff',
    showDataLabels: false,
    showGridLines: true,
    showLegend: true,
    showRelativeValues: false,
    showTooltip: true,
    editAnnotations: true,
    showAnnotations: true,
};

/**
 * A factory, not a constant: `id`, `createdAt` and `updatedAt` have to be
 * minted per chart. As a module-level object literal these were evaluated once
 * at import, so every chart falling back to this default shared one UUID and
 * one timestamp — on the SSR server, the timestamp of process start.
 */
export const createDefaultChart = () => ({
    id: crypto.randomUUID(),
    title: '',
    description: '',
    config: DEFAULT_CHART_CONFIG,
    series: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    annotations: [],
});
