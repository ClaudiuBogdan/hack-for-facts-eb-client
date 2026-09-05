import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useChartStore } from "@/components/charts/hooks/useChartStore";
import { ChartFiltersOverview } from "@/components/charts/components/filters-details/ChartFiltersOverview";
import { ChartViewHeader } from "@/components/charts/components/chart-view/ChartViewHeader";
import { ChartDisplayArea } from "@/components/charts/components/chart-view/ChartDisplayArea";
import { ChartQuickConfig } from "@/components/charts/components/chart-quick-config/ChartQuickConfig";
import { SeriesList } from "@/components/charts/components/chart-view/SeriesList";
import { convertToAggregatedData, convertToTimeSeriesData, SeriesId, Unit, useChartData } from '../../hooks/useChartData';
import { AnnotationsList } from '../chart-annotations/AnnotationsList';
import { AnnotationPositionChange } from '../chart-renderer/components/interfaces';
import { useMemo } from 'react';
import { t } from '@lingui/core/macro';
import { ChartDataError } from '../ChartDataError';
import { combineValidationResults, validateSeriesCompleteness } from '@/lib/chart-data-validation';

export function ChartView() {
  const { chart, goToConfig, goToSeriesConfig, addSeries, updateAnnotation } = useChartStore();
  const { dataSeriesMap, isLoadingData, dataError, validationResult, canRetryInsData, retryInsData, isRetryingInsData } = useChartData({ chart });

  const processedData = useMemo(() => {
    if (!dataSeriesMap) {
      return {
        timeSeriesData: [],
        aggregatedData: [],
        unitMap: new Map<SeriesId, Unit>(),
        processingValidation: { isValid: true, errors: [], warnings: [] }
      };
    }

    const isAggregated = chart.config.chartType.endsWith('-aggr');
    if (!isAggregated) {
      const result = convertToTimeSeriesData(dataSeriesMap, chart);
      return {
        timeSeriesData: result.data,
        aggregatedData: [],
        unitMap: result.unitMap,
        processingValidation: result.validation
      };
    } else {
      const result = convertToAggregatedData(dataSeriesMap, chart);
      return {
        timeSeriesData: [],
        aggregatedData: result.data,
        unitMap: result.unitMap,
        processingValidation: result.validation
      };
    }
  }, [chart, dataSeriesMap]);

  const combinedValidation = useMemo(() => {
    const rangeStart = chart.config.yearRange?.start;
    const rangeEnd = chart.config.yearRange?.end;
    const completenessValidation = dataSeriesMap && rangeStart !== undefined && rangeEnd !== undefined
      ? validateSeriesCompleteness(dataSeriesMap, { start: rangeStart, end: rangeEnd })
      : null;
    
    return combineValidationResults(
      validationResult ?? null,
      processedData.processingValidation,
      completenessValidation
    );
  }, [chart.config.yearRange, dataSeriesMap, validationResult, processedData.processingValidation]);

  if (!chart) {
    return <LoadingSpinner text={t`Loading chart configuration...`} />;
  }

  const handleAnnotationPositionChange = (pos: AnnotationPositionChange) => {
    updateAnnotation(pos.annotationId, (prev) => ({ ...prev, ...pos.position }));
  };



  return (
    <div className="container mx-auto py-8 px-4 md:px-6 space-y-6">
      <ChartViewHeader chart={chart} onConfigure={goToConfig} />

      {!isLoadingData && combinedValidation && (!combinedValidation.isValid || combinedValidation.warnings.length > 0) && (
        <ChartDataError validationResult={combinedValidation} />
      )}

      {canRetryInsData && (
        <Button variant="outline" disabled={isRetryingInsData} onClick={() => { void retryInsData(); }}>
          {t`Retry INS data`}
        </Button>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex flex-col flex-grow space-y-6">
          <div>
            <ChartDisplayArea
              timeSeriesData={processedData.timeSeriesData}
              aggregatedData={processedData.aggregatedData}
              unitMap={processedData.unitMap}
              chart={chart}
              dataMap={dataSeriesMap}
              isLoading={isLoadingData}
              error={dataError}
              onAddSeries={addSeries}
              onAnnotationPositionChange={handleAnnotationPositionChange}
            />
          </div>
          <ChartFiltersOverview chart={chart} onFilterClick={goToSeriesConfig} />
        </div>

        <div className="lg:w-96 flex-shrink-0 space-y-6">
          <ChartQuickConfig
            dataMap={dataSeriesMap}
          />
          <SeriesList
          />
          <AnnotationsList
          />
        </div>
      </div>
    </div>
  );
}