import { useMemo, useState } from "react";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { usePnrrWorkerModel } from "../hooks/usePnrrData";
import { usePnrrFilterState } from "../hooks/usePnrrFilterState";
import {
  computeAggregates,
  getActiveFilterCount,
  hasPnrrDataFilters,
  PNRR_FILESET_ID,
} from "../lib/data-transform";
import { PnrrCurrencyProvider } from "../lib/PnrrCurrencyProvider";
import { PnrrContentSkeleton } from "./PnrrSkeleton";
import { PnrrHeader } from "./PnrrHeader";
import { PnrrOverview } from "./tabs/PnrrOverview";
import { PnrrProjectsView } from "./tabs/PnrrProjectsView";
import { PnrrAnomaliesView } from "./tabs/PnrrAnomaliesView";
import { PnrrBeneficiariesView } from "./tabs/PnrrBeneficiariesView";
import { PnrrMapView } from "./PnrrMapView";
import {
  PnrrFilterSheet,
  PnrrFilterTriggerButton,
} from "./filters/PnrrFilterSheet";
import { PnrrInfoSheet } from "./filters/PnrrInfoSheet";
import { PnrrExportButton } from "./table/PnrrExportButton";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Info, RefreshCw } from "lucide-react";
import {
  buildPnrrSeoSnapshotSearchKey,
  type PnrrSeoSnapshot,
} from "../seo/pnrr-seo";
import type { PnrrOverviewMetricStats } from "./tabs/PnrrOverview";
import type { Currency } from "@/schemas/charts";

