import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps, ReactNode } from 'react';
import { AdvancedMapAnalyticsSeriesListItem } from './advanced-map-analytics-series-list-item';
import { createDefaultAdvancedMapAnalyticsSeries } from '@/schemas/advanced-map-analytics';

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
    disabled,
  }: {
    children: ReactNode;
    onSelect?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onSelect} disabled={disabled}>
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <div />,
}));

describe('AdvancedMapAnalyticsSeriesListItem', () => {
  function renderItem(overrides?: Partial<ComponentProps<typeof AdvancedMapAnalyticsSeriesListItem>>) {
    const series = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    const props = {
      series,
      isActive: false,
      isSelected: false,
      isMoveUpDisabled: false,
      isMoveDownDisabled: false,
      onSelectSeries: vi.fn(),
      onMakeMain: vi.fn(),
      onActivate: vi.fn(),
      onEdit: vi.fn(),
      onMoveUp: vi.fn(),
      onMoveDown: vi.fn(),
      onDuplicate: vi.fn(),
      onCopy: vi.fn(),
      onDelete: vi.fn(),
      ...overrides,
    };

    render(<AdvancedMapAnalyticsSeriesListItem {...props} />);
    return props;
  }

  it('opens edit when row label is clicked', () => {
    const props = renderItem();

    fireEvent.click(screen.getByText('Execution analytics'));

    expect(props.onSelectSeries).toHaveBeenCalledWith(props.series.id);
    expect(props.onEdit).toHaveBeenCalledWith(props.series.id);
  });

  it('calls onMakeMain when icon button is clicked', () => {
    const props = renderItem();

    fireEvent.click(screen.getByLabelText('Set active series'));

    expect(props.onSelectSeries).toHaveBeenCalledWith(props.series.id);
    expect(props.onMakeMain).toHaveBeenCalledWith(props.series.id);
  });

  it('calls onActivate when switch changes', () => {
    const series = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    series.enabled = true;
    const props = renderItem({ series });

    fireEvent.click(screen.getByRole('switch'));

    expect(props.onActivate).toHaveBeenCalledWith(series.id, false);
  });

  it('calls row menu actions', () => {
    const props = renderItem();

    fireEvent.click(screen.getByLabelText('Open row menu'));
    fireEvent.click(screen.getByText('Edit'));
    expect(props.onEdit).toHaveBeenCalledWith(props.series.id);

    fireEvent.click(screen.getByLabelText('Open row menu'));
    fireEvent.click(screen.getByText('Make main'));
    expect(props.onMakeMain).toHaveBeenCalledWith(props.series.id);

    fireEvent.click(screen.getByLabelText('Open row menu'));
    fireEvent.click(screen.getByText('Deactivate'));
    expect(props.onActivate).toHaveBeenCalledWith(props.series.id, false);

    fireEvent.click(screen.getByLabelText('Open row menu'));
    fireEvent.click(screen.getByText('Move up'));
    expect(props.onMoveUp).toHaveBeenCalledWith(props.series.id);

    fireEvent.click(screen.getByLabelText('Open row menu'));
    fireEvent.click(screen.getByText('Move down'));
    expect(props.onMoveDown).toHaveBeenCalledWith(props.series.id);

    fireEvent.click(screen.getByLabelText('Open row menu'));
    fireEvent.click(screen.getByText('Duplicate'));
    expect(props.onDuplicate).toHaveBeenCalledWith(props.series.id);

    fireEvent.click(screen.getByLabelText('Open row menu'));
    fireEvent.click(screen.getByText('Copy'));
    expect(props.onCopy).toHaveBeenCalledWith(props.series.id);

    fireEvent.click(screen.getByLabelText('Open row menu'));
    fireEvent.click(screen.getByText('Delete'));
    expect(props.onDelete).toHaveBeenCalledWith(props.series.id);
  });

  it('disables move actions when row is at boundaries', () => {
    renderItem({
      isMoveUpDisabled: true,
      isMoveDownDisabled: true,
    });

    fireEvent.click(screen.getByLabelText('Open row menu'));
    expect(screen.getByText('Move up')).toBeDisabled();
    expect(screen.getByText('Move down')).toBeDisabled();
  });

  it('disables make main action when series is already main', () => {
    renderItem({
      isActive: true,
    });

    fireEvent.click(screen.getByLabelText('Open row menu'));
    expect(screen.getByText('Make main')).toBeDisabled();
  });
});
