import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  AdvancedMapAnalyticsDataTable,
} from './advanced-map-analytics-data-table';
import type {
  AdvancedMapAnalyticsBinsFilterSection,
  AdvancedMapAnalyticsTableRow,
  AdvancedMapAnalyticsTableSeriesColumn,
} from './advanced-map-analytics-table-types';

describe('AdvancedMapAnalyticsDataTable', () => {
  const seriesColumns: AdvancedMapAnalyticsTableSeriesColumn[] = [
    { id: 'series-active', label: 'Execution analytics', unit: 'RON' },
    { id: 'series-secondary', label: 'INS Population', unit: undefined },
  ];

  const rows: AdvancedMapAnalyticsTableRow[] = [
    {
      sirutaCode: '12345',
      uatName: 'Demo UAT',
      countyName: 'Cluj',
      valuesBySeriesId: {
        'series-active': 1500,
        'series-secondary': undefined,
      },
    },
  ];

  const binsFilterSections: AdvancedMapAnalyticsBinsFilterSection[] = [
    {
      presetId: 'preset-1',
      presetLabel: 'Preset 1',
      options: [
        { groupId: 'G1', label: '0-1000', color: '#ff0000', checked: true },
        { groupId: 'NO_DATA', label: 'Fara date', color: '#cccccc', checked: false },
      ],
    },
  ];

  it('renders static and dynamic columns and formats missing values', () => {
    render(
      <AdvancedMapAnalyticsDataTable
        rows={rows}
        seriesColumns={seriesColumns}
        activeSeriesId="series-active"
        binsFilterSections={binsFilterSections}
        onToggleBinFilter={vi.fn()}
        onClearPresetBinFilters={vi.fn()}
        onClearAllBinFilters={vi.fn()}
        hasActiveBinFilters={false}
      />
    );

    expect(screen.getByText('UAT')).toBeInTheDocument();
    expect(screen.getByText('County')).toBeInTheDocument();
    expect(screen.getByText('SIRUTA')).toBeInTheDocument();
    expect(screen.getByText('Execution analytics (active)')).toBeInTheDocument();
    expect(screen.getByText('INS Population')).toBeInTheDocument();
    expect(screen.getByText('Missing')).toBeInTheDocument();
  });

  it('calls onRowClick only when entity CUI is available', () => {
    const onRowClick = vi.fn();
    render(
      <AdvancedMapAnalyticsDataTable
        rows={[
          {
            ...rows[0],
            entityCui: '12345678',
          },
        ]}
        seriesColumns={seriesColumns}
        activeSeriesId="series-active"
        onRowClick={onRowClick}
        binsFilterSections={binsFilterSections}
        onToggleBinFilter={vi.fn()}
        onClearPresetBinFilters={vi.fn()}
        onClearAllBinFilters={vi.fn()}
        hasActiveBinFilters={false}
      />
    );

    const row = screen.getByText('Demo UAT').closest('tr');
    expect(row).not.toBeNull();
    fireEvent.click(row as HTMLElement);

    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick.mock.calls[0]?.[0]?.entityCui).toBe('12345678');
  });

  it('does not call onRowClick when entity CUI is missing', () => {
    const onRowClick = vi.fn();
    render(
      <AdvancedMapAnalyticsDataTable
        rows={rows}
        seriesColumns={seriesColumns}
        activeSeriesId="series-active"
        onRowClick={onRowClick}
        binsFilterSections={binsFilterSections}
        onToggleBinFilter={vi.fn()}
        onClearPresetBinFilters={vi.fn()}
        onClearAllBinFilters={vi.fn()}
        hasActiveBinFilters={false}
      />
    );

    const row = screen.getByText('Demo UAT').closest('tr');
    expect(row).not.toBeNull();
    fireEvent.click(row as HTMLElement);

    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('renders bins sections in Filter menu and triggers callbacks', async () => {
    const onToggleBinFilter = vi.fn();
    const onClearPresetBinFilters = vi.fn();
    const onClearAllBinFilters = vi.fn();

    render(
      <AdvancedMapAnalyticsDataTable
        rows={rows}
        seriesColumns={seriesColumns}
        activeSeriesId="series-active"
        binsFilterSections={binsFilterSections}
        onToggleBinFilter={onToggleBinFilter}
        onClearPresetBinFilters={onClearPresetBinFilters}
        onClearAllBinFilters={onClearAllBinFilters}
        hasActiveBinFilters={true}
      />
    );

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Filter' }));

    expect(await screen.findByText('Bins')).toBeInTheDocument();
    expect(screen.getByText('Preset 1')).toBeInTheDocument();
    expect(screen.getByText('0-1000')).toBeInTheDocument();
    expect(screen.getByText('Fara date')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: '0-1000' }));
    expect(onToggleBinFilter).toHaveBeenCalledWith('preset-1', 'G1', false);

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onClearPresetBinFilters).toHaveBeenCalledWith('preset-1');

    fireEvent.click(screen.getByRole('menuitem', { name: 'Clear all filters' }));
    expect(onClearAllBinFilters).toHaveBeenCalledTimes(1);
  });
});
