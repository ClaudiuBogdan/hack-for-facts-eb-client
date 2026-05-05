import { describe, expect, it } from "vitest";
import {
  createEmptyCampaignAdminNotificationsSearch,
  createEmptyCampaignAdminEntitiesSearch,
  createEmptyCampaignAdminEntityConfigSearch,
  createEmptyCampaignAdminInstitutionThreadsSearch,
  createCampaignAdminEntityConfigPaginationSignature,
  createCampaignAdminInstitutionThreadsPaginationSignature,
  buildCampaignAdminQueueSearchFromDraft,
  buildCampaignAdminInstitutionThreadsSearchFromDraft,
  createEmptyCampaignAdminQueueSearch,
  getCampaignAdminEntityConfigExportFilters,
  getCampaignAdminEntityConfigFilters,
  getCampaignAdminInstitutionThreadsSearchFromEntitiesSearch,
  getCampaignAdminInstitutionThreadsFilters,
  getCampaignAdminInstitutionThreadsSearchConflictCode,
  hasActiveCampaignAdminUsersFilters,
  isCampaignAdminFilterDraftEqual,
  mergeCampaignAdminInstitutionThreadsSearchIntoEntitiesSearch,
  normalizeCampaignAdminEntityConfigSearch,
  normalizeCampaignAdminEntitiesSearch,
  normalizeCampaignAdminInstitutionThreadsSearch,
  normalizeCampaignAdminNotificationsSearch,
  normalizeCampaignAdminQueueSearch,
  normalizeCampaignAdminUserPageSearch,
  normalizeCampaignAdminUsersSearch,
} from "./search-schema";

