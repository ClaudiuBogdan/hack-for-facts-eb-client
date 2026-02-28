import type {
  CommitmentsSeriesConfiguration,
  SeriesConfiguration,
} from '@/schemas/charts';
import { hasCalculationCycle } from '@/lib/chart-calculation-utils';
import type { MapSupportedSeries } from '@/schemas/experimental-map';
import { CalculationEditor } from '@/components/charts/components/series-config/CalculationEditor';
import {
  InsSeriesEditor,
  type InsSeriesEditorAdapter,
} from '@/components/charts/components/series-config/InsSeriesEditor';
import {
  SeriesFilter,
  type SeriesFilterAdapter,
} from '@/components/charts/components/series-config/SeriesFilter';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SERIES_TYPE_LABELS } from './experimental-map-series-utils';

interface ExperimentalMapSeriesEditorModalProps {
  open: boolean;
  mode: 'add' | 'edit';
  series?: MapSupportedSeries;
  allSeries: MapSupportedSeries[];
  onOpenChange: (open: boolean) => void;
  onUpdateSeries: (seriesId: string, updater: (draft: MapSupportedSeries) => void) => void;
  onChangeSeriesType: (seriesId: string, type: MapSupportedSeries['type']) => void;
}

export function ExperimentalMapSeriesEditorModal({
  open,
  mode,
  series,
  allSeries,
  onOpenChange,
  onUpdateSeries,
  onChangeSeriesType,
}: Readonly<ExperimentalMapSeriesEditorModalProps>) {
  if (!series) {
    return null;
  }

  const title = mode === 'add' ? 'Add Data Series' : 'Edit Data Series';
  const description =
    mode === 'add'
      ? 'Configure a new series. Changes apply immediately while this modal is open.'
      : 'Update the selected series configuration. Changes apply immediately while this modal is open.';
  const configurationTitle =
    series.type === 'aggregated-series-calculation'
      ? 'Calculation'
      : series.type === 'ins-series'
        ? 'INS Settings'
        : 'Filters';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(96vw,1200px)] max-w-5xl h-[min(92vh,940px)] overflow-hidden p-0 gap-0 grid-rows-[auto_minmax(0,1fr)]">
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-6 py-4">
          <section className="rounded-xl border bg-muted/20 p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="experimental-series-label">Label</Label>
                <Input
                  id="experimental-series-label"
                  name="experimental-series-label"
                  value={series.label}
                  onChange={(event) => {
                    const nextValue = event.currentTarget.value;
                    onUpdateSeries(series.id, (draft) => {
                      draft.label = nextValue;
                    });
                  }}
                  placeholder="Series label…"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="experimental-series-unit">Unit override</Label>
                <Input
                  id="experimental-series-unit"
                  name="experimental-series-unit"
                  value={series.unit ?? ''}
                  onChange={(event) => {
                    const nextValue = event.currentTarget.value;
                    onUpdateSeries(series.id, (draft) => {
                      draft.unit = nextValue;
                    });
                  }}
                  placeholder="Optional unit override…"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-2 md:max-w-sm">
                <Label htmlFor="experimental-series-type">Series type</Label>
                <Select
                  value={series.type}
                  onValueChange={(value) =>
                    onChangeSeriesType(series.id, value as MapSupportedSeries['type'])
                  }
                >
                  <SelectTrigger id="experimental-series-type">
                    <SelectValue placeholder="Select series type" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SERIES_TYPE_LABELS) as Array<MapSupportedSeries['type']>).map(
                      (seriesType) => (
                        <SelectItem key={seriesType} value={seriesType}>
                          {SERIES_TYPE_LABELS[seriesType]}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-sm font-semibold">{configurationTitle}</h3>
              <p className="text-xs text-muted-foreground">Live apply</p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
              <SeriesConfigEditor
                series={series}
                allSeries={allSeries}
                onUpdateSeries={onUpdateSeries}
              />
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface SeriesConfigEditorProps {
  series: MapSupportedSeries;
  allSeries: MapSupportedSeries[];
  onUpdateSeries: (seriesId: string, updater: (draft: MapSupportedSeries) => void) => void;
}

function SeriesConfigEditor({ series, allSeries, onUpdateSeries }: Readonly<SeriesConfigEditorProps>) {
  if (series.type === 'line-items-aggregated-yearly' || series.type === 'commitments-analytics') {
    const adapter: SeriesFilterAdapter = {
      series,
      applyChanges: (mutator) => {
        onUpdateSeries(series.id, (draft) => {
          if (draft.type !== 'line-items-aggregated-yearly' && draft.type !== 'commitments-analytics') {
            return;
          }

          mutator(draft as SeriesConfiguration | CommitmentsSeriesConfiguration);
        });
      },
    };

    return <SeriesFilter adapter={adapter} />;
  }

  if (series.type === 'aggregated-series-calculation') {
    return (
      <CalculationEditor
        calculation={series.calculation}
        onChange={(nextCalculation) => {
          onUpdateSeries(series.id, (draft) => {
            if (draft.type !== 'aggregated-series-calculation') {
              return;
            }
            draft.calculation = nextCalculation;
          });
        }}
        allSeries={allSeries}
        currentSeriesId={series.id}
        validateCalculation={(nextCalculation) => {
          if (hasCalculationCycle(series.id, nextCalculation, allSeries)) {
            return 'This change would create a circular dependency.';
          }
          return null;
        }}
      />
    );
  }

  const adapter: InsSeriesEditorAdapter = {
    series,
    datasetFilter: {
      hasUatData: true,
      hasSiruta: true,
    },
    applyPatch: (patch) => {
      onUpdateSeries(series.id, (draft) => {
        if (draft.type !== 'ins-series') {
          return;
        }

        Object.assign(draft, patch);
      });
    },
  };

  return <InsSeriesEditor adapter={adapter} />;
}
