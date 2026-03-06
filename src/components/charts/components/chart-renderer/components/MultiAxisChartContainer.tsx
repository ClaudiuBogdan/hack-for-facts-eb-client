import {
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { Chart } from '@/schemas/charts';
import { CustomSeriesTooltip } from './Tooltips';
import { ReactNode, useCallback, useMemo, memo } from 'react';
import { ChartAnnotation } from './ChartAnnotation';
import { AnnotationPositionChange } from './interfaces';
import { yValueFormatter } from '../utils';
import { UnitMap } from '@/components/charts/hooks/useChartData';

interface MultiAxisChartContainerProps {
  chart: Chart;
  unitMap: UnitMap;
  children: ((getYAxisId: (seriesId: string) => string) => ReactNode) | ReactNode;
  onAnnotationPositionChange: (pos: AnnotationPositionChange) => void;
  disableTooltip?: boolean;
  diffStateKey?: string;
}
const MAX_LEGEND_LABEL_LENGTH = 36

function truncateLegendLabel(value: string | number) {
  const trimmedValue = String(value).trim()
  if (trimmedValue.length <= MAX_LEGEND_LABEL_LENGTH) {
    return trimmedValue
  }

  return `${trimmedValue.slice(0, MAX_LEGEND_LABEL_LENGTH - 1)}…`
}

// Custom comparison function that ignores the children function prop
// since it's recreated on every parent render but the chart structure stays the same
function arePropsEqual(
  prevProps: MultiAxisChartContainerProps,
  nextProps: MultiAxisChartContainerProps
): boolean {
  // Compare non-function props that actually affect rendering
  return (
    prevProps.chart === nextProps.chart &&
    prevProps.unitMap === nextProps.unitMap &&
    prevProps.disableTooltip === nextProps.disableTooltip &&
    prevProps.onAnnotationPositionChange === nextProps.onAnnotationPositionChange &&
    prevProps.diffStateKey === nextProps.diffStateKey
  );
}

export const MultiAxisChartContainer = memo(function MultiAxisChartContainer({ unitMap, chart, children, onAnnotationPositionChange, disableTooltip, diffStateKey: _diffStateKey }: MultiAxisChartContainerProps) {

  // Group series by unit with stable, sorted order for consistent axis IDs/orientation
  const unitGroups = useMemo(() => {
    const groups = new Map<string, { unit: string; series: string[] }>();

    chart.series
      .filter(s => s.enabled)
      .forEach(series => {
        const unit = unitMap.get(series.id) || '';
        if (!groups.has(unit)) {
          groups.set(unit, { unit, series: [] });
        }
        groups.get(unit)!.series.push(series.id);
      });

    return Array.from(groups.values()).sort((a, b) => a.unit.localeCompare(b.unit));
  }, [chart.series, unitMap]);

  // Deterministic mapping unit -> axis index
  const unitToAxisIndex = useMemo(() => {
    const map = new Map<string, number>();
    unitGroups.forEach((g, idx) => map.set(g.unit, idx));
    return map;
  }, [unitGroups]);

  const getYAxisId = useCallback((seriesId: string) => {
    const group = unitGroups.find(g => g.series.includes(seriesId));
    if (!group) return 'yaxis-0';
    const axisIndex = unitToAxisIndex.get(group.unit) ?? 0;
    return `yaxis-${axisIndex}`;
  }, [unitGroups, unitToAxisIndex]);

  // Stable legend sorter; must be declared unconditionally to respect hooks rules
  const legendItemSorter = useCallback(() => 0, []);
  const legendFormatter = useCallback(
    (value: string | number) => truncateLegendLabel(value),
    [],
  )

  // Memoized props/objects to avoid prop identity changes causing re-renders/flicker
  const xAxisTickProps = useMemo(() => ({ fontSize: 12 }), []);
  const tooltipReverseDirection = useMemo(() => ({ y: true as const }), []);
  const tooltipWrapperStyle = useMemo(() => ({ zIndex: 10 }), []);
  const tooltipCursor = useMemo(() => ({ stroke: 'rgba(0, 0, 0, 0.1)', strokeWidth: 1 }), []);
  const legendWrapperStyle = useMemo(() => ({ zIndex: 1 }), []);
  const tooltipContent = useMemo(() => (
    <CustomSeriesTooltip chartConfig={chart.config} chart={chart} />
  ), [chart.config, chart]);

  return (
    <>
      {chart.config.showGridLines && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
      <XAxis
        dataKey="year"
        className="text-xs fill-muted-foreground select-none"
        tick={xAxisTickProps}
        allowDataOverflow={false}
      />

      {/* Render Y-axes for each unit */}
      {unitGroups.map((group) => {
        const axisIndex = unitToAxisIndex.get(group.unit) ?? 0;
        return (
          <YAxis
            key={`yaxis-${group.unit || 'none'}`}
            yAxisId={`yaxis-${axisIndex}`}
            orientation={axisIndex % 2 === 0 ? 'left' : 'right'}
            className="text-xs fill-muted-foreground select-none"
            tickFormatter={(value: number) => yValueFormatter(value, group.unit)}
            allowDataOverflow={false}
          />
        );
      })}

      {chart.config.showTooltip && !disableTooltip && (
        <Tooltip
          reverseDirection={tooltipReverseDirection}
          animationDuration={100}
          content={tooltipContent}
          wrapperStyle={tooltipWrapperStyle}
          cursor={tooltipCursor}
        />
      )}

      {chart.config.showLegend && <Legend
        verticalAlign="bottom"
        height={36}
        wrapperStyle={legendWrapperStyle}
        itemSorter={legendItemSorter}
        formatter={legendFormatter}
      />}

      {/* Pass the getYAxisId function to children */}
      {typeof children === 'function' ? children(getYAxisId) : children}

      {chart.config.showAnnotations && chart.annotations.filter(a => a.enabled).map((annotation) => (
        <ChartAnnotation
          key={annotation.id}
          annotation={annotation}
          globalEditable={chart.config.editAnnotations}
          onPositionChange={onAnnotationPositionChange}
        />
      ))}
    </>
  );
}, arePropsEqual);
