import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultAdvancedMapAnalyticsSeries } from '@/schemas/advanced-map-analytics';
import { AdvancedMapAnalyticsSeriesEditorModal } from './advanced-map-analytics-series-editor-modal';

const linkPropsSpy = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  Link: (props: Record<string, unknown>) => {
    linkPropsSpy(props);
    return <a>{props.children as React.ReactNode}</a>;
  },
}));

vi.mock('@/components/charts/components/series-config/SeriesFilter', () => ({
  SeriesFilter: () => <div>SeriesFilter</div>,
}));

vi.mock('@/components/charts/components/series-config/InsSeriesEditor', () => ({
  InsSeriesEditor: () => <div>InsSeriesEditor</div>,
}));

vi.mock('@/components/charts/components/series-config/CalculationEditor', () => ({
  CalculationEditor: () => <div>CalculationEditor</div>,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/select', async () => {
  const reactModule = await import('react');
  const { createContext, useContext } = reactModule;
  const SelectContext = createContext<{
    value?: string;
    onValueChange?: (value: string) => void;
  }>({});

  return {
    Select: ({
      value,
      onValueChange,
      children,
    }: {
      value?: string;
      onValueChange?: (value: string) => void;
      children: React.ReactNode;
    }) => (
      <SelectContext.Provider value={{ value, onValueChange }}>
        <div>{children}</div>
      </SelectContext.Provider>
    ),
    SelectTrigger: ({
      id,
      children,
    }: {
      id?: string;
      children: React.ReactNode;
    }) => <button aria-label={id}>{children}</button>,
    SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
    SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectItem: ({
      value,
      children,
    }: {
      value: string;
      children: React.ReactNode;
    }) => {
      const context = useContext(SelectContext);
      return (
        <button type="button" onClick={() => context.onValueChange?.(value)}>
          {children}
        </button>
      );
    },
  };
});

vi.mock('@/components/filters/base-filter/FilterListContainer', () => ({
  FilterListContainer: ({
    title,
    selected,
    setSelected,
  }: {
    title: string;
    selected: Array<{ id: string | number; label: string }>;
    setSelected: React.Dispatch<React.SetStateAction<Array<{ id: string | number; label: string }>>>;
  }) => (
    <div>
      <div>{title}</div>
      <div>Selected: {selected.length}</div>
      <button
        type="button"
        aria-label={`set-${title}`}
        onClick={() => {
          if (title === 'County Filters') {
            setSelected([{ id: 34, label: 'Teleorman (34)' }]);
            return;
          }

          setSelected([{ id: 3, label: 'Sud (3)' }]);
        }}
      >
        Set {title}
      </button>
      <button
        type="button"
        aria-label={`clear-${title}`}
        onClick={() => setSelected([])}
      >
        Clear {title}
      </button>
    </div>
  ),
}));

describe('AdvancedMapAnalyticsSeriesEditorModal', () => {
  beforeEach(() => {
    linkPropsSpy.mockReset();
  });

  it('renders population/county/region sections for geojson editor', () => {
    const geojsonSeries = createDefaultAdvancedMapAnalyticsSeries('geojson-dataset-series');
    if (geojsonSeries.type !== 'geojson-dataset-series') {
      throw new Error('Unexpected series type in test setup');
    }

    render(
      <AdvancedMapAnalyticsSeriesEditorModal
        open={true}
        mode="edit"
        series={geojsonSeries}
        allSeries={[geojsonSeries]}
        geoJsonCountyOptions={[
          { id: 1, name: 'Alba' },
          { id: 2, name: 'Arad' },
        ]}
        geoJsonRegionOptions={[
          { id: 7, name: 'Centru' },
          { id: 8, name: 'Bucuresti-Ilfov' },
        ]}
        onOpenChange={vi.fn()}
        onUpdateSeries={vi.fn()}
        onChangeSeriesType={vi.fn()}
      />
    );

    expect(screen.getByText('Population')).toBeInTheDocument();
    expect(screen.getByText('County Filters')).toBeInTheDocument();
    expect(screen.getByText('Region Filters')).toBeInTheDocument();
    expect(screen.getByText('INS Population 2021')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'set-County Filters' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'set-Region Filters' })).toBeInTheDocument();
    expect(screen.queryByText('Open Table')).not.toBeInTheDocument();
    expect(screen.queryByText('Open Chart')).not.toBeInTheDocument();
  });

  it('updates county filters with multiselect and supports clear all', () => {
    const geojsonSeries = createDefaultAdvancedMapAnalyticsSeries('geojson-dataset-series');
    if (geojsonSeries.type !== 'geojson-dataset-series') {
      throw new Error('Unexpected series type in test setup');
    }

    const onUpdateSeries = vi.fn();
    render(
      <AdvancedMapAnalyticsSeriesEditorModal
        open={true}
        mode="edit"
        series={geojsonSeries}
        allSeries={[geojsonSeries]}
        geoJsonCountyOptions={[
          { id: 34, name: 'Teleorman' },
          { id: 28, name: 'Olt' },
        ]}
        geoJsonRegionOptions={[
          { id: 3, name: 'Sud' },
          { id: 4, name: 'Sud-Vest' },
        ]}
        onOpenChange={vi.fn()}
        onUpdateSeries={onUpdateSeries}
        onChangeSeriesType={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'set-County Filters' }));

    expect(onUpdateSeries).toHaveBeenCalledTimes(1);
    expect(onUpdateSeries.mock.calls[0]?.[0]).toBe(geojsonSeries.id);

    const updater = onUpdateSeries.mock.calls[0]?.[1] as ((draft: typeof geojsonSeries) => void);
    const draftAfterSelect = { ...geojsonSeries };
    updater(draftAfterSelect);

    expect(draftAfterSelect.datasetKey).toBe('insPop2021');
    expect(draftAfterSelect.countyFilterIds).toEqual([34]);

    fireEvent.click(screen.getByRole('button', { name: 'clear-County Filters' }));

    expect(onUpdateSeries).toHaveBeenCalledTimes(2);
    const clearUpdater = onUpdateSeries.mock.calls[1]?.[1] as ((draft: typeof geojsonSeries) => void);
    const draftAfterClear = { ...geojsonSeries, countyFilterIds: [34] };
    clearUpdater(draftAfterClear);

    expect(draftAfterClear.datasetKey).toBe('insPop2021');
    expect(draftAfterClear.countyFilterIds).toEqual([]);
  });

  it('renders execution quick links in header and preserves execution series config', () => {
    const executionSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    if (executionSeries.type !== 'line-items-aggregated-yearly') {
      throw new Error('Unexpected series type in test setup');
    }

    render(
      <AdvancedMapAnalyticsSeriesEditorModal
        open={true}
        mode="edit"
        series={executionSeries}
        allSeries={[executionSeries]}
        onOpenChange={vi.fn()}
        onUpdateSeries={vi.fn()}
        onChangeSeriesType={vi.fn()}
      />
    );

    expect(screen.getByText('Open Table')).toBeInTheDocument();
    expect(screen.getByText('Open Chart')).toBeInTheDocument();

    const allLinkProps = linkPropsSpy.mock.calls.map((call) => call[0] as Record<string, unknown>);
    const tableLinkProps = allLinkProps.find(
      (props) => props['data-testid'] === 'advanced-map-analytics-open-table-link'
    );
    const chartLinkProps = allLinkProps.find(
      (props) => props['data-testid'] === 'advanced-map-analytics-open-chart-link'
    );

    expect(tableLinkProps).toBeDefined();
    expect(chartLinkProps).toBeDefined();

    expect(tableLinkProps?.target).toBe('_blank');
    expect(tableLinkProps?.rel).toBe('noopener noreferrer');
    expect(tableLinkProps?.to).toBe('/entity-analytics');

    const tableSearch = tableLinkProps?.search as Record<string, unknown>;
    expect(tableSearch.view).toBe('table');
    expect(tableSearch.page).toBe(1);
    expect(tableSearch.pageSize).toBe(25);
    expect(tableSearch.filter).toEqual(executionSeries.filter);

    expect(chartLinkProps?.target).toBe('_blank');
    expect(chartLinkProps?.rel).toBe('noopener noreferrer');
    expect(chartLinkProps?.to).toBe('/charts/$chartId');

    const chartParams = chartLinkProps?.params as Record<string, unknown>;
    const chartSearch = chartLinkProps?.search as Record<string, any>;
    expect(chartParams.chartId).toBe(chartSearch.chart.id);
    expect(chartSearch.view).toBe('overview');
    expect(chartSearch.chart.series).toHaveLength(1);
    expect(chartSearch.chart.series[0].type).toBe('line-items-aggregated-yearly');
    expect(chartSearch.chart.series[0].filter).toEqual(executionSeries.filter);
    expect(chartSearch.chart.series[0].label).toBe(executionSeries.label);
    expect(chartSearch.chart.series[0].config.color).toBe(executionSeries.config.color);
  });
});
