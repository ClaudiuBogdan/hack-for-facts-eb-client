import { isInsChartPeriodicity } from "@/lib/ins/source-contract";
import {
  periodAtOrdinal,
  periodOrdinal,
  validPeriodDate,
} from "@/lib/ins/source-periods";
import type { ReportPeriodInput, ReportPeriodType } from "@/schemas/reporting";
import type { NativeInsObservation } from "@/schemas/ins";
import type { PreparedEntityInsSource } from "../api/native-entity-ins-api";
import { validateEntityInsVector } from "../api/native-entity-ins-api";
import { CHART_MAX_POINTS } from "./dataset-selection";
import type { InsSourceVector } from "@/lib/ins/source-pages";

function selectedPeriods(report: ReportPeriodInput): readonly string[] {
  const { dates, interval } = report.selection;
  if (dates !== undefined) {
    if (
      interval !== undefined ||
      dates.length === 0 ||
      new Set(dates).size !== dates.length ||
      dates.some((date) => !validPeriodDate(date, report.type))
    )
      throw new RangeError("Invalid INS selected periods");
    return dates;
  }
  if (
    !interval ||
    !validPeriodDate(interval.start, report.type) ||
    !validPeriodDate(interval.end, report.type)
  )
    throw new RangeError("Invalid INS selected interval");
  const first = periodOrdinal(interval.start, report.type);
  const last = periodOrdinal(interval.end, report.type);
  if (last < first) throw new RangeError("Reversed INS selected interval");
  return Array.from({ length: last - first + 1 }, (_, index) =>
    periodAtOrdinal(first + index, report.type),
  );
}

/** Full source identity is validated before cadence; periods are cells, never an implicit sum. */
export function projectEntityInsHistory(
  prepared: PreparedEntityInsSource,
  history: InsSourceVector<NativeInsObservation> & {
    readonly mode: "complete" | "inspection";
    readonly truncated: boolean;
  },
  report: ReportPeriodInput,
) {
  const inspected = validateEntityInsVector(prepared, history);
  const original = {
    observations: history.observations,
    descriptor: history.descriptor,
  };
  if (
    history.mode !== "complete" ||
    history.truncated ||
    !prepared.resolved.canDerive
  )
    return { ...original, status: "INSPECTION" as const };
  if (inspected.status !== "SERIES")
    return { ...original, status: inspected.status };
  if (inspected.anyQualified)
    return { ...original, status: "QUALIFIED" as const };
  const cadence = prepared.resolved.scope.periodicity;
  if (!cadence || !isInsChartPeriodicity(cadence))
    return { ...original, status: "UNSUPPORTED_CADENCE" as const };
  const rows = history.observations.filter(
    (row) => row.time_period.periodicity === cadence,
  );
  if (rows.length === 0)
    return { ...original, status: "EMPTY_CADENCE" as const };
  const type: ReportPeriodType =
    cadence === "ANNUAL"
      ? "YEAR"
      : cadence === "QUARTERLY"
        ? "QUARTER"
        : "MONTH";
  const ordered = [...rows].sort(
    (a, b) =>
      periodOrdinal(a.time_period.iso_period, type) -
      periodOrdinal(b.time_period.iso_period, type),
  );
  const byPeriod = new Map(
    ordered.map((row) => [row.time_period.iso_period, row]),
  );
  const first = periodOrdinal(ordered[0].time_period.iso_period, type);
  const last = periodOrdinal(
    ordered[ordered.length - 1].time_period.iso_period,
    type,
  );
  const shownFirst = Math.max(first, last - CHART_MAX_POINTS + 1);
  // Bound to actual source endpoints before the chart-only cap; never add future periods.
  const chart = rows.some(
    (row) => row.value !== null && !Number.isFinite(Number(row.value)),
  )
    ? null
    : {
        truncated: shownFirst > first,
        points: Array.from({ length: last - shownFirst + 1 }, (_, index) => {
          const period = periodAtOrdinal(shownFirst + index, type);
          const row = byPeriod.get(period);
          return {
            period,
            value:
              row?.value === null || row?.value === undefined
                ? null
                : Number(row.value),
            raw: row?.value ?? null,
            valueStatus: row?.value_status ?? null,
          };
        }),
      };
  const selected: {
    readonly period: string;
    readonly observation: NativeInsObservation | null;
  }[] =
    report.type === type
      ? selectedPeriods(report).map((period) => ({
          period,
          observation: byPeriod.get(period) ?? null,
        }))
      : [];
  return {
    ...original,
    status: "SERIES" as const,
    cadence,
    chart,
    latest: ordered[ordered.length - 1],
    selected,
    selectedPeriodStatus:
      report.type === type
        ? ("MATCHED" as const)
        : ("CADENCE_MISMATCH" as const),
  };
}
