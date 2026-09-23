import { useEffect, useState } from "react";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createLogger } from "@/lib/logger";
import type { NativeInsObservation } from "@/schemas/ins";
import type { ReportPeriodInput } from "@/schemas/reporting";
import type { PreparedEntityInsSource } from "../../api/native-entity-ins-api";
import type { InsSourceVector } from "@/lib/ins/source-pages";
import { projectEntityInsHistory } from "../../lib/entity-ins-history";
import {
  EntityInsHistoryChart,
  EntityInsObservationsTable,
} from "@/components/entities/views/ins-stats-view.presentation";
import { DetailExportButton } from "../detail-export-button";
import { ValueStatusMarker } from "../value-status-legend";

const logger = createLogger("entity-ins-history");
const TABLE_PAGE_SIZE = 50;

type History = InsSourceVector<NativeInsObservation> & {
  readonly mode: "complete" | "inspection";
  readonly truncated: boolean;
};
function projectSafely(
  prepared: PreparedEntityInsSource,
  history: History,
  report: ReportPeriodInput,
) {
  try {
    return {
      projection: projectEntityInsHistory(prepared, history, report),
      error: null,
    };
  } catch (error) {
    return { projection: null, error };
  }
}
function OriginalValue({
  observation,
}: {
  readonly observation: NativeInsObservation | null;
}) {
  return (
    <span className="min-w-0 break-all tabular-nums">
      {observation?.value ?? "—"}
      {observation && observation.value_status != null ? (
        <ValueStatusMarker status={observation.value_status} />
      ) : null}
      {!observation ? (
        <span className="ml-2 text-xs text-muted-foreground">
          <Trans>No observation</Trans>
        </span>
      ) : null}
    </span>
  );
}
function PageControls({
  offset,
  length,
  onPage,
}: {
  readonly offset: number;
  readonly length: number;
  readonly onPage: (offset: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
      <span>
        <Trans>{length} observations in this selection</Trans>
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={offset === 0}
          onClick={() => onPage(Math.max(0, offset - TABLE_PAGE_SIZE))}
        >
          <Trans>Previous observations</Trans>
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={offset + TABLE_PAGE_SIZE >= length}
          onClick={() => onPage(offset + TABLE_PAGE_SIZE)}
        >
          <Trans>Next observations</Trans>
        </Button>
      </div>
    </div>
  );
}

/** Original history is paged for presentation only; export retains every fetched source row. */
export function EntityInsSourceHistory({
  prepared,
  history,
  reportPeriod,
}: {
  readonly prepared: PreparedEntityInsSource;
  readonly history: History;
  readonly reportPeriod: ReportPeriodInput;
}) {
  const [offset, setOffset] = useState(0);
  const [selectedOffset, setSelectedOffset] = useState(0);
  const { projection, error } = projectSafely(prepared, history, reportPeriod);
  const chartTruncated =
    projection?.status === "SERIES" && projection.chart?.truncated;
  useEffect(() => {
    if (chartTruncated)
      logger.info("INS chart uses the latest bounded history window", {
        datasetCode: prepared.dataset.code,
      });
    if (history.truncated)
      logger.info("INS inspection is a partial preview", {
        datasetCode: prepared.dataset.code,
        rows: history.observations.length,
      });
    if (history.observations.length > TABLE_PAGE_SIZE)
      logger.info("INS table uses presentation pagination", {
        datasetCode: prepared.dataset.code,
        pageSize: TABLE_PAGE_SIZE,
        rows: history.observations.length,
      });
  }, [
    chartTruncated,
    history.truncated,
    history.observations.length,
    prepared.dataset.code,
  ]);
  useEffect(() => {
    if (error) logger.error("INS history projection failed", { error });
  }, [error]);
  if (!projection)
    return (
      <p role="alert">
        <Trans>
          We could not verify the source history for this selection. Refresh the
          source before continuing.
        </Trans>
      </p>
    );
  const shownOffset = Math.min(
    offset,
    Math.max(
      0,
      Math.floor((history.observations.length - 1) / TABLE_PAGE_SIZE) *
        TABLE_PAGE_SIZE,
    ),
  );
  const sourceHref = `http://statistici.insse.ro/tempoins/index.jsp?${new URLSearchParams({ ind: prepared.dataset.code, lang: "ro", page: "tempo3" })}`;
  const sourceLink = (
    <a
      className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
      href={sourceHref}
      target="_blank"
      rel="noopener noreferrer"
    >
      <Trans>View source on INS Tempo</Trans>
      <ExternalLink className="size-3" aria-hidden="true" />
    </a>
  );
  return (
    <div className="space-y-5">
      {history.mode === "inspection" ? (
        <p role="status">
          <Trans>
            Source inspection: choose all dimensions and a unit to view a single
            series.
          </Trans>
        </p>
      ) : null}
      {history.truncated ? (
        <p role="status">
          <Trans>
            This preview is incomplete. Narrow the source selection to load and
            export its full history.
          </Trans>
        </p>
      ) : null}
      {projection.status === "SERIES" ? (
        <>
          {/* Two tiles on one row: the source's latest reading, and the reading
              for each selected budget period. They were a loose stack of
              headings, a bare link and unlabelled numbers; as tiles with the
              same small-caps header as the series selector they read as one
              panel. Values stay the source's own digits (`OriginalValue`). */}
          <div className="grid gap-3 md:grid-cols-2">
            <section
              className="flex flex-col rounded-xl border border-border/60 bg-muted/30 p-4"
              aria-label={t`Latest INS observation`}
            >
              <h3 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                <Trans>Latest source observation</Trans>
              </h3>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-2xl font-bold leading-none tracking-tight text-foreground">
                  <OriginalValue observation={projection.latest} />
                </span>
                <span className="text-sm text-muted-foreground">
                  {projection.latest.unit.name_ro ?? projection.latest.unit.code}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {projection.latest.time_period.iso_period} ·{" "}
                {prepared.context.territoryName} · {prepared.dataset.code}
              </p>
              <div className="mt-auto pt-3">{sourceLink}</div>
            </section>
            <section
              className="rounded-xl border border-border/60 bg-muted/30 p-4"
              aria-label={t`Selected INS periods`}
            >
              <h3 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                <Trans>Selected periods</Trans>
              </h3>
              {projection.selectedPeriodStatus === "CADENCE_MISMATCH" ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  <Trans>
                    The selected budget period uses a different frequency. Choose
                    matching periods to see the corresponding INS observations.
                  </Trans>
                </p>
              ) : (
                <>
                  <dl className="mt-2 divide-y divide-border/60">
                    {projection.selected
                      .slice(selectedOffset, selectedOffset + TABLE_PAGE_SIZE)
                      .map((cell) => (
                        <div
                          key={cell.period}
                          className="flex items-baseline justify-between gap-4 py-1.5 text-sm"
                        >
                          <dt className="font-medium text-foreground">{cell.period}</dt>
                          <dd className="min-w-0 break-all text-right font-semibold tabular-nums text-foreground">
                            <OriginalValue observation={cell.observation} />
                          </dd>
                        </div>
                      ))}
                  </dl>
                  <p className="mt-2 text-xs text-muted-foreground">
                    <Trans>
                      Each period is shown separately. Values from different
                      periods are not added.
                    </Trans>
                  </p>
                  {projection.selected.length > TABLE_PAGE_SIZE ? (
                    <PageControls
                      offset={selectedOffset}
                      length={projection.selected.length}
                      onPage={setSelectedOffset}
                    />
                  ) : null}
                </>
              )}
            </section>
          </div>
          {projection.chart?.truncated && (
            <p className="text-xs text-muted-foreground">
              <Trans>
                The chart shows the latest periods. Earlier observations remain
                in the table and export.
              </Trans>
            </p>
          )}
          {projection.chart?.points.some((point) => point.value !== null) ? (
            <EntityInsHistoryChart
              data={projection.chart.points.map((point) => ({
                period: point.period,
                numericValue: point.value,
                rawValue: point.raw,
                statusLabel: point.valueStatus,
              }))}
              renderTooltip={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const entry = payload[0] as {
                  payload?: {
                    period: string;
                    rawValue: string | null;
                    statusLabel: string | null;
                  };
                };
                const point = entry.payload;
                return point ? (
                  <div className="rounded-lg border bg-popover p-3 text-sm text-popover-foreground shadow-lg">
                    <p className="font-semibold">{point.period}</p>
                    <p>
                      {point.rawValue ?? "—"}{" "}
                      {projection.latest.unit.name_ro ??
                        projection.latest.unit.code}
                    </p>
                    {point.statusLabel && <p>{point.statusLabel}</p>}
                  </div>
                ) : null;
              }}
            />
          ) : (
            <p>
              <Trans>
                No numeric chart is available for this source history. Original
                observations remain below.
              </Trans>
            </p>
          )}
        </>
      ) : (
        <div className="space-y-2">
          <p role="status">
            <Trans>
              A single comparable series is not available for this selection.
              Inspect the original source rows and their qualifications below.
            </Trans>
          </p>
          {sourceLink}
        </div>
      )}
      <section className="space-y-3" aria-label={t`Original INS observations`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h3 className="text-sm font-semibold">
            <Trans>Original source observations</Trans>
          </h3>
          <DetailExportButton
            datasetCode={prepared.dataset.code}
            observations={history.observations}
            sourceDescriptor={history.descriptor}
            disabled={history.observations.length === 0}
            complete={!history.truncated}
          />
        </div>
        {history.observations.length ? (
          <>
            <EntityInsObservationsTable
              rows={history.observations.slice(
                shownOffset,
                shownOffset + TABLE_PAGE_SIZE,
              )}
              hasMultiValueSeriesSelection={false}
            />
            <PageControls
              offset={shownOffset}
              length={history.observations.length}
              onPage={setOffset}
            />
          </>
        ) : (
          <p>
            <Trans>
              No observations were found for this entity and source selection.
            </Trans>
          </p>
        )}
      </section>
    </div>
  );
}
