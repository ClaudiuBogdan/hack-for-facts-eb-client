import { useMemo } from 'react';
import type {
  CommitmentsSeriesConfiguration,
  SeriesConfiguration,
  Series,
} from '@/schemas/charts';
import { hasCalculationCycle } from '@/lib/chart-calculation-utils';
import {
  GEOJSON_POPULATION_DATASET_KEYS,
  getGeoJsonDatasetLabel,
  type GeoJsonFilterOption,
  type GeoJsonDatasetKey,
  type MapSupportedSeries,
} from '@/schemas/advanced-map-analytics';
import { CalculationEditor } from '@/components/charts/components/series-config/CalculationEditor';
import type { BaseListProps, OptionItem } from '@/components/filters/base-filter/interfaces';
import { FilterListContainer } from '@/components/filters/base-filter/FilterListContainer';
import { ListContainerSimple } from '@/components/filters/base-filter/ListContainerSimple';
import { ListOption } from '@/components/filters/base-filter/ListOption';
import { NoResults } from '@/components/filters/base-filter/NoResults';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Globe, MapPinned } from 'lucide-react';
import { SERIES_TYPE_LABELS } from './advanced-map-analytics-series-utils';
import { i18n } from '@lingui/core';
import { msg, t } from '@lingui/core/macro';

const GEOJSON_DATASET_DEFAULT_LABEL = msg`GeoJSON dataset`;
const COUNTY_FILTER_PREFIX_LABEL = msg`County`;
const REGION_FILTER_PREFIX_LABEL = msg`Region`;
const NO_FILTER_SELECTION_LABEL = msg`none`;

interface AdvancedMapAnalyticsSeriesEditorModalProps {
  open: boolean;
  mode: 'add' | 'edit';
  series?: MapSupportedSeries;
  allSeries: MapSupportedSeries[];
  geoJsonCountyOptions?: GeoJsonFilterOption[];
  geoJsonRegionOptions?: GeoJsonFilterOption[];
  onOpenChange: (open: boolean) => void;
  onUpdateSeries: (seriesId: string, updater: (draft: MapSupportedSeries) => void) => void;
  onChangeSeriesType: (seriesId: string, type: MapSupportedSeries['type']) => void;
}

export function AdvancedMapAnalyticsSeriesEditorModal({
  open,
  mode,
  series,
  allSeries,
  geoJsonCountyOptions = [],
  geoJsonRegionOptions = [],
  onOpenChange,
  onUpdateSeries,
  onChangeSeriesType,
}: Readonly<AdvancedMapAnalyticsSeriesEditorModalProps>) {
  if (!series) {
    return null;
  }

  const title = mode === 'add' ? t`Add Data Series` : t`Edit Data Series`;
  const description =
    mode === 'add'
      ? t`Configure a new series. Changes apply immediately while this modal is open.`
      : t`Update the selected series configuration. Changes apply immediately while this modal is open.`;
  const configurationTitle =
    series.type === 'aggregated-series-calculation'
      ? t`Calculation`
      : series.type === 'ins-series'
        ? t`INS Settings`
        : series.type === 'geojson-dataset-series'
          ? t`GeoJSON dataset`
        : t`Filters`;

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
                <Label htmlFor="advanced-map-analytics-series-label">{t`Label`}</Label>
                <Input
                  id="advanced-map-analytics-series-label"
                  name="advanced-map-analytics-series-label"
                  value={series.label}
                  onChange={(event) => {
                    const nextValue = event.currentTarget.value;
                    onUpdateSeries(series.id, (draft) => {
                      draft.label = nextValue;
                    });
                  }}
                  placeholder={t`Series label…`}
                  autoComplete="off"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="advanced-map-analytics-series-unit">{t`Unit override`}</Label>
                <Input
                  id="advanced-map-analytics-series-unit"
                  name="advanced-map-analytics-series-unit"
                  value={series.unit ?? ''}
                  onChange={(event) => {
                    const nextValue = event.currentTarget.value;
                    onUpdateSeries(series.id, (draft) => {
                      draft.unit = nextValue;
                    });
                  }}
                  placeholder={t`Optional unit override…`}
                  autoComplete="off"
                />
              </div>

              <div className="space-y-2 md:max-w-sm">
                <Label htmlFor="advanced-map-analytics-series-type">{t`Series type`}</Label>
                <Select
                  value={series.type}
                  onValueChange={(value) =>
                    onChangeSeriesType(series.id, value as MapSupportedSeries['type'])
                  }
                >
                  <SelectTrigger id="advanced-map-analytics-series-type">
                    <SelectValue placeholder={t`Select series type`} />
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
              <p className="text-xs text-muted-foreground">{t`Live apply`}</p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
              <SeriesConfigEditor
                series={series}
                allSeries={allSeries}
                geoJsonCountyOptions={geoJsonCountyOptions}
                geoJsonRegionOptions={geoJsonRegionOptions}
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
  geoJsonCountyOptions: GeoJsonFilterOption[];
  geoJsonRegionOptions: GeoJsonFilterOption[];
  onUpdateSeries: (seriesId: string, updater: (draft: MapSupportedSeries) => void) => void;
}

