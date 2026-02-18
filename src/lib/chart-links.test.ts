import { describe, expect, it } from 'vitest';

import {
  buildEntityCommitmentsChartLink,
  buildEntityCommitmentsChartState,
  buildEntityIncomeExpenseChartLink,
  buildInsStatsChartLink,
  buildInsStatsChartState,
  buildMapTopEntitiesEvolutionChartLink,
  buildMapTopEntitiesEvolutionChartState,
  buildTreemapChartLink,
} from './chart-links';

describe('chart-links', () => {
  it('builds INS stats chart state with UAT scope and mapped selectors', () => {
    const state = buildInsStatsChartState({
      datasetCode: 'POP107D',
      datasetLabel: 'Population by domicile',
      entityName: 'Sibiu',
      temporalSplit: 'quarter',
      classificationSelections: {
        SEX: ['M', 'F'],
        AGE: ['TOTAL'],
      },
      unitKey: 'PERS',
      isCounty: false,
      sirutaCode: '143450',
    });

    expect(state.view).toBe('overview');
    expect(state.chart.series).toHaveLength(1);

    const series = state.chart.series[0];
    expect(series.type).toBe('ins-series');
    if (series.type !== 'ins-series') {
      throw new Error('Expected INS series');
    }

    expect(series.datasetCode).toBe('POP107D');
    expect(series.sirutaCodes).toEqual(['143450']);
    expect(series.territoryCodes).toBeUndefined();
    expect(series.unitCodes).toEqual(['PERS']);
    expect(series.classificationSelections).toEqual({
      SEX: ['M', 'F'],
      AGE: ['TOTAL'],
    });
    expect(series.aggregation).toBe('sum');
    expect(series.hasValue).toBe(true);
    expect(series.period).toEqual({
      type: 'QUARTER',
      selection: {
        interval: {
          start: '1900-Q1',
          end: '2100-Q4',
        },
      },
    });
  });

  it('omits optional INS fields when split is all and unit is __none__', () => {
    const state = buildInsStatsChartState({
      datasetCode: 'POP107D',
      datasetLabel: 'Population by domicile',
      entityName: 'Sibiu',
      temporalSplit: 'all',
      classificationSelections: {},
      unitKey: '__none__',
      isCounty: true,
      countyCode: 'sb',
    });

    const series = state.chart.series[0];
    expect(series.type).toBe('ins-series');
    if (series.type !== 'ins-series') {
      throw new Error('Expected INS series');
    }

    expect(series.period).toBeUndefined();
    expect(series.classificationSelections).toBeUndefined();
    expect(series.unitCodes).toBeUndefined();
    expect(series.territoryCodes).toEqual(['SB']);
    expect(series.sirutaCodes).toBeUndefined();
  });

  it('builds INS chart link with route params tied to chart id', () => {
    const link = buildInsStatsChartLink({
      datasetCode: 'POP107D',
      datasetLabel: 'Population by domicile',
      entityName: 'Sibiu',
      temporalSplit: 'year',
      isCounty: false,
      sirutaCode: '143450',
    });

    expect(link.to).toBe('/charts/$chartId');
    expect(link.params.chartId).toBe(link.search.chart.id);
    expect(link.search.view).toBe('overview');
  });

  it('returns consistent chart route link shape across existing builders', () => {
    const entityLink = buildEntityIncomeExpenseChartLink('123', 'Test Entity', {
      normalization: 'total',
      currency: 'RON',
      inflation_adjusted: false,
      show_period_growth: false,
    });

    const treemapLink = buildTreemapChartLink({
      title: 'Treemap chart',
      seriesConfigs: [
        {
          id: 'series-1',
          type: 'custom-series-value',
          label: 'Threshold',
          value: 5,
          unit: 'units',
          enabled: true,
          config: {
            color: '#123456',
            showDataLabels: false,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    expect(entityLink.to).toBe('/charts/$chartId');
    expect(entityLink.params.chartId).toBe(entityLink.search.chart.id);

    expect(treemapLink.to).toBe('/charts/$chartId');
    expect(treemapLink.params.chartId).toBe(treemapLink.search.chart.id);
  });

  it('builds commitments chart state with normalized report type and payments sum', () => {
    const state = buildEntityCommitmentsChartState(
      '123',
      'Test Entity',
      {
        normalization: 'per_capita',
        currency: 'EUR',
        inflation_adjusted: true,
        show_period_growth: true,
      },
      { reportType: 'COMMITMENT_SECONDARY_AGGREGATED' }
    );

    expect(state.view).toBe('overview');
    expect(state.chart.series).toHaveLength(5);

    const commitmentsSeries = state.chart.series.filter((series) => series.type === 'commitments-analytics');
    expect(commitmentsSeries).toHaveLength(4);

    const budgetSeries = commitmentsSeries.find((series) => series.metric === 'CREDITE_BUGETARE_DEFINITIVE');
    if (!budgetSeries) throw new Error('Expected budget commitments series');

    expect(budgetSeries.filter.report_type).toBe('SECONDARY_AGGREGATED');
    expect(budgetSeries.filter.entity_cuis).toEqual(['123']);
    expect(budgetSeries.filter.exclude?.economic_prefixes).toEqual(['51.01', '51.02']);
    expect(budgetSeries.filter.normalization).toBe('per_capita');
    expect(budgetSeries.filter.currency).toBe('EUR');
    expect(budgetSeries.filter.inflation_adjusted).toBe(true);
    expect(budgetSeries.filter.show_period_growth).toBe(true);

    const paymentsSeries = state.chart.series.find(
      (series) => series.type === 'aggregated-series-calculation' && series.label === 'Payments'
    );
    if (!paymentsSeries || paymentsSeries.type !== 'aggregated-series-calculation') {
      throw new Error('Expected calculated payments series');
    }

    expect(paymentsSeries.calculation.op).toBe('sum');
    expect(paymentsSeries.calculation.args).toHaveLength(2);
  });

  it('builds commitments chart link with route params tied to chart id', () => {
    const link = buildEntityCommitmentsChartLink(
      '123',
      'Test Entity',
      {
        normalization: 'total',
        currency: 'RON',
        inflation_adjusted: false,
        show_period_growth: false,
      },
      { reportType: 'PRINCIPAL_AGGREGATED' }
    );

    expect(link.to).toBe('/charts/$chartId');
    expect(link.params.chartId).toBe(link.search.chart.id);
    expect(link.search.view).toBe('overview');
  });

  it('builds map top-entities evolution chart state for UAT scope', () => {
    const state = buildMapTopEntitiesEvolutionChartState({
      mapViewType: 'UAT',
      effectiveFilter: {
        account_category: 'ch',
        report_period: {
          type: 'YEAR',
          selection: {
            interval: {
              start: '2016',
              end: '2025',
            },
          },
        },
      } as any,
      topEntities: [
        { id: 'cui-bucharest', label: 'Bucharest' },
        { id: 'cui-cluj', label: 'Cluj' },
      ],
    });

    expect(state.view).toBe('overview');
    expect(state.chart.title).toBe('Evolution of Top 15 UATs');
    expect(state.chart.series).toHaveLength(2);
    const firstSeries = state.chart.series[0];
    expect(firstSeries.type).toBe('line-items-aggregated-yearly');
    if (firstSeries.type !== 'line-items-aggregated-yearly') {
      throw new Error('Expected line-items-aggregated-yearly');
    }
    expect(firstSeries.filter.entity_cuis).toEqual(['cui-bucharest']);
  });

  it('builds map top-entities evolution chart state for county scope', () => {
    const state = buildMapTopEntitiesEvolutionChartState({
      mapViewType: 'County',
      effectiveFilter: {
        account_category: 'ch',
        report_period: {
          type: 'YEAR',
          selection: {
            interval: {
              start: '2016',
              end: '2025',
            },
          },
        },
      } as any,
      topEntities: [
        { id: 'county-cui-cluj', label: 'Cluj' },
        { id: 'county-cui-timis', label: 'Timis' },
      ],
    });

    expect(state.view).toBe('overview');
    expect(state.chart.title).toBe('Evolution of Top 15 Counties');
    expect(state.chart.series).toHaveLength(2);
    const secondSeries = state.chart.series[1];
    expect(secondSeries.type).toBe('line-items-aggregated-yearly');
    if (secondSeries.type !== 'line-items-aggregated-yearly') {
      throw new Error('Expected line-items-aggregated-yearly');
    }
    expect(secondSeries.filter.entity_cuis).toEqual(['county-cui-timis']);
  });

  it('builds deterministic map top-entities evolution IDs for same inputs', () => {
    const input = {
      mapViewType: 'UAT' as const,
      effectiveFilter: {
        account_category: 'ch',
        report_period: {
          type: 'YEAR',
          selection: {
            interval: {
              start: '2016',
              end: '2025',
            },
          },
        },
      } as any,
      topEntities: [
        { id: 'cui-bucharest', label: 'Bucharest' },
        { id: 'cui-cluj', label: 'Cluj' },
      ],
    };

    const first = buildMapTopEntitiesEvolutionChartState(input);
    const second = buildMapTopEntitiesEvolutionChartState(input);

    expect(first.chart.id).toBe(second.chart.id);
    expect(first.chart.series.map((series) => series.id)).toEqual(
      second.chart.series.map((series) => series.id)
    );
  });

  it('builds map top-entities chart link with route params tied to chart id', () => {
    const link = buildMapTopEntitiesEvolutionChartLink({
      mapViewType: 'UAT',
      effectiveFilter: {
        account_category: 'ch',
        report_period: {
          type: 'YEAR',
          selection: {
            interval: {
              start: '2016',
              end: '2025',
            },
          },
        },
      } as any,
      topEntities: [
        { id: 'cui-bucharest', label: 'Bucharest' },
        { id: 'cui-cluj', label: 'Cluj' },
      ],
    });

    expect(link.to).toBe('/charts/$chartId');
    expect(link.params.chartId).toBe(link.search.chart.id);
    expect(link.search.view).toBe('overview');
  });
});
