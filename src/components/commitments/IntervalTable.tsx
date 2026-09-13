import { useQuery } from "@tanstack/react-query";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import {
  fetchCommitmentPeriods,
  formatCommitmentAmount,
} from "@/lib/api/commitment-periods";
import { Button } from "@/components/ui/button";
import type { ReportPeriodInput } from "@/schemas/reporting";
import { dashboardPeriodLabels } from "@/components/entities/views/native-commitments-model";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function CommitmentIntervalTable({
  cui,
  year,
  reportType,
  reportPeriod,
  selection = {},
  onSelectionChange,
}: {
  cui: string;
  year: number;
  reportType: string;
  reportPeriod?: ReportPeriodInput;
  selection?: import("@/lib/api/commitment-periods").CommitmentPeriodSelection;
  onSelectionChange?: (
    patch: import("@/lib/api/commitment-periods").CommitmentPeriodSelection,
  ) => void;
}) {
  const search = selection;
  const labels = reportPeriod ? dashboardPeriodLabels(reportPeriod) : [];
  const monthOf = (label: string, end: boolean) =>
    reportPeriod?.type === "YEAR"
      ? end
        ? 12
        : 1
      : reportPeriod?.type === "QUARTER"
        ? Number(label.slice(-1)) * 3 - (end ? 0 : 2)
        : Number(label.slice(-2));
  const startMonth = labels.length ? monthOf(labels[0], false) : 1;
  const endMonth = labels.length
    ? monthOf(labels[labels.length - 1], true)
    : 12;
  const page = search.commitments_period_page ?? 1;
  const update = (values: Partial<typeof search>) =>
    onSelectionChange?.(values);
  const query = useQuery({
    queryKey: [
      "commitment-periods",
      cui,
      year,
      reportType,
      startMonth,
      endMonth,
      page,
    ],
    queryFn: ({ signal }) =>
      fetchCommitmentPeriods(
        { cui, year, reportType, startMonth, endMonth, page },
        signal,
      ),
    enabled: startMonth <= endMonth,
    staleTime: 60_000,
  });
  const data = query.data;
  const date = (month: number) => `${year}-${String(month).padStart(2, "0")}`;
  return (
    <section className="space-y-3" aria-label={t`Reported intervals`}>
      <h3 className="text-lg font-semibold">
        <Trans>Reported intervals</Trans>
      </h3>
      <p className="text-sm text-muted-foreground">
        <Trans>
          Nominal RON, excluding transfers. Each row keeps its full reported
          interval. Overlapping intervals must not be added together.
        </Trans>
      </p>
      {startMonth > endMonth ? (
        <p role="alert">
          <Trans>The starting month must not follow the ending month.</Trans>
        </p>
      ) : query.isPending ? (
        <p role="status">
          <Trans>Loading reported intervals…</Trans>
        </p>
      ) : query.isError ? (
        <div role="alert">
          <Trans>Reported intervals could not be loaded.</Trans>{" "}
          <Button variant="outline" onClick={() => void query.refetch()}>
            <Trans>Try again</Trans>
          </Button>
        </div>
      ) : !data?.metadataAvailable ? (
        <p>
          <Trans>
            Verified interval data is not available for this selection yet.
          </Trans>
        </p>
      ) : (
        <>
          {data.earliestTerminalMonth !== null &&
            data.latestTerminalMonth !== null && (
              <p className="text-sm text-muted-foreground">
                <Trans>Latest published financial reports by sector:</Trans>{" "}
                {date(data.earliestTerminalMonth)}
                {data.earliestTerminalMonth !== data.latestTerminalMonth
                  ? ` – ${date(data.latestTerminalMonth)}`
                  : ""}
                .
                {data.earliestTerminalMonth < 12 && (
                  <>
                    {" "}
                    <Trans>
                      Some sectors do not have a December financial report.
                    </Trans>
                  </>
                )}
              </p>
            )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Trans>Interval</Trans>
                </TableHead>
                <TableHead>
                  <Trans>Sector / creditor</Trans>
                </TableHead>
                <TableHead className="text-right">
                  <Trans>Commitments</Trans>
                </TableHead>
                <TableHead className="text-right">
                  <Trans>Treasury payments</Trans>
                </TableHead>
                <TableHead className="text-right">
                  <Trans>Non-treasury payments</Trans>
                </TableHead>
                <TableHead>
                  <Trans>Source</Trans>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((row) => (
                <TableRow key={row.reportId}>
                  <TableCell>
                    {row.startMonth === null
                      ? date(row.endMonth)
                      : `${date(row.startMonth)} – ${date(row.endMonth)}`}
                    {row.startMonth === null && (
                      <div className="text-xs text-muted-foreground">
                        <Trans>No admitted financial amounts</Trans>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {row.sectorId} / {row.creditorCui ?? "—"}
                  </TableCell>
                  {[
                    "credite_angajament",
                    "plati_trezor",
                    "plati_non_trezor",
                  ].map((metric) => (
                    <TableCell
                      key={metric}
                      className="text-right tabular-nums whitespace-nowrap"
                    >
                      {formatCommitmentAmount(
                        row.amounts.find((a) => a.metric === metric)?.interval,
                      )}
                    </TableCell>
                  ))}
                  <TableCell>
                    <a
                      className="underline"
                      href={row.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Trans>Report</Trans>
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.items.length === 0 && (
            <p>
              <Trans>
                No reports on this page for the selected ending months.
              </Trans>
            </p>
          )}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => update({ commitments_period_page: page - 1 })}
            >
              <Trans>Previous</Trans>
            </Button>
            <span className="text-sm">
              {page} / {Math.max(1, Math.ceil(data.total / 25))}
            </span>
            <Button
              variant="outline"
              disabled={page * 25 >= data.total}
              onClick={() => update({ commitments_period_page: page + 1 })}
            >
              <Trans>Next</Trans>
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
