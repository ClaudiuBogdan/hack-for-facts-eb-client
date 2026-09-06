import { normalizeInsDatasetCode } from '@/lib/ins/source-contract';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { Calendar, Database, ExternalLink, MapPin, Ruler, Tags } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FilterContainer } from '@/components/filters/base-filter/FilterContainer';
import { FilterListContainer } from '@/components/filters/base-filter/FilterListContainer';
import type { OptionItem } from '@/components/filters/base-filter/interfaces';
import { PeriodFilter } from '@/components/filters/period-filter/PeriodFilter';

import { InsSeriesConfigurationSchema } from '@/schemas/charts';
import type {
  InsDataset,
  InsDatasetDetails,
  InsDimension,
  InsDimensionValue,
  InsTerritoryLevel,
} from '@/schemas/ins';
import type { ReportPeriodInput, ReportPeriodType } from '@/schemas/reporting';
import { useChartStore } from '../../hooks/useChartStore';
import { getInsDatasetDetails, getInsDimensionValuesPage } from '@/features/statistics/api/graphql/ins-fetchers';
import { getPeriodTags } from '@/lib/period-utils';
import { getUserLocale } from '@/lib/utils';
import {
  areReportPeriodsEqual,
  buildDefaultInsPeriod,
  clampPeriodToDatasetConstraints,
  mapDatasetPeriodicitiesToAllowedTypes,
  mapInsDimensionValueToOption,
  pickDefaultDimensionValue,
  type InsLocale,
  type InsDimensionOptionKind,
  upsertSelectionRecord,
} from './ins-series-editor.utils';
import { InsMapPeriodEditor } from './ins-map-period-editor';
import { InsDatasetList } from './ins-dataset-list';
import { InsDimensionValuesList } from './ins-dimension-values-list';

type InsSeriesConfiguration = z.infer<typeof InsSeriesConfigurationSchema>;

export interface InsSeriesEditorDatasetFilter {
  hasUatData?: boolean;
  hasSiruta?: boolean;
}

export interface InsSeriesEditorAdapter {
  /** Maps choose one scalar period or explicit interval operation. Charts keep time series. */
  mapPeriodSelection?: boolean;
  /** Charts preserve source dimensions; maps use canonical territory filters. */
  territorySelectionMode?: 'source' | 'canonical';
  series?: InsSeriesConfiguration;
  applyPatch: (patch: Partial<InsSeriesConfiguration>) => void;
  datasetFilter?: InsSeriesEditorDatasetFilter;
  allowedTerritoryLevels?: InsTerritoryLevel[];
  autoSelectTerritoryDefaults?: boolean;
  autoReapplyTerritoryOnEmpty?: boolean;
}

interface InsSeriesEditorProps {
  series?: InsSeriesConfiguration;
  adapter?: InsSeriesEditorAdapter;
}

interface InsDimensionFilterListProps {
  title: string;
  icon: React.ReactNode;
  selected: OptionItem[];
  setSelected: React.Dispatch<React.SetStateAction<OptionItem[]>>;
  datasetCode: string;
  dimensionIndex: number;
  optionKind: InsDimensionOptionKind;
  classificationTypeCode?: string;
  allowedTerritoryLevels?: InsTerritoryLevel[];
}

interface InsSeriesEditorTerritoryPolicy {
  territorySelectionMode: 'source' | 'canonical';
  allowedTerritoryLevels?: InsTerritoryLevel[];
  autoSelectTerritoryDefaults: boolean;
  autoReapplyTerritoryOnEmpty: boolean;
}

function getDatasetDisplayName(
  dataset: InsDataset | null | undefined,
  locale: InsLocale
): string {
  if (!dataset) return '';
  return locale === 'en'
    ? dataset.name_en || dataset.name_ro || dataset.code
    : dataset.name_ro || dataset.name_en || dataset.code;
}

function getDimensionLabel(
  dimension: InsDimension,
  fallback: string,
  locale: InsLocale
): string {
  return locale === 'en'
    ? dimension.label_en || dimension.label_ro || fallback
    : dimension.label_ro || dimension.label_en || fallback;
}

