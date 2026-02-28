import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { ExperimentalMapSeriesListItem } from './experimental-map-series-list-item';
import { createDefaultExperimentalMapSeries } from '@/schemas/experimental-map';

vi.mock('@dnd-kit/sortable', () => ({
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

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    onSelect,
  }: {
    children: ReactNode;
    onSelect?: () => void;
  }) => (
    <button type="button" onClick={onSelect}>
      {children}
    </button>
  ),
}));

describe('ExperimentalMapSeriesListItem', () => {
  it('opens edit when row label is clicked', () => {
    const series = createDefaultExperimentalMapSeries('line-items-aggregated-yearly');
    const onEdit = vi.fn();

    render(
      <ExperimentalMapSeriesListItem
        series={series}
        isActive={false}
        onSetActive={vi.fn()}
        onToggleEnabled={vi.fn()}
        onEdit={onEdit}
        onDelete={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Execution analytics'));

    expect(onEdit).toHaveBeenCalledWith(series.id);
  });

  it('calls onSetActive when icon button is clicked', () => {
    const series = createDefaultExperimentalMapSeries('line-items-aggregated-yearly');
    const onSetActive = vi.fn();

    render(
      <ExperimentalMapSeriesListItem
        series={series}
        isActive={false}
        onSetActive={onSetActive}
        onToggleEnabled={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    fireEvent.click(screen.getByLabelText('Set active series'));

    expect(onSetActive).toHaveBeenCalledWith(series.id);
  });

  it('calls onToggleEnabled when switch changes', () => {
    const series = createDefaultExperimentalMapSeries('line-items-aggregated-yearly');
    series.enabled = true;

    const onToggleEnabled = vi.fn();

    render(
      <ExperimentalMapSeriesListItem
        series={series}
        isActive={false}
        onSetActive={vi.fn()}
        onToggleEnabled={onToggleEnabled}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('switch'));

    expect(onToggleEnabled).toHaveBeenCalledWith(series.id, false);
  });

  it('calls onEdit and onDelete from overflow menu', () => {
    const series = createDefaultExperimentalMapSeries('line-items-aggregated-yearly');
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <ExperimentalMapSeriesListItem
        series={series}
        isActive={false}
        onSetActive={vi.fn()}
        onToggleEnabled={vi.fn()}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    fireEvent.click(screen.getByLabelText('Open row menu'));
    fireEvent.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalledWith(series.id);

    fireEvent.click(screen.getByLabelText('Open row menu'));
    fireEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledWith(series.id);
  });
});
