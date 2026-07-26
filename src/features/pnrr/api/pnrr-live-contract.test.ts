import { beforeEach, describe, expect, it, vi } from "vitest";

import { graphqlQuery } from "@/lib/graphql/graphql-client";
import { buildPnrrProjectFilter } from "./graphql/pnrr-filters";
import {
  PNRR_CATALOG_RESOURCES_QUERY,
  PNRR_CAPABILITIES_QUERY,
  PNRR_DOCUMENT_REFERENCES_QUERY,
  PNRR_FUNDING_APPLICATIONS_QUERY,
  PNRR_FUNDING_CALLS_QUERY,
  PNRR_ORGANIZATION_COMMITMENTS_QUERY,
  PNRR_ORGANIZATION_PAYMENTS_QUERY,
  PNRR_ORGANIZATION_PROJECTS_QUERY,
  PNRR_ORGANIZATION_PROCUREMENT_QUERY,
  PNRR_PROGRAM_REVISIONS_QUERY,
  PNRR_RELEASE_QUERY,
} from "./graphql/pnrr-queries";
import { pnrrLiveApi } from "./pnrr-api.live";

vi.mock("@/lib/graphql/graphql-client", () => ({
  graphqlQuery: vi.fn(),
}));

const project = {
  projectKey: "mipe-dashboard-record:abc",
  projectKeyVersion: "mipe_observation_v1",
  sourceObservationId: "mipe-dashboard-record:abc",
  snapshotId: "snapshot-1",
  snapshotDate: "2026-06-09",
  endpointName: "progres_tehnic_proiecte",
  itemKey: "1302412307",
  commitmentBusinessId: "1302412307",
  contractNumber: "2255DOT",
  contractTitle: "Modernizare drum",
  beneficiaryCui: "4297649",
  beneficiaryName: "Beneficiar",
  beneficiaryType: "UAT",
  componentCode: "C15",
  measureCode: "I9",
  submeasureCode: null,
  responsibleInstitutionCode: null,
  responsibleInstitutionName: null,
  financingSource: null,
  commitmentDate: "2025-01-10",
  startDate: "2025-02-01",
  endDate: "2026-06-30",
  lastFundingDate: null,
  totalValueRon: "1313523.380000000000000001",
  euContributionRon: "1103801.16",
  nationalPublicValueRon: null,
  vatRon: null,
  ineligibleValueRon: null,
  receivedAmountRon: null,
  allocatedEur: null,
  paidEur: null,
  receivedEur: null,
  prefinancingEur: null,
  suspendedEur: null,
  revokedEur: null,
  projectCount: null,
  contractBeneficiaryCount: null,
  paymentBeneficiaryCount: null,
  nationalImpactProjectCount: null,
  paymentCount: null,
  beneficiaryCount: null,
  totalEur: null,
  totalRon: null,
  financialProgressRatio: 0.4288,
  physicalProgressRatio: 0.491,
  countyName: "VRANCEA",
  countySiruta: "39",
  localityName: "COMUNA VIDRA",
  impact: "local",
  timelineMonth: null,
  timelineLabel: null,
  status: "ÎN IMPLEMENTARE",
  sourceSystem: "pnrr_mipe_dashboard",
  sourceUrl: "https://mfe.gov.ro/pnrr-dashboard/generator/data/projects.json",
  retrievedAt: "2026-06-10T00:00:00.000Z",
  linkedCommitmentKey: "commitment-1",
  commitmentRelationship: "candidate_project",
  commitmentAggregationState: "single_observation_additive",
} as const;

