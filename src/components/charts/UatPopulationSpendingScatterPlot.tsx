import React from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ZAxis,
} from 'recharts';
import { HeatmapUATDataPoint } from '@/lib/api/dataDiscovery';
import { TooltipProps } from 'recharts/types/component/Tooltip';
import { formatCurrency, formatNumberRO } from '@/lib/utils';

interface UatPopulationSpendingScatterPlotProps {
  data: HeatmapUATDataPoint[];
  chartTitle?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  dotColor?: string;
}

// Define a type for the payload item if possible, or use a more specific one from Recharts if available
// For now, we assume payload items in scatter plots might have `payload` as HeatmapUATDataPoint
interface ScatterPayload {
  payload: HeatmapUATDataPoint;
  // Add other properties from Recharts payload item if needed
}

const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  // Check if payload exists and has at least one item with the expected structure
  if (active && payload && payload.length && (payload[0] as unknown as ScatterPayload).payload) {
    const dataPoint = (payload[0] as unknown as ScatterPayload).payload;
    return (
      <div className="bg-background p-2 border border-border rounded shadow-lg text-sm">
        <p className="font-semibold text-foreground">{dataPoint.uat_name}</p>
        <p>Population: {formatNumberRO(dataPoint.population ?? 0)}</p>
        <p>Amount: {formatCurrency(dataPoint.amount)}</p>
      </div>
    );
  }
  return null;
};

export const UatPopulationSpendingScatterPlot: React.FC<UatPopulationSpendingScatterPlotProps> = ({
  data,
  chartTitle,
  xAxisLabel = 'Population',
  yAxisLabel = 'Amount',
  dotColor = '#8884d8',
}) => {
  const saneData = React.useMemo(() =>
    data.filter(d =>
      typeof d.population === 'number' &&
      typeof d.amount === 'number' &&
      d.uat_name // Ensure uat_name exists for map keys and labels
    ), [data]);

  const processedForScatter = React.useMemo(() => {
    const TOP_N = 7;
    const MIN_POINTS_FOR_FILTERING = 25;

    if (saneData.length === 0) return [];
    if (saneData.length < MIN_POINTS_FOR_FILTERING) {
      return saneData; // Show all if data is too sparse
    }

    const outliersMap = new Map<string, HeatmapUATDataPoint>();

    const addOutliersToMap = (points: HeatmapUATDataPoint[]) => {
      points.slice(0, TOP_N).forEach(p => {
        if (p.uat_name) outliersMap.set(p.uat_name, p);
      });
    };

    // 1. Top N by amount
    addOutliersToMap([...saneData].sort((a, b) => b.amount - a.amount));

    // 2. Top N by population
    addOutliersToMap([...saneData].sort((a, b) => (b.population ?? 0) - (a.population ?? 0)));

    // Data for ratio calculation (population > 0)
    const ratioData = saneData.filter(p => p.population && p.population > 0);

    if (ratioData.length > 0) {
      // 3. Top N by amount/population ratio (higher spending per capita)
      const sortedByRatioDesc = [...ratioData].sort((a, b) =>
        (b.amount / (b.population as number)) - (a.amount / (a.population as number))
      );
      addOutliersToMap(sortedByRatioDesc);

      // 4. Bottom N by amount/population ratio (lower spending per capita)
      //    Only consider UATs with some spending for this category
      const ratioDataWithSpending = ratioData.filter(p => p.amount > 0);
      if (ratioDataWithSpending.length > 0) {
        const sortedByRatioAsc = [...ratioDataWithSpending].sort((a, b) =>
          (a.amount / (a.population as number)) - (b.amount / (b.population as number))
        );
        addOutliersToMap(sortedByRatioAsc);
      }
    }
    return Array.from(outliersMap.values());
  }, [saneData]);

  if (saneData.length === 0) {
    return <p className="text-center text-sm text-muted-foreground">Not enough data for scatter plot.</p>;
  }

  if (processedForScatter.length === 0 && saneData.length >= 25) { // MIN_POINTS_FOR_FILTERING was 25
    return <p className="text-center text-sm text-muted-foreground">No distinct outliers found in the current dataset.</p>;
  }

  // If processedForScatter is empty because saneData was < MIN_POINTS_FOR_FILTERING, 
  // it means processedForScatter === saneData, and if saneData was empty, first check handles it.
  // If saneData was small (e.g. 1-24 points) and became processedForScatter, and that's empty (only if saneData was empty), it's caught.
  // This handles the case where saneData is not empty, but outlier filtering results in an empty set.
  if (processedForScatter.length === 0 && saneData.length > 0 && saneData.length >= 25) {
    return <p className="text-center text-sm text-muted-foreground">No distinct outliers found. Try adjusting filters.</p>;
  }

  return (
    <div style={{ width: '100%', height: 400 }}>
      {chartTitle && <h4 className="text-md font-medium mb-2 text-center">{chartTitle}</h4>}
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart
          data={processedForScatter} // Use the filtered/processed data
          margin={{
            top: 20,
            right: 30,
            bottom: 60,
            left: 80,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="population"
            name="Population"
            tickFormatter={formatNumberRO}
            label={{ value: xAxisLabel, position: 'insideBottom', dy: 20, fontSize: 12 }}
            domain={['dataMin', 'dataMax']}
          />
          <YAxis
            type="number"
            dataKey="amount"
            name="Amount"
            tickFormatter={(value) => formatCurrency(value, 'compact')}
            label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', dx: -75, fontSize: 12 }}
            domain={['auto', 'auto']}
          />
          <ZAxis dataKey="uat_name" name="UAT Name" />
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
          <Legend verticalAlign="top" height={36} />
          <Scatter name="UAT Outliers" data={processedForScatter} fill={dotColor} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}; 