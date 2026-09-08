import { PopulationMethodologyNote } from '@/components/normalization/population-methodology-note';
import * as React from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Chart } from "@/schemas/charts";
import { getChartTypeIcon } from "../../utils";
import { ChartRenderer } from "../chart-renderer/components/ChartRenderer";
import { AnnotationPositionChange, ChartMargins } from "../chart-renderer/components/interfaces";
import { ChartTitle } from "../chart-renderer/components/ChartTitle";
import { DataPointPayload, DataSeriesMap, TimeSeriesDataPoint, UnitMap } from "../../hooks/useChartData";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { getSiteUrl } from "@/config/env";

// --- Type Definitions ---

interface ChartDisplayAreaProps {
  chart: Chart;
  timeSeriesData: TimeSeriesDataPoint[];
  aggregatedData: DataPointPayload[];
  dataMap?: DataSeriesMap;
  unitMap: UnitMap;
  isLoading: boolean;
  error: Error | null | undefined;
  onAddSeries: () => void;
  onAnnotationPositionChange: (pos: AnnotationPositionChange) => void;
  onXAxisClick?: (value: number | string) => void;
  isPreview?: boolean;
  margins?: Partial<ChartMargins>;
  xAxisMarker?: number | string;
  height?: number;
}


/**
 * Orchestrates the display of the chart area, handling all possible states:
 * no series, loading, error, no data, and success.
 */
export const ChartDisplayArea = React.memo(
  ({
    chart,
    timeSeriesData,
    aggregatedData,
    dataMap,
    unitMap,
    isLoading,
    error,
    xAxisMarker,
    onAddSeries,
    onAnnotationPositionChange,
    onXAxisClick,
    isPreview = false,
    height,
  }: ChartDisplayAreaProps) => {
    const content = (() => {
      if (chart.series.length === 0) return <NoDataSeries onAddSeries={onAddSeries} chart={chart} />;
      if (isLoading) return <LoadingSpinner text={t`Loading chart data...`} />;
      if (error) return <ErrorDisplay error={error} />;
      if (!dataMap || dataMap.size === 0) return <NoDataAvailable chart={chart} />;

      return (
        <ChartContent
          chart={chart}
          timeSeriesData={timeSeriesData}
          aggregatedData={aggregatedData}
          dataMap={dataMap}
          unitMap={unitMap}
          isPreview={isPreview}
          onAnnotationPositionChange={onAnnotationPositionChange}
          onXAxisClick={onXAxisClick}
          xAxisMarker={xAxisMarker}
          height={height}
        />
      );
    })();

    if (isPreview) {
      return (
        <div className="w-full h-full flex items-center justify-center">
          {content}
        </div>
      );
    }

    return (
      <Card className="flex flex-col w-full h-full" id="chart-display-area">
        <div className="p-4 flex-grow min-h-[500px] flex items-center justify-center bg-muted/20">
          {content}
        </div>
        {chart.series.some(series => series.type === 'line-items-aggregated-yearly') && <PopulationMethodologyNote />}
        <ChartFooter />
      </Card>
    );
  }
);


/**
 * Renders a placeholder when no data series have been added to the chart.
 * Memoized to prevent re-renders if parent component updates but props remain the same.
 */
const NoDataSeries = React.memo(
  ({ onAddSeries, chart }: { onAddSeries: () => void; chart: Chart }) => (
    <div className="text-center space-y-4">
      <div className="h-16 w-16 mx-auto rounded-full bg-muted flex items-center justify-center">
        {getChartTypeIcon(chart.config.chartType, "h-8 w-8 text-muted-foreground")}
      </div>
      <p className="font-medium text-lg"><Trans>No Data Series</Trans></p>
      <p className="text-sm text-muted-foreground"><Trans>Add a series to visualize your data.</Trans></p>
      <Button onClick={onAddSeries}><Trans>Add Data Series</Trans></Button>
    </div>
  )
);

/**
 * Renders an error message if chart data fails to load.
 * Memoized for performance.
 */
const ErrorDisplay = React.memo(({ error }: { error: Error }) => (
  <div className="text-center text-destructive space-y-2">
    <AlertCircle className="h-8 w-8 mx-auto" />
    <p className="font-medium"><Trans>Error Loading Chart Data</Trans></p>
    <p className="text-sm">{error.message}</p>
  </div>
));

/**
 * Renders a message when filters result in no available data.
 * Memoized for performance.
 */
const NoDataAvailable = React.memo(({ chart }: { chart: Chart }) => (
  <div className="text-center text-muted-foreground space-y-2">
    <div className="h-16 w-16 mx-auto rounded-full bg-muted flex items-center justify-center">
      {getChartTypeIcon(chart.config.chartType, "h-8 w-8")}
    </div>
    <p className="font-medium"><Trans>No Data Available</Trans></p>
    <p className="text-sm"><Trans>Check your series filters and try again.</Trans></p>
  </div>
));

/**
 * Renders the chart itself, including title and renderer.
 * Memoized to avoid re-rendering the potentially complex ChartRenderer.
 */
const ChartContent = React.memo(
  ({
    chart,
    timeSeriesData,
    aggregatedData,
    dataMap,
    unitMap,
    isPreview,
    margins,
    onAnnotationPositionChange,
    onXAxisClick,
    xAxisMarker,
    height
  }: Omit<ChartDisplayAreaProps, "isLoading" | "error" | "onAddSeries">) => {

    if (!dataMap) return <LoadingSpinner text={t`Loading chart data...`} />;

    return (
      <div className="w-full">
        <ChartTitle
          title={chart.title} />
        <ChartRenderer
          isPreview={isPreview}
          margins={margins}
          chart={chart}
          timeSeriesData={timeSeriesData}
          aggregatedData={aggregatedData}
          dataMap={dataMap}
          unitMap={unitMap}
          onAnnotationPositionChange={onAnnotationPositionChange}
          xAxisMarker={xAxisMarker}
          onXAxisClick={onXAxisClick}
          height={height}
        />
        {!isPreview && chart.description && (
          <p className="px-4 text-center text-sm text-muted-foreground">{chart.description}</p>
        )}
      </div>
    );
  }
);

/**
 * Footer component displaying chart attribution and source.
 * Uses current URL to ensure exported images contain the latest chart configuration.
 */
const ChartFooter = () => {
  // Get current URL on every render to ensure it's always up-to-date
  const currentUrl = typeof window !== "undefined" ? window.location.href : getSiteUrl();

  return (
    <p className="flex items-center justify-between text-sm text-muted-foreground bg-muted/20 w-full p-4">
      <a href={currentUrl} target="_blank" rel="noopener noreferrer" id="chart-footer-link">
        <span className="font-bold">Transparenta.eu</span>
      </a>
      <a href="https://mfinante.gov.ro/transparenta-bugetara" target="_blank" rel="noopener noreferrer">
        <Trans>Source: </Trans><span className="font-bold">Ministerul Finanțelor</span>
      </a>
    </p>
  );
};
