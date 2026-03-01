import React from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ZAxis,
} from 'recharts';
import { HeatmapCountyDataPoint, HeatmapUATDataPoint } from '@/schemas/heatmap';
import { formatCurrency, formatNumber, getNormalizationUnit } from '@/lib/utils';
import type { Currency, Normalization } from '@/schemas/charts';
import { SafeResponsiveContainer } from '@/components/charts/safe-responsive-container';
import { t } from '@lingui/core/macro';

interface UatPopulationSpendingScatterPlotProps {
  data: (HeatmapUATDataPoint | HeatmapCountyDataPoint)[];
  chartTitle?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  dotColor?: string;
  normalization?: Normalization;
  currency?: Currency;
}

// Define a proper interface for tooltip props with payload
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: HeatmapUATDataPoint | HeatmapCountyDataPoint;
    value?: number;
    name?: string;
  }>;
  label?: string | number;
  currencyCode: Currency;
  isPerCapita: boolean;
}

const CustomTooltip = ({ active, payload, currencyCode, isPerCapita }: CustomTooltipProps) => {
  // Check if payload exists and has at least one item with the expected structure
  if (active && payload && payload.length && payload[0].payload) {
    const dataPoint = payload[0].payload;
    const name = "uat_name" in dataPoint ? dataPoint.uat_name : dataPoint.county_name;
    const population = "population" in dataPoint ? dataPoint.population : dataPoint.county_population;
    return (
      <div className="bg-background p-2 border border-border rounded shadow-lg text-sm">
        <p className="font-semibold text-foreground">{name}</p>
        <p>{t`Population`}: {formatNumber(population ?? 0)}</p>
        <p>{t`Amount`}: {formatCurrency(dataPoint.amount, 'standard', currencyCode)}{isPerCapita ? t` / capita` : ''}</p>
      </div>
    );
  }
  return null;
};

export const UatPopulationSpendingScatterPlot: React.FC<UatPopulationSpendingScatterPlotProps> = ({
  data,
  chartTitle,
  xAxisLabel = t`Population`,
  yAxisLabel = t`Amount`,
  dotColor = '#8884d8',
  normalization,
  currency,
}) => {
  const unit = getNormalizationUnit({ normalization: normalization as any, currency: currency as any });
  const currencyCode: Currency = currency ?? (unit.includes('EUR') ? 'EUR' : unit.includes('USD') ? 'USD' : 'RON');
  const isPerCapita = unit.includes('capita');

  const saneData = React.useMemo(() =>
    data.filter(d =>
      (typeof ("population" in d ? d.population : d.county_population) === 'number') &&
      typeof d.amount === 'number' &&
      ("uat_name" in d || "county_name" in d)
    ), [data]);

  const processedForScatter = React.useMemo(() => {
    const TOP_N = 7;
    const MIN_POINTS_FOR_FILTERING = 25;

    if (saneData.length === 0) return [];
    if (saneData.length < MIN_POINTS_FOR_FILTERING) {
      return saneData; // Show all if data is too sparse
    }

    const outliersMap = new Map<string, HeatmapUATDataPoint | HeatmapCountyDataPoint>();

    const addOutliersToMap = (points: (HeatmapUATDataPoint | HeatmapCountyDataPoint)[]) => {
      points.slice(0, TOP_N).forEach(p => {
        const name = "uat_name" in p ? p.uat_name : p.county_name;
        if (name) outliersMap.set(name, p);
      });
    };

    // 1. Top N by amount
    addOutliersToMap([...saneData].sort((a, b) => b.amount - a.amount));

    // 2. Top N by population
    addOutliersToMap([...saneData].sort((a, b) => (("population" in b ? b.population : b.county_population) ?? 0) - (("population" in a ? a.population : a.county_population) ?? 0)));

    // Data for ratio calculation (population > 0)
    const ratioData = saneData.filter(p => (("population" in p ? p.population : p.county_population) ?? 0) > 0);

    if (ratioData.length > 0) {
      // 3. Top N by amount/population ratio (higher spending per capita)
      const sortedByRatioDesc = [...ratioData].sort((a, b) =>
        (b.amount / (("population" in b ? b.population : b.county_population) as number)) - (a.amount / (("population" in a ? a.population : a.county_population) as number))
      );
      addOutliersToMap(sortedByRatioDesc);

      // 4. Bottom N by amount/population ratio (lower spending per capita)
      //    Only consider UATs with some spending for this category
      const ratioDataWithSpending = ratioData.filter(p => p.amount > 0);
      if (ratioDataWithSpending.length > 0) {
        const sortedByRatioAsc = [...ratioDataWithSpending].sort((a, b) =>
          (a.amount / (("population" in a ? a.population : a.county_population) as number)) - (b.amount / (("population" in b ? b.population : b.county_population) as number))
        );
        addOutliersToMap(sortedByRatioAsc);
      }
    }
    return Array.from(outliersMap.values());
  }, [saneData]);

  if (saneData.length === 0) {
    return <p className="text-center text-sm text-muted-foreground">{t`Not enough data for scatter plot.`}</p>;
  }

  if (processedForScatter.length === 0 && saneData.length >= 25) { // MIN_POINTS_FOR_FILTERING was 25
    return <p className="text-center text-sm text-muted-foreground">{t`No distinct outliers found in the current dataset.`}</p>;
  }

  // If processedForScatter is empty because saneData was < MIN_POINTS_FOR_FILTERING, 
  // it means processedForScatter === saneData, and if saneData was empty, first check handles it.
  // If saneData was small (e.g. 1-24 points) and became processedForScatter, and that's empty (only if saneData was empty), it's caught.
  // This handles the case where saneData is not empty, but outlier filtering results in an empty set.
  if (processedForScatter.length === 0 && saneData.length > 0 && saneData.length >= 25) {
    return <p className="text-center text-sm text-muted-foreground">{t`No distinct outliers found. Try adjusting filters.`}</p>;
  }

  return (
    <div style={{ width: '100%', height: 400 }}>
      {chartTitle && <h4 className="text-md font-medium mb-2 text-center">{chartTitle}</h4>}
      <SafeResponsiveContainer width="100%" height="100%">
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
            name={t`Population`}
            tickFormatter={(value) => formatNumber(value, 'standard')}
            label={{ value: xAxisLabel, position: 'insideBottom', dy: 20, fontSize: 12 }}
            domain={['dataMin', 'dataMax']}
          />
          <YAxis
            type="number"
            dataKey="amount"
            name={t`Amount`}
            tickFormatter={(value) => `${formatCurrency(value, 'compact', currencyCode)}${isPerCapita ? t` / capita` : ''}`}
            label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', dx: -75, fontSize: 12 }}
            domain={['auto', 'auto']}
          />
          <ZAxis dataKey="uat_name" name={t`UAT Name`} />
          <Tooltip content={<CustomTooltip currencyCode={currencyCode} isPerCapita={isPerCapita} />} cursor={{ strokeDasharray: '3 3' }} />
          <Legend verticalAlign="top" height={36} />
          <Scatter name={t`UAT Outliers`} data={processedForScatter} fill={dotColor} />
        </ScatterChart>
      </SafeResponsiveContainer>
    </div>
  );
}; 
