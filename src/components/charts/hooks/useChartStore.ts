import { useCallback, useRef } from 'react';
import {
  Chart,
  ChartSchema,
  SeriesSchema,
  TAnnotation,
  AnnotationSchema,
  Series,
} from '@/schemas/charts';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { produce } from 'immer';
import { toast } from 'sonner';
import { getChartsStore } from '../chartsStore';
import { generateRandomColor } from '../components/chart-renderer/utils';
import { Analytics } from '@/lib/analytics';
import { useUserCurrency } from '@/lib/hooks/useUserCurrency';
import { useChartHistory } from './useChartHistory';
import { withDefaultExcludes } from '@/lib/filterUtils';

interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
}


const chartsStore = getChartsStore();

export function useChartStore() {
  const navigate = useNavigate({ from: '/charts/$chartId' });
  const { chart, view, seriesId, annotationId } = useSearch({ from: "/charts/$chartId" });
  const [currency] = useUserCurrency();
  const defaultNormalization = currency === "EUR" ? "total_euro" : "total";

  const history = useChartHistory(chart.id, chart);
  const isUndoRedoOperationRef = useRef(false);

  const goToConfig = useCallback(() => {
    Analytics.capture(Analytics.EVENTS.ChartViewChanged, { chart_id: chart.id, view: 'config' });
    navigate({ to: "/charts/$chartId", search: (prev) => ({ ...prev, view: "config" }), params: { chartId: chart.id }, replace: true, resetScroll: false });
  }, [chart.id, navigate]);

  const goToOverview = useCallback(() => {
    Analytics.capture(Analytics.EVENTS.ChartViewChanged, { chart_id: chart.id, view: 'overview' });
    navigate({ to: "/charts/$chartId", search: (prev) => ({ ...prev, view: "overview" }), params: { chartId: chart.id }, replace: true, resetScroll: false });
  }, [chart.id, navigate]);

  const goToSeriesConfig = useCallback((seriesId: string) => {
    Analytics.capture(Analytics.EVENTS.ChartViewChanged, { chart_id: chart.id, view: 'series-config', series_id: seriesId });
    navigate({ to: "/charts/$chartId", search: (prev) => ({ ...prev, view: "series-config", seriesId }), params: { chartId: chart.id }, replace: true, resetScroll: false });
  }, [chart.id, navigate]);

  const goToAnnotationConfig = useCallback((annotationId: string) => {
    Analytics.capture(Analytics.EVENTS.ChartViewChanged, { chart_id: chart.id, view: 'annotation-config', annotation_id: annotationId });
    navigate({ to: "/charts/$chartId", search: (prev) => ({ ...prev, view: "annotation-config", annotationId }), params: { chartId: chart.id }, replace: true, resetScroll: false });
  }, [chart.id, navigate]);

  const updateChart = useCallback((updates: Partial<Chart> | ((prevChart?: Chart) => Partial<Chart>)) => {
    navigate({
      search: (prev) => {
        const newChart = { ...prev.chart, ...(typeof updates === 'function' ? updates(prev.chart) : updates) } as Chart;
        chartsStore.updateChartInLocalStorage(newChart);
        // Lightweight change summary
        Analytics.capture(Analytics.EVENTS.ChartUpdated, {
          chart_id: newChart.id,
          series_count: Array.isArray(newChart.series) ? newChart.series.length : 0,
          annotations_count: Array.isArray(newChart.annotations) ? newChart.annotations.length : 0,
        });
        return { ...prev, chart: newChart };
      },
      replace: true,
      resetScroll: false,
    });
  }, [navigate]);

  const deleteChart = useCallback(async () => {
    await chartsStore.deleteChart(chart.id);
    Analytics.capture(Analytics.EVENTS.ChartDeleted, { chart_id: chart.id });
    navigate({ to: "/charts" });
    toast.success("Chart Deleted", {
      description: "The chart has been deleted.",
    });
  }, [chart.id, navigate]);

  const duplicateChart = useCallback(async () => {
    const newChartId = crypto.randomUUID();
    Analytics.capture(Analytics.EVENTS.ChartDuplicated, { chart_id: chart.id, new_chart_id: newChartId });
    navigate({ to: "/charts/$chartId", params: { chartId: newChartId }, replace: false, search: (prev) => ({ ...prev, chart: { ...prev.chart, id: newChartId, title: `${prev.chart?.title} (Copy)` } as Chart }) });
    toast.success("Chart Duplicated", {
      description: "The chart has been duplicated.",
    });
  }, [chart.id, navigate]);



  const addSeries = useCallback(() => {
    const newSeries: Series = SeriesSchema.parse({
      id: crypto.randomUUID(),
      type: 'line-items-aggregated-yearly',
      enabled: true,
      label: `New Series ${chart.series.length + 1}`,
      filter: withDefaultExcludes({
        account_category: 'ch',
        report_type: 'Executie bugetara agregata la nivel de ordonator principal',
        normalization: defaultNormalization,
      }),
      config: {
        showDataLabels: false,
        color: generateRandomColor(),
      },
    });

    updateChart({
      series: [...chart.series, newSeries],
    });
    Analytics.capture(Analytics.EVENTS.ChartSeriesAdded, { chart_id: chart.id, series_id: newSeries.id });
    goToSeriesConfig(newSeries.id);
  }, [chart, updateChart, goToSeriesConfig, defaultNormalization]);

  const addAnnotation = useCallback(() => {
    const newAnnotation: TAnnotation = AnnotationSchema.parse({
      title: `New Annotation ${chart.annotations.length + 1}`,
      type: 'annotation' as const,
    });

    updateChart((prev) => {
      const newAnnotations = [...(prev?.annotations || []), newAnnotation];
      return {
        ...prev,
        annotations: newAnnotations,
      };
    });
    Analytics.capture(Analytics.EVENTS.ChartAnnotationAdded, { chart_id: chart.id });
  }, [chart, updateChart]);

  const updateAnnotation = useCallback((annotationId: string, updates: Partial<TAnnotation> | ((prevAnnotation: TAnnotation) => TAnnotation)) => {
    updateChart((prev) => ({
      ...prev,
      annotations: prev?.annotations.map(a => a.id === annotationId ? { ...a, ...(typeof updates === 'function' ? produce(a, (draft) => updates(draft)) : updates) } : a),
    }));
    Analytics.capture(Analytics.EVENTS.ChartAnnotationUpdated, { chart_id: chart.id, annotation_id: annotationId });
  }, [chart.id, updateChart]);

  const deleteAnnotation = useCallback((annotationId: string) => {
    updateChart((prev) => ({
      ...prev,
      annotations: prev?.annotations.filter(a => a.id !== annotationId),
    }));
    Analytics.capture(Analytics.EVENTS.ChartAnnotationDeleted, { chart_id: chart.id, annotation_id: annotationId });
  }, [chart.id, updateChart]);

  const duplicateAnnotation = useCallback((annotationId: string) => {
    const original = chart.annotations.find(a => a.id === annotationId);
    if (!original) return;

    const duplicated: TAnnotation = {
      ...original,
      id: crypto.randomUUID(),
      title: original.title ? `${original.title} (Copy)` : original.title,
    };

    updateChart((prev) => ({
      ...prev,
      annotations: [...(prev?.annotations || []), duplicated],
    }));
    Analytics.capture(Analytics.EVENTS.ChartAnnotationDuplicated, { chart_id: chart.id, annotation_id: annotationId });
  }, [chart.annotations, chart.id, updateChart]);

  const setAnnotations = useCallback((annotations: ReadonlyArray<TAnnotation>) => {
    updateChart({ annotations: [...annotations] });
  }, [updateChart]);

  const updateSeries = useCallback((seriesId: string, updates: Partial<Series> | ((prevSeries: Series) => Series)) => {
    updateChart((prev) => ({
      ...prev,
      series: prev?.series.map(s => s.id === seriesId ? { ...s, ...(typeof updates === 'function' ? produce(s, (draft) => updates(draft)) : updates) } : s) as Series[],
    }));
  }, [updateChart]);

  const duplicateSeries = useCallback((seriesId: string) => {
    const originalSeries = chart.series.find(s => s.id === seriesId);
    if (!originalSeries) return;

    const duplicatedSeries: Series = {
      ...originalSeries,
      id: crypto.randomUUID(),
      label: `${originalSeries.label} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    updateChart({
      series: [...chart.series, duplicatedSeries],
    });
    Analytics.capture(Analytics.EVENTS.ChartSeriesDuplicated, { chart_id: chart.id, series_id: seriesId, new_series_id: duplicatedSeries.id });
  }, [chart.id, chart.series, updateChart]);

  const moveSeriesUp = useCallback((seriesId: string) => {
    const currentIndex = chart.series.findIndex(s => s.id === seriesId);
    if (currentIndex <= 0) return; // Already at top or not found

    const newSeries = [...chart.series];
    [newSeries[currentIndex - 1], newSeries[currentIndex]] = [newSeries[currentIndex], newSeries[currentIndex - 1]];

    updateChart({
      series: newSeries,
    });
    Analytics.capture(Analytics.EVENTS.ChartSeriesReordered, { chart_id: chart.id, series_id: seriesId, direction: 'up' });
  }, [chart.id, chart.series, updateChart]);

  const moveSeriesDown = useCallback((seriesId: string) => {
    const currentIndex = chart.series.findIndex(s => s.id === seriesId);
    if (currentIndex === -1 || currentIndex >= chart.series.length - 1) return; // Already at bottom or not found

    const newSeries = [...chart.series];
    [newSeries[currentIndex], newSeries[currentIndex + 1]] = [newSeries[currentIndex + 1], newSeries[currentIndex]];

    updateChart({
      series: newSeries,
    });
    Analytics.capture(Analytics.EVENTS.ChartSeriesReordered, { chart_id: chart.id, series_id: seriesId, direction: 'down' });
  }, [chart.id, chart.series, updateChart]);

  const deleteSeries = useCallback((seriesId: string) => {
    updateChart({
      series: chart.series.filter(s => s.id !== seriesId),
    });
    Analytics.capture(Analytics.EVENTS.ChartSeriesDeleted, { chart_id: chart.id, series_id: seriesId });
  }, [updateChart, chart]);

  const setSeries = useCallback((series: Series[]) => {
    updateChart({ series });
  }, [updateChart]);

  const enableAllSeries = useCallback(() => {
    updateChart({
      series: chart.series.map(s => ({ ...s, enabled: true })),
    });
    Analytics.capture(Analytics.EVENTS.ChartSeriesEnabledAll, { chart_id: chart.id });
  }, [chart, updateChart]);

  const disableAllSeries = useCallback(() => {
    updateChart({
      series: chart.series.map(s => ({ ...s, enabled: false })),
    });
    Analytics.capture(Analytics.EVENTS.ChartSeriesDisabledAll, { chart_id: chart.id });
  }, [chart, updateChart]);

  const validateChart = useCallback((): ValidationResult => {
    const errors: Record<string, string[]> = {};

    try {
      ChartSchema.parse(chart);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errors' in error) {
        interface ZodError {
          path: (string | number)[];
          message: string;
        }
        const zodError = error as { errors: ZodError[] };
        zodError.errors.forEach((err: ZodError) => {
          const path = err.path.join('.');
          if (!errors[path]) errors[path] = [];
          errors[path].push(err.message);
        });
      }
    }

    // Validate each series
    chart.series.forEach((series, index) => {
      try {
        SeriesSchema.parse(series);
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'errors' in error) {
          interface ZodError {
            path: (string | number)[];
            message: string;
          }
          const zodError = error as { errors: ZodError[] };
          zodError.errors.forEach((err: ZodError) => {
            const path = `series.${index}.${err.path.join('.')}`;
            if (!errors[path]) errors[path] = [];
            errors[path].push(err.message);
          });
        }
      }
    });

    const isValid = Object.keys(errors).length === 0;
    return { isValid, errors };
  }, [chart]);

  const undo = useCallback(() => {
    const previousChart = history.undo();
    if (previousChart) {
      isUndoRedoOperationRef.current = true;
      navigate({
        search: (prev) => {
          chartsStore.updateChartInLocalStorage(previousChart);
          return { ...prev, chart: previousChart };
        },
        replace: true,
        resetScroll: false,
      });
      // Reset flag after navigation
      setTimeout(() => {
        isUndoRedoOperationRef.current = false;
      }, 0);
      Analytics.capture(Analytics.EVENTS.ChartUndoPerformed, { chart_id: chart.id });
    }
  }, [history, navigate, chart.id]);

  const redo = useCallback(() => {
    const nextChart = history.redo();
    if (nextChart) {
      isUndoRedoOperationRef.current = true;
      navigate({
        search: (prev) => {
          chartsStore.updateChartInLocalStorage(nextChart);
          return { ...prev, chart: nextChart };
        },
        replace: true,
        resetScroll: false,
      });
      // Reset flag after navigation
      setTimeout(() => {
        isUndoRedoOperationRef.current = false;
      }, 0);
      Analytics.capture(Analytics.EVENTS.ChartRedoPerformed, { chart_id: chart.id });
    }
  }, [history, navigate, chart.id]);

  return {
    chart,
    view,
    seriesId,
    annotationId,
    updateChart,
    deleteChart,
    duplicateChart,
    addSeries,
    updateSeries,
    deleteSeries,
    setSeries,
    enableAllSeries,
    disableAllSeries,
    duplicateSeries,
    moveSeriesUp,
    moveSeriesDown,
    validateChart,
    goToConfig,
    goToOverview,
    goToSeriesConfig,
    goToAnnotationConfig,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    duplicateAnnotation,
    setAnnotations,
    undo,
    redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
  };
} 
