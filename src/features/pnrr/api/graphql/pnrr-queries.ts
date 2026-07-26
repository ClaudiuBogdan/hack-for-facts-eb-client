import { z } from "zod";
import {
  pnrrCapabilitySchema,
  pnrrCatalogResourceConnectionSchema,
  pnrrCommitmentConnectionSchema,
  pnrrEntityConnectionSchema,
  pnrrEntityProfileSchema,
  pnrrEntitySchema,
  pnrrDocumentReferenceConnectionSchema,
  pnrrFundingApplicationListingConnectionSchema,
  pnrrFundingCallConnectionSchema,
  pnrrOverviewSchema,
  pnrrPlaceProfileSchema,
  pnrrPlaceSummarySchema,
  pnrrProjectConnectionSchema,
  pnrrProjectFacetsSchema,
  pnrrProjectSchema,
  pnrrProgramRevisionConnectionSchema,
  pnrrReleaseSchema,
  pnrrVerificationSchema,
} from "@/schemas/pnrr-live";

const RELEASE_FIELDS = /* GraphQL */ `
  releaseId releaseKind state sourceSnapshotAt completedAt limitation
  lanes { lane state asOf suspended reasonCodes }
`;

const META_FIELDS = /* GraphQL */ `
  state reasonCodes caveats provenance
  coverage { field covered total percent }
  release { ${RELEASE_FIELDS} }
`;

const MONEY_FACT_FIELDS = /* GraphQL */ `
  factType amount currency aggregationState coveredCount totalCount
`;

const COMMITMENT_FIELDS = /* GraphQL */ `
  commitmentKey beneficiaryCui beneficiaryName idAngajament
  contractNumber contractTitle componentCode measureCode
  totalValue euValue reportedTotalValue reportedEuValue
  aggregationState envelopeObservationCount qualityIssues
  financialProgress physicalProgress commitmentDate startDate endDate
  status countyName countySiruta localityName
  sourceSystem sourceUrl dateQuality progressCount retrievedAt
`;

const PROJECT_FIELDS = /* GraphQL */ `
  projectKey projectKeyVersion sourceObservationId
  snapshotId snapshotDate endpointName itemKey
  commitmentBusinessId contractNumber contractTitle
  beneficiaryCui beneficiaryName beneficiaryType
  componentCode measureCode submeasureCode
  responsibleInstitutionCode responsibleInstitutionName financingSource
  commitmentDate startDate endDate lastFundingDate
  totalValueRon euContributionRon nationalPublicValueRon vatRon
  ineligibleValueRon receivedAmountRon
  allocatedEur paidEur receivedEur prefinancingEur suspendedEur revokedEur
  projectCount contractBeneficiaryCount paymentBeneficiaryCount
  nationalImpactProjectCount paymentCount beneficiaryCount totalEur totalRon
  financialProgressRatio physicalProgressRatio
  countyName countySiruta localityName impact timelineMonth timelineLabel status
  sourceSystem sourceUrl retrievedAt
  linkedCommitmentKey commitmentRelationship commitmentAggregationState
`;

const ENTITY_FIELDS = /* GraphQL */ `
  cui name nameSource caenCode isActive isVatPayer
  roles { beneficiary applicant winner subcontractor }
  hubs firstSeenSource
`;

export const PNRR_RELEASE_QUERY = /* GraphQL */ `
  query PnrrRelease {
    pnrrCurrentRelease { ${RELEASE_FIELDS} }
  }
`;

export const PNRR_CAPABILITIES_QUERY = /* GraphQL */ `
  query PnrrCapabilities($assertReleaseId: ID) {
    pnrrCapabilities(assertReleaseId: $assertReleaseId) {
      id
      releaseId
      state
      reasonCodes
      limitation
    }
  }
`;

export const pnrrReleaseResponseSchema = z.object({
  pnrrCurrentRelease: pnrrReleaseSchema,
});

export const pnrrCapabilitiesResponseSchema = z.object({
  pnrrCapabilities: z.array(pnrrCapabilitySchema),
});