export function PnrrDashboard({
  initialCurrency,
  ssrSnapshot,
  ssrSnapshotSearchKey,
}: {
  readonly initialCurrency?: Currency;
  readonly ssrSnapshot?: PnrrSeoSnapshot | null;
  readonly ssrSnapshotSearchKey?: string;
}) {
  const filterState = usePnrrFilterState();
  const {
    data,
    error,
    isError,
    isLoading,
    isRefetching,
    refetch,
    isPlaceholderData,
  } = usePnrrWorkerModel(filterState.search);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [infoSheetOpen, setInfoSheetOpen] = useState(false);
  const emptyAggregates = useMemo(() => computeAggregates([]), []);

  const view = filterState.search.view ?? "overview";
  const effectiveCurrency = filterState.search.currency ?? initialCurrency;
  const uatLabelsBySiruta = useMemo(() => {
    const labels = new Map<string, string>();

    for (const uat of data?.filterFacets.uats ?? []) {
      labels.set(uat.value, uat.label);
    }

    return labels;
  }, [data?.filterFacets.uats]);
  const beneficiaryNamesByCui = useMemo(() => {
    const labels = new Map<string, string>();

    for (const beneficiary of data?.beneficiaryPage.rows ?? []) {
      if (!beneficiary.cui || !beneficiary.name) continue;

      const cui = beneficiary.cui.replace(/\D/g, "");
      if (!cui) continue;

      const existing = labels.get(cui);
      if (!existing || beneficiary.name.localeCompare(existing, "ro") < 0) {
        labels.set(cui, beneficiary.name);
      }
    }

    return labels;
  }, [data?.beneficiaryPage.rows]);
  const hasScopedFilters = hasPnrrDataFilters(filterState.search);

  const filteredAggregates = data?.overview.aggregates ?? emptyAggregates;

  const loading = isLoading;
  const loadError = isError && !data ? error : null;
  const currentSnapshotSearchKey = useMemo(
    () => buildPnrrSeoSnapshotSearchKey(filterState.search),
    [filterState.search],
  );
  const activeSsrSnapshot =
    ssrSnapshotSearchKey === currentSnapshotSearchKey ? ssrSnapshot : null;
  const headerProjectCount = data
    ? filteredAggregates.projectCount
    : (activeSsrSnapshot?.projectCount ?? 0);
  const officialAllocatedTotalEur =
    data?.meta?.officialAllocatedTotalEur ??
    activeSsrSnapshot?.officialAllocatedTotalEur ??
    null;
  const isUsingOfficialHeaderTotal =
    !hasScopedFilters &&
    typeof officialAllocatedTotalEur === "number" &&
    officialAllocatedTotalEur > 0;
  const headerTotalValue = data
    ? isUsingOfficialHeaderTotal
      ? officialAllocatedTotalEur
      : filteredAggregates.rawTotalValue
    : isUsingOfficialHeaderTotal
      ? officialAllocatedTotalEur
      : (activeSsrSnapshot?.listedFundingTotalRon ?? 0);
  const hasCachedHeaderStats = loading && !data && activeSsrSnapshot != null;
  const cachedOverviewStats = activeSsrSnapshot
    ? buildCachedOverviewStats(activeSsrSnapshot)
    : null;
  const shouldRenderCachedOverview =
    loading && !data && view === "overview" && cachedOverviewStats != null;

  return (
    <PnrrCurrencyProvider
      currency={filterState.search.currency}
      initialCurrency={effectiveCurrency}
    >
      <div
        className="min-h-screen min-w-0 max-w-full"
        style={{ backgroundColor: "var(--pnrr-bg)" }}
      >
        <PnrrHeader
          projectsCount={headerProjectCount}
          totalValue={headerTotalValue}
          totalValueCurrency={isUsingOfficialHeaderTotal ? "EUR" : "RON"}
          totalValueLabel={
            isUsingOfficialHeaderTotal
              ? t`total allocated`
              : t`listed EU funding`
          }
          view={view}
          onViewChange={filterState.setView}
          filterState={filterState}
          beneficiaryNamesByCui={beneficiaryNamesByCui}
          uatLabelsBySiruta={uatLabelsBySiruta}
          isLoading={loading && !hasCachedHeaderStats}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] text-[var(--pnrr-fg)] hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)]"
                onClick={() => setInfoSheetOpen(true)}
                aria-label={t`Data information`}
              >
                <Info className="h-5 w-5" />
              </Button>
              <PnrrFilterTriggerButton
                activeCount={getActiveFilterCount(filterState.search)}
                onClick={() => setFilterSheetOpen(true)}
              />

              <div className="hidden sm:block">
                <PnrrExportButton
                  search={filterState.search}
                  fileSetId={PNRR_FILESET_ID}
                />
              </div>
            </div>
          }
        />

        {(data?.meta.paymentCapability === "degraded" ||
          data?.meta.indicatorCapability === "degraded") && (
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
          {shouldRenderCachedOverview ? (
            <PnrrOverview
              aggregates={emptyAggregates}
              filterState={filterState}
              cachedStats={cachedOverviewStats}
              officialAllocatedTotalEur={
                activeSsrSnapshot?.officialAllocatedTotalEur ?? null
              }
              isLoadingFullData
            />
          ) : loading ? (
            <PnrrContentSkeleton />
          ) : !data ? (
            // `loading` and `loadError` do not cover every dataless state: with
            // the default `networkMode: 'online'`, an offline browser parks the
            // query at `fetchStatus: 'paused'`, where `isLoading` and `isError`
            // are both false and `data` is undefined. Without this branch the
            // render would fall through and dereference `undefined`.
            <PnrrDataErrorState
              error={loadError}
              isRetrying={isRefetching}
              onRetry={() => {
                void refetch();
              }}
            />
          ) : (
            <>
              {view === "overview" && (
                <PnrrOverview
                  aggregates={filteredAggregates}
                  filterState={filterState}
                  overview={data.overview}
                  officialAllocatedTotalEur={officialAllocatedTotalEur}
                />
              )}
              {view === "projects" && (
                <PnrrProjectsView
                  page={data.projectPage}
                  projectRecordCount={filteredAggregates.projectRecordCount}
                  filterState={filterState}
                  isPageStatePending={isPlaceholderData}
                />
              )}
              {view === "map" && (
                <PnrrMapView model={data.mapModel} filterState={filterState} />
              )}
              {view === "beneficiaries" && (
                <PnrrBeneficiariesView
                  page={data.beneficiaryPage}
                  filterState={filterState}
                />
              )}
              {view === "anomalies" && (
                <PnrrAnomaliesView
                  model={data.anomalyModel}
                  aggregates={filteredAggregates}
                  filterState={filterState}
                  isPageStatePending={isPlaceholderData}
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

        <PnrrInfoSheet open={infoSheetOpen} onOpenChange={setInfoSheetOpen} />
        {filterSheetOpen && (
          <PnrrFilterSheet
            open={filterSheetOpen}
            onOpenChange={setFilterSheetOpen}
            facets={data?.filterFacets ?? null}
            filterState={filterState}
            showTrigger={false}
          />
        )}
      </div>
    </PnrrCurrencyProvider>
  );
}

function buildCachedOverviewStats(
  snapshot: PnrrSeoSnapshot,
): PnrrOverviewMetricStats {
  return {
    rawTotalValue: snapshot.listedFundingTotalRon,
    deduplicatedTotalValue: snapshot.deduplicatedListedFundingRon,
    projectCount: snapshot.projectCount,
    projectRecordCount: snapshot.projectRecordCount,
    completedCount: snapshot.completedCount,
    completedValue: snapshot.completedListedFundingRon,
    loanTotal: snapshot.loanListedFundingRon,
    loanPercent: snapshot.loanPercent,
    missingFinProgressCount: snapshot.missingFinancialProgressCount,
    missingFinProgressPercent: snapshot.missingFinancialProgressPercent,
  };
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
