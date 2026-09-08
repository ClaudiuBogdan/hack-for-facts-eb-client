import { beforeEach, describe, expect, it, vi } from "vitest";
import { graphqlQuery } from "@/lib/graphql/graphql-client";
import {
  fetchRedesignEntityDetails,
  fetchRedesignEntityExecutionLineItems,
} from "./entities-redesign";
import type { ReportPeriodInput } from "@/schemas/reporting";

vi.mock("@/lib/graphql/graphql-client", () => ({ graphqlQuery: vi.fn() }));

const metadata = {
  entity: {
    cui: "111",
    organization: { name: "City" },
    territory: null,
    reference: null,
    budget: { presence: true, reportType: "EXECUTION_DETAILED" },
  },
};
const yearPeriod = {
  type: "YEAR",
  selection: { interval: { start: "2023", end: "2025" } },
} as const;
const params = {
  cui: "111",
  normalization: "per_capita" as const,
  reportPeriod: yearPeriod,
};
const series = (points: { periodLabel: string; amount: string }[]) => ({
  totalIncome: points,
  totalExpense: points,
  budgetBalance: points,
});

beforeEach(() => vi.clearAllMocks());

describe("native entity evolution", () => {
  it("uses API creditor-scoped values directly, including zero and negative values", async () => {
    vi.mocked(graphqlQuery)
      .mockResolvedValueOnce(metadata)
      .mockResolvedValueOnce({
        totalIncome: [{ periodLabel: "2025", amount: "0" }],
        totalExpense: [{ periodLabel: "2025", amount: "-12.5" }],
        budgetBalance: [{ periodLabel: "2025", amount: "12.5" }],
      });
    const result = await fetchRedesignEntityDetails({
      ...params,
      mainCreditorCui: "444",
    });
    expect(result).toMatchObject({
      totalIncome: 0,
      totalExpenses: -12.5,
      budgetBalance: 12.5,
    });
    expect(result?.expenseTrend?.data).toEqual([{ x: "2025", y: -12.5 }]);
    expect(vi.mocked(graphqlQuery).mock.calls[1]?.[1]).toMatchObject({
      mainCreditorCui: "444",
      normalized: true,
      summaryYearFrom: 2023,
      summaryYearTo: 2025,
    });
    const query = vi.mocked(graphqlQuery).mock.calls[1]?.[0] ?? "";
    expect(query.match(/budgetTimeseries\(/g)).toHaveLength(3);
    expect(query.match(/mainCreditorCui: \$mainCreditorCui/g)).toHaveLength(3);
    expect(query).toContain("@skip(if: $normalized)");
  });

  it("leaves the current card unavailable when only an older selected year is present", async () => {
    vi.mocked(graphqlQuery)
      .mockResolvedValueOnce(metadata)
      .mockResolvedValueOnce(series([{ periodLabel: "2024", amount: "10" }]));
    const result = await fetchRedesignEntityDetails(params);
    expect(result?.totalIncome).toBeNull();
    expect(result?.incomeTrend?.data).toEqual([{ x: "2024", y: 10 }]);
  });

  it.each([
    [
      { type: "YEAR", selection: { interval: { start: "2023", end: "2025" } } },
      ["2023", "2025"],
    ],
    [
      { type: "YEAR", selection: { dates: ["2025", "2023", "2024"] } },
      ["2023", "2025"],
    ],
    [
      {
        type: "MONTH",
        selection: { interval: { start: "2024-11", end: "2025-01" } },
      },
      ["2024-11", "2025-01"],
    ],
    [
      {
        type: "QUARTER",
        selection: { interval: { start: "2024-Q3", end: "2025-Q1" } },
      },
      ["2024-Q3", "2025-Q1"],
    ],
  ] as const)(
    "does not calculate growth across a missing selected period %j",
    async (period, labels) => {
      vi.mocked(graphqlQuery)
        .mockResolvedValueOnce(metadata)
        .mockResolvedValueOnce(
          series(
            labels.map((periodLabel, i) => ({
              periodLabel,
              amount: String((i + 1) * 10),
            })),
          ),
        );
      const result = await fetchRedesignEntityDetails({
        ...params,
        reportPeriod: period as ReportPeriodInput,
        show_period_growth: true,
      });
      expect(result?.incomeTrend?.data).toEqual([]);
    },
  );

  it.each([
    [
      { type: "YEAR", selection: { dates: ["2025", "2023"] } },
      ["2023", "2025"],
    ],
    [
      {
        type: "MONTH",
        selection: { interval: { start: "2024-12", end: "2025-01" } },
      },
      ["2024-12", "2025-01"],
    ],
    [
      {
        type: "QUARTER",
        selection: { interval: { start: "2024-Q4", end: "2025-Q1" } },
      },
      ["2024-Q4", "2025-Q1"],
    ],
  ] as const)(
    "calculates growth between adjacent selected periods %j",
    async (period, labels) => {
      vi.mocked(graphqlQuery)
        .mockResolvedValueOnce(metadata)
        .mockResolvedValueOnce(
          series(
            labels.map((periodLabel, i) => ({
              periodLabel,
              amount: String((i + 1) * 10),
            })),
          ),
        );
      const result = await fetchRedesignEntityDetails({
        ...params,
        reportPeriod: period as ReportPeriodInput,
        show_period_growth: true,
      });
      expect(result?.incomeTrend?.data).toEqual([{ x: labels[1], y: 100 }]);
    },
  );

  it("reuses one normalized series query for overlapping current and trend ranges", async () => {
    vi.mocked(graphqlQuery)
      .mockResolvedValueOnce(metadata)
      .mockResolvedValueOnce(
        series([
          { periodLabel: "2023", amount: "10" },
          { periodLabel: "2025", amount: "30" },
        ]),
      );
    const result = await fetchRedesignEntityDetails({
      ...params,
      reportPeriod: { type: "YEAR", selection: { dates: ["2025"] } },
      trendPeriod: yearPeriod,
    });
    expect(result?.totalIncome).toBe(30);
    expect(result?.incomeTrend?.data).toEqual([
      { x: "2023", y: 10 },
      { x: "2025", y: 30 },
    ]);
    expect(graphqlQuery).toHaveBeenCalledTimes(2);
  });

  it("keeps nominal creditor summaries independent of normalized API fields", async () => {
    vi.mocked(graphqlQuery)
      .mockResolvedValueOnce(metadata)
      .mockResolvedValueOnce({
        summary: [
          {
            mainCreditorCui: "111",
            year: 2025,
            month: null,
            quarter: null,
            totalIncome: "10",
            totalExpense: "8",
            budgetBalance: "2",
          },
          {
            mainCreditorCui: "444",
            year: 2025,
            month: null,
            quarter: null,
            totalIncome: "20",
            totalExpense: "18",
            budgetBalance: "2",
          },
        ],
      });
    const result = await fetchRedesignEntityDetails({
      ...params,
      normalization: "total",
      mainCreditorCui: "444",
    });
    expect(result).toMatchObject({
      totalIncome: 20,
      totalExpenses: 18,
      budgetBalance: 2,
    });
    expect(vi.mocked(graphqlQuery).mock.calls[1]?.[1]).toMatchObject({
      normalized: false,
    });
  });

  it("does not let a newer disjoint trend value replace the current selection", async () => {
    vi.mocked(graphqlQuery)
      .mockResolvedValueOnce(metadata)
      .mockResolvedValueOnce(
        series([
          { periodLabel: "2023", amount: "10" },
          { periodLabel: "2025", amount: "30" },
        ]),
      );
    const result = await fetchRedesignEntityDetails({
      ...params,
      reportPeriod: { type: "YEAR", selection: { dates: ["2023"] } },
      trendPeriod: { type: "YEAR", selection: { dates: ["2025"] } },
    });
    expect(result?.totalIncome).toBe(10);
    expect(result?.incomeTrend?.data).toEqual([{ x: "2025", y: 30 }]);
  });

  it("skips zero growth denominators and preserves negative-base growth", async () => {
    vi.mocked(graphqlQuery)
      .mockResolvedValueOnce(metadata)
      .mockResolvedValueOnce(
        series([
          { periodLabel: "2023", amount: "0" },
          { periodLabel: "2024", amount: "-10" },
          { periodLabel: "2025", amount: "-5" },
        ]),
      );
    const result = await fetchRedesignEntityDetails({
      ...params,
      show_period_growth: true,
    });
    expect(result?.incomeTrend?.data).toEqual([{ x: "2025", y: 50 }]);
  });

  it("stops paging and discards the requested dataset when line-item normalization is unavailable", async () => {
    vi.mocked(graphqlQuery).mockImplementation(async () => {
      return {
        budgetExecutionLineItems: {
          edges: [
            {
              node: {
                executionLineItemId: "1",
                accountCategory: "EXPENSE",
                fundingSource: "A",
                fundingSourceId: 1,
                expenseType: null,
                anomaly: null,
                functionalCode: "10",
                functionalName: "Expense",
                economicCode: "10.01",
                economicName: "Item",
                ytdAmount: "100",
                quarterlyAmount: "25",
                monthlyAmount: "10",
                normalizedAmounts: null,
              },
            },
          ],
          pageInfo: { hasNextPage: true, endCursor: "unused-next-page" },
        },
      };
    });
    await expect(
      fetchRedesignEntityExecutionLineItems({
        ...params,
        reportPeriod: { type: "YEAR", selection: { dates: ["2025"] } },
      }),
    ).resolves.toEqual({ nodes: [], fundingSources: [] });
    expect(graphqlQuery).toHaveBeenCalledTimes(2);
  });
});
