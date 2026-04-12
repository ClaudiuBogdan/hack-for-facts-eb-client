export const campaignAdminPhaseValues = [
  "idle",
  "draft",
  "pending",
  "resolved",
  "failed",
] as const;

export const campaignAdminReviewStatusValues = [
  "pending",
  "approved",
  "rejected",
] as const;

export const campaignAdminScopeTypeValues = ["global", "entity"] as const;

export const campaignAdminPayloadKindValues = [
  "choice",
  "text",
  "url",
  "number",
  "json",
] as const;

export const campaignAdminSubmissionPathValues = [
  "request_platform",
  "send_yourself",
  "send_email",
  "download_text",
] as const;

export const campaignAdminRiskFlagValues = [
  "invalid_institution_email",
  "institution_email_mismatch",
  "missing_official_email",
  "institution_thread_failed",
] as const;

export const campaignAdminPendingReasonValues = [
  "invalid_institution_email",
  "missing_official_email",
  "institution_email_mismatch",
  "institution_thread_failed",
  "awaiting_manual_review",
] as const;

export const campaignAdminReviewSourceValues = [
  "campaign_admin_api",
  "learning_progress_admin_api",
  "user_event_worker",
] as const;

export const campaignAdminThreadPhaseValues = [
  "sending",
  "awaiting_reply",
  "reply_received_unreviewed",
  "manual_follow_up_needed",
  "resolved_positive",
  "resolved_negative",
  "closed_no_response",
  "failed",
] as const;

export const campaignAdminMetaReviewStatusCountValues = [
  ...campaignAdminReviewStatusValues,
  "notReviewed",
] as const;

export const campaignAdminMetaThreadPhaseCountValues = [
  ...campaignAdminThreadPhaseValues,
  "none",
] as const;

export const campaignAdminUserInteractionsSortKeyValues = [
  "reviewStatus",
  "userId",
  "organizationName",
  "entity",
  "updatedAt",
  "riskFlagCount",
  "threadPhase",
  "interactionType",
  "reviewedByUserId",
] as const;

export const campaignAdminUsersSortKeyValues = [
  "userId",
  "latestUpdatedAt",
  "interactionCount",
  "pendingReviewCount",
] as const;

export type CampaignAdminPhase = (typeof campaignAdminPhaseValues)[number];
export type CampaignAdminReviewStatus =
  (typeof campaignAdminReviewStatusValues)[number];
export type CampaignAdminScopeType =
  (typeof campaignAdminScopeTypeValues)[number];
export type CampaignAdminPayloadKind =
  (typeof campaignAdminPayloadKindValues)[number];
export type CampaignAdminSubmissionPath =
  (typeof campaignAdminSubmissionPathValues)[number];
export type CampaignAdminRiskFlag =
  (typeof campaignAdminRiskFlagValues)[number];
export type CampaignAdminPendingReason =
  (typeof campaignAdminPendingReasonValues)[number];
export type CampaignAdminReviewSource =
  (typeof campaignAdminReviewSourceValues)[number];
export type CampaignAdminThreadPhase =
  (typeof campaignAdminThreadPhaseValues)[number];
export type CampaignAdminMetaReviewStatusCountKey =
  (typeof campaignAdminMetaReviewStatusCountValues)[number];
export type CampaignAdminMetaThreadPhaseCountKey =
  (typeof campaignAdminMetaThreadPhaseCountValues)[number];
export type CampaignAdminUserInteractionsSortKey =
  (typeof campaignAdminUserInteractionsSortKeyValues)[number];
export type CampaignAdminUsersSortKey =
  (typeof campaignAdminUsersSortKeyValues)[number];
export type CampaignAdminSortOrder = "asc" | "desc";
export type CampaignAdminCampaignKey = "funky";
export type CampaignAdminReviewDecision = Exclude<
  CampaignAdminReviewStatus,
  "pending"
>;

