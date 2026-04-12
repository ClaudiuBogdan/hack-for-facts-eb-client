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

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => useAuthMock(),
  AuthSignInButton: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/features/campaigns/buget/admin/hooks/use-campaign-admin-users", () => ({
  useCampaignAdminUsersQuery: (...args: unknown[]) =>
    useCampaignAdminUsersQueryMock(...args),
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
    onSearchChangeMock.mockReset();

    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: true });
    useCampaignAdminUsersQueryMock.mockReturnValue({
      data: createResponse([]),
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
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
      ]),
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
    expect(within(breadcrumb).getByText("Campaign Admin")).toBeInTheDocument();
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

    expect(screen.getByText("Interactions Queue")).toBeInTheDocument();
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
