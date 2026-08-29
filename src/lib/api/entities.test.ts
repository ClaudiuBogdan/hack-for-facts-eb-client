import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the logger module before importing entities
vi.mock("@/lib/logger", () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

// Mock the graphql module
vi.mock("./graphql", () => ({
  graphqlRequest: vi.fn(),
}));

vi.mock("@/lib/graphql/graphql-client", () => ({
  graphqlQuery: vi.fn(),
}));

import {
  filterLineItems,
  getEntityDetails,
  getEntityProfile,
  getEntityRelationships,
  getEntityReports,
  getEntityRoutingSummary,
  getReportsConnection,
  getEntityExecutionLineItems,
  searchEntities,
  type ExecutionLineItem,
} from "./entities";
import { graphqlRequest } from "./graphql";
import { graphqlQuery } from "@/lib/graphql/graphql-client";

// Helper to create mock line items
function createLineItem(
  overrides: Partial<ExecutionLineItem> = {},
): ExecutionLineItem {
  return {
    line_item_id: "test-id",
    account_category: "ch",
    funding_source_id: 1,
    ytd_amount: 1000,
    quarterly_amount: 250,
    monthly_amount: 100,
    amount: 1000,
    ...overrides,
  };
}

describe("entities api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getEntityDetails", () => {
    const mockParams = {
      cui: "123456",
      reportPeriod: {
        type: "YEAR",
        selection: { interval: { start: "2024", end: "2024" } },
      } as const,
      normalization: "total" as const,
      currency: "RON" as const,
    };

    it("should fetch and return entity details successfully", async () => {
      const metadataResponse = {
        entity: {
          cui: "123456",
          organization: { name: "Test Entity" },
          territory: {
            name: "Test City",
            countyCode: "TS",
            countyName: "Test County",
            sirutaCode: "123",
            population: 1000,
          },
          reference: {
            name: "Test Entity",
            address: "Test address",
            entityType: "uat",
            isUat: true,
            defaultReportType:
              "Executie bugetara agregata la nivel de ordonator principal",
            territory: null,
          },
          budget: { presence: true, reportType: "EXECUTION_AGG_PRINCIPAL" },
        },
      };
      const budgetResponse = {
        summary: [
          {
            mainCreditorCui: "123456",
            year: 2024,
            month: null,
            quarter: null,
            totalIncome: "1000.50",
            totalExpense: "800.25",
            budgetBalance: "200.25",
          },
        ],
        currentIncome: [{ periodLabel: "2024", amount: "1000.50" }],
        currentExpense: [{ periodLabel: "2024", amount: "800.25" }],
        currentBalance: [{ periodLabel: "2024", amount: "200.25" }],
        trendIncome: [{ periodLabel: "2024", amount: "1000.50" }],
        trendExpense: [{ periodLabel: "2024", amount: "800.25" }],
        trendBalance: [{ periodLabel: "2024", amount: "200.25" }],
      };

      vi.mocked(graphqlQuery)
        .mockResolvedValueOnce(metadataResponse)
        .mockResolvedValueOnce(budgetResponse);

      const result = await getEntityDetails(mockParams);

      expect(graphqlQuery).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("query GetEntityMetadata"),
        { cui: "123456" },
        expect.objectContaining({ operationName: "entity-metadata" }),
      );
      expect(graphqlQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("query GetEntityBudget"),
        expect.objectContaining({
          cui: "123456",
          reportType: "EXECUTION_AGG_PRINCIPAL",
          normalization: "TOTAL",
        }),
        expect.objectContaining({ operationName: "entity-budget" }),
      );
      expect(result).toMatchObject({
        cui: "123456",
        name: "Test Entity",
        address: "Test address",
        default_report_type: "PRINCIPAL_AGGREGATED",
        totalIncome: 1000.5,
        totalExpenses: 800.25,
        budgetBalance: 200.25,
      });
      expect(result?.incomeTrend?.data).toEqual([{ x: "2024", y: 1000.5 }]);
    });

    it("scopes summary values to a requested main creditor", async () => {
      vi.mocked(graphqlQuery)
        .mockResolvedValueOnce({
          entity: {
            cui: "123456",
            organization: { name: "Test Entity" },
            territory: null,
            reference: {
              name: "Test Entity",
              address: null,
              entityType: "public_entity",
              isUat: false,
              defaultReportType: "Executie bugetara detaliata",
              territory: null,
            },
            budget: { presence: true, reportType: "EXECUTION_DETAILED" },
          },
        })
        .mockResolvedValueOnce({
          summary: [
            {
              mainCreditorCui: "parent-1",
              year: 2024,
              month: null,
              quarter: null,
              totalIncome: "100",
              totalExpense: "80",
              budgetBalance: "20",
            },
            {
              mainCreditorCui: "parent-2",
              year: 2024,
              month: null,
              quarter: null,
              totalIncome: "200",
              totalExpense: "160",
              budgetBalance: "40",
            },
          ],
          currentIncome: [{ periodLabel: "2024", amount: "300" }],
          currentExpense: [{ periodLabel: "2024", amount: "240" }],
          currentBalance: [{ periodLabel: "2024", amount: "60" }],
          trendIncome: [{ periodLabel: "2024", amount: "300" }],
          trendExpense: [{ periodLabel: "2024", amount: "240" }],
          trendBalance: [{ periodLabel: "2024", amount: "60" }],
        });

      const result = await getEntityDetails({
        ...mockParams,
        reportType: "DETAILED",
        mainCreditorCui: "parent-1",
      });

      expect(result).toMatchObject({
        totalIncome: 100,
        totalExpenses: 80,
        budgetBalance: 20,
      });
    });

    it("should handle null response from graphql", async () => {
      vi.mocked(graphqlQuery).mockResolvedValue({ entity: null });

      const result = await getEntityDetails(mockParams);

      expect(result).toBeNull();
    });

    it("should rethrow errors", async () => {
      const error = new Error("API Error");
      vi.mocked(graphqlQuery).mockRejectedValue(error);

      await expect(getEntityDetails(mockParams)).rejects.toThrow("API Error");
    });
  });

  describe("getEntityRelationships", () => {
    it("should return children and parents", async () => {
      const relationshipResponse = {
        referencePublicEntity: { parents: { cui1: "222", cui2: null } },
        referencePublicEntityChildren: [{ cui: "111", name: "Child" }],
      };
      const labelResponse = {
        organizationLabels: [
          { cui: "222", canonicalName: "Parent", status: "named" },
        ],
      };
      vi.mocked(graphqlQuery)
        .mockResolvedValueOnce(relationshipResponse)
        .mockResolvedValueOnce(labelResponse);

      const result = await getEntityRelationships("123456");

      expect(graphqlQuery).toHaveBeenCalledWith(
        expect.stringContaining("query GetEntityRelationships"),
        { cui: "123456" },
        expect.objectContaining({ operationName: "entity-relationships" }),
      );
      expect(result).toEqual({
        children: [{ cui: "111", name: "Child" }],
        parents: [{ cui: "222", name: "Parent" }],
      });
    });

    it("should return empty arrays when response is null", async () => {
      vi.mocked(graphqlQuery).mockResolvedValue({
        referencePublicEntity: null,
        referencePublicEntityChildren: [],
      });

      const result = await getEntityRelationships("123456");

      expect(result).toEqual({ children: [], parents: [] });
    });
  });

  describe("getEntityRoutingSummary", () => {
    it("should return routing summary", async () => {
      const mockResponse = {
        referencePublicEntity: {
          cui: "123456",
          entityType: "admin_municipality",
          isUat: true,
        },
      };

      vi.mocked(graphqlQuery).mockResolvedValue(mockResponse);

      const result = await getEntityRoutingSummary("123456");

      expect(graphqlQuery).toHaveBeenCalledWith(
        expect.stringContaining("query GetEntityRoutingSummary"),
        { cui: "123456" },
        expect.objectContaining({ operationName: "entity-routing-summary" }),
      );
      expect(result).toEqual({
        cui: "123456",
        entity_type: "admin_municipality",
        is_uat: true,
      });
    });

    it("should return null when entity is missing", async () => {
      vi.mocked(graphqlQuery).mockResolvedValue({
        referencePublicEntity: null,
      });

      const result = await getEntityRoutingSummary("123456");

      expect(result).toBeNull();
    });
  });

  describe("getEntityProfile", () => {
    it("returns the honest absent state while the redesign profile is unavailable", async () => {
      const result = await getEntityProfile("123456");

      expect(result).toBeNull();
      expect(graphqlQuery).not.toHaveBeenCalled();
    });
  });

  describe("getEntityReports", () => {
    it("should return reports connection", async () => {
      const mockResponse = {
        budgetReports: {
          items: [
            {
              reportId: "1",
              entityCui: "123456",
              entityName: "Test Entity",
              reportType: "Executie bugetara detaliata",
              mainCreditorCui: null,
              reportDate: "2024-12-31",
              reportingYear: 2024,
              budgetSectorId: 1,
              downloadLinks: [],
            },
          ],
          total: 1,
          estimated: false,
          caveats: [],
        },
      };
      vi.mocked(graphqlQuery).mockResolvedValue(mockResponse);

      const result = await getEntityReports("123456");

      expect(graphqlQuery).toHaveBeenCalledWith(
        expect.stringContaining("query GetEntityReports"),
        expect.objectContaining({ filter: { entityCui: { eq: "123456" } } }),
        expect.objectContaining({ operationName: "entity-reports" }),
      );
      expect(result?.nodes[0]).toMatchObject({
        report_id: "1",
        reporting_year: 2024,
      });
    });
  });

  describe("getReportsConnection", () => {
    it("should return reports connection", async () => {
      const mockResponse = {
        budgetReports: {
          items: [],
          total: 0,
          estimated: false,
          caveats: [],
        },
      };
      vi.mocked(graphqlQuery).mockResolvedValue(mockResponse);

      const result = await getReportsConnection({ entity_cui: "123456" });

      expect(graphqlQuery).toHaveBeenCalledWith(
        expect.stringContaining("query GetEntityReports"),
        expect.any(Object),
        expect.objectContaining({ operationName: "entity-reports" }),
      );
      expect(result).toEqual({
        nodes: [],
        pageInfo: { totalCount: 0, hasNextPage: false, hasPreviousPage: false },
      });
    });

    it("maps report dates and commitment report labels to the redesign filter", async () => {
      vi.mocked(graphqlQuery).mockResolvedValue({
        budgetReports: {
          items: [],
          total: 0,
          estimated: false,
          caveats: [],
        },
      });

      await getReportsConnection({
        entity_cui: "123456",
        report_type: "COMMITMENT_PRINCIPAL_AGGREGATED",
        report_date_start: "2024-01-01",
        report_date_end: "2024-12-31",
      });

      expect(graphqlQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          filter: {
            entityCui: { eq: "123456" },
            reportType: {
              eq: "Executie - Angajamente bugetare agregat principal",
            },
            reportDate: {
              between: { from: "2024-01-01", to: "2024-12-31" },
            },
          },
        }),
        expect.any(Object),
      );
    });
  });

  describe("getEntityExecutionLineItems", () => {
    const mockParams = {
      cui: "123456",
      reportPeriod: {
        type: "YEAR",
        selection: { interval: { start: "2024", end: "2024" } },
      } as const,
      normalization: "total" as const,
    };

    it("should fetch and merge execution line items", async () => {
      const expenseResponse = {
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
                economicName: "Expense item",
                ytdAmount: "100",
                quarterlyAmount: "25",
                monthlyAmount: "10",
              },
            },
          ],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      };
      const incomeResponse = {
        budgetExecutionLineItems: {
          edges: [
            {
              node: {
                executionLineItemId: "2",
                accountCategory: "INCOME",
                fundingSource: "B",
                fundingSourceId: 2,
                expenseType: null,
                anomaly: null,
                functionalCode: "20",
                functionalName: "Income",
                economicCode: null,
                economicName: null,
                ytdAmount: "200",
                quarterlyAmount: "50",
                monthlyAmount: "20",
              },
            },
          ],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      };
      vi.mocked(graphqlQuery)
        .mockResolvedValueOnce(expenseResponse)
        .mockResolvedValueOnce(incomeResponse);

      const result = await getEntityExecutionLineItems(mockParams);

      expect(graphqlQuery).toHaveBeenCalledTimes(2);
      expect(result.nodes).toHaveLength(2);
      // Verify amount mapping for YEAR type
      expect(result.nodes[0].amount).toBe(100);
      expect(result.nodes[1].amount).toBe(200);
    });

    it("should map amount correctly for monthly period", async () => {
      const mockResponse = {
        budgetExecutionLineItems: {
          edges: [
            {
              node: {
                executionLineItemId: "1",
                accountCategory: "EXPENSE",
                fundingSource: null,
                fundingSourceId: 1,
                expenseType: null,
                anomaly: null,
                functionalCode: "10",
                functionalName: null,
                economicCode: null,
                economicName: null,
                ytdAmount: "100",
                quarterlyAmount: null,
                monthlyAmount: "10",
              },
            },
          ],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      };
      const emptyResponse = {
        budgetExecutionLineItems: {
          edges: [],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      };
      vi.mocked(graphqlQuery)
        .mockResolvedValueOnce(mockResponse)
        .mockResolvedValueOnce(emptyResponse);

      const result = await getEntityExecutionLineItems({
        ...mockParams,
        reportPeriod: {
          type: "MONTH",
          selection: { interval: { start: "2024-01", end: "2024-01" } },
        },
      });

      expect(result.nodes[0].amount).toBe(10);
    });

    it("applies the redesign normalization factor to line-item amounts", async () => {
      const expenseResponse = {
        budgetExecutionLineItems: {
          edges: [
            {
              node: {
                executionLineItemId: "1",
                accountCategory: "EXPENSE",
                fundingSource: null,
                fundingSourceId: 1,
                expenseType: null,
                anomaly: null,
                functionalCode: "10",
                functionalName: null,
                economicCode: null,
                economicName: null,
                ytdAmount: "100",
                quarterlyAmount: "25",
                monthlyAmount: "10",
              },
            },
          ],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      };
      const emptyResponse = {
        budgetExecutionLineItems: {
          edges: [],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      };
      const normalizationResponse = {
        totalExpense: [{ periodLabel: "2024", amount: "1000" }],
        normalizedExpense: [{ periodLabel: "2024", amount: "1" }],
        totalIncome: [{ periodLabel: "2024", amount: "2000" }],
        normalizedIncome: [{ periodLabel: "2024", amount: "2" }],
      };
      vi.mocked(graphqlQuery)
        .mockResolvedValueOnce(expenseResponse)
        .mockResolvedValueOnce(emptyResponse)
        .mockResolvedValueOnce(normalizationResponse);

      const result = await getEntityExecutionLineItems({
        ...mockParams,
        normalization: "per_capita",
      });

      expect(result.nodes[0]).toMatchObject({
        ytd_amount: 0.1,
        quarterly_amount: 0.025,
        monthly_amount: 0.01,
        amount: 0.1,
      });
    });
  });

  describe("searchEntities", () => {
    it("should return search results", async () => {
      const mockResponse = {
        entities: {
          nodes: [{ cui: "123", name: "Test" }],
        },
      };
      vi.mocked(graphqlRequest).mockResolvedValue(mockResponse);

      const result = await searchEntities("test");

      expect(graphqlRequest).toHaveBeenCalledWith(
        expect.stringContaining("query EntitySearch"),
        expect.objectContaining({
          filter: expect.objectContaining({ search: "test" }),
        }),
      );
      expect(result).toEqual(mockResponse.entities.nodes);
    });

    it("applies UAT search filters for campaign selector", async () => {
      const mockResponse = {
        entities: {
          nodes: [
            {
              cui: "111",
              name: "Judet Sibiu",
              entity_type: "admin_county_council",
            },
            {
              cui: "123",
              name: "Primaria Sibiu",
              entity_type: "admin_municipality",
            },
          ],
        },
      };
      vi.mocked(graphqlRequest).mockResolvedValue(mockResponse);

      const result = await searchEntities("test", 8, {
        isUat: true,
        excludeCounty: true,
      });

      expect(graphqlRequest).toHaveBeenCalledWith(
        expect.stringContaining("query EntitySearch"),
        expect.objectContaining({
          limit: 8,
          filter: expect.objectContaining({
            search: "test",
            is_uat: true,
          }),
        }),
      );
      expect(result).toEqual([
        {
          cui: "123",
          name: "Primaria Sibiu",
          entity_type: "admin_municipality",
        },
      ]);
    });

    it("should return empty array for empty search", async () => {
      const result = await searchEntities("  ");
      expect(result).toEqual([]);
      expect(graphqlRequest).not.toHaveBeenCalled();
    });

    it("should handle API errors gracefully", async () => {
      vi.mocked(graphqlRequest).mockRejectedValue(new Error("API Error"));
      await expect(searchEntities("test")).rejects.toThrow("API Error");
    });
  });
});

