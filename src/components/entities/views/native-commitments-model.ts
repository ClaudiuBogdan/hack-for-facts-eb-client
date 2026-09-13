import Decimal from "decimal.js";
import type { CommitmentDashboardRow } from "@/lib/api/commitment-dashboard";
import type { ReportPeriodInput } from "@/schemas/reporting";
import type { CategoryData } from "@/components/commitments/CategoryChart";
import type {
  Grouping,
  LocalCommitmentDrill,
} from "@/components/commitments/DetailTable";
import type { CommitmentTrend } from "@/components/commitments/commitments-trends";
import { getCodeAtDepth } from "@/lib/utils";
import { getClassificationName } from "@/lib/classifications";
import { getEconomicClassificationName } from "@/lib/economic-classifications";
const Exact = Decimal.clone({ precision: 80 });
export const dashboardAmountKeys = [
  "budget",
  "authority",
  "committed",
  "paidTreasury",
  "paidNonTreasury",
] as const;
export function sumDashboardAmounts(rows: readonly CommitmentDashboardRow[]) {
  return Object.fromEntries(
    dashboardAmountKeys.map((key) => [
      key,
      rows.length === 0 || rows.some((row) => row[key] === null)
        ? null
        : rows
            .reduce((sum, row) => sum.plus(row[key]!), new Exact(0))
            .toNumber(),
    ]),
  ) as Record<(typeof dashboardAmountKeys)[number], number | null>;
}
export function dashboardPeriodLabel(
  row: Pick<CommitmentDashboardRow, "year" | "period">,
  type: ReportPeriodInput["type"],
) {
  return type === "YEAR"
    ? String(row.year)
    : type === "QUARTER"
      ? `${row.year}-Q${row.period}`
      : `${row.year}-${String(row.period).padStart(2, "0")}`;
}
export function dashboardPeriodLabels(period: ReportPeriodInput): string[] {
  if (period.selection.dates) return [...period.selection.dates];
  const { start, end } = period.selection.interval!;
  const values: string[] = [];
  for (
    let year = Number(start.slice(0, 4));
    year <= Number(end.slice(0, 4));
    year++
  ) {
    for (
      let n = 1;
      n <= (period.type === "YEAR" ? 1 : period.type === "QUARTER" ? 4 : 12);
      n++
    ) {
      const label = dashboardPeriodLabel({ year, period: n }, period.type);
      if (label >= start && label <= end) values.push(label);
    }
  }
  return values;
}
export function selectDashboardRows(
  rows: readonly CommitmentDashboardRow[],
  period: ReportPeriodInput,
) {
  const labels = dashboardPeriodLabels(period);
  // The entity panel selects one regular period. Balances must never be summed across dates.
  return labels.length === 1
    ? rows.filter((row) => dashboardPeriodLabel(row, period.type) === labels[0])
    : [];
}
export function dashboardCategories(
  rows: readonly CommitmentDashboardRow[],
  grouping: Grouping,
  depth: number,
  leaf = false,
): CategoryData[] {
  const groups = new Map<string, CommitmentDashboardRow[]>();
  for (const row of rows) {
    const code =
      (grouping === "fn" ? row.functionalCode : row.economicCode) ?? "";
    const key = leaf ? code : getCodeAtDepth(code, depth);
    const bucket = groups.get(key) ?? [];
    bucket.push(row);
    groups.set(key, bucket);
  }
  return [...groups].map(([id, bucket]) => {
    const sums = sumDashboardAmounts(bucket);
    return {
      id: id || "—",
      name:
        (grouping === "fn"
          ? getClassificationName(id)
          : getEconomicClassificationName(id)) ?? id,
      budget: sums.budget ?? 0,
      committed: sums.committed ?? 0,
      paid: new Exact(sums.paidTreasury ?? 0)
        .plus(sums.paidNonTreasury ?? 0)
        .toNumber(),
    };
  });
}
export function dashboardDrill(
  rows: readonly CommitmentDashboardRow[],
): LocalCommitmentDrill {
  return (parent, level, grouping) => {
    const scoped = rows.filter((row) => {
      const code =
        (grouping === "fn" ? row.functionalCode : row.economicCode) ?? "";
      return code === parent || code.startsWith(`${parent}.`);
    });
    return level === "economic"
      ? dashboardCategories(scoped, grouping === "fn" ? "ec" : "fn", 0, true)
      : dashboardCategories(
          scoped,
          grouping,
          level === "subchapter" ? 2 : 3,
        ).filter((row) => row.id !== parent);
  };
}
export function dashboardTrends(
  rows: readonly CommitmentDashboardRow[],
  period: ReportPeriodInput,
): CommitmentTrend[] {
  const metrics = {
    budget: "CREDITE_BUGETARE_DEFINITIVE",
    committed: "CREDITE_ANGAJAMENT",
    paidTreasury: "PLATI_TREZOR",
    paidNonTreasury: "PLATI_NON_TREZOR",
  } as const;
  const points = dashboardPeriodLabels(period).map((label) => ({
    label,
    amounts: sumDashboardAmounts(
      rows.filter((row) => dashboardPeriodLabel(row, period.type) === label),
    ),
  }));
  return (Object.keys(metrics) as Array<keyof typeof metrics>).map((key) => ({
    seriesId: key,
    metric: metrics[key],
    xAxis: { name: "Period", type: "STRING", unit: "" },
    yAxis: { name: "Amount", type: "FLOAT", unit: "" },
    data: points.map(({ label, amounts }) => ({
      x: period.type === "YEAR" ? label : label.slice(5),
      y: amounts[key],
      growth_percent: null,
    })),
  }));
}
