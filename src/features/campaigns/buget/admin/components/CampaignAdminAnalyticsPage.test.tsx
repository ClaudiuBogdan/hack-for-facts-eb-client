import { fireEvent, render, screen } from "@/test/test-utils";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CampaignAdminApiError } from "@/features/campaigns/buget/admin/api/campaign-admin-user-interactions";
import type {
  CampaignAdminStatsInteractionsByTypeResponse,
  CampaignAdminStatsOverview,
  CampaignAdminStatsTopEntitiesResponse,
} from "@/features/campaigns/buget/admin/types";
import { CampaignAdminAnalyticsPage } from "./CampaignAdminAnalyticsPage";

const useAuthMock = vi.fn();
const useCampaignAdminStatsOverviewQueryMock = vi.fn();
const useCampaignAdminStatsInteractionsByTypeQueryMock = vi.fn();
const useCampaignAdminStatsTopEntitiesQueryMock = vi.fn();
const navigateMock = vi.fn();

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
  useNavigate: () => navigateMock,
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => useAuthMock(),
  AuthSignInButton: ({ children }: { readonly children: ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("@/features/campaigns/buget/admin/hooks/use-campaign-admin-stats", () => ({
  useCampaignAdminStatsInteractionsByTypeQuery: (...args: unknown[]) =>
    useCampaignAdminStatsInteractionsByTypeQueryMock(...args),
  useCampaignAdminStatsOverviewQuery: (...args: unknown[]) =>
    useCampaignAdminStatsOverviewQueryMock(...args),
  useCampaignAdminStatsTopEntitiesQuery: (...args: unknown[]) =>
    useCampaignAdminStatsTopEntitiesQueryMock(...args),
}));

function createOverview(
  overrides: Partial<CampaignAdminStatsOverview> = {},
): CampaignAdminStatsOverview {
  return {
    coverage: {
      hasClientTelemetry: false,
      hasNotificationAttribution: false,
    },
    users: {
      totalUsers: 21,
      usersWithPendingReviews: 6,
    },
    interactions: {
      totalInteractions: 34,
      interactionsWithInstitutionThread: 11,
      reviewStatusCounts: {
        pending: 7,
        approved: 15,
        rejected: 6,
        notReviewed: 6,
      },
      phaseCounts: {
        idle: 1,
        draft: 2,
        pending: 7,
        resolved: 21,
        failed: 3,
      },
      threadPhaseCounts: {
        sending: 1,
        awaitingReply: 3,
        replyReceivedUnreviewed: 2,
        manualFollowUpNeeded: 1,
        resolvedPositive: 2,
        resolvedNegative: 1,
        closedNoResponse: 2,
        failed: 1,
        none: 21,
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
    ...overrides,
  };
}

function mockStatsQuery(
  overrides: Partial<{
    data: CampaignAdminStatsOverview | undefined;
    error: CampaignAdminApiError | null;
    isLoading: boolean;
    isFetching: boolean;
    refetch: () => void;
  }> = {},
) {
  useCampaignAdminStatsOverviewQueryMock.mockReturnValue({
    data: overrides.data,
    error: overrides.error ?? null,
    isLoading: overrides.isLoading ?? false,
    isFetching: overrides.isFetching ?? false,
    refetch: overrides.refetch ?? vi.fn(),
  });
}

function createInteractionsByType(): CampaignAdminStatsInteractionsByTypeResponse {
  return {
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
  };
}

function createTopEntities(
  sortBy: CampaignAdminStatsTopEntitiesResponse["sortBy"],
): CampaignAdminStatsTopEntitiesResponse {
  if (sortBy === "userCount") {
    return {
      sortBy,
      limit: 10,
      items: [
        {
          entityCui: "11111111",
          entityName: "Users First",
          interactionCount: 10,
          userCount: 9,
          pendingReviewCount: 2,
        },
      ],
    };
  }

  if (sortBy === "pendingReviewCount") {
    return {
      sortBy,
      limit: 10,
      items: [
        {
          entityCui: "22222222",
          entityName: "Pending First",
          interactionCount: 5,
          userCount: 4,
          pendingReviewCount: 4,
        },
      ],
    };
  }

  return {
    sortBy,
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
  };
}

function mockInteractionsByTypeQuery(
  overrides: Partial<{
    data: CampaignAdminStatsInteractionsByTypeResponse | undefined;
    error: CampaignAdminApiError | null;
    isLoading: boolean;
    isFetching: boolean;
    refetch: () => void;
  }> = {},
) {
  useCampaignAdminStatsInteractionsByTypeQueryMock.mockReturnValue({
    data: overrides.data,
    error: overrides.error ?? null,
    isLoading: overrides.isLoading ?? false,
    isFetching: overrides.isFetching ?? false,
    refetch: overrides.refetch ?? vi.fn(),
  });
}

function mockTopEntitiesQueries() {
  useCampaignAdminStatsTopEntitiesQueryMock.mockImplementation(
    ({
      sortBy,
    }: {
      readonly sortBy: CampaignAdminStatsTopEntitiesResponse["sortBy"];
    }) => ({
      data: createTopEntities(sortBy),
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    }),
  );
}

describe("CampaignAdminAnalyticsPage", () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    useCampaignAdminStatsOverviewQueryMock.mockReset();
    useCampaignAdminStatsInteractionsByTypeQueryMock.mockReset();
    useCampaignAdminStatsTopEntitiesQueryMock.mockReset();
    navigateMock.mockReset();

    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: true });
    mockStatsQuery({
      data: createOverview(),
    });
    mockInteractionsByTypeQuery({
      data: createInteractionsByType(),
    });
    mockTopEntitiesQueries();
  });

  it("renders a loading state while analytics are being fetched", () => {
    mockStatsQuery({
      data: undefined,
      isLoading: true,
    });

    render(<CampaignAdminAnalyticsPage campaignKey="funky" />);

    expect(
      screen.getByRole("status", { name: "Loading analytics" }),
    ).toBeInTheDocument();
  });

  it("renders the sign-in gate when signed out", () => {
    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: false });

    render(<CampaignAdminAnalyticsPage campaignKey="funky" />);

    expect(screen.getByText("Sign in required")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("renders the forbidden state from the backend", () => {
    mockStatsQuery({
      data: undefined,
      error: new CampaignAdminApiError("Forbidden", 403),
    });

    render(<CampaignAdminAnalyticsPage campaignKey="funky" />);

    expect(
      screen.getByText("You do not have access to analytics"),
    ).toBeInTheDocument();
  });

  it("renders the unavailable state when the server returns 404", () => {
    mockStatsQuery({
      data: undefined,
      error: new CampaignAdminApiError("Unavailable", 404),
    });

    render(<CampaignAdminAnalyticsPage campaignKey="funky" />);

    expect(
      screen.getByText("Campaign analytics unavailable"),
    ).toBeInTheDocument();
  });

  it("renders the session-expired state when the backend returns 401", () => {
    mockStatsQuery({
      data: undefined,
      error: new CampaignAdminApiError("Expired", 401),
    });

    render(<CampaignAdminAnalyticsPage campaignKey="funky" />);

    expect(screen.getByText("Session expired")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sign in again" }),
    ).toBeInTheDocument();
  });

  it("renders ranked analytics and deep links into the admin workspace", () => {
    render(<CampaignAdminAnalyticsPage campaignKey="funky" />);

    expect(screen.getByText("Current totals")).toBeInTheDocument();
    expect(screen.getByText("Top interaction elements")).toBeInTheDocument();
    expect(screen.getByText("Top entities")).toBeInTheDocument();
    expect(screen.getByText("Public debate request")).toBeInTheDocument();
    expect(screen.getByText("funky:interaction:budget_document")).toBeInTheDocument();
    expect(screen.getByText("Oras Test")).toBeInTheDocument();
    expect(screen.getByText("Coverage")).toBeInTheDocument();
    expect(screen.getByText("Review status")).toBeInTheDocument();
    expect(screen.getByText("Notification funnel")).toBeInTheDocument();
    expect(screen.getByText("34")).toBeInTheDocument();
    expect(screen.getAllByText("18").length).toBeGreaterThan(0);

    const usersCardLink = screen
      .getAllByRole("link")
      .find(
        (link) =>
          link.getAttribute("href") === "/admin/campaigns/funky/users?limit=50",
      );
    const interactionLink = screen
      .getAllByRole("link")
      .find((link) =>
        link
          .getAttribute("href")
          ?.startsWith(
            "/admin/campaigns/funky/user-interactions?interactionId=funky%3Ainteraction%3Apublic_debate_request",
          ),
      );
    const entityLink = screen
      .getAllByRole("link")
      .find((link) =>
        link
          .getAttribute("href")
          ?.startsWith("/admin/campaigns/funky/entities/12345678"),
      );

    expect(usersCardLink).toBeDefined();
    expect(interactionLink).toBeDefined();
    expect(entityLink).toBeDefined();
  });

  it("renders capability messaging instead of pretending unavailable telemetry is zero", () => {
    render(<CampaignAdminAnalyticsPage campaignKey="funky" />);

    expect(
      screen.getByText("Client telemetry not available yet"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Notification attribution not available yet"),
    ).toBeInTheDocument();
  });

  it("switches the top-entities view when another sort tab is selected", () => {
    render(<CampaignAdminAnalyticsPage campaignKey="funky" />);

    fireEvent.click(screen.getByRole("button", { name: "Top by users" }));

    expect(screen.getByText("Users First")).toBeInTheDocument();
    expect(screen.queryByText("Oras Test")).not.toBeInTheDocument();
  });

  it("refetches analytics when the refresh action is pressed", () => {
    const refetchMock = vi.fn();
    const interactionsRefetchMock = vi.fn();
    const topEntitiesRefetchMock = vi.fn();
    mockStatsQuery({
      data: createOverview(),
      refetch: refetchMock,
    });
    mockInteractionsByTypeQuery({
      data: createInteractionsByType(),
      refetch: interactionsRefetchMock,
    });
    useCampaignAdminStatsTopEntitiesQueryMock.mockImplementation(() => ({
      data: createTopEntities("interactionCount"),
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: topEntitiesRefetchMock,
    }));

    render(<CampaignAdminAnalyticsPage campaignKey="funky" />);

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    expect(refetchMock).toHaveBeenCalledOnce();
    expect(interactionsRefetchMock).toHaveBeenCalledOnce();
    expect(topEntitiesRefetchMock).toHaveBeenCalledTimes(3);
  });
});
