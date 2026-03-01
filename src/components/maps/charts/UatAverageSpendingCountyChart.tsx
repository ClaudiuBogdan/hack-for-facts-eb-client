import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from 'recharts';
import { HeatmapCountyDataPoint, HeatmapUATDataPoint } from '@/schemas/heatmap';
import { formatCurrency } from '@/lib/utils';
import { SafeResponsiveContainer } from '@/components/charts/safe-responsive-container';
import { t } from '@lingui/core/macro';

interface UatAverageSpendingCountyChartProps {
  data: (HeatmapUATDataPoint | HeatmapCountyDataPoint)[];
  chartTitle?: string;
  barColor?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
}

export const UatAverageSpendingCountyChart: React.FC<UatAverageSpendingCountyChartProps> = ({
  data,
  chartTitle,
  barColor = '#00C49F',
  xAxisLabel,
  yAxisLabel = t`Avg. Amount per UAT`,
}) => {
  const processedData = React.useMemo(() => {
    const countyAggregates: { [key: string]: { totalAmount: number; count: number } } = {};

    data.forEach(item => {
      if (item.county_name && typeof item.amount === 'number') {
        if (!countyAggregates[item.county_name]) {
          countyAggregates[item.county_name] = { totalAmount: 0, count: 0 };
        }
        countyAggregates[item.county_name].totalAmount += item.amount;
        countyAggregates[item.county_name].count++;
      }
    });

    return Object.entries(countyAggregates)
      .map(([countyName, aggregates]) => ({
        county_name: countyName,
        average_amount: aggregates.count > 0 ? aggregates.totalAmount / aggregates.count : 0,
      }))
      .sort((a, b) => b.average_amount - a.average_amount);
  }, [data]);

  if (processedData.length === 0) {
    return <p className="text-center text-sm text-muted-foreground">{t`Not enough county data for average spending chart.`}</p>;
  }

  return (
    <div style={{ width: '100%', height: 400 }}>
      {chartTitle && <h4 className="text-md font-medium mb-2 text-center">{chartTitle}</h4>}
      <SafeResponsiveContainer width="100%" height="100%">
        <BarChart
          data={processedData}
          margin={{
            top: 5,
            right: 30,
            left: 80,
            bottom: 70,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="county_name" angle={-45} textAnchor="end" interval={0} tick={{ fontSize: 10 }} height={50} label={{ value: xAxisLabel, position: 'insideBottom', dy: 50, fontSize: 12 }} />
          <YAxis tickFormatter={(value) => formatCurrency(value, 'compact')} label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', dx: -75, fontSize: 12 }} />
          <Tooltip formatter={(value) => [formatCurrency(Number(value ?? 0), 'compact'), t`Avg. Amount`]} />
          <Legend verticalAlign="top" height={36} />
          <Bar dataKey="average_amount" name={t`Avg. Amount per UAT`} fill={barColor}>
            <LabelList dataKey="average_amount" position="top"  angle={-45} offset={50} formatter={(value: React.ReactNode) => typeof value === 'number' && value > 0 ? formatCurrency(value, 'compact') : ''} fontSize={10} />
          </Bar>
        </BarChart>
      </SafeResponsiveContainer>
    </div>
  );
}; 
