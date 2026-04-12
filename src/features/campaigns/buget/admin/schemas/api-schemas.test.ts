import { describe, expect, it } from "vitest";
import {
  parseCampaignAdminEntitiesListResponse,
  parseCampaignAdminEntitiesMetaResponse,
  parseCampaignAdminNotificationTemplatePreviewResponse,
  parseCampaignAdminNotificationTemplatesResponse,
  parseCampaignAdminNotificationTriggerExecutionBody,
  parseCampaignAdminNotificationTriggerExecutionResponse,
  parseCampaignAdminNotificationTriggersResponse,
  parseCampaignAdminNotificationsListResponse,
  parseCampaignAdminListResponse,
  parseCampaignAdminMetaResponse,
  parseCampaignAdminSubmitReviewsBody,
  parseCampaignAdminUsersListResponse,
} from "./api-schemas";

function createMetaResponsePayload() {
  return {
    ok: true,
    data: {
      availableInteractionTypes: [
        {
          interactionId: "funky:interaction:public_debate_request",
          label: "Public debate request",
          reviewable: true,
        },
      ],
      stats: {
        total: 137,
        riskFlagged: 29,
        withInstitutionThread: 101,
        reviewStatusCounts: {
          pending: 41,
          approved: 72,
          rejected: 19,
          notReviewed: 5,
        },
        phaseCounts: {
          idle: 2,
          draft: 9,
          pending: 48,
          resolved: 70,
          failed: 8,
        },
        threadPhaseCounts: {
          sending: 4,
          awaiting_reply: 17,
          reply_received_unreviewed: 6,
          manual_follow_up_needed: 5,
          resolved_positive: 24,
          resolved_negative: 7,
          closed_no_response: 38,
          failed: 4,
          none: 36,
        },
      },
    },
  };
}

function createListResponsePayload() {
  return {
    ok: true,
    data: {
      items: [
        {
          userId: "user-1",
          recordKey: "funky:interaction:public_debate_request::entity:12345678",
          campaignKey: "funky",
          interactionId: "funky:interaction:public_debate_request",
          lessonId: "civic-monitor-and-request",
          entityCui: "12345678",
          entityName: "Oras Test",
          scopeType: "entity",
          phase: "pending",
          reviewStatus: "pending",
          reviewable: true,
          pendingReason: "institution_email_mismatch",
          submittedAt: "2026-04-10T10:00:00.000Z",
          createdAt: "2026-04-10T10:00:00.000Z",
          updatedAt: "2026-04-10T10:00:00.000Z",
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
          interactionElementLink:
            "/primarie/12345678/buget/provocari/civic-campaign/civic-monitor-and-request/04-debate-request",
          submissionPath: "request_platform",
          isNgo: true,
          riskFlags: ["institution_email_mismatch"],
          threadId: "thread-1",
          threadPhase: "failed",
          lastEmailAt: "2026-04-10T10:10:00.000Z",
          lastReplyAt: null,
          nextActionAt: null,
          submittedEventCount: 1,
          evaluatedEventCount: 0,
          lastAuditAt: "2026-04-10T10:00:00.000Z",
        },
      ],
      page: {
        limit: 50,
        hasMore: false,
        nextCursor: null,
      },
    },
  };
}

function createUsersListResponsePayload() {
  return {
    ok: true,
    data: {
      items: [
        {
          userId: "user-1",
          interactionCount: 3,
          pendingReviewCount: 1,
          latestUpdatedAt: "2026-04-10T10:00:00.000Z",
          latestInteractionId: "funky:interaction:public_debate_request",
          latestEntityCui: "12345678",
          latestEntityName: "Oras Test",
        },
      ],
      page: {
        hasMore: false,
        nextCursor: null,
        sortBy: "latestUpdatedAt",
        sortOrder: "desc",
      },
    },
  };
}

function createNotificationsListResponsePayload() {
  return {
    ok: true,
    data: {
      items: [
        {
          outboxId: "outbox-1",
          campaignKey: "funky",
          notificationType: "funky:outbox:entity_update",
          templateId: "public_debate_entity_update",
          templateName: "Entity update",
          templateVersion: "3",
          status: "delivered",
          createdAt: "2026-04-12T08:00:00.000Z",
          sentAt: "2026-04-12T08:02:00.000Z",
          attemptCount: 1,
          safeError: {
            category: null,
            code: null,
          },
          projection: {
            kind: "public_debate_entity_update",
            userId: "user-1",
            entityCui: "12345678",
            entityName: "Oras Test",
            threadId: "thread-1",
            threadKey: "thread-key-1",
            eventType: "reply_received",
            phase: "awaiting_reply",
            replyEntryId: null,
            basedOnEntryId: null,
            resolutionCode: null,
            triggerSource: "campaign_admin",
          },
        },
      ],
      page: {
        hasMore: true,
        nextCursor: "cursor-1",
      },
    },
  };
}

