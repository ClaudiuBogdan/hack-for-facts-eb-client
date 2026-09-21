import { describe, expect, it } from "vitest";
import {
  parseRegistrySearch,
  registryFilter,
  registryDetailSchema,
  registryPageSchema,
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
  isBranch: false,
  sourceReportsPublicUtility: false,
  snapshot,
};

describe("RNONG client contract", () => {
  it("keeps explicit false public-utility filters and source registry numbers", () => {
    expect(
      registryFilter(
        parseRegistrySearch({
          publicUtility: "no",
          registryNumber: " 1/A/2001 ",
          after: "cursor",
        }),
      ),
    ).toEqual({
      publicUtility: { eq: false },
      registryNumber: { eq: "1/A/2001" },
    });
    expect(registryFilter(parseRegistrySearch({}))).toEqual({});
  });
  it("rejects wrong-shaped URL values and bounds text without losing the cursor", () => {
    expect(
      parseRegistrySearch({
        q: ["bad"],
        category: {},
        after: "cursor",
        publicUtility: "unknown",
      }),
    ).toMatchObject({
      q: "",
      category: "",
      after: "cursor",
      publicUtility: "",
    });
    expect(parseRegistrySearch({ q: "a".repeat(300) }).q).toHaveLength(200);
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
    const result = registryDetailSchema.parse({
      ngoRegistryRecord: {
        ...record,
        purpose: "private",
        attrs: { private: true },
        snapshot: { ...snapshot, isCurrent: false, objectKey: "private/file" },
      },
    });
    expect(result.ngoRegistryRecord?.snapshot.isCurrent).toBe(false);
    expect(result.ngoRegistryRecord).not.toHaveProperty("purpose");
    expect(result.ngoRegistryRecord).not.toHaveProperty("attrs");
    expect(result.ngoRegistryRecord?.snapshot).not.toHaveProperty("objectKey");
  });
  it("keeps a withheld-name record and its safe source identifiers", () => {
    const result = registryDetailSchema.parse({ ngoRegistryRecord: { ...record, name: "[name pending verification]", nameWithheld: true } });
    expect(result.ngoRegistryRecord?.nameWithheld).toBe(true);
    expect(result.ngoRegistryRecord?.registryNumber).toBe("1/A/2001");
  });
  it("fails rather than treating an invalid or missing response as an empty registry", () => {
    expect(() => registryPageSchema.parse({})).toThrow();
    expect(() =>
      registryDetailSchema.parse({
        ngoRegistryRecord: {
          ...record,
          snapshot: { ...snapshot, recordCount: 0 },
        },
      }),
    ).toThrow();
    expect(
      registryDetailSchema.parse({ ngoRegistryRecord: null }).ngoRegistryRecord,
    ).toBeNull();
  });
});
