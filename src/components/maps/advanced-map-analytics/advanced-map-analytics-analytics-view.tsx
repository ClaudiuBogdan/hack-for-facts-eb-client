import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { SafeResponsiveContainer } from '@/components/charts/safe-responsive-container';
import { getSeriesColor } from '@/components/charts/components/chart-renderer/color-utils';
import { cn } from '@/lib/utils';
import { formatAdvancedMapAnalyticsSeriesValue } from './advanced-map-analytics-formatting';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  type AdvancedMapAnalyticsBinMethod,
  type AdvancedMapAnalyticsDistributionWidget,
  type AdvancedMapAnalyticsOutliersWidget,
  type AdvancedMapAnalyticsWidget,
  type AdvancedMapAnalyticsWidgetKey,
  type MapSupportedSeries,
  getGeoJsonDatasetLabel,
  getGeoJsonDatasetUnit,
} from '@/schemas/advanced-map-analytics';
import { BarChart3, GripVertical, Plus, ScatterChart as ScatterChartIcon, TableIcon, X } from 'lucide-react';
import { t } from '@lingui/core/macro';

interface AdvancedMapAnalyticsSeriesOption {
  id: string;
  label: string;
  unit?: string;
}

interface AdvancedMapAnalyticsOutlierRow {
  sirutaCode: string;
  uatName: string;
  countyName: string;
  value: number;
}

interface AdvancedMapAnalyticsCoverageRow {
  seriesId: string;
  label: string;
  definedCount: number;
  missingCount: number;
  coveragePercent: number;
  unit?: string;
}

interface AdvancedMapAnalyticsTotalsRow {
  seriesId: string;
  label: string;
  totalValue: number;
  meanValue?: number;
  medianValue?: number;
  unit?: string;
}

interface AdvancedMapAnalyticsHistogramBin {
  id: string;
  label: string;
  shortLabel: string;
  count: number;
}

interface UatMetadata {
  uatName: string;
  countyName: string;
  entityCui?: string;
}

interface AdvancedMapAnalyticsAnalyticsViewProps {
  widgets: AdvancedMapAnalyticsWidget[];
  series: MapSupportedSeries[];
  activeSeriesId?: string;
  valuesBySeriesId: Map<string, Map<string, number | undefined>>;
  unitsBySeriesId: Map<string, string | undefined>;
  uatMetadataBySirutaCode: Map<string, UatMetadata>;
  readOnly?: boolean;
  onToggleWidgetEnabled: (widgetKey: AdvancedMapAnalyticsWidgetKey, enabled: boolean) => void;
  onReorderWidgets: (activeWidgetKey: AdvancedMapAnalyticsWidgetKey, overWidgetKey: AdvancedMapAnalyticsWidgetKey) => void;
  onUpdateWidget: (nextWidget: AdvancedMapAnalyticsWidget) => void;
}

const OUTLIER_ZERO_VARIANCE_EPSILON = 1e-12;
const OUTLIERS_UAT_NAME_X_AXIS_ID = '__uat_name__';

