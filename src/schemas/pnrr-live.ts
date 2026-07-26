import { z } from "zod";

export const pnrrAnswerStateSchema = z.enum([
  "served",
  "degraded",
  "abstained",
  "legacy_unversioned",
]);

export const pnrrReleaseSchema = z.object({
  releaseId: z.string(),
  releaseKind: z.string(),
  state: pnrrAnswerStateSchema,
  sourceSnapshotAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  limitation: z.string(),
  lanes: z.array(
    z.object({
      lane: z.string(),
      state: pnrrAnswerStateSchema,
      asOf: z.string().nullable(),
      suspended: z.boolean(),
      reasonCodes: z.array(z.string()),
    }),
  ),
});

export const pnrrCapabilitySchema = z.object({
  id: z.string(),
  releaseId: z.string(),
  state: pnrrAnswerStateSchema,
  reasonCodes: z.array(z.string()),
  limitation: z.string().nullable(),
});

export const pnrrMoneyFactSchema = z.object({
  factType: z.string(),
  amount: z.string().nullable(),
  currency: z.enum(["RON", "EUR"]),
  aggregationState: z.string(),
  coveredCount: z.number(),
  totalCount: z.number(),
});

export const pnrrAnswerMetaSchema = z.object({
  state: z.enum(["served", "degraded", "abstained"]),
  reasonCodes: z.array(z.string()),
  caveats: z.array(z.string()),
  provenance: z.array(z.string()),
  coverage: z.array(
    z.object({
      field: z.string(),
      covered: z.number(),
      total: z.number(),
      percent: z.number().nullable(),
    }),
  ),
  release: pnrrReleaseSchema,
});

export const pnrrOverviewSchema = z.object({
  meta: pnrrAnswerMetaSchema,
  program: z.object({
    snapshotDate: z.string().nullable(),
    projectCount: z.number().nullable(),
    allocationEur: pnrrMoneyFactSchema,
    receivedEur: pnrrMoneyFactSchema,
    paidEur: pnrrMoneyFactSchema,
  }),
  beneficiaryPayments: z.object({
    count: z.number(),
    netRon: pnrrMoneyFactSchema,
    grossRon: pnrrMoneyFactSchema,
    reversalRon: pnrrMoneyFactSchema,
    firstDate: z.string().nullable(),
    lastDate: z.string().nullable(),
  }),
  commitments: z.object({
    count: z.number(),
    additiveCount: z.number(),
    unresolvedCount: z.number(),
    additiveRon: pnrrMoneyFactSchema,
  }),
  delivery: z.object({
    observedCount: z.number(),
    completedCount: z.number(),
    overHundredCount: z.number(),
    missingFinancialProgressCount: z.number(),
    missingPhysicalProgressCount: z.number(),
  }),
});

export const pnrrCommitmentSchema = z.object({
  commitmentKey: z.string(),
  beneficiaryCui: z.string().nullable(),
  beneficiaryName: z.string().nullable(),
  idAngajament: z.string().nullable(),
  contractNumber: z.string().nullable(),
  contractTitle: z.string().nullable(),
  componentCode: z.string().nullable(),
  measureCode: z.string().nullable(),
  totalValue: z.string().nullable(),
  euValue: z.string().nullable(),
  reportedTotalValue: z.string().nullable(),
  reportedEuValue: z.string().nullable(),
  aggregationState: z.string(),
  envelopeObservationCount: z.number(),
  qualityIssues: z.array(z.string()),
  financialProgress: z.number().nullable(),
  physicalProgress: z.number().nullable(),
  commitmentDate: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  status: z.string(),
  countyName: z.string().nullable(),
  countySiruta: z.string().nullable(),
  localityName: z.string().nullable(),
  sourceSystem: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  dateQuality: z.string(),
  progressCount: z.number(),
  retrievedAt: z.string().nullable(),
});

export const pnrrCommitmentConnectionSchema = z.object({
  edges: z.array(
    z.object({
      cursor: z.string(),
      node: pnrrCommitmentSchema,
    }),
  ),
  pageInfo: z.object({
    hasNextPage: z.boolean(),
    endCursor: z.string().nullable(),
  }),
});

