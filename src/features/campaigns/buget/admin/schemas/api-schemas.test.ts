import { describe, expect, it } from "vitest";
import {
  parseCampaignAdminAppendInstitutionThreadResponse,
  parseCampaignAdminAppendInstitutionThreadResponseBody,
  parseCampaignAdminEntityConfigDetailResponse,
  parseCampaignAdminEntityConfigListResponse,
  parseCampaignAdminUpdateEntityConfigBody,
  parseCampaignAdminEntitiesListResponse,
  parseCampaignAdminEntitiesMetaResponse,
  parseCampaignAdminInstitutionThreadDetailResponse,
  parseCampaignAdminInstitutionThreadsListResponse,
  parseCampaignAdminNotificationTemplatePreviewResponse,
  parseCampaignAdminNotificationTemplatesResponse,
  parseCampaignAdminNotificationTriggerExecutionBody,
  parseCampaignAdminNotificationTriggerExecutionResponse,
  parseCampaignAdminNotificationTriggersResponse,
  parseCampaignAdminNotificationsListResponse,
  parseCampaignAdminNotificationsMetaResponse,
  parseCampaignAdminListResponse,
  parseCampaignAdminMetaResponse,
  parseCampaignAdminStatsInteractionsByTypeResponse,
  parseCampaignAdminStatsOverviewResponse,
  parseCampaignAdminStatsTopEntitiesResponse,
  parseCampaignAdminSubmitReviewsBody,
  parseCampaignAdminUsersListResponse,
  parseCampaignAdminUsersMetaResponse,
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
        totalCount: 1,
        hasMore: false,
        nextCursor: null,
      },
    },
  };
}

function createInstitutionThreadsListPayload() {
  return {
    ok: true,
    data: {
      items: [
        {
          id: "thread-1",
          entityCui: "12345678",
          entityName: "Oras Test",
          campaignKey: "funky",
          submissionPath: "platform_send",
          ownerUserId: "user-1",
          institutionEmail: "contact@primarie.ro",
          subject: "Public debate request",
          threadState: "pending",
          currentResponseStatus: "registration_number_received",
          createdAt: "2026-04-10T10:00:00.000Z",
          updatedAt: "2026-04-12T10:00:00.000Z",
          latestResponseAt: "2026-04-12T09:00:00.000Z",
          responseEventCount: 1,
          notificationAudience: {
            requesterCount: 1,
            subscriberCount: 3,
            eligibleRequesterCount: 1,
            eligibleSubscriberCount: 2,
          },
        },
      ],
      page: {
        limit: 50,
        totalCount: 1,
        hasMore: false,
        nextCursor: null,
        sortBy: "updatedAt",
        sortOrder: "desc",
      },
    },
  };
}