function createEntitiesListResponsePayload() {
  return {
    ok: true,
    data: {
      items: [
        {
          entityCui: "12345678",
          entityName: "Oras Test",
          userCount: 4,
          interactionCount: 11,
          pendingReviewCount: 2,
          notificationSubscriberCount: 3,
          notificationOutboxCount: 5,
          failedNotificationCount: 1,
          latestInteractionAt: "2026-04-12T10:00:00.000Z",
          latestInteractionId: "funky:interaction:public_debate_request",
          latestNotificationAt: "2026-04-12T10:30:00.000Z",
          latestNotificationType: "funky:outbox:entity_update",
          latestNotificationStatus: "failed_permanent",
          hasPendingReviews: true,
          hasSubscribers: true,
          hasNotificationActivity: true,
          hasFailedNotifications: true,
        },
      ],
      page: {
        hasMore: true,
        nextCursor: "cursor-1",
        sortBy: "latestInteractionAt",
        sortOrder: "desc",
      },
    },
  };
}

function createEntitiesMetaResponsePayload() {
  return {
    ok: true,
    data: {
      totalEntities: 18,
      entitiesWithPendingReviews: 5,
      entitiesWithSubscribers: 7,
      entitiesWithNotificationActivity: 9,
      entitiesWithFailedNotifications: 2,
      availableInteractionTypes: [
        {
          interactionId: "funky:interaction:public_debate_request",
          label: "Public debate request",
          reviewable: true,
        },
      ],
    },
  };
}

function createNotificationsTriggerCatalogPayload() {
  return {
    ok: true,
    data: {
      items: [
        {
          triggerId: "public_debate_entity_update.reply_received",
          campaignKey: "funky",
          templateId: "public_debate_entity_update",
          description: "Queue the reply received notification.",
          inputFields: [
            {
              name: "threadId",
              type: "string",
              required: true,
            },
          ],
          targetKind: "thread",
        },
      ],
    },
  };
}

function createNotificationsTriggerExecutionPayload() {
  return {
    ok: true,
    data: {
      triggerId: "public_debate_entity_update.reply_received",
      campaignKey: "funky",
      templateId: "public_debate_entity_update",
      result: {
        status: "queued",
        createdOutboxIds: ["outbox-1"],
        reusedOutboxIds: [],
        queuedOutboxIds: ["outbox-1"],
        enqueueFailedOutboxIds: [],
      },
    },
  };
}

function createNotificationsTemplateCatalogPayload() {
  return {
    ok: true,
    data: {
      items: [
        {
          templateId: "public_debate_entity_update",
          name: "Entity update",
          version: "3",
          description: "Entity update email",
          requiredFields: [
            {
              name: "threadId",
              type: "string",
              required: true,
            },
          ],
        },
      ],
    },
  };
}

function createNotificationsTemplatePreviewPayload() {
  return {
    ok: true,
    data: {
      templateId: "public_debate_entity_update",
      name: "Entity update",
      version: "3",
      description: "Entity update email",
      requiredFields: [
        {
          name: "threadId",
          type: "string",
          required: true,
        },
      ],
      exampleSubject: "Reply received for Oras Test",
      html: "<html><body><h1>Preview</h1></body></html>",
      text: "Preview",
    },
  };
}

