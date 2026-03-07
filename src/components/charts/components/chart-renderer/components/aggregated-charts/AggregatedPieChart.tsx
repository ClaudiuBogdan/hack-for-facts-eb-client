import { PieChart, Pie, Tooltip, Cell, Legend } from 'recharts';
import { ChartRendererProps } from '../ChartRenderer';
import { AlertTriangle } from 'lucide-react';
import { CustomSeriesTooltip } from '../Tooltips';
import { ChartAnnotation } from '../ChartAnnotation';
import { SafeResponsiveContainer } from '@/components/charts/safe-responsive-container';
import { useIsMobile } from '@/hooks/use-mobile';

// Modern color palette for better visual appeal
const PIE_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#8B5CF6', // Purple
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6B7280', // Gray
];

export function AggregatedPieChart({ chart, aggregatedData, unitMap, height, onAnnotationPositionChange }: ChartRendererProps) {
    const isMobile = useIsMobile();
    const units = new Set(unitMap.values());

    if (units.size > 1) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground" style={{ height }}>
                <AlertTriangle className="w-16 h-16 text-amber-500 mb-4" />
                <p className="text-center text-lg font-medium text-gray-700 mb-2">Multiple units selected</p>
                <p className="text-sm text-center text-gray-500 max-w-md">
                    Pie charts cannot effectively display series with different units ({Array.from(units).join(', ')}).
                    Please select series with the same unit for better visualization.
                </p>
            </div>
        );
    }

    // Use modern color palette if no custom colors are defined
    const getColor = (index: number, customColor?: string) => {
        return customColor || PIE_COLORS[index % PIE_COLORS.length];
    };

    return (
        <SafeResponsiveContainer width="100%" height={height}>
            <PieChart margin={isMobile ? { top: 20, right: 2, bottom: 50, left: 2 } : { top: 40, right: 5, bottom: 70, left: 5 }}>
                <Pie
                    data={aggregatedData}
                    dataKey="value"
                    nameKey="series.label"
                    cx="50%"
                    cy="50%"
                    outerRadius="110%"
                    paddingAngle={2}
                    animationEasing="ease-out"
                    animationDuration={800}
                    animationBegin={0}
                    label={({ cx, cy, midAngle, outerRadius, percent }) => {
                        if (percent === undefined || midAngle === undefined || cx === undefined || cy === undefined) return null;

                        // Only show labels for slices > 5%
                        if (percent < 0.05) return null;

                        const RADIAN = Math.PI / 180;
                        const radius = outerRadius * 0.7;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);

                        return (
                            <text
                                x={x}
                                y={y}
                                fill="white"
                                textAnchor="middle"
                                dominantBaseline="central"
                                className="font-semibold text-xl drop-shadow-sm"
                                style={{ fontSize: '20px', fontWeight: 600 }}
                            >
                                {`${(percent * 100).toFixed(0)}%`}
                            </text>
                        );
                    }}
                    labelLine={false}
                >
                    {aggregatedData.map((entry, index) => (
                        <Cell
                            key={entry.id}
                            fill={getColor(index, entry.series.config.color)}
                            stroke="white"
                            strokeWidth={2}
                            style={{
                                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                                cursor: 'pointer'
                            }}
                        />
                    ))}
                </Pie>

                {chart.config.showTooltip && !isMobile && (
                    <Tooltip
                        content={(props) => (
                            <CustomSeriesTooltip
                                {...props}
                                payload={props.payload?.map(p => p.payload)}
                                chartConfig={chart.config}
                                chart={chart}
                            />
                        )}
                        cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                    />
                )}

                {chart.config.showLegend && (
                    <Legend
                        verticalAlign="bottom"
                        layout="horizontal"
                        align="center"
                        wrapperStyle={{
                            bottom: 15,
                            left: 15,
                            right: 15,
                            fontSize: '14px',
                            fontWeight: 500
                        }}
                        iconType="circle"
                        formatter={(value, entry) => (
                            <span style={{ color: entry.color, fontWeight: 500 }}>
                                {value}
                            </span>
                        )}
                    />
                )}
                {chart.config.showAnnotations && chart.annotations.filter(a => a.enabled).map((annotation) => (
                    <ChartAnnotation
                        key={annotation.id}
                        annotation={annotation}
                        globalEditable={!!chart.config.editAnnotations}
                        onPositionChange={onAnnotationPositionChange}
                    />
                ))}
            </PieChart>
        </SafeResponsiveContainer>
    );
}
