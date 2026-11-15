import { useMemo, useState } from "react";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import {
  usePnrrAnomalyModel,
  usePnrrBeneficiaryPage,
  usePnrrFilterFacets,
  usePnrrMapModel,
  usePnrrProjectPage,
  usePnrrServerOverview,
} from "../hooks/usePnrrData";
import {
  getPnrrFactReleaseId,
  usePnrrLiveStatus,
} from "../hooks/use-pnrr-live-data";
import { usePnrrFilterState } from "../hooks/usePnrrFilterState";
import {
  computeAggregates,
  getActiveFilterCount,
  hasPnrrDataFilters,
} from "../lib/data-transform";
import { PnrrCurrencyProvider } from "../lib/PnrrCurrencyProvider";
import { PnrrDashboardReleaseContext } from "../lib/pnrr-release-context";
import { PnrrContentSkeleton } from "./PnrrSkeleton";
import { PnrrHeader } from "./PnrrHeader";
import { PnrrOverview } from "./tabs/PnrrOverview";
import { PnrrProjectsView } from "./tabs/PnrrProjectsView";
import { PnrrAnomaliesView } from "./tabs/PnrrAnomaliesView";
import { PnrrBeneficiariesView } from "./tabs/PnrrBeneficiariesView";
import { PnrrMapView } from "./PnrrMapView";
import { PnrrReleaseSourceDates } from "./live/PnrrReleaseSourceDates";
import {
  PnrrFilterSheet,
  PnrrFilterTriggerButton,
} from "./filters/PnrrFilterSheet";
import { PnrrInfoSheet } from "./filters/PnrrInfoSheet";
import { PnrrExportButton } from "./table/PnrrExportButton";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Info, RefreshCw } from "lucide-react";
import type { Currency } from "@/schemas/charts";

/*
 * The PNRR dashboard. Every figure comes from the web server, which runs the
 * dashboard's query model over the active API release: the overview (in the
 * server render when it is in memory), then only the page, model or detail
 * the reader opens. The browser downloads no dataset and no file set. The
 * release read pins every request, so all panels show the same release.
 */
export function PnrrDashboard({
  initialCurrency,
}: {
  readonly initialCurrency?: Currency;
}) {
  const filterState = usePnrrFilterState();
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [infoSheetOpen, setInfoSheetOpen] = useState(false);
  const emptyAggregates = useMemo(() => computeAggregates([]), []);

  const view = filterState.search.view ?? "overview";
  const effectiveCurrency = filterState.search.currency ?? initialCurrency;

  const status = usePnrrLiveStatus();
  const release = status.data?.pnrrCurrentRelease ?? null;
  const releaseId = getPnrrFactReleaseId(release) ?? null;

  return (
    <PnrrDashboardReleaseContext value={releaseId}>
      <PnrrCurrencyProvider
        currency={filterState.search.currency}
        initialCurrency={effectiveCurrency}
      >
        <PnrrDashboardContent
          filterState={filterState}
          view={view}
          effectiveCurrency={effectiveCurrency}
          emptyAggregates={emptyAggregates}
          status={status}
          filterSheetOpen={filterSheetOpen}
          onFilterSheetOpenChange={setFilterSheetOpen}
          infoSheetOpen={infoSheetOpen}
          onInfoSheetOpenChange={setInfoSheetOpen}
        />
      </PnrrCurrencyProvider>
    </PnrrDashboardReleaseContext>
  );
}

