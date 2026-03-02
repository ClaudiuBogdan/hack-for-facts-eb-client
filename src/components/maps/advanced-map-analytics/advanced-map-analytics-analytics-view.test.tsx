import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  createDefaultAdvancedMapAnalyticsSeries,
  createDefaultAdvancedMapAnalyticsWidgets,
  type AdvancedMapAnalyticsWidget,
  type MapSupportedSeries,
} from '@/schemas/advanced-map-analytics';
import { AdvancedMapAnalyticsAnalyticsView } from './advanced-map-analytics-analytics-view';

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({
    children,
    onDragEnd,
  }: {
    children: React.ReactNode;
    onDragEnd?: (event: { active: { id: string }; over: { id: string } | null }) => void;
  }) => (
    <div>
      <button
        type="button"
        data-testid="trigger-reorder"
        onClick={() =>
          onDragEnd?.({
            active: { id: 'series_totals' },
            over: { id: 'series_coverage' },
          })
        }
      >
        Trigger reorder
      </button>
      {children}
    </div>
  ),
  PointerSensor: class PointerSensor {},
  KeyboardSensor: class KeyboardSensor {},
  closestCenter: vi.fn(),
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => []),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  verticalListSortingStrategy: vi.fn(),
  sortableKeyboardCoordinates: vi.fn(),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => undefined,
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => '',
    },
  },
}));

vi.mock('recharts', () => ({
  BarChart: ({ children, data }: { children: React.ReactNode; data: unknown[] }) => (
    <div data-testid="bar-chart" data-item-count={data?.length}>{children}</div>
  ),
  Bar: ({ dataKey }: { dataKey: string }) => <div data-testid="bar" data-key={dataKey} />,
  ScatterChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scatter-chart">{children}</div>
  ),
  Scatter: ({ data }: { data: unknown[] }) => <div data-testid="scatter" data-item-count={data?.length} />,
  ZAxis: () => <div data-testid="z-axis" />,
  XAxis: ({ dataKey }: { dataKey: string }) => <div data-testid="x-axis" data-key={dataKey} />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

vi.mock('@/components/ui/toggle-group', () => ({
  ToggleGroup: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (value: string) => void;
  }) => (
    <div data-testid="toggle-group" data-value={value} onClick={() => onValueChange?.('table')}>
      {children}
    </div>
  ),
  ToggleGroupItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <button type="button" data-value={value}>{children}</button>,
}));

vi.mock('@/components/charts/safe-responsive-container', () => ({
  SafeResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}));

vi.mock('@/components/charts/components/chart-renderer/color-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/charts/components/chart-renderer/color-utils')>();
  return {
    ...actual,
    getSeriesColor: (index: number) => `#color-${index}`,
  };
});

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open?: boolean;
  }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open?: boolean;
  }) => (open ? <div>{children}</div> : null),
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  AlertDialogAction: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
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

function createSeries(id: string, label: string): MapSupportedSeries {
  const series = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
  series.id = id;
  series.label = label;
  series.enabled = true;
  return series;
}

function createComponentProps(overrides?: Partial<React.ComponentProps<typeof AdvancedMapAnalyticsAnalyticsView>>) {
  const firstSeries = createSeries('series-a', 'Series A');
  const secondSeries = createSeries('series-b', 'Series B');
  const valuesBySeriesId = new Map<string, Map<string, number | undefined>>([
    [firstSeries.id, new Map([
      ['1001', 10],
      ['1002', 20],
      ['1003', 30],
      ['1004', 40],
    ])],
    [secondSeries.id, new Map([
      ['1001', 1],
      ['1002', 2],
      ['1003', 3],
      ['1004', 4],
      ['1005', 100],
    ])],
  ]);
  const widgets = createDefaultAdvancedMapAnalyticsWidgets();

  return {
    widgets,
    series: [firstSeries, secondSeries],
    activeSeriesId: firstSeries.id,
    valuesBySeriesId,
    unitsBySeriesId: new Map<string, string | undefined>([
      [firstSeries.id, 'RON'],
      [secondSeries.id, 'RON'],
    ]),
    uatMetadataBySirutaCode: new Map([
      ['1005', { uatName: 'Outlier UAT', countyName: 'Outlier County' }],
    ]),
    readOnly: false,
    onToggleWidgetEnabled: vi.fn(),
    onReorderWidgets: vi.fn(),
    onUpdateWidget: vi.fn(),
    ...overrides,
  };
}

