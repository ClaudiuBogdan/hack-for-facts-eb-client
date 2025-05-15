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
import { formatCurrency, formatNumberRO } from '@/lib/utils';

interface UatTopNBarChartProps {
  data: HeatmapUATDataPoint[];
  valueKey: keyof HeatmapUATDataPoint; 
  nameKey: keyof HeatmapUATDataPoint;  
  topN?: number;
  chartTitle?: string;
  barColor?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  isCurrency?: boolean; // Added to determine if valueKey is a currency
}

export const UatTopNBarChart: React.FC<UatTopNBarChartProps> = ({
  data,
  valueKey,
  nameKey,
  topN = 10,
  chartTitle,
  barColor = '#8884d8',
  xAxisLabel,
  yAxisLabel,
  isCurrency = true, // Default to true as this chart is often used for amounts
}) => {
  const processedData = React.useMemo(() => {
    return data
      .filter(item => typeof item[valueKey] === 'number' && item[nameKey])
      .sort((a, b) => (b[valueKey] as number) - (a[valueKey] as number))
      .slice(0, topN)
      .map(item => ({ ...item, [valueKey]: item[valueKey] as number, [nameKey]: String(item[nameKey]) }));
  }, [data, valueKey, nameKey, topN]);

  if (processedData.length === 0) {
    return <p className="text-center text-sm text-muted-foreground">Not enough data to display this chart.</p>;
  }

  const getFormatter = (compactView: boolean) => {
    if (isCurrency) {
      const view = compactView ? 'compact' : 'standard'
      return (value: number) => formatCurrency(value, view);
    }
    return formatNumberRO;
  };

  const compactFormatter = getFormatter(true);
  const tooltipFormatter = getFormatter(false);

  return (
    <div style={{ width: '100%', height: 300 + topN * 10 }}>
      {chartTitle && <h4 className="text-md font-medium mb-2 text-center">{chartTitle}</h4>}
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={processedData}
          layout="vertical" 
          margin={{
            top: 5,
            right: 30,
            left: 20, 
            bottom: 70, 
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" dataKey={valueKey as string} tickFormatter={compactFormatter} label={{ value: xAxisLabel, position: 'insideBottom', dy: 30, fontSize: 12 }} />
          <YAxis type="category" dataKey={nameKey as string} width={150} interval={0} tick={{ fontSize: 10 }} label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', dx: -10, fontSize: 12 }}/>
          <Tooltip formatter={(value: number) => [tooltipFormatter(value), valueKey as string]} />
          {topN <= 15 && <Legend verticalAlign="top" height={36}/>}
          <Bar dataKey={valueKey as string} name={String(valueKey)} fill={barColor}>
            <LabelList dataKey={valueKey as string} position="right" formatter={compactFormatter} fontSize={10} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}; 