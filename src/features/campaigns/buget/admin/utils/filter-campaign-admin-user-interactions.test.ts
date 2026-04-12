import { describe, expect, it } from "vitest";
import {
  filterAndSortCampaignAdminUserInteractionItems,
  filterCampaignAdminUserInteractionItems,
} from "./filter-campaign-admin-user-interactions";
import type { CampaignAdminUserInteractionListItem } from "@/features/campaigns/buget/admin/types";

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

describe("filterCampaignAdminUserInteractionItems", () => {
  it("filters by review status, entity, thread presence, and date range", () => {
    const items = [
      createItem(),
      createItem({
        recordKey: "record-2",
        entityCui: "87654321",
        reviewStatus: "approved",
        threadId: null,
        threadPhase: null,
        updatedAt: "2026-04-11T12:00:00.000Z",
      }),
    ];

    expect(
      filterCampaignAdminUserInteractionItems({
        items,
        search: {
          reviewStatus: "pending",
          entityCui: "12345678",
          hasInstitutionThread: true,
          updatedAtFrom: "2026-04-10T00:00:00.000Z",
          updatedAtTo: "2026-04-10T23:59:59.999Z",
          sortBy: "updatedAt",
          sortOrder: "desc",
        },
      }),
    ).toEqual([items[0]]);
  });

  it("supports prefix filtering and local sorting", () => {
    const items = [
      createItem({
        recordKey: "record-10",
        interactionId: "funky:interaction:city_hall_website",
        updatedAt: "2026-04-09T10:00:00.000Z",
      }),
      createItem({
        recordKey: "record-20",
        interactionId: "funky:interaction:budget_document",
        updatedAt: "2026-04-12T10:00:00.000Z",
      }),
    ];

    const filteredItems = filterAndSortCampaignAdminUserInteractionItems({
      items,
      search: {
        interactionId: "funky:interaction:budget_document",
        recordKeyPrefix: "record-2",
        sortBy: "updatedAt",
        sortOrder: "desc",
      },
    });

    expect(filteredItems).toEqual([items[1]]);
  });
});
