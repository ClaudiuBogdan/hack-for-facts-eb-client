import { isInsChartPeriodicity } from "@/lib/ins/source-contract";
import { useMemo } from "react";
import { buildInsStatsChartLink } from "@/lib/chart-links";
import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLingui } from "@lingui/react";
import {
  SummaryMetricsSection,
  DerivedIndicatorsSection,
  DatasetExplorerSection,
  EntityInsDetailCard,
} from "@/components/entities/views/ins-stats-view.presentation";
import { getDerivedIndicatorGroup } from "@/components/entities/views/ins-stats-view.derived";
import { formatPeriodLabel } from "@/components/entities/views/ins-stats-view.formatters";
import { useEntityInsMetrics } from "../../hooks/use-entity-ins-metrics";
import { fetchEntityInsCatalog } from "../../api/graphql/ins-entity-catalog";
import {
  entityInsDatasetGroups,
  entityInsDetailModel,
  entityInsDerivedIndicators,
} from "../../lib/entity-ins-dashboard";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { createLogger } from "@/lib/logger";
import type { EntityDetailsData } from "@/lib/api/entities";
import type { EntityInsSelectionInput } from "@/lib/ins/entity-source-search";
import type { PeriodDate, ReportPeriodInput } from "@/schemas/reporting";
import { useEntityInsSource } from "../../hooks/use-entity-ins-source";
import { resolveEntityInsSelection } from "../../lib/entity-ins-selection";
import { ComparisonDatasetError } from "../../lib/comparison-dataset-error";
import { EntityInsSourceControls } from "./entity-ins-source-controls";
import { EntityInsSourceHistory } from "./entity-ins-source-history";

const logger = createLogger("native-entity-ins");