export const pnrrStatusResponseSchema = z
  .object({
    pnrrCurrentRelease: pnrrReleaseSchema,
    pnrrCapabilities: z.array(pnrrCapabilitySchema),
  })
  .superRefine((status, context) => {
    for (const capability of status.pnrrCapabilities) {
      if (capability.releaseId !== status.pnrrCurrentRelease.releaseId) {
        context.addIssue({
          code: "custom",
          path: ["pnrrCapabilities"],
          message: "PNRR capabilities do not match the observed release",
        });
        return;
      }
    }
  });

export const PNRR_OVERVIEW_QUERY = /* GraphQL */ `
  query PnrrOverview($assertReleaseId: ID) {
    pnrrOverview(assertReleaseId: $assertReleaseId) {
      meta { ${META_FIELDS} }
      program {
        snapshotDate projectCount
        allocationEur { ${MONEY_FACT_FIELDS} }
        receivedEur { ${MONEY_FACT_FIELDS} }
        paidEur { ${MONEY_FACT_FIELDS} }
      }
      beneficiaryPayments {
        count firstDate lastDate
        netRon { ${MONEY_FACT_FIELDS} }
        grossRon { ${MONEY_FACT_FIELDS} }
        reversalRon { ${MONEY_FACT_FIELDS} }
      }
      commitments {
        count additiveCount unresolvedCount
        additiveRon { ${MONEY_FACT_FIELDS} }
      }
      delivery {
        observedCount completedCount overHundredCount
        missingFinancialProgressCount missingPhysicalProgressCount
      }
    }
  }
`;

export const pnrrOverviewResponseSchema = z.object({
  pnrrOverview: pnrrOverviewSchema,
});

export const PNRR_PROJECTS_QUERY = /* GraphQL */ `
  query PnrrProjects(
    $filter: PnrrProjectsFilter
    $first: Int
    $after: String
    $assertReleaseId: ID
  ) {
    pnrrProjects(
      filter: $filter
      first: $first
      after: $after
      assertReleaseId: $assertReleaseId
    ) {
      edges { cursor node { ${PROJECT_FIELDS} } }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

export const pnrrProjectsResponseSchema = z.object({
  pnrrProjects: pnrrProjectConnectionSchema,
});

export const PNRR_PROJECT_FACETS_QUERY = /* GraphQL */ `
  query PnrrProjectFacets($filter: PnrrProjectsFilter, $assertReleaseId: ID) {
    pnrrProjectFacets(filter: $filter, assertReleaseId: $assertReleaseId) {
      totalCount
      components {
        value
        label
        count
      }
      measures {
        value
        label
        count
      }
      statuses {
        value
        label
        count
      }
      counties {
        value
        label
        count
      }
    }
  }
`;

export const pnrrProjectFacetsResponseSchema = z.object({
  pnrrProjectFacets: pnrrProjectFacetsSchema,
});

export const PNRR_PROJECT_QUERY = /* GraphQL */ `
  query PnrrProject($key: ID!, $assertReleaseId: ID) {
    pnrrProject(key: $key, assertReleaseId: $assertReleaseId) {
      ${PROJECT_FIELDS}
    }
  }
`;

export const pnrrProjectResponseSchema = z.object({
  pnrrProject: pnrrProjectSchema.nullable(),
});

export const PNRR_PROJECT_HISTORY_QUERY = /* GraphQL */ `
  query PnrrProjectHistory($key: ID!, $assertReleaseId: ID) {
    pnrrProjectHistory(key: $key, assertReleaseId: $assertReleaseId) {
      ${PROJECT_FIELDS}
    }
  }