export function AdvancedMapAnalyticsAnalyticsView({
  widgets,
  series,
  activeSeriesId,
  valuesBySeriesId,
  unitsBySeriesId,
  uatMetadataBySirutaCode,
  readOnly = false,
  onToggleWidgetEnabled,
  onReorderWidgets,
  onUpdateWidget,
}: Readonly<AdvancedMapAnalyticsAnalyticsViewProps>) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [pendingRemoveWidgetKey, setPendingRemoveWidgetKey] = useState<AdvancedMapAnalyticsWidgetKey | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const enabledSeries = useMemo(
    () => series.filter((seriesEntry) => seriesEntry.enabled),
    [series]
  );

  const seriesOptions = useMemo<AdvancedMapAnalyticsSeriesOption[]>(
    () =>
      enabledSeries.map((seriesEntry) => ({
        id: seriesEntry.id,
        label: resolveSeriesDisplayLabel(seriesEntry),
        unit: resolveSeriesDisplayUnit(seriesEntry, unitsBySeriesId),
      })),
    [enabledSeries, unitsBySeriesId]
  );

  const enabledWidgets = useMemo(
    () => widgets.filter((widget) => widget.enabled),
    [widgets]
  );

  const disabledWidgets = useMemo(
    () => widgets.filter((widget) => !widget.enabled),
    [widgets]
  );

  const coverageRows = useMemo<AdvancedMapAnalyticsCoverageRow[]>(() => {
    if (enabledSeries.length === 0) {
      return [];
    }

    const sirutaUniverse = new Set<string>();
    for (const seriesEntry of enabledSeries) {
      const vector = valuesBySeriesId.get(seriesEntry.id);
      if (!vector) {
        continue;
      }

      for (const sirutaCode of vector.keys()) {
        sirutaUniverse.add(sirutaCode);
      }
    }

    const universeSize = sirutaUniverse.size;

    return enabledSeries.map((seriesEntry) => {
      const vector = valuesBySeriesId.get(seriesEntry.id);
      let definedCount = 0;

      if (vector) {
        for (const sirutaCode of sirutaUniverse) {
          const value = normalizeFiniteValue(vector.get(sirutaCode));
          if (value !== undefined) {
            definedCount += 1;
          }
        }
      }

      const missingCount = Math.max(0, universeSize - definedCount);
      const coveragePercent = universeSize === 0 ? 0 : (definedCount / universeSize) * 100;

      return {
        seriesId: seriesEntry.id,
        label: resolveSeriesDisplayLabel(seriesEntry),
        definedCount,
        missingCount,
        coveragePercent,
        unit: resolveSeriesDisplayUnit(seriesEntry, unitsBySeriesId),
      };
    });
  }, [enabledSeries, unitsBySeriesId, valuesBySeriesId]);

  const totalsRows = useMemo<AdvancedMapAnalyticsTotalsRow[]>(() => {
    if (enabledSeries.length === 0) {
      return [];
    }

    return enabledSeries.map((seriesEntry) => {
      const vector = valuesBySeriesId.get(seriesEntry.id);
      let totalValue = 0;
      const definedValues: number[] = [];

      if (vector) {
        for (const value of vector.values()) {
          const numericValue = normalizeFiniteValue(value);
          if (numericValue !== undefined) {
            totalValue += numericValue;
            definedValues.push(numericValue);
          }
        }
      }

      return {
        seriesId: seriesEntry.id,
        label: resolveSeriesDisplayLabel(seriesEntry),
        totalValue,
        meanValue: definedValues.length > 0 ? totalValue / definedValues.length : undefined,
        medianValue: computeMedian(definedValues),
        unit: resolveSeriesDisplayUnit(seriesEntry, unitsBySeriesId),
      };
    });
  }, [enabledSeries, unitsBySeriesId, valuesBySeriesId]);

  const handleDragEnd = (event: DragEndEvent) => {
    if (readOnly) {
      return;
    }

    const overId = event.over?.id;
    if (!overId) {
      return;
    }

    const activeWidgetKey = String(event.active.id) as AdvancedMapAnalyticsWidgetKey;
    const overWidgetKey = String(overId) as AdvancedMapAnalyticsWidgetKey;

    if (activeWidgetKey === overWidgetKey) {
      return;
    }

    onReorderWidgets(activeWidgetKey, overWidgetKey);
  };

  const handleConfirmRemove = () => {
    if (!pendingRemoveWidgetKey) {
      return;
    }

    onToggleWidgetEnabled(pendingRemoveWidgetKey, false);
    setPendingRemoveWidgetKey(null);
  };

  return (
    <div className="h-full w-full overflow-y-auto p-4">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">{t`Analytics view`}</h2>
              <p className="text-sm text-muted-foreground">
                {enabledWidgets.length === 1
                  ? t`${enabledWidgets.length} view enabled`
                  : t`${enabledWidgets.length} views enabled`}
              </p>
            </div>
            {!readOnly ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddModalOpen(true)}
                disabled={disabledWidgets.length === 0}
              >
                <Plus className="mr-2 h-4 w-4" />
                {t`Add view`}
              </Button>
            ) : null}
          </div>
        </section>

        {enabledWidgets.length === 0 ? (
          <section className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
            {t`No analytics views enabled.`}
          </section>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={enabledWidgets.map((widget) => widget.key)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {enabledWidgets.map((widget) => (
                  <AnalyticsWidgetCard
                    key={widget.key}
                    widget={widget}
                    readOnly={readOnly}
                    seriesOptions={seriesOptions}
                    activeSeriesId={activeSeriesId}
                    coverageRows={coverageRows}
                    totalsRows={totalsRows}
                    valuesBySeriesId={valuesBySeriesId}
                    uatMetadataBySirutaCode={uatMetadataBySirutaCode}
                    onRequestRemove={setPendingRemoveWidgetKey}
                    onUpdateWidget={onUpdateWidget}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t`Add analytics view`}</DialogTitle>
            <DialogDescription>{t`Choose a disabled view to enable it in this map.`}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {disabledWidgets.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t`All predefined views are already enabled.`}</p>
            ) : (
              disabledWidgets.map((widget) => (
                <div
                  key={widget.key}
                  className="flex items-center justify-between rounded-lg border bg-muted/10 px-3 py-2"
                >
                  <div className="text-sm font-medium">{getWidgetTitle(widget.key)}</div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      onToggleWidgetEnabled(widget.key, true);
                      setIsAddModalOpen(false);
                    }}
                  >
                    {t`Add`}
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={pendingRemoveWidgetKey !== null} onOpenChange={(open) => !open && setPendingRemoveWidgetKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t`Remove this view?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {t`This hides the view from this map. You can add it back later from Add view.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t`Cancel`}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemove}>{t`Remove`}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface AnalyticsWidgetCardProps {
  widget: AdvancedMapAnalyticsWidget;
  readOnly: boolean;
  seriesOptions: AdvancedMapAnalyticsSeriesOption[];
  activeSeriesId?: string;
  coverageRows: AdvancedMapAnalyticsCoverageRow[];
  totalsRows: AdvancedMapAnalyticsTotalsRow[];
  valuesBySeriesId: Map<string, Map<string, number | undefined>>;
  uatMetadataBySirutaCode: Map<string, UatMetadata>;
  onRequestRemove: (widgetKey: AdvancedMapAnalyticsWidgetKey) => void;
  onUpdateWidget: (nextWidget: AdvancedMapAnalyticsWidget) => void;
}

function AnalyticsWidgetCard({
  widget,
  readOnly,
  seriesOptions,
  activeSeriesId,
  coverageRows,
  totalsRows,
  valuesBySeriesId,
  uatMetadataBySirutaCode,
  onRequestRemove,
  onUpdateWidget,
}: Readonly<AnalyticsWidgetCardProps>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.key,
    disabled: readOnly,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 'auto',
  };

  const selectedSeriesId = resolveWidgetSeriesId(widget, activeSeriesId, seriesOptions);
  const selectedSeriesOption = selectedSeriesId
    ? seriesOptions.find((seriesOption) => seriesOption.id === selectedSeriesId)
    : undefined;
  const selectedVector = selectedSeriesId ? valuesBySeriesId.get(selectedSeriesId) : undefined;

  const distributionBins = useMemo(() => {
    if (widget.key !== 'distribution') {
      return [];
    }

    const values = collectDefinedValues(selectedVector);
    return buildDistributionBins(values, widget.binCount, widget.binMethod, selectedSeriesOption?.unit);
  }, [selectedSeriesOption?.unit, selectedVector, widget]);

  const outlierResult = useMemo(() => {
    if (widget.key !== 'outliers') {
      return null;
    }

    return computeIqrOutliers({
      vector: selectedVector,
      metadataBySirutaCode: uatMetadataBySirutaCode,
      multiplier: widget.iqrMultiplier,
      limit: widget.limit,
    });
  }, [selectedVector, uatMetadataBySirutaCode, widget]);

  return (
    <section
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-xl border bg-card p-4 text-card-foreground shadow-xs',
        isDragging && 'shadow-md'
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {!readOnly ? (
            <button
              type="button"
              aria-label={t`Reorder analytics view`}
              className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          ) : null}
          <h3 className="truncate text-lg font-semibold">{getWidgetTitle(widget.key)}</h3>
        </div>
        {!readOnly ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            aria-label={t`Remove analytics view`}
            onClick={() => onRequestRemove(widget.key)}
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      {widget.key === 'series_coverage' ? (
        <SeriesCoverageWidgetContent rows={coverageRows} showCoveragePercent={widget.showCoveragePercent} />
      ) : null}

      {widget.key === 'series_totals' ? (
        <SeriesTotalsWidgetContent rows={totalsRows} />
      ) : null}

      {widget.key === 'distribution' ? (
        <DistributionWidgetContent
          widget={widget}
          readOnly={readOnly}
          seriesOptions={seriesOptions}
          selectedSeriesId={selectedSeriesId}
          distributionBins={distributionBins}
          onUpdateWidget={onUpdateWidget}
        />
      ) : null}

      {widget.key === 'outliers' ? (
        <OutliersWidgetContent
          widget={widget}
          readOnly={readOnly}
          seriesOptions={seriesOptions}
          selectedSeriesId={selectedSeriesId}
          selectedSeriesUnit={selectedSeriesOption?.unit}
          outlierResult={outlierResult}
          valuesBySeriesId={valuesBySeriesId}
          uatMetadataBySirutaCode={uatMetadataBySirutaCode}
          onUpdateWidget={onUpdateWidget}
        />
      ) : null}
    </section>
  );
}

function SeriesCoverageWidgetContent({
  rows,
  showCoveragePercent,
}: Readonly<{ rows: AdvancedMapAnalyticsCoverageRow[]; showCoveragePercent: boolean }>) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{t`No enabled series.`}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t`Series`}</TableHead>
          <TableHead className="text-right">{t`Defined`}</TableHead>
          <TableHead className="text-right">{t`Missing`}</TableHead>
          {showCoveragePercent ? <TableHead className="text-right">{t`Coverage`}</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.seriesId}>
            <TableCell className="font-medium">{row.label}</TableCell>
            <TableCell className="text-right tabular-nums">{row.definedCount}</TableCell>
            <TableCell className="text-right tabular-nums">{row.missingCount}</TableCell>
            {showCoveragePercent ? (
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Progress value={row.coveragePercent} className="h-2 w-20" />
                  <span className="text-xs tabular-nums text-muted-foreground">{row.coveragePercent.toFixed(1)}%</span>
                </div>
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function SeriesTotalsWidgetContent({ rows }: Readonly<{ rows: AdvancedMapAnalyticsTotalsRow[] }>) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{t`No enabled series.`}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t`Series`}</TableHead>
          <TableHead className="text-right">{t`Sum`}</TableHead>
          <TableHead className="text-right">{t`Mean`}</TableHead>
          <TableHead className="text-right">{t`Median`}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.seriesId}>
            <TableCell className="font-medium">{row.label}</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatAdvancedMapAnalyticsSeriesValue(row.totalValue, row.unit)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatAdvancedMapAnalyticsSeriesValue(row.meanValue, row.unit)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatAdvancedMapAnalyticsSeriesValue(row.medianValue, row.unit)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

interface DistributionWidgetContentProps {
  widget: AdvancedMapAnalyticsDistributionWidget;
  readOnly: boolean;
  seriesOptions: AdvancedMapAnalyticsSeriesOption[];
  selectedSeriesId?: string;
  distributionBins: AdvancedMapAnalyticsHistogramBin[];
  onUpdateWidget: (nextWidget: AdvancedMapAnalyticsWidget) => void;
}

function DistributionWidgetContent({
  widget,
  readOnly,
  seriesOptions,
  selectedSeriesId,
  distributionBins,
  onUpdateWidget,
}: Readonly<DistributionWidgetContentProps>) {
  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div className="grid flex-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor={`distribution-series-${widget.key}`}>{t`Series`}</Label>
            <Select
              value={selectedSeriesId}
              onValueChange={(nextSeriesId) =>
                onUpdateWidget({
                  ...widget,
                  seriesId: nextSeriesId,
                })
              }
              disabled={readOnly || seriesOptions.length === 0}
            >
              <SelectTrigger id={`distribution-series-${widget.key}`} aria-label={t`Distribution series`}>
                <SelectValue placeholder={t`Select series`} />
              </SelectTrigger>
              <SelectContent>
                {seriesOptions.map((seriesOption) => (
                  <SelectItem key={seriesOption.id} value={seriesOption.id}>
                    {seriesOption.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`distribution-bin-count-${widget.key}`}>{t`Bin count`}</Label>
            <Input
              id={`distribution-bin-count-${widget.key}`}
              type="number"
              min={3}
              max={30}
              value={widget.binCount}
              onChange={(event) => {
                const parsed = Number(event.currentTarget.value);
                if (!Number.isFinite(parsed)) {
                  return;
                }
                onUpdateWidget({
                  ...widget,
                  binCount: Math.min(30, Math.max(3, Math.trunc(parsed))),
                });
              }}
              disabled={readOnly}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`distribution-bin-method-${widget.key}`}>{t`Bin method`}</Label>
            <Select
              value={widget.binMethod}
              onValueChange={(nextMethod) =>
                onUpdateWidget({
                  ...widget,
                  binMethod: nextMethod as AdvancedMapAnalyticsBinMethod,
                })
              }
              disabled={readOnly}
            >
              <SelectTrigger id={`distribution-bin-method-${widget.key}`} aria-label={t`Bin method`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="log">{t`Log scale`}</SelectItem>
                <SelectItem value="equal-width">{t`Equal width`}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={widget.viewMode}
          onValueChange={(value: string) => {
            if (value === 'chart' || value === 'table') {
              onUpdateWidget({ ...widget, viewMode: value });
            }
          }}
        >
          <ToggleGroupItem value="chart" aria-label={t`Chart view`}>
            <BarChart3 className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="table" aria-label={t`Table view`}>
            <TableIcon className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {distributionBins.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t`Not enough values to build distribution.`}</p>
      ) : widget.viewMode === 'table' ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t`Range`}</TableHead>
              <TableHead className="text-right">{t`Count`}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {distributionBins.map((bin) => (
              <TableRow key={bin.id}>
                <TableCell>{bin.label}</TableCell>
                <TableCell className="text-right tabular-nums">{bin.count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div style={{ width: '100%', height: 280 }}>
          <SafeResponsiveContainer>
            <BarChart data={distributionBins}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="shortLabel"
                angle={-30}
                textAnchor="end"
                interval={0}
                tick={{ fontSize: 9 }}
                height={80}
              />
              <YAxis allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  borderColor: 'hsl(var(--border))',
                  backgroundColor: 'hsl(var(--popover))',
                  color: 'hsl(var(--popover-foreground))',
                  borderRadius: 8,
                }}
                labelFormatter={(_value, payload) => {
                  const bin = payload?.[0]?.payload as AdvancedMapAnalyticsHistogramBin | undefined;
                  return bin?.label ?? '';
                }}
              />
              <Bar
                dataKey="count"
                fill={getSeriesColor(0)}
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </SafeResponsiveContainer>
        </div>
      )}
    </div>
  );
}

interface AdvancedMapAnalyticsScatterPoint {
  sirutaCode: string;
  uatName: string;
  countyName: string;
  xValue: number;
  yValue: number;
  xDisplayLabel?: string;
}

type OutliersScatterXAxisMode = 'series' | 'uat_name';

interface OutliersWidgetContentProps {
  widget: AdvancedMapAnalyticsOutliersWidget;
  readOnly: boolean;
  seriesOptions: AdvancedMapAnalyticsSeriesOption[];
  selectedSeriesId?: string;
  selectedSeriesUnit?: string;
  outlierResult: ReturnType<typeof computeIqrOutliers> | null;
  valuesBySeriesId: Map<string, Map<string, number | undefined>>;
  uatMetadataBySirutaCode: Map<string, UatMetadata>;
  onUpdateWidget: (nextWidget: AdvancedMapAnalyticsWidget) => void;
}

function OutliersWidgetContent({
  widget,
  readOnly,
  seriesOptions,
  selectedSeriesId,
  selectedSeriesUnit,
  outlierResult,
  valuesBySeriesId,
  uatMetadataBySirutaCode,
  onUpdateWidget,
}: Readonly<OutliersWidgetContentProps>) {
  const resolvedScatterXAxisValue = resolveScatterXAxisValue(widget.scatterXSeriesId, seriesOptions);
  const scatterXAxisMode: OutliersScatterXAxisMode = resolvedScatterXAxisValue === OUTLIERS_UAT_NAME_X_AXIS_ID
    ? 'uat_name'
    : 'series';
  const resolvedScatterYSeriesId = resolveDefaultScatterYSeriesId(
    widget.scatterYSeriesId,
    resolvedScatterXAxisValue,
    seriesOptions
  );

  const scatterXOption = scatterXAxisMode === 'series' && resolvedScatterXAxisValue
    ? seriesOptions.find((opt) => opt.id === resolvedScatterXAxisValue)
    : undefined;
  const scatterYOption = resolvedScatterYSeriesId ? seriesOptions.find((opt) => opt.id === resolvedScatterYSeriesId) : undefined;
  const scatterXAxisLabel = scatterXAxisMode === 'uat_name'
    ? t`UAT name`
    : (scatterXOption?.label ?? t`X`);

  const scatterData = useMemo<AdvancedMapAnalyticsScatterPoint[]>(() => {
    if (widget.viewMode !== 'chart' || !resolvedScatterYSeriesId) {
      return [];
    }

    const yVector = valuesBySeriesId.get(resolvedScatterYSeriesId);
    if (!yVector) {
      return [];
    }

    if (scatterXAxisMode === 'uat_name') {
      const points: AdvancedMapAnalyticsScatterPoint[] = [];
      for (const [sirutaCode, rawYValue] of yVector.entries()) {
        const yValue = normalizeFiniteValue(rawYValue);
        if (yValue === undefined) {
          continue;
        }
        const metadata = uatMetadataBySirutaCode.get(sirutaCode);
        points.push({
          sirutaCode,
          uatName: metadata?.uatName ?? `UAT ${sirutaCode}`,
          countyName: metadata?.countyName ?? t`Unknown county`,
          xValue: 0,
          yValue,
          xDisplayLabel: metadata?.uatName ?? `UAT ${sirutaCode}`,
        });
      }

      points.sort((left, right) => {
        if (right.yValue !== left.yValue) {
          return right.yValue - left.yValue;
        }
        const nameOrder = left.uatName.localeCompare(right.uatName);
        if (nameOrder !== 0) {
          return nameOrder;
        }
        return left.sirutaCode.localeCompare(right.sirutaCode);
      });

      return points.map((point, index) => ({
        ...point,
        xValue: index + 1,
      }));
    }

    if (!resolvedScatterXAxisValue) {
      return [];
    }

    const xVector = valuesBySeriesId.get(resolvedScatterXAxisValue);
    if (!xVector) {
      return [];
    }

    const points: AdvancedMapAnalyticsScatterPoint[] = [];
    for (const [sirutaCode, rawXValue] of xVector.entries()) {
      const xValue = normalizeFiniteValue(rawXValue);
      const yValue = normalizeFiniteValue(yVector.get(sirutaCode));
      if (xValue === undefined || yValue === undefined) {
        continue;
      }
      const metadata = uatMetadataBySirutaCode.get(sirutaCode);
      points.push({
        sirutaCode,
        uatName: metadata?.uatName ?? `UAT ${sirutaCode}`,
        countyName: metadata?.countyName ?? t`Unknown county`,
        xValue,
        yValue,
      });
    }

    return points;
  }, [
    widget.viewMode,
    resolvedScatterXAxisValue,
    resolvedScatterYSeriesId,
    scatterXAxisMode,
    valuesBySeriesId,
    uatMetadataBySirutaCode,
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div className="grid flex-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor={`outliers-series-${widget.key}`}>{t`Series`}</Label>
            <Select
              value={selectedSeriesId}
              onValueChange={(nextSeriesId) =>
                onUpdateWidget({
                  ...widget,
                  seriesId: nextSeriesId,
                })
              }
              disabled={readOnly || seriesOptions.length === 0}
            >
              <SelectTrigger id={`outliers-series-${widget.key}`} aria-label={t`Outliers series`}>
                <SelectValue placeholder={t`Select series`} />
              </SelectTrigger>
              <SelectContent>
                {seriesOptions.map((seriesOption) => (
                  <SelectItem key={seriesOption.id} value={seriesOption.id}>
                    {seriesOption.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`outliers-multiplier-${widget.key}`}>{t`IQR multiplier`}</Label>
            <Input
              id={`outliers-multiplier-${widget.key}`}
              type="number"
              min={0.1}
              step={0.1}
              value={widget.iqrMultiplier}
              onChange={(event) => {
                const parsed = Number(event.currentTarget.value);
                if (!Number.isFinite(parsed) || parsed <= 0) {
                  return;
                }
                onUpdateWidget({
                  ...widget,
                  iqrMultiplier: parsed,
                });
              }}
              disabled={readOnly}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`outliers-limit-${widget.key}`}>{t`Result limit`}</Label>
            <Input
              id={`outliers-limit-${widget.key}`}
              type="number"
              min={1}
              max={100}
              value={widget.limit}
              onChange={(event) => {
                const parsed = Number(event.currentTarget.value);
                if (!Number.isFinite(parsed)) {
                  return;
                }
                onUpdateWidget({
                  ...widget,
                  limit: Math.min(100, Math.max(1, Math.trunc(parsed))),
                });
              }}
              disabled={readOnly}
            />
          </div>
        </div>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={widget.viewMode}
          onValueChange={(value: string) => {
            if (value === 'chart' || value === 'table') {
              onUpdateWidget({ ...widget, viewMode: value });
            }
          }}
        >
          <ToggleGroupItem value="chart" aria-label={t`Chart view`}>
            <ScatterChartIcon className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="table" aria-label={t`Table view`}>
            <TableIcon className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {widget.viewMode === 'chart' ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`outliers-x-axis-${widget.key}`}>{t`X axis`}</Label>
              <Select
                value={resolvedScatterXAxisValue}
                onValueChange={(nextId) =>
                  onUpdateWidget({ ...widget, scatterXSeriesId: nextId })
                }
                disabled={readOnly || seriesOptions.length === 0}
              >
                <SelectTrigger id={`outliers-x-axis-${widget.key}`} aria-label={t`X axis series`}>
                  <SelectValue placeholder={t`Select series`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={OUTLIERS_UAT_NAME_X_AXIS_ID}>{t`UAT name`}</SelectItem>
                  {seriesOptions.map((seriesOption) => (
                    <SelectItem key={seriesOption.id} value={seriesOption.id}>
                      {seriesOption.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`outliers-y-axis-${widget.key}`}>{t`Y axis`}</Label>
              <Select
                value={resolvedScatterYSeriesId}
                onValueChange={(nextId) =>
                  onUpdateWidget({ ...widget, scatterYSeriesId: nextId })
                }
                disabled={readOnly || seriesOptions.length === 0}
              >
                <SelectTrigger id={`outliers-y-axis-${widget.key}`} aria-label={t`Y axis series`}>
                  <SelectValue placeholder={t`Select series`} />
                </SelectTrigger>
                <SelectContent>
                  {seriesOptions.map((seriesOption) => (
                    <SelectItem key={seriesOption.id} value={seriesOption.id}>
                      {seriesOption.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {scatterData.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t`Not enough data points for scatter chart.`}</p>
          ) : (
            <OutliersCanvasScatterPlot
              points={scatterData}
              xAxisMode={scatterXAxisMode}
              xAxisLabel={scatterXAxisLabel}
              yAxisLabel={scatterYOption?.label ?? t`Y`}
              xUnit={scatterXOption?.unit}
              yUnit={scatterYOption?.unit}
            />
          )}
        </div>
      ) : (
        <>
          {outlierResult === null ? null : outlierResult.status === 'insufficient_sample' ? (
            <Badge variant="warning">{t`Insufficient data`}</Badge>
          ) : outlierResult.status === 'zero_variance' ? (
            <Badge variant="warning">{t`Zero variance`}</Badge>
          ) : outlierResult.rows.length === 0 ? (
            <Badge variant="success">{t`No outliers`}</Badge>
          ) : (
            <div className="space-y-3">
              <Badge variant="destructive">{t`${outlierResult.rows.length} outliers found`}</Badge>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t`UAT`}</TableHead>
                    <TableHead>{t`County`}</TableHead>
                    <TableHead>{t`SIRUTA`}</TableHead>
                    <TableHead className="text-right">{t`Value`}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outlierResult.rows.map((row) => (
                    <TableRow key={`${row.sirutaCode}-${row.value}`}>
                      <TableCell>{row.uatName}</TableCell>
                      <TableCell>{row.countyName}</TableCell>
                      <TableCell className="tabular-nums">{row.sirutaCode}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatAdvancedMapAnalyticsSeriesValue(row.value, selectedSeriesUnit)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface OutliersCanvasScatterPlotProps {
  points: AdvancedMapAnalyticsScatterPoint[];
  xAxisMode: OutliersScatterXAxisMode;
  xAxisLabel: string;
  yAxisLabel: string;
  xUnit?: string;
  yUnit?: string;
}

interface AdvancedMapAnalyticsProjectedScatterPoint {
  point: AdvancedMapAnalyticsScatterPoint;
  canvasX: number;
  canvasY: number;
}

const OUTLIERS_CANVAS_WIDTH = 980;
const OUTLIERS_CANVAS_HEIGHT = 320;
const OUTLIERS_PLOT_BOUNDS = {
  left: 64,
  right: OUTLIERS_CANVAS_WIDTH - 24,
  top: 16,
  bottom: OUTLIERS_CANVAS_HEIGHT - 48,
};

function OutliersCanvasScatterPlot({
  points,
  xAxisMode,
  xAxisLabel,
  yAxisLabel,
  xUnit,
  yUnit,
}: Readonly<OutliersCanvasScatterPlotProps>) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  const projectedScatterData = useMemo(() => {
    if (points.length === 0) {
      return null;
    }

    const xDomain = resolveScatterAxisDomain(points.map((point) => point.xValue));
    const yDomain = resolveScatterAxisDomain(points.map((point) => point.yValue));
    const plotWidth = OUTLIERS_PLOT_BOUNDS.right - OUTLIERS_PLOT_BOUNDS.left;
    const plotHeight = OUTLIERS_PLOT_BOUNDS.bottom - OUTLIERS_PLOT_BOUNDS.top;

    const projectedPoints: AdvancedMapAnalyticsProjectedScatterPoint[] = points.map((point) => ({
      point,
      canvasX: OUTLIERS_PLOT_BOUNDS.left + ((point.xValue - xDomain.min) / (xDomain.max - xDomain.min)) * plotWidth,
      canvasY: OUTLIERS_PLOT_BOUNDS.bottom - ((point.yValue - yDomain.min) / (yDomain.max - yDomain.min)) * plotHeight,
    }));

    const xTickValues = xAxisMode === 'uat_name'
      ? resolveUatNameTickValues(points.length)
      : [xDomain.min, (xDomain.min + xDomain.max) / 2, xDomain.max];
    const yTickValues = [0, 1, 2, 3, 4].map((step) =>
      yDomain.min + ((yDomain.max - yDomain.min) * step) / 4
    );

    return {
      xDomain,
      yDomain,
      projectedPoints,
      xTickValues,
      yTickValues,
    };
  }, [points, xAxisMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || projectedScatterData === null) {
      return;
    }

    let context: CanvasRenderingContext2D | null = null;
    try {
      context = canvas.getContext('2d');
    } catch {
      return;
    }

    if (!context) {
      return;
    }

    const borderColor = resolveThemeCanvasColor('--border', '#d1d5db');
    const foregroundColor = resolveThemeCanvasColor('--foreground', '#111827');
    const mutedForegroundColor = resolveThemeCanvasColor('--muted-foreground', '#6b7280');
    const pointColor = getSeriesColor(3);
    const highlightedPointColor = getSeriesColor(0);

    context.clearRect(0, 0, OUTLIERS_CANVAS_WIDTH, OUTLIERS_CANVAS_HEIGHT);
    context.strokeStyle = borderColor;
    context.lineWidth = 1;

    for (const tickValue of projectedScatterData.yTickValues) {
      const tickY = projectScatterY(tickValue, projectedScatterData.yDomain);
      context.beginPath();
      context.moveTo(OUTLIERS_PLOT_BOUNDS.left, tickY);
      context.lineTo(OUTLIERS_PLOT_BOUNDS.right, tickY);
      context.stroke();

      context.fillStyle = mutedForegroundColor;
      context.font = '11px Inter, sans-serif';
      context.textAlign = 'right';
      context.textBaseline = 'middle';
      context.fillText(formatCompactNumber(tickValue), OUTLIERS_PLOT_BOUNDS.left - 8, tickY);
    }

    context.beginPath();
    context.moveTo(OUTLIERS_PLOT_BOUNDS.left, OUTLIERS_PLOT_BOUNDS.top);
    context.lineTo(OUTLIERS_PLOT_BOUNDS.left, OUTLIERS_PLOT_BOUNDS.bottom);
    context.lineTo(OUTLIERS_PLOT_BOUNDS.right, OUTLIERS_PLOT_BOUNDS.bottom);
    context.stroke();

    for (const tickValue of projectedScatterData.xTickValues) {
      const tickX = projectScatterX(tickValue, projectedScatterData.xDomain);
      context.beginPath();
      context.moveTo(tickX, OUTLIERS_PLOT_BOUNDS.bottom);
      context.lineTo(tickX, OUTLIERS_PLOT_BOUNDS.bottom + 4);
      context.stroke();

      context.fillStyle = mutedForegroundColor;
      context.font = '11px Inter, sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'top';
      context.fillText(
        resolveScatterXAxisTickLabel(tickValue, points, xAxisMode),
        tickX,
        OUTLIERS_PLOT_BOUNDS.bottom + 6
      );
    }

    context.fillStyle = foregroundColor;
    context.font = '12px Inter, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'bottom';
    context.fillText(
      xAxisLabel,
      (OUTLIERS_PLOT_BOUNDS.left + OUTLIERS_PLOT_BOUNDS.right) / 2,
      OUTLIERS_CANVAS_HEIGHT - 6
    );

    context.save();
    context.translate(16, (OUTLIERS_PLOT_BOUNDS.top + OUTLIERS_PLOT_BOUNDS.bottom) / 2);
    context.rotate(-Math.PI / 2);
    context.textAlign = 'center';
    context.textBaseline = 'top';
    context.fillText(yAxisLabel, 0, 0);
    context.restore();

    projectedScatterData.projectedPoints.forEach((projectedPoint, index) => {
      const isHovered = hoveredPointIndex === index;
      context.beginPath();
      context.fillStyle = isHovered ? highlightedPointColor : pointColor;
      context.arc(
        projectedPoint.canvasX,
        projectedPoint.canvasY,
        isHovered ? 5 : 3.5,
        0,
        Math.PI * 2
      );
      context.fill();
    });
  }, [hoveredPointIndex, points, projectedScatterData, xAxisLabel, xAxisMode, yAxisLabel]);

  const hoveredPoint = hoveredPointIndex !== null && projectedScatterData
    ? projectedScatterData.projectedPoints[hoveredPointIndex]?.point
    : undefined;

  const handleMouseMove = (event: ReactMouseEvent<HTMLCanvasElement>) => {
    if (!projectedScatterData) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const canvasRect = canvas.getBoundingClientRect();
    if (canvasRect.width <= 0 || canvasRect.height <= 0) {
      return;
    }

    const scaleX = canvas.width / canvasRect.width;
    const scaleY = canvas.height / canvasRect.height;
    const canvasX = (event.clientX - canvasRect.left) * scaleX;
    const canvasY = (event.clientY - canvasRect.top) * scaleY;

    let nearestPointIndex: number | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    projectedScatterData.projectedPoints.forEach((projectedPoint, index) => {
      const deltaX = projectedPoint.canvasX - canvasX;
      const deltaY = projectedPoint.canvasY - canvasY;
      const squaredDistance = deltaX * deltaX + deltaY * deltaY;
      if (squaredDistance < nearestDistance) {
        nearestDistance = squaredDistance;
        nearestPointIndex = index;
      }
    });

    if (nearestPointIndex === null || nearestDistance > 18 * 18) {
      setHoveredPointIndex(null);
      setTooltipPosition(null);
      return;
    }

    setHoveredPointIndex(nearestPointIndex);
    setTooltipPosition({
      x: event.clientX - canvasRect.left,
      y: event.clientY - canvasRect.top,
    });
  };

  return (
    <div className="relative h-[320px] w-full rounded-lg border bg-muted/10 p-1">
      <canvas
        ref={canvasRef}
        data-testid="outliers-canvas-chart"
        width={OUTLIERS_CANVAS_WIDTH}
        height={OUTLIERS_CANVAS_HEIGHT}
        className="h-full w-full rounded-md"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          setHoveredPointIndex(null);
          setTooltipPosition(null);
        }}
      />
      {hoveredPoint && tooltipPosition ? (
        <div
          className="pointer-events-none absolute rounded-lg border bg-popover p-2 text-xs text-popover-foreground shadow-sm"
          style={{
            left: tooltipPosition.x + 12,
            top: tooltipPosition.y - 12,
            transform: 'translateY(-100%)',
          }}
        >
          <div className="font-medium">{hoveredPoint.uatName}</div>
          <div className="text-muted-foreground">{hoveredPoint.countyName} &middot; {hoveredPoint.sirutaCode}</div>
          <div className="mt-1 space-y-0.5 tabular-nums">
            <div>
              {xAxisLabel}
              {': '}
              {xAxisMode === 'uat_name'
                ? (hoveredPoint.xDisplayLabel ?? hoveredPoint.uatName)
                : formatAdvancedMapAnalyticsSeriesValue(hoveredPoint.xValue, xUnit)}
            </div>
            <div>{yAxisLabel}: {formatAdvancedMapAnalyticsSeriesValue(hoveredPoint.yValue, yUnit)}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function resolveScatterXAxisValue(
  explicitId: string | undefined,
  seriesOptions: AdvancedMapAnalyticsSeriesOption[]
): string | undefined {
  if (seriesOptions.length === 0) {
    return undefined;
  }

  if (explicitId === OUTLIERS_UAT_NAME_X_AXIS_ID) {
    return OUTLIERS_UAT_NAME_X_AXIS_ID;
  }

  if (explicitId && seriesOptions.some((opt) => opt.id === explicitId)) {
    return explicitId;
  }

  if (seriesOptions.length === 1) {
    return OUTLIERS_UAT_NAME_X_AXIS_ID;
  }

  return seriesOptions[0]?.id;
}

function resolveDefaultScatterYSeriesId(
  explicitId: string | undefined,
  resolvedScatterXAxisValue: string | undefined,
  seriesOptions: AdvancedMapAnalyticsSeriesOption[]
): string | undefined {
  if (seriesOptions.length === 0) {
    return undefined;
  }

  if (explicitId && seriesOptions.some((option) => option.id === explicitId)) {
    return explicitId;
  }

  if (!resolvedScatterXAxisValue || resolvedScatterXAxisValue === OUTLIERS_UAT_NAME_X_AXIS_ID) {
    return seriesOptions[0]?.id;
  }

  if (seriesOptions.length === 1) {
    return seriesOptions[0]?.id;
  }

  return seriesOptions.find((option) => option.id !== resolvedScatterXAxisValue)?.id ?? seriesOptions[0]?.id;
}

function resolveScatterAxisDomain(values: number[]): { min: number; max: number } {
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
    return { min: 0, max: 1 };
  }

  if (Math.abs(maxValue - minValue) <= OUTLIER_ZERO_VARIANCE_EPSILON) {
    const padding = Math.abs(maxValue) > 0 ? Math.abs(maxValue) * 0.1 : 1;
    return {
      min: minValue - padding,
      max: maxValue + padding,
    };
  }

  const padding = (maxValue - minValue) * 0.05;
  return {
    min: minValue - padding,
    max: maxValue + padding,
  };
}

function projectScatterX(value: number, domain: { min: number; max: number }): number {
  const ratio = (value - domain.min) / (domain.max - domain.min);
  return OUTLIERS_PLOT_BOUNDS.left + ratio * (OUTLIERS_PLOT_BOUNDS.right - OUTLIERS_PLOT_BOUNDS.left);
}

function projectScatterY(value: number, domain: { min: number; max: number }): number {
  const ratio = (value - domain.min) / (domain.max - domain.min);
  return OUTLIERS_PLOT_BOUNDS.bottom - ratio * (OUTLIERS_PLOT_BOUNDS.bottom - OUTLIERS_PLOT_BOUNDS.top);
}

function resolveUatNameTickValues(pointCount: number): number[] {
  if (pointCount <= 1) {
    return [1];
  }

  const middleTick = Math.floor((pointCount + 1) / 2);
  return Array.from(new Set([1, middleTick, pointCount]));
}

function resolveScatterXAxisTickLabel(
  tickValue: number,
  points: AdvancedMapAnalyticsScatterPoint[],
  xAxisMode: OutliersScatterXAxisMode
): string {
  if (xAxisMode === 'series') {
    return formatCompactNumber(tickValue);
  }

  const pointIndex = Math.max(0, Math.min(points.length - 1, Math.round(tickValue) - 1));
  const rawLabel = points[pointIndex]?.xDisplayLabel ?? points[pointIndex]?.uatName ?? '';
  if (rawLabel.length <= 16) {
    return rawLabel;
  }
  return `${rawLabel.slice(0, 13)}...`;
}

function resolveThemeCanvasColor(variableName: string, fallback: string): string {
  if (typeof document === 'undefined') {
    return fallback;
  }

  const tokenValue = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
  if (tokenValue.length === 0) {
    return fallback;
  }

  return `hsl(${tokenValue})`;
}

function getWidgetTitle(widgetKey: AdvancedMapAnalyticsWidgetKey): string {
  if (widgetKey === 'series_coverage') {
    return t`Series coverage`;
  }

  if (widgetKey === 'series_totals') {
    return t`Series totals`;
  }

  if (widgetKey === 'distribution') {
    return t`Distribution`;
  }

  return t`Outliers`;
}

function resolveWidgetSeriesId(
  widget: AdvancedMapAnalyticsWidget,
  activeSeriesId: string | undefined,
  seriesOptions: AdvancedMapAnalyticsSeriesOption[]
): string | undefined {
  if (seriesOptions.length === 0) {
    return undefined;
  }

  const explicitSeriesId = 'seriesId' in widget ? widget.seriesId : undefined;
  if (explicitSeriesId && seriesOptions.some((seriesOption) => seriesOption.id === explicitSeriesId)) {
    return explicitSeriesId;
  }

  if (activeSeriesId && seriesOptions.some((seriesOption) => seriesOption.id === activeSeriesId)) {
    return activeSeriesId;
  }

  return seriesOptions[0]?.id;
}

function collectDefinedValues(vector: Map<string, number | undefined> | undefined): number[] {
  if (!vector) {
    return [];
  }

  const values: number[] = [];
  for (const value of vector.values()) {
    const normalizedValue = normalizeFiniteValue(value);
    if (normalizedValue !== undefined) {
      values.push(normalizedValue);
    }
  }

  return values;
}

function computeMedian(values: number[]): number | undefined {
  if (values.length === 0) {
    return undefined;
  }

  const sortedValues = [...values].sort((left, right) => left - right);
  const middleIndex = Math.floor(sortedValues.length / 2);
  const middleValue = sortedValues[middleIndex];
  if (middleValue === undefined) {
    return undefined;
  }

  if (sortedValues.length % 2 === 1) {
    return middleValue;
  }

  const leftMiddleValue = sortedValues[middleIndex - 1];
  if (leftMiddleValue === undefined) {
    return undefined;
  }

  return (leftMiddleValue + middleValue) / 2;
}

function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('ro-RO', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function buildDistributionBins(
  values: number[],
  requestedBinCount: number,
  binMethod: AdvancedMapAnalyticsBinMethod,
  unit: string | undefined
): AdvancedMapAnalyticsHistogramBin[] {
  if (values.length === 0) {
    return [];
  }

  const binCount = Math.min(30, Math.max(3, Math.trunc(requestedBinCount)));

  const sortedValues = [...values].sort((left, right) => left - right);
  const minValue = sortedValues[0]!;
  const maxValue = sortedValues[sortedValues.length - 1]!;

  if (minValue === maxValue) {
    const formatted = formatAdvancedMapAnalyticsSeriesValue(minValue, unit);
    return [{
      id: 'single-bin',
      label: formatted,
      shortLabel: formatCompactNumber(minValue),
      count: values.length,
    }];
  }

  if (binMethod === 'log') {
    return buildLogScaleBins(sortedValues, minValue, maxValue, binCount, unit);
  }

  return buildEqualWidthBins(sortedValues, minValue, maxValue, binCount, unit);
}

function buildEqualWidthBins(
  sortedValues: number[],
  minValue: number,
  maxValue: number,
  binCount: number,
  unit: string | undefined
): AdvancedMapAnalyticsHistogramBin[] {
  const range = maxValue - minValue;
  const binSize = range / binCount;
  const bins = Array.from({ length: binCount }, () => 0);

  for (const value of sortedValues) {
    let binIndex = Math.floor((value - minValue) / binSize);
    if (value === maxValue) {
      binIndex = binCount - 1;
    }
    binIndex = Math.max(0, Math.min(binCount - 1, binIndex));
    bins[binIndex] += 1;
  }

  return bins.map((count, index) => {
    const binStart = minValue + index * binSize;
    const binEnd = minValue + (index + 1) * binSize;
    return {
      id: `bin-${index}`,
      label: `${formatAdvancedMapAnalyticsSeriesValue(binStart, unit)} – ${formatAdvancedMapAnalyticsSeriesValue(binEnd, unit)}`,
      shortLabel: `${formatCompactNumber(binStart)} – ${formatCompactNumber(binEnd)}`,
      count,
    };
  });
}

function buildLogScaleBins(
  sortedValues: number[],
  minValue: number,
  maxValue: number,
  binCount: number,
  unit: string | undefined
): AdvancedMapAnalyticsHistogramBin[] {
  const offset = minValue <= 0 ? 1 - minValue : 0;
  const logMin = Math.log10(minValue + offset);
  const logMax = Math.log10(maxValue + offset);
  const logStep = (logMax - logMin) / binCount;

  const boundaries: number[] = [];
  for (let i = 0; i <= binCount; i += 1) {
    boundaries.push(Math.pow(10, logMin + i * logStep) - offset);
  }
  boundaries[0] = minValue;
  boundaries[boundaries.length - 1] = maxValue;

  const bins = Array.from({ length: binCount }, () => 0);

  for (const value of sortedValues) {
    let binIndex = binCount - 1;
    for (let i = 1; i < boundaries.length; i += 1) {
      if (value < boundaries[i]!) {
        binIndex = i - 1;
        break;
      }
    }
    bins[binIndex] += 1;
  }

  return bins.map((count, index) => {
    const binStart = boundaries[index]!;
    const binEnd = boundaries[index + 1]!;
    return {
      id: `lbin-${index}`,
      label: `${formatAdvancedMapAnalyticsSeriesValue(binStart, unit)} – ${formatAdvancedMapAnalyticsSeriesValue(binEnd, unit)}`,
      shortLabel: `${formatCompactNumber(binStart)} – ${formatCompactNumber(binEnd)}`,
      count,
    };
  });
}

function computeIqrOutliers({
  vector,
  metadataBySirutaCode,
  multiplier,
  limit,
}: Readonly<{
  vector: Map<string, number | undefined> | undefined;
  metadataBySirutaCode: Map<string, UatMetadata>;
  multiplier: number;
  limit: number;
}>): { status: 'insufficient_sample' | 'zero_variance'; rows: [] } | { status: 'ok'; rows: AdvancedMapAnalyticsOutlierRow[] } {
  if (!vector) {
    return { status: 'insufficient_sample', rows: [] };
  }

  const sampleEntries: Array<{ sirutaCode: string; value: number }> = [];
  for (const [sirutaCode, rawValue] of vector.entries()) {
    const value = normalizeFiniteValue(rawValue);
    if (value === undefined) {
      continue;
    }
    sampleEntries.push({ sirutaCode, value });
  }

  if (sampleEntries.length < 4) {
    return { status: 'insufficient_sample', rows: [] };
  }

  const sortedValues = sampleEntries
    .map((entry) => entry.value)
    .slice()
    .sort((left, right) => left - right);
  const q1 = computeNearestRankPercentile(sortedValues, 25);
  const q3 = computeNearestRankPercentile(sortedValues, 75);

  if (q1 === undefined || q3 === undefined) {
    return { status: 'insufficient_sample', rows: [] };
  }

  const iqr = q3 - q1;
  if (Math.abs(iqr) <= OUTLIER_ZERO_VARIANCE_EPSILON) {
    return { status: 'zero_variance', rows: [] };
  }

  const lowerFence = q1 - multiplier * iqr;
  const upperFence = q3 + multiplier * iqr;
  const normalizedLimit = Math.min(100, Math.max(1, Math.trunc(limit)));

  const outlierRows = sampleEntries
    .filter((entry) => entry.value < lowerFence || entry.value > upperFence)
    .slice()
    .sort((left, right) => {
      const leftDistance = left.value < lowerFence ? lowerFence - left.value : left.value - upperFence;
      const rightDistance = right.value < lowerFence ? lowerFence - right.value : right.value - upperFence;
      if (rightDistance !== leftDistance) {
        return rightDistance - leftDistance;
      }
      return left.sirutaCode.localeCompare(right.sirutaCode);
    })
    .slice(0, normalizedLimit)
    .map((entry) => {
      const metadata = metadataBySirutaCode.get(entry.sirutaCode);
      return {
        sirutaCode: entry.sirutaCode,
        uatName: metadata?.uatName ?? `UAT ${entry.sirutaCode}`,
        countyName: metadata?.countyName ?? t`Unknown county`,
        value: entry.value,
      };
    });

  return {
    status: 'ok',
    rows: outlierRows,
  };
}

function computeNearestRankPercentile(sortedValues: number[], percentile: number): number | undefined {
  if (sortedValues.length === 0) {
    return undefined;
  }

  if (percentile <= 0) {
    return sortedValues[0];
  }

  if (percentile >= 100) {
    return sortedValues[sortedValues.length - 1];
  }

  const rank = Math.ceil((percentile / 100) * sortedValues.length);
  const index = Math.min(sortedValues.length - 1, Math.max(0, rank - 1));
  return sortedValues[index];
}

function normalizeFiniteValue(value: number | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  return Number.isFinite(value) ? value : undefined;
}

function resolveSeriesDisplayLabel(series: MapSupportedSeries): string {
  const trimmedLabel = series.label.trim();
  if (trimmedLabel.length > 0) {
    return trimmedLabel;
  }

  if (series.type === 'geojson-dataset-series') {
    return getGeoJsonDatasetLabel(series.datasetKey);
  }

  return series.id;
}

function resolveSeriesDisplayUnit(
  series: MapSupportedSeries,
  unitsBySeriesId: Map<string, string | undefined>
): string | undefined {
  const derivedUnit = unitsBySeriesId.get(series.id);
  if (typeof derivedUnit === 'string') {
    const trimmedDerivedUnit = derivedUnit.trim();
    if (trimmedDerivedUnit.length > 0) {
      return trimmedDerivedUnit;
    }
  }

  const fallbackUnit = typeof series.unit === 'string' ? series.unit.trim() : '';
  if (series.type === 'geojson-dataset-series' && fallbackUnit.length === 0) {
    return getGeoJsonDatasetUnit(series.datasetKey);
  }

  if (fallbackUnit.length === 0) {
    return undefined;
  }

  if (series.type === 'ins-series' && fallbackUnit.toUpperCase() === 'RON') {
    return undefined;
  }

  return fallbackUnit;
}
