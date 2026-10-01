import { describe, expect, it } from "vitest";
import {
  recordSchema,
  registryFilter,
  registryPageSchema,
  validateRegistrySearch,
} from "./api";

const snapshot = {
  id: "snapshot",
  sourceDeclaredDate: null,
  importedAt: "2026-09-19T00:00:00Z",
  capturedAt: "2026-09-19T00:00:00Z",
  refreshOverdue: false,
  acceptedAt: null,
  recordCount: 2,
  isCurrent: true,
  sourceUrl: "https://rnong.just.ro/registru-ong",
  coverageBasis: "provided_artifact",
  nationalCompleteness: "unverified",
};
const record = {
  id: "observation:1",
  sourceRowNumber: 1,
  registryNumber: "1/A/2001",
  specialRegistryNumber: null,
  sourceRegistrationDate: "2026-09-19",
  category: "association",
  legalForm: "Asociație",
  name: "EXEMPLU",
  nameWithheld: false,
  court: "Judecatoria TEST",
  sourceRegistryStatus: "Radiat",
  county: null,
  locality: null,
  sourceCui: null,
  linkedOrganizationCui: null,
  organizationCui: null,
  isBranch: false,
  sourceReportsPublicUtility: false,
  snapshot,
};

describe("RNONG client contract", () => {
  it("keeps explicit false public-utility filters and source registry numbers", () => {
    expect(
      registryFilter(
        validateRegistrySearch({
          publicUtility: "no",
          registryNumber: " 1/A/2001 ",
          after: "cursor",
        }),
      ),
    ).toEqual({
      publicUtility: { eq: false },
      registryNumber: { eq: "1/A/2001" },
    });
    expect(registryFilter(validateRegistrySearch({}))).toEqual({});
  });
  it("keeps only the page's keys, non-empty and bounded, and leaves their reading to the page", () => {
    expect(
      validateRegistrySearch({
        q: ["bad"],
        category: {},
        county: "  ",
        after: "cursor",
        publicUtility: "unknown",
        status: "Radiat",
      }),
    ).toEqual({ publicUtility: "unknown", status: "Radiat" });
    expect(validateRegistrySearch({ q: "a".repeat(300) }).q).toHaveLength(200);
    expect(registryFilter({ publicUtility: "unknown" })).toEqual({});
  });
  it("preserves duplicate source observations and rows without CUI", () => {
    const page = registryPageSchema.parse({
      ngoRegistryRecords: {
        edges: [
          { cursor: "a", node: record },
          {
            cursor: "b",
            node: { ...record, id: "observation:2", sourceRowNumber: 2 },
          },
        ],
        pageInfo: { hasNextPage: false, endCursor: "b" },
        snapshot,
      },
    });
    expect(page.ngoRegistryRecords.edges).toHaveLength(2);
    expect(page.ngoRegistryRecords.edges[0]?.node.sourceCui).toBeNull();
  });
  it("retains historical provenance but removes unexpected private payload fields", () => {
    const result = recordSchema.parse({
      ...record,
      purpose: "private",
      attrs: { private: true },
      snapshot: { ...snapshot, isCurrent: false, objectKey: "private/file" },
    });
    expect(result.snapshot.isCurrent).toBe(false);
    expect(result).not.toHaveProperty("purpose");
    expect(result).not.toHaveProperty("attrs");
    expect(result.snapshot).not.toHaveProperty("objectKey");
  });
  it("keeps a withheld-name record and its safe source identifiers", () => {
    const result = recordSchema.parse({
      ...record,
      name: "[name pending verification]",
      nameWithheld: true,
    });
    expect(result.nameWithheld).toBe(true);
    expect(result.registryNumber).toBe("1/A/2001");
  });
  it("fails rather than treating an invalid or missing response as an empty registry", () => {
    expect(() => registryPageSchema.parse({})).toThrow();
    expect(() =>
      recordSchema.parse({
        ...record,
        snapshot: { ...snapshot, recordCount: 0 },
      }),
    ).toThrow();
  });
});