export type CampaignAdminPayloadSummary =
  | {
      readonly kind: "public_debate_request";
      readonly institutionEmail: string | null;
      readonly organizationName: string | null;
      readonly submissionPath: CampaignAdminSubmissionPath | null;
      readonly isNgo: boolean | null;
    }
  | {
      readonly kind: "website_url";
      readonly websiteUrl: string | null;
    }
  | {
      readonly kind: "budget_document";
      readonly documentUrl: string | null;
      readonly documentTypes: ReadonlyArray<
        "pdf" | "word" | "excel" | "webpage" | "graphics" | "other"
      >;
    }
  | {
      readonly kind: "budget_publication_date";
      readonly publicationDate: string | null;
      readonly sources: ReadonlyArray<{
        readonly type: "website" | "press" | "social_media" | "other";
        readonly url: string | null;
      }>;
    }
  | {
      readonly kind: "budget_status";
      readonly isPublished: "yes" | "no" | "dont_know" | null;
      readonly budgetStage: "draft" | "approved" | null;
    }
  | {
      readonly kind: "city_hall_contact";
      readonly email: string | null;
      readonly phone: string | null;
    }
  | {
      readonly kind: "participation_report";
      readonly debateTookPlace: "yes" | "no" | "dont_know" | null;
      readonly approximateAttendees: number | null;
      readonly citizensAllowedToSpeak: "yes" | "no" | "partially" | null;
      readonly citizenInputsRecorded: "yes" | "no" | "dont_know" | null;
      readonly observations: string | null;
    }
  | {
      readonly kind: "quiz";
      readonly selectedOptionId: string | null;
      readonly outcome: "correct" | "incorrect" | null;
      readonly score: number | null;
    }
  | {
      readonly kind: "contestation";
      readonly contestedItem: string | null;
      readonly reasoning: string | null;
      readonly impact: string | null;
      readonly proposedChange: string | null;
      readonly senderName: string | null;
      readonly submissionPath: CampaignAdminSubmissionPath | null;
      readonly institutionEmail: string | null;
    };

export type CampaignAdminAvailableInteractionType = {
  readonly interactionId: string;
  readonly label: string | null;
  readonly reviewable?: boolean;
};

export type CampaignAdminInteractionMetaStats = {
  readonly total: number;
  readonly riskFlagged: number;
  readonly withInstitutionThread: number;
  readonly reviewStatusCounts: Readonly<
    Record<CampaignAdminMetaReviewStatusCountKey, number>
  >;
  readonly phaseCounts: Readonly<Record<CampaignAdminPhase, number>>;
  readonly threadPhaseCounts: Readonly<
    Record<CampaignAdminMetaThreadPhaseCountKey, number>
  >;
};

export const EMPTY_CAMPAIGN_ADMIN_META_STATS: CampaignAdminInteractionMetaStats =
  {
    total: 0,
    riskFlagged: 0,
    withInstitutionThread: 0,
    reviewStatusCounts: {
      pending: 0,
      approved: 0,
      rejected: 0,
      notReviewed: 0,
    },
    phaseCounts: {
      idle: 0,
      draft: 0,
      pending: 0,
      resolved: 0,
      failed: 0,
    },
    threadPhaseCounts: {
      sending: 0,
      awaiting_reply: 0,
      reply_received_unreviewed: 0,
      manual_follow_up_needed: 0,
      resolved_positive: 0,
      resolved_negative: 0,
      closed_no_response: 0,
      failed: 0,
      none: 0,
    },
  };

export type CampaignAdminUserInteractionListItem = {
  readonly userId: string;
  readonly recordKey: string;
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly interactionId: string;
  readonly lessonId: string;
  readonly entityCui: string | null;
  readonly entityName: string | null;
  readonly scopeType: CampaignAdminScopeType;
  readonly phase: CampaignAdminPhase;
  readonly reviewStatus: CampaignAdminReviewStatus | null;
  readonly reviewable?: boolean;
  readonly pendingReason: CampaignAdminPendingReason | null;
  readonly submittedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly reviewedAt: string | null;
  readonly reviewedByUserId: string | null;
  readonly reviewSource: CampaignAdminReviewSource | null;
  readonly feedbackText: string | null;
  readonly payloadKind: CampaignAdminPayloadKind | null;
  readonly payloadSummary: CampaignAdminPayloadSummary | null;
  readonly institutionEmail: string | null;
  readonly websiteUrl: string | null;
  readonly organizationName: string | null;
  readonly interactionElementLink: string | null;
  readonly submissionPath: CampaignAdminSubmissionPath | null;
  readonly isNgo: boolean | null;
  readonly riskFlags: readonly CampaignAdminRiskFlag[];
  readonly threadId: string | null;
  readonly threadPhase: CampaignAdminThreadPhase | null;
  readonly lastEmailAt: string | null;
  readonly lastReplyAt: string | null;
  readonly nextActionAt: string | null;
  readonly submittedEventCount: number;
  readonly evaluatedEventCount: number;
  readonly lastAuditAt: string | null;
};

export type CampaignAdminListResponse = {
  readonly items: readonly CampaignAdminUserInteractionListItem[];
  readonly page: {
    readonly limit: number;
    readonly hasMore: boolean;
    readonly nextCursor: string | null;
    readonly sortBy?: CampaignAdminUserInteractionsSortKey;
    readonly sortOrder?: CampaignAdminSortOrder;
  };
};

