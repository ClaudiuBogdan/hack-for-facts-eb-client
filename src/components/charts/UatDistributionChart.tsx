import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Legend,
} from 'recharts';
import { HeatmapUATDataPoint } from '@/lib/api/dataDiscovery';

interface UatDistributionChartProps {
  data: HeatmapUATDataPoint[];
  valueKey: keyof HeatmapUATDataPoint;
  chartTitle?: string;
  barColor?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  numberOfBins?: number;
}

const formatNumber = (value: number) => {
  if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
};

export const UatDistributionChart: React.FC<UatDistributionChartProps> = ({
  data,
  valueKey,
  chartTitle,
  barColor = '#82ca9d',
  xAxisLabel = 'Value Bins',
  yAxisLabel = 'Number of UATs',
  numberOfBins = 10,
}) => {
  const processedData = React.useMemo(() => {
    const values = data
      .map(item => item[valueKey] as number)
      .filter(value => typeof value === 'number' && !isNaN(value));

    if (values.length === 0) return [];

    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

    if (minValue === maxValue) { // Handle case where all values are the same
        return [{
            name: `${formatNumber(minValue)} - ${formatNumber(maxValue)}`,
            count: values.length
        }];
    }

    const binSize = (maxValue - minValue) / numberOfBins;
    const bins = Array(numberOfBins).fill(0).map(() => ({ name: '', count: 0 }));

    values.forEach(value => {
      let binIndex = Math.floor((value - minValue) / binSize);
      // For the maxValue, it should go into the last bin
      if (value === maxValue) {
        binIndex = numberOfBins - 1;
      }
      // Ensure binIndex is within bounds, especially for minValue if binSize is 0 or value is minValue
      binIndex = Math.max(0, Math.min(binIndex, numberOfBins - 1)); 
      bins[binIndex].count++;
    });

    return bins.map((bin, index) => {
      const binStart = minValue + index * binSize;
      const binEnd = minValue + (index + 1) * binSize;
      return {
        name: `${formatNumber(binStart)} - ${formatNumber(binEnd)}`,
        count: bin.count,
      };
    });
  }, [data, valueKey, numberOfBins]);

  if (processedData.length === 0) {
    return <p className="text-center text-sm text-muted-foreground">Not enough data to display distribution chart.</p>;
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
            left: 20,
            bottom: 40, // Increased bottom margin for xAxisLabel
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} tick={{ fontSize: 10 }} label={{ value: xAxisLabel, position: 'insideBottom', dy:30, fontSize: 12 }} />
          <YAxis label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', fontSize: 12 }} tickFormatter={formatNumber} />
          <Tooltip formatter={(value: number) => [value, 'Count']} />
          <Legend verticalAlign="top" height={36}/>
          <Bar dataKey="count" name="Number of UATs" fill={barColor}>
            <LabelList dataKey="count" position="top" fontSize={10} formatter={(value: number) => value > 0 ? value.toString() : ''} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}; 