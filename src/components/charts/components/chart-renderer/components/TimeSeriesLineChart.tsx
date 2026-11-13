import { LabelList, Line, LineChart, ReferenceLine } from 'recharts';
import { MultiAxisChartContainer } from './MultiAxisChartContainer';
import { ChartRendererProps } from './ChartRenderer';
import { DataPointPayload } from '@/components/charts/hooks/useChartData';
import { ChartLabel } from './ChartLabel';
import { yValueFormatter } from '../utils';
import { useChartDiff } from '../hooks/useChartDiff';
import { DiffArea } from './diff-select/DiffArea';
import { useChartAnimation } from '../hooks/useChartAnimation';
import { useMemo, useRef } from 'react';
import { SafeResponsiveContainer } from '@/components/charts/safe-responsive-container';

export function TimeSeriesLineChart({ chart, unitMap, timeSeriesData, onAnnotationPositionChange, onXAxisClick, onXAxisHover, xAxisMarker, margins }: ChartRendererProps) {
  const enabledSeries = useMemo(() => chart.series.filter(s => s.enabled), [chart.series]);
  const { isAnimationActive, animationDuration } = useChartAnimation({ duration: 600 });
  const {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    refAreaLeft,
    refAreaRight,
    diffs,
  } = useChartDiff(timeSeriesData, enabledSeries);
  const diffEnabled = chart.config.showDiffControl && !!refAreaLeft && !!refAreaRight && enabledSeries.length > 0;
  const shouldRenderLabels = (chart.config.showDataLabels ?? false) || enabledSeries.some(s => s.config.showDataLabels);
  const lastHover = useRef<{ value: number | string | undefined; callback: typeof onXAxisHover }>(undefined);
  const notifyHover = (value: number | string | undefined) => {
    if (!onXAxisHover || (lastHover.current?.callback === onXAxisHover && lastHover.current.value === value)) return;
    lastHover.current = { value, callback: onXAxisHover };
    onXAxisHover(value);
  };

  // Create a key that changes when diff state changes to trigger MultiAxisChartContainer re-render
  const diffStateKey = useMemo(
    () => `${refAreaLeft}-${refAreaRight}-${diffs.length}`,
    [refAreaLeft, refAreaRight, diffs.length]
  );

  return (
    <SafeResponsiveContainer width="100%" height="100%" className="select-none">
      <LineChart
        data={timeSeriesData}
        margin={{ top: 30, right: 50, left: 50, bottom: 20, ...margins }}
        onMouseDown={chart.config.showDiffControl ? handleMouseDown : undefined}
        onClick={onXAxisClick ? (e) => {
          if (e?.activeLabel !== undefined) {
            onXAxisClick?.(String(e.activeLabel));
          }
        } : undefined}
        onMouseMove={(e) => {
          if (chart.config.showDiffControl) handleMouseMove(e);
          notifyHover(e.activeLabel);
        }}
        onMouseUp={chart.config.showDiffControl ? handleMouseUp : undefined}
        onMouseLeave={() => {
          handleMouseLeave();
          notifyHover(undefined);
        }}
        className={onXAxisClick ? 'cursor-pointer' : undefined}
      >
        <MultiAxisChartContainer disableTooltip={diffEnabled} chart={chart} unitMap={unitMap} onAnnotationPositionChange={onAnnotationPositionChange} diffStateKey={diffStateKey}>
          {(getYAxisId: (seriesId: string) => string) => (
            <>
              {enabledSeries.map((series, index) => (
                <Line
                  key={series.id}
                  yAxisId={getYAxisId(series.id)}
                  dataKey={(row: Record<string, DataPointPayload>) => row?.[series.id]?.value}
                  name={series.label || 'Untitled'}
                  stroke={series.config.color}
                  type="monotone"
                  strokeWidth={2}
                  dot={{ r: 1 }}
                  activeDot={{ r: 2 }}
                  connectNulls={false}
                  isAnimationActive={isAnimationActive}
                  animationDuration={animationDuration}
                  animationBegin={index * 100}
                  animationEasing="ease-in-out"
                >
                  {shouldRenderLabels && (
                    <LabelList
                      dataKey={(row: Record<string, DataPointPayload>) => row?.[series.id]}
                      offset={30}
                      content={(props) => {
                        const isShowLabels = series.config.showDataLabels || chart.config.showDataLabels;
                        if (!isShowLabels) return null;

                        const payload = props.value as unknown as DataPointPayload | undefined;
                        if (!payload) return null;
                        const dataLabels = series.config.dataLabels || [];
                        if (dataLabels.length > 0 && !dataLabels.includes(String(payload.year))) return null;

                        return (
                          <ChartLabel
                            {...props}
                            value={payload.value}
                            series={series}
                            dataLabelFormatter={(value) => yValueFormatter(value, payload.unit)}
                            color={series.config.color}
                          />
                        );
                      }}
                    />
                  )}
                </Line>
              ))}

              {xAxisMarker && (
                <ReferenceLine
                  x={xAxisMarker}
                  yAxisId={getYAxisId('')}
                  stroke="black"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                  strokeOpacity={0.5}
                  strokeLinecap="round"
                  ifOverflow="visible"
                />
              )}
              {diffEnabled && (
                <DiffArea
                  yAxisId={getYAxisId(enabledSeries[0].id)}
                  refAreaLeft={refAreaLeft}
                  refAreaRight={refAreaRight}
                  diffs={diffs}
                />
              )}
            </>
          )}
        </MultiAxisChartContainer>
      </LineChart>
    </SafeResponsiveContainer>
  );
}
