import { useEffect, useState } from "react";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { Button } from "@/components/ui/button";
import { createLogger } from "@/lib/logger";
import type { EntityInsSelectionInput } from "@/lib/ins/entity-source-search";
import type { NativeInsObservation } from "@/schemas/ins";
import type { ReportPeriodInput } from "@/schemas/reporting";
import type { PreparedEntityInsSource } from "../api/native-entity-ins-api";
import type { InsSourceVector } from "@/lib/ins/source-pages";
import { projectEntityInsHistory } from "../lib/entity-ins-history";
import { entityInsSourcePatch } from "../lib/entity-ins-selection";
import { DetailObservationsChart } from "./detail-observations-chart";
import { DetailObservationsTable } from "./detail-observations-table";
import { DetailExportButton } from "./detail-export-button";
import { ValueStatusMarker } from "./detail-value-status-legend";

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
  onChange,
}: {
  readonly prepared: PreparedEntityInsSource;
  readonly history: History;
  readonly reportPeriod: ReportPeriodInput;
  readonly onChange: (patch: EntityInsSelectionInput) => void;
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
  const selectSource = (row: NativeInsObservation) =>
    onChange(
      entityInsSourcePatch({
        insSourcePins: row.classifications.map(
          (value) => `${value.type_code}:${value.code}`,
        ),
        insSourceUnit: row.unit.code,
        insSourceCadence: row.time_period.periodicity,
      }),
    );
  const shownOffset = Math.min(
    offset,
    Math.max(
      0,
      Math.floor((history.observations.length - 1) / TABLE_PAGE_SIZE) *
        TABLE_PAGE_SIZE,
    ),
  );
  return (
    <div className="space-y-6">
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
          <section className="space-y-2" aria-label={t`Latest INS observation`}>
            <h3 className="text-xs font-semibold text-muted-foreground">
              <Trans>Latest source observation</Trans>
            </h3>
            <div className="text-lg font-semibold">
              <OriginalValue observation={projection.latest} />{" "}
              <span className="text-sm font-normal">
                {projection.latest.unit.name_ro ?? projection.latest.unit.code}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {projection.latest.time_period.iso_period} ·{" "}
              {prepared.context.territoryName} · {prepared.dataset.code}
            </p>
          </section>
          <section className="space-y-2" aria-label={t`Selected INS periods`}>
            <h3 className="text-sm font-semibold">
              <Trans>Selected periods</Trans>
            </h3>
            {projection.selectedPeriodStatus === "CADENCE_MISMATCH" ? (
              <p>
                <Trans>
                  The selected budget period uses a different frequency. Choose
                  matching periods to see the corresponding INS observations.
                </Trans>
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  <Trans>
                    Each period is shown separately. Values from different
                    periods are not added.
                  </Trans>
                </p>
                <dl className="divide-y rounded-md border px-3">
                  {projection.selected
                    .slice(selectedOffset, selectedOffset + TABLE_PAGE_SIZE)
                    .map((cell) => (
                      <div
                        key={cell.period}
                        className="flex justify-between gap-4 py-2 text-sm"
                      >
                        <dt>{cell.period}</dt>
                        <dd className="min-w-0 break-all text-right">
                          <OriginalValue observation={cell.observation} />
                        </dd>
                      </div>
                    ))}
                </dl>
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
          {projection.chart?.points.some((point) => point.value !== null) ? (
            <DetailObservationsChart
              wholeHistory
              series={projection.chart}
              title={t`INS source history`}
              unitLabel={
                projection.latest.unit.name_ro ?? projection.latest.unit.code
              }
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
        <p role="status">
          <Trans>
            A single comparable series is not available for this selection.
            Inspect the original source rows and their qualifications below.
          </Trans>
        </p>
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
            <DetailObservationsTable
              observations={history.observations.slice(
                shownOffset,
                shownOffset + TABLE_PAGE_SIZE,
              )}
              sourceDescriptor={history.descriptor}
              onSelectSource={(row) => {
                const original = history.observations.find(
                  (value) => value.id === row.id,
                );
                if (original) selectSource(original);
              }}
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