export const pnrrProjectSchema = z.object({
  projectKey: z.string(),
  projectKeyVersion: z.enum(["mipe_observation_v1", "project_key_v1"]),
  sourceObservationId: z.string(),
  snapshotId: z.string(),
  snapshotDate: z.string(),
  endpointName: z.string(),
  itemKey: z.string().nullable(),
  commitmentBusinessId: z.string().nullable(),
  contractNumber: z.string().nullable(),
  contractTitle: z.string().nullable(),
  beneficiaryCui: z.string().nullable(),
  beneficiaryName: z.string().nullable(),
  beneficiaryType: z.string().nullable(),
  componentCode: z.string().nullable(),
  measureCode: z.string().nullable(),
  submeasureCode: z.string().nullable(),
  responsibleInstitutionCode: z.string().nullable(),
  responsibleInstitutionName: z.string().nullable(),
  financingSource: z.string().nullable(),
  commitmentDate: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  lastFundingDate: z.string().nullable(),
  totalValueRon: z.string().nullable(),
  euContributionRon: z.string().nullable(),
  nationalPublicValueRon: z.string().nullable(),
  vatRon: z.string().nullable(),
  ineligibleValueRon: z.string().nullable(),
  receivedAmountRon: z.string().nullable(),
  allocatedEur: z.string().nullable(),
  paidEur: z.string().nullable(),
  receivedEur: z.string().nullable(),
  prefinancingEur: z.string().nullable(),
  suspendedEur: z.string().nullable(),
  revokedEur: z.string().nullable(),
  projectCount: z.number().nullable(),
  contractBeneficiaryCount: z.number().nullable(),
  paymentBeneficiaryCount: z.number().nullable(),
  nationalImpactProjectCount: z.number().nullable(),
  paymentCount: z.number().nullable(),
  beneficiaryCount: z.number().nullable(),
  totalEur: z.string().nullable(),
  totalRon: z.string().nullable(),
  financialProgressRatio: z.number().nullable(),
  physicalProgressRatio: z.number().nullable(),
  countyName: z.string().nullable(),
  countySiruta: z.string().nullable(),
  localityName: z.string().nullable(),
  impact: z.string().nullable(),
  timelineMonth: z.string().nullable(),
  timelineLabel: z.string().nullable(),
  status: z.string().nullable(),
  sourceSystem: z.string(),
  sourceUrl: z.string(),
  retrievedAt: z.string(),
  linkedCommitmentKey: z.string().nullable(),
  commitmentRelationship: z.literal("candidate_project").nullable(),
  commitmentAggregationState: z.string().nullable(),
});

export const pnrrProjectConnectionSchema = z.object({
  edges: z.array(
    z.object({
      cursor: z.string(),
      node: pnrrProjectSchema,
    }),
  ),
  pageInfo: z.object({
    hasNextPage: z.boolean(),
    endCursor: z.string().nullable(),
  }),
});

const pnrrProjectFacetValueSchema = z.object({
  value: z.string(),
  label: z.string().nullable(),
  count: z.number(),
});

export const pnrrProjectFacetsSchema = z.object({
  totalCount: z.number(),
  components: z.array(pnrrProjectFacetValueSchema),
  measures: z.array(pnrrProjectFacetValueSchema),
  statuses: z.array(pnrrProjectFacetValueSchema),
  counties: z.array(pnrrProjectFacetValueSchema),
});

const sourceConnection = <T extends z.ZodTypeAny>(node: T) =>
  z.object({
    edges: z.array(z.object({ cursor: z.string(), node })),
    pageInfo: z.object({
      hasNextPage: z.boolean(),
      endCursor: z.string().nullable(),
    }),
  });

export const pnrrFundingCallSchema = z.object({
  callId: z.string(),
  title: z.string(),
  budgetRon: z.string().nullable(),
  totalEligibleValueRon: z.string().nullable(),
  sourceSystem: z.string(),
  sourceUrl: z.string(),
  retrievedAt: z.string(),
});

