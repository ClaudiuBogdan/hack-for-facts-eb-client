import { graphqlQuery } from "@/lib/graphql/graphql-client";
import {
  PNRR_CATALOG_RESOURCES_QUERY,
  PNRR_CAPABILITIES_QUERY,
  PNRR_DOCUMENT_REFERENCES_QUERY,
  PNRR_FUNDING_APPLICATIONS_QUERY,
  PNRR_FUNDING_CALLS_QUERY,
  PNRR_ORGANIZATION_IDENTITY_QUERY,
  PNRR_ORGANIZATION_PROFILE_QUERY,
  PNRR_ORGANIZATION_COMMITMENTS_QUERY,
  PNRR_ORGANIZATION_PAYMENTS_QUERY,
  PNRR_ORGANIZATION_PROJECTS_QUERY,
  PNRR_ORGANIZATION_PROCUREMENT_QUERY,
  PNRR_ORGANIZATIONS_QUERY,
  PNRR_OVERVIEW_QUERY,
  PNRR_PLACE_QUERY,
  PNRR_PLACES_QUERY,
  PNRR_PROJECT_QUERY,
  PNRR_PROJECT_FACETS_QUERY,
  PNRR_PROJECT_HISTORY_QUERY,
  PNRR_PROJECTS_QUERY,
  PNRR_PROGRAM_REVISIONS_QUERY,
  PNRR_RELEASE_QUERY,
  PNRR_VERIFICATION_QUERY,
  pnrrOrganizationIdentityResponseSchema,
  pnrrOrganizationProfileResponseSchema,
  pnrrOrganizationCommitmentsResponseSchema,
  pnrrCatalogResourcesResponseSchema,
  pnrrCapabilitiesResponseSchema,
  pnrrDocumentReferencesResponseSchema,
  pnrrFundingApplicationsResponseSchema,
  pnrrFundingCallsResponseSchema,
  pnrrOrganizationPaymentsResponseSchema,
  pnrrOrganizationProjectsResponseSchema,
  pnrrOrganizationProcurementResponseSchema,
  pnrrOrganizationsResponseSchema,
  pnrrOverviewResponseSchema,
  pnrrPlaceResponseSchema,
  pnrrPlacesResponseSchema,
  pnrrProjectResponseSchema,
  pnrrProjectFacetsResponseSchema,
  pnrrProjectHistoryResponseSchema,
  pnrrProjectsResponseSchema,
  pnrrProgramRevisionsResponseSchema,
  pnrrReleaseResponseSchema,
  pnrrStatusResponseSchema,
  pnrrVerificationResponseSchema,
} from "./graphql/pnrr-queries";
import {
  buildPnrrProjectFilter,
  type PnrrProjectListFilters,
} from "./graphql/pnrr-filters";
import {
  mapPnrrOverview,
  mapPnrrPlace,
  mapPnrrProject,
  mapPnrrProjects,
  mapPnrrVerification,
} from "./graphql/pnrr-mappers";

const sourcePageVariables = (
  input: PnrrSourcePageInput,
): Record<string, unknown> => ({
  first: input.first,
  after: input.after,
  assertReleaseId: input.assertReleaseId,
});

const organizationPageVariables = (
  cui: string,
  input: PnrrSourcePageInput,
): Record<string, unknown> => ({
  cui,
  ...sourcePageVariables(input),
});

