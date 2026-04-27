import React, { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, Tooltip, Legend, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { getNormalizationUnit } from '@/lib/utils';
import { PieChartIcon, BarChartIcon } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from "@/components/ui/select";
import { processDataForAnalyticsChart } from '@/lib/analytics-utils';
import { LineItemsAnalyticsSkeleton } from './LineItemsAnalyticsSkeleton';
import { applyAlpha, yValueFormatter } from '../charts/components/chart-renderer/utils';
import { Trans } from '@lingui/react/macro';
import { t } from '@lingui/core/macro';
import { TMonth, TQuarter } from '@/schemas/reporting';
import { getYearLabel } from './utils';
import { DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES, DEFAULT_INCOME_EXCLUDE_FUNCTIONAL_PREFIXES } from '@/lib/analytics-defaults';
import type { Currency, Normalization } from '@/schemas/charts';
import { SafeResponsiveContainer } from '@/components/charts/safe-responsive-container';

interface AnalyticsProps {
    lineItems?: { nodes: readonly import('@/lib/api/entities').ExecutionLineItem[] } | null;
    analyticsYear: number;
    month?: TMonth;
    quarter?: TQuarter;
    years: number[];
    onYearChange: (year: number) => void;
    chartType: ChartType;
    onChartTypeChange: (type: ChartType) => void;
    dataType: DataType;
    onDataTypeChange: (type: DataType) => void;
    isLoading?: boolean;
    normalization?: Normalization;
    currency?: Currency;
    onPrefetchYear?: (year: number) => void;
    onPrefetchDataType?: (type: DataType) => void;
    onPrefetchChartType?: (type: ChartType) => void;
}

type ChartType = 'bar' | 'pie';
type DataType = 'income' | 'expense';

const COLORS = ['#16a34a', '#3b82f6', '#f97316', '#fde047', '#a855f7', '#ec4899', '#78716c'];

export const LineItemsAnalytics: React.FC<AnalyticsProps> = ({
    lineItems,
    analyticsYear,
    month,
    quarter,
    years,
    onYearChange,
    chartType,
    onChartTypeChange,
    dataType,
    onDataTypeChange,
    isLoading,
    normalization,
    currency,
    onPrefetchYear,
    onPrefetchDataType,
    onPrefetchChartType,
}) => {
    const [isMobile, setIsMobile] = useState(false);
    const [isTablet, setIsTablet] = useState(false);

    useEffect(() => {
        const checkScreenSize = () => {
            setIsMobile(window.innerWidth < 640);
            setIsTablet(window.innerWidth >= 640 && window.innerWidth < 768);
        };

        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    const expenses = useMemo(() => {
        const items = lineItems?.nodes.filter(li => li.account_category === 'ch') || [];
        return items.filter((item) => {
            const code = item.economicClassification?.economic_code || '';
            return !DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES.some((prefix) => code.startsWith(prefix));
        });
    }, [lineItems]);

    const incomes = useMemo(() => {
        const items = lineItems?.nodes.filter(li => li.account_category === 'vn') || [];
        return items.filter((item) => {
            const code = item.functionalClassification?.functional_code || '';
            return !DEFAULT_INCOME_EXCLUDE_FUNCTIONAL_PREFIXES.some((prefix) => code.startsWith(prefix));
        });
    }, [lineItems]);

    const incomeData = useMemo(() => processDataForAnalyticsChart(incomes), [incomes]);
    const expenseData = useMemo(() => processDataForAnalyticsChart(expenses), [expenses]);

    const activeData = dataType === 'income' ? incomeData : expenseData;

    const totalActiveAmount = useMemo(() => activeData.reduce((sum, d) => sum + d.value, 0), [activeData]);

    type BarLabelProps = {
        x?: number | string;
        y?: number | string;
        width?: number | string;
        value?: number | string;
    };

    const renderBarLabel = (props: BarLabelProps) => {
        const { x = 0, y = 0, width = 0, value = 0 } = props;
        const numericValue = Number(value);
        const percent = totalActiveAmount ? (numericValue / totalActiveAmount) * 100 : 0;
        return (
            <text
                x={Number(x) + Number(width) / 2}
                y={Number(y) - 6}
                fill="#334155"
                textAnchor="middle"
                fontSize="12px"
            >
                {`${Number(percent) > 10 ? percent.toFixed(0) : percent.toFixed(2)}%`}
            </text>
        );
    };

    if (isLoading) {
        return <LineItemsAnalyticsSkeleton />;
    }

    const unit = getNormalizationUnit({ normalization: (normalization ?? 'total') as 'total' | 'per_capita' | 'percent_gdp' | 'total_euro' | 'per_capita_euro', currency: currency as 'RON' | 'EUR' | 'USD' });

    const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string; stroke?: string; dataKey: string; }[]; label?: string }) => {
        if (!active || !payload || !payload.length) return null;
        const title = dataType === 'income' ? t`Income` : t`Expenses`;
        return (
            <div className="bg-white/80 dark:bg-slate-800/90 backdrop-blur-sm p-3 border border-slate-300 dark:border-slate-700 rounded-lg shadow-lg">
                <p className="label font-bold mb-2">{label}</p>
                <div className="flex flex-col gap-2">
                    <div style={{ color: payload[0].stroke || payload[0].color }} className="flex flex-row gap-4 justify-between items-center text-sm">
                        <p>{title}</p>
                        <p className="font-mono text-md font-bold text-slate-800 dark:text-slate-400">{yValueFormatter(Number(payload[0].value), unit)}</p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <Card className="shadow-lg dark:bg-slate-800">
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div className="flex items-center">
                        <Select
                            value={analyticsYear.toString()}
                            onValueChange={(val) => onYearChange(parseInt(val, 10))}
                        >
                            <SelectTrigger className="w-auto border-0 shadow-none bg-transparent focus:ring-0">
                                <CardTitle className="text-base sm:text-lg">
                                    <Trans>Main Categories</Trans> {getYearLabel(analyticsYear, month, quarter)}
                                </CardTitle>
                            </SelectTrigger>
                            <SelectContent>
                                {years.map((year) => (
                                    <SelectItem key={year} value={year.toString()} onMouseEnter={() => onPrefetchYear?.(year)}>
                                        {getYearLabel(year, month, quarter)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                        <ToggleGroup type="single" variant="outline" size="sm" value={dataType} onValueChange={(value: DataType) => value && onDataTypeChange(value)}>
                            <ToggleGroupItem value="income" aria-label="Income" onMouseEnter={() => onPrefetchDataType?.('income')}>
                                {isMobile ? 'Inc' : 'Income'}
                            </ToggleGroupItem>
                            <ToggleGroupItem value="expense" aria-label="Expenses" onMouseEnter={() => onPrefetchDataType?.('expense')}>
                                {isMobile ? 'Exp' : 'Expenses'}
                            </ToggleGroupItem>
                        </ToggleGroup>
                        <ToggleGroup type="single" variant="outline" size="sm" value={chartType} onValueChange={(value: ChartType) => value && onChartTypeChange(value)}>
                            <ToggleGroupItem value="bar" aria-label="Bar chart" onMouseEnter={() => onPrefetchChartType?.('bar')}>
                                <BarChartIcon className="h-4 w-4" />
                            </ToggleGroupItem>
                            <ToggleGroupItem value="pie" aria-label="Pie chart" onMouseEnter={() => onPrefetchChartType?.('pie')}>
                                <PieChartIcon className="h-4 w-4" />
                            </ToggleGroupItem>
                        </ToggleGroup>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="w-full h-64 sm:h-80 md:h-96 lg:h-[480px]">
                    <SafeResponsiveContainer width="100%" height="100%">
                        {chartType === 'bar' ? (
                            <BarChart data={activeData} margin={{ top: 20, right: 20, left: Math.max(unit.length * 4 + 20, 60), bottom: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 10 }}
                                    angle={-45}
                                    textAnchor="end"
                                    interval={0}
                                    height={80}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    tickFormatter={(value) => yValueFormatter(Number(value), unit)}
                                    tick={{ fontSize: 10 }}
                                    tickLine={false}
                                    axisLine={false}
                                    width={Math.max(unit.length * 4 + 20, 50)}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar
                                    dataKey="value"
                                    fill={dataType === 'income' ? applyAlpha('#10b981', 0.2) : applyAlpha('#f43f5e', 0.2)}
                                    stroke={dataType === 'income' ? '#0f766e' : '#be123c'}
                                    strokeWidth={2}
                                    radius={[2, 2, 0, 0]}
                                >
                                    <LabelList content={(props) => renderBarLabel(props as BarLabelProps)} />
                                </Bar>
                            </BarChart>
                        ) : (
                            <PieChart>
                                <Pie
                                    data={activeData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="45%"
                                    animationBegin={0}
                                    animationDuration={300}
                                    outerRadius={isMobile ? 80 : isTablet ? 100 : 140}
                                    labelLine={true}
                                    label={({ name, percent }) => `${(name ?? '').slice(0, isMobile ? 15 : 25)} (${((percent || 0) * 100).toFixed(0)}%)`}
                                >
                                    {activeData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    verticalAlign="bottom"
                                    height={isMobile ? 36 : 50}
                                    wrapperStyle={{ fontSize: isMobile ? '10px' : '12px' }}
                                />
                            </PieChart>
                        )}
                    </SafeResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
};
