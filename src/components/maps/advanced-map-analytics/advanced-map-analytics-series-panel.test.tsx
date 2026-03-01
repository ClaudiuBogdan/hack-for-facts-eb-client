import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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
  it('calls onAddSeries when plus button is clicked', () => {
    const onAddSeries = vi.fn();
    const series = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');

    render(
      <AdvancedMapAnalyticsSeriesPanel
        series={[series]}
        activeSeriesId={undefined}
        collapsed={false}
        onToggleCollapsed={vi.fn()}
        onAddSeries={onAddSeries}
        onSetActive={vi.fn()}
        onToggleEnabled={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onReorder={vi.fn()}
      />
    );

    fireEvent.click(screen.getByLabelText('Add series'));
    expect(onAddSeries).toHaveBeenCalledTimes(1);
  });

  it('calls onToggleCollapsed and hides list when collapsed', () => {
    const onToggleCollapsed = vi.fn();
    const series = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');

    const { rerender } = render(
      <AdvancedMapAnalyticsSeriesPanel
        series={[series]}
        activeSeriesId={undefined}
        collapsed={false}
        onToggleCollapsed={onToggleCollapsed}
        onAddSeries={vi.fn()}
        onSetActive={vi.fn()}
        onToggleEnabled={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onReorder={vi.fn()}
      />
    );

    const rowIdText = series.id.slice(0, 6);
    expect(screen.getByText(rowIdText)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Collapse panel'));
    expect(onToggleCollapsed).toHaveBeenCalledWith(true);

    rerender(
      <AdvancedMapAnalyticsSeriesPanel
        series={[series]}
        activeSeriesId={undefined}
        collapsed={true}
        onToggleCollapsed={onToggleCollapsed}
        onAddSeries={vi.fn()}
        onSetActive={vi.fn()}
        onToggleEnabled={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onReorder={vi.fn()}
      />
    );

    expect(screen.queryByText(rowIdText)).not.toBeInTheDocument();
  });
});
