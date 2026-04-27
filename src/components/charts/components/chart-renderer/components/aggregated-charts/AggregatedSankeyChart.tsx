import { ChartRendererProps } from '../ChartRenderer';
import { useMemo, memo, useState, useRef, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { yValueFormatter } from '../../utils';
import { DataPointPayload } from '@/components/charts/hooks/useChartData';
import { ChartMargins } from '../interfaces';
import { sankey, sankeyLinkHorizontal, SankeyNode, SankeyLink } from 'd3-sankey';
import { Annotation, CircleSubject, Connector, EditableAnnotation, Label } from '@visx/annotation';
import { applyAlpha } from '../../utils';

// Constants
const CHART_MARGINS: ChartMargins = {
    top: 20,
    right: 300,
    bottom: 20,
    left: 300,
} as const;

const NODE_CONFIG = {
    width: 10,
    minHeight: 60,
    fontSize: {
        label: 14,
        value: 12,
    },
} as const;

const THEME = {
    node: {
        text: '#333',
        textOpacity: {
            primary: 1,
            secondary: 0.8,
        },
    },
    link: {
        color: '#B3B3B3',
        opacity: 0.5,
    },
    total: {
        color: '#A9A9A9',
    },
    other: {
        color: '#D3D3D3',
    },
} as const;

const DATA_CONFIG = {
    maxNodes: 8,
    minPercentage: 2,
} as const;

interface SankeyNodeData {
    id: string;
    label: string;
    value: number;
    unit?: string;
    color: string;
    payload: DataPointPayload;
}

interface SankeyLinkData {
    source: string;
    target: string;
    value: number;
}

interface SankeyData {
    nodes: SankeyNodeData[];
    links: SankeyLinkData[];
}

// Error display component
const MultiUnitError: React.FC<{ units: string[]; height: number }> = memo(({ units, height }) => (
    <div
        className="h-full p-4"
        role="alert"
        aria-live="polite"
        style={{ height }}
    >
        <div className="flex flex-col items-center justify-center text-muted-foreground m-30">
            <AlertTriangle className="w-12 h-12 text-amber-500" aria-hidden="true" />
            <h3 className="mt-4 text-center text-lg font-medium">Multiple units selected</h3>
            <p className="text-sm text-center mt-2 max-w-md">
                Sankey charts cannot effectively display series with different units
                ({units.join(', ')}). Please select series with the same unit.
            </p>
        </div>
    </div>
));

MultiUnitError.displayName = 'MultiUnitError';

// Helper function to prepare Sankey data
const prepareSankeyData = (aggregatedData: DataPointPayload[]): SankeyData => {
    if (!aggregatedData || aggregatedData.length === 0) {
        return { nodes: [], links: [] };
    }

    const totalValue = aggregatedData.reduce((acc, d) => acc + d.value, 0);
    const unit = aggregatedData[0]?.unit;
    const year = aggregatedData[0]?.year;

    // Sort data by value in descending order
    const sortedData = [...aggregatedData].sort((a, b) => b.value - a.value);

    // Filter and group smaller values
    const minValue = (totalValue * DATA_CONFIG.minPercentage) / 100;
    const displayedNodes: DataPointPayload[] = [];
    const otherNodes: DataPointPayload[] = [];

    for (const node of sortedData) {
        // Skip very small values
        if (node.value <= 1) continue;

        // Add to displayed if under max nodes and above percentage threshold
        if (displayedNodes.length < DATA_CONFIG.maxNodes && node.value >= minValue) {
            displayedNodes.push(node);
        } else {
            otherNodes.push(node);
        }
    }

    // Create nodes array
    const nodes: SankeyNodeData[] = displayedNodes.map((d) => ({
        id: d.id || d.series.id,
        label: d.series.label,
        value: d.value,
        unit: d.unit,
        color: d.series.config.color || '#666',
        payload: d,
    }));

    // Create "Other" node if there are grouped items
    if (otherNodes.length > 0) {
        const otherValue = otherNodes.reduce((acc, d) => acc + d.value, 0);
        nodes.push({
            id: 'other',
            label: `Other (${otherNodes.length})`,
            value: otherValue,
            unit: unit,
            color: THEME.other.color,
            payload: {
                value: otherValue,
                unit: unit,
                initialValue: otherValue,
                initialUnit: unit,
                year: year,
                id: 'other',
                series: {
                    id: 'other',
                    label: `Other (${otherNodes.length})`,
                    config: {
                        color: THEME.other.color,
                    },
                },
            },
        });
    }

    // Add total node
    nodes.push({
        id: 'total',
        label: 'Total',
        value: totalValue,
        unit: unit,
        color: THEME.total.color,
        payload: {
            value: totalValue,
            unit: unit,
            initialValue: totalValue,
            initialUnit: unit,
            year: year,
            id: 'total',
            series: {
                id: 'total',
                label: 'Total',
                config: {
                    color: THEME.total.color,
                },
            },
        },
    });

    // Create links from all source nodes to total
    const links: SankeyLinkData[] = nodes.slice(0, -1).map((node) => ({
        source: node.id,
        target: 'total',
        value: node.value,
    }));

    return { nodes, links };
};

interface TooltipProps {
    node?: SankeyNodeData;
    x: number;
    y: number;
}

const SankeyTooltip = memo<TooltipProps>(({ node, x, y }) => {
    if (!node) return null;

    return (
        <div
            className="absolute z-50 bg-popover text-popover-foreground rounded-md border shadow-md p-3 text-sm pointer-events-none"
            style={{
                left: x,
                top: y,
                transform: 'translate(-50%, -100%) translateY(-8px)',
            }}
        >
            <div className="font-medium mb-1">{node.label}</div>
            <div className="text-muted-foreground">
                {yValueFormatter(node.value, node.unit)}
            </div>
        </div>
    );
});

SankeyTooltip.displayName = 'SankeyTooltip';

export function AggregatedSankeyChart({ chart, aggregatedData, unitMap, height, onAnnotationPositionChange }: ChartRendererProps) {
    const units = new Set(unitMap.values());
    const containerRef = useRef<HTMLDivElement>(null);
    const [tooltip, setTooltip] = useState<TooltipProps>({ x: 0, y: 0 });
    const [containerWidth, setContainerWidth] = useState(0);

    // Handle responsive width
    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerWidth(entry.contentRect.width);
            }
        });

        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    // Memoize Sankey data preparation
    const sankeyData = useMemo(
        () => prepareSankeyData(aggregatedData),
        [aggregatedData]
    );

    // Calculate dynamic height based on number of nodes
    const calculatedHeight = useMemo(() => {
        const nodeCount = sankeyData.nodes.length;
        const minHeight = height || 400;
        const dynamicHeight = Math.max(
            minHeight,
            nodeCount * NODE_CONFIG.minHeight + CHART_MARGINS.top + CHART_MARGINS.bottom
        );
        return Math.min(dynamicHeight, 400); // too much height overflows the container. 400 is a sweet magic number.
    }, [sankeyData.nodes.length, height]);

    // Generate Sankey layout
    const { nodes, links } = useMemo(() => {
        if (sankeyData.nodes.length === 0 || containerWidth === 0) {
            return { nodes: [], links: [] };
        }

        const chartWidth = containerWidth - CHART_MARGINS.left - CHART_MARGINS.right;
        const chartHeight = calculatedHeight - CHART_MARGINS.top - CHART_MARGINS.bottom;

        const sankeyGenerator = sankey<SankeyNodeData, SankeyLinkData>()
            .nodeId((d: SankeyNodeData) => d.id)
            .nodeWidth(NODE_CONFIG.width)
            .nodePadding(30)
            .extent([
                [0, 0],
                [chartWidth, chartHeight],
            ])
            .iterations(32);

        const { nodes, links } = sankeyGenerator({
            nodes: sankeyData.nodes.map((d: SankeyNodeData) => ({ ...d })),
            links: sankeyData.links.map((d: SankeyLinkData) => ({ ...d })),
        });

        return { nodes, links };
    }, [sankeyData, containerWidth, calculatedHeight]);

    // Handle multiple units error case
    if (units.size > 1) {
        return <MultiUnitError units={Array.from(units)} height={height ?? 0} />;
    }

    // Handle empty data case
    if (sankeyData.nodes.length === 0) {
        return (
            <div
                className="flex items-center justify-center h-full text-muted-foreground"
                style={{ height }}
            >
                <p>No data available</p>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="w-full relative" style={{ height: calculatedHeight }}>
            {containerWidth > 0 && (
                <svg
                    width={containerWidth}
                    height={calculatedHeight}
                    className="w-full"
                    role="img"
                    aria-label="Sankey diagram showing budget distribution"
                >
                    <g transform={`translate(${CHART_MARGINS.left},${CHART_MARGINS.top})`}>
                        {/* Render links */}
                        {links.map((link: SankeyLink<SankeyNodeData, SankeyLinkData>, i: number) => {
                            const path = sankeyLinkHorizontal()(link);
                            return path ? (
                                <path
                                    key={`link-${i}`}
                                    d={path}
                                    fill="none"
                                    stroke={THEME.link.color}
                                    strokeOpacity={THEME.link.opacity}
                                    strokeWidth={Math.max(1, link.width || 0)}
                                />
                            ) : null;
                        })}

                        {/* Render nodes */}
                        {nodes.map((node: SankeyNode<SankeyNodeData, SankeyLinkData>) => {
                            const nodeData = node as unknown as SankeyNode<SankeyNodeData, SankeyLinkData>;
                            if (nodeData.x0 === undefined || nodeData.y0 === undefined) return null;

                            const x = nodeData.x0;
                            const y = nodeData.y0;
                            const width = (nodeData.x1 || 0) - (nodeData.x0 || 0);
                            const height = (nodeData.y1 || 0) - (nodeData.y0 || 0);
                            const isRightSide = nodeData.id === 'total';
                            const labelX = isRightSide ? x - 6 : x + width + 6;
                            const textAnchor = isRightSide ? 'end' : 'start';
                            const centerY = y + height / 2;

                            return (
                                <g
                                    key={nodeData.id}
                                    onMouseEnter={(e) => {
                                        if (!chart.config.showTooltip) return;
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const containerRect = containerRef.current?.getBoundingClientRect();
                                        if (!containerRect) return;

                                        setTooltip({
                                            node: nodeData as unknown as SankeyNodeData,
                                            x: rect.left + rect.width / 2 - containerRect.left,
                                            y: rect.top - containerRect.top,
                                        });
                                    }}
                                    onMouseLeave={() => setTooltip({ x: 0, y: 0 })}
                                    className="cursor-pointer"
                                >
                                    <rect
                                        x={x}
                                        y={y}
                                        width={width}
                                        height={height}
                                        fill={(nodeData as unknown as SankeyNodeData).color}
                                        fillOpacity={1}
                                    />
                                    <text
                                        x={labelX}
                                        y={centerY - 2}
                                        textAnchor={textAnchor}
                                        fontSize={NODE_CONFIG.fontSize.label}
                                        fill={THEME.node.text}
                                        opacity={THEME.node.textOpacity.primary}
                                        dominantBaseline="middle"
                                    >
                                        {(nodeData as unknown as SankeyNodeData).label}
                                    </text>
                                    <text
                                        x={labelX}
                                        y={centerY + 13}
                                        textAnchor={textAnchor}
                                        fontSize={NODE_CONFIG.fontSize.value}
                                        fill={THEME.node.text}
                                        opacity={THEME.node.textOpacity.secondary}
                                        dominantBaseline="middle"
                                    >
                                        {yValueFormatter(
                                            (nodeData as unknown as SankeyNodeData).value,
                                            (nodeData as unknown as SankeyNodeData).unit
                                        )}
                                    </text>
                                </g>
                            );
                        })}

                        {/* Render annotations inside the SVG context */}
                        {chart.config.showAnnotations && chart.annotations.filter(a => a.enabled).map((annotation) => {
                            const plotWidth = containerWidth - CHART_MARGINS.left - CHART_MARGINS.right;
                            const plotHeight = calculatedHeight - CHART_MARGINS.top - CHART_MARGINS.bottom;
                            const xPos = annotation.pX * plotWidth;
                            const yPos = annotation.pY * plotHeight;
                            const xDelta = annotation.pXDelta * plotWidth;
                            const yDelta = annotation.pYDelta * plotHeight;

                            const content = (
                                <>
                                    {annotation.connector && <Connector stroke={annotation.color} type={annotation.subject ? 'line' : 'elbow'} />}
                                    {annotation.subject && <CircleSubject stroke={annotation.color} />}
                                    {annotation.label && (
                                        <Label
                                            anchorLineStroke={annotation.color}
                                            titleFontSize={14}
                                            subtitleFontSize={12}
                                            title={annotation.title}
                                            subtitle={annotation.subtitle}
                                            backgroundFill={applyAlpha(annotation.color, 0.1)}
                                        />
                                    )}
                                </>
                            );

                            if (!chart.config.editAnnotations && annotation.locked) {
                                return (
                                    <Annotation key={annotation.id} x={xPos} y={yPos} dx={xDelta} dy={yDelta}>
                                        {content}
                                    </Annotation>
                                );
                            }

                            return (
                                <EditableAnnotation
                                    key={annotation.id}
                                    x={xPos}
                                    y={yPos}
                                    dx={xDelta}
                                    dy={yDelta}
                                    width={plotWidth}
                                    height={plotHeight}
                                    onDragEnd={({ x, y, dx, dy }) => {
                                        const pX = x / plotWidth;
                                        const pY = y / plotHeight;
                                        const pXDelta = dx / plotWidth;
                                        const pYDelta = dy / plotHeight;
                                        onAnnotationPositionChange({ annotationId: annotation.id, position: { pX, pY, pXDelta, pYDelta } });
                                    }}
                                >
                                    {content}
                                </EditableAnnotation>
                            );
                        })}
                    </g>
                </svg>
            )}

            {chart.config.showTooltip && tooltip.node && (
                <SankeyTooltip {...tooltip} />
            )}
        </div>
    );
}
