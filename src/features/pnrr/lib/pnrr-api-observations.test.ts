import { describe, expect, it } from "vitest";
import {
  buildBeneficiaryPage,
  buildPnrrWorkerModelFromApiSnapshot,
  findPnrrProject,
} from "../workers/pnrr-query-model";
import {
  computeAggregates,
  filterProjectsBySearch,
  normalizePnrrApiObservation,
  processPnrrApiObservations,
} from "./data-transform";
import { makeFixtureSnapshot, makeObservation } from "./pnrr-api-snapshot.fixture";

describe("API observations in the dashboard's query model", () => {
  it("maps the approved fields: EU contribution, progress as percent, typed dates", () => {
    const record = normalizePnrrApiObservation(
      makeObservation({ commitmentDate: "2023-05-10T00:00:00Z" }),
    );

    expect(record).toMatchObject({
      id: "snapshot-20261015:obs-1",
      projectKey: "project-1",
      engagementId: "1001",
      title: "Reabilitare spital",
      listedFundingRon: 1_000_000,
      sourceValueRon: 1_000_000,
      totalValueRon: 1_500_000,
      nationalContributionRon: 300_000,
      techProgress: 50,
      finProgress: 40,
      status: "mid-progress",
      commitmentDate: "2023-05-10",
      componentCode: "C12",
      measureFullCode: "C12-I1",
      cri: "MS",
      criName: "Ministerul Sănătății",
      fundingSource: "grant",
      county: "București",
    });
  });

  it("keeps a missing ratio missing, distinct from a reported zero", () => {
    const missing = normalizePnrrApiObservation(
      makeObservation({
        physicalProgressRatio: null,
        financialProgressRatio: null,
        status: null,
      }),
    );
    const zero = normalizePnrrApiObservation(
      makeObservation({ physicalProgressRatio: 0, financialProgressRatio: 0 }),
    );
    const stageOnly = normalizePnrrApiObservation(
      makeObservation({
        physicalProgressRatio: null,
        status: "ÎN IMPLEMENTARE (sub 30%)",
      }),
    );

    expect(missing.techProgress).toBeNull();
    expect(missing.finProgress).toBeNull();
    expect(missing.status).toBe("unknown");
    expect(zero.techProgress).toBe(0);
    expect(zero.finProgress).toBe(0);
    expect(zero.status).toBe("not-started");
    expect(stageOnly.techProgress).toBe("under-30-reported");
  });

  it("groups records by the server project key and keeps that id when a filter regroups them", () => {
    const { observations } = makeFixtureSnapshot();
    const { projects, meta } = processPnrrApiObservations(observations);
    const project1 = projects.find((project) => project.id === "key:project-1");

    expect(meta).toEqual({ projectCount: 3, projectRecordCount: 4 });
    expect(project1?.recordCount).toBe(2);
    expect(project1?.listedFundingRon).toBe(1_250_000);

    // A filter that keeps only the loan record regroups a subset of project-1.
    const loanOnly = filterProjectsBySearch(projects, {
      fundingSources: ["loan"],
      counties: ["București"],
    });
    expect(loanOnly.map((project) => project.id)).toEqual(["key:project-1"]);
    expect(loanOnly[0]?.listedFundingRon).toBe(250_000);
    expect(computeAggregates(loanOnly).projectCount).toBe(1);
  });

  it("derives no identity from masked beneficiary fields", () => {
    const masked = makeObservation({
      projectKey: "masked-a",
      sourceObservationId: "obs-a",
      commitmentBusinessId: null,
      contractTitle: "Same title",
      beneficiaryCui: null,
      beneficiaryName: null,
    });
    const otherMasked = makeObservation({
      ...masked,
      projectKey: "masked-b",
      sourceObservationId: "obs-b",
    });
    const { projects } = processPnrrApiObservations([masked, otherMasked]);

    // Same title, same (absent) CUI: still two projects, kept apart by key.
    expect(projects.map((project) => project.id).sort()).toEqual([
      "key:masked-a",
      "key:masked-b",
    ]);
    // And two beneficiary rows, not one merged "unnamed beneficiary".
    expect(buildBeneficiaryPage(projects, {}).totalCount).toBe(2);
  });

  it("builds a release model whose figures come from MIPE listed values and program totals", () => {
    const snapshot = makeFixtureSnapshot();
    const model = buildPnrrWorkerModelFromApiSnapshot(snapshot);

    expect(model.projectCount).toBe(3);
    expect(model.indicators).toMatchObject({
      allocatedTotalEur: 21_410_527_592.99,
      receivedFromEuEur: 10_100_000_000,
      // Withheld by the release: missing, not zero.
      paidTotalEur: null,
      projectCount: 21710,
    });
    // No ORDS fact in the snapshot: the payments source is unavailable.
    expect(model.beneficiaryPayments).toEqual([]);
    expect(model.paymentCapability).toBe("degraded");
    expect(model.capabilityReasonCodes).not.toContain(
      "legacy_unversioned_fileset",
    );
    expect(findPnrrProject(model, "key:project-2")?.title).toBe(
      "Pistă de biciclete",
    );
  });
});