function SeriesConfigEditor({
  series,
  allSeries,
  geoJsonCountyOptions,
  geoJsonRegionOptions,
  onUpdateSeries,
}: Readonly<SeriesConfigEditorProps>) {
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
    const calculationCompatibleSeries = allSeries as unknown as Series[];

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
        allSeries={calculationCompatibleSeries}
        currentSeriesId={series.id}
        validateCalculation={(nextCalculation) => {
          if (hasCalculationCycle(series.id, nextCalculation, calculationCompatibleSeries)) {
            return t`This change would create a circular dependency.`;
          }
          return null;
        }}
      />
    );
  }

  if (series.type === 'geojson-dataset-series') {
    return (
      <GeoJsonDatasetSeriesEditor
        series={series}
        countyOptions={geoJsonCountyOptions}
        regionOptions={geoJsonRegionOptions}
        onUpdateSeries={onUpdateSeries}
      />
    );
  }

  const adapter: InsSeriesEditorAdapter = {
    series,
    datasetFilter: {
      hasUatData: true,
      hasSiruta: true,
    },
    allowedTerritoryLevels: ['LAU'],
    autoSelectTerritoryDefaults: false,
    autoReapplyTerritoryOnEmpty: false,
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

function GeoJsonDatasetSeriesEditor({
  series,
  countyOptions,
  regionOptions,
  onUpdateSeries,
}: Readonly<{
  series: Extract<MapSupportedSeries, { type: 'geojson-dataset-series' }>;
  countyOptions: GeoJsonFilterOption[];
  regionOptions: GeoJsonFilterOption[];
  onUpdateSeries: (seriesId: string, updater: (draft: MapSupportedSeries) => void) => void;
}>) {
  const selectedPopulationKey = series.datasetKey;
  const countyListOptions = useMemo<OptionItem<number>[]>(
    () => countyOptions.map((option) => ({ id: option.id, label: `${option.name} (${option.id})` })),
    [countyOptions]
  );
  const regionListOptions = useMemo<OptionItem<number>[]>(
    () => regionOptions.map((option) => ({ id: option.id, label: `${option.name} (${option.id})` })),
    [regionOptions]
  );

  const countyOptionsById = useMemo(
    () => new Map(countyOptions.map((option) => [option.id, option.name])),
    [countyOptions]
  );
  const regionOptionsById = useMemo(
    () => new Map(regionOptions.map((option) => [option.id, option.name])),
    [regionOptions]
  );

  const selectedCountyOptions = useMemo<OptionItem<number>[]>(
    () =>
      series.countyFilterIds.map((id) => ({
        id,
        label: countyOptionsById.get(id) ? `${countyOptionsById.get(id)} (${id})` : String(id),
      })),
    [countyOptionsById, series.countyFilterIds]
  );
  const selectedRegionOptions = useMemo<OptionItem<number>[]>(
    () =>
      series.regionFilterIds.map((id) => ({
        id,
        label: regionOptionsById.get(id) ? `${regionOptionsById.get(id)} (${id})` : String(id),
      })),
    [regionOptionsById, series.regionFilterIds]
  );

  const CountyFilterList = useMemo(
    () => createStaticGeoJsonFilterList(countyListOptions, t`No counties available.`),
    [countyListOptions]
  );
  const RegionFilterList = useMemo(
    () => createStaticGeoJsonFilterList(regionListOptions, t`No regions available.`),
    [regionListOptions]
  );

  const setSelectedCountyOptions: React.Dispatch<React.SetStateAction<OptionItem<string | number>[]>> =
    (action) => {
      const nextSelectedOptions = typeof action === 'function'
        ? action(selectedCountyOptions)
        : action;
      const nextCountyFilterIds = normalizeSelectedFilterIds(nextSelectedOptions);

      onUpdateSeries(series.id, (draft) => {
        if (draft.type !== 'geojson-dataset-series') {
          return;
        }

        const shouldAutoLabel = shouldAutoUpdateGeoJsonLabel(
          draft.label,
          draft.datasetKey
        );
        draft.countyFilterIds = nextCountyFilterIds;

        if (shouldAutoLabel) {
          draft.label = buildFilterSelectionLabel('County', nextCountyFilterIds, countyOptions);
        }
      });

      return nextSelectedOptions;
    };

  const setSelectedRegionOptions: React.Dispatch<React.SetStateAction<OptionItem<string | number>[]>> =
    (action) => {
      const nextSelectedOptions = typeof action === 'function'
        ? action(selectedRegionOptions)
        : action;
      const nextRegionFilterIds = normalizeSelectedFilterIds(nextSelectedOptions);

      onUpdateSeries(series.id, (draft) => {
        if (draft.type !== 'geojson-dataset-series') {
          return;
        }

        const shouldAutoLabel = shouldAutoUpdateGeoJsonLabel(
          draft.label,
          draft.datasetKey
        );
        draft.regionFilterIds = nextRegionFilterIds;

        if (shouldAutoLabel) {
          draft.label = buildFilterSelectionLabel('Region', nextRegionFilterIds, regionOptions);
        }
      });

      return nextSelectedOptions;
    };

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        {t`Values are always population. County and region selections filter the included UATs.`}
      </p>
      <section
        className="space-y-3 rounded-lg border border-primary/40 bg-primary/5 p-4"
      >
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-semibold">{t`Population`}</h4>
          <span className="text-xs text-muted-foreground">{t`Value source`}</span>
        </div>
        <div className="space-y-2 md:max-w-md">
          <Label htmlFor="advanced-map-analytics-geojson-population-key">{t`Population field`}</Label>
          <Select
            value={selectedPopulationKey}
            onValueChange={(nextDatasetKey) => {
              onUpdateSeries(series.id, (draft) => {
                if (draft.type !== 'geojson-dataset-series') {
                  return;
                }

                const shouldAutoLabel = shouldAutoUpdateGeoJsonLabel(draft.label, draft.datasetKey);
                draft.datasetKey = nextDatasetKey as GeoJsonDatasetKey;

                if (shouldAutoLabel) {
                  draft.label = getGeoJsonDatasetLabel(draft.datasetKey);
                }
              });
            }}
          >
            <SelectTrigger id="advanced-map-analytics-geojson-population-key">
              <SelectValue placeholder={t`Select population field`} />
            </SelectTrigger>
            <SelectContent>
              {GEOJSON_POPULATION_DATASET_KEYS.map((populationKey) => (
                <SelectItem key={populationKey} value={populationKey}>
                  {getGeoJsonDatasetLabel(populationKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      <div className="rounded-lg border">
        <FilterListContainer
          listComponent={CountyFilterList}
          selected={selectedCountyOptions}
          setSelected={setSelectedCountyOptions}
          title={t`County Filters`}
          icon={<MapPinned className="h-4 w-4" />}
        />
        <FilterListContainer
          listComponent={RegionFilterList}
          selected={selectedRegionOptions}
          setSelected={setSelectedRegionOptions}
          title={t`Region Filters`}
          icon={<Globe className="h-4 w-4" />}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {t`County and region filters can both be selected and are combined using AND logic.`}
      </p>
    </div>
  );
}

function normalizeSelectedFilterIds(values: Array<OptionItem<string | number>>): number[] {
  return [...new Set(values
    .map((value) => Number(value.id))
    .filter((value) => Number.isFinite(value))
  )].sort((left, right) => left - right);
}

function createStaticGeoJsonFilterList(
  options: OptionItem<number>[],
  emptyMessage: string
) {
  function StaticGeoJsonFilterList({
    selectedOptions,
    toggleSelect,
  }: Readonly<BaseListProps>) {
    const optionHeight = 46;

    if (options.length === 0) {
      return <NoResults message={emptyMessage} className="border rounded-md min-h-[10rem]" />;
    }

    return (
      <ListContainerSimple
        height={options.length * optionHeight}
        className="min-h-[10rem]"
        ariaLabel={emptyMessage}
      >
        {options.map((option, index) => (
          <ListOption
            key={option.id}
            uniqueIdPart={`geojson-filter-${option.id}`}
            onClick={() => toggleSelect(option)}
            label={option.label}
            selected={selectedOptions.some((selectedOption) => selectedOption.id === option.id)}
            optionHeight={optionHeight}
            optionStart={index * optionHeight}
          />
        ))}
      </ListContainerSimple>
    );
  }

  StaticGeoJsonFilterList.displayName = 'StaticGeoJsonFilterList';
  return StaticGeoJsonFilterList;
}

function shouldAutoUpdateGeoJsonLabel(
  currentLabel: string,
  previousDatasetKey: GeoJsonDatasetKey
): boolean {
  const trimmedLabel = currentLabel.trim();
  if (trimmedLabel.length === 0) {
    return true;
  }

  const translatedGeoJsonDatasetLabel = i18n._(GEOJSON_DATASET_DEFAULT_LABEL);
  const translatedCountyPrefix = i18n._(COUNTY_FILTER_PREFIX_LABEL);
  const translatedRegionPrefix = i18n._(REGION_FILTER_PREFIX_LABEL);

  return (
    trimmedLabel === 'GeoJSON dataset' ||
    trimmedLabel === translatedGeoJsonDatasetLabel ||
    trimmedLabel === getGeoJsonDatasetLabel(previousDatasetKey) ||
    trimmedLabel.startsWith('County:') ||
    trimmedLabel.startsWith(`${translatedCountyPrefix}:`) ||
    trimmedLabel.startsWith('Region:') ||
    trimmedLabel.startsWith(`${translatedRegionPrefix}:`)
  );
}

function buildFilterSelectionLabel(
  prefix: 'County' | 'Region',
  selectedIds: number[],
  options: GeoJsonFilterOption[]
): string {
  const translatedPrefix = prefix === 'County'
    ? i18n._(COUNTY_FILTER_PREFIX_LABEL)
    : i18n._(REGION_FILTER_PREFIX_LABEL);
  const translatedNoSelectionLabel = i18n._(NO_FILTER_SELECTION_LABEL);

  if (selectedIds.length === 0) {
    return `${translatedPrefix}: ${translatedNoSelectionLabel}`;
  }

  if (selectedIds.length === 1) {
    const option = options.find((entry) => entry.id === selectedIds[0]);
    return option
      ? `${translatedPrefix}: ${option.name}`
      : `${translatedPrefix}: ${selectedIds[0]}`;
  }

  return `${translatedPrefix}: ${selectedIds.length} ${t`selected`}`;
}