/** Entity source reads use canonical geographic metadata, independently of fiscal authority. */
export function NativeEntityInsView({
  cui,
  metadata,
  metadataReady,
  search,
  reportPeriod,
  onChange,
}: {
  readonly cui: string;
  readonly metadata: Pick<EntityDetailsData, "cui" | "uat"> | null | undefined;
  readonly metadataReady: boolean;
  readonly search: EntityInsSelectionInput & {
    insSearch?: string;
    insRoot?: string;
    insExplorer?: string;
  };
  readonly reportPeriod: ReportPeriodInput;
  readonly onChange: (
    patch: EntityInsSelectionInput & {
      insSearch?: string;
      insRoot?: string;
      insExplorer?: string;
    },
  ) => void;
}) {
  const { i18n } = useLingui();
  const locale = i18n.locale === "en" ? "en" : "ro";
  const requested = resolveEntityInsSelection(search);
  const effectiveSearch =
    requested.datasetCode === null && !requested.issues.length
      ? { ...search, insDataset: "POP107D" }
      : search;
  const input = {
    cui,
    metadata,
    metadataReady,
    search: effectiveSearch,
    enabled: true,
  };
  const metrics = useEntityInsMetrics(input, reportPeriod);
  const bootstrap = metrics.defaults.find(
    (item) =>
      item.dataset.code ===
      resolveEntityInsSelection(effectiveSearch).datasetCode,
  );
  const source = useEntityInsSource({
    ...input,
    bootstrap,
    waitForBootstrap:
      !resolveEntityInsSelection(effectiveSearch).explicitSource &&
      metrics.isBootstrapLoading,
  });
  const selection = resolveEntityInsSelection(effectiveSearch);
  const expanded = search.insExplorer === "expanded",
    searchTerm = search.insSearch ?? "",
    openRoots = search.insRoot ? [search.insRoot] : [];
  const setExpanded = (value: boolean) =>
    onChange({ insExplorer: value ? "expanded" : undefined });
  const setSearchTerm = (value: string) =>
    onChange({ insSearch: value || undefined });
  const setOpenRoots = (values: string[]) =>
    onChange({ insRoot: values[values.length - 1] });
  const [metadataExpanded, setMetadataExpanded] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);
  const rootRefs = useRef<Record<string, HTMLDivElement | null>>({}),
    sectionRefs = useRef<Record<string, HTMLDivElement | null>>({}),
    itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const catalogLevel =
    metrics.context?.territoryLevel === "NUTS3" ? "county" : "uat";
  const catalog = useQuery({
    queryKey: ["statistics", "entity-ins-catalog", catalogLevel],
    queryFn: ({ signal }) => fetchEntityInsCatalog(catalogLevel, signal),
    enabled: !!metrics.context && expanded,
    staleTime: 300_000,
    retry: false,
  });
  const selectDataset = (code: string) => {
    detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    onChange({
      insDataset: code,
      insSeries: undefined,
      insUnit: undefined,
      insTemporal: undefined,
      insSourcePins: undefined,
      insSourceUnit: undefined,
      insSourceCadence: undefined,
    });
  };
  const periodLabel =
    reportPeriod.selection.dates?.join(", ") ??
    (reportPeriod.selection.interval?.start ===
    reportPeriod.selection.interval?.end
      ? reportPeriod.selection.interval?.start
      : `${reportPeriod.selection.interval?.start} – ${reportPeriod.selection.interval?.end}`) ??
    "";
  const cards = metrics.topMetrics.map((metric) => {
    const item = metrics.metrics.find((item) => item.code === metric.code),
      projection = item?.projection;
    const series = projection?.status === "SERIES" ? projection : null;
    const cells = series?.selected ?? [];
    const selected = cells.length === 1 ? cells[0].observation : null;
    // A tile is a standalone reading, so the latest available observation is shown
    // when the selected period has none — the card labels it "last available".
    // Multi-period cards list their own cells and must not collapse to one value.
    const fallback =
      selected === null && cells.length <= 1 ? (series?.latest ?? null) : null;
    const observation = selected ?? fallback;
    return {
      ...metric,
      row: {
        native: true,
        error: !!item?.error,
        dataset: item?.prepared?.dataset ?? null,
        observation,
        selectedCells: cells,
        periodLabel: observation
          ? formatPeriodLabel(observation.time_period)
          : periodLabel,
        selectedPeriodLabel: periodLabel,
        source: selected
          ? ("selected" as const)
          : fallback
            ? ("fallback" as const)
            : ("none" as const),
        hasData: observation !== null,
      },
    };
  });
  const derived = entityInsDerivedIndicators(
    metrics.metrics.flatMap((item) =>
      item.projection?.status === "SERIES" &&
      item.projection.selected.length === 1 &&
      item.projection.selected[0].observation
        ? [item.projection.selected[0].observation]
        : [],
    ),
  );
  const groupedDerived = {
    demography: derived.filter(
      (row) => getDerivedIndicatorGroup(row.id) === "demography",
    ),
    economy_housing: derived.filter(
      (row) => getDerivedIndicatorGroup(row.id) === "economy_housing",
    ),
    utilities: derived.filter(
      (row) => getDerivedIndicatorGroup(row.id) === "utilities",
    ),
  };
  const datasets = catalog.isSuccess
    ? catalog.data.filter((dataset) =>
        `${dataset.code} ${dataset.name_ro ?? ""} ${dataset.name_en ?? ""}`
          .toLocaleLowerCase()
          .includes(searchTerm.toLocaleLowerCase()),
      )
    : [];
  const detailModel = source.prepared
    ? entityInsDetailModel(source.prepared.dataset, locale)
    : null;
  const chartLink = useMemo(() => {
    const prepared = source.prepared;
    if (!prepared?.resolved.canDerive || !source.history) return null;
    const scope = prepared.resolved.scope;
    if (
      !scope.periodicity ||
      !isInsChartPeriodicity(scope.periodicity) ||
      source.history.mode !== "complete" ||
      source.history.truncated
    )
      return null;
    const dates = source.history.observations
      .filter((row) => row.time_period.periodicity === scope.periodicity)
      .map((row) => row.time_period.iso_period as PeriodDate)
      .sort();
    if (dates.length === 0) return null;
    const period: ReportPeriodInput = {
      type:
        scope.periodicity === "ANNUAL"
          ? "YEAR"
          : scope.periodicity === "QUARTERLY"
            ? "QUARTER"
            : "MONTH",
      selection: { dates },
    };
    return buildInsStatsChartLink({
      datasetCode: prepared.dataset.code,
      datasetLabel: prepared.dataset.name_ro ?? prepared.dataset.code,
      entityName: prepared.context.territoryName,
      period,
      temporalSplit:
        scope.periodicity === "ANNUAL"
          ? "year"
          : scope.periodicity === "QUARTERLY"
            ? "quarter"
            : "month",
      classificationSelections: Object.fromEntries(
        [...scope.classifications].map(([key, value]) => [key, [value]]),
      ),
      unitKey: scope.unitCode,
      isCounty: prepared.context.territoryLevel === "NUTS3",
      countyCode:
        prepared.context.territoryLevel === "NUTS3"
          ? prepared.context.territoryCode
          : undefined,
      sirutaCode: prepared.context.sirutaCode ?? undefined,
    });
  }, [source.prepared, source.history]);
  const busy =
    source.contextQuery.isFetching ||
    source.preparationQuery.isFetching ||
    source.historyQuery.isFetching ||
    metrics.isLoading;
  const error =
    source.contextQuery.error ??
    source.preparationQuery.error ??
    source.historyQuery.error;
  const refresh = () => {
    void (async () => {
      await metrics.refresh();
      if (!bootstrap || selection.explicitSource) await source.refresh();
    })().catch((error: unknown) =>
      logger.error("INS source refresh failed", { cui, error }),
    );
  };
  if (!metadataReady || metadata?.cui !== cui)
    return (
      <p role="status">
        <Trans>Loading the entity's geographic context…</Trans>
      </p>
    );
  if (!metadata.uat)
    return (
      <p role="status">
        <Trans>
          This entity has no canonical geographic area linked to INS.
        </Trans>
      </p>
    );
  return (
    <section className="space-y-5 sm:space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <h2 className="text-xl font-bold tracking-tight">
            <Trans>INS statistics</Trans>
          </h2>
          {source.context ? (
            <p className="truncate text-sm text-muted-foreground">
              {source.context.territoryName} · {source.context.territoryCode}
            </p>
          ) : null}
        </div>
        {/* Icon-only on a phone: the label made the row wrap under the title. */}
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          disabled={busy}
          onClick={refresh}
          aria-label={t`Refresh source`}
          title={t`Refresh source`}
        >
          <RefreshCw className={busy ? 'size-4 animate-spin' : 'size-4'} aria-hidden="true" />
          <span className="hidden sm:inline">
            <Trans>Refresh source</Trans>
          </span>
        </Button>
      </div>
      {busy ? (
        <p role="status">
          <Trans>Loading INS source data…</Trans>
        </p>
      ) : null}
      {error ? (
        <p role="alert">
          {error instanceof ComparisonDatasetError ? (
            error.reason === "CATALOG_ONLY" ? (
              <Trans>
                This dataset is in the catalog, but its observations are not
                published.
              </Trans>
            ) : (
              <Trans>
                This dataset was not found. Choose another dataset below.
              </Trans>
            )
          ) : (
            <Trans>
              INS source data could not be loaded or verified. Refresh the
              source to retry.
            </Trans>
          )}
        </p>
      ) : null}
      {!busy && source.contextQuery.isSuccess && !source.context ? (
        <p>
          <Trans>The entity's area is not mapped to an INS territory.</Trans>
        </p>
      ) : null}
      {source.context ? (
        <>
          {source.context.datasetCount === 0 ? (
            <p role="status">
              <Trans>
                No published datasets currently cover this area. You can still
                search the general catalog.
              </Trans>
            </p>
          ) : null}
          <SummaryMetricsSection
            isLoading={metrics.isLoading}
            summaryCards={cards}
            selectedReportPeriodLabel={periodLabel}
            selectedDatasetCode={selection.datasetCode}
            locale={locale}
            onSelectDataset={selectDataset}
          />
          <p className="text-xs text-muted-foreground">
            <Trans>
              Derived indicators require matching annual observations and
              compatible units. Missing or qualified values are excluded.
            </Trans>
          </p>
          <DerivedIndicatorsSection
            isLoading={metrics.isLoading}
            error={metrics.error}
            derivedIndicators={derived}
            groupedDerivedIndicators={groupedDerived}
            derivedIndicatorStatus={{
              selectedPeriodLabel: periodLabel,
              dataPeriodLabel: periodLabel,
              hasFallback: false,
            }}
            emptyGroupNote={t`No indicator in this group has an observation for the same period as the population, so no ratio can be computed without mixing periods.`}
            onSelectDataset={selectDataset}
            onSelectDerivedIndicator={(code) => {
              if (code) selectDataset(code);
            }}
          />
          <DatasetExplorerSection
            isExplorerExpanded={expanded}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            onToggleExpanded={() => setExpanded(!expanded)}
            isLoading={catalog.isFetching}
            groupedDatasets={entityInsDatasetGroups(
              datasets,
              locale,
              metrics.context?.territoryLevel === "NUTS3" ? "county" : "uat",
            )}
            openRootGroups={openRoots}
            onOpenRootGroupsChange={setOpenRoots}
            selectedDatasetCode={selection.datasetCode}
            locale={locale}
            onSelectDataset={selectDataset}
            rootGroupRefs={rootRefs.current}
            sectionRefs={sectionRefs.current}
            datasetItemRefs={itemRefs.current}
          />
          {expanded && catalog.isError && (
            <p role="alert">
              <Trans>We could not load the dataset catalog.</Trans>
            </p>
          )}
          {selection.issues.includes("dataset") ? (
            <p role="alert">
              <Trans>
                The dataset in this link is invalid. Select a dataset from the
                catalog.
              </Trans>
            </p>
          ) : null}
          {source.prepared ? (
            <div ref={detailRef} className="scroll-mt-24">
              <EntityInsDetailCard
                selectedDatasetDetails={detailModel}
                selectedDatasetBreadcrumbItems={detailModel?.hierarchy ?? []}
                selectedDataset={source.prepared.dataset}
                selectedDatasetCode={selection.datasetCode}
                locale={locale}
                hasDatasetMetadataPanel
                isDatasetMetaExpanded={metadataExpanded}
                setIsDatasetMetaExpanded={setMetadataExpanded}
                handleHierarchyNavigate={(item) =>
                  onChange({
                    insExplorer: "expanded",
                    insRoot:
                      item.kind === "context" ? item.rootCode : undefined,
                  })
                }
                chartShortcutLink={chartLink}
              >
                <EntityInsSourceControls
                  prepared={source.prepared}
                  observations={source.history?.observations}
                  onChange={onChange}
                  onSourceRefresh={refresh}
                />
                {source.history ? (
                  <EntityInsSourceHistory
                    key={JSON.stringify([
                      source.prepared.publicationKey,
                      source.prepared.resolved.filter,
                      source.prepared.resolved.scope.periodicity,
                      reportPeriod,
                    ])}
                    prepared={source.prepared}
                    history={source.history}
                    reportPeriod={reportPeriod}
                  />
                ) : null}
              </EntityInsDetailCard>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
