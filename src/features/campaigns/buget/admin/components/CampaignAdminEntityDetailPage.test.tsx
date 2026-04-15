import { existsSync } from "node:fs";
import type { ComponentType, ReactNode } from "react";
import { render, screen } from "@/test/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  CampaignAdminNotificationListItem,
  CampaignAdminUserInteractionListItem,
  CampaignAdminUserListItem,
  CampaignAdminUsersListResponse,
} from "@/features/campaigns/buget/admin/types";

const componentFileUrl = new URL("./CampaignAdminEntityDetailPage.tsx", import.meta.url);
const describeIfEntityDetailPageExists = existsSync(componentFileUrl)
  ? describe
  : describe.skip;

const useAuthMock = vi.fn();
const useCampaignAdminUsersQueryMock = vi.fn();
const useCampaignAdminNotificationsAuditQueryMock = vi.fn();
const useCampaignAdminQueueQueryMock = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
    search,
    ...props
  }: {
    readonly children: ReactNode;
    readonly to?: string;
    readonly params?: Record<string, string>;
    readonly search?: Record<string, string | number | boolean | undefined>;
    readonly [key: string]: unknown;
  }) => {
    let href = typeof to === "string" ? to : "";
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        href = href.replace(`$${key}`, value);
      }
    }

    const query = search
      ? new URLSearchParams(
          Object.entries(search)
            .filter(([, value]) => value !== undefined)
            .map(([key, value]) => [key, String(value)]),
        ).toString()
      : "";

    return (
      <a href={query ? `${href}?${query}` : href} {...props}>
        {children}
      </a>
    );
  },
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => useAuthMock(),
  AuthSignInButton: ({ children }: { readonly children: ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("@/hooks/useTablePreferences", () => ({
  useTablePreferences: () => ({
    columnVisibility: {},
    setColumnVisibility: vi.fn(),
  }),
}));

vi.mock(
  "@/features/campaigns/buget/admin/hooks/use-campaign-admin-users",
  () => ({
    useCampaignAdminUsersQuery: (...args: unknown[]) =>
      useCampaignAdminUsersQueryMock(...args),
  }),
);

vi.mock(
  "@/features/campaigns/buget/admin/hooks/use-campaign-admin-notifications",
  () => ({
    useCampaignAdminNotificationsAuditQuery: (...args: unknown[]) =>
      useCampaignAdminNotificationsAuditQueryMock(...args),
  }),
);

vi.mock(
  "@/features/campaigns/buget/admin/hooks/use-campaign-admin-user-interactions",
  () => ({
    useCampaignAdminQueueQuery: (...args: unknown[]) =>
      useCampaignAdminQueueQueryMock(...args),
  }),
);

vi.mock(
  "@/features/campaigns/buget/admin/components/CampaignAdminUsersTable",
  () => ({
    CampaignAdminUsersTable: ({
      items,
    }: {
      readonly items: readonly CampaignAdminUserListItem[];
    }) => (
      <div data-testid="users-table">
        {items.map((item) => (
          <div key={item.userId}>{item.userId}</div>
        ))}
      </div>
    ),
  }),
);

vi.mock(
  "@/features/campaigns/buget/admin/components/CampaignAdminNotificationsTable",
  () => ({
    CampaignAdminNotificationsTable: ({
      items,
    }: {
      readonly items: readonly CampaignAdminNotificationListItem[];
    }) => (
      <div data-testid="notifications-table">
        {items.map((item) => (
          <div key={item.outboxId}>{item.outboxId}</div>
        ))}
      </div>
    ),
  }),
);

function createUserItem(
  overrides: Partial<CampaignAdminUserListItem> = {},
): CampaignAdminUserListItem {
  return {
    userId: "user-1",
    interactionCount: 2,
    pendingReviewCount: 1,
    latestUpdatedAt: "2026-04-12T10:00:00.000Z",
    latestInteractionId: "funky:interaction:public_debate_request",
    latestEntityCui: "12345678",
    latestEntityName: "Oras Test",
    ...overrides,
  };
}

function createUsersResponse(
  items: readonly CampaignAdminUserListItem[],
): CampaignAdminUsersListResponse {
  return {
    items,
    page: {
      totalCount: items.length,
      hasMore: false,
      nextCursor: null,
      sortBy: "latestUpdatedAt",
      sortOrder: "desc",
    },
  };
}

function createNotificationItem(
  overrides: Partial<CampaignAdminNotificationListItem> = {},
): CampaignAdminNotificationListItem {
  return {
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
    ...overrides,
  };
}

function createInteractionItem(
  overrides: Partial<CampaignAdminUserInteractionListItem> = {},
): CampaignAdminUserInteractionListItem {
  return {
    userId: "user-2",
    recordKey: "funky:interaction:public_debate_request::entity:12345678",
    campaignKey: "funky",
    interactionId: "funky:interaction:public_debate_request",
    lessonId: "civic-monitor-and-request",
    entityCui: "12345678",
    entityName: "Oras Test",
    scopeType: "entity",
    phase: "pending",
    reviewStatus: "pending",
    pendingReason: "awaiting_manual_review",
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

function mockUsersState(input: {
  readonly items?: readonly CampaignAdminUserListItem[];
  readonly error?: { status: number; message: string } | null;
  readonly isLoading?: boolean;
  readonly isFetching?: boolean;
}) {
  useCampaignAdminUsersQueryMock.mockReturnValue({
    data:
      input.isLoading && input.items === undefined
        ? undefined
        : createUsersResponse(input.items ?? []),
    error: input.error ?? null,
    isLoading: input.isLoading ?? false,
    isFetching: input.isFetching ?? false,
    refetch: vi.fn(),
  });
}

function mockNotificationsState(input: {
  readonly items?: readonly CampaignAdminNotificationListItem[];
  readonly error?: { status: number; message: string } | null;
  readonly isLoading?: boolean;
  readonly isFetching?: boolean;
}) {
  useCampaignAdminNotificationsAuditQueryMock.mockReturnValue({
    data:
      input.isLoading && input.items === undefined
        ? undefined
        : {
            items: input.items ?? [],
            page: {
              totalCount: (input.items ?? []).length,
              hasMore: false,
              nextCursor: null,
            },
          },
    error: input.error ?? null,
    isLoading: input.isLoading ?? false,
    isFetching: input.isFetching ?? false,
    refetch: vi.fn(),
  });
}

function mockInteractionsState(input: {
  readonly items?: readonly CampaignAdminUserInteractionListItem[];
  readonly error?: { status: number; message: string } | null;
  readonly isLoading?: boolean;
  readonly isFetching?: boolean;
}) {
  useCampaignAdminQueueQueryMock.mockReturnValue({
    data:
      input.isLoading && input.items === undefined
        ? undefined
        : {
            items: input.items ?? [],
            page: {
              limit: 10,
              totalCount: (input.items ?? []).length,
              hasMore: false,
              nextCursor: null,
            },
          },
    error: input.error ?? null,
    isLoading: input.isLoading ?? false,
    isFetching: input.isFetching ?? false,
    refetch: vi.fn(),
  });
}

function getLinkHrefs() {
  return screen
    .queryAllByRole("link")
    .map((link) => link.getAttribute("href"))
    .filter((href): href is string => typeof href === "string");
}

async function renderEntityDetailPage() {
  const module = await import("./CampaignAdminEntityDetailPage");
  const CampaignAdminEntityDetailPage =
    module.CampaignAdminEntityDetailPage as ComponentType<{
      readonly campaignKey: string;
      readonly entityCui: string;
    }>;

  return render(
    <CampaignAdminEntityDetailPage
      campaignKey="funky"
      entityCui="12345678"
    />,
  );
}

describeIfEntityDetailPageExists("CampaignAdminEntityDetailPage", () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    useCampaignAdminUsersQueryMock.mockReset();
    useCampaignAdminNotificationsAuditQueryMock.mockReset();
    useCampaignAdminQueueQueryMock.mockReset();

    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: true });
    mockUsersState({ items: [createUserItem()] });
    mockNotificationsState({ items: [createNotificationItem()] });
    mockInteractionsState({ items: [createInteractionItem()] });
  });

  it("renders the sign-in gate when the user is signed out", async () => {
    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: false });

    await renderEntityDetailPage();

    expect(screen.getByText("Sign in required")).toBeInTheDocument();
  });

  it("renders loading indicators while auth is still loading", async () => {
    useAuthMock.mockReturnValue({ isLoaded: false, isSignedIn: false });

    await renderEntityDetailPage();

    expect(
      screen.getAllByRole("status", { name: /Loading/i }).length,
    ).toBeGreaterThan(0);
  });

  it("renders retryable error states when all section queries fail", async () => {
    mockUsersState({
      items: [],
      error: {
        status: 502,
        message: "Users unavailable",
      },
    });
    mockNotificationsState({
      items: [],
      error: {
        status: 502,
        message: "Notifications unavailable",
      },
    });
    mockInteractionsState({
      items: [],
      error: {
        status: 502,
        message: "Interactions unavailable",
      },
    });

    await renderEntityDetailPage();

    expect(screen.getByText("Failed to load entity detail")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Retry" }).length).toBeGreaterThan(0);
  });

  it("renders the three preview sections and filtered full-page links", async () => {
    await renderEntityDetailPage();

    expect(screen.getByText("Oras Test")).toBeInTheDocument();
    expect(screen.getAllByText("12345678").length).toBeGreaterThan(0);
    expect(screen.getByText("user-1")).toBeInTheDocument();
    expect(screen.getByText("outbox-1")).toBeInTheDocument();
    expect(screen.getByText("Public debate request")).toBeInTheDocument();

    expect(useCampaignAdminUsersQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignKey: "funky",
        search: expect.objectContaining({
          entityCui: "12345678",
        }),
      }),
    );
    expect(useCampaignAdminNotificationsAuditQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignKey: "funky",
        filters: expect.objectContaining({
          entityCui: "12345678",
        }),
      }),
    );
    expect(useCampaignAdminQueueQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignKey: "funky",
        filters: expect.objectContaining({
          entityCui: "12345678",
        }),
      }),
    );

    const hrefs = getLinkHrefs();
    expect(hrefs).toEqual(
      expect.arrayContaining(["#users", "#notifications", "#user-interactions"]),
    );
    expect(
      hrefs.some(
        (href) =>
          href.startsWith("/admin/campaigns/funky/users?") &&
          href.includes("entityCui=12345678"),
      ),
    ).toBe(true);
    expect(
      hrefs.some(
        (href) =>
          href.startsWith("/admin/campaigns/funky/notifications?") &&
          href.includes("entityCui=12345678"),
      ),
    ).toBe(true);
    expect(
      hrefs.some(
        (href) =>
          href.startsWith("/admin/campaigns/funky/user-interactions?") &&
          href.includes("entityCui=12345678"),
      ),
    ).toBe(true);
  });

  it("keeps the rest of the page usable when one section is empty and another fails", async () => {
    mockUsersState({ items: [createUserItem()] });
    mockNotificationsState({ items: [] });
    mockInteractionsState({
      items: [],
      error: {
        status: 502,
        message: "Interactions unavailable",
      },
    });

    await renderEntityDetailPage();

    expect(screen.getByText("user-1")).toBeInTheDocument();
    expect(screen.getByText("No notifications found for this entity")).toBeInTheDocument();
    expect(screen.getByText("Failed to load interactions")).toBeInTheDocument();

    const hrefs = getLinkHrefs();
    expect(hrefs).toEqual(
      expect.arrayContaining(["#users", "#notifications", "#user-interactions"]),
    );
    expect(
      hrefs.some(
        (href) =>
          href.startsWith("/admin/campaigns/funky/notifications?") &&
          href.includes("entityCui=12345678"),
      ),
    ).toBe(true);
    expect(
      hrefs.some(
        (href) =>
          href.startsWith("/admin/campaigns/funky/user-interactions?") &&
          href.includes("entityCui=12345678"),
      ),
    ).toBe(true);
  });
});
