import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { MapAnalyticsEntityDetailsPanel } from './map-analytics-entity-details-panel';

class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

globalThis.ResizeObserver = ResizeObserverMock;

describe('MapAnalyticsEntityDetailsPanel', () => {
  it('separates group context values from selected UAT values', () => {
    render(
      <MapAnalyticsEntityDetailsPanel
        isMobile={false}
        isProfileLoading={false}
        onClose={vi.fn()}
        profile={null}
        selection={{
          countyName: 'Ialomita',
          entityCui: '4231938',
          sirutaCode: '100923',
          title: 'Comuna Axintele',
          uatName: 'Axintele',
        }}
        seriesRows={[
          {
            id: 'series_1',
            isActive: true,
            label: 'Population',
            value: '8.15k inhabitants',
          },
        ]}
        groupContext={{
          groupLabel: 'Puiesti cluster',
          groupSeriesRows: [
            {
              id: 'series_1',
              isActive: true,
              label: 'Population',
              value: '31.2k inhabitants',
            },
          ],
          memberCount: 4,
          memberRows: [
            {
              label: 'Axintele',
              sirutaCode: '100923',
              value: 8150,
              formattedValue: '8.15k inhabitants',
              isSelected: true,
            },
            {
              label: 'Balaciu',
              sirutaCode: '101010',
              value: 12000,
              formattedValue: '12k inhabitants',
              isSelected: false,
            },
          ],
          memberPreviewLabels: ['Axintele', 'Balaciu', 'Cocora'],
          primaryUatName: 'Axintele',
          selectedUatName: 'Axintele',
          uatSeriesRows: [
            {
              id: 'series_1',
              isActive: true,
              label: 'Population',
              value: '8.15k inhabitants',
            },
          ],
          workspaceLabel: 'Manual groups',
        }}
      />
    );

    expect(screen.getByText('Group context')).toBeInTheDocument();
    expect(screen.getByText('Puiesti cluster')).toBeInTheDocument();
    expect(screen.getByText('Manual groups')).toBeInTheDocument();
    expect(screen.getByText('4 UATs')).toBeInTheDocument();
    expect(screen.getByText('Values')).toBeInTheDocument();
    expect(screen.getByText('Group')).toBeInTheDocument();
    expect(screen.getAllByText('Selected UAT')).toHaveLength(2);
    expect(screen.getByText('31.2k inhabitants')).toBeInTheDocument();
    expect(screen.getAllByText('8.15k inhabitants').length).toBeGreaterThanOrEqual(1);
  });

  it('expands group context to show group value first and UATs sorted by value', async () => {
    const user = userEvent.setup();

    render(
      <MapAnalyticsEntityDetailsPanel
        isMobile={false}
        isProfileLoading={false}
        onClose={vi.fn()}
        profile={null}
        selection={{
          countyName: 'Ialomita',
          entityCui: '4231938',
          sirutaCode: '100923',
          title: 'Comuna Axintele',
          uatName: 'Axintele',
        }}
        seriesRows={[]}
        groupContext={{
          groupLabel: 'Puiesti cluster',
          groupSeriesRows: [
            {
              id: 'series_1',
              isActive: true,
              label: 'Population',
              value: '31.2k inhabitants',
            },
          ],
          memberCount: 2,
          memberRows: [
            {
              label: 'Axintele',
              sirutaCode: '100923',
              value: 8150,
              formattedValue: '8.15k inhabitants',
              isSelected: true,
            },
            {
              label: 'Balaciu',
              sirutaCode: '101010',
              value: 12000,
              formattedValue: '12k inhabitants',
              isSelected: false,
            },
          ],
          selectedUatName: 'Axintele',
          uatSeriesRows: [],
          workspaceLabel: 'Manual groups',
        }}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Show more' }));

    const expandedRows = screen
      .getAllByText(/Puiesti cluster|Balaciu|^Axintele$/)
      .map((row) => row.textContent);
    expect(expandedRows).toEqual([
      'Puiesti cluster',
      'Puiesti cluster',
      'Balaciu',
      'Axintele',
    ]);
  });

  it('shows filtered group state without hiding member values', async () => {
    const user = userEvent.setup();

    render(
      <MapAnalyticsEntityDetailsPanel
        isMobile={false}
        isProfileLoading={false}
        onClose={vi.fn()}
        profile={null}
        selection={{
          countyName: 'Ialomita',
          entityCui: '4231938',
          sirutaCode: '100923',
          title: 'Comuna Axintele',
          uatName: 'Axintele',
        }}
        seriesRows={[]}
        groupContext={{
          groupLabel: 'Puiesti cluster',
          groupSeriesRows: [
            {
              id: 'series_1',
              isActive: true,
              label: 'Population',
              value: 'Filtered out',
              unfilteredValue: '31.2k inhabitants',
              isFilteredOut: true,
            },
          ],
          memberCount: 2,
          memberRows: [
            {
              label: 'Axintele',
              sirutaCode: '100923',
              value: 8150,
              formattedValue: '8.15k inhabitants',
              isSelected: true,
            },
            {
              label: 'Balaciu',
              sirutaCode: '101010',
              value: 12000,
              formattedValue: '12k inhabitants',
              isSelected: false,
            },
          ],
          selectedUatName: 'Axintele',
          uatSeriesRows: [
            {
              id: 'series_1',
              isActive: true,
              label: 'Population',
              value: '8.15k inhabitants',
            },
          ],
          workspaceLabel: 'Manual groups',
        }}
      />
    );

    expect(screen.getAllByText('Filtered out').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('31.2k inhabitants')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show more' }));

    expect(screen.getByText('Group value · Filtered out')).toBeInTheDocument();
    expect(screen.getByText('12k inhabitants')).toBeInTheDocument();
    expect(screen.getAllByText('8.15k inhabitants').length).toBeGreaterThanOrEqual(1);
  });

  it('keeps the desktop close action available', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <MapAnalyticsEntityDetailsPanel
        isMobile={false}
        isProfileLoading={false}
        onClose={onClose}
        profile={null}
        selection={{
          countyName: 'Ialomita',
          entityCui: '4231938',
          sirutaCode: '100923',
          title: 'Comuna Axintele',
          uatName: 'Axintele',
        }}
        seriesRows={[]}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Close details' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