export const pnrrLiveApi = {
  async status(signal?: AbortSignal) {
    const releaseRaw = await graphqlQuery<unknown>(
      PNRR_RELEASE_QUERY,
      {},
      { operationName: "PnrrRelease", signal },
    );
    const release =
      pnrrReleaseResponseSchema.parse(releaseRaw).pnrrCurrentRelease;
    const capabilitiesRaw = await graphqlQuery<unknown>(
      PNRR_CAPABILITIES_QUERY,
      { assertReleaseId: release.releaseId },
      { operationName: "PnrrCapabilities", signal },
    );
    const capabilities =
      pnrrCapabilitiesResponseSchema.parse(capabilitiesRaw).pnrrCapabilities;
    return pnrrStatusResponseSchema.parse({
      pnrrCurrentRelease: release,
      pnrrCapabilities: capabilities,
    });
  },

  async overview(assertReleaseId?: string, signal?: AbortSignal) {
    const raw = await graphqlQuery<unknown>(
      PNRR_OVERVIEW_QUERY,
      { assertReleaseId },
      { operationName: "PnrrOverview", signal },
    );
    return mapPnrrOverview(pnrrOverviewResponseSchema.parse(raw).pnrrOverview);
  },

  async projects(
    input: {
      readonly filters: PnrrProjectListFilters;
      readonly first: number;
      readonly after?: string;
      readonly assertReleaseId?: string;
    },
    signal?: AbortSignal,
  ) {
    const raw = await graphqlQuery<unknown>(
      PNRR_PROJECTS_QUERY,
      {
        filter: buildPnrrProjectFilter(input.filters),
        first: input.first,
        after: input.after,
        assertReleaseId: input.assertReleaseId,
      },
      { operationName: "PnrrProjects", signal },
    );
    return mapPnrrProjects(pnrrProjectsResponseSchema.parse(raw).pnrrProjects);
  },

  async projectFacets(
    filters: PnrrProjectListFilters,
    assertReleaseId?: string,
    signal?: AbortSignal,
  ) {
    const raw = await graphqlQuery<unknown>(
      PNRR_PROJECT_FACETS_QUERY,
      {
        filter: buildPnrrProjectFilter(filters),
        assertReleaseId,
      },
      { operationName: "PnrrProjectFacets", signal },
    );
    return pnrrProjectFacetsResponseSchema.parse(raw).pnrrProjectFacets;
  },

  async project(key: string, assertReleaseId?: string, signal?: AbortSignal) {
    const raw = await graphqlQuery<unknown>(
      PNRR_PROJECT_QUERY,
      { key, assertReleaseId },
      { operationName: "PnrrProject", signal },
    );
    return mapPnrrProject(pnrrProjectResponseSchema.parse(raw).pnrrProject);
  },

  async projectHistory(
    key: string,
    assertReleaseId?: string,
    signal?: AbortSignal,
  ) {
    const raw = await graphqlQuery<unknown>(
      PNRR_PROJECT_HISTORY_QUERY,
      { key, assertReleaseId },
      { operationName: "PnrrProjectHistory", signal },
    );
    return pnrrProjectHistoryResponseSchema.parse(raw).pnrrProjectHistory;
  },

  async organizationIdentity(
    cui: string,
    assertReleaseId?: string,
    signal?: AbortSignal,
  ) {
    const raw = await graphqlQuery<unknown>(
      PNRR_ORGANIZATION_IDENTITY_QUERY,
      { cui, assertReleaseId },
      { operationName: "PnrrOrganizationIdentity", signal },
    );
    const parsed = pnrrOrganizationIdentityResponseSchema.parse(raw);
    return parsed.pnrrEntity;
  },

  async organizationProfile(
    cui: string,
    assertReleaseId?: string,
    signal?: AbortSignal,
  ) {
    const raw = await graphqlQuery<unknown>(
      PNRR_ORGANIZATION_PROFILE_QUERY,
      { cui, assertReleaseId },
      { operationName: "PnrrOrganizationProfile", signal },
    );
    return pnrrOrganizationProfileResponseSchema.parse(raw).pnrrEntityProfile;
  },

  async organizationPayments(
    cui: string,
    input: PnrrSourcePageInput,
    signal?: AbortSignal,
  ) {
    const raw = await graphqlQuery<unknown>(
      PNRR_ORGANIZATION_PAYMENTS_QUERY,
      organizationPageVariables(cui, input),
      { operationName: "PnrrOrganizationPayments", signal },
    );
    return pnrrOrganizationPaymentsResponseSchema.parse(raw).pnrrPayments;
  },

  async organizationCommitments(
    cui: string,
    input: PnrrSourcePageInput,
    signal?: AbortSignal,
  ) {
    const raw = await graphqlQuery<unknown>(
      PNRR_ORGANIZATION_COMMITMENTS_QUERY,
      organizationPageVariables(cui, input),
      { operationName: "PnrrOrganizationCommitments", signal },
    );
    return pnrrOrganizationCommitmentsResponseSchema.parse(raw).pnrrCommitments;
  },

  async organizationProjects(
    cui: string,
    input: PnrrSourcePageInput,
    signal?: AbortSignal,
  ) {
    const raw = await graphqlQuery<unknown>(
      PNRR_ORGANIZATION_PROJECTS_QUERY,
      organizationPageVariables(cui, input),
      { operationName: "PnrrOrganizationProjects", signal },
    );
    return pnrrOrganizationProjectsResponseSchema.parse(raw).pnrrProjects;
  },

  async organizationProcurement(
    cui: string,
    input: PnrrSourcePageInput,
    signal?: AbortSignal,
  ) {
    const raw = await graphqlQuery<unknown>(
      PNRR_ORGANIZATION_PROCUREMENT_QUERY,
      organizationPageVariables(cui, input),
      { operationName: "PnrrOrganizationProcurement", signal },
    );
    return pnrrOrganizationProcurementResponseSchema.parse(raw)
      .pnrrAcquisitions;
  },

  async organizations(
    input: {
      readonly filters: PnrrOrganizationListFilters;
      readonly first: number;
      readonly after?: string;
      readonly assertReleaseId?: string;
    },
    signal?: AbortSignal,
  ) {
    const filter = {
      ...(input.filters.q ? { q: { contains: input.filters.q.trim() } } : {}),
      ...(input.filters.role ? { role: { eq: input.filters.role } } : {}),
      ...(input.filters.hub ? { hub: { eq: input.filters.hub } } : {}),
    };
    const raw = await graphqlQuery<unknown>(
      PNRR_ORGANIZATIONS_QUERY,
      {
        filter,
        first: input.first,
        after: input.after,
        assertReleaseId: input.assertReleaseId,
      },
      { operationName: "PnrrOrganizations", signal },
    );
    return pnrrOrganizationsResponseSchema.parse(raw).pnrrEntities;
  },

  async place(
    countySiruta: string,
    assertReleaseId?: string,
    signal?: AbortSignal,
  ) {
    const raw = await graphqlQuery<unknown>(
      PNRR_PLACE_QUERY,
      { countySiruta, assertReleaseId },
      { operationName: "PnrrPlace", signal },
    );
    return mapPnrrPlace(pnrrPlaceResponseSchema.parse(raw).pnrrPlace);
  },

  async places(assertReleaseId?: string, signal?: AbortSignal) {
    const raw = await graphqlQuery<unknown>(
      PNRR_PLACES_QUERY,
      { assertReleaseId },
      { operationName: "PnrrPlaces", signal },
    );
    return pnrrPlacesResponseSchema.parse(raw).pnrrPlaces;
  },

  async verification(assertReleaseId?: string, signal?: AbortSignal) {
    const raw = await graphqlQuery<unknown>(
      PNRR_VERIFICATION_QUERY,
      { assertReleaseId },
      { operationName: "PnrrVerification", signal },
    );
    return mapPnrrVerification(
      pnrrVerificationResponseSchema.parse(raw).pnrrVerification,
    );
  },

  async fundingCalls(input: PnrrSourcePageInput, signal?: AbortSignal) {
    const raw = await graphqlQuery<unknown>(
      PNRR_FUNDING_CALLS_QUERY,
      sourcePageVariables(input),
      {
        operationName: "PnrrFundingCalls",
        signal,
      },
    );
    return pnrrFundingCallsResponseSchema.parse(raw).pnrrFundingCalls;
  },

  async fundingApplications(input: PnrrSourcePageInput, signal?: AbortSignal) {
    const raw = await graphqlQuery<unknown>(
      PNRR_FUNDING_APPLICATIONS_QUERY,
      sourcePageVariables(input),
      { operationName: "PnrrFundingApplications", signal },
    );
    return pnrrFundingApplicationsResponseSchema.parse(raw)
      .pnrrFundingApplicationListings;
  },

  async programRevisions(input: PnrrSourcePageInput, signal?: AbortSignal) {
    const raw = await graphqlQuery<unknown>(
      PNRR_PROGRAM_REVISIONS_QUERY,
      sourcePageVariables(input),
      { operationName: "PnrrProgramRevisions", signal },
    );
    return pnrrProgramRevisionsResponseSchema.parse(raw).pnrrProgramRevisions;
  },

  async catalogResources(input: PnrrSourcePageInput, signal?: AbortSignal) {
    const raw = await graphqlQuery<unknown>(
      PNRR_CATALOG_RESOURCES_QUERY,
      sourcePageVariables(input),
      { operationName: "PnrrCatalogResources", signal },
    );
    return pnrrCatalogResourcesResponseSchema.parse(raw).pnrrCatalogResources;
  },

  async documentReferences(input: PnrrSourcePageInput, signal?: AbortSignal) {
    const raw = await graphqlQuery<unknown>(
      PNRR_DOCUMENT_REFERENCES_QUERY,
      sourcePageVariables(input),
      { operationName: "PnrrDocumentReferences", signal },
    );
    return pnrrDocumentReferencesResponseSchema.parse(raw)
      .pnrrDocumentReferences;
  },
};

export interface PnrrSourcePageInput {
  readonly first: number;
  readonly after?: string;
  readonly assertReleaseId?: string;
}

export interface PnrrOrganizationListFilters {
  readonly q?: string;
  readonly role?: "beneficiary" | "applicant" | "winner" | "subcontractor";
  readonly hub?: "public_entities" | "companies";
}
