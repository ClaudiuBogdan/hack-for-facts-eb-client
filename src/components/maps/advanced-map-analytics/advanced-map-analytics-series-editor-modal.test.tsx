import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createDefaultAdvancedMapAnalyticsSeries } from '@/schemas/advanced-map-analytics';
import { AdvancedMapAnalyticsSeriesEditorModal } from './advanced-map-analytics-series-editor-modal';

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
});
