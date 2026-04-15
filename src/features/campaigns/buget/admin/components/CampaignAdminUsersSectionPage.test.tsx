import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type ReactNode } from "react";
import { CampaignAdminUsersSectionPage } from "./CampaignAdminUsersSectionPage";
import type {
  CampaignAdminUserListItem,
  CampaignAdminUsersListResponse,
} from "@/features/campaigns/buget/admin/types";

const useAuthMock = vi.fn();
const useCampaignAdminUsersQueryMock = vi.fn();
const useCampaignAdminUsersMetaQueryMock = vi.fn();

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
  AuthSignInButton: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/features/campaigns/buget/admin/hooks/use-campaign-admin-users", () => ({
  useCampaignAdminUsersQuery: (...args: unknown[]) =>
    useCampaignAdminUsersQueryMock(...args),
  useCampaignAdminUsersMetaQuery: (...args: unknown[]) =>
    useCampaignAdminUsersMetaQueryMock(...args),
}));

function createItem(
  overrides: Partial<CampaignAdminUserListItem> = {},
): CampaignAdminUserListItem {
  return {
    userId: "user-1",
    interactionCount: 2,
    pendingReviewCount: 1,
    latestUpdatedAt: "2026-04-12T10:00:00.000Z",
    latestInteractionId: "funky:interaction:city_hall_contact",
    latestEntityCui: "12345678",
    latestEntityName: "Oras Test",
    ...overrides,
  };
}

function createResponse(
  items: readonly CampaignAdminUserListItem[],
  overrides: Partial<CampaignAdminUsersListResponse["page"]> = {},
): CampaignAdminUsersListResponse {
  return {
    items,
    page: {
      totalCount: items.length,
      hasMore: false,
      nextCursor: null,
      sortBy: "latestUpdatedAt",
      sortOrder: "desc",
      ...overrides,
    },
  };
}

