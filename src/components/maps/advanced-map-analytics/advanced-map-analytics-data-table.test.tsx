import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  AdvancedMapAnalyticsDataTable,
} from './advanced-map-analytics-data-table';
import { paginateAdvancedMapAnalyticsTableRows } from './advanced-map-analytics-table-pagination';
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

  function getRankValueByUatName(uatName: string): string {
    const row = screen.getByText(uatName).closest('tr');
    if (!row) {
      throw new Error(`Expected row for UAT "${uatName}".`);
    }

    const cells = within(row).getAllByRole('cell');
    return cells[0]?.textContent?.trim() ?? '';
  }

  function getVisibleUatOrder(): string[] {
    const rowsWithCells = screen
      .getAllByRole('row')
      .filter((row) => within(row).queryAllByRole('cell').length > 0);

    return rowsWithCells
      .map((row) => {
        const cells = within(row).getAllByRole('cell');
        return cells[1]?.textContent?.trim() ?? '';
      })
      .filter((value) => value.length > 0);
  }

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

  it('renders row rank by active-series descending order', () => {
    render(
      <AdvancedMapAnalyticsDataTable
        rows={[
          {
            sirutaCode: '4',
            uatName: 'Gamma',
            countyName: 'County 4',
            valuesBySeriesId: {
              'series-active': 100,
              'series-secondary': 20,
            },
          },
          {
            sirutaCode: '1',
            uatName: 'Alpha',
            countyName: 'County 1',
            valuesBySeriesId: {
              'series-active': 300,
              'series-secondary': 50,
            },
          },
          {
            sirutaCode: '2',
            uatName: 'beta',
            countyName: 'County 2',
            valuesBySeriesId: {
              'series-active': 300,
              'series-secondary': 10,
            },
          },
          {
            sirutaCode: '3',
            uatName: 'No Value',
            countyName: 'County 3',
            valuesBySeriesId: {
              'series-active': undefined,
              'series-secondary': 30,
            },
          },
        ]}
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

    expect(getRankValueByUatName('Alpha')).toBe('1');
    expect(getRankValueByUatName('beta')).toBe('2');
    expect(getRankValueByUatName('Gamma')).toBe('3');
    expect(getRankValueByUatName('No Value')).toBe('-');
  });

  it('auto-sorts table rows by active series descending', () => {
    render(
      <AdvancedMapAnalyticsDataTable
        rows={[
          {
            sirutaCode: '1',
            uatName: 'Alpha',
            countyName: 'County 1',
            valuesBySeriesId: {
              'series-active': 100,
              'series-secondary': 5,
            },
          },
          {
            sirutaCode: '2',
            uatName: 'Beta',
            countyName: 'County 2',
            valuesBySeriesId: {
              'series-active': 300,
              'series-secondary': 10,
            },
          },
          {
            sirutaCode: '3',
            uatName: 'Gamma',
            countyName: 'County 3',
            valuesBySeriesId: {
              'series-active': 200,
              'series-secondary': 15,
            },
          },
        ]}
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

    expect(getVisibleUatOrder()).toEqual(['Beta', 'Gamma', 'Alpha']);
  });

  it('renders series columns in the same order as provided series', () => {
    const customSeriesColumns: AdvancedMapAnalyticsTableSeriesColumn[] = [
      { id: 'series-secondary', label: 'INS Population', unit: undefined },
      { id: 'series-active', label: 'Execution analytics', unit: 'RON' },
    ];

    render(
      <AdvancedMapAnalyticsDataTable
        rows={rows}
        seriesColumns={customSeriesColumns}
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

    const headerTexts = screen.getAllByRole('columnheader').map((header) =>
      (header.textContent ?? '').replace(/\s+/g, ' ').trim()
    );
    const secondarySeriesIndex = headerTexts.findIndex((headerText) =>
      headerText.includes('INS Population')
    );
    const activeSeriesIndex = headerTexts.findIndex((headerText) =>
      headerText.includes('Execution analytics (active)')
    );

    expect(secondarySeriesIndex).toBeGreaterThan(-1);
    expect(activeSeriesIndex).toBeGreaterThan(-1);
    expect(secondarySeriesIndex).toBeLessThan(activeSeriesIndex);
  });

  it('keeps rank tied to active-series order when sorting by a different series', () => {
    render(
      <AdvancedMapAnalyticsDataTable
        rows={[
          {
            sirutaCode: '1',
            uatName: 'Alpha',
            countyName: 'County 1',
            valuesBySeriesId: {
              'series-active': 100,
              'series-secondary': 1,
            },
          },
          {
            sirutaCode: '2',
            uatName: 'Beta',
            countyName: 'County 2',
            valuesBySeriesId: {
              'series-active': 300,
              'series-secondary': 3,
            },
          },
          {
            sirutaCode: '3',
            uatName: 'Gamma',
            countyName: 'County 3',
            valuesBySeriesId: {
              'series-active': 200,
              'series-secondary': 2,
            },
          },
        ]}
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

    expect(getRankValueByUatName('Beta')).toBe('1');
    expect(getRankValueByUatName('Gamma')).toBe('2');
    expect(getRankValueByUatName('Alpha')).toBe('3');

    fireEvent.click(screen.getByRole('button', { name: 'INS Population' }));

    expect(getRankValueByUatName('Beta')).toBe('1');
    expect(getRankValueByUatName('Gamma')).toBe('2');
    expect(getRankValueByUatName('Alpha')).toBe('3');
  });

  it('filters rows by UAT/entity name only with case-insensitive search', () => {
    render(
      <AdvancedMapAnalyticsDataTable
        rows={[
          {
            sirutaCode: '1',
            uatName: 'Alpha City',
            countyName: 'County One',
            valuesBySeriesId: {
              'series-active': 10,
              'series-secondary': 1,
            },
          },
          {
            sirutaCode: '2',
            uatName: 'Beta Village',
            countyName: 'Alpha County',
            valuesBySeriesId: {
              'series-active': 20,
              'series-secondary': 2,
            },
          },
        ]}
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

    fireEvent.change(screen.getByRole('textbox', { name: 'Search entity name' }), {
      target: { value: 'ALPHA' },
    });

    expect(screen.getByText('Alpha City')).toBeInTheDocument();
    expect(screen.queryByText('Beta Village')).not.toBeInTheDocument();
  });

  it('keeps global rank values when search narrows visible rows', () => {
    render(
      <AdvancedMapAnalyticsDataTable
        rows={[
          {
            sirutaCode: '1',
            uatName: 'Alpha',
            countyName: 'County 1',
            valuesBySeriesId: {
              'series-active': 300,
              'series-secondary': 0,
            },
          },
          {
            sirutaCode: '2',
            uatName: 'Beta',
            countyName: 'County 2',
            valuesBySeriesId: {
              'series-active': 200,
              'series-secondary': 0,
            },
          },
          {
            sirutaCode: '3',
            uatName: 'Gamma',
            countyName: 'County 3',
            valuesBySeriesId: {
              'series-active': 100,
              'series-secondary': 0,
            },
          },
        ]}
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

    fireEvent.change(screen.getByRole('textbox', { name: 'Search entity name' }), {
      target: { value: 'ma' },
    });

    expect(screen.getByText('Gamma')).toBeInTheDocument();
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
    expect(screen.queryByText('Beta')).not.toBeInTheDocument();
    expect(getRankValueByUatName('Gamma')).toBe('3');
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

  it('searches member UAT rows while keeping the parent group visible', () => {
    render(
      <AdvancedMapAnalyticsDataTable
        rows={[
          {
            rowId: 'group:manual:grp_1',
            kind: 'group',
            sirutaCode: 'grp_1',
            uatName: 'Group 1',
            countyName: 'Manual groups',
            groupId: 'grp_1',
            groupLabel: 'Group 1',
            memberCount: 2,
            valuesBySeriesId: { 'series-active': 30 },
          },
          {
            rowId: 'group-member:manual:grp_1:1001',
            kind: 'group-member',
            parentRowId: 'group:manual:grp_1',
            sirutaCode: '1001',
            uatName: 'Alpha',
            countyName: 'Alba',
            groupId: 'grp_1',
            groupLabel: 'Group 1',
            valuesBySeriesId: { 'series-active': 10 },
            searchText: 'alpha 1001',
          },
          {
            rowId: 'group-member:manual:grp_1:1002',
            kind: 'group-member',
            parentRowId: 'group:manual:grp_1',
            sirutaCode: '1002',
            uatName: 'Beta',
            countyName: 'Bihor',
            groupId: 'grp_1',
            groupLabel: 'Group 1',
            valuesBySeriesId: { 'series-active': 20 },
            searchText: 'beta 1002',
          },
        ]}
        seriesColumns={seriesColumns}
        mapTitle="Demo map"
        showExportCsv={false}
        activeSeriesId="series-active"
        rowMode="group_rows_with_members"
        groupedRowModesAvailable={true}
        binsFilterSections={binsFilterSections}
        onToggleBinFilter={vi.fn()}
        onClearPresetBinFilters={vi.fn()}
        onClearAllBinFilters={vi.fn()}
        hasActiveBinFilters={false}
      />
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'Search group or UAT' }), {
      target: { value: 'beta' },
    });

    expect(screen.getByText('Group 1')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
  });

  it('sorts grouped rows by group value while keeping members nested', () => {
    render(
      <AdvancedMapAnalyticsDataTable
        rows={[
          {
            rowId: 'group:manual:low',
            kind: 'group',
            sirutaCode: 'low',
            uatName: 'Low group',
            countyName: 'Manual groups',
            groupId: 'low',
            groupLabel: 'Low group',
            memberCount: 1,
            valuesBySeriesId: { 'series-active': 10 },
          },
          {
            rowId: 'group-member:manual:low:1001',
            kind: 'group-member',
            parentRowId: 'group:manual:low',
            sirutaCode: '1001',
            uatName: 'Low member',
            countyName: 'Alba',
            groupId: 'low',
            groupLabel: 'Low group',
            valuesBySeriesId: { 'series-active': 10 },
          },
          {
            rowId: 'group:manual:high',
            kind: 'group',
            sirutaCode: 'high',
            uatName: 'High group',
            countyName: 'Manual groups',
            groupId: 'high',
            groupLabel: 'High group',
            memberCount: 1,
            valuesBySeriesId: { 'series-active': 30 },
          },
          {
            rowId: 'group-member:manual:high:1002',
            kind: 'group-member',
            parentRowId: 'group:manual:high',
            sirutaCode: '1002',
            uatName: 'High member',
            countyName: 'Bihor',
            groupId: 'high',
            groupLabel: 'High group',
            valuesBySeriesId: { 'series-active': 30 },
          },
        ]}
        seriesColumns={seriesColumns}
        mapTitle="Demo map"
        showExportCsv={false}
        activeSeriesId="series-active"
        rowMode="group_rows_with_members"
        groupedRowModesAvailable={true}
        binsFilterSections={binsFilterSections}
        onToggleBinFilter={vi.fn()}
        onClearPresetBinFilters={vi.fn()}
        onClearAllBinFilters={vi.fn()}
        hasActiveBinFilters={false}
      />
    );

    const bodyRows = screen
      .getAllByRole('row')
      .filter((row) => within(row).queryAllByRole('cell').length > 0);
    const labels = bodyRows.map((row) => within(row).getAllByRole('cell')[1]?.textContent ?? '');
    const ranks = bodyRows.map((row) => within(row).getAllByRole('cell')[0]?.textContent?.trim() ?? '');

    expect(labels[0]).toContain('High group');
    expect(labels[1]).toContain('High member');
    expect(labels[2]).toContain('Low group');
    expect(labels[3]).toContain('Low member');
    expect(ranks).toEqual(['1', '1.1', '2', '2.1']);
  });

  it('paginates grouped rows by parent group blocks', () => {
    const groupedRows: AdvancedMapAnalyticsTableRow[] = [
      {
        rowId: 'group:manual:first',
        kind: 'group',
        sirutaCode: 'first',
        uatName: 'First group',
        countyName: 'Manual groups',
        groupId: 'first',
        groupLabel: 'First group',
        valuesBySeriesId: { 'series-active': 20 },
      },
      {
        rowId: 'group-member:manual:first:1001',
        kind: 'group-member',
        parentRowId: 'group:manual:first',
        sirutaCode: '1001',
        uatName: 'First member',
        countyName: 'Alba',
        groupId: 'first',
        groupLabel: 'First group',
        valuesBySeriesId: { 'series-active': 20 },
      },
      {
        rowId: 'group:manual:second',
        kind: 'group',
        sirutaCode: 'second',
        uatName: 'Second group',
        countyName: 'Manual groups',
        groupId: 'second',
        groupLabel: 'Second group',
        valuesBySeriesId: { 'series-active': 10 },
      },
      {
        rowId: 'group-member:manual:second:1002',
        kind: 'group-member',
        parentRowId: 'group:manual:second',
        sirutaCode: '1002',
        uatName: 'Second member',
        countyName: 'Bihor',
        groupId: 'second',
        groupLabel: 'Second group',
        valuesBySeriesId: { 'series-active': 10 },
      },
    ];

    expect(
      paginateAdvancedMapAnalyticsTableRows(
        groupedRows,
        'group_rows_with_members',
        0,
        1
      ).map((row) => row.uatName)
    ).toEqual(['First group', 'First member']);
    expect(
      paginateAdvancedMapAnalyticsTableRows(
        groupedRows,
        'group_rows_with_members',
        1,
        1
      ).map((row) => row.uatName)
    ).toEqual(['Second group', 'Second member']);
  });

  it('exposes grouped row view controls', async () => {
    const onRowModeChange = vi.fn();
    const onShowMemberValuesChange = vi.fn();

    render(
      <AdvancedMapAnalyticsDataTable
        rows={rows}
        seriesColumns={seriesColumns}
        mapTitle="Demo map"
        showExportCsv={false}
        activeSeriesId="series-active"
        rowMode="group_rows_with_members"
        onRowModeChange={onRowModeChange}
        groupedRowModesAvailable={true}
        showMemberValues={true}
        onShowMemberValuesChange={onShowMemberValuesChange}
        binsFilterSections={binsFilterSections}
        onToggleBinFilter={vi.fn()}
        onClearPresetBinFilters={vi.fn()}
        onClearAllBinFilters={vi.fn()}
        hasActiveBinFilters={false}
      />
    );

    fireEvent.pointerDown(screen.getByRole('button', { name: 'View' }));
    fireEvent.click(await screen.findByRole('menuitemcheckbox', { name: 'Show member values' }));
    expect(onShowMemberValuesChange).toHaveBeenCalledWith(false);

    fireEvent.pointerDown(screen.getByRole('button', { name: 'View' }));
    fireEvent.click(await screen.findByRole('menuitemcheckbox', { name: 'Groups' }));
    expect(onRowModeChange).toHaveBeenCalledWith('group_rows');
  });
});
