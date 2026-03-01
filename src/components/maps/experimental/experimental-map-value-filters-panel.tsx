import { memo } from 'react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, ChevronDown, GripVertical, MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { ExperimentalMapValueFilterRule, MapSupportedSeries } from '@/schemas/experimental-map';

interface ExperimentalMapValueFiltersPanelProps {
  collapsed: boolean;
  rules: ExperimentalMapValueFilterRule[];
  series: MapSupportedSeries[];
  onToggleCollapsed: (collapsed: boolean) => void;
  onAddRule: () => void;
  onReorder: (activeRuleId: string, overRuleId: string) => void;
  onEditRule: (ruleId: string) => void;
  onDeleteRule: (ruleId: string) => void;
  onMoveRule: (ruleId: string, direction: 'up' | 'down') => void;
  onRuleEnabledChange: (ruleId: string, enabled: boolean) => void;
}

export function ExperimentalMapValueFiltersPanel({
  collapsed,
  rules,
  series,
  onToggleCollapsed,
  onAddRule,
  onReorder,
  onEditRule,
  onDeleteRule,
  onMoveRule,
  onRuleEnabledChange,
}: Readonly<ExperimentalMapValueFiltersPanelProps>) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const overId = event.over?.id;
    if (!overId) {
      return;
    }

    const activeId = String(event.active.id);
    const targetId = String(overId);
    if (activeId === targetId) {
      return;
    }

    onReorder(activeId, targetId);
  };

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="text-2xl font-bold tracking-tight">Value Filters</h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onToggleCollapsed(!collapsed)}
              aria-label={collapsed ? 'Expand value filters panel' : 'Collapse value filters panel'}
            >
              <ChevronDown className={cn('h-4 w-4 transition-transform', !collapsed && 'rotate-180')} />
            </Button>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{rules.length} rules configured</p>
        </div>

        <Button
          size="icon"
          className="h-10 w-10 shrink-0 rounded-full"
          onClick={onAddRule}
          aria-label="Add value filter rule"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      <Collapsible open={!collapsed} onOpenChange={(open) => onToggleCollapsed(!open)}>
        <CollapsibleContent className="space-y-2 data-[state=open]:animate-in data-[state=closed]:animate-out">
          {rules.length === 0 ? (
            <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
              No value filters configured yet.
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={rules.map((rule) => rule.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2.5">
                  {rules.map((rule, index) => (
                    <ValueFilterListItem
                      key={rule.id}
                      rule={rule}
                      index={index}
                      totalRules={rules.length}
                      series={series}
                      onEditRule={onEditRule}
                      onDeleteRule={onDeleteRule}
                      onMoveRule={onMoveRule}
                      onRuleEnabledChange={onRuleEnabledChange}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}

interface ValueFilterListItemProps {
  rule: ExperimentalMapValueFilterRule;
  index: number;
  totalRules: number;
  series: MapSupportedSeries[];
  onEditRule: (ruleId: string) => void;
  onDeleteRule: (ruleId: string) => void;
  onMoveRule: (ruleId: string, direction: 'up' | 'down') => void;
  onRuleEnabledChange: (ruleId: string, enabled: boolean) => void;
}

const ValueFilterListItem = memo(function ValueFilterListItem({
  rule,
  index,
  totalRules,
  series,
  onEditRule,
  onDeleteRule,
  onMoveRule,
  onRuleEnabledChange,
}: Readonly<ValueFilterListItemProps>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rule.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center justify-between gap-3 rounded-xl border bg-background/70 px-3 py-2.5',
        isDragging && 'shadow-md'
      )}
    >
      <button
        type="button"
        aria-label={`Reorder rule ${index + 1}`}
        className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
        onClick={(event) => event.stopPropagation()}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        onClick={() => onEditRule(rule.id)}
        aria-label={`Edit value filter rule ${index + 1}`}
      >
        <span
          className="flex h-7 w-7 items-center justify-center rounded-full border bg-muted/40 text-muted-foreground"
          aria-label={`Rule connector ${resolveRuleJoin(rule, index)}`}
        >
          <RuleJoinGlyph join={resolveRuleJoin(rule, index)} />
        </span>
        <span className="min-w-0">
          <p className="truncate text-sm font-semibold">
            Rule {index + 1}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {buildRuleSummary(rule, series, index)}
          </p>
        </span>
      </button>

      <div className="flex items-center gap-1.5">
        <Switch
          checked={rule.enabled}
          onClick={(event) => event.stopPropagation()}
          onCheckedChange={(checked) => onRuleEnabledChange(rule.id, checked)}
          aria-label={rule.enabled ? `Disable rule ${index + 1}` : `Enable rule ${index + 1}`}
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              aria-label={`Open rule ${index + 1} menu`}
              onClick={(event) => event.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
            <DropdownMenuItem onSelect={() => onEditRule(rule.id)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={index === 0}
              onSelect={() => onMoveRule(rule.id, 'up')}
            >
              <ArrowUp className="mr-2 h-4 w-4" />
              Move up
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={index === totalRules - 1}
              onSelect={() => onMoveRule(rule.id, 'down')}
            >
              <ArrowDown className="mr-2 h-4 w-4" />
              Move down
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => onDeleteRule(rule.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

function buildRuleSummary(
  rule: ExperimentalMapValueFilterRule,
  series: MapSupportedSeries[],
  index: number
): string {
  const connectorPrefix = index > 0 ? `${rule.joinWithPrevious} ` : '';
  const sourceLabel = resolveRuleSourceLabel(rule, series);

  if (rule.kind === 'stats') {
    const statsSummary = resolveStatsSummary(rule);
    return `${connectorPrefix}${sourceLabel}: ${statsSummary}`.trim();
  }

  const operatorLabel = resolveOperatorLabel(rule.operator);
  const firstValueText = rule.value != null ? String(rule.value) : '';
  const secondValueText = rule.secondValue != null ? String(rule.secondValue) : '';

  if (rule.operator === 'between' || rule.operator === 'not_between') {
    return `${connectorPrefix}${sourceLabel}: ${operatorLabel} ${firstValueText} and ${secondValueText}`.trim();
  }

  if (rule.operator === 'is_defined' || rule.operator === 'is_undefined') {
    return `${connectorPrefix}${sourceLabel}: ${operatorLabel}`.trim();
  }

  return `${connectorPrefix}${sourceLabel}: ${operatorLabel} ${firstValueText}`.trim();
}

function resolveRuleSourceLabel(rule: ExperimentalMapValueFilterRule, series: MapSupportedSeries[]): string {
  const { seriesRef } = rule;
  if (seriesRef.mode !== 'series') {
    return 'active';
  }

  const sourceSeries = series.find((entry) => entry.id === seriesRef.seriesId);
  if (!sourceSeries) {
    return seriesRef.seriesId;
  }

  const label = sourceSeries.label.trim();
  return label.length > 0 ? label : sourceSeries.id;
}

function resolveOperatorLabel(
  operator: Extract<ExperimentalMapValueFilterRule, { kind: 'threshold' }>['operator']
): string {
  const labelsByOperator: Record<
    Extract<ExperimentalMapValueFilterRule, { kind: 'threshold' }>['operator'],
    string
  > = {
    gt: '>',
    gte: '>=',
    lt: '<',
    lte: '<=',
    eq: '=',
    neq: '!=',
    between: 'between',
    not_between: 'not between',
    is_defined: 'is defined',
    is_undefined: 'is undefined',
  };

  return labelsByOperator[operator];
}

function resolveStatsSummary(rule: Extract<ExperimentalMapValueFilterRule, { kind: 'stats' }>): string {
  if (rule.statsType === 'percentile_band') {
    return `percentile ${rule.minPercentile}-${rule.maxPercentile}`;
  }

  if (rule.statsType === 'rank') {
    return `${rule.direction} ${rule.count}`;
  }

  if (rule.statsType === 'median_compare') {
    return `${rule.mode} median`;
  }

  if (rule.statsType === 'zscore') {
    return `${rule.mode} z ${rule.threshold}`;
  }

  if (rule.statsType === 'iqr_outlier') {
    return `${rule.side} iqr x${rule.multiplier}`;
  }

  return `|rz| >= ${rule.threshold}`;
}

function resolveRuleJoin(rule: ExperimentalMapValueFilterRule, index: number): 'AND' | 'OR' {
  return index === 0 ? 'AND' : rule.joinWithPrevious;
}

function RuleJoinGlyph({ join }: Readonly<{ join: 'AND' | 'OR' }>) {
  if (join === 'AND') {
    return (
      <svg
        viewBox="0 0 16 16"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 3V13H8A5 5 0 0 0 8 3Z" />
        <path d="M1.5 5H3" />
        <path d="M1.5 11H3" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 3C5 4.2 5 11.8 3 13" />
      <path d="M3 3C6.8 3 10.4 4.8 13 8C10.4 11.2 6.8 13 3 13" />
      <path d="M1.5 5H2.8" />
      <path d="M1.5 11H2.8" />
    </svg>
  );
}