export const pnrrFundingApplicationListingSchema = z.object({
  listingId: z.string(),
  listingCandidateKey: z.string(),
  callId: z.string().nullable(),
  sourceRequestCallId: z.string().nullable(),
  applicantCui: z.string().nullable(),
  applicantName: z.string().nullable(),
  sentAt: z.string().nullable(),
  orderNumber: z.string().nullable(),
  completenessStatus: z.string(),
  sourceSystem: z.string(),
  sourceUrl: z.string(),
  retrievedAt: z.string(),
});

export const pnrrProgramRevisionSchema = z.object({
  revisionId: z.string(),
  identifierScheme: z.string(),
  legalReference: z.string(),
  celex: z.string().nullable(),
  legalStatus: z.string(),
  isCurrentAdopted: z.boolean(),
  effectiveDate: z.string().nullable(),
  sourceAuthority: z.string(),
  sourceUrl: z.string(),
  documentCount: z.number(),
  textReadyDocumentCount: z.number(),
  ocrRequiredDocumentCount: z.number(),
});

export const pnrrCatalogResourceSchema = z.object({
  resourceId: z.string(),
  packageId: z.string().nullable(),
  resourceName: z.string().nullable(),
  format: z.string().nullable(),
  mimeType: z.string().nullable(),
  datastoreActive: z.boolean().nullable(),
  fileUrl: z.string().nullable(),
  lastModified: z.string().nullable(),
  declaredHash: z.string().nullable(),
  sourceSystem: z.string(),
  sourceUrl: z.string(),
  retrievedAt: z.string(),
});

export const pnrrDocumentReferenceSchema = z.object({
  documentKey: z.string(),
  acquisitionKey: z.string().nullable(),
  lotKey: z.string().nullable(),
  announcementKey: z.string().nullable(),
  programRevisionId: z.string().nullable(),
  language: z.string().nullable(),
  documentRole: z.string().nullable(),
  fileName: z.string().nullable(),
  mimeType: z.string().nullable(),
  documentType: z.string().nullable(),
  sourceUrl: z.string(),
  retrievedAt: z.string().nullable(),
  contentSha256: z.string().nullable(),
  extractionState: z.string(),
  hasObjectCustody: z.boolean(),
});

export const pnrrFundingCallConnectionSchema = sourceConnection(
  pnrrFundingCallSchema,
);
export const pnrrFundingApplicationListingConnectionSchema = sourceConnection(
  pnrrFundingApplicationListingSchema,
);
export const pnrrProgramRevisionConnectionSchema = sourceConnection(
  pnrrProgramRevisionSchema,
);
export const pnrrCatalogResourceConnectionSchema = sourceConnection(
  pnrrCatalogResourceSchema,
);
export const pnrrDocumentReferenceConnectionSchema = sourceConnection(
  pnrrDocumentReferenceSchema,
);

export const pnrrProgressSnapshotSchema = z.object({
  snapshotId: z.string(),
  sourceRecordId: z.string(),
  snapshotDate: z.string(),
  commitmentKey: z.string().nullable(),
  linkConfidence: z.number().nullable(),
  financialProgress: z.number().nullable(),
  physicalProgress: z.number().nullable(),
  stage: z.string().nullable(),
  receivedEur: z.string().nullable(),
  paidEur: z.string().nullable(),
  allocatedEur: z.string().nullable(),
});

export const pnrrEntitySchema = z.object({
  cui: z.string(),
  name: z.string().nullable(),
  nameSource: z.string().nullable(),
  caenCode: z.string().nullable(),
  isActive: z.boolean().nullable(),
  isVatPayer: z.boolean().nullable(),
  roles: z.object({
    beneficiary: z.boolean(),
    applicant: z.boolean(),
    winner: z.boolean(),
    subcontractor: z.boolean(),
  }),
  hubs: z.array(z.string()),
  firstSeenSource: z.string().nullable(),
});

export const pnrrEntityConnectionSchema = z.object({
  edges: z.array(
    z.object({
      cursor: z.string(),
      node: pnrrEntitySchema,
    }),
  ),
  pageInfo: z.object({
    hasNextPage: z.boolean(),
    endCursor: z.string().nullable(),
  }),
});

