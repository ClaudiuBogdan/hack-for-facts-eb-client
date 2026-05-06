import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { AdvancedMapAnalyticsSeriesPanel } from './advanced-map-analytics-series-panel';
import { createDefaultAdvancedMapAnalyticsSeries } from '@/schemas/advanced-map-analytics';

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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

describe('AdvancedMapAnalyticsSeriesPanel', () => {
  function renderPanel(overrides?: Partial<ComponentProps<typeof AdvancedMapAnalyticsSeriesPanel>>) {
    const series = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    const props = {
      series: [series],
      activeSeriesId: undefined,
      selectedSeriesId: undefined,
      collapsed: false,
      onToggleCollapsed: vi.fn(),
      onAddSeries: vi.fn(),
      onSelectSeries: vi.fn(),
      onActivate: vi.fn(),
      onMakeMain: vi.fn(),
      onEdit: vi.fn(),
      onMoveUp: vi.fn(),
      onMoveDown: vi.fn(),
      onDuplicate: vi.fn(),
      onCopy: vi.fn(),
      onDelete: vi.fn(),
      onReorder: vi.fn(),
      ...overrides,
    };

    const renderResult = render(<AdvancedMapAnalyticsSeriesPanel {...props} />);
    return {
      ...renderResult,
      props,
      series,
    };
  }

  it('calls onAddSeries when plus button is clicked', () => {
    const { props } = renderPanel();

    fireEvent.click(screen.getByLabelText('Add series'));
    expect(props.onAddSeries).toHaveBeenCalledTimes(1);
  });

  it('disables add button when readOnly is true', () => {
    renderPanel({ readOnly: true });

    expect(screen.getByLabelText('Add series')).toBeDisabled();
  });

  it('calls onToggleCollapsed and hides list when collapsed', () => {
    const onToggleCollapsed = vi.fn();
    const { rerender, series } = renderPanel({ onToggleCollapsed });

    const rowIdText = series.id.slice(0, 6);
    expect(screen.getByText(rowIdText)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Collapse panel'));
    expect(onToggleCollapsed).toHaveBeenCalledWith(true);

    rerender(
      <AdvancedMapAnalyticsSeriesPanel
        series={[series]}
        activeSeriesId={undefined}
        selectedSeriesId={undefined}
        collapsed={true}
        onToggleCollapsed={onToggleCollapsed}
        onAddSeries={vi.fn()}
        onSelectSeries={vi.fn()}
        onActivate={vi.fn()}
        onMakeMain={vi.fn()}
        onEdit={vi.fn()}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
        onDuplicate={vi.fn()}
        onCopy={vi.fn()}
        onDelete={vi.fn()}
        onReorder={vi.fn()}
      />
    );

    expect(screen.queryByText(rowIdText)).not.toBeInTheDocument();
  });
});