function createInstitutionThreadDetailPayload() {
  return {
    ok: true,
    data: {
      id: "thread-1",
      entityCui: "12345678",
      entityName: "Oras Test",
      campaignKey: "funky",
      submissionPath: "platform_send",
      ownerUserId: "user-1",
      institutionEmail: "contact@primarie.ro",
      subject: "Public debate request",
      threadState: "pending",
      currentResponseStatus: "registration_number_received",
      createdAt: "2026-04-10T10:00:00.000Z",
      updatedAt: "2026-04-12T10:00:00.000Z",
      latestResponseAt: "2026-04-12T09:00:00.000Z",
      responseEventCount: 1,
      notificationAudience: {
        requesterCount: 1,
        subscriberCount: 3,
        eligibleRequesterCount: 1,
        eligibleSubscriberCount: 2,
      },
      requesterOrganizationName: "Asociatia Test",
      budgetPublicationDate: "2026-03-20",
      consentCapturedAt: "2026-04-10T08:00:00.000Z",
      contestationDeadlineAt: "2026-04-20T00:00:00.000Z",
      responseEvents: [
        {
          id: "event-1",
          responseDate: "2026-04-12T09:00:00.000Z",
          messageContent: "Received registration number",
          responseStatus: "registration_number_received",
          actorUserId: "admin-1",
          createdAt: "2026-04-12T09:05:00.000Z",
          source: "campaign_admin_api",
        },
      ],
      correspondence: [
        {
          id: "corr-1",
          direction: "inbound",
          source: "institution_reply",
          fromAddress: "contact@primarie.ro",
          subject: "Reply",
          textBody: "Text body",
          attachments: [],
          occurredAt: "2026-04-12T09:00:00.000Z",
        },
      ],
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
        totalCount: 1,
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
          notificationType: "funky:outbox:admin_response",
          templateId: "public_debate_admin_response_requester",
          templateName: "Admin response",
          templateVersion: "1",
          status: "delivered",
          createdAt: "2026-04-12T08:00:00.000Z",
          sentAt: "2026-04-12T08:02:00.000Z",
          attemptCount: 1,
          safeError: {
            category: null,
            code: null,
          },
          projection: {
            kind: "public_debate_admin_response",
            userId: "user-1",
            entityCui: "12345678",
            entityName: "Oras Test",
            threadId: "thread-1",
            threadKey: "thread-key-1",
            responseEventId: "event-1",
            responseStatus: "request_confirmed",
            recipientRole: "requester",
            responseDate: "2026-04-12T08:01:00.000Z",
            triggerSource: "campaign_admin",
          },
        },
      ],
      page: {
        totalCount: 1,
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
        totalCount: 1,
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

function createEntityConfigResponsePayload() {
  return {
    ok: true,
    data: {
      campaignKey: "funky",
      entityCui: "12345678",
      entityName: "Oras Test",
      isConfigured: true,
      values: {
        budgetPublicationDate: "2026-03-20",
        officialBudgetUrl: "https://primarie.ro/buget.pdf",
      },
      updatedAt: "2026-04-12T10:00:00.000Z",
      updatedByUserId: "admin-1",
    },
  };
}

function createExpectedEntityConfigResponse() {
  return {
    campaignKey: "funky",
    entityCui: "12345678",
    entityName: "Oras Test",
    configured: true,
    isConfigured: true,
    values: {
      budgetPublicationDate: "2026-03-20",
      officialBudgetUrl: "https://primarie.ro/buget.pdf",
    },
    updatedAt: "2026-04-12T10:00:00.000Z",
    updatedByUserId: "admin-1",
  };
}

function createEntityConfigListResponsePayload() {
  return {
    ok: true,
    data: {
      items: [
        {
          ...createEntityConfigResponsePayload().data,
          usersCount: 4,
        },
      ],
      page: {
        limit: 50,
        totalCount: 1,
        hasMore: false,
        nextCursor: null,
        sortBy: "updatedAt",
        sortOrder: "desc",
      },
    },
  };
}

function createUsersMetaResponsePayload() {
  return {
    ok: true,
    data: {
      totalUsers: 14,
      usersWithPendingReviews: 4,
    },
  };
}

function createNotificationsMetaResponsePayload() {
  return {
    ok: true,
    data: {
      pendingDeliveryCount: 3,
      failedDeliveryCount: 2,
      replyReceivedCount: 6,
    },
  };
}

function createStatsOverviewResponsePayload() {
  return {
    ok: true,
    data: {
      coverage: {
        hasClientTelemetry: false,
        hasNotificationAttribution: false,
      },
      users: {
        totalUsers: 14,
        usersWithPendingReviews: 4,
      },
      interactions: {
        totalInteractions: 20,
        interactionsWithInstitutionThread: 6,
        reviewStatusCounts: {
          pending: 5,
          approved: 8,
          rejected: 4,
          notReviewed: 3,
        },
        phaseCounts: {
          idle: 1,
          draft: 2,
          pending: 5,
          resolved: 10,
          failed: 2,
        },
        threadPhaseCounts: {
          sending: 1,
          awaitingReply: 2,
          replyReceivedUnreviewed: 1,
          manualFollowUpNeeded: 1,
          resolvedPositive: 2,
          resolvedNegative: 1,
          closedNoResponse: 1,
          failed: 1,
          none: 10,
        },
      },
      entities: {
        totalEntities: 12,
        entitiesWithPendingReviews: 4,
        entitiesWithSubscribers: 6,
        entitiesWithNotificationActivity: 7,
        entitiesWithFailedNotifications: 2,
      },
      notifications: {
        pendingDeliveryCount: 3,
        failedDeliveryCount: 2,
        deliveredCount: 18,
        openedCount: 11,
        clickedCount: 5,
        suppressedCount: 1,
      },
    },
  };
}

function createStatsInteractionsByTypeResponsePayload() {
  return {
    ok: true,
    data: {
      items: [
        {
          interactionId: "funky:interaction:public_debate_request",
          label: "Public debate request",
          total: 12,
          pending: 3,
          approved: 5,
          rejected: 2,
          notReviewed: 2,
        },
        {
          interactionId: "funky:interaction:budget_document",
          label: null,
          total: 7,
          pending: 2,
          approved: 3,
          rejected: 1,
          notReviewed: 1,
        },
      ],
    },
  };
}

function createStatsTopEntitiesResponsePayload() {
  return {
    ok: true,
    data: {
      sortBy: "interactionCount",
      limit: 10,
      items: [
        {
          entityCui: "12345678",
          entityName: "Oras Test",
          interactionCount: 12,
          userCount: 6,
          pendingReviewCount: 3,
        },
        {
          entityCui: "87654321",
          entityName: null,
          interactionCount: 9,
          userCount: 5,
          pendingReviewCount: 2,
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
          totalCount: 1,
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

  it("parses entity config list payloads", () => {
    const payload = createEntityConfigListResponsePayload();

    expect(parseCampaignAdminEntityConfigListResponse(payload)).toEqual(
      {
        ...payload.data,
        items: [
          {
            ...createExpectedEntityConfigResponse(),
            usersCount: 4,
          },
        ],
      },
    );
  });

  it("parses entity config detail payloads", () => {
    const payload = createEntityConfigResponsePayload();

    expect(parseCampaignAdminEntityConfigDetailResponse(payload)).toEqual(
      createExpectedEntityConfigResponse(),
    );
  });

  it("accepts only configured entity config update bodies", () => {
    const payload = {
      expectedUpdatedAt: "2026-04-11T09:00:00.000Z",
      values: {
        budgetPublicationDate: "2026-03-20",
        officialBudgetUrl: null,
      },
    };

    expect(parseCampaignAdminUpdateEntityConfigBody(payload)).toEqual(payload);
    expect(() =>
      parseCampaignAdminUpdateEntityConfigBody({
        expectedUpdatedAt: null,
        values: {
          budgetPublicationDate: null,
          officialBudgetUrl: null,
        },
      }),
    ).toThrowError("Invalid campaign admin entity config update body.");
    expect(() =>
      parseCampaignAdminUpdateEntityConfigBody({
        expectedUpdatedAt: null,
        values: {
          budgetPublicationDate: "2026/03/20",
          officialBudgetUrl: null,
        },
      }),
    ).toThrowError("Invalid campaign admin entity config update body.");
    expect(() =>
      parseCampaignAdminUpdateEntityConfigBody({
        expectedUpdatedAt: null,
        values: {
          budgetPublicationDate: null,
          officialBudgetUrl: "ftp://primarie.ro/buget.pdf",
        },
      }),
    ).toThrowError("Invalid campaign admin entity config update body.");
  });

  it("parses entities metadata payloads", () => {
    const payload = createEntitiesMetaResponsePayload();

    expect(parseCampaignAdminEntitiesMetaResponse(payload)).toEqual(payload.data);
  });

  it("parses users metadata payloads", () => {
    const payload = createUsersMetaResponsePayload();

    expect(parseCampaignAdminUsersMetaResponse(payload)).toEqual(payload.data);
  });

  it("parses notifications metadata payloads", () => {
    const payload = createNotificationsMetaResponsePayload();

    expect(parseCampaignAdminNotificationsMetaResponse(payload)).toEqual(
      payload.data,
    );
  });

  it("accepts only the strict stats overview shape", () => {
    const payload = createStatsOverviewResponsePayload();

    expect(parseCampaignAdminStatsOverviewResponse(payload)).toEqual(
      payload.data,
    );
  });

  it.each([
    ["email", (payload: ReturnType<typeof createStatsOverviewResponsePayload>) => {
      payload.data.users = {
        ...payload.data.users,
        email: "user@example.com",
      } as typeof payload.data.users;
    }],
    [
      "institutionEmail",
      (payload: ReturnType<typeof createStatsOverviewResponsePayload>) => {
        payload.data.interactions = {
          ...payload.data.interactions,
          institutionEmail: "contact@example.com",
        } as typeof payload.data.interactions;
      },
    ],
    ["subject", (payload: ReturnType<typeof createStatsOverviewResponsePayload>) => {
      payload.data.notifications = {
        ...payload.data.notifications,
        subject: "Secret",
      } as typeof payload.data.notifications;
    }],
    ["html", (payload: ReturnType<typeof createStatsOverviewResponsePayload>) => {
      payload.data.notifications = {
        ...payload.data.notifications,
        html: "<p>Private</p>",
      } as typeof payload.data.notifications;
    }],
    [
      "clickedUrl",
      (payload: ReturnType<typeof createStatsOverviewResponsePayload>) => {
        payload.data.notifications = {
          ...payload.data.notifications,
          clickedUrl: "https://example.com/private",
        } as typeof payload.data.notifications;
      },
    ],
    [
      "payloadSummary",
      (payload: ReturnType<typeof createStatsOverviewResponsePayload>) => {
        payload.data.interactions = {
          ...payload.data.interactions,
          payloadSummary: {
            kind: "private",
          },
        } as typeof payload.data.interactions;
      },
    ],
  ])("rejects unexpected %s fields in the overview response", (_, mutatePayload) => {
    const payload = createStatsOverviewResponsePayload();
    mutatePayload(payload);

    expect(() => parseCampaignAdminStatsOverviewResponse(payload)).toThrowError(
      "Invalid campaign admin stats overview response.",
    );
  });

  it("rejects non-integer count fields in the overview response", () => {
    const payload = createStatsOverviewResponsePayload();
    payload.data.notifications.openedCount = 1.5;

    expect(() => parseCampaignAdminStatsOverviewResponse(payload)).toThrowError(
      "Invalid campaign admin stats overview response.",
    );
  });

  it("parses interactions-by-type analytics payloads", () => {
    const payload = createStatsInteractionsByTypeResponsePayload();

    expect(parseCampaignAdminStatsInteractionsByTypeResponse(payload)).toEqual(
      payload.data,
    );
  });

  it("parses top-entities analytics payloads", () => {
    const payload = createStatsTopEntitiesResponsePayload();

    expect(parseCampaignAdminStatsTopEntitiesResponse(payload)).toEqual(
      payload.data,
    );
  });

  it.each([
    [
      "email",
      (
        payload: ReturnType<typeof createStatsInteractionsByTypeResponsePayload>,
      ) => {
        payload.data.items[0] = {
          ...payload.data.items[0],
          email: "user@example.com",
        } as unknown as typeof payload.data.items[0];
      },
    ],
    [
      "payloadSummary",
      (
        payload: ReturnType<typeof createStatsInteractionsByTypeResponsePayload>,
      ) => {
        payload.data.items[0] = {
          ...payload.data.items[0],
          payloadSummary: {
            kind: "private",
          },
        } as unknown as typeof payload.data.items[0];
      },
    ],
    [
      "clickedUrl",
      (
        payload: ReturnType<typeof createStatsInteractionsByTypeResponsePayload>,
      ) => {
        payload.data.items[0] = {
          ...payload.data.items[0],
          clickedUrl: "https://example.com/private",
        } as unknown as typeof payload.data.items[0];
      },
    ],
  ])(
    "rejects unexpected %s fields in interactions-by-type analytics payloads",
    (_, mutatePayload) => {
      const payload = createStatsInteractionsByTypeResponsePayload();
      mutatePayload(payload);

      expect(() =>
        parseCampaignAdminStatsInteractionsByTypeResponse(payload),
      ).toThrowError(
        "Invalid campaign admin stats interactions-by-type response.",
      );
    },
  );

  it.each([
    [
      "institutionEmail",
      (payload: ReturnType<typeof createStatsTopEntitiesResponsePayload>) => {
        payload.data.items[0] = {
          ...payload.data.items[0],
          institutionEmail: "contact@example.com",
        } as unknown as typeof payload.data.items[0];
      },
    ],
    [
      "subject",
      (payload: ReturnType<typeof createStatsTopEntitiesResponsePayload>) => {
        payload.data.items[0] = {
          ...payload.data.items[0],
          subject: "Secret",
        } as unknown as typeof payload.data.items[0];
      },
    ],
  ])("rejects unexpected %s fields in top-entities analytics payloads", (_, mutatePayload) => {
    const payload = createStatsTopEntitiesResponsePayload();
    mutatePayload(payload);

    expect(() => parseCampaignAdminStatsTopEntitiesResponse(payload)).toThrowError(
      "Invalid campaign admin stats top entities response.",
    );
  });

  it("rejects non-integer count fields in top-entities analytics payloads", () => {
    const payload = createStatsTopEntitiesResponsePayload();
    payload.data.items[0].interactionCount = 1.5;

    expect(() => parseCampaignAdminStatsTopEntitiesResponse(payload)).toThrowError(
      "Invalid campaign admin stats top entities response.",
    );
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

  it("parses institution thread list and detail payloads", () => {
    expect(
      parseCampaignAdminInstitutionThreadsListResponse(
        createInstitutionThreadsListPayload(),
      ),
    ).toEqual(createInstitutionThreadsListPayload().data);
    expect(
      parseCampaignAdminInstitutionThreadDetailResponse(
        createInstitutionThreadDetailPayload(),
      ),
    ).toEqual(createInstitutionThreadDetailPayload().data);
  });

  it("parses append-response request and response payloads for institution threads", () => {
    expect(
      parseCampaignAdminAppendInstitutionThreadResponseBody({
        expectedUpdatedAt: "2026-04-12T10:00:00.000Z",
        responseDate: "2026-04-13T10:00:00.000Z",
        messageContent: "Confirmed request",
        responseStatus: "request_confirmed",
        sendNotification: true,
      }),
    ).toEqual({
      expectedUpdatedAt: "2026-04-12T10:00:00.000Z",
      responseDate: "2026-04-13T10:00:00.000Z",
      messageContent: "Confirmed request",
      responseStatus: "request_confirmed",
      sendNotification: true,
    });

    expect(
      parseCampaignAdminAppendInstitutionThreadResponse({
        ...createInstitutionThreadDetailPayload(),
        data: {
          ...createInstitutionThreadDetailPayload().data,
          createdResponseEventId: "event-2",
          notificationExecution: {
            requested: true,
            status: "queued",
            requesterCount: 1,
            subscriberCount: 3,
            eligibleRequesterCount: 1,
            eligibleSubscriberCount: 2,
            createdOutboxIds: ["outbox-1", "outbox-2"],
            reusedOutboxIds: [],
            queuedOutboxIds: ["outbox-1", "outbox-2"],
            enqueueFailedOutboxIds: [],
          },
        },
      }),
    ).toEqual({
      ...createInstitutionThreadDetailPayload().data,
      createdResponseEventId: "event-2",
      notificationExecution: {
        requested: true,
        status: "queued",
        requesterCount: 1,
        subscriberCount: 3,
        eligibleRequesterCount: 1,
        eligibleSubscriberCount: 2,
        createdOutboxIds: ["outbox-1", "outbox-2"],
        reusedOutboxIds: [],
        queuedOutboxIds: ["outbox-1", "outbox-2"],
        enqueueFailedOutboxIds: [],
      },
    });
  });
});
