import { describe, expect, it } from "vitest";
import { buildCampaignAdminSelectionKey } from "@/features/campaigns/buget/admin/constants";
import { sortCampaignAdminUserInteractionItems } from "@/features/campaigns/buget/admin/utils/sort-campaign-admin-user-interactions";
import type {
  CampaignAdminStagedReviewDraft,
  CampaignAdminUserInteractionListItem,
} from "@/features/campaigns/buget/admin/types";

function createItem(
  overrides: Partial<CampaignAdminUserInteractionListItem> = {},
): CampaignAdminUserInteractionListItem {
  return {
    userId: "user-1",
    recordKey: "record-1",
    campaignKey: "funky",
    interactionId: "funky:interaction:public_debate_request",
    lessonId: "lesson-1",
    entityCui: "12345678",
    entityName: "Oras Test",
    scopeType: "entity",
    phase: "pending",
    reviewStatus: "pending",
    reviewable: true,
    pendingReason: "awaiting_manual_review",
    submittedAt: "2026-04-10T10:00:00.000Z",
    createdAt: "2026-04-10T10:00:00.000Z",
    updatedAt: "2026-04-10T11:00:00.000Z",
    reviewedAt: null,
    reviewedByUserId: null,
    reviewSource: null,
    feedbackText: null,
    payloadKind: "json",
    payloadSummary: {
      kind: "public_debate_request",
      institutionEmail: "contact@primarie.ro",
      organizationName: "Asociatia Test",
      submissionPath: "request_platform",
      isNgo: true,
    },
    institutionEmail: "contact@primarie.ro",
    websiteUrl: null,
    organizationName: "Asociatia Test",
    interactionElementLink: null,
    submissionPath: "request_platform",
    isNgo: true,
    riskFlags: [],
    threadId: "thread-1",
    threadPhase: "awaiting_reply",
    lastEmailAt: "2026-04-10T10:05:00.000Z",
    lastReplyAt: null,
    nextActionAt: null,
    submittedEventCount: 1,
    evaluatedEventCount: 0,
    lastAuditAt: "2026-04-10T10:00:00.000Z",
    ...overrides,
  };
}

function createStagedDraft(
  item: CampaignAdminUserInteractionListItem,
  status: CampaignAdminStagedReviewDraft["status"],
): CampaignAdminStagedReviewDraft {
  return {
    userId: item.userId,
    recordKey: item.recordKey,
    status,
    feedbackText: "",
  };
}

describe("sortCampaignAdminUserInteractionItems", () => {
  it("sorts by the local value column without using API-backed fields", () => {
    const items = [
      createItem({
        recordKey: "record-3",
        institutionEmail: "zeta@primarie.ro",
      }),
      createItem({
        recordKey: "record-1",
        institutionEmail: "alpha@primarie.ro",
      }),
      createItem({
        recordKey: "record-2",
        institutionEmail: null,
        payloadSummary: {
          kind: "public_debate_request",
          institutionEmail: null,
          organizationName: "Asociatia Test",
          submissionPath: "request_platform",
          isNgo: true,
        },
      }),
    ];

    const sortedItems = sortCampaignAdminUserInteractionItems({
      items,
      sortBy: "value",
      sortOrder: "asc",
    });

    expect(sortedItems.map((item) => item.recordKey)).toEqual([
      "record-1",
      "record-3",
      "record-2",
    ]);
  });

  it("sorts by staged review state using the current page drafts", () => {
    const approvedItem = createItem({
      userId: "user-1",
      recordKey: "record-approved",
    });
    const unstagedItem = createItem({
      userId: "user-2",
      recordKey: "record-unstaged",
    });
    const rejectedItem = createItem({
      userId: "user-3",
      recordKey: "record-rejected",
    });
    const items = [unstagedItem, rejectedItem, approvedItem];

    const stagedDraftsByKey: Record<string, CampaignAdminStagedReviewDraft> = {
      [buildCampaignAdminSelectionKey(
        approvedItem.userId,
        approvedItem.recordKey,
      )]: createStagedDraft(approvedItem, "approved"),
      [buildCampaignAdminSelectionKey(
        rejectedItem.userId,
        rejectedItem.recordKey,
      )]: createStagedDraft(rejectedItem, "rejected"),
    };

    const sortedItems = sortCampaignAdminUserInteractionItems({
      items,
      sortBy: "reviewState",
      sortOrder: "asc",
      stagedDraftsByKey,
    });

    expect(sortedItems.map((item) => item.recordKey)).toEqual([
      "record-approved",
      "record-unstaged",
      "record-rejected",
    ]);
  });
});
