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
        mapTitle="Demo map"
        showExportCsv={false}
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
        mapTitle="Demo map"
        showExportCsv={false}
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
        mapTitle="Demo map"
        showExportCsv={false}
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
        mapTitle="Demo map"
        showExportCsv={false}
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

  it('renders Export CSV button only when enabled', () => {
    const { rerender } = render(
      <AdvancedMapAnalyticsDataTable
        rows={rows}
        seriesColumns={seriesColumns}
        mapTitle="Demo map"
        showExportCsv={false}
        activeSeriesId="series-active"
        binsFilterSections={binsFilterSections}
        onToggleBinFilter={vi.fn()}
        onClearPresetBinFilters={vi.fn()}
        onClearAllBinFilters={vi.fn()}
        hasActiveBinFilters={false}
      />
    );

    expect(screen.queryByRole('button', { name: 'Export CSV' })).not.toBeInTheDocument();

    rerender(
      <AdvancedMapAnalyticsDataTable
        rows={rows}
        seriesColumns={seriesColumns}
        mapTitle="Demo map"
        showExportCsv={true}
        activeSeriesId="series-active"
        binsFilterSections={binsFilterSections}
        onToggleBinFilter={vi.fn()}
        onClearPresetBinFilters={vi.fn()}
        onClearAllBinFilters={vi.fn()}
        hasActiveBinFilters={false}
      />
    );

    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeInTheDocument();
  });

  it('exports sorted visible columns as CSV', async () => {
    const exportRows: AdvancedMapAnalyticsTableRow[] = [
      {
        sirutaCode: '200',
        uatName: 'Zeta, "Town"',
        countyName: 'Y County',
        entityCui: '87654321',
        valuesBySeriesId: {
          'series-active': 300,
          'series-secondary': 5,
        },
      },
      {
        sirutaCode: '100',
        uatName: 'Alpha\nCity',
        countyName: 'A County',
        valuesBySeriesId: {
          'series-active': 100,
          'series-secondary': undefined,
        },
      },
    ];

    const createObjectURLMock = vi.fn((_blob: Blob) => 'blob:advanced-map-analytics-table');
    const revokeObjectURLMock = vi.fn((_url: string) => undefined);
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: createObjectURLMock,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: revokeObjectURLMock,
    });

    let createdAnchor: HTMLAnchorElement | undefined;
    const anchorClickMock = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation(((tagName: string, options?: ElementCreationOptions) => {
        const element = originalCreateElement(tagName, options);
        if (tagName.toLowerCase() === 'a') {
          createdAnchor = element as HTMLAnchorElement;
          createdAnchor.click = anchorClickMock;
        }
        return element;
      }) as typeof document.createElement);

    try {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-03-02T03:17:19Z'));

      render(
        <AdvancedMapAnalyticsDataTable
          rows={exportRows}
          seriesColumns={seriesColumns}
          mapTitle="Public Budget Map"
          showExportCsv={true}
          activeSeriesId="series-active"
          binsFilterSections={binsFilterSections}
          onToggleBinFilter={vi.fn()}
          onClearPresetBinFilters={vi.fn()}
          onClearAllBinFilters={vi.fn()}
          hasActiveBinFilters={false}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'County' }));
      fireEvent.pointerDown(screen.getByRole('button', { name: 'View' }));
      fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'SIRUTA' }));

      fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));

      expect(createObjectURLMock).toHaveBeenCalledTimes(1);
      const csvBlob = createObjectURLMock.mock.calls[0]?.[0];
      expect(csvBlob).toBeInstanceOf(Blob);
      if (!(csvBlob instanceof Blob)) {
        throw new Error('Expected CSV export to create a Blob.');
      }
      const csvContent = await csvBlob.text();
      expect(csvContent).toBe(
        [
          'SIRUTA,CUI,UAT,County,Execution analytics,INS Population',
          '100,,"Alpha\nCity",A County,100,',
          '200,87654321,"Zeta, ""Town""",Y County,300,5',
        ].join('\n')
      );

      expect(createdAnchor).toBeDefined();
      expect(createdAnchor?.download).toBe('map-public-budget-map-20260302-031719.csv');
      expect(createdAnchor?.href).toBe('blob:advanced-map-analytics-table');
      expect(anchorClickMock).toHaveBeenCalledTimes(1);
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:advanced-map-analytics-table');
    } finally {
      vi.useRealTimers();
      createElementSpy.mockRestore();
      if (originalCreateObjectURL) {
        Object.defineProperty(URL, 'createObjectURL', {
          configurable: true,
          writable: true,
          value: originalCreateObjectURL,
        });
      } else {
        delete (URL as unknown as Record<string, unknown>).createObjectURL;
      }
      if (originalRevokeObjectURL) {
        Object.defineProperty(URL, 'revokeObjectURL', {
          configurable: true,
          writable: true,
          value: originalRevokeObjectURL,
        });
      } else {
        delete (URL as unknown as Record<string, unknown>).revokeObjectURL;
      }
    }
  });
});
