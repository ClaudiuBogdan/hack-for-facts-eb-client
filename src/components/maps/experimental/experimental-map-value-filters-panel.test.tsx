import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  createDefaultExperimentalMapSeries,
  createDefaultExperimentalMapStatsValueFilterRule,
  createDefaultExperimentalMapValueFilterRule,
} from '@/schemas/experimental-map';
import { ExperimentalMapValueFiltersPanel } from './experimental-map-value-filters-panel';

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

describe('ExperimentalMapValueFiltersPanel', () => {
  it('calls add callback when add rule button is clicked', () => {
    const onAddRule = vi.fn();

    render(
      <ExperimentalMapValueFiltersPanel
        collapsed={false}
        rules={[]}
        series={[]}
        onToggleCollapsed={vi.fn()}
        onAddRule={onAddRule}
        onReorder={vi.fn()}
        onEditRule={vi.fn()}
        onDeleteRule={vi.fn()}
        onMoveRule={vi.fn()}
        onRuleEnabledChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add value filter rule' }));
    expect(onAddRule).toHaveBeenCalledTimes(1);
  });

  it('opens rule editor from list row', () => {
    const onEditRule = vi.fn();
    const firstRule = createDefaultExperimentalMapValueFilterRule();

    render(
      <ExperimentalMapValueFiltersPanel
        collapsed={false}
        rules={[firstRule]}
        series={[]}
        onToggleCollapsed={vi.fn()}
        onAddRule={vi.fn()}
        onReorder={vi.fn()}
        onEditRule={onEditRule}
        onDeleteRule={vi.fn()}
        onMoveRule={vi.fn()}
        onRuleEnabledChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit value filter rule 1' }));
    expect(onEditRule).toHaveBeenCalledWith(firstRule.id);
  });

  it('renders compact rule summary', () => {
    const rule = createDefaultExperimentalMapValueFilterRule();
    rule.operator = 'lt';
    rule.value = 0;
    const series = createDefaultExperimentalMapSeries('line-items-aggregated-yearly');
    series.label = 'Spending';

    render(
      <ExperimentalMapValueFiltersPanel
        collapsed={false}
        rules={[rule]}
        series={[series]}
        onToggleCollapsed={vi.fn()}
        onAddRule={vi.fn()}
        onReorder={vi.fn()}
        onEditRule={vi.fn()}
        onDeleteRule={vi.fn()}
        onMoveRule={vi.fn()}
        onRuleEnabledChange={vi.fn()}
      />
    );

    expect(screen.getByText('active: < 0')).toBeInTheDocument();
  });

  it('calls edit and delete callbacks from row menu', async () => {
    const onEditRule = vi.fn();
    const onDeleteRule = vi.fn();
    const onMoveRule = vi.fn();
    const rule = createDefaultExperimentalMapValueFilterRule();

    render(
      <ExperimentalMapValueFiltersPanel
        collapsed={false}
        rules={[rule]}
        series={[]}
        onToggleCollapsed={vi.fn()}
        onAddRule={vi.fn()}
        onReorder={vi.fn()}
        onEditRule={onEditRule}
        onDeleteRule={onDeleteRule}
        onMoveRule={onMoveRule}
        onRuleEnabledChange={vi.fn()}
      />
    );

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Open rule 1 menu' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Edit' }));
    expect(onEditRule).toHaveBeenCalledWith(rule.id);

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Open rule 1 menu' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    expect(onDeleteRule).toHaveBeenCalledWith(rule.id);
    expect(onMoveRule).not.toHaveBeenCalled();
  });

  it('calls move rule callback from row menu', async () => {
    const onMoveRule = vi.fn();
    const firstRule = createDefaultExperimentalMapValueFilterRule();
    const secondRule = createDefaultExperimentalMapValueFilterRule();

    render(
      <ExperimentalMapValueFiltersPanel
        collapsed={false}
        rules={[firstRule, secondRule]}
        series={[]}
        onToggleCollapsed={vi.fn()}
        onAddRule={vi.fn()}
        onReorder={vi.fn()}
        onEditRule={vi.fn()}
        onDeleteRule={vi.fn()}
        onMoveRule={onMoveRule}
        onRuleEnabledChange={vi.fn()}
      />
    );

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Open rule 2 menu' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Move up' }));

    expect(onMoveRule).toHaveBeenCalledWith(secondRule.id, 'up');
  });

  it('calls enabled toggle callback when switch is changed', () => {
    const onRuleEnabledChange = vi.fn();
    const rule = createDefaultExperimentalMapValueFilterRule();

    render(
      <ExperimentalMapValueFiltersPanel
        collapsed={false}
        rules={[rule]}
        series={[]}
        onToggleCollapsed={vi.fn()}
        onAddRule={vi.fn()}
        onReorder={vi.fn()}
        onEditRule={vi.fn()}
        onDeleteRule={vi.fn()}
        onMoveRule={vi.fn()}
        onRuleEnabledChange={onRuleEnabledChange}
      />
    );

    fireEvent.click(screen.getByRole('switch', { name: 'Disable rule 1' }));
    expect(onRuleEnabledChange).toHaveBeenCalledWith(rule.id, false);
  });

  it('renders compact summary for stats rules', () => {
    const statsRule = createDefaultExperimentalMapStatsValueFilterRule('rank');
    statsRule.direction = 'top';
    statsRule.count = 5;

    render(
      <ExperimentalMapValueFiltersPanel
        collapsed={false}
        rules={[statsRule]}
        series={[]}
        onToggleCollapsed={vi.fn()}
        onAddRule={vi.fn()}
        onReorder={vi.fn()}
        onEditRule={vi.fn()}
        onDeleteRule={vi.fn()}
        onMoveRule={vi.fn()}
        onRuleEnabledChange={vi.fn()}
      />
    );

    expect(screen.getByText('active: top 5')).toBeInTheDocument();
  });
});