describe("CampaignAdminUsersSectionPage", () => {
  const onSearchChangeMock = vi.fn();

  beforeEach(() => {
    useAuthMock.mockReset();
    useCampaignAdminUsersQueryMock.mockReset();
    useCampaignAdminUsersMetaQueryMock.mockReset();
    onSearchChangeMock.mockReset();

    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: true });
    useCampaignAdminUsersQueryMock.mockReturnValue({
      data: createResponse([]),
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });
    useCampaignAdminUsersMetaQueryMock.mockReturnValue({
      data: { totalUsers: 0, usersWithPendingReviews: 0 },
      error: null,
      isLoading: false,
      isFetching: false,
    });
  });

  it("loads aggregate users from the dedicated users endpoint hook", () => {
    useCampaignAdminUsersQueryMock.mockReturnValue({
      data: createResponse([
        createItem(),
        createItem({
          userId: "user-2",
          interactionCount: 1,
          pendingReviewCount: 0,
          latestUpdatedAt: "2026-04-11T10:00:00.000Z",
          latestInteractionId: "funky:interaction:budget_status",
          latestEntityCui: "87654321",
          latestEntityName: null,
        }),
      ], { totalCount: 23 }),
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    render(
      <CampaignAdminUsersSectionPage
        campaignKey="funky"
        search={{ limit: 50 }}
        onSearchChange={onSearchChangeMock}
      />,
    );

    expect(useCampaignAdminUsersQueryMock).toHaveBeenCalledWith({
      campaignKey: "funky",
      search: {
        query: undefined,
        sortBy: "latestUpdatedAt",
        sortOrder: "desc",
        cursor: undefined,
        limit: 50,
      },
      enabled: true,
    });

    expect(screen.getByText("user-1")).toBeInTheDocument();
    expect(screen.getByText("user-2")).toBeInTheDocument();
    expect(screen.getByText("City hall contact")).toBeInTheDocument();
    expect(screen.getByText("Oras Test · 12345678")).toBeInTheDocument();
    expect(screen.getByText("87654321")).toBeInTheDocument();
    expect(screen.getByText("Showing 2 of 23")).toBeInTheDocument();
  });

  it("renders a fallback label for subscription-only users", () => {
    useCampaignAdminUsersQueryMock.mockReturnValue({
      data: createResponse([
        createItem({
          userId: "subscriber-only",
          interactionCount: 0,
          pendingReviewCount: 0,
          latestInteractionId: null,
        }),
      ]),
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    render(
      <CampaignAdminUsersSectionPage
        campaignKey="funky"
        search={{ entityCui: "12345678", limit: 50 }}
        onSearchChange={onSearchChangeMock}
      />,
    );

    expect(screen.getByText("subscriber-only")).toBeInTheDocument();
    expect(screen.getByText("No interactions yet")).toBeInTheDocument();
    expect(screen.getByText("Oras Test · 12345678")).toBeInTheDocument();
  });

  it("renders the global empty state when the campaign has no users", () => {
    render(
      <CampaignAdminUsersSectionPage
        campaignKey="funky"
        search={{ limit: 50 }}
        onSearchChange={onSearchChangeMock}
      />,
    );

    expect(screen.getByText("No users yet")).toBeInTheDocument();
    expect(screen.getByText("Users will appear here after the campaign records interaction activity.")).toBeInTheDocument();
  });

  it("renders the filtered empty state for entity-scoped results", () => {
    render(
      <CampaignAdminUsersSectionPage
        campaignKey="funky"
        search={{ entityCui: "12345678", limit: 50 }}
        onSearchChange={onSearchChangeMock}
      />,
    );

    expect(
      screen.getByText("No users matched the current filters"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Try broadening the current search or clear the current filters.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Entity 12345678")).toBeInTheDocument();
  });

  it("keeps the pager reachable for an empty page with remaining results", () => {
    useCampaignAdminUsersQueryMock.mockReturnValue({
      data: createResponse([], {
        totalCount: 5,
        nextCursor: null,
        hasMore: false,
      }),
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    render(
      <CampaignAdminUsersSectionPage
        campaignKey="funky"
        search={{ pageIndex: 2, cursor: "cursor-2", limit: 50 }}
        onSearchChange={onSearchChangeMock}
      />,
    );

    expect(
      screen.getByText("No users are available on this page."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeEnabled();
  });

  it("resets cursor paging and applies trimmed query text when searching", async () => {
    render(
      <CampaignAdminUsersSectionPage
        campaignKey="funky"
        search={{
          query: "user",
          sortBy: "latestUpdatedAt",
          sortOrder: "desc",
          cursor: "cursor-1",
          pageIndex: 2,
          limit: 50,
        }}
        onSearchChange={onSearchChangeMock}
      />,
    );

    fireEvent.change(screen.getByLabelText("Search users"), {
      target: { value: "  user-2  " },
    });

    await waitFor(() => {
      expect(onSearchChangeMock).toHaveBeenLastCalledWith(
        {
          query: "user-2",
          sortBy: "latestUpdatedAt",
          sortOrder: "desc",
          limit: 50,
        },
        { replace: true },
      );
    });
  });

  it("changes sort using the supported aggregate sort keys", async () => {
    useCampaignAdminUsersQueryMock.mockReturnValue({
      data: createResponse([createItem()]),
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    render(
      <CampaignAdminUsersSectionPage
        campaignKey="funky"
        search={{ limit: 50 }}
        onSearchChange={onSearchChangeMock}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Interactions sort" }));

    await waitFor(() => {
      expect(onSearchChangeMock).toHaveBeenLastCalledWith(
        {
          sortBy: "interactionCount",
          sortOrder: "desc",
          limit: 50,
        },
        { replace: true },
      );
    });
  });

  it("uses nextCursor pagination from the aggregate response", async () => {
    useCampaignAdminUsersQueryMock.mockReturnValue({
      data: createResponse([createItem()], {
        hasMore: true,
        nextCursor: "cursor-2",
      }),
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    render(
      <CampaignAdminUsersSectionPage
        campaignKey="funky"
        search={{ limit: 50 }}
        onSearchChange={onSearchChangeMock}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(onSearchChangeMock).toHaveBeenLastCalledWith(
        {
          sortBy: "latestUpdatedAt",
          sortOrder: "desc",
          cursor: "cursor-2",
          pageIndex: 2,
          limit: 50,
        },
        undefined,
      );
    });
  });

  it("renders breadcrumbs with campaign admin link", () => {
    render(
      <CampaignAdminUsersSectionPage
        campaignKey="funky"
        search={{ limit: 50 }}
        onSearchChange={onSearchChangeMock}
      />,
    );

    const breadcrumb = screen.getByRole("navigation", { name: "breadcrumb" });
    expect(within(breadcrumb).getByText("Funky Citizens")).toBeInTheDocument();
    expect(within(breadcrumb).getAllByText("Users").length).toBeGreaterThan(0);
  });

  it("renders the interactions queue link", () => {
    render(
      <CampaignAdminUsersSectionPage
        campaignKey="funky"
        search={{ limit: 50 }}
        onSearchChange={onSearchChangeMock}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Users" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Open interactions queue")).toBeInTheDocument();
  });

  it("passes entity filters to the users query and preserved navigation links", () => {
    useCampaignAdminUsersQueryMock.mockReturnValue({
      data: createResponse([createItem()]),
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    render(
      <CampaignAdminUsersSectionPage
        campaignKey="funky"
        search={{ entityCui: "12345678", limit: 50 }}
        onSearchChange={onSearchChangeMock}
      />,
    );

    expect(useCampaignAdminUsersQueryMock).toHaveBeenCalledWith({
      campaignKey: "funky",
      search: {
        query: undefined,
        entityCui: "12345678",
        sortBy: "latestUpdatedAt",
        sortOrder: "desc",
        cursor: undefined,
        limit: 50,
      },
      enabled: true,
    });

    expect(
      screen.getByRole("link", { name: "Open interactions queue" }),
    ).toHaveAttribute(
      "href",
      "/admin/campaigns/funky/user-interactions?reviewStatus=pending&entityCui=12345678&limit=50",
    );
    expect(screen.getByRole("link", { name: "user-1" })).toHaveAttribute(
      "href",
      "/admin/campaigns/funky/users/user-1?entityCui=12345678&sortBy=updatedAt&sortOrder=desc&limit=50",
    );
  });

  it("displays pending review count as a warning badge when greater than zero", () => {
    useCampaignAdminUsersQueryMock.mockReturnValue({
      data: createResponse([createItem()]),
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    render(
      <CampaignAdminUsersSectionPage
        campaignKey="funky"
        search={{ limit: 50 }}
        onSearchChange={onSearchChangeMock}
      />,
    );

    const userRow = screen.getByText("user-1").closest("tr");
    expect(userRow).not.toBeNull();

    const badge = within(userRow!).getByText("1");
    expect(badge).toBeInTheDocument();
  });
});
