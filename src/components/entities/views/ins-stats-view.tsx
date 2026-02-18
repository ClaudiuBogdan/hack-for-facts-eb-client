import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import Info from 'lucide-react/dist/esm/icons/info';

import type { EntityDetailsData } from '@/lib/api/entities';
import type { ReportPeriodInput } from '@/schemas/reporting';
import type {
  InsDataset,
  InsEntitySelectorInput,
  InsObservation,
} from '@/schemas/ins';
import { getUserLocale } from '@/lib/utils';
import {
  INS_DERIVED_INDICATOR_BASE_CODES,
  INS_PRIORITIZED_DATASET_CODES_BY_LEVEL,
  INS_ROOT_CONTEXTS,
  INS_TOP_METRICS_BY_LEVEL,
  type InsMetricLevel,
} from '@/lib/ins/ins-metric-registry';
import {
  useInsContexts,
  useInsDatasetCatalog,
  useInsDatasetDimensions,
  useInsDatasetHistory,
  useInsObservationsSnapshotByDatasets,
} from '@/lib/hooks/use-ins-dashboard';
import {
  buildDefaultSeriesSelection,
  buildSeriesGroups,
  buildStableSeries,
  buildUnitOptions,
  filterObservationsBySeriesSelection,
  getDefaultUnitSelection,
  mergeSeriesSelection,
  mergeUnitSelection,
  type InsSeriesGroup,
} from '@/lib/ins/series-selection';
import {
  areStringArraysEqual,
  buildObservationSeriesTupleSignature,
  buildSeriesSelectionFromObservation,
  findMetadataText,
  formatDatasetPeriodicity,
  formatPeriodLabel,
  getContextPathSegments,
  getLocalizedText,
  getObservationStatusLabel,
  getSearchScore,
  normalizeMarkdownText,
  normalizeRootLabel,
  normalizeSearchValue,
  parseObservationValue,
  toPlainTextLabel,
} from './ins-stats-view.formatters';
import {
  buildHistoryFilter,
  buildIndicatorFallbackFilter,
  buildIndicatorPeriodFilter,
  getReportPeriodAnchor,
  mapPeriodicityToTemporalSplit,
  mapTemporalSplitToHistoryPeriod,
  mapTemporalSplitToPeriodicity,
  TEMPORAL_SPLIT_OPTIONS,
} from './ins-stats-view.filters';
import {
  computeDerivedIndicators,
  getDerivedIndicatorGroup,
} from './ins-stats-view.derived';
import type {
  DatasetExplorerSection as DatasetExplorerSectionModel,
  DatasetExplorerGroup,
  DerivedIndicator,
  DerivedIndicatorGroup,
  InsUrlState,
  PreparedDatasetSearchEntry,
  TemporalSplit,
} from './ins-stats-view.types';
import {
  extractRawSeriesCode,
  normalizeSeriesSelectionForUrl,
  parseInsUrlState,
  serializeSeriesSelection,
  writeInsUrlState,
} from './ins-stats-view.url-state';
import {
  DatasetDetailSection,
  DatasetExplorerSection,
  DerivedIndicatorsSection,
  SummaryMetricsSection,
} from './ins-stats-view.presentation';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { buildInsStatsChartLink } from '@/lib/chart-links';

function pickDefaultIndicatorObservation(observations: InsObservation[]): InsObservation | null {
  if (observations.length === 0) return null;

  const seriesGroups = buildSeriesGroups(observations, []);
  const defaultSeriesSelection = buildDefaultSeriesSelection(seriesGroups);
  const unitOptions = buildUnitOptions(observations);
  const defaultUnitSelection = getDefaultUnitSelection(unitOptions);

  const strictMatches = filterObservationsBySeriesSelection(
    observations,
    defaultSeriesSelection,
    defaultUnitSelection
  );
  if (strictMatches.length > 0) {
    return buildStableSeries(strictMatches)[0] ?? strictMatches[0] ?? null;
  }

  const selectionOnlyMatches = filterObservationsBySeriesSelection(observations, defaultSeriesSelection, null);
  if (selectionOnlyMatches.length > 0) {
    return buildStableSeries(selectionOnlyMatches)[0] ?? selectionOnlyMatches[0] ?? null;
  }

  if (defaultUnitSelection) {
    const unitOnlyMatches = filterObservationsBySeriesSelection(observations, {}, defaultUnitSelection);
    if (unitOnlyMatches.length > 0) {
      return buildStableSeries(unitOnlyMatches)[0] ?? unitOnlyMatches[0] ?? null;
    }
  }

  return buildStableSeries(observations)[0] ?? observations[0] ?? null;
}

const ANNUAL_ONLY_TOP_METRIC_CODES = new Set(['SOM101F', 'SOM103A']);

function pickIndicatorObservationWithPeriodPolicy(params: {
  observations: InsObservation[];
  annualOnly?: boolean;
  excludeMonthly?: boolean;
}): InsObservation | null {
  let scoped = params.observations;

  if (params.annualOnly) {
    scoped = scoped.filter((observation) => observation.time_period.periodicity === 'ANNUAL');
  } else if (params.excludeMonthly) {
    scoped = scoped.filter((observation) => observation.time_period.periodicity !== 'MONTHLY');
  }

  return pickDefaultIndicatorObservation(scoped);
}

const DETAIL_SCROLL_OFFSET_MOBILE_PX = 112;
const DETAIL_SCROLL_OFFSET_DESKTOP_PX = 168;
const INS_TEMPO_BASE_URL = 'http://statistici.insse.ro/tempoins/index.jsp';
const INS_TERMS_URL = 'http://insse.ro/cms/ro';

function buildInsTempoDatasetUrl(datasetCode: string, locale: 'ro' | 'en'): string {
  const params = new URLSearchParams({
    ind: datasetCode,
    lang: locale === 'en' ? 'en' : 'ro',
    page: 'tempo3',
  });
  return `${INS_TEMPO_BASE_URL}?${params.toString()}`;
}

