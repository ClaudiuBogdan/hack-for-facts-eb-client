import { describe, it, expect } from "vitest";
import {
  dashboardCategories,
  dashboardDrill,
  dashboardTrends,
  selectDashboardRows,
  sumDashboardAmounts,
} from "./native-commitments-model";
import type { CommitmentDashboardRow } from "@/lib/api/commitment-dashboard";
const row = (
  values: Partial<CommitmentDashboardRow> = {},
): CommitmentDashboardRow => ({
  year: 2025,
  period: 1,
  functionalCode: "65.02.01",
  economicCode: "10.01.01",
  firstReportMonth: 1,
  lastReportMonth: 1,
  budget: "1000",
  authority: "900",
  committed: "120",
  paidTreasury: "80",
  paidNonTreasury: "-10",
  ...values,
});
describe("native commitments presentation", () => {
  it("keeps negative non-treasury adjustments and exact decimal summation", () => {
    const rows = [
      row({ paidTreasury: "0.1", paidNonTreasury: "0" }),
      row({ paidTreasury: "0.2", paidNonTreasury: "0" }),
    ];
    expect(sumDashboardAmounts(rows).paidTreasury).toBe(0.3);
    expect(dashboardCategories([row()], "fn", 1)[0]).toMatchObject({
      id: "65",
      budget: 1000,
      committed: 120,
      paid: 70,
    });
  });
  it("does not add balances across an interval or silently turn monthly selection into a quarter", () => {
    const rows = [row(), row({ period: 2, budget: "1100" })];
    expect(
      selectDashboardRows(rows, {
        type: "MONTH",
        selection: { dates: ["2025-02"] },
      }),
    ).toEqual([rows[1]]);
    expect(
      selectDashboardRows(rows, {
        type: "MONTH",
        selection: { interval: { start: "2025-01", end: "2025-02" } },
      }),
    ).toEqual([]);
  });
  it("preserves gaps including missing factors rather than connecting/summing partial totals", () => {
    const rows = [row(), row({ period: 3, committed: null })];
    const trends = dashboardTrends(rows, {
      type: "MONTH",
      selection: { interval: { start: "2025-01", end: "2025-03" } },
    });
    expect(trends[1].data.map((p) => p.y)).toEqual([120, null, null]);
    expect(sumDashboardAmounts([]).budget).toBeNull();
    expect(
      sumDashboardAmounts([row(), row({ budget: null })]).budget,
    ).toBeNull();
  });
  it("drills through both classification axes without additional API reads", () => {
    const drill = dashboardDrill([
      row(),
      row({ functionalCode: "66.02.01", paidTreasury: "500" }),
    ]);
    expect(drill("65", "subchapter", "fn")).toHaveLength(1);
    expect(drill("65.02.01", "economic", "fn")[0]).toMatchObject({
      id: "10.01.01",
      paid: 70,
    });
    expect(drill("10.01.01", "economic", "ec")).toHaveLength(2);
  });
});
