import { Treemap, Tooltip } from 'recharts';
import { ChartRendererProps } from '../ChartRenderer';
import { CustomSeriesTooltip } from '../Tooltips';
import { AlertTriangle, Info } from 'lucide-react';
import { useMemo } from 'react';
import { yValueFormatter } from '../../utils';
import { DataPointPayload } from '@/components/charts/hooks/useChartData';
import { ChartAnnotation } from '../ChartAnnotation';
import { SafeResponsiveContainer } from '@/components/charts/safe-responsive-container';
import { useIsMobile } from '@/hooks/use-mobile';

const MIN_WIDTH_FOR_NAME = 50;
const MIN_HEIGHT_FOR_NAME = 20;
const MIN_HEIGHT_FOR_VALUE = 35;

const NAME_FONT_SIZE = 12;
const VALUE_FONT_SIZE = 10;

interface CustomizedContentProps {
    depth: number;
    x: number;
    y: number;
    width: number;
    height: number;
    index: number;
    payload?: DataPointPayload;
}

const CustomizedContent: React.FC<CustomizedContentProps> = (props) => {
    const { depth, x, y, width, height, payload } = props;

    if (!payload || isNaN(payload.value) || !payload.series.config.color) {
        return null;
    }

    const displayValue = yValueFormatter(payload.value, payload.unit, 'compact');
    const textColor = '#FFFFFF';

    const canShowName = width > MIN_WIDTH_FOR_NAME && height > MIN_HEIGHT_FOR_NAME;
    const canShowValue = canShowName && height > MIN_HEIGHT_FOR_VALUE;

    // Calculate truncation based on available width
    const maxChars = Math.floor(width / (NAME_FONT_SIZE * 0.55));
    const truncatedName = payload.series.label.length > maxChars
        ? payload.series.label.slice(0, maxChars - 1) + '…'
        : payload.series.label;

    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                style={{
                    fill: payload.series.config.color,
                    stroke: '#fff',
                    strokeWidth: 2 / (depth + 1e-10),
                    strokeOpacity: 0.5,
                }}
            />
            {canShowName && (
                <text
                    x={x + width / 2}
                    y={canShowValue ? y + height / 2 - VALUE_FONT_SIZE / 2 : y + height / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={textColor}
                    fontSize={NAME_FONT_SIZE}
                    fontWeight={500}
                    style={{ pointerEvents: 'none' }}
                >
                    {truncatedName}
                </text>
            )}
            {canShowValue && (
                <text
                    x={x + width / 2}
                    y={y + height / 2 + NAME_FONT_SIZE / 2 + 3}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={textColor}
                    fontSize={VALUE_FONT_SIZE}
                    fillOpacity={0.9}
                >
                    {displayValue}
                </text>
            )}
        </g>
    );
};

export type TreemapData = {
    name: string;
    value: number;
    children: TreemapData[];
    payload?: DataPointPayload;
}

export function AggregatedTreemapChart({ chart, aggregatedData, unitMap, height, onAnnotationPositionChange }: ChartRendererProps) {
    const isMobile = useIsMobile();
    const units = new Set(unitMap.values());

    const treemapData: TreemapData[] = useMemo(() => {
        if (!aggregatedData || aggregatedData.length === 0) {
            return [];
        }

        const totalValue = aggregatedData.reduce((acc, item) => acc + item.value, 0);

        return [{
            name: 'Aggregated Data',
            value: totalValue,
            children: aggregatedData.map(item => ({
                name: item.series.label,
                value: item.value,
                payload: item,
                children: [],
            })),
        }];
    }, [aggregatedData]);

    if (units.size > 1) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground" style={{ height }}>
                <AlertTriangle className="w-12 h-12 text-amber-500" />
                <p className="mt-4 text-center text-lg">Multiple units selected</p>
                <p className="text-sm text-center">Treemaps cannot effectively display series with different units ({Array.from(units).join(', ')}).</p>
            </div>
        );
    }

    if (!treemapData || treemapData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground" style={{ height }}>
                <Info className="w-12 h-12 text-blue-500" />
                <p className="mt-4 text-center text-lg">No data available</p>
                <p className="text-sm text-center">There is no data to display for the selected filters.</p>
            </div>
        )
    }

    return (
        <SafeResponsiveContainer width="100%" height={height} style={{ padding: '2rem' }}>
            <Treemap
                data={treemapData}
                dataKey="value"
                nameKey="name"
                animationEasing="ease-in-out"
                animationDuration={300}
                animationBegin={0}
                content={(props) => <CustomizedContent {...(props)} />}
            >
                {!isMobile && <Tooltip
                    content={({ active, payload }) => <CustomSeriesTooltip active={active} payload={payload.map(p => p.payload)} chartConfig={chart.config} chart={chart} />}
                />}
                {chart.config.showAnnotations && chart.annotations.filter(a => a.enabled).map((annotation) => (
                    <ChartAnnotation
                        key={annotation.id}
                        annotation={annotation}
                        globalEditable={!!chart.config.editAnnotations}
                        onPositionChange={onAnnotationPositionChange}
                    />
                ))}
            </Treemap>
        </SafeResponsiveContainer>
    );
}