describe('AdvancedMapAnalyticsAnalyticsView', () => {
  it('renders all default widgets', () => {
    render(<AdvancedMapAnalyticsAnalyticsView {...createComponentProps()} />);

    expect(screen.getByText('Series coverage')).toBeInTheDocument();
    expect(screen.getByText('Series totals')).toBeInTheDocument();
    expect(screen.getByText('Distribution')).toBeInTheDocument();
    expect(screen.getByText('Outliers')).toBeInTheDocument();
  });

  it('removes a widget after confirmation', () => {
    const onToggleWidgetEnabled = vi.fn();

    render(
      <AdvancedMapAnalyticsAnalyticsView
        {...createComponentProps({ onToggleWidgetEnabled })}
      />
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Remove analytics view' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    expect(onToggleWidgetEnabled).toHaveBeenCalledWith('series_coverage', false);
  });

  it('enables a disabled widget from Add view modal', () => {
    const onToggleWidgetEnabled = vi.fn();
    const widgets = createDefaultAdvancedMapAnalyticsWidgets().map((widget) =>
      widget.key === 'series_totals'
        ? { ...widget, enabled: false }
        : widget
    );

    render(
      <AdvancedMapAnalyticsAnalyticsView
        {...createComponentProps({ widgets, onToggleWidgetEnabled })}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add view' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(onToggleWidgetEnabled).toHaveBeenCalledWith('series_totals', true);
  });

  it('calls reorder callback after drag end', () => {
    const onReorderWidgets = vi.fn();

    render(
      <AdvancedMapAnalyticsAnalyticsView
        {...createComponentProps({ onReorderWidgets })}
      />
    );

    fireEvent.click(screen.getByTestId('trigger-reorder'));

    expect(onReorderWidgets).toHaveBeenCalledWith('series_totals', 'series_coverage');
  });

  it('uses per-widget series overrides for distribution and outliers', () => {
    const firstSeries = createSeries('series-a', 'Series A');
    const secondSeries = createSeries('series-b', 'Series B');
    const widgets: AdvancedMapAnalyticsWidget[] = createDefaultAdvancedMapAnalyticsWidgets().map((widget) => {
      if (widget.key === 'distribution') {
        return {
          ...widget,
          seriesId: secondSeries.id,
        };
      }
      if (widget.key === 'outliers') {
        return {
          ...widget,
          seriesId: secondSeries.id,
        };
      }
      return widget;
    });

    const valuesBySeriesId = new Map<string, Map<string, number | undefined>>([
      [firstSeries.id, new Map()],
      [secondSeries.id, new Map([
        ['1001', 1],
        ['1002', 2],
        ['1003', 3],
        ['1004', 4],
        ['1005', 100],
      ])],
    ]);

    render(
      <AdvancedMapAnalyticsAnalyticsView
        {...createComponentProps({
          widgets,
          series: [firstSeries, secondSeries],
          activeSeriesId: firstSeries.id,
          valuesBySeriesId,
          uatMetadataBySirutaCode: new Map([
            ['1005', { uatName: 'Outlier UAT', countyName: 'Outlier County' }],
          ]),
        })}
      />
    );

    expect(screen.queryByText('Not enough values to build distribution.')).not.toBeInTheDocument();
    expect(screen.getByText('Outlier UAT')).toBeInTheDocument();
  });

  it('shows sum, mean and median in series totals', () => {
    const unitsBySeriesId = new Map<string, string | undefined>([
      ['series-a', undefined],
      ['series-b', undefined],
    ]);

    render(
      <AdvancedMapAnalyticsAnalyticsView
        {...createComponentProps({ unitsBySeriesId })}
      />
    );

    expect(screen.getByText('Sum')).toBeInTheDocument();
    expect(screen.getByText('Mean')).toBeInTheDocument();
    expect(screen.getByText('Median')).toBeInTheDocument();

    const totalsSection = screen.getByRole('heading', { name: 'Series totals' }).closest('section');
    if (!totalsSection) {
      throw new Error('Series totals section should exist');
    }

    const seriesARow = within(totalsSection).getByText('Series A').closest('tr');
    if (!seriesARow) {
      throw new Error('Series A row should exist');
    }

    expect(within(seriesARow).getByText(/100/)).toBeInTheDocument();
    expect(within(seriesARow).getAllByText(/25/)).toHaveLength(2);
  });

  it('renders distribution table view when viewMode is table', () => {
    const widgets = createDefaultAdvancedMapAnalyticsWidgets().map((widget) =>
      widget.key === 'distribution'
        ? { ...widget, viewMode: 'table' as const }
        : widget
    );

    render(
      <AdvancedMapAnalyticsAnalyticsView
        {...createComponentProps({ widgets })}
      />
    );

    expect(screen.getByText('Range')).toBeInTheDocument();
    expect(screen.getByText('Count')).toBeInTheDocument();
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
  });

  it('renders distribution bar chart when viewMode is chart', () => {
    render(
      <AdvancedMapAnalyticsAnalyticsView
        {...createComponentProps()}
      />
    );

    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.queryByText('Range')).not.toBeInTheDocument();
  });

  it('renders outliers scatter chart when viewMode is chart', () => {
    const widgets = createDefaultAdvancedMapAnalyticsWidgets().map((widget) =>
      widget.key === 'outliers'
        ? { ...widget, viewMode: 'chart' as const }
        : widget
    );

    render(
      <AdvancedMapAnalyticsAnalyticsView
        {...createComponentProps({ widgets })}
      />
    );

    expect(screen.getByTestId('outliers-canvas-chart')).toBeInTheDocument();
    expect(screen.getByText('X axis')).toBeInTheDocument();
    expect(screen.getByText('Y axis')).toBeInTheDocument();
  });

  it('defaults scatter Y axis to a different series when none is selected', () => {
    const firstSeries = createSeries('series-a', 'Series A');
    const secondSeries = createSeries('series-b', 'Series B');
    const widgets = createDefaultAdvancedMapAnalyticsWidgets().map((widget) =>
      widget.key === 'outliers'
        ? { ...widget, viewMode: 'chart' as const, scatterXSeriesId: undefined, scatterYSeriesId: undefined }
        : widget
    );
    const valuesBySeriesId = new Map<string, Map<string, number | undefined>>([
      [firstSeries.id, new Map([
        ['1001', 10],
        ['1002', 20],
      ])],
      [secondSeries.id, new Map([
        ['2001', 1],
        ['2002', 2],
      ])],
    ]);

    render(
      <AdvancedMapAnalyticsAnalyticsView
        {...createComponentProps({
          widgets,
          series: [firstSeries, secondSeries],
          activeSeriesId: firstSeries.id,
          valuesBySeriesId,
        })}
      />
    );

    expect(screen.getByText('Not enough data points for scatter chart.')).toBeInTheDocument();
    expect(screen.queryByTestId('outliers-canvas-chart')).not.toBeInTheDocument();
  });

  it('supports UAT name X axis when only one series is enabled', () => {
    const singleSeries = createSeries('series-a', 'Series A');
    const widgets = createDefaultAdvancedMapAnalyticsWidgets().map((widget) =>
      widget.key === 'outliers'
        ? { ...widget, viewMode: 'chart' as const, scatterXSeriesId: undefined, scatterYSeriesId: undefined }
        : widget
    );
    const valuesBySeriesId = new Map<string, Map<string, number | undefined>>([
      [singleSeries.id, new Map([
        ['1001', 10],
        ['1002', 20],
        ['1003', 30],
      ])],
    ]);

    render(
      <AdvancedMapAnalyticsAnalyticsView
        {...createComponentProps({
          widgets,
          series: [singleSeries],
          activeSeriesId: singleSeries.id,
          valuesBySeriesId,
        })}
      />
    );

    expect(screen.getByText('UAT name')).toBeInTheDocument();
    expect(screen.getByTestId('outliers-canvas-chart')).toBeInTheDocument();
    expect(screen.queryByText('Not enough data points for scatter chart.')).not.toBeInTheDocument();
  });

  it('renders outliers table by default', () => {
    const widgets = createDefaultAdvancedMapAnalyticsWidgets().map((widget) =>
      widget.key === 'outliers'
        ? { ...widget, seriesId: 'series-b' }
        : widget
    );

    render(
      <AdvancedMapAnalyticsAnalyticsView
        {...createComponentProps({ widgets })}
      />
    );

    expect(screen.getByText('Outlier UAT')).toBeInTheDocument();
    expect(screen.queryByTestId('outliers-canvas-chart')).not.toBeInTheDocument();
  });

  it('hides management controls in read-only mode', () => {
    render(
      <AdvancedMapAnalyticsAnalyticsView
        {...createComponentProps({ readOnly: true })}
      />
    );

    expect(screen.queryByRole('button', { name: 'Add view' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove analytics view' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reorder analytics view' })).not.toBeInTheDocument();
  });
});
