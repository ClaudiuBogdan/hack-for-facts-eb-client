import type { NgoProfileOverview } from "./api";
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

export const profileFixture: NgoProfileOverview = {
  cui: "4305857",
  identityBasis: "accepted_rnong_cui",
  registryRecords: [{ ...record, linkedOrganizationCui: "4305857" }],
  fiscal: {
    availability: "available",
    data: {
      vatPayer: false,
      declaredFiscallyInactive: null,
      splitVat: true,
      mainCaenCode: "9499",
      mainCaenRev: null,
      queryDate: "2026-09-20",
      capturedAt: null,
      sourceUrl: "https://static.anaf.ro/",
      sourceSnapshotId: "fiscal",
    },
  },
  sections: ["financials", "services", "accreditations", "funding"].map(
    (key) => ({
      key: key as "financials" | "services" | "accreditations" | "funding",
      availability: "not_released",
    }),
  ),
};
