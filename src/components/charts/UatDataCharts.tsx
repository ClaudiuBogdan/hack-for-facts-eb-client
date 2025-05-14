import React from 'react';
import { HeatmapUATDataPoint } from '@/lib/api/dataDiscovery';
import { UatTopNBarChart } from './UatTopNBarChart';
import { UatCountyBarChart } from './UatCountyBarChart';
import { UatPopulationSpendingScatterPlot } from './UatPopulationSpendingScatterPlot';
import { UatAverageSpendingCountyChart } from './UatAverageSpendingCountyChart';

interface UatDataChartsProps {
  data: HeatmapUATDataPoint[];
}

export const UatDataCharts: React.FC<UatDataChartsProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return <p className="text-center text-muted-foreground">No data available to display charts.</p>;
  }

  return (
    <div className="space-y-8 p-4 md:p-6">
      {/* Top N UATs by Amount chart (Full Width) */}
      <div className="p-4 border rounded-lg bg-card shadow-lg">
        <UatTopNBarChart
          data={data}
          valueKey="amount"
          nameKey="uat_name"
          topN={15}
          chartTitle="Top 15 UATs by Amount"
          xAxisLabel="Amount"
          yAxisLabel="UAT Name"
          isCurrency={true}
        />
      </div>

      {/* Population vs Spending Scatter Plot (Full Width) */}
      <div className="p-4 border rounded-lg bg-card shadow-lg">
        <UatPopulationSpendingScatterPlot
          data={data}
          chartTitle="Population vs. Amount"
          xAxisLabel="Population"
          yAxisLabel="Amount"
        />
      </div>

      <div className="p-4 border rounded-lg bg-card shadow-lg">
        <UatCountyBarChart
          data={data}
          chartTitle="Total Amount by County"
          xAxisLabel="County"
          yAxisLabel="Total Amount"
        />
      </div>

      <div className="p-4 border rounded-lg bg-card shadow-lg">
        <UatAverageSpendingCountyChart
          data={data}
          chartTitle="Avg. Amount per UAT by County"
          xAxisLabel="County"
          yAxisLabel="Avg. Amount"
        />
      </div>

    </div>
  );
}; 