describe("campaign admin search schema", () => {
  it("normalizes empty inputs to the default page limit", () => {
    expect(normalizeCampaignAdminQueueSearch({})).toEqual({
      limit: 50,
      reviewStatus: "pending",
    });
  });

  it("converts date inputs into UTC range boundaries", () => {
    const nextSearch = buildCampaignAdminQueueSearchFromDraft(
      {
        phase: "",
        reviewStatus: "",
        interactionId: "",
        lessonId: "",
        entityCui: "12345678",
        scopeType: "",
        payloadKind: "",
        submissionPath: "",
        userId: "",
        recordKey: "",
        recordKeyPrefix: "funky:interaction:",
        submittedAtFrom: "",
        submittedAtTo: "",
        updatedAtFrom: "2026-04-10",
        updatedAtTo: "2026-04-12",
        hasInstitutionThread: "true",
        threadPhase: "",
        limit: 25,
      },
      { limit: 25 },
    );

    expect(nextSearch).toEqual({
      reviewStatusMode: "all",
      entityCui: "12345678",
      recordKeyPrefix: "funky:interaction:",
      updatedAtFrom: "2026-04-10T00:00:00.000Z",
      updatedAtTo: "2026-04-12T23:59:59.999Z",
      hasInstitutionThread: true,
      limit: 25,
    });
  });

  it("accepts sidebar selection state without changing default queue filters", () => {
    expect(
      normalizeCampaignAdminQueueSearch({
        reviewSelectionKey:
          "user-1::funky:interaction:public_debate_request::entity:12345678",
      }),
    ).toEqual({
      limit: 50,
      reviewStatus: "pending",
      reviewSelectionKey:
        "user-1::funky:interaction:public_debate_request::entity:12345678",
    });
  });

  it("ignores sidebar selection state when comparing filter equality", () => {
    expect(
      isCampaignAdminFilterDraftEqual(
        { limit: 50, reviewStatus: "pending" },
        {
          limit: 50,
          reviewStatus: "pending",
          reviewSelectionKey:
            "user-1::funky:interaction:public_debate_request::entity:12345678",
        },
      ),
    ).toBe(true);
  });

  it("accepts cursor and pageIndex route state without changing default filters", () => {
    expect(
      normalizeCampaignAdminQueueSearch({
        cursor: "cursor-1",
        pageIndex: "2",
        reviewSelectionKey:
          "user-1::funky:interaction:public_debate_request::entity:12345678",
      }),
    ).toEqual({
      limit: 50,
      reviewStatus: "pending",
      cursor: "cursor-1",
      pageIndex: 2,
      reviewSelectionKey:
        "user-1::funky:interaction:public_debate_request::entity:12345678",
    });
  });

  it("ignores cursor and pageIndex when comparing filter equality", () => {
    expect(
      isCampaignAdminFilterDraftEqual(
        { limit: 50, reviewStatus: "pending" },
        {
          limit: 50,
          reviewStatus: "pending",
          cursor: "cursor-1",
          pageIndex: 2,
        },
      ),
    ).toBe(true);
  });

  it("preserves an explicit all-status search instead of defaulting back to pending", () => {
    expect(
      normalizeCampaignAdminQueueSearch({
        reviewStatusMode: "all",
      }),
    ).toEqual({
      limit: 50,
      reviewStatusMode: "all",
    });
  });

  it("preserves an inherited submission path when applying visible filters", () => {
    expect(
      buildCampaignAdminQueueSearchFromDraft(
        {
          phase: "",
          reviewStatus: "",
          interactionId: "",
          lessonId: "",
          entityCui: "12345678",
          scopeType: "",
          payloadKind: "",
          submissionPath: "send_email",
          userId: "",
          recordKey: "",
          recordKeyPrefix: "",
          submittedAtFrom: "",
          submittedAtTo: "",
          updatedAtFrom: "",
          updatedAtTo: "",
          hasInstitutionThread: "",
          threadPhase: "",
          limit: 50,
        },
        {
          limit: 50,
          reviewStatus: "pending",
          submissionPath: "send_email",
        },
      ),
    ).toEqual({
      reviewStatusMode: "all",
      entityCui: "12345678",
      submissionPath: "send_email",
      limit: 50,
    });
  });

  it("does not preserve an inherited submission path when resetting filters", () => {
    expect(
      createEmptyCampaignAdminQueueSearch(25, {
        limit: 25,
        entityCui: "12345678",
        submissionPath: "send_email",
      }),
    ).toEqual({
      limit: 25,
      reviewStatus: "pending",
    });
  });

  it("normalizes users route search defaults", () => {
    expect(normalizeCampaignAdminUsersSearch({})).toEqual({
      limit: 50,
      sortBy: "latestUpdatedAt",
      sortOrder: "desc",
    });
  });

  it("normalizes notifications route search defaults", () => {
    expect(normalizeCampaignAdminNotificationsSearch({})).toEqual({
      tab: "audit",
      limit: 50,
      sortBy: "createdAt",
      sortOrder: "desc",
    });
  });

  it("normalizes entities route search defaults", () => {
    expect(normalizeCampaignAdminEntitiesSearch({})).toEqual({
      tab: "overview",
      limit: 50,
      sortBy: "latestInteractionAt",
      sortOrder: "desc",
      configSortBy: "updatedAt",
      configSortOrder: "desc",
      configLimit: 50,
    });
  });

  it("normalizes entity detail table tab search param", () => {
    expect(
      normalizeCampaignAdminEntitiesSearch({
        tab: "notifications",
      }),
    ).toEqual({
      tab: "notifications",
      limit: 50,
      sortBy: "latestInteractionAt",
      sortOrder: "desc",
      configSortBy: "updatedAt",
      configSortOrder: "desc",
      configLimit: 50,
    });
  });

  it("trims entities search values and preserves paging state", () => {
    expect(
      normalizeCampaignAdminEntitiesSearch({
        query: "  12345678  ",
        interactionId: "  funky:interaction:public_debate_request  ",
        hasPendingReviews: "true",
        hasSubscribers: "false",
        latestNotificationType: "  funky:outbox:entity_update  ",
        latestNotificationStatus: "failed_permanent",
        cursor: "cursor-1",
        pageIndex: "2",
        limit: "25",
      }),
    ).toEqual({
      tab: "overview",
      query: "12345678",
      interactionId: "funky:interaction:public_debate_request",
      hasPendingReviews: true,
      hasSubscribers: false,
      latestNotificationType: "funky:outbox:entity_update",
      latestNotificationStatus: "failed_permanent",
      cursor: "cursor-1",
      pageIndex: 2,
      sortBy: "latestInteractionAt",
      sortOrder: "desc",
      limit: 25,
      configSortBy: "updatedAt",
      configSortOrder: "desc",
      configLimit: 50,
    });
  });

  it("defaults entityCui sorting to ascending and drops deprecated notification types", () => {
    expect(
      normalizeCampaignAdminEntitiesSearch({
        sortBy: "entityCui",
        latestNotificationType:
          "public_debate_entity_update" as unknown as never,
      }),
    ).toEqual({
      tab: "overview",
      sortBy: "entityCui",
      sortOrder: "asc",
      limit: 50,
      configSortBy: "updatedAt",
      configSortOrder: "desc",
      configLimit: 50,
    });
  });

  it("preserves supported public debate announcement notification filters", () => {
    expect(
      normalizeCampaignAdminEntitiesSearch({
        latestNotificationType:
          "  funky:outbox:public_debate_announcement  ",
      }),
    ).toEqual({
      tab: "overview",
      latestNotificationType: "funky:outbox:public_debate_announcement",
      sortBy: "latestInteractionAt",
      sortOrder: "desc",
      limit: 50,
      configSortBy: "updatedAt",
      configSortOrder: "desc",
      configLimit: 50,
    });
  });

  it("normalizes entity config route search defaults and trims filter values", () => {
    expect(
      normalizeCampaignAdminEntityConfigSearch({
        entityCui: ' "12345678" ',
        budgetPublicationDate: "2026-03-20",
        hasBudgetPublicationDate: "false",
        officialBudgetUrl: "  buget.pdf  ",
        hasOfficialBudgetUrl: "true",
        updatedAtFrom: "2026-04-10T00:00:00.000Z",
        updatedAtTo: "2026-04-12T23:59:59.999Z",
        sortBy: "entityCui",
        cursor: "cursor-1",
        pageIndex: "2",
        limit: "500",
        selectedEntityCui: " 12345678 ",
      }),
    ).toEqual({
      entityCui: "12345678",
      budgetPublicationDate: "2026-03-20",
      hasBudgetPublicationDate: false,
      officialBudgetUrl: "buget.pdf",
      hasOfficialBudgetUrl: true,
      updatedAtFrom: "2026-04-10T00:00:00.000Z",
      updatedAtTo: "2026-04-12T23:59:59.999Z",
      sortBy: "entityCui",
      sortOrder: "asc",
      cursor: "cursor-1",
      pageIndex: 2,
      limit: 500,
      selectedEntityCui: "12345678",
    });
  });

  it("separates entity config list filters from export-only search state", () => {
    const search = normalizeCampaignAdminEntityConfigSearch({
      entityCui: "12345678",
      updatedAtFrom: "2026-04-10T00:00:00.000Z",
      selectedEntityCui: "12345678",
    });

    expect(getCampaignAdminEntityConfigFilters(search)).toEqual({
      entityCui: "12345678",
      updatedAtFrom: "2026-04-10T00:00:00.000Z",
      sortBy: "updatedAt",
      sortOrder: "desc",
    });
    expect(
      getCampaignAdminEntityConfigExportFilters({
        ...search,
        query: "Oras Test",
      }),
    ).toEqual({
      query: "Oras Test",
      entityCui: "12345678",
      updatedAtFrom: "2026-04-10T00:00:00.000Z",
      sortBy: "updatedAt",
      sortOrder: "desc",
    });
    expect(
      JSON.parse(createCampaignAdminEntityConfigPaginationSignature(search)),
    ).toEqual({
      entityCui: "12345678",
      updatedAtFrom: "2026-04-10T00:00:00.000Z",
      limit: 50,
      sortBy: "updatedAt",
      sortOrder: "desc",
    });
  });

  it("defaults entity config users-count sorting to descending", () => {
    expect(
      normalizeCampaignAdminEntityConfigSearch({
        sortBy: "usersCount",
        limit: "250",
      }),
    ).toEqual({
      sortBy: "usersCount",
      sortOrder: "desc",
      limit: 250,
    });
  });

  it("keeps staged config sorting local while using server-safe filters", () => {
    const search = normalizeCampaignAdminEntityConfigSearch({
      sortBy: "stagedValues",
      limit: "50",
    });

    expect(search).toEqual({
      sortBy: "stagedValues",
      sortOrder: "desc",
      limit: 50,
    });
    expect(getCampaignAdminEntityConfigFilters(search)).toEqual({
      sortBy: "updatedAt",
      sortOrder: "desc",
    });
    expect(getCampaignAdminEntityConfigExportFilters(search)).toEqual({
      sortBy: "updatedAt",
      sortOrder: "desc",
    });
  });

  it("creates an empty entity config search while preserving display options", () => {
    expect(
      createEmptyCampaignAdminEntityConfigSearch({
        currentSearch: {
          entityCui: "12345678",
          sortBy: "entityCui",
          sortOrder: "asc",
          limit: 25,
          selectedEntityCui: "12345678",
        },
      }),
    ).toEqual({
      sortBy: "entityCui",
      sortOrder: "asc",
      limit: 25,
    });
  });

  it("creates an empty entities search while preserving display options", () => {
    expect(
      createEmptyCampaignAdminEntitiesSearch({
        currentSearch: {
          query: "Oras Test",
          hasPendingReviews: true,
          sortBy: "userCount",
          sortOrder: "asc",
          limit: 25,
        },
      }),
    ).toEqual({
      tab: "overview",
      sortBy: "userCount",
      sortOrder: "asc",
      limit: 25,
      configSortBy: "updatedAt",
      configSortOrder: "desc",
      configLimit: 50,
    });
  });

  it("normalizes institution thread search defaults", () => {
    expect(normalizeCampaignAdminInstitutionThreadsSearch({})).toEqual({
      stateGroup: "open",
      limit: 50,
    });
  });

  it("builds institution-thread search from the filter draft and preserves selectedThreadId", () => {
    expect(
      buildCampaignAdminInstitutionThreadsSearchFromDraft(
        {
          stateGroup: "open",
          threadState: "pending",
          responseStatus: "registration_number_received",
          query: "  contact  ",
          entityCui: "12345678",
          updatedAtFrom: "2026-04-10",
          updatedAtTo: "2026-04-12",
          latestResponseAtFrom: "2026-04-11",
          latestResponseAtTo: "2026-04-12",
          limit: 25,
        },
        {
          stateGroup: "open",
          selectedThreadId: "thread-1",
          limit: 25,
        },
      ),
    ).toEqual({
      stateGroup: "open",
      threadState: "pending",
      responseStatus: "registration_number_received",
      query: "contact",
      entityCui: "12345678",
      updatedAtFrom: "2026-04-10T00:00:00.000Z",
      updatedAtTo: "2026-04-12T23:59:59.999Z",
      latestResponseAtFrom: "2026-04-11T00:00:00.000Z",
      latestResponseAtTo: "2026-04-12T23:59:59.999Z",
      selectedThreadId: "thread-1",
      limit: 25,
    });
  });

  it("ignores selectedThreadId and pagination when computing institution-thread filter state", () => {
    const search = normalizeCampaignAdminInstitutionThreadsSearch({
      stateGroup: "open",
      selectedThreadId: "thread-1",
      cursor: "cursor-1",
      pageIndex: "2",
      limit: 50,
    });

    expect(getCampaignAdminInstitutionThreadsFilters(search)).toEqual({
      stateGroup: "open",
    });
    expect(
      createCampaignAdminInstitutionThreadsPaginationSignature(search),
    ).toBe(JSON.stringify({ stateGroup: "open", limit: 50 }));
  });

  it("flags contradictory institution-thread filter combinations", () => {
    expect(
      getCampaignAdminInstitutionThreadsSearchConflictCode({
        stateGroup: "closed",
        threadState: "pending",
        limit: 50,
      }),
    ).toBe("closed_pending");
    expect(
      getCampaignAdminInstitutionThreadsSearchConflictCode({
        stateGroup: "open",
        threadState: "resolved",
        limit: 50,
      }),
    ).toBe("open_resolved");
  });

  it("creates an empty institution-thread search with the open default", () => {
    expect(
      createEmptyCampaignAdminInstitutionThreadsSearch({
        currentSearch: {
          stateGroup: "closed",
          threadState: "resolved",
          limit: 25,
        },
      }),
    ).toEqual({
      stateGroup: "open",
      limit: 25,
    });
  });

  it("maps namespaced thread route state from entities search", () => {
    const search = normalizeCampaignAdminEntitiesSearch({
      tab: "threads",
      limit: 50,
      threadsStateGroup: "closed",
      threadsThreadState: "resolved",
      threadsSelectedThreadId: "thread-1",
      threadsLimit: 15,
    });

    expect(getCampaignAdminInstitutionThreadsSearchFromEntitiesSearch(search)).toEqual({
      stateGroup: "closed",
      threadState: "resolved",
      selectedThreadId: "thread-1",
      limit: 15,
    });
  });

  it("merges institution thread search into entities search without losing thread paging state", () => {
    expect(
      mergeCampaignAdminInstitutionThreadsSearchIntoEntitiesSearch(
        normalizeCampaignAdminEntitiesSearch({
          tab: "overview",
          limit: 50,
        }),
        {
          stateGroup: "open",
          query: "contact",
          cursor: "cursor-1",
          pageIndex: 2,
          selectedThreadId: "thread-9",
          limit: 10,
        },
      ),
    ).toEqual({
      tab: "threads",
      sortBy: "latestInteractionAt",
      sortOrder: "desc",
      limit: 50,
      configSortBy: "updatedAt",
      configSortOrder: "desc",
      configLimit: 50,
      threadsStateGroup: "open",
      threadsQuery: "contact",
      threadsCursor: "cursor-1",
      threadsPageIndex: 2,
      threadsSelectedThreadId: "thread-9",
      threadsLimit: 10,
    });
  });

  it("trims notifications search text values and preserves paging state", () => {
    expect(
      normalizeCampaignAdminNotificationsSearch({
        tab: "audit",
        notificationType: "  funky:outbox:entity_update  ",
        userId: " user-1 ",
        entityCui: " 12345678 ",
        threadId: " thread-1 ",
        cursor: "cursor-1",
        pageIndex: "2",
        limit: "25",
      }),
    ).toEqual({
      tab: "audit",
      notificationType: "funky:outbox:entity_update",
      userId: "user-1",
      entityCui: "12345678",
      threadId: "thread-1",
      cursor: "cursor-1",
      pageIndex: 2,
      sortBy: "createdAt",
      sortOrder: "desc",
      limit: 25,
    });
  });

  it("normalizes run-state URL params for notification previews", () => {
    expect(
      normalizeCampaignAdminNotificationsSearch({
        tab: "run",
        runNotificationType: "  admin_reviewed_user_interaction  ",
        runConditions: " userId:is:user-1 ",
        previewId: " plan-1 ",
        previewCursor: " cursor-2 ",
        previewPageIndex: "2",
        previewTrail: "%5Bnull%2C%22cursor-1%22%5D",
        previewFilter: "ready",
        limit: "25",
      }),
    ).toEqual({
      tab: "run",
      runNotificationType: "admin_reviewed_user_interaction",
      runConditions: "userId:is:user-1",
      previewId: "plan-1",
      previewCursor: "cursor-2",
      previewPageIndex: 2,
      previewTrail: "%5Bnull%2C%22cursor-1%22%5D",
      previewFilter: "ready",
      sortBy: "createdAt",
      sortOrder: "desc",
      limit: 25,
    });
  });

  it("creates an empty notifications search while preserving tab and sort defaults", () => {
    expect(
      createEmptyCampaignAdminNotificationsSearch({
        tab: "templates",
        currentSearch: {
          tab: "templates",
          templateId: "public_debate_entity_update",
          sortBy: "status",
          sortOrder: "asc",
          limit: 25,
        },
      }),
    ).toEqual({
      tab: "templates",
      sortBy: "status",
      sortOrder: "asc",
      limit: 25,
    });
  });

  it("trims users query text and entity filters while keeping paging state", () => {
    expect(
      normalizeCampaignAdminUsersSearch({
        query: "  user-1  ",
        entityCui: " 12345678 ",
        cursor: "cursor-1",
        pageIndex: "2",
        sortBy: "interactionCount",
        sortOrder: "asc",
        limit: "25",
      }),
    ).toEqual({
      query: "user-1",
      entityCui: "12345678",
      cursor: "cursor-1",
      pageIndex: 2,
      sortBy: "interactionCount",
      sortOrder: "asc",
      limit: 25,
    });
  });

  it("strips wrapping quotes from entityCui across users and user-page search", () => {
    expect(
      normalizeCampaignAdminUsersSearch({
        entityCui: '"4270740"',
        limit: 50,
      }),
    ).toEqual({
      entityCui: "4270740",
      limit: 50,
      sortBy: "latestUpdatedAt",
      sortOrder: "desc",
    });

    expect(
      normalizeCampaignAdminUserPageSearch({
        entityCui: '"4270740"',
        sortBy: "updatedAt",
        sortOrder: "desc",
      }),
    ).toEqual({
      entityCui: "4270740",
      sortBy: "updatedAt",
      sortOrder: "desc",
      workspaceTab: "interactions",
    });
  });

  it("maps legacy child-route updatedAt sorting to the users sort key", () => {
    expect(
      normalizeCampaignAdminUsersSearch({
        sortBy: "updatedAt",
        sortOrder: "desc",
      }),
    ).toEqual({
      limit: 50,
      sortBy: "latestUpdatedAt",
      sortOrder: "desc",
    });
  });

  it("treats only query and entity scope as active users filters", () => {
    expect(
      hasActiveCampaignAdminUsersFilters({
        limit: 50,
        sortBy: "latestUpdatedAt",
        sortOrder: "desc",
        cursor: "cursor-1",
        pageIndex: 2,
      }),
    ).toBe(false);

    expect(
      hasActiveCampaignAdminUsersFilters({
        limit: 50,
        query: "user-1",
      }),
    ).toBe(true);

    expect(
      hasActiveCampaignAdminUsersFilters({
        limit: 50,
        entityCui: "12345678",
      }),
    ).toBe(true);
  });

  it("ignores child-only sort keys on the users route instead of throwing", () => {
    expect(
      normalizeCampaignAdminUsersSearch({
        sortBy: "reviewStatus",
        sortOrder: "asc",
      }),
    ).toEqual({
      limit: 50,
      sortBy: "latestUpdatedAt",
      sortOrder: "asc",
    });
  });

  it("maps inherited users-route latestUpdatedAt sorting to the user page sort key", () => {
    expect(
      normalizeCampaignAdminUserPageSearch({
        sortBy: "latestUpdatedAt",
        sortOrder: "desc",
      }),
    ).toEqual({
      sortBy: "updatedAt",
      sortOrder: "desc",
      workspaceTab: "interactions",
    });
  });

  it("ignores users-only sort keys on the user page instead of throwing", () => {
    expect(
      normalizeCampaignAdminUserPageSearch({
        sortBy: "interactionCount",
        sortOrder: "asc",
      }),
    ).toEqual({
      sortBy: "updatedAt",
      sortOrder: "asc",
      workspaceTab: "interactions",
    });
  });
});
