import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useState, type ReactNode } from "react";
import { CampaignAdminUserPage } from "./CampaignAdminUserPage";
import type {
  CampaignAdminMetaResponse,
  CampaignAdminUserInteractionListItem,
  CampaignAdminUserPageSearch,
} from "@/features/campaigns/buget/admin/types";
import { getCampaignAdminStagedReviewDraftsStorageKey } from "@/features/campaigns/buget/admin/utils/staged-review-session-storage";

const useAuthMock = vi.fn();
const useCampaignAdminInteractionMetaQueryMock = vi.fn();
const useCampaignAdminUserPageItemsQueryMock = vi.fn();
const useCampaignAdminNotificationsAuditQueryMock = vi.fn();
const useSubmitCampaignAdminReviewsMutationMock = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => useAuthMock(),
  AuthSignInButton: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/features/campaigns/buget/admin/hooks/use-campaign-admin-user-interactions", () => ({
  useCampaignAdminInteractionMetaQuery: (...args: unknown[]) =>
    useCampaignAdminInteractionMetaQueryMock(...args),
  useCampaignAdminUserPageItemsQuery: (...args: unknown[]) =>
    useCampaignAdminUserPageItemsQueryMock(...args),
  useSubmitCampaignAdminReviewsMutation: (...args: unknown[]) =>
    useSubmitCampaignAdminReviewsMutationMock(...args),
}));

vi.mock(
  "@/features/campaigns/buget/admin/hooks/use-campaign-admin-notifications",
  () => ({
    useCampaignAdminNotificationsAuditQuery: (...args: unknown[]) =>
      useCampaignAdminNotificationsAuditQueryMock(...args),
  }),
);

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

function createMetaResponse(): CampaignAdminMetaResponse {
  return {
    availableInteractionTypes: [
      {
        interactionId: "funky:interaction:public_debate_request",
        label: "Public debate request",
      },
    ],
    stats: {
      total: 1,
      riskFlagged: 0,
      withInstitutionThread: 1,
      reviewStatusCounts: {
        pending: 1,
        approved: 0,
        rejected: 0,
        notReviewed: 0,
      },
      phaseCounts: {
        idle: 0,
        draft: 0,
        pending: 1,
        resolved: 0,
        failed: 0,
      },
      threadPhaseCounts: {
        sending: 0,
        awaiting_reply: 1,
        reply_received_unreviewed: 0,
        manual_follow_up_needed: 0,
        resolved_positive: 0,
        resolved_negative: 0,
        closed_no_response: 0,
        failed: 0,
        none: 0,
      },
    },
  };
}

