import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, Cell } from 'recharts';
import { ChartRendererProps } from '../ChartRenderer';
import { yValueFormatter } from '../../utils';
import { ReactNode } from 'react';
import { CustomSeriesTooltip } from '../Tooltips';
import { AlertTriangle } from 'lucide-react';
import { ChartAnnotation } from '../ChartAnnotation';
import { SafeResponsiveContainer } from '@/components/charts/safe-responsive-container';
import { useIsMobile } from '@/hooks/use-mobile';


export function AggregatedBarChart({ chart, aggregatedData, unitMap, height, onAnnotationPositionChange }: ChartRendererProps) {
    const isMobile = useIsMobile();

    const displayUnit = unitMap.get(aggregatedData[0]?.id) || '';

    const units = new Set(unitMap.values());
    if (units.size > 1) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground" style={{ height }}>
                <AlertTriangle className="w-12 h-12 text-amber-500" />
                <p className="mt-4 text-center text-lg">Multiple units selected</p>
                <p className="text-sm text-center">Bar charts cannot effectively display series with different units ({Array.from(units).join(', ')}).</p>
            </div>
        );
    }


    // Limit very long left-side labels so they don't stretch the chart when many series are present
    const truncateLabel = (value: unknown, maxLength: number = 28): string => {
        const text = String(value ?? '');
        if (text.length <= maxLength) return text;
        return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
    };

    return (
        <SafeResponsiveContainer width="100%" height={height}>
            <BarChart data={aggregatedData} layout="vertical" margin={isMobile ? { top: 30, right: 10, left: 10, bottom: 10 } : { top: 50, right: 40, left: 40, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                    type="number"
                    tickFormatter={(value) => yValueFormatter(value, displayUnit)}
                />
                <YAxis
                    dataKey="series.label"
                    type="category"
                    width={isMobile ? 80 : 120}
                    interval={0}
                    tickFormatter={(value) => truncateLabel(value, isMobile ? 10 : (aggregatedData.length > 5 ? 14 : 100))}
                />
                {chart.config.showTooltip && !isMobile && (
                    <Tooltip
                        cursor={{ fill: 'rgba(206, 206, 206, 0.2)' }}
                        content={(props) => (
                            <CustomSeriesTooltip
                                {...props}
                                payload={props.payload?.map(p => p.payload)}
                                chartConfig={chart.config}
                                chart={chart}
                            />
                        )}
                    />
                )}
                <Bar dataKey="value" background={{ fill: '#eee' }}>
                    {aggregatedData.map((entry) => (
                        <Cell key={entry.id} fill={entry.series.config.color} />
                    ))}
                    <LabelList
                        dataKey="value"
                        position="right"
                        formatter={(label: ReactNode) => {
                            if (typeof label === 'number') {
                                return yValueFormatter(label, displayUnit);
                            }
                            return null;
                        }}
                        style={{ fill: 'black', fontSize: 12 }}
                    />
                </Bar>
                {chart.config.showAnnotations && chart.annotations.filter(a => a.enabled).map((annotation) => (
                    <ChartAnnotation
                        key={annotation.id}
                        annotation={annotation}
                        globalEditable={!!chart.config.editAnnotations}
                        onPositionChange={onAnnotationPositionChange}
                    />
                ))}
            </BarChart>
        </SafeResponsiveContainer>
    );
}