function mapCodesToOptions(codes: string[], labels: Record<string, string>): OptionItem[] {
  return codes.map((code) => ({
    id: code,
    label: labels[code] ?? code,
  }));
}

function mergeLabels(current: Record<string, string>, options: OptionItem[]): Record<string, string> {
  const next = { ...current };
  for (const option of options) {
    const code = String(option.id);
    if (!next[code]) {
      next[code] = option.label;
    }
  }
  return next;
}

function toDatasetSeriesLabel(datasetCode: string, optionLabel: string): string {
  const prefix = `${datasetCode} - `;
  if (optionLabel.startsWith(prefix)) {
    return optionLabel.slice(prefix.length).trim() || datasetCode;
  }
  return optionLabel.trim() || datasetCode;
}

const INS_TEMPO_BASE_URL = 'http://statistici.insse.ro/tempoins/index.jsp';

function buildInsTempoDatasetUrl(datasetCode: string, locale: InsLocale): string {
  const params = new URLSearchParams({
    ind: datasetCode,
    lang: locale === 'en' ? 'en' : 'ro',
    page: 'tempo3',
  });
  return `${INS_TEMPO_BASE_URL}?${params.toString()}`;
}

function normalizeAllowedTerritoryLevels(
  allowedTerritoryLevels: InsTerritoryLevel[] | undefined
): InsTerritoryLevel[] | undefined {
  if (allowedTerritoryLevels === undefined || allowedTerritoryLevels.length === 0) {
    return undefined;
  }

  const normalized = Array.from(new Set(allowedTerritoryLevels))
    .map((level) => String(level).trim())
    .filter((level): level is InsTerritoryLevel => level.length > 0)
    .sort((left, right) => left.localeCompare(right));

  return normalized.length > 0 ? normalized : undefined;
}

function filterDimensionValuesByAllowedTerritoryLevels(
  values: InsDimensionValue[],
  optionKind: InsDimensionOptionKind,
  allowedTerritoryLevels: InsTerritoryLevel[] | undefined
): InsDimensionValue[] {
  if (
    allowedTerritoryLevels === undefined ||
    (optionKind !== 'territory' && optionKind !== 'siruta' && optionKind !== 'source-territory')
  ) {
    return values;
  }

  const allowedLevelSet = new Set<InsTerritoryLevel>(allowedTerritoryLevels);
  return values.filter((value) => {
    const level = value.territory?.level;
    return typeof level === 'string' && allowedLevelSet.has(level as InsTerritoryLevel);
  });
}

function InsDimensionFilterList({
  title,
  icon,
  selected,
  setSelected,
  datasetCode,
  dimensionIndex,
  optionKind,
  classificationTypeCode,
  allowedTerritoryLevels,
}: InsDimensionFilterListProps) {
  const ListComponent = useMemo(() => {
    function Component(props: {
      selectedOptions: OptionItem[];
      toggleSelect: (option: OptionItem) => void;
      pageSize: number;
    }) {
      return (
        <InsDimensionValuesList
          selectedOptions={props.selectedOptions}
          toggleSelect={props.toggleSelect}
          pageSize={props.pageSize}
          datasetCode={datasetCode}
          dimensionIndex={dimensionIndex}
          optionKind={optionKind}
          classificationTypeCode={classificationTypeCode}
          allowedTerritoryLevels={allowedTerritoryLevels}
        />
      );
    }

    return Component;
  }, [allowedTerritoryLevels, classificationTypeCode, datasetCode, dimensionIndex, optionKind]);

  return (
    <FilterListContainer
      title={title}
      icon={icon}
      listComponent={ListComponent}
      selected={selected}
      setSelected={setSelected}
    />
  );
}