describe("filterLineItems", () => {
  const sampleItems: readonly ExecutionLineItem[] = [
    createLineItem({
      line_item_id: "1",
      economicClassification: {
        economic_code: "10.01",
        economic_name: "Personnel",
      },
    }),
    createLineItem({
      line_item_id: "2",
      economicClassification: {
        economic_code: "10.02",
        economic_name: "Salaries",
      },
    }),
    createLineItem({
      line_item_id: "3",
      economicClassification: {
        economic_code: "20.01",
        economic_name: "Goods",
      },
    }),
    createLineItem({
      line_item_id: "4",
      economicClassification: {
        economic_code: "20.05",
        economic_name: "Services",
      },
    }),
    createLineItem({
      line_item_id: "5",
      economicClassification: {
        economic_code: "30.01",
        economic_name: "Capital",
      },
    }),
    createLineItem({
      line_item_id: "6",
      economicClassification: null,
      anomaly: "MISSING_LINE_ITEM",
    }),
    createLineItem({
      line_item_id: "7",
      economicClassification: {
        economic_code: "10.03",
        economic_name: "Bonuses",
      },
      anomaly: "YTD_ANOMALY",
    }),
  ];

  describe("no filter", () => {
    it("returns all items when filter is undefined", () => {
      const result = filterLineItems(sampleItems, undefined);
      expect(result).toHaveLength(7);
    });

    it("returns all items when filter is empty string", () => {
      const result = filterLineItems(sampleItems, "");
      expect(result).toHaveLength(7);
    });
  });

  describe("economic:all filter", () => {
    it("returns all items", () => {
      const result = filterLineItems(sampleItems, "economic:all");
      expect(result).toHaveLength(7);
    });
  });

  describe("economic:personal filter", () => {
    it("returns only items with economic code starting with 10", () => {
      const result = filterLineItems(sampleItems, "economic:personal");

      expect(result).toHaveLength(3);
      expect(
        result.every((item) =>
          item.economicClassification?.economic_code.startsWith("10"),
        ),
      ).toBe(true);
    });
  });

  describe("economic:goods filter", () => {
    it("returns only items with economic code starting with 20", () => {
      const result = filterLineItems(sampleItems, "economic:goods");

      expect(result).toHaveLength(2);
      expect(
        result.every((item) =>
          item.economicClassification?.economic_code.startsWith("20"),
        ),
      ).toBe(true);
    });
  });

  describe("economic:others filter", () => {
    it("returns items with economic code not starting with 10 or 20", () => {
      const result = filterLineItems(sampleItems, "economic:others");

      // Should include 30.01 and the null classification item
      expect(result).toHaveLength(2);
      expect(
        result.every((item) => {
          const code = item.economicClassification?.economic_code || "";
          return !code.startsWith("10") && !code.startsWith("20");
        }),
      ).toBe(true);
    });
  });

  describe("anomaly:missing filter", () => {
    it("returns only items with MISSING_LINE_ITEM anomaly", () => {
      const result = filterLineItems(sampleItems, "anomaly:missing");

      expect(result).toHaveLength(1);
      expect(result[0]!.anomaly).toBe("MISSING_LINE_ITEM");
    });
  });

  describe("anomaly:value_changed filter", () => {
    it("returns only items with YTD_ANOMALY", () => {
      const result = filterLineItems(sampleItems, "anomaly:value_changed");

      expect(result).toHaveLength(1);
      expect(result[0]!.anomaly).toBe("YTD_ANOMALY");
    });
  });

  describe("unknown filter", () => {
    it("returns all items for unknown filter values", () => {
      const result = filterLineItems(sampleItems, "unknown:filter");
      expect(result).toHaveLength(7);
    });
  });

  describe("edge cases", () => {
    it("handles empty items array", () => {
      const result = filterLineItems([], "economic:personal");
      expect(result).toHaveLength(0);
    });

    it("handles items with null economic classification", () => {
      const itemsWithNull: readonly ExecutionLineItem[] = [
        createLineItem({ line_item_id: "1", economicClassification: null }),
        createLineItem({
          line_item_id: "2",
          economicClassification: {
            economic_code: "10.01",
            economic_name: "Test",
          },
        }),
      ];

      const personalResult = filterLineItems(
        itemsWithNull,
        "economic:personal",
      );
      expect(personalResult).toHaveLength(1);

      const othersResult = filterLineItems(itemsWithNull, "economic:others");
      expect(othersResult).toHaveLength(1);
    });
  });
});