describe("PNRR live project contract", () => {
  beforeEach(() => {
    vi.mocked(graphqlQuery).mockReset();
  });

  it("binds every source collection to its continuation cursor", () => {
    for (const query of [
      PNRR_FUNDING_CALLS_QUERY,
      PNRR_FUNDING_APPLICATIONS_QUERY,
      PNRR_PROGRAM_REVISIONS_QUERY,
      PNRR_CATALOG_RESOURCES_QUERY,
      PNRR_DOCUMENT_REFERENCES_QUERY,
    ]) {
      expect(query).toContain("$after: String");
      expect(query).toContain("after: $after");
    }
  });

  it("uses the server filter scalar for organization collection queries", () => {
    for (const query of [
      PNRR_ORGANIZATION_PAYMENTS_QUERY,
      PNRR_ORGANIZATION_COMMITMENTS_QUERY,
      PNRR_ORGANIZATION_PROJECTS_QUERY,
      PNRR_ORGANIZATION_PROCUREMENT_QUERY,
    ]) {
      expect(query).toContain("$cui: String!");
      expect(query).not.toContain("$cui: CUI!");
      expect(query).toContain("$after: String");
      expect(query).toContain("after: $after");
    }
  });

  it("pins capabilities to the release observed immediately before them", async () => {
    vi.mocked(graphqlQuery)
      .mockResolvedValueOnce({
        pnrrCurrentRelease: {
          releaseId: "pnrr-v2:release-1",
          releaseKind: "operational_snapshot",
          state: "degraded",
          sourceSnapshotAt: null,
          completedAt: null,
          limitation: "fixture",
          lanes: [],
        },
      })
      .mockResolvedValueOnce({
        pnrrCapabilities: [
          {
            id: "projects",
            releaseId: "pnrr-v2:release-1",
            state: "degraded",
            reasonCodes: ["fixture"],
            limitation: "fixture",
          },
        ],
      });

    const result = await pnrrLiveApi.status();

    expect(result.pnrrCapabilities[0]?.releaseId).toBe(
      result.pnrrCurrentRelease.releaseId,
    );
    expect(graphqlQuery).toHaveBeenNthCalledWith(
      1,
      PNRR_RELEASE_QUERY,
      {},
      expect.objectContaining({ operationName: "PnrrRelease" }),
    );
    expect(graphqlQuery).toHaveBeenNthCalledWith(
      2,
      PNRR_CAPABILITIES_QUERY,
      { assertReleaseId: "pnrr-v2:release-1" },
      expect.objectContaining({ operationName: "PnrrCapabilities" }),
    );
  });

  it("rejects a mixed release and capability response", async () => {
    vi.mocked(graphqlQuery)
      .mockResolvedValueOnce({
        pnrrCurrentRelease: {
          releaseId: "pnrr-v2:release-1",
          releaseKind: "operational_snapshot",
          state: "degraded",
          sourceSnapshotAt: null,
          completedAt: null,
          limitation: "fixture",
          lanes: [],
        },
      })
      .mockResolvedValueOnce({
        pnrrCapabilities: [
          {
            id: "projects",
            releaseId: "pnrr-v2:release-2",
            state: "served",
            reasonCodes: [],
            limitation: null,
          },
        ],
      });

    await expect(pnrrLiveApi.status()).rejects.toThrow(
      "PNRR capabilities do not match the observed release",
    );
  });

  it("maps date filters to the MIPE snapshot role", () => {
    expect(
      buildPnrrProjectFilter({
        componentCode: "C15",
        from: "2026-01-01",
        to: "2026-06-30",
      }),
    ).toEqual({
      componentCode: { eq: "C15" },
      snapshotDate: {
        between: { from: "2026-01-01", to: "2026-06-30" },
      },
    });
  });

  it("preserves exact decimal strings and source progress ratios", async () => {
    vi.mocked(graphqlQuery).mockResolvedValue({ pnrrProject: project });

    const result = await pnrrLiveApi.project(
      project.projectKey,
      "pnrr-v2:release-1",
    );

    expect(result?.totalValueRon).toBe("1313523.380000000000000001");
    expect(result?.financialProgressRatio).toBe(0.4288);
    expect(result?.commitmentRelationship).toBe("candidate_project");
    expect(graphqlQuery).toHaveBeenCalledWith(
      expect.stringContaining("pnrrProject(key: $key"),
      {
        key: project.projectKey,
        assertReleaseId: "pnrr-v2:release-1",
      },
      expect.objectContaining({ operationName: "PnrrProject" }),
    );
  });

  it("returns null rather than falling back to frozen MIPE files", async () => {
    vi.mocked(graphqlQuery).mockResolvedValue({ pnrrProject: null });

    await expect(pnrrLiveApi.project("missing")).resolves.toBeNull();
    expect(graphqlQuery).toHaveBeenCalledTimes(1);
  });

  it("keeps source call budgets exact and source-qualified", async () => {
    vi.mocked(graphqlQuery).mockResolvedValue({
      pnrrFundingCalls: {
        edges: [
          {
            cursor: "cursor-1",
            node: {
              callId: "call-1",
              title: "Digitalizare",
              budgetRon: "999999999999999999.000000000000000001",
              totalEligibleValueRon: "800000000000000000.123456789",
              sourceSystem: "pnrr_platform",
              sourceUrl: "https://example.test/call-1",
              retrievedAt: "2026-07-01T00:00:00Z",
            },
          },
        ],
        pageInfo: { hasNextPage: false, endCursor: "cursor-1" },
      },
    });

    const result = await pnrrLiveApi.fundingCalls({
      first: 24,
      after: "cursor-0",
      assertReleaseId: "pnrr-v2:release-1",
    });

    expect(result.edges[0]?.node.budgetRon).toBe(
      "999999999999999999.000000000000000001",
    );
    expect(result.edges[0]?.node.sourceSystem).toBe("pnrr_platform");
    expect(graphqlQuery).toHaveBeenCalledWith(
      expect.stringMatching(/pnrrFundingCalls[\s\S]*after: \$after/),
      {
        first: 24,
        after: "cursor-0",
        assertReleaseId: "pnrr-v2:release-1",
      },
      expect.objectContaining({ operationName: "PnrrFundingCalls" }),
    );
  });

  it("requests facets with the identical project filter and release", async () => {
    vi.mocked(graphqlQuery).mockResolvedValue({
      pnrrProjectFacets: {
        totalCount: 17,
        components: [{ value: "C15", label: "Educație", count: 11 }],
        measures: [{ value: "I9", label: null, count: 7 }],
        statuses: [
          {
            value: "ÎN IMPLEMENTARE",
            label: "ÎN IMPLEMENTARE",
            count: 13,
          },
        ],
        counties: [{ value: "39", label: "VRANCEA", count: 5 }],
      },
    });

    const result = await pnrrLiveApi.projectFacets(
      { componentCode: "C15", countySiruta: "39" },
      "pnrr-v2:release-1",
    );

    expect(result.totalCount).toBe(17);
    expect(result.components[0]?.count).toBe(11);
    expect(graphqlQuery).toHaveBeenCalledWith(
      expect.stringContaining("pnrrProjectFacets"),
      {
        filter: {
          componentCode: { eq: "C15" },
          countySiruta: { eq: "39" },
        },
        assertReleaseId: "pnrr-v2:release-1",
      },
      expect.objectContaining({ operationName: "PnrrProjectFacets" }),
    );
  });
});
