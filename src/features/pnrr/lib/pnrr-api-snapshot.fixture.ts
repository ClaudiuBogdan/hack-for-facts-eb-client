import type {
  PnrrDashboardSnapshot,
  PnrrLiveProject,
  PnrrLiveRelease,
} from "@/schemas/pnrr-live";

/** Test fixtures shaped like the API's server-only dashboard snapshot. */

export const FIXTURE_RELEASE_ID = "pnrr-release-v1:mipe-20261015T000000Z";
export const NEXT_FIXTURE_RELEASE_ID = "pnrr-release-v1:mipe-20261115T000000Z";

export function makeFixtureRelease(
  releaseId: string = FIXTURE_RELEASE_ID,
  overrides: Partial<PnrrLiveRelease> = {},
): PnrrLiveRelease {
  return {
    releaseId,
    releaseKind: "mipe_scoped",
    state: "degraded",
    sourceSnapshotAt: "2026-10-15T00:00:00Z",
    completedAt: "2026-11-14T11:00:00Z",
    limitation: "ORDS payment facts are withheld in this release.",
    lanes: [
      {
        lane: "mipe_projects",
        state: "served",
        asOf: "2026-10-15",
        suspended: false,
        reasonCodes: [],
      },
      {
        lane: "ords_payments_capture",
        state: "abstained",
        asOf: "2026-11-13",
        suspended: false,
        reasonCodes: ["payment_policy_pending"],
      },
    ],
    ...overrides,
  };
}

export function makeObservation(
  overrides: Partial<PnrrLiveProject> = {},
): PnrrLiveProject {
  return {
    projectKey: "project-1",
    projectKeyVersion: "project_key_v1",
    sourceObservationId: "obs-1",
    snapshotId: "snapshot-20261015",
    snapshotDate: "2026-10-15",
    endpointName: "progres_tehnic_proiecte",
    itemKey: null,
    commitmentBusinessId: "1001",
    contractNumber: "C-1",
    contractTitle: "Reabilitare spital",
    beneficiaryCui: "4267117",
    beneficiaryName: "Municipiul București",
    beneficiaryType: "UAT",
    componentCode: "C12",
    measureCode: "I1",
    submeasureCode: null,
    responsibleInstitutionCode: "MS",
    responsibleInstitutionName: "Ministerul Sănătății",
    financingSource: "grant",
    commitmentDate: "2023-05-10",
    startDate: "2023-06-01",
    endDate: "2026-06-30",
    lastFundingDate: null,
    totalValueRon: "1500000.00",
    euContributionRon: "1000000.00",
    nationalPublicValueRon: "300000.00",
    vatRon: "200000.00",
    ineligibleValueRon: "0.00",
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
    financialProgressRatio: 0.4,
    physicalProgressRatio: 0.5,
    countyName: "București",
    countySiruta: "40",
    localityName: "București",
    impact: null,
    timelineMonth: null,
    timelineLabel: null,
    status: "ÎN IMPLEMENTARE",
    sourceSystem: "mipe",
    sourceUrl: "https://mfe.gov.ro/pnrr-dashboard",
    retrievedAt: "2026-10-15T06:00:00Z",
    linkedCommitmentKey: null,
    commitmentRelationship: null,
    commitmentAggregationState: null,
    ...overrides,
  };
}

const fact = (amount: string | null) => ({
  factType: "fixture",
  amount,
  currency: "EUR" as const,
  aggregationState: "reported",
  coveredCount: 1,
  totalCount: 1,
});

/** The snapshot as the API's REST route sends it: `{ ok, data }`. */
export function makeFixtureSnapshotEnvelope(
  releaseId: string = FIXTURE_RELEASE_ID,
): { readonly ok: true; readonly data: PnrrDashboardSnapshot } {
  return { ok: true, data: makeFixtureSnapshot(releaseId) };
}

/**
 * Four records of three projects: project-1 has two records (a noncanonical
 * one with another funding source), project-2 is a loan in Cluj, project-3 a
 * withheld beneficiary whose progress the source did not publish.
 */
export function makeFixtureSnapshot(
  releaseId: string = FIXTURE_RELEASE_ID,
): PnrrDashboardSnapshot {
  return {
    release: makeFixtureRelease(releaseId),
    program: {
      snapshotDate: "2026-10-15",
      projectCount: 21710,
      allocationEur: fact("21410527592.99"),
      receivedEur: fact("10100000000.00"),
      paidEur: fact(null),
    },
    observations: [
      makeObservation(),
      makeObservation({
        sourceObservationId: "obs-1b",
        projectKeyVersion: "mipe_observation_v1",
        financingSource: "loan",
        euContributionRon: "250000.00",
      }),
      makeObservation({
        projectKey: "project-2",
        sourceObservationId: "obs-2",
        commitmentBusinessId: "1002",
        contractTitle: "Pistă de biciclete",
        beneficiaryCui: "4305857",
        beneficiaryName: "Municipiul Cluj-Napoca",
        componentCode: "C10",
        financingSource: "loan",
        euContributionRon: "3000000.00",
        countyName: "Cluj",
        countySiruta: "12",
        localityName: "Cluj-Napoca",
        physicalProgressRatio: 1,
        financialProgressRatio: 1,
        status: "FINALIZAT",
      }),
      makeObservation({
        projectKey: "project-3",
        sourceObservationId: "obs-3",
        commitmentBusinessId: null,
        contractTitle: "Proiect cu beneficiar protejat",
        beneficiaryCui: null,
        beneficiaryName: null,
        componentCode: "C10",
        euContributionRon: "500000.00",
        countyName: "Cluj",
        countySiruta: "12",
        localityName: "Cluj-Napoca",
        physicalProgressRatio: null,
        financialProgressRatio: null,
        status: null,
      }),
    ],
  };
}
