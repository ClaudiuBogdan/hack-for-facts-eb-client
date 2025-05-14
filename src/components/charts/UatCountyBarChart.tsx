import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import { HeatmapUATDataPoint } from '@/lib/api/dataDiscovery';
import { formatCurrency } from '@/lib/utils';

interface UatCountyBarChartProps {
  data: HeatmapUATDataPoint[];
  chartTitle?: string;
  barColor?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
}

export const UatCountyBarChart: React.FC<UatCountyBarChartProps> = ({
  data,
  chartTitle,
  barColor = '#ffc658',
  xAxisLabel,
  yAxisLabel = 'Total Amount',
}) => {
  const processedData = React.useMemo(() => {
    const countyData: { [key: string]: number } = {};

    data.forEach(item => {
      if (item.county_name && typeof item.amount === 'number') {
        countyData[item.county_name] = (countyData[item.county_name] || 0) + item.amount;
      }
    });

    return Object.entries(countyData)
      .map(([countyName, totalAmount]) => ({ county_name: countyName, total_amount: totalAmount }))
      .sort((a, b) => b.total_amount - a.total_amount);
  }, [data]);

  if (processedData.length === 0) {
    return <p className="text-center text-sm text-muted-foreground">Not enough county data to display this chart.</p>;
  }

  return (
    <div style={{ width: '100%', height: 400 }}>
      {chartTitle && <h4 className="text-md font-medium mb-2 text-center">{chartTitle}</h4>}
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={processedData}
          margin={{
            top: 5,
            right: 30,
            left: 70,
            bottom: 70, // Increased for angled XAxis labels
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="county_name" angle={-45} textAnchor="end" interval={0} tick={{ fontSize: 10 }} height={50} label={{ value: xAxisLabel, position: 'insideBottom', dy: 50, fontSize: 12 }} />
          <YAxis tickFormatter={(value) => formatCurrency(value, 'compact')} label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', fontSize: 12 }} />
          <Tooltip formatter={(value: number) => [formatCurrency(value, 'compact'), 'Total Amount']} />
          <Legend verticalAlign="top" height={36} />
          <Bar dataKey="total_amount" name="Total Amount" fill={barColor}>
            <LabelList dataKey="total_amount" position="top" formatter={(value: number) => value > 0 ? formatCurrency(value, 'compact') : ''} fontSize={10} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}; 