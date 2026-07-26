import { describe, expect, it, vi } from "vitest";
import {
  buildPnrrProjectPageCsv,
  buildPnrrVerificationCsv,
  downloadPnrrProjectPageCsv,
  downloadPnrrVerificationCsv,
} from "./pnrr-live-export";
import {
  pnrrProjectSchema,
  pnrrReleaseSchema,
  pnrrVerificationSchema,
} from "@/schemas/pnrr-live";

describe("buildPnrrProjectPageCsv", () => {
  it("preserves exact decimal strings and source provenance", () => {
    const release = pnrrReleaseSchema.parse({
      releaseId: "pnrr-v2:test/release",
      releaseKind: "operational_snapshot",
      state: "degraded",
      sourceSnapshotAt: null,
      completedAt: null,
      limitation: "fixture",
      lanes: [],
    });
    const project = pnrrProjectSchema.parse({
      projectKey: "mipe:1",
      projectKeyVersion: "mipe_observation_v1",
      sourceObservationId: "mipe:1",
      snapshotId: "snapshot-1",
      snapshotDate: "2026-07-01",
      endpointName: "project_progress",
      itemKey: "1",
      commitmentBusinessId: null,
      contractNumber: '"A",1',
      contractTitle: null,
      beneficiaryCui: "123",
      beneficiaryName: "Example",
      beneficiaryType: null,
      componentCode: "C1",
      measureCode: "I1",
      submeasureCode: null,
      responsibleInstitutionCode: null,
      responsibleInstitutionName: null,
      financingSource: null,
      commitmentDate: null,
      startDate: null,
      endDate: null,
      lastFundingDate: null,
      totalValueRon: "999999999999999999.000000000000000001",
      euContributionRon: null,
      nationalPublicValueRon: null,
      vatRon: null,
      ineligibleValueRon: null,
      receivedAmountRon: null,
      allocatedEur: "1.234567890123456789",
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
      financialProgressRatio: 0.5,
      physicalProgressRatio: null,
      countyName: null,
      countySiruta: null,
      localityName: null,
      impact: null,
      timelineMonth: null,
      timelineLabel: null,
      status: null,
      sourceSystem: "pnrr_mipe_dashboard",
      sourceUrl: "https://example.test/source",
      retrievedAt: "2026-07-01T00:00:00Z",
      linkedCommitmentKey: null,
      commitmentRelationship: null,
      commitmentAggregationState: null,
    });

    const csv = buildPnrrProjectPageCsv([project], release);

    expect(csv).toContain('"999999999999999999.000000000000000001"');
    expect(csv).toContain('"1.234567890123456789"');
    expect(csv).toContain('"""A"",1"');
    expect(csv).toContain('"https://example.test/source"');
    expect(csv).toContain('"pnrr-v2:test/release"');
  });
});

describe("buildPnrrVerificationCsv", () => {
  it("exports deterministic signal codes with release identity", () => {
    const release = {
      releaseId: "pnrr-v2:verification",
      releaseKind: "operational_snapshot",
      state: "degraded",
      sourceSnapshotAt: null,
      completedAt: null,
      limitation: "fixture",
      lanes: [],
    };
    const verification = pnrrVerificationSchema.parse({
      meta: {
        state: "degraded",
        reasonCodes: ["LEGACY_UNVERSIONED"],
        caveats: [],
        provenance: ["pnrr.api_commitments"],
        coverage: [],
        release,
      },
      ruleSetVersion: "pnrr-verification-v1",
      unresolvedCommitmentCount: 3,
      duplicatePaymentGroupCount: 2,
      missingCommitmentSourceUrlCount: 1,
      endBeforeStartCount: 4,
      overHundredProgressCount: 5,
      missingProgressLinkCount: 6,
    });

    const csv = buildPnrrVerificationCsv(verification);

    expect(csv).toContain('"pnrr-v2:verification"');
    expect(csv).toContain('"answer_state","release_state","rule_set_version"');
    expect(csv).toContain('"pnrr-verification-v1"');
    expect(csv).toContain('"LEGACY_UNVERSIONED"');
    expect(csv).toContain('"pnrr.api_commitments"');
    expect(csv).toContain('"unresolved_commitment_envelope","3"');
    expect(csv).toContain('"progress_over_100","5"');
    expect(csv).toContain('"missing_progress_link","6"');
  });
});

describe("PNRR export abstention", () => {
  it("does not create a project CSV download for an abstained release", () => {
    const createObjectURL = vi.fn(() => "blob:test");
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL: vi.fn() });
    const release = pnrrReleaseSchema.parse({
      releaseId: "pnrr-release-v1:truthy-abstained",
      releaseKind: "operational_snapshot",
      state: "abstained",
      sourceSnapshotAt: null,
      completedAt: null,
      limitation: "generation mismatch",
      lanes: [],
    });

    downloadPnrrProjectPageCsv([], release);

    expect(createObjectURL).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("does not create a verification CSV download for abstained answers", () => {
    const createObjectURL = vi.fn(() => "blob:test");
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL: vi.fn() });
    const release = {
      releaseId: "pnrr-release-v1:truthy-abstained",
      releaseKind: "operational_snapshot",
      state: "abstained",
      sourceSnapshotAt: null,
      completedAt: null,
      limitation: "generation mismatch",
      lanes: [],
    };
    const verification = pnrrVerificationSchema.parse({
      meta: {
        state: "abstained",
        reasonCodes: ["active_release_generation_mismatch"],
        caveats: [],
        provenance: [],
        coverage: [],
        release,
      },
      ruleSetVersion: "pnrr-verification-v1",
      unresolvedCommitmentCount: 0,
      duplicatePaymentGroupCount: 0,
      missingCommitmentSourceUrlCount: 0,
      endBeforeStartCount: 0,
      overHundredProgressCount: 0,
      missingProgressLinkCount: 0,
    });

    downloadPnrrVerificationCsv(verification);

    expect(createObjectURL).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
