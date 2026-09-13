import { useQuery } from "@tanstack/react-query";
import { Trans } from "@lingui/react/macro";
import { CommitmentsDashboard, type CommitmentsViewProps } from "./Commitments";
import { fetchCommitmentDashboard } from "@/lib/api/commitment-dashboard";
import { normalizeNormalizationOptions } from "@/lib/normalization";
import { buildCommitmentsFilter } from "@/lib/api/commitments";
import {
  dashboardPeriodLabels,
  selectDashboardRows,
  sumDashboardAmounts,
  dashboardCategories,
  dashboardDrill,
  dashboardTrends,
} from "./native-commitments-model";
export function NativeCommitmentsView(props: CommitmentsViewProps) {
  const {
    entity,
    currentYear,
    reportPeriod,
    trendPeriod,
    reportType,
    mainCreditorCui,
    normalizationOptions,
  } = props;
  const normalized = normalizeNormalizationOptions(normalizationOptions);
  const selectedType =
    reportType ?? entity?.default_report_type ?? "PRINCIPAL_AGGREGATED";
  const labels = dashboardPeriodLabels(trendPeriod);
  const years = labels.map((label) => Number(label.slice(0, 4)));
  const input = {
    cui: entity?.cui ?? "",
    mainCreditorCui,
    detailYear: currentYear,
    yearFrom: Math.min(currentYear, ...years),
    yearTo: Math.max(currentYear, ...years),
    frequency: reportPeriod.type,
    reportType: selectedType,
    normalization: normalized.normalization.toUpperCase(),
    currency: normalized.currency,
    inflationAdjusted: normalized.inflation_adjusted,
  };
  const query = useQuery({
    queryKey: ["entity-commitment-dashboard", input],
    queryFn: ({ signal }) => fetchCommitmentDashboard(input, signal),
    enabled: !!entity?.cui,
    staleTime: 60_000,
  });
  const rows = query.isError ? [] : (query.data?.rows ?? []);
  const selected = selectDashboardRows(rows, reportPeriod);
  const sums = sumDashboardAmounts(selected);
  const unavailable = Object.values(sums).some((value) => value === null);
  const categories = unavailable
    ? []
    : dashboardCategories(
        selected,
        props.commitmentsGrouping ?? "fn",
        props.commitmentsDetailLevel === "detailed" ? 2 : 1,
      );
  const [
    budgetTrend,
    commitmentsTrend,
    paymentsTrezorTrend,
    paymentsNonTrezorTrend,
  ] = dashboardTrends(rows, trendPeriod);
  const filter = buildCommitmentsFilter({
    cui: input.cui,
    reportType: selectedType,
    reportPeriod,
    normalization: normalized.normalization,
    currency: normalized.currency,
    inflationAdjusted: normalized.inflation_adjusted,
    excludeTransfers: true,
  });
  const first = selected.some((row) => row.firstReportMonth !== null)
    ? Math.min(...selected.map((row) => row.firstReportMonth ?? 12))
    : null;
  const last = selected.some((row) => row.lastReportMonth !== null)
    ? Math.max(...selected.map((row) => row.lastReportMonth ?? 1))
    : null;
  return (
    <CommitmentsDashboard
      {...props}
      totalBudget={sums.budget ?? 0}
      commitmentAuthority={sums.authority ?? 0}
      committed={sums.committed ?? 0}
      paid={(sums.paidTreasury ?? 0) + (sums.paidNonTreasury ?? 0)}
      categoryData={categories}
      categoryChartData={[...categories]
        .sort((a, b) => b.budget - a.budget)
        .slice(0, 20)}
      isSummaryLoading={query.isPending}
      hasNoSummary={unavailable}
      isCategoryLoading={query.isPending}
      isCategoryError={query.isError || unavailable}
      isAnalyticsLoading={query.isPending}
      budgetTrend={budgetTrend}
      commitmentsTrend={commitmentsTrend}
      paymentsTrezorTrend={paymentsTrezorTrend}
      paymentsNonTrezorTrend={paymentsNonTrezorTrend}
      commitmentsChartLink={null}
      filter={filter}
      getSubRows={dashboardDrill(selected)}
      preserveGaps
      headerSlot={
        <>
          {props.headerSlot}
          {first !== null && last !== null && reportPeriod.type === "YEAR" && (
            <p className="text-sm text-muted-foreground">
              <Trans>Latest published financial reports by sector:</Trans>{" "}
              {currentYear}-{String(first).padStart(2, "0")}
              {last !== first
                ? ` – ${currentYear}-${String(last).padStart(2, "0")}`
                : ""}
            </p>
          )}
          {unavailable && !query.isPending && (
            <p role="status" className="text-sm text-muted-foreground">
              <Trans>
                Verified values are unavailable for the selected period or
                normalization.
              </Trans>
            </p>
          )}
        </>
      }
    />
  );
}