async function buildDatasetDefaultPatch(
  dataset: InsDatasetDetails,
  territoryPolicy: InsSeriesEditorTerritoryPolicy
): Promise<Partial<InsSeriesConfiguration>> {
  const allowedPeriodTypes = mapDatasetPeriodicitiesToAllowedTypes(dataset.periodicity ?? []);
  const preferredType = allowedPeriodTypes[0] ?? 'YEAR';

  const defaults: Partial<InsSeriesConfiguration> = {
    period: buildDefaultInsPeriod(dataset, preferredType),
    aggregation: 'sum',
    hasValue: true,
  };

  const dimensions = dataset.dimensions ?? [];
  const classificationSelections: Record<string, string[]> = {};

  for (const dimension of dimensions) {
    if (dimension.type === 'TEMPORAL') continue;

    if (dimension.type === 'TERRITORIAL' && !territoryPolicy.autoSelectTerritoryDefaults) {
      continue;
    }

    const connection = await getInsDimensionValuesPage({
      datasetCode: dataset.code,
      dimensionIndex: dimension.index,
      limit: 200,
      offset: 0,
    });

    const optionKind: InsDimensionOptionKind =
      dimension.type === 'CLASSIFICATION'
        ? 'classification'
        : dimension.type === 'UNIT_OF_MEASURE'
          ? 'unit'
          : 'territory';
    const filteredValues = filterDimensionValuesByAllowedTerritoryLevels(
      connection.nodes ?? [],
      optionKind,
      territoryPolicy.allowedTerritoryLevels
    );

    const selected = pickDefaultDimensionValue(filteredValues);
    if (!selected) continue;

    if (dimension.type === 'TERRITORIAL' && territoryPolicy.territorySelectionMode === 'canonical') {
      if (selected.territory?.siruta_code) {
        defaults.sirutaCodes = [selected.territory.siruta_code];
      } else if (selected.territory?.code) {
        defaults.territoryCodes = [selected.territory.code];
      }
    }

    if (dimension.type === 'UNIT_OF_MEASURE') {
      const unitCode = selected.unit?.code;
      if (unitCode) {
        defaults.unitCodes = [unitCode];
      }
    }

    if (dimension.type === 'CLASSIFICATION' || (dimension.type === 'TERRITORIAL' && territoryPolicy.territorySelectionMode === 'source')) {
      const typeCode = selected.classification_value?.type_code;
      const code = selected.classification_value?.code;
      if (typeCode && code) {
        classificationSelections[typeCode] = [code];
      }
    }
  }

  if (Object.keys(classificationSelections).length > 0) {
    defaults.classificationSelections = classificationSelections;
  }

  return defaults;
}

export function InsSeriesEditor({ series, adapter }: InsSeriesEditorProps) {
  if (adapter) {
    return <InsSeriesEditorInternal adapter={adapter} />;
  }

  if (!series) {
    return null;
  }

  return <InsSeriesEditorWithChartStore series={series} />;
}

function InsSeriesEditorWithChartStore({ series }: { series: InsSeriesConfiguration }) {
  const { updateSeries } = useChartStore();
  const adapter = useMemo<InsSeriesEditorAdapter>(
    () => ({
      territorySelectionMode: 'source',
      series,
      applyPatch: (patch) => {
        updateSeries(series.id, {
          ...patch,
          updatedAt: new Date().toISOString(),
        });
      },
    }),
    [series, updateSeries]
  );

  return <InsSeriesEditorInternal adapter={adapter} />;
}