export type CampaignAdminUserListItem = {
  readonly userId: string;
  readonly interactionCount: number;
  readonly pendingReviewCount: number;
  readonly latestUpdatedAt: string;
  readonly latestInteractionId: string;
  readonly latestEntityCui: string | null;
  readonly latestEntityName: string | null;
};

export type CampaignAdminUsersListResponse = {
  readonly items: readonly CampaignAdminUserListItem[];
  readonly page: {
    readonly hasMore: boolean;
    readonly nextCursor: string | null;
    readonly sortBy?: CampaignAdminUsersSortKey;
    readonly sortOrder?: CampaignAdminSortOrder;
  };
};

export type CampaignAdminMetaResponse = {
  readonly availableInteractionTypes: readonly CampaignAdminAvailableInteractionType[];
  readonly stats: CampaignAdminInteractionMetaStats;
};

export type CampaignAdminSubmitReviewItem =
  | {
      readonly userId: string;
      readonly recordKey: string;
      readonly expectedUpdatedAt: string;
      readonly status: "approved";
      readonly feedbackText?: string;
      readonly approvalRiskAcknowledged?: boolean;
    }
  | {
      readonly userId: string;
      readonly recordKey: string;
      readonly expectedUpdatedAt: string;
      readonly status: "rejected";
      readonly feedbackText: string;
    };

export type CampaignAdminSubmitReviewsBody = {
  readonly items: readonly CampaignAdminSubmitReviewItem[];
};

export type CampaignAdminStagedReviewDraft = {
  readonly userId: string;
  readonly recordKey: string;
  readonly status: CampaignAdminReviewDecision;
  readonly feedbackText: string;
  readonly approvalRiskAcknowledged?: boolean;
};

export type CampaignAdminQueueSearch = {
  readonly phase?: CampaignAdminPhase;
  readonly reviewStatus?: CampaignAdminReviewStatus;
  readonly reviewStatusMode?: "all";
  readonly interactionId?: string;
  readonly lessonId?: string;
  readonly entityCui?: string;
  readonly scopeType?: CampaignAdminScopeType;
  readonly payloadKind?: CampaignAdminPayloadKind;
  readonly submissionPath?: CampaignAdminSubmissionPath;
  readonly userId?: string;
  readonly recordKey?: string;
  readonly recordKeyPrefix?: string;
  readonly submittedAtFrom?: string;
  readonly submittedAtTo?: string;
  readonly updatedAtFrom?: string;
  readonly updatedAtTo?: string;
  readonly hasInstitutionThread?: boolean;
  readonly threadPhase?: CampaignAdminThreadPhase;
  readonly sortBy?: CampaignAdminUserInteractionsSortKey;
  readonly sortOrder?: CampaignAdminSortOrder;
  readonly reviewSelectionKey?: string;
  readonly cursor?: string;
  readonly pageIndex?: number;
  readonly limit: number;
};

export type CampaignAdminQueueFilters = Omit<
  CampaignAdminQueueSearch,
  "limit" | "reviewSelectionKey" | "reviewStatusMode" | "cursor" | "pageIndex"
>;

export type CampaignAdminUserPageSearch = Omit<
  CampaignAdminQueueSearch,
  "phase" | "reviewStatusMode" | "userId" | "cursor" | "pageIndex" | "limit"
>;

export type CampaignAdminUsersSearch = {
  readonly query?: string;
  readonly sortBy?: CampaignAdminUsersSortKey;
  readonly sortOrder?: CampaignAdminSortOrder;
  readonly cursor?: string;
  readonly pageIndex?: number;
  readonly limit: number;
};

export type CampaignAdminFilterDraft = {
  readonly phase: CampaignAdminPhase | "";
  readonly reviewStatus: CampaignAdminReviewStatus | "";
  readonly interactionId: string;
  readonly lessonId: string;
  readonly entityCui: string;
  readonly scopeType: CampaignAdminScopeType | "";
  readonly payloadKind: CampaignAdminPayloadKind | "";
  readonly userId: string;
  readonly recordKey: string;
  readonly recordKeyPrefix: string;
  readonly submittedAtFrom: string;
  readonly submittedAtTo: string;
  readonly updatedAtFrom: string;
  readonly updatedAtTo: string;
  readonly hasInstitutionThread: "" | "true" | "false";
  readonly threadPhase: CampaignAdminThreadPhase | "";
  readonly limit: number;
};
