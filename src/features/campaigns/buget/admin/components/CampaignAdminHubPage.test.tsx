import { render, screen } from "@/test/test-utils";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CampaignAdminHubPage } from "./CampaignAdminHubPage";

const useAuthMock = vi.fn();
const useCampaignAdminInteractionMetaQueryMock = vi.fn();
const useCampaignAdminUsersMetaQueryMock = vi.fn();
const useCampaignAdminEntitiesMetaQueryMock = vi.fn();
const useCampaignAdminNotificationsMetaQueryMock = vi.fn();

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
    readonly search?: Record<string, string | number | undefined>;
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

vi.mock(
  "@/features/campaigns/buget/admin/hooks/use-campaign-admin-user-interactions",
  () => ({
    useCampaignAdminInteractionMetaQuery: (...args: unknown[]) =>
      useCampaignAdminInteractionMetaQueryMock(...args),
  }),
);

vi.mock("@/features/campaigns/buget/admin/hooks/use-campaign-admin-users", () => ({
  useCampaignAdminUsersMetaQuery: (...args: unknown[]) =>
    useCampaignAdminUsersMetaQueryMock(...args),
}));

vi.mock(
  "@/features/campaigns/buget/admin/hooks/use-campaign-admin-entities",
  () => ({
    useCampaignAdminEntitiesMetaQuery: (...args: unknown[]) =>
      useCampaignAdminEntitiesMetaQueryMock(...args),
  }),
);

vi.mock(
  "@/features/campaigns/buget/admin/hooks/use-campaign-admin-notifications",
  () => ({
    useCampaignAdminNotificationsMetaQuery: (...args: unknown[]) =>
      useCampaignAdminNotificationsMetaQueryMock(...args),
  }),
);

describe("CampaignAdminHubPage", () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    useCampaignAdminInteractionMetaQueryMock.mockReset();
    useCampaignAdminUsersMetaQueryMock.mockReset();
    useCampaignAdminEntitiesMetaQueryMock.mockReset();
    useCampaignAdminNotificationsMetaQueryMock.mockReset();

    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: true });
    useCampaignAdminInteractionMetaQueryMock.mockReturnValue({
      data: {
        stats: {
          total: 12,
          riskFlagged: 2,
          withInstitutionThread: 6,
          reviewStatusCounts: {
            pending: 4,
            approved: 6,
            rejected: 2,
            notReviewed: 0,
          },
          phaseCounts: {
            idle: 0,
            draft: 0,
            pending: 4,
            resolved: 8,
            failed: 0,
          },
          threadPhaseCounts: {
            sending: 0,
            awaiting_reply: 2,
            reply_received_unreviewed: 1,
            manual_follow_up_needed: 0,
            resolved_positive: 3,
            resolved_negative: 1,
            closed_no_response: 1,
            failed: 0,
            none: 4,
          },
        },
      },
      error: null,
      isLoading: false,
    });
    useCampaignAdminUsersMetaQueryMock.mockReturnValue({
      data: {
        totalUsers: 9,
        usersWithPendingReviews: 3,
      },
      error: null,
      isLoading: false,
    });
    useCampaignAdminEntitiesMetaQueryMock.mockReturnValue({
      data: {
        totalEntities: 18,
        entitiesWithPendingReviews: 5,
        entitiesWithSubscribers: 7,
        entitiesWithNotificationActivity: 9,
        entitiesWithFailedNotifications: 2,
        availableInteractionTypes: [],
      },
      error: null,
      isLoading: false,
    });
    useCampaignAdminNotificationsMetaQueryMock.mockReturnValue({
      data: {
        pendingDeliveryCount: 3,
        failedDeliveryCount: 1,
        replyReceivedCount: 4,
      },
      error: null,
      isLoading: false,
    });
  });

  it("renders the notifications hub card with the notifications route search", () => {
    render(<CampaignAdminHubPage campaignKey="funky" />);

    const notificationsLink = screen.getByRole("link", {
      name: /Notifications/i,
    });

    expect(notificationsLink).toBeInTheDocument();
    expect(notificationsLink).toHaveAttribute(
      "href",
      "/admin/campaigns/funky/notifications?tab=audit&sortBy=createdAt&sortOrder=desc&limit=50",
    );
    expect(
      screen.getByText("3 pending delivery · 4 replies"),
    ).toBeInTheDocument();
    expect(screen.getByText("1 failed deliveries")).toBeInTheDocument();
  });

  it("renders the users hub card with the compact queue-style summary", () => {
    render(<CampaignAdminHubPage campaignKey="funky" />);

    expect(screen.getByText("9 users · 3 need review")).toBeInTheDocument();
  });

  it("renders the entities hub card with the entities route search", () => {
    render(<CampaignAdminHubPage campaignKey="funky" />);

    const entitiesLink = screen.getByRole("link", {
      name: /Entities/i,
    });

    expect(entitiesLink).toBeInTheDocument();
    expect(entitiesLink).toHaveAttribute(
      "href",
      "/admin/campaigns/funky/entities?limit=50",
    );
    expect(screen.getByText("18 tracked · 5 pending")).toBeInTheDocument();
    expect(screen.getByText("2 delivery issues")).toBeInTheDocument();
  });

  it("falls back to the existing descriptive copy when optional hub stats are unavailable", () => {
    useCampaignAdminUsersMetaQueryMock.mockReturnValue({
      data: undefined,
      error: { status: 404 },
      isLoading: false,
    });
    useCampaignAdminEntitiesMetaQueryMock.mockReturnValue({
      data: undefined,
      error: { status: 404 },
      isLoading: false,
    });
    useCampaignAdminNotificationsMetaQueryMock.mockReturnValue({
      data: undefined,
      error: { status: 404 },
      isLoading: false,
    });

    render(<CampaignAdminHubPage campaignKey="funky" />);

    expect(
      screen.getByText("Browse 12 interactions across all users"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "View entity-level campaign state across users, interactions, and delivery activity",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Audit campaign notification activity, preview matches, and send notifications",
      ),
    ).toBeInTheDocument();
  });
});