describe("campaign admin api schemas", () => {
  it("parses the queue metadata stats contract", () => {
    expect(parseCampaignAdminMetaResponse(createMetaResponsePayload())).toEqual(
      createMetaResponsePayload().data,
    );
  });

  it("parses queue items that include pendingReason", () => {
    expect(parseCampaignAdminListResponse(createListResponsePayload())).toEqual(
      createListResponsePayload().data,
    );
  });

  it("parses campaign admin users list responses", () => {
    expect(
      parseCampaignAdminUsersListResponse(createUsersListResponsePayload()),
    ).toEqual(createUsersListResponsePayload().data);
  });

  it("parses campaign admin users list responses with subscription-only rows", () => {
    const basePayload = createUsersListResponsePayload();
    const payload = {
      ...basePayload,
      data: {
        ...basePayload.data,
        items: [
          {
            ...basePayload.data.items[0],
            interactionCount: 0,
            pendingReviewCount: 0,
            latestInteractionId: null,
          },
        ],
      },
    };

    expect(parseCampaignAdminUsersListResponse(payload)).toEqual(payload.data);
  });

  it("parses campaign admin notifications audit responses", () => {
    expect(
      parseCampaignAdminNotificationsListResponse(
        createNotificationsListResponsePayload(),
      ),
    ).toEqual(createNotificationsListResponsePayload().data);
  });

  it("parses notification trigger and template catalogs", () => {
    expect(
      parseCampaignAdminNotificationTriggersResponse(
        createNotificationsTriggerCatalogPayload(),
      ),
    ).toEqual(createNotificationsTriggerCatalogPayload().data.items);
    expect(
      parseCampaignAdminNotificationTemplatesResponse(
        createNotificationsTemplateCatalogPayload(),
      ),
    ).toEqual(createNotificationsTemplateCatalogPayload().data.items);
  });

  it("parses trigger execution and template preview payloads", () => {
    expect(
      parseCampaignAdminNotificationTriggerExecutionResponse(
        createNotificationsTriggerExecutionPayload(),
      ),
    ).toEqual(createNotificationsTriggerExecutionPayload().data);
    expect(
      parseCampaignAdminNotificationTemplatePreviewResponse(
        createNotificationsTemplatePreviewPayload(),
      ),
    ).toEqual(createNotificationsTemplatePreviewPayload().data);
  });

  it("parses audit-only quiz summaries and additive reviewable metadata", () => {
    const payload = {
      ok: true,
      data: {
        items: [
          {
            userId: "user-2",
            recordKey: "ch-civic-01-how-module-works-q1::global",
            campaignKey: "funky",
            interactionId: "ch-civic-01-how-module-works-q1",
            lessonId: "civic-monitor-and-request",
            entityCui: null,
            entityName: null,
            scopeType: "global",
            phase: "resolved",
            reviewStatus: null,
            reviewable: false,
            pendingReason: null,
            submittedAt: "2026-04-10T11:00:00.000Z",
            createdAt: "2026-04-10T11:00:00.000Z",
            updatedAt: "2026-04-10T11:00:00.000Z",
            reviewedAt: null,
            reviewedByUserId: null,
            reviewSource: null,
            feedbackText: null,
            payloadKind: "choice",
            payloadSummary: {
              kind: "quiz",
              selectedOptionId: "option-a",
              outcome: "correct",
              score: 1,
            },
            institutionEmail: null,
            websiteUrl: null,
            organizationName: null,
            interactionElementLink: null,
            submissionPath: null,
            isNgo: null,
            riskFlags: [],
            threadId: null,
            threadPhase: null,
            lastEmailAt: null,
            lastReplyAt: null,
            nextActionAt: null,
            submittedEventCount: 1,
            evaluatedEventCount: 1,
            lastAuditAt: "2026-04-10T11:00:00.000Z",
          },
        ],
        page: {
          limit: 50,
          hasMore: false,
          nextCursor: null,
        },
      },
    };

    expect(parseCampaignAdminListResponse(payload)).toEqual(payload.data);
  });

  it("parses approved review submissions with explicit risk acknowledgement", () => {
    const payload = {
      items: [
        {
          userId: "user-1",
          recordKey: "funky:interaction:public_debate_request::entity:12345678",
          expectedUpdatedAt: "2026-04-10T10:00:00.000Z",
          status: "approved",
          approvalRiskAcknowledged: true,
        },
      ],
    };

    expect(parseCampaignAdminSubmitReviewsBody(payload)).toEqual(payload);
  });

  it("accepts structured notification trigger execution bodies", () => {
    const payload = {
      threadId: "thread-1",
      dryRun: false,
    };

    expect(parseCampaignAdminNotificationTriggerExecutionBody(payload)).toEqual(
      payload,
    );
  });

  it("rejects metadata payloads that omit zero-filled count keys", () => {
    const payload = createMetaResponsePayload();
    const invalidPayload = {
      ...payload,
      data: {
        ...payload.data,
        stats: {
          ...payload.data.stats,
          reviewStatusCounts: {
            pending: 41,
            approved: 72,
            rejected: 19,
          },
        },
      },
    };

    expect(() => parseCampaignAdminMetaResponse(invalidPayload)).toThrowError(
      "Invalid campaign admin metadata response.",
    );
  });

  it("parses entities list payloads", () => {
    const payload = createEntitiesListResponsePayload();

    expect(parseCampaignAdminEntitiesListResponse(payload)).toEqual(payload.data);
  });

  it("parses entities metadata payloads", () => {
    const payload = createEntitiesMetaResponsePayload();

    expect(parseCampaignAdminEntitiesMetaResponse(payload)).toEqual(payload.data);
  });

  it("rejects entity list payloads that omit failed notification counts", () => {
    const payload = createEntitiesListResponsePayload();
    const invalidPayload = {
      ...payload,
      data: {
        ...payload.data,
        items: payload.data.items.map(({ failedNotificationCount, ...item }) => {
          void failedNotificationCount;
          return item;
        }),
      },
    };

    expect(() =>
      parseCampaignAdminEntitiesListResponse(invalidPayload),
    ).toThrowError("Invalid campaign admin entities response.");
  });

  it("accepts entity list payloads with deprecated latest notification type values", () => {
    const payload = createEntitiesListResponsePayload();
    const legacyPayload = {
      ...payload,
      data: {
        ...payload.data,
        items: payload.data.items.map((item) => ({
          ...item,
          latestNotificationType: "public_debate_entity_update",
        })),
      },
    };

    expect(parseCampaignAdminEntitiesListResponse(legacyPayload)).toEqual(
      legacyPayload.data,
    );
  });

  it("accepts entity list payloads with unknown latest notification type values", () => {
    const payload = createEntitiesListResponsePayload();
    const nextPayload = {
      ...payload,
      data: {
        ...payload.data,
        items: payload.data.items.map((item) => ({
          ...item,
          latestNotificationType: "funky:outbox:future_type",
        })),
      },
    };

    expect(parseCampaignAdminEntitiesListResponse(nextPayload)).toEqual(
      nextPayload.data,
    );
  });
});