function PnrrDashboardContent({
  filterState,
  view,
  effectiveCurrency,
  emptyAggregates,
  status,
  filterSheetOpen,
  onFilterSheetOpenChange,
  infoSheetOpen,
  onInfoSheetOpenChange,
}: {
  readonly filterState: ReturnType<typeof usePnrrFilterState>;
  readonly view: NonNullable<
    ReturnType<typeof usePnrrFilterState>["search"]["view"]
  >;
  readonly effectiveCurrency: Currency | undefined;
  readonly emptyAggregates: ReturnType<typeof computeAggregates>;
  readonly status: ReturnType<typeof usePnrrLiveStatus>;
  readonly filterSheetOpen: boolean;
  readonly onFilterSheetOpenChange: (open: boolean) => void;
  readonly infoSheetOpen: boolean;
  readonly onInfoSheetOpenChange: (open: boolean) => void;
}) {
  const search = filterState.search;
  const release = status.data?.pnrrCurrentRelease ?? null;
  const releaseId = getPnrrFactReleaseId(release) ?? null;

  // The header needs the overview's totals on every tab; each tab reads only
  // its own page or model, for the filters on screen.
  const serverOverviewQuery = usePnrrServerOverview(search, { enabled: true });
  const projectPageQuery = usePnrrProjectPage(search, {
    enabled: view === "projects",
  });
  const beneficiaryPageQuery = usePnrrBeneficiaryPage(search, {
    enabled: view === "beneficiaries",
  });
  const anomalyModelQuery = usePnrrAnomalyModel(search, {
    enabled: view === "anomalies",
  });
  const mapModelQuery = usePnrrMapModel(search, "total-value", {
    enabled: view === "map",
  });
  const facetsQuery = usePnrrFilterFacets({ enabled: filterSheetOpen });

  const viewQuery =
    view === "projects"
      ? projectPageQuery
      : view === "beneficiaries"
        ? beneficiaryPageQuery
        : view === "anomalies"
          ? anomalyModelQuery
          : view === "map"
            ? mapModelQuery
            : serverOverviewQuery;

  const serverOverview = serverOverviewQuery.data;
  const summary = serverOverview
    ? { overview: serverOverview.overview, meta: serverOverview.meta }
    : null;

  const uatLabelsBySiruta = useMemo(() => {
    const labels = new Map<string, string>();

    for (const uat of facetsQuery.data?.uats ?? []) {
      labels.set(uat.value, uat.label);
    }
    for (const uat of serverOverview?.labels.uats ?? []) {
      labels.set(uat.siruta, uat.label);
    }

    return labels;
  }, [facetsQuery.data?.uats, serverOverview?.labels.uats]);
  const beneficiaryNamesByCui = useMemo(() => {
    const labels = new Map<string, string>();

    for (const beneficiary of [
      ...(beneficiaryPageQuery.data?.rows ?? []),
      ...(serverOverview?.labels.beneficiaries ?? []),
    ]) {
      if (!beneficiary.cui || !beneficiary.name) continue;

      const cui = beneficiary.cui.replace(/\D/g, "");
      if (!cui) continue;

      const existing = labels.get(cui);
      if (!existing || beneficiary.name.localeCompare(existing, "ro") < 0) {
        labels.set(cui, beneficiary.name);
      }
    }

    return labels;
  }, [beneficiaryPageQuery.data?.rows, serverOverview?.labels.beneficiaries]);
  const hasScopedFilters = hasPnrrDataFilters(search);

  const filteredAggregates = summary?.overview.aggregates ?? emptyAggregates;

  // An abstained release is an answer, not an outage: it is shown as the
  // error state with the release's own limitation, and nothing is read.
  // A failed background re-read keeps the release already shown.
  const releaseError = release
    ? release.state === "abstained"
      ? new Error(release.limitation)
      : null
    : (status.error ?? null);
  const isReleasePending = !release && !releaseError && status.isLoading;

  const isViewReady =
    view === "overview" ? summary !== null : viewQuery.data !== undefined;
  const loading =
    !isViewReady && (isReleasePending || (!releaseError && viewQuery.isLoading));
  const loadError = !isViewReady
    ? (releaseError ?? viewQuery.error ?? serverOverviewQuery.error)
    : null;
  // Without a usable release there is nothing to ask for: retry re-reads it.
  const retryQuery = releaseId === null ? status : viewQuery;

  const headerProjectCount = summary ? filteredAggregates.projectCount : 0;
  const officialAllocatedTotalEur =
    summary?.meta.officialAllocatedTotalEur ?? null;
  const isUsingOfficialHeaderTotal =
    !hasScopedFilters &&
    typeof officialAllocatedTotalEur === "number" &&
    officialAllocatedTotalEur > 0;
  const headerTotalValue = summary
    ? isUsingOfficialHeaderTotal
      ? officialAllocatedTotalEur
      : filteredAggregates.rawTotalValue
    : 0;
  const isHeaderLoading =
    !summary &&
    (isReleasePending || (!releaseError && serverOverviewQuery.isLoading));

  return (
    <div
      className="min-h-screen min-w-0 max-w-full"
      style={{ backgroundColor: "var(--pnrr-bg)" }}
    >
      <PnrrHeader
        projectsCount={headerProjectCount}
        totalValue={headerTotalValue}
        totalValueCurrency={isUsingOfficialHeaderTotal ? "EUR" : "RON"}
        totalValueLabel={
          isUsingOfficialHeaderTotal ? t`total allocated` : t`listed EU funding`
        }
        view={view}
        onViewChange={filterState.setView}
        filterState={filterState}
        beneficiaryNamesByCui={beneficiaryNamesByCui}
        uatLabelsBySiruta={uatLabelsBySiruta}
        isLoading={isHeaderLoading}
        releaseId={releaseId}
        snapshotDate={release?.lanes.find((lane) => lane.lane === "mipe_projects")?.asOf}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] text-[var(--pnrr-fg)] hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)]"
              onClick={() => onInfoSheetOpenChange(true)}
              aria-label={t`Data information`}
            >
              <Info className="h-5 w-5" />
            </Button>
            <PnrrFilterTriggerButton
              activeCount={getActiveFilterCount(search)}
              onClick={() => onFilterSheetOpenChange(true)}
            />

            <div className="hidden sm:block">
              <PnrrExportButton search={search} releaseId={releaseId} />
            </div>
          </div>
        }
      />

      {release && (
        <div
          className="mx-auto max-w-7xl px-4 text-[var(--pnrr-fg)] sm:px-6 lg:px-8"
          data-testid="pnrr-release-source-dates"
        >
          <PnrrReleaseSourceDates release={release} />
        </div>
      )}

      {(summary?.meta.paymentCapability === "degraded" ||
        summary?.meta.indicatorCapability === "degraded") && (
        <div className="mx-auto mt-4 flex max-w-7xl items-start gap-3 border-2 border-[var(--pnrr-orange)] bg-[var(--pnrr-card)] px-4 py-3 text-sm text-[var(--pnrr-fg)] sm:px-6">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--pnrr-orange)]" />
          <div>
            <p className="font-black uppercase tracking-wide">
              <Trans>Partial PNRR data availability</Trans>
            </p>
            <p className="mt-1 text-[var(--pnrr-muted)]">
              <Trans>
                The MIPE project index is available. One or more secondary
                sources are temporarily unavailable, so payment or national
                indicator sections may be incomplete.
              </Trans>
            </p>
          </div>
        </div>
      )}

      {effectiveCurrency && effectiveCurrency !== "RON" && (
        <div className="mx-auto mt-4 flex max-w-7xl items-start gap-3 border-2 border-[var(--pnrr-blue)] bg-[var(--pnrr-card)] px-4 py-3 text-sm text-[var(--pnrr-fg)] sm:px-6">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-[var(--pnrr-blue)]" />
          <div>
            <p className="font-black uppercase tracking-wide">
              <Trans>Estimated currency conversion</Trans>
            </p>
            <p className="mt-1 text-[var(--pnrr-muted)]">
              <Trans>
                Project values are published in RON. EUR and USD displays use
                fixed estimates of 5 RON/EUR and 4.44 RON/USD, not live
                exchange rates. Official EUR indicators remain labeled
                separately.
              </Trans>
            </p>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <main
        id={`pnrr-panel-${view}`}
        role="tabpanel"
        aria-labelledby={`pnrr-tab-${view}`}
        className="mx-auto min-w-0 max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
      >
        {loading ? (
          <PnrrContentSkeleton />
        ) : !isViewReady ? (
          // `loading` and `loadError` do not cover every dataless state: with
          // the default `networkMode: 'online'`, an offline browser parks the
          // query at `fetchStatus: 'paused'`, where `isLoading` and `isError`
          // are both false and `data` is undefined. Without this branch the
          // render would fall through and dereference `undefined`.
          <PnrrDataErrorState
            error={loadError}
            isRetrying={retryQuery.isRefetching}
            onRetry={() => {
              void retryQuery.refetch();
            }}
          />
        ) : view === "overview" ? (
          summary && (
            <PnrrOverview
              aggregates={filteredAggregates}
              filterState={filterState}
              overview={summary.overview}
              officialAllocatedTotalEur={officialAllocatedTotalEur}
            />
          )
        ) : (
          <>
            {view === "projects" && projectPageQuery.data && (
              <PnrrProjectsView
                page={projectPageQuery.data}
                projectRecordCount={filteredAggregates.projectRecordCount}
                filterState={filterState}
                isPageStatePending={projectPageQuery.isPlaceholderData}
              />
            )}
            {view === "map" && mapModelQuery.data && (
              <PnrrMapView
                model={mapModelQuery.data.mapModel}
                filterState={filterState}
              />
            )}
            {view === "beneficiaries" && beneficiaryPageQuery.data && (
              <PnrrBeneficiariesView
                page={beneficiaryPageQuery.data}
                filterState={filterState}
              />
            )}
            {view === "anomalies" && anomalyModelQuery.data && (
              <PnrrAnomaliesView
                model={anomalyModelQuery.data}
                aggregates={filteredAggregates}
                filterState={filterState}
                isPageStatePending={anomalyModelQuery.isPlaceholderData}
              />
            )}
          </>
        )}
      </main>

      {/* Data source disclaimer */}
      <footer
        className="border-t-2 border-[var(--pnrr-border)] py-6"
        style={{ backgroundColor: "var(--pnrr-bg)" }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-[var(--pnrr-muted)]">
            <Trans>Data source</Trans>:{" "}
            <a
              href="https://mfe.gov.ro/pnrr-dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[var(--pnrr-fg)] underline underline-offset-4 hover:text-[var(--pnrr-muted)]"
            >
              <Trans>Ministry of Investments and European Projects</Trans>
            </a>
          </p>
        </div>
      </footer>

      <PnrrInfoSheet
        open={infoSheetOpen}
        onOpenChange={onInfoSheetOpenChange}
        releaseId={releaseId}
      />
      {filterSheetOpen && (
        <PnrrFilterSheet
          open={filterSheetOpen}
          onOpenChange={onFilterSheetOpenChange}
          facets={facetsQuery.data ?? null}
          filterState={filterState}
          showTrigger={false}
        />
      )}
    </div>
  );
}

function PnrrDataErrorState({
  error,
  isRetrying,
  onRetry,
}: {
  readonly error: unknown;
  readonly isRetrying: boolean;
  readonly onRetry: () => void;
}) {
  const errorMessage =
    error instanceof Error ? error.message : t`Error loading data`;

  return (
    <section
      className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-8"
      style={{ borderRadius: "6px" }}
    >
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <div className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] p-4">
          <AlertTriangle className="h-8 w-8 text-[var(--pnrr-orange)]" />
        </div>
        <h2 className="mt-4 text-xl font-black text-[var(--pnrr-fg)]">
          <Trans>Could not load PNRR data</Trans>
        </h2>
        <p className="mt-2 text-sm text-[var(--pnrr-muted)]">
          <Trans>Check the connection and try again.</Trans>
        </p>
        <p className="mt-3 max-w-full break-words border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] px-3 py-2 text-xs text-[var(--pnrr-muted)]">
          {errorMessage}
        </p>
        <Button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="mt-5 h-10 rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-fg)] px-4 text-sm font-black uppercase tracking-wide text-[var(--pnrr-bg)] hover:bg-[var(--pnrr-card)] hover:text-[var(--pnrr-fg)]"
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isRetrying ? "animate-spin" : ""}`}
          />
          <Trans>Retry</Trans>
        </Button>
      </div>
    </section>
  );
}