describe("CampaignAdminUserPage", () => {
  const defaultSearch: CampaignAdminUserPageSearch = {
    sortBy: "updatedAt",
    sortOrder: "desc",
  };

  beforeEach(() => {
    useAuthMock.mockReset();
    useCampaignAdminInteractionMetaQueryMock.mockReset();
    useCampaignAdminUserPageItemsQueryMock.mockReset();
    useCampaignAdminNotificationsAuditQueryMock.mockReset();
    useSubmitCampaignAdminReviewsMutationMock.mockReset();
    window.localStorage.clear();
    window.sessionStorage.clear();

    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: true });
    useCampaignAdminInteractionMetaQueryMock.mockReturnValue({
      data: createMetaResponse(),
      error: null,
      isPending: false,
      refetch: vi.fn(),
    });
    useCampaignAdminUserPageItemsQueryMock.mockReturnValue({
      data: [createItem()],
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });
    useCampaignAdminNotificationsAuditQueryMock.mockReturnValue({
      data: {
        items: [],
        page: {
          hasMore: false,
          nextCursor: null,
        },
      },
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });
    useSubmitCampaignAdminReviewsMutationMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  it("adds a row to the current batch selection", async () => {
    function StatefulPage() {
      const [search, setSearch] = useState<CampaignAdminUserPageSearch>(
        defaultSearch,
      );
      return (
        <CampaignAdminUserPage
          campaignKey="funky"
          userId="user-1"
          search={search}
          onSearchChange={(nextSearch) => {
            setSearch(nextSearch);
          }}
        />
      );
    }

    render(<StatefulPage />);

    fireEvent.click(screen.getAllByRole("button", { name: "Add" })[0]!);
    expect(screen.getByText("Batch review")).toBeInTheDocument();
    expect(screen.getByText("1 row selected")).toBeInTheDocument();
  });

  it("selects a visible range when shift-clicking interaction checkboxes", () => {
    useCampaignAdminUserPageItemsQueryMock.mockReturnValue({
      data: [
        createItem({ recordKey: "record-1" }),
        createItem({ userId: "user-2", recordKey: "record-2" }),
        createItem({ userId: "user-3", recordKey: "record-3" }),
      ],
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    render(
      <CampaignAdminUserPage
        campaignKey="funky"
        userId="user-1"
        search={defaultSearch}
        onSearchChange={() => {}}
      />,
    );

    const rowCheckboxes = screen.getAllByLabelText("Select row");

    fireEvent.click(rowCheckboxes[0]!);
    fireEvent.click(rowCheckboxes[2]!, { shiftKey: true });

    expect(screen.getByText("3 rows selected")).toBeInTheDocument();
  });

  it("renders the restored user workspace header and notification actions", () => {
    render(
      <CampaignAdminUserPage
        campaignKey="funky"
        userId="user-1"
        search={{ ...defaultSearch, entityCui: '"4270740"' }}
        onSearchChange={() => {}}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "User workspace" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open notifications" }),
    ).toHaveAttribute(
      "href",
      "/admin/campaigns/funky/notifications?tab=audit&userId=user-1&sortBy=createdAt&sortOrder=desc&limit=50&entityCui=4270740",
    );
    expect(
      screen.getByRole("link", { name: "Open interactions queue" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "User interactions" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "User notifications" }),
    ).toBeInTheDocument();
    expect(useCampaignAdminNotificationsAuditQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignKey: "funky",
        filters: {
          userId: "user-1",
          entityCui: "4270740",
          sortBy: "createdAt",
          sortOrder: "desc",
        },
      }),
    );
  });

  it("keeps the user notifications preview scoped when no entity filter is present", () => {
    render(
      <CampaignAdminUserPage
        campaignKey="funky"
        userId="user-1"
        search={defaultSearch}
        onSearchChange={() => {}}
      />,
    );

    expect(useCampaignAdminNotificationsAuditQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignKey: "funky",
        filters: {
          userId: "user-1",
          entityCui: undefined,
          sortBy: "createdAt",
          sortOrder: "desc",
        },
      }),
    );
    expect(
      screen.getByRole("link", { name: "Open notifications" }),
    ).toHaveAttribute(
      "href",
      "/admin/campaigns/funky/notifications?tab=audit&userId=user-1&sortBy=createdAt&sortOrder=desc&limit=50",
    );
  });

  it("preserves the active user-page filters in the filtered queue link", () => {
    render(
      <CampaignAdminUserPage
        campaignKey="funky"
        userId="user-1"
        search={{
          reviewStatus: "approved",
          interactionId: "funky:interaction:budget_status",
          entityCui: '"4270740"',
          hasInstitutionThread: true,
          threadPhase: "manual_follow_up_needed",
          updatedAtFrom: "2026-04-01T00:00:00.000Z",
          sortBy: "reviewStatus",
          sortOrder: "asc",
          reviewSelectionKey: "user-1::record-1",
        }}
        onSearchChange={() => {}}
      />,
    );

    const filteredQueueLink = screen
      .getByText("Open interactions with filters")
      .closest("a");
    const href = filteredQueueLink?.getAttribute("href");
    expect(href).not.toBeNull();

    const searchParams = new URL(
      href!,
      "https://transparanta.example",
    ).searchParams;

    expect(searchParams.get("userId")).toBe("user-1");
    expect(searchParams.get("reviewStatus")).toBe("approved");
    expect(searchParams.get("interactionId")).toBe(
      "funky:interaction:budget_status",
    );
    expect(searchParams.get("entityCui")).toBe("4270740");
    expect(searchParams.get("hasInstitutionThread")).toBe("true");
    expect(searchParams.get("threadPhase")).toBe("manual_follow_up_needed");
    expect(searchParams.get("updatedAtFrom")).toBe(
      "2026-04-01T00:00:00.000Z",
    );
    expect(searchParams.get("sortBy")).toBe("reviewStatus");
    expect(searchParams.get("sortOrder")).toBe("asc");
    expect(searchParams.has("reviewSelectionKey")).toBe(false);
  });

  it("does not clear staged drafts before the first query result arrives", () => {
    const stagedStorageKey = getCampaignAdminStagedReviewDraftsStorageKey(
      "funky",
      "user-1",
    );

    window.sessionStorage.setItem(
      stagedStorageKey,
      JSON.stringify({
        "user-1::record-1": {
          userId: "user-1",
          recordKey: "record-1",
          status: "approved",
          feedbackText: "",
          approvalRiskAcknowledged: false,
          sendNotification: false,
        },
      }),
    );

    useCampaignAdminUserPageItemsQueryMock.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: true,
      isFetching: true,
      refetch: vi.fn(),
    });

    render(
      <CampaignAdminUserPage
        campaignKey="funky"
        userId="user-1"
        search={defaultSearch}
        onSearchChange={() => {}}
      />,
    );

    expect(window.sessionStorage.getItem(stagedStorageKey)).toBe(
      JSON.stringify({
        "user-1::record-1": {
          userId: "user-1",
          recordKey: "record-1",
          status: "approved",
          feedbackText: "",
          approvalRiskAcknowledged: false,
          sendNotification: false,
        },
      }),
    );
  });
});