function InsSeriesEditorInternal({ adapter }: { adapter: InsSeriesEditorAdapter }) {
  const series = adapter.series;
  const territorySelectionMode = adapter.territorySelectionMode ?? 'canonical';
  const hasSavedTerritoryFilters = Boolean(series?.territoryCodes?.length || series?.sirutaCodes?.length);
  const useSourceTerritories = territorySelectionMode === 'source' && !hasSavedTerritoryFilters;

  const locale: InsLocale = getUserLocale() === 'en' ? 'en' : 'ro';
  const latestDatasetRequestIdRef = useRef(0);
  const latestSeriesRef = useRef(series);
  const latestDimensionRequestNonceRef = useRef(0);
  const latestDimensionRequestByKeyRef = useRef<Map<string, number>>(new Map());

  const [classificationLabelsByTypeCode, setClassificationLabelsByTypeCode] =
    useState<Record<string, Record<string, string>>>({});
  const [unitLabelsByCode, setUnitLabelsByCode] = useState<Record<string, string>>({});
  const [territoryLabelsByCode, setTerritoryLabelsByCode] = useState<Record<string, string>>({});
  const [sirutaLabelsByCode, setSirutaLabelsByCode] = useState<Record<string, string>>({});
  const allowedTerritoryLevels = useMemo(
    () => normalizeAllowedTerritoryLevels(adapter.allowedTerritoryLevels),
    [adapter.allowedTerritoryLevels]
  );
  const autoSelectTerritoryDefaults = adapter.autoSelectTerritoryDefaults ?? true;
  const autoReapplyTerritoryOnEmpty = adapter.autoReapplyTerritoryOnEmpty ?? true;

  useEffect(() => {
    setClassificationLabelsByTypeCode({});
    setUnitLabelsByCode({});
    setTerritoryLabelsByCode({});
    setSirutaLabelsByCode({});
    latestDimensionRequestByKeyRef.current.clear();
  }, [series?.datasetCode]);

  useEffect(() => {
    latestSeriesRef.current = series;
  }, [series]);

  const metadataDatasetCode = normalizeInsDatasetCode(series?.datasetCode ?? '');
  const datasetDetailQuery = useQuery({
    queryKey: ['ins-series-dataset', 'native-v1', metadataDatasetCode],
    queryFn: ({ signal }) => getInsDatasetDetails(metadataDatasetCode, signal),
    enabled: metadataDatasetCode.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  const dataset = datasetDetailQuery.data;
  const allowedPeriodTypes = useMemo(
    () =>
      mapDatasetPeriodicitiesToAllowedTypes(dataset?.periodicity ?? []),
    [dataset?.periodicity]
  );
  const datasetYearRange = useMemo(() => {
    const yearRange = dataset?.year_range;
    if (!yearRange || yearRange.length < 2) return undefined;
    const start = Math.min(yearRange[0] ?? 0, yearRange[1] ?? 0);
    const end = Math.max(yearRange[0] ?? 0, yearRange[1] ?? 0);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return undefined;
    return { start, end };
  }, [dataset?.year_range]);

  const nonTemporalDimensions = useMemo(
    () => (dataset?.dimensions ?? []).filter((dimension) => dimension.type !== 'TEMPORAL'),
    [dataset?.dimensions]
  );
  const firstTerritorialDimensionIndex = useMemo(
    () => nonTemporalDimensions.find((dimension) => dimension.type === 'TERRITORIAL')?.index,
    [nonTemporalDimensions]
  );

  const update = useCallback((patch: Partial<InsSeriesConfiguration>) => {
    adapter.applyPatch(patch);
  }, [adapter]);

  useEffect(() => {
    if (!dataset || adapter.mapPeriodSelection) return;

    const clampedPeriod = clampPeriodToDatasetConstraints(
      series?.period as ReportPeriodInput | undefined,
      allowedPeriodTypes,
      datasetYearRange
    );

    if (areReportPeriodsEqual(series?.period as ReportPeriodInput | undefined, clampedPeriod)) {
      return;
    }

    if (clampedPeriod) {
      update({ period: clampedPeriod });
      return;
    }

    const defaultPeriod = buildDefaultInsPeriod(dataset, allowedPeriodTypes[0] as ReportPeriodType | undefined);
    update({ period: defaultPeriod });
  }, [adapter.mapPeriodSelection, allowedPeriodTypes, dataset, datasetYearRange, series?.period, update])

  const beginDimensionRequest = (
    datasetCode: string,
    dimensionIndex: number,
    optionKind: InsDimensionOptionKind,
    classificationTypeCode?: string
  ): { requestKey: string; requestId: number } => {
    const requestKey = [
      datasetCode,
      String(dimensionIndex),
      optionKind,
      classificationTypeCode ?? '',
    ].join(':');
    latestDimensionRequestNonceRef.current += 1;
    const requestId = latestDimensionRequestNonceRef.current;
    latestDimensionRequestByKeyRef.current.set(requestKey, requestId);
    return { requestKey, requestId };
  };

  const isDimensionRequestCurrent = (requestKey: string, requestId: number): boolean => {
    return latestDimensionRequestByKeyRef.current.get(requestKey) === requestId;
  };

  const resolveDefaultDimensionOption = async ({
    datasetCode,
    dimensionIndex,
    optionKind,
    classificationTypeCode,
  }: {
    datasetCode: string;
    dimensionIndex: number;
    optionKind: InsDimensionOptionKind;
    classificationTypeCode?: string;
  }): Promise<OptionItem | null> => {
    const response = await getInsDimensionValuesPage({
      datasetCode,
      dimensionIndex,
      limit: 200,
      offset: 0,
    });

    const filteredValues = filterDimensionValuesByAllowedTerritoryLevels(
      response.nodes ?? [],
      optionKind,
      allowedTerritoryLevels
    );
    const defaultValue = pickDefaultDimensionValue(filteredValues);
    if (!defaultValue) return null;
    return mapInsDimensionValueToOption(defaultValue, optionKind, classificationTypeCode, locale);
  };

  const handleDatasetSelect = async (datasetCode: string, optionLabel: string) => {
    const requestId = latestDatasetRequestIdRef.current + 1;
    latestDatasetRequestIdRef.current = requestId;

    update({
      datasetCode,
      label: toDatasetSeriesLabel(datasetCode, optionLabel),
      period: undefined,
      intervalOperation: undefined,
      periodicity: undefined,
      unitCodes: undefined,
      territoryCodes: undefined,
      sirutaCodes: undefined,
      classificationSelections: undefined,
    });

    const details = await getInsDatasetDetails(datasetCode);
    if (latestDatasetRequestIdRef.current !== requestId || !details) return;

    const defaults = await buildDatasetDefaultPatch(details, {
      territorySelectionMode,
      allowedTerritoryLevels,
      autoSelectTerritoryDefaults,
      autoReapplyTerritoryOnEmpty,
    });
    if (latestDatasetRequestIdRef.current !== requestId) return;

    update({
      label: getDatasetDisplayName(details, locale),
      ...defaults,
      ...(adapter.mapPeriodSelection ? { period: undefined, intervalOperation: undefined, periodicity: undefined } : {}),
    });
  };

  const clearDatasetSelection = () => {
    latestDatasetRequestIdRef.current += 1;
    update({
      datasetCode: undefined,
      period: undefined,
      intervalOperation: undefined,
      periodicity: undefined,
      unitCodes: undefined,
      territoryCodes: undefined,
      sirutaCodes: undefined,
      classificationSelections: undefined,
    });
  };

  const selectedDatasetOptions: OptionItem[] = useMemo(() => {
    if (!series?.datasetCode) return [];

    const datasetLabel = dataset
      ? `${dataset.code} - ${getDatasetDisplayName(dataset, locale)}`
      : `${series.datasetCode} - ${series.label || series.datasetCode}`;

    return [{ id: series.datasetCode, label: datasetLabel }];
  }, [dataset, locale, series?.datasetCode, series?.label]);
  const selectedDatasetSourceUrl = useMemo(() => {
    if (!series?.datasetCode) return null;
    return buildInsTempoDatasetUrl(series.datasetCode, locale);
  }, [locale, series?.datasetCode]);
  const selectedPeriodOptions: OptionItem[] = useMemo(() => {
    return getPeriodTags(series?.period as ReportPeriodInput | undefined).map((tag) => ({
      id: String(tag.value),
      label: String(tag.value),
    }));
  }, [series?.period]);

  if (!series) {
    return null;
  }

  const clearPeriodSelection = () => {
    update({ period: undefined, ...(adapter.mapPeriodSelection ? { intervalOperation: undefined } : {}) });
  };

  const removeSinglePeriodOption = (option: OptionItem) => {
    const currentPeriod = series.period as ReportPeriodInput | undefined;
    if (!currentPeriod) return;

    if (currentPeriod.selection.dates) {
      const dateToRemove = String(option.id);
      const nextDates = currentPeriod.selection.dates.filter((date) => date !== dateToRemove);
      if (nextDates.length === 0) {
        clearPeriodSelection();
        return;
      }
      update({
        period: {
          ...currentPeriod,
          selection: { dates: nextDates },
        },
      });
      return;
    }

    clearPeriodSelection();
  };

  return (
    <Card data-testid="ins-series-editor">
      <CardHeader>
        <CardTitle>
          <Trans>INS Dataset Configuration</Trans>
        </CardTitle>
        {selectedDatasetSourceUrl && (
          <p className="text-xs text-muted-foreground">
            <Trans>Data source:</Trans>{' '}
            <a
              href={selectedDatasetSourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-2 hover:underline"
            >
              <Trans>INS Tempo</Trans>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        <FilterContainer
          title={t`Dataset`}
          icon={<Database className="w-4 h-4" aria-hidden="true" />}
          selectedOptions={selectedDatasetOptions}
          onClearOption={clearDatasetSelection}
          onClearAll={clearDatasetSelection}
          defaultOpen={selectedDatasetOptions.length === 0}
        >
          <InsDatasetList
            selectedOptions={selectedDatasetOptions}
            datasetFilter={adapter.datasetFilter}
            toggleSelect={(option) => {
              const datasetCode = String(option.id);
              if (datasetCode === series.datasetCode) {
                return;
              }
              void handleDatasetSelect(datasetCode, option.label);
            }}
            pageSize={100}
          />
        </FilterContainer>
        <FilterContainer
          title={t`Period`}
          icon={<Calendar className="w-4 h-4" aria-hidden="true" />}
          selectedOptions={selectedPeriodOptions}
          onClearOption={removeSinglePeriodOption}
          onClearAll={clearPeriodSelection}
        >
          {adapter.mapPeriodSelection ? <InsMapPeriodEditor
            series={series}
            onChange={update}
            allowedPeriodTypes={allowedPeriodTypes}
            yearRange={datasetYearRange}
          /> : (
          <PeriodFilter
            value={series.period as ReportPeriodInput | undefined}
            onChange={(period) => update({ period })}
            allowedPeriodTypes={allowedPeriodTypes}
            yearRange={datasetYearRange}
          />
          )}
        </FilterContainer>

        {dataset && territorySelectionMode === 'source' && hasSavedTerritoryFilters && (
          <div className="space-y-2 text-sm text-muted-foreground">
            <p><Trans>This saved series uses territory filters. Reselect its dataset to choose original INS source dimensions.</Trans></p>
            <Button type="button" variant="outline" onClick={() => void handleDatasetSelect(dataset.code, dataset.name_ro || dataset.code)}>
              <Trans>Reselect dataset</Trans>
            </Button>
          </div>
        )}

        {dataset && (
          <div className="border-t pt-2">
            {nonTemporalDimensions.map((dimension) => {
              if (dimension.type === 'CLASSIFICATION' || (dimension.type === 'TERRITORIAL' && useSourceTerritories)) {
                const optionKind = dimension.type === 'TERRITORIAL' ? 'source-territory' : 'classification';
                const typeCode = dimension.classification_type?.code ?? `DIM_${dimension.index}`;
                const selectedCodes = series.classificationSelections?.[typeCode] ?? [];
                const selectedOptions = mapCodesToOptions(
                  selectedCodes,
                  classificationLabelsByTypeCode[typeCode] ?? {}
                );

                const setSelected: React.Dispatch<React.SetStateAction<OptionItem[]>> = (
                  action
                ) => {
                  const currentOptions = mapCodesToOptions(
                    selectedCodes,
                    classificationLabelsByTypeCode[typeCode] ?? {}
                  );
                  const nextOptions =
                    typeof action === 'function' ? action(currentOptions) : action;
                  const { requestKey, requestId } = beginDimensionRequest(
                    dataset.code,
                    dimension.index,
                    optionKind,
                    typeCode
                  );

                  const nextCodes = nextOptions.map((option) => String(option.id));

                  if (nextCodes.length === 0) {
                    void (async () => {
                      try {
                        const defaultOption = await resolveDefaultDimensionOption({
                          datasetCode: dataset.code,
                          dimensionIndex: dimension.index,
                          optionKind,
                          classificationTypeCode: typeCode,
                        });
                        if (!defaultOption) return;
                        if (!isDimensionRequestCurrent(requestKey, requestId)) return;

                        const defaultCode = String(defaultOption.id);
                        setClassificationLabelsByTypeCode((current) => ({
                          ...current,
                          [typeCode]: mergeLabels(current[typeCode] ?? {}, [defaultOption]),
                        }));

                        if (!latestSeriesRef.current) return;
                        const latestClassificationSelections =
                          latestSeriesRef.current.classificationSelections;
                        update({
                          classificationSelections: upsertSelectionRecord(
                            latestClassificationSelections,
                            typeCode,
                            [defaultCode]
                          ),
                        });
                      } catch {
                        // Keep previous selection if default resolution fails.
                      }
                    })();
                    return currentOptions;
                  }

                  setClassificationLabelsByTypeCode((current) => ({
                    ...current,
                    [typeCode]: mergeLabels(current[typeCode] ?? {}, nextOptions),
                  }));

                  update({
                    classificationSelections: upsertSelectionRecord(
                      series.classificationSelections,
                      typeCode,
                      nextCodes
                    ),
                  });

                  return nextOptions;
                };

                return (
                  <InsDimensionFilterList
                    key={`ins-dim-classification-${dimension.index}`}
                    title={getDimensionLabel(dimension, typeCode, locale)}
                    icon={dimension.type === 'TERRITORIAL' ? <MapPin className="w-4 h-4" aria-hidden="true" /> : <Tags className="w-4 h-4" aria-hidden="true" />}
                    selected={selectedOptions}
                    setSelected={setSelected}
                    datasetCode={dataset.code}
                    dimensionIndex={dimension.index}
                    optionKind={optionKind}
                    classificationTypeCode={typeCode}
                    allowedTerritoryLevels={dimension.type === 'TERRITORIAL' ? allowedTerritoryLevels : undefined}
                  />
                );
              }

              if (dimension.type === 'UNIT_OF_MEASURE') {
                const selectedCodes = series.unitCodes ?? [];
                const selectedOptions = mapCodesToOptions(selectedCodes, unitLabelsByCode);

                const setSelected: React.Dispatch<React.SetStateAction<OptionItem[]>> = (
                  action
                ) => {
                  const currentOptions = mapCodesToOptions(selectedCodes, unitLabelsByCode);
                  const nextOptions =
                    typeof action === 'function' ? action(currentOptions) : action;
                  const { requestKey, requestId } = beginDimensionRequest(
                    dataset.code,
                    dimension.index,
                    'unit'
                  );

                  const nextCodes = nextOptions.map((option) => String(option.id));

                  if (nextCodes.length === 0) {
                    void (async () => {
                      try {
                        const defaultOption = await resolveDefaultDimensionOption({
                          datasetCode: dataset.code,
                          dimensionIndex: dimension.index,
                          optionKind: 'unit',
                        });
                        if (!defaultOption) return;
                        if (!isDimensionRequestCurrent(requestKey, requestId)) return;

                        const defaultCode = String(defaultOption.id);
                        setUnitLabelsByCode((current) => mergeLabels(current, [defaultOption]));
                        update({
                          unitCodes: [defaultCode],
                        });
                      } catch {
                        // Keep previous selection if default resolution fails.
                      }
                    })();
                    return currentOptions;
                  }

                  setUnitLabelsByCode((current) => mergeLabels(current, nextOptions));
                  update({
                    unitCodes: nextCodes,
                  });

                  return nextOptions;
                };

                return (
                  <InsDimensionFilterList
                    key={`ins-dim-unit-${dimension.index}`}
                    title={getDimensionLabel(dimension, t`Unit`, locale)}
                    icon={<Ruler className="w-4 h-4" aria-hidden="true" />}
                    selected={selectedOptions}
                    setSelected={setSelected}
                    datasetCode={dataset.code}
                    dimensionIndex={dimension.index}
                    optionKind="unit"
                  />
                );
              }

              if (dimension.type === 'TERRITORIAL') {
                const primaryTerritorialIndex =
                  firstTerritorialDimensionIndex ?? dimension.index;
                const isPrimaryTerritoryDimension =
                  dimension.index === primaryTerritorialIndex;

                const selectedCodes = isPrimaryTerritoryDimension
                  ? (series.territoryCodes ?? [])
                  : (series.sirutaCodes ?? []);
                const selectedOptions = mapCodesToOptions(
                  selectedCodes,
                  isPrimaryTerritoryDimension ? territoryLabelsByCode : sirutaLabelsByCode
                );

                const setSelected: React.Dispatch<React.SetStateAction<OptionItem[]>> = (
                  action
                ) => {
                  const currentOptions = mapCodesToOptions(
                    selectedCodes,
                    isPrimaryTerritoryDimension ? territoryLabelsByCode : sirutaLabelsByCode
                  );
                  const nextOptions =
                    typeof action === 'function' ? action(currentOptions) : action;
                  const optionKind: InsDimensionOptionKind = isPrimaryTerritoryDimension
                    ? 'territory'
                    : 'siruta';
                  const { requestKey, requestId } = beginDimensionRequest(
                    dataset.code,
                    dimension.index,
                    optionKind
                  );

                  const nextCodes = nextOptions.map((option) => String(option.id));

                  if (nextCodes.length === 0) {
                    void (async () => {
                      try {
                        const defaultOption = await resolveDefaultDimensionOption({
                          datasetCode: dataset.code,
                          dimensionIndex: dimension.index,
                          optionKind,
                        });
                        if (!defaultOption) return;
                        if (!isDimensionRequestCurrent(requestKey, requestId)) return;

                        const defaultCode = String(defaultOption.id);
                        if (isPrimaryTerritoryDimension) {
                          setTerritoryLabelsByCode((current) => mergeLabels(current, [defaultOption]));
                          update({
                            territoryCodes: [defaultCode],
                          });
                        } else {
                          setSirutaLabelsByCode((current) => mergeLabels(current, [defaultOption]));
                          update({
                            sirutaCodes: [defaultCode],
                          });
                        }
                      } catch {
                        // Keep previous selection if default resolution fails.
                      }
                    })();
                    return currentOptions;
                  }

                  if (isPrimaryTerritoryDimension) {
                    setTerritoryLabelsByCode((current) => mergeLabels(current, nextOptions));
                    update({
                      territoryCodes: nextCodes,
                    });
                  } else {
                    setSirutaLabelsByCode((current) => mergeLabels(current, nextOptions));
                    update({
                      sirutaCodes: nextCodes,
                    });
                  }

                  return nextOptions;
                };

                return (
                  <InsDimensionFilterList
                    key={`ins-dim-territorial-${dimension.index}`}
                    title={getDimensionLabel(dimension, t`Territory`, locale)}
                    icon={<MapPin className="w-4 h-4" aria-hidden="true" />}
                    selected={selectedOptions}
                    setSelected={setSelected}
                    datasetCode={dataset.code}
                    dimensionIndex={dimension.index}
                    optionKind={isPrimaryTerritoryDimension ? 'territory' : 'siruta'}
                    allowedTerritoryLevels={allowedTerritoryLevels}
                  />
                );
              }

              return null;
            })}
          </div>
        )}

        {datasetDetailQuery.isLoading && (
          <p className="text-sm text-muted-foreground">
            <Trans>Loading dataset dimensions...</Trans>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