export const pnrrEntityProfileSchema = z.object({
  cui: z.string(),
  payments: z.object({
    count: z.number(),
    totalLei: z.string().nullable(),
    totalEur: z.string().nullable(),
    grossLei: z.string().nullable(),
    reversalLei: z.string().nullable(),
    zeroAdjustmentCount: z.number(),
    firstDate: z.string().nullable(),
    lastDate: z.string().nullable(),
  }),
  commitments: z.object({
    count: z.number(),
    totalValue: z.string().nullable(),
    euValue: z.string().nullable(),
    unresolvedCount: z.number(),
    avgFinancialProgress: z.number().nullable(),
    avgPhysicalProgress: z.number().nullable(),
  }),
  procurement: z.object({
    acquisitionsAsBeneficiary: z.number(),
    acquisitionsValue: z.string().nullable(),
    participantRelationCount: z.number(),
    unknownRelationshipCount: z.number(),
    participantValue: z.string().nullable(),
    valueAggregationState: z.string(),
    valueReason: z.string(),
  }),
  grainNote: z.string(),
  dataAsOf: z.string().nullable(),
});

export const pnrrPlaceProfileSchema = z.object({
  meta: pnrrAnswerMetaSchema,
  countySiruta: z.string(),
  countyName: z.string().nullable(),
  paymentCount: z.number(),
  paymentNetRon: z.string().nullable(),
  commitmentCount: z.number(),
  additiveCommitmentCount: z.number(),
  unresolvedCommitmentCount: z.number(),
  additiveCommitmentRon: z.string().nullable(),
  projectObservationCount: z.number(),
  sourceLocalityLabelCount: z.number(),
  sourceLocalityLabelValue: z.string().nullable(),
});

export const pnrrPlaceSummarySchema = z.object({
  countySiruta: z.string(),
  countyName: z.string(),
  paymentCount: z.number(),
  paymentNetRon: z.string().nullable(),
  commitmentCount: z.number(),
  additiveCommitmentCount: z.number(),
  unresolvedCommitmentCount: z.number(),
  additiveCommitmentRon: z.string().nullable(),
  projectObservationCount: z.number(),
  sourceLocalityLabelCount: z.number(),
  sourceLocalityLabelValue: z.string().nullable(),
});

export const pnrrVerificationSchema = z.object({
  meta: pnrrAnswerMetaSchema,
  ruleSetVersion: z.string(),
  unresolvedCommitmentCount: z.number(),
  duplicatePaymentGroupCount: z.number(),
  missingCommitmentSourceUrlCount: z.number(),
  endBeforeStartCount: z.number(),
  overHundredProgressCount: z.number(),
  missingProgressLinkCount: z.number(),
});

export type PnrrLiveRelease = z.infer<typeof pnrrReleaseSchema>;
export type PnrrLiveCapability = z.infer<typeof pnrrCapabilitySchema>;
export type PnrrLiveOverview = z.infer<typeof pnrrOverviewSchema>;
export type PnrrLiveCommitment = z.infer<typeof pnrrCommitmentSchema>;
export type PnrrLiveCommitmentConnection = z.infer<
  typeof pnrrCommitmentConnectionSchema
>;
export type PnrrLiveProject = z.infer<typeof pnrrProjectSchema>;
export type PnrrLiveProjectConnection = z.infer<
  typeof pnrrProjectConnectionSchema
>;
export type PnrrLiveProjectFacets = z.infer<typeof pnrrProjectFacetsSchema>;
export type PnrrLiveProgressSnapshot = z.infer<
  typeof pnrrProgressSnapshotSchema
>;
export type PnrrLiveEntity = z.infer<typeof pnrrEntitySchema>;
export type PnrrLiveEntityConnection = z.infer<
  typeof pnrrEntityConnectionSchema
>;
export type PnrrLiveEntityProfile = z.infer<typeof pnrrEntityProfileSchema>;
export type PnrrLivePlaceProfile = z.infer<typeof pnrrPlaceProfileSchema>;
export type PnrrLivePlaceSummary = z.infer<typeof pnrrPlaceSummarySchema>;
export type PnrrLiveVerification = z.infer<typeof pnrrVerificationSchema>;