export function InsStatsView({
  entity,
  reportPeriod,
}: {
  entity: EntityDetailsData | null | undefined;
  reportPeriod: ReportPeriodInput;
}) {
  const initialUrlState = useMemo<InsUrlState>(() => {
    if (typeof window === 'undefined') {
      return {
        datasetCode: null,
        search: '',
        rootCode: '',
        temporalSplit: 'all',
        explorerMode: 'panel',
        seriesSelection: {},
        unitKey: null,
      };
    }

    return parseInsUrlState(new URLSearchParams(window.location.search));
  }, []);

  const [searchTerm, setSearchTerm] = useState(initialUrlState.search);
  const [selectedRootContextCode, setSelectedRootContextCode] = useState<string>(initialUrlState.rootCode);
  const [selectedDatasetCode, setSelectedDatasetCode] = useState<string | null>(initialUrlState.datasetCode);
  const [temporalSplit, setTemporalSplit] = useState<TemporalSplit>(initialUrlState.temporalSplit);
  const [openRootGroups, setOpenRootGroups] = useState<string[]>([]);
  const [pendingExplorerFocusCode, setPendingExplorerFocusCode] = useState<string | null>(null);
  const [showAllRows, setShowAllRows] = useState(false);
  const [isDatasetMetaExpanded, setIsDatasetMetaExpanded] = useState(false);
  const [isExplorerFullWidth, setIsExplorerFullWidth] = useState(initialUrlState.explorerMode === 'full');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(initialUrlState.search);
  const [selectedSeriesClassifications, setSelectedSeriesClassifications] = useState<Record<string, string[]>>(
    initialUrlState.seriesSelection
  );
  const [selectedUnitKey, setSelectedUnitKey] = useState<string | null>(initialUrlState.unitKey);
  const [seriesSelectorSearchByTypeCode, setSeriesSelectorSearchByTypeCode] = useState<Record<string, string>>({});
  const lastSerializedInsUrlStateRef = useRef<string>('');
  const hasProcessedInitialDatasetSelectionRef = useRef(false);
  const hasAppliedInitialSeriesUrlStateRef = useRef(false);
  const initialSeriesUrlStateRef = useRef({
    datasetCode: initialUrlState.datasetCode,
    seriesSelection: initialUrlState.seriesSelection,
    unitKey: initialUrlState.unitKey,
  });
  const detailCardRef = useRef<HTMLDivElement | null>(null);
  const rootGroupRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const datasetItemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const locale = getUserLocale() === 'en' ? 'en' : 'ro';
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const normalizedDeferredSearchTerm = useMemo(
    () => normalizeSearchValue(deferredSearchTerm),
    [deferredSearchTerm]
  );

  const entityType = entity?.entity_type ?? '';
  const isCounty = entityType === 'admin_county_council';
  const metricLevel: InsMetricLevel = isCounty ? 'county' : 'uat';

  const sirutaCode = entity?.uat?.siruta_code != null ? String(entity.uat.siruta_code) : '';
  const countyCode = entity?.uat?.county_code?.trim().toUpperCase() ?? '';

  const entitySelector = useMemo<InsEntitySelectorInput | null>(() => {
    if (isCounty) {
      if (countyCode === '') return null;
      return {
        territoryCode: countyCode,
        territoryLevel: 'NUTS3',
      };
    }

    if (sirutaCode === '') return null;
    return { sirutaCode };
  }, [countyCode, isCounty, sirutaCode]);

  const hasEntitySelector = entitySelector !== null;
  const selectedHistoryFilter = useMemo(
    () => {
      const base = buildHistoryFilter({ isCounty, countyCode, sirutaCode });
      const period = mapTemporalSplitToHistoryPeriod(temporalSplit);
      if (!period) {
        return base;
      }

      return {
        ...base,
        period,
      };
    },
    [countyCode, isCounty, sirutaCode, temporalSplit]
  );

  const topMetrics = INS_TOP_METRICS_BY_LEVEL[metricLevel];
  const topMetricCodes = useMemo(() => topMetrics.map((metric) => metric.code), [topMetrics]);
  const derivedIndicatorCodes = useMemo(() => Array.from(INS_DERIVED_INDICATOR_BASE_CODES), []);
  const combinedIndicatorCodes = useMemo(() => {
    return Array.from(new Set([...topMetricCodes, ...derivedIndicatorCodes]));
  }, [derivedIndicatorCodes, topMetricCodes]);
  const prioritizedCodes = INS_PRIORITIZED_DATASET_CODES_BY_LEVEL[metricLevel];

  const contextsQuery = useInsContexts({
    limit: 500,
    enabled: hasEntitySelector,
  });

  const datasetCatalogQuery = useInsDatasetCatalog({
    filter: isCounty
      ? {
          hasCountyData: true,
        }
      : {
          hasUatData: true,
        },
    limit: 500,
    enabled: hasEntitySelector,
  });

  const indicatorPeriodFilter = useMemo(
    () =>
      buildIndicatorPeriodFilter({
        reportPeriod,
        isCounty,
        countyCode,
        sirutaCode,
      }),
    [countyCode, isCounty, reportPeriod, sirutaCode]
  );

  const indicatorFallbackFilter = useMemo(
    () =>
      buildIndicatorFallbackFilter({
        reportPeriod,
        isCounty,
        countyCode,
        sirutaCode,
      }),
    [countyCode, isCounty, reportPeriod, sirutaCode]
  );

  const selectedIndicatorsSnapshotQuery = useInsObservationsSnapshotByDatasets({
    datasetCodes: combinedIndicatorCodes,
    filter: indicatorPeriodFilter,
    enabled: hasEntitySelector,
    limit: 200,
  });

  const missingIndicatorCodesForFallback = useMemo(() => {
    const selectedObservationsByDataset = selectedIndicatorsSnapshotQuery.data?.observationsByDataset;
    if (!selectedObservationsByDataset) return [];

    return combinedIndicatorCodes.filter((datasetCode) => {
      const observations = selectedObservationsByDataset.get(datasetCode);
      return !observations || observations.length === 0;
    });
  }, [combinedIndicatorCodes, selectedIndicatorsSnapshotQuery.data?.observationsByDataset]);

  const fallbackIndicatorsSnapshotQuery = useInsObservationsSnapshotByDatasets({
    datasetCodes: missingIndicatorCodesForFallback,
    filter: indicatorFallbackFilter,
    enabled:
      hasEntitySelector &&
      selectedIndicatorsSnapshotQuery.isSuccess &&
      missingIndicatorCodesForFallback.length > 0,
    limit: 200,
  });

  const datasetHistoryQuery = useInsDatasetHistory({
    datasetCode: selectedDatasetCode ?? '',
    filter: selectedHistoryFilter,
    enabled: hasEntitySelector && selectedDatasetCode !== null,
    pageSize: 1000,
    maxPages: 30,
  });

  const datasetDimensionsQuery = useInsDatasetDimensions({
    datasetCode: selectedDatasetCode ?? '',
    enabled: hasEntitySelector && selectedDatasetCode !== null,
  });

  useEffect(() => {
    if (!hasProcessedInitialDatasetSelectionRef.current) {
      hasProcessedInitialDatasetSelectionRef.current = true;
      return;
    }

    setShowAllRows(false);
    setIsDatasetMetaExpanded(false);
    setSelectedSeriesClassifications({});
    setSelectedUnitKey(null);
    setSeriesSelectorSearchByTypeCode({});
  }, [selectedDatasetCode]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 200);
    return () => window.clearTimeout(timerId);
  }, [searchTerm]);

  const contextNodes = contextsQuery.data?.nodes ?? [];
  const contextByCode = useMemo(() => {
    return new Map(contextNodes.map((context) => [context.code, context]));
  }, [contextNodes]);

  const rootContexts = useMemo(() => {
    const rootNodes = contextNodes.filter((context) => context.level === 0);
    if (rootNodes.length === 0) {
      return INS_ROOT_CONTEXTS.map((root) => ({
        ...root,
        displayLabel: root.label,
      }));
    }

    const rootByCode = new Map(rootNodes.map((node) => [node.code, node]));
    return INS_ROOT_CONTEXTS.map((root) => {
      const node = rootByCode.get(root.code);
      const rawLabel = getLocalizedText(node?.name_ro, node?.name_en, locale) || root.label;
      return {
        ...root,
        displayLabel: toPlainTextLabel(rawLabel),
      };
    });
  }, [contextNodes, locale]);

  const catalogDatasets = datasetCatalogQuery.data?.nodes ?? [];
  const prioritizedIndex = useMemo(() => {
    return new Map(prioritizedCodes.map((code, index) => [code, index]));
  }, [prioritizedCodes]);
  const preparedDatasetSearchEntries = useMemo<PreparedDatasetSearchEntry[]>(() => {
    return catalogDatasets.map((dataset) => {
      const fallbackPath = dataset.context_code ? contextByCode.get(dataset.context_code)?.path : undefined;
      const contextPathCodes = getContextPathSegments(dataset.context_path || fallbackPath).slice(1);
      const contextLabels = contextPathCodes
        .map((code) => {
          const contextNode = contextByCode.get(code);
          return getLocalizedText(contextNode?.name_ro, contextNode?.name_en, locale);
        })
        .filter(Boolean)
        .join(' ');
      const datasetName = getLocalizedText(dataset.name_ro, dataset.name_en, locale) || dataset.code;
      const contextName = getLocalizedText(dataset.context_name_ro, dataset.context_name_en, locale);

      return {
        dataset,
        datasetName,
        normalizedName: normalizeSearchValue(datasetName),
        normalizedContext: normalizeSearchValue(contextName),
        normalizedCode: normalizeSearchValue(dataset.code),
        normalizedSupplemental: normalizeSearchValue(contextLabels),
      };
    });
  }, [catalogDatasets, contextByCode, locale]);

  const filteredDatasets = useMemo(() => {
    const hasActiveSearch = normalizedDeferredSearchTerm !== '';

    return preparedDatasetSearchEntries
      .map((entry) => {
        const searchScore = getSearchScore({
          normalizedQuery: normalizedDeferredSearchTerm,
          normalizedCode: entry.normalizedCode,
          normalizedName: entry.normalizedName,
          normalizedContext: entry.normalizedContext,
          normalizedSupplemental: entry.normalizedSupplemental,
        });
        return {
          dataset: entry.dataset,
          datasetName: entry.datasetName,
          searchScore,
        };
      })
      .filter((entry) => entry.searchScore >= 0)
      .sort((left, right) => {
        if (left.searchScore !== right.searchScore) {
          return right.searchScore - left.searchScore;
        }

        const leftPin = prioritizedIndex.get(left.dataset.code);
        const rightPin = prioritizedIndex.get(right.dataset.code);
        if (!hasActiveSearch) {
          if (leftPin != null && rightPin != null && leftPin !== rightPin) {
            return leftPin - rightPin;
          }
          if (leftPin != null && rightPin == null) return -1;
          if (leftPin == null && rightPin != null) return 1;
        }

        return left.datasetName.localeCompare(right.datasetName, 'ro');
      })
      .map((entry) => entry.dataset);
  }, [normalizedDeferredSearchTerm, preparedDatasetSearchEntries, prioritizedIndex]);

  const groupedDatasets = useMemo<DatasetExplorerGroup[]>(() => {
    const rootOrder = new Map(rootContexts.map((root, index) => [root.code, index]));
    const rootMetaByCode = new Map(rootContexts.map((root) => [root.code, root]));

    type MutableGroup = {
      code: string;
      shortLabel: string;
      label: string;
      sectionMap: Map<string, DatasetExplorerSectionModel>;
      unsectionedDatasets: InsDataset[];
    };

    const groups = new Map<string, MutableGroup>();

    const ensureGroup = (rootCode: string): MutableGroup => {
      const existing = groups.get(rootCode);
      if (existing) return existing;

      const contextNode = contextByCode.get(rootCode);
      const rootMeta = rootMetaByCode.get(rootCode);
      const rawGroupLabel = getLocalizedText(contextNode?.name_ro, contextNode?.name_en, locale) || rootMeta?.label || t`Other`;
      const next: MutableGroup = {
        code: rootCode,
        shortLabel: rootMeta?.shortLabel ?? rootCode.toUpperCase(),
        label: toPlainTextLabel(rawGroupLabel),
        sectionMap: new Map(),
        unsectionedDatasets: [],
      };
      groups.set(rootCode, next);
      return next;
    };

    for (const dataset of filteredDatasets) {
      const fallbackPath = dataset.context_code ? contextByCode.get(dataset.context_code)?.path : undefined;
      const pathSegments = getContextPathSegments(dataset.context_path || fallbackPath);
      const rootCode = pathSegments[1] || selectedRootContextCode || 'other';
      const sectionCode = pathSegments[2] || '';

      const group = ensureGroup(rootCode);
      if (sectionCode === '') {
        group.unsectionedDatasets.push(dataset);
        continue;
      }

      const sectionNode = contextByCode.get(sectionCode);
      const existingSection = group.sectionMap.get(sectionCode);
      if (existingSection) {
        existingSection.datasets.push(dataset);
        continue;
      }

      group.sectionMap.set(sectionCode, {
        code: sectionCode,
        label: toPlainTextLabel(
          getLocalizedText(sectionNode?.name_ro, sectionNode?.name_en, locale) ||
            getLocalizedText(dataset.context_name_ro, dataset.context_name_en, locale) ||
            t`Other`
        ),
        datasets: [dataset],
      });
    }

    return Array.from(groups.values())
      .map((group) => ({
        code: group.code,
        shortLabel: group.shortLabel,
        label: group.label,
        totalCount:
          group.unsectionedDatasets.length +
          Array.from(group.sectionMap.values()).reduce((total, section) => total + section.datasets.length, 0),
        sections: Array.from(group.sectionMap.values()).sort((left, right) => {
          const codeComparison = left.code.localeCompare(right.code, 'ro', { numeric: true });
          if (codeComparison !== 0) return codeComparison;
          return left.label.localeCompare(right.label, 'ro');
        }),
        unsectionedDatasets: group.unsectionedDatasets,
      }))
      .sort((left, right) => {
        const leftOrder = rootOrder.get(left.code) ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = rootOrder.get(right.code) ?? Number.MAX_SAFE_INTEGER;
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
        return left.label.localeCompare(right.label, 'ro');
      });
  }, [contextByCode, filteredDatasets, locale, rootContexts, selectedRootContextCode]);

  const firstDatasetCodeByContext = useMemo(() => {
    const map = new Map<string, string>();
    for (const dataset of filteredDatasets) {
      if (!dataset.context_code) continue;
      if (!map.has(dataset.context_code)) {
        map.set(dataset.context_code, dataset.code);
      }
    }
    return map;
  }, [filteredDatasets]);

  const hasSearchTerm = normalizedDeferredSearchTerm !== '';
  const groupedRootCodes = useMemo(() => groupedDatasets.map((group) => group.code), [groupedDatasets]);

  useEffect(() => {
    if (groupedRootCodes.length === 0) {
      setOpenRootGroups((current) => (current.length === 0 ? current : []));
      return;
    }

    setOpenRootGroups((current) => {
      let next: string[];
      if (hasSearchTerm) {
        next = groupedRootCodes;
      } else if (selectedRootContextCode !== '') {
        next = groupedRootCodes.includes(selectedRootContextCode) ? [selectedRootContextCode] : [groupedRootCodes[0]];
      } else {
        const preserved = current.filter((code) => groupedRootCodes.includes(code));
        next = preserved.length > 0 ? preserved : [groupedRootCodes[0]];
      }

      return areStringArraysEqual(current, next) ? current : next;
    });
  }, [groupedRootCodes, hasSearchTerm, selectedRootContextCode]);

  const catalogDatasetByCode = useMemo(() => {
    return new Map(catalogDatasets.map((dataset) => [dataset.code, dataset]));
  }, [catalogDatasets]);

  const selectedReportPeriodLabel = useMemo(() => {
    const anchor = getReportPeriodAnchor(reportPeriod);
    if (!anchor) return t`Unknown`;
    if (reportPeriod.type === 'QUARTER') {
      const match = anchor.match(/^(\d{4})-Q([1-4])$/);
      if (match) return `T${match[2]} ${match[1]}`;
    }
    if (reportPeriod.type === 'MONTH') {
      const match = anchor.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
      if (match) return `${match[1]}-${match[2]}`;
    }
    return anchor;
  }, [reportPeriod]);

  const topMetricRowsByCode = useMemo(() => {
    const result = new Map<
      string,
      {
        dataset: InsDataset | null;
        observation: InsObservation | null;
        periodLabel: string;
        selectedPeriodLabel: string;
        source: 'selected' | 'fallback' | 'none';
        hasData: boolean;
      }
    >();

    const selectedObservationsByDataset = selectedIndicatorsSnapshotQuery.data?.observationsByDataset;
    const fallbackObservationsByDataset = fallbackIndicatorsSnapshotQuery.data?.observationsByDataset;
    for (const code of topMetricCodes) {
      const selectedObservations = selectedObservationsByDataset?.get(code) ?? [];
      const fallbackObservations = fallbackObservationsByDataset?.get(code) ?? [];
      const annualOnly = ANNUAL_ONLY_TOP_METRIC_CODES.has(code);
      const selectedObservation = pickIndicatorObservationWithPeriodPolicy({
        observations: selectedObservations,
        annualOnly,
      });
      const fallbackObservation = pickIndicatorObservationWithPeriodPolicy({
        observations: fallbackObservations,
        annualOnly,
      });
      const representative = selectedObservation ?? fallbackObservation;
      const source: 'selected' | 'fallback' | 'none' = selectedObservation
        ? 'selected'
        : fallbackObservation
          ? 'fallback'
          : 'none';
      const periodLabel = representative ? formatPeriodLabel(representative.time_period) : t`Unknown`;
      result.set(code, {
        dataset: catalogDatasetByCode.get(code) ?? null,
        observation: representative,
        periodLabel,
        selectedPeriodLabel: selectedReportPeriodLabel,
        source,
        hasData: representative !== null,
      });
    }

    return result;
  }, [
    catalogDatasetByCode,
    fallbackIndicatorsSnapshotQuery.data?.observationsByDataset,
    selectedReportPeriodLabel,
    selectedIndicatorsSnapshotQuery.data?.observationsByDataset,
    topMetricCodes,
  ]);

  const defaultDatasetCode = useMemo(() => {
    for (const code of topMetricCodes) {
      const row = topMetricRowsByCode.get(code);
      if (row?.hasData) return code;
    }

    for (const code of topMetricCodes) {
      if (topMetricRowsByCode.has(code)) return code;
      if (catalogDatasets.some((dataset) => dataset.code === code)) return code;
    }

    if (catalogDatasets.length > 0) return catalogDatasets[0].code;
    if (filteredDatasets.length > 0) return filteredDatasets[0].code;
    return null;
  }, [catalogDatasets, filteredDatasets, topMetricCodes, topMetricRowsByCode]);

  useEffect(() => {
    if (selectedDatasetCode !== null) return;
    if (!defaultDatasetCode) return;
    setSelectedDatasetCode(defaultDatasetCode);
  }, [defaultDatasetCode, selectedDatasetCode]);

  const summaryCards = useMemo(() => {
    return topMetrics.map((metric) => {
      const row = topMetricRowsByCode.get(metric.code);
      return {
        code: metric.code,
        label: metric.label,
        row,
      };
    });
  }, [topMetricRowsByCode, topMetrics]);

  const selectedDatasetFromCurrentSources = useMemo(() => {
    if (selectedDatasetCode === null) return null;

    const fromCatalog = catalogDatasetByCode.get(selectedDatasetCode);
    if (fromCatalog) return fromCatalog;

    return null;
  }, [catalogDatasetByCode, selectedDatasetCode]);

  const selectedDatasetLookupQuery = useInsDatasetCatalog({
    filter: selectedDatasetCode ? { codes: [selectedDatasetCode] } : undefined,
    limit: 1,
    enabled:
      hasEntitySelector &&
      selectedDatasetCode !== null &&
      selectedDatasetFromCurrentSources === null &&
      datasetCatalogQuery.status === 'success',
  });

  const selectedDataset = useMemo(() => {
    if (selectedDatasetFromCurrentSources) return selectedDatasetFromCurrentSources;
    return selectedDatasetLookupQuery.data?.nodes?.[0] ?? null;
  }, [selectedDatasetFromCurrentSources, selectedDatasetLookupQuery.data?.nodes]);

  const selectedDatasetSourceUrl = useMemo(() => {
    if (!selectedDataset?.code) return null;
    return buildInsTempoDatasetUrl(selectedDataset.code, locale);
  }, [locale, selectedDataset]);

  const availableTemporalOptions = useMemo(() => {
    if (!selectedDataset) return [] as Array<{ value: Exclude<TemporalSplit, 'all'>; label: string }>;

    const availableSplits = new Set<Exclude<TemporalSplit, 'all'>>();
    for (const periodicity of selectedDataset.periodicity ?? []) {
      const split = mapPeriodicityToTemporalSplit(periodicity);
      if (split) availableSplits.add(split);
    }

    return TEMPORAL_SPLIT_OPTIONS.filter((option) => availableSplits.has(option.value));
  }, [selectedDataset]);

  useEffect(() => {
    if (!selectedDataset) return;
    if (availableTemporalOptions.length === 0) return;

    const isCurrentTemporalAvailable =
      temporalSplit !== 'all' && availableTemporalOptions.some((option) => option.value === temporalSplit);
    if (isCurrentTemporalAvailable) return;

    setTemporalSplit(availableTemporalOptions[0].value);
  }, [availableTemporalOptions, selectedDataset, temporalSplit]);

  useEffect(() => {
    if (selectedDatasetCode === null) return;
    if (selectedDatasetFromCurrentSources) return;
    if (selectedDatasetLookupQuery.isLoading) return;
    if (!selectedDatasetLookupQuery.data) return;
    if ((selectedDatasetLookupQuery.data.nodes ?? []).length === 0) {
      setSelectedDatasetCode(null);
    }
  }, [
    selectedDatasetCode,
    selectedDatasetFromCurrentSources,
    selectedDatasetLookupQuery.data,
    selectedDatasetLookupQuery.isLoading,
  ]);

  const selectedDatasetDetails = useMemo(() => {
    if (!selectedDataset) return null;

    const metadata =
      selectedDataset.metadata && typeof selectedDataset.metadata === 'object'
        ? (selectedDataset.metadata as Record<string, unknown>)
        : undefined;

    const definitionFromMetadata = findMetadataText(metadata, [
      'description',
      'descriere',
      'definition',
      'definitie',
      'definition_ro',
      'description_ro',
    ]);

    const methodology = findMetadataText(metadata, [
      'methodology',
      'methodology_ro',
      'metodologie',
      'metodologia',
      'method',
      'metoda',
    ]);

    const source = findMetadataText(metadata, ['source', 'sursa', 'provider', 'institutie', 'institution']);
    const notes = findMetadataText(metadata, ['notes', 'note', 'observatii', 'comments']);
    const selectedContext = contextByCode.get(selectedDataset.context_code ?? '');
    const localizedContextMarkdown = locale === 'en'
      ? selectedContext?.name_en_markdown || selectedContext?.name_ro_markdown
      : selectedContext?.name_ro_markdown || selectedContext?.name_en_markdown;
    const localizedContextLabel =
      getLocalizedText(selectedContext?.name_ro, selectedContext?.name_en, locale) ||
      getLocalizedText(selectedDataset.context_name_ro, selectedDataset.context_name_en, locale);

    const contextLabel = normalizeMarkdownText(
      localizedContextMarkdown || localizedContextLabel
    );

    const fallbackPath = selectedDataset.context_code ? contextByCode.get(selectedDataset.context_code)?.path : undefined;
    const contextCodes = getContextPathSegments(selectedDataset.context_path || fallbackPath).slice(1);
    const primaryRootCode = contextCodes[0] ?? '';
    const hierarchy: Array<{
      code: string;
      label: string;
      kind: 'home' | 'context' | 'dataset';
      rootCode: string;
    }> = [];
    const pushHierarchyItem = (params: {
      code: string;
      rawLabel: string | null | undefined;
      kind: 'home' | 'context' | 'dataset';
      rootCode: string;
    }) => {
      if (!params.rawLabel) return;
      const cleanLabel = toPlainTextLabel(params.rawLabel);
      if (cleanLabel === '') return;
      const previous = hierarchy[hierarchy.length - 1];
      if (previous && previous.code === params.code) return;
      hierarchy.push({
        code: params.code,
        label: cleanLabel,
        kind: params.kind,
        rootCode: params.rootCode,
      });
    };

    pushHierarchyItem({
      code: 'ins-tempo',
      rawLabel: t`INS Tempo`,
      kind: 'home',
      rootCode: '',
    });

    for (const code of contextCodes) {
      const contextNode = contextByCode.get(code);
      const nodePath = getContextPathSegments(contextNode?.path).slice(1);
      const nodeRootCode = nodePath[0] ?? primaryRootCode;
      pushHierarchyItem({
        code,
        rawLabel:
          (locale === 'en'
            ? contextNode?.name_en_markdown || contextNode?.name_ro_markdown
            : contextNode?.name_ro_markdown || contextNode?.name_en_markdown) ||
          getLocalizedText(contextNode?.name_ro, contextNode?.name_en, locale) ||
          code,
        kind: 'context',
        rootCode: nodeRootCode,
      });
    }

    if (selectedDataset.context_code && !contextCodes.includes(selectedDataset.context_code)) {
      const contextNode = contextByCode.get(selectedDataset.context_code);
      const contextPath = getContextPathSegments(contextNode?.path || selectedDataset.context_path).slice(1);
      pushHierarchyItem({
        code: selectedDataset.context_code,
        rawLabel: getLocalizedText(selectedDataset.context_name_ro, selectedDataset.context_name_en, locale),
        kind: 'context',
        rootCode: contextPath[0] ?? primaryRootCode,
      });
    }

    pushHierarchyItem({
      code: selectedDataset.code,
      rawLabel: selectedDataset.code,
      kind: 'dataset',
      rootCode: primaryRootCode,
    });

    const definition = normalizeMarkdownText(
      locale === 'en'
        ? selectedDataset.definition_en ?? selectedDataset.definition_ro ?? definitionFromMetadata
        : selectedDataset.definition_ro ?? selectedDataset.definition_en ?? definitionFromMetadata
    );
    const rootContextLabel =
      primaryRootCode !== ''
        ? rootContexts.find((root) => root.code === primaryRootCode)?.displayLabel ||
          getLocalizedText(contextByCode.get(primaryRootCode)?.name_ro, contextByCode.get(primaryRootCode)?.name_en, locale) ||
          null
        : null;
    const rootContextBreadcrumbLabel = rootContextLabel ? normalizeRootLabel(toPlainTextLabel(rootContextLabel)) : null;

    return {
      code: selectedDataset.code,
      title: getLocalizedText(selectedDataset.name_ro, selectedDataset.name_en, locale) || selectedDataset.code,
      hierarchy,
      rootContextCode: primaryRootCode,
      rootContextBreadcrumbLabel,
      contextLabel,
      periodicityLabel: formatDatasetPeriodicity(selectedDataset.periodicity),
      yearRange:
        selectedDataset.year_range && selectedDataset.year_range.length > 0
          ? `${Math.min(...selectedDataset.year_range)} - ${Math.max(...selectedDataset.year_range)}`
          : null,
      dimensionCount:
        selectedDataset.dimension_count != null && Number.isFinite(selectedDataset.dimension_count)
          ? String(selectedDataset.dimension_count)
          : null,
      definition,
      methodology: normalizeMarkdownText(methodology),
      source: normalizeMarkdownText(source),
      notes: normalizeMarkdownText(notes),
    };
  }, [contextByCode, locale, rootContexts, selectedDataset, selectedDatasetCode]);

  const selectedDatasetBreadcrumbItems = useMemo(() => {
    if (!selectedDatasetDetails) return [];
    return selectedDatasetDetails.hierarchy.filter((item) => item.kind !== 'dataset');
  }, [selectedDatasetDetails]);

  const hasDatasetMetadataPanel = selectedDatasetDetails !== null;
  const selectedTemporalPeriodicity = mapTemporalSplitToPeriodicity(temporalSplit)?.[0];
  const hasTemporalSelector = availableTemporalOptions.length > 1;
  const isTemporalSplitIncompatible =
    selectedDataset != null &&
    selectedTemporalPeriodicity != null &&
    !selectedDataset.periodicity.includes(selectedTemporalPeriodicity);

  const historyObservations = datasetHistoryQuery.data?.observations ?? [];
  const datasetDimensionMetadata = datasetDimensionsQuery.data?.dimensions ?? [];

  const seriesGroups = useMemo<InsSeriesGroup[]>(() => {
    return buildSeriesGroups(historyObservations, datasetDimensionMetadata);
  }, [datasetDimensionMetadata, historyObservations]);
  const seriesGroupByTypeCode = useMemo(() => {
    return new Map(seriesGroups.map((group) => [group.typeCode, group]));
  }, [seriesGroups]);
  const seriesOptionByTypeCode = useMemo(() => {
    const optionsByTypeCode = new Map<string, Map<string, (typeof seriesGroups)[number]['options'][number]>>();
    for (const group of seriesGroups) {
      optionsByTypeCode.set(group.typeCode, new Map(group.options.map((option) => [option.code, option])));
    }
    return optionsByTypeCode;
  }, [seriesGroups]);

  const effectiveSeriesSelection = useMemo(() => {
    return mergeSeriesSelection(seriesGroups, selectedSeriesClassifications);
  }, [selectedSeriesClassifications, seriesGroups]);

  const mapSelectionToRawCodes = useCallback(
    (selectionByTypeCode: Record<string, string[]>) => {
      const normalizedSelection: Record<string, string[]> = {};

      for (const [typeCode, selectedCodes] of Object.entries(selectionByTypeCode)) {
        const optionByCode = seriesOptionByTypeCode.get(typeCode);
        const values = Array.from(
          new Set(
            selectedCodes
              .map((selectedCode) => {
                const matchedOption = optionByCode?.get(selectedCode);
                if (matchedOption) return matchedOption.rawCode;
                return extractRawSeriesCode(selectedCode);
              })
              .map((value) => value.trim())
              .filter(Boolean)
          )
        );

        if (values.length > 0) {
          normalizedSelection[typeCode] = values;
        }
      }

      return normalizedSelection;
    },
    [seriesOptionByTypeCode]
  );

  const urlSeriesSelection = useMemo(() => {
    return normalizeSeriesSelectionForUrl(mapSelectionToRawCodes(selectedSeriesClassifications));
  }, [mapSelectionToRawCodes, selectedSeriesClassifications]);

  const chartSeriesSelection = useMemo(() => {
    return normalizeSeriesSelectionForUrl(mapSelectionToRawCodes(effectiveSeriesSelection));
  }, [effectiveSeriesSelection, mapSelectionToRawCodes]);

  useEffect(() => {
    const serialized = JSON.stringify({
      datasetCode: selectedDatasetCode,
      search: debouncedSearchTerm.trim(),
      rootCode: selectedRootContextCode,
      temporalSplit,
      explorerMode: isExplorerFullWidth ? 'full' : 'panel',
      seriesSelection: serializeSeriesSelection(urlSeriesSelection),
      unitKey: selectedUnitKey,
    });

    if (lastSerializedInsUrlStateRef.current === serialized) return;
    lastSerializedInsUrlStateRef.current = serialized;

    writeInsUrlState({
      datasetCode: selectedDatasetCode,
      search: debouncedSearchTerm,
      rootCode: selectedRootContextCode,
      temporalSplit,
      explorerMode: isExplorerFullWidth ? 'full' : 'panel',
      seriesSelection: urlSeriesSelection,
      unitKey: selectedUnitKey,
    });
  }, [
    debouncedSearchTerm,
    isExplorerFullWidth,
    selectedDatasetCode,
    selectedRootContextCode,
    selectedUnitKey,
    temporalSplit,
    urlSeriesSelection,
  ]);

  const historyUnitOptions = useMemo(() => buildUnitOptions(historyObservations), [historyObservations]);

  useEffect(() => {
    if (hasAppliedInitialSeriesUrlStateRef.current) return;

    const initialSeriesState = initialSeriesUrlStateRef.current;
    const hasInitialSeries = Object.keys(initialSeriesState.seriesSelection).length > 0;
    const hasInitialUnit = Boolean(initialSeriesState.unitKey);

    if (!hasInitialSeries && !hasInitialUnit) {
      hasAppliedInitialSeriesUrlStateRef.current = true;
      return;
    }

    const expectedDatasetCode = initialSeriesState.datasetCode;
    if (expectedDatasetCode && expectedDatasetCode !== selectedDatasetCode) {
      return;
    }

    if (seriesGroups.length === 0 && historyUnitOptions.length === 0) {
      return;
    }

    if (hasInitialSeries) {
      setSelectedSeriesClassifications(initialSeriesState.seriesSelection);
    }
    if (hasInitialUnit) {
      setSelectedUnitKey(initialSeriesState.unitKey);
    }

    hasAppliedInitialSeriesUrlStateRef.current = true;
  }, [historyUnitOptions.length, selectedDatasetCode, seriesGroups.length]);

  const effectiveUnitSelection = useMemo(() => {
    return mergeUnitSelection(historyUnitOptions, selectedUnitKey);
  }, [historyUnitOptions, selectedUnitKey]);

  const filteredHistoryObservations = useMemo(() => {
    return filterObservationsBySeriesSelection(
      historyObservations,
      effectiveSeriesSelection,
      effectiveUnitSelection
    );
  }, [effectiveSeriesSelection, effectiveUnitSelection, historyObservations]);

  const hasMultiValueSeriesSelection = useMemo(() => {
    return Object.values(effectiveSeriesSelection).some((selectedCodes) => selectedCodes.length > 1);
  }, [effectiveSeriesSelection]);

  const historySeries = useMemo(() => {
    if (!hasMultiValueSeriesSelection) {
      return buildStableSeries(filteredHistoryObservations);
    }

    const observationsByPeriod = new Map<string, InsObservation[]>();
    for (const observation of filteredHistoryObservations) {
      const periodKey = observation.time_period?.iso_period;
      if (!periodKey) continue;
      const existing = observationsByPeriod.get(periodKey);
      if (existing) {
        existing.push(observation);
      } else {
        observationsByPeriod.set(periodKey, [observation]);
      }
    }

    const aggregated = Array.from(observationsByPeriod.values()).map((periodRows) => {
      const rowsByTuple = new Map<string, InsObservation[]>();
      for (const row of periodRows) {
        const tupleSignature = buildObservationSeriesTupleSignature(row);
        const existing = rowsByTuple.get(tupleSignature);
        if (existing) {
          existing.push(row);
        } else {
          rowsByTuple.set(tupleSignature, [row]);
        }
      }

      const canonicalRows = Array.from(rowsByTuple.values())
        .map((rows) => buildStableSeries(rows)[0] ?? rows[0])
        .filter((row): row is InsObservation => Boolean(row));

      const representative = buildStableSeries(canonicalRows)[0] ?? canonicalRows[0] ?? periodRows[0];
      const numericValues = canonicalRows
        .map((row) => parseObservationValue(row.value))
        .filter((value): value is number => value != null);
      const aggregatedValue =
        numericValues.length > 0 ? String(numericValues.reduce((total, value) => total + value, 0)) : representative.value;

      return {
        ...representative,
        value: aggregatedValue,
        classifications: [],
      } as InsObservation;
    });

    return buildStableSeries(aggregated);
  }, [filteredHistoryObservations, hasMultiValueSeriesSelection]);

  const historyChartData = useMemo(() => {
    return [...historySeries]
      .reverse()
      .map((observation) => ({
        period: formatPeriodLabel(observation.time_period),
        numericValue: parseObservationValue(observation.value),
        rawValue: observation.value,
        statusLabel: getObservationStatusLabel(observation.value_status),
      }));
  }, [historySeries]);

  const historyRows = showAllRows ? historySeries : historySeries.slice(0, 12);
  const selectableSeriesGroups = useMemo(
    () => seriesGroups.filter((group) => group.options.length > 1),
    [seriesGroups]
  );
  const historyUnitByKey = useMemo(() => {
    return new Map(historyUnitOptions.map((option) => [option.key, option]));
  }, [historyUnitOptions]);
  const chartUnitLabel = useMemo(() => {
    if (historyUnitOptions.length === 0) {
      return null;
    }

    if (effectiveUnitSelection) {
      return historyUnitByKey.get(effectiveUnitSelection)?.label ?? null;
    }

    return historyUnitOptions[0]?.label ?? null;
  }, [effectiveUnitSelection, historyUnitByKey, historyUnitOptions]);
  const hasSeriesSelectors = selectableSeriesGroups.length > 0 || historyUnitOptions.length > 1;
  const chartShortcutLink = useMemo(() => {
    if (!selectedDatasetCode) {
      return null;
    }

    if (isCounty) {
      if (!countyCode) {
        return null;
      }
    } else if (!sirutaCode) {
      return null;
    }

    return buildInsStatsChartLink({
      datasetCode: selectedDatasetCode,
      datasetLabel: selectedDatasetDetails?.title || selectedDataset?.code || selectedDatasetCode,
      entityName: entity?.name || selectedDatasetCode,
      temporalSplit,
      classificationSelections: chartSeriesSelection,
      unitKey: effectiveUnitSelection,
      isCounty,
      countyCode,
      sirutaCode,
    });
  }, [
    countyCode,
    effectiveUnitSelection,
    entity?.name,
    isCounty,
    selectedDataset,
    selectedDatasetCode,
    selectedDatasetDetails,
    sirutaCode,
    temporalSplit,
    chartSeriesSelection,
  ]);

  const activeSeriesCriteriaParts = useMemo(() => {
    const parts: string[] = [];

    for (const group of seriesGroups) {
      const selectedCodes = effectiveSeriesSelection[group.typeCode] ?? [];
      if (selectedCodes.length === 0) continue;
      const optionByCode = seriesOptionByTypeCode.get(group.typeCode);
      const selectedLabels = selectedCodes
        .map((code) => optionByCode?.get(code)?.label)
        .filter(Boolean) as string[];
      if (selectedLabels.length === 0) continue;
      parts.push(`${group.typeLabel}: ${selectedLabels.join(', ')}`);
    }

    if (historyUnitOptions.length > 1 && effectiveUnitSelection) {
      const selectedUnit = historyUnitByKey.get(effectiveUnitSelection);
      if (selectedUnit) {
        parts.push(`${t`Unit`}: ${selectedUnit.label}`);
      }
    }

    return parts;
  }, [
    effectiveSeriesSelection,
    effectiveUnitSelection,
    historyUnitByKey,
    historyUnitOptions.length,
    seriesGroups,
    seriesOptionByTypeCode,
  ]);

  const handleResetSeriesSelection = useCallback(() => {
    setSelectedSeriesClassifications(buildDefaultSeriesSelection(seriesGroups));
    setSelectedUnitKey(getDefaultUnitSelection(historyUnitOptions));
  }, [historyUnitOptions, seriesGroups]);

  const derivedIndicatorInputs = useMemo(() => {
    const selectedObservationsByDataset = selectedIndicatorsSnapshotQuery.data?.observationsByDataset;
    const fallbackObservationsByDataset = fallbackIndicatorsSnapshotQuery.data?.observationsByDataset;
    return derivedIndicatorCodes.map((datasetCode) => {
      const selectedObservations = selectedObservationsByDataset?.get(datasetCode) ?? [];
      const fallbackObservations = fallbackObservationsByDataset?.get(datasetCode) ?? [];
      const selectedObservation = pickIndicatorObservationWithPeriodPolicy({
        observations: selectedObservations,
        excludeMonthly: true,
      });
      const fallbackObservation = pickIndicatorObservationWithPeriodPolicy({
        observations: fallbackObservations,
        excludeMonthly: true,
      });
      const observation = selectedObservation ?? fallbackObservation;
      return {
        datasetCode,
        observation,
        source: selectedObservation ? 'selected' as const : fallbackObservation ? 'fallback' as const : 'none' as const,
        periodLabel: observation ? formatPeriodLabel(observation.time_period) : null,
      };
    });
  }, [
    derivedIndicatorCodes,
    fallbackIndicatorsSnapshotQuery.data?.observationsByDataset,
    selectedIndicatorsSnapshotQuery.data?.observationsByDataset,
  ]);

  const derivedIndicators = useMemo(() => {
    return computeDerivedIndicators(derivedIndicatorInputs);
  }, [derivedIndicatorInputs]);

  const derivedIndicatorStatus = useMemo(() => {
    const periods = Array.from(
      new Set(
        derivedIndicatorInputs
          .map((row) => row.periodLabel)
          .filter((value): value is string => Boolean(value))
      )
    );
    const hasFallback = derivedIndicatorInputs.some((row) => row.source === 'fallback');

    return {
      selectedPeriodLabel: selectedReportPeriodLabel,
      dataPeriodLabel:
        periods.length === 0 ? t`Unknown` : periods.length === 1 ? periods[0] : t`Mixed`,
      hasFallback,
    };
  }, [derivedIndicatorInputs, selectedReportPeriodLabel]);

  const groupedDerivedIndicators = useMemo(() => {
    const groups: Record<DerivedIndicatorGroup, DerivedIndicator[]> = {
      demography: [],
      economy_housing: [],
      utilities: [],
    };

    for (const indicator of derivedIndicators) {
      groups[getDerivedIndicatorGroup(indicator.id)].push(indicator);
    }

    return groups;
  }, [derivedIndicators]);

  const scrollToDetailCard = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.requestAnimationFrame(() => {
      const detailElement = detailCardRef.current;
      if (!detailElement) return;

      const topOffset =
        window.innerWidth >= 1024 ? DETAIL_SCROLL_OFFSET_DESKTOP_PX : DETAIL_SCROLL_OFFSET_MOBILE_PX;
      const targetTop = Math.max(
        0,
        detailElement.getBoundingClientRect().top + window.scrollY - topOffset
      );

      window.scrollTo({
        top: targetTop,
        behavior: 'smooth',
      });
    });
  }, []);

  const handleSelectDataset = useCallback(
    (
      datasetCode: string,
      options?: {
        scrollToDetail?: boolean;
      }
    ) => {
      setSelectedDatasetCode(datasetCode);

      if (options?.scrollToDetail ?? true) {
        scrollToDetailCard();
      }
    },
    [scrollToDetailCard]
  );

  const handleSelectDerivedIndicator = useCallback(
    (sourceDatasetCode: string | null) => {
      if (!sourceDatasetCode) return;
      setSearchTerm('');
      setSelectedRootContextCode('');
      handleSelectDataset(sourceDatasetCode, { scrollToDetail: true });
    },
    [handleSelectDataset]
  );

  const resolveCompatibleSelectionForUnit = useCallback(
    (unitKey: string | null, baseSelection: Record<string, string[]>) => {
      const normalizedSelection = mergeSeriesSelection(seriesGroups, baseSelection);
      const unitScopedObservations = unitKey
        ? filterObservationsBySeriesSelection(historyObservations, {}, unitKey)
        : historyObservations;

      if (unitScopedObservations.length === 0) {
        return normalizedSelection;
      }

      const strictMatches = filterObservationsBySeriesSelection(unitScopedObservations, normalizedSelection, null);
      if (strictMatches.length > 0) {
        return normalizedSelection;
      }

      const unitScopedGroups = buildSeriesGroups(unitScopedObservations, datasetDimensionMetadata);
      if (unitScopedGroups.length > 0) {
        const mergedUnitScopedSelection = mergeSeriesSelection(unitScopedGroups, normalizedSelection);
        const prunedSelection: Record<string, string[]> = {};

        for (const group of unitScopedGroups) {
          const selectedCodes = mergedUnitScopedSelection[group.typeCode] ?? [];
          if (selectedCodes.length > 0) {
            prunedSelection[group.typeCode] = selectedCodes;
          }
        }

        if (Object.keys(prunedSelection).length > 0) {
          const prunedMatches = filterObservationsBySeriesSelection(unitScopedObservations, prunedSelection, null);
          if (prunedMatches.length > 0) {
            return prunedSelection;
          }
        }
      }

      const fallbackObservation = buildStableSeries(unitScopedObservations)[0] ?? unitScopedObservations[0];
      const tupleSelection = buildSeriesSelectionFromObservation(fallbackObservation);
      if (Object.keys(tupleSelection).length > 0) {
        const tupleMatches = filterObservationsBySeriesSelection(unitScopedObservations, tupleSelection, null);
        if (tupleMatches.length > 0) {
          return tupleSelection;
        }
      }

      return normalizedSelection;
    },
    [datasetDimensionMetadata, historyObservations, seriesGroups]
  );

  const handleSeriesGroupSelectionChange = useCallback(
    (typeCode: string, selectedCode: string, multiSelect: boolean) => {
      setSelectedSeriesClassifications((current) => {
        const normalized = mergeSeriesSelection(seriesGroups, current);
        const existingCodes = normalized[typeCode] ?? [];
        const group = seriesGroupByTypeCode.get(typeCode);
        const optionByCode = seriesOptionByTypeCode.get(typeCode);
        const isTotalLikeCode = (code: string) => optionByCode?.get(code)?.isTotalLike ?? false;
        const defaultCode = group?.options.find((option) => option.isTotalLike)?.code ?? group?.options[0]?.code ?? selectedCode;

        const nextCodes = !multiSelect
          ? [selectedCode]
          : (() => {
              if (isTotalLikeCode(selectedCode)) {
                return [selectedCode];
              }

              const withoutTotalLike = existingCodes.filter((code) => !isTotalLikeCode(code));

              if (withoutTotalLike.includes(selectedCode)) {
                const toggledCodes = withoutTotalLike.filter((code) => code !== selectedCode);
                if (toggledCodes.length > 0) {
                  return toggledCodes;
                }

                return selectedCode === defaultCode ? [selectedCode] : [defaultCode];
              }

              return [...withoutTotalLike, selectedCode];
            })();

        const candidateSelection = {
          ...normalized,
          [typeCode]: nextCodes.length > 0 ? nextCodes : [selectedCode],
        };

        const strictMatches = filterObservationsBySeriesSelection(
          historyObservations,
          candidateSelection,
          effectiveUnitSelection
        );
        if (strictMatches.length > 0) {
          return candidateSelection;
        }

        const anyUnitMatches = filterObservationsBySeriesSelection(historyObservations, candidateSelection, null);
        if (anyUnitMatches.length > 0) {
          const nextUnitSelection = mergeUnitSelection(buildUnitOptions(anyUnitMatches), effectiveUnitSelection);
          if (nextUnitSelection !== effectiveUnitSelection) {
            setSelectedUnitKey(nextUnitSelection);
          }
          return resolveCompatibleSelectionForUnit(nextUnitSelection, candidateSelection);
        }

        return resolveCompatibleSelectionForUnit(effectiveUnitSelection, candidateSelection);
      });
    },
    [
      effectiveUnitSelection,
      historyObservations,
      resolveCompatibleSelectionForUnit,
      seriesGroupByTypeCode,
      seriesGroups,
      seriesOptionByTypeCode,
    ]
  );

  const handleUnitSelectionChange = useCallback(
    (unitKey: string) => {
      setSelectedUnitKey(unitKey);
      setSelectedSeriesClassifications((current) =>
        resolveCompatibleSelectionForUnit(unitKey, current)
      );
    },
    [resolveCompatibleSelectionForUnit]
  );

  const handleHierarchyNavigate = useCallback(
    (item: { code: string; kind: 'home' | 'context' | 'dataset'; rootCode: string }) => {
      setSearchTerm('');

      if (item.kind === 'home') {
        setSelectedRootContextCode('');
        setOpenRootGroups(groupedRootCodes);
        setPendingExplorerFocusCode(null);
        return;
      }

      if (item.rootCode !== '') {
        setSelectedRootContextCode(item.rootCode);
        setOpenRootGroups([item.rootCode]);
      }

      if (item.kind === 'dataset') {
        setSelectedDatasetCode(item.code);
      }

      setPendingExplorerFocusCode(item.code);
    },
    [groupedRootCodes]
  );

  useEffect(() => {
    if (!pendingExplorerFocusCode) return;

    const directTarget =
      datasetItemRefs.current[pendingExplorerFocusCode] ??
      sectionRefs.current[pendingExplorerFocusCode] ??
      rootGroupRefs.current[pendingExplorerFocusCode];
    const fallbackDatasetCode = firstDatasetCodeByContext.get(pendingExplorerFocusCode);
    const fallbackTarget = fallbackDatasetCode ? datasetItemRefs.current[fallbackDatasetCode] : null;
    const target = directTarget ?? fallbackTarget;

    if (!target || typeof target.scrollIntoView !== 'function') return;

    if (typeof window === 'undefined') {
      target.scrollIntoView();
      setPendingExplorerFocusCode(null);
      return;
    }

    window.requestAnimationFrame(() => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'nearest',
      });
    });
    setPendingExplorerFocusCode(null);
  }, [firstDatasetCodeByContext, groupedDatasets, openRootGroups, pendingExplorerFocusCode]);

  if (!entity || (!entity.is_uat && !isCounty)) {
    return (
      <Alert>
        <Info className="h-4 w-4" aria-hidden="true" />
        <AlertTitle><Trans>INS indicators are only available for UATs.</Trans></AlertTitle>
        <AlertDescription>
          <Trans>Select a local entity to view INS Tempo data.</Trans>
        </AlertDescription>
      </Alert>
    );
  }

  if (isCounty && countyCode === '') {
    return (
      <Alert>
        <Info className="h-4 w-4" aria-hidden="true" />
        <AlertTitle><Trans>No county code associated.</Trans></AlertTitle>
        <AlertDescription>
          <Trans>Cannot load INS indicators without the county code.</Trans>
        </AlertDescription>
      </Alert>
    );
  }

  if (!isCounty && sirutaCode === '') {
    return (
      <Alert>
        <Info className="h-4 w-4" aria-hidden="true" />
        <AlertTitle><Trans>No SIRUTA code associated.</Trans></AlertTitle>
        <AlertDescription>
          <Trans>Cannot load INS indicators without the locality SIRUTA code.</Trans>
        </AlertDescription>
      </Alert>
    );
  }

  const loadError =
    selectedIndicatorsSnapshotQuery.error ||
    fallbackIndicatorsSnapshotQuery.error ||
    datasetCatalogQuery.error ||
    contextsQuery.error;
  if (loadError instanceof Error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        <AlertTitle><Trans>Could not load INS data</Trans></AlertTitle>
        <AlertDescription>{loadError.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="mx-auto max-w-[1450px] space-y-5">
      <SummaryMetricsSection
        isLoading={selectedIndicatorsSnapshotQuery.isLoading || fallbackIndicatorsSnapshotQuery.isLoading}
        summaryCards={summaryCards}
        selectedReportPeriodLabel={selectedReportPeriodLabel}
        selectedDatasetCode={selectedDatasetCode}
        locale={locale}
        onSelectDataset={(datasetCode) =>
          handleSelectDataset(datasetCode, {
            scrollToDetail: true,
          })
        }
      />

      <DerivedIndicatorsSection
        isLoading={selectedIndicatorsSnapshotQuery.isLoading || fallbackIndicatorsSnapshotQuery.isLoading}
        error={selectedIndicatorsSnapshotQuery.error || fallbackIndicatorsSnapshotQuery.error}
        derivedIndicators={derivedIndicators}
        groupedDerivedIndicators={groupedDerivedIndicators}
        derivedIndicatorStatus={derivedIndicatorStatus}
        onSelectDerivedIndicator={handleSelectDerivedIndicator}
        onSelectDataset={handleSelectDataset}
      />

      <div
        data-testid="ins-explorer-layout"
        className={`grid gap-4 ${isExplorerFullWidth ? 'grid-cols-1' : 'xl:grid-cols-[420px_minmax(0,1fr)]'}`}
      >
        <DatasetExplorerSection
          isExplorerFullWidth={isExplorerFullWidth}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          onToggleExplorerWidth={() => setIsExplorerFullWidth((current) => !current)}
          isLoading={datasetCatalogQuery.isLoading}
          groupedDatasets={groupedDatasets}
          openRootGroups={openRootGroups}
          onOpenRootGroupsChange={setOpenRootGroups}
          selectedDatasetCode={selectedDatasetCode}
          locale={locale}
          onSelectDataset={(datasetCode) =>
            handleSelectDataset(datasetCode, {
              scrollToDetail: true,
            })
          }
          rootGroupRefs={rootGroupRefs.current}
          sectionRefs={sectionRefs.current}
          datasetItemRefs={datasetItemRefs.current}
        />

        <div ref={detailCardRef}>
          <DatasetDetailSection
            selectedDatasetDetails={selectedDatasetDetails}
            selectedDatasetBreadcrumbItems={selectedDatasetBreadcrumbItems}
            selectedDataset={selectedDataset}
            selectedDatasetCode={selectedDatasetCode}
            locale={locale}
            hasDatasetMetadataPanel={hasDatasetMetadataPanel}
            isDatasetMetaExpanded={isDatasetMetaExpanded}
            setIsDatasetMetaExpanded={setIsDatasetMetaExpanded}
            handleHierarchyNavigate={handleHierarchyNavigate}
            datasetHistoryQuery={datasetHistoryQuery}
            historySeries={historySeries}
            historyRows={historyRows}
            showAllRows={showAllRows}
            setShowAllRows={setShowAllRows}
            isTemporalSplitIncompatible={isTemporalSplitIncompatible}
            availableTemporalOptions={availableTemporalOptions}
            temporalSplit={temporalSplit}
            setTemporalSplit={setTemporalSplit}
            hasTemporalSelector={hasTemporalSelector}
            hasSeriesSelectors={hasSeriesSelectors}
            handleResetSeriesSelection={handleResetSeriesSelection}
            selectableSeriesGroups={selectableSeriesGroups}
            effectiveSeriesSelection={effectiveSeriesSelection}
            seriesSelectorSearchByTypeCode={seriesSelectorSearchByTypeCode}
            setSeriesSelectorSearchByTypeCode={setSeriesSelectorSearchByTypeCode}
            handleSeriesGroupSelectionChange={handleSeriesGroupSelectionChange}
            historyUnitOptions={historyUnitOptions}
            effectiveUnitSelection={effectiveUnitSelection}
            chartUnitLabel={chartUnitLabel}
            handleUnitSelectionChange={handleUnitSelectionChange}
            activeSeriesCriteriaParts={activeSeriesCriteriaParts}
            historyChartData={historyChartData}
            selectedDatasetSourceUrl={selectedDatasetSourceUrl}
            insTermsUrl={INS_TERMS_URL}
            hasMultiValueSeriesSelection={hasMultiValueSeriesSelection}
            chartShortcutLink={chartShortcutLink}
          />
        </div>
      </div>
    </div>
  );
}