`;

export const pnrrProjectHistoryResponseSchema = z.object({
  pnrrProjectHistory: z.array(pnrrProjectSchema),
});

export const PNRR_ORGANIZATIONS_QUERY = /* GraphQL */ `
  query PnrrOrganizations(
    $filter: PnrrEntitiesFilter
    $first: Int
    $after: String
    $assertReleaseId: ID
  ) {
    pnrrEntities(
      filter: $filter
      first: $first
      after: $after
      assertReleaseId: $assertReleaseId
    ) {
      edges { cursor node { ${ENTITY_FIELDS} } }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

export const pnrrOrganizationsResponseSchema = z.object({
  pnrrEntities: pnrrEntityConnectionSchema,
});

export const PNRR_ORGANIZATION_IDENTITY_QUERY = /* GraphQL */ `
  query PnrrOrganizationIdentity($cui: CUI!, $assertReleaseId: ID) {
    pnrrEntity(cui: $cui, assertReleaseId: $assertReleaseId) {
      ${ENTITY_FIELDS}
    }
  }
`;

export const PNRR_ORGANIZATION_PROFILE_QUERY = /* GraphQL */ `
  query PnrrOrganizationProfile($cui: CUI!, $assertReleaseId: ID) {
    pnrrEntityProfile(cui: $cui, assertReleaseId: $assertReleaseId) {
      cui
      payments {
        count
        totalLei
        totalEur
        grossLei
        reversalLei
        zeroAdjustmentCount
        firstDate
        lastDate
      }
      commitments {
        count
        totalValue
        euValue
        unresolvedCount
        avgFinancialProgress
        avgPhysicalProgress
      }
      procurement {
        acquisitionsAsBeneficiary
        acquisitionsValue
        participantRelationCount
        unknownRelationshipCount
        participantValue
        valueAggregationState
        valueReason
      }
      grainNote
      dataAsOf
    }
  }
`;

export const PNRR_ORGANIZATION_PAYMENTS_QUERY = /* GraphQL */ `
  query PnrrOrganizationPayments(
    $cui: String!
    $first: Int!
    $after: String
    $assertReleaseId: ID
  ) {
    pnrrPayments(
      filter: { beneficiaryCui: { eq: $cui } }
      first: $first
      after: $after
      assertReleaseId: $assertReleaseId
    ) {
      edges {
        cursor
        node {
          paymentKey
          amountLei
          amountEur
          paymentDirection
          paymentDate
          componentCode
          measureFenix
          countyName
          sourceSystem
          retrievedAt
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const PNRR_ORGANIZATION_COMMITMENTS_QUERY = /* GraphQL */ `
  query PnrrOrganizationCommitments(
    $cui: String!
    $first: Int!
    $after: String
    $assertReleaseId: ID
  ) {
    pnrrCommitments(
      filter: { beneficiaryCui: { eq: $cui } }
      first: $first
      after: $after
      assertReleaseId: $assertReleaseId
    ) {
      edges { cursor node { ${COMMITMENT_FIELDS} } }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

export const PNRR_ORGANIZATION_PROJECTS_QUERY = /* GraphQL */ `
  query PnrrOrganizationProjects(
    $cui: String!
    $first: Int!
    $after: String
    $assertReleaseId: ID
  ) {
    pnrrProjects(
      filter: { beneficiaryCui: { eq: $cui } }
      first: $first
      after: $after
      assertReleaseId: $assertReleaseId
    ) {
      edges { cursor node { ${PROJECT_FIELDS} } }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

export const PNRR_ORGANIZATION_PROCUREMENT_QUERY = /* GraphQL */ `
  query PnrrOrganizationProcurement(
    $cui: String!
    $first: Int!
    $after: String
    $assertReleaseId: ID
  ) {
    pnrrAcquisitions(
      filter: { beneficiaryCui: { eq: $cui } }
      first: $first
      after: $after
      assertReleaseId: $assertReleaseId
    ) {
      edges {
        cursor
        node {
          acquisitionKey
          procedureType
          signedAt
          contractorCount
          valueAggregationState
          valueReason
          contractors {
            contractorKey
            role
            sourceRole
            contractorCui
            contractorName
            contractorCountry
            contractValue
            valueAggregationState
            valueReason
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const pnrrOrganizationResponseSchema = z.object({
  pnrrEntity: pnrrEntitySchema.nullable(),
  pnrrEntityProfile: pnrrEntityProfileSchema.nullable(),
  pnrrPayments: z.object({
    edges: z.array(
      z.object({
        cursor: z.string(),
        node: z.object({
          paymentKey: z.string(),
          amountLei: z.string().nullable(),
          amountEur: z.string().nullable(),
          paymentDirection: z.string().nullable(),
          paymentDate: z.string().nullable(),
          componentCode: z.string().nullable(),
          measureFenix: z.string().nullable(),
          countyName: z.string().nullable(),
          sourceSystem: z.string().nullable(),
          retrievedAt: z.string().nullable(),
        }),
      }),
    ),
    pageInfo: z.object({
      hasNextPage: z.boolean(),
      endCursor: z.string().nullable(),
    }),
  }),
  pnrrCommitments: pnrrCommitmentConnectionSchema,
  pnrrProjects: pnrrProjectConnectionSchema,
  pnrrAcquisitions: z.object({
    edges: z.array(
      z.object({
        cursor: z.string(),
        node: z.object({
          acquisitionKey: z.string(),
          procedureType: z.string().nullable(),
          signedAt: z.string().nullable(),
          contractorCount: z.number(),
          valueAggregationState: z.string(),
          valueReason: z.string(),
          contractors: z.array(
            z.object({
              contractorKey: z.string(),
              role: z.string(),
              sourceRole: z.string(),
              contractorCui: z.string().nullable(),
              contractorName: z.string().nullable(),
              contractorCountry: z.string().nullable(),
              contractValue: z.string().nullable(),
              valueAggregationState: z.string(),
              valueReason: z.string(),
            }),
          ),
        }),
      }),
    ),
    pageInfo: z.object({
      hasNextPage: z.boolean(),
      endCursor: z.string().nullable(),
    }),
  }),
});

export const pnrrOrganizationIdentityResponseSchema =
  pnrrOrganizationResponseSchema.pick({
    pnrrEntity: true,
  });
export const pnrrOrganizationProfileResponseSchema =
  pnrrOrganizationResponseSchema.pick({
    pnrrEntityProfile: true,
  });
export const pnrrOrganizationPaymentsResponseSchema =
  pnrrOrganizationResponseSchema.pick({
    pnrrPayments: true,
  });
export const pnrrOrganizationCommitmentsResponseSchema =
  pnrrOrganizationResponseSchema.pick({
    pnrrCommitments: true,
  });
export const pnrrOrganizationProjectsResponseSchema =
  pnrrOrganizationResponseSchema.pick({
    pnrrProjects: true,
  });
export const pnrrOrganizationProcurementResponseSchema =
  pnrrOrganizationResponseSchema.pick({
    pnrrAcquisitions: true,
  });

export const PNRR_PLACE_QUERY = /* GraphQL */ `
  query PnrrPlace($countySiruta: SIRUTA!, $assertReleaseId: ID) {
    pnrrPlace(
      countySiruta: $countySiruta
      assertReleaseId: $assertReleaseId
    ) {
      meta { ${META_FIELDS} }
      countySiruta countyName paymentCount paymentNetRon
      commitmentCount additiveCommitmentCount unresolvedCommitmentCount
      additiveCommitmentRon
      projectObservationCount
      sourceLocalityLabelCount sourceLocalityLabelValue
    }
  }
`;

export const pnrrPlaceResponseSchema = z.object({
  pnrrPlace: pnrrPlaceProfileSchema.nullable(),
});

export const PNRR_PLACES_QUERY = /* GraphQL */ `
  query PnrrPlaces($assertReleaseId: ID) {
    pnrrPlaces(assertReleaseId: $assertReleaseId) {
      countySiruta
      countyName
      paymentCount
      paymentNetRon
      commitmentCount
      additiveCommitmentCount
      unresolvedCommitmentCount
      additiveCommitmentRon
      projectObservationCount
      sourceLocalityLabelCount
      sourceLocalityLabelValue
    }
  }
`;

export const pnrrPlacesResponseSchema = z.object({
  pnrrPlaces: z.array(pnrrPlaceSummarySchema),
});

export const PNRR_VERIFICATION_QUERY = /* GraphQL */ `
  query PnrrVerification($assertReleaseId: ID) {
    pnrrVerification(assertReleaseId: $assertReleaseId) {
      meta { ${META_FIELDS} }
      ruleSetVersion
      unresolvedCommitmentCount duplicatePaymentGroupCount
      missingCommitmentSourceUrlCount endBeforeStartCount
      overHundredProgressCount missingProgressLinkCount
    }
  }
`;

export const pnrrVerificationResponseSchema = z.object({
  pnrrVerification: pnrrVerificationSchema,
});

export const PNRR_FUNDING_CALLS_QUERY = /* GraphQL */ `
  query PnrrFundingCalls($first: Int!, $after: String, $assertReleaseId: ID) {
    pnrrFundingCalls(
      first: $first
      after: $after
      assertReleaseId: $assertReleaseId
    ) {
      edges {
        cursor
        node {
          callId
          title
          budgetRon
          totalEligibleValueRon
          sourceSystem
          sourceUrl
          retrievedAt
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const pnrrFundingCallsResponseSchema = z.object({
  pnrrFundingCalls: pnrrFundingCallConnectionSchema,
});

export const PNRR_FUNDING_APPLICATIONS_QUERY = /* GraphQL */ `
  query PnrrFundingApplications(
    $first: Int!
    $after: String
    $assertReleaseId: ID
  ) {
    pnrrFundingApplicationListings(
      first: $first
      after: $after
      assertReleaseId: $assertReleaseId
    ) {
      edges {
        cursor
        node {
          listingId
          listingCandidateKey
          callId
          sourceRequestCallId
          applicantCui
          applicantName
          sentAt
          orderNumber
          completenessStatus
          sourceSystem
          sourceUrl
          retrievedAt
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const pnrrFundingApplicationsResponseSchema = z.object({
  pnrrFundingApplicationListings: pnrrFundingApplicationListingConnectionSchema,
});

export const PNRR_PROGRAM_REVISIONS_QUERY = /* GraphQL */ `
  query PnrrProgramRevisions(
    $first: Int!
    $after: String
    $assertReleaseId: ID
  ) {
    pnrrProgramRevisions(
      first: $first
      after: $after
      assertReleaseId: $assertReleaseId
    ) {
      edges {
        cursor
        node {
          revisionId
          identifierScheme
          legalReference
          celex
          legalStatus
          isCurrentAdopted
          effectiveDate
          sourceAuthority
          sourceUrl
          documentCount
          textReadyDocumentCount
          ocrRequiredDocumentCount
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const pnrrProgramRevisionsResponseSchema = z.object({
  pnrrProgramRevisions: pnrrProgramRevisionConnectionSchema,
});

export const PNRR_CATALOG_RESOURCES_QUERY = /* GraphQL */ `
  query PnrrCatalogResources(
    $first: Int!
    $after: String
    $assertReleaseId: ID
  ) {
    pnrrCatalogResources(
      first: $first
      after: $after
      assertReleaseId: $assertReleaseId
    ) {
      edges {
        cursor
        node {
          resourceId
          packageId
          resourceName
          format
          mimeType
          datastoreActive
          fileUrl
          lastModified
          declaredHash
          sourceSystem
          sourceUrl
          retrievedAt
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const pnrrCatalogResourcesResponseSchema = z.object({
  pnrrCatalogResources: pnrrCatalogResourceConnectionSchema,
});

export const PNRR_DOCUMENT_REFERENCES_QUERY = /* GraphQL */ `
  query PnrrDocumentReferences(
    $first: Int!
    $after: String
    $assertReleaseId: ID
  ) {
    pnrrDocumentReferences(
      first: $first
      after: $after
      assertReleaseId: $assertReleaseId
    ) {
      edges {
        cursor
        node {
          documentKey
          acquisitionKey
          lotKey
          announcementKey
          programRevisionId
          language
          documentRole
          fileName
          mimeType
          documentType
          sourceUrl
          retrievedAt
          contentSha256
          extractionState
          hasObjectCustody
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const pnrrDocumentReferencesResponseSchema = z.object({
  pnrrDocumentReferences: pnrrDocumentReferenceConnectionSchema,
});
